import React, { useState, useEffect } from 'react';
import { 
    Car, MapPin, Navigation, Fuel, Wrench, AlertTriangle, 
    Users, Plus, Search, Filter, ChevronRight, Activity, 
    Calendar, Clock, Shield, Download, FileText, Settings,
    Map as MapIcon, TrendingUp, DollarSign, X, Check, Loader2,
    RefreshCw
} from 'lucide-react';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
    ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface FleetManagementProps {
    initialTab?: string;
}

export default function FleetManagement({ initialTab = 'dashboard' }: FleetManagementProps) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [trips, setTrips] = useState<any[]>([]);
    const [fuelLogs, setFuelLogs] = useState<any[]>([]);
    const [maintenanceLogs, setMaintenanceLogs] = useState<any[]>([]);
    const [locations, setLocations] = useState<any[]>([]);
    const [stats, setStats] = useState<any>({
        total_vehicles: 0,
        active_trips: 0,
        maintenance_due: 0,
        fuel_usage: 0
    });
    const [loading, setLoading] = useState(true);
    const [showAddVehicle, setShowAddVehicle] = useState(false);

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchLocations, 10000); // Update locations every 10s
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
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                    title="Total Fleet" 
                    value={stats.total_vehicles || 0} 
                    icon={<Car className="text-blue-600" />} 
                    change="Registered Units"
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
                    icon={<Wrench className="text-red-600" />} 
                    change="Requires Action"
                    color="red"
                />
                <StatCard 
                    title="Active Drivers" 
                    value={stats.active_drivers || 0} 
                    icon={<Users className="text-orange-600" />} 
                    change="On Duty"
                    color="orange"
                />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <TrendingUp size={20} className="text-primary-600" />
                        Fuel Consumption History
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={fuelLogs.slice(0, 7).reverse().map(l => ({ name: new Date(l.timestamp).toLocaleDateString(), liters: l.amount_liters }))}>
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
                                <Area type="monotone" dataKey="liters" stroke="#4F46E5" strokeWidth={3} fillOpacity={1} fill="url(#colorFuel)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Activity size={20} className="text-green-600" />
                        Fleet Utilization
                    </h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={[
                                { name: 'Active', val: stats.active_trips },
                                { name: 'Idle', val: stats.total_vehicles - stats.active_trips - stats.maintenance_due },
                                { name: 'Repair', val: stats.maintenance_due }
                            ]}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#6B7280'}} />
                                <Tooltip cursor={{fill: '#F3F4F6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                                <Bar dataKey="val" fill="#10B981" radius={[6, 6, 0, 0]} barSize={40} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass-card p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-bold">Live Trip Log</h3>
                        <button onClick={() => setActiveTab('trips')} className="text-sm text-primary-600 font-semibold hover:underline">View All</button>
                    </div>
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
                                {trips.slice(0, 5).map((trip, i) => (
                                    <tr key={i} className="hover:bg-gray-50 transition-colors">
                                        <td className="py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-100 rounded-lg"><Car size={16} /></div>
                                                <span className="font-bold text-sm">{vehicles.find(v => v.id === trip.vehicle_id)?.plate_number || 'Vehicle'}</span>
                                            </div>
                                        </td>
                                        <td className="py-4 text-sm text-gray-600">{trip.destination}</td>
                                        <td className="py-4">
                                            <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                                                trip.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                                            }`}>{trip.status}</span>
                                        </td>
                                        <td className="py-4 text-xs font-semibold text-gray-500">
                                            {new Date(trip.scheduled_departure).toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="glass-card p-6">
                    <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <AlertTriangle size={20} className="text-red-600" />
                        Vehicle Alerts
                    </h3>
                    <div className="space-y-4">
                        {vehicles.filter(v => v.status === 'maintenance').map((v, i) => (
                            <div key={i} className="flex gap-3 p-3 bg-red-50 border border-red-100 rounded-xl">
                                <Wrench className="text-red-600 shrink-0" size={18} />
                                <div>
                                    <p className="text-sm font-bold text-red-900">{v.plate_number} Overdue</p>
                                    <p className="text-xs text-red-700">Immediate service required.</p>
                                </div>
                            </div>
                        ))}
                        {vehicles.filter(v => v.status === 'maintenance').length === 0 && (
                            <div className="text-center py-8">
                                <Shield className="mx-auto text-green-500 mb-2" size={32} />
                                <p className="text-sm font-bold text-gray-600">All vehicles healthy</p>
                            </div>
                        )}
                    </div>
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
                <MapContainer center={[-1.286389, 36.817223]} zoom={13} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {locations.map((loc, i) => (
                        <Marker 
                            key={i} 
                            position={[loc.latitude, loc.longitude]} 
                            icon={vehicleIcon}
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
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-2">
                        <Download size={18} /> Export
                    </button>
                    <button 
                        onClick={() => setShowAddVehicle(true)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Plus size={18} /> Add Vehicle
                    </button>
                </div>
            </header>

            {/* Navigation Tabs */}
            <div className="flex gap-1 bg-white p-1 rounded-2xl border border-gray-100 w-fit overflow-x-auto no-scrollbar">
                {[
                    { id: 'dashboard', label: 'Dashboard', icon: Activity },
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
                    {activeTab === 'tracking' && renderTracking()}
                    {activeTab === 'trips' && <TripsManager trips={trips} vehicles={vehicles} onUpdate={fetchData} />}
                    {activeTab === 'fuel' && <FuelManagement vehicles={vehicles} logs={fuelLogs} onUpdate={fetchData} />}
                    {activeTab === 'maintenance' && <MaintenanceManager vehicles={vehicles} logs={maintenanceLogs} onUpdate={fetchData} />}
                    {activeTab === 'drivers' && <DriverManager />}
                </>
            )}

            {/* Add Vehicle Modal */}
            {showAddVehicle && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-lg animate-slide-up shadow-2xl relative">
                        <button onClick={() => setShowAddVehicle(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900"><X size={24} /></button>
                        <h2 className="text-2xl font-black mb-6">Register New Vehicle</h2>
                        <VehicleForm onSuccess={() => { setShowAddVehicle(false); fetchData(); }} />
                    </div>
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

// Sub-Managers
function TripsManager({ trips, vehicles, onUpdate }: any) {
    const [showForm, setShowForm] = useState(false);

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

    return (
        <div className="glass-card p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h3 className="text-xl font-black">Trip Manifests</h3>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20 flex items-center gap-2">
                    <Plus size={18} /> Schedule Trip
                </button>
            </div>
            
            {showForm && (
                <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-200">
                    <h4 className="font-bold mb-4">New Trip Details</h4>
                    <TripForm vehicles={vehicles} onSuccess={() => { setShowForm(false); onUpdate(); }} />
                </div>
            )}

            <div className="space-y-4">
                {trips.map((trip: any, i: number) => (
                    <div key={i} className="p-6 bg-white rounded-2xl border border-gray-100 hover:border-primary-300 transition-all shadow-sm">
                        <div className="flex flex-col lg:flex-row justify-between gap-6">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase ${
                                        trip.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-green-100 text-green-700'
                                    }`}>{trip.status}</span>
                                    <span className="text-xs font-bold text-gray-400">{new Date(trip.scheduled_departure).toLocaleString()}</span>
                                </div>
                                <h4 className="text-xl font-black text-gray-900 mb-4">{trip.origin} <ChevronRight className="inline text-gray-300" /> {trip.destination}</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Vehicle</p>
                                        <p className="text-sm font-bold">{vehicles.find((v: any) => v.id === trip.vehicle_id)?.plate_number || 'Unit'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Purpose</p>
                                        <p className="text-sm font-bold">{trip.purpose}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {trip.status === 'scheduled' && (
                                    <button 
                                        onClick={() => handleStartTrip(trip.id, vehicles.find((v: any) => v.id === trip.vehicle_id)?.current_odometer || 0)} 
                                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-bold transition-colors"
                                    >
                                        Start Trip
                                    </button>
                                )}
                                {trip.status === 'ongoing' && (
                                    <button 
                                        onClick={() => handleEndTrip(trip.id, trip.start_odometer || 0)} 
                                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold transition-colors"
                                    >
                                        End Trip
                                    </button>
                                )}
                                <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100">Manifest</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function FuelManagement({ vehicles, logs, onUpdate }: any) {
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
            <div className="lg:col-span-2 glass-card p-6">
                <h3 className="text-lg font-black mb-6">Refill History</h3>
                <div className="space-y-3">
                    {logs.map((log: any, i: number) => (
                        <div key={i} className="p-4 bg-white border border-gray-100 rounded-2xl flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><Fuel size={20} /></div>
                                <div>
                                    <h4 className="font-bold text-sm">{vehicles.find((v: any) => v.id === log.vehicle_id)?.plate_number || 'Unit'} • {log.station_name}</h4>
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
    const [showForm, setShowForm] = useState(false);
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-black">Maintenance & Service</h3>
                <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-red-600 text-white rounded-xl font-bold text-sm shadow-lg flex items-center gap-2">
                    <Wrench size={18} /> Log Service
                </button>
            </div>
            
            {showForm && (
                <div className="p-8 bg-white border-2 border-red-100 rounded-3xl shadow-xl">
                    <MaintenanceForm vehicles={vehicles} onSuccess={() => { setShowForm(false); onUpdate(); }} />
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {logs.map((log: any, i: number) => (
                    <div key={i} className="glass-card p-6 border-t-4 border-red-500">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-red-50 text-red-600 rounded-lg"><Shield size={20} /></div>
                            <span className="text-[10px] font-black bg-gray-100 px-2 py-1 rounded text-gray-500 uppercase">{log.service_type}</span>
                        </div>
                        <h4 className="font-black text-gray-900 mb-1">{vehicles.find((v: any) => v.id === log.vehicle_id)?.plate_number || 'Unit'}</h4>
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
    return (
        <div className="glass-card p-8 animate-fade-in text-center py-20">
            <Users className="mx-auto text-gray-200 mb-4" size={64} />
            <h3 className="text-2xl font-black text-gray-900 mb-2">Driver Management Module</h3>
            <p className="text-gray-500 max-w-sm mx-auto">Please go to the 'People' section to manage drivers and assign vehicle privileges.</p>
        </div>
    );
}

// Form Components
function VehicleForm({ onSuccess }: { onSuccess: () => void }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        plate_number: '', make: '', model: '', vehicle_type: 'bus', fuel_type: 'diesel', fuel_capacity: 0, year: 2024
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/fleet/vehicles', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(formData)
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                alert(`Error: ${data.detail || 'Failed to add vehicle'}`);
            }
        } catch (e: any) {
            alert(`Network error: ${e.message}`);
        } finally { setIsSubmitting(false); }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <input required placeholder="Plate Number (e.g. KAB 123G)" value={formData.plate_number} onChange={e => setFormData({...formData, plate_number: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
            <div className="grid grid-cols-2 gap-4">
                <input required placeholder="Make" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                <input required placeholder="Model" value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <select value={formData.vehicle_type} onChange={e => setFormData({...formData, vehicle_type: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none">
                    <option value="bus">Bus</option>
                    <option value="shuttle">Shuttle</option>
                    <option value="staff">Staff Car</option>
                    <option value="utility">Utility</option>
                </select>
                <select value={formData.fuel_type} onChange={e => setFormData({...formData, fuel_type: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none">
                    <option value="diesel">Diesel</option>
                    <option value="petrol">Petrol</option>
                </select>
            </div>
            <button disabled={isSubmitting} className="w-full py-4 bg-primary-600 text-white font-black rounded-2xl shadow-xl hover:opacity-90">
                {isSubmitting ? 'Registering...' : 'Complete Registration'}
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
        scheduled_departure: ''
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

            const payload = {
                vehicle_id: formData.vehicle_id,
                origin: formData.origin || 'Riara University Main Campus',
                destination: formData.destination,
                purpose: formData.purpose,
                scheduled_departure: departureISO,
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

function MaintenanceForm({ vehicles, onSuccess }: any) {
    const [formData, setFormData] = useState({
        vehicle_id: '', service_type: 'regular', description: '', cost: '', odometer_reading: '', service_date: '', next_service_due_odometer: ''
    });
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/fleet/maintenance-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({...formData, cost: parseFloat(formData.cost), odometer_reading: parseFloat(formData.odometer_reading), next_service_due_odometer: parseFloat(formData.next_service_due_odometer)})
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json();
                alert(`Error: ${data.detail || 'Failed to post maintenance log'}`);
            }
        } catch (e: any) {
            alert(`Network error: ${e.message}`);
        }
    };
    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Vehicle</label>
                    <select required value={formData.vehicle_id} onChange={e => setFormData({...formData, vehicle_id: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none">
                        <option value="">Select Unit</option>
                        {vehicles.map((v: any) => <option key={v.id} value={v.id}>{v.plate_number}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Service Category</label>
                    <select value={formData.service_type} onChange={e => setFormData({...formData, service_type: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none">
                        <option value="regular">Regular Service</option>
                        <option value="repair">Mechanical Repair</option>
                        <option value="tire_change">Tire Replacement</option>
                        <option value="inspection">Safety Inspection</option>
                    </select>
                </div>
            </div>
            <textarea required placeholder="Service Description..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-3xl text-sm font-bold outline-none h-32" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Cost</label>
                    <input required type="number" value={formData.cost} onChange={e => setFormData({...formData, cost: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Current Odo</label>
                    <input required type="number" value={formData.odometer_reading} onChange={e => setFormData({...formData, odometer_reading: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                </div>
                <div>
                    <label className="block text-xs font-black text-gray-400 uppercase mb-2">Next Service (Km)</label>
                    <input required type="number" value={formData.next_service_due_odometer} onChange={e => setFormData({...formData, next_service_due_odometer: e.target.value})} className="w-full p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                </div>
            </div>
            <div className="flex gap-4">
                <input required type="date" value={formData.service_date} onChange={e => setFormData({...formData, service_date: e.target.value})} className="flex-1 p-4 bg-gray-50 border-none rounded-2xl text-sm font-bold outline-none" />
                <button className="px-10 bg-red-600 text-white font-black rounded-2xl shadow-xl">Post Record</button>
            </div>
        </form>
    );
}
