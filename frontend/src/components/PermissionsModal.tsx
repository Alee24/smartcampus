import { useState, useEffect } from 'react'
import { Camera, MapPin, Bell, Check, Shield, ArrowRight } from 'lucide-react'

export default function PermissionsModal() {
    const [permissions, setPermissions] = useState({
        camera: false,
        location: false,
        notifications: false
    })
    const [isOpen, setIsOpen] = useState(false)
    const [isChecking, setIsChecking] = useState(true)
    const [isRequesting, setIsRequesting] = useState(false)

    useEffect(() => {
        checkPermissions()

        const openHandler = () => {
            localStorage.removeItem('permissions_ignored')
            setIsOpen(true)
            setIsChecking(true)
            checkPermissions()
        }
        window.addEventListener('open-permissions-modal', openHandler)
        return () => window.removeEventListener('open-permissions-modal', openHandler)
    }, [])

    const checkPermissions = async () => {
        setIsChecking(true)
        const newState = {
            camera: false,
            location: false,
            notifications: false
        }

        // Check Notifications
        if ('Notification' in window) {
            newState.notifications = Notification.permission === 'granted'
        }

        // Check Camera
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const hasLabels = devices.some(d => d.kind === 'videoinput' && d.label !== '')
            newState.camera = hasLabels
        } catch (e) {
            newState.camera = false
        }

        // Check Location
        try {
            const locStatus = await navigator.permissions.query({ name: 'geolocation' })
            newState.location = locStatus.state === 'granted'
        } catch (e) {
            newState.location = false // Firefox might fail query
        }

        setPermissions(newState)

        // Check if all are granted (Notifications are optional for blocking)
        const allGranted = newState.camera && newState.location
        // We still track notifications in state, but don't block entry on them

        // Open if any important one is missing (and not ignored)
        const ignored = localStorage.getItem('permissions_ignored')

        if (!allGranted) {
            // Only auto-open if not previously ignored
            if (!ignored) setIsOpen(true)
        } else {
            // Auto-close if all granted (Success!)
            setIsOpen(false)
        }

        setIsChecking(false)
    }

    const requestAll = async () => {
        setIsRequesting(true)

        // 1. Notifications
        try {
            if ('Notification' in window && Notification.permission !== 'granted' && Notification.permission !== 'denied') {
                await Notification.requestPermission()
            }
        } catch (e) { console.warn("Notification error", e) }

        // 2. Location
        try {
            await new Promise((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject)
            })
        } catch (e) { console.warn("Location denied") }

        // 3. Camera
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true })
            stream.getTracks().forEach(t => t.stop()) // Close immediately
        } catch (e) { console.warn("Camera denied") }

        // Re-check
        await checkPermissions()
        setIsRequesting(false)
    }

    const handleDismiss = () => {
        localStorage.setItem('permissions_ignored', 'true')
        setIsOpen(false)
    }

    if (!isOpen || isChecking) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
                {/* Visual Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm mx-auto md:mx-0">
                        <Shield size={32} />
                    </div>

                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center md:text-left">Enable Permissions</h3>
                    <p className="text-[var(--text-secondary)] mb-8 text-center md:text-left">
                        To get the full Smart Campus experience, please enable the following permissions.
                    </p>

                    <div className="space-y-4 mb-8">
                        {/* Camera */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${permissions.camera ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <Camera size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Camera Access</p>
                                    <p className="text-xs text-[var(--text-secondary)]">For QR scanning & gate entry</p>
                                </div>
                            </div>
                            {permissions.camera ? <Check className="text-green-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                        </div>

                        {/* Location */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${permissions.location ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Location</p>
                                    <p className="text-xs text-[var(--text-secondary)]">For campus geofencing</p>
                                </div>
                            </div>
                            {permissions.location ? <Check className="text-green-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                        </div>

                        {/* Notifications */}
                        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${permissions.notifications ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <Bell size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Notifications</p>
                                    <p className="text-xs text-[var(--text-secondary)]">Security alerts & updates</p>
                                </div>
                            </div>
                            {permissions.notifications ? <Check className="text-green-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={requestAll}
                            disabled={isRequesting}
                            className="w-full py-4 bg-[image:var(--gradient-primary)] text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isRequesting ? "Please allow in prompts..." : "Allow All Access"}
                            {!isRequesting && <ArrowRight size={18} />}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2"
                        >
                            Maybe Later
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
