import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useNotifications } from '../../contexts/NotificationContext';
import * as Location from 'expo-location';

export default function AgentDashboardScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const { sendNotification } = useNotifications();
  const [agentData, setAgentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const fetchAgentData = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();

      if (error) {
        console.error('Error fetching agent data:', error);
        return;
      }

      setAgentData(data);
    } catch (error) {
      console.error('Error fetching agent data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
  }, [userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgentData();
  };

  const handleSOS = async () => {
    Alert.alert(
      'Alerte SOS',
      'Êtes-vous sûr de vouloir déclencher une alerte SOS ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', style: 'destructive', onPress: sendSOS },
      ]
    );
  };

  const sendSOS = async () => {
    setSosLoading(true);
    
    try {
      // Get current location
      let location = null;
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const currentLocation = await Location.getCurrentPositionAsync({});
        location = {
          latitude: currentLocation.coords.latitude,
          longitude: currentLocation.coords.longitude,
        };
      }

      // Create SOS alert
      const { error } = await supabase
        .from('sos_alerts')
        .insert({
          agent_id: agentData?.id,
          type: 'agent_sos',
          message: `Alerte SOS déclenchée par l'agent ${userProfile?.nom}`,
          statut: 'en_cours',
          latitude: location?.latitude,
          longitude: location?.longitude,
        });

      if (error) {
        throw error;
      }

      await sendNotification(
        'SOS Envoyé',
        'Votre alerte SOS a été envoyée avec succès'
      );

      Alert.alert(
        'SOS Envoyé',
        'Votre alerte SOS a été envoyée. L\'administration a été notifiée.'
      );
    } catch (error) {
      console.error('Error sending SOS:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'alerte SOS');
    } finally {
      setSosLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'bg-success-500';
      case 'en_mission':
        return 'bg-warning-500';
      case 'indisponible':
        return 'bg-danger-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'Disponible';
      case 'en_mission':
        return 'En mission';
      case 'indisponible':
        return 'Indisponible';
      default:
        return 'Inconnu';
    }
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Chargement...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <View className="bg-primary-900 px-6 py-8">
          <Text className="text-white text-2xl font-bold">
            Bonjour, {userProfile?.nom}
          </Text>
          <Text className="text-primary-100 mt-1">Agent de sécurité</Text>
        </View>

        <View className="px-6 py-6 space-y-6">
          {/* Status Card */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">Statut actuel</Text>
              <View
                className={`px-3 py-1 rounded-full ${getStatusColor(
                  agentData?.disponibilite || 'indisponible'
                )}`}
              >
                <Text className="text-white text-sm font-medium">
                  {getStatusText(agentData?.disponibilite || 'indisponible')}
                </Text>
              </View>
            </View>
            
            {agentData?.zone_assignee && (
              <View className="flex-row items-center">
                <Ionicons name="location" size={20} color="#6b7280" />
                <Text className="text-gray-600 ml-2">Zone: {agentData.zone_assignee}</Text>
              </View>
            )}
          </View>

          {/* QR Code Card */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4 text-center">
              Mon QR Code
            </Text>
            <View className="items-center">
              {agentData?.qr_code && (
                <QRCode
                  value={agentData.qr_code}
                  size={200}
                  backgroundColor="white"
                  color="black"
                />
              )}
              <Text className="text-gray-500 text-sm mt-4 text-center">
                Les clients peuvent scanner ce code pour vérifier votre statut
              </Text>
            </View>
          </View>

          {/* SOS Button */}
          <TouchableOpacity
            className={`bg-danger-500 rounded-xl p-6 items-center shadow-sm ${
              sosLoading ? 'opacity-50' : ''
            }`}
            onPress={handleSOS}
            disabled={sosLoading}
          >
            <Ionicons name="warning" size={32} color="white" />
            <Text className="text-white text-xl font-bold mt-2">
              {sosLoading ? 'Envoi...' : 'ALERTE SOS'}
            </Text>
            <Text className="text-red-100 text-sm mt-1">
              Appuyez en cas d'urgence
            </Text>
          </TouchableOpacity>

          {/* Quick Actions */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Actions rapides
            </Text>
            <View className="space-y-3">
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="time" size={24} color="#1e3a8a" />
                <Text className="text-gray-900 ml-3 font-medium">
                  Gérer mes horaires
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="notifications" size={24} color="#1e3a8a" />
                <Text className="text-gray-900 ml-3 font-medium">
                  Voir les annonces
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}