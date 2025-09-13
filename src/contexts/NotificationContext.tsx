import React, { createContext, useContext, useEffect, useState } from 'react';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { useSupabase } from './SupabaseContext';
import { useAuth } from './AuthContext';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    // SDK 53 types require these fields
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

interface NotificationContextType {
  expoPushToken: string | null;
  notification: Notifications.Notification | null;
  sendNotification: (title: string, body: string, data?: any) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const supabase = useSupabase();
  const { user, userProfile } = useAuth();

  useEffect(() => {
    const isExpoGo = (Constants as any)?.appOwnership === 'expo';

    if (!isExpoGo) {
      registerForPushNotificationsAsync().then(token => {
        setExpoPushToken(token);

        // Store token in user profile if available
        if (token && user) {
          supabase
            .from('users')
            .update({ push_token: token })
            .eq('id', user.id)
            .then(({ error }) => {
              if (error) {
                console.error('Error updating push token:', error);
              }
            });
        }
      });
    } else {
      // Skip remote push registration in Expo Go (SDK 53 removes Android remote notifications)
      console.log('expo-notifications: push registration skipped in Expo Go');
    }

    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
    });

    return () => {
      try { (notificationListener as any)?.remove?.(); } catch {}
      try { (responseListener as any)?.remove?.(); } catch {}
    };
  }, [user]);

  // Listen for real-time notifications based on user role
  useEffect(() => {
    if (!userProfile) return;

    let channel: any;

    if (userProfile.role === 'admin') {
      // Admin listens to all SOS alerts
      channel = supabase
        .channel('admin_notifications')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'sos_alerts' },
          (payload) => {
            sendLocalNotification(
              'Alerte SOS',
              'Une nouvelle alerte SOS a été déclenchée',
              payload.new
            );
          }
        )
        .subscribe();
    } else if (userProfile.role === 'agent') {
      // Agent listens to announcements and assigned SOS
      channel = supabase
        .channel('agent_notifications')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'annonces' },
          (payload) => {
            const annonce = payload.new as any;
            if (annonce.destinataires === 'tous' || annonce.destinataires === 'agents') {
              sendLocalNotification(
                'Nouvelle annonce',
                annonce.titre,
                annonce
              );
            }
          }
        )
        .subscribe();
    } else if (userProfile.role === 'client') {
      // Client listens to announcements
      channel = supabase
        .channel('client_notifications')
        .on('postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'annonces' },
          (payload) => {
            const annonce = payload.new as any;
            if (annonce.destinataires === 'tous' || annonce.destinataires === 'clients') {
              sendLocalNotification(
                'Nouvelle annonce',
                annonce.titre,
                annonce
              );
            }
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [userProfile]);

  const sendLocalNotification = async (title: string, body: string, data?: any) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
      },
      trigger: null,
    });
  };

  const sendNotification = async (title: string, body: string, data?: any) => {
    await sendLocalNotification(title, body, data);
  };

  const value = {
    expoPushToken,
    notification,
    sendNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      alert('Failed to get push token for push notification!');
      return;
    }
    const projectId =
      // SDK 52+: prefer eas.projectId
      (Constants as any)?.expoConfig?.extra?.eas?.projectId ||
      // Back-compat field
      (Constants as any)?.easConfig?.projectId;

    token = (
      await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined as any
      )
    ).data;
  } else {
    alert('Must use physical device for Push Notifications');
  }

  return token;
}