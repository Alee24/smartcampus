import { useState, useEffect, useRef } from 'react'
import { Car, User, Truck, CheckCircle, ArrowRight, UserCheck } from 'lucide-react'

export default function SelfServiceEntry() {
    const [step, setStep] = useState(1) // 1: Role, 2: Form, 3: Success
    const [role, setRole] = useState('')
    const [gateId, setGateId] = useState('')
    const [formData, setFormData] = useState<any>({})
    const [submitting, setSubmitting] = useState(false)
    const [result, setResult] = useState<any>(null)

    const [userData, setUserData] = useState<any>(null)

    // Camera Refs & State
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [image, setImage] = useState<string | null>(null)
    const [cameraActive, setCameraActive] = useState(false)

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                setCameraActive(true)
                videoRef.current.play()
            }
        } catch (err) {
            alert("Camera access denied or unavailable. Please enable camera permissions.")
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
                alert(data.detail || "Request failed")
            }
        } catch (err) {
            alert("Connection failed")
        } finally {
            setSubmitting(false)
        }
    }

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        setSubmitting(true)
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
                alert(data.detail || "Request failed")
            }
        } catch (err) {
            alert("Connection failed")
        } finally {
            setSubmitting(false)
        }
    }

    if (step === 3) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center animate-scale-in">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle className="text-green-600" size={40} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 text-gray-900">{result?.status === 'success' ? 'Access Granted' : 'Request Sent'}</h2>
                    <p className="text-gray-600 mb-8">{result?.message}</p>
                    <button onClick={() => window.location.reload()} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">New Request</button>
                    {result?.status === 'success' && (
                        <div className="mt-4 text-sm text-gray-400">Gate opened automatically</div>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-100 p-4">
            <div className="max-w-md mx-auto">
                <header className="mb-8 text-center pt-8">
                    <h1 className="text-2xl font-bold text-gray-900">Gate Pass Entry</h1>
                    <p className="text-gray-500 text-sm">Self-Service Check-in</p>
                </header>

                {step === 1 && (
                    <div className="space-y-4 animate-fade-in">
                        <p className="text-sm font-semibold text-gray-700 pl-1">Select your category:</p>

                        <RoleCard icon={User} label="Visitor" desc="Personal visit, inquiry" onClick={() => { setRole('visitor'); setStep(2) }} />
                        <RoleCard icon={Car} label="Taxi / Cab" desc="Drop-off or Pick-up" onClick={() => { setRole('taxi'); setStep(2) }} />
                        <RoleCard icon={Truck} label="Delivery" desc="Goods, parcels, food" onClick={() => { setRole('delivery'); setStep(2) }} />
                        <RoleCard icon={UserCheck} label="Student / Staff" desc="Login with credentials" onClick={() => { setRole('student'); setStep(2) }} color="indigo" />
                    </div>
                )}

                {step === 2 && (
                    <div className="bg-white rounded-2xl shadow-lg p-6 animate-slide-in">
                        <h2 className="text-xl font-bold mb-6 capitalize flex items-center gap-2">
                            {role === 'student' ? 'Login' : `${role} Details`}
                        </h2>

                        {role === 'student' ? (
                            userData ? (
                                <div className="space-y-6 text-center">
                                    <div className="p-4 bg-indigo-50 text-indigo-900 rounded-xl mb-4">
                                        <div className="font-bold text-lg">{userData.full_name}</div>
                                        <div className="text-sm opacity-70">{userData.admission_number}</div>
                                        <div className="mt-2 text-xs bg-indigo-200 text-indigo-800 px-2 py-1 rounded inline-block">Authenticated</div>
                                    </div>

                                    <p className="text-gray-600 text-sm mb-4">
                                        <strong>Verification Required:</strong><br />
                                        Please take a photo of the classroom/location to confirm your presence.
                                    </p>

                                    {/* Camera UI */}
                                    <div className="mb-6">
                                        {!image ? (
                                            <div className="rounded-2xl overflow-hidden bg-black aspect-video relative shadow-inner">
                                                <video ref={videoRef} playsInline autoPlay muted className="w-full h-full object-cover" />
                                                {!cameraActive && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 text-white z-10">
                                                        <button onClick={startCamera} className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-xl font-bold shadow-lg transition-all">
                                                            Open Camera
                                                        </button>
                                                    </div>
                                                )}
                                                <canvas ref={canvasRef} className="hidden" />
                                            </div>
                                        ) : (
                                            <div className="rounded-2xl overflow-hidden aspect-video relative shadow-lg ring-4 ring-indigo-50">
                                                <img src={image} className="w-full h-full object-cover" />
                                                <button
                                                    onClick={() => { setImage(null); startCamera() }}
                                                    className="absolute bottom-4 right-4 bg-white/90 text-black px-4 py-2 rounded-lg text-sm font-bold shadow hover:bg-white"
                                                >
                                                    Retake
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <button onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Back</button>

                                        {cameraActive && !image && (
                                            <button onClick={takePhoto} className="flex-[2] py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800">
                                                Take Photo
                                            </button>
                                        )}

                                        {image && (
                                            <button
                                                onClick={handleStudentSubmit}
                                                disabled={submitting}
                                                className="flex-[2] py-3 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 shadow-lg shadow-green-200"
                                            >
                                                {submitting ? 'Verifying...' : 'Submit Verification'}
                                            </button>
                                        )}

                                        {!cameraActive && !image && (
                                            <button disabled className="flex-[2] py-3 bg-gray-200 text-gray-400 rounded-xl font-bold cursor-not-allowed">
                                                Capture Photo First
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <form className="space-y-4" onSubmit={(e) => {
                                    e.preventDefault()
                                    alert("Please use the main app to login and generate a QR code for entry.")
                                }}>
                                    <div className="p-4 bg-indigo-50 text-indigo-700 rounded-xl text-sm leading-relaxed">
                                        Start by logging into your Student/Staff account on this device.
                                    </div>
                                    <button type="button" onClick={() => window.location.href = '/'} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold">
                                        Go to Login Page
                                    </button>
                                    <button type="button" onClick={() => setStep(1)} className="w-full py-3 text-gray-500 font-semibold">Back</button>
                                </form>
                            )
                        ) : (
                            <form className="space-y-4" onSubmit={handleSubmit}>
                                {/* Common Fields */}
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
                                    <input required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                        onChange={e => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Phone Number</label>
                                    <input required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200" type="tel"
                                        onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">ID / Passport No</label>
                                    <input required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                        onChange={e => setFormData({ ...formData, id_number: e.target.value })} />
                                </div>

                                {/* Vehicle Fields */}
                                {(role === 'taxi' || role === 'visitor') && (
                                    <>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Vehicle Plate (Optional)</label>
                                            <input className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200 font-mono uppercase"
                                                onChange={e => setFormData({ ...formData, plate_number: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase">Passengers</label>
                                            <input type="number" min="1" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                                onChange={e => setFormData({ ...formData, passengers: e.target.value })} />
                                        </div>
                                    </>
                                )}

                                {/* Specifics */}
                                {role === 'delivery' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Delivery Details</label>
                                        <input required placeholder="e.g. Amazon Package for Admin" className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                            onChange={e => setFormData({ ...formData, delivery_details: e.target.value })} />
                                    </div>
                                )}
                                {role !== 'delivery' && (
                                    <div>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Purpose of Visit</label>
                                        <input required className="w-full p-3 bg-gray-50 rounded-xl border border-gray-200"
                                            onChange={e => setFormData({ ...formData, purpose: e.target.value })} />
                                    </div>
                                )}

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setStep(1)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Back</button>
                                    <button disabled={submitting} className="flex-[2] py-3 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2">
                                        {submitting ? 'Processing...' : <>Submit <ArrowRight size={18} /></>}
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
    return (
        <button onClick={onClick} className="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all text-left">
            <div className={`w-12 h-12 rounded-full bg-${color}-50 text-${color}-600 flex items-center justify-center`}>
                <Icon size={24} />
            </div>
            <div>
                <h3 className="font-bold text-gray-900">{label}</h3>
                <p className="text-xs text-gray-500 font-medium">{desc}</p>
            </div>
            <div className="ml-auto text-gray-300">
                <ArrowRight size={20} />
            </div>
        </button>
    )
}
