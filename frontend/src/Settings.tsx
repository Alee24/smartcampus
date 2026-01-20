import { useState } from 'react'
import { User, Lock, Bell, CheckCircle, Shield } from 'lucide-react'

export default function Settings() {
    const [activeSection, setActiveSection] = useState('profile')
    const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        if (passwordForm.password && passwordForm.password !== passwordForm.confirm) {
            setStatus('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const updateBody: any = {}
            if (email) updateBody.email = email
            if (passwordForm.password) updateBody.password = passwordForm.password

            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateBody)
            })

            if (res.ok) {
                setStatus('Profile updated successfully')
                setPasswordForm({ password: '', confirm: '' })
            } else {
                const data = await res.json()
                setStatus(data.detail || 'Update failed')
            }
        } catch (err) {
            setStatus('Error updating profile')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="animate-fade-in flex gap-8">
            {/* Settings Sidebar */}
            <div className="w-1/4">
                <div className="glass-card p-4 space-y-2">
                    <button
                        onClick={() => setActiveSection('profile')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeSection === 'profile' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <User size={18} /> Profile
                    </button>
                    <button
                        onClick={() => setActiveSection('notifications')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeSection === 'notifications' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <Bell size={18} /> Notifications
                    </button>
                    <button
                        onClick={() => setActiveSection('security')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeSection === 'security' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <Shield size={18} /> Security
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="w-3/4">
                {activeSection === 'profile' && (
                    <div className="glass-card p-8 max-w-2xl">
                        <h2 className="text-2xl font-bold mb-6">Profile Settings</h2>

                        <div className="flex items-center gap-6 mb-8">
                            <img src="https://i.pravatar.cc/150?u=a042581f4e29026704d" className="w-24 h-24 rounded-full border-4 border-white shadow-lg" alt="Profile" />
                            <div>
                                <button className="text-sm bg-[var(--bg-primary)] border border-[var(--border-color)] px-4 py-2 rounded hover:bg-gray-100 transition-colors">Change Avatar</button>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Email Address</label>
                                <input
                                    type="email"
                                    placeholder="Update email..."
                                    value={email}
                                    onChange={e => setEmail(e.target.value)}
                                    className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors"
                                />
                            </div>

                            <div className="pt-6 border-t border-[var(--border-color)]">
                                <h3 className="font-bold mb-4 flex items-center gap-2"><Lock size={16} /> Change Password</h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.password}
                                            onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                            className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirm}
                                            onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                            className="w-full p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                            </div>

                            {status && (
                                <div className={`p-3 rounded-lg text-sm ${status.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {status.includes('success') && <CheckCircle size={14} className="inline mr-2" />}
                                    {status}
                                </div>
                            )}

                            <div className="flex justify-end">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[var(--primary-color)] text-white px-6 py-2 rounded-lg font-bold hover:opacity-90 transition-opacity"
                                >
                                    {loading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {(activeSection === 'notifications' || activeSection === 'security') && (
                    <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
                        <Shield size={48} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                        <p>This section is under development.</p>
                    </div>
                )}
            </div>
        </div>
    )
}
