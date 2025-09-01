import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function PendingApprovalScreen() {
  const { signOut } = useAuth();
  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-8">
        <Ionicons name="time" size={64} color="#1e3a8a" />
        <Text className="text-2xl font-bold text-gray-900 mt-4">Compte en validation</Text>
        <Text className="text-gray-600 text-center mt-2">
          Votre compte est en attente de validation par un administrateur propriétaire.
          Vous recevrez l'accès dès qu'il aura approuvé votre inscription.
        </Text>
        <TouchableOpacity
          onPress={signOut}
          className="mt-8 bg-primary-900 px-6 py-3 rounded-lg"
        >
          <Text className="text-white font-semibold">Se déconnecter</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

