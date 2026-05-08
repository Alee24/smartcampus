import React, { useState, useEffect } from 'react';
import { 
    Car, MapPin, Navigation, Fuel, Tool, AlertTriangle, 
    Users, Plus, Search, Filter, ChevronRight, Activity, 
    Calendar, Clock, Shield, Download, FileText, Settings,
    Map as MapIcon, TrendingUp, DollarSign
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, LineChart, Line, AreaChart, Area,
    PieChart, Pie, Cell 
} from 'recharts';

interface FleetManagementProps {
    initialTab?: string;
}

export default function FleetManagement({ initialTab = 'dashboard' }: FleetManagementProps) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({
        total_vehicles: 0,
        active_trips: 0,
        maintenance_due: 0,
        fuel_usage: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const [vRes, tRes, sRes] = await Promise.all([
                fetch('/api/fleet/vehicles', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/fleet/trips', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/fleet/stats', { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (vRes.ok) setVehicles(await vRes.json());
            if (tRes.ok) setTrips(await tRes.json());
            if (sRes.ok) setStats(await sRes.json());
        } catch (error) {
            console.error('Error fetching fleet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const renderDashboard = () => (
        <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Fleet" 
                    value={stats.total_vehicles || 0} 
                    icon={<Car className="text-blue-600" />} 
                    change="+2 this month"
                    color="blue"
                />
                <StatCard 
                    title="Active Trips" 
                    value={stats.active_trips || 0} 
                    icon={<Navigation className="text-green-600" />} 
                    change="Live Now"
                    color="green"
                />
                <StatCard 
                    title="Maintenance Due" 
                    value={stats.maintenance_due || 0} 
                    icon={<Tool className="text-red-600" />} 
                    change="Requires Action"
                    color="red"
                />
                <StatCard 
                    title="Fuel Efficiency" 
                    value="8.5 km/L" 
                    icon={<Fuel className="text-orange-600" />} 
                    change="-5% vs last month"
                    color="orange"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-600" />
                        Fuel Consumption Trends
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={mockFuelData}>
                                <defs>
                                    <linearGradient id="colorFuel" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <Tooltip 
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Area type="monotone" dataKey="liters" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorFuel)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-green-600" />
                        Vehicle Utilization
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={mockUtilizationData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <Tooltip 
                                    cursor={{fill: '#F3F4F6'}}
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="usage" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Live Alerts & Recent Trips */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">Ongoing Trips</h3>
                        <button className="text-sm text-primary-600 font-semibold hover:underline">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-left text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100">
                                    <th className="pb-4">Vehicle</th>
                                    <th className="pb-4">Driver</th>
                                    <th className="pb-4">Destination</th>
                                    <th className="pb-4">Status</th>
                                    <th className="pb-4">ETA</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {trips.filter(t => t.status === 'ongoing').map((trip, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4 font-bold text-sm">{trip.vehicle_id.slice(0,8)}</td>
                                        <td className="py-4 text-sm text-gray-600">John Doe</td>
                                        <td className="py-4 text-sm text-gray-600">{trip.destination}</td>
                                        <td className="py-4">
                                            <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Ongoing</span>
                                        </td>
                                        <td className="py-4 text-sm font-semibold text-primary-600">14:30</td>
                                    </tr>
                                ))}
                                {trips.filter(t => t.status === 'ongoing').length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500 italic">No active trips at the moment.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-600" />
                        Critical Alerts
                    </h3>
                    <div className="space-y-4">
                        <AlertItem 
                            type="maintenance" 
                            title="Brake Service Required" 
                            desc="Bus KAB 123G - 500km overdue" 
                            time="2h ago" 
                        />
                        <AlertItem 
                            type="speed" 
                            title="Over-speeding Detected" 
                            desc="Shuttle KCD 445L - 95 km/h" 
                            time="15m ago" 
                        />
                        <AlertItem 
                            type="fuel" 
                            title="Fuel Level Low" 
                            desc="Utility Van KBA 900P - 12%" 
                            time="Just Now" 
                        />
                    </div>
                </div>
            </div>
        </div>
    );

    const renderTracking = () => (
        <div className="glass-card h-[calc(100vh-200px)] flex flex-col lg:flex-row overflow-hidden animate-fade-in">
            {/* Sidebar for vehicle list */}
            <div className="w-full lg:w-80 border-r border-gray-100 flex flex-col">
                <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search vehicle..." 
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-primary-500/20 text-sm outline-none"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {vehicles.map((v, i) => (
                        <div key={i} className="p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors group">
                            <div className="flex justify-between items-start mb-2">
                                <h4 className="font-bold text-sm group-hover:text-primary-600 transition-colors">{v.plate_number}</h4>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                    v.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                }`}>
                                    {v.status}
                                </span>
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <MapPin size={12} />
                                {v.current_location || 'Main Campus Gate'}
                            </div>
                            <div className="mt-3 flex justify-between items-center">
                                <div className="text-[10px] font-bold text-gray-400">Driver: John Doe</div>
                                <div className="text-[10px] font-bold text-blue-600">45 km/h</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Map Placeholder */}
            <div className="flex-1 bg-gray-100 relative group">
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                    <MapIcon size={64} className="mb-4 animate-bounce" />
                    <p className="font-bold">Live Map Tracking Interface</p>
                    <p className="text-xs max-w-xs text-center mt-2">Integrating with Google Maps API for real-time fleet visualization and traffic analytics.</p>
                </div>
                
                {/* Map Overlay Controls */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all text-gray-600"><Plus size={20} /></button>
                    <button className="p-2 bg-white rounded-lg shadow-lg hover:bg-gray-50 transition-all text-gray-600"><Shield size={20} /></button>
                </div>

                <div className="absolute bottom-6 left-6 right-6 lg:left-auto lg:right-6 lg:w-96 glass-card p-4 shadow-2xl border-t-4 border-primary-600 animate-slide-up">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center text-primary-600">
                            <Car size={24} />
                        </div>
                        <div>
                            <h4 className="font-bold">Bus KAB 123G</h4>
                            <p className="text-xs text-gray-500">Route: Nairobi - Main Campus</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Speed</p>
                            <p className="font-bold text-lg">62 km/h</p>
                        </div>
                        <div className="bg-gray-50 p-2 rounded-lg">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Passengers</p>
                            <p className="font-bold text-lg">42/60</p>
                        </div>
                    </div>
                    <button className="w-full py-2.5 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 hover:opacity-90 transition-all">
                        View Trip Details
                    </button>
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
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                        <Download size={18} />
                        Export
                    </button>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:scale-105 transition-all flex items-center gap-2">
                        <Plus size={18} />
                        Add Vehicle
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 w-fit">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
                    { id: 'tracking', label: 'Live Map', icon: MapPin },
                    { id: 'trips', label: 'Trips', icon: Navigation },
                    { id: 'fuel', label: 'Fuel Logs', icon: Fuel },
                    { id: 'maintenance', label: 'Service', icon: Tool },
                    { id: 'drivers', label: 'Drivers', icon: Users }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all ${
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
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'tracking' && renderTracking()}
            {activeTab === 'trips' && <TripsManager trips={trips} />}
            {activeTab === 'fuel' && <FuelManagement vehicles={vehicles} />}
            {activeTab === 'maintenance' && <MaintenanceManager vehicles={vehicles} />}
            {activeTab === 'drivers' && <DriverManager />}
        </div>
    );
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
                <div className="p-3 bg-white shadow-sm rounded-xl border border-gray-50">
                    {icon}
                </div>
                <span className="text-xs font-bold bg-white/50 px-2 py-1 rounded-lg text-gray-500 uppercase tracking-tighter">
                    {change}
                </span>
            </div>
            <h4 className="text-gray-500 font-bold text-sm mb-1">{title}</h4>
            <div className="text-2xl font-black text-gray-900">{value}</div>
        </div>
    );
}

function AlertItem({ type, title, desc, time }: any) {
    const icons: any = {
        maintenance: <Tool className="text-red-600" size={16} />,
        speed: <Activity className="text-orange-600" size={16} />,
        fuel: <Fuel className="text-amber-600" size={16} />
    };
    const bgColors: any = {
        maintenance: 'bg-red-50 border-red-100',
        speed: 'bg-orange-50 border-orange-100',
        fuel: 'bg-amber-50 border-amber-100'
    };

    return (
        <div className={`flex gap-4 p-4 rounded-2xl border ${bgColors[type]} transition-transform hover:scale-[1.02] cursor-pointer`}>
            <div className="mt-1 p-2 bg-white rounded-lg shadow-sm">
                {icons[type]}
            </div>
            <div className="flex-1">
                <div className="flex justify-between items-start">
                    <h5 className="font-bold text-sm">{title}</h5>
                    <span className="text-[10px] font-bold text-gray-400">{time}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{desc}</p>
            </div>
            <ChevronRight size={16} className="text-gray-400 mt-1" />
        </div>
    );
}

function LayoutDashboardIcon({ size }: { size: number }) {
    return <Activity size={size} />;
}

// Sub-Managers

function TripsManager({ trips }: { trips: any[] }) {
    return (
        <div className="glass-card p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold">Trip Logs & Manifests</h3>
                <div className="flex gap-2">
                    <button className="p-2 border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50"><Filter size={18} /></button>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">Schedule Trip</button>
                </div>
            </div>
            <div className="space-y-4">
                {trips.map((trip, i) => (
                    <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-100 hover:border-primary-300 transition-all group">
                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                        trip.status === 'completed' ? 'bg-gray-200 text-gray-600' : 'bg-green-100 text-green-700'
                                    }`}>
                                        {trip.status}
                                    </span>
                                    <span className="text-xs font-bold text-gray-400">{new Date(trip.scheduled_departure).toLocaleDateString()}</span>
                                </div>
                                <h4 className="text-lg font-bold mb-4">{trip.origin} → {trip.destination}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <TripMeta label="Vehicle" value={trip.vehicle_id.slice(0,8)} icon={<Car size={14} />} />
                                    <TripMeta label="Driver" value="John Doe" icon={<Users size={14} />} />
                                    <TripMeta label="Passengers" value="45 Check-ins" icon={<Activity size={14} />} />
                                    <TripMeta label="Purpose" value={trip.purpose} icon={<FileText size={14} />} />
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-600 hover:bg-gray-50">View Manifest</button>
                                <button className="px-4 py-2 bg-primary-50 text-primary-600 rounded-xl text-sm font-bold hover:bg-primary-100">Live Track</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function TripMeta({ label, value, icon }: any) {
    return (
        <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1">
                {icon}
                {label}
            </p>
            <p className="text-xs font-bold text-gray-700 truncate">{value}</p>
        </div>
    );
}

function FuelManagement({ vehicles }: { vehicles: any[] }) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in">
            <div className="lg:col-span-1 glass-card p-6">
                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                    <Fuel size={20} className="text-orange-600" />
                    Log Fuel Refill
                </h3>
                <form className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Vehicle</label>
                        <select className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none font-bold">
                            {vehicles.map(v => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Liters</label>
                            <input type="number" placeholder="0.00" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none font-bold" />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Cost (KES)</label>
                            <input type="number" placeholder="0.00" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none font-bold" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Current Odometer</label>
                        <input type="number" placeholder="Km" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Fuel Station</label>
                        <input type="text" placeholder="e.g. Shell" className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none font-bold" />
                    </div>
                    <div className="p-8 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:border-primary-300 transition-colors cursor-pointer">
                        <Download size={32} className="mb-2" />
                        <p className="text-xs font-bold">Upload Receipt Image</p>
                    </div>
                    <button className="w-full py-3 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-500/20 hover:opacity-90">
                        Submit Fuel Log
                    </button>
                </form>
            </div>
            
            <div className="lg:col-span-2 glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Recent Fuel Logs</h3>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Total Monthly Cost</p>
                            <p className="font-bold text-primary-600">KES 145,200</p>
                        </div>
                        <button className="p-2 bg-gray-50 rounded-lg text-gray-500"><Download size={18} /></button>
                    </div>
                </div>
                <div className="space-y-3">
                    {[1,2,3,4,5].map(i => (
                        <div key={i} className="p-4 rounded-xl border border-gray-100 flex items-center justify-between hover:bg-gray-50 transition-all cursor-pointer">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center text-orange-600">
                                    <Fuel size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">KAB 123G • Shell Station</h4>
                                    <p className="text-xs text-gray-400">45.5 Liters • 2h ago</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="font-bold text-sm">KES 9,450</div>
                                <div className="text-[10px] font-bold text-green-600">Receipt Verified</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function MaintenanceManager({ vehicles }: { vehicles: any[] }) {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="glass-card p-6 bg-gradient-to-br from-red-500 to-rose-600 text-white">
                    <div className="flex justify-between items-start mb-6">
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                            <Tool size={24} />
                        </div>
                        <span className="text-[10px] font-bold bg-white/20 px-2 py-1 rounded-lg uppercase">Critical</span>
                    </div>
                    <h3 className="text-lg font-bold mb-1">Overdue Service</h3>
                    <p className="text-red-100 text-xs mb-4">4 vehicles have exceeded their service intervals.</p>
                    <button className="w-full py-2.5 bg-white text-red-600 font-bold rounded-xl text-sm shadow-xl">Schedule Now</button>
                </div>
                
                <div className="lg:col-span-2 glass-card p-6">
                    <h3 className="text-lg font-bold mb-6">Maintenance Schedule</h3>
                    <div className="space-y-3">
                        {vehicles.map((v, i) => (
                            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                                <div className="flex items-center gap-4">
                                    <div className={`w-2 h-2 rounded-full ${i % 3 === 0 ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
                                    <div>
                                        <h4 className="font-bold text-sm">{v.plate_number}</h4>
                                        <p className="text-[10px] text-gray-400">Next service: {v.next_service_odometer || '45,000'} km</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-6">
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-gray-400">Current Odo</p>
                                        <p className="text-sm font-bold">{v.current_odometer || '42,100'} km</p>
                                    </div>
                                    <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all"><Tool size={18} /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function DriverManager() {
    return (
        <div className="glass-card p-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h3 className="text-xl font-bold">Driver Directory</h3>
                <div className="flex w-full sm:w-auto gap-2">
                    <div className="relative flex-1 sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input type="text" placeholder="Search drivers..." className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm outline-none" />
                    </div>
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">Add Driver</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => (
                    <div key={i} className="group p-6 bg-white border border-gray-100 rounded-3xl hover:shadow-2xl hover:border-primary-200 transition-all cursor-pointer text-center relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4">
                            <span className="w-3 h-3 bg-green-500 rounded-full border-2 border-white block" />
                        </div>
                        <div className="w-20 h-20 bg-primary-100 rounded-full mx-auto mb-4 flex items-center justify-center text-primary-600 border-4 border-white shadow-xl group-hover:scale-110 transition-transform">
                            <Users size={32} />
                        </div>
                        <h4 className="font-bold text-lg">John Driver Doe</h4>
                        <p className="text-xs text-gray-500 mb-4">Senior Fleet Driver • Staff ID: DRV-00{i}</p>
                        <div className="flex justify-center gap-2 mb-6">
                            <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase">Class BCE</span>
                            <span className="px-2 py-1 bg-green-50 text-green-600 text-[10px] font-bold rounded uppercase">Active</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 border-t border-gray-50 pt-4">
                            <div className="text-center border-r border-gray-50">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Trips</p>
                                <p className="text-sm font-bold">142</p>
                            </div>
                            <div className="text-center">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">Rating</p>
                                <p className="text-sm font-bold text-orange-500">4.9/5</p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Mock Data
const mockFuelData = [
    { name: 'Mon', liters: 400 },
    { name: 'Tue', liters: 300 },
    { name: 'Wed', liters: 600 },
    { name: 'Thu', liters: 200 },
    { name: 'Fri', liters: 900 },
    { name: 'Sat', liters: 300 },
    { name: 'Sun', liters: 150 },
];

const mockUtilizationData = [
    { name: 'Buses', usage: 85 },
    { name: 'Staff', usage: 65 },
    { name: 'Field', usage: 45 },
    { name: 'Shuttle', usage: 92 },
    { name: 'Utility', usage: 30 },
];
