importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js');

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

messaging.onBackgroundMessage(payload => {
  const notification = payload.notification || {};
  self.registration.showNotification(notification.title || 'Live chat baru - SIPIL CARE', {
    body: notification.body || 'Ada pesan live chat baru dari mahasiswa.',
    icon: '/assets/images/logo-hms.png',
    badge: '/assets/images/logo-hms.png',
    tag: payload.data?.threadId || 'sipilcare-live-chat',
    data: {
      url: '/panel-hms-sipil-2026.html#live-chat-admin'
    }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/panel-hms-sipil-2026.html#live-chat-admin';
  event.waitUntil(clients.openWindow(targetUrl));
});
