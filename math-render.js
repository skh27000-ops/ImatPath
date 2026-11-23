/* Shows the maths written as \( ... \) and \[ ... \] in questions, options and explanations (KaTeX).
   The page redraws its content often, so this checks a few times a second and only works when raw formulas are on screen. */
(function () {
  var OPEN = String.fromCharCode(92, 40), CLOSE = String.fromCharCode(92, 41);      // backslash + ( and backslash + )
  var DOPEN = String.fromCharCode(92, 91), DCLOSE = String.fromCharCode(92, 93);    // backslash + [ and backslash + ]
  var opts = { delimiters: [{ left: DOPEN, right: DCLOSE, display: true }, { left: OPEN, right: CLOSE, display: false }], throwOnError: false };
  function run() {
    if (!window.renderMathInElement || !document.body) return;
    var t = document.body.textContent || '';
    if (t.indexOf(OPEN) < 0 && t.indexOf(DOPEN) < 0) return;
    try { window.renderMathInElement(document.body, opts); } catch (e) {}
  }
  setInterval(run, 250);
  window.addEventListener('load', run);
})();
