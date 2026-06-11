import React, { useState, useEffect } from 'react'
import {
    Search, Plus, Filter, Download, User, Clock,
    CheckCircle, XCircle, LogOut, Phone, CreditCard, Building, MapPin,
    Car, Truck, Shield, AlertCircle, Eye, Check, X
} from 'lucide-react'
import { useNotification } from './components/Notification'

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
                                            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-white shadow-sm ${
                                                req.visitor_type === 'taxi' ? 'bg-amber-500' :
                                                req.visitor_type === 'delivery' ? 'bg-blue-500' :
                                                req.visitor_type === 'vehicle_registration' ? 'bg-purple-500' : 'bg-emerald-500'
                                            }`}>
                                                {req.visitor_type === 'taxi' ? <Car size={20} /> :
                                                 req.visitor_type === 'delivery' ? <Truck size={20} /> :
                                                 req.visitor_type === 'vehicle_registration' ? <Car size={20} /> : <User size={20} />}
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
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white uppercase ${
                                                        visitor.visitor_type === 'taxi' ? 'bg-amber-500' :
                                                        visitor.visitor_type === 'delivery' ? 'bg-blue-500' :
                                                        visitor.visitor_type === 'vehicle_registration' ? 'bg-purple-500' : 'bg-emerald-500'
                                                    }`}>
                                                        {visitor.first_name?.[0] || 'V'}{visitor.last_name?.[0] || ''}
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
                                                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-slate-800 dark:text-slate-200">
                                                        {visitor.plate_number}
                                                    </span>
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
                                                {visitor.status === 'checked_in' && (
                                                    <button
                                                        onClick={() => handleCheckOut(visitor.id)}
                                                        className="px-3 py-1 bg-red-50 text-red-650 hover:bg-red-100 rounded-lg text-xs font-semibold border border-red-200 transition-colors cursor-pointer"
                                                    >
                                                        Check Out
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
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
