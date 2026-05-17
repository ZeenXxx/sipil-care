import { app } from '../js/firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const resourceSearch = document.getElementById('resourceSearch');
const typeFilter = document.getElementById('typeFilter');
const categoryFilters = document.getElementById('categoryFilters');
const resourceGrid = document.getElementById('resourceGrid');
const pagination = document.getElementById('pagination');
let resources = [];
let current = 'All';
let page = 1;
const softwareElements = ['Struktur', 'Geoteknik', 'Hidrologi', 'Transportasi', 'Manajemen Konstruksi'];
const cats = ['All', 'Struktur', 'Geoteknik', 'Hidrologi', 'Transportasi', 'Manajemen Konstruksi', 'Software', 'SNI'];
const per = 9;
const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const slugify = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'resource';
const accessId = item => encodeURIComponent(item.id || item.slug || slugify(item.title));
const accessUrl = item => `access.html?id=${accessId(item)}`;
const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

const truncateText = (text, len = 80) => {
  if (!text) return '';
  return text.length > len ? text.slice(0, len) + '...' : text;
};

const getThumbnailDisplay = (thumb) => {
  if (!thumb) return 'RES';
  // Jika thumbnail masih URL, ambil 3 karakter pertama atau kategori
  if (thumb.includes('http') || thumb.includes('/')) return 'RES';
  // Bersihkan dari special chars
  return thumb.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 3) || 'RES';
};

const card = i => {
  const url = accessUrl(i);
  return `<article class="card resource-card"><div class="icon">${escapeText(getThumbnailDisplay(i.thumbnail))}</div><div class="meta"><span class="badge">${escapeText(i.category)}</span><span class="badge">${escapeText(i.type)}</span><span class="badge">${escapeText(i.date)}</span></div><h3>${escapeText(i.title)}</h3><p>${escapeText(truncateText(i.description, 120))}</p><small>Author: ${escapeText(i.author)}</small><div class="actions"><a class="btn btn-primary" href="${url}">Akses File</a><button class="btn btn-ghost" data-access-url="${url}">Salin Link</button></div></article>`;
};
const filtered = () => {
  const q = (resourceSearch?.value || '').toLowerCase();
  const type = typeFilter?.value || 'All';
  return resources.filter(i =>
    (current === 'All' || i.category === current) &&
    (type === 'All' || i.type === type) &&
    [i.title, i.description, i.category, i.author].join(' ').toLowerCase().includes(q)
  );
};

function renderFilters() {
  categoryFilters.innerHTML = cats.map(c => `<button class="filter ${c === current ? 'active' : ''}" data-c="${c}">${c}</button>`).join('');
  categoryFilters.querySelectorAll('button').forEach(b => b.onclick = () => {
    current = b.dataset.c;
    page = 1;
    renderFilters();
    render();
  });
}

function render() {
  const d = filtered();
  const pages = Math.max(1, Math.ceil(d.length / per));
  const start = (page - 1) * per;

  resourceGrid.innerHTML = d.slice(start, start + per).map(card).join('') || '<div class="card empty">Resource tidak ditemukan.</div>';
  
  bindCopyButtons(resourceGrid);

  pagination.innerHTML = Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === page ? 'active' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('');
  pagination.querySelectorAll('button').forEach(b => b.onclick = () => {
    page = +b.dataset.p;
    render();
  });

  const f = document.getElementById('featuredResources');
  if (f) {
    f.innerHTML = resources.filter(i => ['SNI', 'Software', 'Struktur'].includes(i.category)).slice(0, 3).map(card).join('');
    bindCopyButtons(f);
  }
}

function bindCopyButtons(root) {
  root.querySelectorAll('[data-access-url]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fullUrl = new URL(btn.dataset.accessUrl, location.href).href;
      try {
        await navigator.clipboard.writeText(fullUrl);
        showToast('Link SIPIL CARE berhasil disalin.');
      } catch {
        showToast('Tidak bisa menyalin otomatis. Salin link dari tombol Akses File.');
      }
    });
  });
}

const params = new URLSearchParams(location.search);
if (params.get('category')) current = params.get('category');

function normalizeResources(items) {
  return items.map(item => {
    const normalized = { ...item };
    if (normalized.element && normalized.element !== '' && normalized.category !== 'Software') {
      normalized.category = 'Software';
    }
    if (!normalized.element && softwareElements.includes(normalized.type) && normalized.category !== 'Software') {
      normalized.category = 'Software';
      normalized.element = normalized.type;
    }
    return normalized;
  });
}

function loadResourcesFromFirestore() {
  const resourcesQuery = query(collection(db, 'resources'), orderBy('date', 'desc'));
  onSnapshot(resourcesQuery, snapshot => {
    resources = normalizeResources(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    renderFilters();
    render();
    const legend = document.getElementById('resourceLegend');
    if (legend && resources.length > 0) legend.style.display = 'flex';
  }, err => {
    console.error('Firestore load failed:', err);
    fetch('../data/resources.json')
      .then(r => r.json())
      .then(d => {
        resources = normalizeResources(d);
        renderFilters();
        render();
        const legend = document.getElementById('resourceLegend');
        if (legend && resources.length > 0) legend.style.display = 'flex';
      });
  });
}

loadResourcesFromFirestore();

resourceSearch?.addEventListener('input', () => {
  page = 1;
  render();
});
typeFilter?.addEventListener('change', () => {
  page = 1;
  render();
});