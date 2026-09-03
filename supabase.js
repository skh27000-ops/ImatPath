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

  // ── Auth helpers ──────────────────────────────────────────────
  async function getSession() {
    try {
      const { data } = await client.auth.getSession();
      return data?.session || null;
    } catch { return null; }
  }

  async function getUser() {
    const session = await getSession();
    if (session?.user) {
      if (!session.user.user_metadata) session.user.user_metadata = {};
      session.user.user_metadata.is_premium = true;
    }
    return session?.user || null;
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signUp(email, password, firstName) {
    const { data, error } = await client.auth.signUp({
      email, password,
      options: { data: { first_name: firstName, is_premium: true } }
    });
    if (error) throw error;
    // Create profile row
    if (data.user) {
      await client.from('profiles').upsert({
        id: data.user.id,
        first_name: firstName,
        is_premium: true
      });
    }
    return data;
  }

  async function signInWithGoogle() {
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard.html' }
    });
    if (error) throw error;
  }

  async function signOut() {
    await client.auth.signOut();
    window.location.href = 'auth.html';
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
        // Pull from cloud
        localStorage.setItem('imatpath_qb', JSON.stringify(qbData));
        updated = true;
      } else if (localCount > cloudCount) {
        // Push to cloud
        await saveQuestionState(localQb.answers || {}, localQb.revealed || {}, localQb.bookmarks || {});
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
    signInWithGoogle,
    signOut,
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
