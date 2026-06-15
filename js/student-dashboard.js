import { app } from './firebase-config.js';
import {
  getFirestore,
  collection,
  query,
  where,
  limit,
  getDocs,
  getDoc,
  setDoc,
  doc
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";
import {
  GRADE_OPTIONS,
  defaultAcademicYearForSemester,
  electiveCoursesForSemester,
  requiredCoursesForSemester
} from './ts-course-catalog.js?v=1';

const db = getFirestore(app);
const SESSION_KEY = 'sipilcare_student_session';
const BOOKMARK_KEY = 'sipilcare_student_bookmarks';
const SESSION_TTL = 24 * 60 * 60 * 1000;

const profileTarget = document.getElementById('studentDashboardProfile');
const summaryTarget = document.getElementById('studentDashboardSummary');
const membershipTarget = document.getElementById('studentMembershipCard');
const bookmarkTarget = document.getElementById('studentBookmarkList');
const activityTarget = document.getElementById('studentRecentActivity');

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const readSession = () => {
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

const readBookmarks = () => {
  try {
    return JSON.parse(localStorage.getItem(BOOKMARK_KEY) || '[]');
  } catch {
    return [];
  }
};

const formatDateTime = value => {
  if (!value) return '-';
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const typeClass = value => String(value || 'materi').toLowerCase().replace(/[^a-z0-9]+/g, '-');

const normalizeGpa = value => {
  const normalized = Number(String(value ?? '').replace(',', '.'));
  if (!Number.isFinite(normalized)) return null;
  return Math.round(Math.min(4, Math.max(0, normalized)) * 100) / 100;
};

const formatGpa = value => {
  const normalized = normalizeGpa(value);
  return normalized === null ? '-' : normalized.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const gradeScale = {
  A: 4,
  AB: 3.5,
  'A-': 3.7,
  BA: 3.5,
  B: 3,
  BC: 2.5,
  'B+': 3.3,
  'B-': 2.7,
  CB: 2.5,
  C: 2,
  CD: 1.5,
  'C+': 2.3,
  'C-': 1.7,
  DC: 1.5,
  D: 1,
  E: 0
};
const normalizeGrade = value => String(value || '').trim().toUpperCase().replace(/\s+/g, '');
const gradePoint = value => {
  const normalized = normalizeGrade(value).replace(',', '.');
  if (Object.prototype.hasOwnProperty.call(gradeScale, normalized)) return gradeScale[normalized];
  const numeric = Number(normalized);
  return Number.isFinite(numeric) ? Math.min(4, Math.max(0, numeric)) : null;
};
const parseDelimitedRows = value => String(value || '')
  .split(/\r?\n/)
  .map(line => line.trim())
  .filter(Boolean)
  .map(line => {
    const delimiter = line.includes('\t') ? '\t' : line.includes(';') ? ';' : ',';
    return line.split(delimiter).map(cell => cell.trim()).filter(Boolean);
  });
const parseCourseRows = value => parseDelimitedRows(value)
  .map(cells => {
    const grade = cells.at(-1);
    const sksIndex = cells.findIndex((cell, index) => index > 0 && Number.isFinite(Number(String(cell).replace(',', '.'))));
    const sks = sksIndex >= 0 ? Number(String(cells[sksIndex]).replace(',', '.')) : 0;
    const name = cells.slice(0, sksIndex >= 0 ? sksIndex : Math.max(1, cells.length - 2)).join(' ').trim();
    const point = gradePoint(grade);
    return { name, sks, grade: normalizeGrade(grade), point };
  })
  .filter(course => course.name && course.sks > 0 && course.point !== null);
const courseGpa = courses => {
  const totalSks = courses.reduce((sum, course) => sum + Number(course.sks || 0), 0);
  if (!totalSks) return { ipk: null, totalSks: 0 };
  const weighted = courses.reduce((sum, course) => sum + Number(course.sks || 0) * Number(course.point || 0), 0);
  return { ipk: Math.round((weighted / totalSks) * 100) / 100, totalSks };
};

const recordGpaValue = record => normalizeGpa(record?.ips ?? record?.ipk);

const cumulativeGpa = records => {
  const rows = (Array.isArray(records) ? records : [])
    .map(record => ({ value: recordGpaValue(record), sks: Number(record.totalSks || 0) }))
    .filter(row => row.value !== null);
  const weightedRows = rows.filter(row => row.sks > 0);
  if (weightedRows.length) {
    const totalSks = weightedRows.reduce((sum, row) => sum + row.sks, 0);
    const weighted = weightedRows.reduce((sum, row) => sum + row.value * row.sks, 0);
    return { ipk: Math.round((weighted / totalSks) * 100) / 100, totalSks };
  }
  if (!rows.length) return { ipk: null, totalSks: 0 };
  return {
    ipk: Math.round((rows.reduce((sum, row) => sum + row.value, 0) / rows.length) * 100) / 100,
    totalSks: 0
  };
};

const gradeOptionsMarkup = selected => GRADE_OPTIONS.map(option => `
  <option value="${escapeText(option)}"${normalizeGrade(selected) === option ? ' selected' : ''}>${escapeText(option || 'Nilai')}</option>
`).join('');

const readStudentCatalogCourses = container => {
  if (!container) return [];
  return [...container.querySelectorAll('.student-grade-select')]
    .map(select => {
      const point = gradePoint(select.value);
      if (point === null) return null;
      return {
        code: select.dataset.code || '',
        name: select.dataset.name || '',
        type: select.dataset.type || '',
        sks: Number(select.dataset.sks || 0),
        grade: normalizeGrade(select.value),
        point
      };
    })
    .filter(course => course && course.name && course.sks > 0);
};

const courseIdentity = course => `${String(course?.code || '').toLowerCase()} ${String(course?.name || '').toLowerCase()}`.trim();

const renderStudentCourseCatalog = (container, semester, existingCourses = []) => {
  if (!container) return;
  const requiredCourses = requiredCoursesForSemester(semester);
  const electiveCourses = electiveCoursesForSemester(semester);
  const existingMap = new Map();
  (Array.isArray(existingCourses) ? existingCourses : []).forEach(course => {
    [String(course.code || '').toLowerCase(), String(course.name || '').toLowerCase(), courseIdentity(course)]
      .filter(Boolean)
      .forEach(key => {
        if (!existingMap.has(key)) existingMap.set(key, course);
      });
  });
  if (!semester) {
    container.innerHTML = '<div class="student-course-empty">Pilih semester untuk menampilkan mata kuliah otomatis.</div>';
    return;
  }
  if (!requiredCourses.length && !electiveCourses.length) {
    container.innerHTML = '<div class="student-course-empty">Katalog semester ini belum tersedia. Isi mata kuliah pilihan/tambahan secara manual.</div>';
    return;
  }
  container.innerHTML = `
    <div class="student-course-catalog-head">
      <div>
        <strong>Mata kuliah wajib semester ${escapeText(semester)}</strong>
        <span>Isi nilai yang sudah keluar. Nilai kosong tidak dihitung.</span>
      </div>
      <span>${escapeText(requiredCourses.reduce((sum, course) => sum + Number(course.sks || 0), 0))} SKS wajib</span>
    </div>
    <div class="student-course-rows">
      ${requiredCourses.map(course => {
        const existing = existingMap.get(String(course.code || '').toLowerCase())
          || existingMap.get(String(course.name || '').toLowerCase())
          || existingMap.get(courseIdentity(course));
        return `
          <label class="student-course-row">
            <span>
              <b>${escapeText(course.name)}</b>
              <small>${escapeText(course.code)} &middot; ${escapeText(course.type)} &middot; ${escapeText(course.sks)} SKS</small>
            </span>
            <select class="control student-grade-select" data-code="${escapeText(course.code)}" data-name="${escapeText(course.name)}" data-type="${escapeText(course.type)}" data-sks="${escapeText(course.sks)}">
              ${gradeOptionsMarkup(existing?.grade)}
            </select>
          </label>
        `;
      }).join('')}
    </div>
    ${electiveCourses.length ? `
      <div class="student-elective-note">
        <b>Mata kuliah pilihan:</b>
        <span>${electiveCourses.map(course => `${escapeText(course.name)} (${escapeText(course.sks)} SKS)`).join(', ')}. Isi nama pilihan sebenarnya di kolom pilihan/tambahan.</span>
      </div>
    ` : ''}
  `;
};

function renderStudentGpaLineChart(records) {
  const ordered = [...records].sort((a, b) => Number(a.semester || 0) - Number(b.semester || 0));
  const values = [...Array(8)].map((_, index) => {
    const semester = index + 1;
    const record = [...ordered].reverse().find(item => Number(item.semester) === semester);
    return { semester, value: recordGpaValue(record) };
  });
  if (!values.some(item => item.value !== null)) return '<div class="empty">Grafik muncul setelah ada data IPS.</div>';
  const width = 720;
  const height = 290;
  const padding = { left: 54, right: 22, top: 24, bottom: 42 };
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;
  const yMax = 4.5;
  const x = semester => padding.left + ((semester - 1) / 7) * innerWidth;
  const y = value => padding.top + (1 - Math.min(yMax, Math.max(0, value)) / yMax) * innerHeight;
  const plotted = values.filter(item => item.value !== null);
  const yTicks = [0, .5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5];
  return `
    <div class="student-gpa-line-chart" role="img" aria-label="Grafik IPS per semester">
      <svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet">
        ${yTicks.map(tick => `
          <line class="student-gpa-grid" x1="${padding.left}" y1="${y(tick)}" x2="${width - padding.right}" y2="${y(tick)}"></line>
          <text class="student-gpa-axis" x="${padding.left - 12}" y="${y(tick) + 4}" text-anchor="end">${tick.toFixed(2)}</text>
        `).join('')}
        ${values.map(item => `
          <line class="student-gpa-grid vertical" x1="${x(item.semester)}" y1="${padding.top}" x2="${x(item.semester)}" y2="${height - padding.bottom}"></line>
          <text class="student-gpa-axis" x="${x(item.semester)}" y="${height - 14}" text-anchor="middle">${item.semester}</text>
        `).join('')}
        <polyline class="student-gpa-line" points="${plotted.map(item => `${x(item.semester)},${y(item.value)}`).join(' ')}"></polyline>
        ${plotted.map(item => `
          <circle class="student-gpa-point" cx="${x(item.semester)}" cy="${y(item.value)}" r="5"></circle>
          <text class="student-gpa-point-label" x="${x(item.semester)}" y="${y(item.value) - 11}" text-anchor="middle">${formatGpa(item.value)}</text>
        `).join('')}
      </svg>
    </div>
  `;
}

const gpaRecordDocId = (nim, semester, academicYear) => [
  String(nim || '').trim(),
  String(semester || '').trim().replace(/\D+/g, '') || '0',
  String(academicYear || new Date().getFullYear()).trim().replace(/[^0-9A-Za-z-]+/g, '-')
].join('_');

const showToast = message => {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2800);
};

function renderLoggedOut() {
  if (profileTarget) {
    profileTarget.innerHTML = `
      <h2>Belum login</h2>
      <p>Login sebagai mahasiswa untuk membuka dashboard pribadi.</p>
      <a class="btn btn-primary" href="../student-login?next=pages%2Fstudent-dashboard">Login Mahasiswa</a>
    `;
  }
  if (summaryTarget) summaryTarget.innerHTML = '';
  if (membershipTarget) membershipTarget.innerHTML = '<div class="empty">Status anggota aktif akan tampil setelah login.</div>';
  if (bookmarkTarget) bookmarkTarget.innerHTML = '<div class="empty">Dashboard aktif setelah login.</div>';
  if (activityTarget) activityTarget.innerHTML = '<div class="empty">Belum ada aktivitas yang bisa ditampilkan.</div>';
}

function renderProfile(session, bookmarks) {
  if (!profileTarget) return;
  const initial = String(session.name || session.nim || 'M').trim().slice(0, 1).toUpperCase();
  profileTarget.innerHTML = `
    <div class="student-profile-avatar">${escapeText(initial)}</div>
    <h2>${escapeText(session.name || 'Mahasiswa SIPIL CARE')}</h2>
    <p>NIM ${escapeText(session.nim)}${session.angkatan ? ` &middot; Angkatan ${escapeText(session.angkatan)}` : ''}</p>
    <div class="student-profile-actions">
      <a class="btn btn-primary" href="praktikum-studio">Praktikum Saya</a>
      <a class="btn btn-secondary" href="resources">Cari Materi</a>
    </div>
  `;
  if (summaryTarget) {
    const counts = bookmarks.reduce((map, item) => {
      map[item.type] = (map[item.type] || 0) + 1;
      return map;
    }, {});
    summaryTarget.innerHTML = `
      <article><span>Total simpanan</span><strong>${bookmarks.length}</strong></article>
      <article><span>Resource</span><strong>${counts.Resource || 0}</strong></article>
      <article><span>Praktikum</span><strong>${counts['Praktikum & Studio'] || 0}</strong></article>
      <article><span>Video</span><strong>${counts.Video || 0}</strong></article>
    `;
  }
}

async function loadMembership(session) {
  if (!membershipTarget) return;
  try {
    const memberSnapshot = await getDoc(doc(db, 'hms_active_members', session.nim));
    const member = memberSnapshot.exists() ? memberSnapshot.data() : null;
    const isActiveMember = Boolean(member && member.status !== 'inactive');
    const recordsSnapshot = isActiveMember
      ? await getDocs(query(collection(db, 'student_gpa_records'), where('nim', '==', session.nim), limit(40)))
      : null;
    const records = recordsSnapshot
      ? recordsSnapshot.docs
        .map(item => ({ docId: item.id, ...item.data() }))
        .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')))
      : [];
    renderMembership(session, member, records);
  } catch (error) {
    console.warn('Student membership failed:', error);
    membershipTarget.innerHTML = '<div class="empty">Status anggota belum bisa dimuat. Coba refresh halaman.</div>';
  }
}

function renderMembership(session, member, records) {
  if (!membershipTarget) return;
  const isActiveMember = Boolean(member && member.status !== 'inactive');
  const latest = records[0];
  const chronological = [...records].sort((a, b) => Number(a.semester || 0) - Number(b.semester || 0));
  const cumulative = cumulativeGpa(chronological);

  if (!isActiveMember) {
    membershipTarget.innerHTML = `
      <div class="section-title compact-title">
        <span class="eyebrow">Status anggota</span>
        <h2>Anggota biasa</h2>
      </div>
      <p class="student-membership-note">Akun kamu tercatat sebagai anggota biasa. Form IPK hanya tersedia untuk pengurus HMS yang sudah didaftarkan admin sebagai anggota aktif.</p>
    `;
    return;
  }

  membershipTarget.innerHTML = `
    <div class="section-title compact-title">
      <span class="eyebrow">Status anggota</span>
      <h2>Anggota aktif HMS</h2>
    </div>
    <div class="student-member-card">
      <div>
        <span class="student-member-badge">Anggota aktif</span>
        <strong>${escapeText(member.division || 'Pengurus HMS')}</strong>
        <small>${escapeText(member.position || 'Anggota aktif')}${member.angkatan ? ` &middot; Angkatan ${escapeText(member.angkatan)}` : ''}</small>
      </div>
      <div class="student-gpa-mini">
        <span>IPS terakhir</span>
        <b>${escapeText(formatGpa(recordGpaValue(latest)))}</b>
      </div>
      <div class="student-gpa-mini">
        <span>IPK kumulatif</span>
        <b>${escapeText(formatGpa(cumulative.ipk))}</b>
      </div>
    </div>
    <form id="studentGpaForm" class="student-gpa-form">
      <input class="control" id="studentGpaSemester" type="number" min="1" max="14" placeholder="Semester" required>
      <input class="control" id="studentGpaAcademicYear" placeholder="Tahun akademik, contoh: 2025/2026" required>
      <select class="control" id="studentGpaMode">
        <option value="gpa">Input IPS langsung</option>
        <option value="courses">Input nilai per mata kuliah</option>
      </select>
      <input class="control" id="studentGpaValue" type="number" min="0" max="4" step="0.01" placeholder="IPS, contoh: 3.56" required>
      <div class="student-course-catalog" id="studentCourseCatalog" hidden></div>
      <textarea class="control" id="studentGpaCourses" hidden placeholder="Mata kuliah pilihan atau tambahan:
Mekanika Teknik	3	A
Matematika Teknik	2	AB"></textarea>
      <div class="student-course-preview" id="studentCoursePreview">Belum ada mata kuliah yang dipreview.</div>
      <input class="control" id="studentGpaNote" placeholder="Catatan opsional">
      <button class="btn btn-primary" type="submit">Simpan IPS/IPK</button>
    </form>
    <div class="student-gpa-chart">${renderStudentGpaLineChart(chronological)}</div>
    <div class="student-gpa-history">
      ${records.length
        ? records.slice(0, 8).map(record => `
          <article>
            <strong>Semester ${escapeText(record.semester || '-')} &middot; ${escapeText(record.academicYear || '-')}</strong>
            <span>IPS ${escapeText(formatGpa(recordGpaValue(record)))} &middot; ${escapeText(record.source === 'admin' ? 'Diinput admin' : 'Diinput mahasiswa')}${Array.isArray(record.courses) && record.courses.length ? ` &middot; ${record.courses.length} mata kuliah` : ''}</span>
            <small>${escapeText(formatDateTime(record.updatedAt || record.createdAt))}${record.note ? ` &middot; ${escapeText(record.note)}` : ''}</small>
          </article>
        `).join('')
        : '<div class="empty">Belum ada riwayat IPS/IPK. Input nilai pertama kamu di form ini.</div>'}
    </div>
  `;

  const form = document.getElementById('studentGpaForm');
  const modeInput = document.getElementById('studentGpaMode');
  const coursesInput = document.getElementById('studentGpaCourses');
  const semesterInput = document.getElementById('studentGpaSemester');
  const academicYearInput = document.getElementById('studentGpaAcademicYear');
  const courseCatalog = document.getElementById('studentCourseCatalog');
  const coursePreview = document.getElementById('studentCoursePreview');
  const valueInput = document.getElementById('studentGpaValue');
  const readCourses = () => [
    ...readStudentCatalogCourses(courseCatalog),
    ...parseCourseRows(coursesInput?.value || '')
  ];
  const syncCatalog = () => {
    const isCourseMode = modeInput?.value === 'courses';
    if (courseCatalog) courseCatalog.hidden = !isCourseMode;
    if (coursesInput) coursesInput.hidden = !isCourseMode;
    if (!isCourseMode) return;
    renderStudentCourseCatalog(courseCatalog, semesterInput?.value);
  };
  const syncAcademicYear = () => {
    if (!academicYearInput) return;
    const year = defaultAcademicYearForSemester(session.angkatan || member.angkatan, semesterInput?.value);
    if (!year) return;
    const current = academicYearInput.value.trim();
    if (!current || current === academicYearInput.dataset.autoValue) {
      academicYearInput.value = year;
      academicYearInput.dataset.autoValue = year;
    }
  };
  const syncCoursePreview = () => {
    const courses = readCourses();
    const computed = courseGpa(courses);
    if (modeInput?.value === 'courses' && valueInput) {
      valueInput.value = computed.ipk === null ? '' : computed.ipk;
      valueInput.required = false;
    } else if (valueInput) {
      valueInput.required = true;
    }
    if (coursePreview) {
      coursePreview.innerHTML = courses.length
        ? `<strong>${escapeText(courses.length)} mata kuliah, ${escapeText(computed.totalSks)} SKS, IPS ${escapeText(formatGpa(computed.ipk))}</strong>`
        : 'Belum ada mata kuliah yang dipreview.';
    }
  };
  modeInput?.addEventListener('change', () => {
    syncCatalog();
    syncCoursePreview();
  });
  semesterInput?.addEventListener('input', () => {
    syncAcademicYear();
    syncCatalog();
    syncCoursePreview();
  });
  courseCatalog?.addEventListener('change', syncCoursePreview);
  coursesInput?.addEventListener('input', syncCoursePreview);
  syncAcademicYear();
  syncCatalog();
  syncCoursePreview();
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const semester = document.getElementById('studentGpaSemester')?.value;
    const academicYear = document.getElementById('studentGpaAcademicYear')?.value;
    const courses = readCourses();
    const computed = courseGpa(courses);
    const mode = modeInput?.value || 'gpa';
    const ips = mode === 'courses' ? computed.ipk : normalizeGpa(valueInput?.value);
    const note = document.getElementById('studentGpaNote')?.value || '';
    if (!semester || !academicYear || ips === null) {
      showToast('Lengkapi semester, tahun akademik, dan IPS.');
      return;
    }
    if (mode === 'courses' && !courses.length) {
      showToast('Isi minimal satu mata kuliah valid.');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const now = new Date().toISOString();
    const recordId = gpaRecordDocId(session.nim, semester, academicYear);
    const siblingRecords = records.filter(record => record.docId !== recordId);
    const cumulative = cumulativeGpa([...siblingRecords, { semester, academicYear, ips, ipk: ips, totalSks: computed.totalSks || null }]);
    try {
      if (button) button.disabled = true;
      await setDoc(doc(db, 'student_gpa_records', recordId), {
        nim: session.nim,
        name: session.name || member.name || '',
        angkatan: session.angkatan || member.angkatan || '',
        semester: String(semester),
        academicYear: String(academicYear).trim(),
        ips,
        ipk: ips,
        cumulativeIpk: cumulative.ipk,
        entryMode: mode,
        courses,
        totalSks: computed.totalSks || null,
        note: String(note).trim(),
        source: 'student',
        updatedAt: now,
        updatedBy: session.nim
      }, { merge: true });
      showToast('IPS/IPK berhasil disimpan.');
      await loadMembership(session);
    } catch (error) {
      console.warn('Save student GPA failed:', error);
      showToast('Gagal menyimpan IPS/IPK.');
    } finally {
      if (button) button.disabled = false;
    }
  });
}

function renderBookmarks(bookmarks) {
  if (!bookmarkTarget) return;
  bookmarkTarget.innerHTML = bookmarks.length
    ? bookmarks.map(item => `
      <a class="student-bookmark-item" href="${escapeText(item.url || '#')}">
        <span class="student-bookmark-type ${escapeText(typeClass(item.type))}">${escapeText(item.type || 'Materi')}</span>
        <strong>${escapeText(item.title || 'Materi tersimpan')}</strong>
        <small>${escapeText(item.category || '-')} &middot; Disimpan ${escapeText(formatDateTime(item.savedAt))}</small>
      </a>
    `).join('')
    : '<div class="empty">Belum ada materi tersimpan. Tekan tombol Simpan pada Resource, Praktikum, atau Video.</div>';
}

async function loadRecentActivity(session) {
  if (!activityTarget) return;
  try {
    const snapshot = await getDocs(query(
      collection(db, 'resource_access_logs'),
      where('nim', '==', session.nim),
      limit(40)
    ));
    const rows = snapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => String(b.createdAt || b.accessedAt || '').localeCompare(String(a.createdAt || a.accessedAt || '')))
      .slice(0, 10);
    activityTarget.innerHTML = rows.length
      ? rows.map(item => `
        <article class="student-activity-item">
          <strong>${escapeText(item.resourceTitle || item.title || 'Aktivitas materi')}</strong>
          <span>${escapeText(item.actionLabel || item.action || 'Akses')} &middot; ${escapeText(item.category || item.contentType || '-')}</span>
          <small>${escapeText(formatDateTime(item.createdAt || item.accessedAt))}</small>
        </article>
      `).join('')
      : '<div class="empty">Belum ada riwayat akses yang terekam.</div>';
  } catch (error) {
    console.warn('Student dashboard activity failed:', error);
    activityTarget.innerHTML = '<div class="empty">Riwayat akses belum bisa dimuat. Materi tersimpan tetap bisa digunakan.</div>';
  }
}

const session = readSession();
if (!session) {
  renderLoggedOut();
} else {
  const bookmarks = readBookmarks();
  renderProfile(session, bookmarks);
  renderBookmarks(bookmarks);
  loadMembership(session);
  loadRecentActivity(session);
}
