import { Shield, QrCode, Clock, CheckCircle, ArrowRight, Smartphone, Lock, BarChart3, Bell, UserCheck, Activity, Database, Zap, Phone, ShieldAlert, Award, Sliders, Server, User, Video, Megaphone, HelpCircle, Key, KeyRound, Check, RefreshCw, Nfc } from 'lucide-react'
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

    const handleIdVerificationTab = () => {
        // Check localstorage for 24 hour authentication expiration
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

    const campusServices = [
        {
            icon: <QrCode size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "100% QR-Based Access",
            description: "No expensive hardware scanners or physical ID card printing needed. Verify gate passes using high-contrast dynamic QR codes."
        },
        {
            icon: <ShieldAlert size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Incident Reporting",
            description: "Allows staff, students, and guards to report safety hazards, file security logs, and report issues instantly."
        },
        {
            icon: <HelpCircle size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Lost & Found Registry",
            description: "A centralized register to search lost belongings, log recovered items, and streamline returns."
        },
        {
            icon: <Megaphone size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "University Notice Board",
            description: "Broadcast announcements, announcements, alerts, and system notices directly to the campus notice board."
        },
        {
            icon: <Video size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Camera Integration",
            description: "Connect and monitor CCTV/IP security cameras directly from the dashboard to verify entrance events."
        },
        {
            icon: <Activity size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Attendance & Schedules",
            description: "Track student classroom attendance automatically using localized mobile logs and dynamic registers."
        }
    ]

    const platformHighlights = [
        "100% QR-Based Identity",
        "Zero Hardware Scanners Required",
        "Runs on Any Connected Phone",
        "Set Up in Minutes",
        "Integrated Security Cameras",
        "Incident & Asset Logs"
    ]

    if (showVerification) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)]">
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/90 backdrop-blur-md border-b border-[var(--border-color)]">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {companySettings.logo_url ? (
                                <div className="w-10 h-10 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-xl p-1.5 flex items-center justify-center overflow-hidden border border-[var(--border-color)]">
                                    <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                                </div>
                            ) : (
                                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
                                    <Shield className="text-white" size={20} />
                                </div>
                            )}
                            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                                {companySettings.company_name}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowVerification(false)}
                            className="px-6 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-primary)] transition-all focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            Return to Portal
                        </button>
                    </div>
                </nav>
                <div className="pt-24">
                    <StudentVerification />
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-blue-500/30">
            {/* Navigation Bar */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companySettings.logo_url ? (
                            <div className="w-9 h-9 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-1.5 flex items-center justify-center overflow-hidden border border-[var(--border-color)]">
                                <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
                                <Shield className="text-white" size={18} />
                            </div>
                        )}
                        <span className="text-xl font-bold tracking-tight text-blue-600 dark:text-blue-400">
                            {companySettings.company_name}
                        </span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
                        <button onClick={handleIdVerificationTab} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none font-bold">ID Verification</button>
                        <button onClick={() => window.location.href = '/gate-pass/entry'} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none">Self Service</button>
                        <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Technical Support</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white text-sm font-bold transition-all shadow-md shadow-blue-500/10 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            Sign In to Portal
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 px-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[450px] bg-blue-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto relative">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-xs font-bold uppercase tracking-wider mb-6">
                                <Zap size={14} className="text-blue-600 dark:text-blue-400" /> Smart NFC & Dynamic QR Access
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-black mb-6 leading-[1.1] tracking-tight">
                                Low-Cost NFC. <br />
                                <span className="text-blue-600 dark:text-blue-400">Dynamic QR Verification</span> <br />
                                with any smartphone.
                            </h1>
                            <p className="text-lg text-[var(--text-secondary)] mb-8 leading-relaxed max-w-2xl">
                                Welcome to the ultimate, zero-friction campus credential ecosystem. By combining high-speed contactless NFC rings, cards, or low-cost stickers with $0 dynamic QR codes, we completely eliminate hardware scanners and card printer expenditures. Setup takes minutes.
                            </p>
                            
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={onGetStarted}
                                    className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold transition-all flex items-center gap-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    Access Operations Center <ArrowRight size={18} />
                                </button>
                                <button 
                                    onClick={handleIdVerificationTab}
                                    className="px-8 py-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-all flex items-center gap-2 hover:border-blue-500/30 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <UserCheck size={18} className="text-blue-600 dark:text-blue-400" /> ID Verification Portal
                                </button>
                            </div>

                            <div className="mt-12 flex items-center gap-10 border-t border-[var(--border-color)] pt-8">
                                <div>
                                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">$0</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Hardware Required</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">Contactless</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">NFC Operations</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">Dynamic</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">QR Generation</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Simulated 3D Elements Showcase */}
                        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[100px] pointer-events-none" />
                            
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-blue-600 dark:text-blue-400">
                                <Activity size={20} /> 3D NFC & QR Showcases
                            </h3>

                            <div className="space-y-8">
                                {/* 3D Student ID Card */}
                                <div>
                                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3 text-center">Interactive 3D Student ID Card (Hover to Flip)</p>
                                    <div className="group w-full max-w-[280px] h-[160px] [perspective:1000px] cursor-pointer mx-auto">
                                        <div className="relative w-full h-full rounded-2xl shadow-xl transition-all duration-700 [transform-style:preserve-3d] group-hover:[transform:rotateY(180deg)]">
                                            {/* Front */}
                                             <div className="absolute inset-0 w-full h-full rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 p-4 text-white flex flex-col justify-between [backface-visibility:hidden] border border-blue-500/20">
                                                 <div className="flex justify-between items-center">
                                                     <span className="text-[10px] font-black tracking-widest uppercase">Smart Campus Card</span>
                                                     <Nfc size={18} className="text-white animate-pulse" />
                                                 </div>
                                                 <div className="flex-1 flex items-center justify-center my-1.5">
                                                     <div className="p-1.5 bg-white/10 rounded-lg backdrop-blur-sm border border-white/20">
                                                         <QrCode size={36} className="text-white" />
                                                     </div>
                                                 </div>
                                                 <div className="mt-1 flex justify-between items-end">
                                                     <div>
                                                         <div className="text-xs font-black tracking-wide truncate max-w-[170px]">{companySettings.company_name}</div>
                                                         <div className="text-[8px] opacity-75 mt-0.5 uppercase tracking-widest font-bold">RFID/NFC ACTIVE</div>
                                                     </div>
                                                     <span className="text-[8px] opacity-50 font-mono">ID: 849A-38C0</span>
                                                 </div>
                                             </div>
                                            {/* Back */}
                                            <div className="absolute inset-0 w-full h-full rounded-2xl bg-slate-900 border border-slate-700 p-4 text-white flex flex-col justify-between [transform:rotateY(180deg)] [backface-visibility:hidden]">
                                                <div className="w-full h-7 bg-slate-800 rounded"></div>
                                                <p className="text-[9px] text-center text-slate-400 leading-normal">
                                                    This pass remains property of the institution. NFC frequency 13.56 MHz.
                                                </p>
                                                <div className="flex justify-between items-center text-[8px] text-slate-500 font-mono">
                                                    <span>ID: 849A-38C0</span>
                                                    <span>VERIFIED 100%</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3D Smart NFC Ring */}
                                <div className="border-t border-[var(--border-color)] pt-6">
                                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3 text-center">Interactive 3D Smart NFC Ring (Rotating Glow)</p>
                                    <div className="relative w-full h-28 flex items-center justify-center">
                                        <div className="w-20 h-20 rounded-full border-4 border-dashed border-cyan-400 animate-[spin_12s_linear_infinite] flex items-center justify-center relative shadow-[0_0_25px_rgba(34,211,238,0.3)]">
                                            <div className="w-14 h-14 rounded-full border-2 border-cyan-500 bg-cyan-500/10 flex items-center justify-center animate-pulse">
                                                <Activity className="text-cyan-400" size={20} />
                                            </div>
                                            <div className="absolute -top-1 -left-1 w-3 h-3 bg-cyan-400 rounded-full animate-ping"></div>
                                        </div>
                                    </div>
                                </div>

                                {/* 3D Dynamic QR Gate Pass */}
                                <div className="border-t border-[var(--border-color)] pt-6">
                                    <p className="text-xs font-bold uppercase tracking-widest text-[var(--text-secondary)] mb-3 text-center">Interactive QR Gate Pass (Tilt Hover Effect)</p>
                                    <div className="group relative w-full max-w-[280px] h-[150px] bg-gradient-to-tr from-slate-950 to-indigo-950 border border-indigo-500/30 rounded-2xl p-4 flex items-center justify-between shadow-2xl transition-all duration-500 hover:scale-[1.03] hover:-rotate-1 hover:border-indigo-400 cursor-pointer mx-auto">
                                        <div className="flex flex-col justify-between h-full">
                                            <div className="text-[10px] font-black text-indigo-400 tracking-wider uppercase">Temporary Gate Pass</div>
                                            <div className="w-16 h-16 bg-white rounded-lg p-1.5 shadow-md border border-indigo-500/20">
                                                <QrCode className="w-full h-full text-indigo-950" />
                                            </div>
                                            <div className="text-[8px] text-slate-400">Dynamic refresh active</div>
                                        </div>
                                        <div className="flex flex-col items-end justify-between h-full">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                                            <div className="text-right">
                                                <div className="text-[10px] font-bold text-white uppercase">Authorized</div>
                                                <div className="text-[8px] text-slate-400">Code: RU-2900X</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Benefits Grid Section */}
            <section className="py-24 px-6 bg-[var(--bg-surface)] border-y border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16 max-w-3xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Low-Cost QR & NFC Benefits</h2>
                        <p className="text-[var(--text-secondary)] text-base">
                            Deploy high-end identity verification services for a fraction of the cost of legacy access systems.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                        {/* Benefits for Institution */}
                        <div className="p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-blue-500/20 transition-all shadow-sm">
                            <h3 className="text-xl font-bold mb-6 text-blue-600 dark:text-blue-400 flex items-center gap-2">
                                <Server size={22} /> For the Institution & Admins
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">✓</div>
                                    <div>
                                        <span className="font-bold text-sm text-[var(--text-primary)] block">$0 Digital QR Code Generation</span>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Generate unlimited secure virtual entry passes without spending a cent on plastic card substrates.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">✓</div>
                                    <div>
                                        <span className="font-bold text-sm text-[var(--text-primary)] block">Eliminate Hardware Reader Expenditures</span>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Use existing staff/guard smartphones as high-speed gate scanners, eliminating dedicated gate turnstiles.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold text-xs">✓</div>
                                    <div>
                                        <span className="font-bold text-sm text-[var(--text-primary)] block">Cents-on-the-Dollar NFC Stickers</span>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Convert legacy IDs into smart cards instantly by embedding ultra-affordable adhesive NFC micro-transponders.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>

                        {/* Benefits for Students */}
                        <div className="p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-blue-500/20 transition-all shadow-sm">
                            <h3 className="text-xl font-bold mb-6 text-teal-650 dark:text-teal-400 flex items-center gap-2">
                                <User size={22} /> For Students & Faculty
                            </h3>
                            <ul className="space-y-4">
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">✓</div>
                                    <div>
                                        <span className="font-bold text-sm text-[var(--text-primary)] block">Instant Tap-and-Go NFC Access</span>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">Access campus gates, shuttle buses, and classroom registers with a simple tap of an NFC ring or sticker.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">✓</div>
                                    <div>
                                        <span className="font-bold text-sm text-[var(--text-primary)] block">Offline Smart Card Integration</span>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">NFC smart cards operate even when the student's personal smartphone has no cellular coverage or battery charge.</p>
                                    </div>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="mt-1 flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-950/50 flex items-center justify-center text-teal-600 dark:text-teal-400 font-bold text-xs">✓</div>
                                    <div>
                                        <span className="font-bold text-sm text-[var(--text-primary)] block">Zero Replacement Costs for QR Passes</span>
                                        <p className="text-xs text-[var(--text-secondary)] mt-0.5">If a virtual pass is lost or a phone is changed, a new secure QR gate pass is generated instantly in the cloud for free.</p>
                                    </div>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Services Section with Professional Icon Backdrops */}
            <section className="py-24 px-6 bg-[var(--bg-primary)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-3xl mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Integrated Campus Functionalities</h2>
                        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                            A completely QR & NFC based ecosystem designed to eliminate hardware procurement. Manage campus security, report incidents, and track classroom registers.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {campusServices.map((service, index) => (
                            <div
                                key={index}
                                className="group p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 transform hover:-translate-y-1"
                            >
                                {/* Professional Icon Backdrops */}
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950/50 border border-blue-100 dark:border-indigo-900/30 flex items-center justify-center mb-6 group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all duration-300">
                                    {service.icon}
                                </div>
                                <h3 className="text-lg font-bold mb-3 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{service.title}</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{service.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="py-24 px-6 bg-[var(--bg-surface)] border-t border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-4">
                            <Award size={12} /> Testimonials
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold">Trusted by Campus Teams & Students</h2>
                        <p className="text-[var(--text-secondary)] text-base mt-2 max-w-xl mx-auto">
                            Hear how our lightweight QR framework removes logistical friction and saves hardware budgets.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <div className="p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <p className="text-[var(--text-secondary)] italic leading-relaxed text-sm">
                                "By shifting to this QR-based security architecture, our department saved thousands in card printing and hardware scanning equipment. Our guards only use their standard mobile phones connected to the web."
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                                    EV
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">Prof. Elizabeth Vance</h4>
                                    <p className="text-[var(--text-secondary)] text-xs">Director of Campus Administration</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <p className="text-[var(--text-secondary)] italic leading-relaxed text-sm">
                                "Having our digital IDs as dynamic QR codes on our phones has made campus life completely frictionless. We can check attendance registers, receive notice board alerts, and pass gates instantly."
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-sm">
                                    MM
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">Marcus Mwangi</h4>
                                    <p className="text-[var(--text-secondary)] text-xs">Civil Engineering Student</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Detail list */}
            <section className="py-24 px-6 bg-[var(--bg-primary)] border-t border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                                QR & NFC access, <br />
                                <span className="text-blue-600 dark:text-blue-400">integrated campus security.</span>
                            </h2>
                            <p className="text-base text-[var(--text-secondary)] mb-8 leading-relaxed">
                                Our platform consolidates gate check-ins, security incident reporting, lost & found logs, notice boards, and surveillance feeds into a unified framework with zero setup barriers.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                {platformHighlights.map((highlight, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <CheckCircle className="text-blue-600 dark:text-blue-400 flex-shrink-0" size={18} />
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-blue-500/30 transition-all">
                                <Smartphone className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Mobile Web-Based</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Runs smoothly on any standard mobile browser with internet connection.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-blue-500/30 transition-all mt-6">
                                <Lock className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Secure & Encrypted</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">QR codes reset dynamically to prevent token copying and unauthorized entries.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-blue-500/30 transition-all">
                                <BarChart3 className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Detailed Logs</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Generate instant spreadsheets of visitors, vehicle traffic, and attendance logs.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] hover:border-blue-500/30 transition-all mt-6">
                                <Bell className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Real-time Alerting</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Automatic push notices alert security leads when incidents are submitted.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call To Action */}
            <section className="py-24 px-6 bg-slate-900 dark:bg-slate-950 text-white border-t border-[var(--border-color)] text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">
                        Access your campus portal <br className="hidden sm:inline" />and resources today.
                    </h2>
                    <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
                        Sign in to monitor gate entries, check class schedules, coordinate shuttle trips, or manage campus assets.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-lg shadow-blue-600/20 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            Open Access Portal
                        </button>
                        <button
                            onClick={handleIdVerificationTab}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold transition-all focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            ID Verification Portal
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-12 px-6 border-t border-[var(--border-color)] bg-[var(--bg-surface)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[var(--text-secondary)] text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <Shield size={14} className="text-blue-600 dark:text-blue-400" />
                        <span className="uppercase">{companySettings.company_name} PORTAL &copy; {new Date().getFullYear()}</span>
                    </div>
                    
                    <div className="flex gap-8">
                        <a href="/privacy" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy Infrastructure</a>
                        <a href="/terms" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Terms of Service</a>
                        <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold">KKDES ENGINEERING</a>
                    </div>
                </div>
            </footer>

            {/* Admin PIN Verification Modal Overlay */}
            {showPinModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                    <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-6 shadow-2xl relative overflow-hidden animate-in zoom-in-95">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[100px] pointer-events-none" />
                        
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <KeyRound size={20} />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)]">Admin Verification Required</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Enter administrative access PIN</p>
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
                                    className="w-full px-4 py-3 text-center text-2xl tracking-widest font-bold bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-[var(--text-primary)]"
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
                                    className="flex-1 px-4 py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-colors focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={pinLoading || !pinValue}
                                    className="flex-1 px-4 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md shadow-blue-500/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed focus:ring-2 focus:ring-blue-500 outline-none text-sm"
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
