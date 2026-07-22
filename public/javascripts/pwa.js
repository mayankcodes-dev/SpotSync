// SpotSync PWA Install Script
// Registers service worker and handles install prompt

let deferredPrompt = null;

// ─── Register Service Worker ─────────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service Worker registered:', reg.scope);
        reg.update();
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

// ─── Install Prompt ───────────────────────────────────────────────────────────
// Button is always visible in navbar; clicking it triggers install if available.
// On browsers without prompt support (Safari, Firefox), it shows instructions.

window.addEventListener('beforeinstallprompt', (e) => {
  // Store the event so we can trigger it from the button
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] Install prompt available');
});

document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('pwa-install-btn');
  const installLi  = document.getElementById('pwa-install-li');
  if (!installBtn) return;

  installBtn.addEventListener('click', async () => {
    if (deferredPrompt) {
      // Native install prompt available — show it
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log('[PWA] User choice:', outcome);
      deferredPrompt = null;

      if (outcome === 'accepted') {
        // Hide button after successful install
        if (installLi) installLi.style.display = 'none';
        showPWAToast('SpotSync installed! 🎉 Launch it from your home screen.');
      }
    } else {
      // No native prompt (Safari, Firefox, or already installed)
      showPWAToast('To install: tap Share → "Add to Home Screen" in Safari, or use Chrome/Edge on desktop.', 'info');
    }
  });
});

// ─── App Installed Event ──────────────────────────────────────────────────────
window.addEventListener('appinstalled', () => {
  console.log('[PWA] SpotSync installed as PWA');
  const installLi = document.getElementById('pwa-install-li');
  if (installLi) installLi.style.display = 'none';
  deferredPrompt = null;
});

// ─── Toast Helper ─────────────────────────────────────────────────────────────
function showPWAToast(message, type = 'success') {
  const bgClass = type === 'info' ? 'bg-primary' : 'bg-success';
  const toastContainer = document.createElement('div');
  toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;max-width:340px;';
  toastContainer.innerHTML = `
    <div class="toast align-items-center text-white ${bgClass} border-0 show" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-${type === 'info' ? 'info-circle' : 'check-circle'} me-2"></i>${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
      </div>
    </div>
  `;
  document.body.appendChild(toastContainer);
  toastContainer.querySelector('.btn-close').addEventListener('click', () => toastContainer.remove());
  setTimeout(() => toastContainer.remove(), 5000);
}
