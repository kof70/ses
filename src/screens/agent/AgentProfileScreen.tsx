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

export default function AgentProfileScreen() {
  const { userProfile, signOut, refreshProfile } = useAuth();
  const supabase = useSupabase();
  const [agentData, setAgentData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState('');
  const [zoneAssignee, setZoneAssignee] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assignedZones, setAssignedZones] = useState<any[]>([]);

  const fetchAgentData = async () => {
    if (!userProfile) return;

    try {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('user_id', userProfile.id)
        .single();

      if (error) {
        console.error('Error fetching agent data:', error);
        return;
      }

      setAgentData(data);
      setNom(userProfile.nom);
      setZoneAssignee(data.zone_assignee || '');

      try {
        const { data: az } = await supabase
          .from('agent_zones')
          .select('zone_id, zones:zone_id(id, name)')
          .eq('agent_user_id', userProfile.id);
        setAssignedZones((az || []).map((r: any) => r.zones).filter(Boolean));
      } catch {}
    } catch (error) {
      console.error('Error fetching agent data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAgentData();
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

      // Update agent data
      const { error: agentError } = await supabase
        .from('agents')
        .update({ zone_assignee: zoneAssignee })
        .eq('user_id', userProfile?.id);

      if (agentError) {
        throw agentError;
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return 'text-success-600';
      case 'en_mission':
        return 'text-warning-600';
      case 'indisponible':
        return 'text-danger-600';
      default:
        return 'text-gray-600';
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
      <ScrollView>
        {/* Header - style clair */}
        <View className="bg-white px-6 py-6 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Mon Profil</Text>
              <Text className="text-gray-500 mt-1">Agent de sécurité</Text>
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
                <Text className="text-gray-900 font-medium">{userProfile?.email}</Text>
              </View>
              
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Rôle</Text>
                <Text className="text-gray-900 font-medium capitalize">{userProfile?.role}</Text>
              </View>
              
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Statut du compte</Text>
                <Text className="text-gray-900 font-medium capitalize">{userProfile?.statut}</Text>
              </View>
            </View>
          </View>

          {/* Agent Info - Optimisé */}
          <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">
              Informations agent
            </Text>
            
            <View className="space-y-4">
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Zone assignée</Text>
                {editing ? (
                  <TextInput
                    className="bg-white border border-gray-300 rounded-lg px-3 py-2 mt-1"
                    value={zoneAssignee}
                    onChangeText={setZoneAssignee}
                    placeholder="Zone de patrouille"
                  />
                ) : (
                  <Text className="text-gray-900 font-medium">
                    {agentData?.zone_assignee || 'Non assignée'}
                  </Text>
                )}
              </View>
              
              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Statut actuel</Text>
                <Text className={`font-medium ${getStatusColor(agentData?.disponibilite)}`}>
                  {getStatusText(agentData?.disponibilite)}
                </Text>
              </View>

              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Mes zones</Text>
                {assignedZones.length === 0 ? (
                  <Text className="text-gray-900">Aucune zone assignée</Text>
                ) : (
                  <View className="flex-row flex-wrap">
                    {assignedZones.map((z: any) => (
                      <View key={z.id} className="mr-2 mb-2 px-3 py-1 rounded-full bg-primary-900">
                        <Text className="text-white text-sm">{z.name}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <View className="bg-gray-50 rounded-lg p-3">
                <Text className="text-gray-600 text-sm mb-1 font-medium">Code QR</Text>
                <Text className="text-gray-900 font-mono text-sm">
                  {agentData?.qr_code}
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
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}