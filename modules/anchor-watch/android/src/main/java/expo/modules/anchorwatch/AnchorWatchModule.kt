package expo.modules.anchorwatch

import android.Manifest
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Handler
import android.os.Looper
import androidx.core.content.ContextCompat
import expo.modules.kotlin.Promise
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

class AnchorCoordinate : Record {
  @Field var latitude: Double = 0.0
  @Field var longitude: Double = 0.0
}
class AnchorOptions : Record {
  @Field var anchor: AnchorCoordinate = AnchorCoordinate()
  @Field var radiusM: Double = 0.0
  @Field var anchorConfirmed: Boolean = false
  @Field var checklistConfirmed: Boolean = false
  @Field var testAlarmConfirmed: Boolean = false
  @Field var maxAccuracyM: Double = 20.0
  @Field var staleAfterMs: Double = 30_000.0
}

class AnchorWatchModule : Module() {
  private fun context(): Context = requireNotNull(appContext.reactContext) { "React context is unavailable." }
  override fun definition() = ModuleDefinition {
    Name("AnchorWatch")
    Events("onStatus")
    OnStartObserving {
      Handler(Looper.getMainLooper()).post { WatchRuntime.listener = { sendEvent("onStatus", it) } }
    }
    OnStopObserving { Handler(Looper.getMainLooper()).post { WatchRuntime.listener = null } }
    AsyncFunction("getStatus") {
      WatchRuntime.initialize(context())
      WatchRuntime.verifiedStatus()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("requestPermissions") { promise: Promise ->
      val context = context()
      WatchRuntime.initialize(context)
      WatchNotifications.createChannels(context)
      val permissions = mutableListOf(Manifest.permission.ACCESS_COARSE_LOCATION, Manifest.permission.ACCESS_FINE_LOCATION)
      if (Build.VERSION.SDK_INT >= 33) permissions.add(Manifest.permission.POST_NOTIFICATIONS)
      val manager = appContext.permissions
      if (manager == null) {
        promise.reject("E_PERMISSIONS", "Expo permissions manager is unavailable.", null)
      } else {
        manager.askForPermissions({ _ ->
          Handler(Looper.getMainLooper()).post { promise.resolve(WatchRuntime.permissions()) }
        }, *permissions.toTypedArray())
      }
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("testAlarm") {
      WatchRuntime.initialize(context())
      WatchRuntime.testAlarm()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("arm") { options: AnchorOptions ->
      val context = context()
      WatchRuntime.initialize(context)
      check(appContext.currentActivity?.hasWindowFocus() == true) { "Arm the watch while the app is visible." }
      WatchRuntime.prepare(options)
      try {
        ContextCompat.startForegroundService(context, Intent(context, AnchorWatchService::class.java))
      } catch (error: Exception) {
        WatchRuntime.interrupt("Unable to start the native location service: ${error.message}")
        throw error
      }
      WatchRuntime.snapshot()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("acknowledge") {
      WatchRuntime.initialize(context())
      WatchRuntime.acknowledge()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("stop") {
      WatchRuntime.initialize(context())
      WatchRuntime.stop()
    }.runOnQueue(Queues.MAIN)
    AsyncFunction("updateRadius") { radiusM: Double, confirmed: Boolean ->
      WatchRuntime.initialize(context())
      WatchRuntime.updateRadius(radiusM, confirmed)
    }.runOnQueue(Queues.MAIN)
  }
}
