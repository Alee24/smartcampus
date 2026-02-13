import { useState, useEffect, lazy, Suspense } from 'react'
import {
    LayoutDashboard, Users, Shield, ClipboardList, Car, Moon, Sun, LogOut,
    Bell, Settings, HelpCircle, Briefcase, ChevronRight, ChevronLeft, QrCode,
    Server, Database, ShieldCheck, Calendar, CalendarDays, Video, Wifi, AlertTriangle, MapPin, Scale, FileText, MonitorPlay, Sliders, Brain, Building2, Building, User, X, Activity, BarChart3
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'


// 1. Critical Components (Load immediately for FCP)
import Login from './Login'
import LandingPage from './LandingPage'

// 2. Lazy Loaded Components (Split chunks)
const UsersComp = lazy(() => import('./Users'))
const LiveClasses = lazy(() => import('./LiveClasses'))
const PrivacyPolicy = lazy(() => import('./privacy/PrivacyPolicy').then(module => ({ default: module.PrivacyPolicy })))
const CookiePolicy = lazy(() => import('./privacy/CookiePolicy').then(module => ({ default: module.CookiePolicy })))
const UserDataRights = lazy(() => import('./privacy/UserDataRights').then(module => ({ default: module.UserDataRights })))
const GateControl = lazy(() => import('./GateControl'))
const VehicleIntel = lazy(() => import('./VehicleIntel'))
const Attendance = lazy(() => import('./Attendance'))
const SettingsComp = lazy(() => import('./Settings'))
const Integrations = lazy(() => import('./Integrations'))
const BulkUpload = lazy(() => import('./BulkUpload'))
const StudentVerification = lazy(() => import('./StudentVerification'))
const GuardianDashboard = lazy(() => import('./GuardianDashboard'))
const Timetable = lazy(() => import('./Timetable'))
const CameraMonitoring = lazy(() => import('./CameraMonitoring'))
const DashboardCustomizer = lazy(() => import('./DashboardCustomizer'))
const AISettings = lazy(() => import('./AISettings'))
const CompanySettings = lazy(() => import('./CompanySettings'))
const ClassroomManagement = lazy(() => import('./ClassroomManagement'))
const CourseReports = lazy(() => import('./CourseReports'))
const EventManagement = lazy(() => import('./EventManagement'))
const SecurityDashboard = lazy(() => import('./SecurityDashboard'))
const VisitorManagement = lazy(() => import('./VisitorManagement'))
const ScanLogs = lazy(() => import('./ScanLogs'))
const GatesDashboard = lazy(() => import('./GatesDashboard'))
const StudentDashboard = lazy(() => import('./StudentDashboard'))
const SelfServiceEntry = lazy(() => import('./SelfServiceEntry'))
const Reports = lazy(() => import('./Reports'))
const CampusCalendar = lazy(() => import('./CampusCalendar'))

// 3. Non-lazy components (small/critical)
import InstallPWA from './components/InstallPWA'
import PermissionsModal from './components/PermissionsModal'

// Helper for Suspense Fallback
const PageLoader = () => (
    <div className="flex items-center justify-center p-20">
        <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
    </div>
)

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
    // Public Route Check
    const path = window.location.pathname
    if (path.startsWith('/gate-pass/')) {
        return (
            <Suspense fallback={<div className="h-screen flex items-center justify-center">Loading...</div>}>
                <SelfServiceEntry />
            </Suspense>
        )
    }

    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('token'))
    const [showLanding, setShowLanding] = useState(!localStorage.getItem('token')) // Show landing if not logged in

    // Get user role from localStorage and set initial dashboard
    const userRole = localStorage.getItem('userRole') || 'student'
    const getInitialTab = () => {
        if (!localStorage.getItem('token')) return 'dashboard'
        // Role-based default dashboards
        switch (userRole.toLowerCase()) {
            case 'student': return 'student-dashboard'
            case 'admin': return 'dashboard'
            case 'security': return 'gates-dashboard'
            case 'lecturer': return 'live'
            default: return 'dashboard'
        }
    }

    const [activeTab, setActiveTab] = useState(getInitialTab())
    const [darkMode, setDarkMode] = useState(false) // Default to Light Mode
    const [stats, setStats] = useState<DashboardStats>({
        active_students: 0,
        gate_entries_today: 0,
        security_alerts: 0,
        vehicles_parked: 0
    })
    const [recentLogs, setRecentLogs] = useState<LogEntry[]>([])
    const [kpiData, setKpiData] = useState<any>({ normalized: [], labels: [] })
    const [analytics, setAnalytics] = useState<any>({ roles: [], gates: [] })
    const [cameraAlerts, setCameraAlerts] = useState<any[]>([])
    const [todaySessions, setTodaySessions] = useState<any[]>([])
    const [role, setRole] = useState<string>(localStorage.getItem('userRole') || 'student')
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [notifications, setNotifications] = useState<any[]>([])
    const [showNotifications, setShowNotifications] = useState(false)
    const [showUserMenu, setShowUserMenu] = useState(false)
    const [loading, setLoading] = useState(true)
    const [isSidebarOpen, setSidebarOpen] = useState(false)
    const [isSidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [openGroups, setOpenGroups] = useState<any>({
        overview: true,
        events: false,
        people: true,
        security: true,
        academics: false,
        settings: false,
        analytics: false,
        support: false,
        legal: false
    })
    const toggleGroup = (key: string) => setOpenGroups((prev: any) => ({ ...prev, [key]: !prev[key] }))
    const [showSecurityCheck, setShowSecurityCheck] = useState(false)
    const [menuConfig, setMenuConfig] = useState<any>({})
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [activating, setActivating] = useState(false)

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
                'dashboard': false,
                'student-dashboard': true,
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
                'live': true,
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
            const [sRes, kRes, lRes, aRes] = await Promise.all([
                fetch('/api/dashboard/stats', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/dashboard/kpi', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/dashboard/recent-logs', { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch('/api/dashboard/analytics', { headers: { 'Authorization': `Bearer ${token}` } })
            ])

            if (sRes.ok) setStats(await sRes.json())
            if (kRes.ok) setKpiData(await kRes.json())
            if (lRes.ok) setRecentLogs(await lRes.json())
            if (aRes.ok) setAnalytics(await aRes.json())
        } catch (e) { console.error('Dashboard fetch error', e) }
    }

    const handleActivateLive = async () => {
        setActivating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/attendance/sessions/activate-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const result = await res.json()

            if (result.status === 'success') {
                alert(`✅ Live System Activated!\n${result.message}`)
                fetchDashboardData()
            } else {
                alert(result.message || 'Activation failed')
            }
        } catch (e: any) {
            console.error('Activation error', e)
            alert(`❌ Activation Error: ${e.message}`)
        } finally {
            setActivating(false)
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
                        <SidebarGroup title="Overview" isOpen={openGroups.overview} onToggle={() => toggleGroup('overview')} isSidebarCollapsed={isSidebarCollapsed}>
                            {isMenuEnabled('dashboard') && (
                                <NavItem
                                    icon={<LayoutDashboard size={18} />}
                                    label="Dashboard"
                                    active={activeTab === 'dashboard'}
                                    onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                                />
                            )}
                        </SidebarGroup>

                        {/* Gate Operations - Core Functionality */}
                        {(isMenuEnabled('gate') || isMenuEnabled('vehicles')) && (
                            <SidebarGroup title="Gate Operations" isOpen={openGroups.security} onToggle={() => toggleGroup('security')} isSidebarCollapsed={isSidebarCollapsed}>
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
                            </SidebarGroup>
                        )}

                        {/* Security Monitor */}
                        {(isMenuEnabled('live') || isMenuEnabled('cameras')) && (
                            <SidebarGroup title="Security Monitor" isOpen={openGroups.security} onToggle={() => toggleGroup('security')} isSidebarCollapsed={isSidebarCollapsed}>
                                {isMenuEnabled('live') && (
                                    <NavItem
                                        icon={<MonitorPlay size={18} />}
                                        label="Live Monitor"
                                        active={activeTab === 'live'}
                                        onClick={() => { setActiveTab('live'); setSidebarOpen(false); }}
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
                            </SidebarGroup>
                        )}

                        {/* People Management */}
                        {(isMenuEnabled('users') || isMenuEnabled('verification')) && (
                            <SidebarGroup title="People" isOpen={openGroups.people} onToggle={() => toggleGroup('people')} isSidebarCollapsed={isSidebarCollapsed}>
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
                            </SidebarGroup>
                        )}

                        {/* Events Section */}
                        <SidebarGroup title="Events" isOpen={openGroups.events} onToggle={() => toggleGroup('events')} isSidebarCollapsed={isSidebarCollapsed}>
                            <NavItem
                                icon={<Calendar size={18} />}
                                label="Events & Guests"
                                active={activeTab === 'events'}
                                onClick={() => { setActiveTab('events'); setSidebarOpen(false); }}
                            />
                            <NavItem
                                icon={<CalendarDays size={18} />}
                                label="Campus Calendar"
                                active={activeTab === 'calendar'}
                                onClick={() => { setActiveTab('calendar'); setSidebarOpen(false); }}
                            />
                        </SidebarGroup>

                        {/* Academics */}
                        {(isMenuEnabled('timetable') || isMenuEnabled('attendance')) && (
                            <SidebarGroup title="Academics" isOpen={openGroups.academics} onToggle={() => toggleGroup('academics')} isSidebarCollapsed={isSidebarCollapsed}>
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
                            </SidebarGroup>
                        )}

                        {/* Analytics - Only for Admins */}
                        {(role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') && (
                            <SidebarGroup title="Analytics" isOpen={openGroups.analytics} onToggle={() => toggleGroup('analytics')} isSidebarCollapsed={isSidebarCollapsed}>
                                <NavItem
                                    icon={<BarChart3 size={18} />}
                                    label="System Reports"
                                    active={activeTab === 'reports'}
                                    onClick={() => { setActiveTab('reports'); setSidebarOpen(false); }}
                                />
                            </SidebarGroup>
                        )}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-[var(--border-color)]">
                    <nav className="space-y-1 mb-4">
                        {/* Settings removed from Sidebar for Admin as per request */}
                    </nav>
                </div>

                <div className="mt-auto p-4 border-t border-[var(--border-color)]">
                    <nav className="space-y-1 mb-4">
                        {/* Administration - Visible on Mobile for Admins since Top Bar is hidden */}
                        {(role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') && (
                            <SidebarGroup title="Administration" isOpen={openGroups.admin} onToggle={() => toggleGroup('admin')} isSidebarCollapsed={isSidebarCollapsed}>
                                <NavItem icon={<Settings size={18} />} label="General Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }} />
                                <NavItem icon={<Database size={18} />} label="Data Management" active={activeTab === 'bulk'} onClick={() => { setActiveTab('bulk'); setSidebarOpen(false); }} />
                                <NavItem icon={<Building2 size={18} />} label="Company Profile" active={activeTab === 'company-settings'} onClick={() => { setActiveTab('company-settings'); setSidebarOpen(false); }} />
                                <NavItem icon={<Brain size={18} />} label="AI Configuration" active={activeTab === 'ai-settings'} onClick={() => { setActiveTab('ai-settings'); setSidebarOpen(false); }} />
                                <NavItem icon={<Sliders size={18} />} label="Design System" active={activeTab === 'dashboard-designer'} onClick={() => { setActiveTab('dashboard-designer'); setSidebarOpen(false); }} />
                                <NavItem icon={<Server size={18} />} label="API Integrations" active={activeTab === 'integrations'} onClick={() => { setActiveTab('integrations'); setSidebarOpen(false); }} />
                            </SidebarGroup>
                        )}
                        <SidebarGroup title="Support" isOpen={openGroups.support} onToggle={() => toggleGroup('support')} isSidebarCollapsed={isSidebarCollapsed}>
                            <NavItem icon={<HelpCircle size={18} />} label="Help Center" active={false} onClick={() => { }} />
                        </SidebarGroup>
                    </nav>

                    {/* Legal Section */}
                    <div className="mb-2">
                        <SidebarGroup title="Privacy & Legal" isOpen={openGroups.legal} onToggle={() => toggleGroup('legal')} isSidebarCollapsed={isSidebarCollapsed}>
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
                        </SidebarGroup>
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
                <Suspense fallback={<PageLoader />}>
                    {/* Top Header - 2 Row Layout */}
                    <header className="flex flex-col gap-4 mb-6 pt-4 pb-2">
                        {/* Row 1: Primary Navigation */}
                        <div className="flex justify-between items-center w-full">
                            <div className="flex items-center gap-4 flex-1 min-w-0">
                                <button
                                    onClick={() => setSidebarOpen(true)}
                                    className="lg:hidden p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--primary-color)] active:scale-95 transition-transform"
                                >
                                    <Briefcase size={20} className="rotate-90" />
                                </button>

                                <h2 className="text-xl sm:text-2xl lg:text-3xl font-black capitalize tracking-tight truncate shrink-0">
                                    {activeTab.replace('-', ' ')}
                                </h2>

                                {/* Admin Top Bar - Row 1 Inline */}
                                {(role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') ? (
                                    <div className="hidden xl:flex items-center gap-1 ml-4 p-1 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800/30 overflow-x-auto max-w-[800px] scrollbar-hide">
                                        <div className="px-2 text-[10px] font-black text-green-600 uppercase tracking-widest flex-shrink-0">Admin</div>
                                        {[
                                            { id: 'settings', label: 'General', icon: Settings },
                                            { id: 'bulk', label: 'Data', icon: Database },
                                            { id: 'company-settings', label: 'Company', icon: Building2 },
                                            { id: 'ai-settings', label: 'AI', icon: Brain },
                                            { id: 'dashboard-designer', label: 'Design', icon: Sliders },
                                            { id: 'integrations', label: 'APIs', icon: Server },
                                            { id: 'calendar', label: 'Calendar', icon: Calendar }
                                        ].map(item => (
                                            <button
                                                key={item.id}
                                                onClick={() => setActiveTab(item.id)}
                                                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all whitespace-nowrap ${activeTab === item.id
                                                    ? 'bg-green-600 text-white shadow-sm'
                                                    : 'text-green-700 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/40'
                                                    }`}
                                            >
                                                <item.icon size={14} />
                                                {item.label}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    /* Terms for Non-Admin */
                                    <div className="hidden lg:flex items-center gap-2 ml-4 pl-4 border-l border-[var(--border-color)]">
                                        <button
                                            onClick={() => setActiveTab('privacy')}
                                            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)] hover:text-[var(--primary-color)] hover:bg-[var(--bg-primary)] rounded-lg transition-colors"
                                        >
                                            Terms & Conditions
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Right: Notifications & Profile */}
                            <div className="flex items-center gap-3 relative shrink-0">
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
                                    {showNotifications && (
                                        <div className="absolute right-0 mt-2 w-80 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 max-h-96 overflow-y-auto">
                                            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                                                <h3 className="font-bold text-[var(--text-primary)]">Notifications</h3>
                                                <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded-full font-bold">{notifications.length}</span>
                                            </div>
                                            <div className="divide-y divide-[var(--border-color)]">
                                                {notifications.length === 0 ? (
                                                    <div className="p-8 text-center text-[var(--text-secondary)]"><Bell size={32} className="mx-auto mb-2 opacity-20" /><p className="text-sm">No new notifications</p></div>
                                                ) : (
                                                    notifications.map((notif: any, i: number) => (
                                                        <div key={i} className="p-4 hover:bg-[var(--bg-primary)] cursor-pointer transition-colors">
                                                            <div className="flex items-start gap-3">
                                                                <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                                                <div className="flex-1">
                                                                    <p className="text-sm font-medium text-[var(--text-primary)]">{notif.title}</p>
                                                                    <p className="text-xs text-[var(--text-secondary)] mt-1">{notif.message}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Profile Dropdown */}
                                <div className="relative">
                                    <button
                                        onClick={() => setShowUserMenu(!showUserMenu)}
                                        className="flex items-center gap-3 pl-4 border-l border-[var(--border-color)] group"
                                    >
                                        <div className="hidden lg:block text-right">
                                            <div className="text-sm font-bold text-[var(--text-primary)]">{currentUser?.full_name || 'User'}</div>
                                            <div className="text-xs text-[var(--text-secondary)]">{currentUser?.role || 'Role'}</div>
                                        </div>
                                        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shadow-lg group-hover:scale-105 transition-transform">
                                            <User size={20} />
                                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white flex items-center justify-center text-[8px] font-bold ${currentUser?.status === 'active' ? 'bg-green-500' : 'bg-red-500'
                                                }`}></div>
                                        </div>
                                    </button>

                                    {showUserMenu && (
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                            <div className="p-2 space-y-1">
                                                <button
                                                    onClick={() => { setShowProfileModal(true); setShowUserMenu(false); }}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-primary)] text-sm font-medium flex items-center gap-2"
                                                >
                                                    <User size={16} /> My Profile
                                                </button>
                                                <button
                                                    onClick={() => { setActiveTab('settings'); setShowUserMenu(false); }}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--bg-primary)] text-sm font-medium flex items-center gap-2"
                                                >
                                                    <Settings size={16} /> Settings
                                                </button>
                                                <div className="h-px bg-[var(--border-color)] my-1"></div>
                                                <button
                                                    onClick={handleLogout}
                                                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-red-50 text-red-600 text-sm font-bold flex items-center gap-2"
                                                >
                                                    <LogOut size={16} /> Logout
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Row 2: Context Menu (Secondary Navigation) */}
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
                                    <div className="w-full overflow-x-auto pb-1 animate-in slide-in-from-left-4">
                                        <div className="flex items-center gap-2 p-1">
                                            {currentGroup.map(item => (
                                                isMenuEnabled(item.id) && (
                                                    <button
                                                        key={item.id}
                                                        onClick={() => setActiveTab(item.id)}
                                                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${activeTab === item.id
                                                            ? 'bg-[var(--bg-primary)] shadow-sm text-[var(--text-primary)] ring-1 ring-[var(--border-color)]'
                                                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-primary)]/50'
                                                            }`}
                                                    >
                                                        {item.label}
                                                    </button>
                                                )
                                            ))}
                                        </div>
                                    </div>
                                )
                            }
                        })()}
                    </header>

                    {activeTab === 'dashboard' && role === 'Guardian' && <GuardianDashboard />}
                    {activeTab === 'dashboard' && role === 'Security' && <SecurityDashboard onNavigate={setActiveTab} />}
                    {activeTab === 'visitors' && <VisitorManagement />}
                    {activeTab === 'calendar' && <CampusCalendar />}
                    {activeTab === 'dashboard' && role !== 'Guardian' && role !== 'Security' && (
                        <div className="animate-fade-in">
                            {/* Stats Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                                <StatCard title="Total Students" value={stats.active_students} change="+6%" trend="up" />
                                <StatCard title="New Entries" value={stats.gate_entries_today} change="+12%" trend="up" />
                                <StatCard title="Security Alerts" value={stats.security_alerts} change="-2%" trend="down" />
                                <StatCard title="Vehicles Parked" value={stats.vehicles_parked} change="+4%" trend="up" />
                            </div>

                            {/* Live Activation Banner for Admins */}
                            {(role === 'SuperAdmin' || role === 'Admin') && (
                                <div className="mb-6 p-6 bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl text-white shadow-xl relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                                        <Activity size={120} />
                                    </div>
                                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                                        <div>
                                            <h3 className="text-2xl font-black mb-1 flex items-center gap-2">
                                                <Activity className="animate-pulse" />
                                                Live System Control
                                            </h3>
                                            <p className="text-indigo-100 text-sm max-w-md">
                                                Activate real-time monitoring for all classrooms and gates. This will populate the dashboard with live database updates.
                                            </p>
                                        </div>
                                        <button
                                            onClick={handleActivateLive}
                                            disabled={activating}
                                            className="px-8 py-4 bg-white text-indigo-700 rounded-xl font-black shadow-2xl hover:bg-indigo-50 hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed group"
                                        >
                                            {activating ? (
                                                <>
                                                    <div className="w-5 h-5 border-4 border-indigo-700/30 border-t-indigo-700 rounded-full animate-spin"></div>
                                                    Activating...
                                                </>
                                            ) : (
                                                <>
                                                    <Play size={22} className="fill-current" />
                                                    ENABLE LIVE TRACKING
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
                                {/* Main Graph Area */}
                                <div className="lg:col-span-2 glass-card p-4">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-semibold text-base">Weekly Traffic</h3>
                                        <select className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg px-3 py-1 text-sm outline-none">
                                            <option>Last 7 Days</option>
                                        </select>
                                    </div>
                                    {/* Real Graph Bars (Recharts) */}
                                    <div className="h-[280px]">
                                        {kpiData.details ? (
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={kpiData.labels.map((l: any, i: any) => ({
                                                    name: l,
                                                    people: kpiData.details.people[i],
                                                    vehicles: kpiData.details.vehicles[i]
                                                }))}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-color)" />
                                                    <XAxis dataKey="name" tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <YAxis tick={{ fill: 'var(--text-secondary)', fontSize: 11 }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip
                                                        contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                                                        labelStyle={{ fontWeight: 'bold', color: 'var(--text-primary)' }}
                                                        cursor={{ fill: 'var(--bg-primary)' }}
                                                    />
                                                    <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }} />
                                                    <Bar dataKey="people" name="People" fill="#6366f1" radius={[4, 4, 0, 0]} />
                                                    <Bar dataKey="vehicles" name="Vehicles" fill="#a855f7" radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-[var(--text-secondary)]">Loading...</div>
                                        )}
                                    </div>
                                </div>

                                {/* Analytics Row (New) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 border-t border-[var(--border-color)] pt-6">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 p-4 rounded-xl border border-green-200 dark:border-green-800">
                                        <div className="flex items-center justify-between mb-3">
                                            <h4 className="font-bold text-xs uppercase tracking-wider text-green-800 dark:text-green-400">Gate Traffic (Live)</h4>
                                            <div className="flex items-center gap-2 text-[10px]">
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-green-500 rounded"></div>
                                                    <span className="font-semibold text-gray-600 dark:text-gray-400">In</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <div className="w-2 h-2 bg-red-500 rounded"></div>
                                                    <span className="font-semibold text-gray-600 dark:text-gray-400">Out</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="h-[200px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={analytics.gates} layout="vertical" margin={{ left: 5, right: 10, top: 0, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                                                    <XAxis type="number" tick={{ fontSize: 9, fill: 'var(--text-secondary)', fontWeight: 600 }} axisLine={false} tickLine={false} />
                                                    <YAxis dataKey="name" type="category" width={60} tick={{ fontSize: 10, fill: 'var(--text-primary)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                                                    <RechartsTooltip
                                                        cursor={{ fill: 'rgba(34, 197, 94, 0.1)' }}
                                                        contentStyle={{
                                                            borderRadius: '8px',
                                                            fontSize: '11px',
                                                            fontWeight: 600,
                                                            backgroundColor: 'var(--bg-card)',
                                                            border: '1px solid var(--border-color)'
                                                        }}
                                                        formatter={(value: any, name: any) => [
                                                            `${value}`,
                                                            name === 'checkins' ? 'In' : 'Out'
                                                        ]}
                                                    />
                                                    <Bar dataKey="checkins" name="In" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={12} />
                                                    <Bar dataKey="checkouts" name="Out" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        {/* Live Summary Stats */}
                                        <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-green-200 dark:border-green-800">
                                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg">
                                                <div className="text-lg font-black text-green-600">
                                                    {analytics.gates.reduce((sum: number, gate: any) => sum + (gate.checkins || 0), 0)}
                                                </div>
                                                <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mt-0.5">Check-Ins</div>
                                            </div>
                                            <div className="text-center p-2 bg-white dark:bg-gray-800 rounded-lg">
                                                <div className="text-lg font-black text-red-600">
                                                    {analytics.gates.reduce((sum: number, gate: any) => sum + (gate.checkouts || 0), 0)}
                                                </div>
                                                <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mt-0.5">Check-Outs</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="bg-[var(--bg-primary)] p-4 rounded-xl">
                                        <h4 className="font-semibold mb-3 text-xs uppercase tracking-wider text-[var(--text-secondary)]">User Roles</h4>
                                        <div className="h-[160px]">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                                                    <Pie data={analytics.roles} dataKey="value" nameKey="name" cx="45%" cy="50%" innerRadius={28} outerRadius={48} fill="#8884d8" paddingAngle={5}>
                                                        {analytics.roles.map((_: any, index: number) => (
                                                            <Cell key={`cell-${index}`} fill={['#6366f1', '#a855f7', '#ec4899', '#f59e0b'][index % 4]} />
                                                        ))}
                                                    </Pie>
                                                    <RechartsTooltip contentStyle={{ borderRadius: '8px', fontSize: '11px' }} />
                                                    <Legend iconSize={6} wrapperStyle={{ fontSize: '9px' }} layout="vertical" align="right" verticalAlign="middle" />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                                <div className="hidden">

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
                    {activeTab === 'reports' && <Reports />}
                    {activeTab === 'verification' && <StudentVerification />}
                    {activeTab === 'privacy' && <PrivacyPolicy />}
                    {activeTab === 'cookies' && <CookiePolicy />}
                    {activeTab === 'rights' && <UserDataRights />}
                    {activeTab === 'scan-logs' && <ScanLogs />}
                    {activeTab === 'gates-dashboard' && <GatesDashboard />}
                    {activeTab === 'student-dashboard' && <StudentDashboard />}
                    <footer className="mt-10 pt-6 border-t border-[var(--border-color)] text-center text-sm text-[var(--text-secondary)]">
                        <p>&copy; {new Date().getFullYear()} Smart Campus System.</p>
                    </footer>
                </Suspense>
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

function SidebarGroup({ title, children, isOpen, onToggle, isSidebarCollapsed }: any) {
    if (isSidebarCollapsed) {
        return <div className="py-2 border-b border-[var(--border-color)] last:border-0">{children}</div>
    }
    return (
        <div className="mb-1">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-2 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider hover:text-[var(--text-primary)] transition-colors group"
            >
                {title}
                <ChevronRight size={14} className={`transition-transform duration-200 text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] ${isOpen ? 'rotate-90' : ''}`} />
            </button>
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'}`}>
                {children}
            </div>
        </div>
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
