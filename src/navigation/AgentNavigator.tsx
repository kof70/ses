import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import AgentDashboardScreen from '../screens/agent/AgentDashboardScreen';
import AgentTimeScreen from '../screens/agent/AgentTimeScreen';
import AgentAnnouncesScreen from '../screens/agent/AgentAnnouncesScreen';
import AgentProfileScreen from '../screens/agent/AgentProfileScreen';

const Tab = createBottomTabNavigator();

export default function AgentNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'Time') {
            iconName = focused ? 'time' : 'time-outline';
          } else if (route.name === 'Announces') {
            iconName = focused ? 'notifications' : 'notifications-outline';
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
        component={AgentDashboardScreen}
        options={{ title: 'Accueil' }}
      />
      <Tab.Screen 
        name="Time" 
        component={AgentTimeScreen}
        options={{ title: 'Horaires' }}
      />
      <Tab.Screen 
        name="Announces" 
        component={AgentAnnouncesScreen}
        options={{ title: 'Annonces' }}
      />
      <Tab.Screen 
        name="Profile" 
        component={AgentProfileScreen}
        options={{ title: 'Profil' }}
      />
    </Tab.Navigator>
  );
}