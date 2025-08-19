import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// IMPORTANT: Remplacez ces valeurs par vos vraies clés Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

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
        };
        Insert: {
          id?: string;
          user_id: string;
          historique_scans?: any[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          historique_scans?: any[];
          updated_at?: string;
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
    };
  };
};