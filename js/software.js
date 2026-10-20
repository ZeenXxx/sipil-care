import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot
} from 'https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js';

const db = getFirestore(app);
const searchInput = document.getElementById('softwareSearch');
const disciplineFilter = document.getElementById('softwareDiscipline');
const softwareGrid = document.getElementById('softwareGrid');
const resultCount = document.getElementById('softwareResultCount');
const pageSize = 9;
const bookmarkKey = 'sipilcare_student_bookmarks';
const recognizedDisciplines = ['Struktur', 'Geoteknik', 'Hidrologi', 'Transportasi', 'Manajemen Konstruksi'];
let softwareItems = [];
let currentPage = 1;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));
const shortTitle = value => {
  const title = String(value || 'Software Teknik Sipil');
  if (title.length <= 50) return title;
  const clipped = title.slice(0, 49);
  const boundary = clipped.lastIndexOf(' ');
  return `${clipped.slice(0, boundary > 34 ? boundary : 49).trimEnd()}…`;
};

const isSoftware = item => item.category === 'Software'
  || Boolean(item.element)
  || recognizedDisciplines.includes(item.type);

const disciplineOf = item => item.element
  || (recognizedDisciplines.includes(item.type) ? item.type : '')
  || item.discipline
  || 'Lainnya';

const itemKey = item => String(item.id || item.slug || item.title || '');
const savedKey = item => `resource:${item.id || item.slug || String(item.title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

const readBookmarks = () => {
  try {
    const data = JSON.parse(localStorage.getItem(bookmarkKey) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const isSaved = item => readBookmarks().some(saved => saved.id === savedKey(item));

const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  window.setTimeout(() => toast.classList.remove('show'), 2600);
};

const card = item => {
  const id = encodeURIComponent(item.id || item.slug || itemKey(item));
  const thumbnail = item.thumbnail && !String(item.thumbnail).includes('/') && !String(item.thumbnail).startsWith('http')
    ? String(item.thumbnail).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4)
    : 'SW';
  const date = item.date ? new Date(item.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '';
  const description = String(item.description || 'Perangkat lunak atau panduan pendukung kegiatan akademik Teknik Sipil.').trim();
  const readMore = description.length > 120 || String(item.title || 'Software Teknik Sipil').length > 50
    ? '<button class="academic-read-more" type="button" data-academic-read-more>Baca selengkapnya</button>'
    : '<span class="academic-read-more-placeholder" aria-hidden="true"></span>';
  return `<article class="card resource-card software-card academic-description-card">
    <div class="icon">${escapeHtml(thumbnail || 'SW')}</div>
    <div class="meta"><span class="badge">${escapeHtml(disciplineOf(item))}</span>${date ? `<span class="badge">${escapeHtml(date)}</span>` : ''}</div>
    <h3 class="academic-description-title" title="${escapeHtml(item.title || 'Software Teknik Sipil')}">${escapeHtml(shortTitle(item.title))}</h3>
    <p class="academic-description-preview">${escapeHtml(description)}</p>
    ${readMore}<div class="academic-description-full" hidden>${escapeHtml(description)}</div>
    <small class="academic-description-author">Pengunggah: ${escapeHtml(item.author || '-')}</small>
    <div class="actions"><a class="btn btn-primary" href="access?source=resources&amp;id=${id}">Buka Software</a><button class="btn btn-ghost" type="button" data-save-software="${escapeHtml(itemKey(item))}">${isSaved(item) ? 'Tersimpan' : 'Simpan'}</button></div>
  </article>`;
};

const filteredItems = () => {
  const term = (searchInput?.value || '').trim().toLocaleLowerCase('id');
  const discipline = disciplineFilter?.value || 'All';
  return softwareItems.filter(item => {
    const matchesDiscipline = discipline === 'All' || disciplineOf(item) === discipline;
    const searchable = [item.title, item.description, item.author, item.type, item.element, disciplineOf(item)].join(' ').toLocaleLowerCase('id');
    return matchesDiscipline && searchable.includes(term);
  });
};

const renderDisciplines = () => {
  const selected = disciplineFilter?.value || 'All';
  const disciplines = [...new Set(softwareItems.map(disciplineOf))].sort((a, b) => a.localeCompare(b, 'id'));
  if (!disciplineFilter) return;
  disciplineFilter.innerHTML = '<option value="All">Semua bidang</option>'
    + disciplines.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
  if (disciplines.includes(selected)) disciplineFilter.value = selected;
};

const render = () => {
  if (!softwareGrid) return;
  const matches = filteredItems();
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  currentPage = Math.min(currentPage, pageCount);
  const start = (currentPage - 1) * pageSize;
  const currentItems = matches.slice(start, start + pageSize);

  softwareGrid.innerHTML = currentItems.map(card).join('') || `<div class="card empty software-empty-state">
    <strong>${softwareItems.length ? 'Software tidak ditemukan.' : 'Software belum tersedia.'}</strong>
    <p>${softwareItems.length ? 'Coba kata kunci atau bidang yang berbeda.' : 'Software, installer, dan panduan yang diterbitkan pengelola akan muncul di halaman ini.'}</p>
    <div class="actions"><a class="btn btn-secondary" href="resources.html">Buka Resource</a><a class="btn btn-ghost" href="videos.html">Buka Video</a></div>
  </div>`;

  if (resultCount) resultCount.textContent = `${matches.length} software ditemukan`;
  let pager = document.getElementById('softwarePagination');
  if (!pager) {
    pager = document.createElement('nav');
    pager.id = 'softwarePagination';
    pager.className = 'pagination';
    pager.setAttribute('aria-label', 'Halaman daftar software');
    softwareGrid.after(pager);
  }
  pager.innerHTML = Array.from({ length: pageCount }, (_, index) => {
    const number = index + 1;
    return `<button type="button" class="${number === currentPage ? 'active' : ''}" aria-label="Halaman ${number}" aria-current="${number === currentPage ? 'page' : 'false'}" data-page="${number}">${number}</button>`;
  }).join('');
  pager.hidden = matches.length <= pageSize;
  pager.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => {
    currentPage = Number(button.dataset.page);
    render();
    softwareGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));

  softwareGrid.querySelectorAll('[data-save-software]').forEach(button => button.addEventListener('click', () => {
    const item = softwareItems.find(candidate => itemKey(candidate) === button.dataset.saveSoftware);
    if (!item) return;
    const bookmarks = readBookmarks();
    const key = savedKey(item);
    const alreadySaved = bookmarks.some(saved => saved.id === key);
    const next = alreadySaved
      ? bookmarks.filter(saved => saved.id !== key)
      : [{ id: key, type: 'Software', title: item.title, category: disciplineOf(item), url: `access?source=resources&id=${encodeURIComponent(item.id || item.slug || itemKey(item))}`, savedAt: new Date().toISOString() }, ...bookmarks];
    localStorage.setItem(bookmarkKey, JSON.stringify(next.slice(0, 100)));
    showToast(alreadySaved ? 'Software dihapus dari simpanan.' : 'Software disimpan.');
    render();
  }));
};

const applyData = items => {
  softwareItems = items
    .filter(item => (item.status || 'published') === 'published' && isSoftware(item))
    .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
  renderDisciplines();
  render();
};

searchInput?.addEventListener('input', () => { currentPage = 1; render(); });
disciplineFilter?.addEventListener('change', () => { currentPage = 1; render(); });

onSnapshot(query(collection(db, 'resources'), orderBy('date', 'desc')), snapshot => {
  applyData(snapshot.docs.map(document => ({ id: document.id, ...document.data() })));
}, async error => {
  console.error('Software list could not be loaded from Firestore:', error);
  try {
    const response = await fetch('../data/resources.json');
    if (!response.ok) throw new Error('Daftar fallback tidak dapat dimuat.');
    applyData(await response.json());
  } catch (fallbackError) {
    console.error('Software fallback could not be loaded:', fallbackError);
    softwareItems = [];
    renderDisciplines();
    render();
  }
});
