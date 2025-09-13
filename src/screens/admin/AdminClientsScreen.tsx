import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function AdminClientsScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'actif' | 'inactif'>('all');

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          user_id,
          last_latitude,
          last_longitude,
          last_position_at,
          users:users!clients_user_id_fkey (
            id,
            nom,
            email,
            role,
            statut,
            phone_number
          )
        `)
        .order('last_position_at', { ascending: false });

      if (error) {
        console.error('Error fetching clients:', error);
        Alert.alert('Erreur', 'Impossible de charger les clients');
        return;
      }

      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchClients();
  };

  const handleAssignAgent = (client: any) => {
    // TODO: Implémenter l'assignation d'agent
    Alert.alert('Assignation', `Assigner un agent à ${client.users?.nom || 'ce client'}`);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Jamais';
    const date = new Date(dateString);
    return date.toLocaleString('fr-FR', { 
      day: 'numeric', 
      month: 'short', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'actif': return 'text-green-600 bg-green-50';
      case 'inactif': return 'text-red-600 bg-red-50';
      case 'en_attente': return 'text-yellow-600 bg-yellow-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Chargement des clients...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header - style clair (déjà) */}
      <View className="bg-white px-6 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Gestion des clients</Text>
        <Text className="text-gray-500 mt-1">{clients.length} client(s) enregistré(s)</Text>
      </View>

      {/* Filtres de statut */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row space-x-3">
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${filter === 'all' ? 'bg-primary-900' : 'bg-gray-100'}`}
            onPress={() => setFilter('all')}
          >
            <Text className={`font-medium ${filter === 'all' ? 'text-white' : 'text-gray-700'}`}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${filter === 'en_attente' ? 'bg-yellow-500' : 'bg-gray-100'}`}
            onPress={() => setFilter('en_attente')}
          >
            <Text className={`font-medium ${filter === 'en_attente' ? 'text-white' : 'text-gray-700'}`}>En attente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${filter === 'actif' ? 'bg-green-500' : 'bg-gray-100'}`}
            onPress={() => setFilter('actif')}
          >
            <Text className={`font-medium ${filter === 'actif' ? 'text-white' : 'text-gray-700'}`}>Actifs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${filter === 'inactif' ? 'bg-red-500' : 'bg-gray-100'}`}
            onPress={() => setFilter('inactif')}
          >
            <Text className={`font-medium ${filter === 'inactif' ? 'text-white' : 'text-gray-700'}`}>Inactifs</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="p-4 space-y-4">
          {clients.length === 0 ? (
            <View className="bg-white rounded-xl p-6 items-center">
              <Ionicons name="people-outline" size={48} color="#9ca3af" />
              <Text className="text-gray-500 mt-2 text-center">Aucun client enregistré</Text>
            </View>
          ) : (
            clients.filter((c) => filter === 'all' ? true : (c.users?.statut === filter)).map((client) => (
              <View key={client.user_id} className="bg-white rounded-xl p-4 shadow-sm">
                {/* Client Info Header */}
                <View className="flex-row items-start justify-between mb-3">
                  <View className="flex-1">
                    <Text className="text-lg font-semibold text-gray-900">
                      {client.users?.nom || 'Sans nom'}
                    </Text>
                    <Text className="text-gray-600 text-sm">{client.users?.email}</Text>
                    {client.users?.phone_number && (
                      <Text className="text-gray-500 text-sm mt-1">
                        📞 {client.users.phone_number}
                      </Text>
                    )}
                  </View>
                  <View className={`px-3 py-1 rounded-full ${getStatusColor(client.users?.statut || 'inconnu')}`}>
                    <Text className="text-xs font-medium capitalize">
                      {client.users?.statut || 'inconnu'}
                    </Text>
                  </View>
                </View>

                {/* Position Info */}
                <View className="border-t border-gray-100 pt-3">
                  <View className="flex-row items-center mb-2">
                    <Ionicons name="location-outline" size={16} color="#6b7280" />
                    <Text className="text-gray-700 text-sm ml-2 font-medium">Position</Text>
                  </View>
                  
                  {client.last_latitude && client.last_longitude ? (
                    <View>
                      <Text className="text-gray-600 text-sm">
                        📍 {Number(client.last_latitude).toFixed(6)}, {Number(client.last_longitude).toFixed(6)}
                      </Text>
                      <Text className="text-gray-400 text-xs mt-1">
                        Dernière mise à jour: {formatDate(client.last_position_at)}
                      </Text>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <Ionicons name="location-outline" size={16} color="#9ca3af" />
                      <Text className="text-gray-400 text-sm ml-2">Position non partagée</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                <View className="flex-row space-x-2 mt-4">
                  {client.users?.statut === 'en_attente' ? (
                    <>
                      <TouchableOpacity
                        className="flex-1 bg-green-50 p-3 rounded-lg items-center"
                        onPress={async () => {
                          const { error } = await supabase.from('users').update({ statut: 'actif' }).eq('id', client.users?.id);
                          if (error) return Alert.alert('Erreur', "Impossible d'approuver");
                          fetchClients();
                        }}
                      >
                        <Ionicons name="checkmark" size={16} color="#059669" />
                        <Text className="text-green-700 font-medium text-sm mt-1">Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-red-50 p-3 rounded-lg items-center"
                        onPress={async () => {
                          const { error } = await supabase.from('users').update({ statut: 'inactif' }).eq('id', client.users?.id);
                          if (error) return Alert.alert('Erreur', 'Impossible de refuser');
                          fetchClients();
                        }}
                      >
                        <Ionicons name="close" size={16} color="#dc2626" />
                        <Text className="text-red-700 font-medium text-sm mt-1">Refuser</Text>
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <TouchableOpacity 
                        className="flex-1 bg-primary-50 p-3 rounded-lg items-center"
                        onPress={() => handleAssignAgent(client)}
                      >
                        <Ionicons name="person-add" size={16} color="#1e3a8a" />
                        <Text className="text-primary-700 font-medium text-sm mt-1">Assigner agent</Text>
                      </TouchableOpacity>
                      {client.last_latitude && client.last_longitude && (
                        <TouchableOpacity 
                          className="flex-1 bg-green-50 p-3 rounded-lg items-center"
                          onPress={() => {
                            const url = `https://www.google.com/maps?q=${client.last_latitude},${client.last_longitude}`;
                            Alert.alert('Carte', 'Ouvrir la position dans Maps');
                          }}
                        >
                          <Ionicons name="map" size={16} color="#059669" />
                          <Text className="text-green-700 font-medium text-sm mt-1">Voir carte</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
