/* ImatPath: spreads the correct answer evenly over A-E.
   The question bank was written with the correct option mostly in A or B, so a student could score well by guessing a letter.
   This runs once when the page loads, after all question files, and is deterministic: the same question always gets the same order.
   - Questions whose options refer to each other ("all of the above", "both A and B", "statement I"...) keep their order.
   - Everything else is shuffled with the correct option moved to a position chosen from the question text. */
(function () {
  function hash(s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  var REF = /(all|none|neither|both|any) of (the|these|those)\b|\bboth\b|\bneither\b|\bnone of\b|\ball of\b|\babove\b|\bpreceding\b|\bprevious\b|\bstatements?\b|\b(options?|answers?) [A-E1-5]\b|^\s*\(?[A-E]\)?\s*(and|or|,)\s|\band [A-E]\b\s*$|^\s*(i|ii|iii|iv|v)\s*(,|and|or|only|$)/i;
  function plain(s) { return String(s).replace(/<sup>(.*?)<\/sup>/g, '^$1').replace(/<[^>]+>/g, '').replace(/−/g, '-').replace(/,/g, '.').trim(); }
  function balance(q) {
    if (!q || q._bal || !q.options || q.options.length !== 5) return;
    var key = q.correct !== undefined ? 'correct' : (q.answer !== undefined ? 'answer' : null); if (!key) return;
    var ci = q[key]; if (typeof ci !== 'number') return;
    q._bal = 1;
    var o = q.options.slice(), right = o[ci], order;
    if (o.some(function (x) { return REF.test(plain(x)); })) return;
    {
      var r = rng(hash((q.question || '') + '|' + o.join('|')));
      var t = Math.floor(r() * 5), rest = []; for (var i = 0; i < 5; i++) if (i !== ci) rest.push(i);
      for (var j = rest.length - 1; j > 0; j--) { var k = Math.floor(r() * (j + 1)); var tmp = rest[j]; rest[j] = rest[k]; rest[k] = tmp; }
      order = []; var p = 0; for (var s = 0; s < 5; s++) order.push(s === t ? ci : rest[p++]);
    }
    q.options = order.map(function (i) { return o[i]; });
    var ni = q.options.indexOf(right);
    if (q.correct !== undefined) q.correct = ni; if (q.answer !== undefined) q.answer = ni;
  }
  function apply(subs) { (subs || []).forEach(function (s) { (s.chapters || []).forEach(function (c) { (c.questions || []).forEach(balance); }); }); }
  window.ImatBalance = { apply: apply, question: balance };
  if (typeof subjects !== 'undefined') apply(subjects);
})();
