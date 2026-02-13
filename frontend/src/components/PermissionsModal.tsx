import { useState, useEffect } from 'react'
import { Camera, MapPin, Bell, Check, Shield, ArrowRight, Lock, RefreshCw, XCircle } from 'lucide-react'

export default function PermissionsModal() {
    // Disabled - permissions popup not working properly
    return null;

    const [permissions, setPermissions] = useState({
        camera: false,
        location: false,
        notifications: false
    })
    const [permissionStatus, setPermissionStatus] = useState({
        camera: 'prompt', // prompt, granted, denied
        location: 'prompt',
        notifications: 'prompt'
    })
    const [isOpen, setIsOpen] = useState(false)
    const [isChecking, setIsChecking] = useState(true)
    const [isRequesting, setIsRequesting] = useState(false)
    const [errorMsg, setErrorMsg] = useState<{ title: string, desc: string } | null>(null)

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
        const newPerms = { camera: false, location: false, notifications: false }
        const newStatus = { camera: 'prompt', location: 'prompt', notifications: 'prompt' }

        // Check Notifications
        if ('Notification' in window) {
            newStatus.notifications = Notification.permission
            newPerms.notifications = Notification.permission === 'granted'
        }

        // Check Location
        try {
            const loc = await navigator.permissions.query({ name: 'geolocation' })
            newStatus.location = loc.state
            newPerms.location = loc.state === 'granted'
            loc.onchange = () => checkPermissions()
        } catch (e) {
            // Firefox or unsupported
        }

        // Check Camera (Rough check via devices)
        try {
            const devices = await navigator.mediaDevices.enumerateDevices()
            const hasLabels = devices.some(d => d.kind === 'videoinput' && d.label !== '')
            newPerms.camera = hasLabels
            newStatus.camera = hasLabels ? 'granted' : 'prompt'
            // We can't easily detect 'denied' for camera without trying to open it
        } catch (e) { }

        setPermissions(newPerms)
        setPermissionStatus(newStatus)

        const allGranted = newPerms.camera && newPerms.location
        const ignored = localStorage.getItem('permissions_ignored')

        if (!allGranted) {
            if (!ignored) setIsOpen(true)
        } else {
            setIsOpen(false)
        }

        setIsChecking(false)
    }

    const requestAll = async () => {
        setIsRequesting(true)
        setErrorMsg(null)

        try {
            // 1. Camera
            if (!permissions.camera) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                    setTimeout(() => stream.getTracks().forEach(t => t.stop()), 100)
                    setPermissions(prev => ({ ...prev, camera: true }))
                    setPermissionStatus(prev => ({ ...prev, camera: 'granted' }))
                } catch (e: any) {
                    console.warn("Camera denied:", e)
                    if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                        setPermissionStatus(prev => ({ ...prev, camera: 'denied' }))
                        // Don't block, just mark as denied
                    }
                }
            }

            // 2. Location
            if (!permissions.location) {
                try {
                    await new Promise((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(
                            () => {
                                setPermissions(prev => ({ ...prev, location: true }))
                                setPermissionStatus(prev => ({ ...prev, location: 'granted' }))
                                resolve(true)
                            },
                            (err) => reject(err),
                            { timeout: 8000 }
                        )
                    })
                } catch (e: any) {
                    if (e.code === 1) { // PERMISSION_DENIED
                        setPermissionStatus(prev => ({ ...prev, location: 'denied' }))
                        // Don't block, just mark as denied
                    }
                }
            }

            // 3. Notifications
            if ('Notification' in window && Notification.permission === 'default') {
                await Notification.requestPermission()
            }

        } catch (error) {
            console.error("Chain error", error)
        } finally {
            await checkPermissions()
            setIsRequesting(false)
        }
    }

    const handleDismiss = () => {
        localStorage.setItem('permissions_ignored', 'true')
        setIsOpen(false)
    }

    if (!isOpen || isChecking) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">

                {/* Error Overlay */}
                {errorMsg && (
                    <div className="absolute inset-0 z-20 bg-[var(--bg-surface)] p-8 flex flex-col items-center justify-center text-center animate-in slide-in-from-bottom">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mb-4">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-red-600 mb-2">{errorMsg.title}</h3>
                        <p className="text-[var(--text-secondary)] mb-8">{errorMsg.desc}</p>

                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-800"
                        >
                            <RefreshCw size={18} />
                            Reload Page
                        </button>
                        <button
                            onClick={() => setErrorMsg(null)}
                            className="mt-4 text-sm text-[var(--text-secondary)] hover:underline"
                        >
                            Back
                        </button>
                    </div>
                )}

                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>

                <div className="relative z-10">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-sm mx-auto md:mx-0">
                        <Shield size={32} />
                    </div>

                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-2 text-center md:text-left">Permissions Required</h3>
                    <p className="text-[var(--text-secondary)] mb-8 text-center md:text-left">
                        We need access to your camera and location for security checks.
                    </p>

                    <div className="space-y-4 mb-8">
                        {/* Camera */}
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${permissionStatus.camera === 'denied' ? 'bg-red-50 border-red-200 dark:bg-red-900/10' : 'bg-[var(--bg-primary)] border-[var(--border-color)]'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${permissions.camera ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <Camera size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Camera Access</p>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {permissionStatus.camera === 'denied' ? <span className="text-red-500 font-bold">Blocked by browser</span> : "For QR scanning"}
                                    </p>
                                </div>
                            </div>
                            {permissions.camera ? <Check className="text-green-500" size={20} /> : permissionStatus.camera === 'denied' ? <XCircle className="text-red-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                        </div>

                        {/* Location */}
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${permissionStatus.location === 'denied' ? 'bg-red-50 border-red-200 dark:bg-red-900/10' : 'bg-[var(--bg-primary)] border-[var(--border-color)]'}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${permissions.location ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                    <MapPin size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)]">Location</p>
                                    <p className="text-xs text-[var(--text-secondary)]">
                                        {permissionStatus.location === 'denied' ? <span className="text-red-500 font-bold">Blocked by browser</span> : "For geofencing"}
                                    </p>
                                </div>
                            </div>
                            {permissions.location ? <Check className="text-green-500" size={20} /> : permissionStatus.location === 'denied' ? <XCircle className="text-red-500" size={20} /> : <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={requestAll}
                            disabled={isRequesting}
                            className="w-full py-4 bg-[image:var(--gradient-primary)] text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                        >
                            {isRequesting ? "Requesting access..." : "Allow Access"}
                            {!isRequesting && <ArrowRight size={18} />}
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 underline"
                        >
                            Continue to Dashboard
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
