const SESSION_KEY = 'sipilcare_student_session';
const TOKEN_ID_KEY = 'sipilcare_student_push_token_id';
const PUSH_ENABLED_KEY = 'sipilcare_student_push_enabled';
const PUSH_PREF_KEY = 'sipilcare_student_push_categories';
const TOKEN_COLLECTION = 'student_push_tokens';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const rootPrefix = location.pathname.includes('/pages/') || location.pathname.includes('/tools/') ? '../' : '';
const vapidKey = window.SIPILCARE_PUSH_CONFIG?.vapidKey || '';

let firebasePromise = null;
let renderQueued = false;
let foregroundBound = false;
const DEFAULT_CATEGORIES = ['announcement', 'resources', 'practicum_studio', 'software', 'videos', 'attendance'];
const CATEGORY_LABELS = {
  announcement: 'Pemberitahuan',
  resources: 'Resources',
  practicum_studio: 'Praktikum & Studio',
  software: 'Software',
  videos: 'Video',
  attendance: 'Absensi'
};

const loadFirebase = () => {
  if (!firebasePromise) {
    firebasePromise = Promise.all([
      import('./firebase-config.js'),
      import('https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js'),
      import('https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging.js')
    ]).then(([config, firestore, messaging]) => ({
      app: config.app,
      db: firestore.getFirestore(config.app),
      doc: firestore.doc,
      setDoc: firestore.setDoc,
      updateDoc: firestore.updateDoc,
      serverTimestamp: firestore.serverTimestamp,
      getMessaging: messaging.getMessaging,
      getToken: messaging.getToken,
      deleteToken: messaging.deleteToken,
      onMessage: messaging.onMessage,
      isSupported: messaging.isSupported
    }));
  }
  return firebasePromise;
};

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

const readCategories = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(PUSH_PREF_KEY) || 'null');
    return Array.isArray(saved) && saved.length ? saved.filter(item => DEFAULT_CATEGORIES.includes(item)) : DEFAULT_CATEGORIES;
  } catch {
    return DEFAULT_CATEGORIES;
  }
};

const writeCategories = categories => {
  const clean = categories.filter(item => DEFAULT_CATEGORIES.includes(item));
  localStorage.setItem(PUSH_PREF_KEY, JSON.stringify(clean.length ? clean : DEFAULT_CATEGORIES));
};

const syncTokenCategories = async () => {
  const docId = localStorage.getItem(TOKEN_ID_KEY);
  if (!docId) return;
  const firebase = await loadFirebase();
  await firebase.updateDoc(firebase.doc(firebase.db, TOKEN_COLLECTION, docId), {
    categories: readCategories(),
    updatedAt: firebase.serverTimestamp()
  }).catch(() => null);
};

const hasBrowserPushSupport = () => (
  'serviceWorker' in navigator
  && 'Notification' in window
  && 'PushManager' in window
);

const supportsNotifications = async () => {
  if (!hasBrowserPushSupport()) return false;
  try {
    const firebase = await loadFirebase();
    return await firebase.isSupported();
  } catch {
    return false;
  }
};

const currentStatus = async () => {
  if (!hasBrowserPushSupport()) return { supported: false, enabled: false, label: 'Notifikasi belum didukung browser ini.' };
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
  if (!await supportsNotifications()) {
    showToast('Notifikasi belum didukung browser ini.');
    return false;
  }
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    showToast('Izin notifikasi belum diberikan.');
    return false;
  }

  try {
    const firebase = await loadFirebase();
    const registration = await registerWorker();
    const messaging = firebase.getMessaging(firebase.app);
    const token = await firebase.getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
    if (!token) throw new Error('Token notifikasi kosong.');
    const docId = await tokenDocId(token);
    await firebase.setDoc(firebase.doc(firebase.db, TOKEN_COLLECTION, docId), {
      token,
      enabled: true,
      userType: 'student',
      nim: session.nim,
      name: session.name || '',
      angkatan: String(session.angkatan || ''),
      categories: readCategories(),
      displayMode: displayMode(),
      lastPage: location.pathname,
      userAgent: navigator.userAgent.slice(0, 240),
      updatedAt: firebase.serverTimestamp(),
      createdAt: firebase.serverTimestamp()
    }, { merge: true });
    localStorage.setItem(TOKEN_ID_KEY, docId);
    localStorage.setItem(PUSH_ENABLED_KEY, 'true');
    showToast('Notifikasi SIPIL CARE aktif di perangkat ini.');
    scheduleRenderNotificationButton();
    bindForegroundMessages();
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
    const firebase = await loadFirebase();
    if (docId) {
      await firebase.updateDoc(firebase.doc(firebase.db, TOKEN_COLLECTION, docId), {
        enabled: false,
        disabledAt: firebase.serverTimestamp(),
        updatedAt: firebase.serverTimestamp()
      }).catch(() => null);
    }
    if (await supportsNotifications() && vapidKey && Notification.permission === 'granted') {
      const registration = await registerWorker();
      const messaging = firebase.getMessaging(firebase.app);
      await firebase.getToken(messaging, { vapidKey, serviceWorkerRegistration: registration })
        .then(token => token ? firebase.deleteToken(messaging) : false)
        .catch(() => false);
    }
  } finally {
    localStorage.removeItem(TOKEN_ID_KEY);
    localStorage.removeItem(PUSH_ENABLED_KEY);
    showToast('Notifikasi SIPIL CARE dimatikan di perangkat ini.');
    scheduleRenderNotificationButton();
  }
}

const markCurrentTokenDisabled = () => {
  const docId = localStorage.getItem(TOKEN_ID_KEY);
  if (!docId) return;
  loadFirebase().then(firebase => firebase.updateDoc(firebase.doc(firebase.db, TOKEN_COLLECTION, docId), {
    enabled: false,
    disabledAt: firebase.serverTimestamp(),
    updatedAt: firebase.serverTimestamp()
  })).catch(() => null);
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
  renderPreferencePanel(menu, status.enabled);
}

function renderPreferencePanel(menu, enabled) {
  let panel = menu.querySelector('[data-student-push-preferences]');
  if (!panel) {
    panel = document.createElement('div');
    panel.className = 'student-push-preferences';
    panel.dataset.studentPushPreferences = 'true';
    const logout = menu.querySelector('[data-student-logout]');
    menu.insertBefore(panel, logout || null);
  }
  const selected = new Set(readCategories());
  panel.innerHTML = `
    <strong>Notifikasi yang diterima</strong>
    <div class="student-push-options">
      ${DEFAULT_CATEGORIES.map(category => `
        <label>
          <input type="checkbox" value="${category}" ${selected.has(category) ? 'checked' : ''} ${enabled ? '' : 'disabled'}>
          <span>${CATEGORY_LABELS[category]}</span>
        </label>
      `).join('')}
    </div>
  `;
  panel.querySelectorAll('input[type="checkbox"]').forEach(input => {
    input.addEventListener('change', () => {
      const next = [...panel.querySelectorAll('input[type="checkbox"]:checked')].map(item => item.value);
      writeCategories(next);
      syncTokenCategories();
      showToast('Preferensi notifikasi disimpan.');
    });
  });
}

function scheduleRenderNotificationButton() {
  if (renderQueued) return;
  renderQueued = true;
  const run = () => {
    renderQueued = false;
    renderNotificationButton();
  };
  if ('requestIdleCallback' in window) requestIdleCallback(run, { timeout: 1000 });
  else setTimeout(run, 150);
}

async function bindForegroundMessages() {
  if (foregroundBound || localStorage.getItem(PUSH_ENABLED_KEY) !== 'true' || !hasBrowserPushSupport() || !vapidKey) return;
  if (Notification.permission !== 'granted') return;
  foregroundBound = true;
  try {
    const firebase = await loadFirebase();
    if (!await firebase.isSupported()) return;
    const messaging = firebase.getMessaging(firebase.app);
    firebase.onMessage(messaging, payload => {
      const notification = payload.notification || {};
      new Notification(notification.title || 'Update SIPIL CARE', {
        body: notification.body || 'Ada update baru di SIPIL CARE.',
        icon: `${location.origin}/assets/images/logo-hms.png`,
        badge: `${location.origin}/assets/images/logo-hms.png`,
        data: { url: payload.data?.url || '/' }
      });
    });
  } catch (error) {
    foregroundBound = false;
    console.warn('Foreground push listener unavailable:', error);
  }
}

document.addEventListener('click', event => {
  if (event.target.closest('[data-student-logout]')) markCurrentTokenDisabled();
}, true);

const startStudentPushUi = () => {
  if (!readSession()) return;
  scheduleRenderNotificationButton();
  bindForegroundMessages();
  const observer = new MutationObserver(() => {
    if (document.querySelector('.student-account-menu') && !document.querySelector('[data-student-push-toggle]')) {
      scheduleRenderNotificationButton();
    }
  });
  observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startStudentPushUi, { once: true });
} else {
  startStudentPushUi();
}

window.SIPILCARE_STUDENT_PUSH = {
  enable: enableStudentPushNotifications,
  disable: disableStudentPushNotifications,
  status: currentStatus
};
