import 'react-native-gesture-handler';
import './global.css'; // NativeWind styles restored
import 'react-native-url-polyfill/auto';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStackNavigator } from '@react-navigation/stack';
import { AuthProvider } from './src/contexts/AuthContext';
import { NotificationProvider } from './src/contexts/NotificationContext';
import { SupabaseProvider } from './src/contexts/SupabaseContext';
import AuthNavigator from './src/navigation/AuthNavigator';
import AppNavigator from './src/navigation/AppNavigator';
import { useAuth } from './src/contexts/AuthContext';
import LoadingScreen from './src/screens/LoadingScreen';
import PendingApprovalScreen from './src/screens/PendingApprovalScreen';
import SessionExpiredScreen from './src/screens/SessionExpiredScreen';
import { View, Text } from 'react-native';

const Stack = createStackNavigator();

function AppContent() {
  const { user, userProfile, loading, offlineReadOnly, sessionExpired } = useAuth();
  const insets = useSafeAreaInsets();

  React.useEffect(() => {
    console.log('[NavTrace] AppContent mounted');
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  if (sessionExpired) {
    return <SessionExpiredScreen />;
  }

  const isPending = user && userProfile && userProfile.statut !== 'actif';

  return (
    <>
      {console.log('[NavTrace] Rendering Navigation tree', {
        hasUser: !!user,
        hasProfile: !!userProfile,
        isPending,
      })}
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
      {offlineReadOnly && (
        <View
          style={{
            position: 'absolute',
            top: insets.top,
            left: 0,
            right: 0,
            paddingVertical: 8,
            backgroundColor: '#F59E0B',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: 'white', fontWeight: '600' }}>Hors ligne - lecture seule</Text>
        </View>
      )}
    </>
  );
}

export default function App() {

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <SupabaseProvider>
          <AuthProvider>
            <NotificationProvider>
              <AppContent />
              <StatusBar style="auto" />
            </NotificationProvider>
          </AuthProvider>
        </SupabaseProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}