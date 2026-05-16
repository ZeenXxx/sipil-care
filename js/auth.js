const FALLBACK_ADMIN = {
  username: 'adminsipil',
  name: 'Developer SIPIL CARE',
  role: 'admin_sipil',
  roleLabel: 'Admin SIPIL CARE',
  allowedPages: ['resources.html', 'announcements.html', 'messages.html'],
  permissions: ['resources', 'announcements', 'messages']
};

const ADMIN_SESSION_KEY = 'sipilcare_admin';
const ADMIN_PROFILE_KEY = 'sipilcare_admin_profile';
const ADMIN_SESSION_TTL = 12 * 60 * 60 * 1000;
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
const loginPagePath = `${rootPrefix}pages/admin-panel.html`;
const username = document.getElementById('username');
const password = document.getElementById('password');

const parseAdminProfile = () => {
  try {
    const profile = JSON.parse(sessionStorage.getItem(ADMIN_PROFILE_KEY) || '{}');
    if (!profile?.username || !profile?.loggedInAt) return {};
    if (Date.now() - profile.loggedInAt > ADMIN_SESSION_TTL) {
      clearAdminSession();
      return {};
    }
    return profile;
  } catch {
    return {};
  }
};

const normalizeList = value => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch {
      return value.split(',').map(item => item.trim()).filter(Boolean);
    }
  }
  return [];
};

const normalizeAdminProfile = profile => ({
  username: profile.username || FALLBACK_ADMIN.username,
  name: profile.name || FALLBACK_ADMIN.name,
  role: profile.role || FALLBACK_ADMIN.role,
  roleLabel: profile.roleLabel || profile.role_label || FALLBACK_ADMIN.roleLabel,
  allowedPages: normalizeList(profile.allowedPages || profile.allowed_pages).length
    ? normalizeList(profile.allowedPages || profile.allowed_pages)
    : FALLBACK_ADMIN.allowedPages,
  permissions: normalizeList(profile.permissions).length
    ? normalizeList(profile.permissions)
    : FALLBACK_ADMIN.permissions,
  loggedInAt: profile.loggedInAt || Date.now()
});

function clearAdminSession() {
  sessionStorage.removeItem(ADMIN_SESSION_KEY);
  sessionStorage.removeItem(ADMIN_PROFILE_KEY);
}

const hasAdminSession = () => {
  const profile = parseAdminProfile();
  return sessionStorage.getItem(ADMIN_SESSION_KEY) === 'true' && Boolean(profile.username);
};

const currentAdminPage = () => path.split('/').pop() || 'dashboard.html';
const firstAllowedPath = profile => `${rootPrefix}pages/admin/${normalizeAdminProfile(profile).allowedPages[0] || 'dashboard.html'}`;
const canAccessCurrentAdminPage = profile => {
  if (!inAdminPages) return true;
  const page = currentAdminPage();
  return normalizeAdminProfile(profile).allowedPages.includes(page);
};

const sha256 = async value => {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map(byte => byte.toString(16).padStart(2, '0')).join('');
};

const loadSupabaseScript = () => new Promise((resolve, reject) => {
  if (window.supabase) {
    resolve();
    return;
  }
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  script.onload = resolve;
  script.onerror = () => reject(new Error('Gagal memuat Supabase client.'));
  document.head.appendChild(script);
});

let supabaseClient = null;
const getSupabase = async () => {
  const config = window.SIPILCARE_AUTH_CONFIG;
  if (!config?.supabaseUrl || !config?.supabaseAnonKey) {
    throw new Error('Konfigurasi Supabase belum tersedia.');
  }
  if (supabaseClient) return supabaseClient;
  await loadSupabaseScript();
  supabaseClient = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey);
  return supabaseClient;
};

const adminTableName = () => window.SIPILCARE_AUTH_CONFIG?.adminTableName || 'admins';

const remoteAdminLogin = async ({ username: inputUsername, password: inputPassword }) => {
  const db = await getSupabase();
  const { data, error } = await db
    .from(adminTableName())
    .select('username,name,password_hash,role,role_label,allowed_pages,permissions,is_active')
    .eq('username', String(inputUsername || '').trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data || data.is_active === false || data.password_hash !== await sha256(inputPassword || '')) {
    throw new Error('Username atau password salah.');
  }

  return normalizeAdminProfile(data);
};

if ((path.includes('panel-hms-sipil-2026.html') || inAdminPages) && !hasAdminSession()) {
  location.href = loginPagePath;
}

if (inAdminPages && hasAdminSession()) {
  const profile = parseAdminProfile();
  if (!canAccessCurrentAdminPage(profile)) {
    location.href = firstAllowedPath(profile);
  }
}

if ((path.includes('admin-panel.html') || path.includes('login.html')) && hasAdminSession()) {
  location.href = firstAllowedPath(parseAdminProfile());
}

document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const submit = e.currentTarget.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;

  try {
    const admin = await remoteAdminLogin({
      username: username?.value,
      password: password?.value
    });
    sessionStorage.setItem(ADMIN_SESSION_KEY, 'true');
    sessionStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify({
      ...admin,
      loggedInAt: Date.now()
    }));
    location.href = firstAllowedPath(admin);
  } catch (error) {
    console.error('Admin login failed:', error);
    toast(error.message || 'Login admin gagal.');
  } finally {
    if (submit) submit.disabled = false;
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  clearAdminSession();
  location.href = loginPagePath;
});
