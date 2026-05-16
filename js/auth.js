const FALLBACK_ADMIN = {
  username: 'adminsipil',
  name: 'Developer SIPIL CARE',
  role: 'admin_sipil',
  roleLabel: 'Admin SIPIL CARE',
  allowedPages: ['resources.html', 'announcements.html', 'messages.html'],
  permissions: ['resources', 'announcements', 'messages']
};

const ADMIN_SESSION_KEY = 'sipilcare_admin_session';
const ADMIN_PROFILE_KEY = 'sipilcare_admin_profile';
const ADMIN_SESSION_TTL = 30 * 60 * 1000;
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
  sessionCheckedAt: Date.now()
});

const readLocalJson = key => {
  try {
    return JSON.parse(localStorage.getItem(key) || '{}');
  } catch {
    return {};
  }
};

const parseAdminProfile = () => normalizeAdminProfile(readLocalJson(ADMIN_PROFILE_KEY));
const readAdminSession = () => readLocalJson(ADMIN_SESSION_KEY);

function clearAdminSession() {
  localStorage.removeItem(ADMIN_SESSION_KEY);
  localStorage.removeItem(ADMIN_PROFILE_KEY);
  localStorage.removeItem('sipilcare_admin_login_tracked');
}

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

const randomToken = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(byte => byte.toString(16).padStart(2, '0')).join('');
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
const adminSessionTableName = () => window.SIPILCARE_AUTH_CONFIG?.adminSessionTableName || 'admin_sessions';

const saveAdminSession = ({ token, profile }) => {
  localStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
    token,
    username: profile.username,
    savedAt: Date.now()
  }));
  localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(normalizeAdminProfile(profile)));
};

const fetchAdminProfile = async (db, usernameValue) => {
  const { data, error } = await db
    .from(adminTableName())
    .select('username,name,password_hash,role,role_label,allowed_pages,permissions,is_active')
    .eq('username', String(usernameValue || '').trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  if (!data || data.is_active === false) throw new Error('Akun admin tidak aktif.');
  return data;
};

const remoteAdminLogin = async ({ username: inputUsername, password: inputPassword }) => {
  const db = await getSupabase();
  const admin = await fetchAdminProfile(db, inputUsername);
  if (admin.password_hash !== await sha256(inputPassword || '')) {
    throw new Error('Username atau password salah.');
  }

  const token = randomToken();
  const tokenHash = await sha256(token);
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ADMIN_SESSION_TTL);
  const profile = normalizeAdminProfile(admin);

  const { error } = await db
    .from(adminSessionTableName())
    .insert({
      token_hash: tokenHash,
      username: profile.username,
      created_at: now.toISOString(),
      last_seen_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      user_agent: navigator.userAgent.slice(0, 240),
      is_active: true
    });
  if (error) throw error;

  saveAdminSession({ token, profile });
  return profile;
};

const validateAdminSession = async () => {
  const localSession = readAdminSession();
  if (!localSession?.token || !localSession?.username) {
    clearAdminSession();
    return null;
  }

  const db = await getSupabase();
  const tokenHash = await sha256(localSession.token);
  const { data: remoteSession, error } = await db
    .from(adminSessionTableName())
    .select('token_hash,username,last_seen_at,expires_at,is_active')
    .eq('token_hash', tokenHash)
    .maybeSingle();

  if (error) throw error;
  const now = Date.now();
  const lastSeen = remoteSession?.last_seen_at ? new Date(remoteSession.last_seen_at).getTime() : 0;
  const expiresAt = remoteSession?.expires_at ? new Date(remoteSession.expires_at).getTime() : 0;
  const expired = !remoteSession?.is_active || !lastSeen || now - lastSeen > ADMIN_SESSION_TTL || !expiresAt || now > expiresAt;

  if (expired) {
    if (remoteSession?.token_hash) {
      await db.from(adminSessionTableName()).delete().eq('token_hash', tokenHash).catch(() => {});
    }
    clearAdminSession();
    return null;
  }

  const admin = await fetchAdminProfile(db, remoteSession.username);
  const profile = normalizeAdminProfile(admin);
  const nextExpiresAt = new Date(now + ADMIN_SESSION_TTL).toISOString();
  await db
    .from(adminSessionTableName())
    .update({
      last_seen_at: new Date(now).toISOString(),
      expires_at: nextExpiresAt,
      user_agent: navigator.userAgent.slice(0, 240)
    })
    .eq('token_hash', tokenHash);

  saveAdminSession({ token: localSession.token, profile });
  return profile;
};

const guardAdminPage = async () => {
  const needsAdmin = path.includes('panel-hms-sipil-2026.html') || inAdminPages;
  const onLoginPage = path.includes('admin-panel.html') || path.includes('login.html');
  if (!needsAdmin && !onLoginPage) return;

  try {
    const profile = await validateAdminSession();
    if (needsAdmin && !profile) {
      location.href = loginPagePath;
      return;
    }
    if (needsAdmin && profile && !canAccessCurrentAdminPage(profile)) {
      location.href = firstAllowedPath(profile);
      return;
    }
    if (onLoginPage && profile) {
      location.href = firstAllowedPath(profile);
    }
  } catch (error) {
    console.error('Admin session validation failed:', error);
    if (needsAdmin) {
      clearAdminSession();
      location.href = loginPagePath;
    }
  }
};

window.SIPILCARE_ADMIN_READY = guardAdminPage();

document.getElementById('loginForm')?.addEventListener('submit', async e => {
  e.preventDefault();
  const submit = e.currentTarget.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;

  try {
    const admin = await remoteAdminLogin({
      username: username?.value,
      password: password?.value
    });
    location.href = firstAllowedPath(admin);
  } catch (error) {
    console.error('Admin login failed:', error);
    toast(error.message || 'Login admin gagal.');
  } finally {
    if (submit) submit.disabled = false;
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', async () => {
  const localSession = readAdminSession();
  try {
    if (localSession?.token) {
      const db = await getSupabase();
      await db.from(adminSessionTableName()).delete().eq('token_hash', await sha256(localSession.token));
    }
  } catch (error) {
    console.warn('Admin logout cleanup failed:', error);
  } finally {
    clearAdminSession();
    location.href = loginPagePath;
  }
});

window.addEventListener('focus', () => {
  if (inAdminPages) window.SIPILCARE_ADMIN_READY = guardAdminPage();
});
document.addEventListener('visibilitychange', () => {
  if (inAdminPages && document.visibilityState === 'visible') {
    window.SIPILCARE_ADMIN_READY = guardAdminPage();
  }
});
