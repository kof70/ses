import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { ClientScannerScreen } from '../src/screens/client/ClientScannerScreen';

// Mock des permissions de caméra
jest.mock('expo-camera', () => {
  const mockReact = require('react');
  const mockRN = require('react-native');
  
  return {
    useCameraPermissions: () => [true, null],
    CameraView: ({ onBarcodeScanned, style, children }) => {
      return mockReact.createElement(mockRN.View, {
        style,
        testID: 'camera-view'
      }, [
        mockReact.createElement(mockRN.TouchableOpacity, {
          key: 'mock-scan-button',
          onPress: () => {
            onBarcodeScanned && onBarcodeScanned({
              data: 'test-qr-code',
              type: 'qr'
            });
          },
          testID: 'mock-scan-button'
        }, [
          mockReact.createElement(mockRN.Text, { key: 'mock-scan-text' }, 'Mock Scan Button')
        ]),
        children
      ]);
    }
  };
});

// Mock des contextes
jest.mock('../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id' },
    signOut: jest.fn()
  })
}));

jest.mock('../src/contexts/SupabaseContext', () => ({
  useSupabase: () => ({
    supabase: {
      from: () => ({
        insert: () => ({
          select: () => Promise.resolve({ data: [], error: null })
        })
      })
    }
  })
}));

// Mock de la navigation
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: jest.fn(),
  useNavigation: () => ({
    navigate: jest.fn()
  })
}));

describe('ClientScannerScreen (expo-camera)', () => {
  it('should render without crashing', () => {
    const { getByTestId } = render(<ClientScannerScreen />);
    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('should handle barcode scan with expo-camera', () => {
    const { getByTestId } = render(<ClientScannerScreen />);
    
    // Simuler un scan de code-barres
    fireEvent.press(getByTestId('mock-scan-button'));
    
    // Vérifier que le composant ne crash pas
    expect(getByTestId('camera-view')).toBeTruthy();
  });

  it('should display camera permissions message when not granted', () => {
    // Mock des permissions refusées
    jest.doMock('expo-camera', () => ({
      useCameraPermissions: () => [false, null],
      CameraView: () => null
    }));

    const { getByText } = render(<ClientScannerScreen />);
    expect(getByText(/camera permission/i)).toBeTruthy();
  });
});



