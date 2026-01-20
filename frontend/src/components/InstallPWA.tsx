import { useState, useEffect } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

export default function InstallPWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [showInstall, setShowInstall] = useState(false);

    useEffect(() => {
        const handler = (e: any) => {
            // Prevent the mini-infobar from appearing on mobile
            e.preventDefault();
            // Stash the event so it can be triggered later.
            setDeferredPrompt(e);
            // Update UI notify the user they can install the PWA
            setShowInstall(true);
            console.log("PWA Install Prompt Captured");
        };

        window.addEventListener('beforeinstallprompt', handler);

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setShowInstall(false);
        }

        return () => window.removeEventListener('beforeinstallprompt', handler);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        // Show the install prompt
        deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        setDeferredPrompt(null);
        setShowInstall(false);
    };

    if (!showInstall) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:bottom-8 md:w-96 z-[100] animate-in slide-in-from-bottom-10 fade-in duration-500">
            <div className="glass-card p-5 rounded-2xl shadow-2xl border-2 border-blue-500/20 md:border-blue-500/10 backdrop-blur-xl flex flex-col gap-4 relative overflow-hidden">
                {/* Background Decoration */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl"></div>

                <div className="flex justify-between items-start z-10">
                    <div className="flex gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shrink-0">
                            <Smartphone size={28} />
                        </div>
                        <div>
                            <h3 className="font-bold text-lg leading-tight text-gray-900 dark:text-gray-100">Install App</h3>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Get the native mobile experience for smoother attendance.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowInstall(false)}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <button
                    onClick={handleInstallClick}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20 active:scale-[0.98] z-10"
                >
                    <Download size={18} />
                    Add to Home Screen
                </button>
            </div>
        </div>
    );
}
