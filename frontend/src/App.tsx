import { useState, useEffect, lazy, Suspense } from 'react'
import {
    LayoutDashboard, Users, Shield, ClipboardList, Car, Moon, Sun, LogOut,
    Bell, Settings, HelpCircle, Briefcase, ChevronRight, ChevronLeft, QrCode, Megaphone, Trash2, Plus,
    Server, Database, ShieldCheck, Calendar, CalendarDays, Video, Wifi, AlertTriangle, MapPin, Scale, FileText, MonitorPlay, Sliders, Brain, Building2, Building, User, X, Activity, BarChart3, Play, History, Printer, Download, Inbox
} from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts'
import { useNotification } from './components/Notification'


// 1. Critical Components (Load immediately for FCP)
import Login from './Login'
import LandingPage from './LandingPage'
import StaffDashboard from './StaffDashboard'
import GuestDashboard from './GuestDashboard'
import ManagementDashboard from './ManagementDashboard'
import StoresDashboard from './StoresDashboard'

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
const AllScansDownload = lazy(() => import('./AllScansDownload'))
const EventManagement = lazy(() => import('./EventManagement'))
const SecurityDashboard = lazy(() => import('./SecurityDashboard'))
const VisitorManagement = lazy(() => import('./VisitorManagement'))
const ScanLogs = lazy(() => import('./ScanLogs'))
const GatesDashboard = lazy(() => import('./GatesDashboard'))
const StudentDashboard = lazy(() => import('./StudentDashboard'))
const SelfServiceEntry = lazy(() => import('./SelfServiceEntry'))
const Reports = lazy(() => import('./Reports'))
const CampusCalendar = lazy(() => import('./CampusCalendar'))
const FleetManagement = lazy(() => import('./FleetManagement'))
const AuditLogs = lazy(() => import('./AuditLogs'))
const IDPrinting = lazy(() => import('./IDPrinting'))
const Geofencing = lazy(() => import('./Geofencing'))
const AdminDashboard = lazy(() => import('./AdminDashboard'))
const LecturerDashboard = lazy(() => import('./LecturerDashboard'))
const DriverDashboard = lazy(() => import('./DriverDashboard'))
const QRRegistry = lazy(() => import('./QRRegistry'))
const NoticeBoard = lazy(() => import('./NoticeBoard'))
const AssetManagement = lazy(() => import('./AssetManagement'))
const IncidentReporting = lazy(() => import('./IncidentReporting'))
const LostAndFound = lazy(() => import('./LostAndFound'))

// 3. Non-lazy components (small/critical)
import InstallPWA, { InstallPWATrigger } from './components/InstallPWA'
import PermissionsModal from './components/PermissionsModal'

const SIDEBAR_GROUPS = [
    {
        id: 'overview',
        label: 'Overview',
        items: [
            { id: 'dashboard', label: 'Dashboard' }
        ]
    },
    {
        id: 'gate_ops',
        label: 'Gate & Security Ops',
        items: [
            { id: 'gate', label: 'Gate Control', permissionKey: 'gate' },
            { id: 'visitors', label: 'Visitor Logs', permissionKey: 'gate' },
            { id: 'vehicles', label: 'Vehicle Intel', permissionKey: 'vehicles' },
            { id: 'scan-logs', label: 'Scan Logs', permissionKey: 'scan-logs' },
            { id: 'gates-dashboard', label: 'Gates Analytics', permissionKey: 'gates-dashboard' },
            { id: 'live', label: 'Live Monitor', permissionKey: 'live' },
            { id: 'cameras', label: 'Surveillance', permissionKey: 'cameras' },
            { id: 'incidents', label: 'Incident Reports', permissionKey: 'incidents' },
            { id: 'lost-found', label: 'Lost & Found', permissionKey: 'lost-found' }
        ]
    },
    {
        id: 'people',
        label: 'People',
        items: [
            { id: 'users', label: 'Students / Staff', permissionKey: 'users' },
            { id: 'verification', label: 'ID Verification', permissionKey: 'verification' },
            { id: 'id-printing', label: 'ID Printing', permissionKey: 'id-printing' },
            { id: 'qr-registry', label: 'QR Asset Hub', permissionKey: 'qr-registry' }
        ]
    },
    {
        id: 'events',
        label: 'Events',
        items: [
            { id: 'events', label: 'Events & Guests' },
            { id: 'calendar', label: 'Campus Calendar' }
        ]
    },
    {
        id: 'academics',
        label: 'Academics',
        items: [
            { id: 'attendance', label: 'Class Attendance', permissionKey: 'attendance' },
            { id: 'timetable', label: 'Timetable', permissionKey: 'timetable' },
            { id: 'courses', label: 'Courses', permissionKey: 'timetable' },
            { id: 'classrooms', label: 'Classrooms', permissionKey: 'timetable' },
            { id: 'all-attendance', label: 'All Attendance', permissionKey: 'all-attendance' }
        ]
    },
    {
        id: 'fleet',
        label: 'Fleet Management',
        items: [
            { id: 'fleet', label: 'Fleet Dashboard', permissionKey: 'fleet' },
            { id: 'fleet-tracking', label: 'Live Tracking', permissionKey: 'fleet-tracking' },
            { id: 'fleet-trips', label: 'Trips & Manifests', permissionKey: 'fleet-trips' }
        ]
    },
    {
        id: 'assets',
        label: 'Asset Management',
        items: [
            { id: 'assets', label: 'Campus Assets', permissionKey: 'assets' },
            { id: 'asset-handovers', label: 'Asset Handovers', permissionKey: 'asset-handovers' },
            { id: 'asset-reports', label: 'Asset Reports', permissionKey: 'asset-reports' }
        ]
    },
    {
        id: 'admin',
        label: 'Administration',
        items: [
            { id: 'settings', label: 'General Settings', permissionKey: 'settings' },
            { id: 'bulk', label: 'Data Management', permissionKey: 'bulk' },
            { id: 'company-settings', label: 'Company Profile', permissionKey: 'company-settings' },
            { id: 'ai-settings', label: 'AI Configuration', permissionKey: 'ai-settings' },
            { id: 'dashboard-designer', label: 'Design System', permissionKey: 'dashboard-designer' },
            { id: 'integrations', label: 'API Integrations', permissionKey: 'integrations' },
            { id: 'audit', label: 'Audit Trail', permissionKey: 'audit' },
            { id: 'geofencing', label: 'IP Geofencing', permissionKey: 'geofencing' }
        ]
    },
    {
        id: 'legal',
        label: 'Privacy & Legal',
        items: [
            { id: 'privacy', label: 'Privacy Policy' },
            { id: 'rights', label: 'Data Rights' },
            { id: 'cookies', label: 'Cookie Policy' }
        ]
    }
]

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
    students_in_school: number
}

interface LogEntry {
    user: string
    time: string
    status: string
    isAlert: boolean
}
function App() {
    const { showNotification } = useNotification()
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
        return 'dashboard'
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
    const [companySettings, setCompanySettings] = useState<{company_name: string, logo_url: string}>({
        company_name: 'Smart Campus',
        logo_url: ''
    })
    const [openGroups, setOpenGroups] = useState<any>({
        overview: true,
        events: false,
        people: false,
        gate_ops: false,
        security_monitor: false,
        security_ops: false,
        academics: false,
        settings: false,
        analytics: false,
        support: false,
        legal: false,
        fleet: false,
        admin: false,
        assets: false
    })
    const toggleGroup = (key: string) => {
        setOpenGroups((prev: any) => {
            // If the clicked group is already open, just close it
            if (prev[key]) {
                return { ...prev, [key]: false };
            }
            // Close all others and open the clicked one
            const nextState: any = {};
            Object.keys(prev).forEach(groupKey => {
                nextState[groupKey] = groupKey === key;
            });
            return nextState;
        });
    }
    const [showSecurityCheck, setShowSecurityCheck] = useState(false)
    const [menuConfig, setMenuConfig] = useState<any>({})
    const [showProfileModal, setShowProfileModal] = useState(false)
    const [syncingAD, setSyncingAD] = useState(false)
    const [showQuickScanModal, setShowQuickScanModal] = useState(false)
    const hasValidated = useState(false)[0] // Simple mount check

    // URL Deep Link Handler (QR Codes)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const room = params.get('room')
        const course = params.get('course')
        if ((room || course) && isAuthenticated) {
            // Store scanned values for Attendance component
            if (room) localStorage.setItem('scannedRoom', room)
            if (course) localStorage.setItem('scannedCourse', course)
            setActiveTab('attendance')
            // Clean URL
            window.history.replaceState({}, '', window.location.pathname)
        }
    }, [isAuthenticated])

    // Persistent Login: Validate Session on Load
    useEffect(() => {
        let isMounted = true;
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
                } else if (res.ok && isMounted) {
                    const user = await res.json()
                    setCurrentUser(user)
                    setRole(user.role)
                    localStorage.setItem('currentUser', JSON.stringify(user))
                }
            } catch (e) {
                console.error("Session check error", e)
            }
        }
        validateSession()
        return () => { isMounted = false }
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

    const [companyColors, setCompanyColors] = useState<any>({
        primary_color: '#2563eb',
        secondary_color: '#0284c7',
        accent_color: '#10b981'
    })

    // Apply company colors whenever colors or darkMode changes
    useEffect(() => {
        const root = document.documentElement;
        let primary = companyColors.primary_color || '#2563eb';
        let secondary = companyColors.secondary_color || '#0284c7';
        let accent = companyColors.accent_color || '#10b981';

        // High contrast lightener for dark mode
        if (darkMode) {
            const lighten = (hex: string, amount: number) => {
                try {
                    let color = hex.replace('#', '');
                    let num = parseInt(color, 16);
                    let r = (num >> 16) + amount;
                    let g = ((num >> 8) & 0x00FF) + amount;
                    let b = (num & 0x0000FF) + amount;
                    r = Math.min(255, Math.max(0, r));
                    g = Math.min(255, Math.max(0, g));
                    b = Math.min(255, Math.max(0, b));
                    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
                } catch (e) {
                    return hex;
                }
            };
            primary = lighten(primary, 40);
            secondary = lighten(secondary, 40);
            accent = lighten(accent, 40);
        }

        root.style.setProperty('--primary-color', primary);
        root.style.setProperty('--secondary-color', secondary);
        root.style.setProperty('--accent-color', accent);
        root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${primary} 0%, ${secondary} 100%)`);
    }, [companyColors, darkMode])

    // Fetch company settings (logo, name) for sidebar and all pages
    useEffect(() => {
        const fetchCompanySettings = async () => {
            try {
                const res = await fetch('/api/users/public-company-settings')
                if (res.ok) {
                    const data = await res.json()
                    setCompanySettings({
                        company_name: data.company_name || 'Smart Campus',
                        logo_url: data.logo_url || ''
                    })
                    setCompanyColors({
                        primary_color: data.primary_color || '#2563eb',
                        secondary_color: data.secondary_color || '#0284c7',
                        accent_color: data.accent_color || '#10b981'
                    })
                }
            } catch (e) {
                console.error('Failed to fetch company settings:', e)
            }
        }
        fetchCompanySettings()
    }, [isAuthenticated])

    // Fetch public config (demo mode, server IP or domain)
    useEffect(() => {
        const fetchPublicConfig = async () => {
            try {
                const res = await fetch('/api/public/config')
                if (res.ok) {
                    const data = await res.json()
                    if (data.server_ip_or_domain) {
                        localStorage.setItem('server_ip_or_domain', data.server_ip_or_domain)
                    }
                }
            } catch (e) {
                console.error('Failed to fetch public config:', e)
            }
        }
        fetchPublicConfig()
    }, [])

    const [hasUnreadNotices, setHasUnreadNotices] = useState(false)

    // Fetch notice board announcements to check for unread admin notices
    useEffect(() => {
        const fetchNoticeAnnouncements = async () => {
            if (!isAuthenticated) return
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/notice-board', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    if (data && data.length > 0) {
                        const latestNoticeId = data[0].id
                        const lastReadNoticeId = localStorage.getItem('lastReadNoticeId')
                        if (latestNoticeId !== lastReadNoticeId) {
                            setHasUnreadNotices(true)
                        } else {
                            setHasUnreadNotices(false)
                        }
                    } else {
                        setHasUnreadNotices(false)
                    }
                }
            } catch (e) {
                console.error('Failed to fetch notice board announcements:', e)
            }
        }
        fetchNoticeAnnouncements()
        const interval = setInterval(fetchNoticeAnnouncements, 30000)
        return () => clearInterval(interval)
    }, [isAuthenticated])

    // Automatically clear unread badge when user navigates to notice board
    useEffect(() => {
        if (activeTab === 'notice-board' && hasUnreadNotices) {
            const fetchAndMarkRead = async () => {
                try {
                    const token = localStorage.getItem('token')
                    const res = await fetch('/api/notice-board', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        if (data && data.length > 0) {
                            localStorage.setItem('lastReadNoticeId', data[0].id)
                        }
                    }
                    setHasUnreadNotices(false)
                } catch (e) {}
            }
            fetchAndMarkRead()
        }
    }, [activeTab, hasUnreadNotices])

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
                'integrations': false,
                'notice-board': true
            },
            'Staff': {
                'dashboard': true,
                'student-dashboard': false,
                'users': false,
                'verification': false,
                'attendance': true,
                'live': false,
                'gate': false,
                'vehicles': false,
                'timetable': true,
                'cameras': false,
                'settings': true,
                'notice-board': true,
                'assets': true
            },
            'Guest': {
                'dashboard': true,
                'student-dashboard': false,
                'users': false,
                'verification': false,
                'attendance': false,
                'live': false,
                'gate': false,
                'vehicles': false,
                'timetable': false,
                'cameras': false,
                'settings': true,
                'notice-board': true
            },
            'Management': {
                'dashboard': true,
                'users': true,
                'verification': true,
                'attendance': true,
                'live': true,
                'gate': true,
                'vehicles': true,
                'timetable': true,
                'cameras': true,
                'settings': true,
                'notice-board': true,
                'fleet': true,
                'fleet-tracking': true,
                'fleet-trips': true,
                'incidents': true,
                'lost-found': true,
                'reports': true,
                'gates-dashboard': true
            },
            'Stores': {
                'dashboard': true,
                'users': false,
                'verification': false,
                'attendance': false,
                'live': false,
                'gate': false,
                'vehicles': false,
                'timetable': false,
                'cameras': false,
                'settings': true,
                'notice-board': true,
                'assets': true,
                'asset-handovers': true,
                'asset-reports': true
            },
            'Security Lead': {
                'dashboard': true,
                'users': false,
                'verification': true,
                'attendance': false,
                'live': true,
                'gate': true,
                'vehicles': true,
                'timetable': false,
                'cameras': true,
                'settings': true,
                'notice-board': true,
                'fleet': true,
                'fleet-tracking': true,
                'fleet-trips': true,
                'incidents': true,
                'lost-found': true
            },
            'Guard': {
                'dashboard': true,
                'users': false,
                'verification': true,
                'attendance': false,
                'live': true,
                'gate': true,
                'vehicles': true,
                'timetable': false,
                'cameras': true,
                'settings': true,
                'notice-board': true,
                'fleet': true,
                'fleet-tracking': true,
                'fleet-trips': true,
                'incidents': true,
                'lost-found': true
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
                'courses': true,
                'classrooms': true,
                'all-attendance': true,
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
            'Driver': {
                'dashboard': true,
                'users': false,
                'verification': false,
                'attendance': false,
                'live': false,
                'gate': false,
                'vehicles': true,
                'timetable': false,
                'cameras': false,
                'settings': true,
                'notice-board': true,
                'fleet': true,
                'fleet-tracking': false,
                'fleet-trips': true
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
                'integrations': false,
                'incidents': true,
                'lost-found': true
            },
            'Admin': {
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
                'integrations': true,
                'fleet': true,
                'geofencing': true,
                'assets': true,
                'asset-handovers': true,
                'asset-reports': true,
                'incidents': true,
                'lost-found': true
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
                'integrations': true,
                'fleet': true,
                'geofencing': true,
                'assets': true,
                'asset-handovers': true,
                'asset-reports': true,
                'incidents': true,
                'lost-found': true
            }
        }
    }

    // Helper to check if menu is enabled for current role
    const isMenuEnabled = (menuId: string) => {
        // Admins and SuperAdmins see everything
        if (role?.toLowerCase() === 'superadmin' || role?.toLowerCase() === 'admin') return true

        // Get config for current role (use saved config or defaults)
        const defaults: any = getDefaultConfig()
        const matchedKey = Object.keys(defaults).find(k => k.toLowerCase() === role?.toLowerCase())
        const roleConfig = (matchedKey ? defaults[matchedKey] : null) || menuConfig[role] || {}

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
            // Poll every 15 seconds for live 'System Activity' updates
            interval = setInterval(fetchDashboardData, 15000)
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

    const handleSyncAD = async () => {
        setSyncingAD(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/sync-ad', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (!res.ok) throw new Error(`HTTP ${res.status}`)
            const result = await res.json()

            if (result.status === 'success') {
                alert(`✅ AD Synchronization Complete!\n${result.message}\nNew accounts created: ${result.new_accounts_count}`)
                fetchDashboardData()
            } else {
                alert(result.message || 'Synchronization failed')
            }
        } catch (e: any) {
            console.error('Sync error', e)
            alert(`❌ Sync Error: ${e.message}`)
        } finally {
            setSyncingAD(false)
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
        localStorage.removeItem('userRole')
        localStorage.removeItem('activeTab')
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

    const renderSidebarItems = () => {
        if (role?.toLowerCase() === 'student') {
            return (
                <>
                    <SidebarGroup title="Overview" isOpen={openGroups.overview} onToggle={() => toggleGroup('overview')} isSidebarCollapsed={isSidebarCollapsed}>
                        <NavItem
                            icon={<LayoutDashboard size={18} />}
                            label="Dashboard"
                            active={activeTab === 'dashboard' || activeTab === 'student-dashboard'}
                            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                        />
                        <NavItem
                            icon={
                                <div className="relative">
                                    <Megaphone size={18} className={hasUnreadNotices ? "text-red-500 animate-bounce" : ""} />
                                    {hasUnreadNotices && (
                                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>
                            }
                            label="Notice Board"
                            active={activeTab === 'notice-board'}
                            onClick={() => { setActiveTab('notice-board'); setSidebarOpen(false); }}
                            badge={hasUnreadNotices ? (
                                <span className="px-2 py-0.5 text-[9px] bg-red-500 text-white rounded-full font-black animate-pulse shadow-sm">
                                    NEW
                                </span>
                            ) : null}
                        />
                    </SidebarGroup>

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

                    <SidebarGroup title="Academics" isOpen={openGroups.academics} onToggle={() => toggleGroup('academics')} isSidebarCollapsed={isSidebarCollapsed}>
                        <NavItem
                            icon={<Calendar size={18} />}
                            label="Timetable"
                            active={activeTab === 'timetable'}
                            onClick={() => { setActiveTab('timetable'); setSidebarOpen(false); }}
                        />
                        <NavItem
                            icon={<Building size={18} />}
                            label="Classrooms"
                            active={activeTab === 'classrooms'}
                            onClick={() => { setActiveTab('classrooms'); setSidebarOpen(false); }}
                        />
                    </SidebarGroup>
                </>
            )
        }

        return (
            <>
                <SidebarGroup title="Overview" isOpen={openGroups.overview} onToggle={() => toggleGroup('overview')} isSidebarCollapsed={isSidebarCollapsed}>
                    {(isMenuEnabled('dashboard') || isMenuEnabled('student-dashboard')) && (
                        <NavItem
                            icon={<LayoutDashboard size={18} />}
                            label="Dashboard"
                            active={activeTab === 'dashboard'}
                            onClick={() => { setActiveTab('dashboard'); setSidebarOpen(false); }}
                        />
                    )}
                    {isMenuEnabled('notice-board') && (
                        <NavItem
                            icon={
                                <div className="relative">
                                    <Megaphone size={18} className={hasUnreadNotices ? "text-red-500 animate-bounce" : ""} />
                                    {hasUnreadNotices && (
                                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                    )}
                                </div>
                            }
                            label="Notice Board"
                            active={activeTab === 'notice-board'}
                            onClick={() => { setActiveTab('notice-board'); setSidebarOpen(false); }}
                            badge={hasUnreadNotices ? (
                                <span className="px-2 py-0.5 text-[9px] bg-red-500 text-white rounded-full font-black animate-pulse shadow-sm">
                                    NEW
                                </span>
                            ) : null}
                        />
                    )}
                </SidebarGroup>

                {/* Gate & Security Operations - Core Functionality */}
                {(isMenuEnabled('gate') || isMenuEnabled('vehicles') || isMenuEnabled('live') || isMenuEnabled('cameras') || isMenuEnabled('incidents') || isMenuEnabled('lost-found')) && (
                    <SidebarGroup title="Gate & Security Ops" isOpen={true} onToggle={() => {}} isSidebarCollapsed={isSidebarCollapsed}>
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
                        {isMenuEnabled('scan-logs') && (
                            <NavItem
                                icon={<ClipboardList size={18} />}
                                label="Scan Logs"
                                active={activeTab === 'scan-logs'}
                                onClick={() => { setActiveTab('scan-logs'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('gates-dashboard') && (
                            <NavItem
                                icon={<Activity size={18} />}
                                label="Gates Analytics"
                                active={activeTab === 'gates-dashboard'}
                                onClick={() => { setActiveTab('gates-dashboard'); setSidebarOpen(false); }}
                            />
                        )}
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
                        {isMenuEnabled('incidents') && (
                            <NavItem
                                icon={<AlertTriangle size={18} />}
                                label="Incident Reports"
                                active={activeTab === 'incidents'}
                                onClick={() => { setActiveTab('incidents'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('lost-found') && (
                            <NavItem
                                icon={<Inbox size={18} />}
                                label="Lost & Found"
                                active={activeTab === 'lost-found'}
                                onClick={() => { setActiveTab('lost-found'); setSidebarOpen(false); }}
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
                        {(isMenuEnabled('id-printing') || isMenuEnabled('qr-registry')) && (
                            <>
                                {isMenuEnabled('id-printing') && (
                                    <NavItem
                                        icon={<Printer size={18} />}
                                        label="ID Printing"
                                        active={activeTab === 'id-printing'}
                                        onClick={() => { setActiveTab('id-printing'); setSidebarOpen(false); }}
                                    />
                                )}
                                {isMenuEnabled('qr-registry') && (
                                    <NavItem
                                        icon={<QrCode size={18} />}
                                        label="QR Asset Hub"
                                        active={activeTab === 'qr-registry'}
                                        onClick={() => { setActiveTab('qr-registry'); setSidebarOpen(false); }}
                                    />
                                )}
                            </>
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
                {(isMenuEnabled('timetable') || isMenuEnabled('attendance') || isMenuEnabled('all-attendance')) && (
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
                        {isMenuEnabled('all-attendance') && (
                            <NavItem
                                icon={<Download size={18} />}
                                label="All Attendance"
                                active={activeTab === 'all-attendance'}
                                onClick={() => { setActiveTab('all-attendance'); setSidebarOpen(false); }}
                            />
                        )}
                    </SidebarGroup>
                )}

                {/* Fleet Management */}
                {(isMenuEnabled('fleet') || isMenuEnabled('fleet-tracking') || isMenuEnabled('fleet-trips')) && (
                    <SidebarGroup title="Fleet Management" isOpen={openGroups.fleet} onToggle={() => toggleGroup('fleet')} isSidebarCollapsed={isSidebarCollapsed}>
                        {isMenuEnabled('fleet') && (
                            <NavItem
                                icon={<Car size={18} />}
                                label="Fleet Dashboard"
                                active={activeTab === 'fleet'}
                                onClick={() => { setActiveTab('fleet'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('fleet-tracking') && (
                            <NavItem
                                icon={<MapPin size={18} />}
                                label="Live Tracking"
                                active={activeTab === 'fleet-tracking'}
                                onClick={() => { setActiveTab('fleet-tracking'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('fleet-trips') && (
                            <NavItem
                                icon={<Briefcase size={18} />}
                                label="Trips & Manifests"
                                active={activeTab === 'fleet-trips'}
                                onClick={() => { setActiveTab('fleet-trips'); setSidebarOpen(false); }}
                            />
                        )}
                    </SidebarGroup>
                )}

                {/* Asset Tracking & Management */}
                {(isMenuEnabled('assets') || isMenuEnabled('asset-handovers') || isMenuEnabled('asset-reports')) && (
                    <SidebarGroup title="Asset Management" isOpen={openGroups.assets} onToggle={() => toggleGroup('assets')} isSidebarCollapsed={isSidebarCollapsed}>
                        {isMenuEnabled('assets') && (
                            <NavItem
                                icon={<Briefcase size={18} />}
                                label="Campus Assets"
                                active={activeTab === 'assets'}
                                onClick={() => { setActiveTab('assets'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('asset-handovers') && (
                            <NavItem
                                icon={<ClipboardList size={18} />}
                                label="Asset Handovers"
                                active={activeTab === 'asset-handovers'}
                                onClick={() => { setActiveTab('asset-handovers'); setSidebarOpen(false); }}
                            />
                        )}
                        {isMenuEnabled('asset-reports') && (
                            <NavItem
                                icon={<FileText size={18} />}
                                label="Asset Reports"
                                active={activeTab === 'asset-reports'}
                                onClick={() => { setActiveTab('asset-reports'); setSidebarOpen(false); }}
                            />
                        )}
                    </SidebarGroup>
                )}
            </>
        )
    }

    return (
        <div className="min-h-screen flex bg-[var(--bg-primary)] text-[var(--text-primary)] transition-colors duration-300 font-sans">
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
                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                                {companySettings.logo_url ? (
                                    <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="w-full h-full bg-black rounded-lg flex items-center justify-center text-white font-bold">S</div>
                                )}
                            </div>
                            <h1 className={`text-xl font-bold text-[var(--text-primary)] whitespace-nowrap transition-opacity duration-300 ${isSidebarCollapsed ? 'opacity-0 w-0 hidden' : 'opacity-100'}`}>{companySettings.company_name}</h1>
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
                        {renderSidebarItems()}
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
                        {role?.toLowerCase() !== 'student' && (isMenuEnabled('settings') || isMenuEnabled('bulk') || isMenuEnabled('company-settings') || isMenuEnabled('ai-settings') || isMenuEnabled('dashboard-designer') || isMenuEnabled('integrations') || isMenuEnabled('audit') || isMenuEnabled('geofencing')) && (
                            <SidebarGroup title="Administration" isOpen={openGroups.admin} onToggle={() => toggleGroup('admin')} isSidebarCollapsed={isSidebarCollapsed}>
                                {isMenuEnabled('settings') && <NavItem icon={<Settings size={18} />} label="General Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setSidebarOpen(false); }} />}
                                {isMenuEnabled('bulk') && <NavItem icon={<Database size={18} />} label="Data Management" active={activeTab === 'bulk'} onClick={() => { setActiveTab('bulk'); setSidebarOpen(false); }} />}
                                {isMenuEnabled('company-settings') && <NavItem icon={<Building2 size={18} />} label="Company Profile" active={activeTab === 'company-settings'} onClick={() => { setActiveTab('company-settings'); setSidebarOpen(false); }} />}
                                {isMenuEnabled('ai-settings') && <NavItem icon={<Brain size={18} />} label="AI Configuration" active={activeTab === 'ai-settings'} onClick={() => { setActiveTab('ai-settings'); setSidebarOpen(false); }} />}
                                {isMenuEnabled('dashboard-designer') && <NavItem icon={<Sliders size={18} />} label="Design System" active={activeTab === 'dashboard-designer'} onClick={() => { setActiveTab('dashboard-designer'); setSidebarOpen(false); }} />}
                                {isMenuEnabled('integrations') && <NavItem icon={<Server size={18} />} label="API Integrations" active={activeTab === 'integrations'} onClick={() => { setActiveTab('integrations'); setSidebarOpen(false); }} />}
                                {isMenuEnabled('audit') && <NavItem icon={<History size={18} />} label="Audit Trail" active={activeTab === 'audit'} onClick={() => { setActiveTab('audit'); setSidebarOpen(false); }} />}
                                {isMenuEnabled('geofencing') && <NavItem icon={<Shield size={18} />} label="IP Geofencing" active={activeTab === 'geofencing'} onClick={() => { setActiveTab('geofencing'); setSidebarOpen(false); }} />}
                            </SidebarGroup>
                        )}
                        {role?.toLowerCase() !== 'student' && (
                            <SidebarGroup title="Support" isOpen={openGroups.support} onToggle={() => toggleGroup('support')} isSidebarCollapsed={isSidebarCollapsed}>
                                <NavItem icon={<HelpCircle size={18} />} label="Help Center" active={false} onClick={() => { }} />
                                <InstallPWATrigger navStyle />
                            </SidebarGroup>
                        )}
                    </nav>

                    {/* Legal Section */}
                    {role?.toLowerCase() !== 'student' && (
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
                    )}


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
            <main className={`flex-1 p-2 sm:p-3 lg:p-4 transition-all duration-300 ${isSidebarCollapsed ? 'lg:ml-20' : 'lg:ml-64'}`}>
                <Suspense fallback={<PageLoader />}>
                    {/* Top Header - 2 Row Layout */}
                    <header className="flex flex-col gap-2 mb-4 pt-1 pb-1">
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
                                            { id: 'gate', label: 'Gate Control', icon: Sliders },
                                            { id: 'verification', label: 'ID Verification', icon: ShieldCheck },
                                            { id: 'audit', label: 'Logs', icon: History },
                                            { id: 'reports', label: 'Reports', icon: FileText }
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
                                <button
                                    onClick={() => setActiveTab('notice-board')}
                                    className={`p-2 rounded-lg relative text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all ${
                                        activeTab === 'notice-board'
                                            ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 ring-1 ring-indigo-200 dark:ring-indigo-800/30'
                                            : ''
                                    }`}
                                    title="University Notice Board"
                                >
                                    <Megaphone size={20} />
                                </button>
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
                                        <div className="absolute right-0 top-full mt-2 w-56 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
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
                            const currentGroup = SIDEBAR_GROUPS.find(group => group.items.some(item => item.id === activeTab))
                            if (currentGroup) {
                                return (
                                    <div className="w-full overflow-x-auto pb-1 animate-in slide-in-from-left-4">
                                        <div className="flex items-center gap-2 p-1">
                                            {currentGroup.items.map(item => {
                                                const isEnabled = !item.permissionKey || isMenuEnabled(item.permissionKey)
                                                return isEnabled && (
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
                                            })}
                                        </div>
                                    </div>
                                )
                            }
                        })()}
                    </header>

                    {/* Security Guard for Students */}
                    {(() => {
                        if (role?.toLowerCase() === 'student' && !['dashboard', 'attendance', 'timetable', 'courses', 'classrooms', 'events', 'calendar', 'privacy', 'cookies', 'rights', 'settings', 'notice-board'].includes(activeTab)) {
                            setTimeout(() => setActiveTab('dashboard'), 0);
                            return null;
                        }
                        return null;
                    })()}

                    {activeTab === 'dashboard' && role === 'Guardian' && <GuardianDashboard />}
                    {activeTab === 'dashboard' && (role === 'Security' || role === 'Security Lead' || role === 'Guard') && <SecurityDashboard onNavigate={setActiveTab} />}
                    {activeTab === 'dashboard' && role === 'Student' && <StudentDashboard />}
                    {activeTab === 'dashboard' && role === 'Lecturer' && <LecturerDashboard />}
                    {activeTab === 'dashboard' && role === 'Staff' && <StaffDashboard currentUser={currentUser} onNavigate={setActiveTab} />}
                    {activeTab === 'dashboard' && role === 'Guest' && <GuestDashboard currentUser={currentUser} />}
                    {activeTab === 'dashboard' && role === 'Management' && <ManagementDashboard currentUser={currentUser} onNavigate={setActiveTab} />}
                    {activeTab === 'dashboard' && role === 'Stores' && <StoresDashboard currentUser={currentUser} onNavigate={setActiveTab} />}
                    {activeTab === 'dashboard' && role === 'Driver' && <DriverDashboard currentUser={currentUser} onNavigate={setActiveTab} />}
                    {activeTab === 'visitors' && <VisitorManagement />}
                    {activeTab === 'calendar' && <CampusCalendar />}
                    {activeTab === 'dashboard' && role !== 'Guardian' && role !== 'Security' && role !== 'Security Lead' && role !== 'Guard' && role !== 'Student' && role !== 'Lecturer' && role !== 'Staff' && role !== 'Guest' && role !== 'Management' && role !== 'Stores' && role !== 'Driver' && (
                        <AdminDashboard onNavigate={setActiveTab} />
                    )}

                    {activeTab === 'users' && <UsersComp />}
                    {activeTab === 'live' && <LiveClasses fullScreen={true} />}
                    {activeTab === 'attendance' && <Attendance />}
                    {activeTab === 'gate' && <GateControl />}
                    {activeTab === 'vehicles' && <VehicleIntel />}
                    {activeTab === 'timetable' && <Timetable />}
                    {activeTab === 'notice-board' && <NoticeBoard />}
                    {activeTab === 'events' && <EventManagement />}
                    {activeTab === 'classrooms' && <ClassroomManagement />}
                    {activeTab === 'courses' && <CourseReports />}
                    {activeTab === 'all-attendance' && <AllScansDownload />}
                    {activeTab === 'cameras' && <CameraMonitoring />}
                    {activeTab === 'settings' && <SettingsComp />}
                    {activeTab === 'integrations' && <Integrations />}
                    {activeTab === 'bulk' && <BulkUpload />}
                    {activeTab === 'dashboard-designer' && <DashboardCustomizer />}
                    {activeTab === 'ai-settings' && <AISettings />}
                    {activeTab === 'company-settings' && <CompanySettings />}
                    {activeTab === 'reports' && <Reports />}
                    {activeTab === 'verification' && <StudentVerification />}
                    {activeTab === 'incidents' && <IncidentReporting />}
                    {activeTab === 'lost-found' && <LostAndFound />}
                    {activeTab === 'privacy' && <PrivacyPolicy />}
                    {activeTab === 'cookies' && <CookiePolicy />}
                    {activeTab === 'rights' && <UserDataRights />}
                    {activeTab === 'scan-logs' && <ScanLogs />}
                    {activeTab === 'gates-dashboard' && <GatesDashboard />}
                    {activeTab === 'student-dashboard' && <StudentDashboard />}
                    {activeTab === 'fleet' && <FleetManagement />}
                    {activeTab === 'fleet-tracking' && <FleetManagement initialTab="tracking" />}
                    {activeTab === 'fleet-trips' && <FleetManagement initialTab="trips" />}
                    {activeTab === 'audit' && <AuditLogs />}
                    {activeTab === 'geofencing' && <Geofencing />}
                    {activeTab === 'id-printing' && <IDPrinting />}
                    {activeTab === 'qr-registry' && <QRRegistry />}
                    {activeTab === 'assets' && <AssetManagement initialView="assets" />}
                    {activeTab === 'asset-handovers' && <AssetManagement initialView="handovers" />}
                    {activeTab === 'asset-reports' && <AssetManagement initialView="reports" />}
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


            {/* Floating Gate Pass Button for Admins & Guards */}
            {isAuthenticated && ['superadmin', 'admin', 'guard', 'security lead', 'security'].includes(role?.toLowerCase()) && (
                <button
                    onClick={() => setShowQuickScanModal(true)}
                    className="fixed bottom-6 right-6 z-[90] bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white rounded-full px-5 py-3.5 shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-black tracking-wider text-xs border border-white/20 animate-bounce"
                    style={{ boxShadow: '0 10px 25px -5px rgba(99, 102, 241, 0.5)' }}
                >
                    <QrCode size={20} />
                    <span>Gate Pass</span>
                </button>
            )}

            {/* Quick Scan Modal Overlay */}
            {showQuickScanModal && (
                <div 
                    className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-fade-in"
                    onClick={() => setShowQuickScanModal(false)}
                >
                    <div 
                        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-4xl overflow-hidden animate-scale-in max-h-[90vh] sm:max-h-none overflow-y-auto relative p-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={() => setShowQuickScanModal(false)}
                            className="absolute top-4 right-4 p-2 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-650 text-slate-800 dark:text-white transition-all z-50 shadow-sm"
                        >
                            <X size={20} />
                        </button>
                        <div className="pt-2">
                            <Suspense fallback={<PageLoader />}>
                                <StudentVerification />
                            </Suspense>
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

function NavItem({ icon, label, active, onClick, badge }: { icon: any, label: string, active: boolean, onClick: () => void, badge?: any }) {
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
            {badge && <span className="ml-auto group-[.collapsed]/sidebar:hidden">{badge}</span>}
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
