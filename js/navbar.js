const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');
const pathName = location.pathname.replace(/\\/g, '/');
const isPagesPath = pathName.includes('/pages/') && !pathName.includes('/pages/admin/');
const isToolsPath = pathName.includes('/tools/');

const resolveSitePath = path => {
  if (/^https?:\/\//i.test(path) || path.startsWith('#')) return path;
  if (path.startsWith('pages/')) {
    if (isPagesPath) return path.replace(/^pages\//, '');
    if (isToolsPath) return `../${path}`;
    return path;
  }
  if (path.startsWith('tools/')) {
    if (isToolsPath) return path.replace(/^tools\//, '');
    if (isPagesPath) return `../${path}`;
    return path;
  }
  if (path === 'index.html') return (isPagesPath || isToolsPath) ? '../index.html' : 'index.html';
  return (isPagesPath || isToolsPath) ? `../${path}` : path;
};

const closeMenu = () => {
  if (!menuToggle || !navLinks) return;
  navLinks.classList.remove('active');
  menuToggle.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
};

if (menuToggle && navLinks) {
  if (!navLinks.querySelector('[data-changelog-link]')) {
    const changelogLink = document.createElement('a');
    changelogLink.href = resolveSitePath('pages/changelog.html');
    changelogLink.dataset.changelogLink = 'true';
    changelogLink.textContent = 'Changelog';
    navLinks.appendChild(changelogLink);
  }

  menuToggle.addEventListener('click', () => {
    const open = !navLinks.classList.contains('active');
    navLinks.classList.toggle('active', open);
    menuToggle.classList.toggle('active', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    document.body.classList.toggle('nav-open', open);
  });

  navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeMenu();
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 820) closeMenu();
  });

  const current = location.pathname.split('/').pop() || 'index.html';
  navLinks.querySelectorAll('a').forEach(anchor => {
    if ((anchor.getAttribute('href') || '').endsWith(current)) anchor.classList.add('active');
  });
}

function createFloatingSocials() {
  const path = location.pathname.toLowerCase();
  const blockedPages = ['admin', 'panel-hms', 'login.html'];
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
  const blockedPages = ['admin', 'panel-hms', 'login.html'];
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
  const blockedPages = ['admin', 'panel-hms', 'login.html'];
  if (!navbar || document.querySelector('.global-search-toggle') || blockedPages.some(page => pathName.toLowerCase().includes(page))) return;

  const staticItems = [
    { title: 'Home', type: 'Halaman', url: 'index.html', text: 'Pemberitahuan HMS, tools akademik, video highlight, quick access' },
    { title: 'Resources', type: 'Halaman', url: 'pages/resources.html', text: 'SNI, modul kuliah, referensi, materi akademik, software' },
    { title: 'Praktikum & Studio', type: 'Halaman', url: 'pages/praktikum-studio.html', text: 'Modul praktikum, studio, CAD, BIM, geoteknik, hidraulika' },
    { title: 'Videos', type: 'Halaman', url: 'pages/videos.html', text: 'Video pembelajaran teknik sipil dan software' },
    { title: 'Tools', type: 'Halaman', url: 'pages/tools.html', text: 'Converter, PDF merger, PDF to image, JPG to PDF' },
    { title: 'Structural Diagram Analyzer', type: 'Tool', url: 'tools/diagram-struktur.html', text: 'Balok 1D, reaksi tumpuan, AFD, SFD, BMD' },
    { title: 'Preliminary Design SNI 2847:2019', type: 'Tool', url: 'tools/preliminary-design.html', text: 'Kolom, balok, pelat satu arah dua arah, dinding geser' },
    { title: 'Kalkulator Tulangan Balok', type: 'Tool', url: 'tools/tulangan-balok.html', text: 'Tulangan lentur, sengkang, Mu, Vu, fc, fy' },
    { title: 'About', type: 'Halaman', url: 'pages/about.html', text: 'Tentang SIPIL CARE dan FAQ singkat' },
    { title: 'Developer', type: 'Halaman', url: 'pages/developer.html', text: 'Tim pengembang dan informasi platform' },
    { title: 'Contact', type: 'Halaman', url: 'pages/contact.html', text: 'Kontak pengurus, live chat, pesan mahasiswa' },
    { title: 'Changelog', type: 'Info Update', url: 'pages/changelog.html', text: 'Riwayat update, perbaikan bug, fitur baru SIPIL CARE' },
    { title: 'Bantuan & FAQ', type: 'Bantuan', url: 'pages/help.html', text: 'Cara login, download resource, lupa password, pakai tools, hubungi admin' }
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
  const renderResults = () => {
    const q = normalize(input.value);
    if (!q) {
      results.innerHTML = '<p class="global-search-empty">Ketik kata kunci untuk mencari halaman, resource, video, atau tools.</p>';
      return;
    }
    const terms = q.split(/\s+/).filter(Boolean);
    const found = searchItems
      .map(item => {
        const haystack = normalize([item.title, item.type, item.text, item.category].join(' '));
        const score = terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
        return { ...item, score };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
      .slice(0, 10);

    results.innerHTML = found.length ? found.map(item => `
      <a class="global-search-result" href="${escapeText(resolveSitePath(item.url))}">
        <span>${escapeText(item.type)}</span>
        <strong>${escapeText(item.title)}</strong>
        <small>${escapeText(item.text || item.category || '')}</small>
      </a>
    `).join('') : '<p class="global-search-empty">Tidak ada hasil yang cocok.</p>';
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
        type: item.category === 'Software' ? 'Software' : 'Resource',
        category: item.category,
        url: `pages/resources.html${item.category ? `?category=${encodeURIComponent(item.category)}` : ''}`,
        text: [item.category, item.type, item.author, item.description].filter(Boolean).join(' ')
      }));
      const videoItems = (Array.isArray(videos) ? videos : []).map(item => ({
        title: item.title,
        type: 'Video',
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
