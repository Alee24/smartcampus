import { useState, useEffect, useRef } from 'react'
import { Car, User, Truck, CheckCircle, ArrowRight, UserCheck, Shield, Camera, AlertCircle, RefreshCcw, Upload, FileText, X, Info, Check, Clock, ChevronRight, HelpCircle, Lock, AlertTriangle } from 'lucide-react'
import { PrivacyPolicy } from './privacy/PrivacyPolicy'
import { CookiePolicy } from './privacy/CookiePolicy'

// Helper functions for data sanitization
const cleanName = (val: string) => {
    if (!val) return '';
    return val.trim().split(/\s+/).map(word => {
        if (!word) return '';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(' ');
};

const cleanPhone = (val: string) => {
    if (!val) return '';
    const cleaned = val.replace(/[^\d+]/g, '');
    if (!cleaned) return '';
    if (cleaned.startsWith('+254')) return cleaned;
    if (cleaned.startsWith('254') && cleaned.length === 12) return '+' + cleaned;
    if (cleaned.startsWith('0') && cleaned.length === 10) return '+254' + cleaned.slice(1);
    if (cleaned.length === 9 && (cleaned.startsWith('7') || cleaned.startsWith('1'))) return '+254' + cleaned;
    if (cleaned.length === 10 && !cleaned.startsWith('+')) return '+254' + cleaned;
    return cleaned;
};

const cleanPlate = (val: string) => {
    if (!val) return '';
    const cleaned = val.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    if (!cleaned) return '';
    if (cleaned.length === 7) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else if (cleaned.length === 8) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    } else if (cleaned.length === 6) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    } else {
        if (cleaned.length > 4) {
            const mid = Math.floor(cleaned.length / 2);
            return `${cleaned.slice(0, mid)} ${cleaned.slice(mid)}`;
        }
        return cleaned;
    }
};

export default function SelfServiceEntry({ isEmbedded = false, onBack }: { isEmbedded?: boolean, onBack?: () => void }) {
    const [step, setStep] = useState(1) // 1: Role, 2: Form, 3: Success
    const [role, setRole] = useState('')
    const [gateId, setGateId] = useState('')
    const [formData, setFormData] = useState<any>({})
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const [userData, setUserData] = useState<any>(null)
    const [visitorProfileImage, setVisitorProfileImage] = useState<string | null>(null)

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
    const [isCheckingInOut, setIsCheckingInOut] = useState(false)

    const [companyColors, setCompanyColors] = useState<any>({
        primary_color: '#2563eb',
        secondary_color: '#0284c7',
        accent_color: '#10b981',
        company_name: 'Smart Campus',
        logo_url: ''
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
                        company_name: data.company_name || 'Smart Campus',
                        logo_url: data.logo_url || ''
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
                const parts = data.full_name ? data.full_name.trim().split(/\s+/) : []
                const fName = parts[0] || ''
                const lName = parts.slice(1).join(' ') || ''
                setFormData({
                    ...formData,
                    id_number: idNum,
                    name: data.full_name,
                    first_name: fName,
                    last_name: lName,
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

    const handleStudentSubmit = () => {
        if (!userData?.id) return;
        setResult({
            id_number: userData.admission_number,
            name: userData.full_name,
            visitor_type: 'student'
        });
        setStep(3); // Go to verification stage
    }

    const executeStudentAction = async (action: 'checkin' | 'checkout') => {
        setIsCheckingInOut(true)
        setError(null)
        try {
            const res = await fetch('/api/gate/public/access-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gate_id: gateId,
                    role: 'student',
                    action: action,
                    data: {
                        user_id: userData.id,
                        image: image
                    }
                })
            })
            const data = await res.json()
            if (res.ok) {
                setResult(data)
                setStep(4) // Go to success stage
                if ('vibrate' in navigator) {
                    try { navigator.vibrate(200); } catch (e) {}
                }
            } else {
                setError(data.detail || `Request failed: student could not be checked ${action === 'checkout' ? 'out' : 'in'}.`)
            }
        } catch (err) {
            setError("Connection failed. Please ensure the campus server network is online.")
        } finally {
            setIsCheckingInOut(false)
        }
    }

    const executeVisitorAction = async (action: 'checkin' | 'checkout') => {
        if (!result?.visitor_id) return
        setIsCheckingInOut(true)
        setError(null)
        try {
            let res
            if (action === 'checkout') {
                res = await fetch('/api/gate/visitors/check-out', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ visitor_id: result.visitor_id })
                })
            } else {
                res = await fetch(`/api/gate/visitors/${result.visitor_id}/approve`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                })
            }
            const data = await res.json()
            if (res.ok) {
                setResult({ status: 'success', message: `Successfully checked ${action === 'checkout' ? 'out' : 'in'} visitor.` })
                setStep(4)
                if ('vibrate' in navigator) {
                    try { navigator.vibrate(200); } catch (e) {}
                }
            } else {
                setError(data.detail || `Approval failed: visitor could not be checked ${action === 'checkout' ? 'out' : 'in'}.`)
            }
        } catch (err) {
            setError("Connection failed. Please ensure the campus server network is online.")
        } finally {
            setIsCheckingInOut(false)
        }
    }

    const executeVisitorDecline = async () => {
        if (!result?.visitor_id) {
            window.location.reload()
            return
        }
        setIsCheckingInOut(true)
        setError(null)
        try {
            const res = await fetch(`/api/gate/visitors/${result.visitor_id}/decline`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            if (res.ok) {
                setResult({ status: 'declined', message: "Request declined and deleted from active verification queue." })
                setStep(4)
            } else {
                setError("Failed to decline request.")
            }
        } catch (err) {
            setError("Connection failed.")
        } finally {
            setIsCheckingInOut(false)
        }
    }

    const handleVehicleRegisterSubmit = async (e: any) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        
        const fName = cleanName(formData.first_name || '')
        const lName = cleanName(formData.last_name || '')
        const dContact = cleanPhone(formData.driver_contact || '')
        const pNumber = cleanPlate(formData.plate_number || '')
        const dName = `${fName} ${lName}`.trim()
        
        // Update local state to reflect formatting
        const updatedForm = {
            ...formData,
            first_name: fName,
            last_name: lName,
            driver_contact: dContact,
            plate_number: pNumber,
            driver_name: dName
        }
        setFormData(updatedForm)

        try {
            const res = await fetch('/api/gate/public/access-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gate_id: gateId,
                    role: 'vehicle_registration',
                    data: {
                        first_name: fName,
                        last_name: lName,
                        driver_name: dName || formData.driver_name,
                        driver_id_number: formData.driver_id_number,
                        driver_contact: dContact,
                        plate_number: pNumber,
                        vehicle_role: formData.role || 'student',
                        auto_delete_24h: autoDelete24h
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
            const fName = cleanName(formData.first_name || '')
            const lName = cleanName(formData.last_name || '')
            const mobile = cleanPhone(formData.mobile || '')
            const fullName = `${fName} ${lName}`.trim()
            
            setFormData(prev => ({
                ...prev,
                first_name: fName,
                last_name: lName,
                mobile: mobile,
                name: fullName
            }))
            
            payloadData = {
                first_name: fName,
                last_name: lName,
                name: fullName || formData.name,
                mobile: mobile,
                id_number: formData.id_number,
                purpose: formData.purpose,
                profile_image: visitorProfileImage || undefined,
                auto_delete_24h: autoDelete24h
            }
        } else if (role === 'taxi') {
            const pNumber = cleanPlate(formData.plate_number || '')
            
            setFormData(prev => ({
                ...prev,
                plate_number: pNumber
            }))
            
            payloadData = {
                plate_number: pNumber,
                passengers: formData.passengers || 1,
                purpose: `${taxiServiceType === 'pickup' ? 'Pick Up' : 'Drop Off'}: ${dropoffName || userSearchQuery}`,
                dropoff_admission_number: dropoffAdmission || undefined,
                dropoff_name: dropoffName || undefined,
                is_pickup: taxiServiceType === 'pickup',
                check_in_student: taxiServiceType === 'dropoff',
                auto_delete_24h: autoDelete24h
            }
        } else if (role === 'delivery') {
            const fName = cleanName(formData.first_name || '')
            const lName = cleanName(formData.last_name || '')
            const mobile = cleanPhone(formData.mobile || '')
            const fullName = `${fName} ${lName}`.trim()
            
            setFormData(prev => ({
                ...prev,
                first_name: fName,
                last_name: lName,
                mobile: mobile,
                name: fullName
            }))
            
            payloadData = {
                first_name: fName,
                last_name: lName,
                name: fullName || formData.name,
                mobile: mobile,
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

    const handleCheckInLater = () => {
        setResult({
            status: 'success',
            message: 'Pre-registration saved! You can complete your check-in with the gate guard when you arrive.'
        });
        setStep(4);
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

    const handleVisitorImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            const reader = new FileReader()
            reader.onloadend = () => {
                setVisitorProfileImage(reader.result as string)
            }
            reader.readAsDataURL(file)
        }
    }

    if (step === 3) {
        // Find user name to show
        let displayUserName = '';
        let displayIdNumber = '';
        let roleLabel = '';
        let subDetails = '';

        if (role === 'student') {
            displayUserName = userData?.full_name || '';
            displayIdNumber = userData?.admission_number || '';
            roleLabel = 'Student / Staff';
        } else if (role === 'vehicle_registration') {
            displayUserName = formData.driver_name || '';
            displayIdNumber = formData.driver_id_number || '';
            roleLabel = 'Vehicle Registration';
            subDetails = `Plate: ${formData.plate_number || 'N/A'}`;
        } else if (role === 'visitor') {
            displayUserName = formData.name || '';
            displayIdNumber = formData.id_number || '';
            roleLabel = 'Visitor Check-In';
        } else if (role === 'delivery') {
            displayUserName = formData.name || '';
            displayIdNumber = formData.id_number || '';
            roleLabel = 'Delivery Agent';
            subDetails = formData.delivery_details || '';
        } else if (role === 'taxi') {
            displayUserName = dropoffName || userSearchQuery || 'Taxi Host';
            displayIdNumber = dropoffAdmission || 'N/A';
            roleLabel = `Taxi ${taxiServiceType === 'pickup' ? 'Pick Up' : 'Drop Off'}`;
            subDetails = `Plate: ${formData.plate_number || 'N/A'} | Passengers: ${formData.passengers || 1}`;
        }

        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20 flex items-center justify-center p-4">
                <div className="max-w-xl w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 p-8 text-center animate-scale-in">
                    <div className="w-16 h-16 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-sm overflow-hidden p-2">
                        {companyColors.logo_url ? (
                            <img src={companyColors.logo_url} className="w-full h-full object-contain" alt="Logo" />
                        ) : (
                            <Shield className="text-indigo-650 dark:text-indigo-400" size={32} />
                        )}
                    </div>
                    
                    <span className="text-[10px] bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 font-black uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-200/50 dark:border-indigo-900/50">
                        {roleLabel} Verification Stage
                    </span>

                    <h2 className="text-2xl font-black mt-4 mb-2 text-slate-850 dark:text-white">
                        Verify Your Identity
                    </h2>
                    
                    <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed mb-6">
                        Please prepare and present your physical ID or Passport to the security guard at the gate for verification. Make sure the ID/Passport number shown below matches your document. Note: providing wrong or incorrect details will lead to access being denied.
                    </p>

                    {role === 'taxi' && (
                        <div className="w-full bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl p-4 mb-6 text-left flex gap-3 text-amber-800 dark:text-amber-300 text-xs">
                            <AlertTriangle size={20} className="flex-shrink-0 text-amber-600" />
                            <div>
                                <span className="font-extrabold uppercase tracking-wide block text-[10px] text-amber-700 dark:text-amber-400 mb-0.5">Guard Warning Notice</span>
                                Attention Guard: Please check and confirm that the student shown in the profile picture below is the one being picked up or dropped off from the school before allowing access.
                            </div>
                        </div>
                    )}

                    {/* Prominent ID Number or Student/Staff Photo Display */}
                    <div className="bg-slate-50 dark:bg-slate-905 border border-slate-150 dark:border-slate-850 rounded-2xl p-6 mb-6 flex flex-col items-center justify-center">
                        {role === 'taxi' ? (
                            <>
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3 text-center">
                                    Student / Staff Profile Photo for Verification
                                </div>
                                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-indigo-100 dark:border-indigo-950 shadow-md bg-slate-200 flex items-center justify-center">
                                    {(selectedUserObj?.profile_image || dropoffUser?.profile_image) ? (
                                        <img 
                                            src={selectedUserObj?.profile_image || dropoffUser?.profile_image} 
                                            className="w-full h-full object-cover" 
                                            alt="Student/Staff Profile"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-650 text-3xl font-black">
                                            {(selectedUserObj?.full_name || dropoffName || "Student")[0]}
                                        </div>
                                    )}
                                </div>
                                <div className="mt-3 text-sm font-black text-indigo-650 dark:text-indigo-400 font-mono uppercase tracking-wider">
                                    ID / Admission: {displayIdNumber}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 text-center">
                                    ID / Passport / Admission Number
                                </div>
                                <div className="text-4xl md:text-5xl font-black text-indigo-650 dark:text-indigo-400 font-mono tracking-wider break-words uppercase text-center w-full">
                                    {displayIdNumber}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Visitor/User Info Details */}
                    <div className="text-left bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-850/40 rounded-2xl p-5 mb-8 space-y-3.5">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9px]">Name</span>
                            <span className="text-slate-800 dark:text-white font-black">{displayUserName}</span>
                        </div>
                        {subDetails && (
                            <div className="flex justify-between items-center text-xs border-t border-slate-100 dark:border-slate-850/30 pt-3">
                                <span className="text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider text-[9px]">Details</span>
                                <span className="text-slate-800 dark:text-slate-305 font-bold truncate max-w-[70%]">{subDetails}</span>
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-950/20 border border-red-150 dark:border-red-900/40 text-red-650 dark:text-red-450 text-xs font-bold rounded-2xl flex items-center justify-center gap-2 mb-6">
                            <AlertCircle size={16} /> {error}
                        </div>
                    )}

                    {/* Guard Buttons */}
                    <div className="flex flex-col gap-3">
                        {role === 'student' ? (
                            <div className="flex gap-3">
                                <button
                                    onClick={() => executeStudentAction('checkin')}
                                    disabled={isCheckingInOut}
                                    className="flex-1 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/25 active:scale-95 transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none outline-none"
                                >
                                    {isCheckingInOut ? 'Processing...' : 'Verify & Check In'}
                                </button>
                                <button
                                    onClick={() => executeStudentAction('checkout')}
                                    disabled={isCheckingInOut}
                                    className="flex-1 py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black shadow-lg shadow-rose-650/25 active:scale-95 transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none outline-none"
                                >
                                    {isCheckingInOut ? 'Processing...' : 'Verify & Check Out'}
                                </button>
                            </div>
                        ) : role === 'taxi' && taxiServiceType === 'pickup' ? (
                            <button
                                onClick={() => executeVisitorAction('checkout')}
                                disabled={isCheckingInOut}
                                className="w-full py-4 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-black shadow-lg shadow-rose-600/25 active:scale-95 transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none outline-none"
                            >
                                {isCheckingInOut ? 'Checking Out...' : 'Verify & Check Out'}
                            </button>
                        ) : (
                            <div className="flex flex-col gap-3 w-full">
                                <button
                                    onClick={() => executeVisitorAction('checkin')}
                                    disabled={isCheckingInOut}
                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/25 active:scale-95 transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none outline-none"
                                >
                                    {isCheckingInOut ? 'Checking In...' : 'Verify & Check In'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCheckInLater}
                                    disabled={isCheckingInOut}
                                    className="w-full py-4 bg-purple-650 hover:bg-purple-750 text-white rounded-2xl font-black shadow-lg shadow-purple-650/25 active:scale-95 transition-all text-xs disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer border-none outline-none"
                                >
                                    Check In Later
                                </button>
                            </div>
                        )}

                        <button 
                            onClick={role === 'student' ? () => window.location.reload() : executeVisitorDecline} 
                            disabled={isCheckingInOut}
                            className="w-full py-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 rounded-2xl font-black text-xs active:scale-95 transition-all disabled:opacity-50 cursor-pointer border-none outline-none"
                        >
                            Decline & Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (step === 4) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 text-center animate-scale-in">
                    <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-950/30 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                        <CheckCircle className="text-emerald-600 dark:text-emerald-400 animate-pulse" size={40} />
                    </div>
                    <h2 className="text-2xl font-black mb-2 text-slate-900 dark:text-white">
                        {result?.status === 'declined' ? 'Request Declined' : 'Verification Complete'}
                    </h2>
                    <p className="text-slate-650 dark:text-slate-400 text-sm mb-8 leading-relaxed font-bold">
                        {result?.message}
                    </p>
                    <button 
                        onClick={() => window.location.reload()} 
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 active:scale-95 transition-all mb-3 cursor-pointer border-none"
                    >
                        New Request
                    </button>
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="w-full py-4 border border-slate-200 dark:border-slate-850 text-slate-650 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl font-black text-sm active:scale-95 transition-all cursor-pointer bg-transparent"
                    >
                        Back to Homepage
                    </button>
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
            <input 
                type="file" 
                id="visitor-profile-input" 
                accept="image/*" 
                capture="user" 
                onChange={handleVisitorImageFileChange}
                className="hidden" 
            />

            <div className="max-w-6xl mx-auto w-full relative flex-1 flex flex-col justify-between py-6">
                {/* Header Back Link & Brand — hidden on step 1 (which has its own full-screen layout) */}
                {step !== 1 && (
                <div className="flex justify-between items-center mb-8">
                    {!isEmbedded ? (
                        <button 
                            onClick={() => window.location.href = '/'}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-2xl text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            &larr; Back to Homepage
                        </button>
                    ) : (
                        <button 
                            onClick={onBack}
                            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:text-indigo-650 dark:hover:text-indigo-400 rounded-2xl text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none"
                        >
                            &larr; Return to Homepage
                        </button>
                    )}
                    <div className="flex items-center gap-2 text-slate-800 dark:text-white">
                        {companyColors.logo_url ? (
                            <img src={companyColors.logo_url} className="w-5 h-5 object-contain" alt="Logo" />
                        ) : (
                            <Shield className="text-indigo-600" size={20} />
                        )}
                        <span className="font-black text-sm tracking-wider uppercase">{companyColors.company_name}</span>
                    </div>
                </div>
                )}

                {step === 1 && (
                    <div className="fixed inset-0 flex overflow-hidden" style={{ fontFamily: "'Inter', 'Museo Sans', sans-serif" }}>
                        {/* ── LEFT BRAND PANEL ── */}
                        <div className="hidden lg:flex w-[38%] flex-col justify-between p-10 relative overflow-hidden"
                            style={{ background: 'linear-gradient(160deg, #1e1b4b 0%, #312e81 40%, #4c1d95 100%)' }}>
                            {/* Atmospheric grid overlay */}
                            <div className="absolute inset-0 opacity-10" style={{
                                backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.3) 1px, transparent 1px)',
                                backgroundSize: '28px 28px'
                            }} />
                            {/* Glow orb */}
                            <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-20 blur-3xl"
                                style={{ background: 'radial-gradient(circle, #a78bfa, transparent)' }} />
                            <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-15 blur-3xl"
                                style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />

                            {/* Logo + Brand */}
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-12">
                                    <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/20 flex items-center justify-center p-1.5 overflow-hidden shadow-inner">
                                        {companyColors.logo_url ? (
                                            <img src={companyColors.logo_url} className="w-full h-full object-contain" alt="Logo" />
                                        ) : (
                                            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" className="w-5 h-5">
                                                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        )}
                                    </div>
                                    <span className="text-white/90 font-bold text-sm tracking-widest uppercase">{companyColors.company_name}</span>
                                </div>

                                <div className="space-y-3">
                                    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[10px] font-bold uppercase tracking-widest text-purple-200">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]"></span>
                                        Gate Access Portal
                                    </span>
                                    <h1 className="text-4xl font-black text-white leading-tight tracking-tight">
                                        Self-Service<br/>
                                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg, #a78bfa, #c084fc)' }}>
                                            Registration
                                        </span>
                                    </h1>
                                    <p className="text-sm text-purple-200/70 leading-relaxed font-medium max-w-xs">
                                        Select your visitor category to begin secure entry registration. All records are encrypted and maintained in compliance with privacy regulations.
                                    </p>
                                </div>
                            </div>

                            {/* Trust Badges */}
                            <div className="relative z-10 space-y-4">
                                {[
                                    { icon: '🔐', label: 'End-to-End Encrypted' },
                                    { icon: '🛡️', label: 'Privacy Act Compliant' },
                                    { icon: '⚡', label: 'Real-Time Gate Sync' }
                                ].map(b => (
                                    <div key={b.label} className="flex items-center gap-3 text-purple-200/60 text-xs font-semibold">
                                        <span className="text-sm">{b.icon}</span>
                                        <span>{b.label}</span>
                                    </div>
                                ))}

                                <div className="pt-6 border-t border-white/10 flex items-center gap-4 text-[10px] text-purple-300/40 font-medium">
                                    <button type="button" onClick={() => setShowPrivacyModal(true)} className="hover:text-purple-200 transition-colors bg-transparent border-none p-0 cursor-pointer text-purple-300/40 hover:text-purple-200">Privacy Policy</button>
                                    <span>•</span>
                                    <button type="button" onClick={() => setShowCookieModal(true)} className="hover:text-purple-200 transition-colors bg-transparent border-none p-0 cursor-pointer text-purple-300/40 hover:text-purple-200">Cookie Policy</button>
                                </div>
                            </div>
                        </div>

                        {/* ── RIGHT ROLE SELECTION PANEL ── */}
                        <div className="flex-1 overflow-y-auto flex flex-col"
                            style={{ background: 'linear-gradient(180deg, #0f172a 0%, #111827 100%)' }}>
                            {/* Top bar */}
                            <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 shrink-0">
                                <div className="flex items-center gap-3 lg:hidden">
                                    {companyColors.logo_url ? (
                                        <img src={companyColors.logo_url} className="w-7 h-7 object-contain" alt="Logo" />
                                    ) : (
                                        <svg viewBox="0 0 24 24" fill="none" stroke="rgb(167,139,250)" strokeWidth="1.5" className="w-5 h-5">
                                            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                    )}
                                    <span className="text-white/80 font-bold text-sm tracking-wide">{companyColors.company_name}</span>
                                </div>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-auto">Choose Your Category</span>
                                {!isEmbedded ? (
                                    <button
                                        onClick={() => window.location.href = '/'}
                                        className="ml-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold cursor-pointer outline-none"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                            <path d="M19 12H5M5 12l7-7M5 12l7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Back
                                    </button>
                                ) : (
                                    <button
                                        onClick={onBack}
                                        className="ml-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold cursor-pointer outline-none"
                                    >
                                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
                                            <path d="M19 12H5M5 12l7-7M5 12l7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                        </svg>
                                        Return
                                    </button>
                                )}
                            </div>

                            {/* Role Cards Grid */}
                            <div className="flex-1 flex flex-col justify-center px-8 py-10">
                                <div className="max-w-3xl mx-auto w-full">
                                    <div className="mb-8">
                                        <h2 className="text-2xl font-black text-white tracking-tight">Who are you today?</h2>
                                        <p className="text-slate-500 text-sm mt-1.5">Select the option that best describes your visit to proceed.</p>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                                        {/* VISITOR */}
                                        <button
                                            onClick={() => { setRole('visitor'); setStep(2); setError(null); setFormData({}); setAutoDelete24h(false); }}
                                            className="group relative p-6 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl outline-none focus:ring-2 focus:ring-emerald-500/50"
                                            style={{
                                                background: 'rgba(255,255,255,0.03)',
                                                borderColor: 'rgba(255,255,255,0.08)',
                                                backdropFilter: 'blur(20px)'
                                            }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(16,185,129,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(16,185,129,0.08)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                        >
                                            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-all group-hover:scale-110" style={{ background: 'rgba(16,185,129,0.12)' }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(52,211,153)" strokeWidth="1.5" className="w-6 h-6">
                                                    <circle cx="12" cy="7" r="4" strokeLinecap="round"/>
                                                    <path d="M4 20c0-3.314 3.582-6 8-6s8 2.686 8 6" strokeLinecap="round"/>
                                                    <rect x="8.5" y="13.5" width="7" height="5" rx="1" strokeLinecap="round" strokeDasharray="1.5 1"/>
                                                </svg>
                                            </div>
                                            <h3 className="font-black text-white text-base mb-1.5 tracking-tight">Visitor</h3>
                                            <p className="text-slate-500 text-xs leading-relaxed">Personal visits, business enquiries, guest passes, or general enquiries.</p>
                                            <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-emerald-500/20 group-hover:border-emerald-500/30 transition-all">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-600 group-hover:text-emerald-400">
                                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </button>

                                        {/* TAXI / CAB */}
                                        <button
                                            onClick={() => { setRole('taxi'); setStep(2); setError(null); setFormData({ passengers: 1 }); setAutoDelete24h(false); }}
                                            className="group relative p-6 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl outline-none focus:ring-2 focus:ring-amber-500/50"
                                            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(245,158,11,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(245,158,11,0.08)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                        >
                                            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-all group-hover:scale-110" style={{ background: 'rgba(245,158,11,0.12)' }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(251,191,36)" strokeWidth="1.5" className="w-6 h-6">
                                                    <path d="M5 17H3a1 1 0 01-1-1v-4l2-5h12l2 5v4a1 1 0 01-1 1h-2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <circle cx="7.5" cy="17.5" r="1.5"/>
                                                    <circle cx="16.5" cy="17.5" r="1.5"/>
                                                    <path d="M9 5l1-3h4l1 3" strokeLinecap="round"/>
                                                    <rect x="3" y="10" width="18" height="1" rx="0.5" fill="rgb(251,191,36)" fillOpacity="0.3"/>
                                                </svg>
                                            </div>
                                            <h3 className="font-black text-white text-base mb-1.5 tracking-tight">Taxi / Cab</h3>
                                            <p className="text-slate-500 text-xs leading-relaxed">Drop-offs, passenger pick-ups, or taxi services for students and staff.</p>
                                            <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-amber-500/20 group-hover:border-amber-500/30 transition-all">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-600 group-hover:text-amber-400">
                                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </button>

                                        {/* DELIVERY */}
                                        <button
                                            onClick={() => { setRole('delivery'); setStep(2); setError(null); setFormData({}); setAutoDelete24h(false); }}
                                            className="group relative p-6 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl outline-none focus:ring-2 focus:ring-orange-500/50"
                                            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(249,115,22,0.08)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                        >
                                            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-all group-hover:scale-110" style={{ background: 'rgba(249,115,22,0.12)' }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(251,146,60)" strokeWidth="1.5" className="w-6 h-6">
                                                    <path d="M3 7h18v11a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" strokeLinecap="round"/>
                                                    <path d="M3 7l2-4h14l2 4" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <rect x="9" y="10" width="6" height="5" rx="1" strokeLinecap="round"/>
                                                    <path d="M9 10V9a3 3 0 016 0v1" strokeLinecap="round"/>
                                                </svg>
                                            </div>
                                            <h3 className="font-black text-white text-base mb-1.5 tracking-tight">Delivery</h3>
                                            <p className="text-slate-500 text-xs leading-relaxed">Goods delivery, parcel couriers, package drop-offs, or food delivery.</p>
                                            <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-orange-500/20 group-hover:border-orange-500/30 transition-all">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-600 group-hover:text-orange-400">
                                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </button>

                                        {/* STUDENT / STAFF */}
                                        <button
                                            onClick={() => { setRole('student'); setStep(2); setError(null); setFormData({}); setAutoDelete24h(false); }}
                                            className="group relative p-6 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl outline-none focus:ring-2 focus:ring-indigo-500/50"
                                            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(129,140,248,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(129,140,248,0.08)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                        >
                                            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-all group-hover:scale-110" style={{ background: 'rgba(129,140,248,0.12)' }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(129,140,248)" strokeWidth="1.5" className="w-6 h-6">
                                                    <rect x="3" y="4" width="18" height="16" rx="2" strokeLinecap="round"/>
                                                    <circle cx="9" cy="10" r="2.5"/>
                                                    <path d="M5 19c0-2.21 1.79-4 4-4" strokeLinecap="round"/>
                                                    <path d="M13 8h5M13 12h4M13 16h3" strokeLinecap="round"/>
                                                </svg>
                                            </div>
                                            <h3 className="font-black text-white text-base mb-1.5 tracking-tight">Student / Staff</h3>
                                            <p className="text-slate-500 text-xs leading-relaxed">Campus check-in or checkout verification with real-time physical presence capture.</p>
                                            <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500/20 group-hover:border-indigo-500/30 transition-all">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-600 group-hover:text-indigo-400">
                                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </button>

                                        {/* VEHICLE REGISTRATION */}
                                        <button
                                            onClick={() => { setRole('vehicle_registration'); setStep(2); setError(null); setFormData({ role: 'student' }); setAutoDelete24h(false); }}
                                            className="group relative p-6 rounded-2xl border text-left cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl outline-none focus:ring-2 focus:ring-teal-500/50"
                                            style={{ background: 'rgba(255,255,255,0.03)', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(20px)' }}
                                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(20,184,166,0.4)'; (e.currentTarget as HTMLElement).style.boxShadow = '0 0 40px rgba(20,184,166,0.08)'; }}
                                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                                        >
                                            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center transition-all group-hover:scale-110" style={{ background: 'rgba(20,184,166,0.12)' }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(45,212,191)" strokeWidth="1.5" className="w-6 h-6">
                                                    <path d="M5 17H3a1 1 0 01-1-1v-4l2.5-5.5A2 2 0 016.3 5h11.4a2 2 0 011.8 1.5L22 12v4a1 1 0 01-1 1h-2" strokeLinecap="round" strokeLinejoin="round"/>
                                                    <circle cx="7" cy="17" r="2"/>
                                                    <circle cx="17" cy="17" r="2"/>
                                                    <path d="M4 12h16" strokeLinecap="round"/>
                                                    <path d="M8 8l-2 4M16 8l2 4" strokeLinecap="round"/>
                                                    <rect x="8" y="8" width="8" height="4" rx="0.5" strokeLinecap="round"/>
                                                </svg>
                                            </div>
                                            <h3 className="font-black text-white text-base mb-1.5 tracking-tight">Vehicle Registration</h3>
                                            <p className="text-slate-500 text-xs leading-relaxed">Self-register vehicle details for parking checks and check-in audits.</p>
                                            <div className="absolute top-5 right-5 w-7 h-7 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-teal-500/20 group-hover:border-teal-500/30 transition-all">
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-600 group-hover:text-teal-400">
                                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </div>
                                        </button>

                                        {/* HELP DESK */}
                                        <div className="relative p-6 rounded-2xl border text-left select-none"
                                            style={{ background: 'rgba(255,255,255,0.015)', borderColor: 'rgba(255,255,255,0.06)', backdropFilter: 'blur(20px)' }}>
                                            <div className="absolute top-4 right-4">
                                                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-slate-800 text-slate-500 border border-slate-700">Help Desk</span>
                                            </div>
                                            <div className="w-12 h-12 rounded-xl mb-4 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
                                                <svg viewBox="0 0 24 24" fill="none" stroke="rgb(100,116,139)" strokeWidth="1.5" className="w-6 h-6">
                                                    <circle cx="12" cy="12" r="9"/>
                                                    <path d="M7 8.5C7 6 9 4.5 12 4.5s5 1.5 5 4c0 2.5-2 3.5-3.5 4.5V15" strokeLinecap="round"/>
                                                    <circle cx="12" cy="18.5" r="1" fill="rgb(100,116,139)"/>
                                                </svg>
                                            </div>
                                            <h3 className="font-black text-slate-400 text-base mb-1.5 tracking-tight">Need Assistance?</h3>
                                            <p className="text-slate-600 text-xs leading-relaxed mb-4">Please consult gate security officers or dial campus helpline <strong className="text-slate-500">100</strong> for support.</p>
                                            <button
                                                type="button"
                                                onClick={() => setShowPrivacyModal(true)}
                                                className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-300 transition-colors bg-transparent border-none p-0 cursor-pointer group/link"
                                            >
                                                Data Protection Details
                                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3 h-3 group-hover/link:translate-x-1 transition-transform">
                                                    <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round"/>
                                                </svg>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="max-w-5xl mx-auto w-full relative flex-1 animate-slide-in flex flex-col justify-center">
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                            {/* Left Pane (40%): Immersive Branding, role guidelines, and Data Protection Act notices */}
                            <div className="lg:col-span-5 bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 text-white rounded-3xl p-8 flex flex-col justify-between shadow-xl min-h-[400px] order-1 lg:order-1">
                                <div className="space-y-6">
                                    <div className="flex justify-between items-start">
                                        <div className="p-1.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner flex items-center justify-center w-14 h-14 overflow-hidden shrink-0">
                                            {companyColors.logo_url ? (
                                                <img src={companyColors.logo_url} className="w-full h-full object-contain" alt="Logo" />
                                            ) : (
                                                <Shield className="text-white" size={26} />
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <span className="text-[10px] text-indigo-200 font-black uppercase tracking-wider block">
                                            {companyColors.company_name}
                                        </span>
                                        <h2 className="text-3xl font-black mt-1 capitalize leading-snug">
                                            {role === 'student' ? 'Verify Identity' : role === 'vehicle_registration' ? 'Vehicle Details' : `${role} Registration`}
                                        </h2>
                                        <p className="text-xs text-indigo-150 font-medium leading-relaxed mt-3">
                                            {role === 'visitor' && "Welcome! Please enter your details in the form to register for gate entry. Ensure your ID/Passport and phone number are correct, as the security guard will verify them against your physical document. Incorrect details will result in denied access. We collect your personal details (Full Name, Phone Number, and ID/Passport Number) strictly for gate entry verification and safety audit logs."}
                                            {role === 'taxi' && "Please provide the taxi license plate number and the number of passengers. Use the search field to look up the student or staff member you are picking up or dropping off. We collect taxi and driver details strictly for gate entry verification and safety audit logs."}
                                            {role === 'delivery' && "Please input your details and delivery description. Capture clear photos of the delivery package and receipt for campus security check-in records. We collect delivery and vehicle details strictly for gate entry verification and safety audit logs."}
                                            {role === 'student' && "Confirm your pre-loaded student/staff profile and take a quick selfie to verify your physical presence at the gate. We collect validation details strictly for gate entry verification and safety audit logs."}
                                            {role === 'vehicle_registration' && "Self-register your vehicle details under your campus role (Student, Staff, or Visitor) for parking and gate audit records. We collect vehicle and personal details strictly for gate entry verification and safety audit logs."}
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 pt-4 border-t border-white/10 flex flex-col gap-3">
                                    <div className="text-[10px] text-indigo-200 font-bold flex justify-between items-center">
                                        <span>{companyColors.company_name} | Smart Gate</span>
                                        <span>v1.2.0</span>
                                    </div>
                                    <div className="text-[10px] text-indigo-200 font-semibold flex items-center gap-2">
                                        <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-white hover:underline font-bold bg-transparent border-none p-0 cursor-pointer">Privacy Policy</button>
                                        <span>•</span>
                                        <button type="button" onClick={() => setShowCookieModal(true)} className="text-white hover:underline font-bold bg-transparent border-none p-0 cursor-pointer">Cookie Policy</button>
                                    </div>
                                </div>
                            </div>

                            {/* Right Pane (60%): Interactive Input Form */}
                            <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-xl flex flex-col justify-between order-2 lg:order-2">
                                <div className="w-full">
                                    {role === 'student' ? (
                                        userData ? (
                                            <div className="space-y-6 text-center">
                                                <div className="p-6 bg-gradient-to-br from-indigo-50 to-purple-50/50 dark:from-slate-800/40 dark:to-slate-950/20 border border-slate-100 dark:border-slate-800 rounded-2xl text-left flex items-center gap-4">
                                                    <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-200 border shadow-sm shrink-0">
                                                        {userData.profile_image ? (
                                                            <img src={userData.profile_image} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-650 font-black text-xl">
                                                                {userData.full_name[0]}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="font-black text-slate-850 dark:text-white text-base truncate">{userData.full_name}</div>
                                                        <div className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono mt-0.5 uppercase">{userData.admission_number}</div>
                                                        <div className="mt-1 text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-455 px-2.5 py-0.5 rounded-lg inline-block font-black uppercase tracking-wider">
                                                            Authenticated User
                                                        </div>
                                                    </div>
                                                </div>

                                                <p className="text-slate-500 dark:text-slate-400 text-xs font-bold leading-relaxed text-left pl-1">
                                                    Please capture a verification photo of the gate/surroundings to confirm your physical presence.
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
                                                                        className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 text-xs cursor-pointer border-none outline-none"
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
                                                                className="absolute bottom-4 right-4 bg-white/95 text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow hover:bg-white flex items-center gap-1.5 transition-all cursor-pointer border-none"
                                                            >
                                                                <RefreshCcw size={12} /> Retake
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-3 pt-2">
                                                    <button 
                                                        onClick={() => { setStep(1); setError(null); }} 
                                                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-805 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-xs active:scale-95 transition-all cursor-pointer border-none"
                                                    >
                                                        Cancel
                                                    </button>

                                                    {cameraActive && !image && (
                                                        <button 
                                                            onClick={takePhoto} 
                                                            className="flex-[2] py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer border-none"
                                                        >
                                                            <Camera size={14} /> Capture Photo
                                                        </button>
                                                    )}

                                                    {image && (
                                                        <button
                                                            onClick={handleStudentSubmit}
                                                            disabled={submitting}
                                                            className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer border-none"
                                                        >
                                                            {submitting ? 'Verifying...' : 'Submit Verification'}
                                                        </button>
                                                    )}

                                                    {!cameraActive && !image && (
                                                        <button 
                                                            disabled 
                                                            className="flex-[2] py-3.5 bg-slate-100 text-slate-400 dark:bg-slate-805/50 dark:text-slate-600 rounded-2xl font-black text-xs cursor-not-allowed border-none"
                                                        >
                                                            Capture Photo First
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ) : (
                                            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                                <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-2xl text-xs font-bold leading-relaxed">
                                                    You are currently logged out. Start by logging into your account to perform gate pass checks.
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => window.location.href = '/'} 
                                                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-755 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 text-xs active:scale-95 transition-all cursor-pointer border-none"
                                                >
                                                    Go to Login Page
                                                </button>
                                                <button 
                                                    type="button" 
                                                    onClick={() => { setStep(1); setError(null); }} 
                                                    className="w-full py-3.5 text-slate-500 hover:text-slate-850 dark:hover:text-slate-355 text-xs font-black cursor-pointer border-none bg-transparent"
                                                >
                                                    Back to Categories
                                                </button>
                                            </form>
                                        )
                                    ) : role === 'vehicle_registration' ? (
                                        <form className="space-y-4" onSubmit={handleVehicleRegisterSubmit}>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">First Name</label>
                                                    <input 
                                                        required 
                                                        placeholder="First Name"
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/85 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                        value={formData.first_name || ''}
                                                        onChange={e => setFormData({ ...formData, first_name: e.target.value })} 
                                                        onBlur={e => setFormData({ ...formData, first_name: cleanName(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Last Name</label>
                                                    <input 
                                                        required 
                                                        placeholder="Last Name"
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/85 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                        value={formData.last_name || ''}
                                                        onChange={e => setFormData({ ...formData, last_name: e.target.value })} 
                                                        onBlur={e => setFormData({ ...formData, last_name: cleanName(e.target.value) })}
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Phone Number</label>
                                                    <input 
                                                        required 
                                                        type="tel"
                                                        placeholder="e.g. 0712345678"
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/85 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                        value={formData.driver_contact || ''}
                                                        onChange={e => setFormData({ ...formData, driver_contact: e.target.value })} 
                                                        onBlur={e => setFormData({ ...formData, driver_contact: cleanPhone(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">ID / Passport No</label>
                                                    <input 
                                                        required 
                                                        placeholder="ID Number"
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/85 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                        value={formData.driver_id_number || ''}
                                                        onChange={e => setFormData({ ...formData, driver_id_number: e.target.value })} 
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Vehicle Plate</label>
                                                    <input 
                                                        required
                                                        placeholder="KCA 123A"
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/85 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white font-mono uppercase"
                                                        value={formData.plate_number || ''}
                                                        onChange={e => setFormData({ ...formData, plate_number: e.target.value })} 
                                                        onBlur={e => setFormData({ ...formData, plate_number: cleanPlate(e.target.value) })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Your Role</label>
                                                    <select
                                                        required
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/85 rounded-2xl border border-slate-150 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
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
                                                        className="rounded border-slate-350 dark:border-slate-800 text-indigo-605 focus:ring-indigo-500/20 w-4.5 h-4.5 mt-0.5 cursor-pointer"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block font-bold">Auto-Scrub My Data</span>
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
                                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-205 dark:bg-slate-805 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer border-none"
                                                >
                                                    Back
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={submitting} 
                                                    className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-755 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 cursor-pointer border-none"
                                                >
                                                    {submitting ? 'Submitting...' : <>Submit Request <ArrowRight size={14} /></>}
                                                </button>
                                            </div>
                                        </form>
                                    ) : (
                                        <form className="space-y-4" onSubmit={handleSubmit}>
                                            {/* ID / Passport / Admission Number first */}
                                            {role !== 'taxi' && (
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-widest block mb-1.5 font-bold">ID / Passport / Admission Number</label>
                                                    <input 
                                                        required 
                                                        placeholder="e.g. ID, Passport or Admission Number"
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                        value={formData.id_number || ''}
                                                        onChange={e => setFormData({ ...formData, id_number: e.target.value })} 
                                                    />
                                                </div>
                                            )}

                                            {/* Lookup Button right below ID */}
                                            {role !== 'taxi' && (
                                                <button
                                                    type="button"
                                                    onClick={() => lookupVisitor(formData.id_number)}
                                                    disabled={loadingVisitor || !formData.id_number}
                                                    className="w-full py-3.5 bg-slate-900 hover:bg-black dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-2xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer border-none shadow-sm flex items-center justify-center gap-2 mb-2"
                                                >
                                                    {loadingVisitor ? 'Searching Records...' : 'Lookup Existing Visitor Details'}
                                                </button>
                                            )}

                                            {/* Name Fields */}
                                            {role !== 'taxi' && (
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">First Name</label>
                                                        <input 
                                                            required 
                                                            placeholder="First Name"
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                            value={formData.first_name || ''}
                                                            onChange={e => setFormData({ ...formData, first_name: e.target.value })} 
                                                            onBlur={e => setFormData({ ...formData, first_name: cleanName(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Last Name</label>
                                                        <input 
                                                            required 
                                                            placeholder="Last Name"
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                            value={formData.last_name || ''}
                                                            onChange={e => setFormData({ ...formData, last_name: e.target.value })} 
                                                            onBlur={e => setFormData({ ...formData, last_name: cleanName(e.target.value) })}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Phone Number */}
                                            {role !== 'taxi' && (
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-widest block mb-1.5 font-bold">Phone Number</label>
                                                    <input 
                                                        required 
                                                        type="tel"
                                                        placeholder="e.g. 0712345678"
                                                        className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                        value={formData.mobile || ''}
                                                        onChange={e => setFormData({ ...formData, mobile: e.target.value })} 
                                                        onBlur={e => setFormData({ ...formData, mobile: cleanPhone(e.target.value) })}
                                                    />
                                                </div>
                                            )}

                                            {/* Vehicle Fields for Taxi ONLY */}
                                            {role === 'taxi' && (
                                                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Vehicle Plate</label>
                                                        <input 
                                                            required
                                                            placeholder="KCA 123A"
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-855 dark:text-white font-mono uppercase"
                                                            value={formData.plate_number || ''}
                                                            onChange={e => setFormData({ ...formData, plate_number: e.target.value })} 
                                                            onBlur={e => setFormData({ ...formData, plate_number: cleanPlate(e.target.value) })}
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Passengers</label>
                                                        <input 
                                                            type="number" 
                                                            min="1" 
                                                            required
                                                            value={formData.passengers || 1}
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-855 dark:text-white"
                                                            onChange={e => setFormData({ ...formData, passengers: e.target.value })} 
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Specifics for Delivery */}
                                            {role === 'delivery' && (
                                                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold">Delivery Details</label>
                                                        <input 
                                                            required 
                                                            placeholder="e.g. DHL Package for Admin Office" 
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-855 dark:text-white"
                                                            value={formData.delivery_details || ''}
                                                            onChange={e => setFormData({ ...formData, delivery_details: e.target.value })} 
                                                        />
                                                    </div>

                                                    {/* Pictures of Package & Receipt */}
                                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                                        {/* Package Image Card */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block font-bold">Delivery Package Photo</label>
                                                            {!deliveryPackageImage ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => document.getElementById('delivery-package-input')?.click()}
                                                                    className="w-full aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-650 hover:border-indigo-500/30 transition-all bg-slate-50 dark:bg-slate-850 cursor-pointer"
                                                                >
                                                                    <Camera size={18} />
                                                                    <span className="text-[9px] font-bold mt-1">Capture</span>
                                                                </button>
                                                            ) : (
                                                                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                                                    <img src={deliveryPackageImage} className="w-full h-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeliveryPackageImage(null)}
                                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-bold opacity-0 hover:opacity-100 transition-opacity cursor-pointer border-none"
                                                                    >
                                                                        Remove
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Receipt Image Card */}
                                                        <div className="space-y-1.5">
                                                            <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase block font-bold">Receipt / Note Photo</label>
                                                            {!deliveryReceiptImage ? (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => document.getElementById('delivery-receipt-input')?.click()}
                                                                    className="w-full aspect-video border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 hover:text-indigo-655 hover:border-indigo-500/30 transition-all bg-slate-50 dark:bg-slate-850 cursor-pointer"
                                                                >
                                                                    <FileText size={18} />
                                                                    <span className="text-[9px] font-bold mt-1">Capture</span>
                                                                </button>
                                                            ) : (
                                                                <div className="relative aspect-video rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
                                                                    <img src={deliveryReceiptImage} className="w-full h-full object-cover" />
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setDeliveryReceiptImage(null)}
                                                                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[9px] font-bold opacity-0 hover:opacity-100 transition-opacity cursor-pointer border-none"
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
                                                <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-4 font-sans">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold font-bold font-bold font-bold">Service Type</label>
                                                        <div className="grid grid-cols-2 gap-4">
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
                                                                className={`py-3.5 px-4 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                                                                    taxiServiceType === 'dropoff'
                                                                        ? 'bg-indigo-600 text-white border-indigo-650 shadow-lg shadow-indigo-600/20'
                                                                        : 'bg-slate-50 dark:bg-slate-850 border-slate-150 dark:border-slate-805 text-slate-700 dark:text-slate-300'
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
                                                                className={`py-3.5 px-4 rounded-xl text-xs font-black border transition-all active:scale-95 cursor-pointer ${
                                                                    taxiServiceType === 'pickup'
                                                                        ? 'bg-indigo-600 text-white border-indigo-650 shadow-lg shadow-indigo-600/20'
                                                                        : 'bg-slate-50 dark:bg-slate-850 border-slate-150 dark:border-slate-805 text-slate-700 dark:text-slate-300'
                                                                }`}
                                                            >
                                                                Pick Up
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="relative">
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1.5 font-bold font-bold font-bold">
                                                            Search Student / Staff (Name or Admission/ID)
                                                        </label>
                                                        <input
                                                            required
                                                            type="text"
                                                            placeholder="Start typing name, admission number..."
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
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
                                                                        className="w-full text-left px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-850 flex items-center gap-3 transition-colors border-b border-slate-100 dark:border-slate-850/50 last:border-none cursor-pointer border-none bg-transparent"
                                                                    >
                                                                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-105 border shrink-0">
                                                                            {user.profile_image ? (
                                                                                <img src={user.profile_image} className="w-full h-full object-cover" />
                                                                            ) : (
                                                                                <div className="w-full h-full flex items-center justify-center bg-indigo-50 text-indigo-650 font-bold text-xs">
                                                                                    {user.full_name[0]}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="min-w-0 flex-1">
                                                                            <div className="text-xs font-bold text-slate-805 dark:text-white truncate">{user.full_name}</div>
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
                                                            <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-205 border border-white dark:border-slate-800 shadow-sm shrink-0">
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
                                                                <div className="text-[9px] text-slate-400 mt-0.5 capitalize">{selectedUserObj.school || 'Campus'}</div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {/* Purpose of Visit: Visitor ONLY */}
                                            {role === 'visitor' && (
                                                <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-4">
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-widest block mb-1.5 font-bold">Purpose of Visit</label>
                                                        <input 
                                                            required 
                                                            placeholder="e.g. Meeting with Registrar, General Inquiry"
                                                            className="w-full p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-150 dark:border-slate-85 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-850 dark:text-white"
                                                            value={formData.purpose || ''}
                                                            onChange={e => setFormData({ ...formData, purpose: e.target.value })} 
                                                        />
                                                    </div>
                                                    
                                                    <div className="space-y-1.5">
                                                        <label className="text-[10px] font-black text-slate-400 dark:text-slate-505 uppercase tracking-widest block mb-1.5 font-bold">Your Profile Photo (Optional)</label>
                                                        {!visitorProfileImage ? (
                                                            <button
                                                                type="button"
                                                                onClick={() => document.getElementById('visitor-profile-input')?.click()}
                                                                className="w-full py-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-450 dark:text-slate-500 hover:text-indigo-650 hover:border-indigo-500/30 transition-all bg-slate-50 dark:bg-slate-850 cursor-pointer"
                                                            >
                                                                <Camera size={20} className="text-slate-450" />
                                                                <span className="text-[10px] font-black mt-1 uppercase tracking-wider">Take Selfie / Upload Photo</span>
                                                            </button>
                                                        ) : (
                                                            <div className="relative w-32 h-32 mx-auto rounded-full overflow-hidden border-2 border-slate-200 dark:border-slate-800 shadow-md">
                                                                <img src={visitorProfileImage} className="w-full h-full object-cover" alt="Selfie Preview" />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setVisitorProfileImage(null)}
                                                                    className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-[10px] font-black uppercase tracking-wider opacity-0 hover:opacity-100 transition-opacity cursor-pointer border-none"
                                                                >
                                                                    Remove
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}

                                            {/* 24h Auto delete option checkbox */}
                                            <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mb-2">
                                                <label className="flex items-start gap-3 cursor-pointer select-none">
                                                    <input
                                                        type="checkbox"
                                                        checked={autoDelete24h}
                                                        onChange={(e) => setAutoDelete24h(e.target.checked)}
                                                        className="rounded border-slate-350 dark:border-slate-800 text-indigo-650 focus:ring-indigo-500/20 w-4.5 h-4.5 mt-0.5 cursor-pointer"
                                                    />
                                                    <div>
                                                        <span className="text-xs font-black text-slate-800 dark:text-white uppercase tracking-wider block font-bold">Auto-Scrub My Data</span>
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
                                                    className="flex-1 py-4 bg-slate-100 hover:bg-slate-205 dark:bg-slate-805 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-xs transition-all active:scale-95 cursor-pointer border-none"
                                                >
                                                    Back
                                                </button>
                                                <button 
                                                    type="submit"
                                                    disabled={submitting} 
                                                    className="flex-[2] py-4 bg-indigo-600 hover:bg-indigo-705 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95 cursor-pointer border-none"
                                                >
                                                    {submitting ? 'Processing...' : <>Submit Request <ArrowRight size={14} /></>}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Premium Dynamic Sticky Footer displaying policy menu items */}
            <footer className="w-full text-center text-[10px] text-slate-450 dark:text-slate-500 font-bold py-4 mt-8 border-t border-slate-150/40 dark:border-slate-850/60 bg-white/20 dark:bg-slate-950/20 backdrop-blur-md">
                <span>{companyColors.company_name} Smart Gate Portal &copy; {new Date().getFullYear()} | </span>
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
                                className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer border-none bg-transparent"
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
                                className="px-5 py-2.5 bg-indigo-650 text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-md cursor-pointer border-none"
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
                                className="p-2 text-slate-400 hover:text-red-500 rounded-full transition-colors cursor-pointer border-none bg-transparent"
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
                                className="px-5 py-2.5 bg-indigo-650 text-white font-black rounded-xl text-xs active:scale-95 transition-all shadow-md cursor-pointer border-none"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}function RoleCard({ icon: Icon, label, desc, onClick, color = "blue" }: any) {
    const colorClasses: any = {
        blue: {
            bg: 'from-blue-500/20 to-indigo-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/30',
            glow: 'hover:shadow-blue-500/10 hover:border-blue-400/50'
        },
        indigo: {
            bg: 'from-indigo-500/20 to-purple-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/30',
            glow: 'hover:shadow-indigo-500/10 hover:border-indigo-400/50'
        },
        purple: {
            bg: 'from-purple-500/20 to-pink-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800/30',
            glow: 'hover:shadow-purple-500/10 hover:border-purple-400/50'
        },
        amber: {
            bg: 'from-amber-500/20 to-orange-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/30',
            glow: 'hover:shadow-amber-500/10 hover:border-amber-400/50'
        },
        emerald: {
            bg: 'from-emerald-500/20 to-teal-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/30',
            glow: 'hover:shadow-emerald-500/10 hover:border-emerald-400/50'
        }
    };
    const activeColor = colorClasses[color] || colorClasses.blue;

    return (
        <button 
            onClick={onClick} 
            className={`w-full bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-color)] shadow-md flex flex-col justify-between h-56 text-left group hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 active:scale-[0.98] cursor-pointer ${activeColor.glow}`}
        >
            <div className="flex items-start justify-between w-full mb-4">
                {/* Modern Double Layer Glow Badge for Icon */}
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-tr ${activeColor.bg} flex items-center justify-center shadow-lg border group-hover:scale-110 transition-transform duration-300`}>
                    <Icon size={26} className="transition-transform group-hover:rotate-6 duration-300" />
                </div>
                <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 border border-[var(--border-color)] flex items-center justify-center text-slate-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 group-hover:scale-110 transition-all duration-300">
                    <ArrowRight size={16} />
                </div>
            </div>
            <div className="mt-auto">
                <h3 className="font-extrabold text-[var(--text-primary)] text-lg leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-300">{label}</h3>
                <p className="text-xs text-[var(--text-secondary)] font-medium mt-2 leading-relaxed">{desc}</p>
            </div>
        </button>
    )
}
