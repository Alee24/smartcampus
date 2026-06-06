import { useState, useEffect } from 'react';
import { 
    Briefcase, Plus, TrendingUp, AlertCircle, RefreshCw, 
    ArrowRightLeft, FileText, CheckCircle2, ChevronRight
} from 'lucide-react';

export default function StoresDashboard({ currentUser, onNavigate }: { currentUser: any, onNavigate?: (tab: string) => void }) {
    const [stats, setStats] = useState({
        total_assets: 0,
        available_assets: 0,
        assigned_assets: 0,
        maintenance_assets: 0
    });

    const [recentLogs, setRecentLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const token = localStorage.getItem('token');

    useEffect(() => {
        const fetchInventoryData = async () => {
            try {
                const res = await fetch('/api/assets', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    
                    const total = data.length;
                    const available = data.filter((a: any) => a.status === 'available').length;
                    const assigned = data.filter((a: any) => a.status === 'checked_out' || a.assigned_to_id !== null).length;
                    const maintenance = data.filter((a: any) => a.status === 'maintenance').length;

                    setStats({
                        total_assets: total,
                        available_assets: available,
                        assigned_assets: assigned,
                        maintenance_assets: maintenance
                    });
                }

                // Fetch recent logs
                const resLogs = await fetch('/api/assets/logs', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (resLogs.ok) {
                    const logs = await resLogs.json();
                    setRecentLogs(logs.slice(0, 5));
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };

        fetchInventoryData();
    }, []);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header banner */}
            <div className="bg-gradient-to-br from-indigo-700 via-primary-600 to-indigo-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-xs font-black uppercase tracking-wider">
                        Stores & Asset Registry
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-3">
                        Inventory Command
                    </h1>
                    <p className="text-indigo-100 text-sm mt-1">
                        Administer and track university equipment, asset barcode tagging (RU-), checkouts, and audits.
                    </p>
                </div>
                {onNavigate && (
                    <button
                        onClick={() => onNavigate('assets')}
                        className="px-5 py-3 bg-white text-primary-700 hover:bg-gray-55 font-bold rounded-xl transition-all shadow-lg text-sm flex items-center gap-1.5"
                    >
                        Asset Registry
                    </button>
                )}
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Total Equipment</div>
                    <div className="text-2xl font-black mt-1 text-gray-800 dark:text-white">{stats.total_assets}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">In Store (Available)</div>
                    <div className="text-2xl font-black mt-1 text-green-600 dark:text-green-400">{stats.available_assets}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Checked Out / Handed Over</div>
                    <div className="text-2xl font-black mt-1 text-primary-600 dark:text-primary-400">{stats.assigned_assets}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Under Maintenance</div>
                    <div className="text-2xl font-black mt-1 text-amber-500 dark:text-amber-400">{stats.maintenance_assets}</div>
                </div>
            </div>

            {/* Split layout actions and history */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Recent Asset Activity Logs */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Recent Asset Movements</h3>
                        {onNavigate && (
                            <button 
                                onClick={() => onNavigate('asset-handovers')}
                                className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
                            >
                                Handovers Log
                                <ChevronRight size={14} />
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="flex justify-center p-8">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                        </div>
                    ) : recentLogs.length === 0 ? (
                        <div className="text-center py-12 text-gray-400 italic text-xs">No recent asset check-ins or checkout logs.</div>
                    ) : (
                        <div className="divide-y divide-gray-50 dark:divide-gray-800">
                            {recentLogs.map((log) => (
                                <div key={log.id} className="py-3 flex justify-between items-center text-xs">
                                    <div>
                                        <p className="font-bold text-gray-800 dark:text-white">{log.asset_name || 'Asset ID: ' + log.asset_id}</p>
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            Moved to: <b>{log.handover_name || log.user_name || 'N/A'}</b> • Handled By: <b>{log.handler_name || 'Staff'}</b>
                                        </p>
                                    </div>
                                    <span className={`px-2 py-0.5 text-[9px] font-bold rounded uppercase ${
                                        log.action === 'check_out' ? 'bg-primary-50 text-primary-700' : 'bg-green-50 text-green-700'
                                    }`}>
                                        {log.action.replace("_", " ")}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Operations shortcut panel */}
                <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                    <h3 className="text-sm font-bold text-gray-800 dark:text-white uppercase tracking-wider">Actions</h3>
                    
                    <div className="space-y-2">
                        <button
                            onClick={() => onNavigate?.('assets')}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900/80 transition-all text-left flex items-center gap-3"
                        >
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl text-primary-600"><Briefcase size={16} /></div>
                            <div>
                                <h5 className="font-bold text-xs">Register Equipment</h5>
                                <p className="text-[10px] text-gray-400">Add property with barcode serialization</p>
                            </div>
                        </button>

                        <button
                            onClick={() => onNavigate?.('asset-handovers')}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900/80 transition-all text-left flex items-center gap-3"
                        >
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl text-indigo-600"><ArrowRightLeft size={16} /></div>
                            <div>
                                <h5 className="font-bold text-xs">Asset Handovers</h5>
                                <p className="text-[10px] text-gray-400">Assign equipment to staff/students</p>
                            </div>
                        </button>

                        <button
                            onClick={() => onNavigate?.('asset-reports')}
                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-900/80 transition-all text-left flex items-center gap-3"
                        >
                            <div className="p-2 bg-white dark:bg-gray-800 rounded-xl text-green-600"><FileText size={16} /></div>
                            <div>
                                <h5 className="font-bold text-xs">Asset Report Export</h5>
                                <p className="text-[10px] text-gray-400">Download Excel / print inventory logs</p>
                            </div>
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
