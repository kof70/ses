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
import { Modal } from 'react-native';

export default function AdminAgentsScreen() {
  const { userProfile, offlineReadOnly, assertOnlineOrThrow } = useAuth();
  const supabase = useSupabase();
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'en_attente' | 'actif' | 'inactif'>('all');
  const [zones, setZones] = useState<any[]>([]);
  const [agentZoneMap, setAgentZoneMap] = useState<Record<string, string[]>>({});
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedAgentUserId, setSelectedAgentUserId] = useState<string | null>(null);
  const [expandedZonesByAgent, setExpandedZonesByAgent] = useState<Record<string, boolean>>({});

  const fetchAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select(`
          *,
          users:users!agents_user_id_fkey (
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

      const list = data || [];
      setAgents(list);

      const { data: zonesData } = await supabase
        .from('zones')
        .select('*')
        .order('name', { ascending: true });
      // Dédupliquer au cas où le backend renverrait des doublons (ex: ré-abonnements)
      const deduped = Array.from(
        new Map((zonesData || []).map((z: any) => [z.id, z])).values()
      );
      setZones(deduped);

      const agentUserIds = (list || []).map((a: any) => a.user_id);
      if (agentUserIds.length) {
        const { data: az } = await supabase
          .from('agent_zones')
          .select('agent_user_id, zone_id')
          .in('agent_user_id', agentUserIds);
        const map: Record<string, string[]> = {};
        (az || []).forEach((r: any) => {
          if (!map[r.agent_user_id]) map[r.agent_user_id] = [];
          map[r.agent_user_id].push(r.zone_id);
        });
        setAgentZoneMap(map);
      } else {
        setAgentZoneMap({});
      }
    } catch (error) {
      console.error('Error fetching agents:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from('clients')
      .select('user_id, last_latitude, last_longitude, users:users!clients_user_id_fkey(id, nom, email)')
      .order('created_at', { ascending: false });
    setClients(data || []);
  };

  useEffect(() => {
    fetchAgents();
    fetchClients();

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
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();
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

  const approveAgent = (userId: string) => updateUserStatus(userId, 'actif');
  const refuseAgent = (userId: string) => updateUserStatus(userId, 'inactif');

  const promoteToAdmin = async (userId: string) => {
    try {
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();
      // update role only
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
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();
      const { error } = await supabase.from('users').update({ role: 'agent' }).eq('id', userId);
      if (error) throw error;
      Alert.alert('Succès', "Droits administrateur retirés");
      fetchAgents();
    } catch (error) {
      console.error('Error revoking admin:', error);
      Alert.alert('Erreur', "Révocation impossible");
    }
  };

  const toggleAgentZone = (agentUserId: string, zoneId: string) => {
    setAgentZoneMap((prev) => {
      const current = new Set(prev[agentUserId] || []);
      if (current.has(zoneId)) current.delete(zoneId); else current.add(zoneId);
      return { ...prev, [agentUserId]: Array.from(current) };
    });
  };

  const saveAgentZones = async (agentUserId: string) => {
    try {
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();

      const { data: current } = await supabase
        .from('agent_zones')
        .select('zone_id')
        .eq('agent_user_id', agentUserId);
      const currentIds = new Set((current || []).map((r: any) => r.zone_id));
      const nextIds = new Set(agentZoneMap[agentUserId] || []);

      const toInsert = Array.from(nextIds).filter((id) => !currentIds.has(id));
      const toDelete = Array.from(currentIds).filter((id) => !nextIds.has(id));

      if (toInsert.length) {
        await supabase
          .from('agent_zones')
          .insert(toInsert.map((zoneId) => ({ agent_user_id: agentUserId, zone_id: zoneId })));
      }
      if (toDelete.length) {
        for (const zoneId of toDelete) {
          await supabase
            .from('agent_zones')
            .delete()
            .eq('agent_user_id', agentUserId)
            .eq('zone_id', zoneId);
        }
      }

      Alert.alert('Succès', 'Zones de l\'agent mises à jour');
    } catch (e) {
      console.error('Failed to save agent zones', e);
      Alert.alert('Erreur', 'Impossible de mettre à jour les zones');
    }
  };

  const toggleZonesSection = (agentUserId: string) => {
    setExpandedZonesByAgent((prev) => ({ ...prev, [agentUserId]: !prev[agentUserId] }));
  };

  const openAssignModal = (agentUserId: string) => {
    setSelectedAgentUserId(agentUserId);
    setAssignModalVisible(true);
  };

  const assignAgentToClient = async (clientUserId: string) => {
    try {
      if (!selectedAgentUserId) return;
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();

      const client = clients.find((c) => c.user_id === clientUserId);
      const latitude = client?.last_latitude ?? null;
      const longitude = client?.last_longitude ?? null;

      await supabase
        .from('agent_client_assignments')
        .insert({
          agent_user_id: selectedAgentUserId,
          client_user_id: clientUserId,
          latitude,
          longitude,
          statut: 'assigne',
        });

      setAssignModalVisible(false);
      Alert.alert('Succès', 'Agent assigné au client');
    } catch (e) {
      console.error('Failed to assign', e);
      Alert.alert('Erreur', 'Assignation impossible');
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
      {/* Header - style clair */}
      <View className="bg-white px-6 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Gestion des agents</Text>
        <Text className="text-gray-500 mt-1">
          {agents.length} agent{agents.length > 1 ? 's' : ''} enregistré{agents.length > 1 ? 's' : ''}
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
            className={`px-4 py-2 rounded-full ${filter === 'actif' ? 'bg-success-500' : 'bg-gray-100'}`}
            onPress={() => setFilter('actif')}
          >
            <Text className={`font-medium ${filter === 'actif' ? 'text-white' : 'text-gray-700'}`}>Actifs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${filter === 'inactif' ? 'bg-danger-500' : 'bg-gray-100'}`}
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
              {(agents.filter((a) =>
                filter === 'all' ? true : (a.users?.statut === filter)
              )).map((agent) => (
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

                  {/* Zones assignation (repliable + scroll horizontal) */}
                  <View className="mb-4">
                    <TouchableOpacity
                      className="flex-row items-center justify-between"
                      onPress={() => toggleZonesSection(agent.user_id)}
                    >
                      <Text className="text-gray-700 font-medium mb-2">Zones</Text>
                      <Ionicons name={expandedZonesByAgent[agent.user_id] ? 'chevron-up' : 'chevron-down'} size={18} color="#374151" />
                    </TouchableOpacity>

                    {expandedZonesByAgent[agent.user_id] && (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <View className="flex-row py-1">
                          {zones.map((z: any) => {
                            const selected = (agentZoneMap[agent.user_id] || []).includes(z.id);
                            return (
                              <TouchableOpacity
                                key={`${agent.user_id}-${z.id}`}
                                className={`mr-2 px-3 py-2 rounded-full border ${selected ? 'bg-primary-900 border-primary-900' : 'bg-gray-50 border-gray-300'}`}
                                onPress={() => toggleAgentZone(agent.user_id, z.id)}
                                disabled={offlineReadOnly}
                              >
                                <Text className={`text-sm ${selected ? 'text-white' : 'text-gray-700'}`}>{z.name}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </ScrollView>
                    )}

                    {expandedZonesByAgent[agent.user_id] && (
                      <TouchableOpacity
                        className={`mt-2 self-start px-4 py-2 rounded-lg ${offlineReadOnly ? 'bg-gray-200' : 'bg-primary-900'}`}
                        disabled={offlineReadOnly}
                        onPress={() => saveAgentZones(agent.user_id)}
                      >
                        <Text className={`text-sm font-medium ${offlineReadOnly ? 'text-gray-600' : 'text-white'}`}>Enregistrer les zones</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  <View className="flex-row items-center justify-between pt-4 border-t border-gray-100">
                    <View className="flex-row items-center">
                      <Ionicons name="qr-code" size={16} color="#6b7280" />
                      <Text className="text-gray-500 text-sm ml-2 font-mono">{agent.qr_code}</Text>
                    </View>

                    <View className="flex-row items-center space-x-2">
                      {agent.users?.statut === 'en_attente' ? (
                        <>
                          <TouchableOpacity
                            className={`px-4 py-2 rounded-lg ${offlineReadOnly ? 'bg-gray-200' : 'bg-success-100'}`}
                            disabled={offlineReadOnly}
                            onPress={() => approveAgent(agent.users?.id)}
                          >
                            <Text className={`text-sm font-medium ${offlineReadOnly ? 'text-gray-500' : 'text-success-700'}`}>Approuver</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            className={`px-4 py-2 rounded-lg ${offlineReadOnly ? 'bg-gray-200' : 'bg-danger-100'}`}
                            disabled={offlineReadOnly}
                            onPress={() => refuseAgent(agent.users?.id)}
                          >
                            <Text className={`text-sm font-medium ${offlineReadOnly ? 'text-gray-500' : 'text-danger-700'}`}>Refuser</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity
                            className={`px-4 py-2 rounded-lg ${
                              offlineReadOnly
                                ? 'bg-gray-200'
                                : agent.users?.statut === 'actif' ? 'bg-danger-100' : 'bg-success-100'
                            }`}
                            disabled={offlineReadOnly}
                            onPress={() => toggleAgentStatus(agent.users?.id, agent.users?.statut)}
                          >
                            <Text
                              className={`text-sm font-medium ${
                                offlineReadOnly
                                  ? 'text-gray-500'
                                  : agent.users?.statut === 'actif' ? 'text-danger-700' : 'text-success-700'
                              }`}
                            >
                              {agent.users?.statut === 'actif' ? 'Désactiver' : 'Activer'}
                            </Text>
                          </TouchableOpacity>

                          {agent.users?.role === 'admin' ? (
                            <TouchableOpacity
                              className={`px-4 py-2 rounded-lg ${offlineReadOnly ? 'bg-gray-200' : 'bg-danger-100'}`}
                              disabled={offlineReadOnly}
                              onPress={() => revokeAdmin(agent.users?.id)}
                            >
                              <Text className="text-sm font-medium text-danger-700">Retirer admin</Text>
                            </TouchableOpacity>
                          ) : (
                            <TouchableOpacity
                              className={`px-4 py-2 rounded-lg ${offlineReadOnly ? 'bg-gray-200' : 'bg-primary-100'}`}
                              disabled={offlineReadOnly}
                              onPress={() => promoteToAdmin(agent.users?.id)}
                            >
                              <Text className="text-sm font-medium text-primary-800">Promouvoir admin</Text>
                            </TouchableOpacity>
                          )}

                          <TouchableOpacity
                            className={`px-4 py-2 rounded-lg ${offlineReadOnly ? 'bg-gray-200' : 'bg-warning-100'}`}
                            disabled={offlineReadOnly}
                            onPress={() => openAssignModal(agent.user_id)}
                          >
                            <Text className="text-sm font-medium text-warning-800">Assigner client</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <Modal visible={assignModalVisible} transparent animationType="slide" onRequestClose={() => setAssignModalVisible(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-white p-4 rounded-t-2xl" style={{ maxHeight: '70%' }}>
            <Text className="text-lg font-semibold mb-3">Sélectionner un client</Text>
            <ScrollView style={{ maxHeight: '60%' }}>
              {clients.map((c) => (
                <TouchableOpacity key={c.user_id} className="p-3 border-b border-gray-100" onPress={() => assignAgentToClient(c.user_id)}>
                  <Text className="font-medium text-gray-900">{c.users?.nom}</Text>
                  <Text className="text-gray-500 text-sm">{c.users?.email}</Text>
                  {c.last_latitude && c.last_longitude ? (
                    <Text className="text-gray-600 text-xs mt-1">Pos: {Number(c.last_latitude).toFixed(6)}, {Number(c.last_longitude).toFixed(6)}</Text>
                  ) : (
                    <Text className="text-gray-400 text-xs mt-1">Position non fournie</Text>
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