import { useState, useEffect } from 'react'
import { Camera, MapPin, Check, Shield, ArrowRight, RefreshCw, XCircle, AlertTriangle, Loader2 } from 'lucide-react'

type PermState = 'prompt' | 'granted' | 'denied' | 'requesting'

export default function PermissionsModal() {
    const [cameraStatus, setCameraStatus] = useState<PermState>('prompt')
    const [locationStatus, setLocationStatus] = useState<PermState>('prompt')
    const [isOpen, setIsOpen] = useState(false)
    const [isChecking, setIsChecking] = useState(true)
    const [showUnblockHelp, setShowUnblockHelp] = useState<'camera' | 'location' | null>(null)

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
        try {
            // --- Camera Check ---
            try {
                const camPerm = await navigator.permissions.query({ name: 'camera' as PermissionName })
                setCameraStatus(camPerm.state as PermState)
                camPerm.onchange = () => setCameraStatus(camPerm.state as PermState)
            } catch {
                // Fallback: check via device labels
                try {
                    const devices = await navigator.mediaDevices.enumerateDevices()
                    const hasLabels = devices.some(d => d.kind === 'videoinput' && d.label !== '')
                    setCameraStatus(hasLabels ? 'granted' : 'prompt')
                } catch {
                    setCameraStatus('prompt')
                }
            }

            // --- Location Check ---
            try {
                const locPerm = await navigator.permissions.query({ name: 'geolocation' })
                setLocationStatus(locPerm.state as PermState)
                locPerm.onchange = () => setLocationStatus(locPerm.state as PermState)
            } catch {
                setLocationStatus('prompt')
            }
        } finally {
            setIsChecking(false)
        }
    }

    // Re-open modal check after checking
    useEffect(() => {
        if (!isChecking) {
            const allGranted = cameraStatus === 'granted' && locationStatus === 'granted'
            const ignored = localStorage.getItem('permissions_ignored')
            if (!allGranted && !ignored) setIsOpen(true)
            else if (allGranted) setIsOpen(false)
        }
    }, [isChecking, cameraStatus, locationStatus])

    const requestCamera = async () => {
        setCameraStatus('requesting')
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
            stream.getTracks().forEach(t => t.stop())
            setCameraStatus('granted')
        } catch (e: any) {
            console.warn('Camera error:', e.name, e.message)
            if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
                setCameraStatus('denied')
                setShowUnblockHelp('camera')
            } else if (e.name === 'NotFoundError') {
                // No camera device — treat as granted for non-camera devices
                setCameraStatus('granted')
            } else {
                setCameraStatus('prompt')
            }
        }
    }

    const requestLocation = async () => {
        setLocationStatus('requesting')
        try {
            await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
            })
            setLocationStatus('granted')
        } catch (e: any) {
            if (e.code === 1) {
                setLocationStatus('denied')
                setShowUnblockHelp('location')
            } else {
                // Timeout or other error — allow continue
                setLocationStatus('prompt')
            }
        }
    }

    const requestAll = async () => {
        setShowUnblockHelp(null)
        if (cameraStatus !== 'granted') await requestCamera()
        if (locationStatus !== 'granted') await requestLocation()
    }

    const handleDismiss = () => {
        localStorage.setItem('permissions_ignored', 'true')
        setIsOpen(false)
    }

    if (!isOpen || isChecking) return null

    const isRequesting = cameraStatus === 'requesting' || locationStatus === 'requesting'

    const statusIcon = (status: PermState) => {
        if (status === 'granted') return <Check className="text-green-500" size={20} />
        if (status === 'denied') return <XCircle className="text-red-500" size={20} />
        if (status === 'requesting') return <Loader2 className="animate-spin text-blue-500" size={20} />
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
    }

    const statusBg = (status: PermState) => {
        if (status === 'granted') return 'bg-green-50 border-green-200 dark:bg-green-900/10 dark:border-green-800'
        if (status === 'denied') return 'bg-red-50 border-red-200 dark:bg-red-900/10 dark:border-red-800'
        if (status === 'requesting') return 'bg-blue-50 border-blue-200 dark:bg-blue-900/10'
        return 'bg-[var(--bg-primary)] border-[var(--border-color)]'
    }

    const iconBg = (status: PermState) => {
        if (status === 'granted') return 'bg-green-100 text-green-700 dark:bg-green-900/30'
        if (status === 'denied') return 'bg-red-100 text-red-600 dark:bg-red-900/30'
        if (status === 'requesting') return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
        return 'bg-gray-100 text-gray-500 dark:bg-gray-800'
    }

    const isSecure = window.isSecureContext
    const allGranted = cameraStatus === 'granted' && locationStatus === 'granted'

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 md:p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">

                {/* Decorative */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                <div className="relative z-10">
                    {/* Header */}
                    <div className="w-14 h-14 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl flex items-center justify-center mb-5 shadow-sm mx-auto md:mx-0">
                        <Shield size={28} />
                    </div>
                    <h3 className="text-2xl font-bold text-[var(--text-primary)] mb-1 text-center md:text-left">
                        Permissions Required
                    </h3>
                    <p className="text-[var(--text-secondary)] mb-6 text-center md:text-left text-sm">
                        We need access to your camera and location for security checks.
                    </p>

                    {/* HTTP Warning */}
                    {!isSecure && (
                        <div className="mb-4 flex items-start gap-3 bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-300">
                            <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                            <span>
                                <strong>HTTP detected.</strong> Camera access requires HTTPS. Use <code>https://</code> or access via <code>localhost</code> for full functionality.
                            </span>
                        </div>
                    )}

                    {/* Permission Items */}
                    <div className="space-y-3 mb-6">
                        {/* Camera */}
                        <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${statusBg(cameraStatus)}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${iconBg(cameraStatus)}`}>
                                    <Camera size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)] text-sm">Camera Access</p>
                                    <p className="text-xs">
                                        {cameraStatus === 'denied'
                                            ? <span className="text-red-500 font-semibold">Blocked — click to unblock</span>
                                            : cameraStatus === 'granted'
                                            ? <span className="text-green-600 font-semibold">Granted ✓</span>
                                            : cameraStatus === 'requesting'
                                            ? <span className="text-blue-500">Requesting...</span>
                                            : <span className="text-[var(--text-secondary)]">For QR scanning</span>
                                        }
                                    </p>
                                </div>
                            </div>
                            {statusIcon(cameraStatus)}
                        </div>

                        {/* Location */}
                        <div className={`flex items-center justify-between p-4 rounded-xl border transition-all ${statusBg(locationStatus)}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${iconBg(locationStatus)}`}>
                                    <MapPin size={18} />
                                </div>
                                <div>
                                    <p className="font-bold text-[var(--text-primary)] text-sm">Location Access</p>
                                    <p className="text-xs">
                                        {locationStatus === 'denied'
                                            ? <span className="text-red-500 font-semibold">Blocked — click to unblock</span>
                                            : locationStatus === 'granted'
                                            ? <span className="text-green-600 font-semibold">Granted ✓</span>
                                            : locationStatus === 'requesting'
                                            ? <span className="text-blue-500">Requesting...</span>
                                            : <span className="text-[var(--text-secondary)]">For geofencing</span>
                                        }
                                    </p>
                                </div>
                            </div>
                            {statusIcon(locationStatus)}
                        </div>
                    </div>

                    {/* Unblock Instructions */}
                    {showUnblockHelp && (
                        <div className="mb-5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertTriangle size={16} className="text-amber-600 shrink-0" />
                                <p className="text-sm font-bold text-amber-800 dark:text-amber-300">
                                    {showUnblockHelp === 'camera' ? 'Camera' : 'Location'} Blocked
                                </p>
                            </div>
                            <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                                Your browser has blocked this permission. To unblock:
                            </p>
                            <ol className="text-xs text-amber-700 dark:text-amber-400 space-y-1 list-decimal ml-4">
                                <li>Click the <strong>🔒 lock icon</strong> in your browser's address bar</li>
                                <li>Find <strong>{showUnblockHelp === 'camera' ? 'Camera' : 'Location'}</strong> and set it to <strong>Allow</strong></li>
                                <li>Click the <strong>Reload</strong> button below</li>
                            </ol>
                            <button
                                onClick={() => window.location.reload()}
                                className="mt-3 w-full py-2 bg-amber-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-amber-700 transition-colors"
                            >
                                <RefreshCw size={14} /> Reload Page After Unblocking
                            </button>
                        </div>
                    )}

                    {/* Buttons */}
                    <div className="flex flex-col gap-3">
                        {!allGranted && (
                            <button
                                id="allow-access-btn"
                                onClick={requestAll}
                                disabled={isRequesting}
                                className="w-full py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-wait"
                            >
                                {isRequesting
                                    ? <><Loader2 size={18} className="animate-spin" /> Requesting access...</>
                                    : <><span>Allow Access</span><ArrowRight size={18} /></>
                                }
                            </button>
                        )}
                        {allGranted && (
                            <button
                                onClick={() => setIsOpen(false)}
                                className="w-full py-4 bg-green-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2"
                            >
                                <Check size={18} /> All Permissions Granted — Continue
                            </button>
                        )}
                        <button
                            id="continue-to-dashboard-btn"
                            onClick={handleDismiss}
                            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] py-2 underline transition-colors"
                        >
                            Continue to Dashboard without permissions
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
