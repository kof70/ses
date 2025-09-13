import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function AdminAlertsScreenMinimal() {
  const [filter, setFilter] = useState<'all' | 'active' | 'resolu'>('all');

  const handleFilterPress = (newFilter: 'all' | 'active' | 'resolu') => {
    console.log('[NavTrace] Filter tab pressed', { to: newFilter });
    setFilter(newFilter);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Alertes SOS (Test Minimal)</Text>
        <Text className="text-gray-500 mt-1">Test sans useAuth/useSupabase</Text>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row space-x-4">
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${
              filter === 'all' ? 'bg-primary-900' : 'bg-gray-100'
            }`}
            onPress={() => handleFilterPress('all')}
          >
            <Text
              className={`font-medium ${
                filter === 'all' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Toutes
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${
              filter === 'active' ? 'bg-danger-500' : 'bg-gray-100'
            }`}
            onPress={() => handleFilterPress('active')}
          >
            <Text
              className={`font-medium ${
                filter === 'active' ? 'text-white' : 'text-gray-600'
              }`}
            >
              En cours
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${
              filter === 'resolu' ? 'bg-success-500' : 'bg-gray-100'
            }`}
            onPress={() => handleFilterPress('resolu')}
          >
            <Text
              className={`font-medium ${
                filter === 'resolu' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Résolues
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1">
        <View className="px-6 py-6">
          <View className="bg-white rounded-xl p-8 items-center shadow-sm">
            <Ionicons name="shield-checkmark" size={64} color="#10b981" />
            <Text className="text-gray-500 text-xl font-medium mt-4">
              Test réussi - Filtre: {filter}
            </Text>
            <Text className="text-gray-400 text-center mt-2">
              Pas de crash avec cette version minimale
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
