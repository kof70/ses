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

export default function AgentAnnouncesScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnnonces = async () => {
    try {
      const { data, error } = await supabase
        .from('annonces')
        .select(`
          *,
          users:created_by (nom)
        `)
        .in('destinataires', ['tous', 'agents'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching annonces:', error);
        return;
      }

      setAnnonces(data || []);
    } catch (error) {
      console.error('Error fetching annonces:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnnonces();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('agent_annonces')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'annonces' },
        (payload) => {
          const newAnnonce = payload.new as any;
          if (newAnnonce.destinataires === 'tous' || newAnnonce.destinataires === 'agents') {
            fetchAnnonces(); // Refresh to get complete data with joins
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnnonces();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `Il y a ${diffMinutes} min`;
    } else if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    } else if (diffDays < 7) {
      return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
  };

  const getDestinatairesText = (destinataires: string) => {
    switch (destinataires) {
      case 'tous':
        return 'Tous';
      case 'agents':
        return 'Agents';
      case 'clients':
        return 'Clients';
      default:
        return destinataires;
    }
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
        <Text className="text-2xl font-bold text-gray-900">Annonces</Text>
        <Text className="text-gray-500 mt-1">
          {annonces.length} annonce{annonces.length > 1 ? 's' : ''}
        </Text>
      </View>

      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View className="px-6 py-6">
          {annonces.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Ionicons name="notifications-off" size={48} color="#9ca3af" />
              <Text className="text-gray-500 text-lg font-medium mt-4">
                Aucune annonce
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Vous n'avez reçu aucune annonce pour le moment
              </Text>
            </View>
          ) : (
            <View className="space-y-4">
              {annonces.map((annonce) => (
                <TouchableOpacity
                  key={annonce.id}
                  className="bg-white rounded-xl p-6 shadow-sm"
                >
                  <View className="flex-row items-start justify-between mb-3">
                    <View className="flex-1">
                      <Text className="text-lg font-semibold text-gray-900 mb-1">
                        {annonce.titre}
                      </Text>
                      <View className="flex-row items-center">
                        <Text className="text-gray-500 text-sm">
                          Par {annonce.users?.nom || 'Admin'}
                        </Text>
                        <View className="w-1 h-1 bg-gray-400 rounded-full mx-2" />
                        <Text className="text-gray-500 text-sm">
                          {formatDate(annonce.created_at)}
                        </Text>
                      </View>
                    </View>
                    <View className="bg-primary-100 px-2 py-1 rounded-full">
                      <Text className="text-primary-800 text-xs font-medium">
                        {getDestinatairesText(annonce.destinataires)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text className="text-gray-700 leading-5">
                    {annonce.contenu}
                  </Text>
                  
                  <View className="flex-row items-center mt-4 pt-4 border-t border-gray-100">
                    <Ionicons name="megaphone" size={16} color="#6b7280" />
                    <Text className="text-gray-500 text-sm ml-2">
                      Annonce officielle
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}