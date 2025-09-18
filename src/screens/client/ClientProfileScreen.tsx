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
import * as Location from 'expo-location';

export default function ClientProfileScreen() {
  const { userProfile, signOut, refreshProfile, offlineReadOnly, assertOnlineOrThrow } = useAuth();
  const supabase = useSupabase();
  const [clientData, setClientData] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [nom, setNom] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [zones, setZones] = useState<any[]>([]);
  const [selectedZoneIds, setSelectedZoneIds] = useState<string[]>([]);

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
    (async () => {
      try {
        const { data: zonesData } = await supabase
          .from('zones')
          .select('*')
          .order('name', { ascending: true });
        setZones(zonesData || []);

        if (userProfile?.id) {
          const { data: cz } = await supabase
            .from('client_zones')
            .select('zone_id')
            .eq('client_user_id', userProfile.id);
          setSelectedZoneIds((cz || []).map((r: any) => r.zone_id));
        }
      } catch (e) {
        console.warn('Failed to load zones', e);
      }
    })();
  }, [userProfile]);

  const handleSave = async () => {
    setSaving(true);
    
    try {
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Mode lecture seule. Revenir en ligne pour modifier.');
        return;
      }
      assertOnlineOrThrow();
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({ nom })
        .eq('id', userProfile?.id);

      if (userError) {
        throw userError;
      }

      // Persist client zones: simple replace strategy
      if (userProfile?.id) {
        const clientId = userProfile.id;
        // Fetch current
        const { data: current } = await supabase
          .from('client_zones')
          .select('zone_id')
          .eq('client_user_id', clientId);
        const currentIds = new Set((current || []).map((r: any) => r.zone_id));
        const nextIds = new Set(selectedZoneIds);

        const toInsert = [...nextIds].filter((id) => !currentIds.has(id));
        const toDelete = [...currentIds].filter((id) => !nextIds.has(id));

        if (toInsert.length) {
          await supabase
            .from('client_zones')
            .insert(toInsert.map((zoneId) => ({ client_user_id: clientId, zone_id: zoneId })));
        }
        if (toDelete.length) {
          for (const zoneId of toDelete) {
            await supabase
              .from('client_zones')
              .delete()
              .eq('client_user_id', clientId)
              .eq('zone_id', zoneId);
          }
        }
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

  const handleSavePosition = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l\'accès à la localisation.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      await supabase
        .from('clients')
        .update({
          last_latitude: loc.coords.latitude,
          last_longitude: loc.coords.longitude,
          last_position_at: new Date().toISOString(),
        })
        .eq('user_id', userProfile?.id);
      Alert.alert('Succès', 'Position enregistrée.');
    } catch (e) {
      console.error('Failed to save position', e);
      Alert.alert('Erreur', 'Impossible d\'enregistrer la position');
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
        {/* Header - style clair */}
        <View className="bg-white px-6 py-6 border-b border-gray-100">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-2xl font-bold text-gray-900">Mon Profil</Text>
              <Text className="text-gray-500 mt-1">Espace client</Text>
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
                  <View className="bg-green-100 px-2 py-1 rounded-full ml-2">
                    <Text className="text-green-800 font-medium text-xs capitalize">
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

          {/* Zones d'intervention */}
          <View className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <Text className="text-lg font-semibold text-gray-900 mb-4">Zones d'intervention</Text>
            <View className="flex-row flex-wrap">
              {zones.map((z: any) => {
                const selected = selectedZoneIds.includes(z.id);
                return (
                  <TouchableOpacity
                    key={z.id}
                    className={`mr-2 mb-2 px-3 py-2 rounded-full border ${selected ? 'bg-primary-900 border-primary-900' : 'bg-gray-50 border-gray-300'}`}
                    onPress={() => {
                      setSelectedZoneIds((prev) =>
                        prev.includes(z.id) ? prev.filter((id) => id !== z.id) : [...prev, z.id]
                      );
                    }}
                  >
                    <Text className={`text-sm ${selected ? 'text-white' : 'text-gray-700'}`}>{z.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            {editing && (
              <Text className="text-gray-500 text-xs mt-2">Touchez pour sélectionner/désélectionner vos zones.</Text>
            )}
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
              className={`rounded-xl p-4 items-center ${offlineReadOnly ? 'bg-gray-300' : 'bg-primary-900'} ${saving ? 'opacity-50' : ''}`}
              onPress={handleSave}
              disabled={saving || offlineReadOnly}
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
              <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg" onPress={handleSavePosition}>
                <Ionicons name="location" size={24} color="#6b7280" />
                <Text className="text-gray-700 ml-3 font-medium">
                  Partager ma position (assignation)
                </Text>
              </TouchableOpacity>
              
              {/* <TouchableOpacity className="flex-row items-center p-3 bg-gray-50 rounded-lg">
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
                  SES
                </Text>
                <Text className="text-blue-800 text-sm leading-5">
                  Version 1.0.0{'\n'}
                  Développé par Rekap{'\n'}
                  Contact: djakpakoffi7029@gmail.com{'\n'}
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