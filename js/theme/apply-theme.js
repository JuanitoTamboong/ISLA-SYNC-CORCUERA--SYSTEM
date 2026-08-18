(function () {
  const STORAGE_KEY = 'islaTheme';

  function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.setAttribute('data-theme', 'dark');
    } else {
      root.removeAttribute('data-theme');
    }
  }

  function init() {
    try {
      applyTheme(getSavedTheme());
    } catch (e) {
      // no-op
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

