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
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
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
    const [importing, setImporting] = useState(false)
    const qrScannerRef = useRef<Html5Qrcode | null>(null)
    const printRef = useRef<HTMLDivElement>(null)

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

        fetchUserData()
        fetchCompanySettings()
    }, [])

    const playSuccessSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
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

    const handleVerify = async (qOverride?: string, isScanned = false) => {
        const searchQuery = qOverride || query
        if (!searchQuery.trim()) return
        setQuery(searchQuery)
        setLoading(true)
        setShowCard(false)
        setResult(null)
        setShowSuggestions(false)
        try {
            const res = await fetch(`/api/users/verify/${encodeURIComponent(searchQuery)}`)
            if (res.ok) {
                const data = await res.json()
                setResult(data)
                if (!data.ad_found) {
                    setTimeout(() => {
                        setShowCard(true)
                        setEditData({ full_name: data.full_name, school: data.school })
                        playSuccessSound()
                    }, 300)

                    // If scanned via QR scanner, automatically check in / check out depending on current status
                    if (isScanned) {
                        try {
                            const token = localStorage.getItem('token')
                            const action = data.gate_status === 'In' ? 'check-out' : 'check-in'
                            const gateRes = await fetch(`/api/gate/${action}/${encodeURIComponent(data.admission_number)}`, {
                                method: 'POST',
                                headers: { 'Authorization': `Bearer ${token}` }
                            })
                            if (gateRes.ok) {
                                const gateData = await gateRes.json()
                                showNotification(`Auto ${action === 'check-in' ? 'Checked In' : 'Checked Out'}: ${data.full_name} at ${gateData.time}`, 'success')
                                
                                // Refresh verification details to show the updated gate status
                                const refreshRes = await fetch(`/api/users/verify/${encodeURIComponent(searchQuery)}`)
                                if (refreshRes.ok) {
                                    const refreshedData = await refreshRes.json()
                                    setResult(refreshedData)
                                }
                            } else {
                                const errData = await gateRes.json()
                                showNotification(errData.detail || `Auto ${action} failed`, 'error')
                            }
                        } catch (err) {
                            showNotification('Auto gate-log failed', 'error')
                        }
                    }
                }
            } else {
                setResult({ error: 'Student not found' })
            }
        } catch (e) {
            setResult({ error: 'Verification failed. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const handleQueryChange = async (val: string) => {
        setQuery(val)
        if (val.length >= 2) {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`/api/users/search?q=${val}`, { headers: { 'Authorization': `Bearer ${token}` } })
                if (res.ok) {
                    setSuggestions(await res.json())
                    setShowSuggestions(true)
                }
            } catch (e) { }
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }

    const handleImportAD = async (adData: any) => {
        setImporting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/import-ad-student', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adData)
            })

            if (res.ok) {
                const data = await res.json()
                showNotification(`Successfully imported student from Active Directory!`, 'success')
                setResult(data)
                setTimeout(() => {
                    setShowCard(true)
                    setEditData({ full_name: data.full_name, school: data.school })
                    playSuccessSound()
                }, 300)
            } else {
                const err = await res.json()
                showNotification(err.detail || 'Failed to import student', 'error')
            }
        } catch (e) {
            showNotification('Network error during import', 'error')
        } finally {
            setImporting(false)
        }
    }

    const handlePrint = async () => {
        if (!result) return
        setIsPrinting(true)
        showNotification('Generating high-resolution ID card...', 'info')
        try {
            const front = document.getElementById(`printable-front-${result.id}`)
            const back = document.getElementById(`printable-back-${result.id}`)
            if (!front || !back) {
                showNotification('Error: Printable elements not found', 'error')
                return
            }
            await document.fonts.ready;
            const canvasFront = await html2canvas(front, { scale: 3, useCORS: true, backgroundColor: null })
            const canvasBack = await html2canvas(back, { scale: 3, useCORS: true, backgroundColor: null })
            const pdf = new jsPDF('p', 'mm', 'a4')
            const margin = 20
            const cardWidth = 85.6
            const cardHeight = 53.98
            pdf.setFontSize(10)
            pdf.text("Student ID Card (Front)", margin, margin - 5)
            pdf.addImage(canvasFront.toDataURL('image/png'), 'PNG', margin, margin, cardWidth, cardHeight)
            pdf.text("Student ID Card (Back)", margin, margin + cardHeight + 15)
            pdf.addImage(canvasBack.toDataURL('image/png'), 'PNG', margin, margin + cardHeight + 20, cardWidth, cardHeight)
            pdf.save(`ID_Card_${result.admission_number}.pdf`)
            showNotification('ID Card downloaded successfully!', 'success')
        } catch (e) {
            showNotification('Failed to generate PDF', 'error')
        } finally {
            setIsPrinting(false)
        }
    }

    const handleImageUpload = (file: File) => {
        if (!result) return
        const url = URL.createObjectURL(file)
        setPreviewUrl(url)
        setRotation(0)
        setPinModal({ show: true, pin: '', file })
    }

    const rotateImage = () => setRotation((prev) => (prev + 90) % 360)

    const submitSecureImageUpdate = async () => {
        if (!pinModal.file || !result) return
        setUploadingImage(true)
        try {
            const formData = new FormData()
            formData.append('file', pinModal.file)
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
                showNotification('Profile picture updated successfully', 'success')
            } else {
                const data = await res.json()
                showNotification(data.detail || 'Invalid Supervisor PIN', 'error')
            }
        } catch (e) {
            showNotification('Network error updating image', 'error')
        } finally {
            setUploadingImage(false)
        }
    }

    const startScanner = async () => {
        setIsScanning(true)
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader")
                qrScannerRef.current = scanner
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        setQuery(decodedText)
                        stopScanner()
                        handleVerify(decodedText, true)
                    },
                    () => {}
                )
            } catch (err) {
                showNotification(`Could not start camera`, "error")
                setIsScanning(false)
            }
        }, 300)
    }

    const stopScanner = async () => {
        if (qrScannerRef.current) {
            try {
                await qrScannerRef.current.stop()
                qrScannerRef.current = null
            } catch (err) { console.error(err) }
        }
        setIsScanning(false)
    }

    const canEdit = currentUser && ['SuperAdmin', 'Security'].includes(currentUser.role)

    return (
        <div className="p-3 md:p-6 relative overflow-hidden min-h-screen">
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .animate-float { animation: float 10s ease-in-out infinite; }
            `}</style>

            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20"></div>

            <div className="relative max-w-6xl mx-auto">
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Shield className="text-purple-600" size={32} />
                        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            ID Verification
                        </h1>
                    </div>
                </div>

                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-2 flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => handleQueryChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                                    placeholder="Enter Admission Number..."
                                    className="w-full pl-12 pr-4 py-4 bg-transparent text-lg font-medium focus:outline-none uppercase"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                        {suggestions.map((s, idx) => (
                                            <button 
                                                key={idx}
                                                className="w-full text-left px-4 py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b border-gray-50 dark:border-gray-700/50 flex items-center gap-3 transition-colors last:border-none"
                                                onClick={() => {
                                                    setQuery(s.admission_number)
                                                    setShowSuggestions(false)
                                                    handleVerify(s.admission_number)
                                                }}
                                            >
                                                <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 overflow-hidden shrink-0">
                                                    {s.profile_image ? <img src={s.profile_image} className="w-full h-full object-cover" /> : <User size={20} className="m-auto mt-2.5 text-purple-600" />}
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900 dark:text-white font-mono">{s.admission_number}</div>
                                                    <div className="text-xs font-bold text-gray-500">{s.full_name}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleVerify}
                                    disabled={loading || !query.trim()}
                                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50"
                                >
                                    {loading ? <Loader2 className="animate-spin" /> : 'Verify'}
                                </button>
                                <button
                                    onClick={startScanner}
                                    className="px-4 py-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl"
                                >
                                    <QrCode size={24} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isScanning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md relative">
                            <button onClick={stopScanner} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full"><XCircle /></button>
                            <div id="qr-reader" className="w-full aspect-square bg-black rounded-2xl overflow-hidden"></div>
                        </div>
                    </div>
                )}

                {result && !result.error && !result.ad_found && (
                    <div className={`max-w-4xl mx-auto transition-all duration-500 ${showCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="mb-6 flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex gap-3">
                                {result.gate_status === 'In' ? (
                                    <button onClick={() => handleGateAction('check-out')} disabled={!!actionLoading} className="py-4 px-8 bg-red-600 text-white rounded-2xl font-black shadow-lg flex items-center gap-2">
                                        {actionLoading === 'check-out' ? <Loader2 className="animate-spin" /> : <LogOut />} CHECK OUT
                                    </button>
                                ) : (
                                    <button onClick={() => handleGateAction('check-in')} disabled={!!actionLoading} className="py-4 px-8 bg-green-600 text-white rounded-2xl font-black shadow-lg flex items-center gap-2">
                                        {actionLoading === 'check-in' ? <Loader2 className="animate-spin" /> : <LogIn />} CHECK IN
                                    </button>
                                )}
                                <button onClick={handlePrint} disabled={isPrinting} className="py-4 px-6 bg-slate-100 rounded-2xl font-bold flex items-center gap-2">
                                    {isPrinting ? <Loader2 className="animate-spin" /> : <Printer />} Print ID
                                </button>
                                <button onClick={() => setIsFlipped(!isFlipped)} className="py-4 px-6 bg-purple-600 text-white rounded-2xl font-bold flex items-center gap-2">
                                    <RefreshCcw /> Flip Card
                                </button>
                            </div>
                        </div>

                        <div className="w-full max-w-4xl mx-auto">
                            {(() => {
                                const nameParts = result.full_name ? result.full_name.trim().split(/\s+/) : [];
                                const firstName = nameParts[0] || "";
                                const lastName = nameParts.slice(1).join(" ") || "";
                                return (
                                    <div className={`relative transition-all duration-700 preserve-3d h-[520px] w-full ${isFlipped ? 'rotate-y-180' : ''}`}>
                                        {/* Front Side - Premium Template */}
                                        <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-row transition-transform hover:scale-[1.005]">
                                            {/* Left Column (Logo, Name, ID No, QR Code) */}
                                            <div className="flex-1 flex flex-col justify-between p-8">
                                                {/* Logo & School Name */}
                                                <div className="flex items-center gap-4">
                                                    <div className="w-14 h-14 bg-purple-50 dark:bg-purple-950/30 rounded-2xl p-1.5 border border-purple-100 dark:border-purple-900/30 flex items-center justify-center shrink-0">
                                                        {companySettings.logo_url ? (
                                                            <img src={companySettings.logo_url} className="w-full h-full object-contain" />
                                                        ) : (
                                                            <div className="text-xl font-black text-[#7A1975]">RU</div>
                                                        )}
                                                    </div>
                                                    <div className="text-[#7A1975] dark:text-purple-400 leading-none">
                                                        <h2 className="font-black text-2xl tracking-tight uppercase">
                                                            {companySettings.company_name || "Riara University"}
                                                        </h2>
                                                        <p className="text-[10px] font-bold opacity-80 tracking-[0.2em] mt-1.5 uppercase">
                                                            {companySettings.tagline || "nurturing innovators"}
                                                        </p>
                                                    </div>
                                                </div>

                                                {/* Student Name */}
                                                <div className="flex flex-col mt-4">
                                                    <span className="font-serif text-[42px] font-bold text-[#7A1975] dark:text-purple-300 leading-[1.2] uppercase">
                                                        {firstName}
                                                    </span>
                                                    <span className="font-serif text-[42px] font-bold text-[#7A1975] dark:text-purple-300 leading-[1.2] uppercase mt-1">
                                                        {lastName}
                                                    </span>
                                                </div>

                                                {/* ID Number */}
                                                <div className="text-xl font-black text-[#7A1975] dark:text-purple-400 uppercase tracking-widest mt-2 leading-normal">
                                                    ID NO: {result.admission_number}
                                                </div>

                                                {/* QR Code & Status */}
                                                <div className="flex items-end gap-6 mt-4">
                                                    <div className="p-2 bg-white rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm shrink-0">
                                                        <QRCodeSVG value={result.admission_number} size={110} level="H" />
                                                    </div>
                                                    <div className="pb-2">
                                                        <div className="px-5 py-2 bg-green-500 text-white font-black text-xs uppercase tracking-widest rounded-full shadow-lg shadow-green-500/20 flex items-center gap-1.5 select-none">
                                                            <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                                                            {result.status || 'ACTIVE'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Center-Right Column (Photo & Details) */}
                                            <div className="w-[300px] border-l border-gray-150 dark:border-gray-800 flex flex-col">
                                                {/* Student Photo */}
                                                <div className="w-full h-[350px] bg-slate-50 dark:bg-slate-900/50 overflow-hidden relative">
                                                    {result.profile_image ? (
                                                        <img src={result.profile_image} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-gray-355 bg-gray-100 dark:bg-gray-800">
                                                            <User size={80} strokeWidth={1.5} />
                                                        </div>
                                                    )}
                                                    
                                                    {canEdit && (
                                                        <label className="absolute bottom-4 right-4 w-12 h-12 bg-white dark:bg-gray-800 shadow-xl rounded-2xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform border border-gray-100 dark:border-gray-700 text-[#7A1975]">
                                                            <Camera size={24} />
                                                            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                                                        </label>
                                                    )}
                                                </div>

                                                {/* Details Section */}
                                                <div className="flex-1 bg-white dark:bg-gray-900 p-6 flex flex-col justify-center text-lg leading-normal text-indigo-950 dark:text-gray-200">
                                                    <div className="flex gap-3">
                                                        <span className="text-[#7A1975] dark:text-purple-400 font-bold min-w-[110px] uppercase">FACULTY:</span>
                                                        <span className="font-extrabold text-indigo-950 dark:text-white">{result.school || "School of Business"}</span>
                                                    </div>
                                                    <div className="flex gap-3 mt-2">
                                                        <span className="text-[#7A1975] dark:text-purple-400 font-bold min-w-[110px] uppercase">COURSE:</span>
                                                        <span className="font-extrabold text-indigo-950 dark:text-white">{result.program || "DBM/May 2026"}</span>
                                                    </div>
                                                    <div className="flex gap-3 mt-2">
                                                        <span className="text-[#7A1975] dark:text-purple-400 font-bold min-w-[110px] uppercase">VALIDITY:</span>
                                                        <span className="font-extrabold text-indigo-950 dark:text-white">
                                                            {result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Dec 2029"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Right-most Column (Vertical STUDENT bar) */}
                                            <div className="w-[80px] bg-[#7A1975] flex items-center justify-center relative select-none">
                                                <span className="text-white text-[32px] font-black tracking-[0.25em] uppercase absolute transform -rotate-90 whitespace-nowrap">
                                                    STUDENT
                                                </span>
                                            </div>
                                        </div>

                                        {/* Back Side - Premium QR Template */}
                                        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col justify-between py-8">
                                            <div className="absolute top-0 left-0 w-full h-3 bg-[#7A1975]"></div>
                                            
                                            <div className="text-center px-4 mt-6">
                                                <h2 className="text-[#7A1975] dark:text-purple-400 font-black tracking-[0.2em] text-2xl uppercase">Security & Access Control</h2>
                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Verification Required for Campus Entry</p>
                                            </div>
                                            
                                            <div className="flex justify-center my-4">
                                                <div className="p-4 bg-white rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800">
                                                    <QRCodeSVG value={result.admission_number} size={200} level="H" />
                                                </div>
                                            </div>
                                            
                                            <div className="text-center px-8 mb-6">
                                                <p className="mt-2 font-black text-3xl text-[#7A1975] dark:text-purple-400 tracking-[0.15em]">{result.admission_number}</p>
                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase leading-relaxed max-w-md mx-auto mt-3">
                                                    This card is the property of {companySettings.company_name || "the university"}. If found, please return it to the University Security Office or nearest Police Station.
                                                </p>
                                            </div>
                                            
                                            <div className="absolute bottom-0 left-0 w-full h-3 bg-[#7A1975]"></div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {result && result.ad_found && (
                    <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-purple-900/30 p-8 text-center animate-in fade-in slide-in-from-bottom-5">
                        <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-200 dark:border-purple-800/30 text-purple-600">
                            <Sparkles size={36} className="animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">Student Found in Active Directory</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            This student exists in the university directory but has not yet been registered in the Gatepass local database.
                        </p>

                        <div className="bg-slate-50 dark:bg-gray-700/30 rounded-2xl p-6 mb-8 text-left space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{result.full_name}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admission Number</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{result.admission_number}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{result.email || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">School</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{result.school || 'General'}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleImportAD(result)}
                            disabled={importing}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Importing Student...
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={20} />
                                    Import & Verify Student
                                </>
                            )}
                        </button>
                    </div>
                )}

                {result && result.error && (
                    <div className="max-w-md mx-auto bg-red-50 border-2 border-red-200 p-8 rounded-3xl text-center shadow-xl">
                        <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-700">Verification Failed</h3>
                        <p className="text-red-600 mt-1">{result.error}</p>
                    </div>
                )}

                {/* Supervisor Modal */}
                {pinModal.show && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                            <div className="text-center mb-6">
                                <Shield className="text-purple-600 mx-auto mb-2" size={32} />
                                <h3 className="text-xl font-bold">Photo Authorization</h3>
                            </div>
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-40 h-48 bg-gray-100 rounded-2xl overflow-hidden mb-4 border-2 border-purple-200">
                                    {previewUrl && <img src={previewUrl} className="w-full h-full object-cover" style={{ transform: `rotate(${rotation}deg)` }} />}
                                </div>
                                <button onClick={rotateImage} className="text-sm font-bold text-purple-600 flex items-center gap-1"><RefreshCcw size={14} /> Rotate</button>
                            </div>
                            <input 
                                type="password" 
                                maxLength={4} 
                                value={pinModal.pin} 
                                onChange={(e) => setPinModal({...pinModal, pin: e.target.value})}
                                placeholder="Supervisor PIN"
                                className="w-full text-center text-2xl py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-purple-500 outline-none mb-6"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setPinModal({show:false, pin:'', file:null})} className="flex-1 py-4 bg-gray-100 font-bold rounded-2xl">Cancel</button>
                                <button onClick={submitSecureImageUpdate} disabled={pinModal.pin.length < 4 || uploadingImage} className="flex-1 py-4 bg-purple-600 text-white font-bold rounded-2xl disabled:opacity-50">
                                    {uploadingImage ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Capture Area (Hidden) */}
                {result && !result.error && (() => {
                    const nameParts = result.full_name ? result.full_name.trim().split(/\s+/) : [];
                    const firstName = nameParts[0] || "";
                    const lastName = nameParts.slice(1).join(" ") || "";
                    return (
                        <div className="fixed -left-[5000px] top-0">
                            {/* Printable Front Side */}
                            <div 
                                id={`printable-front-${result.id}`} 
                                className="w-[1011px] h-[638px] bg-white border border-black rounded-[48px] relative overflow-hidden select-none"
                                style={{ fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif", letterSpacing: '0.01px' }}
                            >
                                {/* Left Column */}
                                <div className="absolute left-[45px] top-[45px] bottom-[45px] w-[430px] flex flex-col justify-between">
                                    {/* Logo & School Name */}
                                    <div className="flex items-center gap-4">
                                        {companySettings.logo_url ? (
                                            <img src={companySettings.logo_url} className="h-28 w-auto object-contain" />
                                        ) : (
                                            <div className="w-24 h-24 rounded-full bg-purple-100 flex items-center justify-center text-[#7A1975] font-black text-3xl shrink-0">
                                                RU
                                            </div>
                                        )}
                                        <div className="flex flex-col leading-[1.2] overflow-hidden">
                                            <span className="text-[26px] font-black text-[#7A1975] uppercase" style={{ letterSpacing: '0.01px' }}>
                                                {companySettings.company_name || "Riara University"}
                                            </span>
                                            <span className="text-[16px] font-bold text-gray-500 lowercase mt-1" style={{ letterSpacing: '0.01px' }}>
                                                {companySettings.tagline || "nurturing innovators"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Student Name */}
                                    <div className="flex flex-col mt-4">
                                        <span className="font-serif text-[54px] font-bold text-[#7A1975] leading-[1.15] uppercase" style={{ letterSpacing: '0.01px' }}>
                                            {firstName}
                                        </span>
                                        <span className="font-serif text-[54px] font-bold text-[#7A1975] leading-[1.15] uppercase mt-2.5" style={{ letterSpacing: '0.01px' }}>
                                            {lastName}
                                        </span>
                                    </div>

                                    {/* ID Number */}
                                    <div className="text-[30px] font-black text-[#7A1975] uppercase mt-2 leading-normal" style={{ letterSpacing: '0.01px' }}>
                                        ID NO: {result.admission_number}
                                    </div>

                                    {/* QR Code */}
                                    <div className="mt-3">
                                        <QRCodeSVG 
                                            value={result.admission_number} 
                                            size={165} 
                                            level="H"
                                        />
                                    </div>
                                </div>

                                {/* Center-Right Column */}
                                <div className="absolute left-[490px] top-0 bottom-0 w-[385px] flex flex-col">
                                    {/* Student Photo */}
                                    <div className="w-full h-[438px] bg-gray-50 overflow-hidden border-b border-gray-200">
                                        {result.profile_image ? (
                                            <img src={result.profile_image} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-305 bg-gray-100">
                                                <User size={120} />
                                            </div>
                                        )}
                                    </div>

                                    {/* Details Section */}
                                    <div className="flex-1 bg-white px-3 py-4 flex flex-col justify-center text-[26px] leading-[1.3] text-indigo-950">
                                        <div className="flex gap-4">
                                            <span className="text-[#7A1975] font-medium min-w-[165px] uppercase" style={{ letterSpacing: '0.01px' }}>FACULTY:</span>
                                            <span className="font-extrabold text-indigo-950" style={{ letterSpacing: '0.01px' }}>{result.school || "School of Business"}</span>
                                        </div>
                                        <div className="flex gap-4 mt-2">
                                            <span className="text-[#7A1975] font-medium min-w-[165px] uppercase" style={{ letterSpacing: '0.01px' }}>COURSE:</span>
                                            <span className="font-extrabold text-indigo-950" style={{ letterSpacing: '0.01px' }}>{result.program || "DBM/May 2026"}</span>
                                        </div>
                                        <div className="flex gap-4 mt-2">
                                            <span className="text-[#7A1975] font-medium min-w-[165px] uppercase" style={{ letterSpacing: '0.01px' }}>VALIDITY:</span>
                                            <span className="font-extrabold text-indigo-950" style={{ letterSpacing: '0.01px' }}>
                                                {result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Dec 2029"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Right-most Column */}
                                <div className="absolute right-0 top-0 bottom-0 w-[135px] bg-[#7A1975] flex items-center justify-center select-none">
                                    <span className="text-white text-[60px] font-black uppercase absolute transform -rotate-90 whitespace-nowrap" style={{ letterSpacing: '0.25em' }}>
                                        STUDENT
                                    </span>
                                </div>
                            </div>

                            {/* Printable Back Side */}
                            <div 
                                id={`printable-back-${result.id}`} 
                                className="w-[1011px] h-[638px] bg-white border border-black rounded-[48px] relative overflow-hidden flex flex-col items-center justify-between py-16"
                                style={{ fontFamily: "'Inter', 'Segoe UI', Roboto, sans-serif", letterSpacing: '0.01px' }}
                            >
                                <div className="absolute top-0 left-0 w-full h-[18px] bg-[#7A1975]"></div>
                                
                                <div className="text-center px-12 mt-4">
                                    <h4 className="text-[33px] font-black text-gray-800 uppercase mb-1.5" style={{ letterSpacing: '0.15em' }}>Security & Access Control</h4>
                                    <p className="text-[21px] text-gray-400 font-bold uppercase" style={{ letterSpacing: '0.01px' }}>Verification Required for Campus Entry</p>
                                </div>

                                <div className="p-3 bg-white border border-gray-150 shadow-sm rounded-sm">
                                    <QRCodeSVG 
                                        value={result.admission_number} 
                                        size={240} 
                                        level="H"
                                    />
                                </div>

                                <div className="text-center px-16 mb-6">
                                    <p className="text-[33px] font-black text-[#7A1975]" style={{ letterSpacing: '0.1em' }}>{result.admission_number}</p>
                                    <p className="text-[18px] text-gray-400 mt-4 font-bold uppercase leading-relaxed px-6" style={{ letterSpacing: '0.01px' }}>
                                        This card is the property of {companySettings.company_name || "the university"}. If found, please return it to the University Security Office.
                                    </p>
                                </div>

                                <div className="absolute bottom-[35px] right-[45px] opacity-5 pointer-events-none">
                                    {companySettings.logo_url && (
                                        <img src={companySettings.logo_url} className="w-36 h-36 object-contain grayscale" />
                                    )}
                                </div>
                                
                                <div className="absolute bottom-0 left-0 w-full h-[18px] bg-[#7A1975]"></div>
                            </div>
                        </div>
                    );
                })()}
            </div>
        </div>
    )
}

function PrintableIDCardFront({ student, companySettings }: any) { return null; }
function PrintableIDCardBack({ student, companySettings }: any) { return null; }
