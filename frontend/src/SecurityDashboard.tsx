import { useState, useEffect } from 'react'
import { Shield, ScanLine, Car, AlertTriangle, UserCheck, LogIn, LogOut, Search, Video, Siren } from 'lucide-react'

interface SecurityDashboardProps {
    onNavigate: (tab: string) => void;
}

export default function SecurityDashboard({ onNavigate }: SecurityDashboardProps) {
    const [stats, setStats] = useState({
        people_in_campus: 0,
        vehicles_in_campus: 0,
        active_alerts: 0,
        open_gates: 2
    })
    const [recentLogs, setRecentLogs] = useState<any[]>([])

    // Mock data for initial render, then fetch
    useEffect(() => {
        // Fetch stats
        const fetchStats = async () => {
            try {
                const token = localStorage.getItem('token')
                // Use dashboard stats endpoint
                const res = await fetch('/api/dashboard/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    // Transform for security view
                    setStats({
                        people_in_campus: data.active_students || 124, // Mock current count if not in API
                        vehicles_in_campus: data.vehicles_parked || 0,
                        active_alerts: data.security_alerts || 0,
                        open_gates: 2
                    })
                }

                // Fetch recent logs
                const logRes = await fetch('/api/dashboard/recent-logs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (logRes.ok) {
                    setRecentLogs(await logRes.json())
                }
            } catch (e) { console.error(e) }
        }

        fetchStats()
        // Poll every 30s
        const interval = setInterval(fetchStats, 30000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="animate-fade-in max-w-7xl mx-auto pb-10">
            {/* Header / Status Bar */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
                        <Shield className="text-blue-600" size={32} />
                        Security Operations Center
                    </h1>
                    <p className="text-[var(--text-secondary)]">Real-time monitoring and access control.</p>
                </div>

                {/* Status Indicator */}
                <div className="flex items-center gap-4 bg-[var(--bg-surface)] p-3 rounded-xl border border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${stats.active_alerts > 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`}></div>
                        <span className="font-bold text-sm uppercase">{stats.active_alerts > 0 ? 'Threat Detected' : 'System Secure'}</span>
                    </div>
                </div>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <button
                    onClick={() => onNavigate('gate')}
                    className="p-6 bg-gradient-to-br from-blue-600 to-blue-800 text-white rounded-2xl shadow-lg hover:shadow-blue-500/25 transition-all hover:-translate-y-1 group"
                >
                    <div className="mb-3 p-3 bg-white/10 w-fit rounded-xl group-hover:scale-110 transition-transform">
                        <ScanLine size={32} />
                    </div>
                    <h3 className="font-bold text-lg">Scan Entry</h3>
                    <p className="text-blue-100 text-xs mt-1">Verify ID or QR Code</p>
                </button>

                <button
                    onClick={() => onNavigate('vehicles')}
                    className="p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm hover:border-blue-500/50 transition-all hover:-translate-y-1 group"
                >
                    <div className="mb-3 p-3 bg-orange-100 text-orange-600 w-fit rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <Car size={32} />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">Vehicle Check</h3>
                    <p className="text-[var(--text-secondary)] text-xs mt-1">Log vehicle movement</p>
                </button>

                <button
                    onClick={() => onNavigate('cameras')}
                    className="p-6 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-2xl shadow-sm hover:border-blue-500/50 transition-all hover:-translate-y-1 group"
                >
                    <div className="mb-3 p-3 bg-purple-100 text-purple-600 w-fit rounded-xl group-hover:bg-purple-600 group-hover:text-white transition-colors">
                        <Video size={32} />
                    </div>
                    <h3 className="font-bold text-lg text-[var(--text-primary)]">CCTV Monitor</h3>
                    <p className="text-[var(--text-secondary)] text-xs mt-1">View active feeds</p>
                </button>

                <button
                    onClick={() => alert("Panic Button Pressed! Logging Incident...")}
                    className="p-6 bg-[var(--bg-surface)] border border-red-200 rounded-2xl shadow-sm hover:bg-red-50 hover:border-red-500 transition-all hover:-translate-y-1 group"
                >
                    <div className="mb-3 p-3 bg-red-100 text-red-600 w-fit rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                        <Siren size={32} />
                    </div>
                    <h3 className="font-bold text-lg text-red-700">Panic Alert</h3>
                    <p className="text-red-500 text-xs mt-1">Trigger lockdown</p>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Live Stats */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="glass-card p-6">
                        <h3 className="font-bold text-lg mb-4 text-[var(--text-primary)]">Campus Occupancy</h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
                                        <UserCheck size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">People Inside</p>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.people_in_campus}</p>
                                    </div>
                                </div>
                                <div className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded">+12%</div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-xl">
                                        <Car size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Vehicles</p>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.vehicles_in_campus}</p>
                                    </div>
                                </div>
                                <div className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded">Normal</div>
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-xl">
                                        <AlertTriangle size={24} />
                                    </div>
                                    <div>
                                        <p className="text-sm text-[var(--text-secondary)]">Active Threats</p>
                                        <p className="text-2xl font-bold text-[var(--text-primary)]">{stats.active_alerts}</p>
                                    </div>
                                </div>
                                {stats.active_alerts > 0 && <div className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded font-bold">ACTION REQ</div>}
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-6 bg-gradient-to-br from-[var(--bg-surface)] to-blue-50/50 dark:to-blue-900/10">
                        <h3 className="font-bold text-lg mb-4 text-[var(--text-primary)]">Shift Info</h3>
                        <div className="flex justify-between text-sm mb-2">
                            <span className="text-[var(--text-secondary)]">Current Shift</span>
                            <span className="font-bold">Day Shift (06:00 - 18:00)</span>
                        </div>
                        <div className="flex justify-between text-sm mb-4">
                            <span className="text-[var(--text-secondary)]">Guard Commander</span>
                            <span className="font-bold">Sgt. Kiprop</span>
                        </div>
                        <button className="w-full py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800">
                            View Roster
                        </button>
                    </div>
                </div>

                {/* Recent Activity Log */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-lg text-[var(--text-primary)]">Recent Gate Activity</h3>
                        <button
                            onClick={() => onNavigate('gate')}
                            className="text-sm text-blue-600 font-medium hover:underline flex items-center gap-1"
                        >
                            View All <Search size={14} />
                        </button>
                    </div>

                    <div className="space-y-4">
                        {recentLogs.length === 0 ? (
                            <div className="text-center py-10 text-[var(--text-secondary)]">
                                <p>No visible activity recently.</p>
                            </div>
                        ) : (
                            recentLogs.slice(0, 5).map((log, i) => (
                                <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-[var(--bg-primary)] transition-colors group">
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-full ${log.status === 'Entry' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                            {log.status === 'Entry' ? <LogIn size={18} /> : <LogOut size={18} />}
                                        </div>
                                        <div>
                                            <p className="font-bold text-[var(--text-primary)]">{log.user}</p>
                                            <p className="text-xs text-[var(--text-secondary)]">{log.time} • {log.gate_name || 'Main Gate'}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${log.isAlert ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                                            }`}>
                                            {log.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
