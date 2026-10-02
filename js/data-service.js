/**
 * PDzOS Store — Data Service Abstraction Layer
 * 
 * Provides clean asynchronous data access methods.
 * Automatically synchronizes with the PdzOS App Update Center repository
 * while providing an offline/local fallback to /data/apps.json.
 */

const DataService = (function() {
  const LOCAL_DATA_ENDPOINT = "data/apps.json";
  let cachedData = null;

  /**
   * Helper with timeout for resilient network requests
   */
  async function fetchWithTimeout(url, timeoutMs = 3500) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { signal: controller.signal, cache: "no-cache" });
      clearTimeout(id);
      return response;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  /**
   * Standardize an app object coming from the Update Center into the Store schema
   */
  function standardizeRemoteApp(raw) {
    if (!raw) return null;

    // Check if format is the permanent endpoint structure: { success: true, app: {...}, update: {...} }
    const isPayloadFormat = raw.app && raw.update;
    const appMeta = isPayloadFormat ? raw.app : raw;
    const updateMeta = isPayloadFormat ? raw.update : raw;

    const pkgName = appMeta.packageName || raw.packageName || "";
    const cleanId = raw.id 
      ? String(raw.id).toLowerCase().replace(/^app-/, '') 
      : (pkgName ? pkgName.split('.').pop().toLowerCase() : (appMeta.name ? appMeta.name.toLowerCase().replace(/[^a-z0-9]/g, '') : 'app'));

    let androidStr = "Android 8.0+";
    const minApi = updateMeta.minimumAndroid || raw.minimumAndroid;
    if (minApi) {
      if (typeof minApi === "number") {
        if (minApi === 24) androidStr = "Android 7.0+";
        else if (minApi === 26) androidStr = "Android 8.0+";
        else if (minApi === 27) androidStr = "Android 8.1+";
        else if (minApi === 28) androidStr = "Android 9.0+";
        else if (minApi >= 29) androidStr = `Android ${minApi - 19}.0+`;
      } else if (typeof minApi === "string") {
        androidStr = minApi.startsWith("Android") ? minApi : `Android ${minApi}`;
      }
    }

    return {
      id: cleanId,
      packageName: pkgName,
      name: appMeta.name || raw.name || "Untitled App",
      developer: appMeta.developer || raw.developer || CONFIG.developerName || "PDzOS",
      version: updateMeta.version || raw.version || "1.0.0",
      versionCode: updateMeta.versionCode || raw.versionCode || 1,
      category: appMeta.category || raw.category || "Tools",
      description: appMeta.description || raw.description || "Android application built by PDzOS.",
      longDescription: raw.longDescription || appMeta.description || raw.description || "",
      icon: appMeta.icon || raw.icon || "assets/favicon/favicon.svg",
      screenshots: Array.isArray(raw.screenshots) ? raw.screenshots : (Array.isArray(appMeta.screenshots) ? appMeta.screenshots : []),
      size: updateMeta.fileSize || raw.size || "N/A",
      android: androidStr,
      updated: updateMeta.releaseDate || raw.updated || new Date().toISOString().split("T")[0],
      downloads: raw.downloads || 0,
      featured: Boolean(raw.featured || appMeta.featured),
      status: raw.status || (updateMeta.channel === "beta" ? "beta" : "stable"),
      downloadUrl: updateMeta.apkUrl || raw.downloadUrl || "",
      tags: Array.isArray(raw.tags) && raw.tags.length > 0 ? raw.tags : (Array.isArray(appMeta.tags) && appMeta.tags.length > 0 ? appMeta.tags : [appMeta.category || raw.category || "Tools", "Android"]),
      features: Array.isArray(raw.features) && raw.features.length > 0 ? raw.features : (Array.isArray(updateMeta.changelog) && updateMeta.changelog.length > 0 ? updateMeta.changelog : ["Fast, lightweight performance", "OLED dark-mode optimized"]),
      whatsNew: Array.isArray(raw.whatsNew) && raw.whatsNew.length > 0 ? raw.whatsNew : (Array.isArray(updateMeta.changelog) && updateMeta.changelog.length > 0 ? updateMeta.changelog : ["Initial release"]),
      previousVersions: Array.isArray(raw.previousVersions) ? raw.previousVersions : [],
      isFromUpdateCenter: true
    };
  }

  /**
   * Attempt to fetch live apps from the PdzOS App Update Center
   */
  async function fetchFromUpdateCenter() {
    if (!CONFIG.syncWithUpdateCenter) return null;

    // Strategy 1: Fetch raw consolidated apps.json from GitHub
    if (CONFIG.updateCenterRawGithubUrl) {
      try {
        const res = await fetchWithTimeout(CONFIG.updateCenterRawGithubUrl, 3000);
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.apps) && json.apps.length > 0) {
            console.log(`[DataService] Synced ${json.apps.length} apps from Update Center GitHub`);
            return json.apps.map(standardizeRemoteApp).filter(Boolean);
          }
        }
      } catch (e) {
        // Continue to Strategy 2
      }
    }

    // Strategy 2: Fetch from Update Center Cloudflare Pages API endpoint
    if (CONFIG.updateCenterApiUrl) {
      try {
        const res = await fetchWithTimeout(CONFIG.updateCenterApiUrl, 3000);
        if (res.ok) {
          const json = await res.json();
          if (json && Array.isArray(json.apps) && json.apps.length > 0) {
            console.log(`[DataService] Synced ${json.apps.length} apps from Update Center API`);
            return json.apps.map(standardizeRemoteApp).filter(Boolean);
          }
        }
      } catch (e) {
        // Continue to Strategy 3
      }
    }

    // Strategy 3: Check individual apps in GitHub repo /apps directory
    if (CONFIG.updateCenterGithubRepoContentsUrl) {
      try {
        const res = await fetchWithTimeout(CONFIG.updateCenterGithubRepoContentsUrl, 3000);
        if (res.ok) {
          const fileList = await res.json();
          if (Array.isArray(fileList) && fileList.length > 0) {
            const jsonFiles = fileList.filter(f => f.name.endsWith(".json"));
            const fetchedApps = await Promise.all(
              jsonFiles.slice(0, 15).map(async file => {
                try {
                  const fRes = await fetchWithTimeout(file.download_url, 2500);
                  if (fRes.ok) {
                    const rawApp = await fRes.json();
                    return standardizeRemoteApp(rawApp);
                  }
                } catch {
                  return null;
                }
              })
            );
            const validApps = fetchedApps.filter(Boolean);
            if (validApps.length > 0) {
              console.log(`[DataService] Discovered ${validApps.length} live apps from Update Center repo`);
              return validApps;
            }
          }
        }
      } catch (e) {
        // Remote sync unavailable
      }
    }

    return null;
  }

  /**
   * Fetch all store data with memoization and live Update Center merge
   */
  async function loadStoreData() {
    if (cachedData) return cachedData;

    let baseCatalog = { store: { name: "PDzOS Store", version: "1.0.0" }, apps: [] };

    // 1. Load Local Catalog
    try {
      const response = await fetch(LOCAL_DATA_ENDPOINT, { cache: "no-cache" });
      if (response.ok) {
        baseCatalog = await response.json();
      }
    } catch (err) {
      console.warn("[DataService] Local catalog read warning:", err);
    }

    // 2. Fetch live updates from Update Center
    try {
      const liveApps = await fetchFromUpdateCenter();
      if (liveApps && liveApps.length > 0) {
        const mergedApps = [...(baseCatalog.apps || [])];

        liveApps.forEach(liveApp => {
          // Match by id or packageName
          const index = mergedApps.findIndex(a => 
            (a.id && a.id.toLowerCase() === liveApp.id.toLowerCase()) ||
            (a.packageName && liveApp.packageName && a.packageName.toLowerCase() === liveApp.packageName.toLowerCase())
          );

          if (index !== -1) {
            // Update existing app with newest release metadata from Update Center
            mergedApps[index] = {
              ...mergedApps[index],
              version: liveApp.version,
              versionCode: liveApp.versionCode,
              downloadUrl: liveApp.downloadUrl || mergedApps[index].downloadUrl,
              size: liveApp.size || mergedApps[index].size,
              updated: liveApp.updated || mergedApps[index].updated,
              features: liveApp.features?.length > 0 ? liveApp.features : mergedApps[index].features,
              whatsNew: liveApp.whatsNew?.length > 0 ? liveApp.whatsNew : mergedApps[index].whatsNew,
              isFromUpdateCenter: true
            };
          } else {
            // Add as new application from Update Center
            mergedApps.unshift(liveApp);
          }
        });

        baseCatalog.apps = mergedApps;
      }
    } catch (e) {
      console.warn("[DataService] Remote sync fallback:", e);
    }

    cachedData = baseCatalog;
    return cachedData;
  }

  /**
   * Get all apps list
   */
  async function getApps() {
    const data = await loadStoreData();
    return data.apps || [];
  }

  /**
   * Get app by unique ID or package name
   */
  async function getAppById(id) {
    if (!id) return null;
    const apps = await getApps();
    const cleanId = String(id).trim().toLowerCase();
    return apps.find(a => 
      (a.id && a.id.toLowerCase() === cleanId) || 
      (a.packageName && a.packageName.toLowerCase() === cleanId)
    ) || null;
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
      const matchPath = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
      if (matchPath && matchPath[1]) {
        fileId = matchPath[1];
      }
      const matchQuery = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (matchQuery && matchQuery[1]) {
        fileId = matchQuery[1];
      }

      if (fileId) {
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

    if (app.status === "deprecated") {
      return { text: "DEPRECATED", class: "badge-beta" };
    }
    if (app.status === "beta") {
      return { text: "BETA", class: "badge-beta" };
    }
    if (app.status === "experimental") {
      return { text: "EXPERIMENTAL", class: "badge-beta" };
    }

    const updatedDate = new Date(app.updated);
    if (!isNaN(updatedDate.getTime())) {
      const now = new Date();
      const diffDays = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));

      if (app.status === "new" || (diffDays <= (CONFIG.newBadgeDays || 45) && (app.version === "1.0.0" || app.version === "1.0"))) {
        return { text: "NEW", class: "badge-new" };
      }

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
