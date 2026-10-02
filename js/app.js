/**
 * PDzOS Store — Core Application Engine
 * Handles UI interactions, mobile drawer, lightbox, download handling, and PWA setup.
 */

const App = (function() {
  const LOCAL_DOWNLOADS_KEY = "pdzos_local_downloads";

  /**
   * Initialize Global UI
   */
  function init() {
    initHeaderScroll();
    initMobileDrawer();
    initLightbox();
    initFooter();
    registerServiceWorker();
  }

  /**
   * Header Sticky Blur Scroll Effect
   */
  function initHeaderScroll() {
    const header = document.querySelector(".site-header");
    if (!header) return;

    window.addEventListener("scroll", () => {
      if (window.scrollY > 20) {
        header.classList.add("scrolled");
      } else {
        header.classList.remove("scrolled");
      }
    }, { passive: true });
  }

  /**
   * Mobile Drawer Toggle
   */
  function initMobileDrawer() {
    const toggleBtn = document.querySelector(".btn-menu-toggle");
    const drawer = document.querySelector(".mobile-drawer");
    const overlay = document.querySelector(".mobile-drawer-overlay");
    const closeBtn = document.querySelector(".btn-drawer-close");

    if (!toggleBtn || !drawer || !overlay) return;

    function openDrawer() {
      drawer.classList.add("active");
      overlay.classList.add("active");
      document.body.style.overflow = "hidden";
      drawer.setAttribute("aria-hidden", "false");
    }

    function closeDrawer() {
      drawer.classList.remove("active");
      overlay.classList.remove("active");
      document.body.style.overflow = "";
      drawer.setAttribute("aria-hidden", "true");
    }

    toggleBtn.addEventListener("click", openDrawer);
    if (closeBtn) closeBtn.addEventListener("click", closeDrawer);
    overlay.addEventListener("click", closeDrawer);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && drawer.classList.contains("active")) {
        closeDrawer();
      }
    });
  }

  /**
   * Screenshot Lightbox Modal
   */
  let currentScreenshots = [];
  let currentScreenshotIndex = 0;

  function initLightbox() {
    const modal = document.getElementById("screenshotLightbox");
    if (!modal) return;

    const closeBtn = modal.querySelector(".lightbox-close");
    const prevBtn = modal.querySelector(".lightbox-prev");
    const nextBtn = modal.querySelector(".lightbox-next");

    function closeModal() {
      modal.classList.remove("active");
      modal.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    }

    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });

    if (prevBtn) {
      prevBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateLightbox(-1);
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        navigateLightbox(1);
      });
    }

    document.addEventListener("keydown", (e) => {
      if (!modal.classList.contains("active")) return;
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowLeft") navigateLightbox(-1);
      if (e.key === "ArrowRight") navigateLightbox(1);
    });
  }

  function openLightbox(images, startIndex = 0) {
    const modal = document.getElementById("screenshotLightbox");
    if (!modal || !images || images.length === 0) return;

    currentScreenshots = images;
    currentScreenshotIndex = startIndex;
    updateLightboxImage();

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function updateLightboxImage() {
    const modal = document.getElementById("screenshotLightbox");
    const imgEl = modal.querySelector(".lightbox-img");
    if (!imgEl) return;

    const src = currentScreenshots[currentScreenshotIndex];
    imgEl.src = src;
    imgEl.alt = `Screenshot preview ${currentScreenshotIndex + 1}`;
  }

  function navigateLightbox(dir) {
    if (currentScreenshots.length <= 1) return;
    currentScreenshotIndex = (currentScreenshotIndex + dir + currentScreenshots.length) % currentScreenshots.length;
    updateLightboxImage();
  }

  /**
   * Generate reusable HTML string for an App Card
   */
  function renderAppCard(app) {
    const badge = DataService.calculateBadge(app);
    const badgeHtml = badge ? `<span class="badge ${badge.class}">${badge.text}</span>` : "";
    const safeDesc = escapeHtml(app.description || "");
    const safeName = escapeHtml(app.name || "");
    const safeCategory = escapeHtml(app.category || "General");

    return `
      <article class="app-card" onclick="window.location.href='app.html?id=${encodeURIComponent(app.id)}'">
        <div class="app-card-top">
          <img class="app-card-icon" src="${app.icon}" alt="${safeName} icon" loading="lazy" onerror="this.src='assets/favicon/favicon.svg'">
          <div class="app-card-heading">
            <h3 class="app-card-name">${safeName}</h3>
            <div class="app-card-meta">
              <span class="badge badge-category">${safeCategory}</span>
              <span class="app-card-version">v${app.version}</span>
              ${badgeHtml}
            </div>
          </div>
        </div>
        <p class="app-card-desc">${safeDesc}</p>
        <div class="app-card-footer">
          <span>${app.size || 'N/A'} • ${formatDate(app.updated)}</span>
          <div class="app-card-actions">
            <a href="app.html?id=${encodeURIComponent(app.id)}" class="btn btn-sm btn-secondary" onclick="event.stopPropagation();">
              Details
            </a>
          </div>
        </div>
      </article>
    `;
  }

  /**
   * Handle APK Download Click Safely
   */
  function handleDownload(app, event) {
    if (event) event.stopPropagation();

    if (!app || !app.downloadUrl) {
      showToast("Download currently unavailable for this app.");
      return false;
    }

    const norm = DataService.normalizeDownloadUrl(app.downloadUrl);
    if (!norm.isValid) {
      showToast("Download currently unavailable.");
      return false;
    }

    // Record local browser statistics
    recordLocalDownload(app.id);

    // Open download in a new tab
    window.open(norm.directUrl, "_blank", "noopener,noreferrer");
    showToast(`Starting download for ${app.name}...`);
    return true;
  }

  /**
   * Record local device download count
   */
  function recordLocalDownload(appId) {
    try {
      const records = JSON.parse(localStorage.getItem(LOCAL_DOWNLOADS_KEY) || "{}");
      records[appId] = (records[appId] || 0) + 1;
      localStorage.setItem(LOCAL_DOWNLOADS_KEY, JSON.stringify(records));
    } catch (e) {
      // Local storage disabled or full
    }
  }

  /**
   * Toast Notification Feedback
   */
  function showToast(message, duration = 3500) {
    let container = document.querySelector(".toast-container");
    if (!container) {
      container = document.createElement("div");
      container.className = "toast-container";
      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = "toast";
    toast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
      <span>${escapeHtml(message)}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /**
   * Populate Dynamic Footer Information
   */
  function initFooter() {
    const yearEls = document.querySelectorAll(".current-year");
    const currentYear = new Date().getFullYear();
    yearEls.forEach(el => (el.textContent = currentYear));

    // Social Links from config
    const ghBtn = document.querySelector(".social-github");
    if (ghBtn) {
      if (CONFIG.githubUrl) {
        ghBtn.href = CONFIG.githubUrl;
        ghBtn.style.display = "inline-flex";
      } else {
        ghBtn.style.display = "none";
      }
    }

    const tgBtn = document.querySelector(".social-telegram");
    if (tgBtn) {
      if (CONFIG.telegramUrl) {
        tgBtn.href = CONFIG.telegramUrl;
        tgBtn.style.display = "inline-flex";
      } else {
        tgBtn.style.display = "none";
      }
    }

    const ytBtn = document.querySelector(".social-youtube");
    if (ytBtn) {
      if (CONFIG.youtubeUrl) {
        ytBtn.href = CONFIG.youtubeUrl;
        ytBtn.style.display = "inline-flex";
      } else {
        ytBtn.style.display = "none";
      }
    }
  }

  /**
   * Register PWA Service Worker
   */
  function registerServiceWorker() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js")
          .then(reg => {
            console.log("[PWA] Service worker registered successfully. Scope:", reg.scope);
          })
          .catch(err => {
            console.warn("[PWA] Service worker registration failed:", err);
          });
      });
    }
  }

  /**
   * Helpers
   */
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDate(dateStr) {
    if (!dateStr) return "Recent";
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  }

  return {
    init,
    renderAppCard,
    handleDownload,
    openLightbox,
    showToast,
    escapeHtml,
    formatDate
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  App.init();
});

window.App = App;
