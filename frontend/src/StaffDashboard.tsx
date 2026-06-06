import { useState, useEffect } from 'react';
import { 
    User, Calendar, Clock, Bell, Shield, MapPin, 
    BookOpen, Award, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function StaffDashboard({ currentUser, onNavigate }: { currentUser: any, onNavigate?: (tab: string) => void }) {
    const [assignedAssets, setAssignedAssets] = useState<any[]>([]);
    const [stats, setStats] = useState({
        scans_this_month: 18,
        active_classes: 2,
        unauthorized_alerts: 0
    });

    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchAssignedAssets = async () => {
            try {
                const res = await fetch('/api/assets', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    // Filter assets assigned to this user
                    const userAssets = data.filter((asset: any) => asset.assigned_to_id === currentUser?.id);
                    setAssignedAssets(userAssets);
                }
            } catch (e) {
                console.error("Failed to load staff assets:", e);
            }
        };

        if (currentUser?.id) {
            fetchAssignedAssets();
        }
    }, [currentUser]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Header Card */}
            <div className="bg-gradient-to-br from-indigo-600 via-primary-600 to-indigo-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-10 transform translate-x-12 -translate-y-12">
                    <User size={256} />
                </div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative z-10">
                    <div>
                        <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-xs font-black uppercase tracking-wider">
                            Staff Portal
                        </span>
                        <h1 className="text-3xl font-extrabold tracking-tight mt-3">
                            Welcome Back, {currentUser?.full_name || 'Staff Member'}
                        </h1>
                        <p className="text-indigo-100 text-sm mt-1">
                            {currentUser?.email || 'No email registered'} • {currentUser?.school || 'General Department'}
                        </p>
                    </div>
                    <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 text-center text-sm shrink-0">
                        <div className="text-[10px] font-black uppercase text-indigo-200">Staff Code</div>
                        <div className="text-lg font-mono font-bold mt-0.5">{currentUser?.admission_number || 'N/A'}</div>
                    </div>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-950/20 text-primary-600 dark:text-primary-400 flex items-center justify-center shrink-0">
                        <Shield size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Gate Scans (Month)</div>
                        <div className="text-2xl font-black mt-0.5 text-gray-800 dark:text-white">{stats.scans_this_month}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-950/20 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                        <Award size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">My Assigned Assets</div>
                        <div className="text-2xl font-black mt-0.5 text-gray-800 dark:text-white">{assignedAssets.length}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                        <Calendar size={24} />
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 font-bold uppercase">Class Schedules</div>
                        <div className="text-2xl font-black mt-0.5 text-gray-800 dark:text-white">{stats.active_classes} Today</div>
                    </div>
                </div>
            </div>

            {/* Assets Table and Notice Board */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Assigned Assets Column */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-lg font-bold text-gray-800 dark:text-white">Assigned Campus Property</h3>
                        {onNavigate && (
                            <button 
                                onClick={() => onNavigate('assets')}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                            >
                                View All Assets
                                <ChevronRight size={14} />
                            </button>
                        )}
                    </div>
                    
                    {assignedAssets.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <BookOpen size={40} className="mx-auto mb-2 text-gray-300" />
                            <p className="text-sm font-bold">No assets assigned yet</p>
                            <p className="text-xs">University laptops or devices assigned to you will display here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {assignedAssets.map((asset) => (
                                <div key={asset.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl flex items-center justify-center text-primary-600 font-black font-mono text-xs">
                                            AST
                                        </div>
                                        <div>
                                            <p className="font-bold text-sm text-gray-800 dark:text-white">{asset.name}</p>
                                            <p className="text-xs text-gray-400 font-mono mt-0.5">{asset.tag_number} • {asset.category}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="px-2.5 py-0.5 bg-green-100 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 text-[10px] font-black rounded-full uppercase">
                                            {asset.status}
                                        </span>
                                        <p className="text-[10px] text-gray-400 mt-1">Handover: {asset.handover_date || 'N/A'}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Quick Shortcuts */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Quick Portals</h3>
                    <div className="grid grid-cols-1 gap-2">
                        <button 
                            onClick={() => onNavigate?.('notice-board')}
                            className="w-full p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center gap-3 text-left transition-all"
                        >
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-primary-600"><Clock size={16} /></div>
                            <div>
                                <h5 className="font-bold text-xs">Notice Board</h5>
                                <p className="text-[10px] text-gray-400">View latest announcements</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => onNavigate?.('calendar')}
                            className="w-full p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center gap-3 text-left transition-all"
                        >
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-green-600"><Calendar size={16} /></div>
                            <div>
                                <h5 className="font-bold text-xs">Campus Calendar</h5>
                                <p className="text-[10px] text-gray-400">Check dates and programs</p>
                            </div>
                        </button>

                        <button 
                            onClick={() => onNavigate?.('attendance')}
                            className="w-full p-4 bg-gray-50 hover:bg-gray-100 dark:bg-gray-900/50 dark:hover:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center gap-3 text-left transition-all"
                        >
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-lg text-indigo-600"><CheckCircle2 size={16} /></div>
                            <div>
                                <h5 className="font-bold text-xs">Class Attendance</h5>
                                <p className="text-[10px] text-gray-400">Mark or verify attendance</p>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
