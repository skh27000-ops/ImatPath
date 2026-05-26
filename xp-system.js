// ============================================================
//  ImatPath XP & Streak System
//  Shared across all pages — include via <script src="xp-system.js">
// ============================================================

const XP = (function () {

  // ── Constants ───────────────────────────────────────────
  const STORAGE_KEY = 'imatpath_xp';
  const AWARDS = {
    answer:     5,
    correct:    10,
    mock:       50,
    daily:      20,
    streak7:    100,
    streak30:   500
  };

  // level = floor(sqrt(xp / 100))  →  level 1 @ 100xp, level 5 @ 2500xp, level 10 @ 10000xp
  function calcLevel(xp) {
    return Math.max(1, Math.floor(Math.sqrt(xp / 100)));
  }

  function xpForLevel(lvl) {
    return lvl * lvl * 100;
  }

  // ── State helpers ────────────────────────────────────────
  function getState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const defaults = {
      xp: 0,
      level: 1,
      streak: 0,
      longestStreak: 0,
      lastStudyDate: null,
      xpHistory: []
    };
    if (!raw) return defaults;
    try { return { ...defaults, ...JSON.parse(raw) }; }
    catch { return defaults; }
  }

  function saveState(s) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  // ── Streak logic ─────────────────────────────────────────
  function todayStr() {
    return new Date().toISOString().slice(0, 10);
  }

  function yesterdayStr() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }

  function updateStreak(s) {
    const today = todayStr();
    if (s.lastStudyDate === today) return false; // already counted today

    const wasYesterday = s.lastStudyDate === yesterdayStr();
    s.streak = wasYesterday ? s.streak + 1 : 1;
    if (s.streak > s.longestStreak) s.longestStreak = s.streak;
    s.lastStudyDate = today;
    return true; // streak changed
  }

  // ── Award XP ─────────────────────────────────────────────
  function award(type) {
    const s = getState();
    const amount = AWARDS[type] || 0;
    if (amount <= 0) return { xp: amount, leveled: false };

    const prevLevel = calcLevel(s.xp);

    // Streak update on first activity of day
    const isFirstToday = updateStreak(s);
    if (isFirstToday) {
      s.xp += AWARDS.daily;
      showPopup(AWARDS.daily, '🌅 Daily bonus!');
      // Streak milestone bonuses
      if (s.streak === 7) {
        s.xp += AWARDS.streak7;
        setTimeout(() => showPopup(AWARDS.streak7, '🔥 7-day streak!'), 800);
      }
      if (s.streak === 30) {
        s.xp += AWARDS.streak30;
        setTimeout(() => showPopup(AWARDS.streak30, '🏆 30-day streak!'), 800);
      }
    }

    s.xp += amount;
    s.level = calcLevel(s.xp);
    const leveled = s.level > prevLevel;

    // Log history
    const today = todayStr();
    const existing = s.xpHistory.find(h => h.date === today);
    if (existing) {
      existing.xp += amount;
      existing.events.push(type);
    } else {
      s.xpHistory.push({ date: today, xp: amount, events: [type] });
    }
    // Keep only last 90 days
    if (s.xpHistory.length > 90) s.xpHistory = s.xpHistory.slice(-90);

    saveState(s);
    showPopup(amount, type === 'correct' ? '✅ Correct!' : type === 'mock' ? '🎓 Exam done!' : null);

    if (leveled) {
      setTimeout(() => showLevelUp(s.level), 600);
    }

    updateNavPill();
    return { xp: amount, leveled, newLevel: s.level };
  }

  // ── Floating XP popup ────────────────────────────────────
  let _popupTimeout = null;

  function showPopup(amount, label) {
    // Remove existing
    const old = document.getElementById('xp-popup');
    if (old) old.remove();

    const popup = document.createElement('div');
    popup.id = 'xp-popup';
    popup.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 32px;
      background: #0D9488;
      color: white;
      padding: 12px 20px;
      border-radius: 50px;
      font-family: 'Plus Jakarta Sans', sans-serif;
      font-weight: 700;
      font-size: 0.95rem;
      z-index: 9999;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 8px 30px rgba(13,148,136,0.35);
      transform: translateY(20px);
      opacity: 0;
      transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
      pointer-events: none;
      white-space: nowrap;
    `;
    popup.innerHTML = `
      <span style="font-size:1.1rem">⚡</span>
      <span>+${amount} XP${label ? ' · ' + label : ''}</span>
    `;
    document.body.appendChild(popup);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        popup.style.transform = 'translateY(0)';
        popup.style.opacity = '1';
      });
    });

    // Animate out
    clearTimeout(_popupTimeout);
    _popupTimeout = setTimeout(() => {
      popup.style.transform = 'translateY(-16px)';
      popup.style.opacity = '0';
      setTimeout(() => popup.remove(), 400);
    }, 2000);
  }

  // ── Level-up celebration ─────────────────────────────────
  function showLevelUp(newLevel) {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed; inset: 0; z-index: 10000;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0,0,0,0.5); backdrop-filter: blur(4px);
      animation: xpFadeIn 0.3s ease;
    `;
    overlay.innerHTML = `
      <style>
        @keyframes xpFadeIn { from{opacity:0} to{opacity:1} }
        @keyframes xpPop { from{transform:scale(0.7);opacity:0} to{transform:scale(1);opacity:1} }
        @keyframes xpSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
      </style>
      <div style="
        background: white; border-radius: 28px; padding: 48px 56px;
        text-align: center; max-width: 360px; width: 90%;
        animation: xpPop 0.4s cubic-bezier(0.22,1,0.36,1);
        box-shadow: 0 24px 80px rgba(0,0,0,0.3);
        font-family: 'Plus Jakarta Sans', sans-serif;
      ">
        <div style="font-size:4rem;margin-bottom:16px;animation:xpSpin 0.6s ease">⚡</div>
        <div style="font-size:0.75rem;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0D9488;margin-bottom:8px">Level Up!</div>
        <div style="font-size:2.8rem;font-weight:800;color:#1A1916;letter-spacing:-2px;margin-bottom:8px">Level ${newLevel}</div>
        <div style="font-size:0.95rem;color:#5A5750;margin-bottom:28px">You're on fire! Keep studying 🔥</div>
        <button onclick="this.closest('[style*=inset]').remove()" style="
          background:#0D9488;color:white;border:none;border-radius:12px;
          padding:12px 32px;font-family:inherit;font-size:0.95rem;font-weight:700;
          cursor:pointer;transition:background 0.2s;
        " onmouseover="this.style.background='#0F766E'" onmouseout="this.style.background='#0D9488'">
          Let's go!
        </button>
      </div>
    `;
    document.body.appendChild(overlay);
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
  }

  // ── Nav streak pill ──────────────────────────────────────
  function updateNavPill() {
    const s = getState();
    const pill = document.getElementById('xp-nav-pill');
    if (!pill) return;

    const lvl = calcLevel(s.xp);
    const curLvlXp = xpForLevel(lvl);
    const nextLvlXp = xpForLevel(lvl + 1);
    const pct = Math.min(100, ((s.xp - curLvlXp) / (nextLvlXp - curLvlXp)) * 100);

    pill.innerHTML = `
      <span style="display:flex;align-items:center;gap:5px;">
        <span style="font-size:1rem">🔥</span>
        <span style="font-weight:800;font-size:0.9rem">${s.streak}</span>
      </span>
      <span style="width:1px;height:18px;background:rgba(13,148,136,0.2)"></span>
      <span style="display:flex;align-items:center;gap:5px;">
        <span style="font-size:0.85rem">⚡</span>
        <span style="font-weight:700;font-size:0.85rem">Lv.${s.level}</span>
      </span>
      <span style="
        width:52px;height:5px;background:#E0DEDB;border-radius:3px;overflow:hidden;
        position:relative;
      ">
        <span style="
          display:block;height:100%;background:#0D9488;border-radius:3px;
          width:${pct}%;transition:width 0.5s ease;
        "></span>
      </span>
    `;
  }

  // ── Inject pill into every nav ───────────────────────────
  document.addEventListener('DOMContentLoaded', function () {
    const navRight = document.querySelector('.nav-right');
    if (!navRight) return;

    const pill = document.createElement('div');
    pill.id = 'xp-nav-pill';
    pill.title = 'Your streak & XP level';
    pill.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      background: white;
      border: 1.5px solid #E0DEDB;
      border-radius: 50px;
      padding: 6px 14px;
      cursor: default;
      font-family: 'Plus Jakarta Sans', sans-serif;
      color: #1A1916;
      transition: border-color 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    `;
    pill.addEventListener('mouseenter', () => pill.style.borderColor = '#0D9488');
    pill.addEventListener('mouseleave', () => pill.style.borderColor = '#E0DEDB');

    // Insert before dark mode toggle (first child)
    navRight.insertBefore(pill, navRight.firstChild);
    updateNavPill();
  });

  // ── Public API ───────────────────────────────────────────
  return {
    award,
    getState,
    showPopup,
    calcLevel,
    xpForLevel,
    updateNavPill,
    AWARDS
  };

})();
