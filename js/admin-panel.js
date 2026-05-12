import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const resourceForm = document.getElementById('resourceForm');
const resourceId = document.getElementById('resourceId');
const resourceTitle = document.getElementById('resourceTitle');
const resourceCategory = document.getElementById('resourceCategory');
const resourceDescription = document.getElementById('resourceDescription');
const resourceAuthor = document.getElementById('resourceAuthor');
const resourceDate = document.getElementById('resourceDate');
const resourceThumb = document.getElementById('resourceThumb');
const resourceType = document.getElementById('resourceType');
const resourceFile = document.getElementById('resourceFile');
const videoForm = document.getElementById('videoForm');
const videoTitle = document.getElementById('videoTitle');
const videoThumb = document.getElementById('videoThumb');
const videoDescription = document.getElementById('videoDescription');
const videoCategoryInput = document.getElementById('videoCategoryInput');
const videoDuration = document.getElementById('videoDuration');
const videoYoutube = document.getElementById('videoYoutube');
const resourceTable = document.getElementById('resourceTable');
const adminSearch = document.getElementById('adminSearch');
const adminFilter = document.getElementById('adminFilter');
const adminStats = document.getElementById('adminStats');
const toastEl = document.getElementById('toast');
const submitButton = resourceForm?.querySelector('button[type="submit"]');
let resources = [];

const toast = message => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2600);
};

const setLoading = active => {
  if (submitButton) submitButton.disabled = active;
};

const validateResourceForm = () => {
  if (!resourceTitle.value.trim() || !resourceDescription.value.trim() || !resourceAuthor.value.trim() || !resourceDate.value) {
    toast('Lengkapi Judul, Deskripsi, Author, dan Tanggal.');
    return false;
  }
  if (!resourceFile.value.trim()) {
    toast('Masukkan link file terlebih dahulu.');
    return false;
  }
  if (!/^https?:\/\//i.test(resourceFile.value.trim())) {
    toast('Link file harus dimulai dengan http:// atau https://');
    return false;
  }
  return true;
};

function stats() {
  const cats = new Set(resources.map(r => r.category));
  const modules = resources.filter(r => r.title.toLowerCase().includes('modul')).length;
  adminStats.innerHTML = `
    <div class="admin-stat"><b>${resources.length}</b><span>Resource</span></div>
    <div class="admin-stat"><b>--</b><span>Video</span></div>
    <div class="admin-stat"><b>${modules}</b><span>Modul</span></div>
    <div class="admin-stat"><b>${cats.size}</b><span>Kategori</span></div>
  `;
}

function filters() {
  adminFilter.innerHTML = '<option value="All">All</option>' +
    [...new Set(resources.map(r => r.category))].map(c => `<option>${c}</option>`).join('');
}

function table() {
  const q = (adminSearch.value || '').toLowerCase();
  const cat = adminFilter.value || 'All';
  const rows = resources
    .filter(r => (cat === 'All' || r.category === cat) &&
      [r.title, r.category, r.description, r.author].join(' ').toLowerCase().includes(q))
    .map(r => `
      <tr>
        <td>${r.title}</td>
        <td>${r.category}</td>
        <td>${r.type}</td>
        <td>${r.date}</td>
        <td><button class="action-btn" data-edit="${r.id}">Edit</button><button class="action-btn danger" data-del="${r.id}">Delete</button></td>
      </tr>
    `)
    .join('');
  resourceTable.innerHTML = rows || '<tr><td colspan="5">Tidak ada resource.</td></tr>';
}

const render = () => {
  stats();
  filters();
  table();
};

resourceForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateResourceForm()) return;

  setLoading(true);
  const fileUrl = resourceFile.value.trim();
  const type = resourceFile.value.split('.').pop().toUpperCase();

  try {
    const data = {
      title: resourceTitle.value.trim(),
      category: resourceCategory.value,
      description: resourceDescription.value.trim(),
      author: resourceAuthor.value.trim(),
      date: resourceDate.value,
      thumbnail: resourceThumb.value.trim() || resourceCategory.value.slice(0, 2).toUpperCase(),
      type,
      file: fileUrl
    };

    await addDoc(collection(db, 'resources'), data);
    resourceForm.reset();
    render();
    toast('Resource tersimpan ke Firestore.');
  } catch (err) {
    console.error('Save error:', err);
    toast('Gagal menyimpan resource. Cek console untuk detail.');
  } finally {
    setLoading(false);
  }
});

resourceTable.addEventListener('click', e => {
  if (e.target.dataset.del || e.target.dataset.edit) {
    e.preventDefault();
    toast('Fitur edit / hapus belum tersedia di panel ini.');
  }
});

adminSearch.addEventListener('input', () => render());
adminFilter.addEventListener('change', () => render());

const resourcesQuery = query(collection(db, 'resources'), orderBy('date', 'desc'));
onSnapshot(resourcesQuery, snapshot => {
  resources = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  render();
}, err => {
  console.error('Firestore error:', err);
  toast('Gagal memuat resource dari Firebase.');
});