import { 
    Shield, QrCode, Clock, CheckCircle, ArrowRight, Smartphone, Lock, BarChart3, Bell, 
    UserCheck, Activity, Database, Zap, Phone, ShieldAlert, Award, Sliders, Server, 
    User, Video, Megaphone, HelpCircle, Key, KeyRound, Check, RefreshCw, Nfc,
    Building, Users, Truck, Box, Calendar, TrendingUp, AlertTriangle, Cpu, Layers, 
    Globe, FileText, Terminal, Settings, Radio, Eye, LogOut, MapPin, UserX, CheckCircle2, Sparkles,
    Sun, Moon, ShieldCheck, ChevronRight
} from 'lucide-react'
import { useState, useEffect } from 'react'
import StudentVerification from './StudentVerification'

interface LandingPageProps {
    onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
    const [showVerification, setShowVerification] = useState(false)
    const [companySettings, setCompanySettings] = useState<{ company_name: string, logo_url: string }>({
        company_name: 'Smart Campus',
        logo_url: ''
    })

    // PIN Verification States
    const [showPinModal, setShowPinModal] = useState(false)
    const [pinValue, setPinValue] = useState('')
    const [pinError, setPinError] = useState('')
    const [pinLoading, setPinLoading] = useState(false)

    // Routing and Theme States
    const [activePage, setActivePage] = useState<string>('home')
    const [landingDarkMode, setLandingDarkMode] = useState<boolean>(false) // Default to Light Mode

    // Interactive Page Specific States
    const [hoveredNode, setHoveredNode] = useState<string | null>('guard')
    const [activeDemoTab, setActiveDemoTab] = useState<string>('analytics')
    const [activeIndustry, setActiveIndustry] = useState<string>('universities')
    
    // Live Terminal Log Ticker
    const [terminalLogs, setTerminalLogs] = useState<string[]>([
        "[SEC-SYS] Initializing Smart Access network...",
        "[DB-CONN] Secure ledger connection established.",
        "[GATE-01] Standby mode active. Laser security grid ONLINE."
    ])

    useEffect(() => {
        fetch('/api/users/public-company-settings')
            .then(res => res.json())
            .then(data => {
                setCompanySettings({
                    company_name: data.company_name || 'Smart Campus',
                    logo_url: data.logo_url || ''
                })
            })
            .catch(err => console.error("Failed to fetch company settings", err))
    }, [])

    // Simulated terminal logs generator
    useEffect(() => {
        const logTemplates: Record<string, string[]> = {
            student: [
                "Scan matched: Student ID #ST-9982 - Gate 2 check-in approved",
                "NFC Ring tap registered at Library Core Terminal - Access Granted",
                "Attendance logged: Class CS-402 (Algorithms) - Geofence Verified",
                "Digital credentials synced for Student #ST-1029",
            ],
            staff: [
                "NFC pass validated: Dr. Angela Cooper (Faculty) - Main Admin building",
                "Geofenced check-in: Professor Marcus Brody - Science Lab Alpha",
                "NFC Key Ring authorized: IT Admin Server Room - Entry logged",
                "Automated presence report generated for Department of Registrar",
            ],
            visitor: [
                "Pre-registered QR pass verified: Guest John Doe - Host Notification sent",
                "Alert: Unknown QR signature rejected at South Entrance gate",
                "Security check: Visitor pass #VIS-2830 vetted & background checked",
                "Digital badge issued for Contractor #C-901 - Zone Access Restricted",
            ],
            vehicle: [
                "Plate scanned: KCD 982Y - Delivery Truck - Cargo Gate open",
                "Fleet tracker: Shuttle Bus A speed check 35km/h - Route on schedule",
                "Geofence alert: Fleet Vehicle 04 exited restricted compound",
                "License Plate verification: Staff Sedan - VIP Lot Access",
            ],
            asset: [
                "NFC tag detected: Projector Unit 12 moved from Lecture Hall 4",
                "Security dispatch: Asset tag #AST-0038 unauthorized movement detected",
                "Audit trail: Server enclosure lock status secured",
                "Asset lifecycle: Smart sticker barcode scanned by audit lead",
            ],
            event: [
                "Crowd capacity threshold: Main Auditorium at 76% occupancy",
                "Ticket validation: QR pass #EVT-4820 verified for Tech Expo Entrance",
                "Access Control: VIP Pass authorized for Green Room Zone",
                "Real-time analytics: 1,420 entries logged in past 15 minutes",
            ],
            building: [
                "Building status: Main Library HVAC lock automated check complete",
                "Facility alert: Gate 4 perimeter sensor registered brief trip",
                "Smart Grid: Power efficiency optimization applied to Science Block",
                "Security Grid: Automated lockdown sequence drill complete",
            ],
            guard: [
                "Duty roster check: Officer Kamau logged in at gate console #1",
                "System broadcast: Security alerts pushed to mobile devices",
                "Dispatch alert: Manual gate overrides locked to prevent access",
                "Incident report filed: Guard detected broken window in Lab Hall B",
            ]
        }

        const interval = setInterval(() => {
            const node = hoveredNode || 'guard'
            const templates = logTemplates[node] || logTemplates['guard']
            const randomLog = templates[Math.floor(Math.random() * templates.length)]
            const time = new Date().toLocaleTimeString()
            setTerminalLogs(prev => [
                `[${time}] ${randomLog}`,
                ...prev.slice(0, 5)
            ])
        }, 3000)

        return () => clearInterval(interval)
    }, [hoveredNode])

    const handleIdVerificationTab = () => {
        const authTime = localStorage.getItem('id_verification_auth_time')
        if (authTime) {
            const parsedTime = parseInt(authTime, 10)
            const now = Date.now()
            if (now - parsedTime < 24 * 60 * 60 * 1000) {
                setShowVerification(true)
                return
            }
        }
        setShowPinModal(true)
    }

    const handleVerifyPin = async (e: React.FormEvent) => {
        e.preventDefault()
        setPinLoading(true)
        setPinError('')
        try {
            const res = await fetch('/api/users/verify-admin-pin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pin: pinValue })
            })
            const data = await res.json()
            if (res.ok && data.status === 'success') {
                localStorage.setItem('id_verification_auth_time', Date.now().toString())
                setShowPinModal(false)
                setPinValue('')
                setShowVerification(true)
            } else {
                setPinError(data.detail || 'Invalid administrator PIN')
            }
        } catch (err) {
            setPinError('Failed to verify PIN. Check your backend connection.')
        } finally {
            setPinLoading(false)
        }
    }

    // Nodes definition for interactive visualization
    const nodes = [
        { id: 'student', label: 'Students', icon: <Users size={18} />, x: 100, y: 80, color: 'text-[#0066FF]', hoverBg: 'bg-blue-500/10' },
        { id: 'staff', label: 'Staff & Faculty', icon: <UserCheck size={18} />, x: 260, y: 70, color: 'text-indigo-600 dark:text-indigo-400', hoverBg: 'bg-indigo-500/10' },
        { id: 'visitor', label: 'Visitors', icon: <User size={18} />, x: 340, y: 180, color: 'text-cyan-600 dark:text-cyan-400', hoverBg: 'bg-cyan-500/10' },
        { id: 'vehicle', label: 'Vehicles', icon: <Truck size={18} />, x: 300, y: 310, color: 'text-emerald-600 dark:text-emerald-400', hoverBg: 'bg-emerald-500/10' },
        { id: 'asset', label: 'Assets', icon: <Box size={18} />, x: 180, y: 350, color: 'text-teal-600 dark:text-teal-400', hoverBg: 'bg-teal-500/10' },
        { id: 'event', label: 'Events', icon: <Calendar size={18} />, x: 60, y: 290, color: 'text-purple-600 dark:text-purple-400', hoverBg: 'bg-purple-500/10' },
        { id: 'building', label: 'Facilities', icon: <Building size={18} />, x: 40, y: 170, color: 'text-pink-600 dark:text-pink-400', hoverBg: 'bg-pink-500/10' },
        { id: 'guard', label: 'Security Team', icon: <Shield size={18} />, x: 180, y: 220, color: 'text-cyan-600 dark:text-cyan-400', hoverBg: 'bg-cyan-500/10' }
    ]

    const nodeDetails: Record<string, { title: string, stat: string, status: string, desc: string, metrics: string[] }> = {
        student: {
            title: "Student Attendance & Access",
            stat: "8,940 Students Logged In Today",
            status: "Normal Operations",
            desc: "NFC smart rings, student ID scans, and classroom geofences capture presence data in real-time, automatically feeding registers.",
            metrics: ["99.4% RFID/NFC Tag Scan Accuracy", "0% Fake Attendance Logged", "Real-Time Campus Geofencing Active"]
        },
        staff: {
            title: "Staff & Faculty Clearance",
            stat: "612 Staff Present On-Site",
            status: "Encrypted Clearance Active",
            desc: "High-security zones automatically restrict entries based on role-based authorization parameters written to contactless cards.",
            metrics: ["Active Directory Integration Setup", "Emergency Evacuation Presence Logged", "Secure Server Room Logs Streamed"]
        },
        visitor: {
            title: "Visitor Management & Vetting",
            stat: "42 Visitors Checked In",
            status: "Verification Queue Cleared",
            desc: "Hosts pre-register guests who receive encrypted QR codes for self-check-in, triggering instantaneous SMS notifications to hosts.",
            metrics: ["Average Check-in: 12 seconds", "Instant Host Notifications Issued", "Government Database Vetting Ready"]
        },
        vehicle: {
            title: "Fleet & Gate Log Management",
            stat: "114 Vehicles Authenticated",
            status: "No Delays Reported",
            desc: "NFC-enabled tags and automated license verification synchronize gate entries, fleet fuel monitoring, and trip tracking logs.",
            metrics: ["Shuttle Bus Geofence Logs Syncing", "Gate Barrier Auto-Open Triggered", "Real-time Trip Route Analytics On"]
        },
        asset: {
            title: "Enterprise Asset Tracking",
            stat: "1,208 Tagged Assets Audited",
            status: "Perimeter Alert Secure",
            desc: "Sticker tags and active tags prevent theft and trace equipment histories. Instant alarms sound if assets exit designated spaces.",
            metrics: ["0 Assets Reported Missing This Month", "Automated Auditing Registers Active", "Real-time Loss Prevention Active"]
        },
        event: {
            title: "Event Admissions Control",
            stat: "2 Major Events Active Now",
            status: "High Admissions Flow",
            desc: "Ticketing platform validates thousands of entries per minute using lightweight QR validation codes on attendees' smart screens.",
            metrics: ["3,129 Tickets Scanned Today", "Access Zone Control Set Up", "VIP Check-in Custom Notifications"]
        },
        building: {
            title: "Building & Facility Command Room",
            stat: "12 Zones Secured & Monitored",
            status: "AI Threat Monitor Online",
            desc: "Physical infrastructure is represented digitally, allowing command teams to monitor occupancy, locks, and check points.",
            metrics: ["CCTV Camera Overlays Active", "Tailgating Alarms Configured", "Digital Twin Security Grid online"]
        },
        guard: {
            title: "Operational Security Intelligence",
            stat: "24 Officers Active on Shift",
            status: "Command Center Online",
            desc: "System synchronizes incident reports, hazard files, and emergency distress alarms directly to security supervisors' phones.",
            metrics: ["Response Time < 60 seconds", "Incident logs streamed instantly", "Automatic Patrol Route Verification"]
        }
    }

    if (showVerification) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-blue-500/30 font-sans">
                {/* CSS Custom Background & Grid Overlay */}
                <style>{`
                    .custom-grid {
                        background-size: 40px 40px;
                        background-image: 
                            linear-gradient(to right, rgba(0, 102, 255, 0.03) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(0, 102, 255, 0.03) 1px, transparent 1px);
                    }
                `}</style>
                <div className="absolute inset-0 custom-grid opacity-50 pointer-events-none" />
                
                <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {companySettings.logo_url ? (
                                <div className="w-10 h-10 bg-slate-100 rounded-xl p-1.5 flex items-center justify-center border border-slate-200">
                                    <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_4px_15px_rgba(0,102,255,0.3)]">
                                    <Shield className="text-white" size={20} />
                                </div>
                            )}
                            <span className="text-xl font-bold tracking-tight text-slate-900">
                                {companySettings.company_name}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowVerification(false)}
                            className="px-6 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold bg-white hover:bg-slate-50 transition-all focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            Return to Portal
                        </button>
                    </div>
                </nav>
                <div className="pt-24 relative z-10">
                    <StudentVerification />
                </div>
            </div>
        )
    }

    return (
        <div className={`min-h-screen transition-colors duration-500 overflow-x-hidden font-sans bg-[var(--bg-primary-val)] text-[var(--text-primary-val)]`}>
            {/* Dynamic CSS Custom Variables style sheet based on landingDarkMode state */}
            <style>{`
                :root {
                    --bg-primary-val: ${landingDarkMode ? '#050816' : '#F8FAFC'};
                    --bg-surface-val: ${landingDarkMode ? '#0D1324' : '#FFFFFF'};
                    --border-val: ${landingDarkMode ? 'rgba(255, 255, 255, 0.07)' : 'rgba(15, 23, 42, 0.08)'};
                    --text-primary-val: ${landingDarkMode ? '#FFFFFF' : '#0F172A'};
                    --text-secondary-val: ${landingDarkMode ? '#AAB4D6' : '#475569'};
                    --grid-color-val: ${landingDarkMode ? 'rgba(0, 102, 255, 0.05)' : 'rgba(0, 102, 255, 0.035)'};
                }
                @keyframes grid-glow {
                    0% { opacity: 0.3; }
                    50% { opacity: 0.6; }
                    100% { opacity: 0.3; }
                }
                @keyframes scanline {
                    0% { transform: translateY(-100%); }
                    100% { transform: translateY(100%); }
                }
                @keyframes slow-pulse {
                    0% { transform: scale(0.98); opacity: 0.85; }
                    50% { transform: scale(1.02); opacity: 1; }
                    100% { transform: scale(0.98); opacity: 0.85; }
                }
                @keyframes data-flow-dash {
                    0% { stroke-dashoffset: 80; }
                    100% { stroke-dashoffset: 0; }
                }
                @keyframes float-widget {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-8px) rotate(1deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                @keyframes pulse-ring-glow {
                    0% { transform: scale(0.9); opacity: 0.2; }
                    50% { opacity: 0.5; }
                    100% { transform: scale(1.4); opacity: 0; }
                }
                .security-grid {
                    background-size: 60px 60px;
                    background-image: 
                        linear-gradient(to right, var(--grid-color-val) 1px, transparent 1px),
                        linear-gradient(to bottom, var(--grid-color-val) 1px, transparent 1px);
                    animation: grid-glow 8s ease-in-out infinite;
                }
                .glow-radial {
                    background: radial-gradient(circle at center, rgba(0, 102, 255, ${landingDarkMode ? '0.15' : '0.06'}) 0%, transparent 60%);
                }
                .glass-card {
                    background: ${landingDarkMode ? 'rgba(13, 19, 36, 0.65)' : 'rgba(255, 255, 255, 0.8)'};
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid var(--border-val);
                }
                .glass-card-hover:hover {
                    background: ${landingDarkMode ? 'rgba(13, 19, 36, 0.85)' : '#FFFFFF'};
                    border-color: rgba(0, 102, 255, 0.35);
                    box-shadow: 0 12px 30px -10px rgba(0, 102, 255, ${landingDarkMode ? '0.25' : '0.08'});
                }
                .line-flow {
                    stroke-dasharray: 8;
                    animation: data-flow-dash 3s linear infinite;
                }
                .pulse-ring {
                    animation: pulse-ring-glow 3s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
                }
                .float-anim {
                    animation: float-widget 6s ease-in-out infinite;
                }
            `}</style>

            {/* Glowing Backdrop Orbs */}
            <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
            <div className="absolute top-[20%] right-1/4 w-[600px] h-[600px] bg-cyan-600/5 rounded-full blur-[140px] pointer-events-none" />
            <div className="absolute bottom-[10%] left-10 w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[110px] pointer-events-none" />

            {/* Main Header & Routing Navbar */}
            <nav className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 border-b border-b-[var(--border-val)] bg-[var(--bg-surface-val)]/80 backdrop-blur-xl`}>
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companySettings.logo_url ? (
                            <div className="w-9 h-9 bg-slate-100 dark:bg-white/5 rounded-xl p-1.5 flex items-center justify-center border border-[var(--border-val)]">
                                <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-xl bg-[#0066FF] flex items-center justify-center shadow-[0_4px_15px_rgba(0,102,255,0.35)]">
                                <Shield className="text-white" size={18} />
                            </div>
                        )}
                        <span className="text-lg font-black tracking-tight bg-gradient-to-r from-[var(--text-primary-val)] to-blue-500 bg-clip-text text-transparent">
                            {companySettings.company_name}
                        </span>
                    </div>
                    
                    {/* Routing Tabs */}
                    <div className="hidden lg:flex items-center gap-6 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary-val)]">
                        {[
                            { id: 'home', label: 'Home' },
                            { id: 'features', label: 'Features' },
                            { id: 'command', label: 'Command Center' },
                            { id: 'industries', label: 'Industries' },
                            { id: 'security', label: 'Security' },
                            { id: 'why-smart-access', label: 'Why Smart Access' }
                        ].map((page) => (
                            <button
                                key={page.id}
                                onClick={() => {
                                    setActivePage(page.id);
                                    const element = document.getElementById(page.id);
                                    if (element) {
                                        const yOffset = -80;
                                        const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
                                        window.scrollTo({ top: y, behavior: 'smooth' });
                                    }
                                }}
                                className={`transition-all hover:text-[var(--text-primary-val)] outline-none py-1 relative ${
                                    activePage === page.id ? 'text-[#0066FF]' : ''
                                }`}
                            >
                                {page.label}
                                {activePage === page.id && (
                                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#0066FF] rounded-full animate-fade-in" />
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Theme Toggler (Sun / Moon) */}
                        <button
                            onClick={() => setLandingDarkMode(!landingDarkMode)}
                            className="p-2.5 rounded-xl border border-[var(--border-val)] bg-[var(--bg-surface-val)] text-[var(--text-secondary-val)] hover:text-[var(--text-primary-val)] transition-all outline-none"
                            aria-label="Toggle theme"
                        >
                            {landingDarkMode ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} />}
                        </button>

                        <button
                            onClick={handleIdVerificationTab}
                            className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold border border-[var(--border-val)] rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all"
                        >
                            <Key size={14} className="text-[#0066FF]" /> ID Verify
                        </button>

                        <button
                            onClick={onGetStarted}
                            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#00D4FF] hover:from-[#0052cc] hover:to-[#00b2d8] text-white text-xs font-bold transition-all shadow-[0_4px_15px_rgba(0,102,255,0.25)] outline-none"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </nav>

            {/* Dynamic Page Switcher rendering */}
            <div className="pt-20">
                
                {/* 1. HOME PAGE */}
                <div id="home">
                        {/* Hero Section */}
                        <section className="relative min-h-[90vh] py-20 px-6 flex items-center overflow-hidden">
                            <div className="absolute inset-0 security-grid opacity-50 pointer-events-none" />
                            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[85%] h-[80%] glow-radial pointer-events-none" />
                            
                            <div className="max-w-7xl mx-auto relative z-10 w-full">
                                <div className="grid lg:grid-cols-12 gap-12 items-center">
                                    <div className="lg:col-span-7 text-left">
                                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#0066FF] dark:text-[#00FFC8] text-xs font-bold uppercase tracking-widest mb-6">
                                            <Sparkles size={14} className="animate-pulse" /> Advanced Campus Identity Engine
                                        </div>
                                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-[1.08] tracking-tight bg-gradient-to-b from-[var(--text-primary-val)] via-[var(--text-primary-val)] to-slate-400 bg-clip-text text-transparent">
                                            The Future of <br />
                                            <span className="bg-gradient-to-r from-[#0066FF] via-[#00D4FF] to-[#00FFC8] bg-clip-text text-transparent">Smart Access</span> & <br />
                                            Campus Intelligence.
                                        </h1>
                                        <p className="text-base md:text-lg text-[var(--text-secondary-val)] mb-8 leading-relaxed max-w-2xl">
                                            Transform security, attendance, visitor management, fleet operations, inventory control, event access, and asset tracking with a unified QR, NFC, and Analytics-powered platform.
                                        </p>
                                        
                                        <div className="flex flex-wrap gap-4">
                                            <button
                                                onClick={onGetStarted}
                                                className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#00D4FF] hover:from-[#0052cc] hover:to-[#00b2d8] text-white font-bold transition-all flex items-center gap-3 shadow-[0_4px_20px_rgba(0,102,255,0.25)] hover:scale-[1.02] outline-none"
                                            >
                                                Schedule Demo <ArrowRight size={18} />
                                            </button>
                                            <button 
                                                onClick={() => setActivePage('command')}
                                                className="px-8 py-4 rounded-xl border border-[var(--border-val)] bg-[var(--bg-surface-val)] text-[var(--text-primary-val)] font-bold hover:bg-slate-100 dark:hover:bg-slate-900 transition-all flex items-center gap-2 outline-none"
                                            >
                                                <Video size={18} className="text-[#0066FF]" /> Watch Platform Tour
                                            </button>
                                        </div>

                                        {/* Trust Tags */}
                                        <div className="mt-12 pt-8 border-t border-[var(--border-val)] flex flex-wrap gap-x-8 gap-y-4">
                                            {["100% Digital", "Real-Time Monitoring", "Enterprise Security", "Cloud Managed", "QR & NFC Enabled"].map((tag, i) => (
                                                <div key={i} className="flex items-center gap-2 text-xs font-bold text-[var(--text-secondary-val)] uppercase tracking-wider">
                                                    <CheckCircle size={14} className="text-[#0066FF] dark:text-[#00FFC8]" /> {tag}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Credentials showcase */}
                                    <div className="lg:col-span-5 relative">
                                        {/* Floating Analytics Widget Mockup */}
                                        <div className="absolute -top-8 -left-8 z-20 float-anim p-4 rounded-xl glass-card shadow-2xl flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-green-500/10 text-[#00E676] border border-green-500/20">
                                                <TrendingUp size={20} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <span className="text-[10px] text-[var(--text-secondary-val)] uppercase block font-semibold">Live Threat Matrix</span>
                                                <span className="text-sm font-black text-[var(--text-primary-val)]">0 Flags Detected</span>
                                            </div>
                                        </div>

                                        <div className="glass-card rounded-3xl p-6 relative overflow-hidden shadow-2xl">
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[100px] pointer-events-none" />
                                            
                                            <h3 className="text-lg font-black mb-4 flex items-center gap-2 bg-gradient-to-r from-[var(--text-primary-val)] to-slate-400 bg-clip-text text-transparent">
                                                <Cpu size={18} className="text-[#0066FF]" /> Zero-Hardware Credentials
                                            </h3>
                                            <p className="text-xs text-[var(--text-secondary-val)] mb-6 leading-relaxed">
                                                We replace expensive legacy gate readers with responsive mobile networks. Experience dynamic IDs, micro-NFC rings, and virtual scanning logs.
                                            </p>

                                            <div className="space-y-6">
                                                {/* 3D Smart Card */}
                                                <div>
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-[var(--text-primary-val)] uppercase tracking-wider">Contactless Smart ID Card</span>
                                                        <span className="text-[9px] text-[#0066FF] font-bold uppercase tracking-wider">(Hover to Flip Card)</span>
                                                    </div>
                                                    <div className="group w-full max-w-[280px] h-[160px] [perspective:1000px] cursor-pointer mx-auto">
                                                        <div className="relative w-full h-full rounded-2xl shadow-xl transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                                                            {/* Front */}
                                                            <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-blue-700 via-indigo-800 to-slate-900 p-4 text-white flex flex-col justify-between [backface-visibility:hidden] border border-white/10">
                                                                <div className="flex justify-between items-center">
                                                                    <span className="text-[10px] font-black tracking-widest uppercase text-[#00D4FF]">Smart Credential</span>
                                                                    <Nfc size={18} className="text-white animate-pulse" />
                                                                </div>
                                                                <div className="flex-1 flex items-center justify-center my-1.5">
                                                                    <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
                                                                        <QrCode size={36} className="text-white" />
                                                                    </div>
                                                                </div>
                                                                <div className="flex justify-between items-end">
                                                                    <div>
                                                                        <div className="text-xs font-black tracking-wide truncate max-w-[150px]">{companySettings.company_name}</div>
                                                                        <div className="text-[8px] opacity-75 mt-0.5 uppercase tracking-widest font-bold text-[#00FFC8]">NFC ACTIVE</div>
                                                                    </div>
                                                                    <span className="text-[8px] opacity-50 font-mono">ID: 849A-38C0</span>
                                                                </div>
                                                            </div>
                                                            {/* Back */}
                                                            <div className="absolute inset-0 w-full h-full rounded-2xl bg-[#0D1324] border border-white/10 p-4 text-white flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
                                                                <div className="w-full h-6 bg-white/5 rounded flex items-center px-2 text-[9px] text-[#AAB4D6] font-mono">SECURITY SIGNATURE REGISTERED</div>
                                                                <p className="text-[9px] text-center text-slate-400 leading-normal">
                                                                    This pass remains property of the institution. NFC frequency 13.56 MHz.
                                                                </p>
                                                                <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono">
                                                                    <span>ID: 849A-38C0</span>
                                                                    <span className="text-[#00E676] font-bold">100% VERIFIED</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Smart wearable */}
                                                <div className="border-t border-[var(--border-val)] pt-4">
                                                    <div className="flex justify-between items-center mb-2">
                                                        <span className="text-xs font-bold text-[var(--text-primary-val)] uppercase tracking-wider">Wearable NFC Ring</span>
                                                        <span className="text-[9px] text-[#0066FF] font-bold uppercase tracking-wider">(Contactless Tap Active)</span>
                                                    </div>
                                                    <div className="relative w-full h-20 flex items-center justify-center">
                                                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#0066FF] animate-[spin_10s_linear_infinite] flex items-center justify-center relative">
                                                            <div className="w-11 h-11 rounded-full border border-blue-500 bg-blue-500/10 flex items-center justify-center animate-pulse">
                                                                <Activity className="text-[#0066FF]" size={16} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Interactive Platform Visualization Map */}
                        <section className="py-20 px-6 bg-[var(--bg-surface-val)] border-t border-[var(--border-val)] relative">
                            <div className="max-w-7xl mx-auto">
                                <div className="text-center mb-16 max-w-3xl mx-auto">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#0066FF] text-xs font-bold uppercase tracking-widest mb-4">
                                        <Radio size={12} className="animate-pulse" /> Core Infrastructure Map
                                    </div>
                                    <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-[var(--text-primary-val)]">
                                        Interactive Platform Visualization
                                    </h2>
                                    <p className="text-[var(--text-secondary-val)] text-sm md:text-base leading-relaxed">
                                        Hover over any node below to monitor live check-ins, security logs, and asset movements in our connected ecosystem.
                                    </p>
                                </div>

                                <div className="grid lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
                                    {/* SVG Network diagram */}
                                    <div className="lg:col-span-7 relative flex items-center justify-center min-h-[400px] glass-card rounded-3xl p-6 overflow-hidden">
                                        <div className="absolute inset-0 security-grid opacity-30 pointer-events-none" />
                                        <svg className="w-[380px] h-[380px] z-10 relative" viewBox="0 0 400 400">
                                            {/* SVG Lines connecting peripheral nodes to the Center Hub */}
                                            {nodes.filter(n => n.id !== 'guard').map(n => (
                                                <line
                                                    key={n.id}
                                                    x1={180}
                                                    y1={220}
                                                    x2={n.x}
                                                    y2={n.y}
                                                    stroke={hoveredNode === n.id ? '#0066FF' : '#00D4FF'}
                                                    strokeWidth={hoveredNode === n.id ? '2' : '1'}
                                                    strokeOpacity={hoveredNode === n.id ? '0.8' : '0.25'}
                                                    className={hoveredNode === n.id ? 'line-flow' : ''}
                                                />
                                            ))}

                                            {/* Central Access Core node */}
                                            <circle cx={180} cy={220} r="32" fill="var(--bg-primary-val)" stroke="#0066FF" strokeWidth="2" className="pulse-ring" />
                                            <circle cx={180} cy={220} r="28" fill="var(--bg-surface-val)" stroke="#00D4FF" strokeWidth="2" />
                                            <foreignObject x={168} y={208} width={24} height={24}>
                                                <div className="text-[#0066FF] flex items-center justify-center w-full h-full animate-pulse">
                                                    <Cpu size={16} />
                                                </div>
                                            </foreignObject>

                                            {/* Nodes mappings */}
                                            {nodes.map(n => {
                                                const isActive = hoveredNode === n.id
                                                return (
                                                    <g 
                                                        key={n.id} 
                                                        className="cursor-pointer"
                                                        onMouseEnter={() => setHoveredNode(n.id)}
                                                    >
                                                        <circle 
                                                            cx={n.x} 
                                                            cy={n.y} 
                                                            r={isActive ? "20" : "16"} 
                                                            fill="var(--bg-surface-val)" 
                                                            stroke={isActive ? "#0066FF" : "#00D4FF"} 
                                                            strokeWidth="2" 
                                                            className="transition-all duration-300"
                                                        />
                                                        <foreignObject x={n.x - 10} y={n.y - 10} width={20} height={20}>
                                                            <div className={`flex items-center justify-center w-full h-full ${n.color} transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
                                                                {n.icon}
                                                            </div>
                                                        </foreignObject>
                                                    </g>
                                                )
                                            })}
                                        </svg>
                                    </div>

                                    {/* Console / Status Box */}
                                    <div className="lg:col-span-5 flex flex-col gap-6">
                                        {hoveredNode && nodeDetails[hoveredNode] ? (
                                            <div className="glass-card rounded-3xl p-6 border-blue-500/20 shadow-2xl relative transition-all duration-500">
                                                <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-[#0066FF] text-[9px] font-mono font-bold uppercase">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF] animate-ping"></span>
                                                    {nodeDetails[hoveredNode].status}
                                                </div>
                                                <h3 className="text-xl font-black text-[var(--text-primary-val)] mb-1">{nodeDetails[hoveredNode].title}</h3>
                                                <span className="text-xs font-bold text-[#0066FF] block mb-4">{nodeDetails[hoveredNode].stat}</span>
                                                <p className="text-xs text-[var(--text-secondary-val)] leading-relaxed mb-6">{nodeDetails[hoveredNode].desc}</p>
                                                
                                                <div className="space-y-2.5">
                                                    {nodeDetails[hoveredNode].metrics.map((m, idx) => (
                                                        <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-[var(--text-primary-val)]">
                                                            <CheckCircle2 size={14} className="text-[#00E676] flex-shrink-0" />
                                                            <span>{m}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="glass-card rounded-3xl p-6 text-center text-[var(--text-secondary-val)] min-h-[200px] flex items-center justify-center">
                                                Hover over any node in the grid to trace its log stream.
                                            </div>
                                        )}

                                        {/* Ticker logs */}
                                        <div className="glass-card rounded-3xl p-5 bg-slate-900 border-none font-mono text-left text-slate-100">
                                            <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                                                <div className="flex items-center gap-2">
                                                    <Terminal size={14} className="text-[#00FFC8]" />
                                                    <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Live System Logs</span>
                                                </div>
                                                <span className="text-[8px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold tracking-widest animate-pulse">LEDGER SYNCING</span>
                                            </div>
                                            <div className="space-y-1.5 h-[110px] overflow-y-hidden text-[10px] text-slate-300">
                                                {terminalLogs.map((log, i) => (
                                                    <div key={i} className="truncate select-none">
                                                        <span className="text-[#00FFC8]">{">"}</span> {log}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </section>
                    </div>

                {/* 2. FEATURES PAGE */}
                <section id="features" className="py-16 px-6 max-w-7xl mx-auto">
                        <div className="text-center mb-16 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-[var(--text-primary-val)]">
                                Integrated Access Modules
                            </h2>
                            <p className="text-[var(--text-secondary-val)] text-base leading-relaxed">
                                Complete zero-hardware identity ecosystems engineered to scale from single buildings up to corporate offices, universities, and high-security zones.
                            </p>
                        </div>

                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {/* Smart Attendance */}
                            <div className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300 group text-left">
                                <div className="w-14 h-14 rounded-2xl bg-blue-500/10 text-[#0066FF] flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                                    <Activity size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary-val)]">Smart Attendance</h3>
                                <ul className="space-y-2 text-xs text-[var(--text-secondary-val)]">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> QR & NFC Attendance Logs</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Localized Geofence Verification</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Real-Time Registers</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Biometric Integration Ready</li>
                                </ul>
                            </div>

                            {/* Visitor Center */}
                            <div className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300 group text-left">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                                    <UserCheck size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary-val)]">Visitor Management</h3>
                                <ul className="space-y-2 text-xs text-[var(--text-secondary-val)]">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Host Pre-Registration Codes</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Secure QR Gate Pass Delivery</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Instant host SMS/Email notices</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Background screening databases</li>
                                </ul>
                            </div>

                            {/* Fleet management */}
                            <div className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300 group text-left">
                                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                                    <Truck size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary-val)]">Fleet Tracking</h3>
                                <ul className="space-y-2 text-xs text-[var(--text-secondary-val)]">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Vehicle Route Telemetry</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Smart fuel logging & audits</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Driver schedule verification</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Geofence route boundary alerts</li>
                                </ul>
                            </div>

                            {/* Asset management */}
                            <div className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300 group text-left">
                                <div className="w-14 h-14 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                                    <Box size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary-val)]">Asset Tracking</h3>
                                <ul className="space-y-2 text-xs text-[var(--text-secondary-val)]">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> QR & NFC Asset Tag Stickers</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Log audit history checklists</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Loss prevention perimeter alarms</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Secure checkout audit reports</li>
                                </ul>
                            </div>

                            {/* Inventory level */}
                            <div className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300 group text-left">
                                <div className="w-14 h-14 rounded-2xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                                    <Database size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary-val)]">Inventory Control</h3>
                                <ul className="space-y-2 text-xs text-[var(--text-secondary-val)]">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Real-time stock visibility</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Automated threshold reorder logs</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Audit warehouse register</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Asset assignment syncing</li>
                                </ul>
                            </div>

                            {/* Event admission */}
                            <div className="glass-card glass-card-hover rounded-3xl p-8 transition-all duration-300 group text-left">
                                <div className="w-14 h-14 rounded-2xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-all duration-300">
                                    <Calendar size={24} />
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-[var(--text-primary-val)]">Event Management</h3>
                                <ul className="space-y-2 text-xs text-[var(--text-secondary-val)]">
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Digital Ticketing passes</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> QR validation at gate points</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> VIP backstage clearances</li>
                                    <li className="flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00E676]" /> Real-time occupancy levels</li>
                                </ul>
                            </div>
                        </div>
                    </section>

                {/* 3. COMMAND CENTER PAGE */}
                <section id="command" className="py-16 px-6 max-w-7xl mx-auto">
                        <div className="text-center mb-12 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-[var(--text-primary-val)]">
                                HQ Operations Command Center
                            </h2>
                            <p className="text-[var(--text-secondary-val)] text-base">
                                Experience a live simulated operational intelligence dashboard. Click between telemetry widgets below to swap visualization metrics.
                            </p>
                        </div>

                        {/* Interactive Sandbox Dashboard */}
                        <div className="glass-card rounded-3xl p-6 shadow-2xl overflow-hidden max-w-5xl mx-auto">
                            {/* Dashboard Selector */}
                            <div className="flex flex-wrap gap-2 mb-6 border-b border-[var(--border-val)] pb-4">
                                {[
                                    { id: 'analytics', label: 'Command Analytics', icon: <BarChart3 size={14} /> },
                                    { id: 'attendance', label: 'Attendance registers', icon: <Activity size={14} /> },
                                    { id: 'visitors', label: 'Visitor Vetting', icon: <UserCheck size={14} /> },
                                    { id: 'fleet', label: 'Fleet & Shuttle', icon: <Truck size={14} /> },
                                    { id: 'assets', label: 'Asset Tracking', icon: <Box size={14} /> }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveDemoTab(tab.id)}
                                        className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 outline-none ${
                                            activeDemoTab === tab.id 
                                                ? 'bg-[#0066FF] text-white shadow-md' 
                                                : 'border border-[var(--border-val)] hover:bg-slate-100 dark:hover:bg-white/5'
                                        }`}
                                    >
                                        {tab.icon}
                                        {tab.label}
                                    </button>
                                ))}
                            </div>

                            {/* Tab Display Screens */}
                            <div className="min-h-[280px] text-left">
                                {activeDemoTab === 'analytics' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-6">
                                            <h4 className="text-sm font-bold text-[var(--text-primary-val)] uppercase tracking-wider">Operational Data Telemetry</h4>
                                            <span className="text-[10px] text-green-600 font-mono font-bold animate-pulse">● SECURE STREAM</span>
                                        </div>
                                        <div className="grid sm:grid-cols-4 gap-4 mb-6">
                                            <div className="p-4 rounded-xl border border-[var(--border-val)] bg-[var(--bg-primary-val)]">
                                                <span className="text-[10px] text-[var(--text-secondary-val)] uppercase font-semibold block mb-1">Check-in speed</span>
                                                <span className="text-xl font-black text-[var(--text-primary-val)]">0.42s</span>
                                            </div>
                                            <div className="p-4 rounded-xl border border-[var(--border-val)] bg-[var(--bg-primary-val)]">
                                                <span className="text-[10px] text-[var(--text-secondary-val)] uppercase font-semibold block mb-1">Weekly Checkins</span>
                                                <span className="text-xl font-black text-[var(--text-primary-val)]">14,890 logs</span>
                                            </div>
                                            <div className="p-4 rounded-xl border border-[var(--border-val)] bg-[var(--bg-primary-val)]">
                                                <span className="text-[10px] text-[var(--text-secondary-val)] uppercase font-semibold block mb-1">NFC stickers sync</span>
                                                <span className="text-xl font-black text-[var(--text-primary-val)]">99.8% Online</span>
                                            </div>
                                            <div className="p-4 rounded-xl border border-[var(--border-val)] bg-[var(--bg-primary-val)]">
                                                <span className="text-[10px] text-[var(--text-secondary-val)] uppercase font-semibold block mb-1">System latency</span>
                                                <span className="text-xl font-black text-[var(--text-primary-val)]">12ms</span>
                                            </div>
                                        </div>
                                        <div className="h-32 border border-[var(--border-val)] rounded-xl relative overflow-hidden flex items-end">
                                            <div className="absolute inset-0 security-grid opacity-10" />
                                            <svg className="w-full h-full" viewBox="0 0 500 100" preserveAspectRatio="none">
                                                <path d="M0,80 Q60,40 120,70 T240,30 T360,90 T480,20 L500,50 L500,100 L0,100 Z" fill="rgba(0,102,255,0.06)" />
                                                <path d="M0,80 Q60,40 120,70 T240,30 T360,90 T480,20 L500,50" fill="none" stroke="#0066FF" strokeWidth="2" className="line-flow" />
                                            </svg>
                                        </div>
                                    </div>
                                )}

                                {activeDemoTab === 'attendance' && (
                                    <div>
                                        <h4 className="text-sm font-bold text-[var(--text-primary-val)] uppercase tracking-wider mb-4">Classroom Registries</h4>
                                        <div className="space-y-3">
                                            <div className="p-3.5 rounded-xl border border-[var(--border-val)] flex justify-between items-center text-xs">
                                                <span className="font-bold">CS-402 (Algorithms and Complexities)</span>
                                                <span className="text-[#0066FF] font-bold">94% checked in (47/50 students)</span>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-[var(--border-val)] flex justify-between items-center text-xs">
                                                <span className="font-bold">MED-102 (Human Anatomy Lab Block)</span>
                                                <span className="text-[#0066FF] font-bold">100% checked in (24/24 students)</span>
                                            </div>
                                            <div className="p-3.5 rounded-xl border border-[var(--border-val)] flex justify-between items-center text-xs">
                                                <span className="font-bold">BUS-204 (Management Finance)</span>
                                                <span className="text-[#0066FF] font-bold">88% checked in (72/82 students)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {activeDemoTab === 'visitors' && (
                                    <div className="grid sm:grid-cols-2 gap-6">
                                        <div className="p-4 rounded-xl border border-[var(--border-val)] flex flex-col justify-between">
                                            <div>
                                                <span className="text-[10px] text-[var(--text-secondary-val)] block uppercase font-bold">Guest verification card</span>
                                                <span className="text-lg font-black text-[#0066FF] mt-1 block">Johnathan Vance</span>
                                                <p className="text-xs text-[var(--text-secondary-val)] mt-2">Scheduled meeting with Faculty Dean of Engineering block at 16:00.</p>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-[var(--border-val)] flex justify-between items-center text-xs text-[var(--text-secondary-val)]">
                                                <span>Check-in: 15:42</span>
                                                <span className="text-[#00E676] font-bold">AUTHORIZED ENTRY</span>
                                            </div>
                                        </div>
                                        <div className="space-y-2 text-xs">
                                            <span className="text-[10px] uppercase font-bold text-[var(--text-secondary-val)]">Security checklist checks</span>
                                            <div className="p-2.5 rounded bg-green-500/5 text-green-700 dark:text-green-400 border border-green-500/20">✓ QR pass integrity code checks completed successfully.</div>
                                            <div className="p-2.5 rounded bg-green-500/5 text-green-700 dark:text-green-400 border border-green-500/20">✓ Host registration clearance verified.</div>
                                        </div>
                                    </div>
                                )}

                                {activeDemoTab === 'fleet' && (
                                    <div className="grid sm:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl border border-[var(--border-val)]">
                                            <h5 className="font-bold text-xs mb-2">Campus Shuttle A</h5>
                                            <p className="text-xs text-[var(--text-secondary-val)]">Speed: 28km/h</p>
                                            <span className="text-[10px] text-[#00E676] font-bold uppercase mt-2 block">On Route schedule</span>
                                        </div>
                                        <div className="p-4 rounded-xl border border-[var(--border-val)]">
                                            <h5 className="font-bold text-xs mb-2">Delivery Truck #02</h5>
                                            <p className="text-xs text-[var(--text-secondary-val)]">Speed: 0km/h</p>
                                            <span className="text-[10px] text-[#0066FF] font-bold uppercase mt-2 block">Gate checkin complete</span>
                                        </div>
                                        <div className="p-4 rounded-xl border border-[var(--border-val)]">
                                            <h5 className="font-bold text-xs mb-2">Security Patrol vehicle</h5>
                                            <p className="text-xs text-[var(--text-secondary-val)]">Speed: 15km/h</p>
                                            <span className="text-[10px] text-yellow-500 font-bold uppercase mt-2 block">Patrol Active</span>
                                        </div>
                                    </div>
                                )}

                                {activeDemoTab === 'assets' && (
                                    <div className="space-y-3">
                                        <div className="p-3 rounded-xl border border-[var(--border-val)] flex justify-between items-center text-xs">
                                            <div>
                                                <span className="font-bold block">Medical Lab Centrifuge B</span>
                                                <span className="text-[10px] text-[var(--text-secondary-val)]">Tag: NFC-AST-902</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-[9px] uppercase">Secure In Lab</span>
                                        </div>
                                        <div className="p-3 rounded-xl border border-[var(--border-val)] flex justify-between items-center text-xs">
                                            <div>
                                                <span className="font-bold block">IT Server Rack cabinet #4</span>
                                                <span className="text-[10px] text-[var(--text-secondary-val)]">Tag: NFC-AST-882</span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-600 dark:text-green-400 font-bold text-[9px] uppercase">Door Closed & Secured</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                {/* 4. INDUSTRIES PAGE */}
                <section id="industries" className="py-16 px-6 max-w-7xl mx-auto">
                        <div className="text-center mb-16 max-w-3xl mx-auto">
                            <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-[var(--text-primary-val)]">
                                Tailored Sector Solutions
                            </h2>
                            <p className="text-[var(--text-secondary-val)] text-base">
                                Custom credential ecosystems engineered for specific workflow parameters.
                            </p>
                        </div>

                        {/* Verticals grid */}
                        <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-4xl mx-auto">
                            {[
                                { id: 'universities', label: 'Universities & Colleges', icon: <Building size={16} /> },
                                { id: 'schools', label: 'Schools & Academies', icon: <Users size={16} /> },
                                { id: 'hospitals', label: 'Hospitals & Medical Wards', icon: <Activity size={16} /> },
                                { id: 'corporate', label: 'Corporate Office Towers', icon: <Sliders size={16} /> },
                                { id: 'residential', label: 'Gated Communities', icon: <Lock size={16} /> }
                            ].map((ind) => (
                                <button
                                    key={ind.id}
                                    onClick={() => setActiveIndustry(ind.id)}
                                    className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 outline-none ${
                                        activeIndustry === ind.id 
                                            ? 'bg-gradient-to-r from-[#0066FF] to-[#00D4FF] text-white border-transparent shadow-md' 
                                            : 'border-[var(--border-val)] hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                >
                                    {ind.icon}
                                    {ind.label}
                                </button>
                            ))}
                        </div>

                        {/* Industry box */}
                        <div className="glass-card rounded-3xl p-8 max-w-4xl mx-auto text-left relative overflow-hidden transition-all duration-300">
                            {activeIndustry === 'universities' && (
                                <div>
                                    <h3 className="text-2xl font-black mb-3 text-[var(--text-primary-val)] flex items-center gap-2">
                                        <Building className="text-[#0066FF]" /> Higher Education Infrastructure
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary-val)] leading-relaxed mb-6">
                                        Secure campus gates, log hostel check-ins, automate classroom attendance registers, track library assets, and streamline shuttle routes through one single interface.
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Impact metric</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">85% Faster Student Access</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Hardware Reduction</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">Zero Hardware Scanners Required</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeIndustry === 'schools' && (
                                <div>
                                    <h3 className="text-2xl font-black mb-3 text-[var(--text-primary-val)] flex items-center gap-2">
                                        <Users className="text-[#0066FF]" /> K-12 Student Safety Systems
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary-val)] leading-relaxed mb-6">
                                        Allow parent check-in codes, notify teachers instantly on student arrival, secure pickup gates, and manage fleet buses for student transport safety.
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Alerting</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">Instant Parent SMS Notifications</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Safety index</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">100% Authorized Pickup Logs</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeIndustry === 'hospitals' && (
                                <div>
                                    <h3 className="text-2xl font-black mb-3 text-[var(--text-primary-val)] flex items-center gap-2">
                                        <Activity className="text-[#0066FF]" /> Medical Center Compliance
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary-val)] leading-relaxed mb-6">
                                        Secure restricted pharmacy vaults, track high-value medical inventory checkout logs, log shift attendance, and control visitor flow in critical wards.
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Compliance</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">Full HIPAA Audit Trails</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Loss Prevention</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">Drug Vault NFC Access Logs</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeIndustry === 'corporate' && (
                                <div>
                                    <h3 className="text-2xl font-black mb-3 text-[var(--text-primary-val)] flex items-center gap-2">
                                        <Sliders className="text-[#0066FF]" /> Enterprise Office Workspace
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary-val)] leading-relaxed mb-6">
                                        Integrate with corporate active directories, track employee check-in timelines, secure confidential server rooms, and issue digital passes to contractor visits.
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">SSO Sync</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">SSO Active Directory Ready</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Contrctors</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">Auto-registered badges</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeIndustry === 'residential' && (
                                <div>
                                    <h3 className="text-2xl font-black mb-3 text-[var(--text-primary-val)] flex items-center gap-2">
                                        <Lock className="text-[#0066FF]" /> Gated Estate Perimeter Safety
                                    </h3>
                                    <p className="text-sm text-[var(--text-secondary-val)] leading-relaxed mb-6">
                                        Residents generate visitor entry codes from their app, security guards scan passes at access points, and vehicle plate logs check in automatically.
                                    </p>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Vetting</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">No Unrecognized Intruders</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-slate-500/5 border border-[var(--border-val)]">
                                            <span className="text-[10px] text-[#0066FF] font-bold block uppercase mb-1">Gate integration</span>
                                            <span className="text-lg font-black text-[var(--text-primary-val)]">Automatic Barrier Open logs</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                {/* 5. SECURITY PAGE */}
                <section id="security" className="py-16 px-6 max-w-7xl mx-auto">
                        <div className="grid lg:grid-cols-12 gap-12 items-center max-w-5xl mx-auto text-left">
                            <div className="lg:col-span-7">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#0066FF] text-xs font-bold uppercase tracking-widest mb-4">
                                    <Lock size={12} /> Cloud Ledger Integrity
                                </div>
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-6 text-[var(--text-primary-val)]">
                                    Enterprise-Grade Security Built In
                                </h2>
                                
                                <div className="space-y-6">
                                    <div className="flex gap-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#0066FF] font-bold text-xs mt-1">✓</div>
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--text-primary-val)]">AES-256 Data Encryption</h4>
                                            <p className="text-xs text-[var(--text-secondary-val)] mt-0.5">All visitor logs, student identity credentials, and backend database pipelines are encrypted at rest and in transit.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#0066FF] font-bold text-xs mt-1">✓</div>
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--text-primary-val)]">Role-Based Access Controls (RBAC)</h4>
                                            <p className="text-xs text-[var(--text-secondary-val)] mt-0.5">Control operational console permissions. Limit gate logs to security guards, and registry audits to registrar officers.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#0066FF] font-bold text-xs mt-1">✓</div>
                                        <div>
                                            <h4 className="text-sm font-bold text-[var(--text-primary-val)]">Compliance & Audit Trails</h4>
                                            <p className="text-xs text-[var(--text-secondary-val)] mt-0.5">Logs are fully immutable and compliant with data privacy frameworks, protecting details securely.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Center Shield illustration */}
                            <div className="lg:col-span-5 flex justify-center relative min-h-[300px]">
                                <div className="absolute w-44 h-44 rounded-full border border-blue-500/20 pulse-ring" />
                                <div className="relative z-10 w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 flex items-center justify-center shadow-lg animate-[slow-pulse_4s_infinite]">
                                    <ShieldCheck size={48} className="text-white" />
                                </div>
                            </div>
                        </div>
                    </section>

                {/* 6. WHY SMART ACCESS (COMPARISON & CTA) */}
                <div id="why-smart-access">
                        {/* Comparison Matrix */}
                        <section className="py-16 px-6 max-w-7xl mx-auto">
                            <div className="text-center mb-16 max-w-3xl mx-auto">
                                <h2 className="text-3xl md:text-5xl font-black tracking-tight mb-4 text-[var(--text-primary-val)]">
                                    Traditional Gate vs Smart Access
                                </h2>
                                <p className="text-[var(--text-secondary-val)] text-base">
                                    See how software-driven parameter security stacks up against obsolete physical turnstiles and paper guest books.
                                </p>
                            </div>

                            <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-[var(--border-val)] glass-card">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border-val)] bg-slate-500/5">
                                            <th className="p-4 text-xs font-black uppercase text-[var(--text-primary-val)] tracking-widest">System Metric</th>
                                            <th className="p-4 text-xs font-black uppercase text-red-500 tracking-widest">Legacy Systems</th>
                                            <th className="p-4 text-xs font-black uppercase text-[#0066FF] tracking-widest">Smart Access</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-val)] text-xs text-[var(--text-secondary-val)]">
                                        <tr>
                                            <td className="p-4 font-bold text-[var(--text-primary-val)]">Visitor Registers</td>
                                            <td className="p-4 text-red-500">Manual Paper books</td>
                                            <td className="p-4 text-[#0066FF] font-bold">✓ Automated cloud logs</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 font-bold text-[var(--text-primary-val)]">Operations Metrics</td>
                                            <td className="p-4 text-red-500">None</td>
                                            <td className="p-4 text-[#0066FF] font-bold">✓ Live dashboards</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 font-bold text-[var(--text-primary-val)]">Scanning Hardware</td>
                                            <td className="p-4 text-red-500">Expensive Turnstiles</td>
                                            <td className="p-4 text-[#0066FF] font-bold">✓ Zero scans hardware cost</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 font-bold text-[var(--text-primary-val)]">Security checks</td>
                                            <td className="p-4 text-red-500">Manual guest entries</td>
                                            <td className="p-4 text-[#0066FF] font-bold">✓ Automated background vetting</td>
                                        </tr>
                                        <tr>
                                            <td className="p-4 font-bold text-[var(--text-primary-val)]">Tracking Ecosystem</td>
                                            <td className="p-4 text-red-500">Single purpose log</td>
                                            <td className="p-4 text-[#0066FF] font-bold">✓ Unified Smart Access Core</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Testimonials */}
                        <section className="py-16 px-6 bg-[var(--bg-surface-val)] border-t border-[var(--border-val)]">
                            <div className="max-w-7xl mx-auto">
                                <div className="text-center mb-16 max-w-3xl mx-auto">
                                    <h2 className="text-3xl font-black text-[var(--text-primary-val)]">Proven Outcomes</h2>
                                </div>
                                <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto text-left">
                                    <div className="p-6 rounded-2xl border border-[var(--border-val)] bg-[var(--bg-primary-val)]">
                                        <p className="text-xs text-[var(--text-secondary-val)] italic mb-6">"Our physical gate queues were a bottleneck. Moving to dynamic QR codes reduced wait times significantly."</p>
                                        <h5 className="text-xs font-bold text-[var(--text-primary-val)]">Dr. Elizabeth Vance</h5>
                                        <span className="text-[10px] text-[var(--text-secondary-val)]">Dean of Engineering Block</span>
                                        <div className="mt-4 pt-3 border-t border-[var(--border-val)] font-bold text-xs text-[#0066FF]">80% Faster Check-ins</div>
                                    </div>
                                    <div className="p-6 rounded-2xl border border-[var(--border-val)] bg-[var(--bg-primary-val)]">
                                        <p className="text-xs text-[var(--text-secondary-val)] italic mb-6">"Fake attendance listings are gone. Classroom geofencing syncs attendance logs directly to the main ledger."</p>
                                        <h5 className="text-xs font-bold text-[var(--text-primary-val)]">Marcus Brody</h5>
                                        <span className="text-[10px] text-[var(--text-secondary-val)]">Registrar Operations Lead</span>
                                        <div className="mt-4 pt-3 border-t border-[var(--border-val)] font-bold text-xs text-[#0066FF]">95% Attendance Accuracy</div>
                                    </div>
                                    <div className="p-6 rounded-2xl border border-[var(--border-val)] bg-[var(--bg-primary-val)]">
                                        <p className="text-xs text-[var(--text-secondary-val)] italic mb-6">"Lost laboratory assets dropped to zero once we embedded NFC sticker checkers at the hallway checkpoints."</p>
                                        <h5 className="text-xs font-bold text-[var(--text-primary-val)]">Kipchumba K.</h5>
                                        <span className="text-[10px] text-[var(--text-secondary-val)]">Head of Hospital IT</span>
                                        <div className="mt-4 pt-3 border-t border-[var(--border-val)] font-bold text-xs text-[#0066FF]">60% Security Improvement</div>
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* CTA Block */}
                        <section className="py-24 px-6 bg-[var(--bg-primary-val)] relative text-center border-t border-[var(--border-val)]">
                            <div className="absolute inset-0 security-grid opacity-30 pointer-events-none" />
                            <div className="max-w-4xl mx-auto relative z-10">
                                <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-[var(--text-primary-val)] to-slate-400 bg-clip-text text-transparent mb-6">
                                    Replace Outdated Gate Registers
                                </h2>
                                <p className="text-xs md:text-sm text-[var(--text-secondary-val)] max-w-xl mx-auto mb-8">
                                    Deploy an automated security ledger. Setup takes minutes and requires zero hardware reader investments.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                                    <button
                                        onClick={onGetStarted}
                                        className="px-6 py-3 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-bold text-xs transition-all shadow-md"
                                    >
                                        Book a Live Demo
                                    </button>
                                    <button
                                        onClick={handleIdVerificationTab}
                                        className="px-6 py-3 rounded-xl border border-[var(--border-val)] hover:bg-slate-100 dark:hover:bg-slate-900 text-[var(--text-primary-val)] font-bold text-xs transition-all"
                                    >
                                        Talk to an Expert
                                    </button>
                                </div>
                            </div>
                        </section>
                    </div>
            </div>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-[var(--border-val)] bg-[var(--bg-surface-val)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-10 text-left text-xs font-semibold text-[var(--text-secondary-val)]">
                    <div>
                        <h4 className="uppercase text-[var(--text-primary-val)] mb-4 tracking-wider">Solutions</h4>
                        <ul className="space-y-2">
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">QR Gatepass Hub</span></li>
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">NFC Roll calls</span></li>
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Geofence Checkins</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="uppercase text-[var(--text-primary-val)] mb-4 tracking-wider">Industries</h4>
                        <ul className="space-y-2">
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Universities</span></li>
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Corporate parks</span></li>
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Medical Wards</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="uppercase text-[var(--text-primary-val)] mb-4 tracking-wider">Resources</h4>
                        <ul className="space-y-2">
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">System APIs</span></li>
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Data Compliance</span></li>
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Documentation</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="uppercase text-[var(--text-primary-val)] mb-4 tracking-wider">Company</h4>
                        <ul className="space-y-2">
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Security Audits</span></li>
                            <li><span className="hover:text-[var(--text-primary-val)] cursor-pointer">Terms of Service</span></li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 border-t border-[var(--border-val)] flex flex-col sm:flex-row justify-between items-center gap-4 text-xs font-bold text-[var(--text-secondary-val)]">
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-[#0066FF]" />
                        <span className="uppercase">{companySettings.company_name} PORTAL &copy; {new Date().getFullYear()}</span>
                    </div>
                    <div className="flex gap-4">
                        <a href="/privacy" className="hover:text-[var(--text-primary-val)]">Privacy Policy</a>
                        <a href="/terms" className="hover:text-[var(--text-primary-val)]">Terms of Service</a>
                    </div>
                </div>
            </footer>

            {/* Admin PIN Verification Modal Overlay */}
            {showPinModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in">
                    <div className="w-full max-w-md bg-[var(--bg-surface-val)] border border-[var(--border-val)] rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[100px] pointer-events-none" />
                        
                        <div className="flex items-center gap-3 mb-4 text-left">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-[#0066FF]">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary-val)] text-base">Admin Verification Required</h3>
                                <p className="text-xs text-[var(--text-secondary-val)]">Enter administrative access PIN</p>
                            </div>
                        </div>

                        <form onSubmit={handleVerifyPin} className="space-y-4">
                            <div>
                                <input
                                    type="password"
                                    maxLength={8}
                                    placeholder="••••"
                                    value={pinValue}
                                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
                                    className="w-full px-4 py-3.5 text-center text-3xl tracking-widest font-black bg-[var(--bg-primary-val)] border border-[var(--border-val)] rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-[var(--text-primary-val)] font-mono"
                                    autoFocus
                                    required
                                />
                            </div>

                            {pinError && (
                                <p className="text-xs text-red-500 font-bold text-center">{pinError}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowPinModal(false); setPinValue(''); setPinError(''); }}
                                    className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-val)] text-[var(--text-primary-val)] font-bold bg-[var(--bg-surface-val)] hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={pinLoading || !pinValue}
                                    className="flex-1 px-4 py-3 rounded-xl bg-[#0066FF] hover:bg-blue-700 text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                                >
                                    {pinLoading ? (
                                        <RefreshCw size={16} className="animate-spin" />
                                    ) : (
                                        <>Verify & Proceed <Check size={16} /></>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
