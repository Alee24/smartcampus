import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Monitor, Chrome, Apple, Globe, Laptop, Info, CheckCircle, ExternalLink } from 'lucide-react';

type Platform = 'chrome-desktop' | 'chrome-android' | 'ios' | 'firefox' | 'edge' | 'safari-mac' | 'unknown';

function detectPlatform(): Platform {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isChrome = /chrome/.test(ua) && !/edg/.test(ua);
    const isEdge = /edg\//.test(ua);
    const isFirefox = /firefox/.test(ua);
    const isAndroid = /android/.test(ua);
    const isSafariMac = /safari/.test(ua) && /macintosh/.test(ua) && !isChrome && !isEdge;

    if (isIOS) return 'ios';
    if (isAndroid && isChrome) return 'chrome-android';
    if (isChrome && !isAndroid) return 'chrome-desktop';
    if (isEdge) return 'edge';
    if (isFirefox) return 'firefox';
    if (isSafariMac) return 'safari-mac';
    return 'unknown';
}

interface InstallStep {
    icon: string;
    text: string;
}

const INSTALL_GUIDES: Record<Platform, { title: string; icon: React.ReactNode; steps: InstallStep[] }> = {
    'chrome-desktop': {
        title: 'Install on Chrome / Edge (Desktop)',
        icon: <Monitor size={20} />,
        steps: [
            { icon: '1️⃣', text: 'Look for the install icon (⬇) in the address bar on the far right' },
            { icon: '2️⃣', text: 'Click "Install Smart Campus" in the popup' },
            { icon: '3️⃣', text: 'The app opens in its own window — pin it to your taskbar!' },
        ]
    },
    'chrome-android': {
        title: 'Install on Android (Chrome)',
        icon: <Smartphone size={20} />,
        steps: [
            { icon: '1️⃣', text: 'Tap the 3-dot menu (⋮) in the top right corner' },
            { icon: '2️⃣', text: 'Select "Add to Home Screen"' },
            { icon: '3️⃣', text: 'Tap "Add" — the app icon appears on your home screen' },
        ]
    },
    'ios': {
        title: 'Install on iPhone / iPad (Safari)',
        icon: <Apple size={20} />,
        steps: [
            { icon: '1️⃣', text: 'Open this page in Safari (not Chrome)' },
            { icon: '2️⃣', text: 'Tap the Share button (□↑) at the bottom of the screen' },
            { icon: '3️⃣', text: 'Scroll down and tap "Add to Home Screen"' },
            { icon: '4️⃣', text: 'Tap "Add" — the app icon appears on your home screen' },
        ]
    },
    'edge': {
        title: 'Install on Microsoft Edge',
        icon: <Globe size={20} />,
        steps: [
            { icon: '1️⃣', text: 'Click the 3-dot menu (•••) in the top right' },
            { icon: '2️⃣', text: 'Click "Apps" → "Install this site as an app"' },
            { icon: '3️⃣', text: 'Click "Install" — it will open in a dedicated window' },
        ]
    },
    'firefox': {
        title: 'Install on Firefox',
        icon: <Globe size={20} />,
        steps: [
            { icon: '1️⃣', text: 'Firefox has limited PWA support — for best experience, use Chrome or Edge' },
            { icon: '2️⃣', text: 'Alternatively, bookmark this page (Ctrl+D) for quick access' },
            { icon: '3️⃣', text: 'Open Chrome and navigate to this same address for full install support' },
        ]
    },
    'safari-mac': {
        title: 'Install on Safari (Mac)',
        icon: <Laptop size={20} />,
        steps: [
            { icon: '1️⃣', text: 'Click "File" in the Mac menu bar' },
            { icon: '2️⃣', text: 'Select "Add to Dock" (macOS Sonoma 14+)' },
            { icon: '3️⃣', text: 'Click "Add" — for older macOS use Chrome for best experience' },
        ]
    },
    'unknown': {
        title: 'Install the App',
        icon: <Download size={20} />,
        steps: [
            { icon: '1️⃣', text: 'For best results, open this page in Google Chrome or Microsoft Edge' },
            { icon: '2️⃣', text: 'On mobile: use the browser menu → "Add to Home Screen"' },
            { icon: '3️⃣', text: 'On desktop: look for the install icon (⬇) in the address bar' },
        ]
    }
};

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showGuide, setShowGuide] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [platform, setPlatform] = useState<Platform>('unknown');
    const [installSuccess, setInstallSuccess] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        const detected = detectPlatform();
        setPlatform(detected);

        // Check if already installed as standalone
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Check if user already dismissed the banner this session
        const wasDismissed = sessionStorage.getItem('pwa-install-dismissed');
        if (wasDismissed) {
            setDismissed(true);
            return;
        }

        // Listen for the native beforeinstallprompt (Chrome/Edge desktop+Android)
        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setShowBanner(true);
        };
        window.addEventListener('beforeinstallprompt', handler);

        // For iOS/Firefox/other: show after a delay if not native-prompted
        const timer = setTimeout(() => {
            if (!deferredPrompt && detected !== 'chrome-desktop' && detected !== 'chrome-android' && detected !== 'edge') {
                setShowBanner(true);
            }
        }, 4000);

        // Also check after 3s for desktops that didn't get a prompt yet (IP address context)
        const chromeTimer = setTimeout(() => {
            if (!deferredPrompt && (detected === 'chrome-desktop' || detected === 'edge')) {
                setShowBanner(true);
            }
        }, 5000);

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
            clearTimeout(timer);
            clearTimeout(chromeTimer);
        };
    }, []);

    const handleNativeInstall = async () => {
        if (!deferredPrompt) {
            setShowGuide(true);
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setInstallSuccess(true);
            setShowBanner(false);
            setTimeout(() => setInstallSuccess(false), 4000);
        }
        setDeferredPrompt(null);
        setShowBanner(false);
    };

    const handleDismiss = () => {
        sessionStorage.setItem('pwa-install-dismissed', '1');
        setDismissed(true);
        setShowBanner(false);
    };

    const guide = INSTALL_GUIDES[platform];

    if (isInstalled || dismissed) return null;

    return (
        <>
            {/* Success Toast */}
            {installSuccess && (
                <div className="fixed bottom-8 right-8 z-[200] flex items-center gap-3 bg-green-600 text-white px-6 py-4 rounded-2xl shadow-2xl font-bold animate-fade-in">
                    <CheckCircle size={20} />
                    App installed successfully!
                </div>
            )}

            {/* Install Guide Modal */}
            {showGuide && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6 relative border border-gray-100 dark:border-gray-800">
                        {/* Gradient top bar */}
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-t-3xl" />
                        
                        <div className="flex items-start justify-between mb-6 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                    {guide.icon}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white leading-tight">{guide.title}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Smart Campus — Free Install</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-3 mb-6">
                            {guide.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                                    <span className="text-lg leading-none mt-0.5">{step.icon}</span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{step.text}</p>
                                </div>
                            ))}
                        </div>

                        {/* Current URL to copy */}
                        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">App URL — Open this in Chrome/Edge</p>
                            <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate flex-1 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {window.location.origin}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard?.writeText(window.location.href);
                                    }}
                                    className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-1 shrink-0"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>

                        {/* PWA Requirements notice for IP users */}
                        {window.location.protocol === 'http:' && !window.location.hostname.includes('localhost') && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2">
                                <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                    <strong>Note:</strong> For the one-click install to work automatically, the app needs HTTPS. 
                                    Ask your admin to enable HTTPS, or follow the manual steps above — the app works perfectly either way.
                                </p>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setShowGuide(false)}
                                className="py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors"
                            >
                                Got It
                            </button>
                            {deferredPrompt ? (
                                <button
                                    onClick={handleNativeInstall}
                                    className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                                >
                                    <Download size={16} /> Install Now
                                </button>
                            ) : (
                                <a
                                    href={window.location.href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
                                >
                                    <ExternalLink size={16} /> Open in New Tab
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Banner — shows when browser fires beforeinstallprompt OR after delay for other platforms */}
            {showBanner && !showGuide && (
                <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-[400px] z-[100]">
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl shadow-2xl p-5 relative overflow-hidden">
                        {/* Top gradient accent */}
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500" />
                        {/* Background glow */}
                        <div className="absolute -top-8 -right-8 w-28 h-28 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                                    <Smartphone size={24} />
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white text-base leading-tight">Install Smart Campus</h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Works offline · No app store needed</p>
                                </div>
                            </div>
                            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Feature badges */}
                        <div className="flex gap-2 mb-4 flex-wrap">
                            {['📶 Works Offline', '🔔 Notifications', '⚡ Fast & Native', '📱 Any Device'].map(f => (
                                <span key={f} className="text-[10px] font-bold px-2 py-1 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg border border-gray-100 dark:border-gray-700">
                                    {f}
                                </span>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setShowGuide(true)}
                                className="py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                            >
                                <Info size={15} /> How to Install
                            </button>
                            <button
                                onClick={deferredPrompt ? handleNativeInstall : () => setShowGuide(true)}
                                className="py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                            >
                                <Download size={15} />
                                {deferredPrompt ? 'Install Now' : 'Install App'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// Export a standalone trigger button that can be placed anywhere in the UI (sidebar, settings, etc.)
export function InstallPWATrigger({ compact = false, navStyle = false }: { compact?: boolean; navStyle?: boolean }) {
    const [showGuide, setShowGuide] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstalled, setIsInstalled] = useState(false);
    const platform = detectPlatform();

    useEffect(() => {
        const isStandalone =
            window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;
        if (isStandalone) setIsInstalled(true);

        const handler = (e: any) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handler);
        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleClick = async () => {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            if (outcome === 'accepted') setIsInstalled(true);
            setDeferredPrompt(null);
        } else {
            setShowGuide(true);
        }
    };

    const guide = INSTALL_GUIDES[platform];

    if (isInstalled) {
        return compact ? null : (
            <div className="flex items-center gap-2 px-4 py-2.5 text-green-600 dark:text-green-400 text-sm font-bold">
                <CheckCircle size={16} /> App Installed
            </div>
        );
    }

    return (
        <>
            {showGuide && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md p-6 relative border border-gray-100 dark:border-gray-800">
                        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-blue-500 rounded-t-3xl" />
                        <div className="flex items-start justify-between mb-6 pt-2">
                            <div className="flex items-center gap-3">
                                <div className="w-11 h-11 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                                    {guide.icon}
                                </div>
                                <div>
                                    <h3 className="font-black text-gray-900 dark:text-white leading-tight">{guide.title}</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Smart Campus — Free Install</p>
                                </div>
                            </div>
                            <button onClick={() => setShowGuide(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="space-y-3 mb-6">
                            {guide.steps.map((step, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl">
                                    <span className="text-lg leading-none mt-0.5">{step.icon}</span>
                                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{step.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="mb-4 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl">
                            <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider mb-1.5">App URL</p>
                            <div className="flex items-center gap-2">
                                <code className="text-xs font-mono text-gray-800 dark:text-gray-200 truncate flex-1 bg-white dark:bg-gray-800 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700">
                                    {window.location.origin}
                                </code>
                                <button onClick={() => navigator.clipboard?.writeText(window.location.href)} className="px-2.5 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 transition-colors shrink-0">
                                    Copy
                                </button>
                            </div>
                        </div>
                        {window.location.protocol === 'http:' && !window.location.hostname.includes('localhost') && (
                            <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex items-start gap-2">
                                <Info size={14} className="text-amber-600 mt-0.5 shrink-0" />
                                <p className="text-xs text-amber-700 dark:text-amber-400 font-medium">
                                    <strong>Tip:</strong> The one-click install works best over HTTPS. Ask your admin to enable HTTPS, or follow the steps above.
                                </p>
                            </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowGuide(false)} className="py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl text-sm transition-colors">
                                Close
                            </button>
                            {deferredPrompt ? (
                                <button onClick={handleClick} className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2">
                                    <Download size={16} /> Install Now
                                </button>
                            ) : (
                                <a href={window.location.href} target="_blank" rel="noopener noreferrer" className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2">
                                    <ExternalLink size={16} /> Open Fresh Tab
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {compact ? (
                <button onClick={handleClick} className="flex items-center gap-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 transition-colors">
                    <Download size={15} />
                    Install App
                </button>
            ) : navStyle ? (
                /* Matches NavItem styling exactly — for use inside SidebarGroup */
                <button
                    onClick={handleClick}
                    title="Install App"
                    className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all mb-1 group-[.collapsed]/sidebar:justify-center group-[.collapsed]/sidebar:px-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]"
                >
                    <div className="shrink-0 text-[var(--text-secondary)] group-[.collapsed]/sidebar:translate-x-0">
                        <Download size={18} />
                    </div>
                    <span className="text-sm group-[.collapsed]/sidebar:hidden whitespace-nowrap overflow-hidden transition-all">
                        Install App
                    </span>
                    <span className="ml-auto text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 px-1.5 py-0.5 rounded font-bold group-[.collapsed]/sidebar:hidden">
                        PWA
                    </span>
                </button>
            ) : (
                <button
                    onClick={handleClick}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-800 rounded-xl text-sm font-bold transition-all"
                >
                    <Download size={16} />
                    Install App
                </button>
            )}
        </>
    );
}

