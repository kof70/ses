import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function ClientProfileScreen() {
  const { userProfile, signOut, refreshProfile } = useAuth();
  const supabase = useSupabase();
  const [clientData, setClientData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      setNom(userProfile.nom);
    } catch (error) {
      console.error('Error fetching client data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClientData();
  }, [userProfile]);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({ nom })
        .eq('id', userProfile?.id);

      if (userError) {
        throw userError;
      }

      await refreshProfile();
      setEditing(false);
      Alert.alert('Succès', 'Profil mis à jour avec succès');
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Erreur', 'Impossible de mettre à jour le profil');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: signOut },
      ]
    );
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

  const totalScans = clientData?.historique_scans?.length || 0;

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header */}
        <View className="bg-primary-900 px-6 py-8">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-white text-2xl font-bold">Mon Profil</Text>
              <Text className="text-primary-100 mt-1">Espace client</Text>
            </View>
            <TouchableOpacity
              className="bg-primary-800 p-3 rounded-full"
              onPress={() => setEditing(!editing)}
            >
              <Ionicons 
                name={editing ? "close" : "pencil"} 
                size={20} 
                color="white" 
              />
            </TouchableOpacity>
          </View>
        </View>

        <View className="px-6 py-6 space-y-6">
          {/* Profile Info */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Informations personnelles
            </Text>
            
            <View className="space-y-4">
              <View>
                <Text className="text-gray-600 text-sm mb-1">Nom complet</Text>
                {editing ? (
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2"
                    value={nom}
                    onChangeText={setNom}
                    placeholder="Votre nom complet"
                  />
                ) : (
                  <Text className="text-gray-900 font-medium">{userProfile?.nom}</Text>
                )}
              </View>
              
              <View>
                <Text className="text-gray-600 text-sm mb-1">Email</Text>
                <Text className="text-gray-900 font-medium">{userProfile?.email}</Text>
              </View>
              
              <View>
                <Text className="text-gray-600 text-sm mb-1">Rôle</Text>
                <Text className="text-gray-900 font-medium capitalize">{userProfile?.role}</Text>
              </View>
              
              <View>
                <Text className="text-gray-600 text-sm mb-1">Statut du compte</Text>
                <Text className="text-gray-900 font-medium capitalize">{userProfile?.statut}</Text>
              </View>
            </View>
          </View>

          {/* Statistics */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Statistiques d'utilisation
            </Text>
            
            <View className="space-y-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="qr-code" size={24} color="#3b82f6" />
                  <Text className="text-gray-700 ml-3">Total des scans</Text>
                </View>
                <Text className="text-gray-900 font-bold text-lg">{totalScans}</Text>
              </View>
              
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="calendar" size={24} color="#10b981" />
                  <Text className="text-gray-700 ml-3">Membre depuis</Text>
                </View>
                <Text className="text-gray-900 font-medium">
                  {new Date(clientData?.created_at || '').toLocaleDateString('fr-FR', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </Text>
              </View>
            </View>
          </View>

          {/* Save Button */}
          {editing && (
            <TouchableOpacity
              className={`bg-primary-900 rounded-xl p-4 items-center ${
                saving ? 'opacity-50' : ''
              }`}
              onPress={handleSave}
              disabled={saving}
            >
              <Text className="text-white font-semibold text-lg">
                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </Text>
            </TouchableOpacity>
          )}

          {/* Actions */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Actions
            </Text>
            
            <View className="space-y-3">
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="notifications" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Paramètres de notification
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="shield-checkmark" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Confidentialité et sécurité
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="help-circle" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Aide et support
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                className="flex-row items-center p-3 bg-red-50 rounded-lg"
                onPress={handleSignOut}
              >
                <Ionicons name="log-out" size={24} color="#ef4444" />
                <Text className="text-red-600 ml-3 font-medium">
                  Se déconnecter
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* App Info */}
          <View className="bg-blue-50 rounded-xl p-6">
            <View className="flex-row items-start">
              <Ionicons name="information-circle" size={24} color="#3b82f6" />
              <View className="ml-3 flex-1">
                <Text className="text-blue-900 font-semibold mb-2">
                  SecureGuard Pro
                </Text>
                <Text className="text-blue-800 text-sm leading-5">
                  Version 1.0.0{'\n'}
                  Application de sécurité mobile pour la vérification et le suivi des agents de sécurité.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}