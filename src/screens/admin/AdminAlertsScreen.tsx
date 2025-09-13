import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function AdminAlertsScreen() {
  // Move hooks to top level to avoid context issues during re-renders
  const authContext = useAuth();
  const supabaseContext = useSupabase();
  const userProfile = authContext?.userProfile;
  const supabase = supabaseContext;
  
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'resolu'>('all');

  useEffect(() => {
    console.log('[NavTrace] AdminAlertsScreen mounted');
  }, []);

  const fetchAlerts = async () => {
    try {
      let query = supabase
        .from('sos_alerts')
        .select(`
          *,
          agents:agent_id (
            users:users!agents_user_id_fkey (nom)
          ),
          clients:client_id (
            users:users!clients_user_id_fkey (nom)
          )
        `)
        .order('created_at', { ascending: false });

      if (filter === 'resolu') {
        query = query.eq('statut', 'resolu');
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching alerts:', error);
        return;
      }

      setAlerts(data || []);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch alerts when filter changes
  useEffect(() => {
    fetchAlerts();
  }, [filter]);

  // Stable realtime subscription (subscribe once)
  useEffect(() => {
    const channel = supabase
      .channel('admin_alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sos_alerts' }, () => {
        fetchAlerts();
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const updateAlertStatus = async (alertId: string, newStatus: 'resolu' | 'annule') => {
    try {
      const { error } = await supabase
        .from('sos_alerts')
        .update({ 
          statut: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', alertId);

      if (error) {
        throw error;
      }

      Alert.alert('Succès', `Alerte ${newStatus === 'resolu' ? 'résolue' : 'annulée'}`);
      fetchAlerts();
    } catch (error) {
      console.error('Error updating alert status:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour l\'alerte');
    }
  };

  const handleResolveAlert = (alertId: string) => {
    Alert.alert(
      'Résoudre l\'alerte',
      'Êtes-vous sûr de vouloir marquer cette alerte comme résolue ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Résoudre', onPress: () => updateAlertStatus(alertId, 'resolu') },
      ]
    );
  };

  const handleCancelAlert = (alertId: string) => {
    Alert.alert(
      'Annuler l\'alerte',
      'Êtes-vous sûr de vouloir annuler cette alerte ?',
      [
        { text: 'Non', style: 'cancel' },
        { text: 'Annuler l\'alerte', style: 'destructive', onPress: () => updateAlertStatus(alertId, 'annule') },
      ]
    );
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_cours':
        return 'bg-danger-100 text-danger-800';
      case 'resolu':
        return 'bg-success-100 text-success-800';
      case 'annule':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'en_cours':
        return 'En cours';
      case 'resolu':
        return 'Résolu';
      case 'annule':
        return 'Annulé';
      default:
        return status;
    }
  };

  const getAlertTypeText = (type: string) => {
    return type === 'agent_sos' ? 'Agent' : 'Client';
  };

  const getPersonName = (alert: any) => {
    if (alert.type === 'agent_sos' && alert.agents?.users?.nom) {
      return alert.agents.users.nom;
    } else if (alert.type === 'client_sos' && alert.clients?.users?.nom) {
      return alert.clients.users.nom;
    }
    return 'Inconnu';
  };

  const toNumber = (value: any) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? num : null;
  };

  const openInMaps = (latitude: any, longitude: any) => {
    const latNum = toNumber(latitude);
    const lngNum = toNumber(longitude);
    if (latNum === null || lngNum === null) {
      return;
    }
    const lat = String(latNum);
    const lng = String(lngNum);
    const label = 'Position SOS';
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const url = Platform.select({
      ios: `${scheme}${encodeURIComponent(label)}@${lat},${lng}`,
      android: `${scheme}${lat},${lng}(${encodeURIComponent(label)})`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    if (url) {
      Linking.openURL(url).catch(() => {
        const fallback = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        Linking.openURL(fallback).catch(() => {});
      });
    }
  };

  const filteredAlerts = alerts;
  const activeAlerts = alerts.filter(alert => alert.statut === 'en_cours').length;

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
        <Text className="text-2xl font-bold text-gray-900">Alertes SOS</Text>
        <Text className="text-gray-500 mt-1">
          {activeAlerts} alerte{activeAlerts > 1 ? 's' : ''} active{activeAlerts > 1 ? 's' : ''}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View className="bg-white px-6 py-4 border-b border-gray-200">
        <View className="flex-row space-x-4">
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${
              filter === 'all' ? 'bg-primary-900' : 'bg-gray-100'
            }`}
            onPress={() => setFilter('all')}
          >
            <Text
              className={`font-medium ${
                filter === 'all' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Toutes
            </Text>
          </TouchableOpacity>
          
          
          <TouchableOpacity
            className={`px-4 py-2 rounded-full ${
              filter === 'resolu' ? 'bg-success-500' : 'bg-gray-100'
            }`}
            onPress={() => setFilter('resolu')}
          >
            <Text
              className={`font-medium ${
                filter === 'resolu' ? 'text-white' : 'text-gray-600'
              }`}
            >
              Résolues
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6 py-6">
          {filteredAlerts.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Ionicons name="shield-checkmark" size={64} color="#10b981" />
              <Text className="text-gray-500 text-xl font-medium mt-4">
                {filter === 'all' ? 'Aucune alerte' : 'Aucune alerte résolue'}
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                {filter === 'all' ? 'Aucune alerte SOS n\'a été déclenchée' : 'Aucune alerte n\'a encore été résolue'}
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {filteredAlerts.map((alert) => (
                <View key={alert.id} className="bg-white rounded-xl p-6 shadow-sm">
                  <View className="flex-row items-start justify-between mb-4">
                    <View className="flex-1">
                      <View className="flex-row items-center mb-2">
                        <Ionicons 
                          name="warning" 
                          size={20} 
                          color={alert.statut === 'en_cours' ? '#ef4444' : '#6b7280'} 
                        />
                        <Text className="text-lg font-semibold text-gray-900 ml-2">
                          SOS {getAlertTypeText(alert.type)}
                        </Text>
                      </View>
                      
                      <Text className="text-gray-600 mb-1">
                        Par: {getPersonName(alert)}
                      </Text>
                      
                      <Text className="text-gray-500 text-sm">
                        {formatDate(alert.created_at)}
                      </Text>
                    </View>
                    
                    <View
                      className={`px-3 py-1 rounded-full ${getStatusColor(alert.statut)}`}
                    >
                      <Text className="text-sm font-medium">
                        {getStatusText(alert.statut)}
                      </Text>
                    </View>
                  </View>

                  {alert.message && (
                    <View className="mb-4">
                      <Text className="text-gray-700">{alert.message}</Text>
                    </View>
                  )}

                  {(() => {
                    const latNum = toNumber(alert.latitude);
                    const lngNum = toNumber(alert.longitude);
                    const hasCoords = latNum !== null && lngNum !== null;
                    return hasCoords ? (
                    <View className="flex-row items-center mb-4">
                      <Ionicons name="location" size={16} color="#6b7280" />
                      <Text className="text-gray-500 text-sm ml-2">
                        Position: {latNum!.toFixed(6)}, {lngNum!.toFixed(6)}
                      </Text>
                      <TouchableOpacity
                        className="ml-3 px-3 py-1 rounded-lg bg-primary-900"
                        onPress={() => openInMaps(latNum, lngNum)}
                      >
                        <Text className="text-white text-sm font-medium">Ouvrir dans Maps</Text>
                      </TouchableOpacity>
                    </View>
                    ) : null;
                  })()}

                  {alert.statut === 'en_cours' && (
                    <View className="flex-row space-x-3 pt-4 border-t border-gray-100">
                      <TouchableOpacity
                        className="flex-1 bg-success-500 py-3 rounded-lg items-center"
                        onPress={() => handleResolveAlert(alert.id)}
                      >
                        <Text className="text-white font-semibold">Résoudre</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        className="flex-1 bg-gray-500 py-3 rounded-lg items-center"
                        onPress={() => handleCancelAlert(alert.id)}
                      >
                        <Text className="text-white font-semibold">Annuler</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}