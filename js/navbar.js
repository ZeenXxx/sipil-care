const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const pathName = location.pathname.replace(/\\/g, '/');
const isPagesPath = pathName.includes('/pages/') && !pathName.includes('/pages/admin/');
const isToolsPath = pathName.includes('/tools/');
const siteRootPrefix = (isPagesPath || isToolsPath) ? '../' : '';
const siteRootUrl = new URL(siteRootPrefix || './', location.href);
const CLIENT_ERROR_KEY = 'sipilcare_client_errors';
const cleanInternalUrl = value => {
  const clean = String(value || '')
    .replace(/(^|\/)index\.html(?=([?#]|$))/g, '$1')
    .replace(/\.html(?=([?#]|$))/g, '');
  return clean || './';
};
const pageName = value => {
  const page = String(value || '').split('/').pop() || 'index';
  return page.endsWith('.html') ? page : `${page}.html`;
};
const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
}[char]));

const saveClientError = payload => {
  try {
    const errors = JSON.parse(localStorage.getItem(CLIENT_ERROR_KEY) || '[]');
    const entry = {
      type: payload.type || 'error',
      message: String(payload.message || 'Error browser tidak diketahui').slice(0, 240),
      source: String(payload.source || '').slice(0, 240),
      stack: String(payload.stack || '').slice(0, 500),
      page: location.pathname,
      time: new Date().toISOString()
    };
    localStorage.setItem(CLIENT_ERROR_KEY, JSON.stringify([entry, ...errors].slice(0, 30)));
    if (navigator.onLine) {
      fetch(new URL('api/client-error', siteRootUrl).href, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          userAgent: navigator.userAgent
        }),
        keepalive: true
      }).catch(() => null);
    }
  } catch {
    // localStorage can be unavailable in strict browser privacy modes.
  }
};

window.SIPILCARE_LOG_CLIENT_ERROR = saveClientError;
window.addEventListener('error', event => {
  saveClientError({
    type: 'javascript',
    message: event.message,
    source: `${event.filename || 'inline'}:${event.lineno || 0}:${event.colno || 0}`,
    stack: event.error?.stack
  });
});
window.addEventListener('unhandledrejection', event => {
  saveClientError({
    type: 'promise',
    message: event.reason?.message || event.reason,
    source: 'unhandledrejection',
    stack: event.reason?.stack
  });
});

const shouldSkipMaintenance = () => {
  const path = location.pathname.toLowerCase();
  return path.includes('/pages/admin/')
    || path.endsWith('/login.html')
    || path.endsWith('/login')
    || path.endsWith('/student-login.html')
    || path.endsWith('/student-login')
    || path.includes('panel-hms-sipil-2026');
};

const renderMaintenanceOverlay = settings => {
  if (document.querySelector('.maintenance-overlay')) return;
  const overlay = document.createElement('div');
  overlay.className = 'maintenance-overlay';
  overlay.innerHTML = `
    <section class="maintenance-dialog" role="dialog" aria-modal="true">
      <img src="${siteRootPrefix}assets/images/logo-hms.png" alt="Logo HMS">
      <span>Maintenance Mode</span>
      <h1>${escapeHtml(settings.title || 'SIPIL CARE sedang diperbarui')}</h1>
      <p>${escapeHtml(settings.message || 'Kami sedang melakukan perbaikan sistem. Silakan coba beberapa saat lagi.')}</p>
    </section>
  `;
  document.body.appendChild(overlay);
  document.documentElement.classList.add('maintenance-active');
};

const checkMaintenanceMode = async () => {
  if (shouldSkipMaintenance()) return;
  try {
    const [{ app }, firestore] = await Promise.all([
      import(new URL('js/firebase-config.js', siteRootUrl).href),
      import('https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js')
    ]);
    const snapshot = await firestore.getDoc(firestore.doc(firestore.getFirestore(app), 'site_settings', 'maintenance'));
    const settings = snapshot.exists() ? snapshot.data() : {};
    if (settings.enabled === true) renderMaintenanceOverlay(settings);
  } catch (error) {
    try {
      const response = await fetch(new URL('data/maintenance.json', siteRootUrl).href, { cache: 'no-store' });
      if (!response.ok) return;
      const settings = await response.json();
      if (settings.enabled === true) renderMaintenanceOverlay(settings);
    } catch {
      saveClientError({
        type: 'maintenance',
        message: error.message || 'Maintenance check failed',
        source: 'navbar.js'
      });
    }
  }
};

checkMaintenanceMode();

const resolveSitePath = path => {
  if (/^https?:\/\//i.test(path) || path.startsWith('#')) return path;
  let resolved = path;
  if (path.startsWith('pages/')) {
    if (isPagesPath) resolved = path.replace(/^pages\//, '');
    else if (isToolsPath) resolved = `../${path}`;
    return cleanInternalUrl(resolved);
  }
  if (path.startsWith('tools/')) {
    if (isToolsPath) resolved = path.replace(/^tools\//, '');
    else if (isPagesPath) resolved = `../${path}`;
    return cleanInternalUrl(resolved);
  }
  if (path === 'index.html') return (isPagesPath || isToolsPath) ? '../' : './';
  resolved = (isPagesPath || isToolsPath) ? `../${path}` : path;
  return cleanInternalUrl(resolved);
};

const cleanDocumentLinks = (root = document) => {
  root.querySelectorAll('a[href]').forEach(link => {
    const href = link.getAttribute('href') || '';
    if (!href || href.startsWith('#') || /^(https?:|mailto:|tel:|javascript:)/i.test(href)) return;
    const cleanHref = cleanInternalUrl(href);
    if (cleanHref !== href) link.setAttribute('href', cleanHref);
  });
};

const closeMenu = () => {
  if (!menuToggle || !navLinks) return;
  navLinks.classList.remove('active');
  menuToggle.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
  navLinks.querySelectorAll('.nav-dropdown.open').forEach(item => {
    item.classList.remove('open');
    item.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
  });
};

const isCurrentNavUrl = url => {
  const current = pageName(location.pathname);
  const [cleanUrl, query = ''] = String(url || '').split('#')[0].split('?');
  const linkPage = pageName(cleanUrl);
  const currentParams = new URLSearchParams(location.search);
  const linkParams = new URLSearchParams(query);
  const linkCategory = linkParams.get('category');
  const currentCategory = currentParams.get('category');
  if (linkPage === 'resources.html' && current === 'resources.html') {
    if (linkCategory) return currentCategory === linkCategory;
    return !currentCategory;
  }
  if (linkPage === current) return true;
  if (pathName.includes('/tools/') && linkPage === 'tools.html') return true;
  return false;
};

const createNavLink = item => {
  const link = document.createElement('a');
  link.href = resolveSitePath(item.href);
  link.textContent = item.label;
  if (isCurrentNavUrl(item.href)) link.classList.add('active');
  return link;
};

const createNavDropdown = ({ label, items }) => {
  const dropdown = document.createElement('div');
  dropdown.className = 'nav-dropdown';
  if (items.some(item => isCurrentNavUrl(item.href))) dropdown.classList.add('active');

  const button = document.createElement('button');
  button.className = 'nav-dropdown-toggle';
  button.type = 'button';
  button.setAttribute('aria-expanded', 'false');
  button.textContent = label;

  const menu = document.createElement('div');
  menu.className = 'nav-dropdown-menu';
  items.forEach(item => menu.appendChild(createNavLink(item)));

  button.addEventListener('click', event => {
    event.stopPropagation();
    const open = !dropdown.classList.contains('open');
    navLinks.querySelectorAll('.nav-dropdown.open').forEach(item => {
      if (item === dropdown) return;
      item.classList.remove('open');
      item.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
    });
    dropdown.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
  });

  dropdown.appendChild(button);
  dropdown.appendChild(menu);
  return dropdown;
};

const buildCompactNavbar = () => {
  if (!navLinks || navLinks.dataset.compactNav === 'true') return;
  navLinks.dataset.compactNav = 'true';
  navLinks.innerHTML = '';
  navLinks.appendChild(createNavLink({ label: 'Home', href: 'index.html' }));
  navLinks.appendChild(createNavDropdown({
    label: 'Materi',
    items: [
      { label: 'Resources', href: 'pages/resources.html' },
      { label: 'Praktikum & Studio', href: 'pages/praktikum-studio.html' },
      { label: 'Videos', href: 'pages/videos.html' },
      { label: 'Software', href: 'pages/resources.html?category=Software' }
    ]
  }));
  navLinks.appendChild(createNavLink({ label: 'Tools', href: 'pages/tools.html' }));
  navLinks.appendChild(createNavDropdown({
    label: 'Info',
    items: [
      { label: 'About', href: 'pages/about.html' },
      { label: 'Developer', href: 'pages/developer.html' },
      { label: 'Contact', href: 'pages/contact.html' },
      { label: 'Changelog', href: 'pages/changelog.html' }
    ]
  }));
};

if (menuToggle && navLinks) {
  buildCompactNavbar();

  menuToggle.addEventListener('click', () => {
    const open = !navLinks.classList.contains('active');
    navLinks.classList.toggle('active', open);
    menuToggle.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });

  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('click', event => {
    if (!navLinks.contains(event.target)) {
      navLinks.querySelectorAll('.nav-dropdown.open').forEach(item => {
        item.classList.remove('open');
        item.querySelector('.nav-dropdown-toggle')?.setAttribute('aria-expanded', 'false');
      });
    }
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });
}

function createFloatingSocials() {
  const path = location.pathname.toLowerCase();
  const blockedPages = ['admin', 'panel-hms', 'login.html', '/login'];
  if (blockedPages.some(page => path.includes(page))) return;
  if (document.querySelector('.floating-socials')) return;

  const socials = [
    {
      label: 'Instagram HMS Unjani',
      className: 'instagram',
      href: 'https://www.instagram.com/hmsunjani',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"></rect><circle cx="12" cy="12" r="4"></circle><circle cx="17.5" cy="6.5" r="1.2"></circle></svg>'
    },
    {
      label: 'YouTube HMS Unjani',
      className: 'youtube',
      href: 'https://youtube.com/@hmsunjani1986?si=d_lPiLa4u7yzBDYE',
      icon: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 8.2a3 3 0 0 0-2.1-2.1C17 5.6 12 5.6 12 5.6s-5 0-6.9.5A3 3 0 0 0 3 8.2a31.2 31.2 0 0 0 0 7.6 3 3 0 0 0 2.1 2.1c1.9.5 6.9.5 6.9.5s5 0 6.9-.5a3 3 0 0 0 2.1-2.1 31.2 31.2 0 0 0 0-7.6Z"></path><path d="m10 9 5 3-5 3Z"></path></svg>'
    }
  ];

  const wrap = document.createElement('div');
  wrap.className = 'floating-socials';
  wrap.setAttribute('aria-label', 'Media sosial HMS Unjani');
  socials.forEach(item => {
    const link = document.createElement('a');
    link.className = `floating-social ${item.className}`;
    link.href = item.href;
    link.target = '_blank';
    link.rel = 'noopener';
    link.setAttribute('aria-label', item.label);
    link.title = item.label;
    link.innerHTML = item.icon;
    wrap.appendChild(link);
  });
  document.body.appendChild(wrap);
}

createFloatingSocials();

function createFloatingHelp() {
  const path = location.pathname.toLowerCase();
  const blockedPages = ['admin', 'panel-hms', 'login.html', '/login'];
  if (blockedPages.some(page => path.includes(page))) return;
  if (document.querySelector('.floating-help')) return;

  const link = document.createElement('a');
  link.className = 'floating-help';
  link.href = resolveSitePath('pages/help.html');
  link.setAttribute('aria-label', 'Buka Bantuan dan FAQ');
  link.title = 'Bantuan & FAQ';
  link.innerHTML = '<span aria-hidden="true">?</span><b>FAQ</b>';
  document.body.appendChild(link);
}

createFloatingHelp();

function createGlobalSearch() {
  const navbar = document.querySelector('.navbar');
  const blockedPages = ['admin', 'panel-hms', 'login.html', '/login'];
  if (!navbar || document.querySelector('.global-search-toggle') || blockedPages.some(page => pathName.toLowerCase().includes(page))) return;

  const staticItems = [
    { title: 'Home', type: 'Halaman', url: 'index.html', text: 'Pemberitahuan HMS, tools akademik, video highlight, quick access' },
    { title: 'Resources', type: 'Materi', url: 'pages/resources.html', text: 'SNI, modul kuliah, referensi, materi akademik, software' },
    { title: 'Praktikum & Studio', type: 'Materi', url: 'pages/praktikum-studio.html', text: 'Modul praktikum, studio, CAD, BIM, geoteknik, hidraulika' },
    { title: 'Videos', type: 'Materi', url: 'pages/videos.html', text: 'Video pembelajaran teknik sipil dan software' },
    { title: 'Software', type: 'Materi', url: 'pages/resources.html?category=Software', text: 'Aplikasi, installer, software teknik sipil, CAD, BIM, analisis' },
    { title: 'Tools', type: 'Tools', url: 'pages/tools.html', text: 'Converter lengkap SI US, KML KMZ to CSV Civil 3D, response spectrum ETABS, PDF merger, PDF to image, JPG to PDF' },
    { title: 'KML/KMZ to CSV Civil 3D', type: 'Tools', url: 'pages/tools.html#kmlcsv', text: 'Google Earth KML KMZ menjadi CSV LAT LONG ALT tanpa header untuk Civil 3D' },
    { title: 'Response Spectrum ETABS', type: 'Tools', url: 'pages/tools.html#spectrum', text: 'Parameter RSA Web RSA Ss S1 Fa Fv TL menjadi file Excel siap import ETABS' },
    { title: 'Structural Diagram Analyzer', type: 'Tools', url: 'tools/diagram-struktur.html', text: 'Balok 1D, reaksi tumpuan, AFD, SFD, BMD' },
    { title: 'Preliminary Design SNI 2847:2019', type: 'Tools', url: 'tools/preliminary-design.html', text: 'Kolom, balok, pelat satu arah dua arah, dinding geser' },
    { title: 'Kalkulator Tulangan Balok', type: 'Tools', url: 'tools/tulangan-balok.html', text: 'Tulangan lentur, sengkang, Mu, Vu, fc, fy' },
    { title: 'About', type: 'Info', url: 'pages/about.html', text: 'Tentang SIPIL CARE dan FAQ singkat' },
    { title: 'Developer', type: 'Info', url: 'pages/developer.html', text: 'Tim pengembang dan informasi platform' },
    { title: 'Contact', type: 'Info', url: 'pages/contact.html', text: 'Kontak pengurus, live chat, pesan mahasiswa' },
    { title: 'Changelog', type: 'Update', url: 'pages/changelog.html', text: 'Riwayat update, perbaikan bug, fitur baru SIPIL CARE' },
    { title: 'Bantuan & FAQ', type: 'Bantuan', url: 'pages/help.html', text: 'Cara login, download resource, lupa password, pakai tools, hubungi admin' },
    { title: 'Login Mahasiswa', type: 'Bantuan', url: 'student-login.html', text: 'Masuk akun mahasiswa, NIM, password, sesi login, akses materi' },
    { title: 'Login Admin', type: 'Bantuan', url: 'login.html', text: 'Masuk akun admin, developer, role, permission, dashboard admin' },
    { title: 'Panduan mulai mahasiswa', type: 'Bantuan', url: 'pages/help.html', text: 'Login pertama, password awal NIM@Sipil, akun dibuat admin, cara mencari materi, alur lapor kendala' },
    { title: 'Lupa password mahasiswa', type: 'Bantuan', url: 'student-login.html?mode=recover', text: 'Reset password login, kode pemulihan, recovery, akun mahasiswa tidak bisa masuk' },
    { title: 'Format password awal', type: 'Bantuan', url: 'pages/help.html', text: 'Password awal mahasiswa adalah NIM@Sipil kecuali admin memberi password lain' },
    { title: 'Download resource bermasalah', type: 'Bantuan', url: 'pages/help.html', text: 'Tombol download tidak merespons, file tidak terbuka, akses resource gagal' },
    { title: 'Hubungi admin HMS', type: 'Bantuan', url: 'pages/contact.html', text: 'Kirim pesan, live chat, laporkan kendala login, resource, tools, atau download' }
  ];
  let searchItems = staticItems;

  const button = document.createElement('button');
  button.className = 'global-search-toggle';
  button.type = 'button';
  button.setAttribute('aria-label', 'Buka pencarian global');
  button.innerHTML = '<span>Search</span><b>Cari</b>';

  const overlay = document.createElement('div');
  overlay.className = 'global-search';
  overlay.hidden = true;
  overlay.innerHTML = `
    <div class="global-search-backdrop" data-search-close></div>
    <section class="global-search-panel" role="dialog" aria-modal="true" aria-label="Pencarian global">
      <div class="global-search-head">
        <div>
          <span class="eyebrow">Pencarian</span>
          <h2>Cari di SIPIL CARE</h2>
        </div>
        <button type="button" class="global-search-close" data-search-close aria-label="Tutup pencarian">Tutup</button>
      </div>
      <input class="global-search-input" type="search" placeholder="Cari SNI, tools, praktikum, video..." autocomplete="off">
      <div class="global-search-results"></div>
    </section>
  `;

  const toggle = navbar.querySelector('.menu-toggle');
  if (toggle) navbar.insertBefore(button, toggle);
  else navbar.appendChild(button);
  document.body.appendChild(overlay);

  const input = overlay.querySelector('.global-search-input');
  const results = overlay.querySelector('.global-search-results');
  const escapeText = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[char]);

  const normalize = value => String(value || '').toLowerCase().trim();
  const typeClass = type => normalize(type).replace(/[^a-z0-9]+/g, '-');
  const scoreItem = (item, terms) => {
    const title = normalize(item.title);
    const type = normalize(item.type);
    const text = normalize([item.text, item.category].join(' '));
    return terms.reduce((total, term) => {
      if (title.includes(term)) return total + 4;
      if (type.includes(term)) return total + 2;
      if (text.includes(term)) return total + 1;
      return total;
    }, 0);
  };

  const renderResults = () => {
    const q = normalize(input.value);
    if (!q) {
      results.innerHTML = `
        <p class="global-search-empty">Ketik kata kunci untuk mencari halaman, materi, tools, FAQ, atau changelog.</p>
        <div class="global-search-suggestions">
          <button type="button" data-search-suggest="login">login</button>
          <button type="button" data-search-suggest="download">download</button>
          <button type="button" data-search-suggest="SNI">SNI</button>
          <button type="button" data-search-suggest="praktikum">praktikum</button>
        </div>
      `;
      return;
    }
    const terms = q.split(/\s+/).filter(Boolean);
    const found = searchItems
      .map(item => {
        const score = scoreItem(item, terms);
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 12);

    results.innerHTML = found.length ? found.map(item => `
      <a class="global-search-result" href="${escapeText(resolveSitePath(item.url))}">
        <span class="search-type ${escapeText(typeClass(item.type))}">${escapeText(item.type)}</span>
        <strong>${escapeText(item.title)}</strong>
        <small>${escapeText(item.text || item.category || '')}</small>
      </a>
    `).join('') : '<p class="global-search-empty">Tidak ada hasil yang cocok. Coba kata kunci seperti login, download, SNI, tools, atau praktikum.</p>';
  };

  const loadSearchData = async () => {
    try {
      const [resourcesRes, videosRes] = await Promise.all([
        fetch(resolveSitePath('data/resources.json')),
        fetch(resolveSitePath('data/videos.json'))
      ]);
      const [resources, videos] = await Promise.all([
        resourcesRes.ok ? resourcesRes.json() : [],
        videosRes.ok ? videosRes.json() : []
      ]);
      const resourceItems = (Array.isArray(resources) ? resources : []).map(item => ({
        title: item.title,
        type: item.category === 'Software' ? 'Software' : 'Materi',
        category: item.category,
        url: `pages/resources.html${item.category ? `?category=${encodeURIComponent(item.category)}` : ''}`,
        text: [item.category, item.type, item.author, item.description].filter(Boolean).join(' ')
      }));
      const videoItems = (Array.isArray(videos) ? videos : []).map(item => ({
        title: item.title,
        type: 'Materi',
        category: item.category,
        url: `pages/videos.html${item.category ? `?category=${encodeURIComponent(item.category)}` : ''}`,
        text: [item.category, item.duration, item.description].filter(Boolean).join(' ')
      }));
      searchItems = [...staticItems, ...resourceItems, ...videoItems];
      renderResults();
    } catch (error) {
      console.warn('Global search data failed:', error);
    }
  };

  const openSearch = () => {
    overlay.hidden = false;
    document.body.classList.add('search-open');
    closeMenu();
    loadSearchData();
    requestAnimationFrame(() => input.focus());
    renderResults();
  };
  const closeSearch = () => {
    overlay.hidden = true;
    document.body.classList.remove('search-open');
  };

  button.addEventListener('click', openSearch);
  input.addEventListener('input', renderResults);
  results.addEventListener('click', event => {
    const suggest = event.target.closest('[data-search-suggest]');
    if (!suggest) return;
    input.value = suggest.dataset.searchSuggest;
    input.focus();
    renderResults();
  });
  overlay.querySelectorAll('[data-search-close]').forEach(item => item.addEventListener('click', closeSearch));
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      openSearch();
    }
    if (event.key === 'Escape' && !overlay.hidden) closeSearch();
  });
}

createGlobalSearch();
cleanDocumentLinks();

// ===== DARK MODE TOGGLE =====
(function() {
  // Apply saved preference immediately (before paint)
  const saved = localStorage.getItem('sipilcare_theme');
  if (saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark');
  }

  function createDarkToggle() {
    const navbar = document.querySelector('.navbar');
    if (!navbar || document.querySelector('.dark-toggle')) return;

    const btn = document.createElement('button');
    btn.className = 'dark-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.title = 'Ganti tema terang/gelap';
    btn.type = 'button';
    btn.innerHTML = `
      <svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79z"/>
      </svg>
      <svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="5"/>
        <line x1="12" y1="1" x2="12" y2="3"/>
        <line x1="12" y1="21" x2="12" y2="23"/>
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
        <line x1="1" y1="12" x2="3" y2="12"/>
        <line x1="21" y1="12" x2="23" y2="12"/>
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
      </svg>
    `;

    btn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.toggle('dark');
      localStorage.setItem('sipilcare_theme', isDark ? 'dark' : 'light');
    });

    // Insert before menu-toggle (or at end of navbar)
    const toggle = navbar.querySelector('.menu-toggle');
    if (toggle) {
      navbar.insertBefore(btn, toggle);
    } else {
      navbar.appendChild(btn);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', createDarkToggle);
  } else {
    createDarkToggle();
  }
})();
