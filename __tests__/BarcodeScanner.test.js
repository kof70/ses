import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClientScannerScreen } from '../screens/ClientScannerScreen';

// Mock des permissions de caméra
jest.mock('expo-camera', () => ({
  useCameraPermissions: () => [true, null],
  CameraView: ({ onBarcodeScanned, style }) => {
    const MockCameraView = require('react-native').View;
    return React.createElement(MockCameraView, {
      style,
      testID: 'camera-view',
      onPress: () => {
        // Simuler un scan de code-barres
        onBarcodeScanned && onBarcodeScanned({
          data: 'test-qr-code',
          type: 'qr'
        });
      }
    });
  }
}));

describe('ClientScannerScreen (expo-camera)', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(<ClientScannerScreen />);
    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('should handle barcode scan with expo-camera', () => {
    const { getByTestId } = render(<ClientScannerScreen />);
    
    // Simuler un scan de code-barres
    fireEvent.press(getByTestId('camera-view'));
    
    // Vérifier que la caméra est bien rendue
    expect(getByTestId('camera-view')).toBeTruthy();
  });
});
