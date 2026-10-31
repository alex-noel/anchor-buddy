const { withInfoPlist, withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/** Native implementation is autolinked by Expo; this plugin supplies host capabilities. */
module.exports = function withAnchorWatch(config) {
  config = withInfoPlist(config, (mod) => {
    mod.modResults.UIBackgroundModes = [...new Set([...(mod.modResults.UIBackgroundModes || []), 'location'])];
    mod.modResults.NSLocationWhenInUseUsageDescription = 'Anchor Buddy uses your precise position to compare your vessel with the anchor boundary you confirm.';
    mod.modResults.NSLocationAlwaysAndWhenInUseUsageDescription = 'An armed anchor watch checks your position while the screen is locked and alerts if the vessel leaves your chosen boundary or positioning becomes unreliable.';
    return mod;
  });
  config = withAndroidManifest(config, (mod) => {
    const permissions = ['android.permission.ACCESS_FINE_LOCATION', 'android.permission.ACCESS_COARSE_LOCATION',
      'android.permission.FOREGROUND_SERVICE', 'android.permission.FOREGROUND_SERVICE_LOCATION',
      'android.permission.POST_NOTIFICATIONS'];
    mod.modResults.manifest['uses-permission'] ||= [];
    for (const name of permissions) {
      if (!mod.modResults.manifest['uses-permission'].some((item) => item.$['android:name'] === name)) {
        mod.modResults.manifest['uses-permission'].push({ $: { 'android:name': name } });
      }
    }
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    application.service ||= [];
    if (!application.service.some((item) => item.$['android:name'] === 'expo.modules.anchorwatch.AnchorWatchService')) {
      application.service.push({ $: { 'android:name': 'expo.modules.anchorwatch.AnchorWatchService',
        'android:foregroundServiceType': 'location', 'android:exported': 'false', 'android:stopWithTask': 'false' } });
    }
    return mod;
  });
  return config;
};
