import { useState, useEffect } from 'react'
import { 
    Download, Search, RefreshCw, ChevronLeft, ChevronRight, 
    Calendar, Users, BookOpen, Clock, MapPin, CheckCircle, XCircle 
} from 'lucide-react'

export default function AllScansDownload() {
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            // Fetch up to 500 recent scan records
            const res = await fetch('/api/attendance/attendance-logs?limit=500', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setLogs(data.logs || [])
            }
        } catch (e) {
            console.error("Fetch all scan logs failed", e)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [])

    const handleDownloadAll = async () => {
        setDownloading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/attendance/download-all', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const blob = await res.blob()
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `All_Units_Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`
                document.body.appendChild(a)
                a.click()
                a.remove()
                window.URL.revokeObjectURL(url)
            } else {
                alert("Failed to download attendance logs.")
            }
        } catch (e) {
            console.error("Download failed", e)
            alert("Error downloading attendance logs.")
        } finally {
            setDownloading(false)
        }
    }

    // Filter logs client-side
    const filteredLogs = logs.filter(log => {
        const query = searchQuery.toLowerCase()
        return (
            log.student.name.toLowerCase().includes(query) ||
            log.student.admission_number.toLowerCase().includes(query) ||
            log.course.code.toLowerCase().includes(query) ||
            log.course.name.toLowerCase().includes(query) ||
            (log.classroom.code && log.classroom.code.toLowerCase().includes(query))
        )
    })

    // Pagination
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
            {/* Header section */}
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        All Units Attendance Hub
                    </h1>
                    <p className="text-[var(--text-secondary)]">Search and download comprehensive class attendance records across all course units.</p>
                </div>
                
                <div className="flex gap-2 w-full sm:w-auto">
                    <button
                        onClick={fetchLogs}
                        className="p-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--border-color)] transition-colors flex items-center justify-center gap-2"
                        title="Refresh Logs"
                        disabled={loading}
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        <span className="sm:hidden text-sm font-semibold">Refresh</span>
                    </button>
                    
                    <button
                        onClick={handleDownloadAll}
                        disabled={downloading}
                        className="flex-1 sm:flex-initial py-3 px-5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/10 text-sm disabled:opacity-50"
                    >
                        <Download size={18} />
                        {downloading ? 'Downloading...' : 'Download Attendance Report'}
                    </button>
                </div>
            </header>

            {/* Quick stats panel */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Total Attendance Scans</div>
                        <div className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{logs.length}</div>
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                        <BookOpen size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Active Scans (Search Match)</div>
                        <div className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{filteredLogs.length}</div>
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 flex items-center gap-4 shadow-sm">
                    <div className="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                        <CheckCircle size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Download Status</div>
                        <div className="text-sm font-bold text-green-600 dark:text-green-400 mt-1.5 flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Ready for CSV Export
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter and Table container */}
            <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm flex flex-col">
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                        <Calendar size={18} /> Scans Database
                    </h2>

                    {/* Search Field */}
                    <div className="relative w-full md:max-w-sm">
                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                            <Search size={16} />
                        </span>
                        <input
                            type="text"
                            placeholder="Search by Course, Student name, or Admission..."
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            className="w-full pl-10 pr-4 py-2 text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
                        />
                    </div>
                </div>

                {/* Table implementation */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-[#f0f2f5] dark:bg-gray-800 text-[var(--text-secondary)] text-xs uppercase font-semibold">
                            <tr>
                                <th className="p-4 border-b border-[var(--border-color)]">Scan Time</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Student</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Course / Unit</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Classroom</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Session Date</th>
                                <th className="p-4 border-b border-[var(--border-color)]">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading && logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">Loading scan logs...</td>
                                </tr>
                            ) : filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400">No scan activity found matching query.</td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-[var(--bg-primary)] transition-colors text-sm">
                                        <td className="p-4 whitespace-nowrap font-mono text-xs text-[var(--text-secondary)]">
                                            {log.scan_time ? new Date(log.scan_time).toLocaleTimeString() : '-'}
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-[var(--text-primary)]">{log.student.name}</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">{log.student.admission_number}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="font-bold text-blue-600 dark:text-blue-400">{log.course.code}</div>
                                            <div className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-[200px]">{log.course.name}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="inline-flex items-center gap-1 font-semibold text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                <MapPin size={10} /> {log.classroom.code || 'N/A'}
                                            </span>
                                        </td>
                                        <td className="p-4 whitespace-nowrap text-[var(--text-secondary)]">
                                            {log.session.date}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold ${
                                                log.status === 'present' 
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                            }`}>
                                                {log.status === 'present' ? <CheckCircle size={10} /> : <XCircle size={10} />}
                                                <span className="capitalize">{log.status}</span>
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Table Pagination */}
                {!loading && filteredLogs.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-between">
                        <div className="text-xs text-[var(--text-secondary)]">
                            Showing <span className="font-bold text-[var(--text-primary)]">{startIndex + 1}</span> to <span className="font-bold text-[var(--text-primary)]">{Math.min(startIndex + itemsPerPage, filteredLogs.length)}</span> of <span className="font-bold text-[var(--text-primary)]">{filteredLogs.length}</span> logs
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                <ChevronLeft size={16} />
                            </button>
                            <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                <ChevronRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
