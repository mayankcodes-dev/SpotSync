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
        // Check for updates periodically
        reg.update();
      })
      .catch((err) => {
        console.warn('[PWA] Service Worker registration failed:', err);
      });
  });
}

// ─── Install Prompt ──────────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 67+ from automatically showing the prompt
  e.preventDefault();
  deferredPrompt = e;

  // Show install button in navbar
  const installLi = document.getElementById('pwa-install-li');
  if (installLi) {
    installLi.style.display = 'block';
  }

  console.log('[PWA] Install prompt captured — button visible');
});

// Handle install button click
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('pwa-install-btn');
  if (!installBtn) return;

  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;
    console.log('[PWA] User choice:', outcome);

    if (outcome === 'accepted') {
      console.log('[PWA] App installed successfully!');
      const installLi = document.getElementById('pwa-install-li');
      if (installLi) installLi.style.display = 'none';

      // Show success toast if Bootstrap is available
      showPWAToast('SpotSync installed! 🎉 Launch it from your home screen.');
    }

    deferredPrompt = null;
  });
});

// ─── App Installed Event ─────────────────────────────────────────────────────
window.addEventListener('appinstalled', () => {
  console.log('[PWA] SpotSync was installed as PWA');
  const installLi = document.getElementById('pwa-install-li');
  if (installLi) installLi.style.display = 'none';
  deferredPrompt = null;
});

// ─── Toast Helper ────────────────────────────────────────────────────────────
function showPWAToast(message) {
  // Create Bootstrap toast dynamically
  const toastContainer = document.createElement('div');
  toastContainer.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999;';
  toastContainer.innerHTML = `
    <div class="toast align-items-center text-white bg-success border-0 show" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body">
          <i class="bi bi-check-circle me-2"></i>${message}
        </div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  `;
  document.body.appendChild(toastContainer);
  setTimeout(() => toastContainer.remove(), 4000);
}
