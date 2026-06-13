import { useState, useEffect } from 'react'
import { 
    Download, Search, RefreshCw, ChevronLeft, ChevronRight, 
    Calendar, Users, BookOpen, Clock, MapPin, CheckCircle, XCircle,
    QrCode, X, Printer, ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeCanvas } from 'qrcode.react'

export default function AllScansDownload() {
    // Original Logs / Scans DB State
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [downloading, setDownloading] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8

    // Tab state: 'units' or 'scans'
    const [activeSubTab, setActiveSubTab] = useState<'units' | 'scans'>('units')

    // Course Units State
    const [courses, setCourses] = useState<any[]>([])
    const [coursesLoading, setCoursesLoading] = useState(true)
    const [selectedCourse, setSelectedCourse] = useState<any>(null)
    const [sessions, setSessions] = useState<any[]>([])
    const [sessionsLoading, setSessionsLoading] = useState(false)
    const [expandedSession, setExpandedSession] = useState<string | null>(null)
    const [sessionDetails, setSessionDetails] = useState<any[]>([])
    const [loadingDetails, setLoadingDetails] = useState(false)
    const [showQRModal, setShowQRModal] = useState(false)
    const [courseSearchQuery, setCourseSearchQuery] = useState('')
    const [coursesPage, setCoursesPage] = useState(1)
    const coursesPerPage = 8

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
            } else {
                const errText = await res.text()
                console.error("Fetch all scan logs failed with code " + res.status + ": " + errText)
            }
        } catch (e: any) {
            console.error("Fetch all scan logs failed", e)
        } finally {
            setLoading(false)
        }
    }

    const fetchCourses = async () => {
        setCoursesLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/attendance/courses', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setCourses(data || [])
                if (data && data.length > 0 && !selectedCourse) {
                    handleSelectCourse(data[0])
                }
            } else {
                const errText = await res.text()
                console.error("Fetch courses failed with code " + res.status + ": " + errText)
            }
        } catch (e: any) {
            console.error("Fetch courses failed", e)
        } finally {
            setCoursesLoading(false)
        }
    }

    const handleSelectCourse = async (course: any) => {
        setSelectedCourse(course)
        setSessions([])
        setExpandedSession(null)
        setSessionsLoading(true)

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/attendance/courses/${course.id}/reports`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSessions(data || [])
            } else {
                const errText = await res.text()
                console.error("Fetch course reports failed with code " + res.status + ": " + errText)
            }
        } catch (e: any) {
            console.error("Fetch course reports failed", e)
        } finally {
            setSessionsLoading(false)
        }
    }

    const handleExpandSession = async (sessionId: string) => {
        if (expandedSession === sessionId) {
            setExpandedSession(null)
            return
        }

        setExpandedSession(sessionId)
        setLoadingDetails(true)
        setSessionDetails([])

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/attendance/reports/${sessionId}/details`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSessionDetails(data || [])
            } else {
                const errText = await res.text()
                console.error("Fetch session details failed with code " + res.status + ": " + errText)
            }
        } catch (e: any) {
            console.error("Fetch session details failed", e)
        } finally {
            setLoadingDetails(false)
        }
    }

    useEffect(() => {
        fetchLogs()
        fetchCourses()
    }, [])

    const handleRefresh = () => {
        if (activeSubTab === 'units') {
            fetchCourses()
            if (selectedCourse) {
                handleSelectCourse(selectedCourse)
            }
        } else {
            fetchLogs()
        }
    }

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
                const errText = await res.text()
                alert(`Failed to download attendance logs. Server status: ${res.status}. Details: ${errText}`)
            }
        } catch (e: any) {
            console.error("Download failed", e)
            alert(`Error downloading attendance logs. Details: ${e?.message || e}`)
        } finally {
            setDownloading(false)
        }
    }

    const handleDownload = (e: any, sessionId: string, date: string) => {
        e.stopPropagation()
        const token = localStorage.getItem('token')
        fetch(`/api/attendance/reports/${sessionId}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(async (res) => {
                if (!res.ok) {
                    const errText = await res.text()
                    throw new Error(`Status ${res.status}: ${errText}`)
                }
                return res.blob()
            })
            .then(blob => {
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `Attendance_${selectedCourse?.course_code || 'Session'}_${date}.csv`
                document.body.appendChild(a)
                a.click()
                a.remove()
            })
            .catch(err => {
                console.error("Download failed", err)
                alert(`Failed to download session report. Details: ${err?.message || err}`)
            })
    }

    const downloadQR = () => {
        const canvas = (document.getElementById('course-detail-qr-canvas') || document.getElementById('course-qr-canvas')) as HTMLCanvasElement
        if (canvas && selectedCourse) {
            const pngUrl = canvas
                .toDataURL('image/png')
                .replace('image/png', 'image/octet-stream')
            let downloadLink = document.createElement('a')
            downloadLink.href = pngUrl
            downloadLink.download = `QR_${selectedCourse.course_code}_${selectedCourse.room_code || 'class'}.png`
            document.body.appendChild(downloadLink)
            downloadLink.click()
            document.body.removeChild(downloadLink)
        } else {
            alert("QR Code canvas not found. Make sure the QR code is rendered.")
        }
    }

    const printQR = () => {
        const canvas = (document.getElementById('course-detail-qr-canvas') || document.getElementById('course-qr-canvas')) as HTMLCanvasElement
        if (!canvas || !selectedCourse) {
            alert("QR Code canvas not found. Make sure the QR code is rendered.")
            return
        }
        const qrImage = canvas.toDataURL('image/png')
        const printWindow = window.open('', '_blank')
        if (printWindow) {
            printWindow.document.write(`
                <html>
                <head>
                    <title>Print QR Code - ${selectedCourse.course_code}</title>
                    <style>
                        body {
                            font-family: 'Inter', system-ui, sans-serif;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            height: 100vh;
                            margin: 0;
                            text-align: center;
                            color: #1e293b;
                            background-color: #f8fafc;
                        }
                        .card {
                            border: 3px solid #3b82f6;
                            border-radius: 24px;
                            padding: 40px;
                            max-width: 450px;
                            background: white;
                            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
                        }
                        .header {
                            font-size: 28px;
                            font-weight: 800;
                            color: #1d4ed8;
                            margin: 0 0 5px 0;
                            letter-spacing: -0.025em;
                        }
                        .title {
                            font-size: 18px;
                            font-weight: 500;
                            color: #64748b;
                            margin: 0 0 25px 0;
                        }
                        .qr-container {
                            padding: 20px;
                            border: 2px dashed #cbd5e1;
                            border-radius: 16px;
                            display: inline-block;
                            background: #f8fafc;
                            margin-bottom: 25px;
                        }
                        img {
                            width: 250px;
                            height: 250px;
                        }
                        .room-badge {
                            background: #eff6ff;
                            color: #2563eb;
                            font-weight: 700;
                            padding: 10px 20px;
                            border-radius: 9999px;
                            font-size: 16px;
                            display: inline-block;
                        }
                        .instructions {
                            font-size: 12px;
                            color: #94a3b8;
                            margin-top: 30px;
                        }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1 class="header">${selectedCourse.course_code}</h1>
                        <p class="title">${selectedCourse.course_name}</p>
                        <div class="qr-container">
                            <img src="${qrImage}" alt="QR Code" />
                        </div>
                        <div>
                            <span class="room-badge">📍 Classroom: ${selectedCourse.room_code || 'N/A'}</span>
                        </div>
                        <p class="instructions">Scan to mark attendance for this class session</p>
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

    // Filter logs client-side (Recent Scans Database)
    const filteredLogs = logs.filter(log => {
        const query = searchQuery.toLowerCase()
        return (
            log.student?.name?.toLowerCase().includes(query) ||
            log.student?.admission_number?.toLowerCase().includes(query) ||
            log.course?.code?.toLowerCase().includes(query) ||
            log.course?.name?.toLowerCase().includes(query) ||
            (log.classroom?.code && log.classroom.code.toLowerCase().includes(query))
        )
    })

    // Pagination for logs
    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage)

    // Filter courses client-side (Course Units Directory)
    const filteredCourses = courses.filter(course => {
        const query = courseSearchQuery.toLowerCase()
        return (
            course.course_code.toLowerCase().includes(query) ||
            course.course_name.toLowerCase().includes(query) ||
            (course.department && course.department.toLowerCase().includes(query))
        )
    })

    // Pagination for courses
    const totalCoursesPages = Math.ceil(filteredCourses.length / coursesPerPage)
    const coursesStartIndex = (coursesPage - 1) * coursesPerPage
    const paginatedCourses = filteredCourses.slice(coursesStartIndex, coursesStartIndex + coursesPerPage)

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
                        onClick={handleRefresh}
                        className="p-3 bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl hover:bg-[var(--border-color)] transition-colors flex items-center justify-center gap-2"
                        title="Refresh Logs"
                        disabled={loading || coursesLoading || sessionsLoading}
                    >
                        <RefreshCw size={18} className={(loading || coursesLoading || sessionsLoading) ? 'animate-spin' : ''} />
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

            {/* Sub-Tab system */}
            <div className="flex border-b border-[var(--border-color)] pb-px gap-6">
                <button
                    onClick={() => setActiveSubTab('units')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeSubTab === 'units'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <BookOpen size={16} /> Course Units
                </button>
                <button
                    onClick={() => setActiveSubTab('scans')}
                    className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
                        activeSubTab === 'scans'
                            ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                            : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                >
                    <Calendar size={16} /> Scans Database
                </button>
            </div>

            {/* Quick stats panel (Dynamic based on selected sub-tab) */}
            {activeSubTab === 'units' ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 flex items-center justify-center">
                            <BookOpen size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Total Course Units</div>
                            <div className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{courses.length}</div>
                        </div>
                    </div>

                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Active Selected Unit</div>
                            <div className="text-sm font-bold text-[var(--text-primary)] mt-1.5 truncate max-w-[200px]">
                                {selectedCourse ? `${selectedCourse.course_code}` : 'None Selected'}
                            </div>
                        </div>
                    </div>

                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] p-5 flex items-center gap-4 shadow-sm">
                        <div className="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center">
                            <Clock size={24} />
                        </div>
                        <div>
                            <div className="text-xs text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Conducted Sessions</div>
                            <div className="text-2xl font-black text-[var(--text-primary)] mt-0.5">{selectedCourse ? sessions.length : 0}</div>
                        </div>
                    </div>
                </div>
            ) : (
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
                        <div className="w-12 h-12 rounded-lg bg-green-50 dark:bg-green-950/20 text-green-600 flex items-center justify-center">
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
            )}

            {/* Main Content Area */}
            {activeSubTab === 'units' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Course Units Directory (Left Panel) */}
                    <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col shadow-sm">
                        <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] space-y-3">
                            <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                                <BookOpen size={18} /> Course Units Directory
                            </h2>
                            
                            {/* Search Course Input */}
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                                    <Search size={14} />
                                </span>
                                <input
                                    type="text"
                                    placeholder="Search by code, name, dept..."
                                    value={courseSearchQuery}
                                    onChange={(e) => { setCourseSearchQuery(e.target.value); setCoursesPage(1); }}
                                    className="w-full pl-9 pr-3 py-2 text-xs bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-[var(--text-primary)]"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1 min-h-[300px] max-h-[600px] custom-scrollbar">
                            {coursesLoading ? (
                                <div className="p-8 text-center text-sm text-[var(--text-secondary)] flex flex-col items-center justify-center gap-2">
                                    <RefreshCw className="animate-spin text-blue-600" size={24} />
                                    <span>Loading course units...</span>
                                </div>
                            ) : filteredCourses.length === 0 ? (
                                <div className="p-8 text-center text-sm text-gray-400">
                                    No course units found matching query.
                                </div>
                            ) : (
                                paginatedCourses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => handleSelectCourse(course)}
                                        className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group
                                            ${selectedCourse?.id === course.id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                                : 'border-transparent hover:bg-[var(--bg-secondary)]'}`}
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="font-bold text-sm text-[var(--text-primary)] truncate">{course.course_code}</div>
                                            <div className="text-xs text-[var(--text-secondary)] mt-0.5 truncate">{course.course_name}</div>
                                            {course.department && (
                                                <div className="text-[9px] text-[var(--text-secondary)] mt-1.5 font-mono uppercase bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded w-max">
                                                    {course.department}
                                                </div>
                                            )}
                                        </div>
                                        <ChevronRight size={16} className={`text-gray-400 group-hover:text-blue-500 transition-transform shrink-0 ${selectedCourse?.id === course.id ? 'rotate-90 text-blue-500' : ''}`} />
                                    </button>
                                ))
                            )}
                        </div>

                        {/* Courses List Pagination */}
                        {!coursesLoading && filteredCourses.length > coursesPerPage && (
                            <div className="p-3 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-between">
                                <button
                                    onClick={() => setCoursesPage(p => Math.max(1, p - 1))}
                                    disabled={coursesPage === 1}
                                    className="p-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] disabled:opacity-50 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <span className="text-xs font-semibold text-[var(--text-secondary)]">
                                    Page {coursesPage} of {totalCoursesPages}
                                </span>
                                <button
                                    onClick={() => setCoursesPage(p => Math.min(totalCoursesPages, p + 1))}
                                    disabled={coursesPage === totalCoursesPages}
                                    className="p-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] disabled:opacity-50 text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition-colors"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Course Attendance details (Right Panel) */}
                    <div className="lg:col-span-2 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] flex flex-col overflow-hidden shadow-sm min-h-[450px]">
                        {selectedCourse ? (
                            <div className="flex flex-col h-full">
                                {/* Unit Header */}
                                <div className="p-5 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-black text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400 px-2.5 py-0.5 rounded font-mono uppercase">
                                                {selectedCourse.course_code}
                                            </span>
                                            {selectedCourse.department && (
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded font-bold uppercase">
                                                    {selectedCourse.department}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold text-[var(--text-primary)] mt-1">
                                            {selectedCourse.course_name}
                                        </h2>
                                    </div>
                                    <button
                                        onClick={() => setShowQRModal(true)}
                                        className="py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded-xl font-bold transition-all shadow-md shadow-blue-500/10 flex items-center gap-1.5 self-stretch sm:self-auto justify-center"
                                    >
                                        <QrCode size={14} /> View Attendance QR Code
                                    </button>
                                </div>

                                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 border-b border-[var(--border-color)] bg-slate-50/30 dark:bg-slate-900/5">
                                    {/* QR Code Presentation */}
                                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col items-center justify-center text-center shadow-sm">
                                        <div className="p-3 bg-white border border-gray-200 rounded-xl mb-3">
                                            <QRCodeCanvas
                                                id="course-detail-qr-canvas"
                                                value={(() => {
                                                    const serverIpOrDomain = localStorage.getItem('server_ip_or_domain');
                                                    let base = window.location.origin;
                                                    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1') {
                                                        if (serverIpOrDomain) {
                                                            base = serverIpOrDomain.startsWith('http://') || serverIpOrDomain.startsWith('https://')
                                                                ? serverIpOrDomain
                                                                : `${window.location.protocol}//${serverIpOrDomain}`;
                                                        }
                                                    }
                                                    return selectedCourse.room_code ? `${base}/?room=${selectedCourse.room_code}` : `${base}/?course=${selectedCourse.course_code}`;
                                                })()}
                                                size={120}
                                                level="H"
                                                includeMargin={true}
                                                className="rounded-lg"
                                            />
                                        </div>
                                        <div className="flex gap-2 w-full max-w-[200px]">
                                            <button 
                                                onClick={downloadQR}
                                                className="flex-1 py-1.5 bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-lg text-xs font-bold transition-colors"
                                            >
                                                Download
                                            </button>
                                            <button 
                                                onClick={printQR}
                                                className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-sm"
                                            >
                                                Print
                                            </button>
                                        </div>
                                    </div>

                                    {/* Quick Unit stats */}
                                    <div className="space-y-3 flex flex-col justify-center">
                                        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 flex items-center justify-center shrink-0">
                                                <Calendar size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Total Sessions Conducted</div>
                                                <div className="text-lg font-bold text-[var(--text-primary)] mt-0.5">{sessions.length} sessions</div>
                                            </div>
                                        </div>

                                        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl p-4 flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 flex items-center justify-center shrink-0">
                                                <Users size={20} />
                                            </div>
                                            <div>
                                                <div className="text-[10px] text-[var(--text-secondary)] uppercase tracking-wider font-semibold">Unit Details</div>
                                                <div className="text-sm font-bold text-[var(--text-primary)] mt-0.5">
                                                    Credits: {selectedCourse.credits || 3} • Semester: {selectedCourse.semester || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Sessions List */}
                                <div className="flex-1 p-5 overflow-y-auto space-y-4 max-h-[350px] custom-scrollbar">
                                    <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-2 mb-2">
                                        <Clock size={14} /> Scans & Active Session Records
                                    </h3>

                                    {sessionsLoading ? (
                                        <div className="py-8 text-center text-sm text-[var(--text-secondary)] flex flex-col items-center justify-center gap-2">
                                            <RefreshCw className="animate-spin text-blue-600" size={20} />
                                            <span>Loading sessions...</span>
                                        </div>
                                    ) : sessions.length === 0 ? (
                                        <div className="py-12 border-2 border-dashed border-[var(--border-color)] rounded-2xl flex flex-col items-center justify-center text-gray-400">
                                            <Calendar size={36} className="mb-2 opacity-40" />
                                            <p className="text-sm">No sessions or scans recorded for this course.</p>
                                        </div>
                                    ) : (
                                        sessions.map((session) => {
                                            const isExpanded = expandedSession === session.session_id
                                            const totalScans = session.attendance_count || 0
                                            const hasScans = totalScans > 0

                                            return (
                                                <div 
                                                    key={session.session_id} 
                                                    className={`border rounded-xl overflow-hidden transition-all duration-200 bg-[var(--bg-secondary)]/10 hover:bg-[var(--bg-secondary)]/20 ${
                                                        isExpanded ? 'border-blue-200 dark:border-blue-900/50 bg-[var(--bg-secondary)]/30 shadow-sm' : 'border-[var(--border-color)]'
                                                    }`}
                                                >
                                                    <div 
                                                        onClick={() => handleExpandSession(session.session_id)}
                                                        className="p-4 flex items-center justify-between cursor-pointer"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                                                hasScans 
                                                                    ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' 
                                                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800'
                                                            }`}>
                                                                <Calendar size={16} />
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-bold text-[var(--text-primary)]">
                                                                    {session.date}
                                                                </div>
                                                                <div className="text-xs text-[var(--text-secondary)] mt-0.5 flex items-center gap-2">
                                                                    <span>{session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}</span>
                                                                    <span className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-700"></span>
                                                                    <span>Room: {session.room_code || 'N/A'}</span>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                                                                hasScans 
                                                                    ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
                                                                    : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                                                            }`}>
                                                                {totalScans} Scans
                                                            </span>
                                                            <button
                                                                onClick={(e) => handleDownload(e, session.session_id, session.date)}
                                                                className="p-1.5 hover:bg-gray-150 dark:hover:bg-gray-800 rounded-lg text-gray-500 hover:text-blue-600 transition-colors"
                                                                title="Download session report"
                                                            >
                                                                <Download size={14} />
                                                            </button>
                                                            <ChevronDown 
                                                                size={16} 
                                                                className={`text-gray-400 transition-transform duration-200 ${
                                                                    isExpanded ? 'rotate-180 text-blue-500' : ''
                                                                }`} 
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Expanded Student Scan List */}
                                                    <AnimatePresence>
                                                        {isExpanded && (
                                                            <motion.div
                                                                initial={{ height: 0, opacity: 0 }}
                                                                animate={{ height: 'auto', opacity: 1 }}
                                                                exit={{ height: 0, opacity: 0 }}
                                                                className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/20"
                                                            >
                                                                <div className="p-4 space-y-2">
                                                                    <div className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                                                                        Daily Scanned List
                                                                    </div>
                                                                    
                                                                    {loadingDetails ? (
                                                                        <div className="flex justify-center py-4 text-xs text-[var(--text-secondary)] gap-2 items-center">
                                                                            <RefreshCw className="animate-spin text-blue-600" size={14} />
                                                                            <span>Loading details...</span>
                                                                        </div>
                                                                    ) : sessionDetails.length === 0 ? (
                                                                        <div className="py-2 text-xs text-gray-400 italic">
                                                                            No student scan records found for this session date.
                                                                        </div>
                                                                    ) : (
                                                                        <div className="divide-y divide-[var(--border-color)] border border-[var(--border-color)] rounded-lg overflow-hidden bg-[var(--card-bg)] shadow-sm">
                                                                            {sessionDetails.map((student, idx) => (
                                                                                <div key={idx} className="flex justify-between items-center p-3 text-xs hover:bg-[var(--bg-secondary)]/10">
                                                                                    <div>
                                                                                        <div className="font-bold text-[var(--text-primary)]">{student.student_name}</div>
                                                                                        <div className="text-[10px] text-[var(--text-secondary)] font-mono mt-0.5">{student.admission_number}</div>
                                                                                    </div>
                                                                                    <div className="flex items-center gap-3">
                                                                                        <span className="font-mono text-gray-500">{student.scan_time}</span>
                                                                                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                                                            student.status === 'present' 
                                                                                                ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                                                                                                : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                                                                                        }`}>
                                                                                            {student.status === 'present' ? <CheckCircle size={8} /> : <XCircle size={8} />}
                                                                                            <span className="capitalize">{student.status}</span>
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )
                                        })
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center flex-1 p-8 text-gray-400">
                                <BookOpen size={48} className="mb-3 opacity-20 animate-pulse" />
                                <p className="text-sm font-medium">Select a unit from the directory directory to view details.</p>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Original Recent Scans Database View */
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden shadow-sm flex flex-col">
                    <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <h2 className="font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Calendar size={18} /> Scans Database Logs
                        </h2>

                        {/* Search Field */}
                        <div className="relative w-full md:max-w-sm">
                            <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
                                <Search size={16} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search course, student, admission..."
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
                                                <div className="font-bold text-[var(--text-primary)]">{log.student?.name || 'N/A'}</div>
                                                <div className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">{log.student?.admission_number || 'N/A'}</div>
                                            </td>
                                            <td className="p-4">
                                                <div className="font-bold text-blue-600 dark:text-blue-400">{log.course?.code || 'N/A'}</div>
                                                <div className="text-xs text-[var(--text-secondary)] line-clamp-1 max-w-[200px]">{log.course?.name || 'N/A'}</div>
                                            </td>
                                            <td className="p-4">
                                                <span className="inline-flex items-center gap-1 font-semibold text-xs bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded border border-slate-200 dark:border-slate-700">
                                                    <MapPin size={10} /> {log.classroom?.code || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="p-4 whitespace-nowrap text-[var(--text-secondary)]">
                                                {log.session?.date || 'N/A'}
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
            )}

            {/* QR Code Modal for Unit (Detailed popup) */}
            <AnimatePresence>
                {showQRModal && selectedCourse && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowQRModal(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        
                        {/* Modal Box */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center text-center overflow-hidden"
                        >
                            {/* Visual Top Highlight Accent */}
                            <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 to-indigo-600" />
                            
                            {/* Close Button */}
                            <button
                                onClick={() => setShowQRModal(false)}
                                className="absolute top-4 right-4 text-[var(--text-secondary)] hover:text-[var(--text-primary)] p-1.5 rounded-full hover:bg-[var(--bg-secondary)] transition-colors"
                            >
                                <X size={18} />
                            </button>

                            <div className="mt-4 mb-6">
                                <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Class QR Attendance Badge
                                </span>
                                <h3 className="text-2xl font-black text-[var(--text-primary)] mt-3 leading-tight">
                                    {selectedCourse.course_code}
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)] font-medium max-w-[280px] mx-auto mt-1">
                                    {selectedCourse.course_name}
                                </p>
                            </div>

                            {/* QR Canvas Wrap */}
                            <div className="p-4 bg-slate-50 dark:bg-slate-950 border border-[var(--border-color)] rounded-2xl mb-6 shadow-inner relative">
                                <QRCodeCanvas
                                    id="course-qr-canvas"
                                    value={(() => {
                                        const serverIpOrDomain = localStorage.getItem('server_ip_or_domain');
                                        let base = window.location.origin;
                                        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '::1') {
                                            if (serverIpOrDomain) {
                                                base = serverIpOrDomain.startsWith('http://') || serverIpOrDomain.startsWith('https://')
                                                    ? serverIpOrDomain
                                                    : `${window.location.protocol}//${serverIpOrDomain}`;
                                            }
                                        }
                                        return selectedCourse.room_code ? `${base}/?room=${selectedCourse.room_code}` : `${base}/?course=${selectedCourse.course_code}`;
                                    })()}
                                    size={200}
                                    level="H"
                                    includeMargin={true}
                                    className="mx-auto rounded-lg"
                                />
                            </div>

                            {/* Meta details */}
                            <div className="flex items-center gap-2 mb-8 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 px-4 py-2 rounded-xl text-blue-600 dark:text-blue-400 font-bold text-sm">
                                <MapPin size={16} /> Classroom Code: {selectedCourse.room_code || 'General / Dynamic'}
                            </div>

                            {/* Buttons */}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={downloadQR}
                                    className="py-3 bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors text-sm"
                                >
                                    <Download size={16} /> Download
                                </button>
                                <button
                                    onClick={printQR}
                                    className="py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-blue-500/10 text-sm"
                                >
                                    <Printer size={16} /> Print Card
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
