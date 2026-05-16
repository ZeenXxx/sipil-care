const LEGACY_ADMIN = {
  username: 'adminsipil',
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
const adminLoginEndpoint = `${rootPrefix}api/admin-login`;
const ADMIN_TOKEN_KEY = 'sipilcare_admin_token';
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

document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const submit = e.currentTarget.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;

  try {
    const response = await fetch(adminLoginEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: username?.value.trim(),
        password: password?.value
      })
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok || !result.profile) {
      throw new Error(result.message || 'Username atau password salah.');
    }

    const admin = normalizeAdminProfile(result.profile);
    sessionStorage.setItem('sipilcare_admin', 'true');
    sessionStorage.setItem('sipilcare_admin_profile', JSON.stringify(admin));
    sessionStorage.setItem(ADMIN_TOKEN_KEY, result.token || '');
    location.href = firstAllowedPath(admin);
  } catch (error) {
    toast(error.message || 'Login admin gagal.');
  } finally {
    if (submit) submit.disabled = false;
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('sipilcare_admin');
  sessionStorage.removeItem('sipilcare_admin_profile');
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
  location.href = loginPagePath;
});
