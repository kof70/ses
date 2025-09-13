import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function OfflineScreen() {
  const { tryReconnectWithBackoff, signOut, lastKnownProfile, setOfflineReadOnly } = useAuth();

  const onRetry = async () => {
    const ok = await tryReconnectWithBackoff();
    if (!ok && lastKnownProfile) {
      // Optionnel: rester sur l'écran pour un nouvel essai
    }
  };

  const onContinueOffline = () => {
    setOfflineReadOnly(true);
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-6">
      <Text className="text-xl font-semibold text-gray-900 mb-2">Connexion indisponible</Text>
      <Text className="text-gray-600 mb-6 text-center">Impossible de contacter le serveur.</Text>

      <TouchableOpacity onPress={onRetry} className="w-full bg-blue-600 py-3 rounded-md mb-3">
        <Text className="text-white text-center font-medium">Réessayer</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={signOut} className="w-full bg-gray-200 py-3 rounded-md mb-3">
        <Text className="text-gray-900 text-center font-medium">Se reconnecter</Text>
      </TouchableOpacity>

      {lastKnownProfile && (
        <TouchableOpacity onPress={onContinueOffline} className="w-full border border-gray-300 py-3 rounded-md">
          <Text className="text-gray-900 text-center font-medium">Continuer hors-ligne (lecture seule)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}










