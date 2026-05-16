const ADMINS = {
  developer: {
    username: 'developer',
    password: 'sipilcare123',
    name: 'Developer SIPIL CARE',
    role: 'developer',
    roleLabel: 'Developer',
    allowedPages: ['dashboard.html', 'resources.html', 'announcements.html', 'messages.html'],
    permissions: ['dashboard', 'resources', 'announcements', 'messages', 'audit']
  },
  pendprof: {
    username: 'pendprof',
    password: 'pendprof123',
    name: 'PENDPROF HMS',
    role: 'pendprof_hms',
    roleLabel: 'PENDPROF HMS',
    allowedPages: ['resources.html', 'messages.html'],
    permissions: ['resources', 'messages']
  },
  externalhms: {
    username: 'externalhms',
    password: 'external123',
    name: 'External HMS',
    role: 'external_hms',
    roleLabel: 'External HMS',
    allowedPages: ['announcements.html', 'messages.html'],
    permissions: ['announcements', 'messages']
  }
};

const LEGACY_ADMIN = {
  username: 'adminsipil',
  password: 'sipilcare123',
  name: 'Developer SIPIL CARE',
  role: 'developer',
  roleLabel: 'Developer',
  allowedPages: ['dashboard.html', 'resources.html', 'announcements.html', 'messages.html'],
  permissions: ['dashboard', 'resources', 'announcements', 'messages', 'audit']
};
const toast = m => {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = m;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
};

const path = location.pathname;
const inAdminPages = path.includes('/pages/admin/') || path.includes('\\pages\\admin\\');
const inPagesFolder = path.includes('/pages/') || path.includes('\\pages\\');
const rootPrefix = inAdminPages ? '../../' : inPagesFolder ? '../' : '';
const panelHmsPath = `${rootPrefix}pages/admin/dashboard.html`;
const loginPagePath = `${rootPrefix}pages/admin-panel.html`;
const username = document.getElementById('username');
const password = document.getElementById('password');

const parseAdminProfile = () => {
  try {
    return JSON.parse(sessionStorage.getItem('sipilcare_admin_profile') || '{}');
  } catch {
    return {};
  }
};

const normalizeAdminProfile = profile => ({
  ...profile,
  allowedPages: profile.allowedPages || LEGACY_ADMIN.allowedPages,
  permissions: profile.permissions || LEGACY_ADMIN.permissions
});

const currentAdminPage = () => path.split('/').pop() || 'dashboard.html';
const firstAllowedPath = profile => `${rootPrefix}pages/admin/${normalizeAdminProfile(profile).allowedPages[0] || 'dashboard.html'}`;
const canAccessCurrentAdminPage = profile => {
  if (!inAdminPages) return true;
  const page = currentAdminPage();
  return normalizeAdminProfile(profile).allowedPages.includes(page);
};

if ((path.includes('panel-hms-sipil-2026.html') || inAdminPages) && sessionStorage.getItem('sipilcare_admin') !== 'true') {
  location.href = loginPagePath;
}

if (inAdminPages && sessionStorage.getItem('sipilcare_admin') === 'true') {
  const profile = parseAdminProfile();
  if (!canAccessCurrentAdminPage(profile)) {
    location.href = firstAllowedPath(profile);
  }
}

if ((path.includes('admin-panel.html') || path.includes('login.html')) && sessionStorage.getItem('sipilcare_admin') === 'true') {
  location.href = firstAllowedPath(parseAdminProfile());
}

document.getElementById('loginForm')?.addEventListener('submit', e => {
  e.preventDefault();

  const admin = ADMINS[username?.value.trim()] || (username?.value.trim() === LEGACY_ADMIN.username ? LEGACY_ADMIN : null);
  if (admin && password?.value === admin.password) {
    sessionStorage.setItem('sipilcare_admin', 'true');
    sessionStorage.setItem('sipilcare_admin_profile', JSON.stringify({
      username: admin.username,
      name: admin.name,
      role: admin.role,
      roleLabel: admin.roleLabel,
      allowedPages: admin.allowedPages,
      permissions: admin.permissions
    }));
    location.href = firstAllowedPath(admin);
  } else {
    toast('Username atau password salah.');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('sipilcare_admin');
  sessionStorage.removeItem('sipilcare_admin_profile');
  location.href = loginPagePath;
});
