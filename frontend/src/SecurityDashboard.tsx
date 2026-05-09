import React, { useState, useEffect } from 'react';
import { 
    Shield, MapPin, Users, Car, Scan, Bell, 
    Lock, Unlock, Search, CheckCircle, AlertCircle, 
    Clock, LogIn, LogOut, FileText, Camera
} from 'lucide-react';

export default function SecurityDashboard() {
    const [activeTab, setActiveTab] = useState('overview');
    const [gateStatus, setGateStatus] = useState<'locked' | 'open'>('locked');
    const [stats, setStats] = useState({
        visitors_today: 42,
        vehicles_entered: 156,
        alerts_active: 2,
        staff_present: 89
    });

    const [recentLogs, setRecentLogs] = useState([
        { id: 1, type: 'vehicle', title: 'KAB 123G - Entry', time: '2m ago', status: 'authorized' },
        { id: 2, type: 'visitor', title: 'Alice Johnson - Guest', time: '15m ago', status: 'pending' },
        { id: 3, type: 'alert', title: 'Unrecognized Face - Gate B', time: '1h ago', status: 'flagged' },
    ]);

    const toggleGate = () => {
        setGateStatus(prev => prev === 'locked' ? 'open' : 'locked');
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header with Quick Stats */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black tracking-tight text-gray-900">Security Command Center</h1>
                    <p className="text-gray-500 font-medium">Main Entrance Portal • Active Session</p>
                </div>
                <div className="flex gap-3">
                    <button className="p-3 bg-red-100 text-red-600 rounded-2xl hover:bg-red-200 transition-all shadow-sm">
                        <Bell size={24} />
                    </button>
                    <div className={`flex items-center gap-3 px-6 py-3 rounded-2xl border-2 transition-all ${
                        gateStatus === 'locked' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'
                    }`}>
                        {gateStatus === 'locked' ? <Lock size={20} /> : <Unlock size={20} />}
                        <span className="font-bold">Main Gate: {gateStatus.toUpperCase()}</span>
                        <button 
                            onClick={toggleGate}
                            className={`ml-2 px-4 py-1 rounded-lg font-bold text-xs uppercase shadow-sm ${
                                gateStatus === 'locked' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'
                            }`}
                        >
                            {gateStatus === 'locked' ? 'Open Gate' : 'Close Gate'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <NavTile icon={<Shield />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <NavTile icon={<Lock />} label="Gate Control" active={activeTab === 'gate'} onClick={() => setActiveTab('gate')} />
                <NavTile icon={<Car />} label="Vehicle Intel" active={activeTab === 'vehicles'} onClick={() => setActiveTab('vehicles')} />
                <NavTile icon={<Users />} label="Visitor Log" active={activeTab === 'visitors'} onClick={() => setActiveTab('visitors')} />
                <NavTile icon={<Scan />} label="ID Verify" active={activeTab === 'verify'} onClick={() => setActiveTab('verify')} />
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {activeTab === 'overview' && (
                    <>
                        <div className="lg:col-span-2 space-y-6">
                            {/* Live Cam Placeholder */}
                            <div className="glass-card aspect-video relative overflow-hidden bg-black group">
                                <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1590674899484-13da0d1b58f5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
                                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-lg text-[10px] font-bold uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                    Live: Gate A (Entrance)
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                    <button className="p-4 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all">
                                        <Camera size={32} />
                                    </button>
                                </div>
                                <div className="absolute bottom-4 right-4 text-white text-xs font-mono bg-black/60 px-2 py-1 rounded">
                                    2026-05-08 15:12:44
                                </div>
                            </div>

                            {/* Visitor Check-in Quick Action */}
                            <div className="glass-card p-6 bg-gradient-to-br from-primary-600 to-indigo-700 text-white">
                                <h3 className="text-xl font-bold mb-4">Quick Verification</h3>
                                <div className="flex gap-4">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300" size={20} />
                                        <input 
                                            type="text" 
                                            placeholder="Enter ID, Plate or Visit Code..." 
                                            className="w-full pl-10 pr-4 py-4 bg-white/10 border-none rounded-2xl placeholder:text-primary-200 text-white outline-none focus:ring-2 focus:ring-white/20"
                                        />
                                    </div>
                                    <button className="px-8 py-4 bg-white text-primary-600 font-bold rounded-2xl shadow-xl hover:scale-105 transition-all">
                                        Verify
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Real-time Activity Feed */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
                                    <Clock size={20} className="text-primary-600" />
                                    Live Activity
                                </h3>
                                <div className="space-y-4">
                                    {recentLogs.map(log => (
                                        <div key={log.id} className="flex gap-4 p-3 rounded-xl border border-gray-50 hover:bg-gray-50 transition-all cursor-pointer">
                                            <div className={`p-2 rounded-lg ${
                                                log.status === 'authorized' ? 'bg-green-100 text-green-600' : 
                                                log.status === 'flagged' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                {log.type === 'vehicle' ? <Car size={18} /> : log.type === 'visitor' ? <Users size={18} /> : <AlertCircle size={18} />}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="text-sm font-bold">{log.title}</h5>
                                                <p className="text-[10px] text-gray-500">{log.time} • Station 01</p>
                                            </div>
                                            <ChevronRight size={16} className="text-gray-300 self-center" />
                                        </div>
                                    ))}
                                </div>
                                <button className="w-full mt-6 py-2 text-primary-600 text-sm font-bold hover:underline">View Full Logs</button>
                            </div>

                            {/* Gate Stats */}
                            <div className="glass-card p-6">
                                <h3 className="text-lg font-bold mb-4">Daily Volume</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <StatItem label="Visitors" value="42" color="blue" />
                                    <StatItem label="Vehicles" value="156" color="green" />
                                    <StatItem label="Deliveries" value="12" color="orange" />
                                    <StatItem label="Denied" value="3" color="red" />
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'gate' && <GateManager gateStatus={gateStatus} toggleGate={toggleGate} />}
                {activeTab === 'vehicles' && <VehicleIntel />}
                {activeTab === 'visitors' && <VisitorLog />}
                {activeTab === 'verify' && <IdentityVerification />}
            </div>
        </div>
    );
}

// Sub-Components

function NavTile({ icon, label, active, onClick }: any) {
    return (
        <button 
            onClick={onClick}
            className={`flex flex-col items-center gap-3 p-4 rounded-3xl border-2 transition-all ${
                active 
                ? 'bg-primary-600 border-primary-600 text-white shadow-xl shadow-primary-500/20 scale-105' 
                : 'bg-white border-gray-100 text-gray-500 hover:border-primary-200 hover:text-primary-600'
            }`}
        >
            <div className={`${active ? 'text-white' : 'text-primary-600'}`}>
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <span className="text-xs font-bold">{label}</span>
        </button>
    );
}

function StatItem({ label, value, color }: any) {
    const colors: any = {
        blue: 'text-blue-600 bg-blue-50',
        green: 'text-green-600 bg-green-50',
        orange: 'text-orange-600 bg-orange-50',
        red: 'text-red-600 bg-red-50'
    };
    return (
        <div className={`p-4 rounded-2xl ${colors[color]} text-center`}>
            <p className="text-[10px] font-black uppercase opacity-60 mb-1">{label}</p>
            <p className="text-xl font-black">{value}</p>
        </div>
    );
}

function GateManager({ gateStatus, toggleGate }: any) {
    return (
        <div className="lg:col-span-3 glass-card p-8 animate-fade-in text-center">
            <div className={`w-32 h-32 rounded-full mx-auto mb-6 flex items-center justify-center transition-all ${
                gateStatus === 'locked' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
            }`}>
                {gateStatus === 'locked' ? <Lock size={64} /> : <Unlock size={64} />}
            </div>
            <h2 className="text-2xl font-black mb-2">Manual Barrier Control</h2>
            <p className="text-gray-500 mb-8">Override standard access control for emergency or utility vehicles.</p>
            
            <div className="flex justify-center gap-6">
                <button 
                    onClick={toggleGate}
                    className={`px-12 py-4 rounded-2xl font-black text-lg transition-all ${
                        gateStatus === 'locked' 
                        ? 'bg-green-600 text-white shadow-lg shadow-green-500/20 hover:scale-105' 
                        : 'bg-orange-600 text-white shadow-lg shadow-orange-500/20 hover:scale-105'
                    }`}
                >
                    {gateStatus === 'locked' ? 'DEPLOY BARRIER (OPEN)' : 'ENGAGE LOCK (CLOSE)'}
                </button>
            </div>

            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><MapPin size={16} /> Station Info</h4>
                    <p className="text-xs text-gray-500">Node: GATE-NORTH-01</p>
                    <p className="text-xs text-gray-500">IP: 192.168.1.104</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><Clock size={16} /> Session Time</h4>
                    <p className="text-xs text-gray-500">Active: 04:12:33</p>
                    <p className="text-xs text-gray-500">Shift ends: 20:00</p>
                </div>
                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><Shield size={16} /> Integrity</h4>
                    <p className="text-xs text-gray-500">Status: SECURE</p>
                    <p className="text-xs text-gray-500">Last heartbeat: 2s ago</p>
                </div>
            </div>
        </div>
    );
}

function VehicleIntel() {
    return (
        <div className="lg:col-span-3 glass-card p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">Vehicle Intelligence</h2>
                <button className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-xl font-bold text-sm">
                    <Search size={18} /> Lookup Plate
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                    <h3 className="text-xs font-black uppercase text-gray-400">Recently Scanned</h3>
                    {[1,2,3].map(i => (
                        <div key={i} className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center group cursor-pointer hover:bg-white hover:shadow-xl transition-all border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-white rounded-xl shadow-sm">
                                    <Car size={20} className="text-primary-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-lg">KAB 12{i}G</h4>
                                    <p className="text-[10px] text-gray-500">Toyota Hilux • Staff: Dr. Smith</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-green-100 text-green-700 text-[10px] font-black rounded-lg">AUTHORIZED</span>
                        </div>
                    ))}
                </div>
                
                <div className="p-8 bg-gray-900 rounded-3xl text-white">
                    <div className="flex justify-between items-start mb-8">
                        <div className="p-4 bg-white/10 rounded-2xl">
                            <Scan size={32} />
                        </div>
                        <span className="text-[10px] font-black bg-red-600 px-3 py-1 rounded-full">LIVE SCANNER</span>
                    </div>
                    <h4 className="text-xl font-bold mb-2">OCR License Recognition</h4>
                    <p className="text-gray-400 text-sm mb-6">Camera A01 is currently scanning for approaching vehicles. Automatic logging enabled.</p>
                    <div className="h-40 border-2 border-dashed border-white/20 rounded-2xl flex items-center justify-center text-white/40">
                        <span className="animate-pulse">Waiting for detection...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VisitorLog() {
    return (
        <div className="lg:col-span-3 glass-card p-8 animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-black">Visitor Management</h2>
                <div className="flex gap-2">
                    <button className="px-4 py-2 bg-primary-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-primary-500/20">Check-in Guest</button>
                    <button className="px-4 py-2 bg-white border border-gray-200 rounded-xl font-bold text-sm text-gray-600">Reports</button>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="pb-4">Visitor</th>
                            <th className="pb-4">Host</th>
                            <th className="pb-4">Purpose</th>
                            <th className="pb-4">Check-in</th>
                            <th className="pb-4">Status</th>
                            <th className="pb-4">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[1,2,3,4].map(i => (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold">V</div>
                                        <div>
                                            <p className="font-bold text-sm">Visitor Name {i}</p>
                                            <p className="text-[10px] text-gray-500">ID: 12345678</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-5 text-sm font-medium">Dr. Host Name</td>
                                <td className="py-5 text-sm text-gray-500">Meeting / Delivery</td>
                                <td className="py-5 text-sm font-bold text-gray-700">14:15</td>
                                <td className="py-5">
                                    <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">ON CAMPUS</span>
                                </td>
                                <td className="py-5">
                                    <button className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-all"><LogOut size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function IdentityVerification() {
    return (
        <div className="lg:col-span-3 glass-card p-12 animate-fade-in text-center">
            <div className="max-w-md mx-auto">
                <div className="w-40 h-40 bg-primary-100 rounded-full mx-auto mb-8 flex items-center justify-center text-primary-600 border-[10px] border-white shadow-2xl">
                    <Scan size={80} />
                </div>
                <h2 className="text-3xl font-black mb-4">Secure Verification</h2>
                <p className="text-gray-500 mb-12 font-medium">Scan biometric ID, QR access tokens, or trigger AI facial recognition to validate identity.</p>
                
                <div className="grid grid-cols-2 gap-4">
                    <VerificationOption icon={<Camera />} label="Face Recognition" desc="Trigger AI Scanner" color="primary" />
                    <VerificationOption icon={<FileText />} label="Scan ID/QR" desc="Use Handheld Device" color="indigo" />
                </div>

                <div className="mt-12 p-6 bg-gray-50 rounded-3xl border border-gray-100 flex items-center gap-6 text-left">
                    <div className="w-16 h-16 bg-white rounded-2xl shadow-sm flex items-center justify-center text-gray-400">
                        <Users size={32} />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg">Last Verified</h4>
                        <p className="text-sm text-gray-500 font-medium">Student: Alice Johnson (STD-001)</p>
                        <p className="text-[10px] font-bold text-green-600 uppercase mt-1 flex items-center gap-1">
                            <CheckCircle size={10} /> Verified at 15:10
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VerificationOption({ icon, label, desc, color }: any) {
    const colors: any = {
        primary: 'border-primary-200 hover:border-primary-500 hover:bg-primary-50',
        indigo: 'border-indigo-200 hover:border-indigo-500 hover:bg-indigo-50'
    };
    return (
        <button className={`p-6 bg-white rounded-3xl border-2 transition-all group ${colors[color]}`}>
            <div className="text-primary-600 mb-4 group-hover:scale-110 transition-transform">
                {React.cloneElement(icon, { size: 32 })}
            </div>
            <h4 className="font-bold text-sm mb-1">{label}</h4>
            <p className="text-[10px] text-gray-400 font-medium">{desc}</p>
        </button>
    );
}

function ChevronRight({ size, className }: any) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            width={size} 
            height={size} 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="m9 18 6-6-6-6"/>
        </svg>
    );
}
