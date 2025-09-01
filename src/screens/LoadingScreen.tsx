import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator, Text } from 'react-native';

export default function LoadingScreen() {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.');
    }, 500);

    return () => clearInterval(interval);
  }, []);

  return (
    <View className="flex-1 justify-center items-center bg-white">
      <ActivityIndicator size="large" color="#1e3a8a" />
      <Text className="mt-4 text-lg text-gray-600">Chargement{dots}</Text>
      <Text className="mt-2 text-sm text-gray-400">Vérification de l'authentification...</Text>
    </View>
  );
}