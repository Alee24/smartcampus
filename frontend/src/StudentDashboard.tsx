import { useState, useEffect } from 'react'
import {
    Calendar, Clock, MapPin, User, Book, CheckCircle,
    XCircle, TrendingUp, Award, Bell, ChevronRight
} from 'lucide-react'

interface AttendanceRecord {
    id: string
    course_code: string
    course_name: string
    room_code: string
    timestamp: string
    status: 'present' | 'late' | 'absent'
}

interface TodayClass {
    course_code: string
    course_name: string
    start_time: string
    end_time: string
    room_code: string
    room_name: string
    lecturer_name: string
    has_attended: boolean
}

interface StudentStats {
    total_classes: number
    attended: number
    missed: number
    attendance_rate: number
}

export default function StudentDashboard() {
    const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
    const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
    const [stats, setStats] = useState<StudentStats>({
        total_classes: 0,
        attended: 0,
        missed: 0,
        attendance_rate: 0
    })
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    useEffect(() => {
        fetchDashboardData()

        // Update time every minute
        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000)

        // Refresh data every 2 minutes
        const dataRefresh = setInterval(fetchDashboardData, 120000)

        return () => {
            clearInterval(timer)
            clearInterval(dataRefresh)
        }
    }, [])

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token')

            // Fetch today's classes
            const classesRes = await fetch('/api/students/my-classes/today', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (classesRes.ok) {
                setTodayClasses(await classesRes.json())
            }

            // Fetch recent attendance
            const attendanceRes = await fetch('/api/students/my-attendance/recent', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (attendanceRes.ok) {
                setRecentAttendance(await attendanceRes.json())
            }

            // Fetch stats
            const statsRes = await fetch('/api/students/my-stats', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (statsRes.ok) {
                setStats(await statsRes.json())
            }

            setLoading(false)
        } catch (err) {
            console.error(err)
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'present': return 'text-green-600 bg-green-100 dark:bg-green-900/30'
            case 'late': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30'
            case 'absent': return 'text-red-600 bg-red-100 dark:bg-red-900/30'
            default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30'
        }
    }

    const isClassNow = (startTime: string, endTime: string) => {
        const now = currentTime.getHours() * 60 + currentTime.getMinutes()
        const [startH, startM] = startTime.split(':').map(Number)
        const [endH, endM] = endTime.split(':').map(Number)
        const start = startH * 60 + startM
        const end = endH * 60 + endM
        return now >= start && now <= end
    }

    const isUpcoming = (startTime: string) => {
        const now = currentTime.getHours() * 60 + currentTime.getMinutes()
        const [startH, startM] = startTime.split(':').map(Number)
        const start = startH * 60 + startM
        return start > now && start - now <= 60 // Within next hour
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in pb-8">
            {/* Header */}
            <header className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-[image:var(--gradient-primary)]">
                            My Dashboard
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-3xl font-bold text-[var(--text-primary)]">
                                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">Current Time</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-secondary)]">Total Classes</p>
                            <p className="text-3xl font-bold text-[var(--text-primary)] mt-2">{stats.total_classes}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <Book className="text-blue-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-green-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-secondary)]">Attended</p>
                            <p className="text-3xl font-bold text-green-600 mt-2">{stats.attended}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                            <CheckCircle className="text-green-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-secondary)]">Missed</p>
                            <p className="text-3xl font-bold text-red-600 mt-2">{stats.missed}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                            <XCircle className="text-red-600" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-[var(--text-secondary)]">Attendance Rate</p>
                            <p className="text-3xl font-bold text-purple-600 mt-2">{stats.attendance_rate}%</p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <TrendingUp className="text-purple-600" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Today's Schedule */}
                <div className="lg:col-span-2">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Calendar className="text-primary-600" size={28} />
                                Today's Schedule
                            </h2>
                            <span className="px-3 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full text-sm font-bold">
                                {todayClasses.length} Classes
                            </span>
                        </div>

                        {todayClasses.length > 0 ? (
                            <div className="space-y-4">
                                {todayClasses.map((cls, index) => {
                                    const isNow = isClassNow(cls.start_time, cls.end_time)
                                    const upcoming = isUpcoming(cls.start_time)

                                    return (
                                        <div
                                            key={index}
                                            className={`p-4 rounded-xl border-2 transition-all ${isNow
                                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20 shadow-lg shadow-green-500/20'
                                                    : upcoming
                                                        ? 'border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20'
                                                        : cls.has_attended
                                                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                            : 'border-[var(--border-color)] bg-[var(--bg-primary)]'
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                                            {cls.course_code}
                                                        </h3>
                                                        {isNow && (
                                                            <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-bold rounded-full animate-pulse">
                                                                HAPPENING NOW
                                                            </span>
                                                        )}
                                                        {upcoming && !isNow && (
                                                            <span className="px-2 py-0.5 bg-yellow-600 text-white text-xs font-bold rounded-full">
                                                                UPCOMING
                                                            </span>
                                                        )}
                                                        {cls.has_attended && !isNow && (
                                                            <CheckCircle className="text-green-600" size={20} />
                                                        )}
                                                    </div>
                                                    <p className="text-sm font-medium text-[var(--text-primary)] mb-3">
                                                        {cls.course_name}
                                                    </p>
                                                    <div className="grid grid-cols-2 gap-3 text-sm text-[var(--text-secondary)]">
                                                        <div className="flex items-center gap-2">
                                                            <Clock size={16} />
                                                            <span>{cls.start_time} - {cls.end_time}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                            <MapPin size={16} />
                                                            <span>{cls.room_code} - {cls.room_name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-2 col-span-2">
                                                            <User size={16} />
                                                            <span>{cls.lecturer_name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <ChevronRight className="text-[var(--text-secondary)]" size={20} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <Calendar className="mx-auto mb-4 text-gray-400" size={64} />
                                <h3 className="text-xl font-bold mb-2">No Classes Today</h3>
                                <p className="text-[var(--text-secondary)]">Enjoy your free day!</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent Attendance */}
                <div>
                    <div className="glass-card p-6">
                        <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-6 flex items-center gap-2">
                            <Award className="text-primary-600" size={28} />
                            Recent Attendance
                        </h2>

                        {recentAttendance.length > 0 ? (
                            <div className="space-y-3">
                                {recentAttendance.slice(0, 10).map((record) => (
                                    <div
                                        key={record.id}
                                        className="p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] hover:shadow-md transition-all"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="flex-1">
                                                <p className="font-bold text-sm text-[var(--text-primary)]">
                                                    {record.course_code}
                                                </p>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1">
                                                    {record.course_name}
                                                </p>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(record.status)}`}>
                                                {record.status.toUpperCase()}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)]">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={12} />
                                                <span>{record.room_code}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock size={12} />
                                                <span>{new Date(record.timestamp).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Bell className="mx-auto mb-3 text-gray-400" size={48} />
                                <p className="text-sm text-[var(--text-secondary)]">No attendance records yet</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
