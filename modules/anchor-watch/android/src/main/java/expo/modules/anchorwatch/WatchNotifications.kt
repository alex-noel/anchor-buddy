package expo.modules.anchorwatch

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioAttributes
import android.media.RingtoneManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat

internal object WatchNotifications {
  const val SERVICE_ID = 9710
  const val ALARM_ID = 9711
  private const val TEST_ID = 9712
  private const val STATUS_CHANNEL = "anchorai-watch-status-v1"
  private const val ALARM_CHANNEL = "anchorai-watch-alarm-v1"
  fun createChannels(context: Context) {
    val manager = context.getSystemService(NotificationManager::class.java)
    val status = NotificationChannel(STATUS_CHANNEL, "Anchor watch status", NotificationManager.IMPORTANCE_LOW)
    status.description = "Ongoing location foreground service"
    val alarm = NotificationChannel(ALARM_CHANNEL, "Anchor watch alarms", NotificationManager.IMPORTANCE_HIGH)
    alarm.description = "Boundary breaches and unreliable positioning while the watch is armed"
    alarm.enableVibration(true)
    alarm.setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM), AudioAttributes.Builder()
      .setUsage(AudioAttributes.USAGE_ALARM).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build())
    manager.createNotificationChannels(listOf(status, alarm))
  }
  fun alertsAvailable(context: Context): Boolean {
    if (Build.VERSION.SDK_INT >= 33 && ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) return false
    if (!NotificationManagerCompat.from(context).areNotificationsEnabled()) return false
    val channel = context.getSystemService(NotificationManager::class.java).getNotificationChannel(ALARM_CHANNEL)
    return channel != null && channel.importance >= NotificationManager.IMPORTANCE_DEFAULT && channel.sound != null
  }
  private fun intent(context: Context): PendingIntent? {
    val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    return PendingIntent.getActivity(context, 9710, launch, PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT)
  }
  fun ongoing(context: Context): Notification = NotificationCompat.Builder(context, STATUS_CHANNEL)
    .setSmallIcon(android.R.drawable.ic_menu_mylocation)
    .setContentTitle("Anchor Buddy watch is armed")
    .setContentText("Native position checks are running. Open Anchor Buddy to check accuracy and alerts.")
    .setOngoing(true).setOnlyAlertOnce(true).setCategory(NotificationCompat.CATEGORY_SERVICE)
    .setContentIntent(intent(context)).build()
  fun alert(context: Context, title: String, message: String, test: Boolean) {
    check(alertsAvailable(context)) { "Notifications or alarm sounds are disabled." }
    val notification = NotificationCompat.Builder(context, ALARM_CHANNEL)
      .setSmallIcon(android.R.drawable.ic_dialog_alert).setContentTitle(title).setContentText(message)
      .setStyle(NotificationCompat.BigTextStyle().bigText(message)).setPriority(NotificationCompat.PRIORITY_HIGH)
      .setCategory(NotificationCompat.CATEGORY_ALARM).setAutoCancel(true)
      .setContentIntent(intent(context)).build()
    NotificationManagerCompat.from(context).notify(if (test) TEST_ID else ALARM_ID, notification)
  }
}
