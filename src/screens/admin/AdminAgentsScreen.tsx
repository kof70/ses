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

export default function AdminAgentsScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          users:user_id (
            id,
            nom,
            email,
            statut,
            role
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching agents:', error);
        return;
      }

      setAgents(data || []);
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAgents();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('admin_agents')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'agents' },
        () => {
          fetchAgents();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAgents();
  };

  const toggleAgentStatus = async (agentUserId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'actif' ? 'inactif' : 'actif';
    Alert.alert(
      'Modifier le statut',
      `Êtes-vous sûr de vouloir ${newStatus === 'actif' ? 'activer' : 'désactiver'} ce compte ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Confirmer', onPress: () => updateUserStatus(agentUserId, newStatus) },
      ]
    );
  };

  const updateUserStatus = async (userId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ statut: newStatus })
        .eq('id', userId);

      if (error) throw error;

      Alert.alert('Succès', `Statut du compte mis à jour`);
      fetchAgents();
    } catch (error) {
      console.error('Error updating user status:', error);
      Alert.alert('Erreur', "Impossible de mettre à jour le statut");
    }
  };

  const promoteToAdmin = async (userId: string) => {
    try {
      // add to admins bypass table if exists
      await supabase.from('admins').insert({ user_id: userId }).catch(() => {});
      // update role
      const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', userId);
      if (error) throw error;
      Alert.alert('Succès', "L'utilisateur est maintenant administrateur");
      fetchAgents();
    } catch (error) {
      console.error('Error promoting to admin:', error);
      Alert.alert('Erreur', "Promotion impossible");
    }
  };

  const revokeAdmin = async (userId: string) => {
    try {
      await supabase.from('admins').delete().eq('user_id', userId).catch(() => {});
      const { error } = await supabase.from('users').update({ role: 'agent' }).eq('id', userId);
      if (error) throw error;
      Alert.alert('Succès', "Droits administrateur retirés");
      fetchAgents();
    } catch (error) {
      console.error('Error revoking admin:', error);
      Alert.alert('Erreur', "Révocation impossible");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'bg-success-100 text-success-800';
      case 'en_mission':
        return 'bg-warning-100 text-warning-800';
      case 'indisponible':
        return 'bg-danger-100 text-danger-800';
      default:
        return 'bg-gray-100 text-gray-800';
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

  const getAccountStatusColor = (status: string) => {
    return status === 'actif' ? 'text-success-600' : 'text-danger-600';
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'Non enregistré';
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
      {/* Header */}
      <View className="bg-primary-900 px-6 py-8">
        <Text className="text-white text-2xl font-bold">Gestion des agents</Text>
        <Text className="text-primary-100 mt-1">
          {agents.length} agent{agents.length > 1 ? 's' : ''} enregistré{agents.length > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-6 py-6">
          {agents.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-xl font-medium mt-4">Aucun agent</Text>
              <Text className="text-gray-400 text-center mt-2">
                Aucun agent de sécurité n'est encore enregistré dans le système
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {agents.map((agent) => (
                <View key={agent.id} className="bg-white rounded-xl p-6 shadow-sm">
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900">{agent.users?.nom}</Text>
                      <Text className="text-gray-500 text-sm">{agent.users?.email}</Text>
                      <View className="flex-row items-center mt-2">
                        <Text className="text-gray-600 text-sm">Compte: </Text>
                        <Text className={`text-sm font-medium ${getAccountStatusColor(agent.users?.statut)}`}>
                          {agent.users?.statut === 'actif' ? 'Actif' : 'Inactif'}
                        </Text>
                        <Text className="text-gray-600 text-sm ml-3">Rôle: </Text>
                        <Text className="text-sm font-medium text-gray-900">{agent.users?.role}</Text>
                      </View>
                    </View>

                    <View className="items-end">
                      <View className={`px-3 py-1 rounded-full ${getStatusColor(agent.disponibilite)}`}>
                        <Text className="text-sm font-medium">{getStatusText(agent.disponibilite)}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="space-y-2 mb-4">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600 text-sm">Zone assignée:</Text>
                      <Text className="text-gray-900 font-medium">{agent.zone_assignee || 'Non assignée'}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600 text-sm">Heure d'arrivée:</Text>
                      <Text className="text-gray-900 font-medium">{formatTime(agent.heure_arrivee)}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600 text-sm">Heure de départ:</Text>
                      <Text className="text-gray-900 font-medium">{formatTime(agent.heure_depart)}</Text>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
                    <View className="flex-row items-center">
                      <Ionicons name="qr-code" size={16} color="#6b7280" />
                      <Text className="text-gray-500 text-sm ml-2 font-mono">{agent.qr_code}</Text>
                    </View>

                    <View className="flex-row items-center space-x-2">
                      <TouchableOpacity
                        className={`px-4 py-2 rounded-lg ${
                          agent.users?.statut === 'actif' ? 'bg-danger-100' : 'bg-success-100'
                        }`}
                        onPress={() => toggleAgentStatus(agent.users?.id, agent.users?.statut)}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            agent.users?.statut === 'actif' ? 'text-danger-700' : 'text-success-700'
                          }`}
                        >
                          {agent.users?.statut === 'actif' ? 'Désactiver' : 'Activer'}
                        </Text>
                      </TouchableOpacity>

                      {agent.users?.role === 'admin' ? (
                        <TouchableOpacity
                          className="px-4 py-2 rounded-lg bg-danger-100"
                          onPress={() => revokeAdmin(agent.users?.id)}
                        >
                          <Text className="text-sm font-medium text-danger-700">Retirer admin</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity
                          className="px-4 py-2 rounded-lg bg-primary-100"
                          onPress={() => promoteToAdmin(agent.users?.id)}
                        >
                          <Text className="text-sm font-medium text-primary-800">Promouvoir admin</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}