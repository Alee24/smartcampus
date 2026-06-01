import { useState, useEffect } from 'react'
import {
    Calendar, Clock, MapPin, User, Book, CheckCircle,
    XCircle, TrendingUp, Award, Bell, ChevronRight, Bookmark, Info, CalendarDays, Megaphone
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

interface EventItem {
    id: string
    event_name: string
    event_date: string
    location: string
    coordinator_name?: string
    description?: string
}

export default function StudentDashboard() {
    const [subTab, setSubTab] = useState<'schedule' | 'events'>('schedule')
    const [todayClasses, setTodayClasses] = useState<TodayClass[]>([])
    const [recentAttendance, setRecentAttendance] = useState<AttendanceRecord[]>([])
    const [stats, setStats] = useState<StudentStats>({
        total_classes: 0,
        attended: 0,
        missed: 0,
        attendance_rate: 0
    })
    const [weeklyTimetable, setWeeklyTimetable] = useState<Record<string, any[]>>({})
    const [eventsList, setEventsList] = useState<EventItem[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

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

            // Fetch weekly timetable (fully secure and filtered for this student)
            const weeklyRes = await fetch('/api/timetable/timetable/weekly', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (weeklyRes.ok) {
                setWeeklyTimetable(await weeklyRes.json())
            }

            // Fetch university events (read-only)
            const eventsRes = await fetch('/api/events/', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (eventsRes.ok) {
                setEventsList(await eventsRes.json())
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

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        )
    }

    return (
        <div className="animate-fade-in pb-8">
            {/* Premium Header */}
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 dark:from-indigo-400 dark:to-purple-400 leading-tight">
                            My Student Portal
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2 font-medium">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-slate-800 px-6 py-3 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-4 shrink-0">
                        <Clock className="text-indigo-600" size={24} />
                        <div>
                            <p className="text-2xl font-black text-[var(--text-primary)] leading-none">
                                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-1">Live Campus Time</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* Health-oriented Theme Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6 border-l-4 border-indigo-500 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Scheduled Classes</p>
                            <p className="text-3xl font-black text-[var(--text-primary)] mt-2">{stats.total_classes}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                            <Book size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-emerald-500 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Classes Attended</p>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.attended}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-inner">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-rose-500 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Classes Missed</p>
                            <p className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-2">{stats.missed}</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center text-rose-600 dark:text-rose-400 shadow-inner">
                            <XCircle size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-violet-500 hover:scale-[1.02] transition-transform">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Attendance Rate</p>
                            <p className="text-3xl font-black text-violet-600 dark:text-violet-400 mt-2">{stats.attendance_rate}%</p>
                        </div>
                        <div className="w-12 h-12 rounded-xl bg-violet-50 dark:bg-violet-950/40 flex items-center justify-center text-violet-600 dark:text-violet-400 shadow-inner">
                            <TrendingUp size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Dashboard Subtabs Switcher */}
            <div className="flex gap-4 mb-6 border-b border-[var(--border-color)]">
                <button
                    onClick={() => setSubTab('schedule')}
                    className={`px-6 py-3.5 font-extrabold text-sm transition-all flex items-center gap-2 ${subTab === 'schedule'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <CalendarDays size={18} />
                    My Timetable Slot
                </button>
                <button
                    onClick={() => setSubTab('events')}
                    className={`px-6 py-3.5 font-extrabold text-sm transition-all flex items-center gap-2 ${subTab === 'events'
                        ? 'text-indigo-600 border-b-2 border-indigo-600 dark:text-indigo-400 dark:border-indigo-400'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <Megaphone size={18} />
                    Upcoming University Events
                </button>
            </div>

            {subTab === 'schedule' ? (
                /* SECTION A: WEEKLY TIMETABLE FOR REGISTERED UNITS */
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Info className="text-indigo-600" size={20} />
                            <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                                Timetable slots filtered exclusively for your registered academic courses.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                            {DAYS.map((day) => {
                                const slots = weeklyTimetable[day] || [];
                                const isToday = day === currentTime.toLocaleDateString('en-US', { weekday: 'long' });

                                return (
                                    <div
                                        key={day}
                                        className={`glass-card p-4 border transition-all ${
                                            isToday 
                                                ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/10 shadow-md' 
                                                : 'border-[var(--border-color)]'
                                        }`}
                                    >
                                        <h3 className={`font-black text-sm text-center pb-2 border-b border-[var(--border-color)] mb-4 ${
                                            isToday ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-[var(--text-primary)]'
                                        }`}>
                                            {day} {isToday && '• TODAY'}
                                        </h3>
                                        <div className="space-y-2">
                                            {slots.length > 0 ? (
                                                slots.map((slot, index) => {
                                                    const isNow = isToday && isClassNow(slot.start_time, slot.end_time);
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`p-2.5 rounded-lg border text-xs transition-all ${
                                                                isNow
                                                                    ? 'bg-green-500/10 border-green-500 shadow-md animate-pulse'
                                                                    : 'bg-[var(--bg-primary)] border-[var(--border-color)]'
                                                            }`}
                                                        >
                                                            <div className="font-extrabold text-[var(--text-primary)] flex items-center justify-between mb-1">
                                                                <span>{slot.course_code}</span>
                                                                {isNow && (
                                                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                                                                )}
                                                            </div>
                                                            <div className="text-[10px] text-[var(--text-secondary)] font-semibold truncate mb-1">
                                                                {slot.course_name}
                                                            </div>
                                                            <div className="flex flex-col gap-0.5 text-[10px] text-[var(--text-secondary)] opacity-80">
                                                                <span className="flex items-center gap-1">
                                                                    <Clock size={10} /> {slot.start_time} - {slot.end_time}
                                                                </span>
                                                                <span className="flex items-center gap-1">
                                                                    <MapPin size={10} /> {slot.room_code}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    )
                                                })
                                            ) : (
                                                <div className="text-center py-6 text-[10px] text-[var(--text-secondary)] opacity-50">
                                                    No classes
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                /* SECTION B: UPCOMING UNIVERSITY EVENTS */
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-[var(--text-primary)]">Upcoming Events Bulletin</h2>
                            <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold">
                                {eventsList.length} Announcements
                            </span>
                        </div>

                        {eventsList.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {eventsList.map((evt) => (
                                    <div
                                        key={evt.id}
                                        className="p-5 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:shadow-lg transition-all relative overflow-hidden flex flex-col justify-between min-h-[180px]"
                                    >
                                        <div>
                                            <div className="flex items-start justify-between mb-3">
                                                <h3 className="font-extrabold text-base text-[var(--text-primary)] tracking-tight leading-tight">
                                                    {evt.event_name}
                                                </h3>
                                                <Bookmark className="text-indigo-600 shrink-0 ml-2" size={16} />
                                            </div>
                                            <p className="text-xs text-[var(--text-secondary)] line-clamp-3 mb-4">
                                                {evt.description || 'No description provided.'}
                                            </p>
                                        </div>

                                        <div className="space-y-2 border-t border-[var(--border-color)] pt-3 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-wider">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} className="text-indigo-600" />
                                                <span>{new Date(evt.event_date).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <MapPin size={12} className="text-indigo-600" />
                                                <span>{evt.location || 'Campus Grounds'}</span>
                                            </div>
                                            {evt.coordinator_name && (
                                                <div className="flex items-center gap-1.5">
                                                    <User size={12} className="text-indigo-600" />
                                                    <span>Coord: {evt.coordinator_name}</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <Megaphone className="mx-auto mb-4 text-gray-400 opacity-40" size={64} />
                                <h3 className="text-lg font-bold mb-2">No Active Events</h3>
                                <p className="text-sm text-[var(--text-secondary)]">Check back later for university events.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
