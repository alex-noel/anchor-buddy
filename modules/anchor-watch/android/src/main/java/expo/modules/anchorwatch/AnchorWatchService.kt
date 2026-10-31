package expo.modules.anchorwatch

import android.app.Service
import android.content.Intent
import android.content.pm.ServiceInfo
import android.location.Location
import android.location.LocationListener
import android.location.LocationManager
import android.os.Bundle
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.ServiceCompat

/** User-started location foreground service; deliberately neither sticky nor reboot-restored. */
class AnchorWatchService : Service(), LocationListener {
  private lateinit var locations: LocationManager
  private val handler = Handler(Looper.getMainLooper())
  private var registered = false
  private val heartbeat = object : Runnable {
    override fun run() {
      WatchRuntime.tick()
      if (registered) handler.postDelayed(this, 2_000)
    }
  }
  override fun onCreate() {
    super.onCreate()
    WatchRuntime.initialize(applicationContext)
    locations = getSystemService(LOCATION_SERVICE) as LocationManager
  }
  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    try {
      WatchNotifications.createChannels(this)
      ServiceCompat.startForeground(this, WatchNotifications.SERVICE_ID, WatchNotifications.ongoing(this), ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION)
      if (!WatchRuntime.attach(this)) { shutdown(); return START_NOT_STICKY }
      if (!registered) {
        locations.requestLocationUpdates(LocationManager.GPS_PROVIDER, 2_000L, 0f, this, Looper.getMainLooper())
        registered = true
        handler.post(heartbeat)
      }
    } catch (error: Exception) {
      WatchRuntime.interrupt("Unable to start native GPS monitoring: ${error.message}")
      shutdown()
    }
    return START_NOT_STICKY
  }
  override fun onBind(intent: Intent?): IBinder? = null
  override fun onLocationChanged(location: Location) = WatchRuntime.accept(location)
  override fun onProviderDisabled(provider: String) = WatchRuntime.locationUnavailable("GPS was disabled. Check location settings.")
  override fun onProviderEnabled(provider: String) = Unit
  @Deprecated("Legacy Android callback")
  override fun onStatusChanged(provider: String?, status: Int, extras: Bundle?) = Unit
  fun shutdown() {
    handler.removeCallbacks(heartbeat)
    if (registered) { locations.removeUpdates(this); registered = false }
    ServiceCompat.stopForeground(this, ServiceCompat.STOP_FOREGROUND_REMOVE)
    stopSelf()
  }
  override fun onDestroy() {
    handler.removeCallbacks(heartbeat)
    if (registered) { locations.removeUpdates(this); registered = false }
    WatchRuntime.detached(this)
    super.onDestroy()
  }
}
