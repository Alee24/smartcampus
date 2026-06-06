import { useState, useEffect } from 'react';
import { 
    Users, Shield, AlertTriangle, ShieldAlert, BarChart3, TrendingUp,
    FileText, ClipboardList, CheckCircle2, ChevronRight, Activity
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

export default function ManagementDashboard({ currentUser, onNavigate }: { currentUser: any, onNavigate?: (tab: string) => void }) {
    const [stats, setStats] = useState({
        active_users: 1240,
        gate_entries_today: 342,
        unresolved_incidents: 3,
        items_lost: 15
    });

    const [recentIncidents, setRecentIncidents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchOperationalData = async () => {
            try {
                // Fetch stats and incidents
                const resInc = await fetch('/api/security/incidents', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resInc.ok) {
                    const data = await resInc.json();
                    setRecentIncidents(data.slice(0, 5));
                    
                    const unresolved = data.filter((inc: any) => inc.status !== 'resolved').length;
                    setStats(prev => ({
                        ...prev,
                        unresolved_incidents: unresolved
                    }));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchOperationalData();
    }, []);

    const data = [
        { name: 'Students', value: 920, color: '#4f46e5' },
        { name: 'Staff', value: 180, color: '#10b981' },
        { name: 'Security/Guards', value: 45, color: '#f59e0b' },
        { name: 'Guests', value: 95, color: '#8b5cf6' }
    ];

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Banner */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <span className="px-3 py-1 bg-white/10 text-white border border-white/20 rounded-lg text-xs font-black uppercase tracking-wider">
                        Management Review Dashboard
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-3">
                        Executive Overview
                    </h1>
                    <p className="text-gray-400 text-sm mt-1">
                        Consolidated analytics, security metrics, and operations overview for University Deans & Management.
                    </p>
                </div>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                        <Users size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Active Campus Users</div>
                        <div className="text-2xl font-black mt-0.5 text-gray-800 dark:text-white">{stats.active_users}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                        <Activity size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Gate Logs (Today)</div>
                        <div className="text-2xl font-black mt-0.5 text-gray-800 dark:text-white">{stats.gate_entries_today}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                        <ShieldAlert size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Active Incidents</div>
                        <div className="text-2xl font-black mt-0.5 text-gray-800 dark:text-white">{stats.unresolved_incidents}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                        <AlertTriangle size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Lost Property Items</div>
                        <div className="text-2xl font-black mt-0.5 text-gray-800 dark:text-white">{stats.items_lost}</div>
                    </div>
                </div>
            </div>

            {/* Split layout: charts & incidents feed */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* User demographics chart */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider mb-4">Demographics Summary</h3>
                    
                    <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend verticalAlign="bottom" height={36} iconSize={10} iconType="circle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Incidents overview feed */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Active Security Case Feed</h3>
                        {onNavigate && (
                            <button 
                                onClick={() => onNavigate('incidents')}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                                Case Files
                                <ChevronRight size={14} />
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                        </div>
                    ) : recentIncidents.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 italic text-xs">No active security incident logs present.</div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {recentIncidents.map((inc) => (
                                <div key={inc.id} className="py-3 flex justify-between items-center">
                                    <div>
                                        <p className="font-bold text-xs text-gray-800 dark:text-white">{inc.title}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">Severity: <b>{inc.severity}</b> • Location: <b>{inc.location}</b></p>
                                    </div>
                                    <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 text-[9px] font-bold rounded uppercase">
                                        {inc.status.replace("_", " ")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
