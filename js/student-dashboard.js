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
  const bars = chronological.map(record => {
    const ipk = normalizeGpa(record.ipk) || 0;
    const height = Math.max(8, Math.round((ipk / 4) * 110));
    return `
      <article class="student-gpa-bar">
        <div><span style="height:${height}px"></span></div>
        <b>${escapeText(formatGpa(ipk))}</b>
        <small>Smt ${escapeText(record.semester || '-')}</small>
      </article>
    `;
  }).join('');
  const average = records.length
    ? records.map(record => normalizeGpa(record.ipk)).filter(value => value !== null).reduce((sum, value, _, arr) => sum + value / arr.length, 0)
    : null;

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
        <span>IPK terakhir</span>
        <b>${escapeText(formatGpa(latest?.ipk))}</b>
      </div>
      <div class="student-gpa-mini">
        <span>Rata-rata</span>
        <b>${escapeText(formatGpa(average))}</b>
      </div>
    </div>
    <form id="studentGpaForm" class="student-gpa-form">
      <input class="control" id="studentGpaSemester" type="number" min="1" max="14" placeholder="Semester" required>
      <input class="control" id="studentGpaAcademicYear" placeholder="Tahun akademik, contoh: 2025/2026" required>
      <select class="control" id="studentGpaMode">
        <option value="gpa">Input IP/IPK langsung</option>
        <option value="courses">Input nilai per mata kuliah</option>
      </select>
      <input class="control" id="studentGpaValue" type="number" min="0" max="4" step="0.01" placeholder="IPK, contoh: 3.56" required>
      <textarea class="control" id="studentGpaCourses" placeholder="Opsional untuk mode mata kuliah:
Mekanika Teknik	3	A
Matematika Teknik	2	AB"></textarea>
      <div class="student-course-preview" id="studentCoursePreview">Belum ada mata kuliah yang dipreview.</div>
      <input class="control" id="studentGpaNote" placeholder="Catatan opsional">
      <button class="btn btn-primary" type="submit">Simpan IPK</button>
    </form>
    <div class="student-gpa-chart">${bars || '<div class="empty">Grafik muncul setelah ada data IP/IPK.</div>'}</div>
    <div class="student-gpa-history">
      ${records.length
        ? records.slice(0, 8).map(record => `
          <article>
            <strong>Semester ${escapeText(record.semester || '-')} &middot; ${escapeText(record.academicYear || '-')}</strong>
            <span>IP ${escapeText(formatGpa(record.ipk))} &middot; ${escapeText(record.source === 'admin' ? 'Diinput admin' : 'Diinput mahasiswa')}${Array.isArray(record.courses) && record.courses.length ? ` &middot; ${record.courses.length} mata kuliah` : ''}</span>
            <small>${escapeText(formatDateTime(record.updatedAt || record.createdAt))}${record.note ? ` &middot; ${escapeText(record.note)}` : ''}</small>
          </article>
        `).join('')
        : '<div class="empty">Belum ada riwayat IPK. Input IPK pertama kamu di form ini.</div>'}
    </div>
  `;

  const form = document.getElementById('studentGpaForm');
  const modeInput = document.getElementById('studentGpaMode');
  const coursesInput = document.getElementById('studentGpaCourses');
  const coursePreview = document.getElementById('studentCoursePreview');
  const valueInput = document.getElementById('studentGpaValue');
  const syncCoursePreview = () => {
    const courses = parseCourseRows(coursesInput?.value || '');
    const computed = courseGpa(courses);
    if (modeInput?.value === 'courses' && valueInput) {
      valueInput.value = computed.ipk === null ? '' : computed.ipk;
      valueInput.required = false;
    } else if (valueInput) {
      valueInput.required = true;
    }
    if (coursePreview) {
      coursePreview.innerHTML = courses.length
        ? `<strong>${escapeText(courses.length)} mata kuliah, ${escapeText(computed.totalSks)} SKS, IP ${escapeText(formatGpa(computed.ipk))}</strong>`
        : 'Belum ada mata kuliah yang dipreview.';
    }
  };
  modeInput?.addEventListener('change', syncCoursePreview);
  coursesInput?.addEventListener('input', syncCoursePreview);
  syncCoursePreview();
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const semester = document.getElementById('studentGpaSemester')?.value;
    const academicYear = document.getElementById('studentGpaAcademicYear')?.value;
    const courses = parseCourseRows(coursesInput?.value || '');
    const computed = courseGpa(courses);
    const mode = modeInput?.value || 'gpa';
    const ipk = mode === 'courses' ? computed.ipk : normalizeGpa(valueInput?.value);
    const note = document.getElementById('studentGpaNote')?.value || '';
    if (!semester || !academicYear || ipk === null) {
      showToast('Lengkapi semester, tahun akademik, dan IPK.');
      return;
    }
    if (mode === 'courses' && !courses.length) {
      showToast('Isi minimal satu mata kuliah valid.');
      return;
    }
    const button = form.querySelector('button[type="submit"]');
    const now = new Date().toISOString();
    const recordId = gpaRecordDocId(session.nim, semester, academicYear);
    try {
      if (button) button.disabled = true;
      await setDoc(doc(db, 'student_gpa_records', recordId), {
        nim: session.nim,
        name: session.name || member.name || '',
        angkatan: session.angkatan || member.angkatan || '',
        semester: String(semester),
        academicYear: String(academicYear).trim(),
        ipk,
        entryMode: mode,
        courses,
        totalSks: computed.totalSks || null,
        note: String(note).trim(),
        source: 'student',
        updatedAt: now,
        updatedBy: session.nim
      }, { merge: true });
      showToast('IPK berhasil disimpan.');
      await loadMembership(session);
    } catch (error) {
      console.warn('Save student GPA failed:', error);
      showToast('Gagal menyimpan IPK.');
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
