import { useState, useEffect } from 'react'
import { User, Lock, Bell, CheckCircle, Shield, Cog } from 'lucide-react'

export default function Settings() {
    const [activeSection, setActiveSection] = useState('profile')
    const [passwordForm, setPasswordForm] = useState({ password: '', confirm: '' })
    const [email, setEmail] = useState('')
    const [status, setStatus] = useState('')
    const [loading, setLoading] = useState(false)
    const [demoMode, setDemoMode] = useState(false)

    useEffect(() => {
        if (activeSection === 'system') {
            fetchSystemSettings()
        }
    }, [activeSection])

    const fetchSystemSettings = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setDemoMode(data.demo_mode === 'true')
            }
        } catch (err) {
            console.error("Failed to fetch settings", err)
        }
    }

    const toggleDemoMode = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const newValue = !demoMode

            const res = await fetch('/api/admin/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ demo_mode: newValue ? 'true' : 'false' })
            })

            if (res.ok) {
                setDemoMode(newValue)
                setStatus(`Demo Mode ${newValue ? 'Enabled' : 'Disabled'}`)
            } else {
                setStatus('Failed to update setting')
            }
        } catch (err) {
            setStatus('Error updating setting')
        } finally {
            setLoading(false)
        }
    }

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
                    <button
                        onClick={() => setActiveSection('system')}
                        className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeSection === 'system' ? 'bg-[var(--primary-color)] text-white' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <Cog size={18} /> System
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
                                <div className={`p-3 rounded-lg text-sm ${status.includes('success') || status.includes('Enabled') || status.includes('Disabled') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {(status.includes('success') || status.includes('Enabled') || status.includes('Disabled')) && <CheckCircle size={14} className="inline mr-2" />}
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

                {activeSection === 'notifications' && (
                    <div className="glass-card p-8 text-center text-[var(--text-secondary)]">
                        <Bell size={48} className="mx-auto mb-4 opacity-50" />
                        <h3 className="text-xl font-bold mb-2">Coming Soon</h3>
                        <p>This section is under development.</p>
                    </div>
                )}

                {activeSection === 'security' && (
                    <div className="glass-card p-8 max-w-2xl">
                        <h2 className="text-2xl font-bold mb-6">Security Settings</h2>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm text-purple-600">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100">Authorization PIN</h3>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                        This 4-digit PIN is used to authorize sensitive actions like updating student photos or modifying restricted records.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">Change Security PIN</label>
                                <div className="flex gap-4">
                                    <input
                                        type="password"
                                        maxLength={4}
                                        placeholder="Enter new 4-digit PIN"
                                        className="flex-1 p-3 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-center text-2xl tracking-[1em] font-bold"
                                        id="new_pin_input"
                                    />
                                    <button 
                                        onClick={async () => {
                                            const pinInput = document.getElementById('new_pin_input') as HTMLInputElement;
                                            const newPin = pinInput.value;
                                            if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
                                                setStatus('PIN must be 4 digits');
                                                return;
                                            }
                                            setLoading(true);
                                            try {
                                                const token = localStorage.getItem('token');
                                                const res = await fetch('/api/users/me/update-pin', {
                                                    method: 'PUT',
                                                    headers: {
                                                        'Content-Type': 'application/json',
                                                        'Authorization': `Bearer ${token}`
                                                    },
                                                    body: JSON.stringify({ pin: newPin })
                                                });
                                                if (res.ok) {
                                                    setStatus('PIN updated successfully');
                                                    pinInput.value = '';
                                                    // Update local user if needed
                                                    const userStr = localStorage.getItem('currentUser');
                                                    if (userStr) {
                                                        const user = JSON.parse(userStr);
                                                        user.pin_setup_required = false;
                                                        localStorage.setItem('currentUser', JSON.stringify(user));
                                                    }
                                                } else {
                                                    setStatus('Failed to update PIN');
                                                }
                                            } catch (err) {
                                                setStatus('Error updating PIN');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="bg-purple-600 text-white px-8 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                                    >
                                        Update PIN
                                    </button>
                                </div>
                            </div>

                            {status && (
                                <div className={`p-3 rounded-lg text-sm ${status.includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {status.includes('success') && <CheckCircle size={14} className="inline mr-2" />}
                                    {status}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeSection === 'system' && (
                    <div className="glass-card p-8 max-w-2xl">
                        <h2 className="text-2xl font-bold mb-6">System Settings</h2>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-lg border border-[var(--border-color)]">
                                <div>
                                    <h3 className="font-bold flex items-center gap-2">
                                        <Shield size={18} className="text-purple-600" />
                                        Demo Mode
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                                        Enable passwordless login for demo users on the login screen.
                                        <br />
                                        <span className="text-xs text-orange-500 font-bold">⚠️ Only enable for demonstration purposes!</span>
                                    </p>
                                </div>
                                <button
                                    onClick={toggleDemoMode}
                                    disabled={loading}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${demoMode ? 'bg-purple-600' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${demoMode ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            {status && (
                                <div className={`p-3 rounded-lg text-sm ${status.includes('Enabled') || status.includes('Disabled') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {(status.includes('Enabled') || status.includes('Disabled')) && <CheckCircle size={14} className="inline mr-2" />}
                                    {status}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
