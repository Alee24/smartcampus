import { Shield, QrCode, Clock, CheckCircle, ArrowRight, Smartphone, Lock, BarChart3, Bell, UserCheck } from 'lucide-react'
import { useState } from 'react'
import StudentVerification from './StudentVerification'

interface LandingPageProps {
    onGetStarted: () => void
}

export default function LandingPage({ onGetStarted }: LandingPageProps) {
    const [activeFeature, setActiveFeature] = useState(0)
    const [showVerification, setShowVerification] = useState(false)

    const features = [
        {
            icon: <Shield size={32} />,
            title: "Advanced Security",
            description: "Multi-layer security with facial recognition, QR codes, and real-time monitoring to keep your campus safe."
        },
        {
            icon: <QrCode size={32} />,
            title: "Smart Attendance",
            description: "Automated attendance tracking with anti-cheating measures and instant reporting for lecturers."
        },
        {
            icon: <Clock size={32} />,
            title: "Live Timetable",
            description: "Dynamic class scheduling with real-time room occupancy and automated session generation."
        },
        {
            icon: <BarChart3 size={32} />,
            title: "AI Camera Intel",
            description: "AI-powered camera monitoring with people counting, motion detection, and predictive occupancy stats."
        }
    ]

    const benefits = [
        "Facial Recognition Technology",
        "QR Code Access Control",
        "Real-time Notifications",
        "Vehicle Management",
        "Automated Reporting",
        "LDAP & SSO Integration"
    ]

    // If verification modal is open, show it
    if (showVerification) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)]">
                <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
                    <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center">
                                <Shield className="text-white" size={24} />
                            </div>
                            <span className="text-2xl font-bold bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                                Smart Campus
                            </span>
                        </div>
                        <button
                            onClick={() => setShowVerification(false)}
                            className="px-6 py-2.5 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-all"
                        >
                            Back to Home
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
        <div className="min-h-screen bg-[var(--bg-primary)] overflow-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-surface)]/80 backdrop-blur-xl border-b border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[image:var(--gradient-primary)] flex items-center justify-center">
                            <Shield className="text-white" size={24} />
                        </div>
                        <span className="text-2xl font-bold bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                            Smart Campus
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setShowVerification(true)}
                            className="px-6 py-2.5 rounded-xl border-2 border-primary-600 text-primary-600 font-bold hover:bg-primary-50 transition-all flex items-center gap-2"
                        >
                            <UserCheck size={18} />
                            Verify Student ID
                        </button>
                        <button
                            onClick={() => window.location.href = '/gate-pass/entry'}
                            className="px-6 py-2.5 rounded-xl border-2 border-primary-600 text-primary-600 font-bold hover:bg-primary-50 transition-all flex items-center gap-2"
                        >
                            <QrCode size={18} />
                            Self Check-in
                        </button>
                        <button
                            onClick={onGetStarted}
                            className="px-6 py-2.5 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold hover:opacity-90 transition-all transform hover:scale-105 shadow-lg shadow-primary-500/30"
                        >
                            Sign In
                        </button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 px-6">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-secondary/10 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />

                <div className="max-w-7xl mx-auto relative z-10">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div className="animate-fade-in">
                            <div className="inline-block px-4 py-2 rounded-full bg-accent/10 text-accent font-bold text-sm mb-6">
                                🎓 Next-Generation Campus Security
                            </div>
                            <h1 className="text-5xl lg:text-6xl font-extrabold mb-6 leading-tight">
                                Secure Your Campus with{' '}
                                <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                                    AI-Powered
                                </span>{' '}
                                Intelligence
                            </h1>
                            <p className="text-xl text-[var(--text-secondary)] mb-8 leading-relaxed">
                                Comprehensive gate control, attendance tracking, and real-time monitoring system designed for modern educational institutions.
                            </p>
                            <div className="flex flex-wrap gap-4">
                                <button
                                    onClick={onGetStarted}
                                    className="px-8 py-4 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold hover:opacity-90 transition-all transform hover:scale-105 shadow-2xl shadow-primary-500/40 flex items-center gap-2"
                                >
                                    Get Started <ArrowRight size={20} />
                                </button>
                                <button className="px-8 py-4 rounded-xl border-2 border-[var(--border-color)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-primary)] transition-all">
                                    Watch Demo
                                </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-6 mt-12 pt-12 border-t border-[var(--border-color)]">
                                <div>
                                    <div className="text-3xl font-bold text-[var(--text-primary)]">99.9%</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-1">Accuracy</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-[var(--text-primary)]">24/7</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-1">Monitoring</div>
                                </div>
                                <div>
                                    <div className="text-3xl font-bold text-[var(--text-primary)]">&lt;2s</div>
                                    <div className="text-sm text-[var(--text-secondary)] mt-1">Response Time</div>
                                </div>
                            </div>
                        </div>

                        {/* Hero Image/Illustration */}
                        <div className="relative">
                            <div className="glass-card p-8 rounded-3xl shadow-2xl">
                                <div className="aspect-square rounded-2xl bg-[image:var(--gradient-primary)] opacity-20 mb-6" />
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3 p-4 bg-[var(--bg-primary)] rounded-xl">
                                        <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                            <CheckCircle className="text-green-600" size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--text-primary)]">Access Granted</div>
                                            <div className="text-sm text-[var(--text-secondary)]">Student ID: STD2024001</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-4 bg-[var(--bg-primary)] rounded-xl">
                                        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                                            <Clock className="text-blue-600" size={24} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-[var(--text-primary)]">Attendance Marked</div>
                                            <div className="text-sm text-[var(--text-secondary)]">CS101 - 09:00 AM</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-20 px-6 bg-[var(--bg-surface)]">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-extrabold mb-4">
                            Powerful Features for{' '}
                            <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                                Complete Control
                            </span>
                        </h2>
                        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto">
                            Everything you need to manage campus security, attendance, and access control in one integrated platform.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {features.map((feature, index) => (
                            <div
                                key={index}
                                onMouseEnter={() => setActiveFeature(index)}
                                className={`glass-card p-6 rounded-2xl cursor-pointer transition-all duration-300 ${activeFeature === index ? 'shadow-xl scale-105 border-primary-500' : ''
                                    }`}
                            >
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 ${activeFeature === index
                                    ? 'bg-[image:var(--gradient-primary)] text-white'
                                    : 'bg-primary-50 text-primary-600'
                                    }`}>
                                    {feature.icon}
                                </div>
                                <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{feature.title}</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{feature.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="grid lg:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-4xl font-extrabold mb-6">
                                Why Choose{' '}
                                <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                                    Smart Campus?
                                </span>
                            </h2>
                            <p className="text-lg text-[var(--text-secondary)] mb-8">
                                Built with cutting-edge technology and designed for the unique needs of educational institutions.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                {benefits.map((benefit, index) => (
                                    <div key={index} className="flex items-center gap-3">
                                        <div className="w-6 h-6 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                                            <CheckCircle className="text-accent" size={16} />
                                        </div>
                                        <span className="text-[var(--text-primary)] font-medium">{benefit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="glass-card p-6 rounded-2xl">
                                <Smartphone className="text-primary-600 mb-4" size={32} />
                                <h4 className="font-bold mb-2 text-[var(--text-primary)]">Mobile Ready</h4>
                                <p className="text-sm text-[var(--text-secondary)]">Access from any device, anywhere</p>
                            </div>
                            <div className="glass-card p-6 rounded-2xl mt-8">
                                <Lock className="text-secondary mb-4" size={32} />
                                <h4 className="font-bold mb-2 text-[var(--text-primary)]">Secure</h4>
                                <p className="text-sm text-[var(--text-secondary)]">Bank-level encryption</p>
                            </div>
                            <div className="glass-card p-6 rounded-2xl">
                                <BarChart3 className="text-accent mb-4" size={32} />
                                <h4 className="font-bold mb-2 text-[var(--text-primary)]">Analytics</h4>
                                <p className="text-sm text-[var(--text-secondary)]">Real-time insights</p>
                            </div>
                            <div className="glass-card p-6 rounded-2xl mt-8">
                                <Bell className="text-primary-600 mb-4" size={32} />
                                <h4 className="font-bold mb-2 text-[var(--text-primary)]">Alerts</h4>
                                <p className="text-sm text-[var(--text-secondary)]">Instant notifications</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-6 bg-[var(--bg-surface)]">
                <div className="max-w-4xl mx-auto text-center">
                    <h2 className="text-4xl font-extrabold mb-6">
                        Ready to Transform Your{' '}
                        <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
                            Campus Security?
                        </span>
                    </h2>
                    <p className="text-xl text-[var(--text-secondary)] mb-8">
                        Join leading educational institutions using Smart Campus to protect their students and staff.
                    </p>
                    <button
                        onClick={onGetStarted}
                        className="px-10 py-5 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold text-lg hover:opacity-90 transition-all transform hover:scale-105 shadow-2xl shadow-primary-500/40 inline-flex items-center gap-3"
                    >
                        Get Started Now <ArrowRight size={24} />
                    </button>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-8 px-6 border-t border-[var(--border-color)]">
                <div className="max-w-7xl mx-auto text-center text-[var(--text-secondary)] text-sm">
                    <p>&copy; {new Date().getFullYear()} Smart Campus System. Developed by{' '}
                        <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="text-primary-600 font-bold hover:underline">
                            KKDES
                        </a>
                    </p>
                </div>
            </footer>
        </div>
    )
}
