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
import { useNotifications } from '../../contexts/NotificationContext';
import * as Location from 'expo-location';

export default function ClientDashboardScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const { sendNotification } = useNotifications();
  const [clientData, setClientData] = useState<any>(null);
  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sosLoading, setSosLoading] = useState(false);

  const fetchClientData = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();

      if (error) {
        console.error('Error fetching client data:', error);
        return;
      }

      setClientData(data);
      
      // Get recent scans from historique_scans
      const scans = data.historique_scans || [];
      setRecentScans(scans.slice(-5).reverse()); // Last 5 scans, most recent first
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchClientData();
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
          client_id: clientData?.id,
          type: 'client_sos',
          message: `Alerte SOS déclenchée par le client ${userProfile?.nom}`,
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
        'Votre alerte SOS a été envoyée. L\'administration et les agents ont été notifiés.'
      );
    } catch (error) {
      console.error('Error sending SOS:', error);
      Alert.alert('Erreur', 'Impossible d\'envoyer l\'alerte SOS');
    } finally {
      setSosLoading(false);
    }
  };

  const formatScanDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <Text className="text-primary-100 mt-1">Espace client</Text>
        </View>

        <View className="px-6 py-6 space-y-6">
          {/* Quick Stats */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Statistiques
            </Text>
            <View className="flex-row justify-between">
              <View className="items-center">
                <Text className="text-2xl font-bold text-primary-900">
                  {recentScans.length}
                </Text>
                <Text className="text-gray-600 text-sm">Scans effectués</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-success-600">
                  {recentScans.filter(scan => scan.agent_status === 'disponible').length}
                </Text>
                <Text className="text-gray-600 text-sm">Agents disponibles</Text>
              </View>
              <View className="items-center">
                <Text className="text-2xl font-bold text-warning-600">0</Text>
                <Text className="text-gray-600 text-sm">Alertes actives</Text>
              </View>
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
                <Ionicons name="qr-code" size={24} color="#1e3a8a" />
                <Text className="text-gray-900 ml-3 font-medium">
                  Scanner un agent
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="list" size={24} color="#1e3a8a" />
                <Text className="text-gray-900 ml-3 font-medium">
                  Voir l'historique
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Scans */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Scans récents
            </Text>
            
            {recentScans.length === 0 ? (
              <View className="items-center py-8">
                <Ionicons name="qr-code-outline" size={48} color="#9ca3af" />
                <Text className="text-gray-500 font-medium mt-2">
                  Aucun scan effectué
                </Text>
                <Text className="text-gray-400 text-sm text-center mt-1">
                  Utilisez le scanner pour vérifier le statut des agents
                </Text>
              </View>
            ) : (
              <View className="space-y-3">
                {recentScans.map((scan, index) => (
                  <View
                    key={index}
                    className="flex-row items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <View className="flex-1">
                      <Text className="text-gray-900 font-medium">
                        {scan.agent_name}
                      </Text>
                      <Text className="text-gray-500 text-sm">
                        {formatScanDate(scan.scan_date)}
                      </Text>
                    </View>
                    <View
                      className={`px-2 py-1 rounded-full ${
                        scan.agent_status === 'disponible'
                          ? 'bg-success-100'
                          : scan.agent_status === 'en_mission'
                          ? 'bg-warning-100'
                          : 'bg-danger-100'
                      }`}
                    >
                      <Text
                        className={`text-xs font-medium ${
                          scan.agent_status === 'disponible'
                            ? 'text-success-800'
                            : scan.agent_status === 'en_mission'
                            ? 'text-warning-800'
                            : 'text-danger-800'
                        }`}
                      >
                        {scan.agent_status === 'disponible'
                          ? 'Disponible'
                          : scan.agent_status === 'en_mission'
                          ? 'En mission'
                          : 'Indisponible'}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Info Card */}
          <View className="bg-blue-50 rounded-xl p-6">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-900 font-semibold mb-2">
                  Comment utiliser l'application
                </Text>
                <Text className="text-blue-800 text-sm leading-5">
                  • Utilisez le scanner pour vérifier le statut des agents{'\n'}
                  • Déclenchez une alerte SOS en cas d'urgence{'\n'}
                  • Consultez votre historique de scans dans l'onglet dédié
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}