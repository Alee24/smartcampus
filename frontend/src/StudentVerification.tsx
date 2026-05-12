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

    const handleVerify = async () => {
        if (!query.trim()) return
        setLoading(true)
        setShowCard(false)
        setResult(null)
        try {
            const res = await fetch(`/api/users/verify/${encodeURIComponent(query)}`)
            if (res.ok) {
                const data = await res.json()
                setResult(data)
                setTimeout(() => {
                    setShowCard(true)
                    setEditData({ full_name: data.full_name, school: data.school })
                    playSuccessSound()
                }, 300)
            } else {
                setResult({ error: 'Student not found' })
            }
        } catch (e) {
            setResult({ error: 'Verification failed. Please try again.' })
        } finally {
            setLoading(false)
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
                        handleVerify()
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
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                                    placeholder="Enter Admission Number..."
                                    className="w-full pl-12 pr-4 py-4 bg-transparent text-lg font-medium focus:outline-none"
                                />
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

                {result && !result.error && (
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

                        <div className="perspective-1000 w-full max-w-2xl mx-auto">
                            <div className={`relative transition-all duration-700 preserve-3d h-[400px] w-full ${isFlipped ? 'rotate-y-180' : ''}`}>
                                {/* Front Side */}
                                <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
                                    <div className="h-20 bg-gradient-to-r from-purple-600 to-blue-600 flex items-center px-6 gap-4">
                                        <div className="w-12 h-12 bg-white rounded-lg p-1">
                                            <img src={companySettings.logo_url || "/logo.png"} className="w-full h-full object-contain" />
                                        </div>
                                        <div className="text-white">
                                            <h2 className="font-black text-lg leading-none uppercase">{companySettings.company_name}</h2>
                                            <p className="text-[10px] font-bold opacity-70 tracking-widest mt-1 uppercase">Student Identity Card</p>
                                        </div>
                                    </div>
                                    <div className="p-6 flex gap-6 flex-1">
                                        <div className="w-40 h-48 bg-slate-100 rounded-2xl overflow-hidden relative shrink-0 border-2 border-purple-100 shadow-inner">
                                            {result.profile_image ? (
                                                <img src={result.profile_image} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={48} /></div>
                                            )}
                                            {canEdit && (
                                                <label className="absolute bottom-0 left-0 right-0 bg-black/50 text-white py-2 text-[10px] font-bold text-center cursor-pointer hover:bg-black/70 transition-colors">
                                                    UPDATE
                                                    <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                                                </label>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-4">
                                            <div>
                                                <h3 className="text-2xl font-black text-gray-900 dark:text-white uppercase">{result.full_name}</h3>
                                                <p className="text-lg font-bold text-purple-600">{result.admission_number}</p>
                                            </div>
                                            <div className="space-y-2">
                                                <div className="bg-purple-50 p-3 rounded-xl">
                                                    <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">School</p>
                                                    <p className="font-bold text-sm">{result.school}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <div className="flex-1 bg-green-50 p-3 rounded-xl">
                                                        <p className="text-[10px] font-bold text-green-500 uppercase tracking-widest">Status</p>
                                                        <p className="font-black text-green-700">ACTIVE</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Back Side */}
                                <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 flex flex-col">
                                    <div className="h-16 bg-slate-800 flex items-center justify-center">
                                        <p className="text-white font-bold tracking-[0.2em] text-xs uppercase">Official Security Token</p>
                                    </div>
                                    <div className="flex-1 flex flex-col items-center justify-center p-8">
                                        <div className="p-4 bg-white rounded-2xl shadow-lg border border-gray-100">
                                            <QRCodeSVG value={result.admission_number} size={180} />
                                        </div>
                                        <p className="mt-6 font-black text-2xl text-purple-600 tracking-widest">{result.admission_number}</p>
                                        <p className="text-[10px] text-gray-400 mt-2 uppercase font-bold text-center">Scan at any campus entry point for verification</p>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                {result && !result.error && (
                    <div className="fixed -left-[5000px] top-0">
                        <div id={`printable-front-${result.id}`} className="w-[1011px] h-[638px] bg-white relative flex flex-col">
                            <div className="h-[150px] bg-purple-700 flex items-center px-12 gap-8">
                                <img src={companySettings.logo_url || "/logo.png"} className="h-24" />
                                <h1 className="text-white text-5xl font-black uppercase">{companySettings.company_name}</h1>
                            </div>
                            <div className="flex-1 flex p-12 gap-12">
                                <img src={result.profile_image} className="w-[320px] h-[400px] object-cover rounded-3xl" />
                                <div className="flex-1 py-8">
                                    <h2 className="text-6xl font-black uppercase text-gray-900">{result.full_name}</h2>
                                    <p className="text-4xl font-bold text-purple-600 mt-2">{result.admission_number}</p>
                                    <div className="mt-12 space-y-4">
                                        <p className="text-2xl font-bold text-gray-400 uppercase tracking-widest">Department</p>
                                        <p className="text-4xl font-black text-gray-900">{result.school}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div id={`printable-back-${result.id}`} className="w-[1011px] h-[638px] bg-white flex flex-col items-center justify-center p-12">
                            <QRCodeSVG value={result.admission_number} size={400} />
                            <p className="text-7xl font-black text-purple-600 mt-12">{result.admission_number}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

function PrintableIDCardFront({ student, companySettings }: any) { return null; }
function PrintableIDCardBack({ student, companySettings }: any) { return null; }
