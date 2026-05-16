import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const params = new URLSearchParams(location.search);
const source = params.get('source') === 'practicum' ? 'practicum' : 'resources';
const collectionName = source === 'practicum' ? 'practicum_studio_modules' : 'resources';
const resourceId = params.get('id') || '';

const els = {
  status: document.getElementById('accessStatus'),
  title: document.getElementById('accessTitle'),
  description: document.getElementById('accessDescription'),
  meta: document.getElementById('accessMeta'),
  student: document.getElementById('accessStudent'),
  open: document.getElementById('openResourceBtn'),
  download: document.getElementById('downloadResourceBtn'),
  copy: document.getElementById('copyAccessBtn')
};

let activeResource = null;
let viewLogged = false;

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const slugify = value => String(value || '')
  .toLowerCase()
  .normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '') || 'resource';

const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};

const setState = (status, title, description) => {
  els.status.textContent = status;
  els.title.textContent = title;
  els.description.textContent = description;
};

const readStudentSession = () => {
  try {
    const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.nim || !session?.lastSeenAt) return null;
    if (Date.now() - session.lastSeenAt > SESSION_TTL) return null;
    return session;
  } catch {
    return null;
  }
};

const getHost = url => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

const getContentType = resource => {
  if (source === 'practicum') return 'practicum';
  return resource?.category === 'Software' ? 'software' : 'resource';
};

const fileNameFromResource = resource => {
  const title = slugify(resource?.title || 'sipil-care-file');
  const type = String(resource?.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return type ? `${title}.${type}` : title;
};

const isAvailableFile = file => Boolean(file && file !== '#');

const directDownloadUrl = (url, filename = '') => {
  const absolute = new URL(url, location.href);
  if (absolute.hostname === 'drive.google.com') {
    const fileMatch = absolute.pathname.match(/\/file\/d\/([^/]+)/);
    const id = fileMatch?.[1] || absolute.searchParams.get('id');
    if (id) return `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
  }
  if (absolute.hostname === 'github.com' && absolute.pathname.includes('/blob/')) {
    absolute.hostname = 'raw.githubusercontent.com';
    absolute.pathname = absolute.pathname.replace('/blob/', '/');
  }
  if (absolute.hostname.endsWith('firebasestorage.app') || absolute.hostname === 'firebasestorage.googleapis.com') {
    absolute.searchParams.set('alt', 'media');
    if (filename) absolute.searchParams.set('response-content-disposition', `attachment; filename="${filename}"`);
  }
  if (absolute.hostname.includes('supabase.co') && absolute.pathname.includes('/storage/v1/object/public/')) {
    if (filename) absolute.searchParams.set('download', filename);
  }
  return absolute.href;
};

const triggerDownload = (url, filename) => {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
};

const forceDownloadFile = async resource => {
  if (!isAvailableFile(resource?.file)) throw new Error('File belum tersedia.');

  const filename = fileNameFromResource(resource);
  const url = directDownloadUrl(resource.file, filename);
  const target = new URL(url, location.href);
  const sameOrigin = target.origin === location.origin;

  if (!sameOrigin) {
    triggerDownload(target.href, filename);
    return;
  }

  try {
    const response = await fetch(target.href, {
      credentials: 'same-origin',
      cache: 'no-store'
    });
    if (!response.ok) throw new Error(`Download gagal (${response.status}).`);

    const blob = await response.blob();
    if (!blob.size) throw new Error('File kosong atau tidak bisa dibaca.');

    const objectUrl = URL.createObjectURL(blob);
    triggerDownload(objectUrl, filename);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 30000);
  } catch (error) {
    console.warn('Blob download failed, falling back to direct link:', error);
    triggerDownload(target.href, filename);
  }
};

const loadFromJson = async id => {
  if (source !== 'resources') return null;
  const response = await fetch('../data/resources.json');
  if (!response.ok) return null;
  const data = await response.json();
  return data.find(item => slugify(item.title) === id || String(item.id) === String(id)) || null;
};

const loadResource = async id => {
  if (!id) return null;

  const direct = await getDoc(doc(db, collectionName, id));
  if (direct.exists()) return { id: direct.id, ...direct.data() };

  const bySlug = query(collection(db, collectionName), where('slug', '==', id));
  const slugSnapshot = await getDocs(bySlug);
  if (!slugSnapshot.empty) {
    const found = slugSnapshot.docs[0];
    return { id: found.id, ...found.data() };
  }

  return loadFromJson(id);
};

const renderResource = resource => {
  activeResource = resource;
  const session = readStudentSession();
  const title = resource.title || 'Resource SIPIL CARE';
  const meta = [
    resource.category,
    resource.type,
    resource.date,
    source === 'practicum' ? 'Praktikum & Studio' : 'Resources'
  ].filter(Boolean);

  els.status.textContent = 'Siap dibuka';
  els.title.textContent = title;
  els.description.textContent = resource.description || 'File tersedia untuk mahasiswa yang sudah login.';
  els.meta.innerHTML = meta.map(item => `<span class="badge">${escapeText(item)}</span>`).join('');
  els.student.textContent = session ? `${session.name || 'Mahasiswa'} - NIM ${session.nim}` : 'Belum login.';
  els.open.disabled = !isAvailableFile(resource.file);
  if (els.download) els.download.disabled = !isAvailableFile(resource.file);
};

const logAccess = async (action = 'download') => {
  const session = readStudentSession();
  if (!activeResource || !session) return;

  await addDoc(collection(db, 'resource_access_logs'), {
    action,
    actionLabel: action === 'view' ? 'View halaman akses' : 'Download / buka file',
    nim: session.nim,
    name: session.name || '',
    resourceId: activeResource.id || resourceId || slugify(activeResource.title),
    resourceTitle: activeResource.title || '',
    category: activeResource.category || '',
    type: activeResource.type || '',
    contentType: getContentType(activeResource),
    source,
    fileHost: getHost(activeResource.file),
    page: location.pathname + location.search,
    userAgent: navigator.userAgent.slice(0, 240),
    createdAt: new Date().toISOString(),
    accessedAt: serverTimestamp()
  });
};

const logViewOnce = () => {
  if (viewLogged) return;
  viewLogged = true;
  logAccess('view').catch(error => console.warn('Access view log failed:', error));
};

els.open?.addEventListener('click', async () => {
  if (!isAvailableFile(activeResource?.file)) return;
  els.open.disabled = true;
  els.open.textContent = 'Mencatat akses...';
  try {
    await logAccess('download');
    window.open(activeResource.file, '_blank', 'noopener');
    showToast('File dibuka di tab baru.');
  } catch (error) {
    console.error('Access log failed:', error);
    showToast('Catatan akses gagal, file tetap dibuka.');
    window.open(activeResource.file, '_blank', 'noopener');
  } finally {
    els.open.disabled = false;
    els.open.textContent = 'Buka File';
  }
});

els.download?.addEventListener('click', async () => {
  if (!isAvailableFile(activeResource?.file)) return;
  els.download.disabled = true;
  els.download.textContent = 'Menyiapkan download...';
  try {
    await logAccess('download');
    await forceDownloadFile(activeResource);
    showToast('Download file dimulai.');
  } catch (error) {
    console.error('Download log failed:', error);
    showToast(error.message || 'Download belum bisa dimulai.');
  } finally {
    els.download.disabled = false;
    els.download.textContent = 'Download File';
  }
});

els.copy?.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('Link SIPIL CARE berhasil disalin.');
  } catch {
    showToast('Tidak bisa menyalin otomatis. Salin URL dari address bar.');
  }
});

(async () => {
  const session = readStudentSession();
  if (!session) {
    setState('Login diperlukan', 'Silakan login ulang', 'Akses file hanya tersedia untuk mahasiswa yang sudah login.');
    return;
  }
  els.student.textContent = `${session.name || 'Mahasiswa'} - NIM ${session.nim}`;

  if (!resourceId) {
    setState('Resource tidak valid', 'ID resource tidak ditemukan', 'Gunakan link dari tombol Salin Link SIPIL CARE pada halaman resource.');
    return;
  }

  try {
    const resource = await loadResource(resourceId);
    if (!resource) {
      setState('Resource tidak ditemukan', 'File belum tersedia', 'Resource mungkin sudah dihapus atau link tidak lengkap.');
      return;
    }
    renderResource(resource);
    logViewOnce();
  } catch (error) {
    console.error('Resource access load failed:', error);
    setState('Gagal memuat resource', 'Terjadi kesalahan akses', 'Coba refresh halaman atau hubungi admin HMS.');
  }
})();
