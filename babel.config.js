/**
 * @see https://docs.expo.dev/versions/latest/config/babel/
 * `babel-preset-expo` (SDK 54) automatically adds the `react-native-worklets`
 * Babel plugin LAST when react-native-reanimated v4 + react-native-worklets are
 * installed. Without this config file the worklets plugin is never applied, so
 * `useAnimatedStyle` / worklets crash app-wide with:
 *   "You attempted to set the key `current` ... immutable and has been frozen."
 */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
