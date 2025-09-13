import React, { useState, useEffect, useRef } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function ClientScannerScreen() {
  const { userProfile, offlineReadOnly, assertOnlineOrThrow } = useAuth();
  const supabase = useSupabase();
  const [permission, requestPermission] = useCameraPermissions();
  const hasPermission = permission?.granted ?? null;
  const [scanned, setScanned] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [cameraKey, setCameraKey] = useState(0);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (permission == null) {
      requestPermission();
    }
  }, [permission]);

  // Réinitialiser la caméra quand on revient sur l'écran
  useFocusEffect(
    React.useCallback(() => {
      // Reset des états quand on revient sur l'écran
      setScanned(false);
      setScanning(false);
      
      // Délai pour s'assurer que la navigation est terminée avant de réinitialiser la caméra
      const timer = setTimeout(() => {
        setCameraKey(prev => prev + 1);
        console.log('Scanner screen focused - camera reset');
      }, 100);
      
      return () => clearTimeout(timer);
    }, [])
  );

  const handleBarCodeScanned = async ({ data }: BarcodeScanningResult) => {
    // Empêcher les scans multiples pendant le traitement
    if (scanned) return;
    
    setScanned(true);
    setScanning(true);
    
    try {
      if (offlineReadOnly) {
        Alert.alert('Hors ligne', 'Le scan enregistre l\'historique. Revenir en ligne pour continuer.');
        setScanned(false);
        setScanning(false);
        return;
      }
      assertOnlineOrThrow();
      // Find agent by QR code
      const { data: agentData, error } = await supabase
        .from('agents')
        .select(`
          *,
          users:users!agents_user_id_fkey (nom, email)
        `)
        .eq('qr_code', data)
        .single();

      if (error || !agentData) {
        Alert.alert('Erreur', 'Code QR invalide ou agent non trouvé');
        setScanned(false);
        setScanning(false);
        return;
      }

      // Déterminer si l'agent est en début ou fin de service
      const now = new Date();
      const hasCheckIn = agentData.heure_arrivee && !agentData.heure_depart;
      const isEndOfDay = agentData.heure_arrivee && 
        new Date(agentData.heure_arrivee).toDateString() !== now.toDateString();

      let serviceAction = '';
      let updatedAgentData = { ...agentData };

      if (!hasCheckIn) {
        // Agent n'a pas encore check-in aujourd'hui -> Check-in
        serviceAction = 'check-in';
        const { error: checkInError } = await supabase
          .from('agents')
          .update({
            heure_arrivee: now.toISOString(),
            disponibilite: 'disponible',
            updated_at: now.toISOString(),
          })
          .eq('user_id', agentData.user_id);

        if (checkInError) {
          console.error('Error checking in agent:', checkInError);
        } else {
          updatedAgentData.heure_arrivee = now.toISOString();
          updatedAgentData.disponibilite = 'disponible';
        }
      } else if (hasCheckIn && !agentData.heure_depart) {
        // Agent a check-in mais pas check-out -> Check-out
        serviceAction = 'check-out';
        const { error: checkOutError } = await supabase
          .from('agents')
          .update({
            heure_depart: now.toISOString(),
            disponibilite: 'indisponible',
            updated_at: now.toISOString(),
          })
          .eq('user_id', agentData.user_id);

        if (checkOutError) {
          console.error('Error checking out agent:', checkOutError);
        } else {
          updatedAgentData.heure_depart = now.toISOString();
          updatedAgentData.disponibilite = 'indisponible';
        }
      }

      // Update client's scan history
      const scanRecord = {
        agent_id: agentData.id,
        agent_name: agentData.users?.nom,
        agent_status: updatedAgentData.disponibilite,
        scan_date: new Date().toISOString(),
        qr_code: data,
        service_action: serviceAction,
        check_in_time: updatedAgentData.heure_arrivee,
        check_out_time: updatedAgentData.heure_depart,
      };

      // Get current client data
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('historique_scans')
        .eq('user_id', userProfile?.id)
        .maybeSingle();

      if (clientError) {
        console.error('Error fetching client data:', clientError);
        setScanned(false);
        setScanning(false);
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
        setScanned(false);
        setScanning(false);
        return;
      }

      // Show agent status with service action
      const statusText = getStatusText(updatedAgentData.disponibilite);
      const statusColor = getStatusColor(updatedAgentData.disponibilite);
      
      let message = `Agent: ${agentData.users?.nom}\nStatut: ${statusText}\nZone: ${agentData.zone_assignee || 'Non assignée'}`;
      if (serviceAction === 'check-in') {
        message += '\n\n✅ Agent enregistré en début de service';
      } else if (serviceAction === 'check-out') {
        message += '\n\n✅ Agent enregistré en fin de service';
      }
      
      Alert.alert(
        'Agent scanné',
        message,
        [
          {
            text: 'Scanner à nouveau',
            onPress: () => {
              setScanned(false);
              setScanning(false);
            },
          },
        ]
      );
    } catch (error) {
      console.error('Error processing scan:', error);
      Alert.alert('Erreur', 'Erreur lors du traitement du scan');
      setScanned(false);
      setScanning(false);
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
          <Ionicons name="camera" size={64} color="#9ca3af" />
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
      {/* Header - style sombre discret pour le scanner */}
      <View className="bg-black px-6 py-4 border-b border-gray-800">
        <Text className="text-white text-xl font-bold">Scanner QR Code</Text>
        <Text className="text-gray-400 mt-1">
          Pointez vers le code QR d'un agent
        </Text>
      </View>

      {/* Scanner */}
      <View className="flex-1 relative">
        <CameraView
          key={cameraKey}
          ref={cameraRef}
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
          {scanning ? (
            <View className="items-center">
              <Text className="text-white text-center text-lg font-medium mb-2">
                Traitement du scan...
              </Text>
              <View className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </View>
          ) : scanned ? (
            <View className="items-center">
              <Text className="text-green-400 text-center text-lg font-medium mb-2">
                ✓ Scan terminé
              </Text>
              <Text className="text-gray-300 text-center">
                Pointez vers un autre code QR pour scanner
              </Text>
            </View>
          ) : (
            <>
              <Text className="text-white text-center text-lg font-medium mb-2">
                Alignez le code QR dans le cadre
              </Text>
              <Text className="text-gray-300 text-center">
                Le scan se fera automatiquement
              </Text>
            </>
          )}
        </View>
      </View>

    </SafeAreaView>
  );
}