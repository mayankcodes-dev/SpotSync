/**
 * pwa.ts — SpotSync PWA install script.
 * Handles Chrome/Edge native prompt, iOS Safari guide, Android guide.
 * Compiled to: public/javascripts/pwa.js
 */
((): void => {
  'use strict';

  let deferredPrompt: any = null;

  const ua = navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isInStandaloneMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;

  // ── Register Service Worker ──────────────────────────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[PWA] SW registered:', reg.scope);
          reg.update();
        })
        .catch((err) => console.warn('[PWA] SW registration failed:', err));
    });
  }

  window.addEventListener('beforeinstallprompt', (e: Event) => {
    e.preventDefault();
    deferredPrompt = e;
    setButtonState('ready');
  });

  if (isInStandaloneMode) {
    document.addEventListener('DOMContentLoaded', () => hideInstallButton());
  }

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    hideInstallButton();
    showToast('SpotSync installed! 🎉 Launch it from your home screen.', 'success');
  });

  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;
    injectInstallModal();
    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        try {
          setButtonState('loading');
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          deferredPrompt = null;
          if (outcome === 'accepted') {
            hideInstallButton();
            showToast('Installing SpotSync… 🚀', 'success');
          } else {
            setButtonState('ready');
          }
        } catch (err) {
          console.error('[PWA] Prompt error:', err);
          setButtonState('ready');
        }
      } else {
        showInstallModal();
      }
    });
  });

  function setButtonState(state: 'ready' | 'loading'): void {
    const btn = document.getElementById('pwa-install-btn') as HTMLButtonElement | null;
    if (!btn) return;
    if (state === 'ready') {
      btn.classList.add('btn-pulse');
      btn.disabled = false;
      btn.innerHTML =
        '<i class="bi bi-download"></i><span class="d-none d-sm-inline ms-1">Download App</span>';
    } else {
      btn.disabled = true;
      btn.innerHTML =
        '<span class="spinner-border spinner-border-sm" role="status"></span><span class="d-none d-sm-inline ms-1">Installing…</span>';
    }
  }

  function hideInstallButton(): void {
    const li = document.getElementById('pwa-install-li');
    if (li) li.style.display = 'none';
  }

  function injectInstallModal(): void {
    const iosSteps = `<ol class="mb-0 ps-3">
      <li class="mb-2">Open <strong>this page in Safari</strong> on your iPhone or iPad</li>
      <li class="mb-2">Tap the <strong>Share</strong> button <i class="bi bi-box-arrow-up"></i></li>
      <li class="mb-2">Tap <strong>"Add to Home Screen"</strong> <i class="bi bi-plus-square"></i></li>
      <li>Tap <strong>"Add"</strong> in the top-right corner</li>
    </ol>`;
    const androidSteps = `<ol class="mb-0 ps-3">
      <li class="mb-2">Open <strong>this page in Chrome</strong> on your Android device</li>
      <li class="mb-2">Tap the <strong>⋮ menu</strong> in the top-right corner</li>
      <li class="mb-2">Tap <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong></li>
      <li>Tap <strong>"Install"</strong> to confirm</li>
    </ol>`;
    const desktopSteps = `<ol class="mb-0 ps-3">
      <li class="mb-2">Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>
      <li class="mb-2">Look for the <strong>install icon</strong> <i class="bi bi-display"></i> in the address bar</li>
      <li class="mb-2">Click it and select <strong>"Install"</strong></li>
      <li>SpotSync will open as a standalone app</li>
    </ol>`;

    let primaryTitle: string;
    let primaryGuide: string;
    let secondaryLinks: string;

    if (isIOS || isSafari) {
      primaryTitle = '<i class="bi bi-apple me-2"></i>Install on iPhone / iPad';
      primaryGuide = iosSteps;
      secondaryLinks = '';
    } else if (isAndroid) {
      primaryTitle = '<i class="bi bi-android2 me-2"></i>Install on Android';
      primaryGuide = androidSteps;
      secondaryLinks = '';
    } else {
      primaryTitle = '<i class="bi bi-laptop me-2"></i>Install on Desktop';
      primaryGuide = desktopSteps;
      secondaryLinks = `<hr>
        <p class="text-muted small mb-1">On a mobile device?</p>
        <div class="d-flex gap-2 flex-wrap">
          <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('pwa-guide-ios').classList.toggle('d-none')">
            <i class="bi bi-apple me-1"></i>iOS Guide
          </button>
          <button class="btn btn-outline-secondary btn-sm" onclick="document.getElementById('pwa-guide-android').classList.toggle('d-none')">
            <i class="bi bi-android2 me-1"></i>Android Guide
          </button>
        </div>
        <div id="pwa-guide-ios" class="d-none mt-3 p-3 bg-light rounded">${iosSteps}</div>
        <div id="pwa-guide-android" class="d-none mt-3 p-3 bg-light rounded">${androidSteps}</div>`;
    }

    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.innerHTML = `
      <div class="modal fade" id="pwaInstallModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header" style="background:linear-gradient(135deg,#2D6A4F,#40916C);color:white;">
              <h5 class="modal-title"><i class="bi bi-phone-fill me-2"></i>Install SpotSync App</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body py-4">
              <div class="d-flex align-items-center mb-3 p-3 rounded" style="background:#f0faf5;">
                <img src="/images/logo.png" alt="SpotSync" width="56" height="56" class="rounded-3 me-3 shadow-sm">
                <div>
                  <div class="fw-bold fs-5">SpotSync</div>
                  <div class="text-muted small">Free · Works offline · No app store needed</div>
                </div>
              </div>
              <h6 class="fw-semibold mb-3">${primaryTitle}</h6>
              <div class="p-3 rounded" style="background:#f8f9fa;">${primaryGuide}</div>
              ${secondaryLinks}
            </div>
            <div class="modal-footer border-0 pt-0">
              <button type="button" class="btn btn-secondary btn-sm" data-bs-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(modal);
  }

  function showInstallModal(): void {
    const modalEl = document.getElementById('pwaInstallModal');
    if (modalEl && (window as any).bootstrap) {
      const bsModal = new (window as any).bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  function showToast(message: string, type: 'success' | 'info' | 'warning' = 'success'): void {
    const colorMap: Record<string, string> = {
      success: '#2D6A4F',
      info: '#0d6efd',
      warning: '#ffc107',
    };
    const bg = colorMap[type] ?? '#2D6A4F';
    const icon = type === 'success' ? 'check-circle-fill' : 'info-circle-fill';

    const wrap = document.createElement('div');
    wrap.style.cssText =
      'position:fixed;bottom:24px;right:24px;z-index:10000;min-width:280px;max-width:360px;';
    wrap.innerHTML = `
      <div class="toast show d-flex align-items-center text-white border-0 rounded-3 shadow"
           style="background:${bg};" role="alert" aria-live="assertive">
        <div class="toast-body d-flex align-items-center gap-2 py-3 px-3 flex-grow-1">
          <i class="bi bi-${icon} fs-5 flex-shrink-0"></i>
          <span>${message}</span>
        </div>
        <button type="button" class="btn-close btn-close-white me-2" aria-label="Close"></button>
      </div>`;
    document.body.appendChild(wrap);
    (wrap.querySelector('.btn-close') as HTMLButtonElement)?.addEventListener('click', () =>
      wrap.remove(),
    );
    setTimeout(() => wrap.remove(), 5000);
  }
})();
