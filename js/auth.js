const U = 'adminsipil', P = 'sipilcare123';
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

if ((path.includes('panel-hms-sipil-2026.html') || inAdminPages) && sessionStorage.getItem('sipilcare_admin') !== 'true') {
  location.href = loginPagePath;
}

if ((path.includes('admin-panel.html') || path.includes('login.html')) && sessionStorage.getItem('sipilcare_admin') === 'true') {
  location.href = panelHmsPath;
}

document.getElementById('loginForm')?.addEventListener('submit', e => {
  e.preventDefault();

  if (username?.value.trim() === U && password?.value === P) {
    sessionStorage.setItem('sipilcare_admin', 'true');
    location.href = panelHmsPath;
  } else {
    toast('Username atau password salah.');
  }
});

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  sessionStorage.removeItem('sipilcare_admin');
  location.href = loginPagePath;
});
