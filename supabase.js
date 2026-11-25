// ================================================================
//  ImatPath — Supabase Client & Auth Helpers
//  Include AFTER the Supabase CDN script on every page
// ================================================================

(function () {
  const SUPABASE_URL     = 'https://wcbyuuysiaaicasxehgc.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ZwIeiQUOlxx3buyi-nSO5A_OiA8ZZtr';

  if (!window.supabase || !window.supabase.createClient) {
    console.error('[ImatAuth] Supabase SDK not found — make sure CDN script is loaded first.');
    return;
  }

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const isLocalEnv = window.location.protocol === 'file:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

  const DEFAULT_USER = {
    id: 'local-candidate',
    email: 'candidate@imatpath.com',
    user_metadata: {
      first_name: 'Candidate',
      full_name: 'IMAT Candidate',
      is_premium: true
    }
  };

  // ── Auth helpers ──────────────────────────────────────────────
  async function getSession() {
    try {
      const { data } = await client.auth.getSession();
      if (data?.session) return data.session;
    } catch {}

    // LOCAL ONLY: Allow instant dashboard access when running offline on your computer
    if (isLocalEnv) {
      if (localStorage.getItem('imatpath_logged_out') === '1') {
        return null;
      }
      return {
        user: DEFAULT_USER,
        access_token: 'local-candidate-token'
      };
    }

    // LIVE PRODUCTION WEBSITE: Strictly enforce authentic session (no unauthorized access)
    return null;
  }

  async function getUser() {
    const session = await getSession();
    if (session?.user) {
      return session.user;
    }
    return isLocalEnv ? DEFAULT_USER : null;
  }

  // A password account must have a verified email before it can use the app.
  function isUnverified(user) {
    if (!user || user.id === 'local-candidate') return false;
    const provider = user.app_metadata && user.app_metadata.provider;
    return (!provider || provider === 'email') && !user.email_confirmed_at;
  }

  const AUTH_RETURN = () => window.location.origin + '/auth.html';

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (isUnverified(data && data.user)) {
      try { await client.auth.signOut(); } catch {}
      const e = new Error('Email not confirmed');
      e.code = 'email_not_confirmed';
      throw e;
    }
    localStorage.removeItem('imatpath_logged_out');
    // Make sure the profile row exists (never overwrite an existing one, it holds the plan).
    try {
      await client.from('profiles').upsert({
        id: data.user.id,
        first_name: (data.user.user_metadata && data.user.user_metadata.first_name) || null,
        is_premium: false
      }, { onConflict: 'id', ignoreDuplicates: true });
    } catch {}
    return data;
  }

  async function signUp(email, password, firstName) {
    const { data, error } = await client.auth.signUp({
      email, password,
      options: {
        data: { first_name: firstName, is_premium: false, terms_accepted_at: new Date().toISOString() },
        emailRedirectTo: AUTH_RETURN() + '?verified=1'
      }
    });
    if (error) throw error;
    // Supabase hides "already registered" for confirmed accounts: it returns a user with no identities.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const e = new Error('User already registered');
      e.code = 'user_already_exists';
      throw e;
    }
    // If the project does not require confirmation it returns a session: end it, the user must verify first.
    if (data.session) {
      try { await client.auth.signOut(); } catch {}
    }
    return { user: data.user, needsVerification: true };
  }

  async function resendVerification(email) {
    const { error } = await client.auth.resend({
      type: 'signup', email,
      options: { emailRedirectTo: AUTH_RETURN() + '?verified=1' }
    });
    if (error) throw error;
  }

  async function sendPasswordReset(email) {
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo: AUTH_RETURN() + '?mode=reset' });
    if (error) throw error;
  }

  async function updatePassword(newPassword) {
    const { error } = await client.auth.updateUser({ password: newPassword });
    if (error) throw error;
  }

  async function signInWithGoogle() {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard.html' }
    });
    if (error) throw error;
  }

  async function signOut() {
    localStorage.setItem('imatpath_logged_out', '1');
    try { await client.auth.signOut(); } catch {}
    window.location.href = 'auth.html?login=true';
  }

  function enterGuestMode() {
    if (isLocalEnv) {
      localStorage.removeItem('imatpath_logged_out');
      window.location.href = 'dashboard.html';
    } else {
      window.location.href = 'auth.html';
    }
  }

  // ── Nav population ────────────────────────────────────────────
  function populateNav(user) {
    let firstName = user?.user_metadata?.first_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'User';
    // If it's a full name from Google, grab just the first word
    if (firstName.includes(' ')) {
      firstName = firstName.split(' ')[0];
    }
    const initial = firstName.charAt(0).toUpperCase();

    // Avatar
    const avatar = document.getElementById('userAvatar');
    if (avatar) { avatar.textContent = initial; avatar.title = firstName; }

    // Name
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = firstName;
  }

  // ── Progress sync ─────────────────────────────────────────────
  async function saveXPProgress(xpData) {
    const user = await getUser();
    if (!user) return;
    try {
      await client.from('user_progress').upsert({
        id: user.id,
        xp:             xpData.xp,
        level:          xpData.level,
        streak:         xpData.streak,
        longest_streak: xpData.longestStreak,
        last_study_date:xpData.lastStudyDate,
        xp_history:     xpData.xpHistory,
        updated_at:     new Date().toISOString()
      });
    } catch (e) { console.warn('[ImatAuth] XP sync failed (table may not exist yet):', e.message); }
  }

  async function loadXPProgress() {
    const user = await getUser();
    if (!user) return null;
    try {
      const { data } = await client.from('user_progress').select('*').eq('id', user.id).single();
      if (!data) return null;
      return {
        xp:            data.xp,
        level:         data.level,
        streak:        data.streak,
        longestStreak: data.longest_streak,
        lastStudyDate: data.last_study_date,
        xpHistory:     data.xp_history || []
      };
    } catch (e) { console.warn('[ImatAuth] XP load failed:', e.message); return null; }
  }

  async function saveQuestionState(answers, revealed, bookmarks) {
    const user = await getUser();
    if (!user) return;
    try {
      await client.from('question_state').upsert({
        id: user.id, answers, revealed, bookmarks: bookmarks || {},
        updated_at: new Date().toISOString()
      });
    } catch (e) { console.warn('[ImatAuth] Question state sync failed:', e.message); }
  }

  async function loadQuestionState() {
    const user = await getUser();
    if (!user) return null;
    try {
      const { data } = await client.from('question_state').select('*').eq('id', user.id).single();
      return data ? { answers: data.answers || {}, revealed: data.revealed || {}, bookmarks: data.bookmarks || {} } : null;
    } catch (e) { console.warn('[ImatAuth] Question state load failed:', e.message); return null; }
  }


  async function loadMockResults() {
    const user = await getUser();
    if (!user) return [];
    try {
      const { data } = await client.from('mock_results')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false });
      return data || [];
    } catch (e) { console.warn('[ImatAuth] Mock results load failed:', e.message); return []; }
  }

  async function saveMockResult(examId, scoreData) {
    const user = await getUser();
    if (!user) return;
    try {
      await client.from('mock_results').insert({
        user_id:    user.id,
        exam_id:    examId,
        score:      parseFloat(scoreData.score),
        correct:    scoreData.correct,
        wrong:      scoreData.wrong,
        unanswered: scoreData.unanswered
      });
    } catch (e) { console.warn('[ImatAuth] Mock result save failed:', e.message); }
  }

  // ── Feedback ──────────────────────────────────────────────────
  async function submitFeedback(rating, comment) {
    const user = await getUser();
    if (!user) return;
    try {
      await client.from('user_feedback').insert({
        user_id: user.id,
        rating: rating,
        comment: comment
      });
    } catch (e) { console.warn('[ImatAuth] Feedback submission failed:', e.message); }
  }

  // ── Migration: localStorage → Supabase ───────────────────────
  async function migrateLocalStorage() {
    const user = await getUser();
    if (!user) return;
    const migrated = localStorage.getItem('imatpath_migrated_' + user.id);
    if (migrated) return;

    // Migrate XP
    const xpRaw = localStorage.getItem('imatpath_xp');
    if (xpRaw) {
      try { await saveXPProgress(JSON.parse(xpRaw)); } catch {}
    }

    // Migrate question state
    const qbRaw = localStorage.getItem('imatpath_qb');
    if (qbRaw) {
      try {
        const qb = JSON.parse(qbRaw);
        await saveQuestionState(qb.answers || {}, qb.revealed || {}, qb.bookmarks || {});
      } catch {}
    }

    localStorage.setItem('imatpath_migrated_' + user.id, '1');
    console.log('[ImatAuth] Migrated localStorage data to Supabase ✓');
  }

  // ── Sync: Supabase ↔ localStorage ──────────────────────────────
  async function syncFromCloud() {
    const user = await getUser();
    if (!user) return false;
    let updated = false;

    // Sync Question Bank
    try {
      const qbData = await loadQuestionState();
      const localQbRaw = localStorage.getItem('imatpath_qb');
      const localQb = localQbRaw ? JSON.parse(localQbRaw) : null;
      
      const cloudCount = qbData ? Object.keys(qbData.revealed || {}).length : 0;
      const localCount = localQb ? Object.keys(localQb.revealed || {}).length : 0;

      if (cloudCount > localCount) {
        // Pull from cloud, preserving local metadata and merging sessions
        const merged = { ...(localQb || {}), ...qbData };
        if (qbData.bookmarks && qbData.bookmarks._chapter_sessions) {
          merged.chapterSessions = qbData.bookmarks._chapter_sessions.active || merged.chapterSessions || {};
          merged.sessionHistory = qbData.bookmarks._chapter_sessions.history || merged.sessionHistory || [];
        }
        localStorage.setItem('imatpath_qb', JSON.stringify(merged));
        updated = true;
      } else if (localCount > cloudCount) {
        // Push to cloud
        await saveQuestionState(localQb.answers || {}, localQb.revealed || {}, localQb.bookmarks || {});
      } else if (localQb && qbData) {
        // Same count: reconcile chapter sessions between cloud and local
        if (qbData.bookmarks && qbData.bookmarks._chapter_sessions && (!localQb.chapterSessions || !Object.keys(localQb.chapterSessions).length)) {
          localQb.chapterSessions = qbData.bookmarks._chapter_sessions.active || {};
          localQb.sessionHistory = qbData.bookmarks._chapter_sessions.history || [];
          localStorage.setItem('imatpath_qb', JSON.stringify(localQb));
          updated = true;
        } else if (localQb.chapterSessions && Object.keys(localQb.chapterSessions).length) {
          await saveQuestionState(localQb.answers || {}, localQb.revealed || {}, localQb.bookmarks || {});
        }
      }
    } catch (e) { console.warn('Cloud sync QB failed', e); }

    // Sync XP
    try {
      const xpData = await loadXPProgress();
      const localXpRaw = localStorage.getItem('imatpath_xp');
      const localXp = localXpRaw ? JSON.parse(localXpRaw) : null;
      
      const cloudXp = xpData ? xpData.xp : 0;
      const localXpVal = localXp ? localXp.xp : 0;

      if (cloudXp > localXpVal) {
        // Pull from cloud
        localStorage.setItem('imatpath_xp', JSON.stringify(xpData));
        updated = true;
      } else if (localXpVal > cloudXp) {
        // Push to cloud
        await saveXPProgress(localXp);
      }
    } catch (e) { console.warn('Cloud sync XP failed', e); }

    return updated;
  }

  // ── Expose global ─────────────────────────────────────────────
  window.ImatAuth = {
    client,
    getSession,
    getUser,
    signIn,
    signUp,
    resendVerification,
    sendPasswordReset,
    updatePassword,
    isUnverified,
    signInWithGoogle,
    signOut,
    enterGuestMode,
    populateNav,
    saveXPProgress,
    loadXPProgress,
    saveQuestionState,
    loadQuestionState,
    saveMockResult,
    loadMockResults,
    submitFeedback,
    migrateLocalStorage,
    syncFromCloud
  };

})();
