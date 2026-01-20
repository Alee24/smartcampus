import React, { useState, useEffect } from 'react'
import {
    Search, Plus, Filter, Download, User, Clock,
    CheckCircle, XCircle, LogOut, Phone, CreditCard, Building, MapPin
} from 'lucide-react'

export default function VisitorManagement() {
    const [visitors, setVisitors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
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

    useEffect(() => {
        fetchVisitors()
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

    const handleCheckOut = async (visitorId: string) => {
        if (!confirm("Confirm check out for this visitor?")) return

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

    const filteredVisitors = visitors.filter(v =>
        v.first_name.toLowerCase().includes(search.toLowerCase()) ||
        v.last_name.toLowerCase().includes(search.toLowerCase()) ||
        v.id_number.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">Visitor Management</h1>
                    <p className="text-[var(--text-secondary)]">Track and manage campus visitors securely.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => fetchVisitors()}
                        className="px-4 py-2 border border-[var(--border-color)] rounded-xl hover:bg-[var(--bg-surface)] text-[var(--text-secondary)]"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="px-4 py-2 bg-[var(--primary-color)] text-white rounded-xl shadow-lg shadow-indigo-500/20 hover:opacity-90 transition-all font-semibold flex items-center gap-2"
                    >
                        <Plus size={18} /> New Visitor
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h3 className="text-[var(--text-secondary)] font-medium mb-2 text-sm uppercase tracking-wider">Total Visitors</h3>
                    <div className="text-3xl font-bold">{stats.total_today}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Recorded Today</div>
                </div>
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h3 className="text-[var(--text-secondary)] font-medium mb-2 text-sm uppercase tracking-wider">Active Now</h3>
                    <div className="text-3xl font-bold text-green-600">{stats.active_now}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Currently on Campus</div>
                </div>
                <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)]">
                    <h3 className="text-[var(--text-secondary)] font-medium mb-2 text-sm uppercase tracking-wider">Checked Out</h3>
                    <div className="text-3xl font-bold text-gray-500">{stats.exited_today}</div>
                    <div className="text-xs text-[var(--text-secondary)] mt-1">Completed Visits</div>
                </div>
            </div>

            {/* Hourly Trends Chart */}
            <div className="glass-card p-6 rounded-2xl border border-[var(--border-color)]">
                <h3 className="text-[var(--text-secondary)] font-medium mb-6 text-sm uppercase tracking-wider">Hourly Traffic Trends</h3>
                <div className="h-40 flex items-end justify-between gap-1">
                    {stats.hourly && stats.hourly.map((count: number, i: number) => {
                        const max = Math.max(...(stats.hourly || []), 1);
                        const height = (count / max) * 100;
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative h-full justify-end">
                                <div
                                    className="w-full bg-[var(--primary-color)]/20 rounded-t-sm hover:bg-[var(--primary-color)] transition-all relative"
                                    style={{ height: `${height || 2}%` }}
                                >
                                    <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded z-10 whitespace-nowrap font-bold">
                                        {count} Visitors at {i.toString().padStart(2, '0')}:00
                                    </div>
                                </div>
                                <span className="text-[10px] text-[var(--text-secondary)] h-4">{i % 3 === 0 ? `${i}:00` : ''}</span>
                            </div>
                        )
                    })}
                    {!stats.hourly && <div className="w-full text-center text-[var(--text-secondary)]">Loading chart data...</div>}
                </div>
            </div>

            {/* Filters */}
            <div className="glass-card p-4 rounded-2xl flex flex-wrap gap-4 items-center">
                <div className="relative flex-1 min-w-[240px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name or ID..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl focus:ring-2 focus:ring-primary-500/20 outline-none"
                    />
                </div>
                {/* Add date filter later if needed */}
            </div>

            {/* Active Visitors Grid - Optional View */}

            {/* Table */}
            <div className="glass-card rounded-2xl overflow-hidden border border-[var(--border-color)]">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-surface)] border-b border-[var(--border-color)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                <th className="p-4 font-semibold">Visitor Details</th>
                                <th className="p-4 font-semibold">Contact</th>
                                <th className="p-4 font-semibold">Purpose / Host</th>
                                <th className="p-4 font-semibold">Time In</th>
                                <th className="p-4 font-semibold">Time Out</th>
                                <th className="p-4 font-semibold">Status</th>
                                <th className="p-4 font-semibold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr><td colSpan={7} className="p-8 text-center">Loading...</td></tr>
                            ) : filteredVisitors.length === 0 ? (
                                <tr><td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">No visitors found.</td></tr>
                            ) : (
                                filteredVisitors.map(visitor => (
                                    <tr key={visitor.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold">
                                                    {visitor.first_name[0]}{visitor.last_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-[var(--text-primary)]">{visitor.first_name} {visitor.last_name}</div>
                                                    <div className="text-xs text-[var(--text-secondary)] flex items-center gap-1">
                                                        <CreditCard size={12} /> {visitor.id_number}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-4 text-sm">
                                            <div className="flex items-center gap-2 text-[var(--text-secondary)]">
                                                <Phone size={14} /> {visitor.phone_number}
                                            </div>
                                        </td>
                                        <td className="p-4">
                                            <div className="text-sm font-medium">{visitor.visit_details}</div>
                                        </td>
                                        <td className="p-4 text-sm font-mono text-[var(--text-secondary)]">
                                            {new Date(visitor.time_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </td>
                                        <td className="p-4 text-sm font-mono text-[var(--text-secondary)]">
                                            {visitor.time_out ? new Date(visitor.time_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${visitor.status === 'checked_in'
                                                ? 'bg-green-100 text-green-700 border-green-200'
                                                : 'bg-gray-100 text-gray-600 border-gray-200'
                                                }`}>
                                                {visitor.status === 'checked_in' ? 'Active' : 'Checked Out'}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {visitor.status === 'checked_in' && (
                                                <button
                                                    onClick={() => handleCheckOut(visitor.id)}
                                                    className="px-3 py-1 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg text-xs font-semibold border border-red-200 transition-colors"
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

            {/* Add Modal */}
            {
                showAddModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                        <div className="bg-[var(--bg-surface)] w-full max-w-lg rounded-2xl shadow-2xl border border-[var(--border-color)] overflow-hidden animate-scale-in">
                            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                                <h2 className="text-xl font-bold">Register New Visitor</h2>
                                <button onClick={() => setShowAddModal(false)} className="text-[var(--text-secondary)] hover:text-red-500"><XCircle size={24} /></button>
                            </div>
                            <form onSubmit={handleCheckIn} className="p-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium mb-1">First Name</label>
                                        <input required type="text" className="w-full p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]"
                                            value={formData.first_name} onChange={e => setFormData({ ...formData, first_name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium mb-1">Last Name</label>
                                        <input required type="text" className="w-full p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]"
                                            value={formData.last_name} onChange={e => setFormData({ ...formData, last_name: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">National ID / Passport</label>
                                    <input required type="text" className="w-full p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]"
                                        value={formData.id_number} onChange={e => setFormData({ ...formData, id_number: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Phone Number</label>
                                    <input required type="tel" className="w-full p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]"
                                        value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Visit Purpose / Host</label>
                                    <textarea required className="w-full p-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)]" rows={3}
                                        placeholder="e.g. Meeting with Dr. X in Office 202"
                                        value={formData.visit_details} onChange={e => setFormData({ ...formData, visit_details: e.target.value })} />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    <button type="button" onClick={() => setShowAddModal(false)} className="flex-1 py-3 bg-[var(--bg-primary)] rounded-xl font-bold text-[var(--text-secondary)]">Cancel</button>
                                    <button type="submit" disabled={submitting} className="flex-1 py-3 bg-[var(--primary-color)] text-white rounded-xl font-bold shadow-lg">
                                        {submitting ? 'Registering...' : 'Log Entry'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    )
}
