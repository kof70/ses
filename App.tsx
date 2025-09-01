import 'react-native-gesture-handler';
import './global.css'; // NativeWind styles restored
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { SupabaseProvider } from './src/contexts/SupabaseContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuth } from './src/contexts/AuthContext';
import LoadingScreen from './src/screens/LoadingScreen';
import PendingApprovalScreen from './src/screens/PendingApprovalScreen';

const Stack = createStackNavigator();

function AppContent() {
  const { user, userProfile, loading } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  const isPending = user && userProfile && userProfile.statut !== 'actif';

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          isPending ? (
            <Stack.Screen name="Pending" component={PendingApprovalScreen} />
          ) : (
            <Stack.Screen name="App" component={AppNavigator} />
          )
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <SupabaseProvider>
      <AuthProvider>
        <NotificationProvider>
          <AppContent />
          <StatusBar style="auto" />
        </NotificationProvider>
      </AuthProvider>
    </SupabaseProvider>
  );
}