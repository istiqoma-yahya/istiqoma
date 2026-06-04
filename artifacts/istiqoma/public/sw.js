const CACHE_NAME = 'istiqoma-v2';
const AUDIO_CACHE_NAME = 'istiqoma-audio-v1';
// Keep at most this many recently-played surah MP3s on disk per device.
// Surah audio is 5–30 MB so 6 entries is roughly 60–180 MB worst case.
const AUDIO_CACHE_MAX_ENTRIES = 6;
const STATIC_ASSETS = [
  '/',
  '/icon-192.png',
  '/icon-512.png',
  '/favicon.png',
  '/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) {
            return name !== CACHE_NAME && name !== AUDIO_CACHE_NAME;
          })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return clients.claim();
    })
  );
});

function isAudioRequest(url) {
  if (url.pathname.endsWith('.mp3')) return true;
  if (url.pathname.endsWith('.opus')) return true;
  if (url.pathname.endsWith('.ogg')) return true;
  return false;
}

// Trim oldest entries from the audio cache so it never grows unbounded.
// Cache Storage doesn't expose mtimes, so we treat insertion order
// (cache.keys() preserves it) as the recency order.
async function trimAudioCache() {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const keys = await cache.keys();
  const overflow = keys.length - AUDIO_CACHE_MAX_ENTRIES;
  for (let i = 0; i < overflow; i++) {
    await cache.delete(keys[i]);
  }
}

async function handleAudio(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME);
  const cached = await cache.match(request, { ignoreVary: true });
  if (cached) {
    // Bump recency: re-insert so it counts as most recently used.
    cache.put(request, cached.clone()).then(trimAudioCache).catch(function() {});
    return cached;
  }
  // Force a non-Range full GET so we can cache the entire file. Audio
  // elements often issue Range requests which Cache Storage cannot
  // satisfy, so we bypass them here for the network fetch.
  const fullReq = new Request(request.url, {
    method: 'GET',
    credentials: 'omit',
    mode: 'cors',
  });
  const response = await fetch(fullReq);
  if (response.ok && response.status === 200) {
    cache.put(request, response.clone()).then(trimAudioCache).catch(function() {});
  }
  return response;
}

self.addEventListener('fetch', function(event) {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.pathname.startsWith('/api/')) return;

  if (isAudioRequest(url)) {
    event.respondWith(
      handleAudio(event.request).catch(function() {
        return caches.open(AUDIO_CACHE_NAME).then(function(cache) {
          return cache.match(event.request, { ignoreVary: true });
        }).then(function(cached) {
          if (cached) return cached;
          return new Response('', { status: 504, statusText: 'Offline' });
        });
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(function(response) {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(function() {
        return caches.match(event.request).then(function(cachedResponse) {
          return cachedResponse || caches.match('/');
        });
      })
  );
});

self.addEventListener('push', function(event) {
  let data = {};

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Istiqoma', body: event.data.text() };
    }
  }

  const soundId = data.sound || 'chime';
  const title = data.title || 'Istiqoma';
  const options = {
    body: data.body || 'You have a notification',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      url: data.url || '/'
    },
    tag: data.tag || 'istiqoma-notification',
    requireInteraction: data.requireInteraction || (data.emotion === 'sad') || false,
    silent: false
  };
  if (data.image) {
    options.image = data.image;
  }

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, options),
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(openClients) {
        openClients.forEach(function(client) {
          client.postMessage({ type: 'PLAY_NOTIFICATION_SOUND', sound: soundId });
        });
      })
    ])
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(windowClients) {
        for (let client of windowClients) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
