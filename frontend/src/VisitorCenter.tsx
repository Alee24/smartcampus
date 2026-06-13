import { useState, useEffect } from 'react'
import {
    Users, Car, Truck, Calendar, Search, Sliders,
    Download, RefreshCw, FileText, X, Eye, TrendingUp,
    ShieldAlert, Loader2, CalendarRange, Clock
} from 'lucide-react'
import { createPortal } from 'react-dom'

interface Stats {
    total_visitors_today: number
    taxis_today: number
    deliveries_today: number
    active_vehicles_today: number
    total_events: number
    last_event: {
        name: string
        date: string
        expected: number | string
        registered: number
        checked_in: number
        attendance_rate: string
    } | null
}

interface LogEntry {
    id: string
    visitor_name: string
    visitor_type: 'visitor' | 'taxi' | 'delivery' | 'event_guest'
    id_number: string | null
    contact: string | null
    plate_number: string | null
    passengers: number
    purpose: string | null
    time_in: string
    time_out: string | null
    status: string
    profile_image: string | null
    delivery_image_package: string | null
    delivery_image_receipt: string | null
    event_name?: string | null
}

export default function VisitorCenter() {
    const [stats, setStats] = useState<Stats | null>(null)
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedType, setSelectedType] = useState<string>('all')
    const [selectedStatus, setSelectedStatus] = useState<string>('all')
    const [selectedDate, setSelectedDate] = useState<string>('')
    const [previewImage, setPreviewImage] = useState<{ src: string, title: string } | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedType, selectedStatus, selectedDate])

    useEffect(() => {
        fetchData()
    }, [])

    const fetchData = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch Stats
            const statsRes = await fetch('/api/gate/visitor-center/stats', { headers })
            const statsData = statsRes.ok ? await statsRes.json() : null

            // Fetch Logs
            const logsRes = await fetch('/api/gate/visitor-center/logs', { headers })
            const logsData = logsRes.ok ? await logsRes.json() : []

            if (statsData) setStats(statsData)
            setLogs(logsData)
        } catch (e) {
            console.error('Failed to fetch visitor center data', e)
        } finally {
            setLoading(false)
        }
    }

    // Filter Logs
    const filteredLogs = logs.filter(log => {
        const matchesSearch = 
            ((log.visitor_name || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.contact && log.contact.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.plate_number && log.plate_number.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.purpose && log.purpose.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (log.event_name && log.event_name.toLowerCase().includes(searchQuery.toLowerCase()))

        const matchesType = selectedType === 'all' || log.visitor_type === selectedType
        
        let matchesStatus = true
        if (selectedStatus !== 'all') {
            if (selectedStatus === 'inside') {
                matchesStatus = log.status === 'checked_in' && !log.time_out
            } else if (selectedStatus === 'exited') {
                matchesStatus = !!log.time_out
            } else {
                matchesStatus = log.status === selectedStatus
            }
        }

        let matchesDate = true
        if (selectedDate) {
            const logDateStr = new Date(log.time_in).toISOString().split('T')[0]
            matchesDate = logDateStr === selectedDate
        }

        return matchesSearch && matchesType && matchesStatus && matchesDate
    })

    const itemsPerPage = 8
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

    const renderPagination = () => {
        if (totalPages <= 1) return null
        return (
            <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-semibold rounded-b-2xl">
                <span className="text-[var(--text-secondary)]">
                    Page {currentPage} of {totalPages}
                </span>
                <div className="flex gap-2">
                    <button
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        className="px-3 py-1.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                        Previous
                    </button>
                    <button
                        disabled={currentPage === totalPages}
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        className="px-3 py-1.5 border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] disabled:opacity-50 disabled:pointer-events-none transition-all cursor-pointer"
                    >
                        Next
                    </button>
                </div>
            </div>
        )
    }

    // Export to CSV
    const handleExportCSV = () => {
        if (filteredLogs.length === 0) return
        
        const headers = ['Visitor Name', 'Type', 'ID/Passport', 'Contact', 'Plate Number', 'Passengers', 'Purpose/Event', 'Time In', 'Time Out', 'Status']
        const rows = filteredLogs.map(log => [
            log.visitor_name,
            log.visitor_type.toUpperCase().replace('_', ' '),
            log.id_number || 'N/A',
            log.contact || 'N/A',
            log.plate_number || 'N/A',
            log.passengers,
            log.visitor_type === 'event_guest' ? `Event: ${log.event_name || 'N/A'}` : (log.purpose || 'N/A'),
            new Date(log.time_in).toLocaleString(),
            log.time_out ? new Date(log.time_out).toLocaleString() : 'N/A',
            log.status
        ])

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
        
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `visitor_center_logs_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-8 animate-fade-in text-[var(--text-primary)]">
            
            {/* Header section */}
            <div className="flex justify-between items-center bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Visitor Center & Analytics</h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Unified access reporting for external guests, taxi services, and delivery logs.</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-primary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-bold rounded-xl text-xs active:scale-95 transition-all"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Reports
                </button>
            </div>

            {/* Stats KPI Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-wider">Visitors Checked In Today</p>
                        <h3 className="text-3xl font-black mt-2 text-indigo-600 dark:text-indigo-400">{stats ? stats.total_visitors_today : 0}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-semibold">Excludes students & staff</p>
                    </div>
                    <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 rounded-2xl">
                        <Users size={24} />
                    </div>
                </div>

                <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-wider">Taxis & Pickups Today</p>
                        <h3 className="text-3xl font-black mt-2 text-amber-600 dark:text-amber-400">{stats ? stats.taxis_today : 0}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-semibold">Student pickups/drop-offs</p>
                    </div>
                    <div className="p-4 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                        <Car size={24} />
                    </div>
                </div>

                <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-wider">Deliveries Logged Today</p>
                        <h3 className="text-3xl font-black mt-2 text-blue-600 dark:text-blue-400">{stats ? stats.deliveries_today : 0}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-semibold">Logged packages & couriers</p>
                    </div>
                    <div className="p-4 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                        <Truck size={24} />
                    </div>
                </div>

                <div className="bg-[var(--bg-surface)] p-6 rounded-2xl border border(--border-color) shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-[var(--text-secondary)] text-[10px] font-black uppercase tracking-wider">Active Guest Vehicles</p>
                        <h3 className="text-3xl font-black mt-2 text-emerald-600 dark:text-emerald-400">{stats ? stats.active_vehicles_today : 0}</h3>
                        <p className="text-xs text-[var(--text-secondary)] mt-1.5 font-semibold">Checked-in plates currently inside</p>
                    </div>
                    <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                        <ShieldAlert size={24} />
                    </div>
                </div>

            </div>

            {/* Last Event Mini Summary */}
            {stats?.last_event && (
                <div className="bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent border border-indigo-500/20 p-6 rounded-2xl shadow-sm space-y-4">
                    <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-extrabold text-xs uppercase tracking-wider">
                        <CalendarRange size={16} /> Last Event Attendance Metrics
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                        <div className="col-span-1 md:col-span-2">
                            <h4 className="text-lg font-black">{stats.last_event.name}</h4>
                            <p className="text-xs text-[var(--text-secondary)] mt-1">Held on: <span className="font-semibold">{new Date(stats.last_event.date).toDateString()}</span></p>
                        </div>
                        <div className="grid grid-cols-3 col-span-1 md:col-span-2 gap-4 text-center">
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-xl shadow-sm">
                                <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Registered</span>
                                <span className="text-lg font-black text-indigo-650 dark:text-indigo-400 block mt-0.5">{stats.last_event.registered}</span>
                            </div>
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-xl shadow-sm">
                                <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Checked In</span>
                                <span className="text-lg font-black text-green-600 dark:text-green-400 block mt-0.5">{stats.last_event.checked_in}</span>
                            </div>
                            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-3 rounded-xl shadow-sm">
                                <span className="text-[9px] text-[var(--text-secondary)] font-bold uppercase tracking-wider block">Attendance</span>
                                <span className="text-lg font-black text-purple-600 dark:text-purple-400 block mt-0.5">{stats.last_event.attendance_rate}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Unified Logs Section */}
            <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm overflow-hidden flex flex-col">
                {/* Search & Filter Toolbar */}
                <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 space-y-4">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <h3 className="text-lg font-black">Visitor Logs Directory</h3>
                        <button
                            onClick={handleExportCSV}
                            disabled={filteredLogs.length === 0}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white px-4 py-2 rounded-xl font-bold text-xs shadow-md shadow-indigo-655/15 active:scale-95 transition-all border-none cursor-pointer"
                        >
                            <Download size={14} /> Export to CSV
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        {/* Search Input */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                            <input
                                type="text"
                                placeholder="Search by name, contact, plate..."
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-[var(--text-primary)]"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>

                        {/* Filter Type */}
                        <div className="relative flex items-center">
                            <Sliders className="absolute left-3 text-[var(--text-secondary)] pointer-events-none" size={14} />
                            <select
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-[var(--text-primary)] appearance-none cursor-pointer"
                                value={selectedType}
                                onChange={e => setSelectedType(e.target.value)}
                            >
                                <option value="all">All Visitor Types</option>
                                <option value="visitor">Gate Self-Service Visitor</option>
                                <option value="taxi">Taxi / Cabs</option>
                                <option value="delivery">Deliveries</option>
                                <option value="event_guest">Event RSVP Guests</option>
                            </select>
                        </div>

                        {/* Filter Status */}
                        <div className="relative flex items-center">
                            <Sliders className="absolute left-3 text-[var(--text-secondary)] pointer-events-none" size={14} />
                            <select
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-[var(--text-primary)] appearance-none cursor-pointer"
                                value={selectedStatus}
                                onChange={e => setSelectedStatus(e.target.value)}
                            >
                                <option value="all">All Gate Statuses</option>
                                <option value="inside">Currently Inside (No Time Out)</option>
                                <option value="exited">Exited (Has Time Out)</option>
                                <option value="approved">Approved Requests</option>
                                <option value="rejected">Rejected Entries</option>
                            </select>
                        </div>

                        {/* Filter Date */}
                        <div className="relative flex items-center">
                            <Calendar className="absolute left-3 text-[var(--text-secondary)] pointer-events-none" size={14} />
                            <input
                                type="date"
                                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500/20 text-[var(--text-primary)] cursor-pointer"
                                value={selectedDate}
                                onChange={e => setSelectedDate(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                        <thead>
                            <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/30 text-[10px] font-black uppercase tracking-wider text-[var(--text-secondary)]">
                                <th className="p-4">Visitor / Profile</th>
                                <th className="p-4">Category</th>
                                <th className="p-4">Credentials</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Purpose / Reference</th>
                                <th className="p-4">Logs (In / Out)</th>
                                <th className="p-4">Status</th>
                                <th className="p-4 text-center">Biometrics / Attachments</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)] font-medium">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-[var(--text-secondary)] font-bold">
                                        <Loader2 className="animate-spin inline-block mr-2 text-indigo-600" size={20} />
                                        Synchronizing Log Data...
                                    </td>
                                </tr>
                            ) : paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="p-12 text-center text-[var(--text-secondary)] font-bold">
                                        No visitor logs match your search criteria.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => {
                                    const timeIn = new Date(log.time_in).toLocaleString()
                                    const timeOut = log.time_out ? new Date(log.time_out).toLocaleString() : 'Still Inside'

                                    return (
                                        <tr key={log.id} className="hover:bg-[var(--bg-primary)]/10 transition-colors">
                                            {/* Visitor Name & Avatar */}
                                            <td className="p-4 font-bold text-[var(--text-primary)]">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm shrink-0">
                                                        {log.profile_image ? (
                                                            <img src={log.profile_image} className="w-full h-full object-cover" alt="Profile" />
                                                        ) : (
                                                            <span className="font-black text-xs text-indigo-650 dark:text-indigo-400">
                                                                {(log.visitor_name?.[0] || 'V').toUpperCase()}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span>{log.visitor_name || 'Unknown Visitor'}</span>
                                                </div>
                                            </td>

                                            {/* Category Tag */}
                                            <td className="p-4 capitalize">
                                                <span className={`inline-block px-2 py-0.5 rounded-md font-bold text-[9px] uppercase ${
                                                    log.visitor_type === 'visitor' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-450' :
                                                    log.visitor_type === 'taxi' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-450' :
                                                    log.visitor_type === 'delivery' ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-450' :
                                                    'bg-purple-50 text-purple-700 dark:bg-purple-950/20 dark:text-purple-450'
                                                }`}>
                                                    {log.visitor_type?.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Credentials / Plate */}
                                            <td className="p-4 font-mono font-bold">
                                                {log.plate_number ? (
                                                    <div className="flex flex-col gap-0.5">
                                                        <span className="text-slate-800 dark:text-slate-200">{log.plate_number}</span>
                                                        {log.passengers > 0 && <span className="text-[10px] text-[var(--text-secondary)] font-sans">({log.passengers} pass)</span>}
                                                    </div>
                                                ) : log.id_number || 'N/A'}
                                            </td>

                                            {/* Contact Info */}
                                            <td className="p-4 text-[var(--text-secondary)]">
                                                {log.contact || 'N/A'}
                                            </td>

                                            {/* Purpose */}
                                            <td className="p-4 max-w-[200px] truncate" title={log.purpose || ''}>
                                                {log.visitor_type === 'event_guest' ? (
                                                    <span className="font-bold text-indigo-650 dark:text-indigo-400">Event: {log.event_name}</span>
                                                ) : (
                                                    log.purpose || 'N/A'
                                                )}
                                            </td>

                                            {/* In / Out Logs */}
                                            <td className="p-4">
                                                <div className="space-y-1">
                                                    <span className="text-[10px] text-[var(--text-secondary)] font-bold flex items-center gap-1"><Clock size={10} /> IN: {timeIn}</span>
                                                    <span className={`text-[10px] font-bold flex items-center gap-1 ${!log.time_out ? 'text-amber-600 dark:text-amber-400' : 'text-[var(--text-secondary)]'}`}>
                                                        <Clock size={10} /> OUT: {timeOut}
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Status Badge */}
                                            <td className="p-4 uppercase tracking-wider text-[9px] font-black">
                                                <span className={`${
                                                    log.status === 'checked_in' ? 'text-green-600 bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded' :
                                                    log.status === 'rejected' ? 'text-red-500 bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded' :
                                                    'text-[var(--text-secondary)] bg-[var(--bg-primary)] px-2 py-0.5 rounded'
                                                }`}>
                                                    {log.status?.replace('_', ' ')}
                                                </span>
                                            </td>

                                            {/* Biometrics & Image Zoom button */}
                                            <td className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2">
                                                    {log.profile_image && (
                                                        <button 
                                                            onClick={() => setPreviewImage({ src: log.profile_image!, title: `Profile Photo: ${log.visitor_name}` })}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-indigo-600 hover:scale-105 transition-all cursor-pointer border-none bg-transparent"
                                                            title="View Profile Photo"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    )}
                                                    {log.delivery_image_package && (
                                                        <button 
                                                            onClick={() => setPreviewImage({ src: log.delivery_image_package!, title: `Package Photo: ${log.visitor_name}` })}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-blue-600 hover:scale-105 transition-all cursor-pointer border-none bg-transparent"
                                                            title="View Package Photo"
                                                        >
                                                            <Truck size={14} />
                                                        </button>
                                                    )}
                                                    {log.delivery_image_receipt && (
                                                        <button 
                                                            onClick={() => setPreviewImage({ src: log.delivery_image_receipt!, title: `Receipt Photo: ${log.visitor_name}` })}
                                                            className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md text-emerald-600 hover:scale-105 transition-all cursor-pointer border-none bg-transparent"
                                                            title="View Receipt Photo"
                                                        >
                                                            <FileText size={14} />
                                                        </button>
                                                    )}
                                                    {!log.profile_image && !log.delivery_image_package && !log.delivery_image_receipt && (
                                                        <span className="text-[10px] text-slate-350 dark:text-slate-700">None</span>
                                                    )}
                                                </div>
                                            </td>

                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                {renderPagination()}
            </div>

            {/* Portal mounted zoom image dialog */}
            {previewImage && createPortal(
                <div className="fixed inset-0 z-[10005] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden max-w-lg w-full relative animate-scale-in">
                        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]">
                            <h4 className="font-extrabold text-sm">{previewImage.title}</h4>
                            <button 
                                onClick={() => setPreviewImage(null)}
                                className="p-1 hover:bg-slate-205 dark:hover:bg-slate-800 rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer border-none bg-transparent"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="p-6 flex items-center justify-center bg-black/5">
                            <img src={previewImage.src} alt="Preview Attachment" className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-sm" />
                        </div>
                    </div>
                </div>,
                document.body
            )}

        </div>
    )
}
