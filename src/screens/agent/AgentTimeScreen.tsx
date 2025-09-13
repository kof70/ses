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
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function AgentTimeScreen() {
  const { userProfile, offlineReadOnly, assertOnlineOrThrow } = useAuth();
  const supabase = useSupabase();
  const [agentData, setAgentData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleCheckIn = async () => {
    setActionLoading(true);
    
    try {
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('agents')
        .update({
          heure_arrivee: now,
          disponibilite: 'disponible',
          updated_at: now,
        })
        .eq('user_id', userProfile?.id);

      if (error) {
        throw error;
      }

      Alert.alert('Succès', 'Heure d\'arrivée enregistrée');
      fetchAgentData();
    } catch (error) {
      console.error('Error checking in:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'heure d\'arrivée');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    Alert.alert(
      'Confirmation',
      'Êtes-vous sûr de vouloir enregistrer votre heure de départ ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: confirmCheckOut },
      ]
    );
  };

  const confirmCheckOut = async () => {
    setActionLoading(true);
    
    try {
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('agents')
        .update({
          heure_depart: now,
          disponibilite: 'indisponible',
          updated_at: now,
        })
        .eq('user_id', userProfile?.id);

      if (error) {
        throw error;
      }

      Alert.alert('Succès', 'Heure de départ enregistrée');
      fetchAgentData();
    } catch (error) {
      console.error('Error checking out:', error);
      Alert.alert('Erreur', 'Impossible d\'enregistrer l\'heure de départ');
    } finally {
      setActionLoading(false);
    }
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Non enregistré';
    
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const calculateWorkTime = () => {
    if (!agentData?.heure_arrivee) return null;
    
    const start = new Date(agentData.heure_arrivee);
    const end = agentData.heure_depart ? new Date(agentData.heure_depart) : new Date();
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${diffHours}h ${diffMinutes}min`;
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

  const isCheckedIn = agentData?.heure_arrivee && !agentData?.heure_depart;
  const isCheckedOut = agentData?.heure_arrivee && agentData?.heure_depart;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header - style clair */}
        <View className="bg-white px-6 py-6 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">Gestion des horaires</Text>
          <Text className="text-gray-500 mt-1">
            {formatDate(new Date().toISOString())}
          </Text>
        </View>

        <View className="px-6 py-6 space-y-6">
          {/* Current Status */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Statut aujourd'hui
            </Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="log-in" size={24} color="#10b981" />
                  <Text className="text-gray-700 ml-3">Heure d'arrivée</Text>
                </View>
                <Text className="text-gray-900 font-medium">
                  {formatTime(agentData?.heure_arrivee)}
                </Text>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="log-out" size={24} color="#ef4444" />
                  <Text className="text-gray-700 ml-3">Heure de départ</Text>
                </View>
                <Text className="text-gray-900 font-medium">
                  {formatTime(agentData?.heure_depart)}
                </Text>
              </View>
              
              {agentData?.heure_arrivee && (
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="time" size={24} color="#3b82f6" />
                    <Text className="text-gray-700 ml-3">Temps de travail</Text>
                  </View>
                  <Text className="text-gray-900 font-medium">
                    {calculateWorkTime()}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Buttons */}
          <View className="space-y-4">
            {!isCheckedIn && !isCheckedOut && (
              <TouchableOpacity
                className={`rounded-xl p-6 items-center shadow-sm ${
                  offlineReadOnly ? 'bg-gray-300' : 'bg-success-500'
                } ${actionLoading ? 'opacity-50' : ''}`}
                onPress={handleCheckIn}
                disabled={actionLoading || offlineReadOnly}
              >
                <Ionicons name="log-in" size={32} color="white" />
                <Text className="text-white text-xl font-bold mt-2">
                  {actionLoading ? 'Enregistrement...' : 'Enregistrer l\'arrivée'}
                </Text>
                <Text className="text-green-100 text-sm mt-1">
                  Marquer le début de votre service
                </Text>
              </TouchableOpacity>
            )}

            {isCheckedIn && (
              <TouchableOpacity
                className={`rounded-xl p-6 items-center shadow-sm ${
                  offlineReadOnly ? 'bg-gray-300' : 'bg-danger-500'
                } ${actionLoading ? 'opacity-50' : ''}`}
                onPress={handleCheckOut}
                disabled={actionLoading || offlineReadOnly}
              >
                <Ionicons name="log-out" size={32} color="white" />
                <Text className="text-white text-xl font-bold mt-2">
                  {actionLoading ? 'Enregistrement...' : 'Enregistrer le départ'}
                </Text>
                <Text className="text-red-100 text-sm mt-1">
                  Marquer la fin de votre service
                </Text>
              </TouchableOpacity>
            )}

            {isCheckedOut && (
              <View className="bg-gray-100 rounded-xl p-6 items-center">
                <Ionicons name="checkmark-circle" size={32} color="#10b981" />
                <Text className="text-gray-700 text-xl font-bold mt-2">
                  Service terminé
                </Text>
                <Text className="text-gray-500 text-sm mt-1">
                  Votre journée de travail est enregistrée
                </Text>
              </View>
            )}
          </View>

          {/* Instructions */}
          <View className="bg-blue-50 rounded-xl p-6">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-900 font-semibold mb-2">
                  Instructions
                </Text>
                <Text className="text-blue-800 text-sm leading-5">
                  • Enregistrez votre heure d'arrivée au début de votre service{'\n'}
                  • N'oubliez pas d'enregistrer votre heure de départ à la fin{'\n'}
                  • Vos horaires sont automatiquement synchronisés avec l'administration
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}