/**
 * PDzOS Store — Real-time Search, Categorization, and Filtering Controller
 * Powers /apps.html and search bar interactions
 */

const SearchController = (function() {
  let allApps = [];
  let currentFiltered = [];
  let activeCategory = "All";
  let searchQuery = "";
  let currentSort = "latest";
  let currentView = "grid"; // "grid" | "list"

  async function init() {
    const appsContainer = document.getElementById("appsContainer");
    if (!appsContainer) return; // Not on apps page

    try {
      allApps = await DataService.getApps();
      parseUrlParameters();
      bindControls();
      applyFilters();
    } catch (err) {
      showErrorState("Unable to load applications list. Please verify your connection.");
    }
  }

  /**
   * Parse incoming URL params e.g. apps.html?category=AI or apps.html?search=xyz
   */
  function parseUrlParameters() {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    const q = params.get("search");

    if (cat) {
      activeCategory = cat;
    }
    if (q) {
      searchQuery = q.trim();
      const input = document.getElementById("searchInput");
      if (input) input.value = searchQuery;
    }
  }

  /**
   * Synchronize URL state without page reload
   */
  function syncUrl() {
    const params = new URLSearchParams();
    if (activeCategory && activeCategory !== "All") {
      params.set("category", activeCategory);
    }
    if (searchQuery) {
      params.set("search", searchQuery);
    }
    const newRelativePathQuery = window.location.pathname + (params.toString() ? "?" + params.toString() : "");
    window.history.replaceState(null, "", newRelativePathQuery);
  }

  /**
   * Bind event listeners for input, pills, dropdowns, and toggles
   */
  function bindControls() {
    const searchInput = document.getElementById("searchInput");
    const clearBtn = document.getElementById("searchClearBtn");
    const sortSelect = document.getElementById("sortSelect");
    const viewGridBtn = document.getElementById("viewGridBtn");
    const viewListBtn = document.getElementById("viewListBtn");
    const categoryContainer = document.getElementById("categoryPillsContainer");

    // Search input with debounce
    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        if (clearBtn) {
          clearBtn.classList.toggle("visible", searchQuery.length > 0);
        }
        applyFilters();
      });
    }

    // Clear search
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (searchInput) {
          searchInput.value = "";
          searchInput.focus();
        }
        searchQuery = "";
        clearBtn.classList.remove("visible");
        applyFilters();
      });
    }

    // Sort select
    if (sortSelect) {
      sortSelect.addEventListener("change", (e) => {
        currentSort = e.target.value;
        applyFilters();
      });
    }

    // Category pills click
    if (categoryContainer) {
      categoryContainer.addEventListener("click", (e) => {
        const pill = e.target.closest(".cat-pill");
        if (!pill) return;
        const cat = pill.getAttribute("data-category");
        setCategory(cat);
      });
    }

    // Grid / List toggles
    if (viewGridBtn && viewListBtn) {
      viewGridBtn.addEventListener("click", () => setViewMode("grid"));
      viewListBtn.addEventListener("click", () => setViewMode("list"));
    }
  }

  function setCategory(cat) {
    activeCategory = cat || "All";
    // Update pill active classes
    const pills = document.querySelectorAll(".cat-pill");
    pills.forEach(p => {
      const pCat = p.getAttribute("data-category");
      p.classList.toggle("active", pCat.toLowerCase() === activeCategory.toLowerCase());
    });
    applyFilters();
  }

  function setViewMode(mode) {
    currentView = mode;
    const grid = document.getElementById("appsContainer");
    const viewGridBtn = document.getElementById("viewGridBtn");
    const viewListBtn = document.getElementById("viewListBtn");

    if (grid) {
      grid.classList.toggle("list-view", mode === "list");
    }
    if (viewGridBtn) viewGridBtn.classList.toggle("active", mode === "grid");
    if (viewListBtn) viewListBtn.classList.toggle("active", mode === "list");
  }

  /**
   * Filter and Sort Apps in Real Time
   */
  function applyFilters() {
    syncUrl();

    let results = [...allApps];

    // 1. Category Filter
    if (activeCategory && activeCategory !== "All") {
      results = results.filter(app => (app.category || "Other").toLowerCase() === activeCategory.toLowerCase());
    }

    // 2. Text Search Query Filter (name, description, category, tags)
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      results = results.filter(app => {
        const nameMatch = (app.name || "").toLowerCase().includes(q);
        const descMatch = (app.description || "").toLowerCase().includes(q);
        const catMatch = (app.category || "").toLowerCase().includes(q);
        const tagMatch = Array.isArray(app.tags) && app.tags.some(t => t.toLowerCase().includes(q));
        return nameMatch || descMatch || catMatch || tagMatch;
      });
    }

    // 3. Sorting
    switch (currentSort) {
      case "latest":
      case "updated":
        results.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
        break;
      case "alpha_asc":
        results.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "alpha_desc":
        results.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "popular":
        results.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
        break;
      default:
        break;
    }

    currentFiltered = results;
    renderResults();
  }

  /**
   * Render Filtered Results to DOM
   */
  function renderResults() {
    const container = document.getElementById("appsContainer");
    const countEl = document.getElementById("resultsCount");
    if (!container) return;

    if (countEl) {
      countEl.textContent = `Showing ${currentFiltered.length} ${currentFiltered.length === 1 ? 'app' : 'apps'}`;
    }

    if (currentFiltered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            <line x1="8" y1="11" x2="14" y2="11"></line>
          </svg>
          <h3>No applications found</h3>
          <p>No apps matched your current search and filter criteria.</p>
          <button class="btn btn-secondary" onclick="SearchController.resetFilters()">
            Reset All Filters
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = currentFiltered.map(app => App.renderAppCard(app)).join("");
  }

  function resetFilters() {
    activeCategory = "All";
    searchQuery = "";
    currentSort = "latest";

    const searchInput = document.getElementById("searchInput");
    if (searchInput) searchInput.value = "";

    const clearBtn = document.getElementById("searchClearBtn");
    if (clearBtn) clearBtn.classList.remove("visible");

    const sortSelect = document.getElementById("sortSelect");
    if (sortSelect) sortSelect.value = "latest";

    const pills = document.querySelectorAll(".cat-pill");
    pills.forEach(p => {
      p.classList.toggle("active", p.getAttribute("data-category") === "All");
    });

    applyFilters();
  }

  function showErrorState(msg) {
    const container = document.getElementById("appsContainer");
    if (!container) return;
    container.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#EF4444" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        <h3>Failed to load applications</h3>
        <p>${App.escapeHtml(msg)}</p>
        <button class="btn btn-primary" onclick="location.reload()">Retry</button>
      </div>
    `;
  }

  return {
    init,
    setCategory,
    resetFilters
  };
})();

document.addEventListener("DOMContentLoaded", () => {
  SearchController.init();
});

window.SearchController = SearchController;
