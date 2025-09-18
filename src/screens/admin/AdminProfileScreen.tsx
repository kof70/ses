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

export default function AdminProfileScreen() {
  const { userProfile, signOut, refreshProfile } = useAuth();
  const supabase = useSupabase();
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState('');
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalAgents: 0,
    totalClients: 0,
    totalAnnouncements: 0,
    totalAlerts: 0,
  });

  const fetchStats = async () => {
    try {
      // Fetch total users
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch agents count - count users with role 'agent' instead of agents table
      const { count: agentsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'agent');

      // Fetch clients count - count users with role 'client' instead of clients table
      const { count: clientsCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'client');

      // Fetch announcements count
      const { count: announcementsCount } = await supabase
        .from('annonces')
        .select('*', { count: 'exact', head: true });

      // Fetch alerts count
      const { count: alertsCount } = await supabase
        .from('sos_alerts')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalUsers: usersCount || 0,
        totalAgents: agentsCount || 0,
        totalClients: clientsCount || 0,
        totalAnnouncements: announcementsCount || 0,
        totalAlerts: alertsCount || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  useEffect(() => {
    if (userProfile) {
      setNom(userProfile.nom);
    }
    fetchStats();
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

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <ScrollView>
        {/* Header - style clair */}
        <View className="bg-white px-6 py-6 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Mon Profil</Text>
              <Text className="text-gray-500 mt-1">Administrateur</Text>
            </View>
            <TouchableOpacity
              className="bg-gray-900 p-3 rounded-full"
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
          {/* Profile Info - Optimisé */}
          <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Informations personnelles
            </Text>
            
            <View className="space-y-4">
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Nom complet</Text>
                {editing ? (
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 mt-1"
                    value={nom}
                    onChangeText={setNom}
                    placeholder="Votre nom complet"
                  />
                ) : (
                  <Text className="text-gray-900 font-medium">{userProfile?.nom}</Text>
                )}
              </View>
              
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Email</Text>
                <View className="flex-row items-center justify-between">
                  <Text className="text-gray-900 font-medium flex-1">{userProfile?.email}</Text>
                  <View className="bg-primary-100 px-2 py-1 rounded-full ml-2">
                    <Text className="text-primary-800 font-medium text-xs capitalize">
                      {userProfile?.role}
                    </Text>
                  </View>
                </View>
                <View className="mt-2">
                  <View className="bg-success-100 px-2 py-1 rounded-full self-start">
                    <Text className="text-success-800 font-medium text-xs capitalize">
                      {userProfile?.statut}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* System Statistics - Optimisé */}
          <View className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <Text className="text-base font-semibold text-gray-900 mb-3">
              État du système
            </Text>
            
            <View className="space-y-3">
              {/* Première ligne */}
              <View className="flex-row space-x-2">
                <View className="flex-1 bg-primary-50 p-3 rounded-lg border border-primary-100">
                  <Text className="text-xl font-bold text-primary-900">
                    {stats.totalUsers}
                  </Text>
                  <Text className="text-primary-700 text-xs font-medium">Utilisateurs</Text>
                </View>
                
                <View className="flex-1 bg-success-50 p-3 rounded-lg border border-success-100">
                  <Text className="text-xl font-bold text-success-900">
                    {stats.totalAgents}
                  </Text>
                  <Text className="text-success-700 text-xs font-medium">Agents</Text>
                </View>
              </View>
              
              {/* Deuxième ligne */}
              <View className="flex-row space-x-2">
                <View className="flex-1 bg-warning-50 p-3 rounded-lg border border-warning-100">
                  <Text className="text-xl font-bold text-warning-900">
                    {stats.totalClients}
                  </Text>
                  <Text className="text-warning-700 text-xs font-medium">Clients</Text>
                </View>
                
                <View className="flex-1 bg-danger-50 p-3 rounded-lg border border-danger-100">
                  <Text className="text-xl font-bold text-danger-900">
                    {stats.totalAlerts}
                  </Text>
                  <Text className="text-danger-700 text-xs font-medium">Alertes</Text>
                </View>
              </View>
            </View>
            
            <View className="mt-3 pt-3 border-t border-gray-100">
              <View className="flex-row items-center justify-between">
                <Text className="text-gray-600 text-sm">Annonces</Text>
                <Text className="text-gray-900 font-bold text-base">
                  {stats.totalAnnouncements}
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

          {/* Admin Actions - Commenté */}
          {/* <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Actions administrateur
            </Text>
            
            <View className="space-y-3">
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="settings" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Paramètres système
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="analytics" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Rapports et analyses
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="shield-checkmark" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Sécurité et permissions
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="download" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Exporter les données
                </Text>
              </TouchableOpacity>
            </View>
          </View> */}

          {/* General Actions */}
          <View className="bg-white rounded-xl p-6 shadow-sm">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Actions générales
            </Text>
            
            <View className="space-y-3">
              {/* <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="notifications" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Paramètres de notification
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
                <Ionicons name="help-circle" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Aide et support
                </Text>
              </TouchableOpacity> */}
              
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

          {/* App Info - Optimisé */}
          <View className="bg-blue-50 rounded-xl p-5 border border-blue-100">
            <View className="flex-row items-start">
              <View className="bg-blue-100 p-2 rounded-lg mr-3">
                <Ionicons name="information-circle" size={20} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-blue-900 font-semibold mb-2">
                  SES - Administration
                </Text>
                <Text className="text-blue-800 text-sm leading-5">
                  Version 1.0.0{'\n'}
                  Développé par Rekap{'\n'}
                  Contact: djakpakoffi7029@gmail.com{'\n'}
                  Interface d'administration pour la gestion complète du système de sécurité mobile.
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}