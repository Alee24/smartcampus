import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Calendar, Clock, MapPin, Users, Book, CheckCircle } from 'lucide-react'

export default function Timetable() {
    const [activeTab, setActiveTab] = useState('timetable')
    const [classrooms, setClassrooms] = useState<any[]>([])
    const [courses, setCourses] = useState<any[]>([])
    const [timetable, setTimetable] = useState<any>({})
    const [lecturers, setLecturers] = useState<any[]>([])
    const [amenityOptions, setAmenityOptions] = useState<any[]>([])

    const [showClassroomModal, setShowClassroomModal] = useState(false)
    const [showCourseModal, setShowCourseModal] = useState(false)
    const [showSlotModal, setShowSlotModal] = useState(false)
    const [activeSessions, setActiveSessions] = useState<any[]>([])

    const [selectedClassroom, setSelectedClassroom] = useState<any>(null)
    const [selectedCourse, setSelectedCourse] = useState<any>(null)
    const [selectedDay, setSelectedDay] = useState<string | null>(null)

    const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
    const ROOM_TYPES = ['lecture_hall', 'lab', 'seminar_room', 'auditorium']

    useEffect(() => {
        fetchClassrooms()
        fetchCourses()
        fetchTimetable()
        fetchLecturers()
        fetchLecturers()
        fetchAmenityOptions()
        fetchActiveSessions()
        const interval = setInterval(fetchActiveSessions, 30000)
        return () => clearInterval(interval)
    }, [])

    const fetchActiveSessions = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/attendance/live-monitor', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setActiveSessions(await res.json())
        } catch (err) {
            console.error(err)
        }
    }

    const fetchClassrooms = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/classrooms', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setClassrooms(await res.json())
        } catch (err) {
            console.error(err)
        }
    }

    const fetchCourses = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/courses', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setCourses(await res.json())
        } catch (err) {
            console.error(err)
        }
    }

    const fetchTimetable = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/timetable/weekly', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setTimetable(await res.json())
        } catch (err) {
            console.error(err)
        }
    }

    const fetchLecturers = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const users = await res.json()
                // Filter lecturers (you might want to filter by role)
                setLecturers(users)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const fetchAmenityOptions = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/amenities/options', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setAmenityOptions(data.amenities)
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreateClassroom = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)

        const amenities: any = {}
        amenityOptions.forEach(opt => {
            amenities[opt.id] = formData.get(`amenity_${opt.id}`) === 'on'
        })

        const data = {
            room_code: formData.get('room_code'),
            room_name: formData.get('room_name'),
            building: formData.get('building'),
            floor: parseInt(formData.get('floor') as string) || 0,
            capacity: parseInt(formData.get('capacity') as string) || 0,
            room_type: formData.get('room_type'),
            amenities
        }

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/classrooms', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                setShowClassroomModal(false)
                fetchClassrooms()
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)

        const data = {
            course_code: formData.get('course_code'),
            course_name: formData.get('course_name'),
            department: formData.get('department'),
            credits: parseInt(formData.get('credits') as string) || 3,
            semester: formData.get('semester'),
            classroom_id: formData.get('classroom_id') || null,
            lecturer_id: formData.get('lecturer_id') || null
        }

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/courses', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                setShowCourseModal(false)
                fetchCourses()
            }
        } catch (err) {
            console.error(err)
        }
    }

    const handleCreateSlot = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)

        const data = {
            course_id: formData.get('course_id'),
            classroom_id: formData.get('classroom_id'),
            lecturer_id: formData.get('lecturer_id'),
            day_of_week: parseInt(formData.get('day_of_week') as string),
            start_time: formData.get('start_time') + ':00',
            end_time: formData.get('end_time') + ':00',
            effective_from: formData.get('effective_from') || null,
            effective_until: formData.get('effective_until') || null
        }

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/timetable', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                setShowSlotModal(false)
                fetchTimetable()
            } else {
                const error = await res.json()
                alert(error.detail || 'Failed to create timetable slot')
            }
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="animate-fade-in">
            <header className="mb-8">
                <h2 className="text-3xl font-bold text-[var(--text-primary)]">Timetable Management</h2>
                <p className="text-[var(--text-secondary)]">Manage classrooms, courses, and weekly schedules</p>
            </header>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 border-b border-[var(--border-color)]">
                <button
                    onClick={() => setActiveTab('timetable')}
                    className={`px-6 py-3 font-bold transition-all ${activeTab === 'timetable'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <Calendar className="inline mr-2" size={18} />
                    Weekly Timetable
                </button>
                <button
                    onClick={() => setActiveTab('courses')}
                    className={`px-6 py-3 font-bold transition-all ${activeTab === 'courses'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <Book className="inline mr-2" size={18} />
                    Courses
                </button>
                <button
                    onClick={() => setActiveTab('classrooms')}
                    className={`px-6 py-3 font-bold transition-all ${activeTab === 'classrooms'
                        ? 'text-primary-600 border-b-2 border-primary-600'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                >
                    <MapPin className="inline mr-2" size={18} />
                    Classrooms
                </button>
            </div>

            {/* Timetable View */}
            {activeTab === 'timetable' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Weekly Schedule</h3>
                        <button
                            onClick={() => setShowSlotModal(true)}
                            className="flex items-center gap-2 bg-[image:var(--gradient-primary)] hover:opacity-90 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all"
                        >
                            <Plus size={18} />
                            Add Slot
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
                        {DAYS.map((day) => (
                            <div
                                key={day}
                                className="glass-card p-4 hover:shadow-xl transition-all cursor-pointer group hover:scale-[1.02] active:scale-95 duration-300"
                                onClick={() => setSelectedDay(day)}
                            >
                                <h4 className="font-bold text-center mb-4 text-[var(--text-primary)] border-b border-[var(--border-color)] pb-2 group-hover:text-[var(--primary-color)] transition-colors">
                                    {day}
                                </h4>
                                <div className="space-y-2">
                                    {(() => {
                                        const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
                                        const slots = timetable[day] || [];

                                        // Sort: Active first (if today), then by time
                                        const sortedSlots = [...slots].sort((a, b) => {
                                            if (day === today) {
                                                const aActive = activeSessions.some(s => s.course_code === a.course_code);
                                                const bActive = activeSessions.some(s => s.course_code === b.course_code);
                                                if (aActive && !bActive) return -1;
                                                if (!aActive && bActive) return 1;
                                            }
                                            return a.start_time.localeCompare(b.start_time);
                                        });

                                        return sortedSlots.slice(0, 3).map((slot: any) => {
                                            const isActive = day === today && activeSessions.some(s => s.course_code === slot.course_code);
                                            return (
                                                <div key={slot.id} className={`p-2 rounded-lg border text-xs transition-all ${isActive
                                                        ? 'bg-green-100 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)] animate-pulse dark:bg-green-900/30'
                                                        : 'bg-[var(--bg-primary)] border-[var(--border-color)]'
                                                    }`}>
                                                    <div className={`font-bold truncate ${isActive ? 'text-green-700 dark:text-green-400' : 'text-primary-600'}`}>
                                                        {slot.course_code}
                                                        {isActive && <span className="ml-2 text-[10px] uppercase bg-green-500 text-white px-1 rounded animate-none inline-block">LIVE</span>}
                                                    </div>
                                                    <div className="text-[var(--text-secondary)] truncate">{slot.start_time} - {slot.room_code}</div>
                                                </div>
                                            );
                                        });
                                    })()}
                                    {(timetable[day] || []).length > 3 && (
                                        <div className="text-xs text-center text-[var(--text-secondary)] font-medium">
                                            + {(timetable[day] || []).length - 3} more
                                        </div>
                                    )}
                                    {(!timetable[day] || timetable[day].length === 0) && (
                                        <p className="text-xs text-center text-[var(--text-secondary)] py-4 opacity-50">No classes</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Zoom Effect Modal for Day View */}
                    {selectedDay && (
                        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md animate-fade-in" onClick={() => setSelectedDay(null)}>
                            <div
                                className="bg-[var(--bg-surface)] border border-[var(--border-color)] w-full max-w-lg m-4 rounded-3xl shadow-2xl overflow-hidden transform transition-all animate-zoom-in"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="p-6 bg-[image:var(--gradient-primary)] text-white relative overflow-hidden">
                                    {/* Decorative circles */}
                                    <div className="absolute top-[-20px] right-[-20px] w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
                                    <div className="absolute bottom-[-20px] left-[-20px] w-24 h-24 bg-white/10 rounded-full blur-xl"></div>

                                    <h2 className="text-3xl font-bold relative z-10">{selectedDay}</h2>
                                    <p className="text-white/80 relative z-10">{(timetable[selectedDay] || []).length} Classes Scheduled</p>
                                    <button
                                        onClick={() => setSelectedDay(null)}
                                        className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-2 rounded-full transition-colors text-white"
                                    >
                                        <Trash2 className="rotate-45" size={20} /> {/* Using Trash2 as X icon for now, usually X or XIcon */}
                                    </button>
                                </div>

                                <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
                                    {(timetable[selectedDay] || []).length > 0 ? (
                                        timetable[selectedDay].map((slot: any) => (
                                            <div key={slot.id} className="flex gap-4 p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-[var(--primary-color)] transition-all group">
                                                <div className="flex flex-col items-center justify-center min-w-[80px] border-r border-[var(--border-color)] pr-4">
                                                    <span className="font-bold text-lg text-[var(--text-primary)]">{slot.start_time}</span>
                                                    <span className="text-xs text-[var(--text-secondary)]">{slot.end_time}</span>
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-lg text-primary-600">{slot.course_code}</h4>
                                                                {selectedDay === new Date().toLocaleDateString('en-US', { weekday: 'long' }) &&
                                                                    activeSessions.some(s => s.course_code === slot.course_code) && (
                                                                        <span className="px-2 py-0.5 bg-green-500 text-white text-xs font-bold rounded-full animate-pulse shadow-lg shadow-green-500/50">
                                                                            LIVE ACTIVITY
                                                                        </span>
                                                                    )}
                                                            </div>
                                                            <p className="text-sm font-medium text-[var(--text-primary)]">{slot.course_name}</p>
                                                        </div>
                                                        <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-full text-xs font-bold">
                                                            {slot.room_code}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-4 mt-3 text-sm text-[var(--text-secondary)]">
                                                        <span className="flex items-center gap-1">
                                                            <Users size={14} /> {slot.lecturer_name}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <MapPin size={14} /> {slot.room_name}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-12 text-[var(--text-secondary)]">
                                            <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                                            <p>No classes scheduled for {selectedDay}.</p>
                                            <p className="text-sm mt-2">Enjoy your free time!</p>
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-primary)] text-center">
                                    <button
                                        onClick={() => setSelectedDay(null)}
                                        className="text-[var(--primary-color)] font-bold text-sm hover:underline"
                                    >
                                        Close View
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Courses View */}
            {activeTab === 'courses' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Courses</h3>
                        <button
                            onClick={() => setShowCourseModal(true)}
                            className="flex items-center gap-2 bg-[image:var(--gradient-primary)] hover:opacity-90 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all"
                        >
                            <Plus size={18} />
                            Add Course
                        </button>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-[var(--bg-primary)] border-b border-[var(--border-color)]">
                                <tr>
                                    <th className="p-4 text-left font-bold text-[var(--text-primary)]">Code</th>
                                    <th className="p-4 text-left font-bold text-[var(--text-primary)]">Course Name</th>
                                    <th className="p-4 text-left font-bold text-[var(--text-primary)]">Department</th>
                                    <th className="p-4 text-left font-bold text-[var(--text-primary)]">Lecturer</th>
                                    <th className="p-4 text-left font-bold text-[var(--text-primary)]">Room</th>
                                    <th className="p-4 text-left font-bold text-[var(--text-primary)]">Credits</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {courses.map(course => (
                                    <tr key={course.id} className="hover:bg-[var(--bg-primary)] transition-colors">
                                        <td className="p-4 font-bold text-primary-600">{course.course_code}</td>
                                        <td className="p-4 text-[var(--text-primary)]">{course.course_name}</td>
                                        <td className="p-4 text-[var(--text-secondary)]">{course.department || '-'}</td>
                                        <td className="p-4 text-[var(--text-secondary)]">{course.lecturer_name || '-'}</td>
                                        <td className="p-4 text-[var(--text-secondary)]">{course.room_code || '-'}</td>
                                        <td className="p-4 text-[var(--text-secondary)]">{course.credits}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Classrooms View */}
            {activeTab === 'classrooms' && (
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-[var(--text-primary)]">Classrooms</h3>
                        <button
                            onClick={() => setShowClassroomModal(true)}
                            className="flex items-center gap-2 bg-[image:var(--gradient-primary)] hover:opacity-90 px-6 py-3 rounded-xl font-bold text-white shadow-lg transition-all"
                        >
                            <Plus size={18} />
                            Add Classroom
                        </button>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {classrooms.map(room => (
                            <div key={room.id} className="glass-card p-6">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h4 className="text-lg font-bold text-[var(--text-primary)]">{room.room_code}</h4>
                                        <p className="text-sm text-[var(--text-secondary)]">{room.room_name}</p>
                                    </div>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${room.status === 'available' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                        {room.status}
                                    </span>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                        <MapPin size={14} />
                                        {room.building || 'N/A'} - Floor {room.floor || 'N/A'}
                                    </div>
                                    <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                        <Users size={14} />
                                        Capacity: {room.capacity}
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)] capitalize">
                                        Type: {room.room_type.replace('_', ' ')}
                                    </div>
                                </div>

                                {room.amenities && Object.keys(room.amenities).length > 0 && (
                                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                        <p className="text-xs font-bold text-[var(--text-secondary)] mb-2">Amenities:</p>
                                        <div className="flex flex-wrap gap-1">
                                            {Object.entries(room.amenities).map(([key, value]) =>
                                                value && (
                                                    <span key={key} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs flex items-center gap-1">
                                                        <CheckCircle size={10} />
                                                        {key.replace('_', ' ')}
                                                    </span>
                                                )
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Classroom Modal */}
            {showClassroomModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-2xl w-full max-w-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                        <h3 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Add Classroom</h3>
                        <form onSubmit={handleCreateClassroom} className="space-y-4">
                            <div className="grid md:grid-cols-2 gap-4">
                                <input name="room_code" placeholder="Room Code (e.g., LH1)" required className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="room_name" placeholder="Room Name" required className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="building" placeholder="Building" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="floor" type="number" placeholder="Floor" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <input name="capacity" type="number" placeholder="Capacity" required className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                <select name="room_type" className="p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                    {ROOM_TYPES.map(type => (
                                        <option key={type} value={type}>{type.replace('_', ' ')}</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <p className="font-bold text-[var(--text-primary)] mb-2">Amenities:</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                    {amenityOptions.map(amenity => (
                                        <label key={amenity.id} className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                            <input type="checkbox" name={`amenity_${amenity.id}`} className="rounded" />
                                            {amenity.name}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowClassroomModal(false)} className="px-6 py-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                                <button type="submit" className="px-6 py-3 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold">Create Classroom</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Course Modal */}
            {showCourseModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
                        <h3 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Add Course</h3>
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <input name="course_code" placeholder="Course Code (e.g., CS101)" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                            <input name="course_name" placeholder="Course Name" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                            <input name="department" placeholder="Department" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                            <input name="semester" placeholder="Semester (e.g., Fall 2024)" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                            <input name="credits" type="number" placeholder="Credits" defaultValue="3" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />

                            <select name="lecturer_id" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                <option value="">Select Lecturer (Optional)</option>
                                {lecturers.map(lec => (
                                    <option key={lec.id} value={lec.id}>{lec.full_name}</option>
                                ))}
                            </select>

                            <select name="classroom_id" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                <option value="">Select Default Classroom (Optional)</option>
                                {classrooms.map(room => (
                                    <option key={room.id} value={room.id}>{room.room_code} - {room.room_name}</option>
                                ))}
                            </select>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowCourseModal(false)} className="px-6 py-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                                <button type="submit" className="px-6 py-3 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold">Create Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Timetable Slot Modal */}
            {showSlotModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] p-8 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
                        <h3 className="text-2xl font-bold mb-6 text-[var(--text-primary)]">Add Timetable Slot</h3>
                        <form onSubmit={handleCreateSlot} className="space-y-4">
                            <select name="course_id" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                <option value="">Select Course</option>
                                {courses.map(course => (
                                    <option key={course.id} value={course.id}>{course.course_code} - {course.course_name}</option>
                                ))}
                            </select>

                            <select name="classroom_id" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                <option value="">Select Classroom</option>
                                {classrooms.map(room => (
                                    <option key={room.id} value={room.id}>{room.room_code} - {room.room_name}</option>
                                ))}
                            </select>

                            <select name="lecturer_id" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                <option value="">Select Lecturer</option>
                                {lecturers.map(lec => (
                                    <option key={lec.id} value={lec.id}>{lec.full_name}</option>
                                ))}
                            </select>

                            <select name="day_of_week" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                <option value="">Select Day</option>
                                {DAYS.map((day, index) => (
                                    <option key={day} value={index}>{day}</option>
                                ))}
                            </select>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Start Time</label>
                                    <input name="start_time" type="time" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">End Time</label>
                                    <input name="end_time" type="time" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowSlotModal(false)} className="px-6 py-3 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Cancel</button>
                                <button type="submit" className="px-6 py-3 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold">Create Slot</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
