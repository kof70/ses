import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function AdminAnnouncesScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const [annonces, setAnnonces] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [titre, setTitre] = useState('');
  const [contenu, setContenu] = useState('');
  const [destinataires, setDestinataires] = useState<'tous' | 'agents' | 'clients'>('tous');
  const [saving, setSaving] = useState(false);

  const fetchAnnonces = async () => {
    try {
      const { data, error } = await supabase
        .from('annonces')
        .select(`
          *,
          users:created_by (nom)
        `)
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
      .channel('admin_annonces')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'annonces' },
        () => {
          fetchAnnonces();
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

  const handleCreateAnnonce = async () => {
    if (!titre.trim() || !contenu.trim()) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    setSaving(true);
    
    try {
      const { error } = await supabase
        .from('annonces')
        .insert({
          titre: titre.trim(),
          contenu: contenu.trim(),
          destinataires,
          created_by: userProfile?.id,
        });

      if (error) {
        throw error;
      }

      Alert.alert('Succès', 'Annonce créée et envoyée avec succès');
      setModalVisible(false);
      setTitre('');
      setContenu('');
      setDestinataires('tous');
      fetchAnnonces();
    } catch (error) {
      console.error('Error creating annonce:', error);
      Alert.alert('Erreur', 'Impossible de créer l\'annonce');
    } finally {
      setSaving(false);
    }
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

  const getDestinatairesText = (dest: string) => {
    switch (dest) {
      case 'tous':
        return 'Tous';
      case 'agents':
        return 'Agents';
      case 'clients':
        return 'Clients';
      default:
        return dest;
    }
  };

  const getDestinatairesColor = (dest: string) => {
    switch (dest) {
      case 'tous':
        return 'bg-primary-100 text-primary-800';
      case 'agents':
        return 'bg-success-100 text-success-800';
      case 'clients':
        return 'bg-warning-100 text-warning-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      {/* Header */}
      <View className="bg-primary-900 px-6 py-8">
        <View className="flex-row items-center justify-between">
          <View>
            <Text className="text-white text-2xl font-bold">Annonces</Text>
            <Text className="text-primary-100 mt-1">
              {annonces.length} annonce{annonces.length > 1 ? 's' : ''} publiée{annonces.length > 1 ? 's' : ''}
            </Text>
          </View>
          
          <TouchableOpacity
            className="bg-primary-800 p-3 rounded-full"
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="add" size={24} color="white" />
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
          {annonces.length === 0 ? (
            <View className="bg-white rounded-xl p-8 items-center shadow-sm">
              <Ionicons name="megaphone-outline" size={64} color="#9ca3af" />
              <Text className="text-gray-500 text-xl font-medium mt-4">
                Aucune annonce
              </Text>
              <Text className="text-gray-400 text-center mt-2">
                Créez votre première annonce pour communiquer avec vos équipes
              </Text>
              <TouchableOpacity
                className="bg-primary-900 px-6 py-3 rounded-lg mt-6"
                onPress={() => setModalVisible(true)}
              >
                <Text className="text-white font-semibold">Créer une annonce</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="space-y-4">
              {annonces.map((annonce) => (
                <View key={annonce.id} className="bg-white rounded-xl p-6 shadow-sm">
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
                    <View
                      className={`px-2 py-1 rounded-full ${getDestinatairesColor(annonce.destinataires)}`}
                    >
                      <Text className="text-xs font-medium">
                        {getDestinatairesText(annonce.destinataires)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text className="text-gray-700 leading-5 mb-4">
                    {annonce.contenu}
                  </Text>
                  
                  <View className="flex-row items-center pt-4 border-t border-gray-100">
                    <Ionicons name="megaphone" size={16} color="#6b7280" />
                    <Text className="text-gray-500 text-sm ml-2">
                      Annonce diffusée
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Create Annonce Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View className="flex-1 justify-end bg-black bg-opacity-50">
          <View className="bg-white rounded-t-3xl p-6 max-h-4/5">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-xl font-bold text-gray-900">
                Nouvelle annonce
              </Text>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="p-2"
              >
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="space-y-4">
                <View>
                  <Text className="text-gray-700 font-medium mb-2">Titre</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                    placeholder="Titre de l'annonce"
                    value={titre}
                    onChangeText={setTitre}
                    maxLength={100}
                  />
                </View>

                <View>
                  <Text className="text-gray-700 font-medium mb-2">Contenu</Text>
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                    placeholder="Contenu de l'annonce..."
                    value={contenu}
                    onChangeText={setContenu}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={500}
                  />
                  <Text className="text-gray-400 text-sm mt-1">
                    {contenu.length}/500 caractères
                  </Text>
                </View>

                <View>
                  <Text className="text-gray-700 font-medium mb-2">Destinataires</Text>
                  <View className="space-y-2">
                    {(['tous', 'agents', 'clients'] as const).map((option) => (
                      <TouchableOpacity
                        key={option}
                        className={`flex-row items-center p-3 rounded-lg border ${
                          destinataires === option
                            ? 'bg-primary-50 border-primary-500'
                            : 'bg-white border-gray-300'
                        }`}
                        onPress={() => setDestinataires(option)}
                      >
                        <View
                          className={`w-5 h-5 rounded-full border-2 mr-3 ${
                            destinataires === option
                              ? 'bg-primary-500 border-primary-500'
                              : 'border-gray-300'
                          }`}
                        >
                          {destinataires === option && (
                            <View className="flex-1 items-center justify-center">
                              <View className="w-2 h-2 bg-white rounded-full" />
                            </View>
                          )}
                        </View>
                        <Text
                          className={`font-medium ${
                            destinataires === option ? 'text-primary-900' : 'text-gray-700'
                          }`}
                        >
                          {getDestinatairesText(option)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <TouchableOpacity
                  className={`bg-primary-900 rounded-lg py-4 items-center mt-6 ${
                    saving ? 'opacity-50' : ''
                  }`}
                  onPress={handleCreateAnnonce}
                  disabled={saving}
                >
                  <Text className="text-white font-semibold text-lg">
                    {saving ? 'Publication...' : 'Publier l\'annonce'}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}