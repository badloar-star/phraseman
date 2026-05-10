// После `expo prebuild` в android/app/build.gradle часто снова попадает дефолт 10.0.2.2:8081 —
// на Windows это даёт SocketTimeout. localhost + `adb reverse tcp:8081` стабильнее.
const { withAppBuildGradle } = require('@expo/config-plugins');

/** @param {import('@expo/config').ExpoConfig} config */
module.exports = function withAndroidDevServer127(config) {
  return withAppBuildGradle(config, (mod) => {
    let src = mod.modResults.contents;
    src = src.replace(
      "expoDevServerUrl = 'http://10.0.2.2:8081'",
      "expoDevServerUrl = 'http://127.0.0.1:8081'"
    );
    src = src.replace(
      'expoDevServerUrl = "http://10.0.2.2:8081"',
      'expoDevServerUrl = "http://127.0.0.1:8081"'
    );
    mod.modResults.contents = src;
    return mod;
  });
};
