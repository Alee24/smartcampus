import { useState, useEffect } from 'react'
import { Car, AlertTriangle, RefreshCw, Search, ArrowDownCircle, ArrowUpCircle, Clock, LogIn, LogOut, MoreHorizontal, CheckCircle } from 'lucide-react'

export default function VehicleIntel() {
    const [vehicles, setVehicles] = useState<any[]>([]) // Registered Vehicles
    const [logs, setLogs] = useState<any[]>([])         // Activity Logs
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<'fleet' | 'logs'>('fleet')

    const fetchData = async () => {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }

        try {
            const [vehRes, logRes] = await Promise.all([
                fetch('/api/gate/vehicles', { headers }),
                fetch('/api/gate/vehicle-logs', { headers })
            ])

            if (vehRes.ok) setVehicles(await vehRes.json())
            if (logRes.ok) setLogs(await logRes.json())

            setLoading(false)
        } catch (err) {
            console.error("Failed to fetch data", err)
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        const interval = setInterval(fetchData, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleAction = async (action: 'entry' | 'exit', vehicle: any) => {
        const token = localStorage.getItem('token')
        const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }

        if (action === 'entry') {
            if (!confirm(`Mark ${vehicle.plate_number} as Entered?`)) return
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
            if (!confirm(`Mark ${vehicle.plate_number} as Exited?`)) return
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

    // Stats
    const parkedCount = logs.filter(v => !v.exit_time).length
    const exitedCount = logs.filter(v => v.exit_time).length
    const totalRegistered = vehicles.length

    return (
        <div className="animate-fade-in p-2">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Vehicle Intelligence</h2>
                    <p className="text-[var(--text-secondary)]">Fleet Management & Activity Logs</p>
                </div>
                <div className="flex gap-2">
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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
            </div>

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
                                    <th className="p-4">Status</th>
                                    <th className="p-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {viewMode === 'fleet' ? (
                                    // FLEET VIEW
                                    fleetList.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No registered vehicles found.</td></tr>
                                    ) : (
                                        fleetList.map((v, i) => (
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
                                    filteredLogs.length === 0 ? (
                                        <tr><td colSpan={5} className="p-8 text-center text-gray-400">No logs found.</td></tr>
                                    ) : (
                                        filteredLogs.map((v, i) => {
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
                                                    <td className="p-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${isParked ? 'text-green-500 bg-green-500/10' : 'text-gray-500 bg-gray-500/10'}`}>
                                                            {isParked ? 'PARKED' : 'EXITED'}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 text-center">
                                                        {isParked && (
                                                            <button
                                                                onClick={() => handleAction('exit', { plate_number: v.plate })}
                                                                className="text-red-500 hover:text-red-700 mx-auto"
                                                            >
                                                                <LogOut size={16} />
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
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
            </div>
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
