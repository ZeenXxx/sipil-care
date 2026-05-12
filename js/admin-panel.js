import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
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
let editingDocId = null;

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
        <td><button class="action-btn" data-edit="${r.docId}">Edit</button><button class="action-btn danger" data-del="${r.docId}">Delete</button></td>
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

const resetForm = () => {
  resourceForm.reset();
  editingDocId = null;
  resourceId.value = '';
  if (submitButton) submitButton.textContent = 'Simpan Resource';
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

    if (editingDocId) {
      await updateDoc(doc(db, 'resources', editingDocId), data);
      toast('Resource berhasil diperbarui.');
    } else {
      await addDoc(collection(db, 'resources'), data);
      toast('Resource berhasil disimpan ke Firestore.');
    }
    
    resetForm();
  } catch (err) {
    console.error('Save error:', err);
    toast('Gagal menyimpan resource. Cek console untuk detail.');
  } finally {
    setLoading(false);
  }
});

resourceTable.addEventListener('click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus resource ini?')) {
      try {
        await deleteDoc(doc(db, 'resources', docId));
        toast('Resource berhasil dihapus.');
      } catch (err) {
        console.error('Delete error:', err);
        toast('Gagal menghapus resource.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const resource = resources.find(r => r.docId === docId);
    if (resource) {
      resourceId.value = docId;
      resourceTitle.value = resource.title;
      resourceCategory.value = resource.category;
      resourceDescription.value = resource.description;
      resourceAuthor.value = resource.author;
      resourceDate.value = resource.date;
      resourceThumb.value = resource.thumbnail;
      resourceType.value = resource.type;
      resourceFile.value = resource.file;
      editingDocId = docId;
      if (submitButton) submitButton.textContent = 'Update Resource';
      resourceForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

adminSearch.addEventListener('input', () => render());
adminFilter.addEventListener('change', () => render());

const resourcesQuery = query(collection(db, 'resources'), orderBy('date', 'desc'));
onSnapshot(resourcesQuery, snapshot => {
  resources = snapshot.docs.map(doc => ({ 
    docId: doc.id,
    ...doc.data() 
  }));
  render();
}, err => {
  console.error('Firestore error:', err);
  toast('Gagal memuat resource dari Firebase.');
});