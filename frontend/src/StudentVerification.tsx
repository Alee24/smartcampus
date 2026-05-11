import { useState, useEffect, useRef } from 'react'
import { useNotification } from './components/Notification'
import { Search, CheckCircle, XCircle, Shield, Calendar, User, Building, Sparkles, UploadCloud, Loader2, Camera, QrCode, LogIn, LogOut, RefreshCcw, Printer, AlertTriangle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'

export default function StudentVerification() {
    const { showNotification } = useNotification()
    const [query, setQuery] = useState('')
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [showCard, setShowCard] = useState(false)
    const [companySettings, setCompanySettings] = useState<any>({
        company_name: 'Riara University',
        logo_url: ''
    })
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [statusUpdating, setStatusUpdating] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [actionLoading, setActionLoading] = useState<'check-in' | 'check-out' | null>(null)
    const [pinModal, setPinModal] = useState<{show: boolean, pin: string, file: File | null}>({
        show: false,
        pin: '',
        file: null
    })
    const [isFlipped, setIsFlipped] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({ full_name: '', school: '' })
    const [saveLoading, setSaveLoading] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const qrScannerRef = useRef<Html5Qrcode | null>(null)

    // Fetch current user and company settings on mount
    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token')
            if (token) {
                try {
                    const res = await fetch('/api/users/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setCurrentUser(data)
                    }
                } catch (e) {
                    console.error('Failed to fetch user', e)
                }
            }
        }

        const fetchCompanySettings = async () => {
            try {
                const res = await fetch('/api/users/public-company-settings')
                if (res.ok) {
                    const data = await res.json()
                    setCompanySettings({
                        company_name: data.company_name,
                        logo_url: data.logo_url
                    })
                }
            } catch (e) {
                console.error(e)
            }
        }
        const requestCameraPermission = async () => {
            try {
                await navigator.mediaDevices.getUserMedia({ video: true })
                console.log('Camera permission granted')
            } catch (err) {
                console.warn('Camera permission denied or not available', err)
            }
        }

        fetchUserData()
        fetchCompanySettings()
        requestCameraPermission()
    }, [])

    // Success sound effect
    const playSuccessSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

        // Create a pleasant "ding" sound
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // First note (higher pitch)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1)

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)

        // Second note (confirmation)
        setTimeout(() => {
            const osc2 = audioContext.createOscillator()
            const gain2 = audioContext.createGain()

            osc2.connect(gain2)
            gain2.connect(audioContext.destination)

            osc2.frequency.setValueAtTime(1000, audioContext.currentTime)
            gain2.gain.setValueAtTime(0.2, audioContext.currentTime)
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

            osc2.start(audioContext.currentTime)
            osc2.stop(audioContext.currentTime + 0.3)
        }, 100)
    }

    const handleGateAction = async (action: 'check-in' | 'check-out') => {
        if (!result || !result.admission_number) return
        setActionLoading(action)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/gate/${action}/${result.admission_number}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                playSuccessSound()
                showNotification(`${action === 'check-in' ? 'Check-in' : 'Check-out'} recorded at ${data.time}`, 'success')
                // Refresh data to show updated last accessed if needed
                handleVerify()
            } else {
                const err = await res.json()
                showNotification(err.detail || `Failed to ${action}`, 'error')
            }
        } catch (e) {
            showNotification(`Network error during ${action}`, 'error')
        } finally {
            setActionLoading(null)
        }
    }

    const handleVerify = async () => {
        if (!query.trim()) return

        setLoading(true)
        setShowCard(false)
        setResult(null) // Clear previous results

        try {
            // Public endpoint - no authentication required
            const res = await fetch(`/api/users/verify/${encodeURIComponent(query)}`)

            console.log('Response status:', res.status)

            if (res.ok) {
                const data = await res.json()
                console.log('Verification data:', data)
                setResult(data)

                // Trigger animations and sound
                setTimeout(() => {
                    setShowCard(true)
                    setEditData({ full_name: data.full_name, school: data.school })
                    playSuccessSound()
                }, 300)
            } else {
                const errorText = await res.text()
                console.error('Error response:', errorText)
                setResult({ error: 'Student not found' })
            }
        } catch (e) {
            console.error('Verification error:', e)
            setResult({ error: 'Verification failed. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const handleStatusUpdate = async (newStatus: string) => {
        if (!result || !currentUser || !['SuperAdmin', 'Security'].includes(currentUser.role)) return
        
        setStatusUpdating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${result.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({ status: newStatus })
            })

            if (res.ok) {
                setResult({ ...result, status: newStatus })
            } else {
                const data = await res.json()
                alert(data.detail || 'Failed to update status')
            }
        } catch (e) {
            console.error(e)
            alert('Network error updating status')
        } finally {
            setStatusUpdating(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleVerify()
        }
    }

    const handleSaveEdits = async () => {
        if (!result || !currentUser || !['SuperAdmin', 'Security'].includes(currentUser.role)) return
        
        setSaveLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${result.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(editData)
            })

            if (res.ok) {
                setResult({ ...result, ...editData })
                setIsEditing(false)
                alert('Details updated successfully')
            } else {
                const data = await res.json()
                alert(data.detail || 'Failed to update details')
            }
        } catch (e) {
            console.error(e)
            alert('Network error updating details')
        } finally {
            setSaveLoading(false)
        }
    }

    const handleImageUpload = (file: File) => {
        if (!result || !currentUser || !['SuperAdmin', 'Security'].includes(currentUser.role)) return
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        setRotation(0)
        setPinModal({ show: true, pin: '', file })
    }

    const rotateImage = () => {
        setRotation((prev) => (prev + 90) % 360)
    }

    const getRotatedBlob = async (file: File, deg: number): Promise<Blob> => {
        if (deg === 0) return file
        
        return new Promise((resolve) => {
            const img = new Image()
            img.onload = () => {
                const canvas = document.createElement('canvas')
                const ctx = canvas.getContext('2d')!
                
                if (deg === 90 || deg === 270) {
                    canvas.width = img.height
                    canvas.height = img.width
                } else {
                    canvas.width = img.width
                    canvas.height = img.height
                }
                
                ctx.translate(canvas.width / 2, canvas.height / 2)
                ctx.rotate((deg * Math.PI) / 180)
                ctx.drawImage(img, -img.width / 2, -img.height / 2)
                
                canvas.toBlob((blob) => resolve(blob!), file.type)
            }
            img.src = URL.createObjectURL(file)
        })
    }

    const submitSecureImageUpdate = async () => {
        if (!pinModal.file || !result) return
        
        setUploadingImage(true)
        try {
            const finalBlob = await getRotatedBlob(pinModal.file, rotation)
            const formData = new FormData()
            formData.append('file', finalBlob, pinModal.file.name)
            formData.append('user_id', result.id)
            formData.append('supervisor_pin', pinModal.pin)

            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/secure-profile-image-update', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                setResult({ ...result, profile_image: data.image_url })
                setPinModal({ show: false, pin: '', file: null })
                setPreviewUrl(null)
                showNotification('Profile picture updated and logged successfully', 'success')
            } else {
                const data = await res.json()
                showNotification(data.detail || 'Invalid Supervisor PIN or failed to upload', 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Network error updating image', 'error')
        } finally {
            setUploadingImage(false)
        }
    }

    const startScanner = async () => {
        setIsScanning(true)
        // Short delay to ensure the container is in the DOM
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader")
                qrScannerRef.current = scanner
                
                await scanner.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                    },
                    (decodedText) => {
                        setQuery(decodedText)
                        stopScanner()
                        // Auto-verify after scan
                        setTimeout(() => {
                            const btn = document.getElementById('verify-btn')
                            btn?.click()
                        }, 500)
                    },
                    () => {
                        // Silent error for no QR code found in frame
                    }
                )
            } catch (err) {
                console.error("Scanner start error:", err)
                showNotification("Could not start camera. Please ensure you have given permission.", "warning")
                setIsScanning(false)
            }
        }, 300)
    }

    const stopScanner = async () => {
        if (qrScannerRef.current) {
            try {
                await qrScannerRef.current.stop()
                qrScannerRef.current = null
            } catch (err) {
                console.error("Scanner stop error:", err)
            }
        }
        setIsScanning(false)
    }

    // Cleanup scanner on unmount
    useEffect(() => {
        return () => {
            if (qrScannerRef.current) {
                qrScannerRef.current.stop().catch(console.error)
            }
        }
    }, [])

    const statusOptions = ['Active', 'Graduated', 'Suspended', 'Registered', 'Deferred']
    const isStaff = currentUser && ['SuperAdmin', 'Security', 'Lecturer'].includes(currentUser.role)
    const canEdit = currentUser && ['SuperAdmin', 'Security'].includes(currentUser.role)

    return (
        <div className="p-3 md:p-6 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20"></div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-purple-400/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 10}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-6 animate-fade-in">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Shield className="text-purple-600" size={32} />
                        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            ID Verification
                        </h1>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Enter Admission Number or Email to verify student
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-2 flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter Admission Number or Email..."
                                    className="w-full pl-12 pr-4 py-4 bg-transparent text-lg font-medium focus:outline-none"
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    id="verify-btn"
                                    onClick={handleVerify}
                                    disabled={loading || !query.trim()}
                                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed min-w-[120px]"
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto"></div>
                                    ) : (
                                        'Verify'
                                    )}
                                </button>
                                <button
                                    onClick={startScanner}
                                    className="px-4 py-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
                                    title="Scan QR Code"
                                >
                                    <QrCode size={24} />
                                    <span className="hidden sm:inline">Scan</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* QR Scanner Modal */}
                {isScanning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md shadow-2xl relative">
                            <button 
                                onClick={stopScanner}
                                className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full shadow-lg hover:bg-red-600 transition-colors"
                            >
                                <XCircle size={24} />
                            </button>
                            
                            <div className="text-center mb-6">
                                <h3 className="text-2xl font-bold mb-1">Scan Student QR</h3>
                                <p className="text-gray-500 text-sm">Position the QR code within the frame</p>
                            </div>

                            <div className="relative overflow-hidden rounded-2xl bg-black aspect-square border-4 border-purple-500/30">
                                <div id="qr-reader" className="w-full h-full"></div>
                                
                                {/* Scanning Overlay */}
                                <div className="absolute inset-0 pointer-events-none">
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/50 rounded-xl">
                                        <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-purple-500 rounded-tl-lg"></div>
                                        <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-purple-500 rounded-tr-lg"></div>
                                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-purple-500 rounded-bl-lg"></div>
                                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-purple-500 rounded-br-lg"></div>
                                        
                                        <div className="absolute top-0 left-0 w-full h-1 bg-purple-500/50 animate-scan-line shadow-[0_0_15px_rgba(168,85,247,0.5)]"></div>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={stopScanner}
                                className="w-full mt-6 py-4 bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 font-bold rounded-xl hover:bg-slate-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}

                {/* 3D ID Card */}
                {result && !result.error && (
                    <div className={`perspective-1000 ${showCard ? 'animate-card-flip' : 'opacity-0'}`}>
                        {/* Action Bar Above Card */}
                        <div className="max-w-4xl mx-auto mb-6 flex flex-wrap gap-4 items-center justify-between animate-fade-in delay-200">
                            <div className="flex gap-3 flex-1">
                                {result.gate_status === 'In' ? (
                                    <button 
                                        onClick={() => handleGateAction('check-out')}
                                        disabled={!!actionLoading}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-3 py-4 px-8 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black shadow-lg shadow-red-500/20 transition-all active:scale-95 disabled:opacity-50 text-lg"
                                    >
                                        {actionLoading === 'check-out' ? <Loader2 className="animate-spin" size={24} /> : <LogOut size={24} />}
                                        CHECK OUT
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleGateAction('check-in')}
                                        disabled={!!actionLoading}
                                        className="flex-1 md:flex-none flex items-center justify-center gap-3 py-4 px-8 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-black shadow-lg shadow-green-500/20 transition-all active:scale-95 disabled:opacity-50 text-lg"
                                    >
                                        {actionLoading === 'check-in' ? <Loader2 className="animate-spin" size={24} /> : <LogIn size={24} />}
                                        CHECK IN
                                    </button>
                                )}
                                
                                <button 
                                    onClick={() => showNotification('Printing student ID...', 'info')}
                                    className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-200 transition-all"
                                >
                                    <Printer size={20} />
                                    <span className="hidden sm:inline">Print ID</span>
                                </button>

                                <button 
                                    onClick={() => setIsFlipped(!isFlipped)}
                                    className="flex items-center justify-center gap-2 py-4 px-6 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-500/20 hover:bg-purple-700 transition-all"
                                >
                                    <RefreshCcw size={20} />
                                    <span>Flip Card</span>
                                </button>
                            </div>

                            <div className="flex gap-3">
                                {canEdit && !isEditing && (
                                    <button 
                                        onClick={() => setIsEditing(true)}
                                        className="flex items-center justify-center gap-2 py-4 px-6 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl font-bold border border-purple-200 dark:border-purple-800 transition-all hover:bg-purple-200"
                                    >
                                        <RefreshCcw size={20} />
                                        <span className="hidden sm:inline">Edit Details</span>
                                    </button>
                                )}
                                <button 
                                    onClick={() => showNotification('Report filed for supervisor review', 'warning')}
                                    className="flex items-center justify-center gap-2 py-4 px-6 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 rounded-2xl font-bold border border-orange-200 dark:border-orange-900/30 hover:bg-orange-100 transition-all"
                                >
                                    <AlertTriangle size={20} />
                                    <span className="hidden sm:inline">Report</span>
                                </button>
                            </div>
                        </div>

                        <div className="max-w-4xl mx-auto transform-gpu hover:scale-[1.02] transition-transform duration-500">
                            {/* Card Container with 3D effect */}
                            <div className="relative">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur-2xl opacity-50 animate-pulse"></div>

                                {/* Main Card - Horizontal Neck Tag Style */}
                                <div className="relative bg-gradient-to-br from-white via-purple-50 to-pink-50 dark:from-gray-800 dark:via-purple-900/30 dark:to-pink-900/30 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/50 backdrop-blur-xl max-w-4xl mx-auto">
                                    {/* Card Header - Compact */}
                                    <div className="relative h-20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 overflow-hidden">
                                        {/* Animated Background Pattern */}
                                        <div className="absolute inset-0 opacity-20">
                                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] animate-slide"></div>
                                        </div>

                                        {/* University Logo & Name - Compact */}
                                        <div className="relative h-full flex items-center justify-between px-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-14 h-14 bg-white rounded-xl p-1 shadow-inner flex items-center justify-center overflow-hidden">
                                                    <img
                                                        src={companySettings.logo_url || "/logo.png"}
                                                        alt="University Logo"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="text-white">
                                                    <h2 className="text-xl font-black tracking-tight leading-none">{companySettings.company_name?.toUpperCase() || 'UNIVERSITY'}</h2>
                                                    <p className="text-purple-100 font-bold text-[10px] mt-0.5 tracking-widest">OFFICIAL STUDENT ID CARD</p>
                                                </div>
                                            </div>

                                            {/* Verified Badge - Compact */}
                                            <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30">
                                                <div className="flex items-center gap-1">
                                                    <CheckCircle className="text-green-300" size={16} />
                                                    <span className="text-white font-bold text-sm">VERIFIED</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Content with 3D Flip */}
                                    <div 
                                        className={`relative transition-all duration-700 preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        {/* Front Side */}
                                        <div className="backface-hidden w-full h-full">
                                            <div className="p-6">
                                                <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
                                                    {/* Left: Large Photo */}
                                                    <div className="flex-shrink-0">
                                                        <div className="relative group">
                                                            {/* Photo Glow */}
                                                            <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>

                                                    {/* Photo Frame - Large */}
                                                    <div className="relative w-72 h-80 rounded-3xl overflow-hidden border-4 border-white shadow-2xl transform group-hover:scale-105 transition-transform bg-slate-200">
                                                        {result.profile_image ? (
                                                            <img
                                                                src={result.profile_image.startsWith('http') ? result.profile_image : result.profile_image}
                                                                alt={result.full_name}
                                                                className="w-full h-full object-cover"
                                                                onError={(e: any) => {
                                                                    // Fallback if image fails
                                                                    e.target.src = "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                                                                }}
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex flex-col items-center justify-center p-4">
                                                                <User size={100} className="text-white opacity-50" />
                                                            </div>
                                                        )}
                                                        
                                                            {uploadingImage && (
                                                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                                                    <Loader2 className="text-white animate-spin" size={48} />
                                                                </div>
                                                            )}

                                                            {/* Upload Button ONTO the image */}
                                                            {canEdit && (
                                                                <label className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md text-white py-4 font-black cursor-pointer hover:bg-black/60 transition-all flex items-center justify-center gap-3 group/btn border-t border-white/20">
                                                                    <div className="bg-white/20 p-2 rounded-full group-hover/btn:scale-110 transition-transform">
                                                                        <Camera size={20} />
                                                                    </div>
                                                                    <span className="tracking-widest text-xs uppercase">{result.profile_image ? "Update Photo" : "Upload Photo"}</span>
                                                                    <input 
                                                                        type="file" 
                                                                        accept="image/*" 
                                                                        className="hidden" 
                                                                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} 
                                                                    />
                                                                </label>
                                                            )}
                                                        </div>



                                                    </div>
                                                </div>

                                                {/* Right: Details Section */}
                                            <div className="flex-1 space-y-4 w-full">
                                                {/* Name & ID */}
                                                <div>
                                                    {isEditing ? (
                                                        <input 
                                                            type="text"
                                                            value={editData.full_name}
                                                            onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                                            className="text-3xl md:text-4xl font-black bg-white/50 dark:bg-gray-800/50 rounded-lg px-2 py-1 w-full border border-purple-300 focus:outline-none"
                                                        />
                                                    ) : (
                                                        <h3 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-1 break-words">
                                                            {result.full_name}
                                                        </h3>
                                                    )}
                                                    <p className="text-xl md:text-2xl font-bold text-purple-600">
                                                        {result.admission_number}
                                                    </p>
                                                </div>

                                                {/* Info Grid - Compact */}
                                                <div className="grid grid-cols-1 gap-3">
                                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-700 relative">
                                                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                                                            <Building size={18} />
                                                            <span className="text-xs font-bold uppercase">School/Department</span>
                                                        </div>
                                                        {isEditing ? (
                                                            <input 
                                                                type="text"
                                                                value={editData.school}
                                                                onChange={(e) => setEditData({ ...editData, school: e.target.value })}
                                                                className="font-bold text-xl bg-white/50 dark:bg-gray-800/50 rounded-lg px-2 py-1 w-full border border-purple-200 focus:outline-none"
                                                            />
                                                        ) : (
                                                            <p className="font-bold text-xl">{result.school || 'N/A'}</p>
                                                        )}
                                                    </div>

                                                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-700">
                                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-1">
                                                            <Shield size={18} />
                                                            <span className="text-xs font-bold uppercase">Account Status</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-3 h-3 rounded-full ${['Active', 'Registered'].includes(result.status) || result.status === 'active' ? 'bg-green-500 animate-pulse' : result.status === 'Suspended' ? 'bg-red-500' : 'bg-yellow-500'}`}></div>
                                                            {currentUser && currentUser.role === 'SuperAdmin' ? (
                                                                <select 
                                                                    value={result.status || 'Active'}
                                                                    onChange={(e) => handleStatusUpdate(e.target.value)}
                                                                    disabled={statusUpdating}
                                                                    className="bg-transparent font-bold text-xl capitalize focus:outline-none cursor-pointer border-b border-blue-200"
                                                                >
                                                                    {statusOptions.map(opt => (
                                                                        <option key={opt} value={opt} className="text-black">{opt}</option>
                                                                    ))}
                                                                </select>
                                                            ) : (
                                                                <p className="font-bold text-xl capitalize">{result.status || 'Active'}</p>
                                                            )}
                                                            {statusUpdating && <Loader2 size={16} className="animate-spin text-blue-600" />}
                                                        </div>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-xl p-4 border border-pink-200 dark:border-pink-700">
                                                        <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 mb-1">
                                                            <Calendar size={18} />
                                                            <span className="text-xs font-bold uppercase">Last Accessed</span>
                                                        </div>
                                                        <p className="font-bold text-xl">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                                    </div>
                                                    </div>
                                                </div>

                                                {/* Edit Toggle / Save Button */}
                                                {canEdit && isEditing && (
                                                    <div className="mt-4 flex gap-2">
                                                        <button 
                                                            onClick={handleSaveEdits}
                                                            disabled={saveLoading}
                                                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                                                        >
                                                            {saveLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle size={18} />}
                                                            Save Changes
                                                        </button>
                                                        <button 
                                                            onClick={() => { setIsEditing(false); setEditData({ full_name: result.full_name, school: result.school }); }}
                                                            className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
                                                        >
                                                            Cancel
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Action buttons removed from inside the card */}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Back Side - QR Code */}
                                        <div 
                                            className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-gray-800 p-8 flex flex-col items-center justify-center"
                                            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                                        >
                                        <div className="text-center mb-6">
                                            <h4 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-widest">Digital Identity Token</h4>
                                            <p className="text-gray-500 text-xs">Scan to verify at any checkpoint</p>
                                        </div>
                                        
                                        <div className="p-4 bg-white rounded-3xl shadow-inner border-2 border-purple-100 flex items-center justify-center">
                                            <QRCodeSVG 
                                                value={result.admission_number} 
                                                size={220} 
                                                level="H"
                                                includeMargin={true}
                                                imageSettings={{
                                                    src: companySettings.logo_url || "/logo.png",
                                                    x: undefined,
                                                    y: undefined,
                                                    height: 40,
                                                    width: 40,
                                                    excavate: true,
                                                }}
                                            />
                                        </div>
                                        
                                        <div className="mt-8 text-center">
                                            <p className="text-2xl font-black text-purple-600 tracking-wider">{result.admission_number}</p>
                                            <p className="text-[10px] text-gray-400 mt-2 uppercase">Official Gatepass Authentication System</p>
                                        </div>

                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                            className="mt-6 flex items-center gap-2 text-purple-600 font-bold hover:bg-purple-50 px-4 py-2 rounded-xl transition-colors"
                                        >
                                            <RefreshCcw size={16} /> Flip to Front
                                        </button>
                                    </div>
                                </div>

                                    {/* Card Footer - Compact */}
                                    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-6 py-3">
                                        <div className="flex justify-between items-center text-white">
                                            <p className="text-xs font-medium">© 2026 Riara University</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                <span className="text-xs font-bold">VERIFIED & ACTIVE</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Supervisor PIN Modal for Photo Update */}
                {pinModal.show && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
                        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-lg shadow-2xl border border-white/20">
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                    <Shield className="text-purple-600" size={32} />
                                </div>
                                <h3 className="text-2xl font-bold">Image Preview & Authorization</h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Review, rotate and enter PIN to save</p>
                            </div>

                            {/* Image Preview with Rotation */}
                            <div className="mb-6 flex flex-col items-center">
                                <div className="relative w-48 h-56 rounded-2xl overflow-hidden border-2 border-purple-300 shadow-inner bg-slate-100">
                                    {previewUrl && (
                                        <img 
                                            src={previewUrl} 
                                            className="w-full h-full object-cover transition-transform duration-300"
                                            style={{ transform: `rotate(${rotation}deg)` }}
                                        />
                                    )}
                                </div>
                                <button 
                                    onClick={rotateImage}
                                    className="mt-4 flex items-center gap-2 px-4 py-2 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-lg font-bold hover:bg-purple-100 transition-colors"
                                >
                                    <RefreshCcw size={18} />
                                    Rotate 90°
                                </button>
                            </div>

                            <input 
                                type="password"
                                value={pinModal.pin}
                                onChange={(e) => setPinModal({...pinModal, pin: e.target.value})}
                                placeholder="Enter Supervisor PIN"
                                className="w-full px-6 py-4 bg-gray-100 dark:bg-gray-700 rounded-xl text-center text-2xl tracking-[1em] font-bold focus:outline-none focus:ring-2 focus:ring-purple-500 mb-6"
                                maxLength={4}
                            />

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => { setPinModal({show: false, pin: '', file: null}); setPreviewUrl(null); }}
                                    className="flex-1 py-4 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={submitSecureImageUpdate}
                                    disabled={pinModal.pin.length < 4 || uploadingImage}
                                    className="flex-1 py-4 bg-purple-600 text-white font-bold rounded-xl shadow-lg hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                                >
                                    {uploadingImage ? <Loader2 className="animate-spin" size={20} /> : "Verify & Save"}
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* Error State */}
                {result && result.error && (
                    <div className="max-w-2xl mx-auto animate-shake">
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-2xl p-8 text-center">
                            <XCircle className="mx-auto mb-4 text-red-500" size={64} />
                            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Verification Failed</h3>
                            <p className="text-red-600 dark:text-red-300">{result.error}</p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    50% { transform: translateY(-20px) translateX(10px); }
                }
                
                @keyframes slide {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(60px); }
                }
                
                @keyframes card-flip {
                    0% { 
                        opacity: 0;
                        transform: perspective(1000px) rotateY(-15deg) scale(0.9);
                    }
                    100% { 
                        opacity: 1;
                        transform: perspective(1000px) rotateY(0deg) scale(1);
                    }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }

                @keyframes scan-line {
                    0% { top: 0; }
                    100% { top: 100%; }
                }
                
                .animate-float {
                    animation: float linear infinite;
                }
                
                .animate-slide {
                    animation: slide 20s linear infinite;
                }
                
                .animate-card-flip {
                    animation: card-flip 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                .animate-shake {
                    animation: shake 0.5s;
                }

                .animate-scan-line {
                    animation: scan-line 2s ease-in-out infinite;
                }
                
                .perspective-1000 {
                    perspective: 1000px;
                }

                .preserve-3d {
                    transform-style: preserve-3d;
                }

                .backface-hidden {
                    backface-visibility: hidden;
                    -webkit-backface-visibility: hidden;
                }

                .rotate-y-180 {
                    transform: rotateY(180deg);
                }
            `}</style>
        </div>
    )
}
