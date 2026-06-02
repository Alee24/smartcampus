import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Edit2, Globe, Wifi, MapPin, CheckCircle, XCircle, AlertTriangle, Info } from 'lucide-react'
import { useNotification } from './components/Notification'

interface GeofenceSetting {
    id: string
    name: string
    ip_range: string
    is_active: boolean
    description?: string
    created_at: string
}

export default function Geofencing() {
    const { showNotification, showConfirm } = useNotification()
    const [settings, setSettings] = useState<GeofenceSetting[]>([])
    const [isEnabled, setIsEnabled] = useState(false)
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        name: '',
        ip_range: '',
        description: '',
        is_active: true
    })

    useEffect(() => {
        fetchSettings()
        fetchGlobalConfig()
    }, [])

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/geofence', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSettings(data)
            }
        } catch (err) {
            console.error("Failed to fetch geofence settings", err)
        } finally {
            setLoading(false)
        }
    }

    const fetchGlobalConfig = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setIsEnabled(data.enable_geofencing === 'true')
            }
        } catch (err) {
            console.error("Failed to fetch system config", err)
        }
    }

    const toggleGeofencing = async () => {
        const newValue = !isEnabled
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ enable_geofencing: newValue ? 'true' : 'false' })
            })

            if (res.ok) {
                setIsEnabled(newValue)
                showNotification(`Geofencing ${newValue ? 'Enabled' : 'Disabled'}`, 'success')
            }
        } catch (err) {
            showNotification('Failed to update toggle', 'error')
        }
    }

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/geofence', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                showNotification(`Geofence ${editingId ? 'updated' : 'created'} successfully`, 'success')
                setShowModal(false)
                setEditingId(null)
                setFormData({ name: '', ip_range: '', description: '', is_active: true })
                fetchSettings()
            } else {
                const data = await res.json()
                showNotification(data.detail || 'Failed to save', 'error')
            }
        } catch (err) {
            showNotification('Error saving setting', 'error')
        }
    }

    const handleDelete = async (id: string) => {
        const confirmed = await showConfirm({
            title: "Delete Geofence Rule",
            message: "Are you sure you want to delete this geofence rule?",
            confirmText: "Delete Rule",
            cancelText: "Cancel",
            isDanger: true
        })
        if (!confirmed) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/admin/geofence/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                showNotification('Geofence rule deleted', 'success')
                fetchSettings()
            }
        } catch (err) {
            showNotification('Failed to delete rule', 'error')
        }
    }

    return (
        <div className="animate-fade-in space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-2">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-primary)] flex items-center gap-3">
                        <Shield className="text-indigo-600" size={32} />
                        IP Geofencing
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Restrict application access to authorized networks and IP ranges.</p>
                </div>
                
                <div className="flex items-center gap-4 bg-white dark:bg-gray-800 p-3 rounded-xl border border-[var(--border-color)] shadow-sm">
                    <div className="flex flex-col">
                        <span className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Master Switch</span>
                        <span className={`text-sm font-bold ${isEnabled ? 'text-green-600' : 'text-red-600'}`}>
                            {isEnabled ? 'System Active' : 'System Bypassed'}
                        </span>
                    </div>
                    <button
                        onClick={toggleGeofencing}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-all duration-300 ${isEnabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                    >
                        <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform duration-300 ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-6 flex gap-4">
                <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm shrink-0">
                    <Info size={24} />
                </div>
                <div>
                    <h3 className="font-bold text-indigo-900 dark:text-indigo-100">How it works</h3>
                    <p className="text-sm text-indigo-700 dark:text-indigo-300 mt-1">
                        When active, only users connecting from the IP ranges listed below will be able to log in. 
                        This ensures that staff and students can only access sensitive data while on the University Wi-Fi or authorized campus networks.
                        <br />
                        <span className="font-bold">Pro Tip:</span> Use CIDR notation (e.g., 10.0.0.0/24) for entire networks or single IPs for specific workstations.
                    </p>
                </div>
            </div>

            {/* Rules Table */}
            <div className="glass-card overflow-hidden">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <h3 className="font-bold text-xl">Authorized Networks</h3>
                    <button
                        onClick={() => {
                            setEditingId(null)
                            setFormData({ name: '', ip_range: '', description: '', is_active: true })
                            setShowModal(true)
                        }}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center gap-2 hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-200 dark:shadow-none"
                    >
                        <Plus size={18} /> Add Rule
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-[var(--bg-primary)] text-[var(--text-secondary)] text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-bold">Rule Name</th>
                                <th className="px-6 py-4 font-bold">IP Range / CIDR</th>
                                <th className="px-6 py-4 font-bold">Status</th>
                                <th className="px-6 py-4 font-bold">Description</th>
                                <th className="px-6 py-4 font-bold text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center">
                                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600 mx-auto"></div>
                                    </td>
                                </tr>
                            ) : settings.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-20 text-center text-[var(--text-secondary)]">
                                        <Globe size={48} className="mx-auto mb-4 opacity-20" />
                                        <p className="text-lg font-medium">No geofence rules defined yet.</p>
                                        <p className="text-sm">Click "Add Rule" to start whitelisting IPs.</p>
                                    </td>
                                </tr>
                            ) : (
                                settings.map(rule => (
                                    <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-lg ${rule.is_active ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                                                    <Wifi size={18} />
                                                </div>
                                                <span className="font-bold">{rule.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-indigo-600 dark:text-indigo-400 font-mono text-sm">
                                                {rule.ip_range}
                                            </code>
                                        </td>
                                        <td className="px-6 py-4">
                                            {rule.is_active ? (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                                                    <CheckCircle size={12} /> Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
                                                    <XCircle size={12} /> Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                            {rule.description || '—'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => {
                                                        setEditingId(rule.id)
                                                        setFormData({
                                                            name: rule.name,
                                                            ip_range: rule.ip_range,
                                                            description: rule.description || '',
                                                            is_active: rule.is_active
                                                        })
                                                        setShowModal(true)
                                                    }}
                                                    className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(rule.id)}
                                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-indigo-600 text-white">
                            <h3 className="font-bold text-xl flex items-center gap-2">
                                {editingId ? <Edit2 size={20} /> : <Plus size={20} />}
                                {editingId ? 'Edit Geofence Rule' : 'New Geofence Rule'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                                <Plus className="rotate-45" size={24} />
                            </button>
                        </div>
                        
                        <form onSubmit={handleSave} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Rule Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. University Main Wi-Fi"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-[var(--border-color)] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">IP Range / CIDR</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g. 192.168.1.0/24 or 1.2.3.4"
                                    value={formData.ip_range}
                                    onChange={e => setFormData({ ...formData, ip_range: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-[var(--border-color)] focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-mono"
                                />
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Comma-separated values allowed.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-secondary)] mb-1">Description</label>
                                <textarea
                                    rows={2}
                                    placeholder="Briefly describe this network..."
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    className="w-full p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-[var(--border-color)] focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-[var(--border-color)]">
                                <span className="text-sm font-bold">Rule Enabled</span>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-green-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-3 rounded-xl font-bold border border-[var(--border-color)] hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-lg shadow-indigo-100"
                                >
                                    {editingId ? 'Update Rule' : 'Save Rule'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
