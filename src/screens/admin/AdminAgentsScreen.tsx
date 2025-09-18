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
      // First, get all users with role 'agent' OR 'admin' (admins who were agents)
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
        .in('role', ['agent', 'admin'])
        .order('created_at', { ascending: false });

      if (usersError) {
        console.error('Error fetching users:', usersError);
        Alert.alert('Erreur', 'Impossible de charger les utilisateurs');
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

      console.log('🔍 AdminAgentsScreen: Raw users data from DB:', usersData);
      console.log('🔍 AdminAgentsScreen: Final merged data:', mergedData);
      console.log('🔍 AdminAgentsScreen: Users with statut en_attente:', mergedData.filter(a => a.users?.statut === 'en_attente'));
      setAgents(mergedData);

      const { data: zonesData } = await supabase
        .from('zones')
        .select('*')
        .order('name', { ascending: true });
      // Dédupliquer au cas où le backend renverrait des doublons (ex: ré-abonnements)
      const deduped = Array.from(
        new Map((zonesData || []).map((z: any) => [z.id, z])).values()
      );
      setZones(deduped);

      const agentUserIds = (agents || []).map((a: any) => a.user_id);
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
        return;
      }

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

      console.log('🔍 AdminAgentsScreen fetchClients: Final merged data:', mergedData);
      setClients(mergedData);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
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
      
      // Check if we're online without throwing
      if (!supabase) {
        Alert.alert('Erreur', 'Connexion à la base de données perdue');
        return;
      }

      // Security check: Only the oldest admin can promote users to admin
      const { data: oldestAdmin, error: oldestAdminError } = await supabase
        .from('users')
        .select('id, created_at')
        .eq('role', 'admin')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (oldestAdminError || !oldestAdmin) {
        Alert.alert('Erreur', 'Impossible de vérifier les permissions administrateur');
        return;
      }

      if (userProfile?.id !== oldestAdmin.id) {
        Alert.alert('Accès refusé', 'Seul l\'administrateur principal peut promouvoir des utilisateurs en administrateur');
        return;
      }

      console.log('🔍 Promoting user to admin:', userId);
      
      // update role only
      const { error } = await supabase.from('users').update({ role: 'admin' }).eq('id', userId);
      if (error) {
        console.error('Database error:', error);
        Alert.alert('Erreur', `Erreur de base de données: ${error.message}`);
        return;
      }
      
      console.log('✅ User promoted to admin successfully');
      Alert.alert('Succès', "L'utilisateur est maintenant administrateur");
      
      // Refresh agents list
      try {
        await fetchAgents();
      } catch (fetchError) {
        console.error('Error refreshing agents after promotion:', fetchError);
        // Don't show error to user, just log it
      }
    } catch (error) {
      console.error('Error promoting to admin:', error);
      Alert.alert('Erreur', `Promotion impossible: ${error.message || 'Erreur inconnue'}`);
    }
  };

  const revokeAdmin = async (userId: string) => {
    try {
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      
      // Check if we're online without throwing
      if (!supabase) {
        Alert.alert('Erreur', 'Connexion à la base de données perdue');
        return;
      }

      // Security check: Only the oldest admin can revoke admin rights
      const { data: allAdmins, error: adminsError } = await supabase
        .from('users')
        .select('id, created_at, email')
        .eq('role', 'admin')
        .order('created_at', { ascending: true });

      if (adminsError || !allAdmins || allAdmins.length === 0) {
        Alert.alert('Erreur', 'Impossible de vérifier les permissions administrateur');
        return;
      }

      // Get the oldest admin (first in the sorted list)
      const oldestAdmin = allAdmins[0];
      
      // If there are multiple admins with the same creation date, use ID as tiebreaker
      const oldestAdmins = allAdmins.filter(admin => 
        new Date(admin.created_at).getTime() === new Date(oldestAdmin.created_at).getTime()
      );
      
      const finalOldestAdmin = oldestAdmins.length > 1 
        ? oldestAdmins.sort((a, b) => a.id.localeCompare(b.id))[0]  // Sort by ID as tiebreaker
        : oldestAdmin;

      console.log('🔍 Admin check:', {
        currentUserId: userProfile?.id,
        currentUserEmail: userProfile?.email,
        oldestAdminId: finalOldestAdmin.id,
        oldestAdminEmail: finalOldestAdmin.email,
        areEqual: userProfile?.id === finalOldestAdmin.id,
        currentUserRole: userProfile?.role,
        targetUserId: userId,
        allAdmins: allAdmins.map(a => ({ id: a.id, email: a.email, created_at: a.created_at }))
      });

      // Only the oldest admin can revoke admin rights
      if (userProfile?.id !== finalOldestAdmin.id) {
        Alert.alert('Accès refusé', `Seul l'administrateur principal (${finalOldestAdmin.email}) peut retirer les droits administrateur`);
        return;
      }

      // Prevent self-revocation (oldest admin cannot revoke their own rights)
      if (userProfile?.id === userId) {
        Alert.alert('Accès refusé', 'Impossible de retirer vos propres droits administrateur');
        return;
      }

      console.log('🔍 Revoking admin rights for user:', userId);
      
      const { error } = await supabase.from('users').update({ role: 'agent' }).eq('id', userId);
      if (error) {
        console.error('Database error:', error);
        Alert.alert('Erreur', `Erreur de base de données: ${error.message}`);
        return;
      }
      
      console.log('✅ Admin rights revoked successfully');
      Alert.alert('Succès', "Droits administrateur retirés");
      
      // Refresh agents list
      try {
        await fetchAgents();
      } catch (fetchError) {
        console.error('Error refreshing agents after revoke:', fetchError);
        // Don't show error to user, just log it
      }
    } catch (error) {
      console.error('Error revoking admin:', error);
      Alert.alert('Erreur', `Révocation impossible: ${error.message || 'Erreur inconnue'}`);
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
      <View className="bg-white px-6 py-4 border-b border-gray-100">
        <Text className="text-xl font-bold text-gray-900">Gestion des agents</Text>
        <Text className="text-gray-500 text-sm mt-1">
          {agents.length} agent{agents.length > 1 ? 's' : ''} enregistré{agents.length > 1 ? 's' : ''}
        </Text>
        <Text className="text-xs text-gray-400 mt-1">
          En attente: {agents.filter(a => a.users?.statut === 'en_attente').length} | 
          Actifs: {agents.filter(a => a.users?.statut === 'actif').length} | 
          Inactifs: {agents.filter(a => a.users?.statut === 'inactif').length}
        </Text>
      </View>

      {/* Filtres de statut */}
      <View className="bg-white px-6 py-3 border-b border-gray-200">
        <View className="flex-row space-x-2">
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${filter === 'all' ? 'bg-primary-900' : 'bg-gray-100'}`}
            onPress={() => setFilter('all')}
          >
            <Text className={`text-sm font-medium ${filter === 'all' ? 'text-white' : 'text-gray-700'}`}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${filter === 'en_attente' ? 'bg-yellow-500' : 'bg-gray-100'}`}
            onPress={() => setFilter('en_attente')}
          >
            <Text className={`text-sm font-medium ${filter === 'en_attente' ? 'text-white' : 'text-gray-700'}`}>En attente</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${filter === 'actif' ? 'bg-success-500' : 'bg-gray-100'}`}
            onPress={() => setFilter('actif')}
          >
            <Text className={`text-sm font-medium ${filter === 'actif' ? 'text-white' : 'text-gray-700'}`}>Actifs</Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`px-3 py-1 rounded-full ${filter === 'inactif' ? 'bg-danger-500' : 'bg-gray-100'}`}
            onPress={() => setFilter('inactif')}
          >
            <Text className={`text-sm font-medium ${filter === 'inactif' ? 'text-white' : 'text-gray-700'}`}>Inactifs</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View className="px-6 py-4">
          {agents.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Ionicons name="people-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-xl font-medium mt-4">Aucun agent</Text>
              <Text className="text-gray-400 text-center mt-2">
                Aucun agent de sécurité n'est encore enregistré dans le système
              </Text>
            </View>
          ) : (
            <View className="space-y-3">
              {(agents.filter((a) =>
                filter === 'all' ? true : (a.users?.statut === filter)
              )).map((agent) => (
                <View key={agent.user_id} className="bg-white rounded-xl p-4 shadow-sm">
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <View className="flex-row items-center flex-wrap">
                        <Text className="text-base font-semibold text-gray-900">{agent.users?.nom}</Text>
                        {agent.users?.role === 'admin' && (
                          <View className="ml-2 px-2 py-1 bg-purple-100 rounded-full">
                            <Text className="text-xs font-medium text-purple-800">
                              {(() => {
                                // Check if this is the oldest admin using the same logic as revokeAdmin
                                const adminAgents = agents.filter(a => a.users?.role === 'admin');
                                if (adminAgents.length === 0) return 'ADMIN';
                                
                                // Sort by created_at, then by user_id as tiebreaker
                                const sortedAdmins = adminAgents.sort((a, b) => {
                                  const dateA = new Date(a.users?.created_at || 0).getTime();
                                  const dateB = new Date(b.users?.created_at || 0).getTime();
                                  
                                  if (dateA !== dateB) {
                                    return dateA - dateB;
                                  }
                                  
                                  // If same date, sort by user_id
                                  return (a.user_id || '').localeCompare(b.user_id || '');
                                });
                                
                                const oldestAdmin = sortedAdmins[0];
                                return oldestAdmin?.user_id === agent.user_id ? 'ADMIN PRINCIPAL' : 'ADMIN';
                              })()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-gray-500 text-sm">{agent.users?.email}</Text>
                      <View className="flex-row items-center mt-1 flex-wrap">
                        <View className="bg-success-100 px-2 py-1 rounded-full">
                          <Text className="text-xs font-medium text-success-800">
                            {agent.users?.statut === 'actif' ? 'Actif' : 'Inactif'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View className="items-end">
                      <View className={`px-2 py-1 rounded-full ${getStatusColor(agent.disponibilite)}`}>
                        <Text className="text-xs font-medium">{getStatusText(agent.disponibilite)}</Text>
                      </View>
                    </View>
                  </View>

                  <View className="space-y-1 mb-3">
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600 text-xs">Zone:</Text>
                      <Text className="text-gray-900 font-medium text-xs">{agent.zone_assignee || 'Non assignée'}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600 text-xs">Arrivée:</Text>
                      <Text className="text-gray-900 font-medium text-xs">{formatTime(agent.heure_arrivee)}</Text>
                    </View>
                    <View className="flex-row items-center justify-between">
                      <Text className="text-gray-600 text-xs">Départ:</Text>
                      <Text className="text-gray-900 font-medium text-xs">{formatTime(agent.heure_depart)}</Text>
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

                  {/* Action buttons for pending agents */}
                  {(() => {
                    console.log('🔍 Agent debug:', {
                      agentId: agent.user_id,
                      users: agent.users,
                      statut: agent.users?.statut,
                      isEnAttente: agent.users?.statut === 'en_attente'
                    });
                    return agent.users?.statut === 'en_attente';
                  })() && (
                    <View className="flex-row space-x-2 mt-4">
                      <TouchableOpacity
                        className={`flex-1 bg-green-50 p-3 rounded-lg items-center ${offlineReadOnly ? 'opacity-50' : ''}`}
                        disabled={offlineReadOnly}
                        onPress={() => approveAgent(agent.users?.id)}
                      >
                        <Ionicons name="checkmark" size={16} color="#059669" />
                        <Text className="text-green-700 font-medium text-sm mt-1">Approuver</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className={`flex-1 bg-red-50 p-3 rounded-lg items-center ${offlineReadOnly ? 'opacity-50' : ''}`}
                        disabled={offlineReadOnly}
                        onPress={() => refuseAgent(agent.users?.id)}
                      >
                        <Ionicons name="close" size={16} color="#dc2626" />
                        <Text className="text-red-700 font-medium text-sm mt-1">Refuser</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Action buttons for active/inactive agents */}
                  {agent.users?.statut !== 'en_attente' && (
                    <View>
                      <View className="flex-row space-x-2 mt-4">
                        <TouchableOpacity
                          className={`flex-1 p-3 rounded-lg items-center ${
                            offlineReadOnly
                              ? 'bg-gray-200'
                              : agent.users?.statut === 'actif' ? 'bg-red-50' : 'bg-green-50'
                          }`}
                          disabled={offlineReadOnly}
                          onPress={() => toggleAgentStatus(agent.users?.id, agent.users?.statut)}
                        >
                          <Ionicons 
                            name={agent.users?.statut === 'actif' ? 'pause' : 'play'} 
                            size={16} 
                            color={offlineReadOnly ? '#9ca3af' : agent.users?.statut === 'actif' ? '#dc2626' : '#059669'} 
                          />
                          <Text
                            className={`font-medium text-sm mt-1 ${
                              offlineReadOnly
                                ? 'text-gray-500'
                                : agent.users?.statut === 'actif' ? 'text-red-700' : 'text-green-700'
                            }`}
                          >
                            {agent.users?.statut === 'actif' ? 'Désactiver' : 'Activer'}
                          </Text>
                        </TouchableOpacity>

                        {agent.users?.role === 'admin' ? (
                          // Only show revoke button if this is not the current user (admin principal)
                          userProfile?.id !== agent.users?.id ? (
                            <TouchableOpacity
                              className={`flex-1 bg-orange-50 p-3 rounded-lg items-center ${offlineReadOnly ? 'opacity-50' : ''}`}
                              disabled={offlineReadOnly}
                              onPress={() => revokeAdmin(agent.users?.id)}
                            >
                              <Ionicons name="arrow-down" size={16} color="#ea580c" />
                              <Text className="text-orange-700 font-medium text-sm mt-1">
                                Rétrograder
                              </Text>
                            </TouchableOpacity>
                          ) : (
                            <View className="flex-1 bg-gray-100 p-3 rounded-lg items-center">
                              <Ionicons name="shield" size={16} color="#6b7280" />
                              <Text className="text-gray-500 font-medium text-sm mt-1">
                                Admin principal
                              </Text>
                            </View>
                          )
                        ) : (
                          <TouchableOpacity
                            className={`flex-1 bg-primary-50 p-3 rounded-lg items-center ${offlineReadOnly ? 'opacity-50' : ''}`}
                            disabled={offlineReadOnly}
                            onPress={() => promoteToAdmin(agent.users?.id)}
                          >
                            <Ionicons name="arrow-up" size={16} color="#1e3a8a" />
                            <Text className="text-primary-700 font-medium text-sm mt-1">
                              Promouvoir admin
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <TouchableOpacity
                        className={`w-full bg-yellow-50 p-3 rounded-lg items-center mt-2 ${offlineReadOnly ? 'opacity-50' : ''}`}
                        disabled={offlineReadOnly}
                        onPress={() => openAssignModal(agent.user_id)}
                      >
                        <Ionicons name="person-add" size={16} color="#d97706" />
                        <Text className="text-yellow-700 font-medium text-sm mt-1">Assigner client</Text>
                      </TouchableOpacity>
                    </View>
                  )}

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
              {clients
                .filter(c => c.users?.statut === 'actif') // Only show active clients
                .map((c) => (
                <TouchableOpacity key={c.user_id} className="p-3 border-b border-gray-100" onPress={() => assignAgentToClient(c.user_id)}>
                  <Text className="font-medium text-gray-900">{c.users?.nom || 'Nom non fourni'}</Text>
                  <Text className="text-gray-500 text-sm">{c.users?.email}</Text>
                  <Text className="text-gray-400 text-xs">Statut: {c.users?.statut}</Text>
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