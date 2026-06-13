import { useState, useEffect } from 'react'
import {
    BarChart3, Clock, Users, Car, Calendar, Search, Download, RefreshCw, Eye,
    Building, ArrowDownCircle, ArrowUpCircle, UserCheck, ClipboardList, TrendingUp
} from 'lucide-react'
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend, LineChart, Line, Cell
} from 'recharts'
import { UserDetailPanel } from './Users'

interface OverviewStats {
    avg_visitor_duration: number
    avg_vehicle_duration: number
    avg_user_duration: number
    daily_trends: Array<{
        date: string
        visitors: number
        vehicles: number
        users: number
    }>
    active_counts: {
        visitors: number
        vehicles: number
        users: number
    }
    exited_counts: {
        visitors: number
        vehicles: number
        users: number
    }
}

interface VehicleAnalyticsLog {
    id: string
    plate: string
    make: string
    model: string
    color: string
    driver_name: string
    driver_contact: string
    time_in: string
    time_out: string | null
    duration_minutes: number | null
    status: string
    purpose: string
    entry_gate: string
    exit_gate: string | null
}

interface UserAnalyticsLog {
    id: string
    full_name: string
    role: string
    email: string
    phone_number: string
    total_visits: number
    last_visit_time: string | null
    last_duration_minutes: number | null
    avg_duration_minutes: number | null
    currently_inside: boolean
}

export default function Analytics() {
    const [stats, setStats] = useState<OverviewStats | null>(null)
    const [vehicles, setVehicles] = useState<VehicleAnalyticsLog[]>([])
    const [users, setUsers] = useState<UserAnalyticsLog[]>([])
    const [visitors, setVisitors] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'overview' | 'visitors' | 'vehicles' | 'users'>('overview')
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedUser, setSelectedUser] = useState<any | null>(null)

    const fetchData = async () => {
        setLoading(true)
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }

        try {
            const [overviewRes, vehRes, usersRes, visitorLogsRes] = await Promise.all([
                fetch('/api/gate/analytics/overview', { headers }),
                fetch('/api/gate/analytics/vehicles', { headers }),
                fetch('/api/gate/analytics/users', { headers }),
                fetch('/api/gate/visitor-center/logs', { headers })
            ])

            if (overviewRes.ok) setStats(await overviewRes.json())
            if (vehRes.ok) setVehicles(await vehRes.json())
            if (usersRes.ok) setUsers(await usersRes.json())
            if (visitorLogsRes.ok) setVisitors(await visitorLogsRes.json())

        } catch (err) {
            console.error("Failed to fetch analytics data", err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const formatDuration = (mins: number | null | undefined) => {
        if (mins === null || mins === undefined) return '-'
        if (mins < 60) return `${Math.round(mins)}m`
        const hrs = Math.floor(mins / 60)
        const remMins = Math.round(mins % 60)
        return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`
    }

    const handleExportCSV = () => {
        let headers: string[] = []
        let rows: string[][] = []
        let filename = 'analytics'

        if (activeTab === 'visitors') {
            headers = ['Visitor Name', 'Type', 'ID Number', 'Contact', 'Checked In', 'Checked Out', 'Duration']
            rows = filteredVisitors.map(v => [
                v.visitor_name || 'Unknown',
                v.visitor_type || 'visitor',
                v.id_number || 'N/A',
                v.contact || 'N/A',
                v.time_in ? new Date(v.time_in).toLocaleString() : 'N/A',
                v.time_out ? new Date(v.time_out).toLocaleString() : 'N/A',
                v.time_in && v.time_out ? formatDuration(Math.round((new Date(v.time_out).getTime() - new Date(v.time_in).getTime()) / (1000 * 60))) : '-'
            ])
            filename = 'visitor_duration_analytics'
        } else if (activeTab === 'vehicles') {
            headers = ['License Plate', 'Make/Model', 'Driver Name', 'Contact', 'Entry Time', 'Exit Time', 'Duration']
            rows = filteredVehicles.map(v => [
                v.plate,
                `${v.make} ${v.model}`,
                v.driver_name,
                v.driver_contact,
                v.time_in ? new Date(v.time_in).toLocaleString() : 'N/A',
                v.time_out ? new Date(v.time_out).toLocaleString() : 'N/A',
                formatDuration(v.duration_minutes)
            ])
            filename = 'vehicle_stay_analytics'
        } else if (activeTab === 'users') {
            headers = ['User Name', 'Role', 'Email', 'Total Check-ins', 'Avg Stay Duration', 'Last Stay Duration']
            rows = filteredUsers.map(u => [
                u.full_name,
                u.role,
                u.email,
                u.total_visits.toString(),
                formatDuration(u.avg_duration_minutes),
                formatDuration(u.last_duration_minutes)
            ])
            filename = 'user_activity_stay_analytics'
        } else {
            return
        }

        const csvContent = "data:text/csv;charset=utf-8," 
            + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n')
        
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", `${filename}_${new Date().toISOString().split('T')[0]}.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Filters
    const filteredVisitors = visitors.filter(v => {
        const q = searchQuery.toLowerCase()
        return !q || (v.visitor_name || '').toLowerCase().includes(q) || (v.id_number || '').toLowerCase().includes(q) || (v.contact || '').toLowerCase().includes(q)
    })

    const filteredVehicles = vehicles.filter(v => {
        const q = searchQuery.toLowerCase()
        return !q || v.plate.toLowerCase().includes(q) || v.driver_name.toLowerCase().includes(q)
    })

    const filteredUsers = users.filter(u => {
        const q = searchQuery.toLowerCase()
        return !q || u.full_name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    })

    // Recharts Data Prep
    const overviewChartData = stats ? [
        { name: 'Visitors', avg: stats.avg_visitor_duration, color: '#10b981' },
        { name: 'Vehicles', avg: stats.avg_vehicle_duration, color: '#3b82f6' },
        { name: 'Users', avg: stats.avg_user_duration, color: '#8b5cf6' }
    ] : []

    return (
        <div className="space-y-8 animate-fade-in text-[var(--text-primary)]">
            {/* Header Section */}
            <div className="flex justify-between items-center bg-[var(--bg-surface)] border border-[var(--border-color)] p-6 rounded-2xl shadow-sm">
                <div>
                    <h2 className="text-3xl font-extrabold tracking-tight">Time Stay & Visit Analytics</h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-1">Detailed stay duration tracking and traffic analytics for university visitors, vehicles, and system users.</p>
                </div>
                <button
                    onClick={fetchData}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[var(--bg-primary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] font-bold rounded-xl text-xs active:scale-95 transition-all"
                >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Sync Analytics
                </button>
            </div>

            {/* Tabs Bar */}
            <div className="flex border-b border-[var(--border-color)]">
                {(['overview', 'visitors', 'vehicles', 'users'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setSearchQuery(''); }}
                        className={`px-6 py-3 border-b-2 font-bold text-sm capitalize transition-all border-transparent ${
                            activeTab === tab 
                                ? 'border-indigo-650 text-indigo-650 dark:text-indigo-400' 
                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && stats && (
                <div className="space-y-6">
                    {/* KPI Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="glass-card p-6 border-l-4 border-emerald-500 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Avg Visitor Duration</p>
                                <p className="text-3xl font-black text-emerald-600 mt-2">{formatDuration(stats.avg_visitor_duration)}</p>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">{stats.active_counts.visitors} currently inside</p>
                            </div>
                            <Users size={36} className="text-emerald-500/20" />
                        </div>
                        <div className="glass-card p-6 border-l-4 border-blue-500 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Avg Vehicle Duration</p>
                                <p className="text-3xl font-black text-blue-600 mt-2">{formatDuration(stats.avg_vehicle_duration)}</p>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">{stats.active_counts.vehicles} currently inside</p>
                            </div>
                            <Car size={36} className="text-blue-500/20" />
                        </div>
                        <div className="glass-card p-6 border-l-4 border-purple-500 flex justify-between items-center">
                            <div>
                                <p className="text-xs text-[var(--text-secondary)] font-bold uppercase tracking-wider">Avg User Stay</p>
                                <p className="text-3xl font-black text-purple-600 mt-2">{formatDuration(stats.avg_user_duration)}</p>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">{stats.active_counts.users} currently inside</p>
                            </div>
                            <Clock size={36} className="text-purple-500/20" />
                        </div>
                    </div>

                    {/* Chart Dashboard */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="glass-card p-6 border border-[var(--border-color)]">
                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                <BarChart3 size={16} className="text-indigo-500" /> Average Duration Comparison (mins)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={overviewChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                                        <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} />
                                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                                        <Bar dataKey="avg" radius={[8, 8, 0, 0]}>
                                            {overviewChartData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        <div className="glass-card p-6 border border-[var(--border-color)]">
                            <h3 className="text-sm font-bold mb-4 flex items-center gap-2">
                                <TrendingUp size={16} className="text-indigo-500" /> Stay Duration Trends (7 Days)
                            </h3>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={stats.daily_trends} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" opacity={0.5} />
                                        <XAxis dataKey="date" tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} />
                                        <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontWeight: 600 }} />
                                        <RechartsTooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                                        <Legend />
                                        <Line type="monotone" dataKey="visitors" name="Visitors" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
                                        <Line type="monotone" dataKey="vehicles" name="Vehicles" stroke="#3b82f6" strokeWidth={2} />
                                        <Line type="monotone" dataKey="users" name="Users (Staff/Students)" stroke="#8b5cf6" strokeWidth={2} />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab !== 'overview' && (
                <div className="glass-card p-0 border border-[var(--border-color)] overflow-hidden flex flex-col">
                    {/* Search & Export Actions */}
                    <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-surface)] flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={18} />
                            <input
                                type="text"
                                placeholder={`Search by name or identifier...`}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-primary)] text-sm outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-650 transition-all font-medium"
                            />
                        </div>
                        <button
                            onClick={handleExportCSV}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs cursor-pointer shadow-sm active:scale-95 transition-all shrink-0"
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>

                    {/* Visitors Tab Data */}
                    {activeTab === 'visitors' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4">Visitor</th>
                                        <th className="p-4">Category</th>
                                        <th className="p-4">ID/Passport</th>
                                        <th className="p-4">Check In</th>
                                        <th className="p-4">Check Out</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)] text-xs font-semibold">
                                    {filteredVisitors.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">No visitor stay records found.</td>
                                        </tr>
                                    ) : (
                                        filteredVisitors.map(v => {
                                            const duration = v.time_in && v.time_out
                                                ? Math.round((new Date(v.time_out).getTime() - new Date(v.time_in).getTime()) / (1000 * 60))
                                                : null
                                            return (
                                                <tr key={v.id} className="hover:bg-[var(--bg-primary)]/10 transition-colors">
                                                    <td className="p-4">
                                                        <div className="font-bold text-[var(--text-primary)]">{v.visitor_name}</div>
                                                        <div className="text-[10px] text-[var(--text-secondary)]">{v.contact || 'N/A'}</div>
                                                    </td>
                                                    <td className="p-4 capitalize">
                                                        <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-[10px]">
                                                            {v.visitor_type}
                                                        </span>
                                                    </td>
                                                    <td className="p-4 font-mono">{v.id_number || 'N/A'}</td>
                                                    <td className="p-4 text-[var(--text-secondary)]">{v.time_in ? new Date(v.time_in).toLocaleString() : '-'}</td>
                                                    <td className="p-4 text-[var(--text-secondary)]">{v.time_out ? new Date(v.time_out).toLocaleString() : '-'}</td>
                                                    <td className="p-4 font-mono font-bold text-indigo-650 dark:text-indigo-400">
                                                        {duration !== null ? formatDuration(duration) : (v.status === 'checked_in' ? 'Inside' : '-')}
                                                    </td>
                                                    <td className="p-4 capitalize">
                                                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                                                            v.status === 'checked_in' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                                                        }`}>
                                                            {v.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Vehicles Tab Data */}
                    {activeTab === 'vehicles' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4">Plate No.</th>
                                        <th className="p-4">Details</th>
                                        <th className="p-4">Driver</th>
                                        <th className="p-4">Entry Time</th>
                                        <th className="p-4">Exit Time</th>
                                        <th className="p-4">Duration</th>
                                        <th className="p-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)] text-xs font-semibold">
                                    {filteredVehicles.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">No vehicle stay logs found.</td>
                                        </tr>
                                    ) : (
                                        filteredVehicles.map(v => (
                                            <tr key={v.id} className="hover:bg-[var(--bg-primary)]/10 transition-colors">
                                                <td className="p-4 font-mono font-bold text-lg text-indigo-650 dark:text-indigo-400">{v.plate}</td>
                                                <td className="p-4">
                                                    <div className="font-bold">{v.make} {v.model}</div>
                                                    <div className="text-[10px] text-[var(--text-secondary)]">{v.color}</div>
                                                </td>
                                                <td className="p-4">
                                                    <div>{v.driver_name}</div>
                                                    <div className="text-[10px] text-[var(--text-secondary)]">{v.driver_contact}</div>
                                                </td>
                                                <td className="p-4 text-[var(--text-secondary)]">{v.time_in ? new Date(v.time_in).toLocaleString() : '-'}</td>
                                                <td className="p-4 text-[var(--text-secondary)]">{v.time_out ? new Date(v.time_out).toLocaleString() : '-'}</td>
                                                <td className="p-4 font-mono font-bold">
                                                    {formatDuration(v.duration_minutes)}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider ${
                                                        v.status === 'Parked' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-gray-500'
                                                    }`}>
                                                        {v.status.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Users Tab Data */}
                    {activeTab === 'users' && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="text-[10px] text-[var(--text-secondary)] uppercase bg-[var(--bg-primary)] border-b border-[var(--border-color)] font-black tracking-wider">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">Role</th>
                                        <th className="p-4">Total Visits</th>
                                        <th className="p-4">Last Visit</th>
                                        <th className="p-4">Avg Duration</th>
                                        <th className="p-4">Last Duration</th>
                                        <th className="p-4 text-center">Profile</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)] text-xs font-semibold">
                                    {filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">No user stay activity found.</td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map(u => (
                                            <tr key={u.id} className="hover:bg-[var(--bg-primary)]/10 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-bold text-[var(--text-primary)]">{u.full_name}</div>
                                                    <div className="text-[10px] text-[var(--text-secondary)]">{u.email}</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 font-bold text-[10px] uppercase">
                                                        {u.role}
                                                    </span>
                                                </td>
                                                <td className="p-4 font-mono font-bold text-center">{u.total_visits}</td>
                                                <td className="p-4 text-[var(--text-secondary)]">{u.last_visit_time ? new Date(u.last_visit_time).toLocaleString() : '-'}</td>
                                                <td className="p-4 font-mono font-bold text-purple-600 dark:text-purple-400">
                                                    {formatDuration(u.avg_duration_minutes)}
                                                </td>
                                                <td className="p-4 font-mono font-semibold">
                                                    {u.currently_inside ? (
                                                        <span className="text-green-500 font-black text-[9px] uppercase bg-green-50 dark:bg-green-950/20 px-2 py-0.5 rounded">Inside</span>
                                                    ) : (
                                                        formatDuration(u.last_duration_minutes)
                                                    )}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <button
                                                        onClick={() => setSelectedUser(u)}
                                                        className="text-slate-500 hover:text-indigo-650 p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer border-none bg-transparent"
                                                        title="Drill Down Profile Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* Profile Drill Down Modal */}
            {selectedUser && (
                <UserDetailPanel
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onRefresh={fetchData}
                />
            )}
        </div>
    )
}
