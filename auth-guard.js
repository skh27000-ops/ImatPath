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

  // Populate nav once DOM is ready
  document.addEventListener('DOMContentLoaded', async function () {
    window.ImatAuth.populateNav(session.user);
    // Migrate any existing localStorage data (once per user)
    window.ImatAuth.migrateLocalStorage();

    // Track first login for feedback trigger
    const firstLoginKey = 'imatpath_first_login_' + session.user.id;
    if (!localStorage.getItem(firstLoginKey)) {
      localStorage.setItem(firstLoginKey, Date.now().toString());
    }
  });

  // Listen for session changes (logout from another tab, expiry, etc.)
  window.ImatAuth.client.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT') {
      window.location.replace('auth.html');
    }
  });

})();
