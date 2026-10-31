package expo.modules.anchorwatch

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.location.Location
import android.location.LocationManager
import android.os.SystemClock
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID
import kotlin.math.*

/** All calls are confined to Android's main looper. Persisted active flags never establish liveness. */
internal object WatchRuntime {
  private lateinit var context: Context
  private var data = mutableMapOf<String, Any?>("state" to "idle", "nativeAvailable" to true,
    "simulation" to false, "serviceRunning" to false, "alerts" to mutableListOf<MutableMap<String, Any?>>(), "message" to "Watch stopped.")
  var listener: ((Map<String, Any?>) -> Unit)? = null
  var service: AnchorWatchService? = null
    private set
  private var issue = "healthy"
  private var lastUsableMono = 0.0
  private var latestTimestamp = Double.NEGATIVE_INFINITY
  private var latestElapsedNanos = Long.MIN_VALUE
  private var testedMono: Double? = null
  private var startupDeadline = 0.0
  private var lastNotificationMono = Double.NEGATIVE_INFINITY
  private fun wall() = System.currentTimeMillis().toDouble()
  private fun mono() = SystemClock.elapsedRealtime().toDouble()
  private fun number(key: String, fallback: Double = 0.0) = (data[key] as? Number)?.toDouble() ?: fallback
  private val active: Boolean get() = data["state"] in listOf("arming", "monitoring", "position_uncertain", "alarm")
  @Suppress("UNCHECKED_CAST")
  private fun alerts() = data["alerts"] as MutableList<MutableMap<String, Any?>>

  fun initialize(applicationContext: Context) {
    if (::context.isInitialized) return
    context = applicationContext.applicationContext
    WatchNotifications.createChannels(context)
    val stored = context.getSharedPreferences("anchorai-watch", Context.MODE_PRIVATE).getString("snapshot-v1", null)
    if (stored != null) {
      try {
        @Suppress("UNCHECKED_CAST")
        val restored = decode(JSONObject(stored)) as MutableMap<String, Any?>
        data = restored
        if (active) {
          data["state"] = "interrupted"
          data["serviceRunning"] = false
          data["message"] = "The previous native monitoring process ended. Test the alarm and re-arm explicitly."
          appendAlert("interrupted", data["message"] as String)
          persist()
        }
      } catch (_: Exception) {
        data = mutableMapOf("state" to "interrupted", "nativeAvailable" to true, "simulation" to false,
          "serviceRunning" to false, "alerts" to mutableListOf<MutableMap<String, Any?>>(), "message" to "The saved watch state is unreadable. Test the alarm and re-arm explicitly.")
      }
    }
  }
  private fun decode(value: Any?): Any? = when (value) {
    is JSONObject -> value.keys().asSequence().associateWith { decode(value.get(it)) }.toMutableMap()
    is JSONArray -> (0 until value.length()).map { decode(value.get(it)) }.toMutableList()
    JSONObject.NULL -> null
    else -> value
  }
  fun snapshot(): Map<String, Any?> = data.toMap()
  private fun persist() {
    val list = alerts()
    while (list.size > 100) {
      val acknowledgedIndex = list.indexOfFirst { it["acknowledged"] == true }
      if (acknowledgedIndex < 0) break
      list.removeAt(acknowledgedIndex)
    }
    context.getSharedPreferences("anchorai-watch", Context.MODE_PRIVATE).edit().putString("snapshot-v1", JSONObject(data).toString()).apply()
  }
  private fun emit() { persist(); listener?.invoke(snapshot()) }
  fun verifiedStatus(): Map<String, Any?> {
    if (active && service == null && mono() > startupDeadline) {
      interrupt("Native monitoring is not running. Test the alarm and re-arm explicitly.")
    } else if (service != null && active) tick()
    return snapshot()
  }
  fun permissions(): Map<String, Any?> {
    val precise = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val coarse = ContextCompat.checkSelfPermission(context, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED
    val notifications = WatchNotifications.alertsAvailable(context)
    val manager = context.getSystemService(Context.LOCATION_SERVICE) as LocationManager
    val enabled = manager.isProviderEnabled(LocationManager.GPS_PROVIDER)
    return mapOf("location" to (precise || coarse), "precise" to precise,
      // An explicitly started location foreground service retains access after the activity backgrounds.
      "background" to precise, "notifications" to notifications, "canArm" to (precise && notifications && enabled),
      "message" to "Precise GPS and visible/audible notifications are required. Battery restrictions and Do Not Disturb can still interrupt alerts.")
  }
  fun testAlarm() {
    check(permissions()["notifications"] == true) { "Enable notifications and the Anchor watch alarms channel with sound before testing." }
    WatchNotifications.alert(context, "Anchor Buddy test alarm", "Confirm that you can hear this test. Do Not Disturb and volume can suppress alerts.", true)
    testedMono = mono()
    data["testAlarmAt"] = wall()
    emit()
  }
  fun prepare(options: AnchorOptions) {
    check(!active) { "Stop the current watch before selecting another anchor." }
    require(options.anchorConfirmed && options.checklistConfirmed && options.testAlarmConfirmed) { "Confirm the anchor, arrival checklist and test alarm before arming." }
    require(options.anchor.latitude.isFinite() && abs(options.anchor.latitude) <= 90 && options.anchor.longitude.isFinite() && abs(options.anchor.longitude) <= 180) { "A valid anchor position is required." }
    require(options.radiusM.isFinite() && options.radiusM in 10.0..10_000.0) { "Radius must be between 10 and 10,000 metres." }
    require(options.maxAccuracyM.isFinite() && options.maxAccuracyM >= 1 && options.maxAccuracyM <= options.radiusM / 2) { "Position accuracy must be between 1 metre and half the radius." }
    require(options.staleAfterMs.isFinite() && options.staleAfterMs in 15_000.0..120_000.0) { "Position expiry must be 15 to 120 seconds." }
    val tested = testedMono
    check(tested != null && mono() >= tested && mono() - tested <= 600_000) { "Run and confirm a test alarm within ten minutes of arming." }
    check(permissions()["canArm"] == true) { "Precise GPS and notification alerts/sound are required." }
    val testedAt = data["testAlarmAt"]
    data = mutableMapOf("state" to "arming", "nativeAvailable" to true, "simulation" to false,
      "serviceRunning" to false, "sessionId" to UUID.randomUUID().toString(),
      "anchor" to mapOf("latitude" to options.anchor.latitude, "longitude" to options.anchor.longitude),
      "radiusM" to options.radiusM, "maxAccuracyM" to options.maxAccuracyM, "staleAfterMs" to options.staleAfterMs,
      "testAlarmAt" to testedAt, "alerts" to mutableListOf<MutableMap<String, Any?>>(), "message" to "Starting native location service; waiting for a fresh accurate position.")
    issue = "healthy"
    latestTimestamp = Double.NEGATIVE_INFINITY
    latestElapsedNanos = Long.MIN_VALUE
    lastUsableMono = mono()
    startupDeadline = mono() + 10_000
    emit()
  }
  fun attach(nativeService: AnchorWatchService): Boolean {
    if (!active) return false
    service = nativeService
    data["serviceRunning"] = true
    data["lastHeartbeatAt"] = wall()
    emit()
    return true
  }
  fun detached(nativeService: AnchorWatchService) {
    if (service !== nativeService) return
    service = null
    if (active) interrupt("Native location service stopped. Test the alarm and re-arm explicitly.")
  }
  @Suppress("UNCHECKED_CAST")
  fun accept(fix: Location, recheck: Boolean = false) {
    if (!active) return
    val timestamp = fix.time.toDouble()
    val ageMs = (SystemClock.elapsedRealtimeNanos() - fix.elapsedRealtimeNanos) / 1_000_000.0
    if (!fix.latitude.isFinite() || !fix.longitude.isFinite() || abs(fix.latitude) > 90 || abs(fix.longitude) > 180 || !fix.hasAccuracy() || fix.accuracy < 0 || !fix.accuracy.isFinite()) return
    if (!recheck && (timestamp <= latestTimestamp || fix.elapsedRealtimeNanos <= latestElapsedNanos)) return
    if (ageMs < -5_000 || ageMs > number("staleAfterMs")) return
    latestTimestamp = timestamp
    latestElapsedNanos = fix.elapsedRealtimeNanos
    data["lastFix"] = mapOf("latitude" to fix.latitude, "longitude" to fix.longitude, "accuracyM" to fix.accuracy.toDouble(), "timestamp" to timestamp)
    val anchor = data["anchor"] as Map<String, Number>
    val distance = distance(anchor["latitude"]!!.toDouble(), anchor["longitude"]!!.toDouble(), fix.latitude, fix.longitude)
    data["distanceM"] = distance
    data["lastHeartbeatAt"] = wall()
    if (fix.accuracy > number("maxAccuracyM")) {
      setIssue("position", "Position accuracy exceeds the configured limit.")
    } else {
      lastUsableMono = mono() - max(0.0, ageMs)
      if (distance - fix.accuracy > number("radiusM")) {
        setIssue("boundary", "Vessel is beyond the confirmed anchor alarm boundary.")
      } else if (distance + fix.accuracy >= number("radiusM")) {
        setIssue("position", "Position uncertainty overlaps the anchor alarm boundary.")
      } else { issue = "healthy"; refreshState() }
    }
    emit()
  }
  private fun distance(aLat: Double, aLon: Double, bLat: Double, bLon: Double): Double {
    val rad = Math.PI / 180
    val x = sin((bLat - aLat) * rad / 2).pow(2) + cos(aLat * rad) * cos(bLat * rad) * sin((bLon - aLon) * rad / 2).pow(2)
    return 6_371_008.8 * 2 * atan2(sqrt(min(1.0, x)), sqrt(max(0.0, 1 - x)))
  }
  fun tick() {
    if (!active || service == null) return
    data["lastHeartbeatAt"] = wall()
    if (permissions()["canArm"] != true) {
      interrupt("Required GPS or notification permissions are unavailable. Monitoring stopped.")
      return
    }
    if (mono() - lastUsableMono > number("staleAfterMs") || mono() < lastUsableMono) {
      setIssue("position", "No recent usable position. Check the device and surroundings.")
    }
    if (alerts().any { it["acknowledged"] == false } && mono() - lastNotificationMono > 60_000) {
      alarm(data["message"] as? String ?: "Check your anchor watch.")
    }
    emit()
  }
  fun locationUnavailable(message: String) {
    if (active) { setIssue("position", message); emit() }
  }
  private fun appendAlert(kind: String, message: String) {
    alerts().add(mutableMapOf("id" to UUID.randomUUID().toString(), "kind" to kind, "message" to message, "occurredAt" to wall(), "acknowledged" to false))
  }
  private fun setIssue(next: String, message: String) {
    if (alerts().none { it["kind"] == next && it["acknowledged"] == false }) {
      appendAlert(next, message)
      alarm(message)
    }
    issue = next
    data["message"] = message
    refreshState()
  }
  private fun refreshState() {
    data["state"] = when {
      issue == "boundary" || alerts().any { it["kind"] == "boundary" && it["acknowledged"] == false } -> "alarm"
      issue == "position" || alerts().any { it["kind"] == "position" && it["acknowledged"] == false } -> "position_uncertain"
      data["lastFix"] == null -> "arming"
      else -> "monitoring"
    }
    if (data["state"] == "monitoring") data["message"] = "Inside the configured boundary; supplemental watch only."
  }
  fun acknowledge(): Map<String, Any?> {
    alerts().forEach { it["acknowledged"] = true }
    if (active) refreshState()
    NotificationManagerCompat.from(context).cancel(WatchNotifications.ALARM_ID)
    emit()
    return snapshot()
  }
  @Suppress("UNCHECKED_CAST")
  fun updateRadius(radius: Double, confirmed: Boolean): Map<String, Any?> {
    check(active && confirmed) { "Explicitly confirm the new radius for an active watch." }
    require(radius.isFinite() && radius in 10.0..10_000.0 && radius >= number("maxAccuracyM") * 2) { "Radius is outside the allowed position accuracy limits." }
    data["radiusM"] = radius
    val fix = data["lastFix"] as? Map<String, Number>
    if (fix != null) {
      val lastLocation = Location(LocationManager.GPS_PROVIDER).apply {
        latitude = fix["latitude"]!!.toDouble(); longitude = fix["longitude"]!!.toDouble()
        accuracy = fix["accuracyM"]!!.toFloat(); time = fix["timestamp"]!!.toLong(); elapsedRealtimeNanos = latestElapsedNanos
      }
      accept(lastLocation, true)
    }
    tick()
    emit()
    return snapshot()
  }
  fun interrupt(message: String) {
    data["state"] = "interrupted"
    data["serviceRunning"] = false
    data["message"] = message
    testedMono = null
    appendAlert("interrupted", message)
    val running = service
    service = null
    running?.shutdown()
    alarm(message)
    emit()
  }
  fun stop(): Map<String, Any?> {
    data["state"] = "idle"
    data["serviceRunning"] = false
    data["message"] = "Watch stopped."
    val running = service
    service = null
    running?.shutdown()
    NotificationManagerCompat.from(context).cancel(WatchNotifications.ALARM_ID)
    emit()
    return snapshot()
  }
  private fun alarm(message: String) {
    lastNotificationMono = mono()
    try { WatchNotifications.alert(context, "Check your anchor watch", message, false) }
    catch (error: Exception) { data["message"] = "Local alert failed: ${error.message}. Check the vessel and device." }
  }
}
