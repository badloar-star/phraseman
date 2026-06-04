const { AndroidConfig, withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withAndroidLargeScreenSupport(config) {
  return withAndroidManifest(config, (cfg) => {
    const mainActivity = AndroidConfig.Manifest.getMainActivity(cfg.modResults);
    if (!mainActivity) return cfg;

    mainActivity.$ = mainActivity.$ || {};
    mainActivity.$['android:screenOrientation'] = 'unspecified';
    mainActivity.$['android:resizeableActivity'] = 'true';

    return cfg;
  });
};
