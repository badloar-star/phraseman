/** @see https://docs.swmansion.com/react-native-reanimated/ — `babel-preset-expo` підставляє `react-native-reanimated/plugin` останнім, якщо reanimated встановлено. */
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
