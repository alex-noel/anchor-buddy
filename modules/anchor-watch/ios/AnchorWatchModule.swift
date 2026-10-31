import ExpoModulesCore
import CoreLocation
import UserNotifications
import UIKit

struct AnchorCoordinate: Record {
  @Field var latitude: Double = 0
  @Field var longitude: Double = 0
}
struct AnchorOptions: Record {
  @Field var anchor: AnchorCoordinate = AnchorCoordinate()
  @Field var radiusM: Double = 0
  @Field var anchorConfirmed: Bool = false
  @Field var checklistConfirmed: Bool = false
  @Field var testAlarmConfirmed: Bool = false
  @Field var maxAccuracyM: Double = 20
  @Field var staleAfterMs: Double = 30_000
}

public final class AnchorWatchModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AnchorWatch")
    Events("onStatus")
    OnStartObserving {
      DispatchQueue.main.async {
        AnchorWatchManager.shared.onChange = { [weak self] status in self?.sendEvent("onStatus", status) }
      }
    }
    OnStopObserving { DispatchQueue.main.async { AnchorWatchManager.shared.onChange = nil } }
    AsyncFunction("getStatus") { () -> [String: Any] in
      AnchorWatchManager.shared.tick()
      return AnchorWatchManager.shared.dictionary()
    }.runOnQueue(.main)
    AsyncFunction("requestPermissions") { (promise: Promise) in
      AnchorWatchManager.shared.requestPermissions(promise)
    }.runOnQueue(.main)
    AsyncFunction("testAlarm") { (promise: Promise) in AnchorWatchManager.shared.testAlarm(promise) }.runOnQueue(.main)
    AsyncFunction("arm") { (options: AnchorOptions, promise: Promise) in
      AnchorWatchManager.shared.arm(options, promise: promise)
    }.runOnQueue(.main)
    AsyncFunction("acknowledge") { () -> [String: Any] in
      AnchorWatchManager.shared.acknowledge()
      return AnchorWatchManager.shared.dictionary()
    }.runOnQueue(.main)
    AsyncFunction("stop") { () -> [String: Any] in
      AnchorWatchManager.shared.stop()
      return AnchorWatchManager.shared.dictionary()
    }.runOnQueue(.main)
    AsyncFunction("updateRadius") { (radiusM: Double, confirmed: Bool, promise: Promise) in
      AnchorWatchManager.shared.updateRadius(radiusM, confirmed: confirmed, promise: promise)
    }.runOnQueue(.main)
  }
}

private struct Coordinate: Codable { var latitude: Double; var longitude: Double }
private struct Fix: Codable { var latitude: Double; var longitude: Double; var accuracyM: Double; var timestamp: Double }
private struct Alert: Codable {
  var id: String; var kind: String; var message: String; var occurredAt: Double; var acknowledged: Bool
}
private struct Snapshot: Codable {
  var state = "idle"
  var nativeAvailable = true
  var simulation = false
  var serviceRunning = false
  var sessionId: String?
  var anchor: Coordinate?
  var radiusM: Double?
  var maxAccuracyM: Double?
  var staleAfterMs: Double?
  var lastFix: Fix?
  var distanceM: Double?
  var lastHeartbeatAt: Double?
  var testAlarmAt: Double?
  var alerts: [Alert] = []
  var message: String? = "Watch stopped."
}

/** Retained independently of the JavaScript bridge. No network, JavaScript timers or AI. */
private final class AnchorWatchManager: NSObject, CLLocationManagerDelegate, UNUserNotificationCenterDelegate {
  static let shared = AnchorWatchManager()
  private let location = CLLocationManager()
  private let center = UNUserNotificationCenter.current()
  private let storageKey = "anchorai.watch.snapshot.v1"
  private var snapshot = Snapshot()
  private var timer: DispatchSourceTimer?
  private var issue = "healthy"
  private var lastUsableUptime = 0.0
  private var latestTimestamp = -Double.infinity
  private var testedUptime: Double?
  private var permissionPromise: Promise?
  private var lastNotificationCheck = 0.0
  private var lastAlarmUptime = -Double.infinity
  private let healthClock = ContinuousClock()
  private let healthClockOrigin = ContinuousClock().now
  private weak var previousNotificationDelegate: UNUserNotificationCenterDelegate?
  var onChange: (([String: Any]) -> Void)?
  private var active: Bool { ["arming", "monitoring", "position_uncertain", "alarm"].contains(snapshot.state) }
  private var wall: Double { Date().timeIntervalSince1970 * 1_000 }
  // ContinuousClock includes device sleep. Awake-only uptime could call an hours-old
  // fix fresh immediately after wake, before the first replacement location arrives.
  private var uptime: Double {
    let elapsed = healthClockOrigin.duration(to: healthClock.now).components
    return Double(elapsed.seconds) * 1_000 + Double(elapsed.attoseconds) / 1_000_000_000_000_000
  }

  private override init() {
    super.init()
    location.delegate = self
    location.desiredAccuracy = kCLLocationAccuracyBestForNavigation
    location.distanceFilter = kCLDistanceFilterNone
    location.pausesLocationUpdatesAutomatically = false
    location.activityType = .otherNavigation
    if let data = UserDefaults.standard.data(forKey: storageKey), let restored = try? JSONDecoder().decode(Snapshot.self, from: data) {
      snapshot = restored
      if active {
        snapshot.state = "interrupted"
        snapshot.serviceRunning = false
        snapshot.message = "The previous native monitoring session ended. Test the alarm and re-arm explicitly."
        snapshot.alerts.append(Alert(id: UUID().uuidString, kind: "interrupted", message: snapshot.message!, occurredAt: wall, acknowledged: false))
        persist()
      }
    }
    // Only our notification IDs are handled; unrelated notification delegates are forwarded.
    previousNotificationDelegate = center.delegate
    center.delegate = self
  }
  func dictionary() -> [String: Any] {
    guard let data = try? JSONEncoder().encode(snapshot), let value = try? JSONSerialization.jsonObject(with: data) as? [String: Any] else { return [:] }
    return value
  }
  private func persist() {
    while snapshot.alerts.count > 100, let index = snapshot.alerts.firstIndex(where: { $0.acknowledged }) {
      snapshot.alerts.remove(at: index)
    }
    if let data = try? JSONEncoder().encode(snapshot) { UserDefaults.standard.set(data, forKey: storageKey) }
  }
  private func emit() { persist(); onChange?(dictionary()) }
  private func permissionStatus(_ settings: UNNotificationSettings) -> [String: Any] {
    let authorization = location.authorizationStatus
    let allowed = authorization == .authorizedAlways || authorization == .authorizedWhenInUse
    let precise = location.accuracyAuthorization == .fullAccuracy
    let background = authorization == .authorizedAlways
    let notifications = settings.authorizationStatus == .authorized && settings.alertSetting == .enabled && settings.soundSetting == .enabled
    let canArm = allowed && precise && background && notifications && CLLocationManager.locationServicesEnabled()
    return ["location": allowed, "precise": precise, "background": background, "notifications": notifications, "canArm": canArm,
      "message": canArm ? "Permissions available. Silent mode and Focus can still suppress alerts." : "Enable Always, Precise Location, notification alerts and sounds in Settings before arming."]
  }
  func requestPermissions(_ promise: Promise) {
    if permissionPromise != nil { promise.reject("E_PERMISSION_PENDING", "A permission request is already in progress."); return }
    center.requestAuthorization(options: [.alert, .sound]) { [weak self] _, error in
      DispatchQueue.main.async {
        guard let self = self else { return }
        if let error = error { promise.reject("E_PERMISSIONS", error.localizedDescription); return }
        if self.location.authorizationStatus == .notDetermined {
          self.permissionPromise = promise
          self.location.requestAlwaysAuthorization()
        } else {
          if self.location.authorizationStatus == .authorizedWhenInUse { self.location.requestAlwaysAuthorization() }
          self.resolvePermissions(promise)
        }
      }
    }
  }
  private func resolvePermissions(_ promise: Promise) {
    center.getNotificationSettings { [weak self] settings in
      DispatchQueue.main.async { if let self = self { promise.resolve(self.permissionStatus(settings)) } }
    }
  }
  func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
    if let pending = permissionPromise, manager.authorizationStatus != .notDetermined {
      permissionPromise = nil
      resolvePermissions(pending)
    }
    if active && (manager.authorizationStatus != .authorizedAlways || manager.accuracyAuthorization != .fullAccuracy) {
      interrupt("Location permission changed. Monitoring stopped; check Settings and re-arm explicitly.")
    }
  }
  func testAlarm(_ promise: Promise) {
    center.getNotificationSettings { [weak self] settings in
      DispatchQueue.main.async {
        guard let self = self else { return }
        guard (self.permissionStatus(settings)["notifications"] as? Bool) == true else {
          promise.reject("E_NOTIFICATIONS", "Enable notification alerts and sounds before testing the alarm."); return
        }
        self.notify("test", title: "Anchor Buddy test alarm", body: "Confirm that you can hear this test. Silent mode, Focus and volume can suppress alerts.") { error in
          DispatchQueue.main.async {
            if let error = error { promise.reject("E_TEST_ALARM", error.localizedDescription); return }
            self.testedUptime = self.uptime
            self.snapshot.testAlarmAt = self.wall
            self.emit()
            promise.resolve(nil)
          }
        }
      }
    }
  }
  func arm(_ options: AnchorOptions, promise: Promise) {
    guard !active else { promise.reject("E_ACTIVE", "Stop the current watch before selecting another anchor."); return }
    guard options.anchorConfirmed && options.checklistConfirmed && options.testAlarmConfirmed,
      options.anchor.latitude.isFinite && options.anchor.longitude.isFinite,
      abs(options.anchor.latitude) <= 90 && abs(options.anchor.longitude) <= 180,
      options.radiusM.isFinite && options.radiusM >= 10 && options.radiusM <= 10_000,
      options.maxAccuracyM.isFinite && options.maxAccuracyM >= 1 && options.maxAccuracyM <= options.radiusM / 2,
      options.staleAfterMs.isFinite && options.staleAfterMs >= 15_000 && options.staleAfterMs <= 120_000 else {
      promise.reject("E_OPTIONS", "Confirm the anchor, arrival checklist and test alarm, and supply valid radius and position limits."); return
    }
    guard let tested = testedUptime, uptime >= tested, uptime - tested <= 600_000 else {
      promise.reject("E_TEST_REQUIRED", "Run and confirm a native test alarm within ten minutes of arming."); return
    }
    guard UIApplication.shared.applicationState == .active else {
      promise.reject("E_FOREGROUND", "Arm the watch while the app is visible."); return
    }
    center.getNotificationSettings { [weak self] settings in
      DispatchQueue.main.async {
        guard let self = self else { return }
        guard !self.active else { promise.reject("E_ACTIVE", "A watch is already active."); return }
        guard (self.permissionStatus(settings)["canArm"] as? Bool) == true else {
          promise.reject("E_PERMISSIONS", "Precise Always location and notification alerts/sounds are required."); return
        }
        let testedAt = self.snapshot.testAlarmAt
        self.snapshot = Snapshot()
        self.snapshot.state = "arming"
        self.snapshot.serviceRunning = true
        self.snapshot.sessionId = UUID().uuidString
        self.snapshot.anchor = Coordinate(latitude: options.anchor.latitude, longitude: options.anchor.longitude)
        self.snapshot.radiusM = options.radiusM
        self.snapshot.maxAccuracyM = options.maxAccuracyM
        self.snapshot.staleAfterMs = options.staleAfterMs
        self.snapshot.lastHeartbeatAt = self.wall
        self.snapshot.testAlarmAt = testedAt
        self.snapshot.message = "Waiting for a fresh accurate position."
        self.issue = "healthy"
        self.lastUsableUptime = self.uptime
        self.latestTimestamp = -Double.infinity
        self.location.allowsBackgroundLocationUpdates = true
        self.location.showsBackgroundLocationIndicator = true
        self.location.startUpdatingLocation()
        let source = DispatchSource.makeTimerSource(queue: .main)
        source.schedule(deadline: .now() + 2, repeating: 2)
        source.setEventHandler { [weak self] in self?.tick() }
        self.timer = source
        source.resume()
        self.emit()
        promise.resolve(self.dictionary())
      }
    }
  }
  func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
    for fix in locations.sorted(by: { $0.timestamp < $1.timestamp }) { accept(fix) }
  }
  private func accept(_ fix: CLLocation) {
    guard active, let anchor = snapshot.anchor, let radius = snapshot.radiusM,
      let accuracy = snapshot.maxAccuracyM, let staleMs = snapshot.staleAfterMs else { return }
    let timestamp = fix.timestamp.timeIntervalSince1970 * 1_000
    guard CLLocationCoordinate2DIsValid(fix.coordinate), timestamp > latestTimestamp,
      timestamp <= wall + 5_000, wall - timestamp <= staleMs, fix.horizontalAccuracy >= 0,
      fix.horizontalAccuracy.isFinite else { return }
    latestTimestamp = timestamp
    snapshot.lastFix = Fix(latitude: fix.coordinate.latitude, longitude: fix.coordinate.longitude, accuracyM: fix.horizontalAccuracy, timestamp: timestamp)
    // Haversine matches the shared reference, using a mean-earth radius rather than native geodesic differences.
    let distance = Self.distance(anchor, Coordinate(latitude: fix.coordinate.latitude, longitude: fix.coordinate.longitude))
    snapshot.distanceM = distance
    snapshot.lastHeartbeatAt = wall
    if fix.horizontalAccuracy > accuracy {
      setIssue("position", "Position accuracy exceeds the configured limit.")
    } else {
      lastUsableUptime = uptime - max(0, wall - timestamp)
      if distance - fix.horizontalAccuracy > radius {
        setIssue("boundary", "Vessel is beyond the confirmed anchor alarm boundary.")
      } else if distance + fix.horizontalAccuracy >= radius {
        setIssue("position", "Position uncertainty overlaps the anchor alarm boundary.")
      } else { issue = "healthy"; refreshState() }
    }
    emit()
  }
  private static func distance(_ a: Coordinate, _ b: Coordinate) -> Double {
    let r = Double.pi / 180
    let x = pow(sin((b.latitude - a.latitude) * r / 2), 2) + cos(a.latitude * r) * cos(b.latitude * r) * pow(sin((b.longitude - a.longitude) * r / 2), 2)
    return 6_371_008.8 * 2 * atan2(sqrt(min(1, x)), sqrt(max(0, 1 - x)))
  }
  func tick() {
    guard active else { return }
    guard timer != nil, snapshot.serviceRunning, CLLocationManager.locationServicesEnabled() else {
      interrupt("Native location monitoring is unavailable. Test the alarm and re-arm explicitly."); return
    }
    snapshot.lastHeartbeatAt = wall
    if uptime - lastUsableUptime > (snapshot.staleAfterMs ?? 30_000) || uptime < lastUsableUptime {
      setIssue("position", "No recent usable position. Check the device and surroundings.")
    }
    if uptime - lastNotificationCheck > 30_000 {
      lastNotificationCheck = uptime
      center.getNotificationSettings { [weak self] settings in
        DispatchQueue.main.async {
          guard let self = self, self.active else { return }
          if (self.permissionStatus(settings)["canArm"] as? Bool) != true {
            self.interrupt("Required location or notification permissions are unavailable. Monitoring stopped.")
          }
        }
      }
    }
    if snapshot.alerts.contains(where: { !$0.acknowledged }) && uptime - lastAlarmUptime > 60_000 {
      alarm(snapshot.message ?? "Check the anchor watch.")
    }
    emit()
  }
  func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
    if active { setIssue("position", "Location unavailable: \(error.localizedDescription)"); emit() }
  }
  func locationManagerDidPauseLocationUpdates(_ manager: CLLocationManager) {
    if active { setIssue("position", "The operating system paused location updates."); emit() }
  }
  private func setIssue(_ next: String, _ message: String) {
    if !snapshot.alerts.contains(where: { $0.kind == next && !$0.acknowledged }) {
      snapshot.alerts.append(Alert(id: UUID().uuidString, kind: next, message: message, occurredAt: wall, acknowledged: false))
      alarm(message)
    }
    issue = next
    snapshot.message = message
    refreshState()
  }
  private func refreshState() {
    if issue == "boundary" || snapshot.alerts.contains(where: { $0.kind == "boundary" && !$0.acknowledged }) { snapshot.state = "alarm" }
    else if issue == "position" || snapshot.alerts.contains(where: { $0.kind == "position" && !$0.acknowledged }) { snapshot.state = "position_uncertain" }
    else {
      snapshot.state = snapshot.lastFix == nil ? "arming" : "monitoring"
      snapshot.message = snapshot.lastFix == nil ? "Waiting for a fresh accurate position." : "Inside the configured boundary; supplemental watch only."
    }
  }
  func acknowledge() {
    for index in snapshot.alerts.indices { snapshot.alerts[index].acknowledged = true }
    if active { refreshState() }
    center.removeDeliveredNotifications(withIdentifiers: ["anchorai-watch-alarm"])
    emit()
  }
  func updateRadius(_ radius: Double, confirmed: Bool, promise: Promise) {
    guard active, confirmed, radius.isFinite, radius >= 10, radius <= 10_000,
      radius >= (snapshot.maxAccuracyM ?? 20) * 2 else {
      promise.reject("E_RADIUS", "Explicitly confirm a valid radius for an active watch."); return
    }
    snapshot.radiusM = radius
    if let fix = snapshot.lastFix {
      latestTimestamp = -Double.infinity
      accept(CLLocation(coordinate: CLLocationCoordinate2D(latitude: fix.latitude, longitude: fix.longitude), altitude: 0,
        horizontalAccuracy: fix.accuracyM, verticalAccuracy: -1, timestamp: Date(timeIntervalSince1970: fix.timestamp / 1_000)))
    }
    tick()
    emit()
    promise.resolve(dictionary())
  }
  private func interrupt(_ message: String) {
    stopHardware()
    snapshot.state = "interrupted"
    snapshot.message = message
    snapshot.alerts.append(Alert(id: UUID().uuidString, kind: "interrupted", message: message, occurredAt: wall, acknowledged: false))
    testedUptime = nil
    alarm(message)
    emit()
  }
  private func stopHardware() {
    timer?.cancel(); timer = nil
    location.stopUpdatingLocation()
    snapshot.serviceRunning = false
  }
  func stop() {
    stopHardware()
    snapshot.state = "idle"
    snapshot.message = "Watch stopped."
    center.removePendingNotificationRequests(withIdentifiers: ["anchorai-watch-alarm"])
    center.removeDeliveredNotifications(withIdentifiers: ["anchorai-watch-alarm"])
    emit()
  }
  private func alarm(_ message: String) {
    lastAlarmUptime = uptime
    notify("alarm", title: "Check your anchor watch", body: message) { [weak self] error in
      guard let error = error else { return }
      DispatchQueue.main.async {
        self?.snapshot.message = "Local notification failed: \(error.localizedDescription). Check the vessel and device."
        self?.emit()
      }
    }
  }
  private func notify(_ id: String, title: String, body: String, completion: @escaping (Error?) -> Void) {
    let content = UNMutableNotificationContent()
    content.title = title; content.body = body; content.sound = .default
    content.threadIdentifier = "anchorai-watch"
    content.interruptionLevel = .timeSensitive
    center.add(UNNotificationRequest(identifier: "anchorai-watch-\(id)", content: content,
      trigger: UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)), withCompletionHandler: completion)
  }
  func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    if notification.request.identifier.hasPrefix("anchorai-watch-") { completionHandler([.banner, .list, .sound]) }
    else if let previous = previousNotificationDelegate,
      previous.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:willPresent:withCompletionHandler:))) {
      previous.userNotificationCenter?(center, willPresent: notification, withCompletionHandler: completionHandler)
    } else { completionHandler([]) }
  }
  func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void) {
    if !response.notification.request.identifier.hasPrefix("anchorai-watch-"), let previous = previousNotificationDelegate,
      previous.responds(to: #selector(UNUserNotificationCenterDelegate.userNotificationCenter(_:didReceive:withCompletionHandler:))) {
      previous.userNotificationCenter?(center, didReceive: response, withCompletionHandler: completionHandler)
    } else { completionHandler() }
  }
}
