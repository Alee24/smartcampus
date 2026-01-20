import { useState, useEffect } from 'react'
import { Search, CheckCircle, XCircle, Shield, Calendar, User, Building, Hash, Sparkles } from 'lucide-react'

export default function StudentVerification() {
    const [query, setQuery] = useState('')
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [showCard, setShowCard] = useState(false)
    const [companySettings, setCompanySettings] = useState<any>({
        company_name: 'Riara University',
        logo_url: ''
    })

    // Fetch company settings on mount
    useEffect(() => {
        const fetchCompanySettings = async () => {
            try {
                const res = await fetch('/api/users/public-company-settings')
                if (res.ok) {
                    const data = await res.json()
                    setCompanySettings({
                        company_name: data.company_name,
                        logo_url: data.logo_url
                    })
                }
            } catch (e) {
                console.error(e)
                // Use default settings if fetch fails
            }
        }
        fetchCompanySettings()
    }, [])

    // Success sound effect
    const playSuccessSound = () => {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

        // Create a pleasant "ding" sound
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()

        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)

        // First note (higher pitch)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1)

        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)

        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)

        // Second note (confirmation)
        setTimeout(() => {
            const osc2 = audioContext.createOscillator()
            const gain2 = audioContext.createGain()

            osc2.connect(gain2)
            gain2.connect(audioContext.destination)

            osc2.frequency.setValueAtTime(1000, audioContext.currentTime)
            gain2.gain.setValueAtTime(0.2, audioContext.currentTime)
            gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

            osc2.start(audioContext.currentTime)
            osc2.stop(audioContext.currentTime + 0.3)
        }, 100)
    }

    const handleVerify = async () => {
        if (!query.trim()) return

        setLoading(true)
        setShowCard(false)
        setResult(null) // Clear previous results

        try {
            // Public endpoint - no authentication required
            const res = await fetch(`/api/users/verify/${encodeURIComponent(query)}`)

            console.log('Response status:', res.status)

            if (res.ok) {
                const data = await res.json()
                console.log('Verification data:', data)
                setResult(data)

                // Trigger animations and sound
                setTimeout(() => {
                    setShowCard(true)
                    playSuccessSound()
                }, 300)
            } else {
                const errorText = await res.text()
                console.error('Error response:', errorText)
                setResult({ error: 'Student not found' })
            }
        } catch (e) {
            console.error('Verification error:', e)
            setResult({ error: 'Verification failed. Please try again.' })
        } finally {
            setLoading(false)
        }
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleVerify()
        }
    }

    return (
        <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20"></div>

            {/* Floating Particles */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <div
                        key={i}
                        className="absolute w-2 h-2 bg-purple-400/30 rounded-full animate-float"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                            animationDelay: `${Math.random() * 5}s`,
                            animationDuration: `${5 + Math.random() * 10}s`
                        }}
                    ></div>
                ))}
            </div>

            <div className="relative max-w-6xl mx-auto">
                {/* Header */}
                <div className="text-center mb-12 animate-fade-in">
                    <div className="flex items-center justify-center gap-3 mb-4">
                        <Shield className="text-purple-600" size={48} />
                        <h1 className="text-5xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            Student ID Verification
                        </h1>
                        <Sparkles className="text-pink-600 animate-pulse" size={48} />
                    </div>
                    <p className="text-lg text-gray-600 dark:text-gray-300">
                        Enter your Admission Number or Email to verify your student account
                    </p>
                </div>

                {/* Search Bar */}
                <div className="max-w-2xl mx-auto mb-12">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-2 flex gap-2">
                            <div className="flex-1 relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Enter Admission Number or Email..."
                                    className="w-full pl-12 pr-4 py-4 bg-transparent text-lg font-medium focus:outline-none"
                                />
                            </div>
                            <button
                                onClick={handleVerify}
                                disabled={loading || !query.trim()}
                                className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    'Verify'
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* 3D ID Card */}
                {result && !result.error && (
                    <div className={`perspective-1000 ${showCard ? 'animate-card-flip' : 'opacity-0'}`}>
                        <div className="max-w-4xl mx-auto transform-gpu hover:scale-105 transition-transform duration-500">
                            {/* Card Container with 3D effect */}
                            <div className="relative">
                                {/* Glow Effect */}
                                <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur-2xl opacity-50 animate-pulse"></div>

                                {/* Main Card */}
                                <div className="relative bg-gradient-to-br from-white via-purple-50 to-pink-50 dark:from-gray-800 dark:via-purple-900/30 dark:to-pink-900/30 rounded-3xl shadow-2xl overflow-hidden border-2 border-white/50 backdrop-blur-xl">
                                    {/* Card Header with Logo */}
                                    <div className="relative h-48 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 overflow-hidden">
                                        {/* Animated Background Pattern */}
                                        <div className="absolute inset-0 opacity-20">
                                            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] animate-slide"></div>
                                        </div>

                                        {/* University Logo */}
                                        <div className="relative h-full flex items-center justify-between px-8">
                                            <div className="flex items-center gap-4">
                                                <div className="w-24 h-24 bg-white rounded-2xl p-3 shadow-xl transform hover:rotate-12 transition-transform">
                                                    <img
                                                        src={companySettings.logo_url || "/api/placeholder/96/96"}
                                                        alt="University Logo"
                                                        className="w-full h-full object-contain"
                                                    />
                                                </div>
                                                <div className="text-white">
                                                    <h2 className="text-3xl font-black tracking-tight">{companySettings.company_name?.toUpperCase() || 'UNIVERSITY'}</h2>
                                                    <p className="text-purple-100 font-medium">Official Student ID Card</p>
                                                </div>
                                            </div>

                                            {/* Verified Badge */}
                                            <div className="bg-white/20 backdrop-blur-md rounded-2xl px-6 py-3 border border-white/30">
                                                <div className="flex items-center gap-2">
                                                    <CheckCircle className="text-green-300" size={24} />
                                                    <span className="text-white font-bold text-lg">VERIFIED</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Body */}
                                    <div className="p-8">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                                            {/* Photo Section */}
                                            <div className="flex flex-col items-center">
                                                <div className="relative group">
                                                    {/* Photo Glow */}
                                                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl blur-xl opacity-50 group-hover:opacity-75 transition-opacity"></div>

                                                    {/* Photo Frame */}
                                                    <div className="relative w-48 h-48 rounded-3xl overflow-hidden border-4 border-white shadow-2xl transform group-hover:scale-105 transition-transform">
                                                        {result.profile_image ? (
                                                            <img
                                                                src={result.profile_image}
                                                                alt={result.full_name}
                                                                className="w-full h-full object-cover"
                                                            />
                                                        ) : (
                                                            <div className="w-full h-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                                                <User size={64} className="text-white" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Verified Badge on Photo */}
                                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-green-500 text-white px-4 py-1 rounded-full text-xs font-bold shadow-lg flex items-center gap-1">
                                                        <CheckCircle size={14} />
                                                        ACTIVE
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Details Section */}
                                            <div className="md:col-span-2 space-y-6">
                                                {/* Name */}
                                                <div>
                                                    <h3 className="text-4xl font-black bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent mb-2">
                                                        {result.full_name}
                                                    </h3>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {result.admission_number}
                                                    </p>
                                                </div>

                                                {/* Info Grid */}
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-700">
                                                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                                                            <Building size={18} />
                                                            <span className="text-xs font-bold uppercase">School</span>
                                                        </div>
                                                        <p className="font-bold text-lg">{result.school || 'N/A'}</p>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-blue-200 dark:border-blue-700">
                                                        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
                                                            <Shield size={18} />
                                                            <span className="text-xs font-bold uppercase">Status</span>
                                                        </div>
                                                        <p className="font-bold text-lg capitalize">{result.status || 'Active'}</p>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-pink-50 to-purple-50 dark:from-pink-900/20 dark:to-purple-900/20 rounded-2xl p-4 border border-pink-200 dark:border-pink-700">
                                                        <div className="flex items-center gap-2 text-pink-600 dark:text-pink-400 mb-2">
                                                            <Calendar size={18} />
                                                            <span className="text-xs font-bold uppercase">Admitted</span>
                                                        </div>
                                                        <p className="font-bold text-lg">{result.admission_date || 'N/A'}</p>
                                                    </div>

                                                    <div className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-2xl p-4 border border-purple-200 dark:border-purple-700">
                                                        <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-2">
                                                            <Hash size={18} />
                                                            <span className="text-xs font-bold uppercase">ID</span>
                                                        </div>
                                                        <p className="font-bold text-lg font-mono">{result.id}</p>
                                                    </div>
                                                </div>

                                                {/* Footer Note */}
                                                <div className="bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30 rounded-xl p-4 border-l-4 border-purple-600">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300">
                                                        <span className="font-bold">⚠️ Official Document:</span> This card is property of Riara University.
                                                        If found, please return to Security Office.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Card Footer */}
                                    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 px-8 py-4">
                                        <div className="flex justify-between items-center text-white">
                                            <p className="text-sm font-medium">© 2026 Riara University • Developed by KKDES</p>
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                                                <span className="text-sm font-bold">VERIFIED & ACTIVE</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Error State */}
                {result && result.error && (
                    <div className="max-w-2xl mx-auto animate-shake">
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-2xl p-8 text-center">
                            <XCircle className="mx-auto mb-4 text-red-500" size={64} />
                            <h3 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-2">Verification Failed</h3>
                            <p className="text-red-600 dark:text-red-300">{result.error}</p>
                        </div>
                    </div>
                )}
            </div>

            <style>{`
                @keyframes float {
                    0%, 100% { transform: translateY(0px) translateX(0px); }
                    50% { transform: translateY(-20px) translateX(10px); }
                }
                
                @keyframes slide {
                    0% { transform: translateX(0); }
                    100% { transform: translateX(60px); }
                }
                
                @keyframes card-flip {
                    0% { 
                        opacity: 0;
                        transform: perspective(1000px) rotateY(-15deg) scale(0.9);
                    }
                    100% { 
                        opacity: 1;
                        transform: perspective(1000px) rotateY(0deg) scale(1);
                    }
                }
                
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-10px); }
                    75% { transform: translateX(10px); }
                }
                
                .animate-float {
                    animation: float linear infinite;
                }
                
                .animate-slide {
                    animation: slide 20s linear infinite;
                }
                
                .animate-card-flip {
                    animation: card-flip 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
                }
                
                .animate-shake {
                    animation: shake 0.5s;
                }
                
                .perspective-1000 {
                    perspective: 1000px;
                }
            `}</style>
        </div>
    )
}
