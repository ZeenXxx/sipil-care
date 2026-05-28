import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const BOOKMARK_KEY = 'sipilcare_student_bookmarks';
const SESSION_TTL = 24 * 60 * 60 * 1000;

const profileTarget = document.getElementById('studentDashboardProfile');
const summaryTarget = document.getElementById('studentDashboardSummary');
const bookmarkTarget = document.getElementById('studentBookmarkList');
const activityTarget = document.getElementById('studentRecentActivity');

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const readSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.nim || !session?.lastSeenAt) return null;
    if (Date.now() - session.lastSeenAt > SESSION_TTL) return null;
    return session;
  } catch {
    return null;
  }
};

const readBookmarks = () => {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
  } catch {
    return [];
  }
};

const formatDateTime = value => {
  if (!value) return '-';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const typeClass = value => String(value || 'materi').toLowerCase().replace(/[^a-z0-9]+/g, '-');

function renderLoggedOut() {
  if (profileTarget) {
    profileTarget.innerHTML = `
      <h2>Belum login</h2>
      <p>Login sebagai mahasiswa untuk membuka dashboard pribadi.</p>
      <a class="btn btn-primary" href="../student-login?next=pages%2Fstudent-dashboard">Login Mahasiswa</a>
    `;
  }
  if (summaryTarget) summaryTarget.innerHTML = '';
  if (bookmarkTarget) bookmarkTarget.innerHTML = '<div class="empty">Dashboard aktif setelah login.</div>';
  if (activityTarget) activityTarget.innerHTML = '<div class="empty">Belum ada aktivitas yang bisa ditampilkan.</div>';
}

function renderProfile(session, bookmarks) {
  if (!profileTarget) return;
  const initial = String(session.name || session.nim || 'M').trim().slice(0, 1).toUpperCase();
  profileTarget.innerHTML = `
    <div class="student-profile-avatar">${escapeText(initial)}</div>
    <h2>${escapeText(session.name || 'Mahasiswa SIPIL CARE')}</h2>
    <p>NIM ${escapeText(session.nim)}${session.angkatan ? ` &middot; Angkatan ${escapeText(session.angkatan)}` : ''}</p>
    <div class="student-profile-actions">
      <a class="btn btn-primary" href="praktikum-studio">Praktikum Saya</a>
      <a class="btn btn-secondary" href="resources">Cari Materi</a>
    </div>
  `;
  if (summaryTarget) {
    const counts = bookmarks.reduce((map, item) => {
      map[item.type] = (map[item.type] || 0) + 1;
      return map;
    }, {});
    summaryTarget.innerHTML = `
      <article><span>Total simpanan</span><strong>${bookmarks.length}</strong></article>
      <article><span>Resource</span><strong>${counts.Resource || 0}</strong></article>
      <article><span>Praktikum</span><strong>${counts['Praktikum & Studio'] || 0}</strong></article>
      <article><span>Video</span><strong>${counts.Video || 0}</strong></article>
    `;
  }
}

function renderBookmarks(bookmarks) {
  if (!bookmarkTarget) return;
  bookmarkTarget.innerHTML = bookmarks.length
    ? bookmarks.map(item => `
      <a class="student-bookmark-item" href="${escapeText(item.url || '#')}">
        <span class="student-bookmark-type ${escapeText(typeClass(item.type))}">${escapeText(item.type || 'Materi')}</span>
        <strong>${escapeText(item.title || 'Materi tersimpan')}</strong>
        <small>${escapeText(item.category || '-')} &middot; Disimpan ${escapeText(formatDateTime(item.savedAt))}</small>
      </a>
    `).join('')
    : '<div class="empty">Belum ada materi tersimpan. Tekan tombol Simpan pada Resource, Praktikum, atau Video.</div>';
}

async function loadRecentActivity(session) {
  if (!activityTarget) return;
  try {
    const snapshot = await getDocs(query(
      collection(db, 'resource_access_logs'),
      where('nim', '==', session.nim),
      limit(40)
    ));
    const rows = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.createdAt || b.accessedAt || '').localeCompare(String(a.createdAt || a.accessedAt || '')))
      .slice(0, 10);
    activityTarget.innerHTML = rows.length
      ? rows.map(item => `
        <article class="student-activity-item">
          <strong>${escapeText(item.resourceTitle || item.title || 'Aktivitas materi')}</strong>
          <span>${escapeText(item.actionLabel || item.action || 'Akses')} &middot; ${escapeText(item.category || item.contentType || '-')}</span>
          <small>${escapeText(formatDateTime(item.createdAt || item.accessedAt))}</small>
        </article>
      `).join('')
      : '<div class="empty">Belum ada riwayat akses yang terekam.</div>';
  } catch (error) {
    console.warn('Student dashboard activity failed:', error);
    activityTarget.innerHTML = '<div class="empty">Riwayat akses belum bisa dimuat. Materi tersimpan tetap bisa digunakan.</div>';
  }
}

const session = readSession();
if (!session) {
  renderLoggedOut();
} else {
  const bookmarks = readBookmarks();
  renderProfile(session, bookmarks);
  renderBookmarks(bookmarks);
  loadRecentActivity(session);
}
