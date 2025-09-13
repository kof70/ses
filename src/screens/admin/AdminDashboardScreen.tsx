import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import { useNavigation } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';

export default function AdminDashboardScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const navigation: any = useNavigation();
  const [stats, setStats] = useState({
    totalAgents: 0,
    activeAgents: 0,
    totalClients: 0,
    activeSOS: 0,
    totalAnnouncements: 0,
  });
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Assignment modal state
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedClient, setSelectedClient] = useState('');
  const [assignmentType, setAssignmentType] = useState<'agent-to-client' | 'client-to-agent'>('agent-to-client');

  // Clients modal state
  const [showClientsModal, setShowClientsModal] = useState(false);

  const fetchDashboardData = async () => {
    try {
      // Fetch agents stats
      const { data: agents, error: agentsError } = await supabase
        .from('agents')
        .select('disponibilite');

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
      }

      // Fetch clients count
      const { count: clientsCount, error: clientsError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      if (clientsError) {
        console.error('Error fetching clients count:', clientsError);
      }

      // Fetch active SOS alerts
      const { data: sosAlerts, error: sosError } = await supabase
        .from('sos_alerts')
        .select('*')
        .eq('statut', 'en_cours')
        .order('created_at', { ascending: false })
        .limit(5);

      if (sosError) {
        console.error('Error fetching SOS alerts:', sosError);
      }

      // Fetch announcements count
      const { count: announcementsCount, error: announcementsError } = await supabase
        .from('annonces')
        .select('*', { count: 'exact', head: true });

      if (announcementsError) {
        console.error('Error fetching announcements count:', announcementsError);
      }

      // Calculate stats
      const totalAgents = agents?.length || 0;
      const activeAgents = agents?.filter(agent => agent.disponibilite === 'disponible').length || 0;
      const activeSOS = sosAlerts?.length || 0;

      setStats({
        totalAgents,
        activeAgents,
        totalClients: clientsCount || 0,
        activeSOS,
        totalAnnouncements: announcementsCount || 0,
      });

      setRecentAlerts(sosAlerts || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const fetchAgentsAndClients = async () => {
    try {
      // Fetch agents with their names
      const { data: agentsData, error: agentsError } = await supabase
        .from('agents')
        .select(`
          user_id,
          disponibilite,
          users:users!agents_user_id_fkey (
            nom
          )
        `)
        .eq('users.statut', 'actif');

      if (agentsError) {
        console.error('Error fetching agents:', agentsError);
        return;
      }

      // Fetch clients with their names and last position
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select(`
          user_id,
          last_latitude,
          last_longitude,
          last_position_at,
          users:users!clients_user_id_fkey (
            nom
          )
        `)
        .eq('users.statut', 'actif');

      if (clientsError) {
        console.error('Error fetching clients:', clientsError);
        return;
      }

      setAgents(agentsData || []);
      setClients(clientsData || []);
    } catch (error) {
      console.error('Error fetching agents and clients:', error);
    }
  };

  const handleCreateAssignment = async () => {
    if (!selectedAgent || !selectedClient) {
      Alert.alert('Erreur', 'Veuillez sélectionner un agent et un client');
      return;
    }

    try {
      const { error } = await supabase
        .from('agent_client_assignments')
        .insert({
          agent_user_id: selectedAgent,
          client_user_id: selectedClient,
          status: 'active',
          assigned_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error creating assignment:', error);
        Alert.alert('Erreur', 'Impossible de créer l\'assignation');
        return;
      }

      Alert.alert('Succès', 'Assignation créée avec succès');
      setShowAssignmentModal(false);
      setSelectedAgent('');
      setSelectedClient('');
    } catch (error) {
      console.error('Error creating assignment:', error);
      Alert.alert('Erreur', 'Une erreur est survenue');
    }
  };

  const openClientsModal = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select(`
          user_id,
          last_latitude,
          last_longitude,
          last_position_at,
          users:user_id (
            id,
            nom,
            email,
            role,
            statut
          )
        `)
        .order('last_position_at', { ascending: false });
      if (error) {
        console.error('Error fetching clients:', error);
      }
      setClients(data || []);
      setShowClientsModal(true);
    } catch (e) {
      console.error('Error opening clients modal:', e);
      setShowClientsModal(true);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time updates for SOS alerts
    const channel = supabase
      .channel('admin_dashboard')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sos_alerts' },
        () => {
          fetchDashboardData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 60) {
      return `Il y a ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
  };

  const getAlertTypeText = (type: string) => {
    return type === 'agent_sos' ? 'Agent' : 'Client';
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
        {/* Header - style clair */}
        <View className="bg-white px-6 py-6 border-b border-gray-100">
          <Text className="text-2xl font-bold text-gray-900">
            Tableau de bord
          </Text>
          <Text className="text-gray-500 mt-1">
            Bienvenue, {userProfile?.nom}
          </Text>
        </View>

        <View className="px-6 py-6 space-y-6">
          {/* Stats Grid - Optimisée avec espacement */}
          <View className="space-y-6">
            {/* Première ligne - Agents et Clients */}
            <View className="flex-row space-x-6">
              <View className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-blue-50 p-2 rounded-lg">
                    <Ionicons name="people" size={20} color="#3b82f6" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {stats.totalAgents}
                  </Text>
                </View>
                <Text className="text-gray-600 text-sm font-medium">Agents total</Text>
                <Text className="text-success-600 text-xs mt-1 font-medium">
                  {stats.activeAgents} actifs
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-green-50 p-2 rounded-lg">
                    <Ionicons name="person" size={20} color="#10b981" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {stats.totalClients}
                  </Text>
                </View>
                <Text className="text-gray-600 text-sm font-medium">Clients</Text>
                <Text className="text-gray-400 text-xs mt-1">
                  Enregistrés
                </Text>
              </View>
            </View>

            {/* Deuxième ligne - SOS et Annonces */}
            <View className="flex-row space-x-6">
              <View className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-red-50 p-2 rounded-lg">
                    <Ionicons name="warning" size={20} color="#ef4444" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {stats.activeSOS}
                  </Text>
                </View>
                <Text className="text-gray-600 text-sm font-medium">SOS actifs</Text>
                <Text className="text-red-500 text-xs mt-1 font-medium">
                  {stats.activeSOS > 0 ? 'Attention requise' : 'Aucun'}
                </Text>
              </View>

              <View className="flex-1 bg-white rounded-xl p-5 shadow-sm border border-gray-100">
                <View className="flex-row items-center justify-between mb-2">
                  <View className="bg-yellow-50 p-2 rounded-lg">
                    <Ionicons name="megaphone" size={20} color="#f59e0b" />
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">
                    {stats.totalAnnouncements}
                  </Text>
                </View>
                <Text className="text-gray-600 text-sm font-medium">Annonces</Text>
                <Text className="text-gray-400 text-xs mt-1">
                  Publiées
                </Text>
              </View>
            </View>
          </View>

          {/* Quick Actions - Optimisées */}
          <View className="bg-white rounded-xl p-5 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Actions rapides
            </Text>
            <View className="space-y-3">
              {/* Première ligne d'actions */}
              <View className="flex-row space-x-3">
                <TouchableOpacity className="flex-1 bg-primary-50 p-3 rounded-lg items-center" onPress={() => {
                  fetchAgentsAndClients();
                  setShowAssignmentModal(true);
                }}>
                  <Ionicons name="swap-horizontal" size={20} color="#1e3a8a" />
                  <Text className="text-primary-900 font-medium mt-1 text-center text-sm">
                    Assignation
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity className="flex-1 bg-success-50 p-3 rounded-lg items-center" onPress={() => navigation.navigate('Announces')}>
                  <Ionicons name="megaphone" size={20} color="#059669" />
                  <Text className="text-success-700 font-medium mt-1 text-center text-sm">
                    Nouvelle annonce
                  </Text>
                </TouchableOpacity>
              </View>
              
              {/* Deuxième ligne d'actions */}
              <View className="flex-row space-x-3">
                <TouchableOpacity className="flex-1 bg-warning-50 p-3 rounded-lg items-center" onPress={() => navigation.navigate('Clients')}>
                  <Ionicons name="people" size={20} color="#d97706" />
                  <Text className="text-warning-700 font-medium mt-1 text-center text-sm">
                    Voir clients
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity className="flex-1 bg-danger-50 p-3 rounded-lg items-center" onPress={() => navigation.navigate('Alerts')}>
                  <Ionicons name="warning" size={20} color="#dc2626" />
                  <Text className="text-danger-700 font-medium mt-1 text-center text-sm">
                    Gérer alertes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Recent SOS Alerts */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-semibold text-gray-900">
                Alertes SOS récentes
              </Text>
              {stats.activeSOS > 0 && (
                <View className="bg-danger-100 px-2 py-1 rounded-full">
                  <Text className="text-danger-800 text-xs font-medium">
                    {stats.activeSOS} active{stats.activeSOS > 1 ? 's' : ''}
                  </Text>
                </View>
              )}
            </View>

            {recentAlerts.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="shield-checkmark" size={48} color="#10b981" />
                <Text className="text-gray-500 font-medium mt-2">
                  Aucune alerte active
                </Text>
                <Text className="text-gray-400 text-sm text-center mt-1">
                  Toutes les alertes SOS ont été résolues
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {recentAlerts.map((alert) => (
                  <TouchableOpacity
                    key={alert.id}
                    className="flex-row items-center p-3 bg-red-50 rounded-lg border border-red-100"
                  >
                    <View className="w-3 h-3 bg-danger-500 rounded-full mr-3" />
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">
                        SOS {getAlertTypeText(alert.type)}
                      </Text>
                      <Text className="text-gray-600 text-sm">
                        {alert.message}
                      </Text>
                      <Text className="text-gray-500 text-xs mt-1">
                        {formatDate(alert.created_at)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* System Status - Optimisé avec espacement */}
          <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              État du système
            </Text>
            
            <View className="flex-row justify-between space-x-4">
              <View className="flex-1 items-center bg-gray-50 rounded-lg p-3">
                <View className="w-3 h-3 bg-success-500 rounded-full mb-2" />
                <Text className="text-gray-700 text-sm font-medium">Serveur</Text>
                <Text className="text-success-600 text-xs font-medium">Opérationnel</Text>
              </View>
              
              <View className="flex-1 items-center bg-gray-50 rounded-lg p-3">
                <View className="w-3 h-3 bg-success-500 rounded-full mb-2" />
                <Text className="text-gray-700 text-sm font-medium">Base de données</Text>
                <Text className="text-success-600 text-xs font-medium">Opérationnelle</Text>
              </View>
              
              <View className="flex-1 items-center bg-gray-50 rounded-lg p-3">
                <View className="w-3 h-3 bg-success-500 rounded-full mb-2" />
                <Text className="text-gray-700 text-sm font-medium">Notifications</Text>
                <Text className="text-success-600 text-xs font-medium">Actives</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Assignment Modal */}
      <Modal
        visible={showAssignmentModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAssignmentModal(false)}
      >
        <View className="flex-1 bg-black/50 justify-end">
          <View className="bg-white rounded-t-3xl p-6 max-h-[80%]">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Assigner un client à un agent
              </Text>
              <TouchableOpacity
                onPress={() => setShowAssignmentModal(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="space-y-4">
              {/* Agent Selection */}
              <View>
                <Text className="text-gray-700 font-medium mb-2">Sélectionner un agent</Text>
                <View className="border border-gray-300 rounded-lg">
                  <Picker
                    selectedValue={selectedAgent}
                    onValueChange={setSelectedAgent}
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="Choisir un agent..." value="" />
                    {agents.map((agent) => (
                      <Picker.Item
                        key={agent.user_id}
                        label={`${agent.users?.nom || 'Sans nom'} (${agent.disponibilite})`}
                        value={agent.user_id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Client Selection */}
              <View>
                <Text className="text-gray-700 font-medium mb-2">Sélectionner un client</Text>
                <View className="border border-gray-300 rounded-lg">
                  <Picker
                    selectedValue={selectedClient}
                    onValueChange={setSelectedClient}
                    style={{ height: 50 }}
                  >
                    <Picker.Item label="Choisir un client..." value="" />
                    {clients.map((client) => (
                      <Picker.Item
                        key={client.user_id}
                        label={`${client.users?.nom || 'Sans nom'}${client.last_latitude ? ' (Position connue)' : ' (Pas de position)'}`}
                        value={client.user_id}
                      />
                    ))}
                  </Picker>
                </View>
              </View>

              {/* Selected Client Info */}
              {selectedClient && (
                <View className="bg-gray-50 p-4 rounded-lg">
                  <Text className="text-gray-700 font-medium mb-2">Informations du client</Text>
                  {(() => {
                    const client = clients.find(c => c.user_id === selectedClient);
                    return (
                      <View>
                        <Text className="text-gray-600">
                          Nom: {client?.users?.nom}
                        </Text>
                        {client?.last_latitude && client?.last_longitude ? (
                          <Text className="text-gray-600">
                            Position: {client.last_latitude.toFixed(4)}, {client.last_longitude.toFixed(4)}
                          </Text>
                        ) : (
                          <Text className="text-orange-600">
                            Aucune position partagée
                          </Text>
                        )}
                        {client?.last_position_at && (
                          <Text className="text-gray-500 text-sm">
                            Dernière position: {new Date(client.last_position_at).toLocaleString('fr-FR')}
                          </Text>
                        )}
                      </View>
                    );
                  })()}
                </View>
              )}

              {/* Action Buttons */}
              <View className="flex-row space-x-3 pt-4">
                <TouchableOpacity
                  className="flex-1 bg-gray-200 py-3 rounded-lg"
                  onPress={() => setShowAssignmentModal(false)}
                >
                  <Text className="text-gray-700 font-medium text-center">Annuler</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 bg-primary-600 py-3 rounded-lg"
                  onPress={handleCreateAssignment}
                >
                  <Text className="text-white font-medium text-center">Assigner</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Clients Modal */}
      <Modal visible={showClientsModal} transparent animationType="slide" onRequestClose={() => setShowClientsModal(false)}>
        <View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <View className="bg-white p-4 rounded-t-2xl" style={{ maxHeight: '80%' }}>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-lg font-semibold">Tous les clients</Text>
              <TouchableOpacity onPress={() => setShowClientsModal(false)} className="p-2">
                <Ionicons name="close" size={22} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <ScrollView>
              {clients.map((c) => (
                <View key={c.user_id} className="p-3 border-b border-gray-100">
                  <Text className="text-gray-900 font-medium">{c.users?.nom || 'Sans nom'}</Text>
                  <Text className="text-gray-600 text-sm">{c.users?.email}</Text>
                  <View className="flex-row mt-1">
                    <Text className="text-gray-500 text-xs mr-2">Statut: {c.users?.statut}</Text>
                    <Text className="text-gray-500 text-xs">Rôle: {c.users?.role}</Text>
                  </View>
                  {c.last_latitude && c.last_longitude ? (
                    <Text className="text-gray-600 text-xs mt-1">
                      Position: {Number(c.last_latitude).toFixed(6)}, {Number(c.last_longitude).toFixed(6)}
                    </Text>
                  ) : (
                    <Text className="text-gray-400 text-xs mt-1">Position non fournie</Text>
                  )}
                  {c.last_position_at && (
                    <Text className="text-gray-400 text-xs">Maj: {new Date(c.last_position_at).toLocaleString('fr-FR')}</Text>
                  )}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}