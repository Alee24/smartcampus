
import { useState, useEffect } from 'react'
import { QrCode, RefreshCw, Smartphone, MapPin, CheckCircle, XCircle } from 'lucide-react'

export default function ScanLogs() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/scan-logs', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setLogs(data)
            }
        } catch (e) {
            console.error("Fetch logs failed", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
        const interval = setInterval(fetchLogs, 5000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="animate-fade-in p-2">
            <header className="mb-6 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <QrCode className="text-purple-600" size={32} />
                        Scan & Check-in Logs
                    </h2>
                    <p className="text-[var(--text-secondary)]">Real-time attendance scanning activity from all devices</p>
                </div>
                <button
                    onClick={() => { setLoading(true); fetchLogs(); }}
                    className="p-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    title="Refresh Logs"
                >
                    <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                </button>
            </header>

            <div className="glass-card overflow-hidden p-0 border border-[var(--border-color)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f2f5] dark:bg-gray-800 text-[var(--text-secondary)] text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4 border-b border-[var(--border-color)]">Time</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Student</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Room</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Status</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Location</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Details</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">Loading scan logs...</td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">No scan activity recorded yet.</td>
                                </tr>
                            ) : (
                                logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                                        <td className="p-4 whitespace-nowrap text-sm font-mono text-[var(--text-secondary)]">
                                            {new Date(log.timestamp).toLocaleTimeString()}
                                            <div className="text-xs opacity-60">{new Date(log.timestamp).toLocaleDateString()}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-sm">{log.student_name}</div>
                                            <div className="text-xs font-mono text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-1 rounded w-fit mt-0.5">
                                                {log.admission_number}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            {log.room_code ? (
                                                <span className="font-mono font-bold text-sm">{log.room_code}</span>
                                            ) : (
                                                <span className="text-xs text-gray-400">Unknown</span>
                                            )}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${log.is_successful
                                                    ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                                                    : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                                                }`}>
                                                <QrCode size={14} /> Scanned
                                                {!log.is_successful && <span className="opacity-50 text-[10px] ml-1">(Failed)</span>}
                                            </span>
                                        </td>
                                        <td className="p-4 text-sm text-[var(--text-secondary)]">
                                            {log.detected_location ? (
                                                <div className="flex items-center gap-1 text-xs font-medium text-[var(--text-primary)]">
                                                    <MapPin size={12} className="text-blue-500" />
                                                    {log.detected_location}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">Location unmapped</span>
                                            )}
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="max-w-[150px] truncate text-[var(--text-secondary)] text-xs" title={log.status_message}>
                                                {log.status_message || '-'}
                                            </div>
                                        </td>
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
