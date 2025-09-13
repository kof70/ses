import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Configuration Supabase - Remplacez par vos vraies valeurs
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key-here';

// Vérification des variables d'environnement
console.log('🔧 Supabase URL:', supabaseUrl);
console.log('🔧 Supabase Key:', supabaseAnonKey.substring(0, 20) + '...');

if (!supabaseUrl.includes('supabase.co') || !supabaseAnonKey.startsWith('eyJ')) {
  console.error('❌ ERREUR: Configuration Supabase invalide');
  console.error('Veuillez créer un fichier .env avec vos vraies clés Supabase');
  console.error('EXPO_PUBLIC_SUPABASE_URL=https://votre-projet.supabase.co');
  console.error('EXPO_PUBLIC_SUPABASE_ANON_KEY=votre-cle-anon');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          nom: string;
          role: 'agent' | 'client' | 'admin';
          statut: 'actif' | 'inactif';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          nom: string;
          role: 'agent' | 'client' | 'admin';
          statut?: 'actif' | 'inactif';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          nom?: string;
          role?: 'agent' | 'client' | 'admin';
          statut?: 'actif' | 'inactif';
          updated_at?: string;
        };
      };
      agents: {
        Row: {
          id: string;
          user_id: string;
          heure_arrivee: string | null;
          heure_depart: string | null;
          disponibilite: 'disponible' | 'en_mission' | 'indisponible';
          zone_assignee: string | null;
          qr_code: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          heure_arrivee?: string | null;
          heure_depart?: string | null;
          disponibilite?: 'disponible' | 'en_mission' | 'indisponible';
          zone_assignee?: string | null;
          qr_code?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          heure_arrivee?: string | null;
          heure_depart?: string | null;
          disponibilite?: 'disponible' | 'en_mission' | 'indisponible';
          zone_assignee?: string | null;
          qr_code?: string;
          updated_at?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          user_id: string;
          historique_scans: any[];
          created_at: string;
          updated_at: string;
          last_latitude?: number | null;
          last_longitude?: number | null;
          last_position_at?: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          historique_scans?: any[];
          created_at?: string;
          updated_at?: string;
          last_latitude?: number | null;
          last_longitude?: number | null;
          last_position_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          historique_scans?: any[];
          updated_at?: string;
          last_latitude?: number | null;
          last_longitude?: number | null;
          last_position_at?: string | null;
        };
      };
      sos_alerts: {
        Row: {
          id: string;
          agent_id: string | null;
          client_id: string | null;
          type: 'agent_sos' | 'client_sos';
          message: string | null;
          statut: 'en_cours' | 'resolu' | 'annule';
          latitude: number | null;
          longitude: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          agent_id?: string | null;
          client_id?: string | null;
          type: 'agent_sos' | 'client_sos';
          message?: string | null;
          statut?: 'en_cours' | 'resolu' | 'annule';
          latitude?: number | null;
          longitude?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          agent_id?: string | null;
          client_id?: string | null;
          type?: 'agent_sos' | 'client_sos';
          message?: string | null;
          statut?: 'en_cours' | 'resolu' | 'annule';
          latitude?: number | null;
          longitude?: number | null;
          updated_at?: string;
        };
      };
      annonces: {
        Row: {
          id: string;
          titre: string;
          contenu: string;
          destinataires: 'tous' | 'agents' | 'clients';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          titre: string;
          contenu: string;
          destinataires?: 'tous' | 'agents' | 'clients';
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          titre?: string;
          contenu?: string;
          destinataires?: 'tous' | 'agents' | 'clients';
          created_by?: string;
          updated_at?: string;
        };
      };
      zones: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
        };
      };
      client_zones: {
        Row: {
          id: string;
          client_user_id: string;
          zone_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_user_id: string;
          zone_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_user_id?: string;
          zone_id?: string;
        };
      };
      agent_zones: {
        Row: {
          id: string;
          agent_user_id: string;
          zone_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_user_id: string;
          zone_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_user_id?: string;
          zone_id?: string;
        };
      };
      agent_client_assignments: {
        Row: {
          id: string;
          agent_user_id: string;
          client_user_id: string;
          latitude: number | null;
          longitude: number | null;
          note: string | null;
          statut: 'assigne' | 'en_cours' | 'termine' | 'annule';
          created_at: string;
        };
        Insert: {
          id?: string;
          agent_user_id: string;
          client_user_id: string;
          latitude?: number | null;
          longitude?: number | null;
          note?: string | null;
          statut?: 'assigne' | 'en_cours' | 'termine' | 'annule';
          created_at?: string;
        };
        Update: {
          id?: string;
          agent_user_id?: string;
          client_user_id?: string;
          latitude?: number | null;
          longitude?: number | null;
          note?: string | null;
          statut?: 'assigne' | 'en_cours' | 'termine' | 'annule';
        };
      };
    };
  };
};