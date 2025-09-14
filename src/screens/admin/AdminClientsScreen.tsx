import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Modal,
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
  const [agents, setAgents] = useState<any[]>([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedClientUserId, setSelectedClientUserId] = useState<string | null>(null);

  const fetchClients = async () => {
    try {
      // Get all users with role 'client' - this is the main data source
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          nom,
          email,
          role,
          statut,
          phone_number,
          created_at
        `)
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
        return;
      }

      console.log('🔍 AdminClientsScreen: Raw users data from DB:', usersData);

      // Then get client-specific data (optional)
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          user_id,
          last_latitude,
          last_longitude,
          last_position_at
        `);

      if (clientsError) {
        console.error('Error fetching clients data:', clientsError);
      }

      // Create the merged data - prioritize users data
      const mergedData = (usersData || []).map(user => {
        const clientData = (clientsData || []).find(c => c.user_id === user.id);
        return {
          user_id: user.id,
          users: user,
          ...clientData
        };
      });

      console.log('🔍 AdminClientsScreen: Final merged data:', mergedData);
      console.log('🔍 AdminClientsScreen: Users with statut en_attente:', mergedData.filter(c => c.users?.statut === 'en_attente'));
      setClients(mergedData);
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

  const fetchAgents = async () => {
    try {
      // Get all users with role 'agent'
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select(`
          id,
          nom,
          email,
          role,
          statut,
          phone_number,
          created_at
        `)
        .eq('role', 'agent')
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching agents:', usersError);
        return;
      }

      // Then get agent-specific data
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          user_id,
          disponibilite,
          qr_code,
          zone_assignee,
          heure_arrivee,
          heure_depart
        `);

      if (agentsError) {
        console.error('Error fetching agents data:', agentsError);
      }

      // Merge the data
      const mergedData = (usersData || []).map(user => {
        const agentData = (agentsData || []).find(a => a.user_id === user.id);
        return {
          user_id: user.id,
          users: user,
          ...agentData
        };
      });

      setAgents(mergedData);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  const openAssignModal = (clientUserId: string) => {
    setSelectedClientUserId(clientUserId);
    setAssignModalVisible(true);
  };

  const assignAgentToClient = async (agentUserId: string) => {
    try {
      if (!selectedClientUserId) return;

      const client = clients.find((c) => c.user_id === selectedClientUserId);
      const latitude = client?.last_latitude ?? null;
      const longitude = client?.last_longitude ?? null;

      await supabase
        .from('agent_client_assignments')
        .insert({
          agent_user_id: agentUserId,
          client_user_id: selectedClientUserId,
          latitude,
          longitude,
          statut: 'assigne',
        });

      Alert.alert('Succès', 'Agent assigné au client avec succès');
      setAssignModalVisible(false);
      setSelectedClientUserId(null);
    } catch (error) {
      console.error('Error assigning agent:', error);
      Alert.alert('Erreur', 'Impossible d\'assigner l\'agent');
    }
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
    fetchAgents();
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
        <Text className="text-xs text-gray-400 mt-1">
          En attente: {clients.filter(c => c.users?.statut === 'en_attente').length} | 
          Actifs: {clients.filter(c => c.users?.statut === 'actif').length} | 
          Inactifs: {clients.filter(c => c.users?.statut === 'inactif').length}
        </Text>
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
                        onPress={() => openAssignModal(client.user_id)}
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

      {/* Modal pour assigner un agent */}
      <Modal visible={assignModalVisible} transparent animationType="slide" onRequestClose={() => setAssignModalVisible(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-white p-4 rounded-t-2xl" style={{ maxHeight: '70%' }}>
            <Text className="text-lg font-semibold mb-3">Sélectionner un agent</Text>
            <ScrollView style={{ maxHeight: '60%' }}>
              {agents
                .filter(a => a.users?.statut === 'actif') // Only show active agents
                .map((a) => (
                <TouchableOpacity key={a.user_id} className="p-3 border-b border-gray-100" onPress={() => assignAgentToClient(a.user_id)}>
                  <Text className="font-medium text-gray-900">{a.users?.nom || 'Nom non fourni'}</Text>
                  <Text className="text-gray-500 text-sm">{a.users?.email}</Text>
                  <Text className="text-gray-400 text-xs">Statut: {a.users?.statut} | Disponibilité: {a.disponibilite}</Text>
                  {a.qr_code && (
                    <Text className="text-gray-600 text-xs mt-1">QR: {a.qr_code}</Text>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity className="mt-3 self-end px-4 py-2 rounded-lg bg-gray-200" onPress={() => setAssignModalVisible(false)}>
              <Text className="text-gray-700">Fermer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
