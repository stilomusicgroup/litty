/**
 * Service Worker registration for Lit Studio PWA.
 *
 * Strategy: When a new SW is detected (new build deployed), we tell it to
 * skipWaiting() immediately and reload the page once the new SW takes control.
 * This guarantees returning users (in-browser OR installed PWA) see fresh code
 * instead of being stuck on a cached old shell.
 */
export function registerServiceWorker() {
  if (typeof window === 'undefined') return;
  if (!('serviceWorker' in navigator)) return;

  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });

  // Register after page load to not block first paint
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      });

      // Poll for updates periodically so a long-lived tab still picks up new builds.
      const checkForUpdates = () => registration.update().catch(() => {});
      setInterval(checkForUpdates, 60 * 60 * 1000); // hourly
      window.addEventListener('focus', checkForUpdates);

      const activateWaiting = (worker: ServiceWorker | null) => {
        if (!worker) return;
        if (worker.state === 'installed' && navigator.serviceWorker.controller) {
          // New content is available — activate immediately.
          worker.postMessage({ type: 'SKIP_WAITING' });
        }
      };

      // If there's already a waiting worker when we register, activate it now.
      activateWaiting(registration.waiting);

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          activateWaiting(newWorker);
        });
      });

      console.log('[SW] Registered:', registration.scope);
    } catch (err) {
      console.warn('[SW] Registration failed:', err);
    }
  });
}

/**
 * Returns true if the app is running as a standalone PWA (installed to home screen).
 */
export function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true
  );
}
