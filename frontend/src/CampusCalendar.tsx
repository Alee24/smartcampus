import { useState, useEffect } from 'react'
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Filter, Search, Zap, Layers, Users, BookOpen, QrCode, Car, X, Plus, Save } from 'lucide-react'

interface CalendarEvent {
    id: string
    title: string
    start: string
    end: string
    type: string
    location: string
    description?: string
}

interface DailyStats {
    people: number
    classes: number
    scans: number
    vehicles: number
    traffic?: string
}

export default function CampusCalendar() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [events, setEvents] = useState<CalendarEvent[]>([])
    const [statsMap, setStatsMap] = useState<Record<string, DailyStats>>({})
    const [loading, setLoading] = useState(true)
    const [view, setView] = useState<'month' | 'week'>('month')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [newEvent, setNewEvent] = useState({
        name: '',
        event_type: 'Academic',
        host: '',
        school: '',
        event_date: new Date().toISOString().split('T')[0],
        start_time: '09:00',
        end_time: '12:00',
        expected_visitors: '0-20',
        description: ''
    })

    useEffect(() => {
        fetchStats()
    }, [currentDate])

    const fetchStats = async () => {
        setLoading(true)
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth() + 1
        try {
            const res = await fetch(`/api/events/stats/monthly?year=${year}&month=${month}`)
            if (res.ok) {
                const data = await res.json() // { "YYYY-MM-DD": { people: ..., events: [...] } }
                setStatsMap(data)

                // Extract and format events for the "Upcoming" list and day markers
                const allEvents: CalendarEvent[] = []
                Object.entries(data).forEach(([dateStr, dayData]: [string, any]) => {
                    if (dayData.events && Array.isArray(dayData.events)) {
                        dayData.events.forEach((evt: any) => {
                            // Backend sends time as "HH:MM" or "All Day"
                            let startDate = dateStr
                            if (evt.time && evt.time !== "All Day") {
                                startDate = `${dateStr}T${evt.time}:00`
                            }

                            allEvents.push({
                                id: evt.id,
                                title: evt.name,
                                start: startDate,
                                end: startDate, // Simplified
                                type: evt.type || 'Event',
                                location: 'Campus' // Location not currently in aggregation
                            })
                        })
                    }
                })

                // Sort events by date
                allEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
                setEvents(allEvents)
            }
        } catch (e) {
            console.error("Failed to fetch calendar stats", e)
        } finally {
            setLoading(false)
        }
    }

    const getDailyStats = (day: number): DailyStats => {
        const year = currentDate.getFullYear()
        const month = String(currentDate.getMonth() + 1).padStart(2, '0')
        const dayStr = String(day).padStart(2, '0')
        const key = `${year}-${month}-${dayStr}`

        return statsMap[key] || {
            people: 0,
            classes: 0,
            scans: 0,
            vehicles: 0
        }
    }

    const getTrafficColor = (stats: DailyStats) => {
        const totalTraffic = stats.people + stats.vehicles

        // Low/Zero
        if (totalTraffic < 10) return 'bg-[var(--bg-surface)] border-[var(--border-color)]' // White/Default

        // Medium
        if (totalTraffic < 100) return 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'

        // High
        return 'bg-red-500/10 border-red-500/30 hover:bg-red-500/20'
    }

    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate()
    const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay()

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)
    const padding = Array.from({ length: firstDay }, (_, i) => i)

    const monthNames = ["January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December"]

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/events/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newEvent)
            })

            if (res.ok) {
                setIsModalOpen(false)
                setNewEvent({
                    name: '',
                    event_type: 'Academic',
                    host: '',
                    school: '',
                    event_date: new Date().toISOString().split('T')[0],
                    start_time: '09:00',
                    end_time: '12:00',
                    expected_visitors: '0-20',
                    description: ''
                })
                fetchStats() // Refresh calendar
            } else {
                alert("Failed to create event")
            }
        } catch (err) {
            console.error(err)
            alert("Error creating event")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="h-full flex flex-col gap-6 animate-fade-in text-[var(--text-primary)]">
            <header className="flex flex-col lg:flex-row justify-between items-end gap-4">
                <div>
                    <h2 className="text-4xl font-black uppercase tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 flex items-center gap-3">
                        <Zap className="text-yellow-400 fill-yellow-400" size={32} />
                        Campus Impulse
                    </h2>
                    <p className="text-[var(--text-secondary)] font-mono mt-2 flex items-center gap-2">
                        <span className={`w-2 h-2 bg-green-500 rounded-full ${loading ? 'animate-ping' : 'animate-pulse'}`}></span>
                        {loading ? 'SYNCING DATA...' : `LIVE ACTIVITY & EVENTS MAP // ${currentDate.getFullYear()}`}
                    </p>
                </div>

                <div className="flex items-center gap-3 bg-[var(--bg-card)] p-1 rounded-xl border border-[var(--border-color)]">
                    <button onClick={() => setView('month')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'month' ? 'bg-[var(--bg-primary)] shadow-sm' : 'opacity-50 hover:opacity-100'}`}>Month</button>
                    <button onClick={() => setView('week')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${view === 'week' ? 'bg-[var(--bg-primary)] shadow-sm' : 'opacity-50 hover:opacity-100'}`}>Week</button>
                    <div className="w-px h-6 bg-[var(--border-color)] mx-1"></div>
                    <div className="flex items-center gap-2 px-3 text-[10px] font-bold uppercase tracking-wider opacity-60">
                        <span className="w-2 h-2 rounded-full bg-red-500/50"></span> High
                        <span className="w-2 h-2 rounded-full bg-green-500/50 ml-2"></span> Med
                        <span className="w-2 h-2 rounded-full bg-gray-500/50 ml-2"></span> Low
                    </div>
                </div>
            </header>

            <div className="grid lg:grid-cols-4 gap-6 flex-1 min-h-0">
                {/* Calendar Grid */}
                <div className="lg:col-span-3 glass-card p-6 flex flex-col border border-blue-500/20 shadow-[0_0_30px_-10px_rgba(59,130,246,0.2)] rounded-3xl backdrop-blur-xl relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -z-10"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl -z-10"></div>

                    {/* Header */}
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-2xl font-bold font-mono">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
                        <div className="flex gap-2">
                            <button onClick={prevMonth} className="p-2 hover:bg-[var(--bg-primary)] rounded-full border border-[var(--border-color)]"><ChevronLeft size={20} /></button>
                            <button onClick={nextMonth} className="p-2 hover:bg-[var(--bg-primary)] rounded-full border border-[var(--border-color)]"><ChevronRight size={20} /></button>
                        </div>
                    </div>

                    {/* Grid Header */}
                    <div className="grid grid-cols-7 mb-4">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center text-xs font-bold uppercase tracking-widest opacity-60 py-2">{d}</div>
                        ))}
                    </div>

                    {/* Days */}
                    <div className="grid grid-cols-7 gap-2 flex-1 auto-rows-fr">
                        {padding.map(p => <div key={`pad-${p}`} className="opacity-10"></div>)}
                        {days.map(day => {
                            // Construct Date Key
                            const year = currentDate.getFullYear()
                            const month = String(currentDate.getMonth() + 1).padStart(2, '0')
                            const dayStr = String(day).padStart(2, '0')
                            const dateKey = `${year}-${month}-${dayStr}`

                            // Check events match (Approximate by string matching first 10 chars)
                            const dayEvents = events.filter(e => e.start.startsWith(dateKey))

                            const isToday = new Date().toISOString().split('T')[0] === dateKey
                            const stats = getDailyStats(day)
                            const colorClass = getTrafficColor(stats)

                            return (
                                <div key={day} className={`relative p-2 rounded-xl border transition-all hover:scale-[1.02] cursor-pointer group flex flex-col items-start justify-between min-h-[100px]
                                    ${isToday ? 'ring-2 ring-blue-500 z-10' : ''} ${colorClass}
                                `}>
                                    <div className="flex justify-between w-full">
                                        <span className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-500 text-white' : 'opacity-50'}`}>
                                            {day}
                                        </span>
                                        {dayEvents.length > 0 && <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>}
                                    </div>

                                    {/* Stats Grid - Tiny Bits of Info */}
                                    <div className="w-full grid grid-cols-2 gap-1 mt-2">
                                        <div className="flex items-center gap-1 text-[9px] opacity-70" title="People Entered">
                                            <Users size={10} className="text-blue-500" />
                                            <span className="font-mono">{stats.people}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] opacity-70" title="Classes Activated">
                                            <BookOpen size={10} className="text-orange-500" />
                                            <span className="font-mono">{stats.classes}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] opacity-70" title="Total Scans">
                                            <QrCode size={10} className="text-purple-500" />
                                            <span className="font-mono">{stats.scans}</span>
                                        </div>
                                        <div className="flex items-center gap-1 text-[9px] opacity-70" title="Vehicles">
                                            <Car size={10} className="text-green-500" />
                                            <span className="font-mono">{stats.vehicles}</span>
                                        </div>
                                    </div>

                                    {/* Mobile/Compact View for Events */}
                                    {dayEvents.length > 0 && (
                                        <div className="mt-1 w-full">
                                            <div className="h-1 w-full bg-purple-500/20 rounded-full overflow-hidden">
                                                <div className="h-full bg-purple-500" style={{ width: '100%' }}></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Sidebar Details */}
                <div className="lg:col-span-1 space-y-6">
                    <div className="glass-card p-6 rounded-3xl border border-purple-500/20 bg-gradient-to-br from-[var(--bg-card)] to-purple-900/5">
                        <h4 className="font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2 text-purple-600">
                            <Layers size={14} /> Upcoming Focus
                        </h4>
                        <div className="space-y-4">
                            {events.slice(0, 3).map(evt => (
                                <div key={evt.id} className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-purple-500 transition-colors cursor-pointer group">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-bold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded">{evt.type}</span>
                                        <span className="text-[10px] font-mono opacity-50">{new Date(evt.start).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                                    </div>
                                    <h5 className="font-bold text-sm mb-1 group-hover:text-purple-500 transition-colors">{evt.title}</h5>
                                    <div className="flex items-center gap-2 text-xs opacity-70">
                                        <Clock size={12} /> {evt.start.includes("T") ? new Date(evt.start).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : "All Day"}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs opacity-70 mt-1">
                                        <MapPin size={12} /> {evt.location}
                                    </div>
                                </div>
                            ))}
                            {events.length === 0 && <div className="text-center opacity-50 text-sm py-4">No upcoming events</div>}
                        </div>
                    </div>

                    <div className="p-6 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 text-white shadow-xl relative overflow-hidden group hover:scale-[1.02] transition-transform">
                        <div className="absolute top-[-20%] right-[-20%] w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all"></div>
                        <h4 className="font-bold text-lg mb-2 relative z-10">Create Event</h4>
                        <p className="text-sm opacity-80 mb-4 relative z-10">Schedule a new academic or social event for the campus.</p>
                        <button onClick={() => setIsModalOpen(true)} className="w-full py-3 bg-white text-indigo-700 rounded-xl font-bold shadow-lg relative z-10 hover:bg-indigo-50 transition-colors">
                            + Add Event
                        </button>
                    </div>
                </div>
            </div>

            {/* Create Event Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]">
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                <Plus className="text-purple-500" size={20} /> Create New Event
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-[var(--text-secondary)] hover:text-red-500">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="p-6 overflow-y-auto flex-1 space-y-4">
                            <div>
                                <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Event Name</label>
                                <input
                                    required
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500 transition-colors"
                                    value={newEvent.name}
                                    onChange={e => setNewEvent({ ...newEvent, name: e.target.value })}
                                    placeholder="e.g. Science Fair 2026"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Type</label>
                                    <select
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500"
                                        value={newEvent.event_type}
                                        onChange={e => setNewEvent({ ...newEvent, event_type: e.target.value })}
                                    >
                                        <option>Academic</option>
                                        <option>Social</option>
                                        <option>Sports</option>
                                        <option>Cultural</option>
                                        <option>Guest Talk</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Date</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500"
                                        value={newEvent.event_date}
                                        onChange={e => setNewEvent({ ...newEvent, event_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500"
                                        value={newEvent.start_time}
                                        onChange={e => setNewEvent({ ...newEvent, start_time: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">End Time</label>
                                    <input
                                        type="time"
                                        required
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500"
                                        value={newEvent.end_time}
                                        onChange={e => setNewEvent({ ...newEvent, end_time: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Host/Organizer</label>
                                    <input
                                        required
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500"
                                        value={newEvent.host}
                                        onChange={e => setNewEvent({ ...newEvent, host: e.target.value })}
                                        placeholder="e.g. Student Council"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">School/Dept</label>
                                    <input
                                        required
                                        className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500"
                                        value={newEvent.school}
                                        onChange={e => setNewEvent({ ...newEvent, school: e.target.value })}
                                        placeholder="e.g. Engineering"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Expected Visitors</label>
                                <select
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500"
                                    value={newEvent.expected_visitors}
                                    onChange={e => setNewEvent({ ...newEvent, expected_visitors: e.target.value })}
                                >
                                    <option>0-20</option>
                                    <option>20-50</option>
                                    <option>50-100</option>
                                    <option>100+</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold uppercase text-[var(--text-secondary)] mb-1">Description</label>
                                <textarea
                                    className="w-full p-2 rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:border-purple-500 h-24 resize-none"
                                    value={newEvent.description}
                                    onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                                    placeholder="Event details..."
                                />
                            </div>

                            <div className="pt-4">
                                <button
                                    disabled={submitting}
                                    className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {submitting ? 'Creating...' : <><Save size={18} /> Create Event</>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
