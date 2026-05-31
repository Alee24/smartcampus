import { useState, useEffect } from 'react'
import { 
    User, Lock, Bell, CheckCircle, Shield, Cog, 
    Mail, Phone, UserCheck, Camera, AlertTriangle, 
    Info, Sliders, Eye, Activity, Moon, Sun, ToggleLeft, ToggleRight
} from 'lucide-react'

export default function Settings() {
    const [activeSection, setActiveSection] = useState('profile')
    const [loading, setLoading] = useState(false)
    const [status, setStatus] = useState('')
    const [statusType, setStatusType] = useState<'success' | 'error' | ''>('')
    const [demoMode, setDemoMode] = useState(false)

    // Profile Fields
    const [profile, setProfile] = useState({
        id: '',
        first_name: '',
        last_name: '',
        full_name: '',
        email: '',
        admission_number: '',
        phone_number: '',
        gender: '',
        program: '',
        school: '',
        profile_image: '',
        role: ''
    })

    // Password change fields
    const [passwordForm, setPasswordForm] = useState({
        password: '',
        confirm: ''
    })

    // Notifications state
    const [notifications, setNotifications] = useState<any[]>([])
    
    // Local storage notification preferences
    const [notificationPrefs, setNotificationPrefs] = useState(() => {
        const saved = localStorage.getItem('notificationPrefs')
        return saved ? JSON.parse(saved) : {
            emailLoginAlerts: true,
            emailSecurityAlerts: true,
            emailAttendanceSummary: false,
            pushGateAccessAlerts: true,
            pushGeofenceAlerts: true,
            pushSystemAlerts: true
        }
    })

    // Save notification preferences whenever they change
    useEffect(() => {
        localStorage.setItem('notificationPrefs', JSON.stringify(notificationPrefs))
    }, [notificationPrefs])

    // Load user profile on mount
    const fetchProfile = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setProfile({
                    id: data.id || '',
                    first_name: data.first_name || '',
                    last_name: data.last_name || '',
                    full_name: data.full_name || '',
                    email: data.email || '',
                    admission_number: data.admission_number || '',
                    phone_number: data.phone_number || '',
                    gender: data.gender || '',
                    program: data.program || '',
                    school: data.school || '',
                    profile_image: data.profile_image || '',
                    role: data.role || ''
                })
            }
        } catch (err) {
            console.error("Failed to fetch user profile", err)
        } finally {
            setLoading(false)
        }
    }

    // Load active notifications/alerts log
    const fetchNotifications = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setNotifications(data)
            }
        } catch (err) {
            console.error("Failed to fetch notifications logs", err)
        }
    }

    useEffect(() => {
        fetchProfile()
    }, [])

    useEffect(() => {
        if (activeSection === 'system') {
            fetchSystemSettings()
        } else if (activeSection === 'notifications') {
            fetchNotifications()
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
        setStatus('')
        setStatusType('')
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
                setStatusType('success')
                setStatus(`Demo Mode ${newValue ? 'Enabled' : 'Disabled'} Successfully`)
            } else {
                setStatusType('error')
                setStatus('Failed to update demo mode settings')
            }
        } catch (err) {
            setStatusType('error')
            setStatus('Error updating system setting')
        } finally {
            setLoading(false)
        }
    }

    // Trigger Hidden Avatar File Input
    const triggerAvatarUpload = () => {
        document.getElementById('avatar-upload-input')?.click();
    }

    // Handle Upload Avatar
    const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append('file', file)

        setLoading(true)
        setStatus('')
        setStatusType('')
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/upload-profile-image', {
                method: 'POST',
                headers: { 
                    'Authorization': `Bearer ${token}` 
                },
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                setProfile(prev => ({ ...prev, profile_image: data.image_url }))
                localStorage.setItem('userImage', data.image_url)
                setStatusType('success')
                setStatus('Avatar updated successfully! Your new profile image will appear instantly.')
            } else {
                const errData = await res.json()
                setStatusType('error')
                setStatus(errData.detail || 'Failed to upload profile image')
            }
        } catch (err) {
            setStatusType('error')
            setStatus('Error uploading profile image')
        } finally {
            setLoading(false)
        }
    }

    // Save profile changes
    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('')
        setStatusType('')

        if (passwordForm.password && passwordForm.password !== passwordForm.confirm) {
            setStatusType('error')
            setStatus('Passwords do not match')
            return
        }

        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const updateBody: any = {
                first_name: profile.first_name,
                last_name: profile.last_name,
                email: profile.email,
                phone_number: profile.phone_number,
                gender: profile.gender
            }
            if (passwordForm.password) {
                updateBody.password = passwordForm.password
            }

            const res = await fetch('/api/users/me', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(updateBody)
            })

            if (res.ok) {
                setStatusType('success')
                setStatus('Profile updated successfully!')
                setPasswordForm({ password: '', confirm: '' })
                
                // Update Local Storage values so layout updates
                localStorage.setItem('userName', `${profile.first_name} ${profile.last_name}`.trim())
                localStorage.setItem('userEmail', profile.email)
            } else {
                const data = await res.json()
                setStatusType('error')
                setStatus(data.detail || 'Update failed')
            }
        } catch (err) {
            setStatusType('error')
            setStatus('Error updating profile')
        } finally {
            setLoading(false)
        }
    }

    // Toggle single preference
    const handlePreferenceToggle = (key: string) => {
        setNotificationPrefs((prev: any) => ({
            ...prev,
            [key]: !prev[key]
        }))
    }

    // Mark all as read
    const handleMarkAllRead = () => {
        setNotifications(prev => prev.map(n => ({ ...prev, ...n, is_read: true })))
        setStatusType('success')
        setStatus('All active notifications marked as read.')
        setTimeout(() => setStatus(''), 3000)
    }

    return (
        <div className="animate-fade-in flex flex-col md:flex-row gap-8">
            {/* Settings Sidebar */}
            <div className="w-full md:w-1/4">
                <div className="glass-card p-4 space-y-2 border border-[var(--border-color)]">
                    <button
                        onClick={() => { setActiveSection('profile'); setStatus(''); setStatusType(''); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-semibold transition-all ${activeSection === 'profile' ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-purple-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <User size={18} /> Profile Details
                    </button>
                    <button
                        onClick={() => { setActiveSection('notifications'); setStatus(''); setStatusType(''); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-semibold transition-all ${activeSection === 'notifications' ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-purple-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <Bell size={18} /> Notifications
                    </button>
                    <button
                        onClick={() => { setActiveSection('security'); setStatus(''); setStatusType(''); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-semibold transition-all ${activeSection === 'security' ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-purple-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <Shield size={18} /> Security Shield
                    </button>
                    <button
                        onClick={() => { setActiveSection('system'); setStatus(''); setStatusType(''); }}
                        className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 font-semibold transition-all ${activeSection === 'system' ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-purple-500/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
                    >
                        <Cog size={18} /> System Configs
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="w-full md:w-3/4">
                {/* 1. PROFILE SECTION */}
                {activeSection === 'profile' && (
                    <div className="glass-card p-6 md:p-8 border border-[var(--border-color)]">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-[var(--border-color)] pb-4 mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">Profile Settings</h2>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">Manage your professional profile and credential information.</p>
                            </div>
                            <span className="inline-block mt-2 sm:mt-0 px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-[var(--primary-color)] text-xs font-bold rounded-lg border border-purple-100 dark:border-purple-800 self-start uppercase">
                                {profile.role || 'User'} Account
                            </span>
                        </div>

                        {/* Hidden File Input for Avatar */}
                        <input 
                            type="file" 
                            id="avatar-upload-input" 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleAvatarChange} 
                        />

                        {/* Profile Picture Upload Section */}
                        <div className="flex items-center gap-6 mb-8 p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                            <div className="relative group w-20 h-20 md:w-24 md:h-24 rounded-full overflow-hidden border-4 border-white shadow-md flex-shrink-0 bg-gray-100">
                                {profile.profile_image ? (
                                    <img src={profile.profile_image} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={40} /></div>
                                )}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer" onClick={triggerAvatarUpload}>
                                    <Camera className="text-white" size={24} />
                                </div>
                            </div>
                            <div>
                                <h4 className="font-bold text-base md:text-lg">Your Profile Avatar</h4>
                                <p className="text-xs text-[var(--text-secondary)] mb-3">JPG, PNG, or WEBP. Max size 5MB.</p>
                                <button 
                                    type="button" 
                                    onClick={triggerAvatarUpload} 
                                    className="text-xs bg-white dark:bg-gray-800 text-[var(--text-primary)] border border-[var(--border-color)] px-4 py-2 rounded-xl font-bold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                                >
                                    Change Avatar
                                </button>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProfile} className="space-y-6">
                            {/* Personal Details */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">First Name</label>
                                    <input
                                        type="text"
                                        value={profile.first_name}
                                        onChange={e => setProfile({ ...profile, first_name: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-[var(--text-primary)]"
                                        placeholder="First name"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Last Name</label>
                                    <input
                                        type="text"
                                        value={profile.last_name}
                                        onChange={e => setProfile({ ...profile, last_name: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-[var(--text-primary)]"
                                        placeholder="Last name"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Email Address</label>
                                    <input
                                        type="email"
                                        value={profile.email}
                                        onChange={e => setProfile({ ...profile, email: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-[var(--text-primary)]"
                                        placeholder="you@domain.com"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Phone Number</label>
                                    <input
                                        type="text"
                                        value={profile.phone_number}
                                        onChange={e => setProfile({ ...profile, phone_number: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-[var(--text-primary)]"
                                        placeholder="e.g. +254 700 000000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Gender</label>
                                    <select
                                        value={profile.gender}
                                        onChange={e => setProfile({ ...profile, gender: e.target.value })}
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-[var(--text-primary)] font-medium"
                                    >
                                        <option value="">Select Gender</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Admission / Identifier Number</label>
                                    <input
                                        type="text"
                                        value={profile.admission_number}
                                        disabled
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] outline-none text-gray-400 font-mono select-none"
                                    />
                                </div>
                            </div>

                            {/* Academic Program details if student */}
                            {profile.program && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/30 rounded-xl border border-[var(--border-color)]">
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">Registered Program</p>
                                        <p className="font-bold text-sm text-[var(--text-primary)] mt-1">{profile.program}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-[var(--text-secondary)] uppercase font-semibold">School/Department</p>
                                        <p className="font-bold text-sm text-[var(--text-primary)] mt-1">{profile.school}</p>
                                    </div>
                                </div>
                            )}

                            {/* Change Password Block */}
                            <div className="pt-6 border-t border-[var(--border-color)]">
                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Lock size={18} className="text-purple-500" /> Change Security Password</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.password}
                                            onChange={e => setPasswordForm({ ...passwordForm, password: e.target.value })}
                                            placeholder="Enter new password..."
                                            className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-[var(--text-primary)]"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Confirm New Password</label>
                                        <input
                                            type="password"
                                            value={passwordForm.confirm}
                                            onChange={e => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                                            placeholder="Confirm new password..."
                                            className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-[var(--text-primary)]"
                                        />
                                    </div>
                                </div>
                            </div>

                            {status && (
                                <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${statusType === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-600' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                                    {statusType === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                    {status}
                                </div>
                            )}

                            <div className="flex justify-end pt-4">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="bg-[var(--primary-color)] text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center"
                                >
                                    {loading ? 'Saving Settings...' : 'Save Profile Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* 2. NOTIFICATIONS SECTION */}
                {activeSection === 'notifications' && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                        {/* 2a. Preference Toggles (Left 2 Columns) */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="glass-card p-6 border border-[var(--border-color)]">
                                <h3 className="text-xl font-bold mb-2 flex items-center gap-2">
                                    <Sliders size={20} className="text-purple-500" /> Preferences
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mb-6">Manage how and when you receive security alerts and summaries.</p>

                                <div className="space-y-6">
                                    {/* Email Settings */}
                                    <div className="border-b border-[var(--border-color)] pb-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-4">Email Alerts</p>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">Account Login Alerts</p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Alert me when my account is logged into.</p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handlePreferenceToggle('emailLoginAlerts')}
                                                    className="focus:outline-none"
                                                >
                                                    {notificationPrefs.emailLoginAlerts ? <ToggleRight size={38} className="text-purple-600 cursor-pointer" /> : <ToggleLeft size={38} className="text-gray-400 cursor-pointer" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">Security PIN Alerts</p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Alert me when my security PIN changes.</p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handlePreferenceToggle('emailSecurityAlerts')}
                                                    className="focus:outline-none"
                                                >
                                                    {notificationPrefs.emailSecurityAlerts ? <ToggleRight size={38} className="text-purple-600 cursor-pointer" /> : <ToggleLeft size={38} className="text-gray-400 cursor-pointer" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">Daily Summaries</p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Receive daily summaries of gate check-ins.</p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handlePreferenceToggle('emailAttendanceSummary')}
                                                    className="focus:outline-none"
                                                >
                                                    {notificationPrefs.emailAttendanceSummary ? <ToggleRight size={38} className="text-purple-600 cursor-pointer" /> : <ToggleLeft size={38} className="text-gray-400 cursor-pointer" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Push Alerts */}
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-4">Push & In-App Alerts</p>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">Gate Access Alerts</p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Real-time alerts for checked-in/out logs.</p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handlePreferenceToggle('pushGateAccessAlerts')}
                                                    className="focus:outline-none"
                                                >
                                                    {notificationPrefs.pushGateAccessAlerts ? <ToggleRight size={38} className="text-purple-600 cursor-pointer" /> : <ToggleLeft size={38} className="text-gray-400 cursor-pointer" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">Geofence Violations</p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Alerts when geofence bounds are breached.</p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handlePreferenceToggle('pushGeofenceAlerts')}
                                                    className="focus:outline-none"
                                                >
                                                    {notificationPrefs.pushGeofenceAlerts ? <ToggleRight size={38} className="text-purple-600 cursor-pointer" /> : <ToggleLeft size={38} className="text-gray-400 cursor-pointer" />}
                                                </button>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--text-primary)]">System Health Logs</p>
                                                    <p className="text-xs text-[var(--text-secondary)] mt-0.5">Alert me about crucial server logs and updates.</p>
                                                </div>
                                                <button 
                                                    type="button" 
                                                    onClick={() => handlePreferenceToggle('pushSystemAlerts')}
                                                    className="focus:outline-none"
                                                >
                                                    {notificationPrefs.pushSystemAlerts ? <ToggleRight size={38} className="text-purple-600 cursor-pointer" /> : <ToggleLeft size={38} className="text-gray-400 cursor-pointer" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 2b. Active Alerts Logs (Right 3 Columns) */}
                        <div className="lg:col-span-3 space-y-6">
                            <div className="glass-card p-6 border border-[var(--border-color)] flex flex-col h-full min-h-[500px]">
                                <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-4 mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold flex items-center gap-2">
                                            <Activity size={20} className="text-purple-500 animate-pulse" /> Live Security Alerts
                                        </h3>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Real-time logs of system and account operations.</p>
                                    </div>
                                    {notifications.length > 0 && (
                                        <button 
                                            onClick={handleMarkAllRead} 
                                            className="text-xs bg-purple-50 dark:bg-purple-900/30 text-[var(--primary-color)] px-3 py-1.5 rounded-lg border border-purple-100 dark:border-purple-800 font-bold hover:bg-purple-100 dark:hover:bg-purple-900/50 transition-colors"
                                        >
                                            Mark All as Read
                                        </button>
                                    )}
                                </div>

                                {/* Status message inside tab if any */}
                                {status && activeSection === 'notifications' && (
                                    <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-green-600 text-xs font-semibold flex items-center gap-1.5 animate-fade-in">
                                        <CheckCircle size={14} />
                                        {status}
                                    </div>
                                )}

                                <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-2">
                                    {notifications.map((notif) => (
                                        <div 
                                            key={notif.id} 
                                            className={`p-4 rounded-xl border transition-all flex items-start gap-3 relative overflow-hidden ${
                                                notif.is_read 
                                                    ? 'bg-[var(--bg-primary)] border-[var(--border-color)] opacity-70' 
                                                    : 'bg-white dark:bg-gray-800 border-purple-200 dark:border-purple-900 shadow-sm'
                                            }`}
                                        >
                                            {/* Unread Indicator Bar */}
                                            {!notif.is_read && (
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--primary-color)]" />
                                            )}

                                            {/* Severity Icon */}
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${
                                                notif.severity === 'critical' ? 'bg-red-50 text-red-600 dark:bg-red-900/20' :
                                                notif.severity === 'warning' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20' :
                                                notif.severity === 'success' ? 'bg-green-50 text-green-600 dark:bg-green-900/20' :
                                                'bg-blue-50 text-blue-600 dark:bg-blue-900/20'
                                            }`}>
                                                {notif.severity === 'critical' || notif.severity === 'warning' ? (
                                                    <AlertTriangle size={18} />
                                                ) : (
                                                    <Info size={18} />
                                                )}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-2">
                                                    <h4 className="text-sm font-bold truncate text-[var(--text-primary)]">{notif.title}</h4>
                                                    <span className="text-[10px] font-mono text-[var(--text-secondary)] flex-shrink-0">
                                                        {new Date(notif.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{notif.message}</p>
                                                <div className="mt-2 flex items-center justify-between">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide ${
                                                        notif.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                        notif.severity === 'warning' ? 'bg-orange-100 text-orange-700' :
                                                        notif.severity === 'success' ? 'bg-green-100 text-green-700' :
                                                        'bg-blue-100 text-blue-700'
                                                    }`}>
                                                        {notif.severity}
                                                    </span>
                                                    {!notif.is_read && (
                                                        <button 
                                                            onClick={() => {
                                                                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n))
                                                            }}
                                                            className="text-[10px] text-[var(--primary-color)] hover:underline font-bold"
                                                        >
                                                            Mark as read
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {notifications.length === 0 && (
                                        <div className="text-center py-20 text-[var(--text-secondary)] h-full flex flex-col justify-center items-center">
                                            <Bell size={48} className="opacity-20 mb-4 animate-bounce" />
                                            <p className="font-bold text-lg">No active notifications</p>
                                            <p className="text-xs mt-1">Your security logs are fully clear.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. SECURITY SECTION */}
                {activeSection === 'security' && (
                    <div className="glass-card p-6 md:p-8 border border-[var(--border-color)]">
                        <div className="border-b border-[var(--border-color)] pb-4 mb-6">
                            <h2 className="text-2xl font-bold">Security Shield</h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Configure your personal security details and authorization PINs.</p>
                        </div>
                        
                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-2xl p-6 mb-8">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-[var(--primary-color)]">
                                    <Shield size={24} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg text-purple-900 dark:text-purple-100">AI Authorization PIN</h3>
                                    <p className="text-sm text-purple-700 dark:text-purple-300 mt-1">
                                        This 4-digit PIN acts as your second-factor authorization for sensitive campus operations, such as resetting credentials, performing manual gate scans, or uploading student profile photos.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Configure 4-Digit Security PIN</label>
                                <div className="flex flex-col sm:flex-row gap-4">
                                    <input
                                        type="password"
                                        maxLength={4}
                                        placeholder="••••"
                                        className="flex-1 p-3.5 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none transition-colors text-center text-3xl tracking-[1em] font-extrabold"
                                        id="new_pin_input"
                                    />
                                    <button 
                                        onClick={async () => {
                                            const pinInput = document.getElementById('new_pin_input') as HTMLInputElement;
                                            const newPin = pinInput.value;
                                            if (newPin.length !== 4 || !/^\d+$/.test(newPin)) {
                                                setStatusType('error');
                                                setStatus('PIN must be exactly 4 digits');
                                                return;
                                            }
                                            setLoading(true);
                                            setStatus('');
                                            setStatusType('');
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
                                                    setStatusType('success');
                                                    setStatus('Security PIN updated successfully!');
                                                    pinInput.value = '';
                                                } else {
                                                    setStatusType('error');
                                                    setStatus('Failed to update PIN');
                                                }
                                            } catch (err) {
                                                setStatusType('error');
                                                setStatus('Error updating PIN');
                                            } finally {
                                                setLoading(false);
                                            }
                                        }}
                                        disabled={loading}
                                        className="bg-[var(--primary-color)] text-white px-8 py-3.5 rounded-xl font-bold shadow-lg shadow-purple-500/20 hover:opacity-90 active:scale-[0.98] transition-all"
                                    >
                                        Update PIN
                                    </button>
                                </div>
                            </div>

                            {status && activeSection === 'security' && (
                                <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${statusType === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-600' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                                    {statusType === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
                                    {status}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 4. SYSTEM SECTION */}
                {activeSection === 'system' && (
                    <div className="glass-card p-6 md:p-8 border border-[var(--border-color)]">
                        <div className="border-b border-[var(--border-color)] pb-4 mb-6">
                            <h2 className="text-2xl font-bold">System Configuration</h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Configure global application behaviors and demonstration options.</p>
                        </div>

                        <div className="space-y-6">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] gap-4">
                                <div className="max-w-md">
                                    <h3 className="font-bold flex items-center gap-2 text-[var(--text-primary)]">
                                        <Shield size={18} className="text-purple-500 animate-pulse" />
                                        Passwordless Demo Mode
                                    </h3>
                                    <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">
                                        Enable passwordless one-click authentication widgets on the login portal screen.
                                        <br />
                                        <span className="text-[10px] text-orange-500 font-bold uppercase tracking-wider">⚠️ Recommended only for local/demonstration environments!</span>
                                    </p>
                                </div>
                                <button
                                    onClick={toggleDemoMode}
                                    disabled={loading}
                                    className="focus:outline-none"
                                >
                                    {demoMode ? <ToggleRight size={44} className="text-purple-600 cursor-pointer" /> : <ToggleLeft size={44} className="text-gray-400 cursor-pointer" />}
                                </button>
                            </div>

                            {status && activeSection === 'system' && (
                                <div className={`p-4 rounded-xl text-sm font-semibold flex items-center gap-2 ${statusType === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-600' : 'bg-red-500/10 border border-red-500/20 text-red-500'}`}>
                                    {statusType === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
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
