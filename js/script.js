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

const parseDisplayDate = value => {
  if (!value) return { label: 'Tanggal belum diatur', machine: '' };
  if (typeof value.toDate === 'function') value = value.toDate();
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isNaN(date.getTime())) {
    return {
      label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
      machine: date.toISOString().slice(0, 10)
    };
  }
  return { label: String(value), machine: '' };
};

const announcementCard = (item, index = 0) => {
  const description = String(item.description || '').trim();
  const hasLongDescription = description.length > 150;
  const excerpt = hasLongDescription ? description.slice(0, 150).trim() : description;
  const continuation = hasLongDescription ? description.slice(150).trim() : '';
  const publishDate = parseDisplayDate(item.date || item.createdAt || item.updatedAt);
  const image = item.photoUrl
    ? `<img src="${escapeText(item.photoUrl)}" alt="${escapeText(item.title)}">`
    : `<span aria-hidden="true">${escapeText((item.type || 'Info').slice(0, 2).toUpperCase())}</span>`;
  const descriptionMarkup = hasLongDescription
    ? `
      <p class="announcement-excerpt">${escapeText(excerpt)}<span class="announcement-fade">...</span></p>
      <details class="announcement-details">
        <summary>Baca selengkapnya</summary>
        <p>${escapeText(continuation)}</p>
      </details>
    `
    : `<p>${escapeText(description)}</p>`;

  return `
    <article class="card announcement-card featured-announcement">
      <div class="announcement-media ${item.photoUrl ? 'has-image' : ''}">${image}</div>
      <div class="announcement-body">
        <div class="announcement-meta">
          <span class="announcement-type">${escapeText(item.type || 'Pemberitahuan')}</span>
          <time class="announcement-date" ${publishDate.machine ? `datetime="${escapeText(publishDate.machine)}"` : ''}>Dipublish ${escapeText(publishDate.label)}</time>
        </div>
        <h3>${escapeText(item.title)}</h3>
        ${descriptionMarkup}
      </div>
    </article>
  `;
};

const announcementCarousel = items => `
  <div class="announcement-carousel-shell">
    <button class="announcement-nav announcement-nav-prev" type="button" aria-label="Pemberitahuan sebelumnya" data-announcement-nav="prev">
      <span aria-hidden="true">&#8249;</span>
    </button>
    <div class="announcement-viewport" data-announcement-viewport>
      <div class="announcement-track">
        ${items.map(announcementCard).join('')}
      </div>
    </div>
    <button class="announcement-nav announcement-nav-next" type="button" aria-label="Pemberitahuan berikutnya" data-announcement-nav="next">
      <span aria-hidden="true">&#8250;</span>
    </button>
  </div>
`;

function setupAnnouncementCarousel(target) {
  const viewport = target.querySelector('[data-announcement-viewport]');
  const prev = target.querySelector('[data-announcement-nav="prev"]');
  const next = target.querySelector('[data-announcement-nav="next"]');
  if (!viewport || !prev || !next) return;

  const updateButtons = () => {
    const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth - 2);
    const hasOverflow = maxScroll > 0;
    prev.hidden = !hasOverflow;
    next.hidden = !hasOverflow;
    prev.disabled = viewport.scrollLeft <= 2;
    next.disabled = viewport.scrollLeft >= maxScroll;
  };

  const move = direction => {
    const distance = viewport.clientWidth * direction;
    viewport.scrollBy({ left: distance, behavior: 'smooth' });
  };

  prev.addEventListener('click', () => move(-1));
  next.addEventListener('click', () => move(1));
  viewport.addEventListener('scroll', updateButtons, { passive: true });
  window.addEventListener('resize', updateButtons);
  updateButtons();
}

const fallbackAnnouncements = [
  {
    title: 'Pemberitahuan kegiatan akan tampil di sini',
    type: 'Info HMS',
    date: 'Terbaru',
    description: 'Admin HMS dapat menambahkan agenda, dokumentasi kegiatan, atau pengumuman melalui panel HMS.'
  },
  {
    title: 'Dokumentasi kegiatan PENDPROF HMS',
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
    target.innerHTML = announcementCarousel((data.length ? data : fallbackAnnouncements).slice(0, 5));
    setupAnnouncementCarousel(target);
  } catch (err) {
    console.error('Firestore announcements fetch failed:', err);
    target.innerHTML = announcementCarousel(fallbackAnnouncements);
    setupAnnouncementCarousel(target);
  }
}

loadAnnouncements();
loadHomeVideos();
