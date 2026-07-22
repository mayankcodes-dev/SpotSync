/**
 * SpotSync PWA Install Script v2
 * ─────────────────────────────
 * Handles installation across all platforms:
 *   • Chrome/Edge/Android → native beforeinstallprompt
 *   • Safari/iOS          → modal with step-by-step guide
 *   • Firefox             → modal with guide
 *   • Already installed   → button hidden
 */

(function () {
  'use strict';

  let deferredPrompt = null;  // Holds the beforeinstallprompt event

  // ── Detect platform ─────────────────────────────────────────────────────────
  const ua = navigator.userAgent;
  const isIOS     = /iphone|ipad|ipod/i.test(ua);
  const isSafari  = /^((?!chrome|android).)*safari/i.test(ua);
  const isAndroid = /android/i.test(ua);
  const isInStandaloneMode =
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

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

  // ── Capture the install prompt (Chrome/Edge/Android) ────────────────────────
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    console.log('[PWA] Install prompt ready');
    // Highlight the button so user knows it's actionable
    setButtonState('ready');
  });

  // ── Hide button if already running as installed PWA ──────────────────────────
  if (isInStandaloneMode) {
    document.addEventListener('DOMContentLoaded', () => hideInstallButton());
  }

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed!');
    deferredPrompt = null;
    hideInstallButton();
    showToast('SpotSync installed! 🎉 Launch it from your home screen.', 'success');
  });

  // ── Button click handler ─────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;

    // Inject the install guide modal into the page
    injectInstallModal();

    btn.addEventListener('click', async () => {
      if (deferredPrompt) {
        // ✅ Native install prompt available — trigger it
        try {
          setButtonState('loading');
          deferredPrompt.prompt();
          const { outcome } = await deferredPrompt.userChoice;
          console.log('[PWA] User choice:', outcome);
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
        // ℹ️ No native prompt — show platform-specific guide modal
        showInstallModal();
      }
    });
  });

  // ── Button visual states ─────────────────────────────────────────────────────
  function setButtonState(state) {
    const btn = document.getElementById('pwa-install-btn');
    if (!btn) return;
    if (state === 'ready') {
      btn.classList.add('btn-pulse');
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-download"></i><span class="d-none d-sm-inline ms-1">Download App</span>';
    } else if (state === 'loading') {
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status"></span><span class="d-none d-sm-inline ms-1">Installing…</span>';
    }
  }

  function hideInstallButton() {
    const li = document.getElementById('pwa-install-li');
    if (li) li.style.display = 'none';
  }

  // ── Install Guide Modal ──────────────────────────────────────────────────────
  function injectInstallModal() {
    const iosSteps = `
      <ol class="mb-0 ps-3">
        <li class="mb-2">Open <strong>this page in Safari</strong> on your iPhone or iPad</li>
        <li class="mb-2">Tap the <strong>Share</strong> button <i class="bi bi-box-arrow-up"></i> at the bottom of the screen</li>
        <li class="mb-2">Scroll down and tap <strong>"Add to Home Screen"</strong> <i class="bi bi-plus-square"></i></li>
        <li>Tap <strong>"Add"</strong> in the top-right corner</li>
      </ol>`;

    const androidSteps = `
      <ol class="mb-0 ps-3">
        <li class="mb-2">Open <strong>this page in Chrome</strong> on your Android device</li>
        <li class="mb-2">Tap the <strong>⋮ menu</strong> in the top-right corner</li>
        <li class="mb-2">Tap <strong>"Add to Home screen"</strong> or <strong>"Install App"</strong></li>
        <li>Tap <strong>"Install"</strong> to confirm</li>
      </ol>`;

    const desktopSteps = `
      <ol class="mb-0 ps-3">
        <li class="mb-2">Open this page in <strong>Chrome</strong> or <strong>Edge</strong></li>
        <li class="mb-2">Look for the <strong>install icon</strong> <i class="bi bi-display"></i> in the address bar</li>
        <li class="mb-2">Click it and select <strong>"Install"</strong></li>
        <li>SpotSync will open as a standalone app</li>
      </ol>`;

    // Determine which guide to show first
    let primaryGuide, primaryTitle, secondaryLinks;

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
      secondaryLinks = `
        <hr>
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
      <div class="modal fade" id="pwaInstallModal" tabindex="-1" aria-labelledby="pwaInstallModalLabel" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content border-0 shadow-lg">
            <div class="modal-header" style="background: linear-gradient(135deg, #2D6A4F, #40916C); color: white;">
              <h5 class="modal-title" id="pwaInstallModalLabel">
                <i class="bi bi-phone-fill me-2"></i>Install SpotSync App
              </h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
            </div>
            <div class="modal-body py-4">
              <div class="d-flex align-items-center mb-3 p-3 rounded" style="background:#f0faf5;">
                <img src="/icons/icon-96.png" alt="SpotSync" width="56" height="56" class="rounded-3 me-3 shadow-sm">
                <div>
                  <div class="fw-bold fs-5">SpotSync</div>
                  <div class="text-muted small">Free · Works offline · No app store needed</div>
                </div>
              </div>
              <h6 class="fw-semibold mb-3">${primaryTitle}</h6>
              <div class="p-3 rounded" style="background:#f8f9fa;">
                ${primaryGuide}
              </div>
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

  function showInstallModal() {
    const modalEl = document.getElementById('pwaInstallModal');
    if (modalEl && window.bootstrap) {
      const bsModal = new window.bootstrap.Modal(modalEl);
      bsModal.show();
    }
  }

  // ── Toast ────────────────────────────────────────────────────────────────────
  function showToast(message, type = 'success') {
    const colorMap = { success: '#2D6A4F', info: '#0d6efd', warning: '#ffc107' };
    const bg = colorMap[type] || '#2D6A4F';
    const icon = type === 'success' ? 'check-circle-fill' : 'info-circle-fill';

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:10000;min-width:280px;max-width:360px;';
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
    wrap.querySelector('.btn-close').addEventListener('click', () => wrap.remove());
    setTimeout(() => wrap.remove(), 5000);
  }

})();
