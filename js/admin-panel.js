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
const videoTable = document.getElementById('videoTable');
const adminSearch = document.getElementById('adminSearch');
const adminFilter = document.getElementById('adminFilter');
const videoSearch = document.getElementById('videoSearch');
const videoFilter = document.getElementById('videoFilter');
const adminStats = document.getElementById('adminStats');
const toastEl = document.getElementById('toast');
const submitButton = resourceForm?.querySelector('button[type="submit"]');
let resources = [];
let videos = [];
let editingDocId = null;
let editingVideoDocId = null;

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
    <div class="admin-stat"><b>${videos.length}</b><span>Video</span></div>
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

function videoTableRender() {
  const q = (videoSearch?.value || '').toLowerCase();
  const cat = videoFilter?.value || 'All';
  const rows = videos
    .filter(v => (cat === 'All' || v.category === cat) &&
      [v.title, v.category, v.description].join(' ').toLowerCase().includes(q))
    .map(v => `
      <tr>
        <td>${v.title}</td>
        <td>${v.category}</td>
        <td>${v.duration}</td>
        <td><button class="action-btn" data-edit="${v.docId}">Edit</button><button class="action-btn danger" data-del="${v.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (videoTable) videoTable.innerHTML = rows || '<tr><td colspan="4">Tidak ada video.</td></tr>';
}

function videoFilters() {
  if (videoFilter) {
    videoFilter.innerHTML = '<option value="All">All</option>' +
      [...new Set(videos.map(v => v.category))].map(c => `<option>${c}</option>`).join('');
  }
}

const render = () => {
  stats();
  filters();
  table();
  videoFilters();
  videoTableRender();
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
  const type = resourceType.value;

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
      toast('Resource berhasil diupload.');
    }
    
    resetForm();
  } catch (err) {
    console.error('Save error:', err);
    toast('Gagal menyimpan resource. Coba ulang kembali.');
  } finally {
    setLoading(false);
  }
});

const validateVideoForm = () => {
  if (!videoTitle.value.trim() || !videoDescription.value.trim() || !videoCategoryInput.value.trim() || !videoDuration.value.trim() || !videoYoutube.value.trim()) {
    toast('Lengkapi semua field video.');
    return false;
  }
  if (!/^https?:\/\//i.test(videoYoutube.value.trim())) {
    toast('Link YouTube harus dimulai dengan http:// atau https://');
    return false;
  }
  return true;
};

const resetVideoForm = () => {
  videoForm.reset();
  editingVideoDocId = null;
};

videoForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateVideoForm()) return;

  setLoading(true);

  try {
    const data = {
      title: videoTitle.value.trim(),
      thumbnail: videoThumb.value.trim() || '🎥',
      description: videoDescription.value.trim(),
      category: videoCategoryInput.value.trim(),
      duration: videoDuration.value.trim(),
      youtube: videoYoutube.value.trim()
    };

    if (editingVideoDocId) {
      await updateDoc(doc(db, 'videos', editingVideoDocId), data);
      toast('Video berhasil diperbarui.');
    } else {
      await addDoc(collection(db, 'videos'), data);
      toast('Video berhasil diupload.');
    }
    
    resetVideoForm();
  } catch (err) {
    console.error('Save video error:', err);
    toast('Gagal menyimpan video. Coba ulang kembali.');
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

if (videoTable) {
  videoTable.addEventListener('click', async e => {
    const docId = e.target.dataset.del || e.target.dataset.edit;
    if (!docId) return;

    if (e.target.dataset.del) {
      if (confirm('Yakin hapus video ini?')) {
        try {
          await deleteDoc(doc(db, 'videos', docId));
          toast('Video berhasil dihapus.');
        } catch (err) {
          console.error('Delete video error:', err);
          toast('Gagal menghapus video.');
        }
      }
    }

    if (e.target.dataset.edit) {
      const video = videos.find(v => v.docId === docId);
      if (video) {
        videoTitle.value = video.title;
        videoThumb.value = video.thumbnail;
        videoDescription.value = video.description;
        videoCategoryInput.value = video.category;
        videoDuration.value = video.duration;
        videoYoutube.value = video.youtube;
        editingVideoDocId = docId;
        videoForm.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

adminSearch.addEventListener('input', () => render());
adminFilter.addEventListener('change', () => render());

if (videoSearch) videoSearch.addEventListener('input', () => videoTableRender());
if (videoFilter) videoFilter.addEventListener('change', () => videoTableRender());

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

const videosQuery = query(collection(db, 'videos'), orderBy('title'));
onSnapshot(videosQuery, snapshot => {
  videos = snapshot.docs.map(doc => ({ 
    docId: doc.id,
    ...doc.data() 
  }));
  render();
}, err => {
  console.error('Firestore videos error:', err);
  toast('Gagal memuat video dari Firebase.');
});