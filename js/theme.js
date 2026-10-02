/**
 * PDzOS Store — Theme Management (Dark Mode Default + Light Mode Option)
 */

(function initTheme() {
  const STORAGE_KEY = "pdzos_theme";
  const THEME_DARK = "dark";
  const THEME_LIGHT = "light";

  function getSavedTheme() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === THEME_DARK || saved === THEME_LIGHT) {
      return saved;
    }
    // Default is dark as required, but check system preference if user never chose
    return THEME_DARK;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
    updateToggleIcons(theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") || THEME_DARK;
    const next = current === THEME_DARK ? THEME_LIGHT : THEME_DARK;
    applyTheme(next);
  }

  function updateToggleIcons(theme) {
    const toggles = document.querySelectorAll(".btn-theme-toggle");
    toggles.forEach(btn => {
      btn.setAttribute("aria-label", `Switch to ${theme === THEME_DARK ? 'light' : 'dark'} mode`);
      btn.innerHTML = theme === THEME_DARK 
        ? `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`
        : `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
    });
  }

  // Set initial theme immediately before DOM paint to prevent flash
  const initial = getSavedTheme();
  applyTheme(initial);

  // Bind clicks after DOM content loaded
  window.addEventListener("DOMContentLoaded", () => {
    updateToggleIcons(document.documentElement.getAttribute("data-theme") || THEME_DARK);
    document.addEventListener("click", (e) => {
      const target = e.target.closest(".btn-theme-toggle");
      if (target) {
        e.preventDefault();
        toggleTheme();
      }
    });
  });

  window.PDzTheme = {
    get: getSavedTheme,
    apply: applyTheme,
    toggle: toggleTheme
  };
})();
