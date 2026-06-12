import React, { useState, useEffect } from 'react'
import {
    Search, Plus, Filter, Download, User, Clock,
    CheckCircle, XCircle, LogOut, Phone, CreditCard, Building, MapPin,
    Car, Truck, Shield, AlertCircle, Eye, Check, X, LogIn
} from 'lucide-react'
import { useNotification } from './components/Notification'
import {
    ResponsiveContainer,
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend
} from 'recharts'

export default function VisitorManagement() {
    const { showConfirm } = useNotification()
    const [visitors, setVisitors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [activeTab, setActiveTab] = useState<'pending' | 'active' | 'exited' | 'all'>('pending')
    const [stats, setStats] = useState<{
        total_today: number;
        active_now: number;
        exited_today: number;
        hourly: number[];
        hourly_breakdown?: {
            students: number[];
            visitors: number[];
            staff: number[];
            clients: number[];
            cars: number[];
        };
    }>({ total_today: 0, active_now: 0, exited_today: 0, hourly: [] })
    const [showAddModal, setShowAddModal] = useState(false)
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        id_number: '',
        visit_details: ''
    })
    const [submitting, setSubmitting] = useState(false)
    const [previewImage, setPreviewImage] = useState<string | null>(null)
    const [selectedDetailVisitor, setSelectedDetailVisitor] = useState<any | null>(null)

    // Quick check-in/out states
    const [showQuickModal, setShowQuickModal] = useState(false)
    const [quickSearch, setQuickSearch] = useState('')
    const [quickSearchResult, setQuickSearchResult] = useState<any | null>(null)
    const [quickLookupAttempted, setQuickLookupAttempted] = useState(false)
    const [loadingQuick, setLoadingQuick] = useState(false)
    const [quickFormData, setQuickFormData] = useState({
        first_name: '',
        last_name: '',
        phone_number: '',
        id_number: '',
        visit_details: '',
        visitor_type: 'visitor',
        plate_number: '',
        passengers: 1,
        dropoff_name: '',
        dropoff_admission_number: '',
        is_pickup: false,
        check_in_student: false
    })

    useEffect(() => {
        fetchVisitors()
    }, [])

    // Auto refresh every 10 seconds to detect new self-service requests
    useEffect(() => {
        const interval = setInterval(() => {
            fetchVisitors()
        }, 10000)
        return () => clearInterval(interval)
    }, [])

    const fetchVisitors = async () => {
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            const [listRes, statsRes] = await Promise.all([
                fetch('/api/gate/visitors', { headers }),
                fetch('/api/gate/visitor-stats', { headers })
            ])

            if (listRes.ok) {
                const data = await listRes.json()
                setVisitors(data)
                
                // If there are no pending requests, switch tab default to active
                const pendingCount = data.filter((v: any) => v.status === 'pending').length
                if (pendingCount === 0 && activeTab === 'pending') {
                    // Only switch if this is the first load
                    if (loading) setActiveTab('active')
                }
            }
            if (statsRes.ok) {
                setStats(await statsRes.json())
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const handleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/visitors/check-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                setShowAddModal(false)
                setFormData({ first_name: '', last_name: '', phone_number: '', id_number: '', visit_details: '' })
                fetchVisitors()
            } else {
                alert("Failed to check in visitor")
            }
        } catch (error) {
            console.error(error)
        } finally {
            setSubmitting(false)
        }
    }

    const handleApprove = async (visitorId: string) => {
        setSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/gate/visitors/${visitorId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                fetchVisitors()
            } else {
                const data = await res.json()
                alert(data.detail || "Failed to approve visitor check-in")
            }
        } catch (e) {
            console.error(e)
        } finally {
            setSubmitting(false)
        }
    }

    const handleDecline = async (visitorId: string) => {
        const confirmed = await showConfirm("Are you sure you want to decline this visitor request?")
        if (!confirmed) return

        setSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/gate/visitors/${visitorId}/decline`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                fetchVisitors()
            } else {
                alert("Failed to decline request")
            }
        } catch (e) {
            console.error(e)
        } finally {
            setSubmitting(false)
        }
    }

    const handleCheckOut = async (visitorId: string) => {
        const confirmed = await showConfirm("Confirm check out for this visitor?")
        if (!confirmed) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/visitors/check-out', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ visitor_id: visitorId })
            })

            if (res.ok) {
                fetchVisitors()
            }
        } catch (error) {
            console.error(error)
        }
    }

    const handleQuickLookup = async () => {
        if (!quickSearch.trim()) return
        setLoadingQuick(true)
        setQuickLookupAttempted(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/verify/${encodeURIComponent(quickSearch.trim())}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setQuickSearchResult(data)
                
                // Pre-populate quickFormData
                const names = (data.full_name || '').split(' ')
                const fName = data.first_name || names[0] || ''
                const lName = data.last_name || names.slice(1).join(' ') || ''
                
                setQuickFormData({
                    first_name: fName,
                    last_name: lName,
                    phone_number: data.phone_number || '',
                    id_number: data.admission_number || data.id_number || quickSearch.trim(),
                    visit_details: data.visit_details || '',
                    visitor_type: data.visitor_type || 'visitor',
                    plate_number: data.plate_number || '',
                    passengers: data.passengers || 1,
                    dropoff_name: data.dropoff_name || '',
                    dropoff_admission_number: data.dropoff_admission_number || '',
                    is_pickup: data.is_pickup || false,
                    check_in_student: data.check_in_student || false
                })
            } else {
                // Not found - let user fill
                const term = quickSearch.trim()
                const isPlateGuess = /^[a-zA-Z]{3}\s*\d{3,4}[a-zA-Z]?$/.test(term.replace(/\s+/g, ''))
                const defaultForm = {
                    first_name: '',
                    last_name: '',
                    phone_number: '',
                    id_number: isPlateGuess ? '' : term,
                    visit_details: '',
                    visitor_type: isPlateGuess ? 'vehicle_registration' : 'visitor',
                    plate_number: isPlateGuess ? term.toUpperCase() : '',
                    passengers: 1,
                    dropoff_name: '',
                    dropoff_admission_number: '',
                    is_pickup: false,
                    check_in_student: false
                }
                setQuickSearchResult({ not_found: true, ...defaultForm })
                setQuickFormData(defaultForm)
            }
        } catch (err) {
            console.error(err)
            const term = quickSearch.trim()
            const isPlateGuess = /^[a-zA-Z]{3}\s*\d{3,4}[a-zA-Z]?$/.test(term.replace(/\s+/g, ''))
            const defaultForm = {
                first_name: '',
                last_name: '',
                phone_number: '',
                id_number: isPlateGuess ? '' : term,
                visit_details: '',
                visitor_type: isPlateGuess ? 'vehicle_registration' : 'visitor',
                plate_number: isPlateGuess ? term.toUpperCase() : '',
                passengers: 1,
                dropoff_name: '',
                dropoff_admission_number: '',
                is_pickup: false,
                check_in_student: false
            }
            setQuickSearchResult({ not_found: true, error: true, ...defaultForm })
            setQuickFormData(defaultForm)
        } finally {
            setLoadingQuick(false)
        }
    }

    const handleQuickCheckInSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/visitors/check-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(quickFormData)
            })

            if (res.ok) {
                setShowQuickModal(false)
                setQuickSearch('')
                setQuickSearchResult(null)
                setQuickLookupAttempted(false)
                setQuickFormData({
                    first_name: '',
                    last_name: '',
                    phone_number: '',
                    id_number: '',
                    visit_details: '',
                    visitor_type: 'visitor',
                    plate_number: '',
                    passengers: 1,
                    dropoff_name: '',
                    dropoff_admission_number: '',
                    is_pickup: false,
                    check_in_student: false
                })
                fetchVisitors()
            } else {
                const data = await res.json()
                alert(data.detail || "Failed to check in visitor")
            }
        } catch (error: any) {
            console.error(error)
            alert(error.message || "Network error occurred")
        } finally {
            setSubmitting(false)
        }
    }

    // Filter by tab status
    const tabFilteredVisitors = visitors.filter(v => {
        if (activeTab === 'pending') return v.status === 'pending';
        if (activeTab === 'active') return v.status === 'checked_in';
        if (activeTab === 'exited') return v.status === 'checked_out';
        return true;
    })

    const filteredVisitors = tabFilteredVisitors.filter(v =>
        (v.first_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.last_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.id_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (v.plate_number || '').toLowerCase().includes(search.toLowerCase())
    )

    const pendingCount = visitors.filter(v => v.status === 'pending').length

    return (
        <div className="space-y-6 animate-fade-in pb-20 text-[var(--text-primary)]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Visitor & Host Management</h1>
                    <p className="text-[var(--text-secondary)]">Review self-service requests and manage gate access.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchVisitors()}
                        className="px-4 py-2 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-surface)] text-[var(--text-secondary)] font-semibold text-sm cursor-pointer"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={() => {
                            setQuickSearch('');
                            setQuickSearchResult(null);
                            setQuickLookupAttempted(false);
                            setShowQuickModal(true);
                        }}
                        className="px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900/40 rounded-xl hover:opacity-90 transition-all font-semibold flex items-center gap-2 text-sm cursor-pointer"
                    >
                        <Shield size={18} /> Quick Check-In/Out
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-[var(--primary-color)] text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all font-semibold flex items-center gap-2 text-sm cursor-pointer"
                    >
                        <Plus size={18} /> New Visitor
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h3 className="text-[var(--text-secondary)] font-medium mb-2 text-xs uppercase tracking-wider">Total Today</h3>
                    <div className="text-3xl font-bold">{stats.total_today}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Self-reg & Checked In Entries</div>
                </div>
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h3 className="text-[var(--text-secondary)] font-medium mb-2 text-xs uppercase tracking-wider font-bold">Currently Checked In</h3>
                    <div className="text-3xl font-bold text-emerald-600">{stats.active_now}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Currently on Campus</div>
                </div>
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h3 className="text-[var(--text-secondary)] font-medium mb-2 text-xs uppercase tracking-wider">Checked Out</h3>
                    <div className="text-3xl font-bold text-slate-500">{stats.exited_today}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1 font-medium">Completed Visits</div>
                </div>
            </div>

            {/* Analytics Graph */}
            <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                    <Clock size={16} className="text-indigo-500" /> Visitor Traffic & Hourly Entries
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="105%" height="100%">
                        <AreaChart
                            data={Array.from({ length: 24 }).map((_, hour) => {
                                const hStr = `${hour.toString().padStart(2, '0')}:00`;
                                const bd = stats.hourly_breakdown || {};
                                return {
                                    time: hStr,
                                    visitors: bd.visitors ? bd.visitors[hour] : (stats.hourly ? stats.hourly[hour] : 0),
                                    students: bd.students ? bd.students[hour] : 0,
                                    staff: bd.staff ? bd.staff[hour] : 0,
                                    clients: bd.clients ? bd.clients[hour] : 0,
                                    cars: bd.cars ? bd.cars[hour] : 0
                                };
                            }).filter((_, h) => h >= 6 && h <= 22)}
                            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                        >
                            <defs>
                                <linearGradient id="colorStudents" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorStaff" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorClients" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorVisitors" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                                </linearGradient>
                                <linearGradient id="colorCars" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.2}/>
                                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                            <XAxis 
                                dataKey="time" 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}
                            />
                            <YAxis 
                                tickLine={false} 
                                axisLine={false} 
                                tick={{ fill: 'var(--text-secondary)', fontSize: 10, fontWeight: 600 }}
                            />
                            <RechartsTooltip
                                contentStyle={{ 
                                    backgroundColor: 'var(--bg-surface)', 
                                    borderColor: 'var(--border-color)',
                                    borderRadius: '12px',
                                    color: 'var(--text-primary)'
                                }}
                            />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: 600, paddingBottom: '10px' }} />
                            <Area 
                                type="monotone" 
                                dataKey="students" 
                                name="Students"
                                stroke="#8b5cf6" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorStudents)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="staff" 
                                name="Staff"
                                stroke="#f59e0b" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorStaff)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="clients" 
                                name="Clients"
                                stroke="#ec4899" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorClients)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="visitors" 
                                name="Visitors"
                                stroke="#10b981" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorVisitors)" 
                            />
                            <Area 
                                type="monotone" 
                                dataKey="cars" 
                                name="Cars (Vehicles)"
                                stroke="#0ea5e9" 
                                strokeWidth={2}
                                fillOpacity={1} 
                                fill="url(#colorCars)" 
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Verification & Filter Bar */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--bg-surface)] p-3.5 rounded-2xl border border-[var(--border-color)]">
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all relative ${
                            activeTab === 'pending'
                                ? 'bg-indigo-650 text-white shadow-md'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                    >
                        Pending Requests
                        {pendingCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse border border-white">
                                {pendingCount}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('active')}
                        className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'active'
                                ? 'bg-indigo-650 text-white shadow-md'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                    >
                        Active Check-Ins
                    </button>
                    <button
                        onClick={() => setActiveTab('exited')}
                        className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'exited'
                                ? 'bg-indigo-650 text-white shadow-md'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                    >
                        Exited
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`px-4.5 py-2 text-xs font-bold rounded-xl transition-all ${
                            activeTab === 'all'
                                ? 'bg-indigo-650 text-white shadow-md'
                                : 'bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)]'
                        }`}
                    >
                        All logs
                    </button>
                </div>

                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, or plate..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none text-xs font-semibold"
                    />
                </div>
            </div>

            {/* Pending Requests Grid Layout (Visual, easy for guards to verify) */}
            {activeTab === 'pending' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {loading ? (
                        <div className="col-span-2 text-center py-12 text-[var(--text-secondary)] font-bold">Loading pending requests...</div>
                    ) : filteredVisitors.length === 0 ? (
                        <div className="col-span-2 text-center py-12 bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] text-[var(--text-secondary)] font-bold">
                            No pending registrations to verify.
                        </div>
                    ) : (
                        filteredVisitors.map(req => (
                            <div key={req.id} className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between hover:shadow-md transition-all gap-5 relative">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-center gap-3">
                                            <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center shadow-sm relative bg-slate-100 shrink-0">
                                                {req.profile_image ? (
                                                    <img src={req.profile_image} className="w-full h-full object-cover" alt="Visitor" />
                                                ) : (
                                                    <div className={`w-full h-full flex items-center justify-center font-bold text-white ${
                                                        req.visitor_type === 'taxi' ? 'bg-amber-500' :
                                                        req.visitor_type === 'delivery' ? 'bg-blue-500' :
                                                        req.visitor_type === 'vehicle_registration' ? 'bg-purple-500' : 'bg-emerald-500'
                                                    }`}>
                                                        {req.visitor_type === 'taxi' ? <Car size={20} /> :
                                                         req.visitor_type === 'delivery' ? <Truck size={20} /> :
                                                         req.visitor_type === 'vehicle_registration' ? <Car size={20} /> : <User size={20} />}
                                                    </div>
                                                )}
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 dark:text-white leading-tight">
                                                    {req.visitor_type === 'taxi' ? 'Taxi / Cab Driver' : `${req.first_name} ${req.last_name}`}
                                                </h4>
                                                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-wider block w-fit mt-1">
                                                    {req.visitor_type?.replace('_', ' ')}
                                                </span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50 dark:bg-indigo-950/20 px-2.5 py-1 rounded border border-indigo-100 dark:border-indigo-900/40">
                                            {new Date(req.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    {/* Verification Fields Grid */}
                                    <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50/50 dark:bg-slate-905 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80">
                                        {req.visitor_type !== 'taxi' && (
                                            <div>
                                                <span className="text-slate-400 font-bold block text-[10px]">DRIVER/GUEST</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{req.first_name} {req.last_name}</span>
                                            </div>
                                        )}
                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px]">ID / PASSPORT</span>
                                            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">{req.id_number}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-400 font-bold block text-[10px]">MOBILE CONTACT</span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">{req.phone_number}</span>
                                        </div>
                                        {req.plate_number && (
                                            <div>
                                                <span className="text-slate-400 font-bold block text-[10px]">PLATE NUMBER</span>
                                                <span className="font-mono font-black text-slate-800 dark:text-white uppercase">{req.plate_number}</span>
                                            </div>
                                        )}
                                        {req.passengers > 0 && (
                                            <div>
                                                <span className="text-slate-400 font-bold block text-[10px]">PASSENGERS</span>
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">{req.passengers}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Destination Details / Drop-off details */}
                                    {req.visitor_type === 'taxi' && (
                                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl space-y-2 text-xs">
                                            <div className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest text-[9px]">Drop-off Destination details</div>
                                            <p className="font-semibold">{req.visit_details}</p>
                                            
                                            {/* Show drop off student ID image verification pop-up */}
                                            {req.dropoff_admission_number && (
                                                <div className="mt-2 p-3 bg-white dark:bg-slate-900 rounded-lg border border-amber-500/20 flex items-center gap-3">
                                                    {req.dropoff_user_id ? (
                                                        <div className="w-12 h-12 rounded-lg bg-slate-100 border overflow-hidden shrink-0 relative group">
                                                            <img 
                                                                src={`/api/users/verify/${req.dropoff_admission_number}`} 
                                                                className="w-full h-full object-cover" 
                                                                onError={(e: any) => {
                                                                    // Fallback in case endpoint direct image fails
                                                                    e.target.src = "/static/default_profile.jpg";
                                                                }}
                                                            />
                                                            <button 
                                                                type="button"
                                                                onClick={() => setPreviewImage(`/api/users/verify/${req.dropoff_admission_number}`)}
                                                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity"
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="w-12 h-12 rounded-lg bg-indigo-50 text-indigo-700 font-bold flex items-center justify-center shrink-0">
                                                            N/A
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-black text-slate-800 dark:text-white text-[11px]">Verify Student ID</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{req.dropoff_admission_number}</div>
                                                        {req.check_in_student && (
                                                            <span className="text-[9px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-1.5 py-0.5 rounded font-black tracking-wider uppercase block w-fit mt-1">
                                                                Auto check-in student
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Delivery Details with images */}
                                    {req.visitor_type === 'delivery' && (
                                        <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl space-y-2.5 text-xs">
                                            <div className="font-bold text-blue-800 dark:text-blue-400 uppercase tracking-widest text-[9px]">Delivery Package & Details</div>
                                            <p className="font-semibold text-slate-700 dark:text-slate-350">{req.visit_details}</p>
                                            
                                            {/* Delivery Images Row */}
                                            <div className="grid grid-cols-2 gap-2 mt-2">
                                                {req.delivery_image_package ? (
                                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-inner">
                                                        <img src={req.delivery_image_package} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <button
                                                                onClick={() => setPreviewImage(req.delivery_image_package)}
                                                                className="p-1.5 bg-white text-slate-900 rounded-full hover:scale-105 transition-transform"
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        </div>
                                                        <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[8px] px-1 py-0.5 rounded">Package</span>
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-200">
                                                        No Package Photo
                                                    </div>
                                                )}
                                                {req.delivery_image_receipt ? (
                                                    <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-inner">
                                                        <img src={req.delivery_image_receipt} className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <button
                                                                onClick={() => setPreviewImage(req.delivery_image_receipt)}
                                                                className="p-1.5 bg-white text-slate-900 rounded-full hover:scale-105 transition-transform"
                                                            >
                                                                <Eye size={12} />
                                                            </button>
                                                        </div>
                                                        <span className="absolute bottom-1 left-1 bg-black/75 text-white text-[8px] px-1 py-0.5 rounded">Receipt / Note</span>
                                                    </div>
                                                ) : (
                                                    <div className="aspect-video bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-200">
                                                        No Receipt Photo
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* Default Purpose for normal visitors / vehicle registrations */}
                                    {req.visitor_type !== 'taxi' && req.visitor_type !== 'delivery' && (
                                        <div className="p-3 bg-slate-50 dark:bg-slate-905 rounded-xl text-xs space-y-1">
                                            <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Purpose / Destination Details</span>
                                            <p className="font-semibold text-slate-700 dark:text-slate-350">{req.visit_details}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                                    <button
                                        onClick={() => handleDecline(req.id)}
                                        disabled={submitting}
                                        className="flex-1 py-2.5 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 dark:border-rose-950/20 dark:text-rose-400 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <X size={14} /> Decline
                                    </button>
                                    <button
                                        onClick={() => handleApprove(req.id)}
                                        disabled={submitting}
                                        className="flex-2 py-2.5 bg-emerald-600 text-white hover:bg-emerald-700 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/25 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                                    >
                                        <Check size={14} /> Verify ID & Check In
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Standard Visitor Logs Table (For active, exited and all logs) */}
            {activeTab !== 'pending' && (
                <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border-color)]">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                    <th className="p-4 font-semibold">Visitor Details</th>
                                    <th className="p-4 font-semibold">Contact</th>
                                    <th className="p-4 font-semibold">Plate / Vehicle</th>
                                    <th className="p-4 font-semibold">Purpose / Destination</th>
                                    <th className="p-4 font-semibold">Time In</th>
                                    <th className="p-4 font-semibold">Time Out</th>
                                    <th className="p-4 font-semibold">Status</th>
                                    <th className="p-4 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {loading ? (
                                    <tr><td colSpan={8} className="p-8 text-center">Loading logs...</td></tr>
                                ) : filteredVisitors.length === 0 ? (
                                    <tr><td colSpan={8} className="p-8 text-center text-[var(--text-secondary)]">No logs found.</td></tr>
                                ) : (
                                    filteredVisitors.map(visitor => (
                                        <tr key={visitor.id} className="hover:bg-[var(--bg-surface)] transition-colors text-sm">
                                            <td className="p-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center shadow-inner relative bg-slate-100 shrink-0">
                                                        {visitor.profile_image ? (
                                                            <img src={visitor.profile_image} className="w-full h-full object-cover" alt="Visitor" />
                                                        ) : (
                                                            <div className={`w-full h-full flex items-center justify-center font-bold text-white uppercase ${
                                                                visitor.visitor_type === 'taxi' ? 'bg-amber-500' :
                                                                visitor.visitor_type === 'delivery' ? 'bg-blue-500' :
                                                                visitor.visitor_type === 'vehicle_registration' ? 'bg-purple-500' : 'bg-emerald-500'
                                                            }`}>
                                                                {visitor.first_name?.[0] || 'V'}{visitor.last_name?.[0] || ''}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="font-semibold text-[var(--text-primary)]">
                                                            {visitor.visitor_type === 'taxi' ? 'Taxi Driver' : `${visitor.first_name} ${visitor.last_name}`}
                                                        </div>
                                                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                                            <CreditCard size={12} /> {visitor.id_number || 'No ID'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2 text-[var(--text-secondary)] text-xs font-semibold">
                                                    <Phone size={14} /> {visitor.phone_number}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono font-bold text-xs">
                                                {visitor.plate_number ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="bg-slate-105 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200 w-fit font-bold">
                                                            {visitor.plate_number}
                                                        </span>
                                                        {visitor.passengers > 0 && (
                                                            <span className="text-[10px] text-slate-400 font-sans font-medium block">
                                                                {visitor.passengers} passenger{visitor.passengers > 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-400">-</span>
                                                )}
                                            </td>
                                            <td className="p-4">
                                                <div className="text-xs max-w-[200px] truncate font-medium">{visitor.visit_details}</div>
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[var(--text-secondary)]">
                                                {visitor.time_in ? new Date(visitor.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="p-4 text-xs font-mono text-[var(--text-secondary)]">
                                                {visitor.time_out ? new Date(visitor.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-black border uppercase tracking-wider ${
                                                    visitor.status === 'checked_in'
                                                        ? 'bg-green-150 text-green-700 border-green-200'
                                                        : visitor.status === 'rejected'
                                                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                                                        : 'bg-slate-100 text-slate-650 border-slate-200'
                                                }`}>
                                                    {visitor.status === 'checked_in' ? 'Active' : visitor.status === 'rejected' ? 'Declined' : 'Checked Out'}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => setSelectedDetailVisitor(visitor)}
                                                        className="px-3 py-1 bg-slate-50 dark:bg-slate-800 text-[var(--text-secondary)] hover:bg-[var(--bg-surface)] rounded-lg text-xs font-semibold border border-[var(--border-color)] transition-colors cursor-pointer flex items-center gap-1"
                                                    >
                                                        <Eye size={14} /> Details
                                                    </button>
                                                    {visitor.status === 'checked_in' && (
                                                        <button
                                                            onClick={() => handleCheckOut(visitor.id)}
                                                            className="px-3 py-1 bg-red-50 text-red-650 hover:bg-red-100 rounded-lg text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
                                                        >
                                                            Check Out
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Quick Check-In / Check-Out Modal */}
            {showQuickModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in text-[var(--text-primary)]">
                    <div className="bg-[var(--bg-surface)] w-full max-w-xl rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in max-h-[90vh] flex flex-col animate-scale-in">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold flex items-center gap-2">
                                    <Shield className="text-indigo-500" size={22} /> Quick Check-In / Check-Out
                                </h2>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">Verify credentials and instantly log entry or exit.</p>
                            </div>
                            <button onClick={() => { setShowQuickModal(false); setQuickSearch(''); setQuickSearchResult(null); setQuickLookupAttempted(false); }} className="text-[var(--text-secondary)] hover:text-red-500 cursor-pointer border-none bg-transparent">
                                <XCircle size={24} />
                            </button>
                        </div>
                        
                        <div className="p-6 overflow-y-auto space-y-6 text-xs flex-1">
                            {/* Search Input Bar */}
                            <div className="space-y-2">
                                <label className="block font-bold text-[var(--text-secondary)] uppercase tracking-wider text-[10px]">Verify ID / Passport or Plate Number</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                                        <input
                                            type="text"
                                            placeholder="Enter National ID, Passport or Vehicle Plate..."
                                            value={quickSearch}
                                            onChange={(e) => setQuickSearch(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleQuickLookup(); } }}
                                            className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl outline-none focus:ring-2 focus:ring-primary-500/20 text-xs font-semibold"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={handleQuickLookup}
                                        disabled={loadingQuick}
                                        className="px-5 py-2.5 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-md hover:opacity-90 active:scale-95 transition-all text-xs cursor-pointer border-none"
                                    >
                                        {loadingQuick ? 'Searching...' : 'Lookup & Verify'}
                                    </button>
                                </div>
                            </div>

                            {/* Result Area */}
                            {loadingQuick && (
                                <div className="py-12 text-center text-[var(--text-secondary)] font-bold">Verifying credentials...</div>
                            )}

                            {!loadingQuick && quickLookupAttempted && quickSearchResult && (
                                <div className="space-y-4 animate-fade-in">
                                    {/* Found in Active Check-ins: Quick Checkout! */}
                                    {quickSearchResult.gate_status === 'In' || quickSearchResult.status === 'checked_in' ? (
                                        <div className="p-5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 space-y-4">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded font-black uppercase tracking-wider block w-fit mb-1">
                                                        Active Check-In
                                                    </span>
                                                    <h3 className="text-sm font-black text-slate-800 dark:text-white">
                                                        {quickSearchResult.full_name || `${quickSearchResult.first_name} ${quickSearchResult.last_name}`}
                                                    </h3>
                                                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">ID/Passport: {quickSearchResult.admission_number || quickSearchResult.id_number}</p>
                                                </div>
                                                <span className="text-xs text-[var(--text-secondary)] font-mono font-medium">
                                                    In: {new Date(quickSearchResult.time_in).toLocaleTimeString()}
                                                </span>
                                            </div>

                                            <div className="grid grid-cols-2 gap-3 text-xs bg-white dark:bg-slate-900 p-3 rounded-lg border border-slate-100 dark:border-slate-800/80">
                                                <div>
                                                    <span className="text-slate-400 block text-[9px] font-bold">CONTACT</span>
                                                    <span className="font-semibold">{quickSearchResult.phone_number || 'N/A'}</span>
                                                </div>
                                                {quickSearchResult.plate_number && (
                                                    <div>
                                                        <span className="text-slate-400 block text-[9px] font-bold">PLATE NUMBER</span>
                                                        <span className="font-mono font-bold uppercase">{quickSearchResult.plate_number}</span>
                                                    </div>
                                                )}
                                                <div className="col-span-2">
                                                    <span className="text-slate-400 block text-[9px] font-bold">PURPOSE / DESTINATION</span>
                                                    <span className="font-medium">{quickSearchResult.visit_details || 'No details provided'}</span>
                                                </div>
                                            </div>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    handleCheckOut(quickSearchResult.id);
                                                    setShowQuickModal(false);
                                                }}
                                                className="w-full py-3 bg-red-600 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 hover:bg-red-700 transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer border-none text-xs"
                                            >
                                                <LogOut size={16} /> Log Exit & Check Out
                                            </button>
                                        </div>
                                    ) : (
                                        /* Not checked in: Show check-in form, pre-populated! */
                                        <form onSubmit={handleQuickCheckInSubmit} className="space-y-4">
                                            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                                                <p className="font-bold text-indigo-700 dark:text-indigo-400 text-xs">
                                                    {quickSearchResult.not_found 
                                                        ? "No active log found. Fill the form to check in:" 
                                                        : "Visitor record verified! Confirm details and check in:"}
                                                </p>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-medium mb-1">First Name</label>
                                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.first_name} onChange={e => setQuickFormData({ ...quickFormData, first_name: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block font-medium mb-1">Last Name</label>
                                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.last_name} onChange={e => setQuickFormData({ ...quickFormData, last_name: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block font-medium mb-1">National ID / Passport</label>
                                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.id_number} onChange={e => setQuickFormData({ ...quickFormData, id_number: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block font-medium mb-1">Phone Number</label>
                                                    <input required type="tel" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.phone_number} onChange={e => setQuickFormData({ ...quickFormData, phone_number: e.target.value })} />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="col-span-2">
                                                    <label className="block font-medium mb-1">Plate Number (Optional)</label>
                                                    <input type="text" placeholder="e.g. KAA 123A" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold uppercase"
                                                        value={quickFormData.plate_number} onChange={e => setQuickFormData({ ...quickFormData, plate_number: e.target.value })} />
                                                </div>
                                                <div>
                                                    <label className="block font-medium mb-1">Passengers</label>
                                                    <input type="number" min={1} className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                        value={quickFormData.passengers} onChange={e => setQuickFormData({ ...quickFormData, passengers: parseInt(e.target.value) || 1 })} />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block font-medium mb-1">Visitor Type</label>
                                                <select className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold"
                                                    value={quickFormData.visitor_type} onChange={e => setQuickFormData({ ...quickFormData, visitor_type: e.target.value })}>
                                                    <option value="visitor">Regular Visitor</option>
                                                    <option value="taxi">Taxi Driver</option>
                                                    <option value="delivery">Delivery Personnel</option>
                                                    <option value="vehicle_registration">Registered Vehicle Entry</option>
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block font-medium mb-1">Visit Purpose / Host</label>
                                                <textarea required className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] font-semibold" rows={2}
                                                    placeholder="Reason for visit / who they are meeting..."
                                                    value={quickFormData.visit_details} onChange={e => setQuickFormData({ ...quickFormData, visit_details: e.target.value })} />
                                            </div>

                                            <div className="pt-2 flex gap-3">
                                                <button type="button" onClick={() => { setShowQuickModal(false); setQuickSearch(''); setQuickSearchResult(null); setQuickLookupAttempted(false); }} className="flex-1 py-3 bg-[var(--bg-primary)] rounded-xl font-bold text-[var(--text-secondary)] border border-[var(--border-color)] cursor-pointer">Cancel</button>
                                                <button type="submit" disabled={submitting} className="flex-2 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-1.5 cursor-pointer border-none text-xs">
                                                    <LogIn size={16} /> {submitting ? 'Checking In...' : 'Verify ID & Check In'}
                                                </button>
                                            </div>
                                        </form>
                                    )}
                                </div>
                            )}

                            {!quickLookupAttempted && (
                                <div className="py-12 text-center text-[var(--text-secondary)] font-medium flex flex-col items-center justify-center gap-2">
                                    <Shield className="text-slate-300 dark:text-slate-700" size={48} />
                                    <span>Scan or type credentials above to retrieve check-in status.</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Manual Register Modal */}
            {showAddModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h2 className="text-xl font-bold">Register New Visitor</h2>
                            <button onClick={() => setShowAddModal(false)} className="text-[var(--text-secondary)] hover:text-red-500 cursor-pointer"><XCircle size={24} /></button>
                        </div>
                        <form onSubmit={handleCheckIn} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-xs">
                                <div>
                                    <label className="block font-medium mb-1">First Name</label>
                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold"
                                        value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block font-medium mb-1">Last Name</label>
                                    <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold"
                                        value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                                </div>
                            </div>
                            <div className="text-xs">
                                <label className="block font-medium mb-1">National ID / Passport</label>
                                <input required type="text" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold"
                                    value={formData.id_number} onChange={e => setFormData({ ...formData, id_number: e.target.value })} />
                            </div>
                            <div className="text-xs">
                                <label className="block font-medium mb-1">Phone Number</label>
                                <input required type="tel" className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold"
                                    value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
                            </div>
                            <div className="text-xs">
                                <label className="block font-medium mb-1">Visit Purpose / Host</label>
                                <textarea required className="w-full p-2.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs font-semibold" rows={3}
                                    placeholder="e.g. Meeting with Dr. X in Office 202"
                                    value={formData.visit_details} onChange={e => setFormData({ ...formData, visit_details: e.target.value })} />
                                </div>

                            <div className="pt-4 flex gap-3 text-xs">
                                <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-[var(--bg-primary)] rounded-xl font-bold text-[var(--text-secondary)] cursor-pointer">Cancel</button>
                                <button type="submit" disabled={submitting} className="flex-1 py-3 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-lg cursor-pointer">
                                    {submitting ? 'Registering...' : 'Log Entry'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Visitor Detail Modal */}
            {selectedDetailVisitor && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in text-[var(--text-primary)]">
                    <div className="bg-[var(--bg-surface)] w-full max-w-2xl rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center shrink-0">
                            <div>
                                <h2 className="text-xl font-bold">Visitor Details</h2>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-medium">Comprehensive entry and registration history log.</p>
                            </div>
                            <button onClick={() => setSelectedDetailVisitor(null)} className="text-[var(--text-secondary)] hover:text-red-500 cursor-pointer border-none bg-transparent">
                                <XCircle size={24} />
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6 text-xs">
                            
                            {/* Visitor Status Card */}
                            <div className="p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 rounded-xl overflow-hidden flex items-center justify-center shadow-sm shrink-0 bg-slate-100 relative">
                                        {selectedDetailVisitor.profile_image ? (
                                            <img src={selectedDetailVisitor.profile_image} className="w-full h-full object-cover" alt="Visitor" />
                                        ) : (
                                            <div className={`w-full h-full flex items-center justify-center font-bold text-white uppercase ${
                                                selectedDetailVisitor.visitor_type === 'taxi' ? 'bg-amber-500' :
                                                selectedDetailVisitor.visitor_type === 'delivery' ? 'bg-blue-500' :
                                                selectedDetailVisitor.visitor_type === 'vehicle_registration' ? 'bg-purple-500' : 'bg-emerald-500'
                                            }`}>
                                                {selectedDetailVisitor.visitor_type === 'taxi' ? <Car size={24} /> :
                                                 selectedDetailVisitor.visitor_type === 'delivery' ? <Truck size={24} /> :
                                                 selectedDetailVisitor.visitor_type === 'vehicle_registration' ? <Car size={24} /> : <User size={24} />}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black">{selectedDetailVisitor.visitor_type === 'taxi' ? 'Taxi / Cab Driver' : `${selectedDetailVisitor.first_name} ${selectedDetailVisitor.last_name}`}</h3>
                                        <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded font-black uppercase tracking-wider block w-fit mt-1">
                                            {selectedDetailVisitor.visitor_type?.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <span className={`px-3 py-1.5 rounded-full text-xs font-black border uppercase tracking-wider ${
                                    selectedDetailVisitor.status === 'checked_in'
                                        ? 'bg-green-150 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-450'
                                        : selectedDetailVisitor.status === 'rejected'
                                        ? 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-450'
                                        : 'bg-slate-105 text-slate-650 border-slate-200 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                    {selectedDetailVisitor.status === 'checked_in' ? 'Active' : selectedDetailVisitor.status === 'rejected' ? 'Declined' : 'Checked Out'}
                                </span>
                            </div>

                            {/* Visitor Metadata Grid */}
                            <div>
                                <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Visitor Credentials</h4>
                                <div className="grid grid-cols-2 gap-4 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px]">FULL NAME</span>
                                        <span className="font-semibold">{selectedDetailVisitor.first_name} {selectedDetailVisitor.last_name}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px]">ID / PASSPORT / ADMISSION NO</span>
                                        <span className="font-mono font-semibold">{selectedDetailVisitor.id_number || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px]">MOBILE CONTACT</span>
                                        <span className="font-semibold">{selectedDetailVisitor.phone_number || 'N/A'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px]">GATE STATION</span>
                                        <span className="font-semibold">{selectedDetailVisitor.gate_name || 'Main Gate'}</span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px]">CHECKED IN AT</span>
                                        <span className="font-mono font-semibold">
                                            {selectedDetailVisitor.time_in ? new Date(selectedDetailVisitor.time_in).toLocaleString() : 'N/A'}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-slate-400 font-bold block text-[10px]">CHECKED OUT AT</span>
                                        <span className="font-mono font-semibold">
                                            {selectedDetailVisitor.time_out ? new Date(selectedDetailVisitor.time_out).toLocaleString() : '-'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Purpose and details */}
                            <div>
                                <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Visit Purpose / Host Details</h4>
                                <div className="p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)]">
                                    <p className="font-semibold whitespace-pre-wrap">{selectedDetailVisitor.visit_details || 'No details provided.'}</p>
                                </div>
                            </div>

                            {/* Additional Vehicle Registration / Taxi / Delivery fields */}
                            {(selectedDetailVisitor.plate_number || selectedDetailVisitor.passengers || selectedDetailVisitor.dropoff_admission_number || selectedDetailVisitor.delivery_image_package) && (
                                <div>
                                    <h4 className="font-bold text-[10px] uppercase text-slate-400 tracking-wider mb-2">Additional Specifications</h4>
                                    <div className="space-y-4">
                                        {/* Plate and Passengers */}
                                        {(selectedDetailVisitor.plate_number || selectedDetailVisitor.passengers) && (
                                            <div className="grid grid-cols-2 gap-4 bg-[var(--bg-primary)] p-4 rounded-xl border border-[var(--border-color)]">
                                                {selectedDetailVisitor.plate_number && (
                                                    <div>
                                                        <span className="text-slate-400 font-bold block text-[10px]">PLATE NUMBER</span>
                                                        <span className="font-mono font-black uppercase">{selectedDetailVisitor.plate_number}</span>
                                                    </div>
                                                )}
                                                {selectedDetailVisitor.passengers && (
                                                    <div>
                                                        <span className="text-slate-400 font-bold block text-[10px]">PASSENGERS COUNT</span>
                                                        <span className="font-semibold">{selectedDetailVisitor.passengers}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Taxi pick-up / drop-off student details */}
                                        {selectedDetailVisitor.dropoff_admission_number && (
                                            <div className="p-4 bg-amber-500/5 dark:bg-amber-950/10 border border-amber-500/20 rounded-xl space-y-3">
                                                <div className="font-bold text-amber-800 dark:text-amber-400 uppercase tracking-widest text-[9px]">
                                                    {selectedDetailVisitor.is_pickup ? 'Pick-up Passenger Details' : 'Drop-off Student Details'}
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-14 h-14 rounded-xl bg-slate-100 border overflow-hidden shrink-0 relative group">
                                                        <img 
                                                            src={`/api/users/verify/${selectedDetailVisitor.dropoff_admission_number}`} 
                                                            className="w-full h-full object-cover" 
                                                            onError={(e: any) => {
                                                                e.target.src = "/static/default_profile.jpg";
                                                            }}
                                                        />
                                                        <button 
                                                            type="button"
                                                            onClick={() => setPreviewImage(`/api/users/verify/${selectedDetailVisitor.dropoff_admission_number}`)}
                                                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity border-none cursor-pointer"
                                                        >
                                                            <Eye size={14} />
                                                        </button>
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-xs">{selectedDetailVisitor.dropoff_name || 'Student/Staff Member'}</div>
                                                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{selectedDetailVisitor.dropoff_admission_number}</div>
                                                        {selectedDetailVisitor.check_in_student && (
                                                            <span className="text-[9px] bg-emerald-100 text-emerald-805 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded font-black tracking-wider uppercase block w-fit mt-1.5">
                                                                Auto check-in student
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Delivery Details with photos */}
                                        {(selectedDetailVisitor.delivery_image_package || selectedDetailVisitor.delivery_image_receipt) && (
                                            <div className="p-4 bg-blue-500/5 dark:bg-blue-950/10 border border-blue-500/20 rounded-xl space-y-3">
                                                <div className="font-bold text-blue-800 dark:text-blue-400 uppercase tracking-widest text-[9px]">Delivery Images</div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {selectedDetailVisitor.delivery_image_package ? (
                                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-inner">
                                                            <img src={selectedDetailVisitor.delivery_image_package} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                <button
                                                                    onClick={() => setPreviewImage(selectedDetailVisitor.delivery_image_package)}
                                                                    className="p-2 bg-white text-slate-900 rounded-full hover:scale-105 transition-transform border-none cursor-pointer"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            </div>
                                                            <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[8px] px-1.5 py-0.5 rounded">Package</span>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video bg-slate-105 dark:bg-slate-900 rounded-xl flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-200">
                                                            No Package Photo
                                                        </div>
                                                    )}
                                                    {selectedDetailVisitor.delivery_image_receipt ? (
                                                        <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 group shadow-inner">
                                                            <img src={selectedDetailVisitor.delivery_image_receipt} className="w-full h-full object-cover" />
                                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                <button
                                                                    onClick={() => setPreviewImage(selectedDetailVisitor.delivery_image_receipt)}
                                                                    className="p-2 bg-white text-slate-900 rounded-full hover:scale-105 transition-transform border-none cursor-pointer"
                                                                >
                                                                    <Eye size={14} />
                                                                </button>
                                                            </div>
                                                            <span className="absolute bottom-1.5 left-1.5 bg-black/75 text-white text-[8px] px-1.5 py-0.5 rounded">Receipt / Note</span>
                                                        </div>
                                                    ) : (
                                                        <div className="aspect-video bg-slate-105 dark:bg-slate-900 rounded-xl flex items-center justify-center text-[10px] text-slate-400 border border-dashed border-slate-200">
                                                            No Receipt Photo
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Data deletion info */}
                            {selectedDetailVisitor.auto_delete_24h && (
                                <div className="p-3 bg-rose-500/5 dark:bg-rose-950/10 border border-rose-500/25 rounded-xl flex items-center gap-2">
                                    <AlertCircle className="text-rose-500 shrink-0" size={16} />
                                    <span className="text-[10px] text-rose-700 dark:text-rose-450 font-medium">
                                        Data Privacy: This visitor requested auto-scrub. Personal info is scheduled to delete 24 hours post check-out.
                                    </span>
                                </div>
                            )}
                        </div>
                        <div className="p-6 border-t border-[var(--border-color)] flex justify-end gap-3 shrink-0">
                            <button
                                onClick={() => setSelectedDetailVisitor(null)}
                                className="px-5 py-3 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl font-bold hover:bg-[var(--bg-surface)] cursor-pointer"
                            >
                                Close
                            </button>
                            {selectedDetailVisitor.status === 'checked_in' && (
                                <button
                                    onClick={() => {
                                        handleCheckOut(selectedDetailVisitor.id);
                                        setSelectedDetailVisitor(null);
                                    }}
                                    className="px-5 py-3 bg-red-650 text-white rounded-xl font-bold shadow-lg shadow-red-500/25 hover:opacity-90 cursor-pointer border-none"
                                >
                                    Check Out Visitor
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Zoom Image Preview Modal */}
            {previewImage && (
                <div 
                    onClick={() => setPreviewImage(null)}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 cursor-zoom-out animate-fade-in"
                >
                    <div className="relative max-w-2xl w-full aspect-auto bg-black rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
                        <img src={previewImage} className="w-full h-auto object-contain max-h-[85vh] mx-auto" />
                        <button 
                            onClick={() => setPreviewImage(null)}
                            className="absolute top-4 right-4 bg-black/70 hover:bg-black text-white p-2 rounded-full cursor-pointer"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
