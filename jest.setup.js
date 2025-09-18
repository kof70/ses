import '@testing-library/jest-native/extend-expect';

// Mock expo-camera
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [true, null],
  CameraView: ({ onBarcodeScanned, style, children }) => {
    const React = require('react');
    const { View, TouchableOpacity, Text } = require('react-native');
    
    return React.createElement(View, {
      style,
      testID: 'camera-view'
    }, [
      React.createElement(TouchableOpacity, {
        key: 'mock-scan-button',
        onPress: () => {
          onBarcodeScanned && onBarcodeScanned({
            data: 'test-qr-code',
            type: 'qr'
          });
        },
        testID: 'mock-scan-button'
      }, [
        React.createElement(Text, { key: 'mock-scan-text' }, 'Mock Scan Button')
      ]),
      children
    ]);
  }
}));

// Mock react-native-reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock react-native-gesture-handler
jest.mock('react-native-gesture-handler', () => {
  const View = require('react-native').View;
  return {
    Swipeable: View,
    DrawerLayout: View,
    State: {},
    ScrollView: View,
    Slider: View,
    Switch: View,
    TextInput: View,
    ToolbarAndroid: View,
    ViewPagerAndroid: View,
    DrawerLayoutAndroid: View,
    WebView: View,
    NativeViewGestureHandler: View,
    TapGestureHandler: View,
    FlingGestureHandler: View,
    ForceTouchGestureHandler: View,
    LongPressGestureHandler: View,
    PanGestureHandler: View,
    PinchGestureHandler: View,
    RotationGestureHandler: View,
    RawButton: View,
    BaseButton: View,
    RectButton: View,
    BorderlessButton: View,
    FlatList: View,
    gestureHandlerRootHOC: jest.fn(),
    Directions: {},
  };
});

// Mock @expo/vector-icons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
  FontAwesome: 'FontAwesome',
  AntDesign: 'AntDesign',
}));

// Mock expo-font
jest.mock('expo-font', () => ({
  useFonts: () => [true, null],
  loadAsync: jest.fn(),
}));
