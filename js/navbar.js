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
