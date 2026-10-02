/**
 * PDzOS Store — Service Worker (Offline Shell & Asset Cache)
 * Does NOT cache APK files.
 */

const CACHE_NAME = "pdzos-store-v1.0.0";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./apps.html",
  "./app.html",
  "./about.html",
  "./privacy.html",
  "./terms.html",
  "./404.html",
  "./manifest.json",
  "./css/style.css",
  "./css/responsive.css",
  "./css/animations.css",
  "./js/config.js",
  "./js/theme.js",
  "./js/data-service.js",
  "./js/app.js",
  "./js/search.js",
  "./assets/logo/logo.svg",
  "./assets/favicon/favicon.svg",
  "./assets/icons/zyra.svg",
  "./assets/icons/winart.svg",
  "./assets/icons/tredmpt.svg",
  "./assets/icons/hexlauncher.svg",
  "./assets/icons/devlens.svg",
  "./assets/icons/neonpulse.svg"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  // 1. NEVER cache APK files or external download links
  if (
    requestUrl.pathname.endsWith(".apk") ||
    requestUrl.hostname.includes("drive.google.com") ||
    requestUrl.hostname.includes("github.com")
  ) {
    return; // Pass through to standard browser handling
  }

  // 2. Network-first strategy for data/apps.json (ensure latest updates are seen)
  if (requestUrl.pathname.endsWith("apps.json")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // 3. Cache-first strategy for static app shell
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== "basic") {
          return networkResponse;
        }
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      });
    }).catch(() => {
      // Offline fallback for navigation requests
      if (event.request.mode === "navigate") {
        return caches.match("./index.html");
      }
    })
  );
});
