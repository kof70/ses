import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function ClientScannerScreen() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? null;
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);

  useEffect(() => {
    if (permission == null) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    setScanned(true);
    
    try {
      // Find agent by QR code
      const { data: agentData, error } = await supabase
        .from('agents')
        .select(`
          *,
          users:user_id (nom, email)
        `)
        .eq('qr_code', data)
        .single();

      if (error || !agentData) {
        Alert.alert('Erreur', 'Code QR invalide ou agent non trouvé');
        return;
      }

      // Update client's scan history
      const scanRecord = {
        agent_id: agentData.id,
        agent_name: agentData.users?.nom,
        agent_status: agentData.disponibilite,
        scan_date: new Date().toISOString(),
        qr_code: data,
      };

      // Get current client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('historique_scans')
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (clientError) {
        console.error('Error fetching client data:', clientError);
        return;
      }

      const updatedHistory = [...(clientData.historique_scans || []), scanRecord];

      // Update client history
      const { error: updateError } = await supabase
        .from('clients')
        .update({ historique_scans: updatedHistory })
        .eq('user_id', userProfile?.id);

      if (updateError) {
        console.error('Error updating scan history:', updateError);
      }

      // Show agent status
      const statusText = getStatusText(agentData.disponibilite);
      const statusColor = getStatusColor(agentData.disponibilite);
      
      Alert.alert(
        'Agent scanné',
        `Agent: ${agentData.users?.nom}\nStatut: ${statusText}\nZone: ${agentData.zone_assignee || 'Non assignée'}`,
        [
          {
            text: 'OK',
            onPress: () => setScanned(false),
          },
        ]
      );
    } catch (error) {
      console.error('Error processing scan:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement du scan');
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponible':
        return '#10b981';
      case 'en_mission':
        return '#f59e0b';
      case 'indisponible':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  if (hasPermission === null) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center">
          <Text className="text-gray-600">Demande d'autorisation caméra...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <View className="flex-1 justify-center items-center px-6">
          <Ionicons name="camera-off" size={64} color="#9ca3af" />
          <Text className="text-xl font-semibold text-gray-900 mt-4 text-center">
            Accès caméra requis
          </Text>
          <Text className="text-gray-600 text-center mt-2">
            L'accès à la caméra est nécessaire pour scanner les codes QR des agents.
          </Text>
          <TouchableOpacity
            className="bg-primary-900 px-6 py-3 rounded-lg mt-6"
            onPress={() => requestPermission()}
          >
            <Text className="text-white font-semibold">Autoriser l'accès</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-black">
      {/* Header */}
      <View className="bg-primary-900 px-6 py-4">
        <Text className="text-white text-xl font-bold">Scanner QR Code</Text>
        <Text className="text-primary-100 mt-1">
          Pointez vers le code QR d'un agent
        </Text>
      </View>

      {/* Scanner */}
      <View className="flex-1 relative">
        <CameraView
          key={cameraKey}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          style={StyleSheet.absoluteFillObject}
        />
        
        {/* Overlay */}
        <View className="flex-1 justify-center items-center">
          <View className="w-64 h-64 border-2 border-white rounded-2xl relative">
            {/* Corner indicators */}
            <View className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary-500 rounded-tl-2xl" />
            <View className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary-500 rounded-tr-2xl" />
            <View className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary-500 rounded-bl-2xl" />
            <View className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary-500 rounded-br-2xl" />
          </View>
        </View>

        {/* Instructions */}
        <View className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 p-6">
          <Text className="text-white text-center text-lg font-medium mb-2">
            Alignez le code QR dans le cadre
          </Text>
          <Text className="text-gray-300 text-center">
            Le scan se fera automatiquement
          </Text>
        </View>
      </View>

      {/* Reset button when scanned */}
      {scanned && (
        <View className="absolute bottom-20 left-0 right-0 items-center">
          <TouchableOpacity
            className="bg-primary-900 px-6 py-3 rounded-full"
            onPress={() => {
              setScanned(false);
              setCameraKey(prev => prev + 1); // Redémarre la caméra
            }}
          >
            <Text className="text-white font-semibold">Scanner à nouveau</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}