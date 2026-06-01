# 📱 Mobile & Desktop PWA (Progressive Web App) Guide

The Smart Campus GatePass is a fully featured **Progressive Web App (PWA)** that can be installed on laptops, desktops, and mobile devices (iOS/Android), behaving like a native application with an immersive standalone window.

---

## ✨ Features
*   **Install App Support Link**: Dedicated link in the "Support" sidebar group for instant, visible access.
*   **Platform-Aware Install Modal**: Automatically detects the user's platform (Chrome Desktop, iOS Safari, Android Chrome, Edge, Firefox, Safari Mac) and shows tailored step-by-step installation instructions.
*   **IP Address Compatible**: Works even when accessed via a raw IP address (e.g., `http://185.192.97.84:9613/`).
*   **No App Store Needed**: Fully direct download.
*   **Offline Capable**: Caches static assets for ultra-fast loading via Service Workers.
*   **Responsive UX**: Touch-optimized interface with native app-like header and navigation.

---

## 🚀 How to Access and Install

### 1. From the Sidebar Menu
1. Expand the **Support** section in the left sidebar menu.
2. Click **Install App** (marked with a blue **PWA** badge).
3. The platform-specific interactive installation guide modal will open.

### 2. Platform-Specific Guides
*   **Chrome/Edge Desktop**: Click the "Install" (⬇) icon in the browser address bar, or follow the step-by-step guide to download.
*   **Android (Chrome)**: Tap the 3-dot menu (⋮) -> Select "Add to Home Screen" / "Install App".
*   **iOS (Safari)**: Tap the Share button (□↑) -> Scroll down and select "Add to Home Screen".
*   **Mac Safari**: Go to File -> Add to Dock (macOS Sonoma 14+).

---

## 🛠️ Technical Details & Configuration

### A. Vite PWA Plugin & Manifest
*   Configured in [vite.config.ts](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/vite.config.ts) using `vite-plugin-pwa`.
*   Outputs a dynamic [manifest.webmanifest](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/public/manifest.webmanifest) and caches files via Workbox.

### B. Nginx Service Worker Headers
In [nginx.conf](file:///c:/Users/Metto/Desktop/Codes/gatepass/frontend/nginx.conf), we set explicit PWA headers to ensure that:
1. Manifest MIME type is strictly served.
2. Service Worker (`sw.js`) is **never cached** to ensure immediate app updates:
```nginx
location ~* (sw\.js|workbox-.+\.js)$ {
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
    add_header Service-Worker-Allowed "/";
}
```

### C. Apache Proxy & IP Access Control
To permit accessing the application on the IP address while blocking the old/restricted domain `smartcampus.kkh.co.ke`, configure Apache VPS VirtualHosts as detailed in [site_config/apache_ip_control.conf](file:///c:/Users/Metto/Desktop/Codes/gatepass/site_config/apache_ip_control.conf):
1. **Domain VirtualHost**: Intercepts requests for `smartcampus.kkh.co.ke` and returns a `403 Forbidden` block.
2. **IP VirtualHost**: Intercepts requests to `185.192.97.84` (port 80) and proxies them to the Docker container at port `9613` (including WebSocket support).

