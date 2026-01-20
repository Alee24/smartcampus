import { useState, useEffect } from 'react'
import {
    LayoutDashboard, Users, Shield, Car, Calendar, Video,
    QrCode, Database, Settings, Server, Briefcase, ShieldCheck,
    MonitorPlay, Save, RefreshCw, CheckSquare, Square, Eye, EyeOff
} from 'lucide-react'

interface MenuConfig {
    [role: string]: {
        [menuItem: string]: boolean
    }
}

const AVAILABLE_MENUS = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, description: 'Overview and statistics' },
    { id: 'users', label: 'Students / Staff', icon: Users, description: 'User management' },
    { id: 'verification', label: 'ID Verification', icon: ShieldCheck, description: 'Facial recognition verification' },
    { id: 'attendance', label: 'Class Attendance', icon: QrCode, description: 'Attendance sessions and QR codes' },
    { id: 'live', label: 'Live Monitor', icon: MonitorPlay, description: 'Real-time class monitoring' },
    { id: 'gate', label: 'Gate Control', icon: Shield, description: 'Entry/exit management' },
    { id: 'vehicles', label: 'Vehicle Intel', icon: Car, description: 'Vehicle tracking' },
    { id: 'timetable', label: 'Timetable', icon: Calendar, description: 'Class schedules' },
    { id: 'cameras', label: 'Cameras', icon: Video, description: 'CCTV monitoring' },
    { id: 'projects', label: 'Projects', icon: Briefcase, description: 'Project management' },
    { id: 'bulk', label: 'Data Import', icon: Database, description: 'Bulk CSV uploads' },
    { id: 'settings', label: 'Settings', icon: Settings, description: 'System configuration' },
    { id: 'integrations', label: 'Integrations', icon: Server, description: 'Third-party integrations' }
]

const ROLES = [
    { id: 'Student', label: 'Student', color: 'bg-blue-500' },
    { id: 'Lecturer', label: 'Lecturer', color: 'bg-purple-500' },
    { id: 'Guardian', label: 'Guardian', color: 'bg-green-500' },
    { id: 'Security', label: 'Security', color: 'bg-orange-500' }
]

export default function DashboardCustomizer() {
    const [config, setConfig] = useState<MenuConfig>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [selectedRole, setSelectedRole] = useState('Student')
    const [previewMode, setPreviewMode] = useState(false)

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/dashboard-config', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                const data = await res.json()
                setConfig(data.config || getDefaultConfig())
            } else {
                setConfig(getDefaultConfig())
            }
        } catch (e) {
            console.error(e)
            setConfig(getDefaultConfig())
        } finally {
            setLoading(false)
        }
    }

    const getDefaultConfig = (): MenuConfig => {
        return {
            'Student': {
                'dashboard': true,
                'attendance': true,
                'timetable': true,
                'gate': false,
                'users': false,
                'verification': false,
                'live': false,
                'vehicles': false,
                'cameras': false,
                'projects': false,
                'bulk': false,
                'settings': false,
                'integrations': false
            },
            'Lecturer': {
                'dashboard': true,
                'users': true,
                'attendance': true,
                'live': true,
                'timetable': true,
                'verification': true,
                'gate': false,
                'vehicles': false,
                'cameras': false,
                'projects': true,
                'bulk': false,
                'settings': false,
                'integrations': false
            },
            'Guardian': {
                'dashboard': true,
                'users': false,
                'attendance': false,
                'timetable': false,
                'gate': true,
                'verification': false,
                'live': false,
                'vehicles': false,
                'cameras': false,
                'projects': false,
                'bulk': false,
                'settings': false,
                'integrations': false
            },
            'Security': {
                'dashboard': true,
                'gate': true,
                'vehicles': true,
                'cameras': true,
                'users': false,
                'attendance': false,
                'verification': true,
                'live': false,
                'timetable': false,
                'projects': false,
                'bulk': false,
                'settings': false,
                'integrations': false
            }
        }
    }

    const toggleMenu = (role: string, menuId: string) => {
        setConfig(prev => ({
            ...prev,
            [role]: {
                ...prev[role],
                [menuId]: !prev[role]?.[menuId]
            }
        }))
    }

    const saveConfig = async () => {
        setSaving(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/dashboard-config', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ config })
            })

            if (res.ok) {
                alert('✓ Dashboard configuration saved successfully!')
            } else {
                alert('Failed to save configuration')
            }
        } catch (e) {
            console.error(e)
            alert('Error saving configuration')
        } finally {
            setSaving(false)
        }
    }

    const resetToDefaults = () => {
        if (confirm('Reset all roles to default configuration?')) {
            setConfig(getDefaultConfig())
        }
    }

    const enableAll = () => {
        const newConfig = { ...config }
        ROLES.forEach(role => {
            newConfig[role.id] = {}
            AVAILABLE_MENUS.forEach(menu => {
                newConfig[role.id][menu.id] = true
            })
        })
        setConfig(newConfig)
    }

    const disableAll = () => {
        const newConfig = { ...config }
        ROLES.forEach(role => {
            newConfig[role.id] = {}
            AVAILABLE_MENUS.forEach(menu => {
                newConfig[role.id][menu.id] = false
            })
        })
        setConfig(newConfig)
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
                    <p>Loading configuration...</p>
                </div>
            </div>
        )
    }

    const selectedRoleConfig = config[selectedRole] || {}
    const enabledCount = Object.values(selectedRoleConfig).filter(Boolean).length

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <LayoutDashboard className="text-indigo-600" size={32} />
                    Dashboard Designer
                </h1>
                <p className="text-[var(--text-secondary)]">
                    Customize which menu items appear for each user role. Changes apply immediately after saving.
                </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 mb-6">
                <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all"
                >
                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>

                <button
                    onClick={resetToDefaults}
                    className="flex items-center gap-2 px-4 py-3 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-xl transition-all"
                >
                    <RefreshCw size={18} />
                    Reset to Defaults
                </button>

                <button
                    onClick={enableAll}
                    className="flex items-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white font-medium rounded-xl transition-all"
                >
                    <CheckSquare size={18} />
                    Enable All
                </button>

                <button
                    onClick={disableAll}
                    className="flex items-center gap-2 px-4 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all"
                >
                    <Square size={18} />
                    Disable All
                </button>

                <button
                    onClick={() => setPreviewMode(!previewMode)}
                    className="flex items-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-600 text-white font-medium rounded-xl transition-all ml-auto"
                >
                    {previewMode ? <EyeOff size={18} /> : <Eye size={18} />}
                    {previewMode ? 'Edit Mode' : 'Preview Mode'}
                </button>
            </div>

            {/* Role Tabs */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {ROLES.map(role => {
                    const roleConfig = config[role.id] || {}
                    const count = Object.values(roleConfig).filter(Boolean).length
                    return (
                        <button
                            key={role.id}
                            onClick={() => setSelectedRole(role.id)}
                            className={`
                                px-6 py-3 rounded-xl font-bold whitespace-nowrap transition-all
                                ${selectedRole === role.id
                                    ? `${role.color} text-white shadow-lg scale-105`
                                    : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'
                                }
                            `}
                        >
                            {role.label}
                            <span className="ml-2 text-xs opacity-75">({count}/{AVAILABLE_MENUS.length})</span>
                        </button>
                    )
                })}
            </div>

            {/* Menu Configuration Grid */}
            <div className="glass-card p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold">
                        {selectedRole} Dashboard Menu Items
                    </h2>
                    <div className="text-sm text-[var(--text-secondary)]">
                        {enabledCount} of {AVAILABLE_MENUS.length} enabled
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {AVAILABLE_MENUS.map(menu => {
                        const Icon = menu.icon
                        const isEnabled = selectedRoleConfig[menu.id] || false

                        return (
                            <div
                                key={menu.id}
                                onClick={() => !previewMode && toggleMenu(selectedRole, menu.id)}
                                className={`
                                    p-4 rounded-xl border-2 transition-all cursor-pointer
                                    ${isEnabled
                                        ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                                        : 'border-gray-200 bg-white dark:bg-gray-800 opacity-50'
                                    }
                                    ${!previewMode && 'hover:shadow-lg hover:scale-105'}
                                    ${previewMode && !isEnabled && 'hidden'}
                                `}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-lg ${isEnabled ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                        <Icon size={20} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="font-bold text-sm">{menu.label}</h3>
                                            {isEnabled ? (
                                                <CheckSquare size={16} className="text-indigo-600" />
                                            ) : (
                                                <Square size={16} className="text-gray-400" />
                                            )}
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)]">{menu.description}</p>
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                </div>

                {previewMode && enabledCount === 0 && (
                    <div className="text-center py-12 text-[var(--text-secondary)]">
                        <Square size={48} className="mx-auto mb-4 opacity-30" />
                        <p>No menu items enabled for this role</p>
                    </div>
                )}
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">💡 How it works</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Click on menu items to enable/disable them for the selected role</li>
                    <li>• Changes are saved to the database and apply immediately to all users</li>
                    <li>• Use "Preview Mode" to see what the dashboard will look like for that role</li>
                    <li>• "Dashboard" menu is recommended for all roles as the home page</li>
                </ul>
            </div>
        </div>
    )
}
