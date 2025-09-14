import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminAgentsScreen from '../screens/admin/AdminAgentsScreen';
import AdminAlertsScreen from '../screens/admin/AdminAlertsScreen';
import AdminAnnouncesScreen from '../screens/admin/AdminAnnouncesScreen';
import AdminClientsScreen from '../screens/admin/AdminClientsScreen';
import AdminProfileScreen from '../screens/admin/AdminProfileScreen';
import ClientScannerScreen from '../screens/client/ClientScannerScreen';

type AdminTabParamList = {
  Dashboard: undefined;
  Agents: undefined;
  Alerts: undefined;
  Announces: undefined;
  Scanner: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<AdminTabParamList>();
const Stack = createStackNavigator();

function AdminTabs() {
  return (
    <Tab.Navigator
      id={undefined}
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'analytics' : 'analytics-outline';
          } else if (route.name === 'Agents') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Alerts') {
            iconName = focused ? 'warning' : 'warning-outline';
          } else if (route.name === 'Announces') {
            iconName = focused ? 'megaphone' : 'megaphone-outline';
          } else if (route.name === 'Scanner') {
            iconName = focused ? 'qr-code' : 'qr-code-outline';
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
        component={AdminDashboardScreen}
        options={{ title: 'Tableau de bord' }}
      />
      <Tab.Screen 
        name="Agents" 
        component={AdminAgentsScreen}
        options={{ title: 'Agents' }}
      />
            <Tab.Screen
              name="Alerts"
              component={AdminAlertsScreen}
              options={{ title: 'Alertes' }}
            />
      <Tab.Screen 
        name="Announces" 
        component={AdminAnnouncesScreen}
        options={{ title: 'Annonces' }}
      />
      <Tab.Screen 
        name="Scanner" 
        component={ClientScannerScreen}
        options={{ title: 'Scanner' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AdminProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}

export default function AdminNavigator() {
  return (
    <Stack.Navigator id={undefined} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AdminTabs" component={AdminTabs} />
      <Stack.Screen name="Clients" component={AdminClientsScreen} />
    </Stack.Navigator>
  );
}