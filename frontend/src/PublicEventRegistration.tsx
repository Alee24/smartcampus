import { useState, useEffect, useRef } from 'react'
import { Calendar, Users, MapPin, Shield, Check, Info, Loader2, X, Download, AlertTriangle } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { PrivacyPolicy } from './privacy/PrivacyPolicy'
import { CookiePolicy } from './privacy/CookiePolicy'

const getMaskedId = (id: string) => {
    if (!id) return '';
    const clean = id.trim();
    if (clean.length <= 4) return clean;
    return '•••• ' + clean.slice(-4);
}

export default function PublicEventRegistration() {
    const [event, setEvent] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successData, setSuccessData] = useState<any>(null)
    
    // Company settings & colors
    const [companySettings, setCompanySettings] = useState<any>({
        company_name: 'Smart Campus',
        logo_url: '',
        primary_color: '#2563eb',
        secondary_color: '#0284c7',
        accent_color: '#10b981'
    })
    
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
    
    // Pass Card download ref
    const passCardRef = useRef<HTMLDivElement>(null)

    // Extract token from URL path
    const token = window.location.pathname.split('/').pop() || ''

    useEffect(() => {
        const fetchCompanyColors = async () => {
            try {
                const res = await fetch('/api/users/public-company-settings')
                if (res.ok) {
                    const data = await res.json()
                    setCompanySettings({
                        company_name: data.company_name || 'Smart Campus',
                        logo_url: data.logo_url || '',
                        primary_color: data.primary_color || '#2563eb',
                        secondary_color: data.secondary_color || '#0284c7',
                        accent_color: data.accent_color || '#10b981'
                    })
                }
            } catch (e) {
                console.error('Failed to fetch public company settings:', e)
            }
        }
        
        if (token) {
            fetchEventDetails()
            fetchCompanyColors()
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

    const downloadPass = async () => {
        if (!passCardRef.current) return
        try {
            const canvas = await html2canvas(passCardRef.current, {
                scale: 3, // High resolution
                useCORS: true,
                backgroundColor: '#ffffff'
            })
            const pngFile = canvas.toDataURL("image/png")
            const downloadLink = document.createElement("a")
            downloadLink.download = `GatePass_${event?.name || 'Event'}_${successData?.visitor_name || 'Guest'}.png`
            downloadLink.href = pngFile
            downloadLink.click()
        } catch (err) {
            console.error("Error generating pass image:", err)
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
                    <div className="text-center max-w-md mx-auto">
                        <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border border-gray-150 dark:border-gray-800 rounded-3xl p-6 mb-6 shadow-xl flex flex-col items-center">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mb-4">
                                <Check className="text-emerald-600" size={24} />
                            </div>
                            <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">
                                {successData.status === 'checked_in' ? 'Checked In Successfully!' : 'Registered Successfully!'}
                            </h3>
                            <p className="text-gray-500 text-xs leading-relaxed max-w-xs">
                                {successData.status === 'checked_in' 
                                    ? 'Welcome! You have been logged as present. Show the pass below to campus guards.'
                                    : 'Your pass is ready. Show this pass to campus guards at the gate to scan and check in.'}
                            </p>
                            <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl text-amber-850 dark:text-amber-400 text-xs font-semibold leading-relaxed flex items-start gap-2.5">
                                <AlertTriangle className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" size={16} />
                                <span className="text-left">
                                    <strong>ID Verification Required:</strong> Please make sure your physical ID/Passport is ready for verification at the gate. Registered details must match your physical document exactly, or campus access will be denied.
                                </span>
                            </div>
                        </div>

                        {/* Professional Gate Pass Card (Download Target) */}
                        <div 
                            ref={passCardRef}
                            className="bg-white p-10 flex flex-col items-center justify-center mx-auto mb-6 select-none"
                            style={{ backgroundColor: '#ffffff', minHeight: '820px', width: '100%', maxWidth: '440px' }}
                        >
                            {/* Ribbons */}
                            <div className="w-full h-32 relative overflow-hidden flex justify-center mb-1">
                                {/* Left Strap */}
                                <div 
                                    className="absolute h-40 w-8 origin-bottom-right"
                                    style={{
                                        background: `linear-gradient(to right, ${companySettings.primary_color}, ${companySettings.secondary_color})`,
                                        transform: 'rotate(-32deg) translate(-22px, -8px)',
                                        opacity: 0.95,
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                                        borderRight: '1px solid rgba(255,255,255,0.2)'
                                    }}
                                />
                                {/* Right Strap */}
                                <div 
                                    className="absolute h-40 w-8 origin-bottom-left"
                                    style={{
                                        background: `linear-gradient(to left, ${companySettings.primary_color}, ${companySettings.accent_color || companySettings.secondary_color})`,
                                        transform: 'rotate(32deg) translate(22px, -8px)',
                                        opacity: 0.95,
                                        boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                                        borderLeft: '1px solid rgba(255,255,255,0.2)'
                                    }}
                                />
                            </div>

                            {/* Metal / Plastic Buckle Connector */}
                            <div className="w-10 h-10 bg-gradient-to-b from-gray-300 to-gray-400 rounded-lg shadow-md flex items-center justify-center relative -mt-5 z-20 border border-gray-400/50">
                                <div className="w-4 h-4 bg-gray-600 rounded-full border-2 border-gray-300 flex items-center justify-center">
                                    <div className="w-1.5 h-1.5 bg-gray-900 rounded-full" />
                                </div>
                                <div className="absolute bottom-[-14px] w-5 h-6 bg-gradient-to-r from-gray-400 to-gray-500 rounded-b-md shadow border-x border-b border-gray-400" />
                            </div>

                            {/* Hanger slot connector of the card casing */}
                            <div className="w-16 h-8 bg-indigo-50/60 rounded-t-xl border-t border-x border-gray-300/40 relative z-10 mt-3 flex items-center justify-center">
                                <div className="w-8 h-2 bg-gray-800/80 rounded-full border border-white/20" />
                            </div>

                            {/* Plastic Casing / Holder Card */}
                            <div className="w-full bg-slate-50/40 rounded-[32px] p-4.5 border-2 border-slate-200/60 shadow-2xl relative -mt-1 backdrop-blur-sm">
                                {/* Card itself */}
                                <div 
                                    className="bg-white rounded-[24px] overflow-hidden relative shadow-lg flex flex-col items-center pb-8 pt-24"
                                    style={{ minHeight: '520px', border: '1px solid rgba(0,0,0,0.05)' }}
                                >
                                    {/* Top Waves SVG */}
                                    <svg viewBox="0 0 400 180" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 w-full h-40">
                                        <path d="M0 0H400V130C350 160 300 120 200 145C100 170 50 130 0 160V0Z" fill={companySettings.primary_color} opacity="0.1" />
                                        <path d="M0 0H400V105C320 135 280 85 200 115C120 145 80 100 0 130V0Z" fill={companySettings.secondary_color} opacity="0.6" />
                                        <path d="M0 0H400V85C340 105 260 70 200 95C140 120 60 85 0 105V0Z" fill={companySettings.primary_color} />
                                    </svg>

                                    {/* Circular Logo */}
                                    <div 
                                        className="w-24 h-24 rounded-full bg-white shadow-md border-4 flex items-center justify-center relative z-10 -mt-14 overflow-hidden shrink-0" 
                                        style={{ borderColor: companySettings.primary_color }}
                                    >
                                        {companySettings.logo_url ? (
                                            <img src={companySettings.logo_url} className="w-16 h-16 object-contain" alt="Logo" />
                                        ) : (
                                            <Shield className="w-12 h-12" style={{ color: companySettings.primary_color }} />
                                        )}
                                    </div>

                                    {/* Company Name & Tagline */}
                                    <h2 className="text-lg font-black tracking-wider uppercase mt-4 text-center px-4" style={{ color: '#111827' }}>
                                        {companySettings.company_name}
                                    </h2>
                                    <div className="text-[9px] uppercase tracking-widest text-gray-400 font-extrabold mb-4 text-center">
                                        Verified Event Guest
                                    </div>

                                    {/* Guest Name block */}
                                    <div className="text-center mb-4 px-4">
                                        <span className="text-[8px] uppercase tracking-widest font-black text-gray-400 block mb-0.5">Guest Name</span>
                                        <span className="text-xl font-black block tracking-wide truncate max-w-[280px]" style={{ color: companySettings.primary_color }}>
                                            {successData.visitor_name}
                                        </span>
                                    </div>

                                    {/* QR Code Container */}
                                    <div className="bg-white p-3.5 rounded-2xl border border-gray-150 inline-block mb-4 shadow-sm relative z-10">
                                        <QRCodeCanvas
                                            value={`VISITOR:${successData.id}`}
                                            size={200}
                                            level="H"
                                            includeMargin={true}
                                        />
                                    </div>

                                    {/* Event Details Footer inside card */}
                                    <div className="text-center mt-2 px-6 relative z-10 w-full">
                                        <div className="text-[11px] font-black uppercase tracking-wider text-gray-800 truncate max-w-[320px] mx-auto">
                                            {event.name}
                                        </div>
                                        <div className="text-[9px] font-black text-gray-400 mt-1.5 uppercase tracking-wide">
                                            {new Date(event.event_date).toDateString()} @ {event.start_time}
                                        </div>
                                        <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wide truncate max-w-[300px] mx-auto">
                                            {event.school}
                                        </div>
                                    </div>

                                    {/* Bottom Website Tag */}
                                    <div className="text-[9px] font-mono font-bold text-gray-400 tracking-widest mt-5 uppercase relative z-10">
                                        {window.location.hostname}
                                    </div>

                                    {/* Bottom Waves SVG */}
                                    <svg viewBox="0 0 400 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 left-0 w-full h-28 pointer-events-none">
                                        <path d="M0 120H400V40C350 10 300 50 200 25C100 0 50 40 0 10V120Z" fill={companySettings.primary_color} opacity="0.1" />
                                        <path d="M0 120H400V60C320 30 280 80 200 50C120 20 80 65 0 35V120Z" fill={companySettings.secondary_color} opacity="0.6" />
                                        <path d="M0 120H400V75C340 55 260 90 200 65C140 40 60 75 0 55V120Z" fill={companySettings.primary_color} />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={downloadPass}
                            className="w-full py-4.5 text-white rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-[0.98] border-none outline-none cursor-pointer text-sm"
                            style={{ backgroundColor: companySettings.primary_color, boxShadow: `0 8px 20px -4px ${companySettings.primary_color}40` }}
                        >
                            <Download size={18} /> Download Professional Pass
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
