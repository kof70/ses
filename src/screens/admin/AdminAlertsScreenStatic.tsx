import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useSupabase } from '../../contexts/SupabaseContext';
import AdminAlertsScreenWithData from './AdminAlertsScreenWithData';

export default function AdminAlertsScreenStatic() {
  const { userProfile } = useAuth();
  const supabase = useSupabase();
  
  const [allAlerts, setAllAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sos_alerts')
        .select(`
          *,
          agents:agent_id (
            users:users!agents_user_id_fkey (nom)
          ),
          clients:client_id (
            users:users!clients_user_id_fkey (nom)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading alerts:', error);
        return;
      }

      setAllAlerts(data || []);
    } catch (error) {
      console.error('Error loading alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  // Load all alerts once at startup
  useEffect(() => {
    refreshAlerts();
  }, [supabase]);

  return (
    <AdminAlertsScreenWithData
      allAlerts={allAlerts}
      loading={loading}
      onAlertUpdate={refreshAlerts}
    />
  );
}