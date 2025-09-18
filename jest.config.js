module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|@react-navigation|expo|@expo|expo-font|expo-camera|@expo/vector-icons|react-native-reanimated|react-native-screens|react-native-gesture-handler|react-native-vector-icons|@react-native-community|@react-native-picker)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  collectCoverageFrom: [
    '**/*.{js,jsx}',
    '!**/node_modules/**',
    '!**/__tests__/**',
    '!**/android/**',
    '!**/ios/**',
  ],
  moduleNameMapper: {
    '^@expo/vector-icons/(.*)$': '<rootDir>/node_modules/@expo/vector-icons/$1',
  },
};
