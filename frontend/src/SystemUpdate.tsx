import { useState, useEffect } from 'react'
import { Cpu, HardDrive, Shield, GitBranch, RefreshCw, Terminal, Activity, CheckCircle, AlertTriangle, AlertCircle } from 'lucide-react'

export default function SystemUpdate() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [updating, setUpdating] = useState(false)
    const [updateMessage, setUpdateMessage] = useState("")
    const [showConfirm, setShowConfirm] = useState(false)
    const [pollingCount, setPollingCount] = useState(0)

    const fetchHealth = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/system/health', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const healthData = await res.json()
                setData(healthData)
            }
        } catch (e) {
            console.error("Fetch health failed", e)
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
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    setUpdating(false)
                    setUpdateMessage("Update completed successfully! Reloading...")
                    clearInterval(pollInterval)
                    setTimeout(() => {
                        window.location.reload()
                    }, 2000)
                }
            } catch (e) {
                setPollingCount(prev => prev + 1)
                setUpdateMessage(`Waiting for services to rebuild... (${pollingCount}s)`)
            }
        }, 3000)

        return () => clearInterval(pollInterval)
    }, [updating, pollingCount])

    const handleUpdate = async () => {
        try {
            setUpdating(true)
            setUpdateMessage("Initiating code pull from Git and restarting services...")
            setShowConfirm(false)
            
            const token = localStorage.getItem('token')
            const res = await fetch('/api/system/update', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            
            if (res.ok) {
                const result = await res.json()
                setUpdateMessage(result.message || "Update container started. Server restarting...")
                setPollingCount(1)
            } else {
                const err = await res.json()
                setUpdating(false)
                alert(`Update failed to start: ${err.detail || "Server error"}`)
            }
        } catch (e) {
            setUpdating(false)
            alert("Error triggering update")
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
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <RefreshCw className="animate-spin text-purple-600" size={32} />
                <span className="text-[var(--text-secondary)] font-medium">Gathering system health details...</span>
            </div>
        )
    }

    return (
        <div className="animate-fade-in p-2 max-w-5xl mx-auto">
            {/* Header */}
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <Activity className="text-purple-600" size={32} />
                        System Health & Updates
                    </h2>
                    <p className="text-[var(--text-secondary)]">Monitor resources, container states, and manage version updates.</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchHealth(); }}
                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    title="Refresh Status"
                    disabled={updating}
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            {/* Updating State Overlay */}
            {updating && (
                <div className="fixed inset-0 bg-black/55 backdrop-blur-md z-50 flex flex-col items-center justify-center gap-4 text-white p-4">
                    <div className="relative">
                        <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                        <Shield className="absolute inset-0 m-auto text-purple-400 animate-pulse" size={24} />
                    </div>
                    <h3 className="text-xl font-bold">System Update In Progress</h3>
                    <p className="text-gray-300 text-sm max-w-md text-center">{updateMessage}</p>
                    <span className="text-xs text-gray-400 italic">Please do not refresh or close this tab. The page will auto-reload when the rebuild completes.</span>
                </div>
            )}

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {/* CPU usage */}
                <div className="glass-card p-6 border border-[var(--border-color)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Cpu size={24} />
                        </div>
                        <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                            {data?.health?.cpu?.cores} Cores
                        </span>
                    </div>
                    <h4 className="text-[var(--text-secondary)] text-sm font-medium">CPU Load</h4>
                    <div className="text-3xl font-black mt-1 text-[var(--text-primary)]">
                        {data?.health?.cpu?.percent}%
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${Math.min(100, data?.health?.cpu?.percent || 0)}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                        <span>1m: {data?.health?.cpu?.load_1m}</span>
                        <span>5m: {data?.health?.cpu?.load_5m}</span>
                        <span>15m: {data?.health?.cpu?.load_15m}</span>
                    </div>
                </div>

                {/* RAM usage */}
                <div className="glass-card p-6 border border-[var(--border-color)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-xl">
                            <Shield size={24} />
                        </div>
                        <span className="text-xs font-bold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                            {data?.health?.ram?.total_gb} GB Total
                        </span>
                    </div>
                    <h4 className="text-[var(--text-secondary)] text-sm font-medium">Memory Usage</h4>
                    <div className="text-3xl font-black mt-1 text-[var(--text-primary)]">
                        {data?.health?.ram?.percent}%
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-purple-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${data?.health?.ram?.percent || 0}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                        <span>Used: {data?.health?.ram?.used_gb} GB</span>
                        <span>Available: {roundDecimal((data?.health?.ram?.total_gb || 0) - (data?.health?.ram?.used_gb || 0))} GB</span>
                    </div>
                </div>

                {/* Disk usage */}
                <div className="glass-card p-6 border border-[var(--border-color)]">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <HardDrive size={24} />
                        </div>
                        <span className="text-xs font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                            {data?.health?.disk?.total_gb} GB Total
                        </span>
                    </div>
                    <h4 className="text-[var(--text-secondary)] text-sm font-medium">Disk Usage</h4>
                    <div className="text-3xl font-black mt-1 text-[var(--text-primary)]">
                        {data?.health?.disk?.percent}%
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2.5 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                            style={{ width: `${data?.health?.disk?.percent || 0}%` }}
                        ></div>
                    </div>
                    <div className="flex justify-between text-[10px] text-gray-400 mt-2">
                        <span>Used: {data?.health?.disk?.used_gb} GB</span>
                        <span>Free: {roundDecimal((data?.health?.disk?.total_gb || 0) - (data?.health?.disk?.used_gb || 0))} GB</span>
                    </div>
                </div>
            </div>

            {/* Version & Update Trigger Block */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Git Version Info */}
                <div className="glass-card border border-[var(--border-color)] flex flex-col justify-between">
                    <div>
                        <h3 className="text-lg font-bold border-b border-[var(--border-color)] pb-3 mb-4 flex items-center gap-2">
                            <GitBranch className="text-indigo-600" size={20} />
                            Codebase Version
                        </h3>
                        <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Active Branch</span>
                                <span className="font-mono font-bold text-indigo-600 dark:text-indigo-400">{data?.version?.branch}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Commit Hash</span>
                                <span className="font-mono font-bold px-1.5 py-0.5 bg-gray-100 dark:bg-gray-850 rounded">{data?.version?.hash}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Commit Date</span>
                                <span className="font-medium text-[var(--text-primary)]">{data?.version?.date}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-[var(--text-secondary)]">Author</span>
                                <span className="text-xs text-[var(--text-secondary)] truncate max-w-[200px]">{data?.version?.author}</span>
                            </div>
                            <div className="border-t border-[var(--border-color)] pt-3 mt-3">
                                <span className="text-xs text-[var(--text-secondary)] block mb-1">Message</span>
                                <p className="text-sm font-medium font-mono text-[var(--text-primary)] bg-gray-50 dark:bg-gray-800/40 p-2.5 rounded-xl border border-[var(--border-color)] italic">
                                    "{data?.version?.message}"
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="text-xs text-[var(--text-secondary)] mt-4">
                        Uptime: <span className="font-bold text-[var(--text-primary)]">{formatUptime(data?.health?.uptime_seconds || 0)}</span>
                    </div>
                </div>

                {/* Git Update Action Trigger Card */}
                <div className="glass-card border border-[var(--border-color)] flex flex-col justify-between bg-purple-50/10 dark:bg-purple-950/5">
                    <div>
                        <h3 className="text-lg font-bold border-b border-[var(--border-color)] pb-3 mb-4 flex items-center gap-2">
                            <Terminal className="text-purple-600" size={20} />
                            Codebase Updater
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-4 leading-relaxed">
                            Clicking the button below will instruct the server to run a clean git pull on the branch <strong>{data?.version?.branch}</strong>, rebuild dependencies, and restart all application containers in the background.
                        </p>
                        
                        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-2xl flex gap-3 text-amber-800 dark:text-amber-400">
                            <AlertTriangle className="shrink-0" size={20} />
                            <div className="text-xs space-y-1">
                                <span className="font-bold block">Warning: Temporary Interruption</span>
                                <span>The system will be offline for 10-20 seconds during compilation. The database state will NOT be affected.</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-6">
                        {!showConfirm ? (
                            <button
                                onClick={() => setShowConfirm(true)}
                                className="w-full py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg shadow-purple-500/10 hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw size={18} />
                                Update System Codebase
                            </button>
                        ) : (
                            <div className="space-y-2 border border-purple-200 dark:border-purple-900/40 p-4 bg-purple-500/5 rounded-2xl">
                                <span className="text-sm font-bold text-purple-700 dark:text-purple-400 block text-center mb-1">Are you sure you want to proceed?</span>
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleUpdate}
                                        className="flex-1 py-2 px-3 bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Yes, Update
                                    </button>
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-2 px-3 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-[var(--text-primary)] text-xs font-bold rounded-lg transition-colors"
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
            <div className="glass-card border border-[var(--border-color)]">
                <h3 className="text-lg font-bold border-b border-[var(--border-color)] pb-3 mb-4 flex items-center gap-2">
                    <Shield className="text-blue-600" size={20} />
                    Docker Container Health status
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[#f0f2f5] dark:bg-gray-800 text-[var(--text-secondary)] text-xs uppercase font-semibold">
                                <th className="p-3 border-b border-[var(--border-color)]">Container Name</th>
                                <th className="p-3 border-b border-[var(--border-color)]">State</th>
                                <th className="p-3 border-b border-[var(--border-color)]">Status Description</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {data?.containers?.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="p-6 text-center text-gray-400 text-sm">No gatepass containers found.</td>
                                </tr>
                            ) : (
                                data?.containers?.map((c: any) => (
                                    <tr key={c.name} className="hover:bg-[var(--bg-primary)] transition-colors">
                                        <td className="p-3 font-mono text-sm font-bold text-[var(--text-primary)]">{c.name}</td>
                                        <td className="p-3">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                                c.state === 'running' 
                                                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400' 
                                                    : 'bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400'
                                            }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${c.state === 'running' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                                                {c.state.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs text-[var(--text-secondary)] font-mono">{c.status}</td>
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
