import { useState, useEffect, useRef } from 'react'
import { useNotification } from './components/Notification'
import { Search, CheckCircle, XCircle, Shield, Calendar, User, Building, Sparkles, UploadCloud, Loader2, Camera, QrCode, LogIn, LogOut, RefreshCcw, Printer, AlertTriangle } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

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
    const [isPrinting, setIsPrinting] = useState(false)
    const qrScannerRef = useRef<Html5Qrcode | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

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
                // Check if browser supports mediaDevices
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    console.warn('Camera API not supported in this browser');
                    return;
                }

                const stream = await navigator.mediaDevices.getUserMedia({ video: true })
                console.log('Camera permission granted');
                
                // CRITICAL: Stop the stream immediately after getting permission
                // This ensures the camera is not "busy" when the scanner tries to start later
                stream.getTracks().forEach(track => track.stop());
            } catch (err: any) {
                console.warn('Camera permission denied or not available', err);
                // Don't show notification here as it might be annoying on every load
                // if they intentionally denied it before.
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

    const handlePrint = async () => {
        if (!result) return
        setIsPrinting(true)
        showNotification('Generating high-resolution ID card...', 'info', 'info')
        
        try {
            const front = document.getElementById(`printable-front-${result.id}`)
            const back = document.getElementById(`printable-back-${result.id}`)
            
            if (!front || !back) {
                showNotification('Error: Printable elements not found', 'error', 'error')
                return
            }

            // Capture Front and Back
            const canvasFront = await html2canvas(front, { scale: 3, useCORS: true, backgroundColor: null })
            const canvasBack = await html2canvas(back, { scale: 3, useCORS: true, backgroundColor: null })
            
            const pdf = new jsPDF('p', 'mm', 'a4')
            const margin = 20
            const cardWidth = 85.6 // Standard ID card size in mm
            const cardHeight = 53.98
            
            // Add Front
            pdf.setFontSize(10)
            pdf.text("Student ID Card (Front)", margin, margin - 5)
            pdf.addImage(canvasFront.toDataURL('image/png'), 'PNG', margin, margin, cardWidth, cardHeight)
            
            // Add Back
            pdf.text("Student ID Card (Back)", margin, margin + cardHeight + 15)
            pdf.addImage(canvasBack.toDataURL('image/png'), 'PNG', margin, margin + cardHeight + 20, cardWidth, cardHeight)
            
            // Add Instructions
            pdf.setFontSize(8)
            pdf.setTextColor(150)
            pdf.text("Instructions:", margin, margin + (cardHeight * 2) + 35)
            pdf.text("1. Print this document on high-quality A4 cardstock.", margin, margin + (cardHeight * 2) + 40)
            pdf.text("2. Cut along the card edges.", margin, margin + (cardHeight * 2) + 45)
            pdf.text("3. Fold and laminate for durability.", margin, margin + (cardHeight * 2) + 50)
            
            pdf.save(`ID_Card_${result.admission_number}.pdf`)
            showNotification('ID Card downloaded successfully!', 'success', 'success')
        } catch (e) {
            console.error(e)
            showNotification('Failed to generate PDF', 'error', 'error')
        } finally {
            setIsPrinting(false)
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
        // Check for secure context (required for camera in modern browsers)
        if (!window.isSecureContext) {
            showNotification("Camera access requires a secure (HTTPS) connection. Please check your URL.", "error")
            return
        }

        setIsScanning(true)
        // Short delay to ensure the container is in the DOM
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader")
                qrScannerRef.current = scanner
                
                // Try starting with environment (back) camera first
                try {
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
                } catch (firstErr) {
                    console.warn("Failed to start with environment camera, trying any camera...", firstErr)
                    // Fallback to any available camera
                    await scanner.start(
                        { facingMode: "user" }, // Try front camera if back fails
                        {
                            fps: 10,
                            qrbox: { width: 250, height: 250 },
                        },
                        (decodedText) => {
                            setQuery(decodedText)
                            stopScanner()
                            setTimeout(() => {
                                const btn = document.getElementById('verify-btn')
                                btn?.click()
                            }, 500)
                        },
                        () => {}
                    )
                }
            } catch (err: any) {
                console.error("Scanner start error:", err)
                const errorMsg = err?.message || err || "Unknown camera error"
                showNotification(`Could not start camera: ${errorMsg}. Please ensure you have given permission and no other app is using it.`, "error")
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
                                    onClick={handlePrint}
                                    disabled={isPrinting}
                                    className="flex items-center justify-center gap-2 py-4 px-6 bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-2xl font-bold border border-slate-200 dark:border-gray-700 hover:bg-slate-200 transition-all disabled:opacity-50"
                                >
                                    {isPrinting ? <Loader2 className="animate-spin" size={20} /> : <Printer size={20} />}
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
                                        className={`relative transition-all duration-700 preserve-3d min-h-[450px] ${isFlipped ? 'rotate-y-180' : ''}`}
                                        style={{ transformStyle: 'preserve-3d' }}
                                    >
                                        {/* Front Side */}
                                        <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-800 flex flex-col">
                                            {/* Header */}
                                            <div className="relative h-20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 overflow-hidden shrink-0">
                                                <div className="absolute inset-0 opacity-20">
                                                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] animate-slide"></div>
                                                </div>
                                                <div className="relative h-full flex items-center justify-between px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-14 h-14 bg-white rounded-xl p-1 shadow-inner flex items-center justify-center overflow-hidden">
                                                            <img src={companySettings.logo_url || "/logo.png"} alt="Logo" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="text-white text-left">
                                                            <h2 className="text-xl font-black tracking-tight leading-none">{companySettings.company_name?.toUpperCase()}</h2>
                                                            <p className="text-purple-100 font-bold text-[10px] mt-0.5 tracking-widest">OFFICIAL STUDENT ID CARD</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30">
                                                        <div className="flex items-center gap-1 text-white">
                                                            <CheckCircle className="text-green-300" size={16} />
                                                            <span className="font-bold text-sm">VERIFIED</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <div className="p-6 flex flex-col md:flex-row gap-6 items-center md:items-start flex-1">
                                                <div className="relative w-48 h-56 md:w-56 md:h-64 rounded-3xl overflow-hidden border-4 border-white shadow-2xl bg-slate-200 shrink-0">
                                                    {result.profile_image ? (
                                                        <img src={result.profile_image} alt={result.full_name} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                                            <User size={60} className="text-white opacity-50" />
                                                        </div>
                                                    )}
                                                    {canEdit && (
                                                        <label className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md text-white py-3 font-black cursor-pointer hover:bg-black/60 transition-all flex items-center justify-center gap-2 border-t border-white/20">
                                                            <Camera size={16} />
                                                            <span className="text-[10px] uppercase">Update Photo</span>
                                                            <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                                                        </label>
                                                    )}
                                                </div>

                                                <div className="flex-1 space-y-4 w-full text-left">
                                                    <div>
                                                        <h3 className="text-3xl md:text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent break-words">
                                                            {result.full_name}
                                                        </h3>
                                                        <p className="text-xl font-bold text-purple-600 mt-1">{result.admission_number}</p>
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl border border-purple-100 dark:border-purple-800">
                                                            <span className="text-[10px] font-bold text-purple-400 uppercase tracking-widest block mb-1">School/Department</span>
                                                            <p className="font-bold text-gray-800 dark:text-gray-200">{result.school || 'General Studies'}</p>
                                                        </div>
                                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl border border-blue-100 dark:border-blue-800 flex justify-between items-center">
                                                            <div>
                                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Status</span>
                                                                <p className="font-bold text-green-600 uppercase">ACTIVE</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Expiry Date</span>
                                                                <p className="font-bold text-gray-800 dark:text-gray-200">DEC 2026</p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Footer */}
                                            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-6 py-3 mt-auto shrink-0">
                                                <div className="flex justify-between items-center text-white">
                                                    <p className="text-[10px] font-medium">© 2026 {companySettings.company_name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Verified & Active</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                        {/* Back Side */}
                                        <div 
                                            className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-gray-800 flex flex-col"
                                            style={{ transform: 'rotateY(180deg)', backfaceVisibility: 'hidden' }}
                                        >
                                            {/* Header */}
                                            <div className="relative h-20 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 shrink-0">
                                                <div className="relative h-full flex items-center justify-between px-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-14 h-14 bg-white rounded-xl p-1 flex items-center justify-center">
                                                            <img src={companySettings.logo_url || "/logo.png"} alt="Logo" className="w-full h-full object-contain" />
                                                        </div>
                                                        <div className="text-white text-left">
                                                            <h2 className="text-xl font-black tracking-tight leading-none">{companySettings.company_name?.toUpperCase()}</h2>
                                                            <p className="text-purple-100 font-bold text-[10px] mt-0.5 tracking-widest">OFFICIAL STUDENT ID CARD</p>
                                                        </div>
                                                    </div>
                                                    <div className="bg-white/20 backdrop-blur-md rounded-xl px-4 py-2 border border-white/30">
                                                        <div className="flex items-center gap-1 text-white">
                                                            <CheckCircle className="text-green-300" size={16} />
                                                            <span className="font-bold text-sm">VERIFIED</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Body */}
                                            <div className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden">
                                                <div className="text-center mb-6 z-10">
                                                    <h4 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight mb-1">Digital Identity Token</h4>
                                                    <p className="text-gray-400 text-sm font-medium">Scan to verify at any checkpoint</p>
                                                </div>
                                                
                                                <div className="p-4 bg-white rounded-3xl shadow-2xl border-4 border-purple-50 flex items-center justify-center relative z-10">
                                                    <div className="absolute -inset-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-[2.5rem] blur-xl opacity-50"></div>
                                                    <div className="relative bg-white p-2 rounded-2xl">
                                                        <QRCodeSVG 
                                                            value={result.admission_number} 
                                                            size={180} 
                                                            level="H"
                                                            includeMargin={true}
                                                            imageSettings={{
                                                                src: companySettings.logo_url || "/logo.png",
                                                                height: 30,
                                                                width: 30,
                                                                excavate: true,
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                                
                                                <div className="mt-6 text-center z-10">
                                                    <p className="text-3xl font-black text-purple-600 tracking-wider">{result.admission_number}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-widest opacity-60">Official Gatepass Authentication System</p>
                                                </div>

                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                                                    className="mt-6 flex items-center gap-2 text-purple-600 font-bold hover:bg-purple-50 px-4 py-2 rounded-xl transition-colors z-10"
                                                >
                                                    <RefreshCcw size={16} /> Flip to Front
                                                </button>
                                            </div>

                                            {/* Footer */}
                                            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-6 py-3 shrink-0">
                                                <div className="flex justify-between items-center text-white">
                                                    <p className="text-[10px] font-medium">© 2026 {companySettings.company_name}</p>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                                        <span className="text-[10px] font-black uppercase tracking-wider">Verified & Active</span>
                                                    </div>
                                                </div>
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

                {/* Hidden Real Card Renderers for High-Res Capturing */}
                {result && !result.error && (
                    <div className="fixed -left-[5000px] top-0 pointer-events-none">
                        <div id={`printable-front-${result.id}`}>
                            <PrintableIDCardFront student={result} companySettings={companySettings} />
                        </div>
                        <div id={`printable-back-${result.id}`}>
                            <PrintableIDCardBack student={result} companySettings={companySettings} />
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

// Sub-components for high-resolution printing (Matching the requested premium design)
function PrintableIDCardFront({ student, companySettings }: any) {
    return (
        <div 
            className="w-[1011px] h-[638px] bg-white overflow-hidden relative"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
            {/* Header */}
            <div className="h-[150px] bg-gradient-to-r from-purple-700 to-indigo-800 flex items-center px-12 justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-xl">
                        <img src={companySettings.logo_url || "/logo.png"} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-white">
                        <h2 className="text-[32px] font-black uppercase tracking-tight leading-none">{companySettings.company_name}</h2>
                        <p className="text-[18px] font-bold opacity-80 tracking-[0.3em] mt-2">OFFICIAL STUDENT ID CARD</p>
                    </div>
                </div>
                <div className="text-white text-[20px] font-black border-2 border-white/30 px-6 py-2 rounded-xl bg-white/10 uppercase tracking-widest flex items-center gap-2">
                    <CheckCircle size={24} className="text-green-400" />
                    Verified
                </div>
            </div>

            {/* Content */}
            <div className="p-12 flex gap-12 items-start">
                <div className="w-[320px] h-[380px] bg-gray-100 rounded-[40px] overflow-hidden border-8 border-gray-50 shadow-2xl shrink-0">
                    {student.profile_image ? (
                        <img src={student.profile_image} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={120} /></div>
                    )}
                </div>
                <div className="flex-1 pt-4">
                    <h3 className="text-indigo-950 text-[56px] font-black leading-tight break-words uppercase tracking-tighter">{student.full_name}</h3>
                    <p className="text-purple-600 text-[42px] font-black mt-2 tracking-wider">{student.admission_number}</p>
                    
                    <div className="mt-12 space-y-6">
                        <div className="bg-purple-50 p-6 rounded-3xl border border-purple-100">
                            <p className="text-[16px] text-purple-400 font-black uppercase tracking-widest mb-1">School/Department</p>
                            <p className="text-[28px] font-black text-gray-900">{student.school || 'General Studies'}</p>
                        </div>
                        <div className="flex justify-between items-end gap-6">
                            <div className="flex-1 bg-green-50 p-6 rounded-3xl border border-green-100">
                                <p className="text-[16px] text-green-500 font-black uppercase tracking-widest mb-1">Status</p>
                                <p className="text-[24px] font-black text-green-700">ACTIVE & VERIFIED</p>
                            </div>
                            <div className="flex-1 bg-blue-50 p-6 rounded-3xl border border-blue-100">
                                <p className="text-[16px] text-blue-500 font-black uppercase tracking-widest mb-1">Expiry</p>
                                <p className="text-[24px] font-black text-gray-900">DECEMBER 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Accent */}
            <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600"></div>
        </div>
    )
}

function PrintableIDCardBack({ student, companySettings }: any) {
    return (
        <div 
            className="w-[1011px] h-[638px] bg-white overflow-hidden relative flex flex-col"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
             {/* Header */}
             <div className="h-[150px] bg-gradient-to-r from-purple-700 to-indigo-800 flex items-center px-12 justify-between">
                <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-white rounded-2xl p-2">
                        <img src={companySettings.logo_url || "/logo.png"} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-white">
                        <h2 className="text-[32px] font-black uppercase tracking-tight leading-none">{companySettings.company_name}</h2>
                        <p className="text-[18px] font-bold opacity-80 tracking-[0.3em] mt-2">OFFICIAL STUDENT ID CARD</p>
                    </div>
                </div>
                <div className="bg-white/20 backdrop-blur-md rounded-xl px-6 py-2 border border-white/30 text-white font-bold text-xl uppercase tracking-widest">
                    Verified
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-12">
                <div className="text-center mb-10">
                    <h4 className="text-[42px] font-black text-gray-900 uppercase tracking-tight leading-none">Digital Identity Token</h4>
                    <p className="text-[20px] text-gray-500 font-bold mt-2 tracking-widest">SCAN TO VERIFY AT ANY CHECKPOINT</p>
                </div>

                <div className="p-8 bg-white rounded-[60px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border-[12px] border-purple-50">
                    <QRCodeSVG 
                        value={student.admission_number} 
                        size={280} 
                        level="H" 
                        imageSettings={{
                            src: companySettings.logo_url || "/logo.png",
                            height: 60,
                            width: 60,
                            excavate: true
                        }}
                    />
                </div>

                <div className="mt-10 text-center">
                    <p className="text-[48px] font-black text-purple-600 tracking-wider leading-none">{student.admission_number}</p>
                    <p className="text-[14px] text-gray-400 mt-4 uppercase font-bold tracking-[0.4em] max-w-[600px] mx-auto opacity-70">Official Gatepass Authentication & Attendance System</p>
                </div>
            </div>

            <div className="h-4 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600"></div>
        </div>
    )
}
