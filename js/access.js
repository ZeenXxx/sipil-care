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
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  ACADEMIC_SETTINGS_COLLECTION,
  ACADEMIC_SETTINGS_DOC,
  ADMIN_PRACTICUM_SCOPE_COLLECTION,
  PRACTICUM_ROSTER_COLLECTION,
  normalizeCohortYear,
  normalizeText,
  sameCohort,
  semesterAccessLabel,
  semesterForCohort,
  semesterForPracticumResource,
  targetCohortForPracticumResource
} from './academic-period.js?v=4';

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const ADMIN_SESSION_KEY = 'sipilcare_admin_session';
const ADMIN_PROFILE_KEY = 'sipilcare_admin_profile';
const ADMIN_SESSION_TTL = 30 * 60 * 1000;
const PRACTICUM_VIDEO_PROGRESS_COLLECTION = 'practicum_video_progress';
const VIDEO_PROGRESS_SAVE_INTERVAL_MS = 10000;
const VIDEO_PROGRESS_MIN_DELTA_SECONDS = 5;
const VIDEO_COMPLETE_RATIO = 0.95;
const params = new URLSearchParams(location.search);
const source = params.get('source') === 'practicum' ? 'practicum' : 'resources';
const adminPreviewRequested = source === 'practicum' && params.get('preview') === 'admin';
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
  copy: document.getElementById('copyAccessBtn'),
  back: document.querySelector('.actions a.btn.btn-ghost[href]'),
  videoPanel: document.getElementById('accessVideoPanel'),
  videoNote: document.getElementById('accessVideoNote'),
  videoPlayer: document.getElementById('accessVideoPlayer'),
  videoProgressLabel: document.getElementById('accessVideoProgressLabel'),
  videoProgressMeta: document.getElementById('accessVideoProgressMeta'),
  videoProgressBar: document.getElementById('accessVideoProgressBar')
};

let activeResource = null;
let activeVideoSource = null;
let currentAccessSession = null;
let viewLogged = false;
let videoPlayLogged = false;
let currentPracticumRosters = [];
let currentVideoProgress = null;
let lastVideoSaveAt = 0;
let lastSavedSeconds = -1;
let lastProgressFallbackLogAt = 0;
let youtubePollTimer = null;
let limitedVideoTimer = null;
let activePlayerCleanup = () => {};

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

const normalizeType = value => String(value || '').trim().toUpperCase();
const isPracticumVideo = resource => source === 'practicum' && normalizeType(resource?.type) === 'VIDEO';
const isAvailableFile = file => Boolean(file && file !== '#');

const formatSeconds = value => {
  const safe = Number.isFinite(Number(value)) ? Math.max(0, Math.floor(Number(value))) : 0;
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
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

const readAdminPreviewSession = () => {
  try {
    const rawSession = localStorage.getItem(ADMIN_SESSION_KEY);
    const rawProfile = localStorage.getItem(ADMIN_PROFILE_KEY);
    if (!rawSession || !rawProfile) return null;
    const adminSession = JSON.parse(rawSession);
    const profile = JSON.parse(rawProfile);
    if (!adminSession?.token || !adminSession?.username) return null;
    if (Date.now() - Number(adminSession.savedAt || 0) > ADMIN_SESSION_TTL) return null;
    const username = String(profile.username || adminSession.username || '').trim().toLowerCase();
    if (!username) return null;
    return {
      nim: `ADMIN-${username}`,
      name: profile.name || username,
      username,
      role: profile.role || '',
      roleLabel: profile.roleLabel || profile.role_label || profile.role || 'Admin',
      permissions: Array.isArray(profile.permissions) ? profile.permissions : [],
      practicumScopes: normalizeAdminPreviewScopes(profile.practicumScopes || profile.practicum_scopes || profile.practicum_scope),
      isAdminPreview: true
    };
  } catch {
    return null;
  }
};

const normalizeAdminPreviewScopes = value => {
  if (Array.isArray(value)) return value.map(item => String(item || '').trim()).filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(item => String(item || '').trim()).filter(Boolean);
    } catch {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const hydrateAdminPreviewSession = async session => {
  if (!session?.isAdminPreview || session.role === 'developer' || !session.username) return session;
  try {
    const scopeSnapshot = await getDoc(doc(db, ADMIN_PRACTICUM_SCOPE_COLLECTION, session.username));
    if (!scopeSnapshot.exists()) return session;
    const scopeData = scopeSnapshot.data();
    const scopes = normalizeAdminPreviewScopes(scopeData.scopes || scopeData.practicumScopes || scopeData.practicum_scopes);
    const hydrated = { ...session, practicumScopes: scopes };
    try {
      const profile = JSON.parse(localStorage.getItem(ADMIN_PROFILE_KEY) || '{}');
      localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify({
        ...profile,
        practicumScopes: scopes
      }));
    } catch {
      // Scope dari database tetap dipakai untuk preview saat ini.
    }
    return hydrated;
  } catch (error) {
    console.warn('Admin practicum scope load failed:', error);
    return session;
  }
};

const canAdminPreviewPracticumResource = (resource, session) => {
  if (!session?.isAdminPreview) return { allowed: false };
  if (session.role === 'developer') return { allowed: true };
  if (!session.permissions.includes('practicum_studio')) {
    return {
      allowed: false,
      title: 'Akses aslab tidak tersedia',
      description: 'Akun admin ini belum memiliki permission Praktikum & Studio.'
    };
  }
  const category = String(resource?.category || '').trim();
  const scopes = normalizeAdminPreviewScopes(session.practicumScopes);
  if (scopes.length && category && !scopes.includes(category)) {
    return {
      allowed: false,
      title: 'Scope praktikum tidak sesuai',
      description: `Akun ${session.roleLabel || 'admin'} tidak memiliki akses ke ${category}.`
    };
  }
  return { allowed: true };
};

const getHost = url => {
  try {
    return new URL(url).host;
  } catch {
    return '';
  }
};

const getContentType = resource => {
  if (isPracticumVideo(resource)) return 'practicum_video';
  if (source === 'practicum') return 'practicum';
  return resource?.category === 'Software' ? 'software' : 'resource';
};

const fileNameFromResource = resource => {
  const title = slugify(resource?.title || 'sipil-care-file');
  const type = String(resource?.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return type ? `${title}.${type}` : title;
};

const parseDriveFileId = value => {
  try {
    const url = new URL(value, location.href);
    const directId = url.searchParams.get('id');
    if (directId) return directId;
    const fileMatch = url.pathname.match(/\/file\/d\/([^/]+)/);
    if (fileMatch?.[1]) return fileMatch[1];
    const openMatch = url.pathname.match(/\/uc$/);
    if (openMatch && url.searchParams.get('export')) return directId;
    return '';
  } catch {
    return '';
  }
};

const driveDownloadUrl = id => `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`;
const drivePreviewUrl = id => `https://drive.google.com/file/d/${encodeURIComponent(id)}/preview`;

const parseYoutubeId = value => {
  try {
    const url = new URL(value, location.href);
    if (url.hostname.includes('youtu.be')) return url.pathname.replace(/^\/+/, '').split('/')[0] || '';
    if (url.searchParams.get('v')) return url.searchParams.get('v') || '';
    const embedMatch = url.pathname.match(/\/embed\/([^/?]+)/);
    if (embedMatch?.[1]) return embedMatch[1];
    const shortsMatch = url.pathname.match(/\/shorts\/([^/?]+)/);
    if (shortsMatch?.[1]) return shortsMatch[1];
    return '';
  } catch {
    return '';
  }
};

const isDirectVideoUrl = value => /\.(mp4|webm|ogg|mov|m4v)(\?|#|$)/i.test(String(value || ''));

const directDownloadUrl = (url, filename = '') => {
  const absolute = new URL(url, location.href);
  if (absolute.hostname === 'drive.google.com') {
    const id = parseDriveFileId(absolute.href);
    if (id) return driveDownloadUrl(id);
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

const loadAcademicSettings = async () => {
  if (source !== 'practicum') return {};
  const snapshot = await getDoc(doc(db, ACADEMIC_SETTINGS_COLLECTION, ACADEMIC_SETTINGS_DOC));
  return snapshot.exists() ? snapshot.data() : {};
};

const loadStudentPracticumRoster = async session => {
  if (source !== 'practicum' || !session?.nim) return [];
  const rosterQuery = query(collection(db, PRACTICUM_ROSTER_COLLECTION), where('nim', '==', session.nim));
  const snapshot = await getDocs(rosterQuery);
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() })).filter(item => item.isActive !== false);
};

const matchesPracticumRosterResource = (resource, roster) => {
  const resourceCategory = normalizeText(resource?.category);
  const resourceCourse = normalizeText(resource?.course || resource?.title);
  const rosterCategory = normalizeText(roster?.category);
  const rosterCourse = normalizeText(roster?.course);
  const studentTarget = targetCohortForPracticumResource(roster);
  const moduleTarget = targetCohortForPracticumResource(resource);
  const sameTarget = !moduleTarget || !studentTarget || sameCohort(moduleTarget, studentTarget);
  const sameYear = !resource?.academicYear || !roster?.academicYear || resource.academicYear === roster.academicYear;
  return sameTarget && sameYear && (resourceCategory === rosterCategory || resourceCourse.includes(rosterCourse));
};

const canAccessPracticumResource = (resource, session, settings, rosters = []) => {
  if (source !== 'practicum') return { allowed: true };
  const activeSemester = semesterForCohort(session?.angkatan, settings);
  const resourceSemester = semesterForPracticumResource(resource);
  const studentCohort = normalizeCohortYear(session?.angkatan);
  const targetCohort = targetCohortForPracticumResource(resource);
  const rosterAccess = rosters.some(roster => matchesPracticumRosterResource(resource, roster));

  if (!activeSemester) {
    return {
      allowed: false,
      title: 'Semester mahasiswa belum terdeteksi',
      description: 'Data angkatan pada akun kamu belum lengkap. Hubungi admin agar akun bisa diperbaiki.'
    };
  }

  if (!resourceSemester) {
    return {
      allowed: false,
      title: 'Semester modul belum terdeteksi',
      description: 'Modul ini belum punya kategori semester yang jelas. Hubungi admin agar kategori Praktikum & Studio diperbaiki.'
    };
  }

  if (targetCohort && !sameCohort(targetCohort, studentCohort) && !rosterAccess) {
    return {
      allowed: false,
      title: 'Modul tersedia untuk angkatan lain',
      description: `Modul ini ditujukan untuk angkatan ${targetCohort}. Akun kamu terdaftar sebagai angkatan ${studentCohort || '-'}.`
    };
  }

  if (!targetCohort && resourceSemester !== activeSemester && !rosterAccess) {
    return {
      allowed: false,
      title: 'Modul tidak tersedia untuk semester aktif',
      description: `Modul ini untuk semester ${resourceSemester}. ${semesterAccessLabel(activeSemester, session.angkatan, settings)}`
    };
  }

  return { allowed: true };
};

function resetVideoUi() {
  if (els.videoPanel) els.videoPanel.hidden = true;
  if (els.videoPlayer) els.videoPlayer.innerHTML = '';
  if (els.videoProgressLabel) els.videoProgressLabel.textContent = 'Belum mulai';
  if (els.videoProgressMeta) els.videoProgressMeta.textContent = '0:00 / 0:00';
  if (els.videoProgressBar) els.videoProgressBar.style.width = '0%';
  if (els.videoNote) {
    els.videoNote.textContent = 'Video diputar langsung di SIPIL CARE dan progres tontonan kamu akan dicatat otomatis.';
  }
  if (youtubePollTimer) {
    clearInterval(youtubePollTimer);
    youtubePollTimer = null;
  }
  if (limitedVideoTimer) {
    clearInterval(limitedVideoTimer);
    limitedVideoTimer = null;
  }
  activePlayerCleanup();
  activePlayerCleanup = () => {};
  activeVideoSource = null;
  currentVideoProgress = null;
  lastVideoSaveAt = 0;
  lastSavedSeconds = -1;
  videoPlayLogged = false;
}

function syncVideoProgressUi(currentSeconds = 0, durationSeconds = 0, completed = false, fallbackLabel = '') {
  if (!els.videoPanel || els.videoPanel.hidden) return;
  const duration = Number(durationSeconds || 0);
  const current = Math.max(0, Number(currentSeconds || 0));
  const percent = duration > 0
    ? Math.min(100, (current / duration) * 100)
    : current > 0
      ? Math.min(100, Math.max(8, (current / 600) * 100))
      : 0;
  const label = completed
    ? 'Selesai ditonton'
    : fallbackLabel || (current > 0 ? 'Sedang menonton' : 'Belum mulai');
  if (els.videoProgressLabel) els.videoProgressLabel.textContent = label;
  if (els.videoProgressMeta) {
    els.videoProgressMeta.textContent = duration > 0
      ? `${formatSeconds(current)} / ${formatSeconds(duration)}`
      : current > 0
        ? `Durasi buka ${formatSeconds(current)}`
        : '0:00';
  }
  if (els.videoProgressBar) els.videoProgressBar.style.width = `${percent}%`;
}

function resolveVideoSource(url) {
  const raw = String(url || '').trim();
  const youtubeId = parseYoutubeId(raw);
  if (youtubeId) {
    return {
      provider: 'YouTube',
      playerType: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}?enablejsapi=1&playsinline=1&rel=0`,
      openUrl: raw,
      downloadUrl: '',
      canDownload: false,
      trackingMode: 'detailed'
    };
  }

  const driveId = parseDriveFileId(raw);
  if (driveId) {
    return {
      provider: 'Google Drive',
      playerType: 'drive_iframe',
      directUrl: driveDownloadUrl(driveId),
      previewUrl: drivePreviewUrl(driveId),
      embedUrl: drivePreviewUrl(driveId),
      openUrl: raw,
      downloadUrl: driveDownloadUrl(driveId),
      canDownload: true,
      trackingMode: 'open_time'
    };
  }

  if (isDirectVideoUrl(raw)) {
    return {
      provider: getHost(raw) || 'Video langsung',
      playerType: 'html5',
      directUrl: raw,
      previewUrl: '',
      openUrl: raw,
      downloadUrl: raw,
      canDownload: true,
      trackingMode: 'detailed'
    };
  }

  if (/mega\.nz/i.test(raw)) {
    return {
      provider: 'MEGA',
      playerType: 'iframe',
      embedUrl: raw,
      openUrl: raw,
      downloadUrl: '',
      canDownload: false,
      trackingMode: 'open_only'
    };
  }

  return {
    provider: getHost(raw) || 'Video eksternal',
    playerType: 'iframe',
    embedUrl: raw,
    openUrl: raw,
    downloadUrl: '',
    canDownload: false,
    trackingMode: 'open_only'
  };
}

function videoProgressDocRef(session) {
  const resourceKey = String(activeResource?.id || resourceId || slugify(activeResource?.title || 'video')).replace(/[\\/]/g, '-');
  return doc(db, PRACTICUM_VIDEO_PROGRESS_COLLECTION, `${resourceKey}_${session.nim}`);
}

function videoProgressResourceKey() {
  return String(activeResource?.id || resourceId || slugify(activeResource?.title || 'video'));
}

function videoProgressStorageKey(session) {
  const resourceKey = videoProgressResourceKey().replace(/[\\/]/g, '-');
  return `sipilcare_video_progress_${resourceKey}_${session?.nim || 'guest'}`;
}

function readLocalVideoProgress(session) {
  try {
    const raw = localStorage.getItem(videoProgressStorageKey(session));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeLocalVideoProgress(session, payload) {
  try {
    localStorage.setItem(videoProgressStorageKey(session), JSON.stringify(payload));
  } catch {
    /* local cache optional */
  }
}

async function loadExistingVideoProgress(session) {
  if (!isPracticumVideo(activeResource) || !session?.nim) return null;
  const localProgress = readLocalVideoProgress(session);
  currentVideoProgress = localProgress || null;
  try {
    const snapshot = await getDoc(videoProgressDocRef(session));
    currentVideoProgress = snapshot.exists()
      ? { ...localProgress, ...snapshot.data() }
      : localProgress || null;
  } catch (error) {
    console.warn('Video progress cloud load failed, using local cache:', error);
  }
  if (!currentVideoProgress?.currentSeconds) {
    const fallbackProgress = await loadProgressFromAccessLogs(session).catch(error => {
      console.warn('Video progress fallback load failed:', error);
      return null;
    });
    if (fallbackProgress) currentVideoProgress = { ...localProgress, ...fallbackProgress };
  }
  return currentVideoProgress;
}

async function loadProgressFromAccessLogs(session) {
  const snapshot = await getDocs(query(collection(db, 'resource_access_logs'), where('nim', '==', session.nim)));
  const resourceKey = videoProgressResourceKey();
  const rows = snapshot.docs
    .map(item => item.data())
    .filter(item => item.action === 'video_progress')
    .filter(item => String(item.progressResourceId || item.resourceId || '') === resourceKey || String(item.progressResourceTitle || item.resourceTitle || '') === String(activeResource?.title || ''))
    .sort((a, b) => String(b.progressUpdatedAt || b.createdAt || '').localeCompare(String(a.progressUpdatedAt || a.createdAt || '')));
  const latest = rows[0];
  if (!latest) return null;
  return {
    resourceId: latest.progressResourceId || resourceKey,
    resourceTitle: latest.progressResourceTitle || activeResource?.title || '',
    category: latest.progressCategory || activeResource?.category || '',
    provider: latest.progressProvider || '',
    trackingMode: latest.progressTrackingMode || activeVideoSource?.trackingMode || 'detailed',
    currentSeconds: Number(latest.progressCurrentSeconds || 0),
    durationSeconds: Number(latest.progressDurationSeconds || 0),
    completed: Boolean(latest.progressCompleted),
    updatedAt: latest.progressUpdatedAt || latest.createdAt || ''
  };
}

function matchedStudentRoster(resource) {
  if (currentAccessSession?.isAdminPreview) return null;
  return currentPracticumRosters.find(roster => matchesPracticumRosterResource(resource, roster)) || null;
}

async function saveVideoProgress(session, {
  currentSeconds = 0,
  durationSeconds = 0,
  completed = false,
  lastAction = 'progress',
  trackingMode = activeVideoSource?.trackingMode || 'detailed'
} = {}) {
  if (!isPracticumVideo(activeResource) || !session?.nim) return;
  const nowIso = new Date().toISOString();
  const roster = matchedStudentRoster(activeResource);
  const safeDuration = Number(durationSeconds || 0);
  const safeCurrent = Math.max(0, Number(currentSeconds || 0));
  const percent = safeDuration > 0 ? Math.min(100, Math.round((safeCurrent / safeDuration) * 1000) / 10) : 0;
  const previous = currentVideoProgress || {};
  const payload = {
    resourceId: activeResource.id || resourceId || slugify(activeResource.title),
    resourceTitle: activeResource.title || '',
    category: activeResource.category || '',
    course: activeResource.course || activeResource.category || '',
    semester: Number(activeResource.semester || semesterForPracticumResource(activeResource) || 0) || null,
    targetAngkatan: targetCohortForPracticumResource(activeResource) || '',
    academicYear: activeResource.academicYear || '',
    type: activeResource.type || 'VIDEO',
    fileHost: getHost(activeResource.file || ''),
    provider: activeVideoSource?.provider || previous.provider || '',
    trackingMode,
    nim: session.nim,
    name: session.name || '',
    username: session.username || '',
    adminPreview: Boolean(session.isAdminPreview),
    roleLabel: session.roleLabel || '',
    angkatan: normalizeCohortYear(session.angkatan),
    className: session.isAdminPreview ? 'Admin preview' : roster?.className || previous.className || '',
    group: roster?.group || previous.group || '',
    currentSeconds: safeCurrent,
    durationSeconds: safeDuration || Number(previous.durationSeconds || 0),
    watchedPercent: safeDuration > 0 ? percent : Number(previous.watchedPercent || 0),
    completed: Boolean(completed || previous.completed),
    firstOpenedAt: previous.firstOpenedAt || nowIso,
    completedAt: completed ? nowIso : previous.completedAt || '',
    lastAction,
    updatedAt: nowIso,
    updatedAtServer: serverTimestamp()
  };
  currentVideoProgress = { ...previous, ...payload };
  writeLocalVideoProgress(session, currentVideoProgress);
  lastVideoSaveAt = Date.now();
  lastSavedSeconds = safeCurrent;
  try {
    await setDoc(videoProgressDocRef(session), payload, { merge: true });
  } catch (error) {
    console.warn('Video progress cloud save failed, writing fallback log:', error);
    await logVideoProgressFallback(payload, lastAction === 'opened_embed' || lastAction.includes('close') || lastAction.includes('hidden')).catch(logError => {
      console.warn('Video progress fallback log failed:', logError);
    });
  }
}

async function logVideoProgressFallback(payload, force = false) {
  const now = Date.now();
  if (!force && now - lastProgressFallbackLogAt < 30000) return;
  lastProgressFallbackLogAt = now;
  await logAccess('video_progress', {
    progressResourceId: payload.resourceId,
    progressResourceTitle: payload.resourceTitle,
    progressCategory: payload.category,
    progressProvider: payload.provider,
    progressTrackingMode: payload.trackingMode,
    progressCurrentSeconds: payload.currentSeconds,
    progressDurationSeconds: payload.durationSeconds,
    progressCompleted: payload.completed,
    progressClassName: payload.className,
    progressGroup: payload.group,
    progressUpdatedAt: payload.updatedAt
  });
}

async function maybeLogVideoPlay(session) {
  if (videoPlayLogged) return;
  videoPlayLogged = true;
  try {
    await logAccess('video_play');
  } catch (error) {
    console.warn('Video play log failed:', error);
  }
  try {
    await saveVideoProgress(session, { currentSeconds: currentVideoProgress?.currentSeconds || 0, durationSeconds: currentVideoProgress?.durationSeconds || 0, lastAction: 'play' });
  } catch (error) {
    console.warn('Video progress play save failed:', error);
  }
}

function needsProgressSave(currentSeconds) {
  const now = Date.now();
  if (lastSavedSeconds < 0) return true;
  return (now - lastVideoSaveAt) >= VIDEO_PROGRESS_SAVE_INTERVAL_MS
    && Math.abs(Number(currentSeconds || 0) - lastSavedSeconds) >= VIDEO_PROGRESS_MIN_DELTA_SECONDS;
}

let youtubeApiPromise;
function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise(resolve => {
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof previous === 'function') previous();
      resolve(window.YT);
    };
    const script = document.createElement('script');
    script.src = 'https://www.youtube.com/iframe_api';
    script.async = true;
    document.head.appendChild(script);
  });
  return youtubeApiPromise;
}

function renderIframeFallback(session, sourceInfo, note) {
  if (!els.videoPanel || !els.videoPlayer) return;
  els.videoPanel.hidden = false;
  els.videoNote.textContent = note;
  const canInlineFrame = /drive\.google\.com/i.test(String(sourceInfo.embedUrl || ''));
  els.videoPlayer.innerHTML = canInlineFrame
    ? `<iframe src="${escapeText(sourceInfo.embedUrl)}" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`
    : `<div class="access-video-fallback"><strong>Host video belum mendukung pemutaran internal penuh.</strong><p>${escapeText(note)}</p><div class="access-video-badges"><span class="badge">${escapeText(sourceInfo.provider)}</span><span class="badge">Tracking terbatas</span></div><div class="actions"><a class="btn btn-primary" href="${escapeText(sourceInfo.openUrl || activeResource?.file || '#')}" target="_blank" rel="noopener">Buka sumber video</a></div></div>`;
  syncVideoProgressUi(currentVideoProgress?.currentSeconds || 0, currentVideoProgress?.durationSeconds || 0, currentVideoProgress?.completed, canInlineFrame ? 'Dibuka di web' : 'Tracking terbatas');
  saveVideoProgress(session, {
    currentSeconds: currentVideoProgress?.currentSeconds || 0,
    durationSeconds: currentVideoProgress?.durationSeconds || 0,
    completed: currentVideoProgress?.completed || false,
    lastAction: 'opened_embed',
    trackingMode: canInlineFrame ? 'open_time' : sourceInfo.trackingMode || 'open_only'
  }).catch(error => console.warn('Fallback video progress save failed:', error));
  if (canInlineFrame) {
    startLimitedVideoTracking(session, sourceInfo);
  }
}

function stopLimitedVideoTracking() {
  if (!limitedVideoTimer) return;
  clearInterval(limitedVideoTimer);
  limitedVideoTimer = null;
}

function startLimitedVideoTracking(session, sourceInfo) {
  stopLimitedVideoTracking();
  let current = Math.max(0, Number(currentVideoProgress?.currentSeconds || 0));
  let lastTickAt = Date.now();
  let lastPersistAt = 0;
  syncVideoProgressUi(current, currentVideoProgress?.durationSeconds || 0, currentVideoProgress?.completed, 'Dibuka di web');

  const persist = (lastAction = 'open_time_progress', force = false) => {
    if (!force && Date.now() - lastPersistAt < VIDEO_PROGRESS_SAVE_INTERVAL_MS) return;
    lastPersistAt = Date.now();
    saveVideoProgress(session, {
      currentSeconds: current,
      durationSeconds: 0,
      completed: currentVideoProgress?.completed || false,
      lastAction,
      trackingMode: sourceInfo.trackingMode || 'open_time'
    }).catch(error => console.warn('Limited video progress save failed:', error));
  };

  persist('opened_embed', true);
  limitedVideoTimer = setInterval(() => {
    const now = Date.now();
    const elapsed = Math.max(0, Math.round((now - lastTickAt) / 1000));
    lastTickAt = now;
    if (document.visibilityState !== 'visible' || !els.videoPanel || els.videoPanel.hidden) return;
    current += elapsed;
    syncVideoProgressUi(current, 0, false, 'Dibuka di web');
    persist();
  }, 5000);

  const flushOnHide = () => {
    if (document.visibilityState === 'hidden') persist('open_time_hidden', true);
  };
  const flushOnClose = () => persist('open_time_close', true);
  document.addEventListener('visibilitychange', flushOnHide);
  window.addEventListener('pagehide', flushOnClose);
  activePlayerCleanup = () => {
    flushOnClose();
    document.removeEventListener('visibilitychange', flushOnHide);
    window.removeEventListener('pagehide', flushOnClose);
    stopLimitedVideoTracking();
  };
}

function mountHtml5Video(session, sourceInfo) {
  if (!els.videoPanel || !els.videoPlayer) return;
  const video = document.createElement('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  video.src = sourceInfo.directUrl;
  let restored = false;

  const saveSnapshot = async (lastAction, force = false, completed = false) => {
    const duration = Number(video.duration || currentVideoProgress?.durationSeconds || 0);
    const current = Number(video.currentTime || 0);
    syncVideoProgressUi(current, duration, completed || currentVideoProgress?.completed);
    if (!force && !needsProgressSave(current)) return;
    await saveVideoProgress(session, {
      currentSeconds: current,
      durationSeconds: duration,
      completed,
      lastAction
    });
  };

  video.addEventListener('loadedmetadata', async () => {
    const duration = Number(video.duration || 0);
    if (!restored && currentVideoProgress?.currentSeconds > 5 && currentVideoProgress.currentSeconds < Math.max(duration - 5, 5)) {
      restored = true;
      try {
        video.currentTime = currentVideoProgress.currentSeconds;
      } catch {
        restored = true;
      }
    }
    syncVideoProgressUi(video.currentTime || currentVideoProgress?.currentSeconds || 0, duration, currentVideoProgress?.completed);
    await saveVideoProgress(session, {
      currentSeconds: video.currentTime || currentVideoProgress?.currentSeconds || 0,
      durationSeconds: duration,
      completed: currentVideoProgress?.completed || false,
      lastAction: 'loadedmetadata'
    });
  });

  video.addEventListener('play', () => {
    maybeLogVideoPlay(session);
  });
  video.addEventListener('timeupdate', () => {
    const duration = Number(video.duration || 0);
    const current = Number(video.currentTime || 0);
    const completed = duration > 0 && (current / duration) >= VIDEO_COMPLETE_RATIO;
    syncVideoProgressUi(current, duration, completed);
    if (needsProgressSave(current)) {
      saveSnapshot('progress', false, completed).catch(error => console.warn('HTML5 progress save failed:', error));
    }
  });
  video.addEventListener('pause', () => {
    saveSnapshot('pause', true, false).catch(error => console.warn('HTML5 pause save failed:', error));
  });
  video.addEventListener('ended', () => {
    saveSnapshot('ended', true, true).catch(error => console.warn('HTML5 end save failed:', error));
  });
  video.addEventListener('error', () => {
    if (sourceInfo.previewUrl) {
      renderIframeFallback(session, { ...sourceInfo, embedUrl: sourceInfo.previewUrl }, 'Google Drive tetap ditampilkan di dalam SIPIL CARE, tetapi host ini tidak mengizinkan pelacakan menit tonton yang stabil.');
    } else {
      renderIframeFallback(session, sourceInfo, 'Link video ini belum mendukung player internal penuh. Admin tetap bisa melihat siapa yang membuka, tetapi progres menit tonton detail belum tersedia.');
    }
  });

  els.videoPlayer.innerHTML = '';
  els.videoPlayer.appendChild(video);
  els.videoPanel.hidden = false;
  els.videoNote.textContent = sourceInfo.provider === 'Google Drive'
    ? 'Video Google Drive dicoba diputar langsung di SIPIL CARE. Jika host membatasi stream, sistem akan otomatis pindah ke mode preview.'
    : 'Progress tonton dicatat otomatis selama video diputar di SIPIL CARE.';

  activePlayerCleanup = () => {
    video.pause();
    video.removeAttribute('src');
    video.load();
  };
}

async function mountYoutubeVideo(session, sourceInfo) {
  if (!els.videoPanel || !els.videoPlayer) return;
  els.videoPanel.hidden = false;
  els.videoNote.textContent = 'Video YouTube diputar di dalam SIPIL CARE. Progress tonton akan dicatat otomatis selama pemutaran berlangsung.';
  const playerId = `youtube-practicum-${Date.now()}`;
  els.videoPlayer.innerHTML = `<div id="${playerId}"></div>`;
  const YT = await loadYoutubeApi();
  let player;
  const saveCurrentYoutubeProgress = (lastAction = 'progress', force = false) => {
    if (!player?.getCurrentTime) return;
    const duration = Number(player.getDuration?.() || currentVideoProgress?.durationSeconds || 0);
    const current = Number(player.getCurrentTime?.() || currentVideoProgress?.currentSeconds || 0);
    const completed = duration > 0 && (current / duration) >= VIDEO_COMPLETE_RATIO;
    syncVideoProgressUi(current, duration, completed || currentVideoProgress?.completed);
    if (!force && !needsProgressSave(current)) return;
    saveVideoProgress(session, {
      currentSeconds: current,
      durationSeconds: duration,
      completed,
      lastAction
    }).catch(error => console.warn('YouTube progress save failed:', error));
  };
  const flushYoutubeProgress = () => saveCurrentYoutubeProgress('pagehide', true);
  const flushYoutubeProgressOnHidden = () => {
    if (document.visibilityState === 'hidden') flushYoutubeProgress();
  };

  player = new YT.Player(playerId, {
    width: '100%',
    height: '100%',
    videoId: parseYoutubeId(sourceInfo.openUrl),
    playerVars: {
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      origin: location.origin
    },
    events: {
      onReady: async () => {
        const duration = Number(player.getDuration() || 0);
        if (currentVideoProgress?.currentSeconds > 5 && currentVideoProgress.currentSeconds < Math.max(duration - 5, 5)) {
          player.seekTo(currentVideoProgress.currentSeconds, true);
        }
        syncVideoProgressUi(currentVideoProgress?.currentSeconds || 0, duration, currentVideoProgress?.completed);
        await saveVideoProgress(session, {
          currentSeconds: currentVideoProgress?.currentSeconds || 0,
          durationSeconds: duration,
          completed: currentVideoProgress?.completed || false,
          lastAction: 'ready'
        });
      },
      onStateChange: event => {
        const state = event.data;
        if (state === YT.PlayerState.PLAYING) {
          maybeLogVideoPlay(session);
          if (youtubePollTimer) clearInterval(youtubePollTimer);
          youtubePollTimer = setInterval(() => {
            saveCurrentYoutubeProgress('progress');
          }, 4000);
        } else if (state === YT.PlayerState.PAUSED) {
          if (youtubePollTimer) {
            clearInterval(youtubePollTimer);
            youtubePollTimer = null;
          }
          const duration = Number(player.getDuration() || 0);
          const current = Number(player.getCurrentTime() || 0);
          syncVideoProgressUi(current, duration, false);
          saveVideoProgress(session, {
            currentSeconds: current,
            durationSeconds: duration,
            completed: false,
            lastAction: 'pause'
          }).catch(error => console.warn('YouTube pause save failed:', error));
        } else if (state === YT.PlayerState.ENDED) {
          if (youtubePollTimer) {
            clearInterval(youtubePollTimer);
            youtubePollTimer = null;
          }
          const duration = Number(player.getDuration() || 0);
          syncVideoProgressUi(duration, duration, true);
          saveVideoProgress(session, {
            currentSeconds: duration,
            durationSeconds: duration,
            completed: true,
            lastAction: 'ended'
          }).catch(error => console.warn('YouTube ended save failed:', error));
        }
      }
    }
  });
  window.addEventListener('pagehide', flushYoutubeProgress);
  document.addEventListener('visibilitychange', flushYoutubeProgressOnHidden);

  activePlayerCleanup = () => {
    flushYoutubeProgress();
    window.removeEventListener('pagehide', flushYoutubeProgress);
    document.removeEventListener('visibilitychange', flushYoutubeProgressOnHidden);
    if (youtubePollTimer) {
      clearInterval(youtubePollTimer);
      youtubePollTimer = null;
    }
    try {
      player.destroy();
    } catch {
      /* noop */
    }
  };
}

async function setupVideoExperience(resource, session) {
  if (!isPracticumVideo(resource) || !isAvailableFile(resource.file)) {
    resetVideoUi();
    return;
  }
  await loadExistingVideoProgress(session);
  activeVideoSource = resolveVideoSource(resource.file);
  els.videoPanel.hidden = false;
  syncVideoProgressUi(currentVideoProgress?.currentSeconds || 0, currentVideoProgress?.durationSeconds || 0, currentVideoProgress?.completed);

  if (activeVideoSource.playerType === 'youtube') {
    await mountYoutubeVideo(session, activeVideoSource);
    return;
  }
  if (activeVideoSource.playerType === 'html5') {
    mountHtml5Video(session, activeVideoSource);
    return;
  }
  if (activeVideoSource.playerType === 'drive_iframe') {
    renderIframeFallback(session, activeVideoSource, 'Video Google Drive ditampilkan langsung di SIPIL CARE. Progress detail menit tonton dibatasi oleh Google Drive, tetapi status membuka video tetap dicatat.');
    return;
  }
  renderIframeFallback(session, activeVideoSource, 'Host video ini tetap ditampilkan di dalam SIPIL CARE, tetapi belum mengizinkan pembacaan menit tonton detail seperti video langsung atau YouTube.');
}

const renderResource = (resource, session = currentAccessSession || readStudentSession()) => {
  activeResource = resource;
  const title = resource.title || 'Resource SIPIL CARE';
  const meta = [
    resource.category,
    resource.type,
    resource.date,
    source === 'practicum' ? 'Praktikum & Studio' : 'Resources'
  ].filter(Boolean);
  const resourceIsVideo = isPracticumVideo(resource);

  els.status.textContent = resourceIsVideo ? 'Video siap diputar' : 'Siap dibuka';
  els.title.textContent = title;
  els.description.textContent = resource.description || 'File tersedia untuk mahasiswa yang sudah login.';
  els.meta.innerHTML = meta.map(item => `<span class="badge">${escapeText(item)}</span>`).join('');
  els.student.textContent = session?.isAdminPreview
    ? `${session.name || session.username} - Preview ${session.roleLabel || 'Admin'}`
    : session ? `${session.name || 'Mahasiswa'} - NIM ${session.nim}` : 'Belum login.';

  if (els.open) {
    els.open.disabled = !isAvailableFile(resource.file);
    els.open.textContent = resourceIsVideo ? 'Buka sumber asli' : 'Buka File';
  }
  if (els.download) {
    if (resourceIsVideo) {
      const sourceInfo = resolveVideoSource(resource.file);
      els.download.disabled = !sourceInfo.canDownload;
      els.download.textContent = 'Download Video';
      els.download.title = sourceInfo.canDownload
        ? ''
        : 'Download langsung hanya tersedia untuk video file langsung atau Google Drive publik.';
    } else {
      els.download.disabled = !isAvailableFile(resource.file);
      els.download.textContent = 'Download File';
      els.download.title = '';
    }
  }
  if (els.back) {
    els.back.href = source === 'practicum' ? 'praktikum-studio.html' : 'resources.html';
    els.back.textContent = source === 'practicum' ? 'Kembali ke Praktikum' : 'Kembali';
  }
};

const logAccess = async (action = 'download', extra = {}) => {
  const session = currentAccessSession || readStudentSession();
  if (!activeResource || !session) return;

  await addDoc(collection(db, 'resource_access_logs'), {
    action,
    actionLabel: action === 'view'
      ? 'View halaman akses'
      : action === 'video_play'
        ? 'Mulai memutar video'
        : action === 'video_progress'
          ? 'Progress video praktikum'
        : 'Download / buka file',
    nim: session.nim,
    name: session.name || '',
    username: session.username || '',
    adminPreview: Boolean(session.isAdminPreview),
    roleLabel: session.roleLabel || '',
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
    accessedAt: serverTimestamp(),
    ...extra
  });
};

const logViewOnce = () => {
  if (viewLogged) return;
  viewLogged = true;
  logAccess('view').catch(error => console.warn('Access view log failed:', error));
};

els.open?.addEventListener('click', async () => {
  if (!isAvailableFile(activeResource?.file)) return;
  const targetUrl = activeVideoSource?.openUrl || activeResource.file;
  els.open.disabled = true;
  els.open.textContent = 'Mencatat akses...';
  try {
    await logAccess(isPracticumVideo(activeResource) ? 'video_play' : 'download');
    window.open(targetUrl, '_blank', 'noopener');
    showToast(isPracticumVideo(activeResource) ? 'Sumber video dibuka di tab baru.' : 'File dibuka di tab baru.');
  } catch (error) {
    console.error('Access log failed:', error);
    showToast('Catatan akses gagal, file tetap dibuka.');
    window.open(targetUrl, '_blank', 'noopener');
  } finally {
    els.open.disabled = false;
    els.open.textContent = isPracticumVideo(activeResource) ? 'Buka sumber asli' : 'Buka File';
  }
});

els.download?.addEventListener('click', async () => {
  if (!isAvailableFile(activeResource?.file)) return;
  els.download.disabled = true;
  els.download.textContent = 'Menyiapkan download...';
  try {
    await logAccess('download');
    const downloadTarget = activeVideoSource?.downloadUrl || activeResource.file;
    if (downloadTarget) {
      await forceDownloadFile({ ...activeResource, file: downloadTarget });
      showToast('Download file dimulai.');
    } else {
      throw new Error('Host video ini belum menyediakan link download langsung.');
    }
  } catch (error) {
    console.error('Download log failed:', error);
    showToast(error.message || 'Download belum bisa dimulai.');
  } finally {
    els.download.disabled = !isPracticumVideo(activeResource) ? false : !Boolean(activeVideoSource?.canDownload);
    els.download.textContent = isPracticumVideo(activeResource) ? 'Download Video' : 'Download File';
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
  const studentSession = readStudentSession();
  const adminSession = source === 'practicum' ? readAdminPreviewSession() : null;
  const session = adminPreviewRequested ? adminSession : studentSession || adminSession;
  currentAccessSession = session;
  if (!session) {
    setState(
      'Login diperlukan',
      'Silakan login ulang',
      adminPreviewRequested
        ? 'Preview aslab hanya tersedia untuk admin yang sedang login.'
        : 'Akses file hanya tersedia untuk mahasiswa yang sudah login.'
    );
    return;
  }
  if (session.isAdminPreview) {
    currentAccessSession = await hydrateAdminPreviewSession(session);
  }
  els.student.textContent = session.isAdminPreview
    ? `${currentAccessSession.name || currentAccessSession.username} - Preview ${currentAccessSession.roleLabel || 'Admin'}`
    : `${session.name || 'Mahasiswa'} - NIM ${session.nim}`;

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
    const academicSettings = await loadAcademicSettings();
    const activeSession = currentAccessSession || session;
    currentPracticumRosters = activeSession.isAdminPreview ? [] : await loadStudentPracticumRoster(activeSession);
    const accessCheck = activeSession.isAdminPreview
      ? canAdminPreviewPracticumResource(resource, activeSession)
      : canAccessPracticumResource(resource, activeSession, academicSettings, currentPracticumRosters);
    if (!accessCheck.allowed) {
      setState('Akses semester dibatasi', accessCheck.title, accessCheck.description);
      return;
    }
    renderResource(resource, activeSession);
    logViewOnce();
    await setupVideoExperience(resource, activeSession).catch(error => {
      console.warn('Video setup failed:', error);
      if (isPracticumVideo(resource)) {
        activeVideoSource = resolveVideoSource(resource.file);
        renderIframeFallback(session, activeVideoSource, 'Video tetap bisa dibuka melalui SIPIL CARE. Jika player internal tidak muncul, pastikan file Google Drive sudah dibagikan untuk siapa saja yang memiliki link.');
      }
    });
  } catch (error) {
    console.error('Resource access load failed:', error);
    setState('Gagal memuat resource', 'Terjadi kesalahan akses', 'Coba refresh halaman atau hubungi admin HMS.');
  }
})();
