const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const outputPath = path.join(root, 'data', 'changelog.json');

const run = command => execSync(command, { cwd: root, encoding: 'utf8' }).trim();
const todayId = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Jakarta',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());
const todayLabel = date => new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  day: 'numeric',
  month: 'long',
  year: 'numeric'
}).format(new Date(`${date}T00:00:00+07:00`));

let activeDiffBase = 'git diff --unified=0';
const diffCache = new Map();
const readFileDiff = file => {
  if (diffCache.has(file)) return diffCache.get(file);
  try {
    const diff = run(`${activeDiffBase} -- "${file}"`);
    diffCache.set(file, diff);
    return diff;
  } catch {
    diffCache.set(file, '');
    return '';
  }
};

const isCacheBustOnly = file => {
  if (!file.endsWith('.html')) return false;
  const changedLines = readFileDiff(file)
    .split(/\r?\n/)
    .filter(line => /^[+-][^+-]/.test(line));
  if (!changedLines.length) return false;
  return changedLines.every(line => /navbar\.(css|js)\?v=\d+/.test(line));
};

const parseStatus = () => {
  try {
    const statusFiles = run('git status --short')
      .split(/\r?\n/)
      .filter(Boolean)
      .map(line => line.replace(/^..\s+/, '').trim().replace(/^.* -> /, '').replace(/\\/g, '/'))
      .filter(file => ![
        'data/changelog.json'
      ].includes(file));
    if (statusFiles.length) return statusFiles.filter(file => !isCacheBustOnly(file));

    const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
    const currentSha = process.env.VERCEL_GIT_COMMIT_SHA;
    const diffCommand = previousSha && currentSha
      ? `git diff --name-only ${previousSha} ${currentSha}`
      : 'git diff --name-only HEAD~1 HEAD';
    activeDiffBase = previousSha && currentSha
      ? `git diff --unified=0 ${previousSha} ${currentSha}`
      : 'git diff --unified=0 HEAD~1 HEAD';

    return run(diffCommand)
      .split(/\r?\n/)
      .map(line => line.trim().replace(/\\/g, '/'))
      .filter(Boolean)
      .filter(file => file !== 'data/changelog.json')
      .filter(file => !isCacheBustOnly(file));
  } catch {
    return [];
  }
};

const rules = [
  {
    key: 'changelog',
    type: 'added',
    title: 'Changelog Otomatis',
    description: 'Riwayat update kini dibuat dari file yang berubah, lalu ditampilkan dengan bahasa yang lebih rapi dan mudah dipahami mahasiswa.',
    match: file => file.includes('changelog') || file === 'scripts/generate-changelog.js' || file === 'js/changelog.js'
  },
  {
    key: 'floating-help',
    type: 'improved',
    title: 'Bantuan & FAQ Mengambang',
    description: 'Akses Bantuan dan FAQ dipindahkan menjadi tombol mengambang agar navbar lebih ringkas, tetapi tetap mudah ditemukan mahasiswa.',
    match: (file, diff) => file === 'pages/help.html' || ((file === 'js/navbar.js' || file === 'css/navbar.css') && diff.includes('floating-help'))
  },
  {
    key: 'compact-navbar',
    type: 'improved',
    title: 'Navbar Lebih Ringkas',
    description: 'Menu utama dirapikan menjadi kelompok Materi dan Info agar navigasi tidak terlalu penuh di desktop maupun mobile.',
    match: (file, diff) => (file === 'js/navbar.js' || file === 'css/navbar.css') && diff.includes('nav-dropdown')
  },
  {
    key: 'global-search',
    type: 'improved',
    title: 'Pencarian Global',
    description: 'Pencarian global diperbarui agar mahasiswa lebih mudah menemukan halaman, resource, video, tools, bantuan, dan riwayat update.',
    match: (file, diff) => (file === 'js/navbar.js' || file === 'css/navbar.css') && diff.includes('global-search')
  },
  {
    key: 'admin-dashboard',
    type: 'improved',
    title: 'Dashboard Admin',
    description: 'Dashboard admin ditingkatkan agar navigasi, tampilan mobile, ringkasan data, dan akses ke bagian log lebih nyaman digunakan.',
    match: file => file.startsWith('pages/admin/') || file === 'js/admin-panel.js' || file === 'css/admin.css'
  },
  {
    key: 'student-access',
    type: 'improved',
    title: 'Akses dan Login Mahasiswa',
    description: 'Alur login, sesi akun, dan pengalaman mahasiswa diperbaiki agar akses lintas perangkat lebih stabil.',
    match: file => file === 'student-login.html' || file === 'js/student-auth.js'
  },
  {
    key: 'civil-tools',
    type: 'improved',
    title: 'Tools Teknik Sipil',
    description: 'Tools akademik Teknik Sipil diperbarui untuk membantu perhitungan, analisis struktur, preliminary design, dan pengelolaan file.',
    match: file => file.startsWith('tools/') || file.startsWith('js/diagram') || file.startsWith('js/preliminary') || file.startsWith('js/tulangan') || file === 'pages/tools.html' || file === 'js/tools.js'
  },
  {
    key: 'resources-content',
    type: 'improved',
    title: 'Resource dan Materi Akademik',
    description: 'Halaman materi, praktikum, studio, software, video, dan akses file diperbarui agar konten akademik lebih mudah ditemukan dan digunakan.',
    match: file => ['pages/resources.html', 'pages/praktikum-studio.html', 'pages/videos.html', 'pages/software.html', 'pages/access.html'].includes(file) || file.startsWith('data/') || ['js/resources.js', 'js/videos.js', 'js/praktikum-studio.js', 'js/access.js'].includes(file)
  },
  {
    key: 'help-information',
    type: 'added',
    title: 'Bantuan Mahasiswa',
    description: 'Panduan penggunaan SIPIL CARE ditambahkan agar mahasiswa dapat memahami login, download resource, tools, dan cara menghubungi admin.',
    match: file => file === 'pages/help.html'
  },
  {
    key: 'public-interface',
    type: 'improved',
    title: 'Tampilan Public Website',
    description: 'Tampilan halaman public diperhalus agar lebih responsif, konsisten, dan nyaman dibuka dari perangkat mobile.',
    match: file => file === 'css/style.css' || file === 'index.html' || file.startsWith('pages/')
  },
  {
    key: 'backend-security',
    type: 'fixed',
    title: 'Backend dan Permission',
    description: 'Dokumentasi serta fungsi backend terkait akun, role, permission, dan sesi admin diperbaiki agar sistem lebih aman dan konsisten.',
    match: file => file.startsWith('SUPABASE') || file.startsWith('api/') || file.startsWith('functions/') || file.endsWith('.rules')
  }
];

const changedFiles = parseStatus();
const matched = rules.filter(rule => changedFiles.some(file => rule.match(file, readFileDiff(file))));
const selected = matched.length ? matched : [{
  key: 'maintenance',
  type: 'improved',
  title: 'Pemeliharaan Website',
  description: 'SIPIL CARE mendapatkan pembaruan teknis untuk menjaga stabilitas dan kenyamanan penggunaan.'
}];

const date = todayId();
const generatedKey = `${date}:${selected.map(item => item.key).sort().join(',')}`;
let existing = [];
try {
  existing = JSON.parse(fs.readFileSync(outputPath, 'utf8'));
  if (!Array.isArray(existing)) existing = [];
} catch {
  existing = [];
}

const nextEntry = {
  id: generatedKey,
  date,
  dateLabel: todayLabel(date),
  generated: true,
  summary: selected.length === 1
    ? selected[0].title
    : selected.map(item => item.title).slice(0, 3).join(', '),
  items: selected.map(item => ({
    type: item.type,
    title: item.title,
    description: item.description
  }))
};

const next = [nextEntry, ...existing.filter(item => item.id !== generatedKey)].slice(0, 40);
fs.writeFileSync(outputPath, `${JSON.stringify(next, null, 2)}\n`);
console.log(`Changelog updated: ${selected.length} item(s), ${changedFiles.length} changed file(s).`);
