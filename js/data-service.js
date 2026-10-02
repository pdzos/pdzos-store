/**
 * PDzOS Store — Data Service Abstraction Layer
 * 
 * Provides clean asynchronous data access methods.
 * Currently reads from /data/apps.json.
 * In the future, this file can be pointed to an API endpoint without
 * touching any frontend UI or page rendering scripts.
 */

const DataService = (function() {
  const DATA_ENDPOINT = "data/apps.json";
  let cachedData = null;

  /**
   * Fetch all store data with memoization
   */
  async function loadStoreData() {
    if (cachedData) return cachedData;

    try {
      const response = await fetch(DATA_ENDPOINT, { cache: "no-cache" });
      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: Unable to load apps catalog`);
      }
      const data = await response.json();
      if (!data || !Array.isArray(data.apps)) {
        throw new Error("Invalid apps.json schema format: 'apps' array missing");
      }
      cachedData = data;
      return cachedData;
    } catch (err) {
      console.error("[DataService] Failed to load store data:", err);
      throw err;
    }
  }

  /**
   * Get all apps list
   */
  async function getApps() {
    const data = await loadStoreData();
    return data.apps || [];
  }

  /**
   * Get app by unique ID
   */
  async function getAppById(id) {
    if (!id) return null;
    const apps = await getApps();
    const cleanId = String(id).trim().toLowerCase();
    return apps.find(a => a.id.toLowerCase() === cleanId) || null;
  }

  /**
   * Get the primary featured app
   */
  async function getFeaturedApp() {
    const apps = await getApps();
    const featured = apps.find(a => a.featured === true);
    return featured || apps[0] || null;
  }

  /**
   * Get latest apps sorted by updated date
   */
  async function getLatestApps(limit = 6) {
    const apps = await getApps();
    const sorted = [...apps].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get popular apps sorted by download count / popularity
   */
  async function getPopularApps(limit = 6) {
    const apps = await getApps();
    const sorted = [...apps].sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    return limit ? sorted.slice(0, limit) : sorted;
  }

  /**
   * Get all categories with app counts
   */
  async function getCategories() {
    const apps = await getApps();
    const standardCategories = [
      "AI",
      "Tools",
      "Productivity",
      "Creative",
      "Games",
      "Customization",
      "Launcher",
      "Education",
      "Experimental",
      "Other"
    ];

    const categoryCounts = {};
    standardCategories.forEach(c => (categoryCounts[c] = 0));

    apps.forEach(app => {
      const cat = app.category || "Other";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return standardCategories.map(name => ({
      name,
      count: categoryCounts[name] || 0
    }));
  }

  /**
   * Get related apps in the same category or sharing tags
   */
  async function getRelatedApps(currentApp, limit = 4) {
    if (!currentApp) return [];
    const apps = await getApps();
    const others = apps.filter(a => a.id !== currentApp.id);

    // Score based on category and overlapping tags
    const scored = others.map(app => {
      let score = 0;
      if (app.category === currentApp.category) score += 3;
      if (Array.isArray(app.tags) && Array.isArray(currentApp.tags)) {
        const commonTags = app.tags.filter(t => currentApp.tags.includes(t));
        score += commonTags.length;
      }
      return { app, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, limit).map(item => item.app);
  }

  /**
   * Normalize external download URLs (Google Drive, GitHub, Direct HTTPS)
   */
  function normalizeDownloadUrl(url) {
    if (!url || typeof url !== "string") {
      return { isValid: false, directUrl: "", type: "none" };
    }

    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return { isValid: false, directUrl: "", type: "invalid" };
    }

    // Google Drive URL handling
    if (trimmed.includes("drive.google.com")) {
      let fileId = null;
      // Pattern 1: /file/d/FILE_ID/view...
      const matchPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (matchPath && matchPath[1]) {
        fileId = matchPath[1];
      }
      // Pattern 2: id=FILE_ID
      const matchQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchQuery && matchQuery[1]) {
        fileId = matchQuery[1];
      }

      if (fileId) {
        // Direct download URL format for Google Drive
        return {
          isValid: true,
          directUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
          previewUrl: `https://drive.google.com/file/d/${fileId}/view`,
          type: "gdrive",
          fileId
        };
      }

      return { isValid: true, directUrl: trimmed, type: "gdrive" };
    }

    // GitHub Releases
    if (trimmed.includes("github.com") && trimmed.includes("/releases/")) {
      return { isValid: true, directUrl: trimmed, type: "github" };
    }

    // Direct APK or general HTTPS link
    return {
      isValid: true,
      directUrl: trimmed,
      type: trimmed.endsWith(".apk") ? "direct_apk" : "external"
    };
  }

  /**
   * Determine badges based on date and status
   */
  function calculateBadge(app) {
    if (!app) return null;

    // Explicit status takes precedence if experimental or beta or deprecated
    if (app.status === "deprecated") {
      return { text: "DEPRECATED", class: "badge-beta" };
    }
    if (app.status === "beta") {
      return { text: "BETA", class: "badge-beta" };
    }
    if (app.status === "experimental") {
      return { text: "EXPERIMENTAL", class: "badge-beta" };
    }

    // Date-based calculation
    const updatedDate = new Date(app.updated);
    if (!isNaN(updatedDate.getTime())) {
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

      // Brand new app (within threshold or v1.0.0 released recently)
      if (app.status === "new" || (diffDays <= (CONFIG.newBadgeDays || 45) && (app.version === "1.0.0" || app.version === "1.0"))) {
        return { text: "NEW", class: "badge-new" };
      }

      // Recently updated
      if (diffDays <= (CONFIG.updatedBadgeDays || 30)) {
        return { text: "UPDATED", class: "badge-updated" };
      }
    }

    return { text: "STABLE", class: "badge-stable" };
  }

  return {
    getApps,
    getAppById,
    getFeaturedApp,
    getLatestApps,
    getPopularApps,
    getCategories,
    getRelatedApps,
    normalizeDownloadUrl,
    calculateBadge
  };
})();

window.DataService = DataService;
