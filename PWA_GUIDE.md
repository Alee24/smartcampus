# 📱 Mobile App (PWA) Guide

The Smart Campus GatePass is now a fully functional **Progressive Web App (PWA)**. 
It can be installed on mobile devices (iOS/Android) and Desktop, behaving like a native app.

## ✨ Features
*   **Installable**: "Add to Home Screen" prompt appears automatically.
*   **Standalone**: Runs without browser address bars for an immersive experience.
*   **Offline Capable**: Caches assets for faster loading (via Service Workers).
*   **Touch Optimized**: UI elements are designed for mobile interaction.

## 🚀 How to Install

### Android (Chrome)
1.  Open the website in Chrome.
2.  A banner "Install GatePass" will appear at the bottom.
3.  Tap **Install App**.
4.  Alternatively, tap the **Three Dots Menu** -> **Install App**.

### iOS (Safari)
1.  Open the website in Safari.
2.  Tap the **Share** button (Square with arrow up).
3.  Scroll down and tap **Add to Home Screen**.
4.  Confirm name "GatePass".

### Desktop (Chrome/Edge)
1.  Look for the **Install Icon** (Computer with down arrow) in the address bar.
2.  Click to install as a standalone desktop app.

## 🛠️ Technical Implementation
*   **Vite PWA Plugin**: Handles manifest generation and Service Worker registration.
*   **Manifest**: `manifest.webmanifest` defines app name, icons, and theme colors.
*   **Icons**: Generated in `public/pwa-*.png`.
*   **Custom Prompt**: `InstallPWA.tsx` component intercepts the browser event to show a custom UI.
