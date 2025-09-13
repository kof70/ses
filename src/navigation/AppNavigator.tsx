import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { useAuth } from '../contexts/AuthContext';
import AgentNavigator from './AgentNavigator';
import ClientNavigator from './ClientNavigator';
import AdminNavigator from './AdminNavigator';
import LoadingScreen from '../screens/LoadingScreen';
import OfflineScreen from '../screens/OfflineScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';

const Stack = createStackNavigator();

export default function AppNavigator() {
  const { userProfile, loading, offlineReadOnly, initTimedOut, lastKnownRole } = useAuth();

  if (loading) {
    return <LoadingScreen />;
  }

  // Si le timeout d'init est atteint et pas de profil mais on a un rôle connu => écran offline
  if (!userProfile && initTimedOut && lastKnownRole && !offlineReadOnly) {
    return <OfflineScreen />;
  }

  // Mode hors-ligne en lecture seule: router par rôle connu
  if (offlineReadOnly && !userProfile && lastKnownRole) {
    const Navigator = lastKnownRole === 'agent' ? AgentNavigator : lastKnownRole === 'client' ? ClientNavigator : AdminNavigator;
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Main" component={Navigator} />
      </Stack.Navigator>
    );
  }

  const getNavigatorByRole = () => {
    if (!userProfile) {
      return LoadingScreen;
    }
    // Rediriger vers l'attente d'approbation si le compte n'est pas actif
    if (userProfile.statut && userProfile.statut !== 'actif') {
      return PendingApprovalScreen;
    }
    
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