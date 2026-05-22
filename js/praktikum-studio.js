import { app } from './firebase-config.js';
import { getFirestore, collection, doc, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  ACADEMIC_SETTINGS_COLLECTION,
  ACADEMIC_SETTINGS_DOC,
  PRACTICUM_COURSES,
  academicPeriodLabel,
  courseCategory,
  courseKind,
  matchesPracticumCourse,
  normalizeText,
  resolveAcademicPeriod,
  semesterAccessLabel,
  semesterForCohort
} from './academic-period.js?v=1';

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const search = document.getElementById('practicumSearch');
const semesterFilter = document.getElementById('semesterFilter');
const semesterTabs = document.getElementById('semesterTabs');
const semesterGrid = document.getElementById('semesterGrid');

const courses = PRACTICUM_COURSES;
const courseKeys = courses.map(item => item.title.toLowerCase());
let modules = [];
let academicSettings = {};

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalize = normalizeText;
const slugify = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'module';
const accessId = item => encodeURIComponent(item.id || item.slug || slugify(item.title));
const accessUrl = item => `access.html?source=practicum&id=${accessId(item)}`;
const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
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

function resourceCard(item) {
  const url = accessUrl(item);
  return `<article class="module-item"><strong>${escapeText(item.title)}</strong><p>${escapeText(item.description || 'Modul pembelajaran dari admin HMS/PENDPROF.')}</p><div class="meta"><span class="badge">${escapeText(item.type || 'PDF')}</span><span class="badge">${escapeText(item.date || 'Update')}</span></div><div class="actions"><a class="btn btn-primary" href="${url}">Akses Modul</a><button class="btn btn-ghost" data-access-url="${url}" type="button">Salin Link</button></div></article>`;
}

function bindCopyButtons() {
  semesterGrid.querySelectorAll('[data-access-url]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fullUrl = new URL(btn.dataset.accessUrl, location.href).href;
      try {
        await navigator.clipboard.writeText(fullUrl);
        showToast('Link SIPIL CARE berhasil disalin.');
      } catch {
        showToast('Tidak bisa menyalin otomatis. Salin link dari tombol Akses Modul.');
      }
    });
  });
}

function syncSemesterFilter(activeSemester) {
  if (!semesterFilter) return;
  const value = String(activeSemester || '');
  semesterFilter.innerHTML = activeSemester
    ? `<option value="${value}">Semester ${escapeText(activeSemester)} aktif</option>`
    : '<option value="">Semester belum terdeteksi</option>';
  semesterFilter.value = value;
}

function render() {
  const session = readStudentSession();
  const activeSemester = semesterForCohort(session?.angkatan, academicSettings);
  const academicPeriod = resolveAcademicPeriod(academicSettings);
  const q = normalize(search.value);
  const semesters = activeSemester ? [activeSemester] : [];
  const hasConfiguredCourses = courses.some(course => course.semester === activeSemester);

  syncSemesterFilter(activeSemester);
  semesterTabs.innerHTML = activeSemester
    ? `<a href="#semester-${activeSemester}">Semester ${escapeText(activeSemester)} aktif</a>`
    : '';

  if (!session) {
    semesterGrid.innerHTML = '<div class="empty-state">Silakan login sebagai mahasiswa untuk melihat modul Praktikum &amp; Studio yang sesuai angkatan.</div>';
    return;
  }

  if (!hasConfiguredCourses) {
    semesterGrid.innerHTML = `<div class="empty-state"><strong>${escapeText(semesterAccessLabel(activeSemester, session.angkatan, academicSettings))}</strong><p>Modul untuk semester ini belum tersedia di SIPIL CARE.</p></div>`;
    return;
  }

  semesterGrid.innerHTML = `
    <div class="semester-access-note">
      <strong>${escapeText(semesterAccessLabel(activeSemester, session.angkatan, academicSettings))}</strong>
      <span>${escapeText(academicPeriodLabel(academicPeriod))}</span>
    </div>
  ` + semesters
    .map(semester => {
      const semesterCourses = courses.filter(course => course.semester === semester);
      const cards = semesterCourses.map(course => {
        const courseModules = modules.filter(item => matchesPracticumCourse(item, course)).filter(item => normalize([item.title, item.description, item.author, item.category, item.course].join(' ')).includes(q));
        return `<article class="course-card"><div class="course-top"><h3>${escapeText(course.title)}</h3><span class="course-type">${course.type}</span></div><p class="empty-module">${courseKind(course.type)} semester ${semester}</p><div class="module-list">${courseModules.length ? courseModules.map(resourceCard).join('') : '<p class="empty-module">Modul belum tersedia. Admin dapat upload modul Praktikum &amp; Studio dengan kategori ' + escapeText(courseCategory(course)) + '.</p>'}</div></article>`;
      }).join('');
      return `<section class="semester-block" id="semester-${semester}"><div class="semester-head"><h2>Semester ${semester}</h2><span>${semesterCourses.length} kategori praktikum/studio</span></div><div class="course-grid">${cards}</div></section>`;
    }).join('');
  bindCopyButtons();
}

search.addEventListener('input', render);
semesterFilter.addEventListener('change', render);

const academicSettingsRef = doc(db, ACADEMIC_SETTINGS_COLLECTION, ACADEMIC_SETTINGS_DOC);
onSnapshot(academicSettingsRef, snapshot => {
  academicSettings = snapshot.exists() ? snapshot.data() : {};
  render();
}, error => {
  console.warn('Academic period settings failed:', error);
  academicSettings = {};
  render();
});

const modulesQuery = query(collection(db, 'practicum_studio_modules'), orderBy('date', 'desc'));
onSnapshot(modulesQuery, snapshot => {
  modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => courseKeys.some(key => normalize([item.category, item.course, item.title, item.type].join(' ')).includes(key)));
  render();
}, error => {
  console.error('Praktikum/studio resources failed:', error);
  modules = [];
  render();
});
render();
