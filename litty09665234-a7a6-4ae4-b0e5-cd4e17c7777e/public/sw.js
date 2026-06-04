// Lit Studio Service Worker v3 — network-first for navigations & HTML, cache-first for hashed assets/audio.
// Cache name is bumped on every deploy so stale shells never stick around.

const BUILD_ID = `build-${Date.now()}`;
const CACHE_NAME = `lit-studio-${BUILD_ID}`;
const AUDIO_CACHE_NAME = 'lit-studio-audio-v1';
const AUDIO_CACHE_MAX = 20;

// Static assets to precache — intentionally excludes '/' so the HTML shell is always network-first.
const PRECACHE_URLS = [
  '/offline.html',
  '/manifest.json',
  '/favicon.png',
  '/icons/apple-touch-icon-180.svg',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_URLS).catch((err) => {
        // Don't fail install if some precache URLs 404
        console.warn('[SW] Precache partial failure:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// ─── Message (allow client to trigger skipWaiting) ──────────────────────────
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Activate ────────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== AUDIO_CACHE_NAME)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. NEVER intercept API routes — always go to network
  if (url.pathname.startsWith('/api/')) {
    return; // let browser handle normally
  }

  // 2. NEVER intercept non-GET requests
  if (request.method !== 'GET') return;

  // 3. NEVER intercept cross-origin requests (except audio/images from known CDNs)
  const isSameOrigin = url.origin === self.location.origin;
  const isAudioFile = /\.(mp3|mp4|ogg|wav|flac|aac|m4a|webm)(\?.*)?$/i.test(url.pathname);
  const isImageFile = /\.(png|jpg|jpeg|webp|gif|svg|ico)(\?.*)?$/i.test(url.pathname);
  const isS3Audio = url.hostname.includes('amazonaws.com') && isAudioFile;

  // 4. Audio files — cache-first with LRU limit of 20
  if (isAudioFile && (isSameOrigin || isS3Audio)) {
    event.respondWith(audioStrategy(request));
    return;
  }

  // 5. Static assets (JS, CSS, fonts, images) — cache-first
  if (isSameOrigin && isStaticAsset(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // 6. Navigation requests (HTML pages) — stale-while-revalidate with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigateStrategy(request));
    return;
  }

  // 7. Same-origin image requests — stale-while-revalidate
  if (isSameOrigin && isImageFile) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  // 8. Everything else — network only (don't interfere)
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isStaticAsset(pathname) {
  return (
    /\.(js|css|woff2?|ttf|otf|eot)(\?.*)?$/.test(pathname) ||
    pathname.startsWith('/assets/')
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return offlineFallback(request);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached || offlineFallback(request));

  return cached || fetchPromise;
}

async function navigateStrategy(request) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Offline — try cache first, then app shell (/), then offline.html
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const shell = await cache.match('/');
    if (shell) return shell;
    const offline = await cache.match('/offline.html');
    if (offline) return offline;
    return new Response('<h1>Offline</h1>', {
      headers: { 'Content-Type': 'text/html' },
    });
  }
}

async function audioStrategy(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Enforce LRU limit
      const keys = await cache.keys();
      if (keys.length >= AUDIO_CACHE_MAX) {
        await cache.delete(keys[0]);
      }
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Audio unavailable offline', { status: 503 });
  }
}

async function offlineFallback(request) {
  if (request.mode === 'navigate') {
    const cache = await caches.open(CACHE_NAME);
    return (
      (await cache.match('/offline.html')) ||
      new Response('<h1>Offline</h1>', { headers: { 'Content-Type': 'text/html' } })
    );
  }
  return new Response('', { status: 408 });
}
