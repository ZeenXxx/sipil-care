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
const cats = ['All', 'Struktur', 'Geoteknik', 'Hidrologi', 'Transportasi', 'Manajemen Konstruksi', 'Software', 'SNI'];
const per = 9;
const extractGoogleDriveId = (url) => {
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
};

const getDirectDownloadUrl = (url) => {
  const gdId = extractGoogleDriveId(url);
  if (gdId) return `https://drive.google.com/uc?id=${gdId}&export=download`;
  return url;
};

const downloadFile = async (url, filename) => {
  try {
    const dlUrl = getDirectDownloadUrl(url);
    const response = await fetch(dlUrl, { mode: 'no-cors' });
    const blob = await response.blob();
    
    // If blob is too small or text, try direct link fallback
    if (blob.size < 1000 && blob.type.startsWith('text')) {
      window.open(dlUrl, '_blank');
      return;
    }

    const objUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objUrl;
    link.download = filename || 'file';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objUrl);
  } catch (err) {
    console.error('Download error:', err);
    window.open(getDirectDownloadUrl(url), '_blank');
  }
};

const truncateText = (text, len = 80) => text.length > len ? text.slice(0, len) + '...' : text;

const card = i => `<article class="card resource-card"><div class="icon">${i.thumbnail}</div><div class="meta"><span class="badge">${i.category}</span><span class="badge">${i.type}</span><span class="badge">${i.date}</span></div><h3>${i.title}</h3><p>${truncateText(i.description)}</p><small>Author: ${i.author}</small><div class="actions"><a class="btn btn-primary" href="${i.file}" target="_blank" rel="noopener">View</a><button class="btn btn-ghost" data-url="${i.file}" data-name="${i.title}" data-type="${i.type}">Download</button></div></article>`;
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
  
  // Add download listeners
  resourceGrid.querySelectorAll('button.btn-ghost').forEach(btn => {
    btn.addEventListener('click', () => {
      const url = btn.dataset.url;
      const name = btn.dataset.name;
      const type = btn.dataset.type;
      downloadFile(url, `${name}.${type.toLowerCase()}`);
    });
  });

  pagination.innerHTML = Array.from({ length: pages }, (_, i) => `<button class="${i + 1 === page ? 'active' : ''}" data-p="${i + 1}">${i + 1}</button>`).join('');
  pagination.querySelectorAll('button').forEach(b => b.onclick = () => {
    page = +b.dataset.p;
    render();
  });

  const f = document.getElementById('featuredResources');
  if (f) {
    f.innerHTML = resources.filter(i => ['SNI', 'Software', 'Struktur'].includes(i.category)).slice(0, 3).map(card).join('');
    // Add download listeners for featured too
    f.querySelectorAll('button.btn-ghost').forEach(btn => {
      btn.addEventListener('click', () => {
        const url = btn.dataset.url;
        const name = btn.dataset.name;
        const type = btn.dataset.type;
        downloadFile(url, `${name}.${type.toLowerCase()}`);
      });
    });
  }
}

const params = new URLSearchParams(location.search);
if (params.get('category')) current = params.get('category');

function loadResourcesFromFirestore() {
  const resourcesQuery = query(collection(db, 'resources'), orderBy('date', 'desc'));
  onSnapshot(resourcesQuery, snapshot => {
    resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    renderFilters();
    render();
  }, err => {
    console.error('Firestore load failed:', err);
    fetch('../data/resources.json')
      .then(r => r.json())
      .then(d => {
        resources = d;
        renderFilters();
        render();
      });
  });
}

loadResourcesFromFirestore();

// Expose downloadFile globally for inline onclick
window.downloadFile = downloadFile;

resourceSearch?.addEventListener('input', () => {
  page = 1;
  render();
});
typeFilter?.addEventListener('change', () => {
  page = 1;
  render();
});