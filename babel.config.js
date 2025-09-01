module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      'babel-preset-expo',
      // Correct: NativeWind provides a Babel preset
      'nativewind/babel',
    ],
    plugins: [
      // Reanimated plugin must be listed last
      'react-native-reanimated/plugin',
    ],
  };
};