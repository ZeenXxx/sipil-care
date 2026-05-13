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

const softwareForm = document.getElementById('softwareForm');
const softwareTitle = document.getElementById('softwareTitle');
const softwareCategory = document.getElementById('softwareCategory');
const softwareDescription = document.getElementById('softwareDescription');
const softwareAuthor = document.getElementById('softwareAuthor');
const softwareDate = document.getElementById('softwareDate');
const softwareThumb = document.getElementById('softwareThumb');
const softwareFile = document.getElementById('softwareFile');
const softwareSearch = document.getElementById('softwareSearch');
const softwareFilter = document.getElementById('softwareFilter');
const softwareTable = document.getElementById('softwareTable');

const videoForm = document.getElementById('videoForm');
const videoTitle = document.getElementById('videoTitle');
const videoThumb = document.getElementById('videoThumb');
const videoDescription = document.getElementById('videoDescription');
const videoCategoryInput = document.getElementById('videoCategoryInput');
const videoChannel = document.getElementById('videoChannel');
const videoYoutube = document.getElementById('videoYoutube');
const videoSearch = document.getElementById('videoSearch');
const videoFilter = document.getElementById('videoFilter');
const videoTable = document.getElementById('videoTable');

const announcementForm = document.getElementById('announcementForm');
const announcementId = document.getElementById('announcementId');
const announcementPhotoUrl = document.getElementById('announcementPhotoUrl');
const announcementPhotoPath = document.getElementById('announcementPhotoPath');
const announcementTitle = document.getElementById('announcementTitle');
const announcementType = document.getElementById('announcementType');
const announcementDate = document.getElementById('announcementDate');
const announcementDescription = document.getElementById('announcementDescription');
const announcementImage = document.getElementById('announcementImage');
const announcementSearch = document.getElementById('announcementSearch');
const announcementFilter = document.getElementById('announcementFilter');
const announcementTable = document.getElementById('announcementTable');
const messageSearch = document.getElementById('messageSearch');
const messageFilter = document.getElementById('messageFilter');
const messageTable = document.getElementById('messageTable');
const liveChatSearch = document.getElementById('liveChatSearch');
const liveChatThreads = document.getElementById('liveChatThreads');

const resourceTable = document.getElementById('resourceTable');
const adminSearch = document.getElementById('adminSearch');
const adminFilter = document.getElementById('adminFilter');
const adminStats = document.getElementById('adminStats');
const toastEl = document.getElementById('toast');
const submitButton = resourceForm?.querySelector('button[type="submit"]');

let resources = [];
let videos = [];
let announcements = [];
let contactMessages = [];
let liveChatMessages = [];
let editingDocId = null;
let editingVideoDocId = null;
let editingSoftwareDocId = null;
let editingAnnouncementDocId = null;
let supabaseClient = null;
const ANNOUNCEMENT_BUCKET = 'sipilcare';

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const toast = message => {
  if (!toastEl) return;
  toastEl.textContent = message;
  toastEl.classList.add('show');
  setTimeout(() => toastEl.classList.remove('show'), 2800);
};

const setLoading = active => {
  if (submitButton) submitButton.disabled = active;
};

const isValidUrl = value => /^https?:\/\//i.test(value.trim());

async function loadSupabaseClient() {
  if (supabaseClient) return supabaseClient;

  const config = window.SIPILCARE_AUTH_CONFIG;
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    throw new Error('Konfigurasi Supabase belum tersedia.');
  }

  if (!window.supabase) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = resolve;
      script.onerror = () => reject(new Error('Gagal memuat Supabase client.'));
      document.head.appendChild(script);
    });
  }

  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
}

async function uploadAnnouncementPhoto(file) {
  if (!file) {
    return {
      photoUrl: announcementPhotoUrl.value,
      photoPath: announcementPhotoPath.value
    };
  }

  if (!file.type.startsWith('image/')) {
    throw new Error('File pemberitahuan harus berupa gambar.');
  }

  const supabase = await loadSupabaseClient();
  const ext = file.name.split('.').pop() || 'jpg';
  const id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const photoPath = `home/${Date.now()}-${id}.${ext}`;
  const { error } = await supabase.storage.from(ANNOUNCEMENT_BUCKET).upload(photoPath, file, {
    cacheControl: '3600',
    upsert: false
  });

  if (error) throw error;

  const { data } = supabase.storage.from(ANNOUNCEMENT_BUCKET).getPublicUrl(photoPath);
  return {
    photoUrl: data.publicUrl,
    photoPath
  };
}

function validateResourceForm() {
  if (!resourceTitle.value.trim() || !resourceDescription.value.trim() || !resourceAuthor.value.trim() || !resourceDate.value) {
    toast('Lengkapi Judul, Deskripsi, Author, dan Tanggal.');
    return false;
  }
  if (!resourceFile.value.trim() || !isValidUrl(resourceFile.value)) {
    toast('Masukkan link file resource yang valid (http/https).');
    return false;
  }
  return true;
}

function validateVideoForm() {
  if (!videoTitle.value.trim() || !videoDescription.value.trim() || !videoCategoryInput.value.trim() || !videoChannel.value.trim() || !videoYoutube.value.trim()) {
    toast('Lengkapi semua field video.');
    return false;
  }
  if (!isValidUrl(videoYoutube.value)) {
    toast('Link YouTube harus dimulai dengan http:// atau https://');
    return false;
  }
  return true;
}

function validateAnnouncementForm() {
  if (!announcementTitle.value.trim() || !announcementDescription.value.trim() || !announcementDate.value) {
    toast('Lengkapi judul, tanggal, dan isi pemberitahuan.');
    return false;
  }
  return true;
}

function stats() {
  const academicResources = resources.filter(r => r.category !== 'Software');
  const softwareResources = resources.filter(r => r.category === 'Software');
  adminStats.innerHTML = `
    <div class="admin-stat"><b>${academicResources.length}</b><span>Resource</span></div>
    <div class="admin-stat"><b>${softwareResources.length}</b><span>Software</span></div>
    <div class="admin-stat"><b>${videos.length}</b><span>Video</span></div>
    <div class="admin-stat"><b>${contactMessages.length}</b><span>Pesan Mahasiswa</span></div>
  `;
}

function filters() {
  adminFilter.innerHTML = '<option value="All">All</option>' +
    [...new Set(resources.filter(r => r.category !== 'Software').map(r => r.category))].map(c => `<option>${escapeText(c)}</option>`).join('');
}

function softwareFilters() {
  if (!softwareFilter) return;
  const softwareCats = [...new Set(resources.filter(r => r.category === 'Software').map(r => r.type || 'Software'))];
  softwareFilter.innerHTML = '<option value="All">All</option>' + softwareCats.map(c => `<option>${escapeText(c)}</option>`).join('');
}

function videoFilters() {
  if (!videoFilter) return;
  videoFilter.innerHTML = '<option value="All">All</option>' +
    [...new Set(videos.map(v => v.category))].map(c => `<option>${escapeText(c)}</option>`).join('');
}

function announcementFilters() {
  if (!announcementFilter) return;
  announcementFilter.innerHTML = '<option value="All">All</option>' +
    [...new Set(announcements.map(item => item.type || 'Pemberitahuan'))].map(c => `<option>${escapeText(c)}</option>`).join('');
}

function table() {
  const q = (adminSearch.value || '').toLowerCase();
  const cat = adminFilter.value || 'All';
  const rows = resources
    .filter(r => r.category !== 'Software')
    .filter(r => (cat === 'All' || r.category === cat) &&
      [r.title, r.category, r.description, r.author].join(' ').toLowerCase().includes(q))
    .map(r => `
      <tr>
        <td>${escapeText(r.title)}</td>
        <td>${escapeText(r.category)}</td>
        <td>${escapeText(r.type)}</td>
        <td>${escapeText(r.date)}</td>
        <td><button class="action-btn" data-edit="${r.docId}">Edit</button><button class="action-btn danger" data-del="${r.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  resourceTable.innerHTML = rows || '<tr><td colspan="5">Tidak ada resource.</td></tr>';
}

function softwareTableRender() {
  const q = (softwareSearch?.value || '').toLowerCase();
  const cat = softwareFilter?.value || 'All';
  const rows = resources
    .filter(r => r.category === 'Software')
    .filter(r => (cat === 'All' || (r.type || r.element || r.category) === cat) &&
      [r.title, (r.type || r.element || r.category), r.description, r.author].join(' ').toLowerCase().includes(q))
    .map(r => `
      <tr>
        <td>${escapeText(r.title)}</td>
        <td>${escapeText(r.category)}</td>
        <td>${escapeText(r.type || r.element || 'Software')}</td>
        <td>${escapeText(r.date)}</td>
        <td><button class="action-btn" data-edit="${r.docId}">Edit</button><button class="action-btn danger" data-del="${r.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (softwareTable) softwareTable.innerHTML = rows || '<tr><td colspan="5">Tidak ada software.</td></tr>';
}

function videoTableRender() {
  const q = (videoSearch?.value || '').toLowerCase();
  const cat = videoFilter?.value || 'All';
  const rows = videos
    .filter(v => (cat === 'All' || v.category === cat) &&
      [v.title, v.category, v.description].join(' ').toLowerCase().includes(q))
    .map(v => `
      <tr>
        <td>${escapeText(v.title)}</td>
        <td>${escapeText(v.category)}</td>
        <td>${escapeText(v.channel || v.duration || 'Channel')}</td>
        <td><button class="action-btn" data-edit="${v.docId}">Edit</button><button class="action-btn danger" data-del="${v.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (videoTable) videoTable.innerHTML = rows || '<tr><td colspan="4">Tidak ada video.</td></tr>';
}

function announcementTableRender() {
  const q = (announcementSearch?.value || '').toLowerCase();
  const type = announcementFilter?.value || 'All';
  const rows = announcements
    .filter(item => (type === 'All' || item.type === type) &&
      [item.title, item.type, item.description].join(' ').toLowerCase().includes(q))
    .map(item => `
      <tr>
        <td>${escapeText(item.title)}</td>
        <td>${escapeText(item.type)}</td>
        <td>${escapeText(item.date)}</td>
        <td>${item.photoUrl ? '<span class="badge">Ada foto</span>' : '<span class="badge">Tanpa foto</span>'}</td>
        <td><button class="action-btn" data-edit="${item.docId}">Edit</button><button class="action-btn danger" data-del="${item.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (announcementTable) announcementTable.innerHTML = rows || '<tr><td colspan="5">Belum ada pemberitahuan.</td></tr>';
}

function messageTableRender() {
  const q = (messageSearch?.value || '').toLowerCase();
  const status = messageFilter?.value || 'All';
  const rows = contactMessages
    .filter(item => (status === 'All' || item.status === status) &&
      [item.name, item.nim, item.email, item.category, item.subject, item.message, item.reply].join(' ').toLowerCase().includes(q))
    .map(item => `
      <tr>
        <td><b>${escapeText(item.name)}</b><br><span class="small-text">${escapeText(item.nim)} · ${escapeText(item.email)}</span></td>
        <td>${escapeText(item.category)}</td>
        <td>${escapeText(item.subject)}</td>
        <td class="message-preview">${escapeText(item.message)}${item.reply ? `<div class="message-reply">Balasan: ${escapeText(item.reply)}</div>` : ''}</td>
        <td><span class="badge">${item.status === 'answered' ? 'Sudah dibalas' : 'Belum dibalas'}</span></td>
        <td><button class="action-btn" data-reply-message="${item.docId}">Balas</button><button class="action-btn danger" data-del-message="${item.docId}">Delete</button></td>
      </tr>
    `)
    .join('');
  if (messageTable) messageTable.innerHTML = rows || '<tr><td colspan="6">Belum ada pesan mahasiswa.</td></tr>';
}

function liveChatRender() {
  if (!liveChatThreads) return;
  const q = (liveChatSearch?.value || '').toLowerCase();
  const grouped = liveChatMessages.reduce((acc, item) => {
    if (!acc[item.threadId]) acc[item.threadId] = [];
    acc[item.threadId].push(item);
    return acc;
  }, {});
  const threads = Object.entries(grouped)
    .map(([threadId, messages]) => ({
      threadId,
      messages: messages.sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))),
      latest: messages[messages.length - 1]
    }))
    .sort((a, b) => String(b.latest.createdAt).localeCompare(String(a.latest.createdAt)))
    .filter(thread => [thread.latest.senderName, thread.latest.nim, thread.latest.message, thread.threadId].join(' ').toLowerCase().includes(q));

  liveChatThreads.innerHTML = threads.map(thread => `
    <article class="chat-thread">
      <h4>${escapeText(thread.latest.senderName || 'Mahasiswa')} ${thread.latest.nim ? `(${escapeText(thread.latest.nim)})` : ''}</h4>
      <p><b>Pesan terbaru:</b> ${escapeText(thread.latest.message)}</p>
      <p><b>Jumlah chat:</b> ${thread.messages.length} · <b>Terakhir:</b> ${new Date(thread.latest.createdAt).toLocaleString('id-ID')}</p>
      <button class="action-btn" data-reply-chat="${escapeText(thread.threadId)}">Balas Chat</button>
      <button class="action-btn danger" data-close-chat="${escapeText(thread.threadId)}">Hapus Thread</button>
    </article>
  `).join('') || '<div class="empty">Belum ada live chat.</div>';
}

const render = () => {
  stats();
  filters();
  table();
  softwareFilters();
  softwareTableRender();
  videoFilters();
  videoTableRender();
  announcementFilters();
  announcementTableRender();
  messageTableRender();
  liveChatRender();
};

const resetForm = () => {
  resourceForm.reset();
  editingDocId = null;
  resourceId.value = '';
  if (submitButton) submitButton.textContent = 'Simpan Resource';
};

const resetSoftwareForm = () => {
  if (!softwareForm) return;
  softwareForm.reset();
  editingSoftwareDocId = null;
  const btn = softwareForm.querySelector('button[type="submit"]');
  if (btn) btn.textContent = 'Simpan Software';
};

const resetVideoForm = () => {
  videoForm.reset();
  editingVideoDocId = null;
};

const resetAnnouncementForm = () => {
  announcementForm.reset();
  announcementId.value = '';
  announcementPhotoUrl.value = '';
  announcementPhotoPath.value = '';
  editingAnnouncementDocId = null;
  const btn = announcementForm.querySelector('button[type="submit"]');
  if (btn) btn.textContent = 'Simpan Pemberitahuan';
};

resourceForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateResourceForm()) return;

  setLoading(true);

  try {
    const data = {
      title: resourceTitle.value.trim(),
      category: resourceCategory.value,
      description: resourceDescription.value.trim(),
      author: resourceAuthor.value.trim(),
      date: resourceDate.value,
      thumbnail: resourceThumb.value.trim() || resourceCategory.value.slice(0, 2).toUpperCase(),
      type: resourceType.value,
      file: resourceFile.value.trim()
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

softwareForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!softwareTitle.value.trim() || !softwareDescription.value.trim() || !softwareAuthor.value.trim() || !softwareDate.value) {
    toast('Lengkapi Judul, Deskripsi, Author, dan Tanggal.');
    return;
  }
  if (!softwareFile.value.trim() || !isValidUrl(softwareFile.value)) {
    toast('Masukkan link file software yang valid (http/https).');
    return;
  }

  setLoading(true);
  try {
    const data = {
      title: softwareTitle.value.trim(),
      category: 'Software',
      type: softwareCategory.value,
      element: softwareCategory.value,
      description: softwareDescription.value.trim(),
      author: softwareAuthor.value.trim(),
      date: softwareDate.value,
      thumbnail: softwareThumb.value.trim() || 'SW',
      file: softwareFile.value.trim()
    };

    if (editingSoftwareDocId) {
      await updateDoc(doc(db, 'resources', editingSoftwareDocId), data);
      toast('Software berhasil diperbarui.');
    } else {
      await addDoc(collection(db, 'resources'), data);
      toast('Software berhasil diupload.');
    }

    resetSoftwareForm();
  } catch (err) {
    console.error('Save software error:', err);
    toast('Gagal menyimpan software. Coba ulang kembali.');
  } finally {
    setLoading(false);
  }
});

videoForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateVideoForm()) return;

  setLoading(true);

  try {
    const data = {
      title: videoTitle.value.trim(),
      thumbnail: videoThumb.value.trim() || 'VI',
      description: videoDescription.value.trim(),
      category: videoCategoryInput.value.trim(),
      channel: videoChannel.value.trim(),
      duration: videoChannel.value.trim(),
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

announcementForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateAnnouncementForm()) return;

  const button = announcementForm.querySelector('button[type="submit"]');
  if (button) button.disabled = true;

  try {
    const uploaded = await uploadAnnouncementPhoto(announcementImage.files[0]);
    const data = {
      title: announcementTitle.value.trim(),
      type: announcementType.value,
      date: announcementDate.value,
      description: announcementDescription.value.trim(),
      photoUrl: uploaded.photoUrl || '',
      photoPath: uploaded.photoPath || '',
      updatedAt: new Date().toISOString()
    };

    if (editingAnnouncementDocId) {
      await updateDoc(doc(db, 'announcements', editingAnnouncementDocId), data);
      toast('Pemberitahuan berhasil diperbarui.');
    } else {
      await addDoc(collection(db, 'announcements'), {
        ...data,
        createdAt: new Date().toISOString()
      });
      toast('Pemberitahuan berhasil diupload.');
    }

    resetAnnouncementForm();
  } catch (err) {
    console.error('Save announcement error:', err);
    toast(err.message || 'Gagal menyimpan pemberitahuan.');
  } finally {
    if (button) button.disabled = false;
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
    if (resource && resource.category !== 'Software') {
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

softwareTable.addEventListener('click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus software ini?')) {
      try {
        await deleteDoc(doc(db, 'resources', docId));
        toast('Software berhasil dihapus.');
      } catch (err) {
        console.error('Delete software error:', err);
        toast('Gagal menghapus software.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const item = resources.find(r => r.docId === docId);
    if (item) {
      softwareTitle.value = item.title;
      softwareCategory.value = item.type || item.element || 'Struktur';
      softwareDescription.value = item.description;
      softwareAuthor.value = item.author;
      softwareDate.value = item.date;
      softwareThumb.value = item.thumbnail;
      softwareFile.value = item.file;
      editingSoftwareDocId = docId;
      softwareForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

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
      videoChannel.value = video.channel || video.duration || '';
      videoYoutube.value = video.youtube;
      editingVideoDocId = docId;
      videoForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

announcementTable.addEventListener('click', async e => {
  const docId = e.target.dataset.del || e.target.dataset.edit;
  if (!docId) return;

  if (e.target.dataset.del) {
    if (confirm('Yakin hapus pemberitahuan ini?')) {
      try {
        await deleteDoc(doc(db, 'announcements', docId));
        toast('Pemberitahuan berhasil dihapus.');
      } catch (err) {
        console.error('Delete announcement error:', err);
        toast('Gagal menghapus pemberitahuan.');
      }
    }
  }

  if (e.target.dataset.edit) {
    const item = announcements.find(announcement => announcement.docId === docId);
    if (item) {
      announcementId.value = docId;
      announcementTitle.value = item.title || '';
      announcementType.value = item.type || 'Info HMS';
      announcementDate.value = item.date || '';
      announcementDescription.value = item.description || '';
      announcementPhotoUrl.value = item.photoUrl || '';
      announcementPhotoPath.value = item.photoPath || '';
      editingAnnouncementDocId = docId;
      const btn = announcementForm.querySelector('button[type="submit"]');
      if (btn) btn.textContent = 'Update Pemberitahuan';
      announcementForm.scrollIntoView({ behavior: 'smooth' });
    }
  }
});

messageTable.addEventListener('click', async e => {
  const replyId = e.target.dataset.replyMessage;
  const deleteId = e.target.dataset.delMessage;

  if (replyId) {
    const item = contactMessages.find(message => message.docId === replyId);
    const reply = prompt(`Balasan untuk ${item?.name || 'mahasiswa'}:`, item?.reply || '');
    if (reply === null) return;
    try {
      await updateDoc(doc(db, 'contact_messages', replyId), {
        reply: reply.trim(),
        status: reply.trim() ? 'answered' : 'new',
        updatedAt: new Date().toISOString()
      });
      toast('Balasan pesan berhasil disimpan.');
    } catch (err) {
      console.error('Reply message error:', err);
      toast('Gagal menyimpan balasan.');
    }
  }

  if (deleteId && confirm('Yakin hapus pesan mahasiswa ini?')) {
    try {
      await deleteDoc(doc(db, 'contact_messages', deleteId));
      toast('Pesan berhasil dihapus.');
    } catch (err) {
      console.error('Delete message error:', err);
      toast('Gagal menghapus pesan.');
    }
  }
});

liveChatThreads.addEventListener('click', async e => {
  const replyThread = e.target.dataset.replyChat;
  const closeThread = e.target.dataset.closeChat;

  if (replyThread) {
    const reply = prompt('Balasan live chat dari HMS/PENDPROF:');
    if (!reply?.trim()) return;
    const latest = liveChatMessages.findLast ? liveChatMessages.findLast(item => item.threadId === replyThread) : [...liveChatMessages].reverse().find(item => item.threadId === replyThread);
    try {
      await addDoc(collection(db, 'live_chat_messages'), {
        threadId: replyThread,
        sender: 'admin',
        senderName: 'HMS / PENDPROF',
        nim: latest?.nim || '',
        message: reply.trim(),
        createdAt: new Date().toISOString()
      });
      toast('Balasan live chat terkirim.');
    } catch (err) {
      console.error('Reply chat error:', err);
      toast('Gagal mengirim balasan chat.');
    }
  }

  if (closeThread && confirm('Yakin hapus semua chat pada thread ini?')) {
    const items = liveChatMessages.filter(item => item.threadId === closeThread);
    try {
      await Promise.all(items.map(item => deleteDoc(doc(db, 'live_chat_messages', item.docId))));
      toast('Thread live chat berhasil dihapus.');
    } catch (err) {
      console.error('Delete chat thread error:', err);
      toast('Gagal menghapus thread live chat.');
    }
  }
});

adminSearch.addEventListener('input', () => render());
adminFilter.addEventListener('change', () => render());
softwareSearch.addEventListener('input', () => softwareTableRender());
softwareFilter.addEventListener('change', () => softwareTableRender());
videoSearch.addEventListener('input', () => videoTableRender());
videoFilter.addEventListener('change', () => videoTableRender());
announcementSearch.addEventListener('input', () => announcementTableRender());
announcementFilter.addEventListener('change', () => announcementTableRender());
messageSearch.addEventListener('input', () => messageTableRender());
messageFilter.addEventListener('change', () => messageTableRender());
liveChatSearch.addEventListener('input', () => liveChatRender());

const resourcesQuery = query(collection(db, 'resources'), orderBy('date', 'desc'));
onSnapshot(resourcesQuery, snapshot => {
  resources = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore error:', err);
  toast('Gagal memuat resource dari Firebase.');
});

const videosQuery = query(collection(db, 'videos'), orderBy('title'));
onSnapshot(videosQuery, snapshot => {
  videos = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore videos error:', err);
  toast('Gagal memuat video dari Firebase.');
});

const announcementsQuery = query(collection(db, 'announcements'), orderBy('date', 'desc'));
onSnapshot(announcementsQuery, snapshot => {
  announcements = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore announcements error:', err);
  toast('Gagal memuat pemberitahuan dari Firebase.');
});

const contactMessagesQuery = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
onSnapshot(contactMessagesQuery, snapshot => {
  contactMessages = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore contact messages error:', err);
  toast('Gagal memuat pesan mahasiswa.');
});

const liveChatQuery = query(collection(db, 'live_chat_messages'), orderBy('createdAt', 'desc'));
onSnapshot(liveChatQuery, snapshot => {
  liveChatMessages = snapshot.docs.map(documentSnapshot => ({
    docId: documentSnapshot.id,
    ...documentSnapshot.data()
  }));
  render();
}, err => {
  console.error('Firestore live chat error:', err);
  toast('Gagal memuat live chat.');
});
