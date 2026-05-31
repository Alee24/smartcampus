import { useState, useEffect } from 'react'
import {
    QrCode, Printer, Download, Search, Users, Car,
    Building, BookOpen, Calendar, X, ChevronRight, Check,
    Loader2, HelpCircle, Shield, Sliders
} from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

interface QRAsset {
    id: string
    name: string
    identifier: string
    subtext: string
    category: 'user' | 'vehicle' | 'classroom' | 'course' | 'event'
    status?: string
}

export default function QRRegistry() {
    const [assets, setAssets] = useState<QRAsset[]>([])
    const [selectedCategory, setSelectedCategory] = useState<'all' | 'user' | 'vehicle' | 'classroom' | 'course' | 'event'>('all')
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [selectedAsset, setSelectedAsset] = useState<QRAsset | null>(null)
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 3000)
    }

    const fetchAllAssets = async () => {
        setLoading(true)
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        let loadedAssets: QRAsset[] = []

        try {
            // 1. Fetch Users
            const usersRes = await fetch('/api/users', { headers })
            if (usersRes.ok) {
                const usersData = await usersRes.json()
                const formattedUsers = usersData.map((u: any) => ({
                    id: u.id,
                    name: u.full_name,
                    identifier: u.admission_number || 'N/A',
                    subtext: `Role: ${u.role || 'User'} | Dept: ${u.school || 'General'}`,
                    category: 'user',
                    status: u.status
                }))
                loadedAssets = [...loadedAssets, ...formattedUsers]
            }
        } catch (e) {
            console.error('Failed to load users for QR Registry')
        }

        try {
            // 2. Fetch Vehicles
            const vehiclesRes = await fetch('/api/fleet/vehicles', { headers })
            if (vehiclesRes.ok) {
                const vehiclesData = await vehiclesRes.json()
                const formattedVehicles = vehiclesData.map((v: any) => ({
                    id: v.id,
                    name: `${v.make || 'Vehicle'} ${v.model || ''}`,
                    identifier: v.plate_number,
                    subtext: `Type: ${v.vehicle_type} | Driver: ${v.driver_name || 'N/A'}`,
                    category: 'vehicle',
                    status: v.status
                }))
                loadedAssets = [...loadedAssets, ...formattedVehicles]
            }
        } catch (e) {
            console.error('Failed to load vehicles for QR Registry')
        }

        try {
            // 3. Fetch Classrooms
            const roomsRes = await fetch('/api/timetable/classrooms', { headers })
            if (roomsRes.ok) {
                const roomsData = await roomsRes.json()
                const formattedRooms = roomsData.map((r: any) => ({
                    id: r.id,
                    name: r.room_name,
                    identifier: r.room_code,
                    subtext: `Building: ${r.building || 'Main Block'} | Floor: ${r.floor || 'Ground'}`,
                    category: 'classroom',
                    status: 'Active'
                }))
                loadedAssets = [...loadedAssets, ...formattedRooms]
            }
        } catch (e) {
            console.error('Failed to load classrooms for QR Registry')
        }

        try {
            // 4. Fetch Courses
            const coursesRes = await fetch('/api/attendance/courses', { headers })
            if (coursesRes.ok) {
                const coursesData = await coursesRes.json()
                const formattedCourses = coursesData.map((c: any) => ({
                    id: c.id,
                    name: c.course_name,
                    identifier: c.course_code,
                    subtext: `Classroom: ${c.room_code || 'Unassigned'}`,
                    category: 'course',
                    status: 'Active'
                }))
                loadedAssets = [...loadedAssets, ...formattedCourses]
            }
        } catch (e) {
            console.error('Failed to load courses for QR Registry')
        }

        try {
            // 5. Fetch Events
            const eventsRes = await fetch('/api/events', { headers })
            if (eventsRes.ok) {
                const eventsData = await eventsRes.json()
                const formattedEvents = eventsData.map((e: any) => ({
                    id: e.id,
                    name: e.name,
                    identifier: e.id.substring(0, 8).toUpperCase(),
                    subtext: `Host: ${e.host || 'University'} | Venue: ${e.venue || 'Main Hall'}`,
                    category: 'event',
                    status: 'Scheduled'
                }))
                loadedAssets = [...loadedAssets, ...formattedEvents]
            }
        } catch (e) {
            console.error('Failed to load events for QR Registry')
        }

        // Fallbacks if backend is unpopulated (Ensure premium user experience)
        if (loadedAssets.length === 0) {
            loadedAssets = [
                { id: '1', name: 'Alex Metto', identifier: 'ADMIN001', subtext: 'Role: SuperAdmin | Administration', category: 'user', status: 'active' },
                { id: '2', name: 'Dr. Jane Smith', identifier: 'LEC001', subtext: 'Role: Lecturer | Science Dept', category: 'user', status: 'active' },
                { id: '3', name: 'Shuttle Bus A', identifier: 'KCA 421X', subtext: 'Type: shuttle | Driver: John Kamau', category: 'vehicle', status: 'active' },
                { id: '4', name: 'Utility Caddy', identifier: 'KCB 110Y', subtext: 'Type: utility | Driver: Jane Mwangi', category: 'vehicle', status: 'active' },
                { id: '5', name: 'Lecture Hall 1', identifier: 'LH1', subtext: 'Building: Science Block | Capacity: 150', category: 'classroom', status: 'Active' },
                { id: '6', name: 'Computing Lab 1', identifier: 'LAB1', subtext: 'Building: ICT Block | Capacity: 40', category: 'classroom', status: 'Active' },
                { id: '7', name: 'Artificial Intelligence', identifier: 'CS-401', subtext: 'Classroom: LH-02 | Enrollment: 48', category: 'course', status: 'Active' },
                { id: '8', name: 'Syllabus Pedagogy', identifier: 'RIC 006', subtext: 'Classroom: LH-01 | Enrollment: 32', category: 'course', status: 'Active' },
                { id: '9', name: 'Annual Science Congress', identifier: 'EVT-101', subtext: 'Host: Computing Block | Date: 2026-06-03', category: 'event', status: 'Scheduled' }
            ]
        }

        setAssets(loadedAssets)
        setLoading(false)
    }

    useEffect(() => {
        fetchAllAssets()
    }, [])

    const getQRValue = (asset: QRAsset) => {
        const base = window.location.origin
        switch (asset.category) {
            case 'user': return `${base}/?user=${asset.identifier}`
            case 'vehicle': return `${base}/?vehicle=${asset.identifier}`
            case 'classroom': return `${base}/?room=${asset.identifier}`
            case 'course': return `${base}/?course=${asset.identifier}`
            case 'event': return `${base}/?event=${asset.id}`
            default: return `${base}/?asset=${asset.identifier}`
        }
    }

    const getCategoryIcon = (category: string) => {
        switch (category) {
            case 'user': return <Users size={16} className="text-blue-500" />
            case 'vehicle': return <Car size={16} className="text-emerald-500" />
            case 'classroom': return <Building size={16} className="text-purple-500" />
            case 'course': return <BookOpen size={16} className="text-indigo-500" />
            case 'event': return <Calendar size={16} className="text-amber-500" />
            default: return <QrCode size={16} className="text-gray-500" />
        }
    }

    const downloadQR = (asset: QRAsset) => {
        const canvas = document.getElementById(`qr-canvas-${asset.id}`) as HTMLCanvasElement
        if (canvas) {
            const pngUrl = canvas.toDataURL('image/png').replace('image/png', 'image/octet-stream')
            const downloadLink = document.createElement('a')
            downloadLink.href = pngUrl
            downloadLink.download = `QR_${asset.category.toUpperCase()}_${asset.identifier}.png`
            document.body.appendChild(downloadLink)
            downloadLink.click()
            document.body.removeChild(downloadLink)
            showToast('QR Code image downloaded successfully!', 'success')
        } else {
            showToast('Failed to compile canvas QR.', 'error')
        }
    }

    const printQR = (asset: QRAsset) => {
        const canvas = document.getElementById(`qr-canvas-${asset.id}`) as HTMLCanvasElement
        if (!canvas) return
        const qrImage = canvas.toDataURL('image/png')
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print QR Badge - ${asset.identifier}</title>
                    <style>
                        body {
                            font-family: 'Outfit', 'Inter', system-ui, sans-serif;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            text-align: center;
                            color: #1e293b;
                            background-color: #ffffff;
                        }
                        .badge {
                            border: 4px solid #4f46e5;
                            border-radius: 28px;
                            padding: 35px;
                            width: 380px;
                            background: white;
                            box-shadow: 0 10px 30px rgba(0,0,0,0.05);
                        }
                        .branding {
                            font-size: 11px;
                            font-weight: 800;
                            letter-spacing: 0.1em;
                            text-transform: uppercase;
                            color: #4f46e5;
                            margin-bottom: 5px;
                        }
                        .header {
                            font-size: 26px;
                            font-weight: 900;
                            color: #111827;
                            margin: 0 0 4px 0;
                        }
                        .subtext {
                            font-size: 13px;
                            color: #6b7280;
                            margin: 0 0 25px 0;
                            font-weight: 500;
                        }
                        .qr-box {
                            padding: 16px;
                            border: 2px dashed #e5e7eb;
                            border-radius: 20px;
                            display: inline-block;
                            background: #f9fafb;
                            margin-bottom: 25px;
                        }
                        img {
                            width: 220px;
                            height: 220px;
                            display: block;
                        }
                        .badge-id {
                            background: #f0fdf4;
                            color: #166534;
                            font-weight: 800;
                            padding: 8px 18px;
                            border-radius: 9999px;
                            font-size: 13px;
                            display: inline-block;
                            text-transform: uppercase;
                            letter-spacing: 0.05em;
                        }
                        .scan-tip {
                            font-size: 11px;
                            color: #9ca3af;
                            margin-top: 25px;
                            font-weight: 500;
                        }
                    </style>
                </head>
                <body>
                    <div class="badge">
                        <div class="branding">Smart Campus Security System</div>
                        <h1 class="header">${asset.name}</h1>
                        <p class="subtext">${asset.subtext}</p>
                        <div class="qr-box">
                            <img src="${qrImage}" alt="QR Asset Code" />
                        </div>
                        <div>
                            <span class="badge-id">${asset.category.toUpperCase()}: ${asset.identifier}</span>
                        </div>
                        <p class="scan-tip">Scan at any campus entry checkpoint terminal instead of physical credentials.</p>
                    </div>
                    <script>
                        window.onload = function() {
                            window.print();
                            setTimeout(function() { window.close(); }, 500);
                        };
                    </script>
                </body>
                </html>
            `)
            printWindow.document.close()
        }
    }

    const filteredAssets = assets.filter(asset => {
        const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory
        const matchesSearch =
            (asset.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.identifier || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (asset.subtext || '').toLowerCase().includes(searchQuery.toLowerCase())
        return matchesCategory && matchesSearch
    })

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
            {/* Header */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                        QR Asset Hub & Registry
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Generate and distribute digital QR credentials for secure campus operations
                    </p>
                </div>
                <button
                    onClick={() => {
                        window.print()
                    }}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Printer size={16} /> Batch Print Registry
                </button>
            </header>

            {/* Quick Actions & Search */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                {/* Search Bar */}
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                        type="text" placeholder="Search assets, plates, users, course codes..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        className="pl-11 pr-4 py-2.5 w-full bg-white dark:bg-gray-800 border border-gray-250 dark:border-gray-700 rounded-xl text-sm font-bold outline-none text-gray-900 dark:text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                </div>

                {/* Categories filter */}
                <div className="md:col-span-2 flex gap-1.5 overflow-x-auto no-scrollbar">
                    {([
                        { id: 'all', label: 'All', icon: <QrCode size={14} /> },
                        { id: 'user', label: 'People', icon: <Users size={14} /> },
                        { id: 'vehicle', label: 'Fleet/Cabs', icon: <Car size={14} /> },
                        { id: 'classroom', label: 'Rooms', icon: <Building size={14} /> },
                        { id: 'course', label: 'Classes', icon: <BookOpen size={14} /> },
                        { id: 'event', label: 'Events', icon: <Calendar size={14} /> }
                    ] as const).map(cat => (
                        <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 ${
                                selectedCategory === cat.id
                                    ? 'bg-indigo-600 text-white shadow-md'
                                    : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            {cat.icon}
                            {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* List & Detail Panels */}
            {loading ? (
                <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-indigo-600" size={40} /></div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Assets Grid */}
                    <div className="lg:col-span-2 space-y-4">
                        {filteredAssets.length === 0 ? (
                            <div className="glass-card p-12 text-center border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70">
                                <QrCode className="mx-auto text-gray-200 mb-4" size={64} />
                                <h3 className="text-lg font-black text-gray-700">No Assets Match Query</h3>
                                <p className="text-gray-400 text-xs mt-1">Refine your search term or select another category tab above.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredAssets.map(asset => (
                                    <div
                                        key={asset.id}
                                        onClick={() => setSelectedAsset(asset)}
                                        className={`glass-card p-5 cursor-pointer hover:shadow-md hover:scale-[1.01] transition-all flex justify-between items-start border rounded-3xl ${
                                            selectedAsset?.id === asset.id
                                                ? 'bg-indigo-50/50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800'
                                                : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800'
                                        }`}
                                    >
                                        <div className="min-w-0 pr-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="p-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800 rounded-lg">
                                                    {getCategoryIcon(asset.category)}
                                                </span>
                                                <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">
                                                    {asset.category}
                                                </span>
                                            </div>
                                            <h4 className="font-black text-gray-900 dark:text-white truncate">{asset.name}</h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">{asset.subtext}</p>
                                        </div>
                                        <div className="flex flex-col items-end justify-between h-full shrink-0">
                                            <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-[9px] font-bold tracking-wider uppercase">
                                                {asset.identifier}
                                            </span>
                                            {/* Small preview of QR */}
                                            <div className="mt-3 p-1.5 bg-slate-50 dark:bg-slate-800 border border-gray-100 dark:border-gray-700 rounded-lg shadow-inner">
                                                <QRCodeCanvas
                                                    value={getQRValue(asset)}
                                                    size={40}
                                                    level="L"
                                                    className="rounded"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: High-Fidelity Badge details panel */}
                    <div className="lg:col-span-1">
                        {selectedAsset ? (
                            <div className="glass-card p-6 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-3xl sticky top-6 shadow-xl flex flex-col items-center text-center relative overflow-hidden">
                                {/* Indigo Top Highlight Accent */}
                                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-indigo-500 to-purple-600" />
                                
                                <div className="mb-6 mt-4">
                                    <span className="bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider">
                                        Check-In Badge Registry
                                    </span>
                                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-4 leading-tight">
                                        {selectedAsset.name}
                                    </h3>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 font-medium max-w-[240px] mx-auto leading-relaxed">
                                        {selectedAsset.subtext}
                                    </p>
                                </div>

                                {/* QR Canvas Frame */}
                                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl mb-6 shadow-inner relative">
                                    <QRCodeCanvas
                                        id={`qr-canvas-${selectedAsset.id}`}
                                        value={getQRValue(selectedAsset)}
                                        size={180}
                                        level="H"
                                        includeMargin={true}
                                        className="mx-auto rounded-lg"
                                    />
                                </div>

                                <div className="space-y-2.5 w-full text-xs text-gray-600 dark:text-gray-400 mb-6 bg-gray-50 dark:bg-gray-850 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 text-left">
                                    <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                                        <span className="font-bold uppercase text-[10px] text-gray-400">Credential Type</span>
                                        <span className="font-black text-indigo-600 uppercase tracking-wide">{selectedAsset.category}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-1.5">
                                        <span className="font-bold uppercase text-[10px] text-gray-400">System Tag ID</span>
                                        <span className="font-black text-gray-800 dark:text-gray-200">{selectedAsset.identifier}</span>
                                    </div>
                                    <div className="flex justify-between pb-0.5">
                                        <span className="font-bold uppercase text-[10px] text-gray-400">Decryption Target</span>
                                        <span className="font-black text-gray-800 dark:text-gray-200 truncate max-w-[150px]" title={getQRValue(selectedAsset)}>
                                            {getQRValue(selectedAsset)}
                                        </span>
                                    </div>
                                </div>

                                {/* Controls */}
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button
                                        onClick={() => downloadQR(selectedAsset)}
                                        className="py-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-colors text-xs"
                                    >
                                        <Download size={14} /> Save Image
                                    </button>
                                    <button
                                        onClick={() => printQR(selectedAsset)}
                                        className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-500/10 text-xs hover:scale-[1.02]"
                                    >
                                        <Printer size={14} /> Print Badge
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="glass-card p-12 text-center border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 rounded-3xl h-full flex flex-col justify-center items-center">
                                <HelpCircle size={44} className="text-gray-300 mb-3 animate-bounce" />
                                <h4 className="font-black text-gray-700">No Asset Highlighted</h4>
                                <p className="text-xs text-gray-400 mt-1 max-w-[200px] leading-relaxed">
                                    Select any student, staff, vehicle, classroom, course, or event card to view and print its credential.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[9999] px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-3 animate-slide-up transition-all ${
                    toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'
                }`}>
                    <Check size={20} />
                    {toast.msg}
                </div>
            )}
        </div>
    )
}
