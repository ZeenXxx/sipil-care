import { app } from './firebase-config.js';
import { getFirestore, collection, doc, query, orderBy, where, onSnapshot, setDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  ACADEMIC_SETTINGS_COLLECTION,
  ACADEMIC_SETTINGS_DOC,
  PRACTICUM_ATTENDANCE_RECORD_COLLECTION,
  PRACTICUM_ATTENDANCE_SESSION_COLLECTION,
  PRACTICUM_COURSES,
  PRACTICUM_ROSTER_COLLECTION,
  academicPeriodLabel,
  courseCategory,
  courseKind,
  matchesPracticumCourse,
  normalizeText,
  resolveAcademicPeriod,
  semesterAccessLabel,
  semesterForCohort,
  slugifyAcademic
} from './academic-period.js?v=2';

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
let studentRosters = [];
let attendanceSessions = [];
let attendanceRecords = [];
let academicSettings = {};

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalize = normalizeText;
const slugify = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'module';
const accessId = item => encodeURIComponent(item.id || item.slug || slugify(item.title));
const accessUrl = item => `access.html?source=practicum&id=${accessId(item)}`;
const attendanceRecordId = (sessionId, nim) => `${sessionId}_${nim}`;
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

const session = readStudentSession();

function resourceCard(item) {
  const url = accessUrl(item);
  return `<article class="module-item"><strong>${escapeText(item.title)}</strong><p>${escapeText(item.description || 'Modul pembelajaran dari admin HMS/PENDPROF.')}</p><div class="meta"><span class="badge">${escapeText(item.type || 'PDF')}</span><span class="badge">${escapeText(item.date || 'Update')}</span></div><div class="actions"><a class="btn btn-primary" href="${url}">Akses Modul</a><button class="btn btn-ghost" data-access-url="${url}" type="button">Salin Link</button></div></article>`;
}

const rosterForCourse = course => studentRosters.filter(roster => roster.isActive !== false && matchesPracticumCourse(roster, course));
const sessionsForCourse = (course, rosters) => attendanceSessions.filter(sessionItem => sessionItem.status !== 'closed'
  && matchesPracticumCourse(sessionItem, course)
  && rosters.some(roster => (roster.classKey || slugifyAcademic(roster.className)) === (sessionItem.classKey || slugifyAcademic(sessionItem.className)) && roster.academicYear === sessionItem.academicYear));

const isSessionOpen = sessionItem => {
  if (sessionItem.status === 'closed') return false;
  const now = new Date();
  const open = new Date(`${sessionItem.date}T${sessionItem.openAt || '00:00'}`);
  const close = new Date(`${sessionItem.date}T${sessionItem.closeAt || '23:59'}`);
  return now >= open && now <= close;
};

const attendancePanel = (course, rosters) => {
  const sessions = sessionsForCourse(course, rosters);
  if (!rosters.length) return '';
  if (!sessions.length) {
    return `<div class="attendance-list"><article class="attendance-item"><strong>Absensi belum dibuka</strong><p>Data praktikan kamu sudah terdaftar untuk kelas ${escapeText(rosters.map(item => item.className).join(', '))}.</p></article></div>`;
  }

  const records = new Set(attendanceRecords.map(record => record.sessionId));
  return `<div class="attendance-list">${sessions.map(item => {
    const already = records.has(item.docId);
    const open = isSessionOpen(item);
    const disabled = already || !open ? 'disabled' : '';
    const status = already ? 'Sudah absen' : open ? 'Absen dibuka' : 'Belum waktunya / sudah tutup';
    return `<article class="attendance-item">
      <div>
        <strong>${escapeText(item.moduleNumber)} - ${escapeText(item.moduleTitle)}</strong>
        <p>Kelas ${escapeText(item.className)} &middot; ${escapeText(item.date)} &middot; ${escapeText(item.openAt)}-${escapeText(item.closeAt)}</p>
      </div>
      <button class="btn btn-primary" data-attendance-session="${escapeText(item.docId)}" type="button" ${disabled}>${escapeText(status)}</button>
    </article>`;
  }).join('')}</div>`;
};

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

function syncSemesterFilter(semesters, activeSemester) {
  if (!semesterFilter) return;
  const current = semesterFilter.value;
  semesterFilter.innerHTML = semesters.length
    ? '<option value="All">Semua akses saya</option>' + semesters.map(semester => `<option value="${semester}">Semester ${escapeText(semester)}${semester === activeSemester ? ' aktif' : ' tambahan'}</option>`).join('')
    : '<option value="">Semester belum terdeteksi</option>';
  semesterFilter.value = current === 'All' || semesters.map(String).includes(current) ? current : 'All';
}

function render() {
  const currentSession = readStudentSession();
  const activeSemester = semesterForCohort(currentSession?.angkatan, academicSettings);
  const academicPeriod = resolveAcademicPeriod(academicSettings);
  const q = normalize(search.value);
  const visibleCourses = courses.filter(course => course.semester === activeSemester || rosterForCourse(course).length);
  const semesters = [...new Set(visibleCourses.map(course => course.semester))].sort((a, b) => a - b);
  const selectedSemester = semesterFilter?.value || 'All';
  const hasConfiguredCourses = visibleCourses.length;

  syncSemesterFilter(semesters, activeSemester);
  semesterTabs.innerHTML = semesters.map(semester => `<a href="#semester-${semester}">Semester ${escapeText(semester)}${semester === activeSemester ? ' aktif' : ' tambahan'}</a>`).join('');

  if (!currentSession) {
    semesterGrid.innerHTML = '<div class="empty-state">Silakan login sebagai mahasiswa untuk melihat modul Praktikum &amp; Studio yang sesuai angkatan.</div>';
    return;
  }

  if (!hasConfiguredCourses) {
    semesterGrid.innerHTML = `<div class="empty-state"><strong>${escapeText(semesterAccessLabel(activeSemester, currentSession.angkatan, academicSettings))}</strong><p>Modul atau roster praktikum untuk akun kamu belum tersedia di SIPIL CARE.</p></div>`;
    return;
  }

  semesterGrid.innerHTML = `
    <div class="semester-access-note">
      <strong>${escapeText(semesterAccessLabel(activeSemester, currentSession.angkatan, academicSettings))}</strong>
      <span>${escapeText(academicPeriodLabel(academicPeriod))}${studentRosters.length ? ` &middot; ${studentRosters.length} roster praktikum` : ''}</span>
    </div>
  ` + semesters
    .filter(semester => selectedSemester === 'All' || Number(selectedSemester) === semester)
    .map(semester => {
      const semesterCourses = visibleCourses.filter(course => course.semester === semester);
      const cards = semesterCourses.map(course => {
        const courseRosters = rosterForCourse(course);
        const courseModules = modules.filter(item => matchesPracticumCourse(item, course)).filter(item => normalize([item.title, item.description, item.author, item.category, item.course].join(' ')).includes(q));
        return `<article class="course-card"><div class="course-top"><h3>${escapeText(course.title)}</h3><span class="course-type">${course.type}</span></div><p class="empty-module">${courseKind(course.type)} semester ${semester}${courseRosters.length ? ` &middot; Kelas ${escapeText(courseRosters.map(item => item.className).join(', '))}` : ''}</p>${attendancePanel(course, courseRosters)}<div class="module-list">${courseModules.length ? courseModules.map(resourceCard).join('') : '<p class="empty-module">Modul belum tersedia. Admin dapat upload modul Praktikum &amp; Studio dengan kategori ' + escapeText(courseCategory(course)) + '.</p>'}</div></article>`;
      }).join('');
      return `<section class="semester-block" id="semester-${semester}"><div class="semester-head"><h2>Semester ${semester}</h2><span>${semesterCourses.length} kategori praktikum/studio</span></div><div class="course-grid">${cards}</div></section>`;
    }).join('');
  bindCopyButtons();
  bindAttendanceButtons();
}

search.addEventListener('input', render);
semesterFilter.addEventListener('change', render);

function bindAttendanceButtons() {
  semesterGrid.querySelectorAll('[data-attendance-session]').forEach(button => {
    button.addEventListener('click', async () => {
      const sessionId = button.dataset.attendanceSession;
      const item = attendanceSessions.find(sessionItem => sessionItem.docId === sessionId);
      const currentSession = readStudentSession();
      if (!item || !currentSession) return;
      const roster = studentRosters.find(row => row.category === item.category
        && (row.classKey || slugifyAcademic(row.className)) === (item.classKey || slugifyAcademic(item.className))
        && row.academicYear === item.academicYear);
      if (!roster) {
        showToast('NIM kamu tidak ada di data praktikan kelas ini.');
        return;
      }
      if (!isSessionOpen(item)) {
        showToast('Sesi absen belum dibuka atau sudah ditutup.');
        return;
      }
      if (item.code) {
        const code = prompt('Masukkan kode absen dari aslab:');
        if (String(code || '').trim() !== String(item.code).trim()) {
          showToast('Kode absen salah.');
          return;
        }
      }

      try {
        button.disabled = true;
        await setDoc(doc(db, PRACTICUM_ATTENDANCE_RECORD_COLLECTION, attendanceRecordId(sessionId, currentSession.nim)), {
          sessionId,
          nim: currentSession.nim,
          name: currentSession.name || roster.name || '',
          angkatan: currentSession.angkatan || '',
          category: item.category,
          course: item.course,
          semester: item.semester,
          academicYear: item.academicYear,
          className: item.className,
          group: roster.group || '',
          moduleNumber: item.moduleNumber,
          moduleTitle: item.moduleTitle,
          status: 'present',
          attendedAt: new Date().toISOString(),
          page: location.pathname
        }, { merge: false });
        showToast('Absen berhasil dicatat.');
      } catch (error) {
        console.error('Submit attendance error:', error);
        showToast('Gagal mengirim absen. Coba refresh halaman.');
        button.disabled = false;
      }
    });
  });
}

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

if (session?.nim) {
  const rosterQuery = query(collection(db, PRACTICUM_ROSTER_COLLECTION), where('nim', '==', session.nim));
  onSnapshot(rosterQuery, snapshot => {
    studentRosters = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => item.isActive !== false);
    render();
  }, error => {
    console.error('Practicum roster failed:', error);
    studentRosters = [];
    render();
  });

  const recordQuery = query(collection(db, PRACTICUM_ATTENDANCE_RECORD_COLLECTION), where('nim', '==', session.nim));
  onSnapshot(recordQuery, snapshot => {
    attendanceRecords = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    render();
  }, error => {
    console.error('Attendance records failed:', error);
    attendanceRecords = [];
    render();
  });
}

const attendanceQuery = query(collection(db, PRACTICUM_ATTENDANCE_SESSION_COLLECTION), orderBy('date', 'desc'));
onSnapshot(attendanceQuery, snapshot => {
  attendanceSessions = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
  render();
}, error => {
  console.error('Attendance sessions failed:', error);
  attendanceSessions = [];
  render();
});

render();
