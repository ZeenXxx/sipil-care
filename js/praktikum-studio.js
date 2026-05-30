import { app } from './firebase-config.js';
import { getFirestore, collection, doc, query, orderBy, where, onSnapshot, setDoc, getDocs } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
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
  normalizeCohortYear,
  normalizeText,
  resolveAcademicPeriod,
  sameCohort,
  semesterAccessLabel,
  semesterForCohort,
  slugifyAcademic,
  targetCohortForPracticumResource
} from './academic-period.js?v=4';

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const SESSION_TTL = 24 * 60 * 60 * 1000;
const search = document.getElementById('practicumSearch');
const semesterFilter = document.getElementById('semesterFilter');
const semesterTabs = document.getElementById('semesterTabs');
const semesterGrid = document.getElementById('semesterGrid');
const BOOKMARK_KEY = 'sipilcare_student_bookmarks';

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
const accessUrl = item => `access?source=practicum&id=${accessId(item)}`;
const attendanceRecordId = (sessionId, nim) => `${sessionId}_${nim}`;
const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
};
const normalizeAttendanceCode = value => String(value || '').trim().toUpperCase();

function ensureAttendanceCodeDialog() {
  let dialog = document.getElementById('attendanceCodeDialog');
  if (dialog) return dialog;

  dialog = document.createElement('div');
  dialog.id = 'attendanceCodeDialog';
  dialog.className = 'attendance-code-dialog';
  dialog.hidden = true;
  dialog.innerHTML = `
    <div class="attendance-code-backdrop" data-attendance-code-cancel></div>
    <form class="attendance-code-card" autocomplete="off">
      <span class="eyebrow">Kode Absensi</span>
      <h2>Masukkan kode dari aslab</h2>
      <p data-attendance-code-detail>Pastikan kode sesuai dengan sesi praktikum yang sedang dibuka.</p>
      <input class="control" name="attendanceCode" type="text" inputmode="text" autocomplete="one-time-code" autocapitalize="none" spellcheck="false" placeholder="Ketik kode absen" required>
      <small data-attendance-code-error></small>
      <div class="attendance-code-actions">
        <button class="btn btn-primary" type="submit">Kirim Absen</button>
        <button class="btn btn-ghost" type="button" data-attendance-code-cancel>Batal</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);
  return dialog;
}

function requestAttendanceCode(sessionItem) {
  return new Promise(resolve => {
    const dialog = ensureAttendanceCodeDialog();
    const form = dialog.querySelector('form');
    const input = dialog.querySelector('[name="attendanceCode"]');
    const error = dialog.querySelector('[data-attendance-code-error]');
    const detail = dialog.querySelector('[data-attendance-code-detail]');
    const expectedCode = normalizeAttendanceCode(sessionItem.code);
    let settled = false;

    const close = result => {
      if (settled) return;
      settled = true;
      dialog.hidden = true;
      document.body.classList.remove('attendance-code-open');
      form.onsubmit = null;
      dialog.querySelectorAll('[data-attendance-code-cancel]').forEach(button => {
        button.onclick = null;
      });
      resolve(result);
    };

    detail.textContent = `${sessionItem.moduleNumber || 'Sesi'} - ${sessionItem.moduleTitle || 'Praktikum'} - Kelas ${sessionItem.className || '-'}`;
    input.value = '';
    error.textContent = '';
    dialog.hidden = false;
    document.body.classList.add('attendance-code-open');
    window.setTimeout(() => input.focus(), 80);

    form.onsubmit = event => {
      event.preventDefault();
      const enteredCode = normalizeAttendanceCode(input.value);
      if (enteredCode !== expectedCode) {
        error.textContent = 'Kode salah. Silakan ketik ulang kode yang benar.';
        input.value = '';
        window.setTimeout(() => input.focus(), 50);
        showToast('Kode absen salah. Masukkan ulang kode yang benar.');
        return;
      }
      close(true);
    };

    dialog.querySelectorAll('[data-attendance-code-cancel]').forEach(button => {
      button.onclick = () => close(false);
    });
  });
}
const readBookmarks = () => {
  try { return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]'); } catch { return []; }
};
const writeBookmarks = items => localStorage.setItem(BOOKMARK_KEY, JSON.stringify(items.slice(0, 100)));
const bookmarkId = item => `practicum:${item.id || item.slug || slugify(item.title)}`;
const isBookmarked = item => readBookmarks().some(saved => saved.id === bookmarkId(item));
const toggleBookmark = item => {
  const id = bookmarkId(item);
  const saved = readBookmarks();
  const exists = saved.some(row => row.id === id);
  const next = exists
    ? saved.filter(row => row.id !== id)
    : [{ id, type: 'Praktikum & Studio', title: item.title, category: item.category, url: accessUrl(item), savedAt: new Date().toISOString() }, ...saved];
  writeBookmarks(next);
  showToast(exists ? 'Modul dihapus dari simpanan.' : 'Modul disimpan.');
  render();
};

const readStudentSession = () => {
  try {
    if (window.SIPILCARE_STUDENT_REVIEW?.nim) return window.SIPILCARE_STUDENT_REVIEW;
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

const studentCohort = currentSession => normalizeCohortYear(currentSession?.angkatan);
const resourceTargetCohort = item => targetCohortForPracticumResource(item);
const sameTarget = (left, right) => {
  const leftTarget = resourceTargetCohort(left);
  const rightTarget = resourceTargetCohort(right);
  return !leftTarget || !rightTarget || sameCohort(leftTarget, rightTarget);
};
const hasRosterAccess = (item, rosters) => rosters.some(roster => normalize(roster.category) === normalize(item.category)
  && sameTarget(item, roster)
  && (!item.academicYear || !roster.academicYear || item.academicYear === roster.academicYear));

const canStudentSeeModule = (item, currentSession, activeSemester, rosters) => {
  const target = resourceTargetCohort(item);
  const cohort = studentCohort(currentSession);
  if (target) return sameCohort(target, cohort) || hasRosterAccess(item, rosters);
  return Number(item.semester) === Number(activeSemester) || hasRosterAccess(item, rosters);
};

function resourceCard(item) {
  const url = accessUrl(item);
  return `<article class="module-item"><strong>${escapeText(item.title)}</strong><p>${escapeText(item.description || 'Modul pembelajaran dari admin HMS/PENDPROF.')}</p><div class="meta"><span class="badge">${escapeText(item.type || 'PDF')}</span><span class="badge">${escapeText(item.date || 'Update')}</span></div><div class="actions"><a class="btn btn-primary" href="${url}">Akses Modul</a><button class="btn btn-ghost" data-access-url="${url}" type="button">Salin Link</button><button class="btn btn-ghost" data-bookmark-practicum="${escapeText(item.id || item.slug || slugify(item.title))}" type="button">${isBookmarked(item) ? 'Tersimpan' : 'Simpan'}</button></div></article>`;
}

const rosterForCourse = course => studentRosters.filter(roster => roster.isActive !== false && matchesPracticumCourse(roster, course));
const sessionsForCourse = (course, rosters) => attendanceSessions.filter(sessionItem => sessionItem.status !== 'closed'
  && matchesPracticumCourse(sessionItem, course)
  && rosters.some(roster => sameTarget(sessionItem, roster)
    && (roster.classKey || slugifyAcademic(roster.className)) === (sessionItem.classKey || slugifyAcademic(sessionItem.className))
    && roster.academicYear === sessionItem.academicYear));

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
  const reviewMode = Boolean(readStudentSession()?.isAdminReview);
  return `<div class="attendance-list">${sessions.map(item => {
    const already = records.has(item.docId);
    const open = isSessionOpen(item);
    const disabled = already || !open || reviewMode ? 'disabled' : '';
    const status = already ? 'Sudah absen' : reviewMode ? 'Belum absen' : open ? 'Absen dibuka' : 'Belum waktunya / sudah tutup';
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
  semesterGrid.querySelectorAll('[data-bookmark-practicum]').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = modules.find(module => String(module.id || module.slug || slugify(module.title)) === String(btn.dataset.bookmarkPracticum));
      if (item) toggleBookmark(item);
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
  const visibleCourses = courses.filter(course => {
    const courseRosters = rosterForCourse(course);
    const courseModules = modules.filter(item => matchesPracticumCourse(item, course) && canStudentSeeModule(item, currentSession, activeSemester, courseRosters));
    return course.semester === activeSemester || courseRosters.length || courseModules.length;
  });
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
      <span>${currentSession.isAdminReview ? 'Mode review admin - tidak bisa mengirim absen &middot; ' : ''}${escapeText(academicPeriodLabel(academicPeriod))}${studentRosters.length ? ` &middot; ${studentRosters.length} roster praktikum` : ''}</span>
    </div>
  ` + semesters
    .filter(semester => selectedSemester === 'All' || Number(selectedSemester) === semester)
    .map(semester => {
      const semesterCourses = visibleCourses.filter(course => course.semester === semester);
      const cards = semesterCourses.map(course => {
        const courseRosters = rosterForCourse(course);
        const courseModules = modules
          .filter(item => matchesPracticumCourse(item, course))
          .filter(item => canStudentSeeModule(item, currentSession, activeSemester, courseRosters))
          .filter(item => normalize([item.title, item.description, item.author, item.category, item.course, item.targetAngkatan].join(' ')).includes(q));
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
      if (currentSession.isAdminReview) {
        showToast('Mode review admin hanya untuk pengecekan. Absen tidak dikirim.');
        return;
      }
      const roster = studentRosters.find(row => row.category === item.category
        && sameTarget(item, row)
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
        const codeValid = await requestAttendanceCode(item);
        if (!codeValid) return;
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
          targetAngkatan: item.targetAngkatan || roster.targetAngkatan || '',
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

const modulesQuery = query(collection(db, 'practicum_studio_modules'), where('status', '==', 'published'), orderBy('date', 'desc'));
onSnapshot(modulesQuery, snapshot => {
  if (snapshot.empty) {
    getDocs(query(collection(db, 'practicum_studio_modules'), orderBy('date', 'desc')))
      .then(fallbackSnapshot => {
        modules = fallbackSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => (item.status || 'published') === 'published' && courseKeys.some(key => normalize([item.category, item.course, item.title, item.type].join(' ')).includes(key)));
        render();
      })
      .catch(error => console.warn('Practicum legacy fallback failed:', error));
    return;
  }
  modules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })).filter(item => (item.status || 'published') === 'published' && courseKeys.some(key => normalize([item.category, item.course, item.title, item.type].join(' ')).includes(key)));
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
