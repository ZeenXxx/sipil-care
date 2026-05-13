import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const videoCard = item => `
  <article class="card video-card">
    <div class="thumb">${escapeText(item.thumbnail || 'VI')}</div>
    <div class="video-body">
      <div class="meta">
        <span class="badge">${escapeText(item.category || 'Video')}</span>
        <span class="badge">Channel: ${escapeText(item.channel || item.duration || 'Learning')}</span>
      </div>
      <h3>${escapeText(item.title)}</h3>
      <p>${escapeText(item.description)}</p>
      <div class="actions">
        <a class="btn btn-primary" href="${escapeText(item.youtube || '#')}" target="_blank" rel="noopener">Watch</a>
        <a class="btn btn-ghost" href="pages/videos.html">More Videos</a>
      </div>
    </div>
  </article>
`;

const announcementCard = item => {
  const description = String(item.description || '').trim();
  const hasLongDescription = description.length > 150;
  const excerpt = hasLongDescription ? `${description.slice(0, 150).trim()}...` : description;
  const image = item.photoUrl
    ? `<img src="${escapeText(item.photoUrl)}" alt="${escapeText(item.title)}">`
    : `<span>${escapeText((item.type || 'Info').slice(0, 2).toUpperCase())}</span>`;
  const descriptionMarkup = hasLongDescription
    ? `
      <p class="announcement-excerpt">${escapeText(excerpt)}</p>
      <details class="announcement-details">
        <summary>Baca selengkapnya</summary>
        <p>${escapeText(description)}</p>
      </details>
    `
    : `<p>${escapeText(description)}</p>`;

  return `
    <article class="card announcement-card">
      <div class="announcement-media ${item.photoUrl ? 'has-image' : ''}">${image}</div>
      <div class="announcement-body">
        <div class="meta">
          <span class="badge">${escapeText(item.type || 'Pemberitahuan')}</span>
          <span class="badge">${escapeText(item.date || 'Update')}</span>
        </div>
        <h3>${escapeText(item.title)}</h3>
        ${descriptionMarkup}
      </div>
    </article>
  `;
};

const fallbackAnnouncements = [
  {
    title: 'Pemberitahuan kegiatan akan tampil di sini',
    type: 'Info HMS',
    date: 'Terbaru',
    description: 'Admin HMS dapat menambahkan agenda, dokumentasi kegiatan, atau pengumuman melalui panel HMS.'
  },
  {
    title: 'Dokumentasi kegiatan PENDPROF',
    type: 'Dokumentasi',
    date: 'Arsip',
    description: 'Foto kegiatan yang diunggah dari panel akan disimpan di Supabase Storage dan ditampilkan pada halaman awal.'
  },
  {
    title: 'Update akademik mahasiswa',
    type: 'Akademik',
    date: 'Ongoing',
    description: 'Gunakan fitur ini untuk menyampaikan informasi kelas, seminar, pelatihan, atau program kerja.'
  }
];

async function loadHomeVideos() {
  const target = document.getElementById('homeVideoHighlights');
  const countTarget = document.getElementById('homeVideoCount');
  if (!target) return;

  try {
    const videosRef = query(collection(db, 'videos'), orderBy('title'));
    const snapshot = await getDocs(videosRef);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    if (countTarget) countTarget.textContent = data.length;
    target.innerHTML = data.slice(0, 3).map(videoCard).join('') || '<div class="empty span-2">Belum ada video.</div>';
  } catch (err) {
    console.error('Firestore videos fetch failed:', err);
    fetch('data/videos.json')
      .then(response => response.json())
      .then(data => {
        if (countTarget) countTarget.textContent = data.length;
        target.innerHTML = data.slice(0, 3).map(videoCard).join('');
      })
      .catch(() => {
        if (countTarget) countTarget.textContent = '0';
        target.innerHTML = '<div class="empty span-2">Video belum tersedia.</div>';
      });
  }
}

async function loadAnnouncements() {
  const target = document.getElementById('homeAnnouncements');
  if (!target) return;

  try {
    const announcementsRef = query(collection(db, 'announcements'), orderBy('date', 'desc'));
    const snapshot = await getDocs(announcementsRef);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    target.innerHTML = (data.length ? data : fallbackAnnouncements).slice(0, 3).map(announcementCard).join('');
  } catch (err) {
    console.error('Firestore announcements fetch failed:', err);
    target.innerHTML = fallbackAnnouncements.map(announcementCard).join('');
  }
}

loadAnnouncements();
loadHomeVideos();
