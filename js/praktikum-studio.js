import { app } from './firebase-config.js';
import { getFirestore, collection, query, orderBy, onSnapshot } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const db = getFirestore(app);
const search = document.getElementById('practicumSearch');
const semesterFilter = document.getElementById('semesterFilter');
const semesterTabs = document.getElementById('semesterTabs');
const semesterGrid = document.getElementById('semesterGrid');

const courses = [
  { semester: 1, title: 'Computer Aided Design (CAD)', type: 'S' },
  { semester: 1, title: 'Praktik Kimia', type: 'P' },
  { semester: 2, title: 'Praktik Fisika', type: 'P' },
  { semester: 2, title: 'Praktik Pemetaan Lahan Terapan', type: 'P' },
  { semester: 3, title: 'Praktik Hidraulika', type: 'P' },
  { semester: 3, title: 'Praktik Rekayasa Lalu Lintas', type: 'P' },
  { semester: 4, title: 'Aplikasi Ketekniksipilan 1', type: 'S' },
  { semester: 4, title: 'Praktik Bahan Perkerasan Jalan Raya', type: 'P' },
  { semester: 4, title: 'Praktik Geoteknik', type: 'P' },
  { semester: 5, title: 'Aplikasi Ketekniksipilan 2', type: 'S' },
  { semester: 6, title: 'Pengantar Building Information Modeling (BIM)', type: 'S' }
];
const courseKeys = courses.map(item => item.title.toLowerCase());
let modules = [];

const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalize = value => String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
const courseCategory = course => `${course.title}-${course.type}`;
const courseKind = type => type === 'P' ? 'Praktikum' : 'Studio';
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

function matchesCourse(resource, course) {
  const category = normalize(resource.category);
  const title = normalize(resource.title);
  const type = normalize(resource.type);
  const target = normalize(course.title);
  const withSuffix = normalize(courseCategory(course));
  return category === target || category === withSuffix || title.includes(target) || type === target || type === withSuffix;
}

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

function render() {
  const q = normalize(search.value);
  const selectedSemester = semesterFilter.value;
  const semesters = [...new Set(courses.map(item => item.semester))];
  semesterTabs.innerHTML = semesters.map(semester => `<a href="#semester-${semester}">Semester ${semester}</a>`).join('');
  semesterGrid.innerHTML = semesters
    .filter(semester => selectedSemester === 'All' || Number(selectedSemester) === semester)
    .map(semester => {
      const semesterCourses = courses.filter(course => course.semester === semester);
      const cards = semesterCourses.map(course => {
        const courseModules = modules.filter(item => matchesCourse(item, course)).filter(item => normalize([item.title, item.description, item.author, item.category, item.course].join(' ')).includes(q));
        return `<article class="course-card"><div class="course-top"><h3>${escapeText(course.title)}</h3><span class="course-type">${course.type}</span></div><p class="empty-module">${courseKind(course.type)} semester ${semester}</p><div class="module-list">${courseModules.length ? courseModules.map(resourceCard).join('') : '<p class="empty-module">Modul belum tersedia. Admin dapat upload modul Praktikum &amp; Studio dengan kategori ' + escapeText(courseCategory(course)) + '.</p>'}</div></article>`;
      }).join('');
      return `<section class="semester-block" id="semester-${semester}"><div class="semester-head"><h2>Semester ${semester}</h2><span>${semesterCourses.length} kategori praktikum/studio</span></div><div class="course-grid">${cards}</div></section>`;
    }).join('');
  bindCopyButtons();
}

semesterFilter.innerHTML += [...new Set(courses.map(item => item.semester))].map(semester => `<option value="${semester}">Semester ${semester}</option>`).join('');
search.addEventListener('input', render);
semesterFilter.addEventListener('change', render);

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
