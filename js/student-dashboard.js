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
  electiveOptionsForSemester,
  repeatableCourseOptions,
  requiredCoursesForSemester
} from './ts-course-catalog.js?v=2';

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
const studentAdditionalKey = course => [course?.code || '', course?.name || '', course?.sks || ''].join('|');
const studentOptionValue = course => [course.code, course.name, course.sks, course.type].map(value => String(value || '')).join('::');
const parseStudentCourseOption = value => {
  const [code = '', name = '', sks = '', type = 'K'] = String(value || '').split('::');
  return { code, name, sks: Number(sks || 0), type };
};

const studentAdditionalOptions = semester => {
  const selectedSemester = Number(semester || 0);
  const electiveOptions = electiveOptionsForSemester(selectedSemester).map(course => ({ ...course, group: 'Mata kuliah pilihan' }));
  const repeatOptions = repeatableCourseOptions().filter(course => Number(course.semester) !== selectedSemester);
  const unique = new Map();
  [...electiveOptions, ...repeatOptions].forEach(course => {
    const key = studentAdditionalKey(course);
    if (!unique.has(key)) unique.set(key, course);
  });
  return [...unique.values()];
};

const studentAdditionalOptionsMarkup = (selectedValue, semester) => {
  const groups = studentAdditionalOptions(semester).reduce((map, course) => {
    const group = course.group || 'Mata kuliah lainnya';
    if (!map.has(group)) map.set(group, []);
    map.get(group).push(course);
    return map;
  }, new Map());
  return `<option value="">Pilih mata kuliah</option>${[...groups.entries()].map(([group, courses]) => `
    <optgroup label="${escapeText(group)}">
      ${courses.map(course => {
        const value = studentOptionValue(course);
        return `<option value="${escapeText(value)}"${selectedValue === value ? ' selected' : ''}>${escapeText(course.code)} - ${escapeText(course.name)} (${escapeText(course.sks)} SKS)</option>`;
      }).join('')}
    </optgroup>
  `).join('')}<option value="custom"${selectedValue === 'custom' ? ' selected' : ''}>Lainnya / input manual</option>`;
};

const studentAdditionalRowMarkup = (course = {}, semester = '', index = 0) => {
  const matchedOption = studentAdditionalOptions(semester).find(option => {
    const code = String(course.code || '').toLowerCase();
    const name = String(course.name || '').toLowerCase();
    return (code && code === String(option.code || '').toLowerCase()) || (name && name === String(option.name || '').toLowerCase());
  });
  const selectedValue = matchedOption ? studentOptionValue(matchedOption) : course.name ? 'custom' : '';
  const useCustom = selectedValue === 'custom';
  const sks = Number(course.sks || matchedOption?.sks || 2);
  return `
    <div class="student-elective-row" data-elective-index="${escapeText(index)}">
      <select class="control student-elective-course" data-student-elective-course>
        ${studentAdditionalOptionsMarkup(selectedValue, semester)}
      </select>
      <input class="control student-elective-custom" data-student-elective-custom placeholder="Nama mata kuliah" value="${escapeText(useCustom ? course.name || '' : '')}"${useCustom ? '' : ' hidden'}>
      <input class="control student-elective-sks" data-student-elective-sks type="number" min="1" max="6" step="1" value="${escapeText(sks || 2)}" aria-label="SKS">
      <select class="control student-elective-grade" data-student-elective-grade>
        ${gradeOptionsMarkup(course.grade)}
      </select>
      <button class="btn btn-secondary student-elective-remove" data-student-remove-elective type="button">Hapus</button>
    </div>
  `;
};

const readStudentAdditionalCourses = container => {
  if (!container) return [];
  return [...container.querySelectorAll('.student-elective-row')]
    .map(row => {
      const selectedValue = row.querySelector('[data-student-elective-course]')?.value || '';
      const customName = row.querySelector('[data-student-elective-custom]')?.value || '';
      const sks = Number(row.querySelector('[data-student-elective-sks]')?.value || 0);
      const grade = row.querySelector('[data-student-elective-grade]')?.value || '';
      const point = gradePoint(grade);
      if (!selectedValue || !sks || point === null) return null;
      const selected = selectedValue === 'custom'
        ? { code: '', name: customName.trim(), sks, type: 'K' }
        : parseStudentCourseOption(selectedValue);
      return {
        code: selected.code || '',
        name: selected.name || customName.trim(),
        type: selected.type || 'K',
        sks,
        grade: normalizeGrade(grade),
        point,
        extra: true
      };
    })
    .filter(course => course && course.name && course.sks > 0);
};

const syncStudentAdditionalRow = row => {
  if (!row) return;
  const select = row.querySelector('[data-student-elective-course]');
  const custom = row.querySelector('[data-student-elective-custom]');
  const sksInput = row.querySelector('[data-student-elective-sks]');
  const selectedValue = select?.value || '';
  const useCustom = selectedValue === 'custom';
  if (custom) {
    custom.hidden = !useCustom;
    if (!useCustom) custom.value = '';
  }
  if (selectedValue && !useCustom && sksInput) {
    const selected = parseStudentCourseOption(selectedValue);
    if (selected.sks) sksInput.value = selected.sks;
  }
};

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
        <strong>Semester ${escapeText(semester)}</strong>
        <span>Pilih nilai HM, lalu AM, bobot, total SKS, dan IPS dihitung otomatis.</span>
      </div>
      <span>${escapeText(requiredCourses.reduce((sum, course) => sum + Number(course.sks || 0), 0))} SKS wajib</span>
    </div>
    <div class="student-course-table-wrap">
      <table class="student-course-table">
        <thead>
          <tr>
            <th>No</th>
            <th>Mata Kuliah</th>
            <th>SKS</th>
            <th>AM</th>
            <th>HM</th>
            <th>Bobot</th>
          </tr>
        </thead>
        <tbody>
      ${requiredCourses.map((course, index) => {
        const existing = existingMap.get(String(course.code || '').toLowerCase())
          || existingMap.get(String(course.name || '').toLowerCase())
          || existingMap.get(courseIdentity(course));
        const selectedGrade = normalizeGrade(existing?.grade);
        const point = gradePoint(selectedGrade);
        const sks = Number(course.sks || 0);
        return `
          <tr class="student-course-row">
            <td>${escapeText(index + 1)}</td>
            <td>
              <b>${escapeText(course.name)}</b>
              <small>${escapeText(course.code)} &middot; ${escapeText(course.type)} &middot; ${escapeText(course.sks)} SKS</small>
            </td>
            <td>${escapeText(course.sks)}</td>
            <td data-student-am>${point === null ? '-' : escapeText(point)}</td>
            <td>
            <select class="control student-grade-select" data-code="${escapeText(course.code)}" data-name="${escapeText(course.name)}" data-type="${escapeText(course.type)}" data-sks="${escapeText(course.sks)}">
              ${gradeOptionsMarkup(existing?.grade)}
            </select>
            </td>
            <td data-student-bobot>${point === null ? '-' : escapeText(Math.round(point * sks * 100) / 100)}</td>
          </tr>
        `;
      }).join('')}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="5">TOTAL SKS</td>
            <td data-student-total-sks>-</td>
          </tr>
          <tr>
            <td colspan="5">INDEKS PRESTASI</td>
            <td data-student-ips>-</td>
          </tr>
        </tfoot>
      </table>
    </div>
    ${electiveCourses.length ? `
      <div class="student-elective-note">
        <b>Mata kuliah pilihan:</b>
        <span>${electiveCourses.map(course => `${escapeText(course.name)} (${escapeText(course.sks)} SKS)`).join(', ')} tersedia di bagian pilihan/SP/mengulang.</span>
      </div>
    ` : ''}
  `;
};

const updateStudentCourseTableSummary = (container, ipk = null, totalSks = 0) => {
  if (!container) return;
  [...container.querySelectorAll('.student-grade-select')].forEach(select => {
    const row = select.closest('.student-course-row');
    const point = gradePoint(select.value);
    const sks = Number(select.dataset.sks || 0);
    const weight = point === null ? null : Math.round(point * sks * 100) / 100;
    const amTarget = row?.querySelector('[data-student-am]');
    const weightTarget = row?.querySelector('[data-student-bobot]');
    if (amTarget) amTarget.textContent = point === null ? '-' : String(point);
    if (weightTarget) weightTarget.textContent = weight === null ? '-' : String(weight);
  });
  const totalTarget = container.querySelector('[data-student-total-sks]');
  const ipsTarget = container.querySelector('[data-student-ips]');
  if (totalTarget) totalTarget.textContent = totalSks ? String(totalSks) : '-';
  if (ipsTarget) ipsTarget.textContent = ipk === null ? '-' : formatGpa(ipk);
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
      <select class="control" id="studentGpaSemester" required>
        <option value="">Pilih semester</option>
        <option value="1">Semester 1</option>
        <option value="2">Semester 2</option>
        <option value="3">Semester 3</option>
        <option value="4">Semester 4</option>
        <option value="5">Semester 5</option>
        <option value="6">Semester 6</option>
        <option value="7">Semester 7</option>
        <option value="8">Semester 8</option>
      </select>
      <input id="studentGpaAcademicYear" type="hidden" required>
      <input id="studentGpaMode" type="hidden" value="courses">
      <input id="studentGpaValue" type="hidden">
      <div class="student-course-catalog" id="studentCourseCatalog" hidden></div>
      <div class="student-elective-builder" id="studentGpaCourses" hidden></div>
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
    ...readStudentAdditionalCourses(coursesInput)
  ];
  const renderAdditionalRows = (existingCourses = null) => {
    if (!coursesInput) return;
    const isCourseMode = modeInput?.value === 'courses';
    const semester = semesterInput?.value || '';
    coursesInput.hidden = !isCourseMode || !semester;
    if (!isCourseMode || !semester) return;
    const catalog = requiredCoursesForSemester(semester);
    const sourceRows = existingCourses === null ? readStudentAdditionalCourses(coursesInput) : existingCourses;
    const rows = (Array.isArray(sourceRows) ? sourceRows : []).filter(course => !catalog.some(item => (
      (course.code && String(course.code).toLowerCase() === String(item.code).toLowerCase())
      || (course.name && String(course.name).toLowerCase() === String(item.name).toLowerCase())
    )));
    const displayRows = rows.length ? rows : [{}];
    coursesInput.innerHTML = `
      <div class="student-elective-builder-head">
        <div>
          <strong>Pilihan, SP, atau mata kuliah mengulang</strong>
          <span>Pilih mata kuliah dan nilai. Bagian ini opsional.</span>
        </div>
        <button class="btn btn-secondary" data-student-add-elective type="button">Tambah baris</button>
      </div>
      <div class="student-elective-rows">
        ${displayRows.map((course, index) => studentAdditionalRowMarkup(course, semester, index)).join('')}
      </div>
    `;
  };
  const syncCatalog = () => {
    const isCourseMode = modeInput?.value === 'courses';
    if (courseCatalog) courseCatalog.hidden = !isCourseMode;
    if (!isCourseMode) return;
    renderStudentCourseCatalog(courseCatalog, semesterInput?.value);
    renderAdditionalRows();
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
    updateStudentCourseTableSummary(courseCatalog, computed.ipk, computed.totalSks);
    if (valueInput) {
      valueInput.value = computed.ipk === null ? '' : computed.ipk;
      valueInput.required = false;
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
  semesterInput?.addEventListener('change', () => {
    syncAcademicYear();
    syncCatalog();
    syncCoursePreview();
  });
  courseCatalog?.addEventListener('change', syncCoursePreview);
  coursesInput?.addEventListener('input', syncCoursePreview);
  coursesInput?.addEventListener('change', event => {
    const row = event.target.closest?.('.student-elective-row');
    if (event.target.matches?.('[data-student-elective-course]')) syncStudentAdditionalRow(row);
    syncCoursePreview();
  });
  coursesInput?.addEventListener('click', event => {
    const addButton = event.target.closest?.('[data-student-add-elective]');
    const removeButton = event.target.closest?.('[data-student-remove-elective]');
    if (addButton) {
      const rows = coursesInput.querySelector('.student-elective-rows');
      if (rows) rows.insertAdjacentHTML('beforeend', studentAdditionalRowMarkup({}, semesterInput?.value || '', rows.children.length));
      syncCoursePreview();
      return;
    }
    if (removeButton) {
      removeButton.closest('.student-elective-row')?.remove();
      if (!coursesInput.querySelector('.student-elective-row')) renderAdditionalRows([]);
      syncCoursePreview();
    }
  });
  syncAcademicYear();
  syncCatalog();
  syncCoursePreview();
  form?.addEventListener('submit', async event => {
    event.preventDefault();
    const semester = document.getElementById('studentGpaSemester')?.value;
    const academicYear = document.getElementById('studentGpaAcademicYear')?.value;
    const courses = readCourses();
    const computed = courseGpa(courses);
    const mode = 'courses';
    if (modeInput) modeInput.value = mode;
    const ips = computed.ipk;
    const note = document.getElementById('studentGpaNote')?.value || '';
    if (!semester || !academicYear || ips === null) {
      showToast('Lengkapi semester, tahun akademik, dan IPS.');
      return;
    }
    if (!courses.length) {
      showToast('Isi minimal satu nilai mata kuliah.');
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
