import { useState, useEffect } from 'react'
import { Car, AlertTriangle, RefreshCw, Search, ArrowDownCircle, ArrowUpCircle, Clock, LogIn, LogOut, MoreHorizontal, CheckCircle, Eye, Shield, User, Info, FileText } from 'lucide-react'
import { useNotification } from './components/Notification'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    BarChart,
    Bar,
    Legend
} from 'recharts'

export default function VehicleIntel() {
    const { showConfirm } = useNotification()
    const [vehicles, setVehicles] = useState<any[]>([]) // Registered Vehicles
    const [logs, setLogs] = useState<any[]>([])         // Activity Logs
    const [stats, setStats] = useState<any>(null)       // Vehicle Stats
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'fleet' | 'logs'>('fleet')
    
    // Quick check-in/out states
    const [showQuickModal, setShowQuickModal] = useState(false)
    const [quickSearch, setQuickSearch] = useState('')
    const [quickSearchResult, setQuickSearchResult] = useState<any | null>(null)
    const [quickLookupAttempted, setQuickLookupAttempted] = useState(false)
    const [loadingQuick, setLoadingQuick] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [quickFormData, setQuickFormData] = useState({
        plate_number: '',
        driver_name: '',
        driver_contact: '',
        driver_id_number: '',
        passengers: 1,
        purpose: '',
        destination: ''
    })

    // Selected vehicle log details modal
    const [selectedLog, setSelectedLog] = useState<any | null>(null)
    const [currentPage, setCurrentPage] = useState(1)

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, viewMode])

    const fetchData = async () => {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }

        try {
            const [vehRes, logRes, statsRes] = await Promise.all([
                fetch('/api/gate/vehicles', { headers }),
                fetch('/api/gate/vehicle-logs', { headers }),
                fetch('/api/gate/vehicle-stats', { headers })
            ])

            if (vehRes.ok) setVehicles(await vehRes.json())
            if (logRes.ok) setLogs(await logRes.json())
            if (statsRes.ok) setStats(await statsRes.json())

            setLoading(false)
        } catch (err) {
            console.error("Failed to fetch data", err)
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 15000)
        return () => clearInterval(interval)
    }, [])

    const handleAction = async (action: 'entry' | 'exit', vehicle: any) => {
        const token = localStorage.getItem('token')
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

        if (action === 'entry') {
            const confirmed = await showConfirm(`Mark ${vehicle.plate_number} as Entered?`)
            if (!confirmed) return
            try {
                await fetch('/api/gate/manual-vehicle-entry', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        plate_number: vehicle.plate_number,
                        driver_name: vehicle.driver_name,
                        driver_contact: vehicle.driver_contact,
                        driver_id_number: vehicle.driver_id_number,
                        passengers: 1
                    })
                })
                fetchData() // Refresh immediately
            } catch (e) { alert("Network Error") }
        } else {
            const confirmed = await showConfirm(`Mark ${vehicle.plate_number} as Exited?`)
            if (!confirmed) return
            try {
                await fetch('/api/gate/vehicle-exit', {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ plate_number: vehicle.plate_number })
                })
                fetchData()
            } catch (e) { alert("Network Error") }
        }
    }

    const handleQuickLookup = async () => {
        if (!quickSearch.trim()) return
        setLoadingQuick(true)
        setQuickLookupAttempted(true)
        try {
            const term = quickSearch.trim().toUpperCase().replace(/\s+/g, '')
            const activeLog = logs.find(l => l.plate.toUpperCase().replace(/\s+/g, '') === term && !l.exit_time)
            
            if (activeLog) {
                setQuickSearchResult({
                    checked_in: true,
                    plate_number: activeLog.plate,
                    driver_name: activeLog.driver_name || 'Unknown',
                    driver_contact: activeLog.driver_contact || 'N/A',
                    driver_id_number: activeLog.driver_id_number || 'N/A',
                    passengers: activeLog.passengers || 1,
                    entry_time: activeLog.entry_time || activeLog.time,
                    entry_gate_name: activeLog.entry_gate_name || 'Main Gate',
                    purpose: activeLog.purpose || 'Campus visit'
                })
            } else {
                const regVehicle = vehicles.find(v => v.plate_number.toUpperCase().replace(/\s+/g, '') === term)
                
                const defaultForm = {
                    checked_in: false,
                    plate_number: regVehicle ? regVehicle.plate_number : quickSearch.trim().toUpperCase(),
                    driver_name: regVehicle ? regVehicle.driver_name || '' : '',
                    driver_contact: regVehicle ? regVehicle.driver_contact || '' : '',
                    driver_id_number: regVehicle ? regVehicle.driver_id_number || '' : '',
                    passengers: 1,
                    purpose: '',
                    destination: ''
                }
                setQuickSearchResult(defaultForm)
                setQuickFormData(defaultForm)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setLoadingQuick(false)
        }
    }

    const handleQuickCheckInSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
            const res = await fetch('/api/gate/manual-vehicle-entry', {
                method: 'POST',
                headers,
                body: JSON.stringify(quickFormData)
            })

            if (res.ok) {
                setShowQuickModal(false)
                setQuickSearch('')
                setQuickSearchResult(null)
                setQuickLookupAttempted(false)
                fetchData()
            } else {
                const data = await res.json()
                alert(data.detail || "Failed to log vehicle entry")
            }
        } catch (error) {
            console.error(error)
            alert("Network Error")
        } finally {
            setSubmitting(false)
        }
    }

    // Merge Data for Fleet View
    const fleetList = vehicles.map(v => {
        // Find latest log
        const latestLog = logs.find(l => l.plate === v.plate_number)
        const isParked = latestLog && !latestLog.exit_time
        return {
            ...v,
            latestLog,
            status: isParked ? 'parked' : 'exited', // exited or never entered
            lastSeen: latestLog ? latestLog.entry_time : null
        }
    }).filter(v => {
        const q = searchQuery.toLowerCase()
        return !q || v.plate_number.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q) || v.driver_name?.toLowerCase().includes(q)
    })

    // Filter for Logs View
    const filteredLogs = logs.filter(v => {
        const q = searchQuery.toLowerCase()
        return !q || v.plate?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q)
    })

    const itemsPerPage = 8

    // Paginate fleet view
    const totalFleetPages = Math.ceil(fleetList.length / itemsPerPage)
    const paginatedFleet = fleetList.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    // Paginate logs view
    const totalLogPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

    const renderPagination = () => {
        const totalPages = viewMode === 'fleet' ? totalFleetPages : totalLogPages
        if (totalPages <= 1) return null
        return (
            <div className="flex items-center justify-between p-4 border-t border-[var(--border-color)] bg-[var(--bg-surface)] text-xs font-semibold">
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

    // Stats
    const parkedCount = logs.filter(v => !v.exit_time).length
    const exitedCount = logs.filter(v => v.exit_time).length
    const totalRegistered = vehicles.length

    const getAverageStay = () => {
        const completedLogs = logs.filter(l => l.exit_time && l.time)
        if (completedLogs.length === 0) return '0m'
        const totalMinutes = completedLogs.reduce((acc, log) => {
            const entry = new Date(log.time || log.entry_time).getTime()
            const exit = new Date(log.exit_time).getTime()
            return acc + (exit - entry) / (1000 * 60)
        }, 0)
        const avg = totalMinutes / completedLogs.length
        if (avg < 60) return `${Math.round(avg)}m`
        const hrs = Math.floor(avg / 60)
        const mins = Math.round(avg % 60)
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`
    }
    const avgStayDuration = getAverageStay()

    return (
        <div className="animate-fade-in p-2">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Vehicle Intelligence</h2>
                    <p className="text-[var(--text-secondary)]">Fleet Management & Activity Logs</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => {
                            setQuickSearch('');
                            setQuickSearchResult(null);
                            setQuickLookupAttempted(false);
                            setShowQuickModal(true);
                        }}
                        className="bg-indigo-650 text-white px-4 py-2 rounded-lg font-bold text-sm hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer"
                    >
                        <Shield size={16} /> Quick Check-In/Out
                    </button>
                    <button
                        onClick={() => setViewMode(viewMode === 'fleet' ? 'logs' : 'fleet')}
                        className="bg-white border border-[var(--border-color)] px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition-colors"
                    >
                        Switch to {viewMode === 'fleet' ? 'Activity Logs' : 'Fleet View'}
                    </button>
                    <button onClick={() => { setLoading(true); fetchData(); }} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="glass-card p-4 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Registered Vehicles</p>
                            <p className="text-3xl font-bold text-[var(--text-primary)]">{totalRegistered}</p>
                        </div>
                        <Car className="text-blue-500" size={32} />
                    </div>
                </div>
                <div className="glass-card p-4 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Currently Parked</p>
                            <p className="text-3xl font-bold text-green-600">{parkedCount}</p>
                        </div>
                        <ArrowDownCircle className="text-green-500" size={32} />
                    </div>
                </div>
                <div className="glass-card p-4 border-l-4 border-gray-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Exited Today</p>
                            <p className="text-3xl font-bold text-gray-600">{exitedCount}</p>
                        </div>
                        <ArrowUpCircle className="text-gray-500" size={32} />
                    </div>
                </div>
                <div className="glass-card p-4 border-l-4 border-indigo-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Avg Stay Duration</p>
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{avgStayDuration}</p>
                        </div>
                        <Clock className="text-indigo-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Vehicle Traffic Graph */}
            {stats && stats.hourly_traffic && (
                <div className="glass-card p-6 mb-6 border border-[var(--border-color)]">
                    <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                        <Clock size={16} className="text-indigo-500" /> Vehicle Traffic Analytics (Entries & Exits)
                    </h3>
                    <div className="h-60 w-full">
                        <ResponsiveContainer width="105%" height="100%">
                            <AreaChart
                                data={stats.hourly_traffic}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <defs>
                                    <linearGradient id="entryColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                                    </linearGradient>
                                    <linearGradient id="exitColor" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6b7280" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#6b7280" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                                <XAxis 
                                    dataKey="time" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}
                                />
                                <YAxis 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}
                                />
                                <RechartsTooltip
                                    contentStyle={{ 
                                        backgroundColor: 'var(--bg-surface)', 
                                        borderColor: 'var(--border-color)',
                                        borderRadius: '12px',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                                <Legend verticalAlign="top" height={36} iconType="circle" />
                                <Area 
                                    type="monotone" 
                                    dataKey="entries" 
                                    name="Entries" 
                                    stroke="#22c55e" 
                                    strokeWidth={2} 
                                    fillOpacity={1} 
                                    fill="url(#entryColor)" 
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="exits" 
                                    name="Exits" 
                                    stroke="#6b7280" 
                                    strokeWidth={2} 
                                    fillOpacity={1} 
                                    fill="url(#exitColor)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="col-span-2 glass-card p-0 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)]/50 shrink-0">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold flex items-center gap-2">
                                <Car size={18} /> {viewMode === 'fleet' ? 'Registered Fleet Status' : 'Vehicle Activity Logs'}
                            </h3>
                            {viewMode === 'logs' && (
                                <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Live Feed
                                </span>
                            )}
                        </div>

                        {/* Search Bar */}
                        <div className="relative mb-3">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                            <input
                                type="text"
                                placeholder={viewMode === 'fleet' ? "Search Registered Fleet..." : "Search Logs..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-primary-500 transition-all"
                            />
                        </div>
                    </div>

                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left bg-[var(--bg-surface)]">
                            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="p-4">Plate No.</th>
                                    <th className="p-4">Details</th>
                                    <th className="p-4">{viewMode === 'fleet' ? 'Last Activity' : 'Timestamps'}</th>
                                    {viewMode === 'logs' && <th className="p-4">Stay Duration</th>}
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {viewMode === 'fleet' ? (
                                    // FLEET VIEW
                                    paginatedFleet.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No registered vehicles found.</td></tr>
                                    ) : (
                                        paginatedFleet.map((v, i) => (
                                            <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                                                <td className="p-4 font-mono font-bold text-lg">{v.plate_number}</td>
                                                <td className="p-4">
                                                    <div className="font-bold text-sm">{v.make} {v.model}</div>
                                                    <div className="text-xs text-[var(--text-secondary)]">{v.driver_name}</div>
                                                </td>
                                                <td className="p-4 text-sm font-mono text-[var(--text-secondary)]">
                                                    {v.latestLog ? formatTime(v.lastSeen) : 'Never'}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${v.status === 'parked' ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-gray-500/10'
                                                        }`}>
                                                        {v.status === 'parked' ? 'PARKED' : 'OUT'}
                                                    </span>
                                                </td>
                                                <td className="p-4 flex justify-center">
                                                    {v.status === 'exited' ? (
                                                        <button
                                                            onClick={() => handleAction('entry', v)}
                                                            className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"
                                                        >
                                                            <LogIn size={14} /> Mark Entry
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleAction('exit', v)}
                                                            className="flex items-center gap-1 bg-red-50 text-red-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
                                                        >
                                                            <LogOut size={14} /> Mark Exit
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )
                                ) : (
                                    // LOGS VIEW
                                    paginatedLogs.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-400">No logs found.</td></tr>
                                    ) : (
                                        paginatedLogs.map((v, i) => {
                                            const isParked = !v.exit_time
                                            return (
                                                <tr key={i} className="hover:bg-[var(--bg-primary)] transition-colors">
                                                    <td className="p-4 font-mono font-bold text-lg">{v.plate}</td>
                                                    <td className="p-4">
                                                        <div className="font-bold text-sm">{v.make || 'Unknown'}</div>
                                                        <div className="text-xs text-[var(--text-secondary)]">{v.driver_name}</div>
                                                    </td>
                                                    <td className="p-4 text-sm font-mono">
                                                        <div className="flex items-center gap-1"><ArrowDownCircle size={12} className="text-green-500" /> {formatTime(v.time)}</div>
                                                        {v.exit_time && <div className="flex items-center gap-1 mt-1"><ArrowUpCircle size={12} className="text-gray-500" /> {formatTime(v.exit_time)}</div>}
                                                    </td>
                                                    <td className="p-4 text-sm font-semibold">
                                                        {(() => {
                                                            const entry = new Date(v.time || v.entry_time).getTime()
                                                            const exit = v.exit_time ? new Date(v.exit_time).getTime() : new Date().getTime()
                                                            const diffMins = Math.round((exit - entry) / (1000 * 60))
                                                            
                                                            if (!v.exit_time) {
                                                                const color = diffMins > 360 ? 'text-red-650 bg-red-500/10' : diffMins > 120 ? 'text-amber-600 bg-amber-500/10' : 'text-green-600 bg-green-500/10'
                                                                return (
                                                                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${color}`}>
                                                                        {diffMins < 60 ? `${diffMins}m` : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`}
                                                                    </span>
                                                                )
                                                            }
                                                            return (
                                                                <span className="text-gray-500 dark:text-gray-400 font-mono">
                                                                    {diffMins < 60 ? `${diffMins}m` : `${Math.floor(diffMins / 60)}h ${diffMins % 60}m`}
                                                                </span>
                                                            )
                                                        })()}
                                                    </td>
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${isParked ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-gray-500/10'}`}>
                                                            {isParked ? 'PARKED' : 'EXITED'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                         <div className="flex gap-2 justify-center">
                                                             <button
                                                                 onClick={() => setSelectedLog(v)}
                                                                 className="text-slate-500 hover:text-indigo-650 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                                                                 title="View Log Details"
                                                             >
                                                                 <Eye size={16} />
                                                             </button>
                                                             {isParked && (
                                                                 <button
                                                                     onClick={() => handleAction('exit', { plate_number: v.plate })}
                                                                     className="text-red-500 hover:text-red-755 p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer border-none bg-transparent"
                                                                     title="Mark Exit"
                                                                 >
                                                                     <LogOut size={16} />
                                                                 </button>
                                                             )}
                                                         </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>
                {renderPagination()}
            </div>

                <div className="glass-card p-6 h-fit">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-500" /> Watchlist</h3>
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-red-500">KAA 999Z</div>
                                    <div className="text-xs text-red-400 opacity-80">Reports of suspicious activity</div>
                                </div>
                                <span className="text-xs bg-red-500 text-white px-1 rounded">Stolen</span>
                            </div>
                        </div>
                        <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="font-bold text-yellow-500">KCC 333X</div>
                                    <div className="text-xs text-yellow-500 opacity-80">Needs routine check</div>
                                </div>
                                <span className="text-xs bg-yellow-500 text-black px-1 rounded">Warning</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 h-fit mt-6">
                    <h3 className="font-bold mb-4 flex items-center gap-2 text-indigo-600"><Clock size={18} /> Longest Stays Today</h3>
                    {stats && stats.longest_stays && stats.longest_stays.length > 0 ? (
                        <div className="space-y-3">
                            {stats.longest_stays.map((s: any, idx: number) => (
                                <div key={idx} className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] flex justify-between items-center">
                                    <div>
                                        <div className="font-mono font-bold text-sm text-[var(--text-primary)]">{s.plate}</div>
                                        <div className="text-[10px] text-[var(--text-secondary)]">{s.make} ({s.driver})</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-xs text-indigo-650 dark:text-indigo-400">{s.duration_fmt}</div>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-black ${s.status === 'Parked' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'}`}>
                                            {s.status.toUpperCase()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-xs text-[var(--text-secondary)] text-center py-4">No stay logs computed for today yet.</p>
                    )}
                </div>
            </div>

            {/* Quick Check-In / Check-Out Modal */}
            {showQuickModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in text-[var(--text-primary)]">
                    <div className="bg-[var(--bg-surface)] w-full max-w-xl rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in max-h-[90vh] flex flex-col animate-scale-in">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Shield className="text-indigo-500" size={22} /> Quick Vehicle Check-In / Check-Out
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">Verify plate number and instantly log entry or exit.</p>
                            </div>
                            <button onClick={() => { setShowQuickModal(false); setQuickSearch(''); setQuickSearchResult(null); setQuickLookupAttempted(false); }} className="text-[var(--text-secondary)] hover:text-red-500 cursor-pointer border-none bg-transparent">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                            {/* Search Input Bar */}
                            <div className="space-y-2">
                                <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Verify Vehicle License Plate</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Enter License Plate Number (e.g. KAA 123A)..."
                                            value={quickSearch}
                                            onChange={(e) => setQuickSearch(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickLookup(); } }}
                                            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 text-xs font-semibold uppercase"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleQuickLookup}
                                        disabled={loadingQuick}
                                        className="px-5 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-md hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer border-none"
                                    >
                                        {loadingQuick ? 'Searching...' : 'Lookup & Verify'}
                                    </button>
                                </div>
                            </div>

                            {/* Result Area */}
                            {loadingQuick && (
                                <div className="py-12 text-center text-[var(--text-secondary)] font-bold">Verifying logs...</div>
                            )}

                            {!loadingQuick && quickLookupAttempted && quickSearchResult && (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Found in Active check-ins: Quick Checkout! */}
                                    {quickSearchResult.checked_in ? (
                                        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider block w-fit mb-1">
                                                        Currently Parked
                                                    </span>
                                                    <h3 className="text-lg font-black text-slate-800 dark:text-white font-mono uppercase">
                                                        {quickSearchResult.plate_number}
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-sans mt-0.5">Driver: {quickSearchResult.driver_name}</p>
                                                </div>
                                                <span className="text-xs text-[var(--text-secondary)] font-mono font-medium">
                                                    In: {formatTime(quickSearchResult.entry_time)}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
                                                <div>
                                                    <span className="text-slate-400 block text-[9px] font-bold">CONTACT</span>
                                                    <span className="font-semibold">{quickSearchResult.driver_contact || 'N/A'}</span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block text-[9px] font-bold">PASSENGERS</span>
                                                    <span className="font-semibold">{quickSearchResult.passengers || 1}</span>
                                                </div>
                                                <div className="col-span-2">
                                                    <span className="text-slate-400 block text-[9px] font-bold">PURPOSE / DESTINATION</span>
                                                    <span className="font-medium">{quickSearchResult.purpose || 'Campus visit'}</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleAction('exit', { plate_number: quickSearchResult.plate_number });
                                                    setShowQuickModal(false);
                                                }}
                                                className="w-full py-3 bg-red-650 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-none text-xs"
                                            >
                                                <LogOut size={16} /> Log Exit & Check Out
                                            </button>
                                        </div>
                                    ) : (
                                        /* Not checked in: Show check-in form, pre-populated! */
                                        <form onSubmit={handleQuickCheckInSubmit} className="space-y-4">
                                            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                                <p className="font-bold text-indigo-700 dark:text-indigo-400 text-xs">
                                                    Vehicle not inside. Fill out details to log Entry Check-In:
                                                </p>
                                            </div>

                                            <div>
                                                <label className="block font-medium mb-1">License Plate Number</label>
                                                <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-mono font-bold uppercase"
                                                    value={quickFormData.plate_number} onChange={e => setQuickFormData({ ...quickFormData, plate_number: e.target.value.toUpperCase() })} />
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-medium mb-1">Driver Name</label>
                                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.driver_name} onChange={e => setQuickFormData({ ...quickFormData, driver_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block font-medium mb-1">Driver Contact (Mobile)</label>
                                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.driver_contact} onChange={e => setQuickFormData({ ...quickFormData, driver_contact: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-medium mb-1">Driver National ID</label>
                                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.driver_id_number} onChange={e => setQuickFormData({ ...quickFormData, driver_id_number: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block font-medium mb-1">Passenger Count</label>
                                                    <input required type="number" min={1} className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.passengers} onChange={e => setQuickFormData({ ...quickFormData, passengers: parseInt(e.target.value) || 1 })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-medium mb-1">Visit Purpose</label>
                                                    <input required type="text" placeholder="e.g. Utility delivery" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.purpose} onChange={e => setQuickFormData({ ...quickFormData, purpose: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block font-medium mb-1">Destination Location</label>
                                                    <input required type="text" placeholder="e.g. Block B Parking" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.destination} onChange={e => setQuickFormData({ ...quickFormData, destination: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="pt-2 flex gap-3">
                                                <button type="button" onClick={() => { setShowQuickModal(false); setQuickSearch(''); setQuickSearchResult(null); setQuickLookupAttempted(false); }} className="flex-1 py-3 bg-[var(--bg-primary)] rounded-xl font-bold text-[var(--text-secondary)] border border-[var(--border-color)] cursor-pointer">Cancel</button>
                                                <button type="submit" disabled={submitting} className="flex-2 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer border-none text-xs">
                                                    <LogIn size={16} /> Log Entry & Check In
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            {!quickLookupAttempted && (
                                <div className="py-12 text-center text-[var(--text-secondary)] font-medium flex flex-col items-center justify-center gap-2">
                                    <Shield className="text-slate-300 dark:text-slate-700" size={48} />
                                    <span>Type a vehicle license plate above to verify status.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Vehicle Log Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in text-[var(--text-primary)]">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in max-h-[90vh] flex flex-col animate-scale-in">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Car className="text-indigo-500" size={22} /> Vehicle Log Details
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">Full historical capture details for this activity log entry.</p>
                            </div>
                            <button onClick={() => setSelectedLog(null)} className="text-[var(--text-secondary)] hover:text-red-500 cursor-pointer border-none bg-transparent">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
                            {/* License Plate Banner */}
                            <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                                <div>
                                    <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">License Plate</span>
                                    <h3 className="text-lg font-black font-mono uppercase">{selectedLog.plate}</h3>
                                </div>
                                <span className={`px-2.5 py-1 rounded-full text-xs font-black border uppercase tracking-wider ${
                                    !selectedLog.exit_time
                                        ? 'bg-green-150 text-green-700 border-green-200'
                                        : 'bg-slate-105 text-slate-650 border-slate-200'
                                }`}>
                                    {!selectedLog.exit_time ? 'PARKED' : 'EXITED'}
                                </span>
                            </div>

                            {/* Driver Information */}
                            <div>
                                <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Driver Details</h4>
                                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">FULL NAME</span>
                                        <span className="font-semibold">{selectedLog.driver_name || 'Unknown'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">ID NUMBER</span>
                                        <span className="font-mono font-semibold">{selectedLog.driver_id_number || 'N/A'}</span>
                                    </div>
                                    <div className="col-span-2">
                                        <span className="text-slate-400 font-bold block text-[9px]">CONTACT MOBILE</span>
                                        <span className="font-semibold">{selectedLog.driver_contact || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Visit Details */}
                            <div>
                                <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Visit Details</h4>
                                <div className="grid grid-cols-2 gap-3 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">PURPOSE</span>
                                        <span className="font-semibold">{selectedLog.purpose || 'Campus entry'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">DESTINATION</span>
                                        <span className="font-semibold">{selectedLog.destination || 'Campus parking'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">PASSENGERS COUNT</span>
                                        <span className="font-semibold">{selectedLog.passengers || 1}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">LOG TYPE</span>
                                        <span className="font-semibold">{selectedLog.manual_override ? 'Manual Log' : 'Automated Cam Scan'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Timestamps & Gates */}
                            <div>
                                <h4 className="font-bold text-[10px] uppercase text-slate-405 tracking-wider mb-2">Check-In / Out History</h4>
                                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">ENTRY TIME</span>
                                        <span className="font-mono font-semibold">
                                            {selectedLog.entry_time ? new Date(selectedLog.entry_time).toLocaleString() : new Date(selectedLog.time).toLocaleString()}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">ENTRY GATE</span>
                                        <span className="font-semibold">{selectedLog.entry_gate_name || 'Main Gate'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">EXIT TIME</span>
                                        <span className="font-mono font-semibold">
                                            {selectedLog.exit_time ? new Date(selectedLog.exit_time).toLocaleString() : '-'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[9px]">EXIT GATE</span>
                                        <span className="font-semibold">{selectedLog.exit_gate_name || '-'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Vehicle Image */}
                            {selectedLog.image && (
                                <div>
                                    <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Detected Camera Image</h4>
                                    <div className="aspect-video rounded-xl overflow-hidden border border-[var(--border-color)] group shadow-inner">
                                        <img src={selectedLog.image} className="w-full h-full object-cover" />
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 shrink-0">
                            <button onClick={() => setSelectedLog(null)} className="px-5 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl font-bold hover:bg-[var(--bg-surface)] cursor-pointer">
                                Close
                            </button>
                            {selectedLog.exit_time == null && (
                                <button
                                    onClick={() => {
                                        handleAction('exit', { plate_number: selectedLog.plate });
                                        setSelectedLog(null);
                                    }}
                                    className="px-5 py-3 bg-red-650 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 hover:opacity-90 cursor-pointer border-none"
                                >
                                    Check Out Vehicle
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

// Helper functions (kept)
function formatTime(timestamp: string) {
    if (!timestamp) return '-'
    const date = new Date(timestamp)
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
}

function calculateDuration(start: string, end: string) {
    if (!start || !end) return '-'
    const startTime = new Date(start).getTime()
    const endTime = new Date(end).getTime()
    const diff = endTime - startTime
    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    if (hours > 0) return `${hours}h ${minutes}m`
    return `${minutes}m`
}
