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

  // ---- Paid access ----------------------------------------------------------
  // Only when paywall-config.js says ENABLED. Needs an active row in public.entitlements for the user's email.
  // (This locks the app screens. The static files themselves, such as the question data and the PDFs, stay public URLs.)
  // access.html and the past papers simulator (roadmap.html) stay open to every signed-in account.
  if (!isLocalEnv && !/(access|roadmap)\.html$/i.test(window.location.pathname)) {
    try {
      await new Promise(function (ok) {
        var s = document.createElement('script');
        s.src = 'paywall-config.js?v=1'; s.onload = ok; s.onerror = ok; document.head.appendChild(s);
      });
      var PAY = window.ImatPay;
      if (PAY && PAY.ENABLED && session && session.user) {
        var key = 'imatpath_ent_' + session.user.id, cached = null;
        try { cached = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
        var fresh = cached && (Date.now() - cached.t) < (cached.ok ? 10 * 60 * 1000 : 15 * 1000);
        var allowed = fresh ? cached.ok : null;
        if (allowed === null) {
          var email = String(session.user.email || '').toLowerCase();
          var res = await window.ImatAuth.client.from('entitlements').select('plan,status').eq('email', email).maybeSingle();
          allowed = !res.error && !!res.data && res.data.status === 'active';
          if (res.error) allowed = cached ? cached.ok : false;   // on an error keep the last known answer, else block
          try { sessionStorage.setItem(key, JSON.stringify({ ok: allowed, t: Date.now() })); } catch (e) {}
        }
        if (!allowed) { window.location.replace('access.html'); return; }
      }
    } catch (e) { /* if the check itself breaks, do not lock people out by accident */ }
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
