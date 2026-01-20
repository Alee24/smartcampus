import { useState, useEffect, useRef } from 'react'
import { Camera as CameraIcon, Plus, Video, Activity, AlertTriangle, CheckCircle, XCircle, Eye, BarChart3, Wifi, WifiOff, Scan, Crosshair, Monitor } from 'lucide-react'

export default function CameraMonitoring() {
    const [activeTab, setActiveTab] = useState('cameras')
    const [cameras, setCameras] = useState<any[]>([])
    const [classrooms, setClassrooms] = useState<any[]>([])
    const [brands, setBrands] = useState<any[]>([])
    const [dashboardStats, setDashboardStats] = useState<any>(null)
    const [selectedCamera, setSelectedCamera] = useState<any>(null)
    const [showCameraModal, setShowCameraModal] = useState(false)
    const [showAnalyticsModal, setShowAnalyticsModal] = useState(false)
    const [cameraAnalytics, setCameraAnalytics] = useState<any[]>([])
    const [testingCamera, setTestingCamera] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Scanner State
    const [scanning, setScanning] = useState(false)
    const [foundDevices, setFoundDevices] = useState<any[]>([])
    const [showScanner, setShowScanner] = useState(false)

    // Webcam Tracker State
    const videoRef = useRef<HTMLVideoElement>(null)
    const [streamActive, setStreamActive] = useState(false)
    const [trackingLog, setTrackingLog] = useState<string[]>([])

    useEffect(() => {
        fetchCameras()
        fetchClassrooms()
        fetchBrands()
        fetchDashboardStats()
    }, [])

    // Cleanup webcam
    useEffect(() => {
        return () => {
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
            }
        }
    }, [])

    const fetchCameras = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/cameras/cameras', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setCameras(await res.json())
        } catch (err) { console.error(err) }
    }

    const fetchClassrooms = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/classrooms', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setClassrooms(await res.json())
        } catch (err) { console.error(err) }
    }

    const fetchBrands = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/cameras/brands', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setBrands(data.brands)
            }
        } catch (err) { console.error(err) }
    }

    const fetchDashboardStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/cameras/dashboard/stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setDashboardStats(await res.json())
        } catch (err) { console.error(err) }
    }

    // --- Network Scanner ---
    const handleScanNetwork = async () => {
        setScanning(true)
        setShowScanner(true)
        setFoundDevices([])
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/cameras/scan-network', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setFoundDevices(data.devices || [])
                if (data.devices.length === 0) alert("No cameras found on local network.")
            } else {
                alert("Scan failed.")
            }
        } catch (e) {
            console.error(e)
            alert("Network error during scan.")
        } finally {
            setScanning(false)
        }
    }

    const handleAddFoundDevice = (device: any) => {
        // Pre-fill modal
        setShowCameraModal(true)
        // Wait for modal to render then fill forms? 
        // Better: Use state for form defaults. Simpler: Just manual for now or sophisticated form state.
        // For this demo, we'll alert instructions or try to inject if possible.
        // Let's use prompts for quick add or just copy to clipboard
        navigator.clipboard.writeText(device.ip)
        alert(`IP ${device.ip} copied! Proceed to add camera.`)
    }

    // --- Webcam Tracker ---
    const toggleWebcam = async () => {
        if (streamActive) {
            // Stop
            if (videoRef.current && videoRef.current.srcObject) {
                const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
                tracks.forEach(track => track.stop());
                videoRef.current.srcObject = null;
            }
            setStreamActive(false)
        } else {
            // Start
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    setStreamActive(true)
                    // Simulate tracking log
                    setTrackingLog(prev => ["Initializing Computer Vision...", ...prev])
                    setTimeout(() => setTrackingLog(prev => ["Motion Detector: Active", ...prev]), 1000)
                    setTimeout(() => setTrackingLog(prev => ["Face Tracker: Scanning...", ...prev]), 2000)
                }
            } catch (e) {
                alert("Could not access webcam. Please allow permissions.")
            }
        }
    }

    const handleCreateCamera = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)
        const formData = new FormData(e.target as HTMLFormElement)

        const data = {
            camera_name: formData.get('camera_name'),
            camera_code: formData.get('camera_code'),
            ip_address: formData.get('ip_address'),
            port: parseInt(formData.get('port') as string) || 554,
            username: formData.get('username'),
            password: formData.get('password'),
            camera_brand: formData.get('camera_brand'),
            classroom_id: formData.get('classroom_id') || null,
            location_description: formData.get('location_description'),
            enable_people_counting: formData.get('enable_people_counting') === 'on',
            enable_motion_detection: formData.get('enable_motion_detection') === 'on',
            enable_face_detection: formData.get('enable_face_detection') === 'on',
            enable_object_detection: formData.get('enable_object_detection') === 'on',
            skip_validation: formData.get('skip_validation') === 'on'
        }

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/cameras/cameras', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                setShowCameraModal(false)
                fetchCameras()
                fetchDashboardStats()
            } else {
                const errorData = await res.json().catch(() => ({ detail: "Unknown Error" }));
                alert(`Failed to add camera: ${errorData.detail}`);
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsSaving(false)
        }
    }

    // ... (rest of logic: handleTestCamera, handleViewAnalytics etc. same as before)
    const handleTestCamera = async (cameraId: string) => {
        setTestingCamera(cameraId)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/cameras/cameras/${cameraId}/test`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const result = await res.json()
                alert(`Camera Test Result:\n${result.message}\nStatus: ${result.status}`)
                fetchCameras()
                fetchDashboardStats()
            }
        } catch (err) { console.error(err); alert('Failed to test camera') }
        finally { setTestingCamera(null) }
    }

    const handleViewAnalytics = async (camera: any) => {
        setSelectedCamera(camera)
        setShowAnalyticsModal(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/cameras/cameras/${camera.id}/analytics?hours=24`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setCameraAnalytics(await res.json())
        } catch (err) { console.error(err) }
    }

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'online': return <Wifi className="text-green-500" size={20} />
            case 'offline': return <WifiOff className="text-gray-400" size={20} />
            case 'error': return <AlertTriangle className="text-red-500" size={20} />
            default: return <WifiOff className="text-gray-400" size={20} />
        }
    }
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'online': return 'bg-green-100 text-green-700'
            case 'offline': return 'bg-gray-100 text-gray-700'
            case 'error': return 'bg-red-100 text-red-700'
            default: return 'bg-gray-100 text-gray-700'
        }
    }

    return (
        <div className="animate-fade-in p-4 md:p-8">
            <header className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Camera Monitoring System</h2>
                    <p className="text-[var(--text-secondary)]">AI-powered video analytics and room monitoring</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleScanNetwork}
                        disabled={scanning}
                        className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50"
                    >
                        {scanning ? <Activity className="animate-spin" size={18} /> : <Scan size={18} />}
                        {scanning ? "Scanning LAN..." : "Scan Network"}
                    </button>
                    <button
                        onClick={() => setShowCameraModal(true)}
                        className="flex items-center gap-2 bg-green-600 hover:bg-green-700 px-5 py-3 rounded-xl font-bold text-white shadow-lg transition-all"
                    >
                        <Plus size={18} />
                        Add Camera
                    </button>
                </div>
            </header>

            {/* Scanner Results */}
            {showScanner && (
                <div className="mb-8 p-6 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl border border-indigo-200 dark:border-indigo-800 animate-in slide-in-from-top-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
                            <Scan size={20} /> Network Scan Results
                        </h3>
                        <button onClick={() => setShowScanner(false)} className="text-indigo-500 hover:text-indigo-700"><XCircle size={20} /></button>
                    </div>

                    {scanning ? (
                        <div className="flex flex-col items-center py-8 text-indigo-500">
                            <Activity className="animate-spin mb-2" size={32} />
                            <p className="font-medium">Scanning local network for RTSP/Hikvision devices...</p>
                        </div>
                    ) : (
                        foundDevices.length === 0 ? (
                            <p className="text-center py-4 text-indigo-400">No cameras found. Ensure they are on the same subnet.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {foundDevices.map((dev, i) => (
                                    <div key={i} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-indigo-100 shadow-sm flex justify-between items-center">
                                        <div>
                                            <p className="font-bold text-indigo-900 dark:text-indigo-100">{dev.ip}</p>
                                            <p className="text-xs text-indigo-600">{dev.name}</p>
                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded">{dev.brand} : {dev.port}</span>
                                        </div>
                                        <button onClick={() => handleAddFoundDevice(dev)} className="text-sm bg-indigo-600 text-white px-3 py-1.5 rounded-lg hover:bg-indigo-700">
                                            + Add
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )
                    )}
                </div>
            )}

            {/* Dashboard Stats */}
            {dashboardStats && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[var(--text-secondary)] text-sm">Total Cameras</span>
                            <CameraIcon className="text-primary-600" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-[var(--text-primary)]">{dashboardStats.total_cameras}</div>
                    </div>
                    {/* ... other stats ... */}
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[var(--text-secondary)] text-sm">Online</span>
                            <CheckCircle className="text-green-500" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-green-600">{dashboardStats.online}</div>
                    </div>
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[var(--text-secondary)] text-sm">Active Alerts</span>
                            <AlertTriangle className="text-red-500" size={24} />
                        </div>
                        <div className="text-3xl font-bold text-red-600">{dashboardStats.active_alerts}</div>
                    </div>
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[var(--text-secondary)] text-sm">Webcam Tracker</span>
                            <Crosshair className="text-purple-500" size={24} />
                        </div>
                        <button onClick={() => setActiveTab('webcam')} className="text-sm font-bold text-purple-600 hover:underline">
                            {streamActive ? "Active" : "Launch Tracker"}
                        </button>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-[var(--border-color)]">
                <button
                    onClick={() => setActiveTab('cameras')}
                    className={`px-6 py-3 font-bold transition-all ${activeTab === 'cameras'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <CameraIcon className="inline mr-2" size={18} />
                    Cameras
                </button>
                <button
                    onClick={() => setActiveTab('webcam')}
                    className={`px-6 py-3 font-bold transition-all ${activeTab === 'webcam'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <Crosshair className="inline mr-2" size={18} />
                    Webcam Tracker
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-6 py-3 font-bold transition-all ${activeTab === 'analytics'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <BarChart3 className="inline mr-2" size={18} />
                    Analytics
                </button>
            </div>

            {/* Cameras Tab */}
            {activeTab === 'cameras' && (
                <div>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {cameras.map(camera => (
                            <div key={camera.id} className="glass-card p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                            {getStatusIcon(camera.status)}
                                            {camera.camera_name}
                                        </h4>
                                        <p className="text-sm text-[var(--text-secondary)]">{camera.camera_code}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(camera.status)}`}>
                                        {camera.status}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm mb-4">
                                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                        <Video size={14} />
                                        {camera.ip_address}:{camera.port}
                                    </div>
                                    <div className="text-[var(--text-secondary)]">
                                        Brand: <span className="font-medium capitalize">{camera.camera_brand}</span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleTestCamera(camera.id)}
                                        disabled={testingCamera === camera.id}
                                        className="flex-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm font-medium disabled:opacity-50"
                                    >
                                        {testingCamera === camera.id ? 'Testing...' : 'Test'}
                                    </button>
                                    <button
                                        onClick={() => handleViewAnalytics(camera)}
                                        className="flex-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-medium"
                                    >
                                        <Eye size={14} className="inline mr-1" />
                                        Analytics
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Webcam Tracker Tab */}
            {activeTab === 'webcam' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="glass-card p-1 overflow-hidden relative bg-black rounded-2xl aspect-video flex items-center justify-center">
                            {!streamActive && (
                                <div className="text-center">
                                    <Monitor size={48} className="text-gray-600 mx-auto mb-4" />
                                    <p className="text-gray-400 mb-4">Camera inactive</p>
                                    <button onClick={toggleWebcam} className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-bold">
                                        Start Surveillance
                                    </button>
                                </div>
                            )}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`w-full h-full object-cover ${!streamActive ? 'hidden' : ''}`}
                            />

                            {/* Overlay UI */}
                            {streamActive && (
                                <div className="absolute top-4 left-4 flex flex-col gap-2">
                                    <span className="bg-red-600 text-white px-3 py-1 rounded-md text-xs font-bold animate-pulse flex items-center gap-2">
                                        <span className="w-2 h-2 bg-white rounded-full"></span> LIVE REC
                                    </span>
                                    <span className="bg-black/50 text-white px-2 py-1 rounded text-xs font-mono border border-white/20">
                                        CAM-LOCAL-01
                                    </span>
                                </div>
                            )}

                            {/* Tracking Box Simulation */}
                            {streamActive && (
                                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-green-500/50 rounded-lg flex items-center justify-center">
                                    <div className="w-full h-[1px] bg-green-500/50 absolute top-1/2"></div>
                                    <div className="h-full w-[1px] bg-green-500/50 absolute left-1/2"></div>
                                </div>
                            )}
                        </div>

                        <div className="mt-6 flex justify-between items-center">
                            <div className="flex gap-4">
                                <button onClick={toggleWebcam} className={`px-6 py-3 rounded-xl font-bold text-white transition-all ${streamActive ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}>
                                    {streamActive ? "Stop Tracking" : "Start Tracking"}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 h-full flex flex-col">
                        <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                            <Activity className="text-blue-500" /> Live Tracking Logs
                        </h3>
                        <div className="flex-1 bg-black/5 rounded-xl p-4 font-mono text-xs overflow-y-auto max-h-[400px] flex flex-col-reverse">
                            {trackingLog.map((log, i) => (
                                <div key={i} className="mb-2 border-l-2 border-green-500 pl-2">
                                    <span className="text-gray-400">[{new Date().toLocaleTimeString()}]</span> <span className="text-gray-700 dark:text-gray-300">{log}</span>
                                </div>
                            ))}
                            {trackingLog.length === 0 && <p className="text-gray-400 italic">System ready. Start camera to initialize tracking.</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Analytics Tab */}
            {activeTab === 'analytics' && (
                <div>
                    <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6">System Analytics</h3>
                    <div className="glass-card p-8 text-center">
                        <Activity size={48} className="mx-auto mb-4 text-[var(--text-secondary)]" />
                        <p className="text-[var(--text-secondary)]">Select a camera to view detailed analytics</p>
                    </div>
                </div>
            )}

            {/* Add Camera Modal */}
            {showCameraModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Add IP Camera</h3>
                        <form onSubmit={handleCreateCamera} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <input name="camera_name" placeholder="Camera Name" required className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="camera_code" placeholder="Camera Code (e.g., CAM-LH1-01)" required className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="ip_address" placeholder="IP Address" required className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="port" type="number" placeholder="Stream Port (Default: 554)" defaultValue="554" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <p className="col-span-2 text-xs text-yellow-600 dark:text-yellow-400 -mt-2 ml-1">
                                    Note: Use the <strong>RTSP Port</strong> (usually 554), not the Management Port (8000).
                                </p>
                                <input name="username" placeholder="Username" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="password" type="password" placeholder="Password" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />

                                <select name="camera_brand" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                    {brands.map(brand => (
                                        <option key={brand.id} value={brand.id}>{brand.name}</option>
                                    ))}
                                </select>

                                <select name="classroom_id" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                    <option value="">Select Room (Optional)</option>
                                    {classrooms.map(room => (
                                        <option key={room.id} value={room.id}>{room.room_code} - {room.room_name}</option>
                                    ))}
                                </select>
                            </div>

                            <input name="location_description" placeholder="Location Description" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />

                            <div>
                                <p className="font-bold text-[var(--text-primary)] mb-2">AI Features:</p>
                                <div className="grid grid-cols-2 gap-2">
                                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <input type="checkbox" name="enable_people_counting" defaultChecked className="rounded" />
                                        People Counting
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <input type="checkbox" name="enable_motion_detection" defaultChecked className="rounded" />
                                        Motion Detection
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <input type="checkbox" name="enable_face_detection" className="rounded" />
                                        Face Detection
                                    </label>
                                    <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                        <input type="checkbox" name="enable_object_detection" className="rounded" />
                                        Object Detection
                                    </label>
                                </div>
                            </div>

                            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-4 rounded-xl">
                                <label className="flex items-start gap-3 cursor-pointer">
                                    <input type="checkbox" name="skip_validation" className="rounded mt-1" />
                                    <div>
                                        <p className="font-bold text-yellow-800 dark:text-yellow-200 text-sm">Skip Connection Test</p>
                                        <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                                            Check this if the camera is on a different subnet (e.g., your computer is on 172.16.5.x and camera is on 172.16.9.x).
                                            The camera will be added without testing the connection first.
                                        </p>
                                    </div>
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowCameraModal(false)} className="px-6 py-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                                <button type="submit" disabled={isSaving} className="px-6 py-3 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold disabled:opacity-50 disabled:cursor-wait">
                                    {isSaving ? "Saving..." : "Add Camera"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Analytics Modal */}
            {showAnalyticsModal && selectedCamera && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-2xl w-full max-w-4xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-bold text-[var(--text-primary)]">Analytics: {selectedCamera.camera_name}</h3>
                            <button onClick={() => setShowAnalyticsModal(false)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]">✕</button>
                        </div>
                        {/* Analytics Content (kept from previous version) */}
                        <div className="space-y-4">
                            {cameraAnalytics.length === 0 ? <p className="text-center">No data</p> : cameraAnalytics.map((a, i) => (
                                <div key={i} className="glass-card p-4">
                                    <span className="font-bold">{new Date(a.timestamp).toLocaleString()}</span> - People: {a.people_count}, Motion: {a.motion_level}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
