import { useState, useEffect } from 'react'
import {
    LayoutDashboard, Users, Shield, ClipboardList, Car, Moon, Sun, LogOut, Search,
    Bell, Settings, HelpCircle, Briefcase, ChevronRight, ChevronLeft, QrCode,
    Server, Database, ShieldCheck, Calendar, Video, Wifi, AlertTriangle, MapPin, Scale, FileText, MonitorPlay, Sliders, Brain, Building2, Building, User, X, Activity
} from 'lucide-react'

import Login from './Login'
import UsersComp from './Users'
import LiveClasses from './LiveClasses'
import { PrivacyPolicy } from './privacy/PrivacyPolicy'
import { CookiePolicy } from './privacy/CookiePolicy'
import { UserDataRights } from './privacy/UserDataRights'
import GateControl from './GateControl'
import VehicleIntel from './VehicleIntel'
import Attendance from './Attendance'
import SettingsComp from './Settings'
import Integrations from './Integrations'
import BulkUpload from './BulkUpload'
import StudentVerification from './StudentVerification'
import GuardianDashboard from './GuardianDashboard'
import LandingPage from './LandingPage'
import Timetable from './Timetable'
import CameraMonitoring from './CameraMonitoring'
import DashboardCustomizer from './DashboardCustomizer'
import AISettings from './AISettings'
import CompanySettings from './CompanySettings'
import ClassroomManagement from './ClassroomManagement'
import CourseReports from './CourseReports'
import EventManagement from './EventManagement'
import InstallPWA from './components/InstallPWA'
import PermissionsModal from './components/PermissionsModal'
import SecurityDashboard from './SecurityDashboard'
import VisitorManagement from './VisitorManagement'
import ScanLogs from './ScanLogs'
import GatesDashboard from './GatesDashboard'

interface DashboardStats {
    active_students: number
    gate_entries_today: number
    security_alerts: number
    vehicles_parked: number
}

interface LogEntry {
    user: string
    time: string
    status: string
    isAlert: boolean
}

function App() {
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'))
    const [showLanding, setShowLanding] = useState(!localStorage.getItem('token')) // Show landing if not logged in
    const [activeTab, setActiveTab] = useState('dashboard')
    const [darkMode, setDarkMode] = useState(false) // Default to Light Mode
    const [stats, setStats] = useState<DashboardStats>({
        active_students: 0,
        gate_entries_today: 0,
        security_alerts: 0,
        vehicles_parked: 0
    })
    const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
    const [kpiData, setKpiData] = useState<any>({ normalized: [], labels: [] })
    const [cameraAlerts, setCameraAlerts] = useState<any[]>([])
    const [todaySessions, setTodaySessions] = useState<any[]>([])
    const [role, setRole] = useState<string>('')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [notifications, setNotifications] = useState<any[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [showSecurityCheck, setShowSecurityCheck] = useState(false)
    const [menuConfig, setMenuConfig] = useState<any>({})
    const [showProfileModal, setShowProfileModal] = useState(false)

    // URL Deep Link Handler (QR Codes)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const room = params.get('room')
        if (room && isAuthenticated) {
            // Store scanned room for Attendance component
            localStorage.setItem('scannedRoom', room)
            setActiveTab('attendance')
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [isAuthenticated])

    // Persistent Login: Validate Session on Load
    useEffect(() => {
        const validateSession = async () => {
            if (!isAuthenticated) return
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/users/me', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (res.status === 401) {
                    console.log('Session Expired - creating persistent login check')
                    localStorage.removeItem('token')
                    setIsAuthenticated(false)
                    setShowLanding(true)
                } else if (res.ok) {
                    const user = await res.json()
                    setCurrentUser(user)
                    setRole(user.role)
                }
            } catch (e) {
                console.error("Session check error", e)
            }
        }
        validateSession()
    }, [isAuthenticated])

    // Fetch menu configuration
    useEffect(() => {
        const fetchMenuConfig = async () => {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/admin/dashboard-config', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setMenuConfig(data.config || {})
                }
            } catch (e) {
                console.error('Failed to fetch menu config:', e)
            }
        }
        if (isAuthenticated) {
            fetchMenuConfig()
        }
    }, [isAuthenticated])

    // Default configuration if none is saved
    const getDefaultConfig = () => {
        return {
            'Student': {
                'dashboard': true,
                'users': false,
                'verification': false,
                'attendance': true,
                'live': false,
                'gate': false,
                'vehicles': false,
                'timetable': true,
                'cameras': false,
                'projects': false,
                'bulk': false,
                'settings': false,
                'integrations': false
            },
            'Lecturer': {
                'dashboard': true,
                'users': true,
                'verification': true,
                'attendance': true,
                'live': true,
                'gate': false,
                'vehicles': false,
                'timetable': true,
                'cameras': false,
                'projects': true,
                'bulk': false,
                'settings': false,
                'integrations': false
            },
            'Guardian': {
                'dashboard': true,
                'users': false,
                'verification': false,
                'attendance': false,
                'live': false,
                'gate': true,
                'vehicles': false,
                'timetable': false,
                'cameras': false,
                'projects': false,
                'bulk': false,
                'settings': false,
                'integrations': false
            },
            'Security': {
                'dashboard': true,
                'users': false,
                'verification': true,
                'attendance': false,
                'live': false,
                'gate': true,
                'vehicles': true,
                'timetable': false,
                'cameras': true,
                'projects': false,
                'bulk': false,
                'settings': false,
                'integrations': false
            },
            'SuperAdmin': {
                'dashboard': true,
                'users': true,
                'verification': true,
                'attendance': true,
                'live': true,
                'gate': true,
                'vehicles': true,
                'timetable': true,
                'cameras': true,
                'projects': true,
                'bulk': true,
                'settings': true,
                'integrations': true
            }
        }
    }

    // Helper to check if menu is enabled for current role
    const isMenuEnabled = (menuId: string) => {
        // Admins and SuperAdmins see everything
        if (role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') return true

        // Get config for current role (use saved config or defaults)
        const defaults: any = getDefaultConfig()
        const roleConfig = menuConfig[role] || defaults[role] || {}

        // Return enabled status (default to false if not specified)
        return roleConfig[menuId] === true
    }

    useEffect(() => {
        if (isAuthenticated) {
            const hasChecked = sessionStorage.getItem('security_checked')
            if (!hasChecked) {
                setShowSecurityCheck(true)
            }
        }
    }, [isAuthenticated])

    const handleSecurityGrant = async (data: any) => {
        try {
            const token = localStorage.getItem('token')
            await fetch('/api/users/log-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })
        } catch (e) {
            console.error(e)
        } finally {
            sessionStorage.setItem('security_checked', 'true')
            setShowSecurityCheck(false)
        }
    }

    useEffect(() => {
        // Initial Theme Load
        if (darkMode) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [darkMode])

    useEffect(() => {
        checkAuth()

        // Deep Linking Support
        const params = new URLSearchParams(window.location.search)
        const tab = params.get('tab')
        if (tab) {
            setActiveTab(tab)
        }
    }, [])

    useEffect(() => {
        let interval: NodeJS.Timeout

        if (isAuthenticated && activeTab === 'dashboard' && role) {
            fetchDashboardData()
            // Poll every 3 seconds for live 'System Activity' updates
            interval = setInterval(fetchDashboardData, 3000)
        }

        return () => {
            if (interval) clearInterval(interval)
        }
    }, [isAuthenticated, activeTab, role])

    const checkAuth = async () => {
        const token = localStorage.getItem('token')
        if (!token) {
            setIsAuthenticated(false)
            setLoading(false)
            return
        }

        // Verify token and get user role
        try {
            const res = await fetch('/api/users/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const user = await res.json()
                setCurrentUser(user) // Store full user object
                setRole(user.role) // Ensure backend returns role name or handle ID
                setIsAuthenticated(true)
                // fetchDashboardData will be called by the useEffect when role is set
                fetchNotifications() // Fetch notifications
            } else {
                localStorage.removeItem('token')
                setIsAuthenticated(false)
            }
        } catch (e) {
            localStorage.removeItem('token')
            setIsAuthenticated(false)
        } finally {
            setLoading(false)
        }
    }

    const fetchDashboardData = async () => {
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            const statsRes = await fetch('/api/dashboard/stats', { headers })
            if (statsRes.ok) setStats(await statsRes.json())

            const logsRes = await fetch('/api/dashboard/recent-logs', { headers })
            if (logsRes.ok) setRecentLogs(await logsRes.json())

            const kpiRes = await fetch('/api/dashboard/kpi', { headers })
            if (kpiRes.ok) setKpiData(await kpiRes.json())

            // Fetch today's classes
            const timetableRes = await fetch('/api/timetable/timetable/weekly', { headers })
            if (timetableRes.ok) {
                const weekly = await timetableRes.json()
                const today = new Date().toLocaleDateString('en-US', { weekday: 'long' })
                setTodaySessions(weekly[today] || [])
            }

            // Fetch camera status
            const camRes = await fetch('/api/cameras/dashboard/stats', { headers })
            if (camRes.ok) {
                const camData = await camRes.json()
                setCameraAlerts(camData.alerts || [])
            }

        } catch (e) {
            console.error("Failed to fetch dashboard data", e)
        }
    }

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
        } catch (e) {
            console.error("Failed to fetch notifications", e)
        }
    }

    const handleLogout = () => {
        localStorage.removeItem('token')
        setIsAuthenticated(false)
        setShowLanding(true) // Show landing page after logout
    }

    const handleGetStarted = () => {
        setShowLanding(false) // Hide landing, show login
    }

    const handleLogin = () => {
        setIsAuthenticated(true)
        setShowLanding(false)
    }

    // Show loading state if checking auth
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-600"></div>
            </div>
        )
    }

    // Show landing page if not authenticated and showLanding is true
    if (!isAuthenticated && showLanding) {
        return <LandingPage onGetStarted={handleGetStarted} />
    }

    // Show login page if not authenticated but user clicked "Get Started"
    if (!isAuthenticated) {
        return <Login onLogin={handleLogin} />
    }

    return (
        <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 font-sans">
            <InstallPWA />
            <PermissionsModal />
            {/* Security Check Modal */}
            {showSecurityCheck && <SecurityCheckModal onGrant={handleSecurityGrant} />}

            {/* Mobile Sidebar Backstop */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-20 lg:hidden glass-card backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar - Ovalent Style */}
            <aside className={`fixed h-full z-30 bg-[var(--bg-primary)] border-r border-[var(--border-color)] flex flex-col transition-all duration-300 ease-in-out group/sidebar ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 shadow-2xl lg:shadow-none ${isSidebarCollapsed ? 'collapsed lg:w-20' : 'lg:w-64'} w-64`}>
                <div className="p-6 relative">
                    <div className="flex items-center justify-between mb-8">
                        <div className={`flex items-center gap-2 transition-all overflow-hidden ${isSidebarCollapsed ? 'justify-center w-full px-0' : ''}`}>
                            <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white font-bold shrink-0">S</div>
                            <h1 className={`text-xl font-bold text-[var(--text-primary)] whitespace-nowrap transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>Smart Campus</h1>
                        </div>

                        {/* Toggle Button (Desktop) */}
                        <button
                            onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
                            className="hidden lg:flex absolute -right-3 top-1.5 w-6 h-6 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full items-center justify-center shadow-md hover:bg-gray-50 text-gray-500 z-50 transform transition-transform"
                        >
                            {isSidebarCollapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                        </button>

                        {/* Close Button Mobile */}
                        <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 text-[var(--text-secondary)]">
                            <ChevronRight className="rotate-180" size={24} />
                        </button>
                    </div>

                    <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-250px)] scrollbar-hide">
                        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase px-4 mb-2 tracking-wider">Overview</div>
                        {isMenuEnabled('dashboard') && (
                            <NavItem
                                icon={<LayoutDashboard size={18} />}
                                label="Dashboard"
                                active={activeTab === 'dashboard'}
                                onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                            />
                        )}

                        {/* Events Section */}
                        {(isMenuEnabled('events')) && (
                            <div className="mt-4 mb-2 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Events</div>
                        )}
                        {isMenuEnabled('events') && (
                            <NavItem
                                icon={<Calendar size={18} />}
                                label="Events & Guests"
                                active={activeTab === 'events'}
                                onClick={() => { setActiveTab('events'); setSidebarOpen(false); }}
                            />
                        )}

                        {/* People Management */}
                        {(isMenuEnabled('users') || isMenuEnabled('verification')) && (
                            <div className="mt-4 mb-2 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">People</div>
                        )}
                        {isMenuEnabled('users') && (
                            <NavItem
                                icon={<Users size={18} />}
                                label="Students / Staff"
                                active={activeTab === 'users'}
                                onClick={() => { setActiveTab('users'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('verification') && (
                            <NavItem
                                icon={<ShieldCheck size={18} />}
                                label="ID Verification"
                                active={activeTab === 'verification'}
                                onClick={() => { setActiveTab('verification'); setSidebarOpen(false); }}
                            />
                        )}

                        {/* Security Suite */}
                        {(isMenuEnabled('gate') || isMenuEnabled('live') || isMenuEnabled('cameras') || isMenuEnabled('vehicles')) && (
                            <div className="mt-4 mb-2 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Security</div>
                        )}
                        {isMenuEnabled('live') && (
                            <NavItem
                                icon={<MonitorPlay size={18} />}
                                label="Live Monitor"
                                active={activeTab === 'live'}
                                onClick={() => { setActiveTab('live'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('gate') && (
                            <NavItem
                                icon={<Shield size={18} />}
                                label="Gate Control"
                                active={activeTab === 'gate'}
                                onClick={() => { setActiveTab('gate'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('gate') && (
                            <NavItem
                                icon={<ClipboardList size={18} />}
                                label="Visitor Logs"
                                active={activeTab === 'visitors'}
                                onClick={() => { setActiveTab('visitors'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('vehicles') && (
                            <NavItem
                                icon={<Car size={18} />}
                                label="Vehicle Intel"
                                active={activeTab === 'vehicles'}
                                onClick={() => { setActiveTab('vehicles'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('cameras') && (
                            <NavItem
                                icon={<Video size={18} />}
                                label="Surveillance"
                                active={activeTab === 'cameras'}
                                onClick={() => { setActiveTab('cameras'); setSidebarOpen(false); }}
                            />
                        )}
                        {(role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') && (
                            <NavItem
                                icon={<ClipboardList size={18} />}
                                label="Scan Logs"
                                active={activeTab === 'scan-logs'}
                                onClick={() => { setActiveTab('scan-logs'); setSidebarOpen(false); }}
                            />
                        )}
                        {(role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') && (
                            <NavItem
                                icon={<Activity size={18} />}
                                label="Gates Analytics"
                                active={activeTab === 'gates-dashboard'}
                                onClick={() => { setActiveTab('gates-dashboard'); setSidebarOpen(false); }}
                            />
                        )}

                        {/* Academics */}
                        {(isMenuEnabled('timetable') || isMenuEnabled('attendance')) && (
                            <div className="mt-4 mb-2 px-4 text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-wider">Academics</div>
                        )}
                        {isMenuEnabled('attendance') && (
                            <NavItem
                                icon={<QrCode size={18} />}
                                label="Class Attendance"
                                active={activeTab === 'attendance'}
                                onClick={() => { setActiveTab('attendance'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('timetable') && (
                            <>
                                <NavItem
                                    icon={<Calendar size={18} />}
                                    label="Timetable"
                                    active={activeTab === 'timetable'}
                                    onClick={() => { setActiveTab('timetable'); setSidebarOpen(false); }}
                                />
                                <NavItem
                                    icon={<FileText size={18} />}
                                    label="Courses"
                                    active={activeTab === 'courses'}
                                    onClick={() => { setActiveTab('courses'); setSidebarOpen(false); }}
                                />
                                <NavItem
                                    icon={<Building size={18} />}
                                    label="Classrooms"
                                    active={activeTab === 'classrooms'}
                                    onClick={() => { setActiveTab('classrooms'); setSidebarOpen(false); }}
                                />
                            </>
                        )}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-[var(--border-color)]">
                    <nav className="space-y-1 mb-4">
                        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase px-4 mb-2 tracking-wider">Settings</div>
                        {(role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') && (
                            <>
                                <NavItem
                                    icon={<Sliders size={18} />}
                                    label="Dashboard Designer"
                                    active={activeTab === 'dashboard-designer'}
                                    onClick={() => { setActiveTab('dashboard-designer'); setSidebarOpen(false); }}
                                />
                                <NavItem
                                    icon={<Brain size={18} />}
                                    label="AI Settings"
                                    active={activeTab === 'ai-settings'}
                                    onClick={() => { setActiveTab('ai-settings'); setSidebarOpen(false); }}
                                />
                                <NavItem
                                    icon={<Building2 size={18} />}
                                    label="Company Settings"
                                    active={activeTab === 'company-settings'}
                                    onClick={() => { setActiveTab('company-settings'); setSidebarOpen(false); }}
                                />
                            </>
                        )}
                        {isMenuEnabled('bulk') && (
                            <NavItem
                                icon={<Database size={18} />}
                                label="Data Import"
                                active={activeTab === 'bulk'}
                                onClick={() => { setActiveTab('bulk'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('settings') && (
                            <NavItem
                                icon={<Settings size={18} />}
                                label="Settings"
                                active={activeTab === 'settings'}
                                onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('integrations') && (
                            <NavItem
                                icon={<Server size={18} />}
                                label="Integrations"
                                active={activeTab === 'integrations'}
                                onClick={() => { setActiveTab('integrations'); setSidebarOpen(false); }}
                            />
                        )}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-[var(--border-color)]">
                    <nav className="space-y-1 mb-4">
                        <div className="text-xs font-semibold text-[var(--text-secondary)] uppercase px-4 mb-2 tracking-wider">Support</div>
                        <NavItem icon={<HelpCircle size={18} />} label="Help Center" active={false} onClick={() => { }} />
                    </nav>

                    {/* Legal Section */}
                    <div className="px-4 mb-2">
                        <div className="text-[10px] uppercase font-bold text-[var(--text-secondary)] mb-2 mt-4 tracking-wider">Privacy & Legal</div>
                        <NavItem
                            icon={<ShieldCheck size={18} />}
                            label="Privacy Policy"
                            active={activeTab === 'privacy'}
                            onClick={() => { setActiveTab('privacy'); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                        />
                        <NavItem
                            icon={<Scale size={18} />}
                            label="Data Rights"
                            active={activeTab === 'rights'}
                            onClick={() => { setActiveTab('rights'); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                        />
                        <NavItem
                            icon={<Database size={18} />}
                            label="Cookie Policy"
                            active={activeTab === 'cookies'}
                            onClick={() => { setActiveTab('cookies'); if (window.innerWidth < 1024) setSidebarOpen(false); }}
                        />
                    </div>

                    <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-color)] mt-2">
                        <button
                            onClick={() => setDarkMode(!darkMode)}
                            className="p-2 rounded-full hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                        <button
                            onClick={handleLogout}
                            className="p-2 rounded-full hover:bg-red-50 text-red-500 transition-colors"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </aside>


            {/* Main Content */}
            <main className={`flex-1 p-3 sm:p-4 lg:p-8 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                {/* Top Header */}
                <header className="flex justify-between items-center mb-4 sm:mb-6 lg:mb-10 py-2 sm:py-4 lg:py-6">
                    <div className="flex items-center gap-2 sm:gap-3">
                        <button
                            onClick={() => setSidebarOpen(true)}
                            className="lg:hidden p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--primary-color)] active:scale-95 transition-transform"
                        >
                            <Briefcase size={20} className="rotate-90" />
                        </button>
                        <h2 className="text-lg sm:text-xl lg:text-3xl font-bold capitalize truncate max-w-[150px] sm:max-w-none">
                            {activeTab.replace('-', ' ')}
                        </h2>

                        {/* Context Top Menu */}
                        {(() => {
                            const groups: any = {
                                security: [
                                    { id: 'live', label: 'Monitor' },
                                    { id: 'gate', label: 'Gate' },
                                    { id: 'visitors', label: 'Visitors' },
                                    { id: 'vehicles', label: 'Vehicles' },
                                    { id: 'cameras', label: 'Cameras' }
                                ],
                                academics: [
                                    { id: 'timetable', label: 'Schedule' },
                                    { id: 'attendance', label: 'Attendance' },
                                    { id: 'courses', label: 'Courses' },
                                    { id: 'classrooms', label: 'Rooms' }
                                ],
                                people: [
                                    { id: 'users', label: 'Directory' },
                                    { id: 'verification', label: 'Verify ID' }
                                ]
                            }
                            const currentGroup = Object.values(groups).find((items: any) => items.some((i: any) => i.id === activeTab)) as any[]

                            if (currentGroup) {
                                return (
                                    <div className="hidden md:flex items-center gap-1 ml-6 p-1.5 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)]">
                                        {currentGroup.map(item => (
                                            isMenuEnabled(item.id) && (
                                                <button
                                                    key={item.id}
                                                    onClick={() => setActiveTab(item.id)}
                                                    className={`px-5 py-2.5 text-sm font-bold rounded-lg transition-all ${activeTab === item.id
                                                        ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)] ring-1 ring-black/5'
                                                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
                                                        }`}
                                                >
                                                    {item.label}
                                                </button>
                                            )
                                        ))}
                                    </div>
                                )
                            }
                        })()}
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
                        <div className="relative hidden lg:block">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]" size={16} />
                            <input
                                type="text"
                                placeholder="Search..."
                                className="pl-10 pr-4 py-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 w-64 transition-all"
                            />
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-secondary)] border border-[var(--border-color)] px-1 rounded">⌘K</div>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-2 relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                <Bell size={20} />
                                {notifications.length > 0 && (
                                    <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
                                )}
                            </button>

                            {/* Notification Dropdown */}
                            {showNotifications && (
                                <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                                    <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                                        <h3 className="font-bold text-[var(--text-primary)]">Notifications</h3>
                                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-bold">
                                            {notifications.length}
                                        </span>
                                    </div>
                                    <div className="divide-y divide-[var(--border-color)]">
                                        {notifications.length === 0 ? (
                                            <div className="p-8 text-center text-[var(--text-secondary)]">
                                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                                <p className="text-sm">No new notifications</p>
                                            </div>
                                        ) : (
                                            notifications.map((notif: any, i: number) => (
                                                <div key={i} className="p-4 hover:bg-[var(--bg-primary)] cursor-pointer transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                        <div className="flex-1">
                                                            <p className="text-sm font-medium text-[var(--text-primary)]">{notif.title}</p>
                                                            <p className="text-xs text-[var(--text-secondary)] mt-1">{notif.message}</p>
                                                            <p className="text-xs text-[var(--text-secondary)] mt-2">{notif.time}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-[var(--border-color)] sm:border-l-0 lg:border-l">
                            <button
                                onClick={() => setShowProfileModal(true)}
                                className="relative w-10 h-10 sm:w-12 sm:h-12 lg:w-14 lg:h-14 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shadow-lg hover:shadow-xl transition-all active:scale-95 cursor-pointer"
                            >
                                <User size={20} className="sm:hidden" strokeWidth={2.5} />
                                <User size={24} className="hidden sm:block lg:hidden" strokeWidth={2.5} />
                                <User size={28} className="hidden lg:block" strokeWidth={2.5} />
                                {/* Status Badge */}
                                <div className={`absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold animate-pulse ${currentUser?.status === 'suspended'
                                    ? 'bg-red-500 text-white'
                                    : currentUser?.status === 'active' && currentUser?.admission_date
                                        ? 'bg-green-500 text-white'
                                        : 'bg-yellow-500 text-white'
                                    }`}>
                                    {currentUser?.status === 'suspended' ? '✕' : currentUser?.status === 'active' && currentUser?.admission_date ? '✓' : '!'}
                                </div>
                            </button>
                            <div className="hidden lg:block">
                                <div className="text-sm font-bold text-[var(--text-primary)]">{currentUser?.full_name || 'User'}</div>
                                <div className="text-xs text-[var(--text-secondary)] flex items-center gap-2">
                                    <span className="px-2 py-0.5 bg-primary-100 text-primary-700 rounded-full font-medium">
                                        {currentUser?.role || 'Role'}
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="ml-3 hidden sm:flex items-center gap-2 px-3 py-2 bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-lg text-sm font-bold transition-all"
                            >
                                <LogOut size={16} />
                                <span className="hidden xl:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </header>

                {activeTab === 'dashboard' && role === 'Guardian' && <GuardianDashboard />}
                {activeTab === 'dashboard' && role === 'Security' && <SecurityDashboard onNavigate={setActiveTab} />}
                {activeTab === 'visitors' && <VisitorManagement />}
                {activeTab === 'dashboard' && role !== 'Guardian' && role !== 'Security' && (
                    <div className="animate-fade-in">
                        {/* Stats Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                            <StatCard title="Total Students" value={stats.active_students} change="+6%" trend="up" />
                            <StatCard title="New Entries" value={stats.gate_entries_today} change="+12%" trend="up" />
                            <StatCard title="Security Alerts" value={stats.security_alerts} change="-2%" trend="down" />
                            <StatCard title="Vehicles Parked" value={stats.vehicles_parked} change="+4%" trend="up" />
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Main Graph Area */}
                            <div className="lg:col-span-2 glass-card p-6 min-h-[400px]">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-lg">KPI Performance</h3>
                                    <select className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1 text-sm outline-none">
                                        <option>Last Year</option>
                                        <option>This Year</option>
                                    </select>
                                </div>
                                <div className="h-[300px] w-full flex items-end justify-between gap-2 px-4">
                                    {/* Real Graph Bars */}
                                    {kpiData.normalized && kpiData.normalized.length > 0 ? (
                                        kpiData.normalized.map((h: number, i: number) => (
                                            <div key={i} className="w-full bg-indigo-50 rounded-t-sm relative group hover:bg-indigo-100 transition-colors" style={{ height: `${h || 5}%` }}>
                                                <div className="absolute bottom-0 w-full bg-gradient-to-t from-indigo-500/20 to-indigo-500/50 h-full rounded-t-sm group-hover:from-indigo-500/30 group-hover:to-indigo-500/60 transition-all"></div>
                                                {/* Tooltip */}
                                                <div className="hidden group-hover:block absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded">
                                                    {kpiData.raw ? kpiData.raw[i] : h} entries
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">No data available</div>
                                    )}
                                </div>
                                <div className="flex justify-between mt-4 text-xs text-[var(--text-secondary)] px-2">
                                    {kpiData.labels && kpiData.labels.map((m: string) => <span key={m}>{m}</span>)}
                                </div>

                                {/* System Setup Wizard Tooltip (Only for Admin if data is low) */}
                                {role === 'SuperAdmin' && todaySessions.length === 0 && (
                                    <div className="mt-8 p-6 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl text-white relative overflow-hidden shadow-xl animate-pulse">
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div>
                                                <h4 className="font-bold text-lg mb-1">Finish System Setup</h4>
                                                <p className="text-sm opacity-90">Upload your courses and timetable to see live analytics.</p>
                                            </div>
                                            <button
                                                onClick={() => setActiveTab('bulk')}
                                                className="px-6 py-2 bg-white text-indigo-600 rounded-xl font-bold shadow-lg hover:scale-105 transition-all"
                                            >
                                                Start Guide
                                            </button>
                                        </div>
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
                                    </div>
                                )}
                            </div>

                            {/* Right Sidebar / Schedule */}
                            <div className="space-y-6">
                                <div className="glass-card p-6">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold">Schedule</h3>
                                        <button className="text-xs border border-[var(--border-color)] px-2 py-1 rounded hover:bg-[var(--bg-primary)]">See All</button>
                                    </div>
                                    {/* Calendar Strip */}
                                    <div className="flex justify-between items-center mb-6 text-sm">
                                        <button className="p-1 hover:bg-[var(--bg-primary)] rounded"><ChevronRight className="rotate-180" size={16} /></button>
                                        <span className="font-medium">{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                                        <button className="p-1 hover:bg-[var(--bg-primary)] rounded"><ChevronRight size={16} /></button>
                                    </div>
                                    <div className="flex justify-between mb-6 text-xs text-center">
                                        {[...Array(5)].map((_, i) => {
                                            const d = new Date()
                                            d.setDate(d.getDate() - 2 + i)
                                            const isActive = i === 2
                                            return (
                                                <div key={i} className={`p-2 rounded-xl cursor-pointer ${isActive ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'hover:bg-[var(--bg-primary)]'}`}>
                                                    <div className={`mb-1 ${isActive ? 'text-indigo-200' : 'text-[var(--text-secondary)]'}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                                    <div className="font-bold text-lg">{d.getDate()}</div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    {/* Live Meeting/Class Items */}
                                    <div className="space-y-3">
                                        {todaySessions.length === 0 ? (
                                            <p className="text-xs text-[var(--text-secondary)] text-center py-4">No classes scheduled for today.</p>
                                        ) : (
                                            todaySessions.slice(0, 3).map((session, i) => (
                                                <div key={i} className="bg-[var(--bg-primary)] p-4 rounded-xl">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <span className="text-xs font-semibold bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded">{session.course_code}</span>
                                                        <div className="flex -space-x-1">
                                                            <div className="w-5 h-5 rounded-full bg-green-100 border border-white flex items-center justify-center">
                                                                <Wifi size={10} className="text-green-600" />
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <h4 className="font-bold text-sm mb-1">{session.course_name}</h4>
                                                    <p className="text-xs text-[var(--text-secondary)]">{session.start_time.slice(0, 5)} - {session.end_time.slice(0, 5)} • {session.room_code}</p>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Recent Logs Section */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
                            <div className="lg:col-span-2 glass-card p-6">
                                <h3 className="font-semibold mb-6">Recent Activity</h3>
                                <div className="space-y-3">
                                    {recentLogs.length === 0 ? (
                                        <p className="text-center text-[var(--text-secondary)] py-4">No recent activity</p>
                                    ) : (
                                        recentLogs.map((log, i) => (
                                            <LogItem
                                                key={i}
                                                user={log.user}
                                                time={log.time}
                                                status={log.status}
                                                isAlert={log.isAlert}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="lg:col-span-1 glass-card p-6">
                                <h3 className="font-semibold mb-6">Camera Alerts</h3>
                                <div className="space-y-4">
                                    {cameraAlerts.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center py-6 text-[var(--text-secondary)]">
                                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mb-2">
                                                <ShieldCheck className="text-green-600" size={20} />
                                            </div>
                                            <p className="text-xs">All systems secure</p>
                                        </div>
                                    ) : (
                                        cameraAlerts.map((alert, i) => (
                                            <div key={i} className="flex gap-4 p-3 rounded-lg bg-red-50 border border-red-100">
                                                <div className="mt-1">
                                                    <AlertTriangle className="text-red-500" size={16} />
                                                </div>
                                                <div>
                                                    <div className="text-xs font-bold text-red-700">{alert.alert_type}</div>
                                                    <div className="text-[10px] text-red-600">{alert.alert_message}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>
                )}

                {activeTab === 'users' && <UsersComp />}
                {activeTab === 'live' && <LiveClasses fullScreen={true} />}
                {activeTab === 'attendance' && <Attendance />}
                {activeTab === 'gate' && <GateControl />}
                {activeTab === 'vehicles' && <VehicleIntel />}
                {activeTab === 'timetable' && <Timetable />}
                {activeTab === 'events' && <EventManagement />}
                {activeTab === 'classrooms' && <ClassroomManagement />}
                {activeTab === 'courses' && <CourseReports />}
                {activeTab === 'cameras' && <CameraMonitoring />}
                {activeTab === 'settings' && <SettingsComp />}
                {activeTab === 'integrations' && <Integrations />}
                {activeTab === 'bulk' && <BulkUpload />}
                {activeTab === 'dashboard-designer' && <DashboardCustomizer />}
                {activeTab === 'ai-settings' && <AISettings />}
                {activeTab === 'company-settings' && <CompanySettings />}
                {activeTab === 'verification' && <StudentVerification />}
                {activeTab === 'privacy' && <PrivacyPolicy />}
                {activeTab === 'cookies' && <CookiePolicy />}
                {activeTab === 'rights' && <UserDataRights />}
                {activeTab === 'scan-logs' && <ScanLogs />}
                {activeTab === 'gates-dashboard' && <GatesDashboard />}
                <footer className="mt-10 pt-6 border-t border-[var(--border-color)] text-center text-sm text-[var(--text-secondary)]">
                    <p>&copy; {new Date().getFullYear()} Smart Campus System. Developed by <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="text-[var(--primary-color)] font-bold hover:underline">KKDES</a></p>
                </footer>
            </main >

            {/* Profile Picture Modal */}
            {showProfileModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in p-0 sm:p-4"
                    onClick={() => setShowProfileModal(false)}
                >
                    <div
                        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden animate-scale-in max-h-[90vh] sm:max-h-none overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header with gradient */}
                        <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-4 sm:p-6 relative">
                            <button
                                onClick={() => setShowProfileModal(false)}
                                className="absolute top-3 right-3 sm:top-4 sm:right-4 p-2 rounded-full bg-white/20 hover:bg-white/30 active:scale-95 transition-all"
                            >
                                <X size={20} className="text-white" />
                            </button>
                            <div className="flex flex-col items-center">
                                <div className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white shadow-2xl border-4 border-white/30">
                                    <User size={64} strokeWidth={2.5} />
                                </div>
                                <div className="mt-4 text-center">
                                    <h2 className="text-2xl font-bold text-white">{currentUser?.full_name || 'User'}</h2>
                                    <p className="text-purple-100 text-sm mt-1">{currentUser?.email || 'No email'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Details Section */}
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl">
                                    <div className="text-xs text-purple-600 dark:text-purple-400 font-semibold uppercase mb-1">Role</div>
                                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{currentUser?.role || 'N/A'}</div>
                                </div>
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl">
                                    <div className="text-xs text-blue-600 dark:text-blue-400 font-semibold uppercase mb-1">Status</div>
                                    <div className="text-sm font-bold text-gray-800 dark:text-gray-200 capitalize">{currentUser?.status || 'Active'}</div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase mb-1">Admission Number</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200 font-mono">{currentUser?.admission_number || 'N/A'}</div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl">
                                <div className="text-xs text-gray-600 dark:text-gray-400 font-semibold uppercase mb-1">School/Department</div>
                                <div className="text-sm font-bold text-gray-800 dark:text-gray-200">{currentUser?.school || 'General'}</div>
                            </div>

                            <button
                                onClick={() => {
                                    window.dispatchEvent(new CustomEvent('open-permissions-modal'))
                                    setShowProfileModal(false)
                                }}
                                className="w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300 rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                <ShieldCheck size={18} />
                                Check Device Permissions
                            </button>

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => {
                                        setShowProfileModal(false)
                                        setActiveTab('settings')
                                    }}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-xl font-bold hover:shadow-lg transition-all"
                                >
                                    Edit Profile
                                </button>
                                <button
                                    onClick={() => setShowProfileModal(false)}
                                    className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold hover:bg-gray-300 dark:hover:bg-gray-600 transition-all"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <InstallPWA />
            <PermissionsModal />
        </div >
    )
}

function NavItem({ icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            title={label}
            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all mb-1 group-[.collapsed]/sidebar:justify-center group-[.collapsed]/sidebar:px-2 ${active
                ? 'bg-primary-50 text-secondary font-bold shadow-sm'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]'
                }`}
        >
            <div className={`shrink-0 ${active ? 'text-primary-600' : 'text-[var(--text-secondary)]'} group-[.collapsed]/sidebar:translate-x-0`}>
                {icon}
            </div>
            <span className="text-sm group-[.collapsed]/sidebar:hidden whitespace-nowrap overflow-hidden transition-all">{label}</span>
            {label === 'Benefits' && <span className="ml-auto text-[10px] bg-accent/10 text-accent px-1.5 py-0.5 rounded font-bold group-[.collapsed]/sidebar:hidden">NEW</span>}
        </button>
    )
}

function StatCard({ title, value, change, trend }: any) {
    const isUp = trend === 'up';
    return (
        <div className="p-6 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm hover:shadow-md transition-shadow">
            <h4 className="text-[var(--text-primary)] font-semibold mb-4">{title}</h4>
            <div className="mb-2">
                <span className="text-3xl font-bold text-[var(--text-primary)]">{value}</span>
            </div>
            <div className="flex items-center gap-2">
                <span className={`text-xs px-1.5 py-0.5 rounded font-bold ${isUp ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                    {change}
                </span>
                <span className="text-xs text-[var(--text-secondary)]">vs last month</span>
            </div>
        </div>
    )
}

function SecurityCheckModal({ onGrant }: { onGrant: (data: any) => void }) {
    const [status, setStatus] = useState('idle') // idle, requesting, success, error

    const handleGrant = () => {
        setStatus('requesting')

        if (!navigator.geolocation) {
            captureData({ lat: null, lng: null, error: 'Geolocation not supported' })
            return
        }

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                captureData({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                })
            },
            (err) => {
                captureData({ lat: null, lng: null, error: err.message })
            }
        )
    }

    const captureData = (gpsData: any) => {
        // Network Info (Experimental)
        // @ts-ignore
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const netType = conn ? conn.effectiveType || conn.type : 'unknown';

        const data = {
            gps: gpsData,
            network: netType,
            device: {
                userAgent: navigator.userAgent,
                screen: `${window.screen.width}x${window.screen.height}`
            }
        }

        onGrant(data)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm animate-fade-in">
            <div className="bg-white text-black p-8 rounded-2xl max-w-md w-full text-center shadow-2xl">
                <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                    <ShieldCheck size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2">Security Verification</h3>
                <p className="text-gray-500 mb-8 text-sm leading-relaxed">
                    To access the Smart Campus System, we require permission to verify your <b>Location</b> and <b>Network Environment</b> for security logging.
                </p>

                <div className="bg-gray-50 p-4 rounded-xl mb-6 text-left space-y-3">
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                        <MapPin size={16} className="text-indigo-500" />
                        <span>GPS Coordinates</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-700">
                        <Wifi size={16} className="text-indigo-500" />
                        <span>Network Connection Type</span>
                    </div>
                </div>

                <button
                    onClick={handleGrant}
                    disabled={status === 'requesting'}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2"
                >
                    {status === 'requesting' ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Verifying...
                        </>
                    ) : (
                        <>
                            Allow Access & Continue
                        </>
                    )}
                </button>
            </div>
        </div>
    )
}

function LogItem({ user, time, status, isAlert }: any) {
    return (
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)]">
            <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isAlert ? 'bg-red-500' : 'bg-green-500'}`} />
                <span className="font-medium text-[var(--text-primary)] text-sm">{user}</span>
            </div>
            <div className="text-right flex items-center gap-4">
                <div className={`text-xs font-bold px-2 py-1 rounded-full ${isAlert ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>{status}</div>
                <div className="text-xs text-[var(--text-secondary)]">{time}</div>
            </div>
        </div>
    )
}

export default App
