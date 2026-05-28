import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  getDocs,
  where
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
  const publishDate = parseDisplayDate(item.date || item.createdAt || item.updatedAt);
  const image = item.photoUrl
    ? `<button class="announcement-image-button" type="button" data-announcement-image="${escapeText(item.photoUrl)}" data-announcement-title="${escapeText(item.title)}" aria-label="Buka foto ${escapeText(item.title)}">
        <img src="${escapeText(item.photoUrl)}" alt="${escapeText(item.title)}">
        <span>Lihat foto</span>
      </button>`
    : `<span aria-hidden="true">${escapeText((item.type || 'Info').slice(0, 2).toUpperCase())}</span>`;
  const descriptionMarkup = hasLongDescription
    ? `
      <details class="announcement-caption">
        <summary><span>${escapeText(excerpt)}<span class="announcement-fade">...</span> <b>selengkapnya</b></span></summary>
        <p>${escapeText(description)} <button class="announcement-collapse" type="button" data-announcement-collapse>lebih sedikit</button></p>
      </details>
    `
    : `<p class="announcement-caption-full">${escapeText(description)}</p>`;

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

const photoFileName = title => {
  const cleanTitle = String(title || 'pemberitahuan')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'pemberitahuan';
  return `${cleanTitle}-sipil-care.jpg`;
};

function ensureAnnouncementPhotoModal() {
  let modal = document.getElementById('announcementPhotoModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'announcementPhotoModal';
  modal.className = 'announcement-photo-modal';
  modal.hidden = true;
  modal.innerHTML = `
    <div class="announcement-photo-backdrop" data-announcement-close></div>
    <div class="announcement-photo-dialog" role="dialog" aria-modal="true" aria-labelledby="announcementPhotoTitle">
      <div class="announcement-photo-toolbar">
        <h3 id="announcementPhotoTitle">Foto Pemberitahuan</h3>
        <button type="button" class="announcement-photo-close" data-announcement-close aria-label="Tutup foto">&times;</button>
      </div>
      <div class="announcement-photo-frame">
        <img alt="" data-announcement-photo>
      </div>
      <div class="announcement-photo-actions">
        <button type="button" class="btn btn-primary" data-announcement-download>Download Foto</button>
        <a class="btn btn-secondary" href="#" target="_blank" rel="noopener" data-announcement-open>Buka Tab</a>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function closeAnnouncementPhotoModal() {
  const modal = document.getElementById('announcementPhotoModal');
  if (!modal) return;
  modal.hidden = true;
  document.body.classList.remove('photo-modal-open');
  const img = modal.querySelector('[data-announcement-photo]');
  if (img) img.removeAttribute('src');
}

function openAnnouncementPhotoModal(url, title) {
  const modal = ensureAnnouncementPhotoModal();
  const img = modal.querySelector('[data-announcement-photo]');
  const heading = modal.querySelector('#announcementPhotoTitle');
  const openLink = modal.querySelector('[data-announcement-open]');
  const downloadButton = modal.querySelector('[data-announcement-download]');
  if (img) {
    img.src = url;
    img.alt = title || 'Foto pemberitahuan';
  }
  if (heading) heading.textContent = title || 'Foto Pemberitahuan';
  if (openLink) openLink.href = url;
  if (downloadButton) {
    downloadButton.dataset.url = url;
    downloadButton.dataset.title = title || 'pemberitahuan';
  }
  modal.hidden = false;
  document.body.classList.add('photo-modal-open');
}

async function downloadAnnouncementPhoto(url, title) {
  const filename = photoFileName(title);
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error('Download gagal.');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1200);
  } catch (err) {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener';
    document.body.appendChild(link);
    link.click();
    link.remove();
  }
}

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

document.addEventListener('click', event => {
  const collapseButton = event.target.closest('[data-announcement-collapse]');
  if (collapseButton) {
    const caption = collapseButton.closest('.announcement-caption');
    if (caption) caption.open = false;
    return;
  }

  const imageButton = event.target.closest('[data-announcement-image]');
  if (imageButton) {
    event.preventDefault();
    openAnnouncementPhotoModal(imageButton.dataset.announcementImage, imageButton.dataset.announcementTitle);
    return;
  }

  if (event.target.closest('[data-announcement-close]')) {
    closeAnnouncementPhotoModal();
    return;
  }

  const downloadButton = event.target.closest('[data-announcement-download]');
  if (downloadButton) {
    downloadAnnouncementPhoto(downloadButton.dataset.url, downloadButton.dataset.title);
  }
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeAnnouncementPhotoModal();
});

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
    const videosRef = query(collection(db, 'videos'), where('status', '==', 'published'), orderBy('title'));
    let snapshot = await getDocs(videosRef);
    if (snapshot.empty) snapshot = await getDocs(query(collection(db, 'videos'), orderBy('title')));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => (item.status || 'published') === 'published');
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
    const announcementsRef = query(collection(db, 'announcements'), where('status', '==', 'published'), orderBy('date', 'desc'));
    let snapshot = await getDocs(announcementsRef);
    if (snapshot.empty) snapshot = await getDocs(query(collection(db, 'announcements'), orderBy('date', 'desc')));
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => (item.status || 'published') === 'published');
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
