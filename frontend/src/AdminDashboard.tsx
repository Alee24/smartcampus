import React, { useState, useEffect } from 'react';
import { 
    Users, Car, Shield, Activity, Calendar, LayoutDashboard, 
    ArrowUpRight, ArrowDownRight, FileText, Database, 
    TrendingUp, ShieldCheck, AlertTriangle, ChevronRight, Bus,
    CheckCircle2, Clock, MapPin, Search, Phone, X
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
    Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell 
} from 'recharts';

export default function AdminDashboard({ onNavigate }: { onNavigate: (tab: string) => void }) {
    const [stats, setStats] = useState<any>({});
    const [kpiData, setKpiData] = useState<any>({});
    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [analytics, setAnalytics] = useState<any>({ roles: [], gates: [] });
    const [liveStats, setLiveStats] = useState<any>(null);
    const [syncingAD, setSyncingAD] = useState(false);
    const [showActiveTrips, setShowActiveTrips] = useState(false);
    const [chartType, setChartType] = useState<'area' | 'bar'>('area');

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            const [sRes, kRes, lRes, aRes, liveRes] = await Promise.all([
                fetch('/api/dashboard/stats', { headers }),
                fetch('/api/dashboard/kpi', { headers }),
                fetch('/api/dashboard/recent-logs', { headers }),
                fetch('/api/dashboard/analytics', { headers }),
                fetch('/api/dashboard/live-monitor-stats', { headers })
            ]);

            if (sRes.ok) setStats(await sRes.json());
            if (kRes.ok) setKpiData(await kRes.json());
            if (lRes.ok) setRecentLogs(await lRes.json());
            if (aRes.ok) setAnalytics(await aRes.json());
            if (liveRes.ok) setLiveStats(await liveRes.json());
        } catch (e) { console.error('Dashboard fetch error', e); }
    };

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 15000);
        return () => clearInterval(interval);
    }, []);

    const handleSyncAD = async () => {
        setSyncingAD(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/admin/sync-ad', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
            });
            const result = await res.json();
            if (result.status === 'success') {
                alert(`✅ AD Synchronization Complete!\n${result.message}\nNew accounts created: ${result.new_accounts_count}`);
                fetchDashboardData();
            } else {
                alert(result.message || 'Synchronization failed');
            }
        } catch (e: any) {
            alert(`❌ Sync Error: ${e.message}`);
        } finally {
            setSyncingAD(false);
        }
    };

    const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header & Quick Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 dark:text-white">Executive Dashboard</h2>
                    <p className="text-sm text-gray-500">Real-time overview of campus security, traffic, and academics.</p>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={handleSyncAD}
                        disabled={syncingAD}
                        className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-bold flex items-center gap-2 transition-all text-sm"
                    >
                        <Database size={16} className={syncingAD ? "animate-spin" : ""} />
                        {syncingAD ? "Syncing..." : "Sync AD"}
                    </button>
                    <button 
                        onClick={() => onNavigate('reports')}
                        className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-indigo-500/30 transition-all text-sm hover:scale-105"
                    >
                        <FileText size={16} />
                        View Full Reports
                    </button>
                </div>
            </div>

            {/* Primary KPI Row */}
            {liveStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="glass-card p-5 border-l-4 border-indigo-500">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Active Students</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.active_students || 0}</p>
                            </div>
                            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Users size={20} /></div>
                        </div>
                    </div>
                    <div className="glass-card p-5 border-l-4 border-emerald-500">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Students Inside</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{liveStats.students.inside}</p>
                            </div>
                            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><CheckCircle2 size={20} /></div>
                        </div>
                    </div>
                    <div className="glass-card p-5 border-l-4 border-blue-500">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Vehicles Inside</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{liveStats.vehicles.inside}</p>
                            </div>
                            <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Car size={20} /></div>
                        </div>
                    </div>
                    <div
                        onClick={() => {
                            if (liveStats.fleet.active_trips && liveStats.fleet.active_trips.length > 0) {
                                setShowActiveTrips(true);
                            }
                        }}
                        className={`glass-card p-5 border-l-4 border-orange-500 relative transition-all ${
                            liveStats.fleet.active_trips && liveStats.fleet.active_trips.length > 0
                                ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02] bg-gradient-to-br from-white to-orange-50/10'
                                : ''
                        }`}
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <div className="flex items-center gap-1.5">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Fleet Active</p>
                                    {liveStats.fleet.active_trips && liveStats.fleet.active_trips.length > 0 && (
                                        <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" title="Ongoing Trip Active" />
                                    )}
                                </div>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                                    {liveStats.fleet.buses_on_trip || 0} <span className="text-xs text-gray-400 font-bold">On Trip</span>
                                </p>
                                {liveStats.fleet.active_trips && liveStats.fleet.active_trips.length > 0 && (
                                    <p className="text-[10px] font-bold text-orange-600 animate-pulse mt-0.5">Click to view details</p>
                                )}
                            </div>
                            <div className={`p-2.5 rounded-xl transition-all ${
                                liveStats.fleet.active_trips && liveStats.fleet.active_trips.length > 0
                                    ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                    : 'bg-orange-50 text-orange-600'
                            }`}
                            style={
                                liveStats.fleet.active_trips && liveStats.fleet.active_trips.length > 0
                                    ? { animation: 'pulse-bus 2s infinite' }
                                    : {}
                            }>
                                <Bus size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5 border-l-4 border-purple-500">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Security Alerts</p>
                                <p className="text-2xl font-black text-red-600 mt-1">{stats.security_alerts || 0}</p>
                            </div>
                            <div className="p-2 bg-red-50 rounded-lg text-red-600"><Shield size={20} /></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Secondary Stats Row - Incidents & Notices */}
            {liveStats?.incidents !== undefined && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`glass-card p-5 border-l-4 ${
                        liveStats.incidents.high_severity > 0 ? 'border-red-600' : 'border-yellow-500'
                    }`}>
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Incidents</p>
                                <p className={`text-2xl font-black mt-1 ${
                                    liveStats.incidents.total_active > 0 ? 'text-red-600' : 'text-gray-900 dark:text-white'
                                }`}>{liveStats.incidents.total_active}</p>
                                {liveStats.incidents.high_severity > 0 && (
                                    <p className="text-[10px] font-bold text-red-500 flex items-center gap-1 mt-1">
                                        <AlertTriangle size={10} />
                                        {liveStats.incidents.high_severity} High Severity
                                    </p>
                                )}
                            </div>
                            <div className={`p-2 rounded-lg ${
                                liveStats.incidents.high_severity > 0 ? 'bg-red-100 text-red-600' : 'bg-yellow-50 text-yellow-600'
                            }`}>
                                <ShieldCheck size={20} />
                            </div>
                        </div>
                    </div>
                    <div className="glass-card p-5 border-l-4 border-teal-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Gate Entries Today</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stats.gate_entries_today || 0}</p>
                            </div>
                            <div className="p-2 bg-teal-50 rounded-lg text-teal-600"><Activity size={20} /></div>
                        </div>
                    </div>
                    <div className="glass-card p-5 border-l-4 border-sky-500">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Notices (30d)</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white mt-1">{liveStats.notices?.total_active ?? 0}</p>
                            </div>
                            <div className="p-2 bg-sky-50 rounded-lg text-sky-600"><FileText size={20} /></div>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Left Column: Charts */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Weekly Traffic Chart with toggle */}
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <TrendingUp size={18} className="text-indigo-500" /> Previous 7 Days Traffic Report
                            </h3>
                            <div className="flex items-center gap-2">
                                <div className="flex rounded-lg bg-gray-100 dark:bg-gray-800 p-0.5">
                                    <button
                                        onClick={() => setChartType('area')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                            chartType === 'area'
                                                ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Area
                                    </button>
                                    <button
                                        onClick={() => setChartType('bar')}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                                            chartType === 'bar'
                                                ? 'bg-white dark:bg-gray-700 text-indigo-600 shadow-sm'
                                                : 'text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        Bar
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="h-[300px]">
                            {kpiData.details ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    {chartType === 'area' ? (
                                        <AreaChart data={kpiData.labels.map((l: any, i: any) => ({
                                            name: l,
                                            people: kpiData.details.people[i],
                                            vehicles: kpiData.details.vehicles[i]
                                        }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <defs>
                                                <linearGradient id="colorPeople" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                                                </linearGradient>
                                                <linearGradient id="colorVehicles" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3}/>
                                                    <stop offset="95%" stopColor="#14b8a6" stopOpacity={0}/>
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.1)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' }}
                                                labelStyle={{ fontWeight: 'bold', color: '#333' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                                            <Area type="monotone" dataKey="people" name="People Entries" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPeople)" />
                                            <Area type="monotone" dataKey="vehicles" name="Vehicle Entries" stroke="#14b8a6" strokeWidth={3} fillOpacity={1} fill="url(#colorVehicles)" />
                                        </AreaChart>
                                    ) : (
                                        <BarChart data={kpiData.labels.map((l: any, i: any) => ({
                                            name: l,
                                            people: kpiData.details.people[i],
                                            vehicles: kpiData.details.vehicles[i]
                                        }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.1)" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 11, fill: '#888' }} axisLine={false} tickLine={false} />
                                            <RechartsTooltip
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                                labelStyle={{ fontWeight: 'bold', color: '#333' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} iconType="circle" />
                                            <Bar dataKey="people" name="People Entries" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="vehicles" name="Vehicle Entries" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    )}
                                </ResponsiveContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">Loading chart...</div>
                            )}
                        </div>
                    </div>

                    {/* Detailed Deep Dive Row */}
                    {liveStats && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Gender Distribution & Events */}
                            <div className="glass-card p-6">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                                    <Users size={18} className="text-pink-500" /> Student Demographics (Inside)
                                </h3>
                                <div className="h-[200px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Male', value: liveStats.students.gender.male },
                                                    { name: 'Female', value: liveStats.students.gender.female },
                                                    { name: 'Other', value: liveStats.students.gender.other }
                                                ]}
                                                cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value"
                                            >
                                                <Cell fill="#3b82f6" />
                                                <Cell fill="#ec4899" />
                                                <Cell fill="#9ca3af" />
                                            </Pie>
                                            <RechartsTooltip contentStyle={{ borderRadius: '8px' }} />
                                            <Legend iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Fleet Breakdown */}
                            <div className="glass-card p-6">
                                <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                                    <Bus size={18} className="text-orange-500" /> Fleet Management Status
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/10 rounded-xl">
                                        <span className="text-sm font-bold text-orange-700 dark:text-orange-400">Total Buses</span>
                                        <span className="text-lg font-black text-orange-700 dark:text-orange-400">{liveStats.fleet.buses_total}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                                        <span className="text-sm font-bold text-gray-600 dark:text-gray-400">Buses in University</span>
                                        <span className="text-lg font-black text-gray-800 dark:text-gray-200">{liveStats.fleet.buses_inside}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl">
                                        <span className="text-sm font-bold text-indigo-700 dark:text-indigo-400">Buses on Trip (Left)</span>
                                        <span className="text-lg font-black text-indigo-700 dark:text-indigo-400">{liveStats.fleet.buses_on_trip}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/10 rounded-xl">
                                        <span className="text-sm font-bold text-purple-700 dark:text-purple-400">Planned Trips</span>
                                        <span className="text-lg font-black text-purple-700 dark:text-purple-400">{liveStats.fleet.trips_planned}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Column: Activity Feed & Gates */}
                <div className="space-y-6">
                    {/* Vehicles Breakdown */}
                    {liveStats && (
                        <div className="glass-card p-6">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 mb-4">
                                <Car size={18} className="text-emerald-500" /> Today's Vehicle Traffic
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="text-center p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/20">
                                    <p className="text-3xl font-black text-emerald-600 mb-1">{liveStats.vehicles.inside}</p>
                                    <p className="text-[10px] font-bold text-emerald-800 uppercase">In Building</p>
                                </div>
                                <div className="text-center p-4 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-100 dark:border-rose-900/20">
                                    <p className="text-3xl font-black text-rose-600 mb-1">{liveStats.vehicles.checked_out_today}</p>
                                    <p className="text-[10px] font-bold text-rose-800 uppercase">Checked Out</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Live Activity Feed */}
                    <div className="glass-card p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Activity size={18} className="text-blue-500" /> Recent Activity
                            </h3>
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                        </div>
                        <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                            {recentLogs.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-4">No recent activity</p>
                            ) : (
                                recentLogs.map((log, i) => (
                                    <div key={i} className={`flex gap-3 p-3 rounded-xl transition-colors ${
                                        log.is_flagged
                                            ? 'bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30'
                                            : 'bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100'
                                    }`}>
                                        <div className={`p-2 rounded-lg shrink-0 ${log.isAlert || log.is_flagged ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {log.isAlert || log.is_flagged ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
                                        </div>
                                        <div>
                                            <p className={`text-xs font-bold flex items-center gap-1.5 ${
                                                log.is_flagged ? 'text-red-700 dark:text-red-400' : 'text-gray-900 dark:text-gray-100'
                                            }`}>
                                                {log.user}
                                                {log.is_flagged && (
                                                    <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white">FLAGGED</span>
                                                )}
                                            </p>
                                            <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                                                <Clock size={10} /> {log.time} • {log.status}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Active Trips Details Modal */}
            {showActiveTrips && liveStats?.fleet?.active_trips && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in text-left">
                    <style>{`
                        @keyframes pulse-bus {
                            0%, 100% {
                                transform: scale(1);
                                box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
                            }
                            50% {
                                transform: scale(1.08);
                                box-shadow: 0 0 0 8px rgba(249, 115, 22, 0);
                            }
                        }
                    `}</style>
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative border border-gray-100 dark:border-gray-800 animate-slide-up max-h-[90vh] overflow-y-auto">
                        <button 
                            onClick={() => setShowActiveTrips(false)} 
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 dark:hover:text-white bg-gray-50 dark:bg-gray-800 rounded-full p-2 transition-all"
                        >
                            <X size={18} />
                        </button>
                        
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-orange-500 text-white rounded-2xl shadow-lg shadow-orange-500/20">
                                <Bus size={24} className="animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900 dark:text-white">Active Fleet Movements</h3>
                                <p className="text-xs text-orange-600 font-bold animate-pulse">Real-Time Campus Transit Tracking</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {liveStats.fleet.active_trips.map((trip: any, idx: number) => (
                                <div key={trip.id || idx} className="p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
                                    {/* Large Passenger Bus Graphic */}
                                    <div className="relative flex flex-col items-center justify-center bg-orange-50 dark:bg-orange-950/20 p-6 rounded-2xl border border-orange-100/55 dark:border-orange-950/30 mb-5">
                                        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent animate-pulse" />
                                        <div className="relative">
                                            <Bus size={64} className="text-orange-500 animate-bounce" style={{ animationDuration: '2.5s' }} />
                                            <div className="absolute -top-2 -right-6 bg-orange-600 text-white text-xs font-black px-3 py-1 rounded-full border-2 border-white dark:border-gray-900 shadow-lg flex items-center gap-1.5 animate-pulse">
                                                <Users size={12} />
                                                <span>{trip.passenger_count} Passengers</span>
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-black text-orange-700 dark:text-orange-400 uppercase tracking-widest mt-4">Capacity Load Active</span>
                                    </div>

                                    {/* Trip Detail Block */}
                                    <div className="space-y-4">
                                        <div>
                                            <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300">
                                                ONGOING TRIP
                                            </span>
                                            <h4 className="text-base font-black text-gray-900 dark:text-white mt-2 flex items-center gap-2 flex-wrap">
                                                {trip.origin} 
                                                <ChevronRight size={14} className="text-gray-400 shrink-0" /> 
                                                <span className="text-orange-600">{trip.destination}</span>
                                            </h4>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-bold">Purpose: {trip.purpose}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                                            {/* Driver Details */}
                                            <div className="p-3 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Driver Details</p>
                                                <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200">{trip.driver_name}</p>
                                                <a 
                                                    href={`tel:${trip.driver_contact}`} 
                                                    className="inline-flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline mt-1 font-bold"
                                                >
                                                    <Phone size={10} />
                                                    {trip.driver_contact}
                                                </a>
                                            </div>

                                            {/* Trip Lead Details */}
                                            <div className="p-3 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-100 dark:border-gray-700/50">
                                                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">Trip Lead</p>
                                                <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200">{trip.trip_lead_name}</p>
                                                <a 
                                                    href={`tel:${trip.trip_lead_contact}`} 
                                                    className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline mt-1 font-bold"
                                                >
                                                    <Phone size={10} />
                                                    {trip.trip_lead_contact}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
