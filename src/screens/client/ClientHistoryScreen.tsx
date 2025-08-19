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

export default function ClientHistoryScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const [scans, setScans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchScanHistory = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('clients')
        .select('historique_scans')
        .eq('user_id', userProfile.id)
        .single();

      if (error) {
        console.error('Error fetching scan history:', error);
        return;
      }

      const scanHistory = data.historique_scans || [];
      setScans(scanHistory.reverse()); // Most recent first
    } catch (error) {
      console.error('Error fetching scan history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchScanHistory();
  }, [userProfile]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchScanHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    });
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'checkmark-circle';
      case 'en_mission':
        return 'time';
      case 'indisponible':
        return 'close-circle';
      default:
        return 'help-circle';
    }
  };

  // Group scans by date
  const groupedScans = scans.reduce((groups: any, scan) => {
    const date = formatDate(scan.scan_date);
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(scan);
    return groups;
  }, {});

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
        <Text className="text-white text-2xl font-bold">Historique des scans</Text>
        <Text className="text-primary-100 mt-1">
          {scans.length} scan{scans.length > 1 ? 's' : ''} effectué{scans.length > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6 py-6">
          {scans.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Ionicons name="qr-code-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-xl font-medium mt-4">
                Aucun scan effectué
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Utilisez le scanner pour vérifier le statut des agents de sécurité
              </Text>
              <TouchableOpacity className="bg-primary-900 px-6 py-3 rounded-lg mt-6">
                <Text className="text-white font-semibold">Commencer à scanner</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-6">
              {Object.entries(groupedScans).map(([date, dateScans]: [string, any]) => (
                <View key={date} className="bg-white rounded-xl shadow-sm overflow-hidden">
                  <View className="bg-gray-50 px-6 py-3 border-b border-gray-100">
                    <Text className="text-gray-900 font-semibold">{date}</Text>
                  </View>
                  
                  <View className="divide-y divide-gray-100">
                    {dateScans.map((scan: any, index: number) => (
                      <View key={index} className="p-6">
                        <View className="flex-row items-center justify-between mb-3">
                          <View className="flex-1">
                            <Text className="text-lg font-semibold text-gray-900">
                              {scan.agent_name}
                            </Text>
                            <Text className="text-gray-500 text-sm">
                              Scanné à {formatTime(scan.scan_date)}
                            </Text>
                          </View>
                          
                          <View className="flex-row items-center">
                            <View
                              className={`px-3 py-1 rounded-full flex-row items-center ${getStatusColor(
                                scan.agent_status
                              )}`}
                            >
                              <Ionicons
                                name={getStatusIcon(scan.agent_status)}
                                size={16}
                                color={
                                  scan.agent_status === 'disponible'
                                    ? '#059669'
                                    : scan.agent_status === 'en_mission'
                                    ? '#d97706'
                                    : '#dc2626'
                                }
                              />
                              <Text className="text-sm font-medium ml-1">
                                {getStatusText(scan.agent_status)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        
                        <View className="flex-row items-center">
                          <Ionicons name="qr-code" size={16} color="#6b7280" />
                          <Text className="text-gray-500 text-sm ml-2 font-mono">
                            {scan.qr_code}
                          </Text>
                        </View>
                      </View>
                    ))}
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