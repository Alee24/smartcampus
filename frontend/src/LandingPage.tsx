import { 
    Shield, QrCode, Clock, CheckCircle, ArrowRight, Smartphone, Lock, BarChart3, Bell, 
    UserCheck, Activity, Database, Zap, Phone, ShieldAlert, Award, Sliders, Server, 
    User, Video, Megaphone, HelpCircle, Key, KeyRound, Check, RefreshCw, Nfc,
    Building, Users, Truck, Box, Calendar, TrendingUp, AlertTriangle, Cpu, Layers, 
    Globe, FileText, Terminal, Settings, Radio, Eye, LogOut, MapPin, UserX, CheckCircle2, Sparkles
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
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

    // Interactive States for Redesign
    const [hoveredNode, setHoveredNode] = useState<string | null>('guard')
    const [activeDemoTab, setActiveDemoTab] = useState<string>('analytics')
    const [activeIndustry, setActiveIndustry] = useState<string>('universities')
    const [visitorPassType, setVisitorPassType] = useState<'visitor' | 'vehicle'>('visitor')
    
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
        { id: 'student', label: 'Students', icon: <Users size={18} />, x: 100, y: 80, color: 'text-blue-400', hoverBg: 'bg-blue-950/40 border-blue-500/50' },
        { id: 'staff', label: 'Staff & Faculty', icon: <UserCheck size={18} />, x: 260, y: 70, color: 'text-indigo-400', hoverBg: 'bg-indigo-950/40 border-indigo-500/50' },
        { id: 'visitor', label: 'Visitors', icon: <User size={18} />, x: 340, y: 180, color: 'text-cyan-400', hoverBg: 'bg-cyan-950/40 border-cyan-500/50' },
        { id: 'vehicle', label: 'Vehicles', icon: <Truck size={18} />, x: 300, y: 310, color: 'text-emerald-400', hoverBg: 'bg-emerald-950/40 border-emerald-500/50' },
        { id: 'asset', label: 'Assets', icon: <Box size={18} />, x: 180, y: 350, color: 'text-teal-400', hoverBg: 'bg-teal-950/40 border-teal-500/50' },
        { id: 'event', label: 'Events', icon: <Calendar size={18} />, x: 60, y: 290, color: 'text-purple-400', hoverBg: 'bg-purple-950/40 border-purple-500/50' },
        { id: 'building', label: 'Facilities', icon: <Building size={18} />, x: 40, y: 170, color: 'text-pink-400', hoverBg: 'bg-pink-950/40 border-pink-500/50' },
        { id: 'guard', label: 'Security Team', icon: <Shield size={18} />, x: 180, y: 220, color: 'text-cyan-400', hoverBg: 'bg-cyan-950/40 border-cyan-500/50' }
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
            <div className="min-h-screen bg-[#050816] text-white selection:bg-blue-500/30 font-sans">
                {/* CSS Custom Background & Grid Overlay */}
                <style>{`
                    .custom-grid {
                        background-size: 40px 40px;
                        background-image: 
                            linear-gradient(to right, rgba(255, 255, 255, 0.02) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.02) 1px, transparent 1px);
                    }
                    .neon-glow {
                        box-shadow: 0 0 40px rgba(0, 102, 255, 0.15);
                    }
                `}</style>
                <div className="absolute inset-0 custom-grid opacity-30 pointer-events-none" />
                
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[#0D1324]/80 backdrop-blur-xl border-b border-white/10">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {companySettings.logo_url ? (
                                <div className="w-10 h-10 bg-white/5 rounded-xl p-1.5 flex items-center justify-center border border-white/10">
                                    <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(0,102,255,0.4)]">
                                    <Shield className="text-white" size={20} />
                                </div>
                            )}
                            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                                {companySettings.company_name}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowVerification(false)}
                            className="px-6 py-2.5 rounded-xl border border-white/10 text-sm font-semibold bg-white/5 hover:bg-white/10 hover:border-white/20 transition-all focus:ring-2 focus:ring-blue-500 outline-none"
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
        <div className="min-h-screen bg-[#050816] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
            {/* Inline CSS styles for keyframes & premium animations */}
            <style>{`
                @keyframes grid-glow {
                    0% { opacity: 0.2; }
                    50% { opacity: 0.45; }
                    100% { opacity: 0.2; }
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
                        linear-gradient(to right, rgba(0, 102, 255, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(0, 102, 255, 0.05) 1px, transparent 1px);
                    animation: grid-glow 8s ease-in-out infinite;
                }
                .glow-radial {
                    background: radial-gradient(circle at center, rgba(0, 102, 255, 0.15) 0%, transparent 60%);
                }
                .glass-card {
                    background: rgba(13, 19, 36, 0.65);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                    border: 1px solid rgba(255, 255, 255, 0.07);
                }
                .glass-card-hover:hover {
                    background: rgba(13, 19, 36, 0.8);
                    border-color: rgba(0, 102, 255, 0.35);
                    box-shadow: 0 10px 30px -10px rgba(0, 102, 255, 0.25);
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

            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050816]/75 backdrop-blur-xl border-b border-white/5 transition-all duration-300">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companySettings.logo_url ? (
                            <div className="w-10 h-10 bg-white/5 rounded-xl p-1.5 flex items-center justify-center border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                                <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-10 h-10 rounded-xl bg-[#0066FF] flex items-center justify-center shadow-[0_0_15px_rgba(0,102,255,0.5)]">
                                <Shield className="text-white" size={20} />
                            </div>
                        )}
                        <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                            {companySettings.company_name} <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/25 text-[#00D4FF] ml-1.5 uppercase">Enterprise</span>
                        </span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[#AAB4D6]">
                        <button onClick={handleIdVerificationTab} className="hover:text-white transition-colors focus:outline-none flex items-center gap-1.5 font-semibold text-[#00D4FF]">
                            <Key size={14} /> ID Verification
                        </button>
                        <button onClick={() => window.location.href = '/gate-pass/entry'} className="hover:text-white transition-colors focus:outline-none flex items-center gap-1.5">
                            <Sliders size={14} /> Self Service Portal
                        </button>
                        <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5">
                            <Radio size={14} /> Technical Support
                        </a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#00D4FF] hover:from-[#0052cc] hover:to-[#00b2d8] text-white text-sm font-bold transition-all shadow-[0_4px_20px_rgba(0,102,255,0.3)] hover:shadow-[0_4px_25px_rgba(0,102,255,0.55)] focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            Sign In to Portal
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative min-h-screen pt-32 pb-20 px-6 flex items-center overflow-hidden">
                <div className="absolute inset-0 security-grid opacity-40 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[70%] glow-radial pointer-events-none" />
                
                <div className="max-w-7xl mx-auto relative z-10 w-full">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7 text-left">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00FFC8] text-xs font-bold uppercase tracking-widest mb-6">
                                <Sparkles size={14} className="text-[#00FFC8] animate-pulse" /> Advanced Campus Identity Engine
                            </div>
                            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 leading-[1.08] tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-350 bg-clip-text text-transparent">
                                The Future of <br className="hidden md:inline" />
                                <span className="bg-gradient-to-r from-[#0066FF] via-[#00D4FF] to-[#00FFC8] bg-clip-text text-transparent">Smart Access</span> & <br />
                                Campus Intelligence.
                            </h1>
                            <p className="text-base md:text-lg text-[#AAB4D6] mb-8 leading-relaxed max-w-2xl">
                                Transform security, attendance, visitor management, fleet operations, inventory control, event access, and asset tracking with a unified QR, NFC, and Analytics-powered platform.
                            </p>
                            
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={onGetStarted}
                                    className="px-8 py-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#00D4FF] hover:from-[#0052cc] hover:to-[#00b2d8] text-white font-bold transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(0,102,255,0.3)] hover:shadow-[0_0_35px_rgba(0,102,255,0.5)] transform hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    Schedule Demo <ArrowRight size={18} />
                                </button>
                                <button 
                                    onClick={handleIdVerificationTab}
                                    className="px-8 py-4 rounded-xl border border-white/10 bg-[#0D1324]/50 text-white font-bold hover:bg-[#0D1324]/80 transition-all flex items-center gap-2 hover:border-blue-500/30 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <Video size={18} className="text-[#00FFC8]" /> Watch Platform Tour
                                </button>
                            </div>

                            {/* Trust Indicators */}
                            <div className="mt-12 pt-8 border-t border-white/5 flex flex-wrap gap-x-8 gap-y-4">
                                <div className="flex items-center gap-2 text-xs font-bold text-[#AAB4D6] uppercase tracking-wider">
                                    <CheckCircle size={14} className="text-[#00FFC8]" /> 100% Digital
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-[#AAB4D6] uppercase tracking-wider">
                                    <Activity size={14} className="text-[#00FFC8]" /> Real-Time Monitoring
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-[#AAB4D6] uppercase tracking-wider">
                                    <Shield size={14} className="text-[#00FFC8]" /> Enterprise Security
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-[#AAB4D6] uppercase tracking-wider">
                                    <Server size={14} className="text-[#00FFC8]" /> Cloud Managed
                                </div>
                                <div className="flex items-center gap-2 text-xs font-bold text-[#AAB4D6] uppercase tracking-wider">
                                    <Nfc size={14} className="text-[#00FFC8]" /> QR & NFC Enabled
                                </div>
                            </div>
                        </div>

                        {/* Interactive Credentials Showcases */}
                        <div className="lg:col-span-5 relative">
                            {/* Floating Analytics Widget Mockup */}
                            <div className="absolute -top-8 -left-8 z-20 float-anim p-4 rounded-xl bg-[#0D1324]/80 border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-green-500/10 text-[#00E676] border border-green-500/20">
                                    <TrendingUp size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#AAB4D6] uppercase block font-semibold">Live Threat Matrix</span>
                                    <span className="text-sm font-black text-white">0 Flags Detected</span>
                                </div>
                            </div>

                            <div className="absolute -bottom-8 -right-4 z-20 float-anim [animation-delay:2s] p-4 rounded-xl bg-[#0D1324]/80 border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/10 text-[#00D4FF] border border-blue-500/20">
                                    <Activity size={20} className="animate-pulse" />
                                </div>
                                <div>
                                    <span className="text-[10px] text-[#AAB4D6] uppercase block font-semibold">NFC Sync Traffic</span>
                                    <span className="text-sm font-black text-white">2.8k Taps/min</span>
                                </div>
                            </div>

                            <div className="glass-card rounded-3xl p-6 relative overflow-hidden shadow-2xl border-white/10">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[100px] pointer-events-none" />
                                
                                <h3 className="text-lg font-black mb-4 flex items-center gap-2 bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent">
                                    <Cpu size={18} className="text-[#00FFC8]" /> Zero-Hardware Credentials
                                </h3>
                                <p className="text-xs text-[#AAB4D6] mb-6 leading-relaxed">
                                    We replace expensive legacy gate readers with responsive mobile networks. Experience dynamic IDs, micro-NFC rings, and virtual scanning logs.
                                </p>

                                <div className="space-y-6">
                                    {/* 3D Smart Card Mockup */}
                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Contactless Smart ID Card</span>
                                            <span className="text-[9px] text-[#00FFC8] font-mono font-bold tracking-widest">(Hover to Flip Card)</span>
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

                                    {/* 3D Smart NFC Ring */}
                                    <div className="border-t border-white/5 pt-4">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-xs font-bold text-white uppercase tracking-wider">Wearable NFC Ring</span>
                                            <span className="text-[9px] text-[#00D4FF] font-bold uppercase tracking-wider">(Contactless Tap Active)</span>
                                        </div>
                                        <div className="relative w-full h-20 flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-[#00D4FF] animate-[spin_10s_linear_infinite] flex items-center justify-center relative shadow-[0_0_20px_rgba(0,212,255,0.15)]">
                                                <div className="w-11 h-11 rounded-full border border-[#00FFC8] bg-blue-500/10 flex items-center justify-center animate-pulse">
                                                    <Activity className="text-[#00FFC8]" size={16} />
                                                </div>
                                                <div className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-[#00FFC8] rounded-full animate-ping"></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Platform Visualization */}
            <section className="py-24 px-6 bg-[#0D1324]/40 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00D4FF] text-xs font-bold uppercase tracking-widest mb-4">
                            <Radio size={12} className="animate-pulse" /> Core Infrastructure Map
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4">
                            Interactive Platform Visualization
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            Hover over any node below to monitor live check-ins, security logs, and asset movements in our connected ecosystem.
                        </p>
                    </div>

                    <div className="grid lg:grid-cols-12 gap-8 items-center max-w-6xl mx-auto">
                        {/* Interactive Network Diagram */}
                        <div className="lg:col-span-7 relative flex items-center justify-center min-h-[400px] glass-card rounded-3xl p-6 border-white/5 overflow-hidden">
                            {/* Visual background grid inside mapping tool */}
                            <div className="absolute inset-0 security-grid opacity-20 pointer-events-none" />

                            <svg className="w-[380px] h-[380px] z-10 relative" viewBox="0 0 400 400">
                                {/* SVG Lines connecting peripheral nodes to the Center Hub */}
                                {nodes.filter(n => n.id !== 'guard').map(n => (
                                    <line
                                        key={n.id}
                                        x1={180}
                                        y1={220}
                                        x2={n.x}
                                        y2={n.y}
                                        stroke={hoveredNode === n.id ? '#00FFC8' : '#0066FF'}
                                        strokeWidth={hoveredNode === n.id ? '2' : '1'}
                                        strokeOpacity={hoveredNode === n.id ? '0.8' : '0.25'}
                                        className={hoveredNode === n.id ? 'line-flow' : ''}
                                    />
                                ))}

                                {/* Central Access Core node */}
                                <circle cx={180} cy={220} r="32" fill="#050816" stroke="#0066FF" strokeWidth="2" className="pulse-ring" />
                                <circle cx={180} cy={220} r="28" fill="#0D1324" stroke="#00D4FF" strokeWidth="2" />
                                <foreignObject x={168} y={208} width={24} height={24}>
                                    <div className="text-[#00FFC8] flex items-center justify-center w-full h-full animate-pulse">
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
                                                fill="#0D1324" 
                                                stroke={isActive ? "#00FFC8" : "#0066FF"} 
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

                        {/* Interactive Data Panel (updates dynamically based on hovered node) */}
                        <div className="lg:col-span-5 flex flex-col gap-6">
                            {hoveredNode && nodeDetails[hoveredNode] ? (
                                <div className="glass-card rounded-3xl p-6 border-blue-500/20 shadow-2xl relative transition-all duration-500">
                                    <div className="absolute top-4 right-4 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#00FFC8]/10 text-[#00FFC8] text-[9px] font-mono font-bold uppercase">
                                        <span className="w-1.5 h-1.5 rounded-full bg-[#00FFC8] animate-ping"></span>
                                        {nodeDetails[hoveredNode].status}
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-1">{nodeDetails[hoveredNode].title}</h3>
                                    <span className="text-xs font-bold text-[#00D4FF] block mb-4">{nodeDetails[hoveredNode].stat}</span>
                                    <p className="text-xs text-[#AAB4D6] leading-relaxed mb-6">{nodeDetails[hoveredNode].desc}</p>
                                    
                                    <div className="space-y-2.5">
                                        {nodeDetails[hoveredNode].metrics.map((m, idx) => (
                                            <div key={idx} className="flex items-center gap-2 text-xs font-semibold text-white">
                                                <CheckCircle2 size={14} className="text-[#00E676] flex-shrink-0" />
                                                <span>{m}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="glass-card rounded-3xl p-6 border-white/5 text-center text-[#AAB4D6] min-h-[200px] flex items-center justify-center">
                                    Hover over any node in the security grid to trace its log stream.
                                </div>
                            )}

                            {/* Simulated Live Terminal Feed */}
                            <div className="glass-card rounded-3xl p-5 border-white/5 bg-black/45 font-mono text-left">
                                <div className="flex justify-between items-center mb-3 pb-2 border-b border-white/5">
                                    <div className="flex items-center gap-2">
                                        <Terminal size={14} className="text-[#00FFC8]" />
                                        <span className="text-[10px] uppercase font-bold text-[#AAB4D6] tracking-wider">Live System Logs</span>
                                    </div>
                                    <span className="text-[8px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase font-bold tracking-widest animate-pulse">LEDGER SYNCING</span>
                                </div>
                                <div className="space-y-1.5 h-[110px] overflow-y-hidden text-[10px] text-slate-355">
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

            {/* Pain Point Section */}
            <section className="py-24 px-6 bg-[#050816] relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-[#FF5252] text-xs font-bold uppercase tracking-widest mb-4">
                            <AlertTriangle size={12} /> Institutional Vulnerability Report
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4">
                            Traditional Gate Systems Are Failing Modern Institutions
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            Paper logs, manual vetting, and standalone security gates are not just slow—they invite liabilities, theft, and security breaches.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                        {/* Pain Card 1 */}
                        <div className="glass-card rounded-2xl p-6 border-red-500/20 flex flex-col justify-between hover:border-red-500/40 transition-all duration-300">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#FF5252] border border-red-500/20 flex items-center justify-center mb-4">
                                    <FileText size={18} />
                                </div>
                                <h4 className="text-base font-bold text-white mb-2">Manual Visitor Registers</h4>
                                <p className="text-xs text-[#AAB4D6] leading-relaxed">
                                    Unreadable guest books provide zero verification. They are impossible to audit and vulnerable to forgery or theft of privacy data.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Audit Liability</span>
                                <span className="text-xs font-black text-[#FF5252]">100% Paper Dependent</span>
                            </div>
                        </div>

                        {/* Pain Card 2 */}
                        <div className="glass-card rounded-2xl p-6 border-red-500/20 flex flex-col justify-between hover:border-red-500/40 transition-all duration-300">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#FF5252] border border-red-500/20 flex items-center justify-center mb-4">
                                    <UserX size={18} />
                                </div>
                                <h4 className="text-base font-bold text-white mb-2">Fake Attendance Records</h4>
                                <p className="text-xs text-[#AAB4D6] leading-relaxed">
                                    Students or employees bypass registries. Hand-signed lists create proxy check-ins and audit inaccuracies for the registrar.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Fraud Margin</span>
                                <span className="text-xs font-black text-[#FF5252]">18% Attendance Leakage</span>
                            </div>
                        </div>

                        {/* Pain Card 3 */}
                        <div className="glass-card rounded-2xl p-6 border-red-500/20 flex flex-col justify-between hover:border-red-500/40 transition-all duration-300">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#FF5252] border border-red-500/20 flex items-center justify-center mb-4">
                                    <ShieldAlert size={18} />
                                </div>
                                <h4 className="text-base font-bold text-white mb-2">Unauthorized Gate Entry</h4>
                                <p className="text-xs text-[#AAB4D6] leading-relaxed">
                                    Undetected gate tailgating goes unrecorded, leaving administration fully blind to unrecognized individuals wandering campus grounds.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Intrusion Risk</span>
                                <span className="text-xs font-black text-[#FF5252]">High Vulnerability</span>
                            </div>
                        </div>

                        {/* Pain Card 4 */}
                        <div className="glass-card rounded-2xl p-6 border-red-500/20 flex flex-col justify-between hover:border-red-500/40 transition-all duration-300">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#FF5252] border border-red-500/20 flex items-center justify-center mb-4">
                                    <Box size={18} />
                                </div>
                                <h4 className="text-base font-bold text-white mb-2">Lost Assets & Asset Theft</h4>
                                <p className="text-xs text-[#AAB4D6] leading-relaxed">
                                    Valuable laboratory and administrative equipment is checked out on paper receipts, creating a huge loss margin from untraced items.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Yearly Loss</span>
                                <span className="text-xs font-black text-[#FF5252]">Avg $24k Lost Equipment</span>
                            </div>
                        </div>

                        {/* Pain Card 5 */}
                        <div className="glass-card rounded-2xl p-6 border-red-500/20 flex flex-col justify-between hover:border-red-500/40 transition-all duration-300">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#FF5252] border border-red-500/20 flex items-center justify-center mb-4">
                                    <Truck size={18} />
                                </div>
                                <h4 className="text-base font-bold text-white mb-2">Poor Fleet Visibility</h4>
                                <p className="text-xs text-[#AAB4D6] leading-relaxed">
                                    Institutional shuttle locations and driver schedules are entirely unlogged, leading to fuel leakage and unoptimized route delays.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Fleet Waste</span>
                                <span className="text-xs font-black text-[#FF5252]">No Route Audit Logs</span>
                            </div>
                        </div>

                        {/* Pain Card 6 */}
                        <div className="glass-card rounded-2xl p-6 border-red-500/20 flex flex-col justify-between hover:border-red-500/40 transition-all duration-300">
                            <div>
                                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-[#FF5252] border border-red-500/20 flex items-center justify-center mb-4">
                                    <Clock size={18} />
                                </div>
                                <h4 className="text-base font-bold text-white mb-2">Slow Emergency Response</h4>
                                <p className="text-xs text-[#AAB4D6] leading-relaxed">
                                    During crisis lockdowns, administrators cannot verify who is currently on campus, causing dangerous delays in marshalling drills.
                                </p>
                            </div>
                            <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center">
                                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">Safety Risk</span>
                                <span className="text-xs font-black text-[#FF5252]">Fatal Delay Margin</span>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Solution Section */}
            <section className="py-24 px-6 bg-[#0D1324]/40 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00FFC8] text-xs font-bold uppercase tracking-widest mb-4">
                            <Sparkles size={12} /> The Intelligent Alternative
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4">
                            One Intelligent Platform. Unlimited Operational Visibility.
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            Smart Access integrates all aspects of campus intelligence, automating operations and protecting parameters under a unified cloud ledger.
                        </p>
                    </div>

                    {/* Solutions grid */}
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Attendance Module */}
                        <div className="glass-card glass-card-hover rounded-3xl p-6 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-[#0066FF] border border-blue-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(0,102,255,0.3)] transition-all duration-300">
                                <Activity size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Smart Attendance</h3>
                            <p className="text-xs text-[#AAB4D6] leading-relaxed mb-4">
                                Dynamic class codes, local geofencing parameters, and tap stickers verify presence instantly, reducing administrative paperwork.
                            </p>
                            <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-wider">QR & NFC Integrated</span>
                        </div>

                        {/* Visitor Module */}
                        <div className="glass-card glass-card-hover rounded-3xl p-6 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all duration-300">
                                <UserCheck size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Visitor Management</h3>
                            <p className="text-xs text-[#AAB4D6] leading-relaxed mb-4">
                                Issue timed guest credentials, streamline pre-registration logs, and send automated notifications when visitors pass security.
                            </p>
                            <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-wider">SMS Alerts Built In</span>
                        </div>

                        {/* Fleet Module */}
                        <div className="glass-card glass-card-hover rounded-3xl p-6 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all duration-300">
                                <Truck size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Fleet Tracking</h3>
                            <p className="text-xs text-[#AAB4D6] leading-relaxed mb-4">
                                Route analytics, geofence violations, fuel usage trackers, and bus schedule verifications streamed to the central console.
                            </p>
                            <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-wider">Live Route Sync</span>
                        </div>

                        {/* Asset Tracking Module */}
                        <div className="glass-card glass-card-hover rounded-3xl p-6 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all duration-300">
                                <Box size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Asset Management</h3>
                            <p className="text-xs text-[#AAB4D6] leading-relaxed mb-4">
                                Protect equipment logs, audit hardware lifecycles, and check out lab instruments using smart transponders.
                            </p>
                            <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-wider">Anti-Theft Geofences</span>
                        </div>

                        {/* Inventory Module */}
                        <div className="glass-card glass-card-hover rounded-3xl p-6 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(168,85,247,0.3)] transition-all duration-300">
                                <Database size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Inventory Control</h3>
                            <p className="text-xs text-[#AAB4D6] leading-relaxed mb-4">
                                Keep track of stock procurement schedules, generate alerts when limits are crossed, and audit warehouses digitially.
                            </p>
                            <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-wider">Auto Procurement</span>
                        </div>

                        {/* Analytics Module */}
                        <div className="glass-card glass-card-hover rounded-3xl p-6 transition-all duration-300 group">
                            <div className="w-12 h-12 rounded-2xl bg-pink-500/10 text-pink-400 border border-pink-500/20 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(236,72,153,0.3)] transition-all duration-300">
                                <BarChart3 size={20} />
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Access Control & Analytics</h3>
                            <p className="text-xs text-[#AAB4D6] leading-relaxed mb-4">
                                Real-time heatmaps, security logs, incident dashboards, and trend projections built for campus operations teams.
                            </p>
                            <span className="text-[10px] text-[#00D4FF] font-bold uppercase tracking-wider">Real-time Command Hub</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Advanced Analytics Command Center */}
            <section className="py-24 px-6 bg-[#050816] relative overflow-hidden">
                <div className="absolute inset-0 security-grid opacity-30 pointer-events-none" />
                
                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00D4FF] text-xs font-bold uppercase tracking-widest mb-4">
                            <Sliders size={12} /> Command Intelligence
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4">
                            Advanced Analytics Command Center
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            A futuristic enterprise security dashboard giving management complete visual command over every gate, building, and asset.
                        </p>
                    </div>

                    {/* Simulated Command Center Grid */}
                    <div className="glass-card rounded-3xl p-6 border-white/10 shadow-2xl bg-black/45 max-w-5xl mx-auto overflow-hidden">
                        {/* Mock Dashboard Headers */}
                        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/5 pb-4 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-2.5 h-2.5 rounded-full bg-[#00E676] animate-ping" />
                                <div>
                                    <h4 className="text-xs font-bold uppercase text-white tracking-wider">HQ Operations Console</h4>
                                    <span className="text-[10px] font-mono text-[#AAB4D6]">Gatepass Node-01 | Latency 12ms</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 text-xs font-mono">
                                <span className="text-[#00D4FF]">SYSTEM STABLE</span>
                                <span className="text-[#AAB4D6]">|</span>
                                <span className="text-[#00FFC8]">99.98% UP</span>
                            </div>
                        </div>

                        {/* Interactive Graph / Visual Mock Widgets */}
                        <div className="grid md:grid-cols-3 gap-6">
                            {/* Widget 1: Attendance Trends */}
                            <div className="p-4 rounded-2xl bg-[#0D1324]/60 border border-white/5 text-left">
                                <h5 className="text-[10px] uppercase font-bold text-[#AAB4D6] mb-3 tracking-widest">Attendance Flow Rate</h5>
                                <div className="h-24 flex items-end justify-between gap-1 border-b border-white/10 pb-1">
                                    <div className="w-full bg-blue-500/20 h-[30%] rounded-t" />
                                    <div className="w-full bg-blue-500/20 h-[45%] rounded-t" />
                                    <div className="w-full bg-blue-500/30 h-[60%] rounded-t" />
                                    <div className="w-full bg-blue-500/40 h-[80%] rounded-t" />
                                    <div className="w-full bg-[#00D4FF] h-[95%] rounded-t relative">
                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#00FFC8] rounded-full animate-ping" />
                                    </div>
                                    <div className="w-full bg-blue-500/50 h-[70%] rounded-t" />
                                    <div className="w-full bg-blue-500/30 h-[55%] rounded-t" />
                                </div>
                                <div className="flex justify-between items-center mt-3">
                                    <span className="text-[10px] text-[#AAB4D6]">08:00</span>
                                    <span className="text-[10px] font-bold text-white">8.9k Checked In</span>
                                    <span className="text-[10px] text-[#AAB4D6]">12:00</span>
                                </div>
                            </div>

                            {/* Widget 2: Security Incidents */}
                            <div className="p-4 rounded-2xl bg-[#0D1324]/60 border border-white/5 text-left">
                                <h5 className="text-[10px] uppercase font-bold text-[#AAB4D6] mb-3 tracking-widest">Perimeter Threat Risk</h5>
                                <div className="flex items-center justify-between mb-4">
                                    <div>
                                        <span className="text-2xl font-black text-white">0.02</span>
                                        <span className="text-[10px] text-green-400 font-bold ml-1">SAFE LEVEL</span>
                                    </div>
                                    <ShieldAlert size={28} className="text-[#00E676] animate-pulse" />
                                </div>
                                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden">
                                    <div className="bg-gradient-to-r from-emerald-500 to-[#00FFC8] h-full w-[15%]" />
                                </div>
                                <p className="text-[9px] text-[#AAB4D6] mt-3 leading-relaxed">
                                    Real-time perimeter monitoring indicates zero unauthorized logins or tailgating flags in the past 24 hours.
                                </p>
                            </div>

                            {/* Widget 3: Asset Occupancy */}
                            <div className="p-4 rounded-2xl bg-[#0D1324]/60 border border-white/5 text-left">
                                <h5 className="text-[10px] uppercase font-bold text-[#AAB4D6] mb-3 tracking-widest">Active Device Ecosystem</h5>
                                <div className="space-y-2.5">
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className="text-[#AAB4D6]">Active Gate Scanners</span>
                                        <span className="text-white font-bold">14 Guards Online</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className="text-[#AAB4D6]">NFC Readers Connected</span>
                                        <span className="text-white font-bold">48 Nodes Online</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs font-mono">
                                        <span className="text-[#AAB4D6]">Telemetry Refresh Rate</span>
                                        <span className="text-[#00FFC8] font-bold">0.8s intervals</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Visual Scanning effect line */}
                        <div className="w-full bg-gradient-to-r from-transparent via-[#0066FF]/20 to-transparent h-0.5 mt-6 relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-24 h-full bg-[#00FFC8] animate-[scanline_3s_linear_infinite]" />
                        </div>
                    </div>
                </div>
            </section>

            {/* Industries Section */}
            <section className="py-24 px-6 bg-[#0D1324]/40 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00D4FF] text-xs font-bold uppercase tracking-widest mb-4">
                            <Globe size={12} /> Target Verticals
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4">
                            Tailored Sector Operational Solutions
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            Designed to integrate into diverse ecosystems. Discover how Smart Access secures and automates operations for your sector.
                        </p>
                    </div>

                    {/* Sector tab selectors */}
                    <div className="flex flex-wrap justify-center gap-3 mb-10 max-w-4xl mx-auto">
                        {[
                            { id: 'universities', label: 'Universities', icon: <Building size={16} /> },
                            { id: 'schools', label: 'High Schools & Academies', icon: <Users size={16} /> },
                            { id: 'hospitals', label: 'Hospitals & Medical Centers', icon: <Activity size={16} /> },
                            { id: 'corporate', label: 'Corporate Office Towers', icon: <Sliders size={16} /> },
                            { id: 'residential', label: 'Residential Communities', icon: <Lock size={16} /> },
                            { id: 'events', label: 'Expos & Conferences', icon: <Calendar size={16} /> }
                        ].map((ind) => (
                            <button
                                key={ind.id}
                                onClick={() => setActiveIndustry(ind.id)}
                                className={`px-5 py-2.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-2 outline-none ${
                                    activeIndustry === ind.id 
                                        ? 'bg-gradient-to-r from-[#0066FF] to-[#00D4FF] text-white border-transparent shadow-[0_4px_15px_rgba(0,102,255,0.25)]' 
                                        : 'border-white/10 bg-[#0D1324]/40 text-[#AAB4D6] hover:bg-[#0D1324]/80 hover:text-white'
                                }`}
                            >
                                {ind.icon}
                                {ind.label}
                            </button>
                        ))}
                    </div>

                    {/* Tailored Use Case Box */}
                    <div className="glass-card rounded-3xl p-8 border-white/10 max-w-4xl mx-auto text-left relative overflow-hidden transition-all duration-500">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-bl-[160px] pointer-events-none" />
                        
                        {activeIndustry === 'universities' && (
                            <div>
                                <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-2">
                                    <Building className="text-[#00FFC8]" /> Higher Education Infrastructure
                                </h3>
                                <p className="text-sm text-[#AAB4D6] leading-relaxed mb-6">
                                    Secure campus gates, log hostel check-ins, automate classroom attendance registers, track library assets, and streamline shuttle routes through one single interface.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Impact metric</span>
                                        <span className="text-lg font-black text-white">85% Faster Student Access</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Cost reduction</span>
                                        <span className="text-lg font-black text-white">Zero Hardware Scanners Required</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeIndustry === 'schools' && (
                            <div>
                                <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-2">
                                    <Users className="text-[#00FFC8]" /> K-12 Student Safety Systems
                                </h3>
                                <p className="text-sm text-[#AAB4D6] leading-relaxed mb-6">
                                    Allow parent check-in codes, notify teachers instantly on student arrival, secure pickup gates, and manage fleet buses for student transport safety.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Alerting</span>
                                        <span className="text-lg font-black text-white">Instant Parent SMS Notifications</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Safety index</span>
                                        <span className="text-lg font-black text-white">100% Authorized Pickup Logs</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeIndustry === 'hospitals' && (
                            <div>
                                <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-2">
                                    <Activity className="text-[#00FFC8]" /> Medical Center Compliance
                                </h3>
                                <p className="text-sm text-[#AAB4D6] leading-relaxed mb-6">
                                    Secure restricted pharmacy vaults, track high-value medical inventory checkout logs, log shift attendance, and control visitor flow in critical wards.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Compliance</span>
                                        <span className="text-lg font-black text-white">Full HIPAA Audit Trails</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Loss Prevention</span>
                                        <span className="text-lg font-black text-white">Drug Vault NFC Access Logs</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeIndustry === 'corporate' && (
                            <div>
                                <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-2">
                                    <Sliders className="text-[#00FFC8]" /> Enterprise Office Workspace
                                </h3>
                                <p className="text-sm text-[#AAB4D6] leading-relaxed mb-6">
                                    Integrate with corporate active directories, track employee check-in timelines, secure confidential server rooms, and issue digital passes to contractor visits.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Efficiency</span>
                                        <span className="text-lg font-black text-white">Seamless LDAP / SSO Sync</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Vetting</span>
                                        <span className="text-lg font-black text-white">Auto-registered Guest Badges</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeIndustry === 'residential' && (
                            <div>
                                <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-2">
                                    <Lock className="text-[#00FFC8]" /> Gated Estate Perimeter Safety
                                </h3>
                                <p className="text-sm text-[#AAB4D6] leading-relaxed mb-6">
                                    Residents generate visitor entry codes from their app, security guards scan passes at access points, and vehicle plate logs check in automatically.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Vetting</span>
                                        <span className="text-lg font-black text-white">No Unrecognized Intruders</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Speed</span>
                                        <span className="text-lg font-black text-white">Automated Barrier Gates</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeIndustry === 'events' && (
                            <div>
                                <h3 className="text-2xl font-black mb-3 text-white flex items-center gap-2">
                                    <Calendar className="text-[#00FFC8]" /> High-Volume Event Ticketing
                                </h3>
                                <p className="text-sm text-[#AAB4D6] leading-relaxed mb-6">
                                    Validate ticket entry codes at expo gates using standard smartphones, monitor crowd check-in speed metrics, and control VIP backstage zones.
                                </p>
                                <div className="grid sm:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Throughput</span>
                                        <span className="text-lg font-black text-white">Up to 60 Scans / min per gate</span>
                                    </div>
                                    <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                        <span className="text-[10px] text-[#00D4FF] font-bold block uppercase mb-1">Analytics</span>
                                        <span className="text-lg font-black text-white">Live Crowd Density Gauges</span>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Comparison Table */}
            <section className="py-24 px-6 bg-[#050816] relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00D4FF] text-xs font-bold uppercase tracking-widest mb-4">
                            <Sliders size={12} /> Matrix Breakdown
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4">
                            Traditional Gate System VS Smart Access
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            Discover how our software-based identity engine completely redefines control metrics against obsolete hardware turnstiles.
                        </p>
                    </div>

                    <div className="max-w-4xl mx-auto overflow-hidden rounded-2xl border border-white/10 glass-card">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="p-4 text-xs font-black uppercase text-white tracking-widest">Access Factor</th>
                                    <th className="p-4 text-xs font-black uppercase text-red-400 tracking-widest">Legacy Systems</th>
                                    <th className="p-4 text-xs font-black uppercase text-[#00FFC8] tracking-widest">Smart Access</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs text-slate-300">
                                <tr>
                                    <td className="p-4 font-bold text-white">Visitor Registries</td>
                                    <td className="p-4 text-red-400 flex items-center gap-1.5"><UserX size={14} /> Manual Paper Logs</td>
                                    <td className="p-4 text-[#00FFC8] font-bold"><CheckCircle2 size={14} className="inline mr-1.5" /> Automated Cloud Logs</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-bold text-white">Intelligence Logs</td>
                                    <td className="p-4 text-red-400 flex items-center gap-1.5"><UserX size={14} /> No Analytics</td>
                                    <td className="p-4 text-[#00FFC8] font-bold"><CheckCircle2 size={14} className="inline mr-1.5" /> Live Dashboards</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-bold text-white">Credential Medium</td>
                                    <td className="p-4 text-red-400 flex items-center gap-1.5"><UserX size={14} /> Expensive Paper/Substrate</td>
                                    <td className="p-4 text-[#00FFC8] font-bold"><CheckCircle2 size={14} className="inline mr-1.5" /> Cloud Digital passes</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-bold text-white">Tracking & Presence</td>
                                    <td className="p-4 text-red-400 flex items-center gap-1.5"><UserX size={14} /> No tracking</td>
                                    <td className="p-4 text-[#00FFC8] font-bold"><CheckCircle2 size={14} className="inline mr-1.5" /> Real-time active mapping</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-bold text-white">Threat Mitigation</td>
                                    <td className="p-4 text-red-400 flex items-center gap-1.5"><UserX size={14} /> Reactive Vetting</td>
                                    <td className="p-4 text-[#00FFC8] font-bold"><CheckCircle2 size={14} className="inline mr-1.5" /> Predictive Security Vetting</td>
                                </tr>
                                <tr>
                                    <td className="p-4 font-bold text-white">Ecosystem Width</td>
                                    <td className="p-4 text-red-400 flex items-center gap-1.5"><UserX size={14} /> Single Purpose Gate log</td>
                                    <td className="p-4 text-[#00FFC8] font-bold"><CheckCircle2 size={14} className="inline mr-1.5" /> Unified Smart Core</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>

            {/* Security & Infrastructure Section */}
            <section className="py-24 px-6 bg-[#0D1324]/40 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center max-w-5xl mx-auto">
                        <div className="text-left">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00FFC8] text-xs font-bold uppercase tracking-widest mb-4">
                                <Lock size={12} /> Military-Grade Ledger
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-6">
                                Enterprise-Grade Security Built In
                            </h2>
                            
                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00FFC8] font-bold text-xs mt-1">✓</div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">AES-256 Data Encryption</h4>
                                        <p className="text-xs text-[#AAB4D6] mt-0.5">All visitor clearance keys and user identity directories are encrypted at rest and in transit.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00FFC8] font-bold text-xs mt-1">✓</div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Granular Role-Based Access (RBAC)</h4>
                                        <p className="text-xs text-[#AAB4D6] mt-0.5">Limit console dashboard visibility settings dynamically based on specific guard or registrar staff clearances.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00FFC8] font-bold text-xs mt-1">✓</div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white">Compliance & Multi-Tenant Separation</h4>
                                        <p className="text-xs text-[#AAB4D6] mt-0.5">Strict database partitions isolate tenant data, ensuring compliant logging parameters.</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Rotating Security Shield SVG */}
                        <div className="flex items-center justify-center relative min-h-[260px]">
                            <div className="absolute w-48 h-48 rounded-full border border-blue-500/10 pulse-ring" />
                            <div className="absolute w-36 h-36 rounded-full border border-[#00FFC8]/10 pulse-ring [animation-delay:1.5s]" />
                            <div className="relative z-10 w-28 h-28 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-900 border border-white/10 flex items-center justify-center shadow-[0_0_40px_rgba(0,102,255,0.4)] animate-[slow-pulse_4s_ease-in-out_infinite]">
                                <Shield size={44} className="text-[#00FFC8]" />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Interactive Live Demo Tab Sandbox */}
            <section className="py-24 px-6 bg-[#050816] relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00D4FF] text-xs font-bold uppercase tracking-widest mb-4">
                            <Activity size={12} className="animate-pulse" /> Sandbox Environment
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4">
                            Live Interactive Demo Sandbox
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            Click on the operational tabs below to inspect mock console telemetry dashboards in real-time.
                        </p>
                    </div>

                    <div className="max-w-5xl mx-auto flex flex-col gap-6">
                        {/* Tab Headers */}
                        <div className="flex flex-wrap justify-center gap-2 border-b border-white/5 pb-4">
                            {[
                                { id: 'analytics', label: 'Command Analytics', icon: <BarChart3 size={14} /> },
                                { id: 'attendance', label: 'Attendance logs', icon: <Activity size={14} /> },
                                { id: 'visitors', label: 'Visitor Vetting', icon: <UserCheck size={14} /> },
                                { id: 'fleet', label: 'Fleet & Shuttle', icon: <Truck size={14} /> },
                                { id: 'assets', label: 'Asset Tracking', icon: <Box size={14} /> },
                                { id: 'inventory', label: 'Inventory Level', icon: <Database size={14} /> }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveDemoTab(tab.id)}
                                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 outline-none ${
                                        activeDemoTab === tab.id 
                                            ? 'bg-blue-600 text-white shadow-[0_4px_15px_rgba(0,102,255,0.35)]' 
                                            : 'bg-[#0D1324]/60 border border-white/5 text-[#AAB4D6] hover:bg-[#0D1324]/80'
                                    }`}
                                >
                                    {tab.icon}
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Interactive Sandbox Dashboard Screen Container */}
                        <div className="glass-card rounded-3xl p-6 border-white/10 bg-black/40 text-left min-h-[380px] transition-all duration-500">
                            {activeDemoTab === 'analytics' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <BarChart3 className="text-[#00D4FF]" /> System Performance Metrics
                                        </h4>
                                        <span className="text-[10px] text-green-400 font-mono">LIVE UPDATE</span>
                                    </div>
                                    <div className="grid md:grid-cols-4 gap-4">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] text-[#AAB4D6] uppercase font-bold block mb-1">Check-in Latency</span>
                                            <span className="text-xl font-black text-white">0.42s</span>
                                            <span className="text-[9px] text-[#00E676] block mt-1">98% Faster than legacy</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] text-[#AAB4D6] uppercase font-bold block mb-1">Secure Logs Uploaded</span>
                                            <span className="text-xl font-black text-white">142,900</span>
                                            <span className="text-[9px] text-[#00D4FF] block mt-1">Syncing to cloud ledger</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] text-[#AAB4D6] uppercase font-bold block mb-1">Active NFC Nodes</span>
                                            <span className="text-xl font-black text-white">82 Devices</span>
                                            <span className="text-[9px] text-[#00E676] block mt-1">100% Signal Health</span>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <span className="text-[10px] text-[#AAB4D6] uppercase font-bold block mb-1">Threat Level Status</span>
                                            <span className="text-xl font-black text-emerald-400">Zero Flag</span>
                                            <span className="text-[9px] text-[#AAB4D6] block mt-1">Security Grid Clear</span>
                                        </div>
                                    </div>
                                    {/* Mock Analytics Chart */}
                                    <div className="mt-6 p-4 rounded-xl bg-[#0D1324] border border-white/5 h-44 flex items-center justify-center relative">
                                        <div className="absolute inset-0 security-grid opacity-10" />
                                        <svg className="w-full h-full" viewBox="0 0 500 120" preserveAspectRatio="none">
                                            <path 
                                                d="M0,80 Q50,40 100,60 T200,30 T300,90 T400,20 T500,40" 
                                                fill="none" 
                                                stroke="#0066FF" 
                                                strokeWidth="3" 
                                                className="line-flow"
                                            />
                                            <path 
                                                d="M0,80 Q50,40 100,60 T200,30 T300,90 T400,20 T500,40 L500,120 L0,120 Z" 
                                                fill="url(#analytics-grad)" 
                                                opacity="0.15"
                                            />
                                            <defs>
                                                <linearGradient id="analytics-grad" x1="0" y1="0" x2="0" y2="1">
                                                    <stop offset="0%" stopColor="#0066FF" />
                                                    <stop offset="100%" stopColor="transparent" />
                                                </linearGradient>
                                            </defs>
                                        </svg>
                                        <span className="absolute text-[9px] font-mono text-[#AAB4D6] bottom-2 right-4">Telemetry Stream: Access Volumes</span>
                                    </div>
                                </div>
                            )}

                            {activeDemoTab === 'attendance' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <Activity className="text-[#00E676]" /> Classroom Attendance Registers
                                        </h4>
                                        <span className="text-[10px] text-blue-400 font-mono">Geofenced Active</span>
                                    </div>
                                    <div className="space-y-3">
                                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                                <span className="font-bold text-white">CS-302 (Software Engineering)</span>
                                            </div>
                                            <span className="text-[#AAB4D6]">88 / 90 Present (97%)</span>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                                                <span className="font-bold text-white">EE-101 (Circuit Analysis)</span>
                                            </div>
                                            <span className="text-[#AAB4D6]">124 / 130 Present (95%)</span>
                                        </div>
                                        <div className="p-3.5 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                                                <span className="font-bold text-white">ME-404 (Dynamics of Fluids)</span>
                                            </div>
                                            <span className="text-[#AAB4D6]">42 / 50 Present (84%)</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeDemoTab === 'visitors' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <UserCheck className="text-[#00FFC8]" /> Visitor Verification Portal
                                        </h4>
                                        <span className="text-[10px] text-green-400 font-mono">Real-time Background Checks</span>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        {/* Visitor ID Card Simulation */}
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 text-left flex flex-col justify-between">
                                            <div>
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h5 className="text-xs font-bold text-white">VISITOR CLEARANCE CARD</h5>
                                                        <span className="text-[9px] text-[#AAB4D6] font-mono">ID: #VIS-0928</span>
                                                    </div>
                                                    <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 text-[8px] font-mono uppercase">Vetted</span>
                                                </div>
                                                <div className="space-y-2 text-xs">
                                                    <div>
                                                        <span className="text-[#AAB4D6] block text-[9px] uppercase font-bold">Guest Name</span>
                                                        <span className="font-bold text-white">Sarah Jenkins</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-[#AAB4D6] block text-[9px] uppercase font-bold">Host Employee</span>
                                                        <span className="font-bold text-white">Dr. Robert Chen (IT Registry)</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center">
                                                <span className="text-[9px] text-[#AAB4D6]">Checked in: 15:10</span>
                                                <span className="text-[9px] text-green-400 font-bold uppercase tracking-wider">Gate 1 Entry Approved</span>
                                            </div>
                                        </div>

                                        {/* Live Verification Logs */}
                                        <div className="space-y-2">
                                            <h5 className="text-[10px] uppercase font-bold text-[#AAB4D6] tracking-widest mb-1.5">Verification Sequence</h5>
                                            <div className="p-2.5 rounded bg-black/35 font-mono text-[10px] text-[#AAB4D6] border border-white/5">
                                                <span className="text-[#00E676]">✔</span> Background screening check passed
                                            </div>
                                            <div className="p-2.5 rounded bg-black/35 font-mono text-[10px] text-[#AAB4D6] border border-white/5">
                                                <span className="text-[#00E676]">✔</span> QR pass signature integrity verified
                                            </div>
                                            <div className="p-2.5 rounded bg-black/35 font-mono text-[10px] text-[#AAB4D6] border border-white/5">
                                                <span className="text-[#00E676]">✔</span> Host SMS clearance confirmation received
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeDemoTab === 'fleet' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <Truck className="text-[#00D4FF]" /> Fleet Tracking Telemetry
                                        </h4>
                                        <span className="text-[10px] text-green-400 font-mono">Geofenced Active</span>
                                    </div>
                                    <div className="grid md:grid-cols-3 gap-4">
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <h5 className="text-xs font-bold text-white mb-2">Shuttle Bus Alpha</h5>
                                            <div className="space-y-1.5 text-xs text-[#AAB4D6]">
                                                <div>Speed: <span className="text-white font-bold">32 km/h</span></div>
                                                <div>Route: <span className="text-white font-bold">North Gate Loop</span></div>
                                                <div>Status: <span className="text-[#00E676] font-bold">On Schedule</span></div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <h5 className="text-xs font-bold text-white mb-2">Maintenance Van 2</h5>
                                            <div className="space-y-1.5 text-xs text-[#AAB4D6]">
                                                <div>Speed: <span className="text-white font-bold">0 km/h</span></div>
                                                <div>Route: <span className="text-white font-bold">HQ Yard Depot</span></div>
                                                <div>Status: <span className="text-yellow-400 font-bold">Depot Standby</span></div>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-xl bg-white/5 border border-white/5">
                                            <h5 className="text-xs font-bold text-white mb-2">Delivery Truck C</h5>
                                            <div className="space-y-1.5 text-xs text-[#AAB4D6]">
                                                <div>Speed: <span className="text-white font-bold">48 km/h</span></div>
                                                <div>Route: <span className="text-white font-bold">Cargo Block B</span></div>
                                                <div>Status: <span className="text-[#00E676] font-bold">Active Delivery</span></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeDemoTab === 'assets' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <Box className="text-indigo-400" /> Active Asset Tracking Registers
                                        </h4>
                                        <span className="text-[10px] text-green-400 font-mono">RFID sticker verification</span>
                                    </div>
                                    <div className="grid md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-white block">Lab Microscope Set A</span>
                                                    <span className="text-[10px] text-[#AAB4D6]">ID: #AST-9020</span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-bold uppercase text-[9px]">In Lab</span>
                                            </div>
                                            <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex justify-between items-center text-xs">
                                                <div>
                                                    <span className="font-bold text-white block">Registrar Server Enclosure</span>
                                                    <span className="text-[10px] text-[#AAB4D6]">ID: #AST-0028</span>
                                                </div>
                                                <span className="px-2 py-0.5 rounded bg-green-500/10 text-green-400 font-bold uppercase text-[9px]">Locked</span>
                                            </div>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-[#FF5252]/5 border border-[#FF5252]/20 flex items-center gap-4">
                                            <div className="p-3 rounded-xl bg-[#FF5252]/10 text-[#FF5252]">
                                                <AlertTriangle size={24} className="animate-bounce" />
                                            </div>
                                            <div>
                                                <h5 className="text-xs font-bold text-white uppercase mb-1">Asset perimeter Warning</h5>
                                                <p className="text-[11px] text-[#AAB4D6] leading-relaxed">
                                                    Sensor detected Asset #AST-0038 (Laptop Cart 4) moved past Lecture Block boundary logs at 14:02. Alert issued.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {activeDemoTab === 'inventory' && (
                                <div>
                                    <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-3">
                                        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                                            <Database className="text-purple-400" /> Stock & Supply Levels
                                        </h4>
                                        <span className="text-[10px] text-green-400 font-mono">Stock level monitoring</span>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span>Library Card RFID Transponders</span>
                                                <span className="text-[#00E676]">2,400 units (Optimal)</span>
                                            </div>
                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                <div className="bg-green-500 h-full w-[80%]" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span>Smart Access Key Fobs</span>
                                                <span className="text-yellow-400">120 units (Reorder point close)</span>
                                            </div>
                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                <div className="bg-yellow-500 h-full w-[35%]" />
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between text-xs font-bold mb-1">
                                                <span>Guard Handheld Scanners</span>
                                                <span className="text-[#00E676]">18 units (Optimal)</span>
                                            </div>
                                            <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                                <div className="bg-green-500 h-full w-[90%]" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 px-6 bg-[#0D1324]/40 border-y border-white/5 relative">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[#00D4FF] text-xs font-bold uppercase tracking-widest mb-4">
                            <Award size={12} /> Institutional Outcomes
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black bg-gradient-to-b from-white to-slate-200 bg-clip-text text-transparent tracking-tight mb-4 font-sans">
                            Measurable Success with Smart Access
                        </h2>
                        <p className="text-[#AAB4D6] text-sm md:text-base leading-relaxed">
                            Discover how operational leads and registrar heads saved budgets and secured parameters.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
                        {/* Testimonial 1 */}
                        <div className="glass-card rounded-3xl p-6 border-white/10 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300">
                            <p className="text-xs text-[#AAB4D6] italic leading-relaxed mb-6">
                                "Shifting to this digital QR architecture allowed our department to secure all campus entry gates without purchasing hardware scanner pedestals. Guards use normal browser consoles on their phones."
                            </p>
                            <div>
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-[#00D4FF] font-black text-xs">
                                        VC
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">Dr. Elizabeth Vance</h4>
                                        <p className="text-[10px] text-[#AAB4D6]">Vice Chancellor, Technical University</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                                    <span className="text-[9px] text-[#00FFC8] uppercase font-bold font-mono">Performance Metric</span>
                                    <span className="text-sm font-black text-white">80% Faster Check-ins</span>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 2 */}
                        <div className="glass-card rounded-3xl p-6 border-white/10 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300">
                            <p className="text-xs text-[#AAB4D6] italic leading-relaxed mb-6">
                                "Fake attendance and registers were a huge drain on our faculty audits. With localized QR registers and active tag verification, presence reports generate automatically in real-time."
                            </p>
                            <div>
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-[#00D4FF] font-black text-xs">
                                        SD
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">Marcus Brody</h4>
                                        <p className="text-[10px] text-[#AAB4D6]">Director of Security, Apex Academy</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                                    <span className="text-[9px] text-[#00FFC8] uppercase font-bold font-mono">Performance Metric</span>
                                    <span className="text-sm font-black text-white">95% Attendance Accuracy</span>
                                </div>
                            </div>
                        </div>

                        {/* Testimonial 3 */}
                        <div className="glass-card rounded-3xl p-6 border-white/10 flex flex-col justify-between hover:scale-[1.02] transition-all duration-300">
                            <p className="text-xs text-[#AAB4D6] italic leading-relaxed mb-6">
                                "The asset geofencing and smart sticker registry saved us thousands in lost hardware values. The central threat dashboard sends instant alerts to my squad whenever items pass boundaries."
                            </p>
                            <div>
                                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-white/5">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-[#00D4FF] font-black text-xs">
                                        IM
                                    </div>
                                    <div>
                                        <h4 className="text-xs font-bold text-white">Kipchumba K.</h4>
                                        <p className="text-[10px] text-[#AAB4D6]">ICT Systems Lead, Valley Hospital</p>
                                    </div>
                                </div>
                                <div className="mt-4 flex justify-between items-center bg-blue-500/5 border border-blue-500/10 rounded-xl p-3">
                                    <span className="text-[9px] text-[#00FFC8] uppercase font-bold font-mono">Performance Metric</span>
                                    <span className="text-sm font-black text-white">60% Security Improvement</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Final CTA Section */}
            <section className="py-32 px-6 bg-[#050816] relative overflow-hidden text-center border-t border-white/5">
                <div className="absolute inset-0 security-grid opacity-35 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[70%] h-[60%] glow-radial pointer-events-none" />
                
                <div className="max-w-4xl mx-auto relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent tracking-tight mb-6 leading-tight">
                        Ready to Replace Outdated <br />
                        Gate Systems?
                    </h2>
                    <p className="text-base md:text-lg text-[#AAB4D6] mb-10 max-w-2xl mx-auto leading-relaxed">
                        Deploy a single intelligent platform that secures your institution, automates operations, and delivers real-time visibility across every person, vehicle, asset, event, and facility.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#00D4FF] hover:from-[#0052cc] hover:to-[#00b2d8] text-white font-bold transition-all shadow-[0_0_30px_rgba(0,102,255,0.35)] hover:shadow-[0_0_35px_rgba(0,102,255,0.55)] transform hover:-translate-y-0.5 outline-none"
                        >
                            Book a Live Demo
                        </button>
                        <button
                            onClick={handleIdVerificationTab}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-white/10 bg-[#0D1324]/50 hover:bg-[#0D1324]/80 text-[#AAB4D6] hover:text-white font-bold transition-all outline-none"
                        >
                            Talk to an Expert
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-16 px-6 border-t border-white/5 bg-[#050816] transition-colors duration-300">
                <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 mb-12 text-left">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#00FFC8] mb-4">Solutions</h4>
                        <ul className="space-y-2.5 text-xs text-[#AAB4D6] font-medium">
                            <li><span className="hover:text-white transition-colors cursor-pointer">QR Gate Pass Core</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Smart NFC registers</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Geofence Attendance</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Asset telemetry locks</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#00FFC8] mb-4">Industries</h4>
                        <ul className="space-y-2.5 text-xs text-[#AAB4D6] font-medium">
                            <li><span className="hover:text-white transition-colors cursor-pointer">Higher Ed Campuses</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Government compounds</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Corporate parks</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Hospitals & Wards</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#00FFC8] mb-4">Documentation</h4>
                        <ul className="space-y-2.5 text-xs text-[#AAB4D6] font-medium">
                            <li><span className="hover:text-white transition-colors cursor-pointer">System APIs</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Security ledger compliance</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Deployment logs</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Device integrations</span></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-[#00FFC8] mb-4">Company</h4>
                        <ul className="space-y-2.5 text-xs text-[#AAB4D6] font-medium">
                            <li><span className="hover:text-white transition-colors cursor-pointer">About Infrastructure</span></li>
                            <li><span className="hover:text-white transition-colors cursor-pointer">Vulnerability logs</span></li>
                            <li><a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors font-bold text-[#00D4FF]">KKDES ENGINEERING</a></li>
                        </ul>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6 text-[#AAB4D6] text-xs font-semibold">
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-[#00FFC8]" />
                        <span className="uppercase">{companySettings.company_name} PORTAL &copy; {new Date().getFullYear()}</span>
                    </div>
                    
                    <div className="flex gap-8">
                        <a href="/privacy" className="hover:text-white transition-colors">Privacy Infrastructure</a>
                        <a href="/terms" className="hover:text-white transition-colors">Terms of Service</a>
                    </div>
                </div>
            </footer>

            {/* Admin PIN Verification Modal Overlay */}
            {showPinModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in">
                    <div className="w-full max-w-md bg-[#0D1324] border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[100px] pointer-events-none" />
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-[#00D4FF]">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-white text-base">Admin Verification Required</h3>
                                <p className="text-xs text-[#AAB4D6]">Enter administrative access PIN</p>
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
                                    className="w-full px-4 py-3.5 text-center text-3xl tracking-widest font-black bg-[#050816] border border-white/15 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-white font-mono"
                                    autoFocus
                                    required
                                />
                            </div>

                            {pinError && (
                                <p className="text-xs text-red-400 font-bold text-center">{pinError}</p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => { setShowPinModal(false); setPinValue(''); setPinError(''); }}
                                    className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-white font-bold bg-[#0D1324] hover:bg-[#050816] transition-colors focus:ring-2 focus:ring-blue-500 outline-none text-xs"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={pinLoading || !pinValue}
                                    className="flex-1 px-4 py-3 rounded-xl bg-gradient-to-r from-[#0066FF] to-[#00D4FF] hover:from-[#0052cc] hover:to-[#00b2d8] text-white font-bold transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 outline-none text-xs"
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
