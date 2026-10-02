/**
 * PDzOS Store — Central Configuration
 * Easy to customize without modifying HTML or core application logic.
 */

const CONFIG = {
  // Store Branding
  storeName: "PDzOS Store",
  developerName: "PDzOS",
  websiteUrl: "https://your-domain.com",
  slogan: "Your Apps. One Store.",
  tagline: "Discover powerful Android apps built by PDzOS.",

  // Social & Community Links (Keep empty if not used)
  githubUrl: "https://github.com/pdzos",
  telegramUrl: "",
  youtubeUrl: "",
  twitterUrl: "",
  contactEmail: "developer@pdzos.local",

  // Live Sync with PdzOS App Update Center
  syncWithUpdateCenter: true,
  updateCenterApiUrl: "https://pdzosupdate.pages.dev/api/store",
  updateCenterRawGithubUrl: "https://raw.githubusercontent.com/pdzos/pdzosupdate/main/apps.json",
  updateCenterGithubRepoContentsUrl: "https://api.github.com/repos/pdzos/pdzosupdate/contents/apps",

  // Badge Logic Thresholds (in days)
  newBadgeDays: 45,       // Apps published within 45 days show 'NEW'
  updatedBadgeDays: 30,   // Apps updated within 30 days show 'UPDATED'

  // Optional Analytics (Disabled by default as per requirements)
  analyticsEnabled: false,
  analyticsProvider: "", // e.g. "cloudflare-web-analytics" or "google-analytics"
  analyticsId: ""        // e.g. token or measurement ID
};

// Freeze configuration to prevent runtime mutations
if (typeof Object.freeze === "function") {
  Object.freeze(CONFIG);
}
