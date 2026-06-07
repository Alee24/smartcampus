import { Shield, QrCode, Clock, CheckCircle, ArrowRight, Smartphone, Lock, BarChart3, Bell, UserCheck, Activity, Database, Zap, Phone, ShieldAlert, Award, Sliders, Server, User } from 'lucide-react'
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

    const campusServices = [
        {
            icon: <Shield size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Identity & Gate Governance",
            description: "Contactless gate authorization powered by secure biometrics and high-contrast dynamic QR credentials."
        },
        {
            icon: <Activity size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Precision Academic Check-ins",
            description: "Automated session attendance tracking with real-time registers for students and lecturers."
        },
        {
            icon: <Database size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Transit & Fleet Operations",
            description: "Full coordination of campus shuttle schedules, routes, trip manifests, and passenger counters."
        },
        {
            icon: <Sliders size={24} className="text-blue-600 dark:text-blue-400" />,
            title: "Campus Asset Management",
            description: "Track institutional inventory, manage equipment handovers, and generate detailed condition reports."
        }
    ]

    const platformHighlights = [
        "Biometric Identity Verification",
        "Dynamic Encrypted Gate QR Codes",
        "Automated Lecture Attendance Logs",
        "Transit Fleet & Route Monitoring",
        "Asset Handover Tracking Hub",
        "Unified Administration Dashboard"
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
                        <button onClick={() => setShowVerification(true)} className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors focus:outline-none">Credentials Check</button>
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
                                <Zap size={14} className="text-blue-600 dark:text-blue-400" /> Unified Campus Operations Environment
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">
                                Integrated security. <br />
                                <span className="text-blue-600 dark:text-blue-400">Reassuringly simple</span> <br />
                                campus operations.
                            </h1>
                            <p className="text-lg text-[var(--text-secondary)] mb-8 leading-relaxed max-w-2xl">
                                Deploy a unified intelligence layer for institutional safety. Monitor gate access, track classroom attendance registers, coordinate transit logistics, and manage campus assets in real time on one centralized, high-performance platform.
                            </p>
                            
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={onGetStarted}
                                    className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 text-white font-bold transition-all flex items-center gap-3 shadow-lg shadow-blue-600/20 hover:shadow-blue-600/30 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    Access Operations Center <ArrowRight size={18} />
                                </button>
                                <button 
                                    onClick={() => setShowVerification(true)}
                                    className="px-8 py-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-all flex items-center gap-2 hover:border-blue-500/30 focus:ring-2 focus:ring-blue-500 outline-none"
                                >
                                    <UserCheck size={18} className="text-blue-600 dark:text-blue-400" /> Verify Credentials
                                </button>
                            </div>

                            <div className="mt-12 flex items-center gap-10 border-t border-[var(--border-color)] pt-8">
                                <div>
                                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">100%</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Audit Reliability</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">Real-Time</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Activity Tracking</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">Contactless</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Gate Verification</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Stats Dashboard Mockup */}
                        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 rounded-bl-[100px] pointer-events-none" />
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/30 flex items-center justify-center">
                                        <Activity className="text-blue-600 dark:text-blue-400" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-primary)]">System Metrics</h3>
                                        <p className="text-xs text-[var(--text-secondary)]">Live operational status</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Active
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Shield className="text-blue-600 dark:text-blue-400" size={18} />
                                        <span className="text-sm font-semibold">Security Gate Logs</span>
                                    </div>
                                    <span className="text-xs text-[var(--text-secondary)] font-medium">Auto logging: Active</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Database className="text-blue-600 dark:text-blue-400" size={18} />
                                        <span className="text-sm font-semibold">Transit Fleet Tracking</span>
                                    </div>
                                    <span className="text-xs text-blue-600 dark:text-blue-400 font-bold">Trips Enabled</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between hover:border-blue-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="text-blue-600 dark:text-blue-400" size={18} />
                                        <span className="text-sm font-semibold">User Verification State</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-bold">Secure</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
                                <p className="text-xs text-[var(--text-secondary)] mb-4">Need immediate security assistance on campus?</p>
                                <a 
                                    href="tel:+254700000000"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 transition-colors"
                                >
                                    <ShieldAlert size={14} /> Contact Campus Command Center: +254 700 000 000
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Services Section */}
            <section className="py-24 px-6 bg-[var(--bg-surface)] border-y border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="max-w-3xl mb-16">
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Integrated Campus Functionalities</h2>
                        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                            Discover an array of digital utilities engineered to keep our campus secure, connected, and operating with maximum efficiency.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {campusServices.map((service, index) => (
                            <div
                                key={index}
                                className="group p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-blue-500 transition-all duration-300">
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
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 text-blue-700 dark:text-blue-300 text-[11px] font-bold uppercase tracking-wider mb-4">
                            <Award size={12} /> Testimonials
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold">Trusted by Campus Teams & Students</h2>
                        <p className="text-[var(--text-secondary)] text-base mt-2 max-w-xl mx-auto">
                            Hear how our unified operations system transforms daily campus access and management tasks.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <div className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <p className="text-[var(--text-secondary)] italic leading-relaxed text-sm">
                                "Integrating biometric gate control and academic registers has dramatically streamlined our campus safety operations. It provides clear visibility, reduces manual logs, and keeps records secure."
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

                        <div className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <p className="text-[var(--text-secondary)] italic leading-relaxed text-sm">
                                "Being able to check my attendance record and use contactless gate check-ins has made my daily commute completely seamless. The interface is clean, intuitive, and extremely fast."
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
            <section className="py-24 px-6 bg-[var(--bg-surface)] border-t border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                                Safeguarding access, <br />
                                <span className="text-blue-600 dark:text-blue-400">streamlining operations.</span>
                            </h2>
                            <p className="text-base text-[var(--text-secondary)] mb-8 leading-relaxed">
                                Our platform consolidates gate entry point data, attendance registers, assets, and fleets into a single command dashboard to eliminate administrative overhead, paperwork, and security vulnerabilities.
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
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-blue-500/30 transition-all">
                                <Smartphone className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Mobile-First Check-in</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Scan QR codes and register entries on mobile devices instantly.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-blue-500/30 transition-all mt-6">
                                <Lock className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Security Standards</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">All check-in parameters are fully encrypted and log-audited.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-blue-500/30 transition-all">
                                <BarChart3 className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Detailed Analytics</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">View traffic volumes, vehicle types, and transit loads at a glance.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-blue-500/30 transition-all mt-6">
                                <Bell className="text-blue-600 dark:text-blue-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Instant Notifications</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Broadcast announcements and system notifications in real time.</p>
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
                            onClick={() => setShowVerification(true)}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold transition-all focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            Verify Credential Status
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
        </div>
    )
}
