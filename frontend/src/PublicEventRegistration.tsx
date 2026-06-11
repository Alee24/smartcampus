import { useState, useEffect, useRef } from 'react'
import { Calendar, Users, MapPin, Shield, Check, Info, Loader2, X, Download, AlertTriangle } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import { PrivacyPolicy } from './privacy/PrivacyPolicy'
import { CookiePolicy } from './privacy/CookiePolicy'

export default function PublicEventRegistration() {
    const [event, setEvent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successData, setSuccessData] = useState<any>(null)
    
    // Form States
    const [fullName, setFullName] = useState('')
    const [idNumber, setIdNumber] = useState('')
    const [phone, setPhone] = useState('')
    const [email, setEmail] = useState('')
    const [consent, setConsent] = useState(false)
    const [autoDelete24h, setAutoDelete24h] = useState(false)
    
    // Modal States
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)
    const [showCookieModal, setShowCookieModal] = useState(false)
    
    // QR download ref
    const passQrRef = useRef<HTMLDivElement>(null)

    // Extract token from URL path
    const token = window.location.pathname.split('/').pop() || ''

    useEffect(() => {
        if (token) {
            fetchEventDetails()
        } else {
            setError("No event token specified")
            setLoading(false)
        }
    }, [token])

    const fetchEventDetails = async () => {
        try {
            const res = await fetch(`/api/events/public/by-token/${token}`)
            if (res.ok) {
                const data = await res.json()
                setEvent(data)
            } else {
                const err = await res.json()
                setError(err.detail || "Event not found")
            }
        } catch (e) {
            setError("Could not establish connection to the server")
        } finally {
            setLoading(false)
        }
    }

    const playSuccessSound = () => {
        if ('vibrate' in navigator) {
            try { navigator.vibrate(200); } catch (e) {}
        }
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

    const playErrorSound = () => {
        if ('vibrate' in navigator) {
            try { navigator.vibrate([100, 50, 100]); } catch (e) {}
        }
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime)
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.3)
    }

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!fullName || !idNumber || !phone) {
            setError("Please fill in all required fields.")
            playErrorSound()
            return
        }
        if (!consent) {
            setError("You must consent to the data protection terms to register.")
            playErrorSound()
            return
        }

        setSubmitting(true)
        setError(null)

        const payload = {
            visitor_name: fullName,
            visitor_identifier: idNumber,
            phone_number: phone,
            email: email || null,
            auto_delete_24h: autoDelete24h
        }

        try {
            const res = await fetch(`/api/events/public/by-token/${token}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                const data = await res.json()
                playSuccessSound()
                setSuccessData(data.visitor)
            } else {
                const err = await res.json()
                setError(err.detail || "Registration failed. Please try again.")
                playErrorSound()
            }
        } catch (err) {
            setError("A network error occurred. Please try again.")
            playErrorSound()
        } finally {
            setSubmitting(false)
        }
    }

    const downloadPass = () => {
        if (!passQrRef.current) return
        const canvas = passQrRef.current.querySelector("canvas")
        if (canvas) {
            const pngFile = canvas.toDataURL("image/png")
            const downloadLink = document.createElement("a")
            downloadLink.download = `EventPass_${event?.name}_${successData?.visitor_name}.png`
            downloadLink.href = pngFile
            downloadLink.click()
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
                <Loader2 className="animate-spin text-purple-600 mb-4" size={40} />
                <p className="text-gray-500 font-bold">Retrieving Event Details...</p>
            </div>
        )
    }

    if (error && !event) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4 text-center">
                <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 p-6 rounded-2xl max-w-md">
                    <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
                    <h3 className="text-xl font-bold text-red-700 dark:text-red-400 mb-2">Access Denied</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                    <a href="/" className="px-6 py-2 bg-gray-900 text-white rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
                        Return to Homepage
                    </a>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-950 dark:via-purple-950/10 dark:to-blue-950/10 py-12 px-4">
            <div className="max-w-4xl mx-auto">
                {/* Event header/details */}
                <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-white/20 dark:border-gray-800 rounded-3xl p-8 mb-8 shadow-xl">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <span className="bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider">
                            {event.event_type}
                        </span>
                        {event.is_active ? (
                            <span className="bg-emerald-150/40 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
                                Registration Open
                            </span>
                        ) : (
                            <span className="bg-gray-150/45 text-gray-500 px-3 py-1 rounded-full text-xs font-bold">
                                Closed
                            </span>
                        )}
                    </div>
                    
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 dark:text-white mb-4">
                        {event.name}
                    </h1>

                    <div className="grid md:grid-cols-3 gap-4 mb-6">
                        <div className="flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <Users className="text-purple-600" size={24} />
                            <div>
                                <div className="text-xs text-gray-400 uppercase font-bold">Hosted By</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{event.host}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <Calendar className="text-blue-600" size={24} />
                            <div>
                                <div className="text-xs text-gray-400 uppercase font-bold">Date & Time</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">
                                    {new Date(event.event_date).toDateString()} @ {event.start_time}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3 bg-gray-50/50 dark:bg-gray-800/40 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <MapPin className="text-pink-600" size={24} />
                            <div>
                                <div className="text-xs text-gray-400 uppercase font-bold">Location / Venue</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{event.school}</div>
                            </div>
                        </div>
                    </div>

                    {event.description && (
                        <div className="text-gray-600 dark:text-gray-300 leading-relaxed text-sm bg-purple-50/25 dark:bg-purple-950/10 p-5 rounded-2xl border border-purple-100/50 dark:border-purple-900/30">
                            <h4 className="font-bold text-purple-800 dark:text-purple-400 mb-2">About this Event</h4>
                            {event.description}
                        </div>
                    )}
                </div>

                {/* Success Registration Pass */}
                {successData ? (
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 text-center shadow-2xl max-w-md mx-auto">
                        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="text-emerald-600" size={32} />
                        </div>
                        
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            {successData.status === 'checked_in' ? 'Checked In Successfully!' : 'Registered Successfully!'}
                        </h3>
                        <p className="text-gray-500 text-sm mb-6">
                            {successData.status === 'checked_in' 
                                ? 'Welcome! You have been logged as present. Show this gate pass to campus guards if requested.'
                                : 'Your pass is ready. Guard scan at the gate on the event day will check you in.'}
                        </p>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 inline-block mb-6 shadow-sm" ref={passQrRef}>
                            <QRCodeCanvas
                                value={`VISITOR:${successData.id}`}
                                size={180}
                                level="H"
                            />
                        </div>

                        <div className="text-left bg-gray-50 dark:bg-gray-800/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 mb-6 text-sm">
                            <div className="mb-3">
                                <span className="text-xs text-gray-400 font-bold uppercase">Event</span>
                                <div className="font-bold text-gray-800 dark:text-gray-200">{event.name}</div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <span className="text-xs text-gray-400 font-bold uppercase">Guest</span>
                                    <div className="font-bold text-gray-800 dark:text-gray-200">{successData.visitor_name}</div>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-400 font-bold uppercase">ID Number</span>
                                    <div className="font-mono text-gray-700 dark:text-gray-300">{successData.visitor_identifier}</div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={downloadPass}
                            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors shadow-lg shadow-purple-500/20"
                        >
                            <Download size={20} /> Download Gate Pass
                        </button>
                    </div>
                ) : (
                    /* Registration Form */
                    <div className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl p-8 shadow-xl">
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-6 border-b pb-4">
                            Event Registration
                        </h3>

                        {error && (
                            <div className="mb-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 p-4 rounded-xl flex items-start gap-2 text-red-700 dark:text-red-400 text-sm">
                                <Info size={16} className="shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Full Name *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g. John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">ID / Passport or Admission Number *</label>
                                    <input 
                                        type="text"
                                        required
                                        value={idNumber}
                                        onChange={(e) => setIdNumber(e.target.value)}
                                        className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g. 12345678 or ADM-2026"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Phone Number *</label>
                                    <input 
                                        type="tel"
                                        required
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g. +254 712 345678"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Email Address (Optional)</label>
                                    <input 
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-850 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                                        placeholder="e.g. john@example.com"
                                    />
                                </div>
                            </div>

                            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 space-y-4">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={consent}
                                        onChange={(e) => setConsent(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400">
                                        I consent to the collection of my details for campus event manifest. We do not use tracking cookies. View our full <button type="button" onClick={() => setShowPrivacyModal(true)} className="text-purple-600 font-bold bg-transparent p-0 hover:underline">Privacy Policy</button> and <button type="button" onClick={() => setShowCookieModal(true)} className="text-purple-600 font-bold bg-transparent p-0 hover:underline">Cookie Policy</button>.
                                    </span>
                                </label>

                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={autoDelete24h}
                                        onChange={(e) => setAutoDelete24h(e.target.checked)}
                                        className="mt-1 w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                    />
                                    <span className="text-xs text-gray-500 dark:text-gray-400 font-bold">
                                        Automatically delete my personal details from records exactly 24 hours after this event ends.
                                    </span>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting || !event.is_active}
                                className="w-full py-4 bg-[image:var(--gradient-primary)] text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-95 disabled:opacity-50 transition-all shadow-lg transform hover:-translate-y-0.5"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={20} /> : null}
                                {event.scan_mode === 'check_in' || (event.scan_mode === 'auto' && new Date() >= new Date(event.event_date))
                                    ? 'Check In to Event'
                                    : 'Register for Event'}
                            </button>
                        </form>
                    </div>
                )}
            </div>

            {/* Privacy Modals */}
            {showPrivacyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl h-[80vh] flex flex-col">
                        <div className="p-5 border-b border-gray-150 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Privacy Policy</h3>
                            <button onClick={() => setShowPrivacyModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <PrivacyPolicy companyName="Smart Campus System" />
                        </div>
                    </div>
                </div>
            )}

            {showCookieModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 w-full max-w-3xl rounded-2xl shadow-2xl h-[80vh] flex flex-col">
                        <div className="p-5 border-b border-gray-150 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800 rounded-t-2xl">
                            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Cookie Policy</h3>
                            <button onClick={() => setShowCookieModal(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            <CookiePolicy companyName="Smart Campus System" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
