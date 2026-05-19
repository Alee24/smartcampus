import { Shield, QrCode, Clock, CheckCircle, ArrowRight, Smartphone, Lock, BarChart3, Bell, UserCheck, Activity, Database, Zap } from 'lucide-react'
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

    const features = [
        {
            icon: <Shield size={24} />,
            title: "Access Governance",
            description: "Enterprise-grade gate control using biometric facial recognition and encrypted QR identity tokens."
        },
        {
            icon: <Activity size={24} />,
            title: "Precision Attendance",
            description: "Automated session tracking with GPS geofencing and real-time ledger updates for academic integrity."
        },
        {
            icon: <Database size={24} />,
            title: "Fleet Intelligence",
            description: "Complete logistics management for campus vehicles, featuring live tracking and automated trip logging."
        },
        {
            icon: <Zap size={24} />,
            title: "Predictive Analytics",
            description: "AI-driven occupancy forecasting and security alert systems powered by neural network monitoring."
        }
    ]

    const platformHighlights = [
        "Biometric Facial Authentication",
        "Encrypted Access Control",
        "Vehicle Fleet Management",
        "Real-time Security Dashboards",
        "Automated Academic Attendance",
        "Cloud-Scale Infrastructure"
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
                                <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center">
                                    <Shield className="text-white" size={20} />
                                </div>
                            )}
                            <span className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                                {companySettings.company_name}
                            </span>
                        </div>
                        <button
                            onClick={() => setShowVerification(false)}
                            className="px-6 py-2 rounded-lg border border-[var(--border-color)] text-[var(--text-primary)] font-semibold hover:bg-[var(--bg-primary)] transition-all"
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
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] selection:bg-primary-500/30">
            {/* Professional Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/95 backdrop-blur-md border-b border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        {companySettings.logo_url ? (
                            <div className="w-9 h-9 bg-white/10 dark:bg-white/5 backdrop-blur-sm rounded-lg p-1.5 flex items-center justify-center overflow-hidden border border-[var(--border-color)]">
                                <img src={companySettings.logo_url} alt="Logo" className="w-full h-full object-contain" />
                            </div>
                        ) : (
                            <div className="w-9 h-9 rounded-lg bg-black flex items-center justify-center">
                                <Shield className="text-white" size={18} />
                            </div>
                        )}
                        <span className="text-xl font-bold tracking-tighter uppercase">
                            {companySettings.company_name}
                        </span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
                        <button onClick={() => setShowVerification(true)} className="hover:text-primary-600 transition-colors">Verification</button>
                        <button onClick={() => window.location.href = '/gate-pass/entry'} className="hover:text-primary-600 transition-colors">Self Service</button>
                        <a href="https://www.kkdes.co.ke" className="hover:text-primary-600 transition-colors">Infrastructure</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onGetStarted}
                            className="px-6 py-2 rounded-lg bg-black text-white text-sm font-bold hover:bg-gray-800 transition-all shadow-lg shadow-black/10"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero: Focused & High-Impact */}
            <section className="relative pt-44 pb-32 px-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[500px] bg-primary-500/5 rounded-full blur-[120px] pointer-events-none" />
                
                <div className="max-w-7xl mx-auto relative">
                    <div className="max-w-3xl">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-50 border border-primary-100 text-primary-700 text-[11px] font-bold uppercase tracking-widest mb-8">
                            Enterprise Campus Operating System
                        </div>
                        <h1 className="text-6xl lg:text-7xl font-bold mb-8 leading-[1.05] tracking-tight">
                            The standard for <br />
                            <span className="text-primary-600">Secure Campus</span> <br />
                            Operations.
                        </h1>
                        <p className="text-xl text-[var(--text-secondary)] mb-10 leading-relaxed max-w-2xl">
                            Deploy a unified intelligence layer for security governance, academic attendance, and fleet logistics. Engineered for modern institutions requiring precision and scale.
                        </p>
                        
                        <div className="flex flex-wrap gap-4">
                            <button
                                onClick={onGetStarted}
                                className="px-8 py-4 rounded-xl bg-black text-white font-bold hover:bg-gray-800 transition-all flex items-center gap-3 shadow-xl shadow-black/20"
                            >
                                Access Control Center <ArrowRight size={18} />
                            </button>
                            <button 
                                onClick={() => setShowVerification(true)}
                                className="px-8 py-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-surface)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-all flex items-center gap-2"
                            >
                                <UserCheck size={18} /> Verify Credentials
                            </button>
                        </div>

                        <div className="mt-16 flex items-center gap-12 border-t border-[var(--border-color)] pt-12">
                            <div>
                                <div className="text-3xl font-bold">100%</div>
                                <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Audit Reliability</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold">2ms</div>
                                <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Neural Latency</div>
                            </div>
                            <div>
                                <div className="text-3xl font-bold">Live</div>
                                <div className="text-[11px] text-[var(--text-secondary)] uppercase font-bold tracking-wider mt-1">Fleet Tracking</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Capabilities */}
            <section className="py-32 px-6 bg-[var(--bg-surface)] border-y border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-8">
                        <div className="max-w-2xl">
                            <h2 className="text-4xl font-bold mb-4">Functional Capabilities</h2>
                            <p className="text-[var(--text-secondary)] text-lg">
                                A integrated ecosystem designed to automate critical infrastructure workflows.
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <div className="w-12 h-1 bg-primary-600 rounded-full" />
                            <div className="w-4 h-1 bg-gray-200 rounded-full" />
                            <div className="w-4 h-1 bg-gray-200 rounded-full" />
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                className="group p-8 rounded-2xl bg-[var(--bg-primary)] border border-[var(--border-color)] hover:border-primary-500/50 hover:shadow-2xl hover:shadow-primary-500/5 transition-all duration-500"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-6 group-hover:bg-primary-600 group-hover:text-white transition-colors duration-500">
                                    {feature.icon}
                                </div>
                                <h3 className="text-lg font-bold mb-3">{feature.title}</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Integration & Compliance */}
            <section className="py-32 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-20 items-center">
                        <div className="order-2 lg:order-1">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                                    <Smartphone className="text-primary-600 mb-6" size={28} />
                                    <h4 className="font-bold mb-2">Native Integration</h4>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Seamless deployment across iOS, Android, and Desktop environments.</p>
                                </div>
                                <div className="p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] mt-8">
                                    <Lock className="text-primary-600 mb-6" size={28} />
                                    <h4 className="font-bold mb-2">Security Compliance</h4>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Multi-factor identity management and AES-256 data encryption.</p>
                                </div>
                                <div className="p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                                    <BarChart3 className="text-primary-600 mb-6" size={28} />
                                    <h4 className="font-bold mb-2">Real-time Audits</h4>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Instant logging of all campus movements for complete accountability.</p>
                                </div>
                                <div className="p-8 rounded-2xl border border-[var(--border-color)] bg-[var(--bg-surface)] mt-8">
                                    <Bell className="text-primary-600 mb-6" size={28} />
                                    <h4 className="font-bold mb-2">Dynamic Alerts</h4>
                                    <p className="text-xs text-[var(--text-secondary)] leading-relaxed">Automated notification engine for security and academic events.</p>
                                </div>
                            </div>
                        </div>

                        <div className="order-1 lg:order-2">
                            <h2 className="text-4xl font-bold mb-8 leading-tight">
                                Engineered for <br />
                                <span className="text-primary-600">Educational Excellence.</span>
                            </h2>
                            <p className="text-lg text-[var(--text-secondary)] mb-10 leading-relaxed">
                                Gatepass Intelligence replaces fragmented legacy systems with a single, high-performance platform for institutional governance.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-6 gap-x-12">
                                {platformHighlights.map((highlight, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <CheckCircle className="text-primary-600 flex-shrink-0" size={18} />
                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{highlight}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Implementation CTA */}
            <section className="py-24 px-6 border-t border-[var(--border-color)] bg-black text-white">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl md:text-5xl font-bold mb-8">
                        Modernize your campus <br />infrastructure today.
                    </h2>
                    <p className="text-lg text-gray-400 mb-12 max-w-2xl mx-auto">
                        Connect with our engineering team to deploy the Gatepass Ecosystem at your institution.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button
                            onClick={onGetStarted}
                            className="px-10 py-4 rounded-lg bg-primary-600 text-white font-bold hover:bg-primary-700 transition-all shadow-xl shadow-primary-600/20"
                        >
                            Initialize Portal
                        </button>
                        <button className="px-10 py-4 rounded-lg border border-gray-800 text-gray-400 font-bold hover:bg-gray-900 transition-all">
                            Technical Documentation
                        </button>
                    </div>
                </div>
            </section>

            {/* Minimalist Footer */}
            <footer className="py-12 px-6 border-t border-[var(--border-color)] bg-[var(--bg-surface)]">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8 text-[var(--text-secondary)] text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <Shield size={14} />
                        <span>GATEPASS INTELLIGENCE &copy; {new Date().getFullYear()}</span>
                    </div>
                    
                    <div className="flex gap-8">
                        <a href="/privacy" className="hover:text-primary-600 transition-colors">Privacy Infrastructure</a>
                        <a href="/terms" className="hover:text-primary-600 transition-colors">Terms of Service</a>
                        <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-bold">KKDES ENGINEERING</a>
                    </div>
                </div>
            </footer>
        </div>
    )
}
