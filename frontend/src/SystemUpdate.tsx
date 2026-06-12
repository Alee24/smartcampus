import { useState, useEffect } from 'react'
import { 
    Cpu, HardDrive, Shield, GitBranch, RefreshCw, Terminal, 
    Activity, CheckCircle, AlertTriangle, AlertCircle, Clock, 
    Server, ArrowUpRight, Copy, Check, Play, X
} from 'lucide-react'

export default function SystemUpdate() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [updateMessage, setUpdateMessage] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)
    const [pollingCount, setPollingCount] = useState(0)
    const [copied, setCopied] = useState(false)
    const [notification, setNotification] = useState<{message: string, type: 'success' | 'error' | 'info'} | null>(null)

    const showNotification = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setNotification({ message: msg, type })
        setTimeout(() => setNotification(null), 5000)
    }

    const fetchHealth = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/system/health', {
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            })
            if (res.ok) {
                const healthData = await res.json()
                setData(healthData)
            }
        } catch (e: any) {
            console.error("Fetch health failed", e)
            showNotification("Failed to fetch latest system health details: " + e.message, "error")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchHealth()
        const interval = setInterval(fetchHealth, 15000)
        return () => clearInterval(interval)
    }, [])

    // Polling logic when updating to detect when backend is back online
    useEffect(() => {
        if (!updating) return
        
        const pollInterval = setInterval(async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/system/health', {
                    headers: { 'Authorization': token ? `Bearer ${token}` : '' }
                })
                if (res.ok) {
                    setUpdating(false)
                    setUpdateMessage("Update completed successfully! Reloading portal...")
                    showNotification("System updated and back online!", "success")
                    clearInterval(pollInterval)
                    setTimeout(() => {
                        window.location.reload()
                    }, 2000)
                }
            } catch (e) {
                setPollingCount(prev => prev + 1)
                setUpdateMessage(`Waiting for containers to rebuild... (${pollingCount}s)`)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [updating, pollingCount])

    const handleUpdate = async () => {
        try {
            setUpdating(true)
            setUpdateMessage("Initiating code pull from Git and restarting services...")
            setShowConfirm(false)
            setPollingCount(1)
            
            const token = localStorage.getItem('token')
            const res = await fetch('/api/system/update', {
                method: 'POST',
                headers: { 'Authorization': token ? `Bearer ${token}` : '' }
            })
            
            if (res.ok) {
                const result = await res.json()
                setUpdateMessage(result.message || "Update container started. Server restarting...")
                showNotification("Update sequence triggered successfully!", "success")
            } else {
                const err = await res.json()
                setUpdating(false)
                showNotification(`Update failed to start: ${err.detail || "Server error"}`, "error")
            }
        } catch (e: any) {
            setUpdating(false)
            showNotification(`Error triggering update: ${e.message || e}`, "error")
        }
    }

    const copyCommitHash = () => {
        if (data?.version?.hash) {
            navigator.clipboard.writeText(data.version.hash)
            setCopied(true)
            showNotification("Commit hash copied to clipboard", "success")
            setTimeout(() => setCopied(false), 2050)
        }
    }

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / (3600 * 24))
        const h = Math.floor((seconds % (3600 * 24)) / 3600)
        const m = Math.floor((seconds % 3600) / 60)
        
        const parts = []
        if (d > 0) parts.push(`${d}d`)
        if (h > 0) parts.push(`${h}h`)
        parts.push(`${m}m`)
        return parts.join(' ')
    }

    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
                <div className="relative flex items-center justify-center">
                    <div className="w-16 h-16 border-4 border-purple-600/30 border-t-purple-600 rounded-full animate-spin"></div>
                    <Server className="absolute text-purple-600 animate-pulse" size={24} />
                </div>
                <div className="flex flex-col items-center gap-1">
                    <span className="text-gray-900 dark:text-white font-black text-sm tracking-wider uppercase">Loading Diagnostics</span>
                    <span className="text-gray-400 dark:text-gray-500 text-xs font-semibold">Contacting campus server daemon...</span>
                </div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in p-4 max-w-6xl mx-auto space-y-6">
            
            {/* Real-time Notifications */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-2xl shadow-xl flex items-center gap-3 animate-scale-in border max-w-sm ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-300 border-emerald-100 dark:border-emerald-900/40' 
                        : notification.type === 'error'
                        ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-300 border-rose-100 dark:border-rose-900/40'
                        : 'bg-indigo-50 dark:bg-indigo-950/90 text-indigo-800 dark:text-indigo-300 border-indigo-100 dark:border-indigo-900/40'
                }`}>
                    {notification.type === 'success' && <CheckCircle size={18} />}
                    {notification.type === 'error' && <AlertCircle size={18} />}
                    {notification.type === 'info' && <Activity size={18} />}
                    <span className="text-xs font-bold">{notification.message}</span>
                </div>
            )}

            {/* Header & Status Indicator */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-4">
                    <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-2xl animate-pulse">
                        <Activity size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-2.5">
                            System Health & Updates
                            <span className="flex h-2.5 w-2.5 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                            </span>
                        </h2>
                        <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase mt-0.5 tracking-wider">
                            Diagnostics Dashboard & Codebase Management
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex flex-col text-right pr-3 border-r border-gray-100 dark:border-gray-800">
                        <span className="text-[10px] text-gray-400 font-bold uppercase">Daemon status</span>
                        <span className="text-xs font-black text-emerald-600 dark:text-emerald-450">Online & Syncing</span>
                    </div>
                    <button
                        onClick={() => { setLoading(true); fetchHealth(); }}
                        className="p-3 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-650 dark:text-gray-200 rounded-xl transition-all shadow-sm flex items-center justify-center disabled:opacity-50 active:scale-95"
                        title="Refresh Status"
                        disabled={updating}
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </header>

            {/* Updating State Overlay */}
            {updating && (
                <div className="fixed inset-0 bg-gray-950/80 backdrop-blur-lg z-[9999] flex flex-col items-center justify-center gap-6 text-white p-6">
                    <div className="relative flex items-center justify-center">
                        <div className="w-24 h-24 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin"></div>
                        <Shield className="absolute text-purple-400 animate-pulse" size={36} />
                    </div>
                    <div className="text-center space-y-2 max-w-md">
                        <h3 className="text-2xl font-black tracking-tight">Updating System Daemon</h3>
                        <p className="text-gray-400 text-sm font-semibold">{updateMessage}</p>
                        <div className="w-full bg-gray-900 h-1.5 rounded-full overflow-hidden mt-4">
                            <div className="bg-purple-500 h-full rounded-full animate-pulse" style={{ width: '60%' }}></div>
                        </div>
                    </div>
                    <div className="absolute bottom-10 text-center space-y-1">
                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Safe update protocol</span>
                        <span className="text-xs text-gray-400">Database values and configurations are protected. Portal will auto-refresh.</span>
                    </div>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CPU usage */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 rounded-2xl group-hover:scale-105 transition-transform">
                            <Cpu size={22} />
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 px-2.5 py-1 rounded-lg">
                            {data?.health?.cpu?.cores} Cores
                        </span>
                    </div>
                    <h4 className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">CPU Load</h4>
                    <div className="text-3xl font-black mt-1 text-gray-900 dark:text-white flex items-baseline gap-1">
                        {data?.health?.cpu?.percent}%
                        <span className="text-xs text-gray-400 font-medium">load</span>
                    </div>
                    <div className="w-full bg-gray-50 dark:bg-gray-800/50 h-2 rounded-full mt-4 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full rounded-full transition-all duration-550" 
                            style={{ width: `${Math.min(100, data?.health?.cpu?.percent || 0)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-3">
                        <span>1m: {data?.health?.cpu?.load_1m}</span>
                        <span>5m: {data?.health?.cpu?.load_5m}</span>
                        <span>15m: {data?.health?.cpu?.load_15m}</span>
                    </div>
                </div>

                {/* RAM usage */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 text-purple-600 dark:text-purple-400 rounded-2xl group-hover:scale-105 transition-transform">
                            <Shield size={22} />
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 px-2.5 py-1 rounded-lg">
                            {data?.health?.ram?.total_gb} GB Total
                        </span>
                    </div>
                    <h4 className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Memory Usage</h4>
                    <div className="text-3xl font-black mt-1 text-gray-900 dark:text-white flex items-baseline gap-1">
                        {data?.health?.ram?.percent}%
                        <span className="text-xs text-gray-400 font-medium">used</span>
                    </div>
                    <div className="w-full bg-gray-50 dark:bg-gray-800/50 h-2 rounded-full mt-4 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-purple-500 to-indigo-600 h-full rounded-full transition-all duration-550" 
                            style={{ width: `${data?.health?.ram?.percent || 0}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-3">
                        <span>Used: {data?.health?.ram?.used_gb} GB</span>
                        <span>Free: {roundDecimal((data?.health?.ram?.total_gb || 0) - (data?.health?.ram?.used_gb || 0))} GB</span>
                    </div>
                </div>

                {/* Disk usage */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all duration-300 group">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl group-hover:scale-105 transition-transform">
                            <HardDrive size={22} />
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-lg">
                            {data?.health?.disk?.total_gb} GB Total
                        </span>
                    </div>
                    <h4 className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">Disk Usage</h4>
                    <div className="text-3xl font-black mt-1 text-gray-900 dark:text-white flex items-baseline gap-1">
                        {data?.health?.disk?.percent}%
                        <span className="text-xs text-gray-400 font-medium">used</span>
                    </div>
                    <div className="w-full bg-gray-50 dark:bg-gray-800/50 h-2 rounded-full mt-4 overflow-hidden">
                        <div 
                            className="bg-gradient-to-r from-emerald-500 to-teal-600 h-full rounded-full transition-all duration-550" 
                            style={{ width: `${data?.health?.disk?.percent || 0}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase mt-3">
                        <span>Used: {data?.health?.disk?.used_gb} GB</span>
                        <span>Free: {roundDecimal((data?.health?.disk?.total_gb || 0) - (data?.health?.disk?.used_gb || 0))} GB</span>
                    </div>
                </div>
            </div>

            {/* Version & Update Trigger Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Git Version Info */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between space-y-4">
                    <div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3.5 mb-4 flex items-center gap-2.5">
                            <GitBranch className="text-indigo-600 dark:text-indigo-400" size={18} />
                            Codebase Version Details
                        </h3>
                        <div className="space-y-3.5">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase">Active Branch</span>
                                <span className="font-mono font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-lg border border-indigo-100/50 dark:border-indigo-900/30">{data?.version?.branch}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase">Commit Hash</span>
                                <div className="flex items-center gap-1.5">
                                    <span className="font-mono font-black text-gray-700 dark:text-gray-300 px-2 py-0.5 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-150 dark:border-gray-750">{data?.version?.hash}</span>
                                    <button 
                                        onClick={copyCommitHash}
                                        className="p-1 text-gray-400 hover:text-gray-655 dark:hover:text-white transition-colors"
                                        title="Copy Hash"
                                    >
                                        {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase">Commit Date</span>
                                <span className="font-bold text-gray-800 dark:text-gray-250">{data?.version?.date}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-gray-400 dark:text-gray-500 font-semibold uppercase">Author</span>
                                <span className="font-bold text-gray-800 dark:text-gray-250 truncate max-w-[220px]">{data?.version?.author || 'N/A'}</span>
                            </div>
                            <div className="border-t border-gray-50 dark:border-gray-800/80 pt-3.5 mt-3.5">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider block mb-1.5">Commit Message</span>
                                <p className="text-xs font-mono font-medium text-gray-655 dark:text-gray-300 bg-gray-50/50 dark:bg-gray-800/30 p-3 rounded-2xl border border-gray-100 dark:border-gray-800 italic leading-relaxed">
                                    "{data?.version?.message}"
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase flex items-center gap-1.5 pt-2">
                        <Clock size={14} />
                        Uptime: <span className="font-black text-gray-800 dark:text-gray-250 normal-case">{formatUptime(data?.health?.uptime_seconds || 0)}</span>
                    </div>
                </div>

                {/* Git Update Action Trigger Card */}
                <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between bg-gradient-to-br from-white to-purple-50/30 dark:from-gray-900 dark:to-purple-950/5">
                    <div>
                        <h3 className="text-base font-black text-gray-900 dark:text-white border-b border-gray-50 dark:border-gray-800 pb-3.5 mb-4 flex items-center gap-2.5">
                            <Terminal className="text-purple-600 dark:text-purple-400" size={18} />
                            Expedited Codebase Updater
                        </h3>
                        <p className="text-xs text-gray-450 dark:text-gray-400 mb-4 leading-relaxed font-medium">
                            Triggering the updater will run an automated pull request on branch <strong className="text-purple-600 dark:text-purple-400 font-bold">{data?.version?.branch}</strong>, rebuild with Docker BuildKit, compile dependencies, and restart all containers seamlessly.
                        </p>
                        
                        <div className="p-4 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl flex gap-3 text-amber-800 dark:text-amber-400">
                            <AlertTriangle className="shrink-0 text-amber-600 dark:text-amber-500" size={18} />
                            <div className="text-[11px] space-y-1 font-medium leading-normal">
                                <span className="font-bold block text-amber-905 dark:text-amber-350">Rebuild Warning & Compilation</span>
                                <span>The server will compile using multi-threaded cached mounts. System services will experience a 10-20 seconds restart break.</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        {!showConfirm ? (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-750 hover:to-indigo-750 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-500/15 hover:shadow-purple-500/30 transition-all flex items-center justify-center gap-2 transform active:scale-95 cursor-pointer"
                            >
                                <RefreshCw size={16} />
                                Rebuild & Deploy Codebase
                            </button>
                        ) : (
                            <div className="space-y-3 border border-purple-200 dark:border-purple-900/30 p-4 bg-purple-500/5 rounded-2xl animate-scale-in">
                                <span className="text-xs font-black text-purple-800 dark:text-purple-355 block text-center mb-1 uppercase tracking-wider">Confirm deployment sequence?</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleUpdate}
                                        className="flex-1 py-2.5 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-xl transition-all shadow-sm cursor-pointer"
                                    >
                                        Yes, Deploy
                                    </button>
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-2.5 px-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-750 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Docker Containers status list */}
            <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-50 dark:border-gray-800">
                    <h3 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2.5">
                        <Server className="text-blue-600 dark:text-blue-400" size={18} />
                        Docker Container Health status
                    </h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/40 text-gray-400 dark:text-gray-500 text-[10px] uppercase font-bold tracking-wider">
                                <th className="py-4 px-6 border-b border-gray-50 dark:border-gray-800/60">Container Name</th>
                                <th className="py-4 px-6 border-b border-gray-50 dark:border-gray-800/60">State</th>
                                <th className="py-4 px-6 border-b border-gray-50 dark:border-gray-800/60">Status Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60">
                            {data?.containers?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-8 text-center text-gray-400 dark:text-gray-500 text-xs font-bold uppercase tracking-wider">No active gatepass containers resolved.</td>
                                </tr>
                            ) : (
                                data?.containers?.map((c: any) => (
                                    <tr key={c.name} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                                        <td className="py-4 px-6 font-mono text-xs font-black text-gray-800 dark:text-gray-200">{c.name}</td>
                                        <td className="py-4 px-6">
                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                c.state === 'running' 
                                                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-100/30 dark:border-emerald-900/30' 
                                                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-450 border border-rose-100/30 dark:border-rose-900/30'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.state === 'running' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
                                                {c.state}
                                            </span>
                                        </td>
                                        <td className="py-4 px-6 text-xs text-gray-450 dark:text-gray-450 font-mono font-medium">{c.status}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

function roundDecimal(num: number) {
    return Math.round(num * 100) / 100
}
