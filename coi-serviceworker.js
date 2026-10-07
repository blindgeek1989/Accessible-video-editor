// Cross-Origin Isolation Service Worker
// Adds COOP + COEP headers so SharedArrayBuffer (required by FFmpeg WASM)
// works on GitHub Pages and other static hosts.
// Based on https://github.com/gzuidhof/coi-serviceworker (MIT License)

self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', function (event) {
  if (event.request.method !== 'GET') return;

  // Browsers send this for preload requests in no-cors mode — skip them
  if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;

  event.respondWith(
    fetch(event.request.clone()).then(function (response) {
      // Only modify same-origin responses
      if (!response.url.startsWith(self.location.origin)) return response;

      const headers = new Headers(response.headers);
      headers.set('Cross-Origin-Opener-Policy', 'same-origin');
      // credentialless: cross-origin resources load without needing CORP headers,
      // as long as they don't send credentials (CDNs like jsdelivr don't).
      headers.set('Cross-Origin-Embedder-Policy', 'credentialless');
      headers.set('Cross-Origin-Resource-Policy', 'same-origin');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });
    }).catch(function () {
      return fetch(event.request);
    })
  );
});
