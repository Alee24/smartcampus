import { useState, useEffect } from 'react'
import {
    Building2, Save, Upload, Phone, Mail, Globe, MessageCircle,
    Facebook, Twitter, Instagram, Linkedin, Youtube, RefreshCw,
    Image as ImageIcon, CheckCircle, AlertCircle
} from 'lucide-react'

interface CompanySettings {
    company_name: string
    tagline: string
    email: string
    phone: string
    whatsapp: string
    website: string
    address: string

    // Social Media
    facebook: string
    twitter: string
    instagram: string
    linkedin: string
    youtube: string

    // Logo
    logo_url: string

    // Custom Theme Colors
    primary_color?: string
    secondary_color?: string
    accent_color?: string
    text_color?: string
}

export default function CompanySettings() {
    const [settings, setSettings] = useState<CompanySettings>({
        company_name: 'Riara University',
        tagline: 'Excellence in Education',
        email: 'info@riarauniversity.ac.ke',
        phone: '+254 700 000 000',
        whatsapp: '+254 700 000 000',
        website: 'https://riarauniversity.ac.ke',
        address: 'Limuru Road, Nairobi, Kenya',
        facebook: '',
        twitter: '',
        instagram: '',
        linkedin: '',
        youtube: '',
        logo_url: '',
        primary_color: '#2563eb',
        secondary_color: '#0284c7',
        accent_color: '#10b981',
        text_color: '#0f172a'
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

    useEffect(() => {
        fetchSettings()
    }, [])

    const fetchSettings = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/company-settings', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setSettings({ ...settings, ...data })
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const saveSettings = async () => {
        setSaving(true)
        setMessage(null)

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/company-settings', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(settings)
            })

            if (res.ok) {
                setMessage({ type: 'success', text: '✓ Company settings saved successfully!' })
                // Reload page to update logo everywhere
                setTimeout(() => window.location.reload(), 1500)
            } else {
                const errorData = await res.text()
                setMessage({ type: 'error', text: `Failed to save settings: ${res.status} - ${errorData}` })
            }
        } catch (e: any) {
            console.error(e)
            setMessage({ type: 'error', text: `Network error: ${e.message}` })
        } finally {
            setSaving(false)
        }
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.type.startsWith('image/')) {
            setMessage({ type: 'error', text: 'Please upload an image file' })
            return
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'Logo must be less than 2MB' })
            return
        }

        setUploading(true)
        setMessage(null)

        try {
            const formData = new FormData()
            formData.append('logo', file)

            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/upload-logo', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                const updatedSettings = { ...settings, logo_url: data.logo_url }
                setSettings(updatedSettings)
                
                // Immediately save the updated settings to the database
                const saveRes = await fetch('/api/admin/company-settings', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(updatedSettings)
                })

                if (saveRes.ok) {
                    setMessage({ type: 'success', text: '✓ Logo uploaded and saved successfully!' })
                    // Reload page to update logo everywhere
                    setTimeout(() => window.location.reload(), 1500)
                } else {
                    setMessage({ type: 'error', text: 'Logo uploaded, but failed to save settings' })
                }
            } else {
                setMessage({ type: 'error', text: 'Failed to upload logo' })
            }
        } catch (e) {
            console.error(e)
            setMessage({ type: 'error', text: 'Error uploading logo' })
        } finally {
            setUploading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
                    <p>Loading company settings...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Building2 className="text-blue-600" size={32} />
                    Company Settings
                </h1>
                <p className="text-[var(--text-secondary)]">
                    Configure your institution's branding and contact information. Logo will appear on all ID cards and documents.
                </p>
            </div>

            {/* Message */}
            {message && (
                <div className={`mb-6 p-4 rounded-xl border-2 flex items-center gap-3 ${message.type === 'success'
                        ? 'bg-green-50 border-green-500 text-green-700'
                        : 'bg-red-50 border-red-500 text-red-700'
                    }`}>
                    {message.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
                    <span className="font-medium">{message.text}</span>
                </div>
            )}

            {/* Save Button */}
            <div className="mb-6">
                <button
                    onClick={saveSettings}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all"
                >
                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Logo Upload */}
                <div className="lg:col-span-1">
                    <div className="glass-card p-6 sticky top-4">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <ImageIcon className="text-blue-600" size={20} />
                            Company Logo
                        </h3>

                        {/* Logo Preview */}
                        <div className="mb-4">
                            <div className="aspect-square bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-2xl border-2 border-dashed border-blue-300 dark:border-blue-700 flex items-center justify-center overflow-hidden">
                                {settings.logo_url ? (
                                    <img
                                        src={settings.logo_url}
                                        alt="Company Logo"
                                        className="w-full h-full object-contain p-4"
                                    />
                                ) : (
                                    <div className="text-center p-4">
                                        <ImageIcon className="mx-auto mb-2 text-gray-400" size={48} />
                                        <p className="text-sm text-gray-500">No logo uploaded</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Upload Button */}
                        <label className="block">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleLogoUpload}
                                className="hidden"
                            />
                            <div className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-xl cursor-pointer transition-all">
                                {uploading ? (
                                    <>
                                        <RefreshCw className="animate-spin" size={18} />
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <Upload size={18} />
                                        Upload Logo
                                    </>
                                )}
                            </div>
                        </label>

                        <p className="text-xs text-[var(--text-secondary)] mt-2">
                            Recommended: Square image, PNG/JPG, max 2MB
                        </p>

                        {/* Logo Usage Info */}
                        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                            <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-2">Logo appears on:</h4>
                            <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                <li>• Student ID Cards</li>
                                <li>• QR Code PDFs</li>
                                <li>• Email Templates</li>
                                <li>• Reports & Documents</li>
                                <li>• Login Page</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Settings Form */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Basic Information */}
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Building2 className="text-blue-600" size={20} />
                            Basic Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Company/University Name *</label>
                                <input
                                    type="text"
                                    value={settings.company_name}
                                    onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                                    placeholder="Riara University"
                                    className="w-full px-4 py-3 border rounded-lg font-bold text-lg"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Tagline/Motto</label>
                                <input
                                    type="text"
                                    value={settings.tagline}
                                    onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                                    placeholder="Excellence in Education"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2">Physical Address</label>
                                <textarea
                                    value={settings.address}
                                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                                    placeholder="Limuru Road, Nairobi, Kenya"
                                    rows={2}
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* System Color Theme Settings */}
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 inline-block animate-pulse"></span>
                            System Color Theme
                        </h3>
                        <p className="text-sm text-[var(--text-secondary)] mb-6">
                            Choose a pre-configured branding palette or specify custom primary, secondary, and accent colors to customize the application look system-wide.
                        </p>

                        {/* Presets */}
                        <div className="mb-6">
                            <label className="block text-sm font-bold mb-3 text-[var(--text-secondary)] uppercase tracking-wider">Theme Color Presets</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[
                                    { name: 'Classic Blue', primary: '#2563eb', secondary: '#0284c7', accent: '#10b981' },
                                    { name: 'Emerald Green', primary: '#059669', secondary: '#0d9488', accent: '#eab308' },
                                    { name: 'Indigo Purple', primary: '#6366f1', secondary: '#8b5cf6', accent: '#f43f5e' },
                                    { name: 'Crimson Red', primary: '#dc2626', secondary: '#e11d48', accent: '#3b82f6' },
                                    { name: 'Sunset Orange', primary: '#ea580c', secondary: '#f97316', accent: '#06b6d4' },
                                    { name: 'Teal Breeze', primary: '#0d9488', secondary: '#0891b2', accent: '#8b5cf6' }
                                ].map((p) => {
                                    const isSelected = settings.primary_color === p.primary && settings.secondary_color === p.secondary;
                                    return (
                                        <button
                                            key={p.name}
                                            type="button"
                                            onClick={() => setSettings({
                                                ...settings,
                                                primary_color: p.primary,
                                                secondary_color: p.secondary,
                                                accent_color: p.accent
                                            })}
                                            className={`flex flex-col items-start p-3 rounded-xl border-2 transition-all text-left ${
                                                isSelected 
                                                    ? 'border-blue-500 bg-blue-50/20 dark:bg-blue-900/10' 
                                                    : 'border-[var(--border-color)] hover:border-gray-400 bg-transparent'
                                            }`}
                                        >
                                            <div className="flex gap-1.5 mb-2">
                                                <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: p.primary }}></span>
                                                <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: p.secondary }}></span>
                                                <span className="w-4 h-4 rounded-full inline-block" style={{ backgroundColor: p.accent }}></span>
                                            </div>
                                            <span className="text-xs font-bold">{p.name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                                            {/* Custom Color Pickers */}
                        <div className="border-t border-[var(--border-color)] pt-6">
                            <label className="block text-sm font-bold mb-4 text-[var(--text-secondary)] uppercase tracking-wider">Custom Branding Colors</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                                <div className="flex items-center gap-3 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)]">
                                    <input
                                        type="color"
                                        value={settings.primary_color || '#2563eb'}
                                        onChange={(e) => setSettings({ ...settings, primary_color: e.target.value })}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">Button & Action Color</span>
                                        <span className="text-sm font-mono uppercase">{settings.primary_color}</span>
                                    </div>
                                </div>
 
                                <div className="flex items-center gap-3 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)]">
                                    <input
                                        type="color"
                                        value={settings.secondary_color || '#0284c7'}
                                        onChange={(e) => setSettings({ ...settings, secondary_color: e.target.value })}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">Headings & Titles Color</span>
                                        <span className="text-sm font-mono uppercase">{settings.secondary_color}</span>
                                    </div>
                                </div>
 
                                <div className="flex items-center gap-3 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)]">
                                    <input
                                        type="color"
                                        value={settings.accent_color || '#10b981'}
                                        onChange={(e) => setSettings({ ...settings, accent_color: e.target.value })}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">Text Highlights & Accent Color</span>
                                        <span className="text-sm font-mono uppercase">{settings.accent_color}</span>
                                    </div>
                                </div>

                                {/* NEW: Body Text Color */}
                                <div className="flex items-center gap-3 bg-[var(--bg-primary)] p-3 rounded-xl border-2 border-[var(--primary-color)]/30 border-dashed">
                                    <input
                                        type="color"
                                        value={settings.text_color || '#0f172a'}
                                        onChange={(e) => setSettings({ ...settings, text_color: e.target.value })}
                                        className="w-10 h-10 rounded-lg cursor-pointer border-none bg-transparent"
                                    />
                                    <div className="flex flex-col">
                                        <span className="text-xs font-bold text-[var(--text-secondary)]">Body Text Color</span>
                                        <span className="text-sm font-mono uppercase">{settings.text_color || '#0f172a'}</span>
                                        <span className="text-[10px] text-[var(--text-secondary)] mt-0.5">Applies to all text in the app</span>
                                    </div>
                                </div>
                            </div>
                        </div>        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Phone className="text-green-600" size={20} />
                            Contact Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Mail size={16} />
                                    Email Address *
                                </label>
                                <input
                                    type="email"
                                    value={settings.email}
                                    onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                                    placeholder="info@university.edu"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Phone size={16} />
                                    Phone Number *
                                </label>
                                <input
                                    type="tel"
                                    value={settings.phone}
                                    onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                                    placeholder="+254 700 000 000"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <MessageCircle size={16} />
                                    WhatsApp Number
                                </label>
                                <input
                                    type="tel"
                                    value={settings.whatsapp}
                                    onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
                                    placeholder="+254 700 000 000"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Globe size={16} />
                                    Website URL
                                </label>
                                <input
                                    type="url"
                                    value={settings.website}
                                    onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                                    placeholder="https://university.edu"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Social Media */}
                    <div className="glass-card p-6">
                        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Facebook className="text-blue-600" size={20} />
                            Social Media Links
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Facebook size={16} className="text-blue-600" />
                                    Facebook
                                </label>
                                <input
                                    type="url"
                                    value={settings.facebook}
                                    onChange={(e) => setSettings({ ...settings, facebook: e.target.value })}
                                    placeholder="https://facebook.com/yourpage"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Twitter size={16} className="text-blue-400" />
                                    Twitter/X
                                </label>
                                <input
                                    type="url"
                                    value={settings.twitter}
                                    onChange={(e) => setSettings({ ...settings, twitter: e.target.value })}
                                    placeholder="https://twitter.com/yourhandle"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Instagram size={16} className="text-pink-600" />
                                    Instagram
                                </label>
                                <input
                                    type="url"
                                    value={settings.instagram}
                                    onChange={(e) => setSettings({ ...settings, instagram: e.target.value })}
                                    placeholder="https://instagram.com/yourpage"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Linkedin size={16} className="text-blue-700" />
                                    LinkedIn
                                </label>
                                <input
                                    type="url"
                                    value={settings.linkedin}
                                    onChange={(e) => setSettings({ ...settings, linkedin: e.target.value })}
                                    placeholder="https://linkedin.com/company/yourcompany"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                                    <Youtube size={16} className="text-red-600" />
                                    YouTube Channel
                                </label>
                                <input
                                    type="url"
                                    value={settings.youtube}
                                    onChange={(e) => setSettings({ ...settings, youtube: e.target.value })}
                                    placeholder="https://youtube.com/@yourchannel"
                                    className="w-full px-4 py-3 border rounded-lg"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">💡 Important Notes</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Company name and logo appear on all student ID cards</li>
                    <li>• Contact information is shown in email templates and reports</li>
                    <li>• Social media links appear in the footer of public pages</li>
                    <li>• Changes take effect immediately after saving</li>
                    <li>• Logo should be square (1:1 ratio) for best results</li>
                </ul>
            </div>
        </div>
    )
}
