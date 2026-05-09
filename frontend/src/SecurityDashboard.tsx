import React, { useState, useEffect } from 'react';
import { 
    Shield, MapPin, Users, Car, Scan, Bell, 
    Lock, Unlock, Search, CheckCircle, AlertCircle, 
    Clock, LogIn, LogOut, FileText, Camera
} from 'lucide-react';

export default function SecurityDashboard({ onNavigate }: { onNavigate?: (tab: string) => void }) {
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
        <div className="space-y-4 animate-fade-in">
            {/* Header with Quick Stats - More compact */}
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-2">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-gray-900">Security Command Center</h1>
                    <p className="text-xs text-gray-500 font-medium">Main Entrance Portal • Active Session</p>
                </div>
                <div className="flex gap-3">
                    <button className="p-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-all shadow-sm">
                        <Bell size={20} />
                    </button>
                    <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border-2 transition-all ${
                        gateStatus === 'locked' ? 'bg-orange-50 border-orange-200 text-orange-700' : 'bg-green-50 border-green-200 text-green-700'
                    }`}>
                        {gateStatus === 'locked' ? <Lock size={18} /> : <Unlock size={18} />}
                        <span className="font-bold text-sm">Gate: {gateStatus.toUpperCase()}</span>
                        <button 
                            onClick={toggleGate}
                            className={`ml-2 px-3 py-1 rounded-lg font-bold text-[10px] uppercase shadow-sm ${
                                gateStatus === 'locked' ? 'bg-orange-600 text-white' : 'bg-green-600 text-white'
                            }`}
                        >
                            {gateStatus === 'locked' ? 'Open' : 'Close'}
                        </button>
                    </div>
                </div>
            </header>

            {/* Navigation Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <NavTile icon={<Shield />} label="Overview" active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} />
                <NavTile icon={<Lock />} label="Gate" active={activeTab === 'gate'} onClick={() => {
                    setActiveTab('gate');
                    if (onNavigate) onNavigate('gate');
                }} />
                <NavTile icon={<Car />} label="Vehicles" active={activeTab === 'vehicles'} onClick={() => {
                    setActiveTab('vehicles');
                    if (onNavigate) onNavigate('vehicles');
                }} />
                <NavTile icon={<Users />} label="Visitors" active={activeTab === 'visitors'} onClick={() => {
                    setActiveTab('visitors');
                    if (onNavigate) onNavigate('visitors');
                }} />
                <NavTile icon={<Scan />} label="ID Verify" active={activeTab === 'verify'} onClick={() => {
                    setActiveTab('verify');
                    if (onNavigate) onNavigate('verification');
                }} />
            </div>

            {/* Content Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {activeTab === 'overview' && (
                    <>
                        <div className="lg:col-span-2 space-y-4">
                            {/* Live Cam Placeholder */}
                            <div className="glass-card aspect-video relative overflow-hidden bg-black group">
                                <div className="absolute inset-0 opacity-40 bg-[url('https://images.unsplash.com/photo-1590674899484-13da0d1b58f5?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center" />
                                <div className="absolute top-4 left-4 bg-red-600 text-white px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                    Live: Gate A
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                    <button className="p-3 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all">
                                        <Camera size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Visitor Check-in Quick Action */}
                            <div className="glass-card p-4 bg-gradient-to-br from-primary-600 to-indigo-700 text-white">
                                <h3 className="text-lg font-bold mb-3">Quick Verification</h3>
                                <div className="flex gap-3">
                                    <div className="flex-1 relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary-300" size={18} />
                                        <input 
                                            type="text" 
                                            placeholder="ID, Plate or Code..." 
                                            className="w-full pl-9 pr-4 py-3 bg-white/10 border-none rounded-xl placeholder:text-primary-200 text-sm text-white outline-none focus:ring-1 focus:ring-white/30"
                                        />
                                    </div>
                                    <button className="px-6 py-3 bg-white text-primary-600 text-sm font-bold rounded-xl shadow-xl hover:scale-105 transition-all">
                                        Verify
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Activity Feed */}
                            <div className="glass-card p-4">
                                <h3 className="text-sm font-bold mb-4 flex items-center gap-2 text-gray-700">
                                    <Clock size={16} className="text-primary-600" />
                                    Live Feed
                                </h3>
                                <div className="space-y-3">
                                    {recentLogs.map(log => (
                                        <div key={log.id} className="flex gap-3 p-2.5 rounded-xl border border-gray-50 hover:bg-gray-50 transition-all cursor-pointer">
                                            <div className={`p-2 rounded-lg ${
                                                log.status === 'authorized' ? 'bg-green-100 text-green-600' : 
                                                log.status === 'flagged' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                                            }`}>
                                                {log.type === 'vehicle' ? <Car size={16} /> : log.type === 'visitor' ? <Users size={16} /> : <AlertCircle size={16} />}
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="text-xs font-bold">{log.title}</h5>
                                                <p className="text-[9px] text-gray-500">{log.time} • Station 01</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Gate Stats */}
                            <div className="glass-card p-4">
                                <h3 className="text-sm font-bold mb-3 text-gray-700">Daily Stats</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <StatItem label="Visitors" value="42" color="blue" />
                                    <StatItem label="Vehicles" value="156" color="green" />
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
            className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                active 
                ? 'bg-primary-600 border-primary-600 text-white shadow-lg scale-105' 
                : 'bg-white border-gray-100 text-gray-500 hover:border-primary-200 hover:text-primary-600'
            }`}
        >
            <div className={`${active ? 'text-white' : 'text-primary-600'}`}>
                {React.cloneElement(icon, { size: 20 })}
            </div>
            <span className="text-[10px] font-bold">{label}</span>
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
        <div className={`p-3 rounded-xl ${colors[color]} text-center`}>
            <p className="text-[9px] font-black uppercase opacity-60 mb-0.5">{label}</p>
            <p className="text-lg font-black">{value}</p>
        </div>
    );
}

function GateManager({ gateStatus, toggleGate }: any) {
    return (
        <div className="lg:col-span-3 glass-card p-6 animate-fade-in text-center">
            <div className={`w-24 h-24 rounded-full mx-auto mb-4 flex items-center justify-center transition-all ${
                gateStatus === 'locked' ? 'bg-orange-100 text-orange-600' : 'bg-green-100 text-green-600'
            }`}>
                {gateStatus === 'locked' ? <Lock size={48} /> : <Unlock size={48} />}
            </div>
            <h2 className="text-xl font-black mb-1">Manual Barrier Control</h2>
            <p className="text-xs text-gray-500 mb-6">Override standard access control for emergency or utility vehicles.</p>
            
            <div className="flex justify-center gap-4">
                <button 
                    onClick={toggleGate}
                    className={`px-8 py-3 rounded-xl font-black text-sm transition-all ${
                        gateStatus === 'locked' 
                        ? 'bg-green-600 text-white shadow-lg hover:scale-105' 
                        : 'bg-orange-600 text-white shadow-lg hover:scale-105'
                    }`}
                >
                    {gateStatus === 'locked' ? 'OPEN BARRIER' : 'CLOSE BARRIER'}
                </button>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h4 className="font-bold text-xs mb-1 flex items-center gap-1.5"><MapPin size={14} /> Station</h4>
                    <p className="text-[10px] text-gray-500 font-mono">NODE: GATE-01</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h4 className="font-bold text-xs mb-1 flex items-center gap-1.5"><Clock size={14} /> Time</h4>
                    <p className="text-[10px] text-gray-500 font-mono">ACTIVE: 04:12</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <h4 className="font-bold text-xs mb-1 flex items-center gap-1.5"><Shield size={14} /> Integrity</h4>
                    <p className="text-[10px] text-green-600 font-bold">SECURE</p>
                </div>
            </div>
        </div>
    );
}

function VehicleIntel() {
    return (
        <div className="lg:col-span-3 glass-card p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Vehicle Intelligence</h2>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 text-primary-600 rounded-lg font-bold text-xs">
                    <Search size={14} /> Lookup Plate
                </button>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-3">
                    <h3 className="text-[10px] font-black uppercase text-gray-400">Recently Scanned</h3>
                    {[1,2,3].map(i => (
                        <div key={i} className="p-3 bg-gray-50 rounded-xl flex justify-between items-center group cursor-pointer hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-white rounded-lg shadow-sm">
                                    <Car size={16} className="text-primary-600" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">KAB 12{i}G</h4>
                                    <p className="text-[9px] text-gray-500">Staff Vehicle • Dr. Smith</p>
                                </div>
                            </div>
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-black rounded">AUTHORIZED</span>
                        </div>
                    ))}
                </div>
                
                <div className="p-6 bg-gray-900 rounded-2xl text-white">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-white/10 rounded-xl">
                            <Scan size={24} />
                        </div>
                        <span className="text-[9px] font-black bg-red-600 px-2 py-0.5 rounded-full">LIVE SCAN</span>
                    </div>
                    <h4 className="text-sm font-bold mb-1">OCR Recognition</h4>
                    <p className="text-gray-400 text-[10px] mb-4">Camera A01 active. Automatic logging enabled.</p>
                    <div className="h-24 border border-dashed border-white/20 rounded-xl flex items-center justify-center text-white/40 text-[10px]">
                        <span className="animate-pulse">Waiting for detection...</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VisitorLog() {
    return (
        <div className="lg:col-span-3 glass-card p-6 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-black">Visitor Management</h2>
                <button className="px-4 py-2 bg-primary-600 text-white rounded-lg font-bold text-xs shadow-lg shadow-primary-500/20">Check-in Guest</button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="text-left text-[9px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                            <th className="pb-3">Visitor</th>
                            <th className="pb-3">Purpose</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {[1,2,3].map(i => (
                            <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-xs">V</div>
                                        <div>
                                            <p className="font-bold text-xs">Visitor {i}</p>
                                            <p className="text-[9px] text-gray-500">ID: 12345678</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="py-3 text-[10px] text-gray-500 font-medium">Meeting</td>
                                <td className="py-3">
                                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[8px] font-bold rounded-full">INSIDE</span>
                                </td>
                                <td className="py-3">
                                    <button className="p-1.5 text-primary-600 hover:bg-primary-50 rounded-lg transition-all"><LogOut size={14} /></button>
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
        <div className="lg:col-span-3 glass-card p-10 animate-fade-in text-center">
            <div className="max-w-sm mx-auto">
                <div className="w-24 h-24 bg-primary-100 rounded-full mx-auto mb-6 flex items-center justify-center text-primary-600 border-4 border-white shadow-xl">
                    <Scan size={48} />
                </div>
                <h2 className="text-xl font-black mb-2">Secure Verification</h2>
                <p className="text-xs text-gray-500 mb-8 font-medium">Scan biometric ID, QR access tokens, or facial recognition to validate identity.</p>
                
                <div className="grid grid-cols-2 gap-3">
                    <VerificationOption icon={<Camera />} label="Face AI" desc="Auto Scan" color="primary" />
                    <VerificationOption icon={<FileText />} label="Scan ID" desc="Manual" color="indigo" />
                </div>

                <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center gap-4 text-left">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400">
                        <Users size={24} />
                    </div>
                    <div>
                        <h4 className="font-bold text-sm">Last Verified</h4>
                        <p className="text-[10px] text-gray-500">Student: Alice Johnson</p>
                        <p className="text-[8px] font-bold text-green-600 uppercase mt-0.5 flex items-center gap-1">
                            <CheckCircle size={8} /> Verified at 15:10
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

function VerificationOption({ icon, label, desc, color }: any) {
    const colors: any = {
        primary: 'border-primary-100 hover:border-primary-500 hover:bg-primary-50',
        indigo: 'border-indigo-100 hover:border-indigo-500 hover:bg-indigo-50'
    };
    return (
        <button className={`p-4 bg-white rounded-2xl border-2 transition-all group ${colors[color]}`}>
            <div className="text-primary-600 mb-2 group-hover:scale-110 transition-transform">
                {React.cloneElement(icon, { size: 24 })}
            </div>
            <h4 className="font-bold text-[10px] mb-0.5">{label}</h4>
            <p className="text-[8px] text-gray-400 font-medium">{desc}</p>
        </button>
    );
}
