// ================================================================
//  ImatPath — Auth Guard
//  Include in <head> on every PROTECTED page.
//  Redirects to auth.html if no active session.
// ================================================================

(async function () {
  // Wait for ImatAuth to be ready
  if (!window.ImatAuth) return;

  const session = await window.ImatAuth.getSession();

  if (!session) {
    window.location.replace('auth.html');
    return;
  }

  // Populate nav safely
  async function initNav() {
    window.ImatAuth.populateNav(session.user);
    // Migrate any existing localStorage data (once per user)
    window.ImatAuth.migrateLocalStorage();

    // Pull progress from cloud if first time on this device
    const syncKey = 'imatpath_synced_' + session.user.id;
    if (!localStorage.getItem(syncKey)) {
      const updated = await window.ImatAuth.syncFromCloud();
      localStorage.setItem(syncKey, '1');
      if (updated) {
        window.location.reload();
        return;
      }
    }

    // Track first login for feedback trigger
    const firstLoginKey = 'imatpath_first_login_' + session.user.id;
    if (!localStorage.getItem(firstLoginKey)) {
      localStorage.setItem(firstLoginKey, Date.now().toString());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNav);
  } else {
    initNav();
  }

  // Listen for session changes (logout from another tab, expiry, etc.)
  window.ImatAuth.client.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') {
      window.location.replace('auth.html');
    }
  });

})();
