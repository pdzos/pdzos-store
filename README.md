# PDzOS Store 🚀

> **Your Apps. One Store.**  
> A premium, modern, fast, mobile-first Android app marketplace website designed for distributing applications developed by PDzOS.

[![Cloudflare Pages](https://img.shields.io/badge/Deployed%20with-Cloudflare%20Pages-F38020?logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PWA Ready](https://img.shields.io/badge/PWA-Ready-brightgreen?logo=pwa&logoColor=white)](manifest.json)

---

## ✨ Features

- **Zero-Backend Architecture**: 100% static site deployable directly to Cloudflare Pages, GitHub Pages, or any static web host. No database or paid backend required.
- **Auto-Sync with PdzOS App Update Center**: Automatically detects and loads apps, versions, changelogs, and APK download links directly from your Update Center dashboard (`pdzosupdate`).
- **Data-Driven with JSON**: Manage all apps, changelogs, versions, and screenshots through the Update Center or simply by editing `data/apps.json`.
- **Instant Client-Side Search & Filter**: Real-time multi-token search across app names, descriptions, categories, and tags.
- **External APK Hosting Support**: Direct support for Google Drive public sharing URLs, GitHub Releases, and direct APK HTTPS links.
- **Dark Mode First**: Clean dark aesthetics with subtle glassmorphism and modern cyan/purple accents, with an instant light-mode toggle.
- **Progressive Web App (PWA)**: Installable on Android, Windows, and macOS with offline app shell caching.
- **Interactive Screenshot Lightbox**: Fullscreen preview modal with keyboard and swipe navigation.
- **Dynamic App Details & Version History**: URL-based routing (`/app.html?id=zyra`) with previous release archives and changelogs.

---

## 📁 Repository Structure

```text
├── index.html                  # Home page
├── apps.html                   # All Apps catalog with filters & sorting
├── app.html                    # Dynamic app detail page (?id=...)
├── about.html                  # About the store and developer
├── privacy.html                # Privacy policy
├── terms.html                  # Terms of service
├── 404.html                    # Custom 404 page
├── manifest.json               # PWA Web App Manifest
├── service-worker.js           # Offline service worker
├── robots.txt                  # Search crawler directives
├── sitemap.xml                 # SEO sitemap
│
├── data/
│   └── apps.json               # App metadata, releases, and download links
│
├── assets/
│   ├── logo/                   # Vector branding and mark
│   ├── favicon/                # PWA icons & favicons
│   ├── icons/                  # Vector app icons
│   └── screenshots/            # App screenshots
│
├── css/
│   ├── style.css               # Main styling & design tokens
│   ├── animations.css          # Subtle transitions & reduced motion
│   └── responsive.css          # Mobile-first breakpoints
│
└── js/
    ├── config.js               # Central store configuration
    ├── theme.js                # Theme switcher (Dark / Light)
    ├── data-service.js         # Data abstraction layer
    ├── search.js               # Instant search & filter engine
    └── app.js                  # Global application logic & UI
```

---

## 🛠️ Adding a New App

1. Add your app icon to `assets/icons/` and screenshots to `assets/screenshots/`.
2. Add an entry to `data/apps.json`:

```json
{
  "id": "my-app",
  "name": "My App",
  "developer": "PDzOS",
  "version": "1.0.0",
  "category": "Tools",
  "description": "Short description of the app.",
  "icon": "assets/icons/my-app.svg",
  "downloadUrl": "https://github.com/pdzos/my-app/releases/download/v1.0.0/app.apk",
  "size": "15 MB",
  "android": "Android 9.0+",
  "updated": "2026-10-02",
  "tags": ["Tools", "Utility"],
  "features": ["Feature 1", "Feature 2"],
  "whatsNew": ["Initial release"],
  "previousVersions": []
}
```

The app will appear automatically on the homepage, catalog, and its own detail page (`app.html?id=my-app`).

---

## 🌐 Deploy to Cloudflare Pages

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/) &rarr; **Workers & Pages** &rarr; **Create application** &rarr; **Pages**.
2. Connect your GitHub repository `pdzos/pdzos-store`.
3. Set **Framework preset** to `None` and leave **Build command** empty.
4. Set **Build output directory** to `/` (root).
5. Click **Save and Deploy**.

---

## 📄 License

Created and distributed by [PDzOS](https://github.com/pdzos).
