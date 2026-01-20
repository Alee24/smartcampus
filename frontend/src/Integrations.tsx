import { useState, useEffect } from 'react'
import { Server, Mail, Key } from 'lucide-react'

export default function Integrations() {
    const [configs, setConfigs] = useState<any>({
        smtp_host: '',
        smtp_port: '587',
        smtp_user: '',
        smtp_pass: '',
        openai_api_key: '',
        face_api_url: 'http://localhost:5000'
    })
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState('')

    useEffect(() => {
        fetchConfigs()
    }, [])

    const fetchConfigs = async () => {
        const token = localStorage.getItem('token')
        try {
            const res = await fetch('/api/admin/', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setConfigs((prev: any) => ({ ...prev, ...data }))
            }
        } catch (e) {
            console.error(e)
        }
    }

    const handleSave = async () => {
        setLoading(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch('/api/admin/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(configs)
            })
            if (res.ok) setMessage('Settings saved successfully!')
            else setMessage('Failed to save settings')
        } catch (e) {
            setMessage('Error saving settings')
        } finally {
            setLoading(false)
        }
    }

    const handleChange = (e: any) => {
        setConfigs({ ...configs, [e.target.name]: e.target.value })
    }

    return (
        <div className="animate-fade-in max-w-4xl mx-auto space-y-6">
            <h2 className="text-2xl font-bold mb-4">System Integrations</h2>

            {/* Email Settings */}
            <div className="glass-card p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Mail size={20} className="text-[var(--primary-color)]" />
                    SMTP / Email Services
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">SMTP Host</label>
                        <input name="smtp_host" value={configs.smtp_host} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="smtp.gmail.com" />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">SMTP Port</label>
                        <input name="smtp_port" value={configs.smtp_port} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="587" />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Username</label>
                        <input name="smtp_user" value={configs.smtp_user} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" />
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Password</label>
                        <input type="password" name="smtp_pass" value={configs.smtp_pass} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" />
                    </div>
                </div>
            </div>

            {/* AI & API Services */}
            <div className="glass-card p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Server size={20} className="text-[var(--primary-color)]" />
                    AI Services & APIs
                </h3>
                <div className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">OpenAI API Key</label>
                        <div className="flex gap-2">
                            <Key size={18} className="text-[var(--text-secondary)] mt-2" />
                            <input type="password" name="openai_api_key" value={configs.openai_api_key} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm text-[var(--text-secondary)] mb-1">Face Recognition Service URL</label>
                        <input name="face_api_url" value={configs.face_api_url} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" />
                    </div>
                </div>
            </div>

            {/* SSO & LDAP Authentication */}
            <div className="glass-card p-6">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                    <Key size={20} className="text-[var(--primary-color)]" />
                    Authentication Services
                </h3>

                {/* LDAP Section */}
                <div className="mb-6 pb-6 border-b border-[var(--border-color)]">
                    <h4 className="font-semibold text-sm mb-3 uppercase text-[var(--text-secondary)]">LDAP / Active Directory</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="md:col-span-2">
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Server URI</label>
                            <input name="ldap_server_uri" value={configs.ldap_server_uri || ''} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="ldap://ldap.example.com:389" />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Bind DN (User)</label>
                            <input name="ldap_bind_dn" value={configs.ldap_bind_dn || ''} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="cn=admin,dc=example,dc=com" />
                        </div>
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Bind Password</label>
                            <input type="password" name="ldap_bind_password" value={configs.ldap_bind_password || ''} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Base DN</label>
                            <input name="ldap_base_dn" value={configs.ldap_base_dn || ''} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="ou=users,dc=example,dc=com" />
                        </div>
                    </div>
                </div>

                {/* Google SSO Section */}
                <div>
                    <h4 className="font-semibold text-sm mb-3 uppercase text-[var(--text-secondary)]">Google SSO</h4>
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm text-[var(--text-secondary)] mb-1">Google Client ID</label>
                            <input name="google_client_id" value={configs.google_client_id || ''} onChange={handleChange} className="w-full p-2 rounded border border-[var(--border-color)] bg-[var(--bg-primary)]" placeholder="123...apps.googleusercontent.com" />
                        </div>
                    </div>
                </div>
            </div>

            {
                message && (
                    <div className={`p-3 rounded text-center ${message.includes('Success') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                        {message}
                    </div>
                )
            }

            <div className="flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-[var(--primary-color)] text-white px-8 py-3 rounded-lg font-bold hover:opacity-90 transition-opacity"
                >
                    {loading ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>
        </div >
    )
}
