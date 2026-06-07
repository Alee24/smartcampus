import { useState, useEffect, useRef } from 'react'
import { Car, User, Truck, CheckCircle, ArrowRight, UserCheck, Shield, Camera, AlertCircle, RefreshCcw } from 'lucide-react'

export default function SelfServiceEntry() {
    const [step, setStep] = useState(1) // 1: Role, 2: Form, 3: Success
    const [role, setRole] = useState('')
    const [gateId, setGateId] = useState('')
    const [formData, setFormData] = useState<any>({})
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const [userData, setUserData] = useState<any>(null)

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
            } else {
                setError(data.detail || "Request failed. Please verify the QR scanner device is active.")
            }
        } catch (err) {
            setError("Connection failed. Please ensure the campus server network is online.")
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        setSubmitting(true)
        setError(null)
        try {
            const res = await fetch('/api/gate/public/access-request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    gate_id: gateId,
                    role: role,
                    data: formData
                })
            })
            const data = await res.json()
            if (res.ok) {
                setResult(data)
                setStep(3)
            } else {
                setError(data.detail || "Verification failed. Check credentials and retry.")
            }
        } catch (err) {
            setError("Connection failed. Please ensure the campus server network is online.")
        } finally {
            setSubmitting(false)
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
                        {result?.status === 'success' ? 'Access Granted' : 'Request Sent'}
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
                    {result?.status === 'success' && (
                        <div className="mt-4 text-xs text-indigo-600 dark:text-indigo-400 font-bold uppercase tracking-wider">
                            Gate opened automatically
                        </div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50/50 via-slate-100 to-purple-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-purple-950/20 p-4 font-sans">
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
            <div className="max-w-md mx-auto relative">
                {/* Back to Homepage Button */}
                <div className="flex justify-start mb-4 pt-4">
                    <button 
                        onClick={() => window.location.href = '/'}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-slate-905 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl text-xs font-black shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer focus:ring-2 focus:ring-indigo-500/20 outline-none"
                    >
                        &larr; Back to Homepage
                    </button>
                </div>
                <header className="mb-8 text-center">
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

                        <RoleCard icon={User} label="Visitor" desc="Personal visits, enquiries, or guests" onClick={() => { setRole('visitor'); setStep(2); setError(null) }} />
                        <RoleCard icon={Car} label="Taxi / Cab" desc="Drop-offs, pick-ups, or taxi services" onClick={() => { setRole('taxi'); setStep(2); setError(null) }} />
                        <RoleCard icon={Truck} label="Delivery" desc="Goods, parcels, couriers, or food deliveries" onClick={() => { setRole('delivery'); setStep(2); setError(null) }} />
                        <RoleCard icon={UserCheck} label="Student / Staff" desc="Campus verification check-in/out" onClick={() => { setRole('student'); setStep(2); setError(null) }} color="indigo" />
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/20 p-6 animate-slide-in">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-black text-slate-900 dark:text-white capitalize">
                                {role === 'student' ? 'Student / Staff Verify' : `${role} Registration`}
                            </h2>
                            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-black uppercase tracking-wider px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900">
                                Step 2 of 2
                            </span>
                        </div>

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
                                                            className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2 active:scale-95 text-xs"
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
                                                    className="absolute bottom-4 right-4 bg-white/95 text-slate-900 px-4 py-2 rounded-xl text-xs font-black shadow hover:bg-white flex items-center gap-1.5 transition-all"
                                                >
                                                    <RefreshCcw size={12} /> Retake
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button 
                                            onClick={() => { setStep(1); setError(null); }} 
                                            className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-xs active:scale-95 transition-all"
                                        >
                                            Back
                                        </button>

                                        {cameraActive && !image && (
                                            <button 
                                                onClick={takePhoto} 
                                                className="flex-[2] py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-xs shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                            >
                                                <Camera size={14} /> Capture Photo
                                            </button>
                                        )}

                                        {image && (
                                            <button
                                                onClick={handleStudentSubmit}
                                                disabled={submitting}
                                                className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-750 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 hover:opacity-95 shadow-lg shadow-indigo-600/20 transition-all active:scale-95"
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
                                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg shadow-indigo-600/20 text-xs active:scale-95 transition-all"
                                    >
                                        Go to Login Page
                                    </button>
                                    <button 
                                        type="button" 
                                        onClick={() => { setStep(1); setError(null); }} 
                                        className="w-full py-3.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-350 text-xs font-black"
                                    >
                                        Back to Categories
                                    </button>
                                </form>
                            )
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {/* Common Fields */}
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Full Name</label>
                                    <input 
                                        required 
                                        placeholder="e.g. John Doe"
                                        className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} 
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Phone Number</label>
                                        <input 
                                            required 
                                            type="tel"
                                            placeholder="e.g. 0712345678"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            onChange={e => setFormData({ ...formData, mobile: e.target.value })} 
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">ID / Passport No</label>
                                        <input 
                                            required 
                                            placeholder="ID Number"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            onChange={e => setFormData({ ...formData, id_number: e.target.value })} 
                                        />
                                    </div>
                                </div>

                                {/* Vehicle Fields */}
                                {(role === 'taxi' || role === 'visitor') && (
                                    <div className="grid grid-cols-2 gap-3 border-t border-slate-100 dark:border-slate-800/80 pt-4">
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Vehicle Plate (Optional)</label>
                                            <input 
                                                placeholder="KCA 123A"
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white font-mono uppercase"
                                                onChange={e => setFormData({ ...formData, plate_number: e.target.value })} 
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Passengers</label>
                                            <input 
                                                type="number" 
                                                min="1" 
                                                placeholder="1"
                                                className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                                onChange={e => setFormData({ ...formData, passengers: e.target.value })} 
                                            />
                                        </div>
                                    </div>
                                )}

                                {/* Specifics */}
                                {role === 'delivery' && (
                                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Delivery Details</label>
                                        <input 
                                            required 
                                            placeholder="e.g. DHL Package for Admin Office" 
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            onChange={e => setFormData({ ...formData, delivery_details: e.target.value })} 
                                        />
                                    </div>
                                )}
                                {role !== 'delivery' && (
                                    <div className="border-t border-slate-100 dark:border-slate-800/80 pt-3">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Purpose of Visit</label>
                                        <input 
                                            required 
                                            placeholder="e.g. Meeting with Registrar, General Inquiry"
                                            className="w-full p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-150/80 dark:border-slate-800 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-800 dark:text-white"
                                            onChange={e => setFormData({ ...formData, purpose: e.target.value })} 
                                        />
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => { setStep(1); setError(null); }} 
                                        className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-350 rounded-2xl font-black text-xs transition-all active:scale-95"
                                    >
                                        Back
                                    </button>
                                    <button 
                                        type="submit"
                                        disabled={submitting} 
                                        className="flex-[2] py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
                                    >
                                        {submitting ? 'Processing...' : <>Submit Request <ArrowRight size={14} /></>}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </div>
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
            className="w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl p-4.5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800/80 flex items-center gap-4 hover:shadow-md hover:border-indigo-500/30 transition-all text-left group active:scale-[0.99]"
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
