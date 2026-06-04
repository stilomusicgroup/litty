import { useState, useCallback } from 'react';

export type PushPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

interface UsePushNotificationsReturn {
  permissionStatus: PushPermissionStatus;
  isIOS: boolean;
  isSupported: boolean;
  requestPermission: () => Promise<PushPermissionStatus>;
  showLocalNotification: (title: string, body: string, icon?: string) => void;
}

function detectPermissionStatus(): PushPermissionStatus {
  if (typeof window === 'undefined') return 'unsupported';
  if (!('Notification' in window)) return 'unsupported';
  return Notification.permission as PushPermissionStatus;
}

function detectIsIOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * usePushNotifications
 *
 * Placeholder hook for browser push notifications.
 * Does NOT request permission on mount — call requestPermission() explicitly
 * (e.g., from profile settings or after a purchase event).
 *
 * iOS Safari does not support Web Push (pre-iOS 16.4 PWA) — degrades gracefully.
 */
export function usePushNotifications(): UsePushNotificationsReturn {
  const isIOS = detectIsIOS();
  const isSupported = typeof window !== 'undefined' && 'Notification' in window && !isIOS;

  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>(
    () => (isSupported ? detectPermissionStatus() : 'unsupported')
  );

  const requestPermission = useCallback(async (): Promise<PushPermissionStatus> => {
    if (!isSupported) {
      // iOS Safari — Web Push not supported (before iOS 16.4 installed PWA)
      console.info(
        '[PushNotifications] iOS Safari does not support Web Push. ' +
          'Prompt user to install the PWA first (iOS 16.4+).'
      );
      return 'unsupported';
    }

    if (permissionStatus === 'denied') {
      console.warn('[PushNotifications] Permission already denied. User must reset in browser settings.');
      return 'denied';
    }

    if (permissionStatus === 'granted') {
      return 'granted';
    }

    try {
      const result = await Notification.requestPermission();
      const status = result as PushPermissionStatus;
      setPermissionStatus(status);

      if (status === 'granted') {
        console.info('[PushNotifications] Permission granted.');
        // TODO: Subscribe to push server here when backend integration is added.
        // Example:
        // const sw = await navigator.serviceWorker.ready;
        // const subscription = await sw.pushManager.subscribe({
        //   userVisibleOnly: true,
        //   applicationServerKey: VAPID_PUBLIC_KEY,
        // });
        // await api.post('/api/push/subscribe', subscription.toJSON());
      }

      return status;
    } catch (err) {
      console.error('[PushNotifications] Error requesting permission:', err);
      return 'denied';
    }
  }, [isSupported, permissionStatus]);

  /**
   * Show a local (non-push) notification — useful for in-app events
   * like "your song just sold" while the app is open.
   */
  const showLocalNotification = useCallback(
    (title: string, body: string, icon = '/icons/icon-192.svg') => {
      if (permissionStatus !== 'granted') return;
      try {
        new Notification(title, { body, icon });
      } catch (err) {
        console.warn('[PushNotifications] Could not show notification:', err);
      }
    },
    [permissionStatus]
  );

  return {
    permissionStatus,
    isIOS,
    isSupported,
    requestPermission,
    showLocalNotification,
  };
}
