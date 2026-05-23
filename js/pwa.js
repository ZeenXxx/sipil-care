(() => {
  const rootPrefix = location.pathname.includes('/pages/admin/')
    ? '../../'
    : location.pathname.includes('/pages/') || location.pathname.includes('/tools/')
      ? '../'
      : '';
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  let deferredPrompt = null;

  const showInstallHint = () => {
    if (document.querySelector('.pwa-install-hint') || isStandalone()) return;
    const hint = document.createElement('div');
    hint.className = 'pwa-install-hint';
    hint.innerHTML = `
      <strong>Install SIPIL CARE</strong>
      <span>${isiOS ? 'Buka Share lalu pilih Add to Home Screen untuk memasang app.' : 'Pasang ke layar utama agar akses lebih cepat.'}</span>
      <div>
        ${deferredPrompt ? '<button type="button" data-pwa-install>Install</button>' : ''}
        <button type="button" data-pwa-close>Tutup</button>
      </div>
    `;
    document.body.appendChild(hint);
    hint.querySelector('[data-pwa-close]')?.addEventListener('click', () => {
      sessionStorage.setItem('sipilcare_pwa_hint_closed', '1');
      hint.remove();
    });
    hint.querySelector('[data-pwa-install]')?.addEventListener('click', async () => {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      await deferredPrompt.userChoice.catch(() => null);
      deferredPrompt = null;
      hint.remove();
    });
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(`${rootPrefix}firebase-messaging-sw.js`, { scope: rootPrefix || './' }).catch(error => {
        console.warn('SIPIL CARE PWA registration failed:', error);
      });
    });
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
    if (sessionStorage.getItem('sipilcare_pwa_hint_closed') !== '1') showInstallHint();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    document.querySelector('.pwa-install-hint')?.remove();
  });

  window.SIPILCARE_PWA = {
    isStandalone,
    showInstallHint
  };
})();
