import { useState, useEffect, useRef } from 'react'
import { Car, User, Truck, CheckCircle, ArrowRight, UserCheck, Shield, Camera, AlertCircle, RefreshCcw, Upload, FileText, X } from 'lucide-react'
import { PrivacyPolicy } from './privacy/PrivacyPolicy'
import { CookiePolicy } from './privacy/CookiePolicy'

export default function SelfServiceEntry() {
    const [step, setStep] = useState(1) // 1: Role, 2: Form, 3: Success
    const [role, setRole] = useState('')
    const [gateId, setGateId] = useState('')
    const [formData, setFormData] = useState<any>({})
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const [userData, setUserData] = useState<any>(null)

    // Delivery Images
    const [deliveryPackageImage, setDeliveryPackageImage] = useState<string | null>(null)
    const [deliveryReceiptImage, setDeliveryReceiptImage] = useState<string | null>(null)

    // Taxi Drop-off details
    const [dropoffType, setDropoffType] = useState('student') // 'student', 'staff', 'new'
    const [dropoffAdmission, setDropoffAdmission] = useState('')
    const [dropoffUser, setDropoffUser] = useState<any>(null)
    const [dropoffName, setDropoffName] = useState('')
    const [checkInStudent, setCheckInStudent] = useState(false)
    const [loadingStudent, setLoadingStudent] = useState(false)
    const [systemUsers, setSystemUsers] = useState<any[]>([])

    // Data Protection Preferences
    const [autoDelete24h, setAutoDelete24h] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)
    const [showCookieModal, setShowCookieModal] = useState(false)

    // Taxi & Visitor autocomplete states
    const [taxiServiceType, setTaxiServiceType] = useState<'pickup' | 'dropoff'>('dropoff')
    const [userSearchQuery, setUserSearchQuery] = useState('')
    const [userSearchResults, setUserSearchResults] = useState<any[]>([])
    const [selectedUserObj, setSelectedUserObj] = useState<any>(null)
    const [loadingVisitor, setLoadingVisitor] = useState(false)

    const [companyColors, setCompanyColors] = useState<any>({
        primary_color: '#2563eb',
        secondary_color: '#0284c7',
        accent_color: '#10b981',
        company_name: 'Smart Campus'
    })

    // Fetch company settings for branding colors & name
    useEffect(() => {
        const fetchCompanyColors = async () => {
            try {
                const res = await fetch('/api/users/public-company-settings')
                if (res.ok) {
                    const data = await res.json()
                    setCompanyColors({
                        primary_color: data.primary_color || '#2563eb',
                        secondary_color: data.secondary_color || '#0284c7',
                        accent_color: data.accent_color || '#10b981',
                        company_name: data.company_name || 'Smart Campus'
                    })
                }
            } catch (e) {
                console.error('Failed to fetch public company settings:', e)
            }
        }
        fetchCompanyColors()
    }, [])

    // Fetch system users for drop-off lookup (staff/other)
    useEffect(() => {
        if (role === 'taxi' && dropoffType === 'staff') {
            const fetchUsers = async () => {
                try {
                    const token = localStorage.getItem('token')
                    const res = await fetch('/api/users', {
                        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                    })
                    if (res.ok) {
                        const data = await res.json()
                        // Filter out students since student drop-off has admission lookup
                        setSystemUsers(data.filter((u: any) => u.role !== 'Student'))
                    }
                } catch (e) {
                    console.error('Failed to fetch users:', e)
                }
            }
            fetchUsers()
        }
    }, [role, dropoffType])

    // Apply company colors dynamically
    useEffect(() => {
        const root = document.documentElement;
        const isDark = root.classList.contains('dark');
        let primary = companyColors.primary_color || '#2563eb';
        let secondary = companyColors.secondary_color || '#0284c7';
        let accent = companyColors.accent_color || '#10b981';

        if (isDark) {
            const lighten = (hex: string, amount: number) => {
                try {
                    let color = hex.replace('#', '');
                    let num = parseInt(color, 16);
                    let r = (num >> 16) + amount;
                    let g = ((num >> 8) & 0x00FF) + amount;
                    let b = (num & 0x0000FF) + amount;
                    r = Math.min(255, Math.max(0, r));
                    g = Math.min(255, Math.max(0, g));
                    b = Math.min(255, Math.max(0, b));
                    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                } catch (e) {
                    return hex;
                }
            };
            primary = lighten(primary, 40);
            secondary = lighten(secondary, 40);
            accent = lighten(accent, 40);
        }

        root.style.setProperty('--primary-color', primary);
        root.style.setProperty('--secondary-color', secondary);
        root.style.setProperty('--accent-color', accent);
        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
    }, [companyColors])

    // Camera Refs & State
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [image, setImage] = useState<string | null>(null)
    const [cameraActive, setCameraActive] = useState(false)

    const startCamera = async () => {
        setError(null)
        if (!window.isSecureContext) {
            const el = document.getElementById("self-pass-photo-file-input")
            if (el) {
                el.click()
            } else {
                setError("Camera access requires a secure (HTTPS) connection. Please upload a photo instead.")
            }
            return
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setCameraActive(true)
                videoRef.current.play()
            }
        } catch (err: any) {
            console.error("Camera start error:", err)
            const errorMsg = err?.message || err || "Unknown error"
            setError(`Could not access camera: ${errorMsg}. Please ensure permissions are granted or upload a file.`)
        }
    }

    const takePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext('2d')
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth
                canvasRef.current.height = videoRef.current.videoHeight
                context.drawImage(videoRef.current, 0, 0)
                const dataUrl = canvasRef.current.toDataURL('image/jpeg')
                setImage(dataUrl)

                // Stop stream
                const stream = videoRef.current.srcObject as MediaStream
                if (stream) stream.getTracks().forEach(track => track.stop())
                setCameraActive(false)
            }
        }
    }

    // Lookup Student for Taxi Drop-off
    const lookupStudent = async () => {
        if (!dropoffAdmission) return
        setLoadingStudent(true)
        setDropoffUser(null)
        setError(null)
        try {
            const res = await fetch(`/api/users/verify/${encodeURIComponent(dropoffAdmission)}`)
            if (res.ok) {
                const data = await res.json()
                setDropoffUser(data)
            } else {
                setDropoffUser(null)
                setError("Student not found. Please verify the admission number.")
            }
        } catch (err) {
            console.error(err)
            setError("Failed to look up student details. Ensure connection is online.")
        } finally {
            setLoadingStudent(false)
        }
    }

    // Lookup Visitor/User by ID number for auto-populating
    const lookupVisitor = async (idNum: string) => {
        if (!idNum) return
        setLoadingVisitor(true)
        setError(null)
        try {
            const res = await fetch(`/api/users/verify/${encodeURIComponent(idNum)}`)
            if (res.ok) {
                const data = await res.json()
                setFormData({
                    ...formData,
                    id_number: idNum,
                    name: data.full_name,
                    mobile: data.phone_number || ''
                })
            } else {
                setError("User not found in system. Please input details manually.")
            }
        } catch (err) {
            console.error(err)
            setError("Failed to look up user details. Ensure connection is online.")
        } finally {
            setLoadingVisitor(false)
        }
    }

    // Autocomplete query for Taxi passengers
    useEffect(() => {
        if (userSearchQuery.trim().length >= 2 && !selectedUserObj) {
            const delayDebounce = setTimeout(async () => {
                try {
                    const res = await fetch(`/api/users/search?q=${encodeURIComponent(userSearchQuery)}`)
                    if (res.ok) {
                        const data = await res.json()
                        setUserSearchResults(data)
                    }
                } catch (e) {
                    console.error("User autocomplete search failed:", e)
                }
            }, 300)
            return () => clearTimeout(delayDebounce)
        } else {
            setUserSearchResults([])
        }
    }, [userSearchQuery, selectedUserObj])

    useEffect(() => {
        const path = window.location.pathname
        const id = path.split('/gate-pass/')[1]
        if (id) setGateId(id)

        const storedUser = localStorage.getItem('user')
        if (storedUser) {
            try {
                setUserData(JSON.parse(storedUser))
            } catch (e) { }
        }
    }, [])

    const handleStudentSubmit = async () => {
        if (!userData?.id) return
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/gate/public/access-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gate_id: gateId,
                    role: 'student',
                    data: {
                        user_id: userData.id,
                        image: image
                    }
                })
            })
            const data = await res.json()
            if (res.ok) {
                setResult(data)
                setStep(3)
                if ('vibrate' in navigator) {
                    try { navigator.vibrate(200); } catch (e) {}
                }
            } else {
                setError(data.detail || "Request failed. Please verify the QR scanner device is active.")
                if ('vibrate' in navigator) {
                    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
                }
            }
        } catch (err) {
            setError("Connection failed. Please ensure the campus server network is online.")
            if ('vibrate' in navigator) {
                try { navigator.vibrate([200, 100, 200]); } catch (e) {}
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleVehicleRegisterSubmit = async (e: any) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/gate/public/access-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gate_id: gateId,
                    role: 'vehicle_registration',
                    data: {
                        driver_name: formData.driver_name,
                        driver_id_number: formData.driver_id_number,
                        driver_contact: formData.driver_contact,
                        plate_number: formData.plate_number,
                        vehicle_role: formData.role || 'student',
                        auto_delete_24h: autoDelete24h
                    }
                })
            })
            const data = await res.json()
            if (res.ok) {
                setResult({ status: 'success', message: data.message })
                setStep(3)
                if ('vibrate' in navigator) {
                    try { navigator.vibrate(200); } catch (e) {}
                }
            } else {
                setError(data.detail || "Registration failed. Please try again.")
                if ('vibrate' in navigator) {
                    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
                }
            }
        } catch (err) {
            setError("Connection failed. Please ensure the campus server network is online.")
            if ('vibrate' in navigator) {
                try { navigator.vibrate([200, 100, 200]); } catch (e) {}
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)

        // Construct role-specific payload
        let payloadData: any = {}
        if (role === 'visitor') {
            payloadData = {
                name: formData.name,
                mobile: formData.mobile,
                id_number: formData.id_number,
                purpose: formData.purpose,
                auto_delete_24h: autoDelete24h
            }
        } else if (role === 'taxi') {
            payloadData = {
                plate_number: formData.plate_number,
                passengers: formData.passengers || 1,
                purpose: `${taxiServiceType === 'pickup' ? 'Pick Up' : 'Drop Off'}: ${dropoffName || userSearchQuery}`,
                dropoff_admission_number: dropoffAdmission || undefined,
                dropoff_name: dropoffName || undefined,
                is_pickup: taxiServiceType === 'pickup',
                check_in_student: taxiServiceType === 'dropoff',
                auto_delete_24h: autoDelete24h
            }
        } else if (role === 'delivery') {
            payloadData = {
                name: formData.name,
                mobile: formData.mobile,
                id_number: formData.id_number,
                delivery_details: formData.delivery_details,
                delivery_image_package: deliveryPackageImage,
                delivery_image_receipt: deliveryReceiptImage,
                auto_delete_24h: autoDelete24h
            }
        }

        try {
            const res = await fetch('/api/gate/public/access-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gate_id: gateId,
                    role: role,
                    data: payloadData
                })
            })
            const data = await res.json()
            if (res.ok) {
                setResult(data)
                setStep(3)
                if ('vibrate' in navigator) {
                    try { navigator.vibrate(200); } catch (e) {}
                }
            } else {
                setError(data.detail || "Verification failed. Check credentials and retry.")
                if ('vibrate' in navigator) {
                    try { navigator.vibrate([200, 100, 200]); } catch (e) {}
                }
            }
        } catch (err) {
            setError("Connection failed. Please ensure the campus server network is online.")
            if ('vibrate' in navigator) {
                try { navigator.vibrate([200, 100, 200]); } catch (e) {}
            }
        } finally {
            setSubmitting(false)
        }
    }

    const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'package' | 'receipt') => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                if (type === 'package') {
                    setDeliveryPackageImage(reader.result as string)
                } else {
                    setDeliveryReceiptImage(reader.result as string)
                }
            }
            reader.readAsDataURL(file)
        }
    }

    if (step === 3) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center animate-scale-in">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400 animate-pulse" size={40} />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
                        {result?.message && result.message.includes("wait") ? 'Request Submitted' : result?.status === 'success' ? 'Access Granted' : 'Request Sent'}
                    </h2>
                    <p className="text-slate-600 dark:text-slate-400 text-sm mb-8 leading-relaxed font-bold">
                        {result?.message}
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all mb-3"
                    >
                        New Request
                    </button>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 border border-slate-200 dark:border-slate-850 text-slate-650 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl font-black text-sm active:scale-95 transition-all"
                    >
                        Back to Homepage
                    </button>
                    {result?.status === 'success' && !result?.message?.includes("wait") && (
                        <div className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                            Gate opened automatically
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-slate-100 to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20 p-4 pb-20 font-sans flex flex-col justify-between">
            <input 
                type="file" 
                id="self-pass-photo-file-input" 
                accept="image/*" 
                capture="environment" 
                onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                        const reader = new FileReader()
                        reader.onloadend = () => {
                            setImage(reader.result as string)
                            setError(null)
                        }
                        reader.readAsDataURL(file)
                    }
                }} 
                className="hidden" 
            />

            {/* Hidden uploads for Deliveries */}
            <input 
                type="file" 
                id="delivery-package-input" 
                accept="image/*" 
                capture="environment" 
                onChange={(e) => handleImageFileChange(e, 'package')}
                className="hidden" 
            />
            <input 
                type="file" 
                id="delivery-receipt-input" 
                accept="image/*" 
                capture="environment" 
                onChange={(e) => handleImageFileChange(e, 'receipt')}
                className="hidden" 
            />

            <div className="max-w-md mx-auto w-full relative flex-1">
                {/* Back to Homepage Button */}
                <div className="flex justify-start mb-4 pt-2">
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        &larr; Back to Homepage
                    </button>
                </div>
                <header className="mb-6 text-center">
                    <div className="inline-flex p-3 bg-indigo-600/10 rounded-2xl mb-3">
                        <Shield className="text-indigo-600" size={28} />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 dark:text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                        Smart Gate Pass
                    </h1>
                    <p className="text-slate-500 text-xs uppercase tracking-widest font-black mt-1">
                        Self-Service Portal
                    </p>
                </header>

                {error && (
                    <div className="mb-5 p-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/30 rounded-2xl text-rose-700 dark:text-rose-400 text-xs font-bold flex items-start gap-2.5 shadow-sm">
                        <AlertCircle className="shrink-0 text-rose-500 mt-0.5" size={16} />
                        <div>{error}</div>
                    </div>
                )}

                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <p className="text-xs font-black text-slate-400 uppercase tracking-wider pl-1 mb-2">
                            Select your category:
                        </p>

                        <RoleCard icon={User} label="Visitor" desc="Personal visits, enquiries, or guests" onClick={() => { setRole('visitor'); setStep(2); setError(null); setFormData({}); setAutoDelete24h(false); }} />
                        <RoleCard icon={Car} label="Taxi / Cab" desc="Drop-offs, pick-ups, or taxi services" onClick={() => { setRole('taxi'); setStep(2); setError(null); setFormData({ passengers: 1 }); setAutoDelete24h(false); }} />
                        <RoleCard icon={Truck} label="Delivery" desc="Goods, parcels, couriers, or food deliveries" onClick={() => { setRole('delivery'); setStep(2); setError(null); setFormData({}); setAutoDelete24h(false); }} />
                        <RoleCard icon={UserCheck} label="Student / Staff" desc="Campus verification check-in/out" onClick={() => { setRole('student'); setStep(2); setError(null); setFormData({}); setAutoDelete24h(false); }} color="indigo" />
                        <RoleCard icon={Car} label="Vehicle Registration" desc="Register your vehicle details" onClick={() => { setRole('vehicle_registration'); setStep(2); setError(null); setFormData({ role: 'student' }); setAutoDelete24h(false); }} color="indigo" />
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 animate-slide-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                                {role === 'student' ? 'Student / Staff Verify' : role === 'vehicle_registration' ? 'Vehicle Registration' : `${role} Registration`}
                            </h2>
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
                                Step 2 of 2
                            </span>
                        </div>

                        {/* Data Protection summary before they fill details */}
                        {role !== 'student' && (
                            <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 rounded-2xl text-slate-650 dark:text-slate-350 text-xs font-bold leading-relaxed mb-6 space-y-2">
                                <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider text-[10px]">
                                    <Shield size={14} /> Data Protection & Privacy Summary
                                </div>
                                <p>
                                    To comply with the <strong>Kenya Data Protection Act 2019</strong>, we notify you that this portal collects your full name, phone number, national ID, and purpose of visit. This data is processed strictly for campus security and log auditing.
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                                    We do not use tracking cookies. View our full <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer">Privacy Policy</button> and <button type="button" onClick={() => setShowCookieModal(true)} className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer">Cookie Policy</button>.
                                </p>
                            </div>
                        )}

                        {role === 'student' ? (
                            userData ? (
                                <div className="space-y-5 text-center">
                                    <div className="p-5 bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 dark:from-indigo-950/20 dark:to-slate-900 border border-indigo-500/20 rounded-2xl text-left">
                                        <div className="font-black text-slate-800 dark:text-white text-lg">{userData.full_name}</div>
                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono uppercase mt-0.5">{userData.admission_number}</div>
                                        <div className="mt-3 text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400 px-2.5 py-1 rounded-lg inline-block font-black uppercase tracking-wider">
                                            Authenticated
                                        </div>
                                    </div>

                                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed">
                                        Please take a photo of the entrance to verify your physical presence.
                                    </p>

                                    {/* Camera UI */}
                                    <div className="mb-4">
                                        {!image ? (
                                            <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-inner">
                                                <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                                                {!cameraActive && (
                                                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 text-white z-10 p-4">
                                                        <button 
                                                            onClick={startCamera} 
                                                            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 text-xs cursor-pointer"
                                                        >
                                                            <Camera size={16} /> Open Device Camera
                                                        </button>
                                                    </div>
                                                )}
                                                <canvas ref={canvasRef} className="hidden" />
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl overflow-hidden aspect-video relative shadow-lg ring-4 ring-indigo-50 dark:ring-indigo-950/30">
                                                <img src={image} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => { setImage(null); startCamera() }}
                                                    className="absolute bottom-4 right-4 bg-white/95 text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow hover:bg-white flex items-center gap-1.5 transition-all cursor-pointer"
                                                >
                                                    <RefreshCcw size={12} /> Retake
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => { setStep(1); setError(null); }} 
                                            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-xs active:scale-95 transition-all cursor-pointer"
                                        >
                                            Back
                                        </button>

                                        {cameraActive && !image && (
                                            <button 
                                                onClick={takePhoto} 
                                                className="flex-[2] py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                                            >
                                                <Camera size={14} /> Capture Photo
                                            </button>
                                        )}

                                        {image && (
                                            <button
                                                onClick={handleStudentSubmit}
                                                disabled={submitting}
                                                className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer"
                                            >
                                                {submitting ? 'Verifying...' : 'Submit Verification'}
                                            </button>
                                        )}

                                        {!cameraActive && !image && (
                                            <button 
                                                disabled 
                                                className="flex-[2] py-3.5 bg-slate-100 text-slate-400 dark:bg-slate-800/50 dark:text-slate-600 rounded-2xl font-black text-xs cursor-not-allowed"
                                            >
                                                Capture Photo First
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-4" onSubmit={(e) => {
                                    e.preventDefault()
                                }}>
                                    <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs font-bold leading-relaxed">
                                        You are currently logged out. Start by logging into your account to perform gate pass checks.
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => window.location.href = '/'} 
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 text-xs active:scale-95 transition-all cursor-pointer"
                                    >
                                        Go to Login Page
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setStep(1); setError(null); }} 
                                        className="w-full py-3.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-355 text-xs font-black cursor-pointer"
                                    >
                                        Back to Categories
                                    </button>
                                </form>
                            )
                        ) : role === 'vehicle_registration' ? (
                            <form className="space-y-4" onSubmit={handleVehicleRegisterSubmit}>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Full Name</label>
                                    <input 
                                        required 
                                        placeholder="e.g. John Doe"
                                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                        value={formData.driver_name || ''}
                                        onChange={e => setFormData({ ...formData, driver_name: e.target.value })} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Phone Number</label>
                                        <input 
                                            required 
                                            type="tel"
                                            placeholder="e.g. 0712345678"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            value={formData.driver_contact || ''}
                                            onChange={e => setFormData({ ...formData, driver_contact: e.target.value })} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">ID / Passport No</label>
                                        <input 
                                            required 
                                            placeholder="ID Number"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            value={formData.driver_id_number || ''}
                                            onChange={e => setFormData({ ...formData, driver_id_number: e.target.value })} 
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Vehicle Plate</label>
                                        <input 
                                            required
                                            placeholder="KCA 123A"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white font-mono uppercase"
                                            value={formData.plate_number || ''}
                                            onChange={e => setFormData({ ...formData, plate_number: e.target.value })} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Your Role</label>
                                        <select
                                            required
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            value={formData.role || 'student'}
                                            onChange={e => setFormData({ ...formData, role: e.target.value })}
                                        >
                                            <option value="student">Student</option>
                                            <option value="staff">Staff</option>
                                            <option value="visitor">Visitor</option>
                                        </select>
                                    </div>
                                </div>

                                {/* 24h Auto delete option checkbox */}
                                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mb-2">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoDelete24h}
                                            onChange={(e) => setAutoDelete24h(e.target.checked)}
                                            className="rounded border-slate-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500/20 w-4.5 h-4.5 mt-0.5 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">Auto-Scrub My Data</span>
                                            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block leading-normal mt-0.5">
                                                Automatically delete my name, contact, and ID details from campus records exactly 24 hours after my visit ends.
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => { setStep(1); setError(null); }} 
                                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-355 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting} 
                                        className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
                                    >
                                        {submitting ? 'Submitting...' : <>Submit Request <ArrowRight size={14} /></>}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {/* Full Name: Hide for taxi driver */}
                                {role !== 'taxi' && (
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Full Name</label>
                                        <input 
                                            required 
                                            placeholder="e.g. John Doe"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            value={formData.name || ''}
                                            onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                        />
                                    </div>
                                )}

                                {role !== 'taxi' && (
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Phone Number</label>
                                            <input 
                                                required 
                                                type="tel"
                                                placeholder="e.g. 0712345678"
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                                value={formData.mobile || ''}
                                                onChange={e => setFormData({ ...formData, mobile: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">ID / Passport No</label>
                                            <div className="flex gap-2">
                                                <input 
                                                    required 
                                                    placeholder="ID Number"
                                                    className="flex-1 p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                                    value={formData.id_number || ''}
                                                    onChange={e => setFormData({ ...formData, id_number: e.target.value })} 
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => lookupVisitor(formData.id_number)}
                                                    disabled={loadingVisitor || !formData.id_number}
                                                    className="px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                                                >
                                                    {loadingVisitor ? 'Searching...' : 'Lookup'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Vehicle Fields for Taxi ONLY */}
                                {role === 'taxi' && (
                                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Vehicle Plate</label>
                                            <input 
                                                required
                                                placeholder="KCA 123A"
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white font-mono uppercase"
                                                onChange={e => setFormData({ ...formData, plate_number: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Passengers</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                required
                                                placeholder="1"
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                                onChange={e => setFormData({ ...formData, passengers: e.target.value })} 
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Specifics for Delivery */}
                                {role === 'delivery' && (
                                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3 space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Delivery Details</label>
                                            <input 
                                                required 
                                                placeholder="e.g. DHL Package for Admin Office" 
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                                onChange={e => setFormData({ ...formData, delivery_details: e.target.value })} 
                                            />
                                        </div>

                                        {/* Pictures of Package & Receipt */}
                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            {/* Package Image Card */}
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase block">Delivery Package Photo</label>
                                                {!deliveryPackageImage ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('delivery-package-input')?.click()}
                                                        className="w-full aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-650 hover:border-indigo-500/30 transition-all bg-slate-50/50 dark:bg-slate-905 cursor-pointer"
                                                    >
                                                        <Camera size={18} />
                                                        <span className="text-[9px] font-bold mt-1">Capture</span>
                                                    </button>
                                                ) : (
                                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850">
                                                        <img src={deliveryPackageImage} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeliveryPackageImage(null)}
                                                            className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-bold opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Receipt Image Card */}
                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-bold text-slate-400 uppercase block">Receipt / Note Photo</label>
                                                {!deliveryReceiptImage ? (
                                                    <button
                                                        type="button"
                                                        onClick={() => document.getElementById('delivery-receipt-input')?.click()}
                                                        className="w-full aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:text-indigo-650 hover:border-indigo-500/30 transition-all bg-slate-50/50 dark:bg-slate-905 cursor-pointer"
                                                    >
                                                        <FileText size={18} />
                                                        <span className="text-[9px] font-bold mt-1">Capture</span>
                                                    </button>
                                                ) : (
                                                    <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-850">
                                                        <img src={deliveryReceiptImage} className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => setDeliveryReceiptImage(null)}
                                                            className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-bold opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                                                        >
                                                            Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Pick Up / Drop Off & User search for Taxi */}
                                {role === 'taxi' && (
                                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 space-y-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Service Type</label>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTaxiServiceType('dropoff');
                                                        setSelectedUserObj(null);
                                                        setDropoffAdmission('');
                                                        setDropoffName('');
                                                        setUserSearchQuery('');
                                                        setError(null);
                                                    }}
                                                    className={`py-3 px-4 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                                                        taxiServiceType === 'dropoff'
                                                            ? 'bg-indigo-600 text-white border-indigo-650 shadow-lg shadow-indigo-600/20'
                                                            : 'bg-slate-50 dark:bg-slate-850 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    Drop Off
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setTaxiServiceType('pickup');
                                                        setSelectedUserObj(null);
                                                        setDropoffAdmission('');
                                                        setDropoffName('');
                                                        setUserSearchQuery('');
                                                        setError(null);
                                                    }}
                                                    className={`py-3 px-4 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                                                        taxiServiceType === 'pickup'
                                                            ? 'bg-indigo-600 text-white border-indigo-650 shadow-lg shadow-indigo-600/20'
                                                            : 'bg-slate-50 dark:bg-slate-850 border-slate-150 dark:border-slate-800 text-slate-700 dark:text-slate-300'
                                                    }`}
                                                >
                                                    Pick Up
                                                </button>
                                            </div>
                                        </div>

                                        <div className="relative">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold font-bold">
                                                Search Student / Staff (Name or Admission/ID)
                                            </label>
                                            <input
                                                required
                                                type="text"
                                                placeholder="Start typing name, admission number..."
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                                value={userSearchQuery}
                                                onChange={(e) => {
                                                    setUserSearchQuery(e.target.value);
                                                    if (selectedUserObj) {
                                                        setSelectedUserObj(null);
                                                        setDropoffAdmission('');
                                                        setDropoffName('');
                                                    }
                                                }}
                                            />
                                            {/* Autocomplete dropdown suggestions */}
                                            {userSearchResults.length > 0 && (
                                                <div className="absolute left-0 right-0 z-[60] mt-1 bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto">
                                                    {userSearchResults.map((user) => (
                                                        <button
                                                            key={user.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedUserObj(user);
                                                                setDropoffAdmission(user.admission_number);
                                                                setDropoffName(user.full_name);
                                                                setUserSearchQuery(`${user.full_name} (${user.admission_number})`);
                                                                setUserSearchResults([]);
                                                            }}
                                                            className="w-full text-left px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-850/50 last:border-none cursor-pointer"
                                                        >
                                                            <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-100 border shrink-0">
                                                                {user.profile_image ? (
                                                                    <img src={user.profile_image} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-605 font-bold text-xs">
                                                                        {user.full_name[0]}
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="min-w-0 flex-1">
                                                                <div className="text-xs font-bold text-slate-800 dark:text-white truncate">{user.full_name}</div>
                                                                <div className="text-[9px] text-slate-400 font-mono mt-0.5 truncate">{user.admission_number} | {user.school || 'Campus'}</div>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Selected User Details Card */}
                                        {selectedUserObj && (
                                            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-indigo-950/20 border border-indigo-100 dark:border-indigo-900/40 rounded-2xl flex items-center gap-4 animate-scale-in">
                                                <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-200 border border-white dark:border-slate-800 shadow-sm shrink-0">
                                                    {selectedUserObj.profile_image ? (
                                                        <img src={selectedUserObj.profile_image} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center bg-indigo-100 text-indigo-700 font-black text-lg">
                                                            {selectedUserObj.full_name[0]}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 dark:text-white text-xs truncate">{selectedUserObj.full_name}</div>
                                                    <div className="text-[10px] text-indigo-600 dark:text-indigo-400 font-mono mt-0.5">{selectedUserObj.admission_number}</div>
                                                    <div className="text-[9px] text-slate-405 mt-0.5 capitalize">{selectedUserObj.school || 'Campus'}</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Purpose of Visit: Visitor ONLY */}
                                {role === 'visitor' && (
                                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 font-bold">Purpose of Visit</label>
                                        <input 
                                            required 
                                            placeholder="e.g. Meeting with Registrar, General Inquiry"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            onChange={e => setFormData({ ...formData, purpose: e.target.value })} 
                                        />
                                    </div>
                                )}

                                {/* 24h Auto delete option checkbox */}
                                <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mb-2">
                                    <label className="flex items-start gap-3 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={autoDelete24h}
                                            onChange={(e) => setAutoDelete24h(e.target.checked)}
                                            className="rounded border-slate-300 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500/20 w-4.5 h-4.5 mt-0.5 cursor-pointer"
                                        />
                                        <div>
                                            <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block">Auto-Scrub My Data</span>
                                            <span className="text-[10px] text-slate-450 dark:text-slate-500 font-bold block leading-normal mt-0.5">
                                                Automatically delete my name, contact, and ID details from campus records exactly 24 hours after my visit ends.
                                            </span>
                                        </div>
                                    </label>
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => { setStep(1); setError(null); }} 
                                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting} 
                                        className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer"
                                    >
                                        {submitting ? 'Processing...' : <>Submit Request <ArrowRight size={14} /></>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>

            {/* Premium Dynamic Sticky Footer displaying policy menu items */}
            <footer className="w-full text-center text-[10px] text-slate-450 dark:text-slate-500 font-bold py-4 mt-6 border-t border-slate-150/40 dark:border-slate-850/60 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md">
                <span>{companyColors.company_name} Smart Campus Portal &copy; {new Date().getFullYear()} | </span>
                <button 
                    onClick={() => setShowPrivacyModal(true)} 
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer"
                >
                    Privacy Policy
                </button>
                <span> | </span>
                <button 
                    onClick={() => setShowCookieModal(true)} 
                    className="text-indigo-600 dark:text-indigo-400 hover:underline font-bold bg-transparent border-none p-0 cursor-pointer"
                >
                    Cookie Policy
                </button>
            </footer>

            {/* Privacy Policy Modal */}
            {showPrivacyModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[var(--bg-surface)] w-full max-w-4xl rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-slate-50/50 dark:bg-slate-905">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-black text-lg">
                                <Shield className="text-indigo-600" size={20} />
                                {companyColors.company_name} Privacy Policy
                            </div>
                            <button 
                                onClick={() => setShowPrivacyModal(false)} 
                                className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <PrivacyPolicy companyName={companyColors.company_name} />
                        </div>
                        <div className="p-4 border-t border-[var(--border-color)] bg-slate-50/50 dark:bg-slate-905 flex justify-end">
                            <button 
                                onClick={() => setShowPrivacyModal(false)}
                                className="px-5 py-2.5 bg-indigo-650 text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-md cursor-pointer"
                            >
                                I Understand
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Cookie Policy Modal */}
            {showCookieModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[var(--bg-surface)] w-full max-w-4xl rounded-3xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in flex flex-col max-h-[85vh]">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-slate-50/50 dark:bg-slate-905">
                            <div className="flex items-center gap-2 text-slate-800 dark:text-white font-black text-lg">
                                <Shield className="text-indigo-600" size={20} />
                                {companyColors.company_name} Cookie & Storage Policy
                            </div>
                            <button 
                                onClick={() => setShowCookieModal(false)} 
                                className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto flex-1">
                            <CookiePolicy companyName={companyColors.company_name} />
                        </div>
                        <div className="p-4 border-t border-[var(--border-color)] bg-slate-50/50 dark:bg-slate-905 flex justify-end">
                            <button 
                                onClick={() => setShowCookieModal(false)}
                                className="px-5 py-2.5 bg-indigo-650 text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-md cursor-pointer"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

function RoleCard({ icon: Icon, label, desc, onClick, color = "blue" }: any) {
    const colorClasses: any = {
        blue: {
            bg: 'bg-blue-50 dark:bg-blue-950/20',
            text: 'text-blue-600 dark:text-blue-400',
        },
        indigo: {
            bg: 'bg-indigo-50 dark:bg-indigo-950/20',
            text: 'text-indigo-600 dark:text-indigo-400',
        }
    };
    const activeColor = colorClasses[color] || colorClasses.blue;

    return (
        <button 
            onClick={onClick} 
            className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex items-center gap-4 hover:shadow-md hover:border-indigo-500/30 transition-all text-left group active:scale-[0.99] cursor-pointer"
        >
            <div className={`w-12 h-12 rounded-2xl ${activeColor.bg} ${activeColor.text} flex items-center justify-center shadow-inner`}>
                <Icon size={22} />
            </div>
            <div className="flex-1 min-w-0">
                <h3 className="font-black text-slate-900 dark:text-white text-sm">{label}</h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-bold truncate mt-0.5">{desc}</p>
            </div>
            <div className="text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all">
                <ArrowRight size={18} />
            </div>
        </button>
    )
}
