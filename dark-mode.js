// Dark mode toggle — persists via localStorage
(function() {
  const saved = localStorage.getItem('imatpath_dark_mode');
  if (saved === 'true') {
    document.documentElement.setAttribute('data-theme', 'dark');
  }
})();

function toggleDarkMode() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  if (isDark) {
    document.documentElement.removeAttribute('data-theme');
    localStorage.setItem('imatpath_dark_mode', 'false');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
    localStorage.setItem('imatpath_dark_mode', 'true');
  }
  // Update toggle icon
  const btn = document.querySelector('.dark-mode-toggle');
  if (btn) {
    btn.innerHTML = document.documentElement.getAttribute('data-theme') === 'dark'
      ? '<i class="fas fa-sun"></i>'
      : '<i class="fas fa-moon"></i>';
  }
}

// Inject toggle button into nav on DOMContentLoaded
document.addEventListener('DOMContentLoaded', function() {
  const navRight = document.querySelector('.nav-right');
  if (navRight) {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const btn = document.createElement('button');
    btn.className = 'dark-mode-toggle';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.setAttribute('title', 'Toggle dark mode');
    btn.innerHTML = isDark ? '<i class="fas fa-sun"></i>' : '<i class="fas fa-moon"></i>';
    btn.onclick = toggleDarkMode;
    navRight.insertBefore(btn, navRight.firstChild);
  }
});
