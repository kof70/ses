import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSupabase } from '../../contexts/SupabaseContext';

interface AdminAlertsScreenWithDataProps {
  allAlerts: any[];
  loading: boolean;
  onAlertUpdate?: () => void;
}

export default function AdminAlertsScreenWithData({ 
  allAlerts, 
  loading,
  onAlertUpdate = () => {}
}: AdminAlertsScreenWithDataProps) {
  const supabase = useSupabase();
  // Show all alerts
  const filteredAlerts = allAlerts;
    
  const activeAlerts = allAlerts.filter(alert => alert.statut === 'en_cours').length;

  const handleResolveAlert = async (alertId: string) => {
    Alert.alert(
      'Résoudre l\'alerte',
      'Êtes-vous sûr de vouloir marquer cette alerte comme résolue ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { 
          text: 'Résoudre', 
          style: 'default', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sos_alerts')
                .update({ 
                  statut: 'resolu',
                  updated_at: new Date().toISOString()
                })
                .eq('id', alertId);

              if (error) {
                console.error('Error resolving alert:', error);
                Alert.alert('Erreur', 'Impossible de résoudre l\'alerte');
                return;
              }

              Alert.alert('Succès', 'Alerte marquée comme résolue');
              onAlertUpdate();
            } catch (error) {
              console.error('Error resolving alert:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        },
      ]
    );
  };

  const handleCancelAlert = async (alertId: string) => {
    Alert.alert(
      'Annuler l\'alerte',
      'Êtes-vous sûr de vouloir annuler cette alerte ?',
      [
        { text: 'Non', style: 'cancel' },
        { 
          text: 'Oui', 
          style: 'destructive', 
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('sos_alerts')
                .update({ 
                  statut: 'annule',
                  updated_at: new Date().toISOString()
                })
                .eq('id', alertId);

              if (error) {
                console.error('Error canceling alert:', error);
                Alert.alert('Erreur', 'Impossible d\'annuler l\'alerte');
                return;
              }

              Alert.alert('Succès', 'Alerte annulée');
              onAlertUpdate();
            } catch (error) {
              console.error('Error canceling alert:', error);
              Alert.alert('Erreur', 'Une erreur est survenue');
            }
          }
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Chargement des alertes...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'en_cours':
        return 'bg-danger-100 text-danger-800';
      case 'resolu':
        return 'bg-success-100 text-success-800';
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-6 py-6 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Alertes SOS</Text>
        <Text className="text-gray-500 mt-1">
          {activeAlerts} alerte{activeAlerts > 1 ? 's' : ''} active{activeAlerts > 1 ? 's' : ''}
        </Text>
      </View>


      <ScrollView className="flex-1">
        <View className="px-6 py-6">
          {filteredAlerts.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Ionicons name="shield-checkmark" size={64} color="#10b981" />
              <Text className="text-gray-500 text-xl font-medium mt-4">
                Aucune alerte
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Aucune alerte SOS n'a été déclenchée
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

                  {/* Action buttons for active alerts */}
                  {alert.statut === 'en_cours' && (
                    <View className="flex-row space-x-3 pt-4 border-t border-gray-100">
                      <TouchableOpacity
                        className="flex-1 bg-success-500 py-3 rounded-lg"
                        onPress={() => handleResolveAlert(alert.id)}
                      >
                        <Text className="text-white font-medium text-center">
                          Résoudre
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        className="flex-1 bg-gray-500 py-3 rounded-lg"
                        onPress={() => handleCancelAlert(alert.id)}
                      >
                        <Text className="text-white font-medium text-center">
                          Annuler
                        </Text>
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
