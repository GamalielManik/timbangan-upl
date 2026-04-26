import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

export const usePushNotifications = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      if (sub) {
        setSubscription(sub);
        setIsSubscribed(true);
      }
    } catch (err) {
      console.error('Error checking push subscription:', err);
    }
  };

  const urlBase64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  };

  const subscribeToPush = async (vapidPublicKey: string) => {
    if (!isSupported) {
      setError('Push notifications are not supported in this browser.');
      return false;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        throw new Error('Permission not granted for Notification');
      }

      // 2. Get Service Worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // 4. Save to Supabase
      const { error: dbError } = await supabase
        .from('push_subscriptions')
        .upsert(
          {
            endpoint: sub.endpoint,
            subscription_json: sub.toJSON(),
          },
          { onConflict: 'endpoint' }
        );

      if (dbError) throw dbError;

      setSubscription(sub);
      setIsSubscribed(true);
      return true;
    } catch (err: any) {
      console.error('Error subscribing to push:', err);
      setError(err.message || 'Failed to subscribe to push notifications');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    subscription,
    loading,
    error,
    subscribeToPush,
  };
};
