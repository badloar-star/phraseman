// Adds manifest meta-data read by patched expo-dev-launcher (see patches/expo-dev-launcher*.patch).
// Эмулятор: http://127.0.0.1:8081 + `adb reverse tcp:8081` (см. scripts/start-metro-emu.ps1) — на Windows
// часто стабильнее, чем 10.0.2.2 (SocketTimeout).
//
// DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE=false: иначе при cold start сначала грузится «последний» packager
// URL (часто старый LAN после смены сети) — загрузка замирает на 100% и не доходит до fallback 127.0.0.1.
const { withAndroidManifest, AndroidConfig } = require('@expo/config-plugins');

/** @param {import('@expo/config').ExpoConfig} config */
module.exports = function withAndroidDevClientAutoMetro(config) {
  const scheme =
    typeof config.scheme === 'string'
      ? config.scheme
      : Array.isArray(config.scheme)
        ? config.scheme[0]
        : 'phraseman';
  const launcherScheme = `exp+${scheme ?? 'phraseman'}`;

  return withAndroidManifest(config, (mod) => {
    const mainApplication = AndroidConfig.Manifest.getMainApplicationOrThrow(mod.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'DEV_CLIENT_FALLBACK_PACKAGER_URL',
      'http://127.0.0.1:8081'
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'DEV_CLIENT_FALLBACK_LAUNCHER_SCHEME',
      launcherScheme
    );
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(
      mainApplication,
      'DEV_CLIENT_TRY_TO_LAUNCH_LAST_BUNDLE',
      'false'
    );
    return mod;
  });
};
