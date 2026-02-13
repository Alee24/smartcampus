import { useState, useEffect } from 'react'
import { User, MapPin, Clock, BookOpen, AlertCircle, Shield } from 'lucide-react'

export default function GuardianDashboard() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/dashboard/guardian', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    setData(await res.json())
                }
            } catch (e) {
                console.error(e)
            } finally {
                setLoading(false)
            }
        }
        fetchDashboard()
    }, [])

    if (loading) return <div className="p-8 text-center">Loading Guardian Portal...</div>
    if (!data) return <div className="p-8 text-center">Unable to load dashboard. Ensure you are logged in as a Guardian.</div>

    return (
        <div className="animate-fade-in max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold mb-2">Welcome, {data.guardian_name}</h1>
                    <p className="text-[var(--text-secondary)]">Track your child's safety and attendance in real-time.</p>
                </div>
                <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg flex items-center gap-2 font-medium">
                    <Shield size={20} /> Guardian Account
                </div>
            </div>

            {/* Wards List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.wards.map((ward: any) => (
                    <div key={ward.id} className="glass-card overflow-hidden border-t-4 border-t-[var(--primary-color)]">
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-16 h-16 rounded-full bg-gray-200 overflow-hidden flex-shrink-0 border-2 border-white shadow">
                                    {ward.profile_image ? (
                                        <img src={ward.profile_image.startsWith('http') ? ward.profile_image : `http://localhost:8000${ward.profile_image}`} alt={ward.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-gray-400"><User /></div>
                                    )}
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">{ward.full_name}</h3>
                                    <p className="text-sm font-mono text-[var(--primary-color)]">{ward.admission_number}</p>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1">{ward.school}</p>
                                </div>
                                <div className="ml-auto">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${ward.location_status === 'In Campus' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                                        }`}>
                                        {ward.location_status}
                                    </span>
                                </div>
                            </div>

                            <div className="mt-6 space-y-4">
                                <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                                    <div className="p-2 bg-blue-100 text-blue-600 rounded-full"><Clock size={18} /></div>
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] uppercase">Last Seen</p>
                                        <p className="font-semibold text-sm">{ward.last_seen}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                                    <div className="p-2 bg-purple-100 text-purple-600 rounded-full"><BookOpen size={18} /></div>
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] uppercase">Last Class Attendance</p>
                                        <p className="font-semibold text-sm">{ward.last_class}</p>
                                    </div>
                                </div>

                                {ward.status !== 'active' && (
                                    <div className="flex items-center gap-3 p-3 bg-red-50 text-red-700 rounded-lg border border-red-200">
                                        <AlertCircle size={18} />
                                        <div>
                                            <p className="text-xs font-bold uppercase">Academic Status</p>
                                            <p className="font-semibold text-sm">{ward.status}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="bg-[var(--bg-primary)] p-4 text-center border-t border-[var(--border-color)]">
                            <button className="text-sm text-[var(--primary-color)] font-medium hover:underline">View Full Activity Log</button>
                        </div>
                    </div>
                ))}

                {data.wards.length === 0 && (
                    <div className="col-span-full text-center py-10 text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded-xl border border-dashed border-[var(--border-color)]">
                        <User size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No students linked to this guardian account.</p>
                        <p className="text-sm mt-2">Contact administration to link your wards.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
