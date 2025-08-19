import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function LoadingScreen() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#1e3a8a" />
      <Text className="mt-4 text-lg text-gray-600">Chargement...</Text>
    </View>
  );
}