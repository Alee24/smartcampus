import { Shield, QrCode, Clock, CheckCircle, ArrowRight, Smartphone, Lock, BarChart3, Bell, UserCheck, Activity, Database, Zap, HeartPulse, Stethoscope, Phone, ShieldAlert, Award } from 'lucide-react'
import { useState, useEffect } from 'react'
import StudentVerification from './StudentVerification'

interface LandingPageProps {
    onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
    const [showVerification, setShowVerification] = useState(false)
    const [companySettings, setCompanySettings] = useState<{ company_name: string, logo_url: string }>({
        company_name: 'Smart Campus Health',
        logo_url: ''
    })

    useEffect(() => {
        fetch('/api/users/public-company-settings')
            .then(res => res.json())
            .then(data => {
                setCompanySettings({
                    company_name: data.company_name || 'Smart Campus Health',
                    logo_url: data.logo_url || ''
                })
            })
            .catch(err => console.error("Failed to fetch company settings", err))
    }, [])

    const medicalServices = [
        {
            icon: <HeartPulse size={24} className="text-teal-600 dark:text-teal-400" />,
            title: "Campus Medical & Wellness Care",
            description: "Access campus clinic resources, check-in for outpatient consultations, and request verified health clearance credentials."
        },
        {
            icon: <Shield size={24} className="text-teal-600 dark:text-teal-400" />,
            title: "Safe Contactless Access",
            description: "Swipe through entry points swiftly and safely using private biometric identity features or dynamic QR codes."
        },
        {
            icon: <Activity size={24} className="text-teal-600 dark:text-teal-400" />,
            title: "Precision Academic Check-ins",
            description: "Log lecture and lab session attendance with integrated class check-ins that protect safety and records."
        },
        {
            icon: <Database size={24} className="text-teal-600 dark:text-teal-400" />,
            title: "University Fleet & Shuttles",
            description: "Track university transit schedules, check active routes, and coordinate medical shuttle services across campus."
        }
    ]

    const securityHighlights = [
        "Encrypted Health & ID Records",
        "24/7 Campus Clinical Support",
        "Contactless Access Points",
        "Real-time Safety Alerting",
        "Secure Self-Service Check-in",
        "Verified Institutional Integrity"
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
                                <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center">
                                    <HeartPulse className="text-white" size={20} />
                                </div>
                            )}
                            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                                {companySettings.company_name}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowVerification(false)}
                            className="px-6 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-primary)] transition-all focus:ring-2 focus:ring-teal-500 outline-none"
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
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-teal-500/30">
            {/* Header / Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companySettings.logo_url ? (
                            <div className="w-9 h-9 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-1.5 flex items-center justify-center overflow-hidden border border-[var(--border-color)]">
                                <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-teal-600 flex items-center justify-center">
                                <HeartPulse className="text-white" size={18} />
                            </div>
                        )}
                        <span className="text-xl font-bold tracking-tight text-teal-600 dark:text-teal-400">
                            {companySettings.company_name}
                        </span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
                        <button onClick={() => setShowVerification(true)} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none">Credentials Check</button>
                        <button onClick={() => window.location.href = '/gate-pass/entry'} className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors focus:outline-none">Self Service</button>
                        <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Emergency Support</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-sm font-bold transition-all shadow-md shadow-teal-500/10 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                            Sign In to Portal
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-40 pb-24 px-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[450px] bg-teal-500/5 rounded-full blur-[100px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto relative">
                    <div className="grid lg:grid-cols-12 gap-12 items-center">
                        <div className="lg:col-span-7">
                            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 text-teal-700 dark:text-teal-300 text-xs font-bold uppercase tracking-wider mb-6">
                                <Stethoscope size={14} className="animate-pulse" /> Unified Health & Access Environment
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-[1.1] tracking-tight">
                                Care-focused safety. <br />
                                <span className="text-teal-600 dark:text-teal-400">Reassuringly simple</span> <br />
                                campus access.
                            </h1>
                            <p className="text-lg text-[var(--text-secondary)] mb-8 leading-relaxed max-w-2xl">
                                Welcome to your modern campus care gate. Access secure health status clearances, verify academic attendance, book clinic appointments, and manage contactless entries through one unified, patient-centric ecosystem.
                            </p>
                            
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={onGetStarted}
                                    className="px-8 py-4 rounded-xl bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold transition-all flex items-center gap-3 shadow-lg shadow-teal-600/20 hover:shadow-teal-600/30 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    Access Medical Portal <ArrowRight size={18} />
                                </button>
                                <button 
                                    onClick={() => setShowVerification(true)}
                                    className="px-8 py-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-all flex items-center gap-2 hover:border-teal-500/30 focus:ring-2 focus:ring-teal-500 outline-none"
                                >
                                    <UserCheck size={18} className="text-teal-600 dark:text-teal-400" /> Verify Credentials
                                </button>
                            </div>

                            <div className="mt-12 flex items-center gap-10 border-t border-[var(--border-color)] pt-8">
                                <div>
                                    <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">100%</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Privacy Compliant</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">24/7</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Medical Response</div>
                                </div>
                                <div>
                                    <div className="text-2xl font-extrabold text-teal-600 dark:text-teal-400">Contactless</div>
                                    <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Access Protocol</div>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Campus Clinic / Alert Panel Mockup */}
                        <div className="lg:col-span-5 bg-[var(--bg-surface)] border border-[var(--border-color)] rounded-3xl p-8 shadow-xl relative overflow-hidden transition-all duration-300 hover:shadow-2xl">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/10 rounded-bl-[100px] pointer-events-none" />
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center">
                                        <HeartPulse className="text-teal-600 dark:text-teal-400" size={20} />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-[var(--text-primary)]">Quick Health Status</h3>
                                        <p className="text-xs text-[var(--text-secondary)]">Live clinic operational details</p>
                                    </div>
                                </div>
                                <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Open Now
                                </span>
                            </div>

                            <div className="space-y-4">
                                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between hover:border-teal-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Stethoscope className="text-teal-600 dark:text-teal-400" size={18} />
                                        <span className="text-sm font-semibold">Active Doctor consultations</span>
                                    </div>
                                    <span className="text-xs text-[var(--text-secondary)] font-medium">Wait: ~5 mins</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between hover:border-teal-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <Phone className="text-teal-600 dark:text-teal-400" size={18} />
                                        <span className="text-sm font-semibold">24hr Wellness Hotline</span>
                                    </div>
                                    <span className="text-xs text-teal-600 dark:text-teal-400 font-bold">Call Enabled</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] flex items-center justify-between hover:border-teal-500/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle className="text-teal-600 dark:text-teal-400" size={18} />
                                        <span className="text-sm font-semibold">Digital clearance status</span>
                                    </div>
                                    <span className="text-xs px-2 py-0.5 rounded bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 font-bold">100% Valid</span>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-[var(--border-color)] text-center">
                                <p className="text-xs text-[var(--text-secondary)] mb-4">Are you experiencing a medical emergency on campus?</p>
                                <a 
                                    href="tel:+254700000000"
                                    className="inline-flex items-center gap-2 text-xs font-bold text-red-600 dark:text-red-400 hover:text-red-700 transition-colors"
                                >
                                    <ShieldAlert size={14} /> Call Campus Emergency Line: +254 700 000 000
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
                        <h2 className="text-3xl md:text-4xl font-bold mb-4">Patient-Centered Campus Services</h2>
                        <p className="text-[var(--text-secondary)] text-lg leading-relaxed">
                            Discover an array of digital utilities engineered to keep our campus community healthy, protected, and moving efficiently.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {medicalServices.map((service, index) => (
                            <div
                                key={index}
                                className="group p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 transition-all duration-300"
                            >
                                <div className="w-12 h-12 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center mb-6 group-hover:bg-teal-600 group-hover:text-white dark:group-hover:bg-teal-500 transition-all duration-300">
                                    {service.icon}
                                </div>
                                <h3 className="text-lg font-bold mb-3 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">{service.title}</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{service.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Patient & Staff Testimonials */}
            <section className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 text-teal-700 dark:text-teal-300 text-[11px] font-bold uppercase tracking-wider mb-4">
                            <Award size={12} /> Testimonials
                        </div>
                        <h2 className="text-3xl md:text-4xl font-bold">Trusted by Students & Care Providers</h2>
                        <p className="text-[var(--text-secondary)] text-base mt-2 max-w-xl mx-auto">
                            Hear how our health clearance and access system transforms daily wellness workflows on campus.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
                        <div className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <p className="text-[var(--text-secondary)] italic leading-relaxed text-sm">
                                "The integration of our medical records and digital gate clearance has streamlined how we verify health passes on campus. It feels safe, modern, and respectful of our time."
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-sm">
                                    EV
                                </div>
                                <div>
                                    <h4 className="font-bold text-sm">Dr. Elizabeth Vance</h4>
                                    <p className="text-[var(--text-secondary)] text-xs">Director of Campus Clinical Services</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-color)] shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                            <p className="text-[var(--text-secondary)] italic leading-relaxed text-sm">
                                "As a student, being able to verify my health credentials online and walk through the gate without carrying physical paperwork is incredibly convenient. The interface is simple and extremely responsive."
                            </p>
                            <div className="mt-6 flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center text-teal-700 dark:text-teal-300 font-bold text-sm">
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

            {/* Why Choose Section & Reassurance list */}
            <section className="py-24 px-6 bg-[var(--bg-surface)] border-t border-[var(--border-color)] transition-colors duration-300">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-16 items-center">
                        <div>
                            <h2 className="text-3xl lg:text-4xl font-bold mb-6 leading-tight">
                                Safeguarding access, <br />
                                <span className="text-teal-600 dark:text-teal-400">protecting your wellness.</span>
                            </h2>
                            <p className="text-base text-[var(--text-secondary)] mb-8 leading-relaxed">
                                Our platform consolidates medical clearance and campus access points to eliminate queues, manual logs, and vulnerabilities. Every decision keeps patient confidentiality and user accessibility at the center.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                {securityHighlights.map((highlight, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <CheckCircle className="text-teal-600 dark:text-teal-400 flex-shrink-0" size={18} />
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-teal-500/30 transition-all">
                                <Smartphone className="text-teal-600 dark:text-teal-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Mobile-First Care</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Check clearances and access clinics on any mobile browser instantly.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-teal-500/30 transition-all mt-6">
                                <Lock className="text-teal-600 dark:text-teal-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Privacy Encrypted</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">All health credentials conform to modern confidentiality regulations.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-teal-500/30 transition-all">
                                <BarChart3 className="text-teal-600 dark:text-teal-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Clinic Analytics</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Enables medical staff to monitor visitor density and waiting lines.</p>
                            </div>
                            <div className="p-6 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-primary)] hover:border-teal-500/30 transition-all mt-6">
                                <Bell className="text-teal-600 dark:text-teal-400 mb-4" size={24} />
                                <h4 className="font-bold text-sm mb-1">Dynamic Pushes</h4>
                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Receive instant notices for health alerts or medical updates.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Call To Action */}
            <section className="py-24 px-6 bg-slate-900 dark:bg-slate-950 text-white border-t border-[var(--border-color)] text-center">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl md:text-5xl font-bold mb-6">
                        Access your health & <br className="hidden sm:inline" />security environment today.
                    </h2>
                    <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto">
                        Sign in to check-in at the medical center, renew gate passes, view routes, or verify check-in logs.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold transition-all shadow-lg shadow-teal-600/20 transform hover:-translate-y-0.5 focus:ring-2 focus:ring-teal-500 outline-none"
                        >
                            Open Access Portal
                        </button>
                        <button
                            onClick={() => setShowVerification(true)}
                            className="w-full sm:w-auto px-8 py-4 rounded-xl border border-slate-700 hover:border-slate-600 bg-slate-800/50 hover:bg-slate-800 text-slate-300 font-bold transition-all focus:ring-2 focus:ring-teal-500 outline-none"
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
                        <HeartPulse size={14} className="text-teal-600 dark:text-teal-400" />
                        <span className="uppercase">{companySettings.company_name} PORTAL &copy; {new Date().getFullYear()}</span>
                    </div>
                    
                    <div className="flex gap-8">
                        <a href="/privacy" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Privacy Infrastructure</a>
                        <a href="/terms" className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors">Terms of Service</a>
                        <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="text-teal-600 dark:text-teal-400 font-bold">KKDES ENGINEERING</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
