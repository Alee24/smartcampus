import { useState, useEffect } from 'react'
import { Car, Users, Truck, MapPin, Activity, ArrowUpRight, Plus, Trash2, QrCode, X, Printer, Edit, ExternalLink } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

export default function GatesDashboard() {
    const [activeTab, setActiveTab] = useState<'overview' | 'manage'>('overview')
    const [gates, setGates] = useState<any[]>([])
    const [stats, setStats] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [showQRModal, setShowQRModal] = useState<any>(null) // Contains gate object
    const [newGate, setNewGate] = useState({ name: '', location: '' })
    const [recentActivity, setRecentActivity] = useState<any[]>([])

    const fetchGates = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch Stats
            const statsRes = await fetch('/api/gate/stats', { headers })
            if (statsRes.ok) setStats(await statsRes.json())

            // Fetch List
            const listRes = await fetch('/api/gate/manage/gates', { headers })
            if (listRes.ok) setGates(await listRes.json())

        } catch (e) {
            console.error("Failed to fetch gates", e)
        } finally {
            setLoading(false)
        }
    }

    const fetchRecentActivity = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/recent-activity', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setRecentActivity(await res.json())
        } catch (e) { }
    }

    useEffect(() => {
        fetchGates()
        fetchRecentActivity()
        const interval = setInterval(fetchRecentActivity, 5000)
        return () => clearInterval(interval)
    }, [])

    const handleCreateGate = async (e: any) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/manage/gates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(newGate)
            })
            if (res.ok) {
                setShowAddModal(false)
                setNewGate({ name: '', location: '' })
                fetchGates()
            }
        } catch (e) {
            alert("Failed to create gate")
        }
    }

    const handleDeleteGate = async (id: string) => {
        if (!confirm("Are you sure? This will delete all logs associated with this gate.")) return
        try {
            const token = localStorage.getItem('token')
            await fetch(`/api/gate/manage/gates/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            fetchGates()
        } catch (e) {
            alert("Delete failed")
        }
    }

    const getQRLink = (id: string) => `${window.location.origin}/gate-pass/${id}`

    return (
        <div className="animate-fade-in p-4">
            <header className="mb-8 flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold flex items-center gap-3">
                        <Activity className="text-blue-600" size={32} />
                        Gate Operations
                    </h2>
                    <p className="text-[var(--text-secondary)] mt-1">Manage physical entry points and monitor traffic.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab('overview')}
                        className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'overview' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Overview
                    </button>
                    <button
                        onClick={() => setActiveTab('manage')}
                        className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'manage' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        Management
                    </button>
                </div>
            </header>

            {activeTab === 'overview' && (
                <>
                    {loading ? (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
                        </div>
                    ) : stats.length === 0 ? (
                        <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                            <p className="text-gray-500">No gates configured.</p>
                            <button onClick={() => setActiveTab('manage')} className="mt-4 text-blue-600 font-bold hover:underline">Configure Gates</button>
                        </div>
                    ) : (
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {stats.map(gate => (
                                <div key={gate.id} className="glass-card p-6 rounded-2xl hover:shadow-xl transition-shadow border border-[var(--border-color)]">
                                    <div className="flex justify-between items-start mb-6">
                                        <div>
                                            <h3 className="text-xl font-bold text-[var(--text-primary)]">{gate.name}</h3>
                                            <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] mt-1">
                                                <MapPin size={14} />
                                                {gate.location || 'Unknown Location'}
                                            </div>
                                        </div>
                                        <button onClick={() => setShowQRModal(gate)} className="p-2 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition-colors" title="Get QR Code">
                                            <QrCode size={20} />
                                        </button>
                                    </div>

                                    {/* Stats Grid */}
                                    <div className="grid grid-cols-3 gap-4 mb-6">
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl text-center">
                                            <Car className="mx-auto text-blue-600 mb-2" size={20} />
                                            <div className="text-lg font-bold text-blue-700 dark:text-blue-300">{gate.stats.cars}</div>
                                            <div className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Cars</div>
                                        </div>
                                        <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-xl text-center">
                                            <Users className="mx-auto text-purple-600 mb-2" size={20} />
                                            <div className="text-lg font-bold text-purple-700 dark:text-purple-300">{gate.stats.people}</div>
                                            <div className="text-[10px] uppercase font-bold text-purple-500 tracking-wider">People</div>
                                        </div>
                                        <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-xl text-center">
                                            <Truck className="mx-auto text-orange-600 mb-2" size={20} />
                                            <div className="text-lg font-bold text-orange-700 dark:text-orange-300">{gate.stats.deliveries}</div>
                                            <div className="text-[10px] uppercase font-bold text-orange-500 tracking-wider">Deliveries</div>
                                        </div>
                                    </div>

                                    {/* Link to Page */}
                                    <a href={`/gate-pass/${gate.id}`} target="_blank" className="block w-full text-center py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100">
                                        Open Self-Service Page
                                    </a>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Live Feed Table */}
                    <div className="mt-8 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Activity size={20} className="text-green-500" />
                                Live Check-in Feed
                                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full animate-pulse ml-2">LIVE</span>
                            </h3>
                            <button onClick={fetchRecentActivity} className="text-sm text-blue-600 hover:underline">Refresh</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left bg-white">
                                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-bold">
                                    <tr>
                                        <th className="px-6 py-4">Time</th>
                                        <th className="px-6 py-4">Gate</th>
                                        <th className="px-6 py-4">Identity</th>
                                        <th className="px-6 py-4">Type</th>
                                        <th className="px-6 py-4">Details</th>
                                        <th className="px-6 py-4">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {recentActivity.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">No recent activity detected.</td>
                                        </tr>
                                    ) : (
                                        recentActivity.map((log: any) => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-gray-500 font-mono">
                                                    {new Date(log.time).toLocaleTimeString()}
                                                </td>
                                                <td className="px-6 py-4 text-sm font-bold text-gray-900">{log.gate}</td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-gray-900">{log.name}</div>
                                                    <div className="text-xs text-gray-500">{log.identifier}</div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full uppercase ${log.type === 'user' ? 'bg-indigo-100 text-indigo-700' :
                                                            log.type === 'vehicle' ? 'bg-blue-100 text-blue-700' :
                                                                'bg-orange-100 text-orange-700'
                                                        }`}>
                                                        {log.role}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{log.details}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${log.status === 'allowed' || log.status === 'checked_in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                        }`}>
                                                        {log.status === 'checked_in' ? 'Entry' : log.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {activeTab === 'manage' && (
                <div className="space-y-6">
                    <div className="flex justify-end">
                        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-lg font-bold shadow-lg hover:scale-105 transition-all">
                            <Plus size={18} /> Add New Gate
                        </button>
                    </div>

                    <div className="glass-card overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Name</th>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Location</th>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                    <th className="text-left p-4 text-xs font-bold text-gray-500 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {gates.map(gate => (
                                    <tr key={gate.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                                        <td className="p-4 font-bold">{gate.name}</td>
                                        <td className="p-4 text-sm text-gray-600">{gate.location}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${gate.is_active !== false ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {gate.is_active !== false ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="p-4 flex gap-2">
                                            <button onClick={() => setShowQRModal(gate)} className="p-1.5 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="QR Code">
                                                <QrCode size={16} />
                                            </button>
                                            <button onClick={() => handleDeleteGate(gate.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Delete">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Add Gate Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-scale-in">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Add New Gate</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateGate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Gate Name</label>
                                <input required className="w-full p-2 border rounded-lg" placeholder="e.g. North Gate"
                                    value={newGate.name} onChange={e => setNewGate({ ...newGate, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Location</label>
                                <input className="w-full p-2 border rounded-lg" placeholder="e.g. Science Block Entrance"
                                    value={newGate.location} onChange={e => setNewGate({ ...newGate, location: e.target.value })} />
                            </div>
                            <button className="w-full py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-800">Create Gate</button>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl w-full max-w-sm p-8 shadow-2xl animate-scale-in text-center">
                        <h3 className="text-2xl font-bold mb-2">{showQRModal.name}</h3>
                        <p className="text-gray-500 mb-6">Entry Pass QR Code</p>

                        <div className="bg-white p-4 rounded-xl border-2 border-dashed border-gray-200 inline-block mb-6">
                            <QRCodeCanvas value={getQRLink(showQRModal.id)} size={200} />
                        </div>

                        <div className="text-xs text-gray-400 break-all mb-6">
                            {getQRLink(showQRModal.id)}
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => window.open(getQRLink(showQRModal.id), '_blank')} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-bold flex items-center justify-center gap-2">
                                <ExternalLink size={18} /> Open Page
                            </button>
                            <button onClick={() => setShowQRModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
