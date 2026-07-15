(function () {
  const STORAGE_KEY = 'islaTheme';

  function getInitialTheme() {
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

  function initThemeUI() {
    const theme = getInitialTheme();
    applyTheme(theme);

    const options = document.querySelectorAll('[data-theme-value]');
    
    // Set active option state on initial load
    options.forEach((opt) => {
      const v = opt.getAttribute('data-theme-value');
      if (v === theme) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });

    // Theme option toggle handler
    options.forEach((opt) => {
      opt.addEventListener('click', () => {
        const v = opt.getAttribute('data-theme-value');
        if (v !== 'light' && v !== 'dark') return;

        // Apply selected theme variables instantly
        localStorage.setItem(STORAGE_KEY, v);
        applyTheme(v);

        // Toggle visual selection state
        options.forEach((o) => {
          o.classList.toggle('selected', o === opt);
        });

        // Micro-delay redirection fallback (allows theme transition to play)
        setTimeout(() => {
          navigateBack();
        }, 320); 
      });
    });

    // Back button routing logic
    const backBtn = document.getElementById('back-btn');
    if (backBtn) {
      backBtn.addEventListener('click', navigateBack);
    }
  }

  // Unified navigation controller
  function navigateBack() {
    try {
      const ref = document.referrer || '';
      const isAdmin = ref.includes('admin-settings.html');
      window.location.href = isAdmin ? '../admin/admin-settings.html' : '../setting.html';
    } catch (e) {
      window.history.back();
    }
  }

  // Initialize UI safely depending on script execution context
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeUI);
  } else {
    initThemeUI();
  }
})();