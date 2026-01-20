
import { useState, useEffect } from 'react'
import { Car, Users, Truck, MapPin, Activity, ArrowUpRight } from 'lucide-react'

export default function GatesDashboard() {
    const [gates, setGates] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchGates = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/gate/stats', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setGates(data)
                }
            } catch (e) {
                console.error("Failed to fetch gates", e)
            } finally {
                setLoading(false)
            }
        }
        fetchGates()
    }, [])

    return (
        <div className="animate-fade-in p-4">
            <header className="mb-8">
                <h2 className="text-3xl font-bold flex items-center gap-3">
                    <Activity className="text-blue-600" size={32} />
                    Gate Operations & Analytics
                </h2>
                <p className="text-[var(--text-secondary)] mt-1">Real-time traffic and flow analysis across all campus entry points.</p>
            </header>

            {loading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3].map(i => <div key={i} className="h-64 bg-gray-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : gates.length === 0 ? (
                <div className="p-12 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-300">
                    <p className="text-gray-500">No gates configured in the system.</p>
                </div>
            ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {gates.map(gate => (
                        <div key={gate.id} className="glass-card p-6 rounded-2xl hover:shadow-xl transition-shadow border border-[var(--border-color)]">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">{gate.name}</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-[var(--text-secondary)] mt-1">
                                        <MapPin size={14} />
                                        {gate.location || 'Unknown Location'}
                                    </div>
                                </div>
                                <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                    <Activity size={20} />
                                </div>
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

                            {/* Trend Chart (Simple Bars) */}
                            <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-xs font-semibold text-[var(--text-secondary)]">Weekly Activity Trend</span>
                                    <span className="text-xs text-green-600 font-bold flex items-center gap-1">
                                        <ArrowUpRight size={12} /> +12%
                                    </span>
                                </div>
                                <div className="flex items-end justify-between h-16 gap-2">
                                    {gate.stats.trend.map((val: number, i: number) => (
                                        <div key={i} className="w-full bg-gray-100 dark:bg-gray-700 rounded-t-sm relative group">
                                            <div
                                                className="absolute bottom-0 w-full bg-indigo-500 rounded-t-sm transition-all group-hover:bg-indigo-400"
                                                style={{ height: `${(val / 250) * 100}%` }}
                                            />
                                            {/* Tooltip */}
                                            <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                                {val} entries
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
