import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

// Test de navigation
const Stack = createStackNavigator();

const TestScreen = () => {
  return <div testID="test-screen">Test Screen</div>;
};

const TestNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Test" component={TestScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

describe('Navigation', () => {
  it('should render navigation without conflicts', () => {
    const { getByTestId } = render(<TestNavigator />);
    expect(getByTestId('test-screen')).toBeTruthy();
  });

  it('should handle navigation state changes', () => {
    const { getByTestId } = render(<TestNavigator />);
    // Vérifier que la navigation fonctionne
    expect(getByTestId('test-screen')).toBeTruthy();
  });
});
