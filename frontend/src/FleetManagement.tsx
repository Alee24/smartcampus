import React, { useState, useEffect } from 'react';
import { Car, MapPin, Navigation, Fuel, Wrench, AlertTriangle, Users, Plus, Search, Filter, ChevronRight, Activity, Calendar, Clock, Shield, Download, FileText, Settings, Map as MapIcon, TrendingUp, DollarSign, X, Check, Loader2, RefreshCw, Trash2, Edit, Phone, QrCode, FileSpreadsheet, Printer, ShieldAlert, ArrowLeft } from 'lucide-react';
import { useNotification } from './components/Notification';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area, Cell
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Fix Leaflet icon issue
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// @ts-ignore
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});
const vehicleIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3202/3202926.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const busIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
});

const vanIcon = new L.Icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/744/744465.png',
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -38]
});

const getVehicleIcon = (type?: string) => {
    if (!type) return vehicleIcon;
    const t = type.toLowerCase();
    if (t.includes('bus') || t === 'shuttle') return busIcon;
    if (t.includes('van') || t === 'matatu' || t === 'hiace') return vanIcon;
    return vehicleIcon;
};
interface FleetManagementProps {
    initialTab?: string;
}

class ErrorBoundary extends React.Component<any, { hasError: boolean, error: any }> {
    constructor(props: any) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error: any) {
        return { hasError: true, error };
    }
    componentDidCatch(error: any, errorInfo: any) {
        console.error("FleetManagement Error:", error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <div className="p-8 m-8 bg-red-50 border border-red-200 rounded-xl text-red-700">
                    <h2 className="text-xl font-bold mb-4">Something went wrong in Fleet Management</h2>
                    <pre className="text-sm overflow-auto p-4 bg-white rounded shadow-inner whitespace-pre-wrap">
                        {this.state.error?.toString()}
                        {"\n\n"}
                        {this.state.error?.stack}
                    </pre>
                </div>
            );
        }
        return this.props.children;
    }
}

export default function FleetManagement(props: FleetManagementProps) {
    return (
        <ErrorBoundary>
            <FleetManagementContent {...props} />
        </ErrorBoundary>
    );
}

function FleetManagementContent({ initialTab = 'dashboard' }: FleetManagementProps) {
    const role = localStorage.getItem('userRole');
    const isAdmin = role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin';
    const [activeTab, setActiveTab] = useState(initialTab);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);
    const [fuelLogs, setFuelLogs] = useState<any[]>([]);
    const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [toast, setToast] = useState<{msg: string, type: 'success'|'error'|'info'} | null>(null);

    const [stats, setStats] = useState<any>({
        total_vehicles: 0,
        active_trips: 0,
        maintenance_due: 0,
        fuel_usage: 0,
        buses_in: 0,
        buses_out: 0,
        total_students_on_trips: 0,
        total_trips: 0,
        total_spending: 0,
        fuel_spending: 0,
        maintenance_spending: 0,
        last_maintenance: null
    });
    const [loading, setLoading] = useState(true);
    const [showAddVehicle, setShowAddVehicle] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<any>(null);

    const showToast = (msg: string, type: 'success'|'error'|'info' = 'info') => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchLocations, 15000);
        return () => clearInterval(interval);
    }, []);


    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { 'Authorization': `Bearer ${token}` };
            
            const [vRes, tRes, sRes, fRes, mRes, lRes] = await Promise.all([
                fetch('/api/fleet/vehicles', { headers }),
                fetch('/api/fleet/trips', { headers }),
                fetch('/api/fleet/stats', { headers }),
                fetch('/api/fleet/fuel-logs', { headers }),
                fetch('/api/fleet/maintenance-logs', { headers }),
                fetch('/api/fleet/locations', { headers })
            ]);

            if (vRes.ok) setVehicles(await vRes.json());
            if (tRes.ok) setTrips(await tRes.json());
            if (sRes.ok) setStats(await sRes.json());
            if (fRes.ok) setFuelLogs(await fRes.json());
            if (mRes.ok) setMaintenanceLogs(await mRes.json());
            if (lRes.ok) setLocations(await lRes.json());
        } catch (error) {
            console.error('Error fetching fleet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchLocations = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/fleet/locations', { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            if (res.ok) setLocations(await res.json());
        } catch (e) {}
    };

    const renderDashboard = () => (
        <div className="space-y-6 animate-fade-in">

            {/* Primary Stats Row — Buses In/Out, Active Trips, Total Fleet */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-l-4 border-green-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-green-50 rounded-xl"><Car className="text-green-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-green-50 text-green-700 px-2 py-1 rounded-lg uppercase tracking-tight">On Campus</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Buses In</p>
                    <div className="text-3xl font-black text-gray-900">{stats.buses_in ?? 0}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-orange-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-orange-50 rounded-xl"><Navigation className="text-orange-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-orange-50 text-orange-700 px-2 py-1 rounded-lg uppercase tracking-tight">Deployed</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Buses Out</p>
                    <div className="text-3xl font-black text-gray-900">{stats.buses_out ?? 0}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-blue-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-blue-50 rounded-xl"><Car className="text-blue-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-blue-50 text-blue-700 px-2 py-1 rounded-lg uppercase tracking-tight">Fleet</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Total Vehicles</p>
                    <div className="text-3xl font-black text-gray-900">{stats.total_vehicles ?? 0}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-red-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-red-50 rounded-xl"><Wrench className="text-red-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-red-50 text-red-700 px-2 py-1 rounded-lg uppercase tracking-tight">Action</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Maintenance Due</p>
                    <div className="text-3xl font-black text-gray-900">{stats.maintenance_due ?? 0}</div>
                </div>
            </div>

            {/* Secondary Stats Row — Students, Trips, Fuel, Spending */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-l-4 border-indigo-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-indigo-50 rounded-xl"><Users className="text-indigo-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg uppercase tracking-tight">All-time</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Students on Trips</p>
                    <div className="text-3xl font-black text-gray-900">{stats.total_students_on_trips ?? 0}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-cyan-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-cyan-50 rounded-xl"><Navigation className="text-cyan-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-cyan-50 text-cyan-700 px-2 py-1 rounded-lg uppercase tracking-tight">Total</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Total Trips</p>
                    <div className="text-3xl font-black text-gray-900">{stats.total_trips ?? 0}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-yellow-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-yellow-50 rounded-xl"><Fuel className="text-yellow-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg uppercase tracking-tight">Litres</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Fuel Consumed</p>
                    <div className="text-3xl font-black text-gray-900">{(stats.fuel_usage ?? 0).toLocaleString()}L</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-emerald-500">
                    <div className="flex justify-between items-start mb-3">
                        <div className="p-2.5 bg-emerald-50 rounded-xl"><DollarSign className="text-emerald-600" size={22} /></div>
                        <span className="text-[10px] font-black bg-emerald-50 text-emerald-700 px-2 py-1 rounded-lg uppercase tracking-tight">KES</span>
                    </div>
                    <p className="text-gray-500 font-bold text-xs mb-1">Total Spend</p>
                    <div className="text-2xl font-black text-gray-900">{(stats.total_spending ?? 0).toLocaleString()}</div>
                </div>
            </div>

            {/* Charts + Spending Breakdown Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-600" />
                        Fuel Consumption History
                    </h3>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={(fuelLogs || []).slice(0, 10).reverse().map(l => ({ name: new Date(l.timestamp).toLocaleDateString(), liters: l.amount_liters, cost: l.cost }))}>
                                <defs>
                                    <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#6B7280'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Area type="monotone" dataKey="liters" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorFuel)" name="Litres" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Spending Breakdown Card */}
                <div className="glass-card p-6 flex flex-col gap-4">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-600" />
                        Spending Breakdown
                    </h3>
                    <div className="space-y-3 flex-1">
                        <div className="p-4 bg-yellow-50 rounded-2xl border border-yellow-100">
                            <p className="text-xs font-black text-yellow-600 uppercase mb-1">Fuel Costs</p>
                            <p className="text-2xl font-black text-yellow-900">KES {(stats.fuel_spending ?? 0).toLocaleString()}</p>
                            <div className="mt-2 h-1.5 bg-yellow-100 rounded-full">
                                <div className="h-1.5 bg-yellow-500 rounded-full" style={{width: stats.total_spending > 0 ? `${((stats.fuel_spending / stats.total_spending) * 100).toFixed(0)}%` : '0%'}} />
                            </div>
                        </div>
                        <div className="p-4 bg-red-50 rounded-2xl border border-red-100">
                            <p className="text-xs font-black text-red-600 uppercase mb-1">Maintenance Costs</p>
                            <p className="text-2xl font-black text-red-900">KES {(stats.maintenance_spending ?? 0).toLocaleString()}</p>
                            <div className="mt-2 h-1.5 bg-red-100 rounded-full">
                                <div className="h-1.5 bg-red-500 rounded-full" style={{width: stats.total_spending > 0 ? `${((stats.maintenance_spending / stats.total_spending) * 100).toFixed(0)}%` : '0%'}} />
                            </div>
                        </div>
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <p className="text-xs font-black text-emerald-600 uppercase mb-1">Total Fleet Spend</p>
                            <p className="text-2xl font-black text-emerald-900">KES {(stats.total_spending ?? 0).toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Row — Live Trips + Last Maintenance + Fleet Health */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Live Trip Log */}
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex justify-between items-center mb-5">
                        <h3 className="text-lg font-bold">Live Trip Log</h3>
                        <button onClick={() => setActiveTab('trips')} className="text-sm text-primary-600 font-semibold hover:underline">View All</button>
                    </div>
                    {(!trips || trips.length === 0) ? (
                        <div className="text-center py-10">
                            <Navigation className="mx-auto text-gray-300 mb-3" size={40} />
                            <p className="font-bold text-gray-400 text-sm">No trips scheduled yet</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                        <th className="pb-4">Vehicle</th>
                                        <th className="pb-4">Destination</th>
                                        <th className="pb-4">Status</th>
                                        <th className="pb-4">Departure</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {(trips || []).slice(0, 6).map((trip, i) => (
                                        <tr key={i} className="hover:bg-gray-50 transition-colors">
                                            <td className="py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary-50 rounded-lg"><Car size={14} className="text-primary-600" /></div>
                                                    <span className="font-bold text-sm">{vehicles.find(v => v.id === trip.vehicle_id)?.plate_number || 'N/A'}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 text-sm text-gray-600">{trip.destination}</td>
                                            <td className="py-3">
                                                <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                    trip.status === 'ongoing' ? 'bg-green-100 text-green-700' :
                                                    trip.status === 'completed' ? 'bg-blue-100 text-blue-700' :
                                                    trip.status === 'cancelled' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                                                }`}>{trip.status}</span>
                                            </td>
                                            <td className="py-3 text-xs font-semibold text-gray-500">
                                                {new Date(trip.scheduled_departure).toLocaleString()}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* Right Column — Last Maintenance + Alerts */}
                <div className="space-y-4">
                    {/* Last Maintenance Card */}
                    <div className="glass-card p-5">
                        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                            <Wrench size={18} className="text-orange-500" />
                            Last Maintenance
                        </h3>
                        {stats.last_maintenance ? (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Vehicle</span>
                                    <span className="text-sm font-black text-gray-800">{stats.last_maintenance.vehicle}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Service</span>
                                    <span className="text-sm font-bold text-gray-700 capitalize">{stats.last_maintenance.service_type}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Date</span>
                                    <span className="text-sm font-bold text-gray-700">{stats.last_maintenance.date ? new Date(stats.last_maintenance.date).toLocaleDateString() : 'N/A'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">Cost</span>
                                    <span className="text-sm font-black text-emerald-700">KES {(stats.last_maintenance.cost ?? 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-gray-400 uppercase">By</span>
                                    <span className="text-xs font-bold text-gray-600">{stats.last_maintenance.performed_by}</span>
                                </div>
                                <div className="mt-3 pt-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-500 italic">{stats.last_maintenance.description}</p>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-6">
                                <Calendar className="mx-auto text-gray-300 mb-2" size={28} />
                                <p className="text-xs font-bold text-gray-400">No maintenance records yet</p>
                            </div>
                        )}
                    </div>

                    {/* Fleet Health / Alerts */}
                    <div className="glass-card p-5">
                        <h3 className="text-base font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-red-600" />
                            Vehicle Alerts
                        </h3>
                        <div className="space-y-2">
                            {vehicles.filter(v => v.status === 'maintenance').length === 0 ? (
                                <div className="text-center py-4">
                                    <Shield className="mx-auto text-green-500 mb-1" size={28} />
                                    <p className="text-xs font-bold text-gray-500">All vehicles healthy</p>
                                </div>
                            ) : vehicles.filter(v => v.status === 'maintenance').map((v, i) => (
                                <div key={i} className="flex gap-2 p-2.5 bg-red-50 border border-red-100 rounded-xl">
                                    <Wrench className="text-red-600 shrink-0 mt-0.5" size={14} />
                                    <div>
                                        <p className="text-xs font-black text-red-900">{v.plate_number}</p>
                                        <p className="text-[10px] text-red-600">Needs immediate service</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Fleet Utilization Chart */}
            <div className="glass-card p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Activity size={20} className="text-green-600" />
                    Fleet Utilization Overview
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[
                            { name: 'Buses In', val: stats.buses_in ?? 0, fill: '#10B981' },
                            { name: 'Buses Out', val: stats.buses_out ?? 0, fill: '#F59E0B' },
                            { name: 'Active Trips', val: stats.active_trips ?? 0, fill: '#4F46E5' },
                            { name: 'In Maintenance', val: stats.maintenance_due ?? 0, fill: '#EF4444' }
                        ]}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} allowDecimals={false} />
                            <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                            <Bar dataKey="val" radius={[8, 8, 0, 0]} barSize={50}
                                label={{ position: 'top', fontSize: 13, fontWeight: 900, fill: '#374151' }}
                            >
                                {[{fill:'#10B981'},{fill:'#F59E0B'},{fill:'#4F46E5'},{fill:'#EF4444'}].map((entry, index) => (
                                    <Cell key={index} fill={entry.fill} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );

    const renderTracking = () => (
        <div className="glass-card h-[calc(100vh-220px)] flex flex-col lg:flex-row overflow-hidden animate-fade-in relative">
            {/* Sidebar for vehicle list */}
            <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col bg-white/80 backdrop-blur-md z-10">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search fleet..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {vehicles.map((v, i) => {
                        const loc = locations.find(l => l.vehicle_id === v.id);
                        return (
                            <div key={i} className="p-4 border-b border-gray-50 hover:bg-primary-50/30 cursor-pointer transition-all group">
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-bold text-sm">{v.plate_number}</h4>
                                    <span className={`w-2 h-2 rounded-full ${loc ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                                </div>
                                <p className="text-[10px] text-gray-500 uppercase font-black">{v.vehicle_type}</p>
                                <div className="mt-3 flex justify-between items-center text-[10px] font-bold">
                                    <div className="flex items-center gap-1 text-blue-600">
                                        <Activity size={10} /> {loc ? `${loc.speed} km/h` : 'Stopped'}
                                    </div>
                                    <div className="text-gray-400">{loc ? 'Live' : 'Offline'}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Live Map */}
            <div className="flex-1 relative">
                <MapContainer center={[-2.6, 38.0]} zoom={7} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {locations.map((loc, i) => (
                        <Marker 
                            key={i} 
                            position={[loc.latitude, loc.longitude]} 
                            icon={getVehicleIcon(loc.vehicle_type)}
                        >
                            <Popup>
                                <div className="p-2">
                                    <h3 className="font-bold border-b pb-1 mb-2">{loc.plate_number}</h3>
                                    <p className="text-xs">Speed: <strong>{loc.speed} km/h</strong></p>
                                    <p className="text-xs">Status: <span className="text-green-600 font-bold">Active Trip</span></p>
                                    <button className="mt-2 w-full py-1 bg-primary-600 text-white rounded text-[10px] font-bold">Track Individual</button>
                                </div>
                            </Popup>
                        </Marker>
                    ))}
                    <MapResizer />
                </MapContainer>
                
                {/* Floating Stats */}
                <div className="absolute bottom-6 right-6 z-[1000] glass-card p-4 shadow-2xl border-l-4 border-primary-600 w-64">
                    <h4 className="font-black text-xs uppercase text-gray-400 mb-3 tracking-widest">Fleet Status</h4>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-600">Active Units</span>
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-[10px] font-black">{locations.length}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-600">Total Fleet</span>
                            <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-[10px] font-black">{vehicles.length}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                        Fleet Tracking System
                    </h1>
                    <p className="text-gray-500 font-medium">Real-time university transport monitoring</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchData} className="p-2 bg-white border border-gray-200 rounded-xl text-gray-500 hover:bg-gray-50 transition-all">
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            const headers: HeadersInit = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };
                            // Export vehicles as CSV
                            const rows = [
                                ['Plate','Make','Model','Type','Status','Fuel Type','Year','Odometer','Driver','Contact'],
                                ...vehicles.map(v => [v.plate_number, v.make||'', v.model||'', v.vehicle_type, v.status, v.fuel_type, v.year||'', v.current_odometer, v.driver_name||'', v.driver_contact||''])
                            ];
                            const csv = rows.map(r => r.join(',')).join('\n');
                            const blob = new Blob([csv], { type: 'text/csv' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `fleet_export_${new Date().toISOString().slice(0,10)}.csv`;
                            a.click(); URL.revokeObjectURL(url);
                        }}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2"
                    >
                        <Download size={18} /> Export
                    </button>
                    {isAdmin && (
                        <button 
                            onClick={() => setShowAddVehicle(true)}
                            className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> Add Vehicle
                        </button>
                    )}
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 w-fit overflow-x-auto no-scrollbar">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: Activity },
                    { id: 'vehicles', label: 'Fleet Vehicles', icon: Car },
                    { id: 'tracking', label: 'Live Map', icon: MapPin },
                    { id: 'trips', label: 'Trips', icon: Navigation },
                    { id: 'fuel', label: 'Fuel Logs', icon: Fuel },
                    { id: 'maintenance', label: 'Service', icon: Wrench },
                    { id: 'drivers', label: 'Drivers', icon: Users }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shrink-0 ${
                            activeTab === tab.id 
                            ? 'bg-primary-600 text-white shadow-md' 
                            : 'text-gray-500 hover:bg-gray-100'
                        }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {loading ? (
                <div className="h-96 flex flex-col items-center justify-center text-gray-400">
                    <Loader2 size={48} className="animate-spin mb-4" />
                    <p className="font-bold">Syncing Fleet Data...</p>
                </div>
            ) : (
                <>
                {activeTab === 'dashboard' && renderDashboard()}
                    {activeTab === 'vehicles' && <VehiclesManager vehicles={vehicles} onUpdate={fetchData} setShowAddVehicle={setShowAddVehicle} setEditingVehicle={setEditingVehicle} showToast={showToast} />}
                    {activeTab === 'tracking' && renderTracking()}
                    {activeTab === 'trips' && <TripsManager trips={trips} vehicles={vehicles} onUpdate={fetchData} showToast={showToast} />}
                    {activeTab === 'fuel' && <FuelManagement vehicles={vehicles} logs={fuelLogs} onUpdate={fetchData} showToast={showToast} />}
                    {activeTab === 'maintenance' && <MaintenanceManager vehicles={vehicles} logs={maintenanceLogs} onUpdate={fetchData} showToast={showToast} />}
                    {activeTab === 'drivers' && <DriverManager />}
                </>
            )}

            {showAddVehicle && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-2xl animate-slide-up shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setShowAddVehicle(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        <h2 className="text-2xl font-black mb-6">Register New Vehicle</h2>
                        <VehicleForm onSuccess={() => { setShowAddVehicle(false); fetchData(); showToast('Vehicle registered successfully!', 'success'); }} onError={(msg) => showToast(msg, 'error')} />
                    </div>
                </div>
            )}

            {editingVehicle && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-2xl animate-slide-up shadow-2xl relative overflow-y-auto max-h-[90vh]">
                        <button onClick={() => setEditingVehicle(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        <h2 className="text-2xl font-black mb-6">Modify Vehicle Details</h2>
                        <VehicleForm vehicle={editingVehicle} onSuccess={() => { setEditingVehicle(null); fetchData(); showToast('Vehicle updated successfully!', 'success'); }} onError={(msg) => showToast(msg, 'error')} />
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div className={`fixed bottom-6 right-6 z-[9999] px-6 py-4 rounded-2xl shadow-2xl text-white font-bold text-sm flex items-center gap-3 animate-slide-up transition-all ${
                    toast.type === 'success' ? 'bg-green-600' : toast.type === 'error' ? 'bg-red-600' : 'bg-blue-600'
                }`}>
                    {toast.type === 'success' ? <Check size={20} /> : toast.type === 'error' ? <X size={20} /> : <Activity size={20} />}
                    {toast.msg}
                    <button onClick={() => setToast(null)} className="ml-2 opacity-70 hover:opacity-100"><X size={16} /></button>
                </div>
            )}
        </div>
    );
}

// Map Helper
function MapResizer() {
    const map = useMap();
    useEffect(() => {
        setTimeout(() => map.invalidateSize(), 500);
    }, [map]);
    return null;
}

// Helper Components
function StatCard({ title, value, icon, change, color }: any) {
    const colors: any = {
        blue: 'border-blue-500 text-blue-600',
        green: 'border-green-500 text-green-600',
        red: 'border-red-500 text-red-600',
        orange: 'border-orange-500 text-orange-600'
    };
    return (
        <div className={`glass-card p-6 border-l-4 ${colors[color]}`}>
            <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-white shadow-sm rounded-xl border border-gray-50">{icon}</div>
                <span className="text-[10px] font-bold bg-gray-50 px-2 py-1 rounded-lg text-gray-500 uppercase tracking-tighter">{change}</span>
            </div>
            <h4 className="text-gray-500 font-bold text-sm mb-1">{title}</h4>
            <div className="text-2xl font-black text-gray-900">{value}</div>
        </div>
    );
}

function TripManifestViewer({ tripId, vehicles, onClose, onUpdate }: any) {
    const [trip, setTrip] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'crew' | 'manifest' | 'emergency' | 'report' | 'scanner'>('crew');
    
    // Scanner states
    const [scanResult, setScanResult] = useState<{msg: string, type: 'success'|'error'} | null>(null);
    const [isProcessingScan, setIsProcessingScan] = useState(false);
    
    // Trip Lead form states
    const [isEditingLead, setIsEditingLead] = useState(false);
    const [leadName, setLeadName] = useState('');
    const [leadContact, setLeadContact] = useState('');
    
    // File upload states
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<string | null>(null);
    
    // Report stats
    const [report, setReport] = useState<any>(null);
    const [loadingReport, setLoadingReport] = useState(false);

    const fetchDetails = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/trips/${tripId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setTrip(data);
                setLeadName(data.trip_lead_name || '');
                setLeadContact(data.trip_lead_contact || '');
            } else {
                const err = await res.json();
                setError(err.detail || 'Failed to fetch trip details.');
            }
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    const fetchReport = async () => {
        setLoadingReport(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/trips/${tripId}/report`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setReport(data);
            }
        } catch (e) {
            console.error("Failed to load report", e);
        } finally {
            setLoadingReport(false);
        }
    };

    useEffect(() => {
        fetchDetails();
    }, [tripId]);

    useEffect(() => {
        if (activeTab === 'report') {
            fetchReport();
        }
    }, [activeTab]);

    useEffect(() => {
        let scanner: any = null;
        let isProcessing = false;

        if (activeTab === 'scanner') {
            setScanResult(null);
            setTimeout(() => {
                const el = document.getElementById("qr-reader");
                if (!el) return;
                scanner = new Html5QrcodeScanner(
                    "qr-reader",
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    false
                );
                scanner.render(async (decodedText: string) => {
                    if (isProcessing) return;
                    isProcessing = true;
                    setScanResult(null);
                    setIsProcessingScan(true);

                    try {
                        const token = localStorage.getItem('token');
                        const res = await fetch(`/api/fleet/trips/${tripId}/board`, {
                            method: 'POST',
                            headers: { 
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}` 
                            },
                            body: JSON.stringify({ scanned_data: decodedText })
                        });
                        const data = await res.json();
                        if (res.ok) {
                            setScanResult({ msg: data.message, type: 'success' });
                            fetchDetails();
                            if (onUpdate) onUpdate();
                        } else {
                            setScanResult({ msg: data.detail || 'Scan failed', type: 'error' });
                        }
                    } catch (e: any) {
                        setScanResult({ msg: e.message, type: 'error' });
                    } finally {
                        setIsProcessingScan(false);
                        setTimeout(() => { isProcessing = false; }, 3000);
                    }
                }, undefined);
            }, 100);
        }

        return () => {
            if (scanner) {
                try {
                    scanner.clear().catch((e: any) => console.error(e));
                } catch(e) {}
            }
        };
    }, [activeTab, tripId]);

    const handleUpdateLead = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/trips/${tripId}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    trip_lead_name: leadName,
                    trip_lead_contact: leadContact
                })
            });
            if (res.ok) {
                alert("Trip lead details updated successfully!");
                setIsEditingLead(false);
                fetchDetails();
                if (onUpdate) onUpdate();
            } else {
                const err = await res.json();
                alert(`Failed to update: ${err.detail || 'Error'}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fileList = e.target.files;
        if (!fileList || fileList.length === 0) return;
        
        const file = fileList[0];
        const formData = new FormData();
        formData.append("file", file);
        
        setIsUploading(true);
        setUploadStatus("Uploading passenger CSV manifest...");
        
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/trips/${tripId}/manifest/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            if (res.ok) {
                const data = await res.json();
                setUploadStatus(`Success! Imported ${data.count} passengers.`);
                setTimeout(() => setUploadStatus(null), 3000);
                fetchDetails();
                if (onUpdate) onUpdate();
            } else {
                const err = await res.json();
                setUploadStatus(`Error: ${err.detail || 'Import failed'}`);
            }
        } catch (e: any) {
            setUploadStatus(`Error: ${e.message}`);
        } finally {
            setIsUploading(false);
        }
    };

    const downloadCSVTemplate = () => {
        const csvContent = "data:text/csv;charset=utf-8,Admission Number,Passenger Name,Phone Number,Emergency Contact,Pickup Location,Dropoff Location\nRU-9921,John Doe,+254711223344,+254722556677,RU Campus,Nairobi Central\nRU-8842,Jane Smith,+254700889900,+254733445566,RU Campus,Mombasa Road";
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `trip_${tripId}_manifest_template.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12 min-h-[300px]">
                <Loader2 className="animate-spin text-primary-600 mr-2" size={24} />
                <span className="font-bold text-gray-500">Loading trip manifest details...</span>
            </div>
        );
    }

    if (error || !trip) {
        return (
            <div className="p-6 text-center bg-red-50 rounded-2xl border border-red-200 animate-fade-in">
                <AlertTriangle className="text-red-500 mx-auto mb-3" size={32} />
                <h4 className="text-red-800 font-bold text-lg mb-1">Failed to Load Manifest</h4>
                <p className="text-red-600 text-sm mb-4">{error || 'Unknown error'}</p>
                <button onClick={onClose} className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold shadow-lg">Back to Trips</button>
            </div>
        );
    }

    return (
        <div className="animate-fade-in bg-white dark:bg-gray-900 rounded-3xl border border-gray-150 dark:border-gray-800 shadow-xl overflow-hidden text-left">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-primary-600 to-indigo-600 text-white flex justify-between items-start">
                <div>
                    <button onClick={onClose} className="mb-3 text-xs font-black bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all">
                        <ArrowLeft size={12} /> Back to Trips
                    </button>
                    <span className="px-2 py-0.5 bg-white/25 rounded text-[9px] font-black uppercase tracking-wider">{trip.status}</span>
                    <h3 className="text-xl font-black mt-2 flex items-center gap-2 flex-wrap">
                        {trip.origin} <ChevronRight size={18} className="text-white/40" /> <span className="text-yellow-300">{trip.destination}</span>
                    </h3>
                    <p className="text-xs text-white/80 mt-1 font-semibold">Purpose: {trip.purpose} • Scheduled: {new Date(trip.scheduled_departure).toLocaleString()}</p>
                </div>
                <div className="bg-white/15 p-3 rounded-2xl border border-white/10 shrink-0">
                    <Users size={28} />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/30 overflow-x-auto">
                <button onClick={() => setActiveTab('crew')} className={`px-6 py-4 text-xs font-black border-b-2 uppercase tracking-wider shrink-0 transition-all ${activeTab === 'crew' ? 'border-primary-600 text-primary-600 bg-white dark:bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                    Crew & Trip Lead
                </button>
                <button onClick={() => setActiveTab('manifest')} className={`px-6 py-4 text-xs font-black border-b-2 uppercase tracking-wider shrink-0 transition-all ${activeTab === 'manifest' ? 'border-primary-600 text-primary-600 bg-white dark:bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                    Student Manifest ({trip.passengers.length})
                </button>
                <button onClick={() => setActiveTab('emergency')} className={`px-6 py-4 text-xs font-black border-b-2 uppercase tracking-wider shrink-0 transition-all ${activeTab === 'emergency' ? 'border-primary-600 text-primary-600 bg-white dark:bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                    Emergency Contacts
                </button>
                <button onClick={() => setActiveTab('scanner')} className={`px-6 py-4 text-xs font-black border-b-2 uppercase tracking-wider shrink-0 transition-all ${activeTab === 'scanner' ? 'border-primary-600 text-primary-600 bg-white dark:bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                    Scan Boarding Pass
                </button>
                <button onClick={() => setActiveTab('report')} className={`px-6 py-4 text-xs font-black border-b-2 uppercase tracking-wider shrink-0 transition-all ${activeTab === 'report' ? 'border-primary-600 text-primary-600 bg-white dark:bg-gray-900' : 'border-transparent text-gray-500 hover:text-gray-900'}`}>
                    QR & Trip Report
                </button>
            </div>

            {/* Content Body */}
            <div className="p-6">
                
                {/* Tab: Crew & Trip Lead */}
                {activeTab === 'crew' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                        {/* Driver Card */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm flex flex-col justify-between">
                            <div>
                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 rounded text-[9px] font-black uppercase tracking-wider">Driver Details</span>
                                <h4 className="text-lg font-black mt-3 text-gray-900 dark:text-white">{trip.vehicle.driver_name || 'N/A'}</h4>
                                <p className="text-xs text-gray-400 mt-1 font-bold">Assigned Vehicle: <span className="text-gray-700 dark:text-gray-300 font-extrabold">{trip.vehicle.plate_number} ({trip.vehicle.make} {trip.vehicle.model})</span></p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                                <div>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase">Direct Phone</p>
                                    <p className="text-sm font-black text-gray-800 dark:text-gray-200">{trip.vehicle.driver_contact || 'No Contact Listed'}</p>
                                </div>
                                {trip.vehicle.driver_contact && (
                                    <a href={`tel:${trip.vehicle.driver_contact}`} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md transition-colors">
                                        <Phone size={16} />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Trip Lead Card */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/60 shadow-sm">
                            <div className="flex justify-between items-start mb-4">
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded text-[9px] font-black uppercase tracking-wider">Trip Team Lead</span>
                                {!isEditingLead && (
                                    <button onClick={() => setIsEditingLead(true)} className="text-xs font-bold text-primary-600 hover:underline">Edit Details</button>
                                )}
                            </div>

                            {isEditingLead ? (
                                <form onSubmit={handleUpdateLead} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Lead Coordinator Name</label>
                                        <input type="text" value={leadName} onChange={(e) => setLeadName(e.target.value)} required className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold" placeholder="E.g. Dr. Kamau (Dean)" />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Coordinator Phone Number</label>
                                        <input type="text" value={leadContact} onChange={(e) => setLeadContact(e.target.value)} required className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold" placeholder="E.g. +254 712 345 678" />
                                    </div>
                                    <div className="flex gap-2 justify-end pt-2">
                                        <button type="button" onClick={() => setIsEditingLead(false)} className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold">Cancel</button>
                                        <button type="submit" className="px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-bold shadow-md shadow-primary-500/20">Save Coordinator</button>
                                    </div>
                                </form>
                            ) : (
                                <div className="flex flex-col justify-between h-[80%]">
                                    <div>
                                        <h4 className="text-lg font-black text-gray-900 dark:text-white">{trip.trip_lead_name || 'No Coordinator Assigned'}</h4>
                                        <p className="text-xs text-gray-400 mt-1 font-bold">Responsible for team check-in and passenger safety management.</p>
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-700/50 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">Emergency Hotline</p>
                                            <p className="text-sm font-black text-gray-800 dark:text-gray-200">{trip.trip_lead_contact || 'N/A'}</p>
                                        </div>
                                        {trip.trip_lead_contact && trip.trip_lead_contact !== 'N/A' && (
                                            <a href={`tel:${trip.trip_lead_contact}`} className="p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-colors">
                                                <Phone size={16} />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Student Manifest */}
                {activeTab === 'manifest' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="flex flex-wrap justify-between items-center gap-4 bg-gray-50 dark:bg-gray-800/30 p-4 rounded-2xl border border-gray-100 dark:border-gray-800/80">
                            <div>
                                <h4 className="font-bold text-gray-800 dark:text-white">Import Student Manifest</h4>
                                <p className="text-xs text-gray-500 font-semibold">Upload a CSV file containing students, phone numbers, and pick-up spots.</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={downloadCSVTemplate} className="px-3.5 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 hover:bg-gray-50">
                                    <FileSpreadsheet size={14} className="text-green-600" /> Download CSV Template
                                </button>
                                <label className={`px-4 py-2 bg-primary-600 text-white rounded-xl text-xs font-black shadow-lg shadow-primary-500/20 flex items-center gap-1.5 cursor-pointer hover:bg-primary-700 transition-all ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <FileText size={14} /> {isUploading ? 'Uploading...' : 'Upload Student CSV'}
                                    <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
                                </label>
                            </div>
                        </div>

                        {uploadStatus && (
                            <div className={`p-4 rounded-xl border text-xs font-black flex items-center gap-2 ${
                                uploadStatus.includes('Error') 
                                    ? 'bg-red-50 border-red-200 text-red-700' 
                                    : uploadStatus.includes('Success') 
                                        ? 'bg-green-50 border-green-200 text-green-700' 
                                        : 'bg-blue-50 border-blue-200 text-blue-700 animate-pulse'
                            }`}>
                                {isUploading && <Loader2 className="animate-spin text-blue-600 animate-infinite" size={14} />}
                                <span>{uploadStatus}</span>
                            </div>
                        )}

                        <div className="overflow-x-auto rounded-2xl border border-gray-150 dark:border-gray-800 shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50 dark:bg-gray-800/70 border-b border-gray-150 dark:border-gray-800 text-[10px] font-black uppercase text-gray-500 tracking-wider">
                                        <th className="px-6 py-4">Admission</th>
                                        <th className="px-6 py-4">Student Name</th>
                                        <th className="px-6 py-4">Phone Number</th>
                                        <th className="px-6 py-4">Pickup Point</th>
                                        <th className="px-6 py-4">Dropoff Point</th>
                                        <th className="px-6 py-4 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-sm">
                                    {trip.passengers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-12 text-center text-gray-400 font-black">
                                                No students registered on this manifest. Upload a CSV manifest to add them.
                                            </td>
                                        </tr>
                                    ) : (
                                        trip.passengers.map((p: any, idx: number) => (
                                            <tr key={p.id || idx} className={`hover:bg-gray-50/50 dark:hover:bg-gray-800/10 ${p.added_via_scan ? 'bg-amber-500/10 dark:bg-amber-500/5' : ''}`}>
                                                <td className={`px-6 py-4 font-black ${p.added_via_scan ? 'text-amber-600 dark:text-amber-400 border-l-4 border-amber-500' : 'text-primary-600'}`}>{p.admission_number || 'N/A'}</td>
                                                <td className="px-6 py-4 font-bold text-gray-900 dark:text-gray-100">
                                                    <div className="flex items-center gap-2">
                                                        <span>{p.passenger_name}</span>
                                                        {p.added_via_scan && (
                                                            <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 animate-pulse">
                                                                Added via Scan
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-semibold text-gray-600 dark:text-gray-400">{p.phone_number || 'N/A'}</td>
                                                <td className="px-6 py-4 text-xs font-semibold text-gray-500">{p.pickup_location || 'Campus'}</td>
                                                <td className="px-6 py-4 text-xs font-semibold text-gray-500">{p.drop_off_location || 'Destination'}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                        p.arrival_confirmed ? 'bg-green-100 text-green-700 font-extrabold' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                        {p.arrival_confirmed ? 'Checked In' : 'Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Tab: Emergency Contacts */}
                {activeTab === 'emergency' && (
                    <div className="space-y-6 animate-fade-in">
                        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-950/30 rounded-2xl flex items-center gap-3">
                            <div className="p-2.5 bg-rose-500 text-white rounded-xl shadow-md shrink-0">
                                <ShieldAlert size={18} />
                            </div>
                            <div>
                                <h4 className="font-black text-rose-900 dark:text-rose-400 text-sm">Emergency Protocols Active</h4>
                                <p className="text-xs text-rose-700 dark:text-rose-500 font-semibold">Ensure a quick communication path with legal guardians or dean hotlines in case of transit incidents.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {trip.passengers.length === 0 ? (
                                <div className="col-span-2 p-12 text-center text-gray-400 font-bold border border-dashed border-gray-200 rounded-2xl">
                                    No passengers registered. Upload manifest to view emergency contacts.
                                </div>
                            ) : (
                                trip.passengers.map((p: any, idx: number) => (
                                    <div key={p.id || idx} className={`p-5 bg-white dark:bg-gray-800 rounded-2xl border shadow-sm flex justify-between items-center transition-colors ${
                                        p.added_via_scan 
                                            ? 'border-amber-250 dark:border-amber-900/50 hover:border-amber-400 bg-amber-50/5 dark:bg-amber-950/2' 
                                            : 'border-gray-150 dark:border-gray-700/50 hover:border-rose-300 dark:hover:border-rose-900/50'
                                    }`}>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase">{p.admission_number || 'STUDENT'}</p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <h4 className="text-base font-black text-gray-900 dark:text-white">{p.passenger_name}</h4>
                                                {p.added_via_scan && (
                                                    <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-900/30 animate-pulse">
                                                        Added via Scan
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-1 flex items-center gap-1">
                                                <Users size={12} /> Emergency: {p.emergency_contact_phone || 'None Listed'}
                                            </p>
                                        </div>
                                        {p.emergency_contact_phone && p.emergency_contact_phone !== 'N/A' && (
                                            <a href={`tel:${p.emergency_contact_phone}`} className="p-3.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                                                <Phone size={14} />
                                            </a>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Tab: Scanner */}
                {activeTab === 'scanner' && (
                    <div className="space-y-6 animate-fade-in max-w-md mx-auto">
                        <div className="text-center mb-4">
                            <h4 className="font-black text-gray-800 dark:text-white text-lg">Student Boarding Scanner</h4>
                            <p className="text-xs text-gray-500 font-semibold">Scan student QR codes to mark them as checked in.</p>
                        </div>
                        
                        {scanResult && (
                            <div className={`p-4 rounded-xl border font-bold text-sm mb-4 text-center animate-fade-in ${
                                scanResult.type === 'success' 
                                ? 'bg-green-50 border-green-200 text-green-700' 
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                                {scanResult.msg}
                            </div>
                        )}
                        
                        <div className="overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 shadow-inner bg-white">
                            <div id="qr-reader" className="w-full min-h-[300px]"></div>
                        </div>
                        
                        {isProcessingScan && (
                            <div className="flex justify-center p-4">
                                <Loader2 className="animate-spin text-primary-600" size={24} />
                            </div>
                        )}
                    </div>
                )}

                {/* Tab: QR & Trip Report */}
                {activeTab === 'report' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                        {/* QR Code Card */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/60 flex flex-col justify-between items-center text-center">
                            <div>
                                <span className="px-2.5 py-1 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-950/20 dark:text-yellow-400 text-[9px] font-black uppercase tracking-wider">Gatepass Security QR</span>
                                <h4 className="text-lg font-black mt-3 text-gray-900 dark:text-white">Authorization QR Code</h4>
                                <p className="text-xs text-gray-500 mt-1 mb-6">Scan at main gates to instantly verify vehicle, occupants, and trip validity.</p>
                            </div>
                            
                            <div className="p-4 bg-white dark:bg-gray-800 rounded-3xl shadow-inner border border-gray-100 dark:border-gray-700/80">
                                <img 
                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent("TRIP:" + trip.id + "|VEHICLE:" + trip.vehicle.plate_number)}`} 
                                    alt="Trip Authorization QR" 
                                    className="w-44 h-44 rounded-xl border-4 border-white"
                                />
                            </div>

                            <button 
                                onClick={() => window.open(`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent("TRIP:" + trip.id + "|VEHICLE:" + trip.vehicle.plate_number)}`, '_blank')}
                                className="mt-6 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-black shadow-sm flex items-center gap-1.5 hover:bg-gray-50 transition-colors"
                            >
                                <Download size={14} /> Download high resolution QR
                            </button>
                        </div>

                        {/* Summary Report Card */}
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800/60 flex flex-col justify-between">
                            <div>
                                <div className="flex justify-between items-start">
                                    <span className="px-2.5 py-1 rounded bg-primary-100 text-primary-800 dark:bg-primary-950/20 dark:text-primary-400 text-[9px] font-black uppercase tracking-wider">Executive Transit Summary</span>
                                    <button 
                                        onClick={() => window.print()}
                                        className="text-xs font-black text-primary-600 hover:underline flex items-center gap-1"
                                    >
                                        <Printer size={12} /> Print Summary Report
                                    </button>
                                </div>
                                <h4 className="text-lg font-black mt-3 text-gray-900 dark:text-white">Transit Logistics Report</h4>
                                <p className="text-xs text-gray-500 mt-1 mb-6">Fully summarized logistics audit metrics computed live from transit logs.</p>
                            </div>

                            {loadingReport ? (
                                <div className="flex justify-center p-6">
                                    <Loader2 className="animate-spin text-primary-600 mr-2" size={18} />
                                    <span className="text-xs text-gray-500 font-bold">Computing metrics...</span>
                                </div>
                            ) : report ? (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Distance Covered</p>
                                            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{report.distance_km || 0} <span className="text-xs text-gray-400 font-bold">KM</span></p>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Trip Duration</p>
                                            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{report.duration || 'N/A'}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Total Passengers</p>
                                            <p className="text-xl font-black text-gray-900 dark:text-white mt-1">{report.passenger_count} <span className="text-xs text-gray-400 font-bold">Seats</span></p>
                                        </div>
                                        <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm">
                                            <p className="text-[9px] font-black text-gray-400 uppercase">Associated Fuel Cost</p>
                                            <p className="text-xl font-black text-emerald-600 mt-1">KES {report.fuel_cost || 0}</p>
                                        </div>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700/50 shadow-sm text-xs font-semibold space-y-2">
                                        <div className="flex justify-between border-b border-gray-50 dark:border-gray-700 pb-1.5"><span className="text-gray-400">Status</span> <span className="font-black text-primary-600 uppercase">{report.status}</span></div>
                                        <div className="flex justify-between border-b border-gray-50 dark:border-gray-700 pb-1.5"><span className="text-gray-400">Driver</span> <span className="font-bold text-gray-800 dark:text-gray-200">{report.driver_name}</span></div>
                                        <div className="flex justify-between"><span className="text-gray-400">Trip Lead Coordinator</span> <span className="font-bold text-gray-800 dark:text-gray-200">{report.trip_lead_name}</span></div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-4 text-xs font-bold text-gray-400">Report details not calculated yet.</div>
                            )}

                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mt-6 block text-center">Verified Official Gatepass Logistics Audit</span>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

// Sub-Managers
function TripsManager({ trips, vehicles, onUpdate }: any) {
    const role = localStorage.getItem('userRole');
    const isAdmin = role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin';
    const [showForm, setShowForm] = useState(false);
    const [activeManifestTripId, setActiveManifestTripId] = useState<string | null>(null);

    const handleStartTrip = async (tripId: string, currentOdo: number) => {
        const odoStr = prompt("Enter starting odometer reading:", currentOdo.toString());
        if (odoStr === null) return;
        const odometer = parseFloat(odoStr);
        if (isNaN(odometer)) {
            alert("Please enter a valid number for odometer.");
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/trips/${tripId}/start?odometer=${odometer}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert("Trip started successfully!");
                onUpdate();
            } else {
                const err = await res.json();
                alert(`Error starting trip: ${err.detail || 'Failed'}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    const handleEndTrip = async (tripId: string, currentOdo: number) => {
        const odoStr = prompt("Enter ending odometer reading:", currentOdo.toString());
        if (odoStr === null) return;
        const odometer = parseFloat(odoStr);
        if (isNaN(odometer)) {
            alert("Please enter a valid number for odometer.");
            return;
        }
        if (odometer < currentOdo) {
            alert(`Ending odometer must be greater than or equal to starting odometer (${currentOdo}).`);
            return;
        }

        const notes = prompt("Enter any optional trip notes:") || "";

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/trips/${tripId}/end?odometer=${odometer}&notes=${encodeURIComponent(notes)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                alert("Trip ended successfully!");
                onUpdate();
            } else {
                const err = await res.json();
                alert(`Error ending trip: ${err.detail || 'Failed'}`);
            }
        } catch (e: any) {
            alert(`Error: ${e.message}`);
        }
    };

    if (activeManifestTripId) {
        return (
            <TripManifestViewer 
                tripId={activeManifestTripId}
                vehicles={vehicles}
                onClose={() => setActiveManifestTripId(null)}
                onUpdate={onUpdate}
            />
        );
    }

    return (
        <div className="glass-card p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black">Trip Manifests</h3>
                {isAdmin && (
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 flex items-center gap-2">
                        <Plus size={18} /> Schedule Trip
                    </button>
                )}
            </div>
            
            {showForm && (
                <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <h4 className="font-bold mb-4">New Trip Details</h4>
                    <TripForm vehicles={vehicles} onSuccess={() => { setShowForm(false); onUpdate(); }} />
                </div>
            )}

            <div className="space-y-4">
                {(trips || []).map((trip: any, i: number) => {
                    const vehicle = vehicles.find((v: any) => v.id === trip.vehicle_id);
                    const seatingCapacity = vehicle?.seating_capacity || 0;
                    const availableSeats = Math.max(0, seatingCapacity - (trip.passengers_count || 0));

                    return (
                        <div key={i} className="p-6 bg-white rounded-2xl border border-gray-100 hover:border-primary-300 transition-all shadow-sm">
                            <div className="flex flex-col lg:flex-row justify-between gap-6">
                                <div className="flex-1">
                                    <div className="flex flex-wrap items-center gap-3 mb-3">
                                        <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                            trip.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                                        }`}>{trip.status}</span>
                                        <span className="text-xs font-bold text-gray-400">
                                            {new Date(trip.scheduled_departure).toLocaleString()}
                                            {trip.expected_return && ` - ${new Date(trip.expected_return).toLocaleString()}`}
                                        </span>
                                    </div>
                                    <h4 className="text-xl font-black text-gray-900 mb-4">{trip.origin} <ChevronRight className="inline text-gray-300" /> {trip.destination}</h4>
                                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vehicle</p>
                                            <p className="text-sm font-bold">{vehicle?.plate_number || 'Unit'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Purpose</p>
                                            <p className="text-sm font-bold">{trip.purpose}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Person in Charge</p>
                                            <p className="text-sm font-bold">{trip.trip_lead_name || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Lead Contact</p>
                                            <p className="text-sm font-bold">{trip.trip_lead_contact || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Available Seats</p>
                                            <p className="text-sm font-bold text-primary-600">{availableSeats} / {seatingCapacity}</p>
                                        </div>
                                    </div>
                                </div>
                            <div className="flex items-center gap-3">
                                {isAdmin && trip.status === 'scheduled' && (
                                    <button 
                                        onClick={() => handleStartTrip(trip.id, vehicles.find((v: any) => v.id === trip.vehicle_id)?.current_odometer || 0)} 
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Start Trip
                                    </button>
                                )}
                                {isAdmin && trip.status === 'ongoing' && (
                                    <button 
                                        onClick={() => handleEndTrip(trip.id, trip.start_odometer || 0)} 
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
                                    >
                                        End Trip
                                    </button>
                                )}
                                <button 
                                    onClick={() => setActiveManifestTripId(trip.id)}
                                    className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-colors"
                                >
                                    Manifest
                                </button>
                            </div>
                        </div>
                    </div>
                )})}
            </div>
        </div>
    );
}

function FuelManagement({ vehicles, logs, onUpdate }: any) {
    const role = localStorage.getItem('userRole');
    const isAdmin = role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin';
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        vehicle_id: '',
        amount_liters: '',
        cost: '',
        odometer_reading: '',
        station_name: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/fleet/fuel-logs', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify({
                    ...formData,
                    amount_liters: parseFloat(formData.amount_liters),
                    cost: parseFloat(formData.cost),
                    odometer_reading: parseFloat(formData.odometer_reading),
                    timestamp: new Date().toISOString()
                })
            });
            if (res.ok) {
                setFormData({ vehicle_id: '', amount_liters: '', cost: '', odometer_reading: '', station_name: '' });
                onUpdate();
            } else {
                const data = await res.json();
                alert(`Error: ${data.detail || 'Failed to post fuel log'}`);
            }
        } catch (e: any) {
            alert(`Network error: ${e.message}`);
        } finally { setIsSubmitting(false); }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            {isAdmin && (
                <div className="lg:col-span-1 glass-card p-6">
                    <h3 className="text-lg font-black mb-6">Log Refill</h3>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <select 
                            required 
                            value={formData.vehicle_id}
                            onChange={e => setFormData({...formData, vehicle_id: e.target.value})}
                            className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none"
                        >
                            <option value="">Select Vehicle</option>
                            {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                        </select>
                        <div className="grid grid-cols-2 gap-4">
                            <input type="number" step="0.01" required placeholder="Liters" value={formData.amount_liters} onChange={e => setFormData({...formData, amount_liters: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                            <input type="number" step="0.01" required placeholder="Cost (KES)" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                        </div>
                        <input type="number" required placeholder="Odometer Reading" value={formData.odometer_reading} onChange={e => setFormData({...formData, odometer_reading: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                        <input type="text" required placeholder="Fuel Station" value={formData.station_name} onChange={e => setFormData({...formData, station_name: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                        <button disabled={isSubmitting} className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl hover:opacity-90 disabled:opacity-50">
                            {isSubmitting ? 'Logging...' : 'Save Fuel Log'}
                        </button>
                    </form>
                </div>
            )}
            <div className={`${isAdmin ? 'lg:col-span-2' : 'lg:col-span-3'} glass-card p-6`}>
                <h3 className="text-lg font-black mb-6">Refill History</h3>
                <div className="space-y-4">
                    {(logs || []).map((log: any, i: number) => (
                        <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><Fuel size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-sm">{(vehicles || []).find((v: any) => v.id === log.vehicle_id)?.plate_number || 'Unit'} • {log.station_name}</h4>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">{log.amount_liters}L • {new Date(log.timestamp).toLocaleDateString()}</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-black text-gray-900">KES {log.cost.toLocaleString()}</p>
                                <p className="text-[10px] font-bold text-green-600">Verified</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MaintenanceManager({ vehicles, logs, onUpdate }: any) {
    const role = localStorage.getItem('userRole');
    const isAdmin = role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin';
    const [showForm, setShowForm] = useState(false);
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Maintenance & Service</h3>
                {isAdmin && (
                    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                        <Wrench size={18} /> Log Service
                    </button>
                )}
            </div>
            
            {showForm && (
                <div className="p-8 bg-white border-2 border-red-100 rounded-3xl shadow-xl">
                    <MaintenanceForm vehicles={vehicles} onSuccess={() => { setShowForm(false); onUpdate(); }} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(logs || []).map((log: any, i: number) => (
                    <div key={i} className="glass-card p-6 border-t-4 border-red-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Shield size={20} /></div>
                            <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">{log.service_type}</span>
                        </div>
                        <h4 className="font-black text-gray-900 mb-1">{(vehicles || []).find((v: any) => v.id === log.vehicle_id)?.plate_number || 'Unit'}</h4>
                        <p className="text-xs text-gray-500 mb-4">{log.description}</p>
                        <div className="pt-4 border-t border-gray-50 flex justify-between text-[10px] font-bold uppercase tracking-wider">
                            <span className="text-gray-400">Next Service</span>
                            <span className="text-red-600">{log.next_service_due_odometer} KM</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function DriverManager() {
    const [drivers, setDrivers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showAddDriver, setShowAddDriver] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState('');
    const [formSuccess, setFormSuccess] = useState('');
    const [formData, setFormData] = useState({
        full_name: '',
        admission_number: '',
        email: '',
        phone_number: '',
        school: 'Logistics & Transport',
        password: 'Driver123!'
    });

    const userRole = localStorage.getItem('userRole');
    const isAdmin = userRole?.toLowerCase() === 'superadmin' || userRole?.toLowerCase() === 'admin';

    const fetchDrivers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) {
                const allUsers = await res.json();
                setDrivers(allUsers.filter((u: any) => 
                    (u.role || '').toLowerCase() === 'driver' ||
                    (u.role_name || '').toLowerCase() === 'driver' ||
                    (u.role || '').toLowerCase() === 'lecturer' ||
                    (u.admission_number || '').startsWith('LEC') ||
                    (u.admission_number || '').startsWith('DRV')
                ));
            }
        } catch(e) {}
        setLoading(false);
    };

    useEffect(() => {
        fetchDrivers();
    }, []);

    const handleAddDriver = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError('');
        setFormSuccess('');
        setSubmitting(true);

        if (!formData.full_name || !formData.admission_number || !formData.email || !formData.phone_number) {
            setFormError('Please fill in all required fields.');
            setSubmitting(false);
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/users/create', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    admission_number: formData.admission_number,
                    full_name: formData.full_name,
                    email: formData.email,
                    phone_number: formData.phone_number,
                    school: formData.school,
                    role_name: 'Driver',
                    password: formData.password,
                    has_smartphone: true
                })
            });

            if (res.ok) {
                setFormSuccess('Driver added successfully!');
                setFormData({
                    full_name: '',
                    admission_number: '',
                    email: '',
                    phone_number: '',
                    school: 'Logistics & Transport',
                    password: 'Driver123!'
                });
                setTimeout(() => {
                    setShowAddDriver(false);
                    setFormSuccess('');
                }, 1500);
                fetchDrivers();
            } else {
                const errData = await res.json();
                setFormError(errData.detail || 'Failed to add driver. Please check that the Driver ID or Email is unique.');
            }
        } catch (e: any) {
            setFormError('Connection error. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const filtered = (drivers || []).filter(d =>
        (d.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.admission_number || '').toLowerCase().includes(search.toLowerCase()) ||
        (d.email || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900 dark:text-white">Driver & Staff Registry</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Manage all registered campus fleet operators and drivers</p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:flex-initial">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                            type="text" placeholder="Search drivers..."
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none w-full md:w-64 text-gray-900 dark:text-white"
                        />
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => setShowAddDriver(true)}
                            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:scale-105 transition-all flex items-center gap-2"
                        >
                            <Plus size={18} /> Add Driver
                        </button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-20"><Loader2 className="animate-spin text-primary-600" size={36} /></div>
            ) : filtered.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Users className="mx-auto text-gray-200 mb-4" size={64} />
                    <h3 className="text-xl font-black text-gray-700 mb-2">No Drivers Found</h3>
                    <p className="text-gray-500 text-sm max-w-sm mx-auto">Register campus fleet operators or assign lecturers to manage fleet trips.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((d: any, i: number) => (
                        <div key={i} className="glass-card p-6 hover:shadow-lg transition-all border border-gray-100 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-3xl">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 rounded-2xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center overflow-hidden">
                                    {d.profile_image ? (
                                        <img src={d.profile_image} alt={d.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-xl font-black text-primary-600 dark:text-primary-400">{(d.full_name || 'D').charAt(0)}</span>
                                    )}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h4 className="font-black text-gray-900 dark:text-white truncate">{d.full_name}</h4>
                                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 rounded text-[9px] font-black uppercase tracking-wider">
                                        {d.role || d.role_name || 'Driver'}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-2 text-xs">
                                <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-1.5">
                                    <span className="font-bold text-gray-400 uppercase">Driver ID</span>
                                    <span className="font-black text-gray-700 dark:text-gray-200">{d.admission_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-1.5">
                                    <span className="font-bold text-gray-400 uppercase">Phone</span>
                                    <span className="font-black text-gray-700 dark:text-gray-200">{d.phone_number || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-50 dark:border-gray-800 pb-1.5">
                                    <span className="font-bold text-gray-400 uppercase">Email</span>
                                    <span className="font-black text-gray-700 dark:text-gray-200 truncate max-w-[140px]">{d.email || 'N/A'}</span>
                                </div>
                                <div className="flex justify-between pb-1.5">
                                    <span className="font-bold text-gray-400 uppercase">Department</span>
                                    <span className="font-black text-gray-700 dark:text-gray-200">{d.school || 'Logistics'}</span>
                                </div>
                            </div>
                            {d.phone_number && (
                                <a href={`tel:${d.phone_number}`} className="mt-4 w-full py-2.5 bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary-100 dark:hover:bg-primary-900/40 transition-all border border-primary-100/50 dark:border-primary-900/30">
                                    <Phone size={14} /> Call Driver
                                </a>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Add Driver Modal */}
            {showAddDriver && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 w-full max-w-lg animate-slide-up shadow-2xl relative border border-gray-100 dark:border-gray-800">
                        <button onClick={() => setShowAddDriver(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-950 dark:hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                        
                        <div className="mb-6">
                            <h2 className="text-2xl font-black text-gray-900 dark:text-white">Register New Driver</h2>
                            <p className="text-xs text-gray-500">Create a user account with driver privileges for the fleet tracking system</p>
                        </div>

                        {formError && (
                            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold flex items-center gap-2 animate-shake">
                                <X size={16} /> {formError}
                            </div>
                        )}

                        {formSuccess && (
                            <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-700 rounded-2xl text-xs font-bold flex items-center gap-2">
                                <Check size={16} /> {formSuccess}
                            </div>
                        )}

                        <form onSubmit={handleAddDriver} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Full Name *</label>
                                <input
                                    type="text" placeholder="e.g. John Kamau"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Driver ID / License *</label>
                                    <input
                                        type="text" placeholder="e.g. DRV004"
                                        value={formData.admission_number}
                                        onChange={e => setFormData({ ...formData, admission_number: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Department</label>
                                    <input
                                        type="text" placeholder="e.g. Logistics"
                                        value={formData.school}
                                        onChange={e => setFormData({ ...formData, school: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Email Address *</label>
                                <input
                                    type="email" placeholder="e.g. driver@ru.ac.ke"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Phone Number *</label>
                                    <input
                                        type="tel" placeholder="e.g. 0700000000"
                                        value={formData.phone_number}
                                        onChange={e => setFormData({ ...formData, phone_number: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5">Default Password</label>
                                    <input
                                        type="text" placeholder="Password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold outline-none text-gray-900 dark:text-white focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="mt-6 w-full py-3.5 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-black text-sm shadow-lg shadow-primary-500/20 hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:scale-100"
                            >
                                {submitting ? <Loader2 className="animate-spin" size={18} /> : 'Register Driver'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

interface VehiclesManagerProps {
    vehicles: any[];
    onUpdate: () => void;
    setShowAddVehicle: (show: boolean) => void;
    setEditingVehicle: (vehicle: any) => void;
}

function VehiclesManager({ vehicles, onUpdate, setShowAddVehicle, setEditingVehicle }: VehiclesManagerProps) {
    const { showConfirm, showNotification } = useNotification();
    const role = localStorage.getItem('userRole');
    const isAdmin = role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin';
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, statusFilter]);

    const handleDeleteVehicle = async (vehicleId: string, plateNumber: string) => {
        const confirmed = await showConfirm({
            title: "Delete Vehicle",
            message: `Are you absolutely sure you want to delete vehicle ${plateNumber}? This will permanently remove all associated trips, fuel logs, and maintenance logs.`,
            confirmText: "Delete Vehicle",
            cancelText: "Cancel",
            isDanger: true
        });
        if (!confirmed) {
            return;
        }
        setDeletingId(vehicleId);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/vehicles/${vehicleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showNotification(`Vehicle ${plateNumber} successfully deleted.`, 'success');
                onUpdate();
            } else {
                const err = await res.json();
                showNotification(`Error deleting vehicle: ${err.detail || 'Failed'}`, 'error');
            }
        } catch (e: any) {
            showNotification(`Network error: ${e.message}`, 'error');
        } finally {
            setDeletingId(null);
        }
    };

    const handleToggleStatus = async (vehicle: any) => {
        const action = vehicle.is_checked_in ? 'checkout' : 'checkin';
        const actionLabel = vehicle.is_checked_in ? 'Check Out' : 'Check In';
        const confirmed = await showConfirm({
            title: `Confirm ${actionLabel}`,
            message: `Do you want to manually ${actionLabel.toLowerCase()} vehicle ${vehicle.plate_number}?`,
            confirmText: actionLabel,
            cancelText: "Cancel"
        });
        if (!confirmed) {
            return;
        }
        setStatusUpdatingId(vehicle.id);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`/api/fleet/vehicles/${vehicle.id}/${action}`, {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ passengers: 1 })
            });
            if (res.ok) {
                showNotification(`Vehicle ${vehicle.plate_number} has been ${vehicle.is_checked_in ? 'checked out' : 'checked in'} successfully.`, 'success');
                onUpdate();
            } else {
                const err = await res.json();
                showNotification(`Error updating status: ${err.detail || 'Failed'}`, 'error');
            }
        } catch (e: any) {
            showNotification(`Network error: ${e.message}`, 'error');
        } finally {
            setStatusUpdatingId(null);
        }
    };

    const filteredVehicles = vehicles.filter(v => {
        const matchesSearch = v.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (v.make && v.make.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (v.model && v.model.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === 'all' || v.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const totalVehiclePages = Math.ceil(filteredVehicles.length / itemsPerPage);
    const vehicleStartIndex = (currentPage - 1) * itemsPerPage;
    const paginatedVehicles = filteredVehicles.slice(vehicleStartIndex, vehicleStartIndex + itemsPerPage);

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-50 text-green-700 border-green-200';
            case 'maintenance':
                return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'inactive':
                return 'bg-gray-50 text-gray-500 border-gray-200';
            default:
                return 'bg-blue-50 text-blue-700 border-blue-200';
        }
    };

    const getVehicleTypeIcon = (type: string) => {
        switch (type) {
            case 'bus': return '🚌';
            case 'shuttle': return '🚐';
            case 'staff': return '🚗';
            default: return '🚚';
        }
    };

    return (
        <div className="glass-card p-6 animate-fade-in space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h3 className="text-xl font-black text-gray-900">Fleet Vehicles Administration</h3>
                    <p className="text-sm text-gray-500 font-medium">Manage campus vehicles, track statuses, and schedule fleet updates</p>
                </div>
                {isAdmin && (
                    <button 
                        onClick={() => setShowAddVehicle(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Register Vehicle
                    </button>
                )}
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search by plate number, make or model..." 
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary-500/20 transition-all"
                    />
                </div>
                <div className="flex gap-2">
                    {['all', 'active', 'maintenance', 'inactive'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all border ${
                                statusFilter === status 
                                ? 'bg-primary-600 text-white border-primary-600 shadow-md' 
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-50'
                            }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Grid of Vehicles */}
            {filteredVehicles.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold text-lg mb-1">No Vehicles Found</p>
                    <p className="text-sm text-gray-400">Try adjusting your search filters or register a new campus vehicle.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {paginatedVehicles.map(vehicle => (
                        <div key={vehicle.id} className="p-6 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:border-primary-100 transition-all duration-300 flex flex-col justify-between shadow-sm relative group overflow-hidden">
                            {/* Accent line based on status */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                                vehicle.status === 'active' ? 'bg-green-500' :
                                vehicle.status === 'maintenance' ? 'bg-amber-500' : 'bg-gray-400'
                            }`} />

                            <div className="space-y-4">
                                <div className="flex justify-between items-start pt-2">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl" role="img" aria-label={vehicle.vehicle_type}>
                                            {getVehicleTypeIcon(vehicle.vehicle_type)}
                                        </span>
                                        <div>
                                            <h4 className="font-black text-gray-900 text-lg uppercase tracking-tight">{vehicle.plate_number}</h4>
                                            <p className="text-xs text-gray-400 font-bold uppercase">{vehicle.make} {vehicle.model}</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-end gap-1.5">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border ${getStatusStyles(vehicle.status)}`}>
                                            {vehicle.status}
                                        </span>
                                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider flex items-center gap-1 ${
                                            vehicle.is_checked_in 
                                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-150' 
                                            : 'bg-gray-50 text-gray-500 border border-gray-150'
                                        }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full ${vehicle.is_checked_in ? 'bg-emerald-500' : 'bg-gray-400'}`}></span>
                                            {vehicle.is_checked_in ? 'Inside' : 'Outside'}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50 text-[11px]">
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-wider mb-0.5">Odometer</p>
                                        <p className="font-extrabold text-gray-800">{vehicle.current_odometer?.toLocaleString() || 0} KM</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-wider mb-0.5">Type</p>
                                        <p className="font-extrabold text-gray-800 capitalize">{vehicle.vehicle_type || 'Utility'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-wider mb-0.5">Fuel Type</p>
                                        <p className="font-extrabold text-gray-800 capitalize">{vehicle.fuel_type || 'Diesel'}</p>
                                    </div>
                                    <div>
                                        <p className="text-gray-400 font-bold uppercase tracking-wider mb-0.5">Fuel Capacity</p>
                                        <p className="font-extrabold text-gray-800">{vehicle.fuel_capacity || 0} Liters</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-50">
                                <span className="text-[10px] font-extrabold text-gray-400 uppercase">Year: {vehicle.year || 'N/A'}</span>
                                {isAdmin && (
                                    <div className="flex items-center gap-1.5">
                                        {/* Campus Status Toggle Button */}
                                        <button
                                            disabled={statusUpdatingId === vehicle.id}
                                            onClick={() => handleToggleStatus(vehicle)}
                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 border ${
                                                vehicle.is_checked_in 
                                                ? 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100' 
                                                : 'bg-emerald-600 text-white border-emerald-600 hover:scale-105 shadow-md shadow-emerald-500/10'
                                            } disabled:opacity-50`}
                                            title={vehicle.is_checked_in ? "Checkout Vehicle" : "Checkin Vehicle"}
                                        >
                                            {statusUpdatingId === vehicle.id ? (
                                                <Loader2 size={12} className="animate-spin" />
                                            ) : vehicle.is_checked_in ? (
                                                'Log Out'
                                            ) : (
                                                'Log In'
                                            )}
                                        </button>

                                        {/* Edit Details Button */}
                                        <button 
                                            onClick={() => setEditingVehicle(vehicle)}
                                            className="p-2 text-primary-600 hover:bg-primary-50 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-primary-100"
                                            title="Modify Details"
                                        >
                                            <Edit size={14} />
                                        </button>

                                        {/* Delete Button */}
                                        <button 
                                            disabled={deletingId === vehicle.id}
                                            onClick={() => handleDeleteVehicle(vehicle.id, vehicle.plate_number)}
                                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all flex items-center justify-center border border-transparent hover:border-red-100 disabled:opacity-50"
                                            title="Remove Vehicle"
                                        >
                                            {deletingId === vehicle.id ? (
                                                <Loader2 size={14} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Vehicles Pagination */}
            {totalVehiclePages > 1 && (
                <div className="flex items-center justify-between bg-white border border-gray-100 p-4 rounded-2xl shadow-sm">
                    <div className="text-xs text-gray-500">
                        Showing <span className="font-bold text-gray-800">{vehicleStartIndex + 1}</span> – <span className="font-bold text-gray-800">{Math.min(vehicleStartIndex + itemsPerPage, filteredVehicles.length)}</span> of <span className="font-bold text-gray-800">{filteredVehicles.length}</span> vehicles
                    </div>
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 font-bold text-xs transition-all flex items-center gap-1"
                        >
                            ← Prev
                        </button>
                        {Array.from({ length: totalVehiclePages }, (_, i) => i + 1)
                            .filter(p => p === 1 || p === totalVehiclePages || Math.abs(p - currentPage) <= 1)
                            .map((pageNum, idx, arr) => (
                                <>
                                    {idx > 0 && pageNum - arr[idx - 1] > 1 && <span key={`e${pageNum}`} className="text-gray-300 text-xs">…</span>}
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all ${
                                            currentPage === pageNum
                                                ? 'bg-primary-600 text-white shadow-md'
                                                : 'border border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                </>
                            ))
                        }
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalVehiclePages, p + 1))}
                            disabled={currentPage === totalVehiclePages}
                            className="px-3 py-1.5 rounded-xl border border-gray-200 hover:bg-gray-50 disabled:opacity-40 font-bold text-xs transition-all flex items-center gap-1"
                        >
                            Next →
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

// Form Components
interface VehicleFormProps {
    vehicle?: any;
    onSuccess: () => void;
    onError?: (msg: string) => void;
}

function VehicleForm({ vehicle, onSuccess, onError }: VehicleFormProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        plate_number: '',
        make: '',
        model: '',
        color: '',
        vehicle_type: 'bus',
        fuel_type: 'diesel',
        fuel_capacity: 0,
        seating_capacity: 0,
        year: new Date().getFullYear(),
        driver_name: '',
        driver_contact: '',
        driver_id_number: '',
        engine_number: '',
        chassis_number: '',
        current_odometer: 0,
        status: 'active',
        insurance_expiry: '',
    });

    // Sync form when editing vehicle prop changes
    useEffect(() => {
        if (vehicle) {
            setFormData({
                plate_number: vehicle.plate_number || '',
                make: vehicle.make || '',
                model: vehicle.model || '',
                color: vehicle.color || '',
                vehicle_type: vehicle.vehicle_type || 'bus',
                fuel_type: vehicle.fuel_type || 'diesel',
                fuel_capacity: vehicle.fuel_capacity || 0,
                seating_capacity: vehicle.seating_capacity || 0,
                year: vehicle.year || new Date().getFullYear(),
                driver_name: vehicle.driver_name || '',
                driver_contact: vehicle.driver_contact || '',
                driver_id_number: vehicle.driver_id_number || '',
                engine_number: vehicle.engine_number || '',
                chassis_number: vehicle.chassis_number || '',
                current_odometer: vehicle.current_odometer || 0,
                status: vehicle.status || 'active',
                insurance_expiry: vehicle.insurance_expiry || '',
            });
        }
    }, [vehicle?.id]);

    const set = (key: string, val: any) => setFormData(p => ({...p, [key]: val}));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const url = vehicle ? `/api/fleet/vehicles/${vehicle.id}` : '/api/fleet/vehicles';
            const method = vehicle ? 'PUT' : 'POST';
            const payload = { ...formData,
                fuel_capacity: Number(formData.fuel_capacity),
                seating_capacity: Number(formData.seating_capacity),
                year: Number(formData.year),
                current_odometer: Number(formData.current_odometer),
                insurance_expiry: formData.insurance_expiry || undefined,
            };
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                const msg = data.detail || 'Failed to save vehicle';
                if (onError) onError(msg); else alert(`❌ Error: ${msg}`);
            }
        } catch (e: any) {
            const msg = e.message;
            if (onError) onError(msg); else alert(`❌ Network error: ${msg}`);
        } finally { setIsSubmitting(false); }
    };

    const inp = "w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-primary-400 focus:bg-white transition-all";
    const lbl = "block text-[10px] font-black text-gray-400 uppercase mb-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                    <label className={lbl}>Plate Number *</label>
                    <input required placeholder="e.g. KAB 123G" value={formData.plate_number} onChange={e => set('plate_number', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Make *</label>
                    <input required placeholder="e.g. Toyota" value={formData.make} onChange={e => set('make', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Model *</label>
                    <input required placeholder="e.g. Coaster" value={formData.model} onChange={e => set('model', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Color</label>
                    <input placeholder="e.g. White" value={formData.color} onChange={e => set('color', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Year</label>
                    <input type="number" value={formData.year} onChange={e => set('year', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Vehicle Type *</label>
                    <select value={formData.vehicle_type} onChange={e => set('vehicle_type', e.target.value)} className={inp}>
                        <option value="bus">🚌 Bus</option>
                        <option value="shuttle">🚐 Shuttle / Matatu</option>
                        <option value="staff">🚗 Staff Car</option>
                        <option value="utility">🚚 Utility / Truck</option>
                        <option value="motorcycle">🏍️ Motorcycle</option>
                    </select>
                </div>
                <div>
                    <label className={lbl}>Fuel Type</label>
                    <select value={formData.fuel_type} onChange={e => set('fuel_type', e.target.value)} className={inp}>
                        <option value="diesel">Diesel</option>
                        <option value="petrol">Petrol</option>
                        <option value="electric">Electric</option>
                        <option value="hybrid">Hybrid</option>
                    </select>
                </div>
                <div>
                    <label className={lbl}>Fuel Capacity (L)</label>
                    <input type="number" value={formData.fuel_capacity} onChange={e => set('fuel_capacity', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Seating Capacity</label>
                    <input type="number" value={formData.seating_capacity} onChange={e => set('seating_capacity', e.target.value)} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Status</label>
                    <select value={formData.status} onChange={e => set('status', e.target.value)} className={inp}>
                        <option value="active">Active</option>
                        <option value="maintenance">In Maintenance</option>
                        <option value="inactive">Inactive / Retired</option>
                    </select>
                </div>
                <div>
                    <label className={lbl}>Current Odometer (km)</label>
                    <input type="number" value={formData.current_odometer} onChange={e => set('current_odometer', e.target.value)} className={inp} />
                </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Driver / Crew Information</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={lbl}>Driver Name</label>
                        <input placeholder="Full name" value={formData.driver_name} onChange={e => set('driver_name', e.target.value)} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Driver Contact</label>
                        <input placeholder="+254 7XX XXX XXX" value={formData.driver_contact} onChange={e => set('driver_contact', e.target.value)} className={inp} />
                    </div>
                    <div className="col-span-2">
                        <label className={lbl}>Driver ID / License No.</label>
                        <input placeholder="National ID or License Number" value={formData.driver_id_number} onChange={e => set('driver_id_number', e.target.value)} className={inp} />
                    </div>
                </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Vehicle Identifiers & Insurance</p>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={lbl}>Engine Number</label>
                        <input placeholder="Engine No." value={formData.engine_number} onChange={e => set('engine_number', e.target.value)} className={inp} />
                    </div>
                    <div>
                        <label className={lbl}>Chassis Number</label>
                        <input placeholder="Chassis / VIN" value={formData.chassis_number} onChange={e => set('chassis_number', e.target.value)} className={inp} />
                    </div>
                    <div className="col-span-2">
                        <label className={lbl}>Insurance Expiry Date</label>
                        <input type="date" value={formData.insurance_expiry} onChange={e => set('insurance_expiry', e.target.value)} className={inp} />
                    </div>
                </div>
            </div>

            <button disabled={isSubmitting} className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl hover:opacity-90 mt-2 flex items-center justify-center gap-2">
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                {isSubmitting ? 'Saving...' : vehicle ? 'Update Vehicle Details' : 'Complete Registration'}
            </button>
        </form>
    );
}

function TripForm({ vehicles, onSuccess }: any) {
    const [formData, setFormData] = useState({
        vehicle_id: '', 
        origin: 'Riara University Main Campus', 
        destination: '', 
        purpose: '', 
        scheduled_departure: '',
        expected_return: '',
        trip_lead_name: '',
        trip_lead_contact: ''
    });
    
    const [showOriginSuggestions, setShowOriginSuggestions] = useState(false);
    const [showDestSuggestions, setShowDestSuggestions] = useState(false);
    const [showMapModal, setShowMapModal] = useState(false);
    const [mapMode, setMapMode] = useState<'origin' | 'destination'>('destination');
    const [previewData, setPreviewData] = useState<{distance: number, duration: string} | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const KENYA_LOCATIONS = [
        "Riara University Main Campus",
        "Nairobi CBD",
        "Nyahururu",
        "Mombasa",
        "Nakuru",
        "Kisumu",
        "Eldoret",
        "Nyeri",
        "Thika",
        "Machakos",
        "Naivasha",
        "Juja (JKUAT)",
        "Karen",
        "Westlands",
        "Lavington",
        "Rongai",
        "Kajiado",
        "Kisii",
        "Kakamega",
        "Meru",
        "Embu",
        "Kericho"
    ];

    const MAP_PRESETS = [
        { name: "Riara University Main Campus", coords: [-1.3117, 36.8123] as [number, number] },
        { name: "Nairobi CBD", coords: [-1.286389, 36.817223] as [number, number] },
        { name: "Nyahururu", coords: [-0.0421, 36.3621] as [number, number] },
        { name: "Mombasa", coords: [-4.0435, 39.6682] as [number, number] },
        { name: "Nakuru", coords: [-0.3031, 36.0700] as [number, number] },
        { name: "Eldoret", coords: [0.5143, 35.2698] as [number, number] }
    ];

    const ROUTE_DISTANCES: Record<string, number> = {
        "Riara University Main Campus-Nyahururu": 180,
        "Riara University Main Campus-Mombasa": 485,
        "Riara University Main Campus-Nakuru": 160,
        "Riara University Main Campus-Kisumu": 350,
        "Riara University Main Campus-Eldoret": 310,
        "Riara University Main Campus-Nyeri": 150,
        "Riara University Main Campus-Thika": 45,
        "Riara University Main Campus-Machakos": 65,
        "Riara University Main Campus-Naivasha": 90,
        "Riara University Main Campus-Karen": 15,
        "Riara University Main Campus-Westlands": 10,
        "Riara University Main Campus-Nairobi CBD": 8,
        "Riara University Main Campus-Juja (JKUAT)": 35
    };

    const getRouteDistance = (origin: string, dest: string) => {
        const key = `${origin.trim()}-${dest.trim()}`;
        if (ROUTE_DISTANCES[key]) return ROUTE_DISTANCES[key];
        const reverseKey = `${dest.trim()}-${origin.trim()}`;
        if (ROUTE_DISTANCES[reverseKey]) return ROUTE_DISTANCES[reverseKey];
        
        // Fallback stable mock distance based on characters
        let hash = 0;
        const str = key;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        return Math.abs(hash % 300) + 12;
    };

    const handleConfirmSchedule = (e: React.FormEvent) => {
        e.preventDefault();
        const dist = getRouteDistance(formData.origin, formData.destination);
        const hours = dist / 80;
        const h = Math.floor(hours);
        const m = Math.round((hours - h) * 60);
        const durationStr = `${h > 0 ? `${h}h ` : ''}${m}m`;
        setPreviewData({
            distance: dist,
            duration: durationStr
        });
    };

    const handleSave = async () => {
        setIsSubmitting(true);
        try {
            // Validate required fields before sending
            if (!formData.vehicle_id) {
                alert('Please select a vehicle before saving the trip.');
                setIsSubmitting(false);
                return;
            }
            if (!formData.destination.trim()) {
                alert('Please enter a destination.');
                setIsSubmitting(false);
                return;
            }
            if (!formData.purpose.trim()) {
                alert('Please enter a purpose for the trip.');
                setIsSubmitting(false);
                return;
            }
            if (!formData.scheduled_departure) {
                alert('Please set a scheduled departure date and time.');
                setIsSubmitting(false);
                return;
            }

            // Convert datetime-local string to proper ISO 8601 format
            const departureISO = new Date(formData.scheduled_departure).toISOString();
            const returnISO = formData.expected_return ? new Date(formData.expected_return).toISOString() : undefined;

            const payload = {
                vehicle_id: formData.vehicle_id,
                origin: formData.origin || 'Riara University Main Campus',
                destination: formData.destination,
                purpose: formData.purpose,
                scheduled_departure: departureISO,
                expected_return: returnISO,
                trip_lead_name: formData.trip_lead_name || undefined,
                trip_lead_contact: formData.trip_lead_contact || undefined,
                status: 'scheduled'
            };

            const token = localStorage.getItem('token');
            const res = await fetch('/api/fleet/trips', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(payload)
            });

            let data: any = {};
            const contentType = res.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
                data = await res.json();
            }

            if (res.ok) {
                alert('✅ Trip scheduled successfully!');
                onSuccess();
            } else {
                alert(`❌ Error: ${data.detail || `Server returned status ${res.status}. Please try again.`}`);
            }
        } catch (e: any) {
            alert(`❌ Network error: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    function MapClickHandler({ onSelect }: { onSelect: (name: string) => void }) {
        const map = useMap();
        useEffect(() => {
            map.on('click', (e: any) => {
                const lat = e.latlng.lat;
                const lng = e.latlng.lng;
                
                // Find nearest preset
                let nearest = MAP_PRESETS[0];
                let minDist = Infinity;
                MAP_PRESETS.forEach(p => {
                    const d = Math.pow(p.coords[0] - lat, 2) + Math.pow(p.coords[1] - lng, 2);
                    if (d < minDist) {
                        minDist = d;
                        nearest = p;
                    }
                });

                if (minDist < 0.05) {
                    onSelect(nearest.name);
                } else {
                    onSelect(`Location (${lat.toFixed(3)}, ${lng.toFixed(3)})`);
                }
            });
        }, [map]);
        return null;
    }

    const filteredOriginLocs = KENYA_LOCATIONS.filter(l => 
        l.toLowerCase().includes(formData.origin.toLowerCase()) && 
        l.toLowerCase() !== formData.origin.toLowerCase()
    );

    const filteredDestLocs = KENYA_LOCATIONS.filter(l => 
        l.toLowerCase().includes(formData.destination.toLowerCase()) && 
        l.toLowerCase() !== formData.destination.toLowerCase()
    );

    return (
        <div className="space-y-4">
            <form onSubmit={handleConfirmSchedule} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Vehicle</label>
                    <select required value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm">
                        <option value="">Select Vehicle</option>
                        {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                    </select>
                </div>

                <div className="flex flex-col relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 flex justify-between">
                        <span>Origin</span>
                        <button type="button" onClick={() => { setMapMode('origin'); setShowMapModal(true); }} className="text-primary-600 hover:underline flex items-center gap-1">📍 Pick</button>
                    </label>
                    <input required placeholder="Origin" value={formData.origin} 
                        onFocus={() => setShowOriginSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowOriginSuggestions(false), 200)}
                        onChange={e => setFormData({...formData, origin: e.target.value})} 
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm" 
                    />
                    {showOriginSuggestions && filteredOriginLocs.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[1500] max-h-48 overflow-y-auto">
                            {filteredOriginLocs.map((loc, idx) => (
                                <button key={idx} type="button" onMouseDown={() => setFormData({...formData, origin: loc})} className="w-full text-left p-3 hover:bg-primary-50 text-sm font-bold text-gray-700 transition-colors">
                                    {loc}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col relative">
                    <label className="text-xs font-bold text-gray-500 mb-1 flex justify-between">
                        <span>Destination</span>
                        <button type="button" onClick={() => { setMapMode('destination'); setShowMapModal(true); }} className="text-primary-600 hover:underline flex items-center gap-1">📍 Pick</button>
                    </label>
                    <input required placeholder="Destination" value={formData.destination} 
                        onFocus={() => setShowDestSuggestions(true)}
                        onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                        onChange={e => setFormData({...formData, destination: e.target.value})} 
                        className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm" 
                    />
                    {showDestSuggestions && filteredDestLocs.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl z-[1500] max-h-48 overflow-y-auto">
                            {filteredDestLocs.map((loc, idx) => (
                                <button key={idx} type="button" onMouseDown={() => setFormData({...formData, destination: loc})} className="w-full text-left p-3 hover:bg-primary-50 text-sm font-bold text-gray-700 transition-colors">
                                    {loc}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Purpose</label>
                    <input required placeholder="Purpose (e.g. Field Trip)" value={formData.purpose} onChange={e => setFormData({...formData, purpose: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm" />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Departure Time</label>
                    <input required type="datetime-local" value={formData.scheduled_departure} onChange={e => setFormData({...formData, scheduled_departure: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm" />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Expected Return Date</label>
                    <input type="datetime-local" value={formData.expected_return} onChange={e => setFormData({...formData, expected_return: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm" />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Person in Charge (Name)</label>
                    <input placeholder="e.g. John Doe" value={formData.trip_lead_name} onChange={e => setFormData({...formData, trip_lead_name: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm" />
                </div>

                <div className="flex flex-col">
                    <label className="text-xs font-bold text-gray-500 mb-1">Person in Charge (Phone)</label>
                    <input placeholder="e.g. 0712345678" value={formData.trip_lead_contact} onChange={e => setFormData({...formData, trip_lead_contact: e.target.value})} className="w-full p-4 bg-white border border-gray-100 rounded-2xl text-sm font-bold outline-none shadow-sm" />
                </div>

                <div className="flex flex-col justify-end">
                    <button className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl shadow-xl transition-all">Confirm Schedule</button>
                </div>
            </form>

            {previewData && (
                <div className="bg-primary-50 border border-primary-100 rounded-3xl p-6 mt-4 animate-fade-in">
                    <h5 className="font-black text-primary-900 mb-3 flex items-center gap-2">
                        <Activity size={18} />
                        Route Summary Details
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-primary-100/50">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Calculated Distance</p>
                            <p className="text-xl font-black text-primary-900">{previewData.distance} km</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-primary-100/50">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Speed Multiplier</p>
                            <p className="text-xl font-black text-primary-900">80 km/h (Avg)</p>
                        </div>
                        <div className="bg-white p-4 rounded-2xl shadow-sm border border-primary-100/50">
                            <p className="text-[10px] text-gray-400 font-bold uppercase mb-1">Expected Travel Time</p>
                            <p className="text-xl font-black text-primary-900">{previewData.duration}</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" disabled={isSubmitting} onClick={handleSave} className="flex-1 py-4 bg-primary-600 hover:bg-primary-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2">
                            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                            Save & Register Trip
                        </button>
                        <button type="button" onClick={() => setPreviewData(null)} className="px-6 py-4 bg-white border border-primary-200 text-primary-700 font-bold rounded-2xl hover:bg-primary-50 transition-all">
                            Edit details
                        </button>
                    </div>
                </div>
            )}

            {showMapModal && (
                <div className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-2xl shadow-2xl relative flex flex-col h-[500px]">
                        <button onClick={() => setShowMapModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 z-[3100] bg-white rounded-full p-1 shadow-sm"><X size={20} /></button>
                        <h3 className="text-lg font-black mb-4 flex items-center gap-2">
                            <MapPin className="text-primary-600" />
                            Select {mapMode === 'origin' ? 'Origin' : 'Destination'} on Map
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">Click anywhere on the map or select a campus branch marker below.</p>
                        
                        <div className="flex-1 rounded-2xl overflow-hidden border border-gray-100 mb-4">
                            <MapContainer center={[-1.286389, 36.817223]} zoom={8} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                {MAP_PRESETS.map((p, i) => (
                                    <Marker 
                                        key={i} 
                                        position={p.coords}
                                        eventHandlers={{
                                            click: () => {
                                                setFormData({
                                                    ...formData,
                                                    [mapMode]: p.name
                                                });
                                                setShowMapModal(false);
                                            }
                                        }}
                                    >
                                        <Popup><strong>{p.name}</strong></Popup>
                                    </Marker>
                                ))}
                                <MapClickHandler onSelect={(name) => {
                                    setFormData({
                                        ...formData,
                                        [mapMode]: name
                                    });
                                    setShowMapModal(false);
                                }} />
                            </MapContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function MaintenanceForm({ vehicles, onSuccess, showToast }: any) {
    const [formData, setFormData] = useState({
        vehicle_id: '', service_type: 'regular', description: '', cost: '',
        odometer_reading: '', service_date: '', next_service_due_odometer: '',
        performed_by: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/fleet/maintenance-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    ...formData,
                    cost: parseFloat(formData.cost) || 0,
                    odometer_reading: parseFloat(formData.odometer_reading) || 0,
                    next_service_due_odometer: formData.next_service_due_odometer ? parseFloat(formData.next_service_due_odometer) : undefined
                })
            });
            if (res.ok) {
                if (showToast) showToast('Maintenance record saved!', 'success');
                else alert('✅ Maintenance record saved!');
                setFormData({ vehicle_id: '', service_type: 'regular', description: '', cost: '', odometer_reading: '', service_date: '', next_service_due_odometer: '', performed_by: '' });
                onSuccess();
            } else {
                const data = await res.json();
                const msg = data.detail || 'Failed to post maintenance log';
                if (showToast) showToast(msg, 'error'); else alert(`Error: ${msg}`);
            }
        } catch (e: any) {
            if (showToast) showToast(e.message, 'error'); else alert(`Network error: ${e.message}`);
        } finally { setIsSubmitting(false); }
    };

    const inp = "w-full p-3.5 bg-gray-50 border border-gray-100 rounded-xl text-sm font-semibold outline-none focus:border-primary-400 transition-all";
    const lbl = "block text-xs font-black text-gray-400 uppercase mb-2";

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={lbl}>Vehicle *</label>
                    <select required value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} className={inp}>
                        <option value="">Select Unit</option>
                        {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_number} — {v.make} {v.model}</option>)}
                    </select>
                </div>
                <div>
                    <label className={lbl}>Service Category *</label>
                    <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className={inp}>
                        <option value="regular">Regular Service</option>
                        <option value="repair">Mechanical Repair</option>
                        <option value="tire_change">Tire Replacement</option>
                        <option value="inspection">Safety Inspection</option>
                        <option value="oil_change">Oil Change</option>
                        <option value="brake_service">Brake Service</option>
                        <option value="electrical">Electrical / Electronics</option>
                        <option value="bodywork">Body Work / Painting</option>
                    </select>
                </div>
            </div>
            <div>
                <label className={lbl}>Service Description *</label>
                <textarea required placeholder="Describe the service performed..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`${inp} h-24`} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className={lbl}>Performed By (Mechanic / Garage)</label>
                    <input placeholder="e.g. Toyota Kenya, Nairobi" value={formData.performed_by} onChange={e => setFormData({...formData, performed_by: e.target.value})} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Service Date *</label>
                    <input required type="date" value={formData.service_date} onChange={e => setFormData({...formData, service_date: e.target.value})} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Cost (KES) *</label>
                    <input required type="number" placeholder="0" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className={inp} />
                </div>
                <div>
                    <label className={lbl}>Current Odometer (km) *</label>
                    <input required type="number" placeholder="e.g. 45000" value={formData.odometer_reading} onChange={e => setFormData({...formData, odometer_reading: e.target.value})} className={inp} />
                </div>
                <div className="md:col-span-2">
                    <label className={lbl}>Next Service Due (km)</label>
                    <input type="number" placeholder="e.g. 50000" value={formData.next_service_due_odometer} onChange={e => setFormData({...formData, next_service_due_odometer: e.target.value})} className={inp} />
                </div>
            </div>
            <button disabled={isSubmitting} className="w-full py-4 bg-red-600 text-white font-black rounded-2xl shadow-xl flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                {isSubmitting ? 'Saving...' : 'Post Service Record'}
            </button>
        </form>
    );
}
