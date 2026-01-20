import { useState, useRef, useEffect } from 'react'
import { Scan, ShieldAlert, BadgeCheck, XCircle, Camera, Car, RefreshCw, StopCircle, Clock, TrendingUp, Activity, Search } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function GateControl() {
    const [admissionNumber, setAdmissionNumber] = useState('')
    const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'rejected' | 'scanning'>('idle')
    const [lastScan, setLastScan] = useState<any>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [scanMode, setScanMode] = useState<'qr' | 'plate' | null>(null)

    // Manual Vehicle Logic
    const [showManualVehicle, setShowManualVehicle] = useState(false)
    const [manualPlate, setManualPlate] = useState('')
    const [manualPassengers, setManualPassengers] = useState(1)

    // Event & Visitor State
    const [showEventModal, setShowEventModal] = useState(false)
    const [eventData, setEventData] = useState<any>(null)
    const [visitorForm, setVisitorForm] = useState({ name: '', id: '', phone: '' })

    // Permission State
    const [showPermissionModal, setShowPermissionModal] = useState(false)
    const [permissionError, setPermissionError] = useState('')

    // Driver Details State
    const [manualDriverName, setManualDriverName] = useState('')
    const [manualDriverContact, setManualDriverContact] = useState('')
    const [manualDriverId, setManualDriverId] = useState('')
    const [plateSuggestions, setPlateSuggestions] = useState<any[]>([])

    // Search & View Record State
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedVehicleLog, setSelectedVehicleLog] = useState<any>(null)

    const handlePlateSearch = async (val: string) => {
        const v = val.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
        setManualPlate(v)
        if (v.length > 1) {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`/api/gate/vehicles/search?q=${v}`, { headers: { 'Authorization': `Bearer ${token}` } })
                if (res.ok) setPlateSuggestions(await res.json())
            } catch (e) { }
        } else {
            setPlateSuggestions([])
        }
    }

    const selectSuggestion = (v: any) => {
        setManualPlate(v.plate_number)
        setManualDriverName(v.driver_name || '')
        setManualDriverContact(v.driver_contact || '')
        setManualDriverId(v.driver_id_number || '')
        setPlateSuggestions([])
    }

    const submitManualVehicle = async () => {
        if (!manualPlate.trim()) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/manual-vehicle-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    plate_number: manualPlate,
                    passengers: manualPassengers,
                    driver_name: manualDriverName,
                    driver_contact: manualDriverContact,
                    driver_id_number: manualDriverId
                })
            })
            const result = await res.json()
            if (res.ok) {
                setScanStatus('success')
                setLastScan({
                    name: result.data.plate,
                    role: `Driver: ${manualDriverName || 'Unknown'}`,
                    time: result.data.time,
                    image: result.data.image,
                    isVehicle: true
                })
                setShowManualVehicle(false)
                setManualPlate('')
                setManualPassengers(1)
                setManualDriverName('')
                setManualDriverContact('')
                setManualDriverId('')
            } else {
                alert(result.detail || "Error logging vehicle")
            }
            // Refresh List
            // fetchVehicleData() - Need to expose or trigger
        } catch (e) {
            console.error(e)
            alert("Network Error")
        }
    }

    const handleExit = async (plate: string) => {
        if (!confirm(`Mark vehicle ${plate} as exited?`)) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/vehicle-exit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ plate_number: plate })
            })
            if (res.ok) {
                const data = await res.json()
                setRecentVehicles(prev => prev.map(v => v.plate === plate && !v.exit_time ? { ...v, exit_time: data.time } : v))
            } else {
                alert("Error recording exit (Vehicle might not be inside)")
            }
        } catch (e) { alert("Network Error") }
    }


    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)

    const handleManualScan = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ admission_number: admissionNumber })
            })

            const result = await res.json()

            if (result.status === 'allowed') {
                setScanStatus('success')
                setLastScan(result.data)
            } else if (result.status === 'event_pass') {
                setEventData(result.data)
                setShowEventModal(true)
                setScanStatus('idle') // Keep camera/scanner ready? Or show success? Let's show modal.
            } else {
                setScanStatus('rejected')
                setLastScan(result.data || {
                    name: 'Unknown / Not Found',
                    role: 'N/A',
                    time: new Date().toLocaleTimeString()
                })
            }
        } catch (err) {
            setScanStatus('rejected')
        }
    }

    const [vehicleStats, setVehicleStats] = useState<any>({
        total_today: 0,
        current_inside: 0,
        manual_entries: 0,
        unique_vehicles: 0,
        total_exited: 0,
        longest_stays: []
    })
    const [recentVehicles, setRecentVehicles] = useState<any[]>([])

    useEffect(() => {
        const fetchVehicleData = async () => {
            try {
                const token = localStorage.getItem('token')
                const headers = { 'Authorization': `Bearer ${token}` }

                const statsRes = await fetch('/api/gate/vehicle-stats', { headers })
                if (statsRes.ok) setVehicleStats(await statsRes.json())

                const logsRes = await fetch('/api/gate/vehicle-logs', { headers })
                if (logsRes.ok) setRecentVehicles(await logsRes.json())
            } catch (e) { console.error(e) }
        }
        fetchVehicleData()
        const interval = setInterval(fetchVehicleData, 30000)
        return () => clearInterval(interval)
    }, [])

    const startCamera = async (mode: 'qr' | 'plate') => {
        setPermissionError('');
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            setStream(s)
            setScanMode(mode)
            setScanStatus('scanning')
            setShowPermissionModal(false)
        } catch (err: any) {
            console.error("Camera Access Error:", err)
            setScanMode(mode) // Remember mode to retry

            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionError('denied');
                setShowPermissionModal(true);
            } else if (err.name === 'NotFoundError') {
                alert("No camera device found!");
            } else {
                setPermissionError('unknown');
                setShowPermissionModal(true);
            }
        }
    }

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
        setStream(null)
        setScanMode(null)
        setScanStatus('idle')
    }

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    const captureAndProcess = () => {
        if (!videoRef.current || !canvasRef.current) return

        const context = canvasRef.current.getContext('2d')
        if (!context) return

        // Match canvas size to video
        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)

        // Get Blob
        canvasRef.current.toBlob(async (blob) => {
            if (!blob) return

            // Stop stream? Or keep it running? Let's stop to process
            stopCamera()

            if (scanMode === 'plate') {
                // Upload
                const formData = new FormData()
                formData.append('file', blob, 'plate_scan.jpg')

                try {
                    const token = localStorage.getItem('token')
                    const res = await fetch('/api/gate/scan-vehicle', {
                        method: 'POST',
                        headers: { 'Authorization': `Bearer ${token}` },
                        body: formData
                    })
                    const data = await res.json()

                    if (data.status === 'allowed' || data.status === 'visitor') {
                        setScanStatus('success')
                        setLastScan({
                            name: data.data.plate,
                            role: `Vehicle (${data.data.make})`,
                            time: data.data.entry_time,
                            image: data.data.image_url,
                            isVehicle: true
                        })
                    } else {
                        setScanStatus('rejected')
                        setLastScan({
                            name: data.data.plate || "Unknown",
                            role: "Vehicle",
                            time: new Date().toLocaleTimeString(),
                            isVehicle: true,
                            image: data.data.image_url,
                        })
                    }
                } catch (e) {
                    alert("Error processing plate")
                    setScanStatus('idle')
                }
            } else {
                // QR Logic implementation (Client side decoding or server)
                alert("QR Code captured (Logic Pending)")
                setScanStatus('idle')
            }
        }, 'image/jpeg')
    }

    return (
        <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-8">
            <canvas ref={canvasRef} className="hidden" />

            {/* Control Panel */}
            <div className="glass-card p-6 h-fit">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <Scan className="text-primary-500" />
                    Gate Entry Control
                </h3>

                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Manual Entry / Barcode</label>
                        <div className="flex gap-2">
                            <input
                                value={admissionNumber}
                                onChange={(e) => setAdmissionNumber(e.target.value)}
                                placeholder="Enter Adm No or Plate..."
                                className="flex-1 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] outline-none focus:border-primary-500 transition-colors"
                            />
                            <button
                                onClick={handleManualScan}
                                className="bg-primary-600 hover:bg-primary-500 text-white px-6 rounded-lg font-medium transition-colors"
                            >
                                Verify
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-[var(--border-color)] pt-6">
                        <p className="text-sm text-[var(--text-secondary)] mb-4">Quick Actions</p>
                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => startCamera('qr')}
                                className="p-4 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-all flex flex-col items-center gap-2 text-center group"
                            >
                                <Scan size={24} className="text-purple-500 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Scan QR Code</span>
                            </button>
                            <button
                                onClick={() => startCamera('plate')}
                                className="p-4 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-all flex flex-col items-center gap-2 text-center group"
                            >
                                <Car size={24} className="text-blue-500 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Scan Number Plate</span>
                            </button>

                            <button
                                onClick={() => setShowManualVehicle(true)}
                                className="p-4 rounded-xl border border-[var(--border-color)] hover:bg-[var(--bg-primary)] transition-all flex flex-col items-center gap-2 text-center group"
                            >
                                <Car size={24} className="text-orange-500 group-hover:scale-110 transition-transform" />
                                <span className="text-sm font-medium">Manual Vehicle</span>
                            </button>
                            <button
                                onClick={async () => {
                                    if (!confirm("⚠️ TRIGGER SECURITY ALARM?\n\nThis will notify all security personnel.")) return;
                                    try {
                                        const token = localStorage.getItem('token');
                                        await fetch('/api/gate/alarm', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
                                        alert("🚨 ALARM TRIGGERED! Security notified.");
                                    } catch (e) { alert("Network Error"); }
                                }}
                                className="col-span-2 p-4 rounded-xl border border-[var(--border-color)] hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex flex-col items-center gap-2 text-center group active:scale-95"
                            >
                                <ShieldAlert size={24} className="text-red-500 group-hover:scale-110 transition-transform animate-pulse" />
                                <span className="text-sm font-medium text-red-600 dark:text-red-400">Trigger Alarm</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Live Feed / Result */}
            <div className={`glass-card p-6 min-h-[500px] flex flex-col ${scanStatus === 'scanning' ? 'bg-black' : ''}`}>
                <h3 className={`text-xl font-bold mb-4 ${scanStatus === 'scanning' ? 'text-white' : ''}`}>
                    {scanStatus === 'scanning' ? (scanMode === 'plate' ? 'Align Number Plate' : 'Scan QR Code') : 'Verification Result'}
                </h3>

                <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-xl">
                    {/* IDLE */}
                    {scanStatus === 'idle' && (
                        <div className="text-center text-[var(--text-secondary)]">
                            <div className="w-24 h-24 rounded-full bg-[var(--bg-primary)] border-2 border-dashed border-[var(--border-color)] flex items-center justify-center mx-auto mb-4">
                                <Scan size={32} className="opacity-50" />
                            </div>
                            <p>Ready to scan...</p>
                        </div>
                    )}

                    {/* SCANNING */}
                    {scanStatus === 'scanning' && (
                        <div className="w-full h-full relative flex flex-col items-center justify-center">
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover absolute inset-0 rounded-xl"
                            />
                            {/* Overlay */}
                            <div className="relative z-10 w-64 h-32 border-2 border-white/50 rounded-lg flex flex-col justify-between p-2 backdrop-blur-[2px]">
                                <div className="flex justify-between">
                                    <div className="w-4 h-4 border-l-2 border-t-2 border-white"></div>
                                    <div className="w-4 h-4 border-r-2 border-t-2 border-white"></div>
                                </div>
                                <div className="text-center text-white/80 text-xs font-mono animate-pulse">
                                    SEARCHING...
                                </div>
                                <div className="flex justify-between">
                                    <div className="w-4 h-4 border-l-2 border-b-2 border-white"></div>
                                    <div className="w-4 h-4 border-r-2 border-b-2 border-white"></div>
                                </div>
                            </div>

                            <div className="absolute bottom-6 flex gap-4 z-20">
                                <button
                                    onClick={stopCamera}
                                    className="p-3 rounded-full bg-red-500/80 text-white hover:bg-red-600 transition-colors"
                                >
                                    <StopCircle size={24} />
                                </button>
                                <button
                                    onClick={captureAndProcess}
                                    className="p-4 rounded-full bg-white text-primary-600 shadow-xl hover:scale-105 transition-transform"
                                >
                                    <Camera size={32} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* SUCCESS */}
                    {scanStatus === 'success' && (
                        <div className="text-center animate-fade-in w-full">
                            <div className={`w-36 h-36 rounded-full border-4 ${lastScan.isVehicle ? 'border-blue-500' : 'border-green-500'} p-1 mx-auto mb-6 shadow-lg overflow-hidden`}>
                                <img src={lastScan.image} className="w-full h-full object-cover rounded-full bg-white" alt="Result" />
                            </div>
                            <div className={`inline-flex items-center gap-2 ${lastScan.isVehicle ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'} px-4 py-1 rounded-full text-sm font-bold mb-4`}>
                                <BadgeCheck size={16} /> ACCESS GRANTED
                            </div>
                            <h2 className="text-3xl font-bold mb-1">{lastScan.name}</h2>
                            <p className="text-[var(--text-secondary)]">{lastScan.role} • {lastScan.time}</p>

                            <button onClick={() => setScanStatus('idle')} className="mt-8 text-sm text-[var(--text-secondary)] hover:text-primary-500 flex items-center justify-center gap-2 mx-auto">
                                <RefreshCw size={14} /> Scan Next
                            </button>
                        </div>
                    )}

                    {/* REJECTED */}
                    {scanStatus === 'rejected' && (
                        <div className="text-center animate-fade-in w-full">
                            <div className="w-32 h-32 rounded-full border-4 border-red-500 bg-red-500/10 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/20">
                                {lastScan && lastScan.image ? (
                                    <img src={lastScan.image} className="w-full h-full object-cover rounded-full opacity-80" alt="Rejected" />
                                ) : (
                                    <XCircle size={64} className="text-red-500" />
                                )}
                            </div>
                            <div className="inline-flex items-center gap-2 bg-red-500/10 text-red-500 px-4 py-1 rounded-full text-sm font-bold mb-4">
                                <ShieldAlert size={16} /> ACCESS DENIED
                            </div>
                            <h2 className="text-3xl font-bold mb-1">{lastScan?.name || "Unknown"}</h2>
                            <p className="text-[var(--text-secondary)]">Logged at {lastScan?.time || new Date().toLocaleTimeString()}</p>

                            <button onClick={() => setScanStatus('idle')} className="mt-8 text-sm text-[var(--text-secondary)] hover:text-primary-500 flex items-center justify-center gap-2 mx-auto">
                                <RefreshCw size={14} /> Try Again
                            </button>
                        </div>
                    )}
                </div>
            </div>
            {/* Vehicle Analytics Section */}
            <div className="col-span-1 lg:col-span-2 mt-8 animate-fade-in">
                <h3 className="text-xl font-bold mb-6 text-[var(--text-primary)] flex items-center gap-2">
                    <Activity className="text-blue-600" /> Vehicle Activity Intelligence
                </h3>

                {/* Stats Grid */}
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg"><Car size={20} /></div>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Total Today</span>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{vehicleStats.total_today}</p>
                    </div>

                    {/* Parked / Inside */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-lg"><StopCircle size={20} /></div>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Parked Now</span>
                        </div>
                        <div className="flex items-baseline gap-2">
                            <p className="text-3xl font-bold text-[var(--text-primary)]">{vehicleStats.current_inside}</p>
                            <span className="text-sm text-[var(--text-secondary)]">vehicles</span>
                        </div>
                    </div>

                    {/* Exited */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-2 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-lg"><TrendingUp size={20} /></div>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Exited</span>
                        </div>
                        <p className="text-3xl font-bold text-[var(--text-primary)]">{vehicleStats.total_exited || 0}</p>
                    </div>

                    {/* Longest Stays */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-5 rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden flex flex-col justify-center">
                        <div className="flex items-center gap-2 mb-3">
                            <Clock size={16} className="text-purple-500" />
                            <span className="text-sm font-medium text-[var(--text-secondary)]">Longest Durations</span>
                        </div>
                        <div className="space-y-3">
                            {vehicleStats.longest_stays && vehicleStats.longest_stays.length > 0 ? (
                                vehicleStats.longest_stays.slice(0, 3).map((v: any, i: number) => (
                                    <div key={i} className="flex justify-between items-center text-xs border-b border-[var(--border-color)] last:border-0 pb-1 last:pb-0">
                                        <div className="font-bold text-[var(--text-primary)]">{v.plate}</div>
                                        <div className="text-[var(--text-secondary)] font-mono">{v.duration_fmt}</div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-xs text-gray-400 italic">No long stays yet</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Traffic Analytics Charts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-fade-in delay-100">
                    {/* Hourly Traffic Trend */}
                    <div className="lg:col-span-2 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                        <h4 className="font-bold text-[var(--text-primary)] mb-4">Hourly Traffic Trends</h4>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={vehicleStats.hourly_traffic || []}>
                                    <defs>
                                        <linearGradient id="colorEntries" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExits" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                    <XAxis dataKey="time" stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                                        itemStyle={{ color: 'var(--text-primary)' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="entries" name="Entries" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorEntries)" />
                                    <Area type="monotone" dataKey="exits" name="Exits" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorExits)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Entry Composition */}
                    <div className="bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex flex-col items-center justify-center">
                        <h4 className="font-bold text-[var(--text-primary)] mb-4 w-full text-left">Current Status</h4>
                        <div className="h-[250px] w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Parked', value: vehicleStats.current_inside || 0 },
                                            { name: 'Exited', value: vehicleStats.total_exited || 0 }
                                        ]}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#F97316" /> {/* Orange for Parked */}
                                        <Cell fill="#10B981" /> {/* Green for Exited */}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-3xl font-bold text-[var(--text-primary)]">{vehicleStats.total_today || 0}</span>
                                <span className="text-xs text-[var(--text-secondary)] uppercase">Total Vehicles</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Activity Table */}
                <div className="glass-card overflow-hidden">
                    <div className="px-6 py-4 border-b border-[var(--border-color)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <h4 className="font-bold text-[var(--text-primary)]">Recent Vehicle Logs</h4>
                        <div className="relative w-full sm:w-64">
                            <input
                                className="w-full pl-9 pr-4 py-2 rounded-lg text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] outline-none focus:border-blue-500 transition-colors"
                                placeholder="Search Plate, Name..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                                <tr>
                                    <th className="px-6 py-3 font-medium">Plate Number</th>
                                    <th className="px-6 py-3 font-medium">Driver</th>
                                    <th className="px-6 py-3 font-medium">Vehicle</th>
                                    <th className="px-6 py-3 font-medium">Timing</th>
                                    <th className="px-6 py-3 font-medium">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {recentVehicles.filter(log => {
                                    if (!searchQuery) return true;
                                    const q = searchQuery.toLowerCase();
                                    return log.plate?.toLowerCase().includes(q) || log.driver_name?.toLowerCase().includes(q) || log.make?.toLowerCase().includes(q);
                                }).length === 0 ? (
                                    <tr><td colSpan={5} className="px-6 py-8 text-center text-[var(--text-secondary)]">No matching activity</td></tr>
                                ) : (
                                    recentVehicles.filter(log => {
                                        if (!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        return log.plate?.toLowerCase().includes(q) || log.driver_name?.toLowerCase().includes(q) || log.make?.toLowerCase().includes(q);
                                    }).slice(0, 50).map((log: any, i) => (
                                        <tr
                                            key={log.id || i}
                                            onClick={() => setSelectedVehicleLog(log)}
                                            className="hover:bg-[var(--bg-primary)]/50 transition-colors cursor-pointer group"
                                        >
                                            <td className="px-6 py-4 font-mono font-bold text-lg">{log.plate}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold">{log.driver_name || 'Unknown'}</div>
                                                <div className="text-xs text-[var(--text-secondary)]">{log.driver_contact || log.role || ''}</div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-[var(--text-primary)] font-medium">{log.make} {log.model}</span>
                                                    <span className="text-xs text-[var(--text-secondary)]">{log.color !== 'Unknown' ? log.color : ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col text-sm">
                                                    <div className="text-green-600 font-medium whitespace-nowrap">IN: {log.time}</div>
                                                    {log.exit_time ? (
                                                        <div className="text-red-600 font-medium whitespace-nowrap">OUT: {log.exit_time}</div>
                                                    ) : (
                                                        <div className="text-gray-400 italic">Inside</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {!log.exit_time ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleExit(log.plate); }}
                                                        className="bg-red-100 text-red-600 hover:bg-red-200 px-3 py-1 rounded-lg text-xs font-bold uppercase transition-colors shadow-sm opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                    >
                                                        Mark Exit
                                                    </button>
                                                ) : (
                                                    <span className="text-gray-400 text-xs font-medium">COMPLETED</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* View Record Modal */}
            {selectedVehicleLog && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in relative">
                        <button
                            onClick={() => setSelectedVehicleLog(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <XCircle size={24} />
                        </button>

                        <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-[var(--text-primary)]">
                            <Car className="text-blue-500" /> Vehicle Entry Details
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
                                    {selectedVehicleLog.driver_name ? selectedVehicleLog.driver_name[0] : (selectedVehicleLog.plate ? selectedVehicleLog.plate[0] : 'V')}
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">{selectedVehicleLog.driver_name || 'Unknown Driver'}</h4>
                                    <p className="text-sm text-[var(--text-secondary)]">{selectedVehicleLog.driver_contact || 'No Contact Info'}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">ID: {selectedVehicleLog.driver_id_number || selectedVehicleLog.role || '-'}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase font-bold mb-1">Plate Number</p>
                                    <p className="font-mono font-bold text-xl">{selectedVehicleLog.plate}</p>
                                </div>
                                <div className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
                                    <p className="text-xs text-[var(--text-secondary)] uppercase font-bold mb-1">Vehicle</p>
                                    <p className="font-medium text-sm">{selectedVehicleLog.make} {selectedVehicleLog.model}</p>
                                    <p className="text-xs text-[var(--text-secondary)]">{selectedVehicleLog.color}</p>
                                </div>
                            </div>

                            <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-[var(--text-secondary)]">Entry Time</span>
                                    <span className="font-bold font-mono text-green-600">{selectedVehicleLog.time}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                                    <span className="text-sm text-[var(--text-secondary)]">Exit Time</span>
                                    {selectedVehicleLog.exit_time ? (
                                        <span className="font-bold font-mono text-red-600">{selectedVehicleLog.exit_time}</span>
                                    ) : (
                                        <span className="text-sm italic text-gray-400">Still Inside</span>
                                    )}
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                                    <span className="text-sm text-[var(--text-secondary)]">Visit Count</span>
                                    <span className="font-bold bg-blue-100 text-blue-700 px-2 rounded-full text-xs">#{selectedVehicleLog.entry_count || 1}</span>
                                </div>
                            </div>

                            {!selectedVehicleLog.exit_time && (
                                <button
                                    onClick={() => {
                                        handleExit(selectedVehicleLog.plate);
                                        setSelectedVehicleLog(null);
                                    }}
                                    className="w-full py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl font-bold hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    MARK AS EXITED
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Vehicle Modal (Existing code follows) */}
            {showManualVehicle && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-fade-in relative">
                        <button
                            onClick={() => setShowManualVehicle(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <XCircle size={24} />
                        </button>

                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-[var(--text-primary)]">
                            <Car className="text-blue-500" /> Manual Vehicle Log
                        </h3>

                        <div className="space-y-5">
                            <div className="relative">
                                <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Number Plate</label>
                                <input
                                    className="w-full p-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] uppercase font-mono text-xl font-bold tracking-wider outline-none focus:border-blue-500 transition-colors"
                                    placeholder="KCA 123B"
                                    value={manualPlate}
                                    onChange={e => handlePlateSearch(e.target.value)}
                                    autoFocus
                                />
                                {plateSuggestions.length > 0 && (
                                    <div className="absolute z-20 w-full mt-2 bg-white dark:bg-gray-800 border border-[var(--border-color)] rounded-xl shadow-2xl max-h-60 overflow-y-auto transform translate-y-0">
                                        {plateSuggestions.map((v: any) => (
                                            <div key={v.id} onClick={() => selectSuggestion(v)} className="p-3 hover:bg-blue-50 dark:hover:bg-blue-900/20 cursor-pointer border-b border-[var(--border-color)] last:border-0 flex justify-between items-center group">
                                                <div>
                                                    <div className="font-bold text-lg font-mono">{v.plate_number}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{v.driver_name || 'No Driver Info'}</div>
                                                </div>
                                                <div className="text-xs font-bold text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity">SELECT</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Driver Name</label>
                                    <input className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-blue-500"
                                        value={manualDriverName} onChange={e => setManualDriverName(e.target.value)} placeholder="Full Name" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Contact</label>
                                    <input className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-blue-500"
                                        value={manualDriverContact} onChange={e => setManualDriverContact(e.target.value)} placeholder="Phone Number" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">ID Number</label>
                                    <input className="w-full p-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-blue-500"
                                        value={manualDriverId} onChange={e => setManualDriverId(e.target.value)} placeholder="National ID" />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Passengers</label>
                                <div className="flex items-center gap-4">
                                    <button onClick={() => setManualPassengers(Math.max(1, manualPassengers - 1))} className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-bold text-xl hover:bg-gray-100">-</button>
                                    <span className="flex-1 text-center font-bold text-2xl">{manualPassengers}</span>
                                    <button onClick={() => setManualPassengers(manualPassengers + 1)} className="w-12 h-12 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] font-bold text-xl hover:bg-gray-100">+</button>
                                </div>
                            </div>

                            <button onClick={submitManualVehicle} disabled={!manualPlate.trim()} className="w-full py-4 mt-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-bold shadow-lg hover:shadow-blue-500/25 transition-all hover:scale-[1.02]">
                                {manualDriverName ? 'LOG ENTRY & UPDATE RECORD' : 'LOG VEHICLE ENTRY'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Event Visitor Registration Modal */}
            {showEventModal && eventData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[110] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-fade-in relative">
                        <button onClick={() => setShowEventModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>

                        <div className="mb-6 flex items-center gap-3">
                            <div className="p-3 bg-purple-100 rounded-xl text-purple-600">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-[var(--text-primary)]">Event Check-In</h3>
                                <p className="text-sm text-[var(--text-secondary)]">{eventData.name}</p>
                            </div>
                        </div>

                        {!eventData.is_active && (
                            <div className="mb-4 p-3 bg-red-100 text-red-600 rounded-lg text-sm font-bold flex items-center gap-2">
                                <ShieldAlert size={16} /> Event is closed!
                            </div>
                        )}

                        <form onSubmit={async (e) => {
                            e.preventDefault();
                            try {
                                const token = localStorage.getItem('token')
                                const res = await fetch(`/api/events/${eventData.event_id}/register-visitor`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({
                                        visitor_name: visitorForm.name,
                                        visitor_identifier: visitorForm.id,
                                        phone_number: visitorForm.phone
                                    })
                                })
                                if (res.ok) {
                                    alert("Visitor Checked In Successfully! ✅");
                                    setShowEventModal(false);
                                    setVisitorForm({ name: '', id: '', phone: '' });
                                    setScanStatus('success');
                                    setLastScan({
                                        name: visitorForm.name,
                                        role: `Visitor - ${eventData.name}`,
                                        time: new Date().toLocaleTimeString(),
                                        image: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png" // Fallback
                                    })
                                } else {
                                    alert("Check-in Failed");
                                }
                            } catch (err) { console.error(err); alert("Network Error"); }
                        }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Visitor Name</label>
                                <input required value={visitorForm.name} onChange={e => setVisitorForm({ ...visitorForm, name: e.target.value })} className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]" placeholder="Full Name" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">ID / Admission No</label>
                                    <input required value={visitorForm.id} onChange={e => setVisitorForm({ ...visitorForm, id: e.target.value })} className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]" placeholder="ID Number" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-1">Phone Number</label>
                                    <input required value={visitorForm.phone} onChange={e => setVisitorForm({ ...visitorForm, phone: e.target.value })} className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]" placeholder="0712345678" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-[image:var(--gradient-primary)] text-white font-bold rounded-xl shadow-lg mt-4" disabled={!eventData.is_active}>
                                Register Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Permission Request Modal */}
            {showPermissionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-fade-in">
                        <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Camera size={40} className="text-red-600 dark:text-red-400" />
                        </div>

                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                            {permissionError === 'denied' ? 'Camera Access Denied' : 'Camera Access Needed'}
                        </h3>

                        <p className="text-gray-600 dark:text-gray-300 mb-8">
                            {permissionError === 'denied'
                                ? "It looks like you denied camera access. Please reset permissions in your browser settings to continue."
                                : "We need access to your camera to scan QR codes and Number Plates."
                            }
                        </p>

                        <div className="space-y-3">
                            {permissionError !== 'denied' && (
                                <button
                                    onClick={() => startCamera(scanMode || 'qr')}
                                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-primary-600/30 transition-all active:scale-95"
                                >
                                    Allow Camera
                                </button>
                            )}

                            <button
                                onClick={() => setShowPermissionModal(false)}
                                className="w-full py-3 text-gray-500 font-bold hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                            >
                                Cancel
                            </button>
                        </div>

                        {permissionError === 'denied' && (
                            <div className="mt-6 p-4 bg-gray-100 dark:bg-gray-700/50 rounded-xl text-xs text-left text-gray-600 dark:text-gray-400">
                                <p className="font-bold mb-1">How to enable:</p>
                                <ul className="list-disc pl-4 space-y-1">
                                    <li>Tap the lock icon 🔒 in address bar</li>
                                    <li>Site Settings / Permissions</li>
                                    <li>Allow Camera</li>
                                    <li>Reload Page</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
