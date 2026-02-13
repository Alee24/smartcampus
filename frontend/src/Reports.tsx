import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { FileText, Users, Activity, Car, Clock } from 'lucide-react'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6']

export default function Reports() {
    const [summary, setSummary] = useState<any>(null)
    const [weeklyTraffic, setWeeklyTraffic] = useState<any[]>([])
    const [gateDist, setGateDist] = useState<any[]>([])
    const [userRoles, setUserRoles] = useState<any[]>([])
    const [peakHours, setPeakHours] = useState<any[]>([])
    const [securityFlags, setSecurityFlags] = useState<any[]>([])
    const [activeSection, setActiveSection] = useState('overview')

    useEffect(() => {
        const fetchData = async () => {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            try {
                const resSum = await fetch('/api/reports/summary', { headers })
                if (resSum.ok) {
                    setSummary(await resSum.json())
                } else {
                    console.error("Summary fetch failed:", resSum.status)
                    setSummary({ error: true }) // Force render to show error
                }
                const resWeekly = await fetch('/api/reports/traffic/weekly', { headers })
                if (resWeekly.ok) setWeeklyTraffic(await resWeekly.json())

                const resGate = await fetch('/api/reports/traffic/gate', { headers })
                if (resGate.ok) setGateDist(await resGate.json())

                const resRoles = await fetch('/api/reports/users/roles', { headers })
                if (resRoles.ok) setUserRoles(await resRoles.json())

                const resPeak = await fetch('/api/reports/traffic/peak-hours', { headers })
                if (resPeak.ok) setPeakHours(await resPeak.json())

                const resFlags = await fetch('/api/reports/security/flags', { headers })
                if (resFlags.ok) setSecurityFlags(await resFlags.json())
            } catch (e) {
                console.error("Fetch Error:", e)
                setSummary({ error: true })
            }
        }
        fetchData()
    }, [])

    if (summary?.error) return <div className="p-8 text-center text-red-500">Failed to load reports. Check console/network logs.</div>
    if (!summary) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading reports...</div>

    return (
        <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold">System Reports</h2>
                    <p className="text-[var(--text-secondary)]">Comprehensive analytics across the campus.</p>
                </div>
                <div className="flex gap-2">
                    {['Overview', 'Traffic', 'Security'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setActiveSection(s.toLowerCase())}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${activeSection === s.toLowerCase()
                                ? 'bg-[var(--primary-color)] text-white'
                                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)]'}`}
                        >
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Users" value={summary.total_users} icon={<Users size={20} />} color="blue" />
                <StatCard title="Total Entries" value={summary.total_entries} icon={<FileText size={20} />} color="indigo" />
                <StatCard title="Today's Entries" value={summary.entries_today} icon={<Activity size={20} />} color="green" />
                <StatCard title="Vehicles Parked" value={summary.vehicles_parked} icon={<Car size={20} />} color="amber" />
                <StatCard title="Attendance Records" value={summary.total_attendance_records} icon={<Clock size={20} />} color="purple" />
            </div>

            {/* Main Content Area */}
            {activeSection === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weekly Traffic Line Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Weekly Entry Volume</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyTraffic}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }} />
                                    <Area type="monotone" dataKey="count" stroke="#4F46E5" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* User Distribution Pie Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">User Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={userRoles}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {userRoles.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'traffic' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gate Distribution Bar Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Traffic by Gate</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gateDist} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={12} width={100} />
                                    <Tooltip cursor={{ fill: 'var(--bg-primary)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }} />
                                    <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Peak Hours Bar Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Peak Traffic Hours</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakHours}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="hour" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                    <Tooltip cursor={{ fill: 'var(--bg-primary)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }} />
                                    <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'security' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Access Status Breakdown</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={securityFlags}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                        label
                                    >
                                        {securityFlags.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.status === 'allowed' ? '#10B981' : '#EF4444'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* Add more security widgets here */}
                </div>
            )}
        </div>
    )
}

function StatCard({ title, value, icon, color }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-100 text-blue-600',
        green: 'bg-green-100 text-green-600',
        amber: 'bg-amber-100 text-amber-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        purple: 'bg-purple-100 text-purple-600',
        red: 'bg-red-100 text-red-600'
    }

    return (
        <div className="glass-card p-4 flex flex-col justify-between h-full hover:scale-105 transition-transform">
            <div className="flex justify-between items-start mb-2">
                <span className="text-[var(--text-secondary)] text-sm font-medium">{title}</span>
                <span className={`p-2 rounded-lg ${colorClasses[color] || 'bg-gray-100'}`}>
                    {icon}
                </span>
            </div>
            <div className="text-2xl font-bold">{value !== undefined ? value : '-'}</div>
        </div>
    )
}
