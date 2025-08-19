import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import AgentNavigator from './AgentNavigator';
import ClientNavigator from './ClientNavigator';
import AdminNavigator from './AdminNavigator';
import LoadingScreen from '../screens/LoadingScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { userProfile, loading } = useAuth();

  if (loading || !userProfile) {
    return <LoadingScreen />;
  }

  const getNavigatorByRole = () => {
    switch (userProfile.role) {
      case 'agent':
        return AgentNavigator;
      case 'client':
        return ClientNavigator;
      case 'admin':
        return AdminNavigator;
      default:
        return LoadingScreen;
    }
  };

  const Navigator = getNavigatorByRole();

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={Navigator} />
    </Stack.Navigator>
  );
}