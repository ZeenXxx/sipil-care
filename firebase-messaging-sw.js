importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

const CACHE_NAME = 'sipilcare-pwa-v2';
const APP_SHELL = [
  '/',
  '/index.html',
  '/pages/help.html',
  '/pages/resources.html',
  '/pages/praktikum-studio.html',
  '/pages/tools.html',
  '/css/style.css?v=26',
  '/css/navbar.css?v=33',
  '/assets/images/logo-hms.png',
  '/assets/icons/pwa-192.png',
  '/assets/icons/pwa-512.png',
  '/manifest.webmanifest'
];
const CACHEABLE_PATHS = [
  '/css/',
  '/js/',
  '/assets/icons/',
  '/assets/images/logo-hms.png',
  '/manifest.webmanifest'
];
const HEAVY_EXTENSIONS = /\.(pdf|docx?|xlsx?|pptx?|zip|rar|7z|mp4|webm|mov|avi|mkv|png|jpe?g|gif|webp)$/i;

firebase.initializeApp({
  apiKey: 'AIzaSyDm_PmGLGQ9NEnaeMZJiphEfFFVRZhJDBk',
  authDomain: 'sipilcare.firebaseapp.com',
  projectId: 'sipilcare',
  storageBucket: 'sipilcare.firebasestorage.app',
  messagingSenderId: '195505029208',
  appId: '1:195505029208:web:43fab3178aee3678b2ca2d',
  measurementId: 'G-WD58LNB1G6'
});

const messaging = firebase.messaging();

const notificationTarget = payload => payload.data?.url
  || payload.fcmOptions?.link
  || payload.webpush?.fcmOptions?.link
  || '/index.html';

messaging.onBackgroundMessage(payload => {
  const notification = payload.notification || {};
  self.registration.showNotification(notification.title || 'Update SIPIL CARE', {
    body: notification.body || 'Ada update baru di SIPIL CARE.',
    icon: '/assets/images/logo-hms.png',
    badge: '/assets/images/logo-hms.png',
    tag: payload.data?.tag || payload.data?.threadId || 'sipilcare-update',
    data: {
      url: notificationTarget(payload)
    }
  });
});

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => null));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('/index.html')))
    );
    return;
  }

  const shouldCache = CACHEABLE_PATHS.some(path => requestUrl.pathname.startsWith(path))
    && !HEAVY_EXTENSIONS.test(requestUrl.pathname);
  if (!shouldCache) return;

  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = new URL(event.notification.data?.url || '/index.html', self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
      const existing = clientList.find(client => client.url === targetUrl || client.url.split('#')[0] === targetUrl.split('#')[0]);
      if (existing) return existing.focus();
      return clients.openWindow(targetUrl);
    })
  );
});
