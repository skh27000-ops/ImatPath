// Cloudflare Pages Function: guards the course PDFs (biology, chemistry, physics, math).
// Past papers, flashcard decks and everything else under /docs stay public.
// A request must carry the Supabase session token in "Authorization: Bearer <token>".
// When paywall-config.js has ENABLED: true, the account must also have an active row in public.entitlements.
// Every allowed request is logged in public.doc_access (using the user's own token, no secret needed).

const SB = 'https://wcbyuuysiaaicasxehgc.supabase.co';
const KEY = 'sb_publishable_ZwIeiQUOlxx3buyi-nSO5A_OiA8ZZtr'; // public (publishable) key, same as in supabase.js
const GUARDED = /^\/docs\/(biology|chemistry|physics|math)\/[^/]+\.pdf$/i;

const deny = (status, msg) =>
  new Response(msg, { status, headers: { 'Cache-Control': 'no-store', 'Content-Type': 'text/plain; charset=utf-8' } });

export async function onRequest(context) {
  const { request, next, env } = context;
  const url = new URL(request.url);
  if (!GUARDED.test(url.pathname)) return next();
  if (request.method !== 'GET' && request.method !== 'HEAD') return deny(405, 'Method not allowed');

  const m = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') || '');
  if (!m) return deny(401, 'Sign in to read this document.');
  const token = m[1];
  const h = { apikey: KEY, Authorization: 'Bearer ' + token };

  // 1. who is this?
  let user;
  try {
    const r = await fetch(SB + '/auth/v1/user', { headers: h });
    if (!r.ok) return deny(401, 'Your session has expired. Sign in again.');
    user = await r.json();
  } catch (e) { return deny(503, 'Could not check your session. Try again.'); }
  const email = String(user.email || '').toLowerCase();
  if (!user.id || !email) return deny(401, 'Sign in to read this document.');

  // 2. is paid access switched on? (same switch as the app screens)
  let enforce = false;
  try {
    const cfg = await env.ASSETS.fetch(new Request(new URL('/paywall-config.js', url), { headers: { Accept: 'text/javascript' } }));
    enforce = /ENABLED\s*:\s*true/.test(await cfg.text());
  } catch (e) { enforce = false; }

  if (enforce) {
    try {
      const r = await fetch(SB + '/rest/v1/entitlements?select=status&email=eq.' + encodeURIComponent(email) + '&limit=1', { headers: h });
      const rows = r.ok ? await r.json() : null;
      if (!rows || !rows.length || rows[0].status !== 'active') return deny(403, 'This document is part of the paid plan.');
    } catch (e) { return deny(503, 'Could not check your access. Try again.'); }
  }

  // 3. serve the file, then record it (a logging failure never blocks the reader)
  const res = await next();
  if (request.method === 'GET' && res.ok) {
    context.waitUntil(fetch(SB + '/rest/v1/doc_access', {
      method: 'POST',
      headers: { ...h, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: user.id, email, doc: url.pathname.replace(/^\/docs\//, '') })
    }).catch(() => {}));
  }
  const out = new Response(res.body, res);
  out.headers.set('Cache-Control', 'private, no-store');
  out.headers.set('X-Robots-Tag', 'noindex');
  return out;
}
