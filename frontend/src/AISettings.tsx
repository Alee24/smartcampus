import { useState, useEffect } from 'react'
import {
    Brain, Key, Save, RefreshCw, Eye, EyeOff, CheckCircle,
    AlertCircle, Camera, Bell, Mail, MessageSquare, Shield,
    Zap, Activity, Settings as SettingsIcon
} from 'lucide-react'

interface AIConfig {
    // OpenAI (for GPT-based analysis)
    openai_api_key: string
    openai_model: string

    // Google Cloud Vision (for image analysis)
    google_vision_api_key: string
    google_project_id: string

    // AWS Rekognition (for face recognition)
    aws_access_key: string
    aws_secret_key: string
    aws_region: string

    // Azure Computer Vision
    azure_vision_key: string
    azure_vision_endpoint: string

    // DeepStack (self-hosted AI)
    deepstack_url: string
    deepstack_api_key: string

    // Feature Toggles
    enable_face_recognition: boolean
    enable_people_counting: boolean
    enable_motion_detection: boolean
    enable_object_detection: boolean
    enable_license_plate: boolean
    enable_anomaly_detection: boolean

    // Alert Settings
    alert_email: string
    alert_sms: string
    alert_threshold_people: number
    alert_threshold_motion: number

    // Processing Settings
    processing_interval: number
    confidence_threshold: number
    max_concurrent_streams: number
}

export default function AISettings() {
    const [config, setConfig] = useState<AIConfig>({
        openai_api_key: '',
        openai_model: 'gpt-4-vision-preview',
        google_vision_api_key: '',
        google_project_id: '',
        aws_access_key: '',
        aws_secret_key: '',
        aws_region: 'us-east-1',
        azure_vision_key: '',
        azure_vision_endpoint: '',
        deepstack_url: 'http://localhost:5000',
        deepstack_api_key: '',
        enable_face_recognition: true,
        enable_people_counting: true,
        enable_motion_detection: true,
        enable_object_detection: true,
        enable_license_plate: true,
        enable_anomaly_detection: false,
        alert_email: '',
        alert_sms: '',
        alert_threshold_people: 50,
        alert_threshold_motion: 10,
        processing_interval: 5,
        confidence_threshold: 0.7,
        max_concurrent_streams: 4
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
    const [testResults, setTestResults] = useState<{ [key: string]: 'success' | 'error' | null }>({})

    useEffect(() => {
        fetchConfig()
    }, [])

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/ai-config', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setConfig({ ...config, ...data })
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const saveConfig = async () => {
        setSaving(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/admin/ai-config', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            })

            if (res.ok) {
                alert('✓ AI configuration saved successfully!')
            } else {
                alert('Failed to save configuration')
            }
        } catch (e) {
            console.error(e)
            alert('Error saving configuration')
        } finally {
            setSaving(false)
        }
    }

    const testConnection = async (service: string) => {
        setTesting(service)
        setTestResults({ ...testResults, [service]: null })

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/admin/ai-test/${service}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            })

            const result = await res.json()
            setTestResults({ ...testResults, [service]: result.success ? 'success' : 'error' })
        } catch (e) {
            setTestResults({ ...testResults, [service]: 'error' })
        } finally {
            setTesting(null)
        }
    }

    const toggleShowKey = (key: string) => {
        setShowKeys({ ...showKeys, [key]: !showKeys[key] })
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
                    <p>Loading AI configuration...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="p-4 md:p-8 animate-fade-in max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                    <Brain className="text-purple-600" size={32} />
                    AI & Computer Vision Settings
                </h1>
                <p className="text-[var(--text-secondary)]">
                    Configure AI services, credentials, and feature toggles for intelligent campus monitoring.
                </p>
            </div>

            {/* Save Button */}
            <div className="mb-6">
                <button
                    onClick={saveConfig}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all"
                >
                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                    {saving ? 'Saving...' : 'Save All Settings'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* OpenAI Configuration */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Zap className="text-green-600" size={20} />
                                OpenAI (GPT Vision)
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">Advanced image analysis and scene understanding</p>
                        </div>
                        {testResults.openai && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${testResults.openai === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {testResults.openai === 'success' ? '✓ Connected' : '✗ Failed'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">API Key</label>
                            <div className="relative">
                                <input
                                    type={showKeys.openai ? 'text' : 'password'}
                                    value={config.openai_api_key}
                                    onChange={(e) => setConfig({ ...config, openai_api_key: e.target.value })}
                                    placeholder="sk-..."
                                    className="w-full px-4 py-2 border rounded-lg pr-10"
                                />
                                <button
                                    onClick={() => toggleShowKey('openai')}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.openai ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Model</label>
                            <select
                                value={config.openai_model}
                                onChange={(e) => setConfig({ ...config, openai_model: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                            >
                                <option value="gpt-4-vision-preview">GPT-4 Vision (Best)</option>
                                <option value="gpt-4">GPT-4</option>
                                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Faster)</option>
                            </select>
                        </div>

                        <button
                            onClick={() => testConnection('openai')}
                            disabled={testing === 'openai' || !config.openai_api_key}
                            className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
                        >
                            {testing === 'openai' ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>
                </div>

                {/* Google Cloud Vision */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Camera className="text-blue-600" size={20} />
                                Google Cloud Vision
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">Object detection, OCR, and label detection</p>
                        </div>
                        {testResults.google && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${testResults.google === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {testResults.google === 'success' ? '✓ Connected' : '✗ Failed'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">API Key</label>
                            <div className="relative">
                                <input
                                    type={showKeys.google ? 'text' : 'password'}
                                    value={config.google_vision_api_key}
                                    onChange={(e) => setConfig({ ...config, google_vision_api_key: e.target.value })}
                                    placeholder="AIza..."
                                    className="w-full px-4 py-2 border rounded-lg pr-10"
                                />
                                <button
                                    onClick={() => toggleShowKey('google')}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.google ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Project ID</label>
                            <input
                                type="text"
                                value={config.google_project_id}
                                onChange={(e) => setConfig({ ...config, google_project_id: e.target.value })}
                                placeholder="my-project-id"
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <button
                            onClick={() => testConnection('google')}
                            disabled={testing === 'google' || !config.google_vision_api_key}
                            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
                        >
                            {testing === 'google' ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>
                </div>

                {/* AWS Rekognition */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Shield className="text-orange-600" size={20} />
                                AWS Rekognition
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">Face recognition and analysis</p>
                        </div>
                        {testResults.aws && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${testResults.aws === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {testResults.aws === 'success' ? '✓ Connected' : '✗ Failed'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Access Key</label>
                            <div className="relative">
                                <input
                                    type={showKeys.aws_access ? 'text' : 'password'}
                                    value={config.aws_access_key}
                                    onChange={(e) => setConfig({ ...config, aws_access_key: e.target.value })}
                                    placeholder="AKIA..."
                                    className="w-full px-4 py-2 border rounded-lg pr-10"
                                />
                                <button
                                    onClick={() => toggleShowKey('aws_access')}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.aws_access ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Secret Key</label>
                            <div className="relative">
                                <input
                                    type={showKeys.aws_secret ? 'text' : 'password'}
                                    value={config.aws_secret_key}
                                    onChange={(e) => setConfig({ ...config, aws_secret_key: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2 border rounded-lg pr-10"
                                />
                                <button
                                    onClick={() => toggleShowKey('aws_secret')}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.aws_secret ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Region</label>
                            <select
                                value={config.aws_region}
                                onChange={(e) => setConfig({ ...config, aws_region: e.target.value })}
                                className="w-full px-4 py-2 border rounded-lg"
                            >
                                <option value="us-east-1">US East (N. Virginia)</option>
                                <option value="us-west-2">US West (Oregon)</option>
                                <option value="eu-west-1">EU (Ireland)</option>
                                <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                            </select>
                        </div>

                        <button
                            onClick={() => testConnection('aws')}
                            disabled={testing === 'aws' || !config.aws_access_key}
                            className="w-full px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
                        >
                            {testing === 'aws' ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>
                </div>

                {/* DeepStack (Self-Hosted) */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Activity className="text-indigo-600" size={20} />
                                DeepStack (Self-Hosted)
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">Privacy-focused local AI processing</p>
                        </div>
                        {testResults.deepstack && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${testResults.deepstack === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {testResults.deepstack === 'success' ? '✓ Connected' : '✗ Failed'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Server URL</label>
                            <input
                                type="text"
                                value={config.deepstack_url}
                                onChange={(e) => setConfig({ ...config, deepstack_url: e.target.value })}
                                placeholder="http://localhost:5000"
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">API Key (Optional)</label>
                            <div className="relative">
                                <input
                                    type={showKeys.deepstack ? 'text' : 'password'}
                                    value={config.deepstack_api_key}
                                    onChange={(e) => setConfig({ ...config, deepstack_api_key: e.target.value })}
                                    placeholder="Optional"
                                    className="w-full px-4 py-2 border rounded-lg pr-10"
                                />
                                <button
                                    onClick={() => toggleShowKey('deepstack')}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.deepstack ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <button
                            onClick={() => testConnection('deepstack')}
                            disabled={testing === 'deepstack' || !config.deepstack_url}
                            className="w-full px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all"
                        >
                            {testing === 'deepstack' ? 'Testing...' : 'Test Connection'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Feature Toggles */}
            <div className="glass-card p-6 mt-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <SettingsIcon className="text-purple-600" size={20} />
                    AI Features
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                        { key: 'enable_face_recognition', label: 'Face Recognition', desc: 'Identify individuals' },
                        { key: 'enable_people_counting', label: 'People Counting', desc: 'Track occupancy' },
                        { key: 'enable_motion_detection', label: 'Motion Detection', desc: 'Detect movement' },
                        { key: 'enable_object_detection', label: 'Object Detection', desc: 'Identify objects' },
                        { key: 'enable_license_plate', label: 'License Plate Recognition', desc: 'Vehicle tracking' },
                        { key: 'enable_anomaly_detection', label: 'Anomaly Detection', desc: 'Unusual behavior' }
                    ].map(feature => (
                        <label key={feature.key} className="flex items-start gap-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-all">
                            <input
                                type="checkbox"
                                checked={config[feature.key as keyof AIConfig] as boolean}
                                onChange={(e) => setConfig({ ...config, [feature.key]: e.target.checked })}
                                className="mt-1"
                            />
                            <div>
                                <div className="font-medium">{feature.label}</div>
                                <div className="text-xs text-[var(--text-secondary)]">{feature.desc}</div>
                            </div>
                        </label>
                    ))}
                </div>
            </div>

            {/* Alert Settings */}
            <div className="glass-card p-6 mt-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Bell className="text-yellow-600" size={20} />
                    Alert Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <Mail size={16} />
                            Alert Email
                        </label>
                        <input
                            type="email"
                            value={config.alert_email}
                            onChange={(e) => setConfig({ ...config, alert_email: e.target.value })}
                            placeholder="admin@example.com"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                            <MessageSquare size={16} />
                            Alert SMS
                        </label>
                        <input
                            type="tel"
                            value={config.alert_sms}
                            onChange={(e) => setConfig({ ...config, alert_sms: e.target.value })}
                            placeholder="+254700000000"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">People Count Threshold</label>
                        <input
                            type="number"
                            value={config.alert_threshold_people}
                            onChange={(e) => setConfig({ ...config, alert_threshold_people: parseInt(e.target.value) })}
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Alert when count exceeds this number</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Motion Sensitivity</label>
                        <input
                            type="number"
                            value={config.alert_threshold_motion}
                            onChange={(e) => setConfig({ ...config, alert_threshold_motion: parseInt(e.target.value) })}
                            min="1"
                            max="100"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">1 (low) to 100 (high)</p>
                    </div>
                </div>
            </div>

            {/* Processing Settings */}
            <div className="glass-card p-6 mt-6">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <Activity className="text-green-600" size={20} />
                    Processing Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Processing Interval (seconds)</label>
                        <input
                            type="number"
                            value={config.processing_interval}
                            onChange={(e) => setConfig({ ...config, processing_interval: parseInt(e.target.value) })}
                            min="1"
                            max="60"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">How often to analyze frames</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Confidence Threshold</label>
                        <input
                            type="number"
                            value={config.confidence_threshold}
                            onChange={(e) => setConfig({ ...config, confidence_threshold: parseFloat(e.target.value) })}
                            min="0"
                            max="1"
                            step="0.1"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">0.0 (low) to 1.0 (high)</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Max Concurrent Streams</label>
                        <input
                            type="number"
                            value={config.max_concurrent_streams}
                            onChange={(e) => setConfig({ ...config, max_concurrent_streams: parseInt(e.target.value) })}
                            min="1"
                            max="16"
                            className="w-full px-4 py-2 border rounded-lg"
                        />
                        <p className="text-xs text-[var(--text-secondary)] mt-1">Number of cameras to process simultaneously</p>
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">💡 Getting Started</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• Add at least one AI service API key to enable intelligent features</li>
                    <li>• Test each connection before saving to ensure credentials are correct</li>
                    <li>• Enable only the features you need to optimize performance</li>
                    <li>• Configure alert thresholds based on your campus size and requirements</li>
                    <li>• For privacy-focused deployments, use DeepStack (self-hosted)</li>
                </ul>
            </div>
        </div>
    )
}
