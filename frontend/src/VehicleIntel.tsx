import { useState, useEffect } from 'react'
import { Car, AlertTriangle, RefreshCw } from 'lucide-react'

export default function VehicleIntel() {
    const [vehicles, setVehicles] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = () => {
        const token = localStorage.getItem('token')
        fetch('/api/gate/vehicle-logs', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                if (Array.isArray(data)) {
                    setVehicles(data)
                }
                setLoading(false)
            })
            .catch(err => {
                console.error("Failed to fetch vehicle logs", err)
                setLoading(false)
            })
    }

    useEffect(() => {
        fetchLogs()
        // Poll every 5 seconds for live updates
        const interval = setInterval(fetchLogs, 5000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="animate-fade-in p-2">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold">Vehicle Intelligence</h2>
                    <p className="text-[var(--text-secondary)]">AI-Powered License Plate & Make Recognition</p>
                </div>
                <button onClick={() => { setLoading(true); fetchLogs(); }} className="bg-blue-50 text-blue-600 p-2 rounded-lg hover:bg-blue-100 transition-colors" title="Refresh Logs">
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                <div className="col-span-2 glass-card p-0 overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-surface)]/50 shrink-0">
                        <h3 className="font-bold flex items-center gap-2"><Car size={18} /> Live Vehicle Logs</h3>
                        <span className="text-xs bg-green-500/10 text-green-500 px-2 py-1 rounded flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Live Feed Active
                        </span>
                    </div>
                    <div className="overflow-y-auto flex-1 custom-scrollbar">
                        <table className="w-full text-left bg-[var(--bg-surface)]">
                            <thead className="text-xs text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border-color)] sticky top-0 z-10 backdrop-blur-md">
                                <tr>
                                    <th className="p-4">Plate No.</th>
                                    <th className="p-4">AI Analysis</th>
                                    <th className="p-4">Confidence</th>
                                    <th className="p-4">Snapshot</th>
                                    <th className="p-4">Time</th>
                                    <th className="p-4">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {loading && vehicles.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">Loading intelligence feed...</td></tr>
                                ) : vehicles.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-400">No vehicle entries detected.</td></tr>
                                ) : (
                                    vehicles.map((v, i) => (
                                        <tr key={v.id || i} className="hover:bg-[var(--bg-primary)] transition-colors animate-in fade-in slide-in-from-left-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
                                            <td className="p-4 font-mono font-bold text-lg">{v.plate}</td>
                                            <td className="p-4">
                                                <div className="font-bold text-sm">{v.make}</div>
                                                <div className="flex gap-2 mt-1 text-xs text-[var(--text-secondary)]">
                                                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">{v.color}</span>
                                                    <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">{v.passengers} Pax</span>
                                                    {v.ai_data?.analysis?.type && <span className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded border border-gray-200 dark:border-gray-700">{v.ai_data.analysis.type}</span>}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col gap-1">
                                                    <div className="text-xs font-bold text-green-600 dark:text-green-400">
                                                        {v.ai_data?.confidence || '98%'} Match
                                                    </div>
                                                    <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div className="h-full bg-green-500 rounded-full" style={{ width: v.ai_data?.confidence || '98%' }}></div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                {v.image ? (
                                                    <div className="group relative w-16 h-10">
                                                        <img src={v.image} className="w-full h-full object-cover rounded border border-gray-200" alt="Car" />
                                                        <div className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center rounded cursor-pointer">
                                                            <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                                                        </div>
                                                    </div>
                                                ) : <span className="text-xs text-gray-400">No Img</span>}
                                            </td>
                                            <td className="p-4 text-sm text-[var(--text-secondary)] font-mono">{v.time}</td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${v.status === 'allowed' ? 'text-green-500 bg-green-500/10' :
                                                    v.status === 'visitor' ? 'text-blue-500 bg-blue-500/10' :
                                                        'text-red-500 bg-red-500/10'
                                                    }`}>
                                                    {v.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card p-6 h-fit">
                    <h3 className="font-bold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-yellow-500" /> Watchlist</h3>
                    <div className="space-y-3">
                        {/* Static / Mock Watchlist for now */}
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

                        {/* Dynamic Flagged Vehicles? */}
                        {vehicles.filter(v => v.status === 'flagged').map((v, i) => (
                            <div key={i} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 animate-pulse">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="font-bold text-red-500">{v.plate}</div>
                                        <div className="text-xs text-red-400 opacity-80">Check vehicle</div>
                                    </div>
                                    <span className="text-xs bg-red-500 text-white px-1 rounded">FLAGGED</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
