import { useState } from 'react'

interface LoginProps {
    onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')

    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 15000) // 15s timeout

            const searchParams = new URLSearchParams()
            searchParams.append('username', email.trim())
            searchParams.append('password', password)

            const response = await fetch('/api/token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: searchParams,
                signal: controller.signal
            })

            clearTimeout(timeoutId)

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}))
                throw new Error(errData.detail || 'Invalid credentials')
            }

            const data = await response.json()
            // Store token
            localStorage.setItem('token', data.access_token)
            onLogin()
        } catch (err: any) {
            console.error(err)
            if (err.name === 'AbortError') {
                setError('Login timed out. Server is not responding.')
            } else {
                setError(err.message || 'Login failed')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] relative overflow-hidden transition-colors duration-500">
            {/* Background decoration */}
            <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary-500/20 blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-secondary/20 blur-[100px]" />

            <div className="w-full max-w-md p-8 glass-card relative z-10 animate-fade-in shadow-2xl border border-[var(--border-color)] bg-[var(--bg-surface)]">
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold bg-[image:var(--gradient-primary)] bg-clip-text text-transparent tracking-tight">
                        Smart Campus
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-2 font-medium">Secure Campus Entry System</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Admission Number or Email</label>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-[var(--text-primary)] placeholder-gray-400"
                            placeholder="STD001 or student@test.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 outline-none transition-all text-[var(--text-primary)] placeholder-gray-400"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center font-medium">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full py-3.5 px-4 rounded-xl bg-[image:var(--gradient-primary)] hover:opacity-90 text-white font-bold shadow-lg shadow-primary-500/30 transition-all transform hover:scale-[1.02] active:scale-[0.98] flex justify-center items-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {isLoading ? (
                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : 'Sign In'}
                    </button>

                    <div className="relative flex py-2 items-center">
                        <div className="flex-grow border-t border-gray-700"></div>
                        <span className="flex-shrink-0 mx-4 text-gray-500 text-xs">OR</span>
                        <div className="flex-grow border-t border-gray-700"></div>
                    </div>

                    <button
                        type="button"
                        onClick={() => alert("Google Sign-In requires Client ID configuration in Integrations.")}
                        className="w-full py-3 px-4 rounded-lg bg-white text-gray-900 font-medium hover:bg-gray-100 transition-all flex justify-center items-center gap-2"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                        Sign in with Gmail
                    </button>
                </form>

                <div className="mt-6 text-center text-xs text-gray-500">
                    <p>Protected by AI Security Protocols</p>
                    <p>Developed by <a href="https://www.kkdes.co.ke" target="_blank" rel="noopener noreferrer" className="text-primary-400 hover:underline">KKDES</a></p>
                </div>
            </div>
        </div>
    )
}
