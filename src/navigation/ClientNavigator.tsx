import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ClientDashboardScreen from '../screens/client/ClientDashboardScreen';
import ClientScannerScreen from '../screens/client/ClientScannerScreen';
import ClientHistoryScreen from '../screens/client/ClientHistoryScreen';
import ClientProfileScreen from '../screens/client/ClientProfileScreen';

const Tab = createBottomTabNavigator();

export default function ClientNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
          } else if (route.name === 'History') {
            iconName = focused ? 'list' : 'list-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#1e3a8a',
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
      })}
    >
      <Tab.Screen 
        name="Dashboard" 
        component={ClientDashboardScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={ClientScannerScreen}
        options={{ title: 'Scanner' }}
      />
      <Tab.Screen 
        name="History" 
        component={ClientHistoryScreen}
        options={{ title: 'Historique' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ClientProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}