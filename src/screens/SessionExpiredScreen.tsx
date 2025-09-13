import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';

export default function SessionExpiredScreen() {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-1 justify-center items-center px-6">
        <View className="bg-red-50 rounded-full p-6 mb-6">
          <Ionicons name="time-outline" size={64} color="#ef4444" />
        </View>
        
        <Text className="text-2xl font-bold text-gray-900 text-center mb-4">
          Session expirée
        </Text>
        
        <Text className="text-gray-600 text-center mb-8 leading-6">
          Votre session a expiré pour des raisons de sécurité.{'\n'}
          Veuillez vous reconnecter pour continuer.
        </Text>
        
        <TouchableOpacity
          className="w-full bg-primary-900 py-4 rounded-xl"
          onPress={handleSignOut}
        >
          <Text className="text-white text-center font-semibold text-lg">
            Se reconnecter
          </Text>
        </TouchableOpacity>
        
        <View className="mt-8 p-4 bg-blue-50 rounded-xl">
          <View className="flex-row items-start">
            <Ionicons name="information-circle" size={20} color="#3b82f6" />
            <View className="ml-3 flex-1">
              <Text className="text-blue-900 font-medium text-sm">
                Pourquoi ma session a-t-elle expiré ?
              </Text>
              <Text className="text-blue-800 text-xs mt-1 leading-4">
                Les sessions expirent automatiquement après une période d'inactivité pour protéger votre compte.
              </Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}







