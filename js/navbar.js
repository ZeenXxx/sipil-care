const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

const closeMenu = () => {
  if (!menuToggle || !navLinks) return;
  navLinks.classList.remove('active');
  menuToggle.classList.remove('active');
  menuToggle.setAttribute('aria-expanded', 'false');
  document.body.classList.remove('nav-open');
};

if (menuToggle && navLinks) {
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
