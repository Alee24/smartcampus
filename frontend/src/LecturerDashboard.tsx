import { useState, useEffect } from 'react'
import {
    Calendar, Clock, MapPin, User, Book, CheckCircle,
    TrendingUp, Users, Bell, ChevronRight, BookOpen, AlertCircle
} from 'lucide-react'

interface LecturerStats {
    total_courses: number
    today_classes: number
    unique_students: number
    attendance_rate: number
}

interface CourseRoster {
    id: string
    course_code: string
    course_name: string
    classroom_code: string
    classroom_name: string
    total_students: number
}

interface AttendanceFeed {
    id: string
    student_name: string
    admission_number: string
    course_code: string
    scan_time: string
    status: string
}

interface TimetableSlot {
    day_of_week: number
    course_code: string
    course_name: string
    room_code: string
    start_time: string
    end_time: string
}

interface UpcomingEvent {
    name: string
    host: string
    event_date: string
    description: string
    event_type: string
}

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function LecturerDashboard() {
    const [stats, setStats] = useState<LecturerStats>({
        total_courses: 0,
        today_classes: 0,
        unique_students: 0,
        attendance_rate: 94.2
    })
    const [courses, setCourses] = useState<CourseRoster[]>([])
    const [attendanceFeed, setAttendanceFeed] = useState<AttendanceFeed[]>([])
    const [timetable, setTimetable] = useState<TimetableSlot[]>([])
    const [events, setEvents] = useState<UpcomingEvent[]>([])
    const [loading, setLoading] = useState(true)
    const [currentTime, setCurrentTime] = useState(new Date())

    const fetchLecturerData = async () => {
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch Stats
            const statsRes = await fetch('/api/lecturers/stats', { headers })
            if (statsRes.ok) {
                setStats(await statsRes.json())
            }

            // Fetch Courses
            const coursesRes = await fetch('/api/lecturers/my-classes', { headers })
            if (coursesRes.ok) {
                setCourses(await coursesRes.json())
            }

            // Fetch Attendance Feed
            const attRes = await fetch('/api/lecturers/attendance-list', { headers })
            if (attRes.ok) {
                setAttendanceFeed(await attRes.json())
            }

            // Fetch Timetable
            const timetableRes = await fetch('/api/lecturers/timetable', { headers })
            if (timetableRes.ok) {
                setTimetable(await timetableRes.json())
            }

            // Fetch Events
            const eventsRes = await fetch('/api/lecturers/upcoming-events', { headers })
            if (eventsRes.ok) {
                setEvents(await eventsRes.json())
            }

            setLoading(false)
        } catch (err) {
            console.error('Lecturer Dashboard error:', err)
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLecturerData()

        const timer = setInterval(() => {
            setCurrentTime(new Date())
        }, 60000)

        // Poll data every 60 seconds for live attendance monitoring
        const poll = setInterval(fetchLecturerData, 60000)

        return () => {
            clearInterval(timer)
            clearInterval(poll)
        }
    }, [])

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
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
                            Academic Portal
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 mt-2">
                            {currentTime.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        </p>
                    </div>
                    <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 px-6 py-3 rounded-2xl shadow-sm text-right flex items-center gap-3">
                        <Clock size={20} className="text-blue-600 dark:text-blue-400" />
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                            <p className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Current Time</p>
                        </div>
                    </div>
                </div>
            </header>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="glass-card p-6 border-l-4 border-blue-500 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Courses Taught</p>
                            <p className="text-3xl font-black text-gray-900 dark:text-white mt-2">{stats.total_courses}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <BookOpen className="text-blue-600 dark:text-blue-400" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-emerald-500 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Lectures Today</p>
                            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-2">{stats.today_classes}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                            <Calendar className="text-emerald-600 dark:text-emerald-400" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-indigo-500 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Unique Students</p>
                            <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400 mt-2">{stats.unique_students}</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
                            <Users className="text-indigo-600 dark:text-indigo-400" size={24} />
                        </div>
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-purple-500 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Avg Attendance</p>
                            <p className="text-3xl font-black text-purple-600 dark:text-purple-400 mt-2">{stats.attendance_rate}%</p>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                            <TrendingUp className="text-purple-600 dark:text-purple-400" size={24} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Course List & Attendance Feed */}
                <div className="lg:col-span-2 space-y-8">
                    
                    {/* Courses / Classes Assigned */}
                    <div className="glass-card p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <Book className="text-blue-600" size={22} />
                                    Active Course Registry
                                </h2>
                                <p className="text-xs text-gray-400">Total assigned courses for academic syllabus tracking</p>
                            </div>
                            <span className="px-3 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-xs font-black">
                                {courses.length} Courses
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {courses.map((course, index) => (
                                <div key={index} className="p-5 bg-gray-50/55 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 hover:scale-[1.01] transition-all">
                                    <div className="flex justify-between items-start gap-2 mb-3">
                                        <div>
                                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-[9px] font-black tracking-wider uppercase">
                                                {course.course_code}
                                            </span>
                                            <h3 className="text-sm font-black text-gray-950 dark:text-white mt-1 leading-snug">
                                                {course.course_name}
                                            </h3>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-4 pt-2 border-t border-gray-100/60 dark:border-gray-800/60">
                                        <div className="flex items-center gap-1.5">
                                            <MapPin size={13} className="text-gray-400" />
                                            <span>Room: {course.classroom_code}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Users size={13} className="text-gray-400" />
                                            <span className="font-bold">{course.total_students} Enrolled</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Live Student Attendance Feeds */}
                    <div className="glass-card p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                                    <CheckCircle className="text-emerald-600 animate-pulse" size={22} />
                                    Live Attendance Monitor
                                </h2>
                                <p className="text-xs text-gray-400 text-left">Real-time QR scanning verification registry</p>
                            </div>
                        </div>

                        {attendanceFeed.length > 0 ? (
                            <div className="space-y-3 overflow-y-auto max-h-[380px] pr-2 no-scrollbar">
                                {attendanceFeed.map((feed) => (
                                    <div key={feed.id} className="p-3.5 bg-gray-50/50 dark:bg-gray-800/30 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                                                {feed.student_name.charAt(0)}
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-gray-900 dark:text-white">{feed.student_name}</h4>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-[10px] font-bold text-gray-400">{feed.admission_number}</span>
                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 text-[8px] font-bold rounded">
                                                        {feed.course_code}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                                feed.status === 'present' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                                            }`}>
                                                {feed.status}
                                            </span>
                                            <p className="text-[9px] text-gray-400 mt-1 font-bold">{feed.scan_time}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-10 text-gray-400">
                                <AlertCircle className="mx-auto mb-2" size={32} />
                                <p className="text-sm">No scans logged for today's classes yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Schedule & Event Alerts */}
                <div className="space-y-8">
                    
                    {/* Weekly Schedule / Timetable */}
                    <div className="glass-card p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Calendar size={20} className="text-indigo-600" />
                                Assigned Schedule
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {timetable.map((slot, index) => (
                                <div key={index} className="flex gap-4 border-l-2 border-indigo-500 pl-4 py-1">
                                    <div className="min-w-[65px]">
                                        <p className="text-xs font-black text-indigo-600 uppercase tracking-wider">{DAYS_OF_WEEK[slot.day_of_week] || "N/A"}</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-0.5">{slot.start_time} - {slot.end_time}</p>
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight">{slot.course_code} - {slot.course_name}</h4>
                                        <p className="text-[10px] text-gray-500 mt-1">Location: {slot.room_code}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Upcoming Events Alerts */}
                    <div className="glass-card p-6 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                                <Bell size={20} className="text-red-500" />
                                Notice Board & Events
                            </h2>
                        </div>

                        <div className="space-y-4">
                            {events.map((evt, index) => (
                                <div key={index} className="p-4 bg-gray-50/50 dark:bg-gray-800/25 border border-gray-100/50 dark:border-gray-800/50 rounded-2xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                            evt.event_type === 'academic' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                            {evt.event_type}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-400">{evt.event_date}</span>
                                    </div>
                                    <h4 className="text-xs font-black text-gray-900 dark:text-white leading-tight">{evt.name}</h4>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5 line-clamp-2 leading-relaxed">{evt.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

            </div>
        </div>
    )
}
