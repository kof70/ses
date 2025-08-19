import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function AdminDashboardScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
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
        {/* Header */}
        <View className="bg-primary-900 px-6 py-8">
          <Text className="text-white text-2xl font-bold">
            Tableau de bord
          </Text>
          <Text className="text-primary-100 mt-1">
            Bienvenue, {userProfile?.nom}
          </Text>
        </View>

        <View className="px-6 py-6 space-y-6">
          {/* Stats Grid */}
          <View className="grid grid-cols-2 gap-4">
            <View className="bg-white rounded-xl p-6 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="people" size={24} color="#3b82f6" />
                <Text className="text-2xl font-bold text-gray-900">
                  {stats.totalAgents}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">Agents total</Text>
              <Text className="text-success-600 text-xs mt-1">
                {stats.activeAgents} actifs
              </Text>
            </View>

            <View className="bg-white rounded-xl p-6 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="person" size={24} color="#10b981" />
                <Text className="text-2xl font-bold text-gray-900">
                  {stats.totalClients}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">Clients</Text>
            </View>

            <View className="bg-white rounded-xl p-6 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="warning" size={24} color="#ef4444" />
                <Text className="text-2xl font-bold text-gray-900">
                  {stats.activeSOS}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">SOS actifs</Text>
            </View>

            <View className="bg-white rounded-xl p-6 shadow-sm">
              <View className="flex-row items-center justify-between mb-2">
                <Ionicons name="megaphone" size={24} color="#f59e0b" />
                <Text className="text-2xl font-bold text-gray-900">
                  {stats.totalAnnouncements}
                </Text>
              </View>
              <Text className="text-gray-600 text-sm">Annonces</Text>
            </View>
          </View>

          {/* Quick Actions */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Actions rapides
            </Text>
            <View className="grid grid-cols-2 gap-3">
              <TouchableOpacity className="bg-primary-50 p-4 rounded-lg items-center">
                <Ionicons name="person-add" size={24} color="#1e3a8a" />
                <Text className="text-primary-900 font-medium mt-2 text-center">
                  Ajouter agent
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="bg-success-50 p-4 rounded-lg items-center">
                <Ionicons name="megaphone" size={24} color="#059669" />
                <Text className="text-success-700 font-medium mt-2 text-center">
                  Nouvelle annonce
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="bg-warning-50 p-4 rounded-lg items-center">
                <Ionicons name="eye" size={24} color="#d97706" />
                <Text className="text-warning-700 font-medium mt-2 text-center">
                  Voir agents
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="bg-danger-50 p-4 rounded-lg items-center">
                <Ionicons name="warning" size={24} color="#dc2626" />
                <Text className="text-danger-700 font-medium mt-2 text-center">
                  Gérer alertes
                </Text>
              </TouchableOpacity>
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

          {/* System Status */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              État du système
            </Text>
            
            <View className="space-y-3">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 bg-success-500 rounded-full mr-3" />
                  <Text className="text-gray-700">Serveur</Text>
                </View>
                <Text className="text-success-600 font-medium">Opérationnel</Text>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 bg-success-500 rounded-full mr-3" />
                  <Text className="text-gray-700">Base de données</Text>
                </View>
                <Text className="text-success-600 font-medium">Opérationnelle</Text>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <View className="w-3 h-3 bg-success-500 rounded-full mr-3" />
                  <Text className="text-gray-700">Notifications</Text>
                </View>
                <Text className="text-success-600 font-medium">Actives</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}