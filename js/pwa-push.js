import { app } from './firebase-config.js';
import { getFirestore, doc, setDoc, updateDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import { getMessaging, getToken, deleteToken, onMessage, isSupported } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js";

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const TOKEN_ID_KEY = 'sipilcare_student_push_token_id';
const PUSH_ENABLED_KEY = 'sipilcare_student_push_enabled';
const TOKEN_COLLECTION = 'student_push_tokens';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const rootPrefix = location.pathname.includes('/pages/') || location.pathname.includes('/tools/') ? '../' : '';
const vapidKey = window.SIPILCARE_PUSH_CONFIG?.vapidKey || '';

const readSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.nim || !session?.lastSeenAt) return null;
    if (Date.now() - session.lastSeenAt > SESSION_TTL) return null;
    return session;
  } catch {
    return null;
  }
};

const displayMode = () => {
  if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) return 'standalone';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  return 'browser';
};

const tokenDocId = async token => {
  const bytes = new TextEncoder().encode(token);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3200);
};

const supportsNotifications = async () => {
  if (!('serviceWorker' in navigator) || !('Notification' in window) || !('PushManager' in window)) return false;
  try {
    return await isSupported();
  } catch {
    return false;
  }
};

const currentStatus = async () => {
  const supported = await supportsNotifications();
  if (!supported) return { supported: false, enabled: false, label: 'Notifikasi belum didukung browser ini.' };
  if (!vapidKey || vapidKey.includes('ISI_')) return { supported: false, enabled: false, label: 'VAPID key notifikasi belum tersedia.' };
  if (Notification.permission === 'denied') return { supported: true, enabled: false, label: 'Izin notifikasi diblokir di pengaturan browser.' };
  const enabled = localStorage.getItem(PUSH_ENABLED_KEY) === 'true' && Notification.permission === 'granted';
  return { supported: true, enabled, label: enabled ? 'Notifikasi aktif' : 'Notifikasi belum aktif' };
};

const registerWorker = () => navigator.serviceWorker.register(`${rootPrefix}firebase-messaging-sw.js`, { scope: rootPrefix || './' });

export async function enableStudentPushNotifications() {
  const session = readSession();
  if (!session) {
    showToast('Login sebagai mahasiswa terlebih dahulu untuk mengaktifkan notifikasi.');
    return false;
  }
  const status = await currentStatus();
  if (!status.supported) {
    showToast(status.label);
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    showToast('Izin notifikasi belum diberikan.');
    return false;
  }

  try {
    const registration = await registerWorker();
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Token notifikasi kosong.');
    const docId = await tokenDocId(token);
    await setDoc(doc(db, TOKEN_COLLECTION, docId), {
      token,
      enabled: true,
      userType: 'student',
      nim: session.nim,
      name: session.name || '',
      angkatan: String(session.angkatan || ''),
      displayMode: displayMode(),
      lastPage: location.pathname,
      userAgent: navigator.userAgent.slice(0, 240),
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
    localStorage.setItem(TOKEN_ID_KEY, docId);
    localStorage.setItem(PUSH_ENABLED_KEY, 'true');
    showToast('Notifikasi SIPIL CARE aktif di perangkat ini.');
    renderNotificationButton();
    return true;
  } catch (error) {
    console.error('Enable student push failed:', error);
    showToast('Notifikasi gagal diaktifkan. Coba lagi dari browser utama.');
    return false;
  }
}

export async function disableStudentPushNotifications() {
  const docId = localStorage.getItem(TOKEN_ID_KEY);
  try {
    if (docId) {
      await updateDoc(doc(db, TOKEN_COLLECTION, docId), {
        enabled: false,
        disabledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }).catch(() => null);
    }
    const supported = await supportsNotifications();
    if (supported && vapidKey && Notification.permission === 'granted') {
      const registration = await registerWorker();
      const messaging = getMessaging(app);
      await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
        .then(token => token ? deleteToken(messaging) : false)
        .catch(() => false);
    }
  } finally {
    localStorage.removeItem(TOKEN_ID_KEY);
    localStorage.removeItem(PUSH_ENABLED_KEY);
    showToast('Notifikasi SIPIL CARE dimatikan di perangkat ini.');
    renderNotificationButton();
  }
}

const markCurrentTokenDisabled = () => {
  const docId = localStorage.getItem(TOKEN_ID_KEY);
  if (!docId) return;
  updateDoc(doc(db, TOKEN_COLLECTION, docId), {
    enabled: false,
    disabledAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  }).catch(() => null);
  localStorage.removeItem(TOKEN_ID_KEY);
  localStorage.removeItem(PUSH_ENABLED_KEY);
};

async function renderNotificationButton() {
  const session = readSession();
  const menu = document.querySelector('.student-account-menu');
  if (!session || !menu) return;
  const status = await currentStatus();
  let button = menu.querySelector('[data-student-push-toggle]');
  if (!button) {
    button = document.createElement('button');
    button.className = 'student-account-action';
    button.type = 'button';
    button.dataset.studentPushToggle = 'true';
    const divider = document.createElement('div');
    divider.className = 'student-account-divider';
    divider.dataset.studentPushDivider = 'true';
    const logout = menu.querySelector('[data-student-logout]');
    menu.insertBefore(divider, logout || null);
    menu.insertBefore(button, logout || null);
    button.addEventListener('click', () => {
      if (localStorage.getItem(PUSH_ENABLED_KEY) === 'true') disableStudentPushNotifications();
      else enableStudentPushNotifications();
    });
  }
  button.textContent = status.enabled ? 'Matikan Notifikasi' : 'Aktifkan Notifikasi';
  button.title = status.label;
  button.disabled = !status.supported;
}

async function bindForegroundMessages() {
  if (!await supportsNotifications() || !vapidKey) return;
  try {
    const messaging = getMessaging(app);
    onMessage(messaging, payload => {
      const notification = payload.notification || {};
      if (Notification.permission === 'granted') {
        new Notification(notification.title || 'Update SIPIL CARE', {
          body: notification.body || 'Ada update baru di SIPIL CARE.',
          icon: `${location.origin}/assets/images/logo-hms.png`,
          badge: `${location.origin}/assets/images/logo-hms.png`,
          data: { url: payload.data?.url || '/index.html' }
        });
      }
    });
  } catch (error) {
    console.warn('Foreground push listener unavailable:', error);
  }
}

const observer = new MutationObserver(() => renderNotificationButton());
observer.observe(document.documentElement, { childList: true, subtree: true });
document.addEventListener('click', event => {
  if (event.target.closest('[data-student-logout]')) markCurrentTokenDisabled();
}, true);
renderNotificationButton();
bindForegroundMessages();

window.SIPILCARE_STUDENT_PUSH = {
  enable: enableStudentPushNotifications,
  disable: disableStudentPushNotifications,
  status: currentStatus
};
