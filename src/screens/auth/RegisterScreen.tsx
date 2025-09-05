import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';

export default function RegisterScreen({ navigation }: any) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nom, setNom] = useState('');
  const [role, setRole] = useState<'agent' | 'client'>('client');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signUp } = useAuth();
  const supabase = useSupabase();

  const handleRegister = async () => {
    if (!email || !password || !nom) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Erreur', 'Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);

    // Vérifier si l'email existe déjà
    try {
      const { data: existingUser } = await supabase
        .from('users')
        .select('email')
        .eq('email', email)
        .maybeSingle();

      if (existingUser) {
        setLoading(false);
        Alert.alert('Erreur', 'Cet email est déjà utilisé');
        return;
      }
    } catch (error) {
      console.error('Error checking existing email:', error);
    }

    const { error } = await signUp(email, password, nom, role);
    setLoading(false);

    if (error) {
      Alert.alert('Erreur d\'inscription', error.message);
    } else {
      Alert.alert(
        'Inscription réussie',
        'Votre compte a été créé avec succès. Vous pouvez maintenant vous connecter.',
        [{ text: 'OK', onPress: () => navigation.navigate('Login') }]
      );
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
          <View className="flex-1 justify-center px-6 py-8">
            {/* Header */}
            <View className="items-center mb-8">
              <TouchableOpacity
                className="absolute left-0 top-0"
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#1e3a8a" />
              </TouchableOpacity>
              <Text className="text-2xl font-bold text-primary-900">Créer un compte</Text>
              <Text className="text-gray-600 mt-2">Rejoignez SecureGuard Pro</Text>
            </View>

            {/* Form */}
            <View className="space-y-4">
              <View>
                <Text className="text-gray-700 mb-2 font-medium">Nom complet</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="Votre nom complet"
                  value={nom}
                  onChangeText={setNom}
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Email</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="votre@email.com"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Type de compte</Text>
                <View className="flex-row space-x-4">
                  <TouchableOpacity
                    className={`flex-1 py-3 px-4 rounded-lg border ${
                      role === 'client'
                        ? 'bg-primary-900 border-primary-900'
                        : 'bg-white border-gray-300'
                    }`}
                    onPress={() => setRole('client')}
                  >
                    <Text
                      className={`text-center font-medium ${
                        role === 'client' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      Client
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    className={`flex-1 py-3 px-4 rounded-lg border ${
                      role === 'agent'
                        ? 'bg-primary-900 border-primary-900'
                        : 'bg-white border-gray-300'
                    }`}
                    onPress={() => setRole('agent')}
                  >
                    <Text
                      className={`text-center font-medium ${
                        role === 'agent' ? 'text-white' : 'text-gray-700'
                      }`}
                    >
                      Agent
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Mot de passe</Text>
                <View className="relative">
                  <TextInput
                    className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 pr-12 text-base"
                    placeholder="••••••••"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                  />
                  <TouchableOpacity
                    className="absolute right-3 top-3"
                    onPress={() => setShowPassword(!showPassword)}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-off' : 'eye'}
                      size={24}
                      color="#6b7280"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View>
                <Text className="text-gray-700 mb-2 font-medium">Confirmer le mot de passe</Text>
                <TextInput
                  className="bg-gray-50 border border-gray-300 rounded-lg px-4 py-3 text-base"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry={true}
                />
              </View>

              <TouchableOpacity
                className={`bg-primary-900 rounded-lg py-4 items-center mt-6 ${
                  loading ? 'opacity-50' : ''
                }`}
                onPress={handleRegister}
                disabled={loading}
              >
                <Text className="text-white font-semibold text-lg">
                  {loading ? 'Création...' : 'Créer le compte'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center mt-6">
              <Text className="text-gray-600">Déjà un compte ? </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text className="text-primary-900 font-semibold">Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}