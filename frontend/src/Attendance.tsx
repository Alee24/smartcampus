import { useState, useEffect, useRef } from 'react'
import {
    Users, Play, CheckCircle, Smartphone, AlertTriangle, Camera, X,
    MapPin, Image as ImageIcon, QrCode, StopCircle, RefreshCw, Upload,
    Monitor, Globe, Wifi
} from 'lucide-react'
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode'
import { QRCodeCanvas } from 'qrcode.react'

export default function Attendance() {
    const [mode, setMode] = useState<'lecturer' | 'student'>('student')
    const [role, setRole] = useState('')

    // Check Role
    useEffect(() => {
        const checkRole = async () => {
            const token = localStorage.getItem('token')
            if (!token) return
            try {
                const res = await fetch('/api/users/me', { headers: { 'Authorization': `Bearer ${token}` } })
                if (res.ok) {
                    const u = await res.json()
                    setRole(u.role)
                    if (['admin', 'lecturer'].includes(u.role)) setMode('lecturer')
                }
            } catch { }
        }
        checkRole()
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 p-4 md:p-8 font-sans">
            <div className="max-w-5xl mx-auto space-y-8">
                {/* Header Toggle */}
                <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <QrCode className="text-blue-600" />
                        <span>Smart<span className="text-blue-600">Attendance</span></span>
                    </h1>

                    <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('student')}
                            className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'student' ? 'bg-white dark:bg-slate-700 shadow text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Student Check-In
                        </button>
                        {['admin', 'lecturer'].includes(role) && (
                            <button
                                onClick={() => setMode('lecturer')}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'lecturer' ? 'bg-white dark:bg-slate-700 shadow text-purple-600' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Lecturer Dashboard
                            </button>
                        )}
                    </div>
                </div>

                {mode === 'student' ? <StudentView /> : <LecturerView />}
            </div>
        </div>
    )
}

function StudentView() {
    const [status, setStatus] = useState<{ type: 'idle' | 'loading' | 'success' | 'error', msg: string }>({ type: 'idle', msg: '' })
    const [cameraActive, setCameraActive] = useState(false)
    const [manualCode, setManualCode] = useState('')

    // Scanner Ref
    useEffect(() => {
        let scanner: Html5Qrcode | null = null;
        if (cameraActive) {
            const initScanner = async () => {
                try {
                    // Check if camera permission is granted first
                    const devices = await navigator.mediaDevices.enumerateDevices()
                    const hasCamera = devices.some(d => d.kind === 'videoinput')

                    if (!hasCamera) {
                        setStatus({ type: 'error', msg: 'No camera found on this device' })
                        setCameraActive(false)
                        return
                    }

                    scanner = new Html5Qrcode("reader");
                    await scanner.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: 250 },
                        (decodedText) => {
                            handleScan(decodedText)
                            setCameraActive(false)
                            scanner?.stop().catch(console.error)
                        },
                        () => { } // Ignore errors while scanning
                    )
                } catch (err: any) {
                    console.error("Camera error:", err)

                    // Provide specific error messages
                    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                        setStatus({
                            type: 'error',
                            msg: '📷 Camera permission denied. Please allow camera access in your browser settings and try again.'
                        })
                    } else if (err.name === 'NotFoundError') {
                        setStatus({ type: 'error', msg: 'No camera found on this device' })
                    } else if (err.name === 'NotReadableError') {
                        setStatus({ type: 'error', msg: 'Camera is being used by another application' })
                    } else {
                        setStatus({
                            type: 'error',
                            msg: 'Could not access camera. Please check permissions and try again.'
                        })
                    }
                    setCameraActive(false)
                }
            }

            initScanner()
        }
        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(console.error)
            }
        }
    }, [cameraActive])

    const gatherMetadata = async () => {
        let geo: any = null
        try {
            geo = await new Promise(r => navigator.geolocation.getCurrentPosition(
                p => r({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
                () => r(null), { timeout: 3000 }
            ))
        } catch { }

        return {
            userAgent: navigator.userAgent,
            geolocation: geo,
            timestamp: new Date().toISOString()
        }
    }

    const handleScan = async (code: string) => {
        setStatus({ type: 'loading', msg: 'Verifying Attendance...' })
        try {
            // Extract room code if the scanned text is a URL
            let roomCode = code;
            if (code.includes('?room=')) {
                try {
                    const url = new URL(code);
                    roomCode = url.searchParams.get('room') || code;
                } catch (e) {
                    // Not a valid URL, use original code
                }
            }

            const meta = await gatherMetadata()
            const token = localStorage.getItem('token')

            const res = await fetch('/api/timetable/verify-scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    room_code: roomCode,
                    latitude: meta.geolocation?.lat || null,
                    longitude: meta.geolocation?.lng || null,
                    metadata: meta
                })
            })

            const data = await res.json()
            if (res.ok && data.success) {
                setStatus({ type: 'success', msg: data.message || 'Successfully Checked In!' })
                if (navigator.vibrate) navigator.vibrate([100, 50, 100])
            } else {
                setStatus({ type: 'error', msg: data.message || data.detail || 'Verification Failed' })
                if (navigator.vibrate) navigator.vibrate(500)
            }
        } catch (e) {
            setStatus({ type: 'error', msg: 'Network Error' })
        }
    }

    // Auto-check deep link
    useEffect(() => {
        const room = localStorage.getItem('scannedRoom')
        if (room) {
            localStorage.removeItem('scannedRoom')
            handleScan(room)
        }
    }, [])

    return (
        <div className="max-w-md mx-auto space-y-6">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 text-center">

                {status.type === 'success' ? (
                    <div className="py-8 animate-in fade-in zoom-in">
                        <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Checked In!</h2>
                        <p className="text-slate-500">{status.msg}</p>
                        <button onClick={() => setStatus({ type: 'idle', msg: '' })} className="mt-8 text-blue-600 font-bold hover:underline">Scan Again</button>
                    </div>
                ) : (
                    <>
                        {cameraActive ? (
                            <div className="mb-6 rounded-xl overflow-hidden bg-black relative">
                                <div id="reader" className="w-full h-64"></div>
                                <button
                                    onClick={() => setCameraActive(false)}
                                    className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        ) : (
                            <div className="mb-8">
                                <div className="w-20 h-20 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <QrCode size={40} />
                                </div>
                                <h2 className="text-xl font-bold mb-2">Attendance Scanner</h2>
                                <p className="text-slate-500 text-sm">Scan the dynamic QR code displayed in class</p>
                            </div>
                        )}

                        {!cameraActive && (
                            <div className="space-y-3">
                                <button
                                    onClick={() => setCameraActive(true)}
                                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-900/10 flex items-center justify-center gap-2 transition-all"
                                >
                                    <Camera size={20} /> Scan QR Code
                                </button>

                                <div className="relative">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        onChange={async (e) => {
                                            if (e.target.files?.[0]) {
                                                try {
                                                    const html5QrCode = new Html5Qrcode("hidden-reader")
                                                    const text = await html5QrCode.scanFile(e.target.files[0], true)
                                                    handleScan(text)
                                                } catch {
                                                    setStatus({ type: 'error', msg: 'Could not read QR from image' })
                                                }
                                            }
                                        }}
                                    />
                                    <button className="w-full py-3 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all">
                                        <Upload size={20} /> Upload from Gallery
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Status Message */}
                        {status.type === 'loading' && (
                            <div className="mt-6 flex items-center justify-center gap-3 text-blue-600 font-bold animate-pulse">
                                <RefreshCw className="animate-spin" /> Verifying...
                            </div>
                        )}
                        {status.type === 'error' && (
                            <div className="mt-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-medium flex items-center gap-2">
                                <AlertTriangle size={18} /> {status.msg}
                            </div>
                        )}
                        <div id="hidden-reader" className="hidden"></div>
                    </>
                )}
            </div>

            {/* Manual Entry Fallback */}
            {!cameraActive && status.type !== 'success' && (
                <div className="text-center">
                    <p className="text-xs text-slate-400 mb-2">Having trouble scanning?</p>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            placeholder="Enter Room Code (e.g. LH1)"
                            className="flex-1 p-3 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-800"
                            value={manualCode}
                            onChange={e => setManualCode(e.target.value)}
                        />
                        <button
                            onClick={() => handleScan(manualCode)}
                            disabled={!manualCode}
                            className="px-4 bg-slate-800 text-white rounded-lg font-bold disabled:opacity-50"
                        >
                            Submit
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

function LecturerView() {
    const [courses, setCourses] = useState<any[]>([])
    const [activeSession, setActiveSession] = useState<any>(null)
    const [attendees, setAttendees] = useState<any[]>([])
    const [selectedCourse, setSelectedCourse] = useState('')

    // Fetch Init
    useEffect(() => {
        const init = async () => {
            const token = localStorage.getItem('token')
            const [cRes, sRes] = await Promise.all([
                fetch('/api/timetable/courses', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/attendance/sessions/active', { headers: { 'Authorization': `Bearer ${token}` } })
            ])
            if (cRes.ok) setCourses(await cRes.json())
            if (sRes.ok) setActiveSession(await sRes.json())
        }
        init()
    }, [])

    // Poll
    useEffect(() => {
        let interval: any
        if (activeSession?.id) {
            const poll = async () => {
                const token = localStorage.getItem('token')
                const res = await fetch(`/api/attendance/sessions/${activeSession.id}/live`, { headers: { 'Authorization': `Bearer ${token}` } })
                if (res.ok) setAttendees((await res.json()).attendees || [])
            }
            poll()
            interval = setInterval(poll, 3000)
        }
        return () => clearInterval(interval)
    }, [activeSession])

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700">
                    <h3 className="font-bold text-lg mb-4">Session Control</h3>
                    {!activeSession ? (
                        <div className="space-y-4">
                            <select
                                className="w-full p-3 rounded-lg border border-slate-200 dark:border-slate-700 dark:bg-slate-900"
                                onChange={e => setSelectedCourse(e.target.value)}
                            >
                                <option value="">Select Course...</option>
                                {courses.map(c => <option key={c.id} value={c.course_name}>{c.course_name}</option>)}
                            </select>
                            <button
                                onClick={async () => {
                                    if (!selectedCourse) return
                                    const c = courses.find(x => x.course_name === selectedCourse)
                                    const token = localStorage.getItem('token')
                                    const res = await fetch('/api/attendance/sessions/start', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                        body: JSON.stringify({ course_id: c.id, duration_minutes: 120 })
                                    })
                                    if (res.ok) setActiveSession(await res.json())
                                }}
                                disabled={!selectedCourse}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center justify-center gap-2"
                            >
                                <Play size={20} /> Start Session
                            </button>
                        </div>
                    ) : (
                        <div className="text-center space-y-4">
                            <div className="bg-white p-4 inline-block rounded-xl shadow-inner border border-slate-100">
                                <QRCodeCanvas value={`${window.location.origin}/?room=${activeSession.room_code}`} size={180} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold">{activeSession.room_unique_number}</h2>
                                <p className="text-slate-500">Session Active</p>
                            </div>
                            <button
                                onClick={async () => {
                                    const token = localStorage.getItem('token')
                                    await fetch(`/api/attendance/sessions/${activeSession.id}/end`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
                                    setActiveSession(null)
                                    setAttendees([])
                                }}
                                className="w-full py-2 bg-red-100 text-red-600 rounded-lg font-bold"
                            >
                                End Session
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="lg:col-span-2">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 h-[600px] flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg">Live Attendance</h3>
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-bold">{attendees.length} Present</span>
                    </div>
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 dark:bg-slate-700 text-slate-500 font-medium text-sm">
                                <tr>
                                    <th className="p-3 rounded-l-lg">Student</th>
                                    <th className="p-3">Time</th>
                                    <th className="p-3">Method</th>
                                    <th className="p-3 rounded-r-lg">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {attendees.map((a, i) => (
                                    <tr key={i} className="border-b border-slate-50 dark:border-slate-700">
                                        <td className="p-3">
                                            <div className="font-bold">{a.name}</div>
                                            <div className="text-xs text-slate-500">{a.admission_number}</div>
                                        </td>
                                        <td className="p-3 font-mono text-sm">{new Date(a.time).toLocaleTimeString()}</td>
                                        <td className="p-3 text-sm">
                                            <div className="flex items-center gap-1">
                                                {a.evidence_url ? <ImageIcon size={14} /> : <Wifi size={14} />}
                                                {a.ip ? 'Remote' : 'Local'}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold">Verified</span>
                                        </td>
                                    </tr>
                                ))}
                                {attendees.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="text-center py-10 text-slate-400">Waiting for scans...</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    )
}
