// ================================================================
//  ImatPath — Auth Guard
//  Include in <head> on every PROTECTED page.
//  Redirects to auth.html if no active session.
// ================================================================

(async function () {
  // Wait for ImatAuth to be ready
  if (!window.ImatAuth) return;

  const isLocalEnv = window.location.protocol === 'file:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

  let session = await window.ImatAuth.getSession();

  // A password account must confirm its email before using the app.
  if (session && session.user && window.ImatAuth.isUnverified && window.ImatAuth.isUnverified(session.user)) {
    try { await window.ImatAuth.client.auth.signOut(); } catch {}
    window.location.replace('auth.html?login=true');
    return;
  }

  if (!session) {
    if (isLocalEnv) {
      session = {
        user: {
          id: 'local-candidate',
          email: 'candidate@imatpath.com',
          user_metadata: {
            first_name: 'Candidate',
            full_name: 'IMAT Candidate',
            is_premium: true
          }
        }
      };
    } else {
      // LIVE PRODUCTION: unauthenticated users are immediately locked out and redirected
      window.location.replace('auth.html');
      return;
    }
  }

  // Populate nav safely
  async function initNav() {
    window.ImatAuth.populateNav(session.user);
    
    // Migrate any existing localStorage data (once per user)
    window.ImatAuth.migrateLocalStorage();

    // Pull progress from cloud if first time on this device
    const syncKey = 'imatpath_synced_v2_' + session.user.id;
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
