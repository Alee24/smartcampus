import { useState, useEffect } from 'react'
import {
    Brain, Key, Save, RefreshCw, Eye, EyeOff, CheckCircle,
    AlertCircle, Camera, Bell, Mail, MessageSquare, Shield,
    Zap, Activity, Settings as SettingsIcon, Terminal, Download, Copy, Check, X
} from 'lucide-react'
import { useNotification } from './components/Notification'

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

    // Microsoft Dynamics 365 ERP Settings
    dynamics_base_url: string
    dynamics_tenant_id: string
    dynamics_client_id: string
    dynamics_client_secret: string
    enable_dynamics_sync: boolean
}

export default function AISettings() {
    const { showNotification } = useNotification()
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
        max_concurrent_streams: 4,
        dynamics_base_url: 'https://dynamics.api.riara.ac.ke/v1',
        dynamics_tenant_id: '',
        dynamics_client_id: '',
        dynamics_client_secret: '',
        enable_dynamics_sync: false
    })

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [testing, setTesting] = useState<string | null>(null)
    const [showKeys, setShowKeys] = useState<{ [key: string]: boolean }>({})
    const [testResults, setTestResults] = useState<{ [key: string]: 'success' | 'error' | null }>({})
    const [syncingDynamics, setSyncingDynamics] = useState(false)
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [syncLogs, setSyncLogs] = useState<Array<{ time: string; level: 'info' | 'success' | 'error'; msg: string }>>([])

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
                showNotification('AI & Integration configuration saved successfully!', 'success')
            } else {
                showNotification('Failed to save configuration', 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Error saving configuration', 'error')
        } finally {
            setSaving(false)
        }
    }

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const syncDynamicsNow = async () => {
        setSyncingDynamics(true)
        setShowSyncModal(true)
        setSyncLogs([])

        const addLog = (msg: string, level: 'info' | 'success' | 'error' = 'info') => {
            const time = new Date().toLocaleTimeString()
            setSyncLogs(prev => [...prev, { time, level, msg }])
        }

        try {
            addLog("Initializing Dynamics ERP data synchronization module...", "info")
            await sleep(500)
            
            addLog(`OData Service Base URL: ${config.dynamics_base_url || 'Not configured'}`, "info")
            addLog(`Tenant ID: ${config.dynamics_tenant_id || 'Not configured'}`, "info")
            addLog(`Client Application ID: ${config.dynamics_client_id || 'Not configured'}`, "info")
            await sleep(400)

            const isMock = !config.dynamics_client_id || !config.dynamics_client_secret || 
                           config.dynamics_client_id.toLowerCase().includes("mock") || 
                           config.dynamics_client_id.toLowerCase().includes("test")

            if (isMock) {
                addLog("OAuth credentials missing or contain 'mock/test'. Entering high-fidelity simulation mode.", "info")
            } else {
                addLog("Validating OAuth/Basic credentials for OData endpoints...", "info")
            }
            await sleep(500)

            addLog("Executing remote sync procedure at backend route `/api/admin/dynamics/sync`...", "info")
            
            const token = localStorage.getItem('token')
            const startTime = Date.now()
            const res = await fetch('/api/admin/dynamics/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(config)
            })
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2)
            const result = await res.json()

            if (res.ok && result.status === 'success') {
                addLog(`Connection completed successfully in ${duration}s.`, "success")
                await sleep(300)
                addLog(`Sync Mode: ${result.mode || 'live_dynamics'}`, "info")
                if (result.warning) {
                    addLog(`[WARNING] ${result.warning}`, "error")
                }
                addLog(`----------------------------------------`, "info")
                addLog(`[SUCCESS] Students Synced (Created): ${result.added_students || 0}`, "success")
                addLog(`[SUCCESS] Students Updated: ${result.updated_students || 0}`, "success")
                addLog(`[SUCCESS] Courses Synced: ${result.added_courses || 0}`, "success")
                addLog(`[SUCCESS] Timetable Slots Synced: ${result.added_timetable_slots || 0}`, "success")
                addLog(`[SUCCESS] Course Registrations Synced: ${result.added_registrations || 0}`, "success")
                addLog(`----------------------------------------`, "info")
                addLog(`Database transactions committed successfully. Ready!`, "success")
                
                showNotification("Dynamics ERP Sync completed successfully!", "success")
            } else {
                const errMsg = result.detail || result.message || "Failed to synchronize with OData backend services"
                addLog(`[ERROR] Synchronization failed: ${errMsg}`, "error")
                showNotification(errMsg, "error")
            }
        } catch (e: any) {
            addLog(`[FATAL] A request exception occurred: ${e.message}`, "error")
            showNotification(`Dynamics sync error: ${e.message}`, 'error')
        } finally {
            setSyncingDynamics(false)
        }
    }

    const handleCopyLogs = () => {
        const text = syncLogs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n')
        navigator.clipboard.writeText(text)
        showNotification("Logs copied to clipboard!", "success")
    }

    const handleDownloadLogs = () => {
        const text = syncLogs.map(l => `[${l.time}] [${l.level.toUpperCase()}] ${l.msg}`).join('\n')
        const blob = new Blob([text], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `dynamics-sync-log-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
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
            if (result.success) {
                showNotification(`${service.toUpperCase()} connection verified successfully!`, 'success')
            } else {
                showNotification(`${service.toUpperCase()} connection failed: ${result.message}`, 'error')
            }
        } catch (e: any) {
            setTestResults({ ...testResults, [service]: 'error' })
            showNotification(`Connection test failed: ${e.message}`, 'error')
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

                {/* Microsoft Dynamics ERP Integration */}
                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h3 className="text-xl font-bold flex items-center gap-2">
                                <Activity className="text-purple-600" size={20} />
                                Microsoft Dynamics 365 ERP
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)]">Sync student records and academic registrations</p>
                        </div>
                        {testResults.dynamics && (
                            <div className={`px-3 py-1 rounded-full text-xs font-bold ${testResults.dynamics === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                }`}>
                                {testResults.dynamics === 'success' ? '✓ Connected' : '✗ Failed'}
                            </div>
                        )}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Dynamics OData Endpoint URL</label>
                            <input
                                type="text"
                                value={config.dynamics_base_url || ''}
                                onChange={(e) => setConfig({ ...config, dynamics_base_url: e.target.value })}
                                placeholder="https://api.dynamics.com/v1"
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Tenant ID</label>
                            <input
                                type="text"
                                value={config.dynamics_tenant_id || ''}
                                onChange={(e) => setConfig({ ...config, dynamics_tenant_id: e.target.value })}
                                placeholder="Commonly a GUID or domain name"
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Client ID (App Registration)</label>
                            <input
                                type="text"
                                value={config.dynamics_client_id || ''}
                                onChange={(e) => setConfig({ ...config, dynamics_client_id: e.target.value })}
                                placeholder="OAuth Client Application ID"
                                className="w-full px-4 py-2 border rounded-lg"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Client Secret</label>
                            <div className="relative">
                                <input
                                    type={showKeys.dynamics_secret ? 'text' : 'password'}
                                    value={config.dynamics_client_secret || ''}
                                    onChange={(e) => setConfig({ ...config, dynamics_client_secret: e.target.value })}
                                    placeholder="••••••••"
                                    className="w-full px-4 py-2 border rounded-lg pr-10"
                                />
                                <button
                                    onClick={() => toggleShowKey('dynamics_secret')}
                                    className="absolute right-2 top-2 text-gray-400 hover:text-gray-600"
                                >
                                    {showKeys.dynamics_secret ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 py-2">
                            <input
                                type="checkbox"
                                id="enable_dynamics_sync"
                                checked={config.enable_dynamics_sync || false}
                                onChange={(e) => setConfig({ ...config, enable_dynamics_sync: e.target.checked })}
                                className="w-4 h-4 text-purple-600"
                            />
                            <label htmlFor="enable_dynamics_sync" className="text-sm font-medium cursor-pointer">
                                Enable Automatic Background Sync
                            </label>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => testConnection('dynamics')}
                                disabled={testing === 'dynamics' || !config.dynamics_base_url}
                                className="flex-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all text-sm"
                            >
                                {testing === 'dynamics' ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button
                                onClick={syncDynamicsNow}
                                disabled={syncingDynamics || !config.dynamics_base_url}
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg disabled:opacity-50 transition-all text-sm flex items-center justify-center gap-1"
                            >
                                {syncingDynamics ? <RefreshCw className="animate-spin" size={16} /> : null}
                                {syncingDynamics ? 'Syncing...' : 'Sync Dynamics ERP'}
                            </button>
                        </div>
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

            {/* Sync Progress Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[550px]">
                        {/* Header */}
                        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <Terminal className="text-purple-400" size={24} />
                                <span className="font-bold text-slate-100 font-mono text-lg">Dynamics ERP Synchronization Console</span>
                            </div>
                            <button 
                                onClick={() => { if (!syncingDynamics) setShowSyncModal(false); }}
                                disabled={syncingDynamics}
                                className="text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-30"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Terminal Logs Area */}
                        <div className="flex-1 p-6 overflow-y-auto font-mono text-xs space-y-2 bg-slate-950 text-slate-300">
                            {syncLogs.length === 0 ? (
                                <div className="text-slate-500 italic font-sans">Starting log stream...</div>
                            ) : (
                                syncLogs.map((log, index) => (
                                    <div key={index} className="flex items-start gap-2 leading-relaxed">
                                        <span className="text-slate-500 select-none">[{log.time}]</span>
                                        <span className={`font-semibold uppercase select-none ${
                                            log.level === 'success' ? 'text-emerald-500' :
                                            log.level === 'error' ? 'text-rose-500' : 'text-sky-500'
                                        }`}>
                                            [{log.level}]
                                        </span>
                                        <span className={
                                            log.level === 'success' ? 'text-emerald-400 font-semibold' :
                                            log.level === 'error' ? 'text-rose-400 font-semibold' : 'text-slate-200'
                                        }>
                                            {log.msg}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer / Controls */}
                        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-t border-slate-700 font-sans">
                            <div className="flex gap-2">
                                <button
                                    onClick={handleCopyLogs}
                                    disabled={syncLogs.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    <Copy size={16} />
                                    Copy Logs
                                </button>
                                <button
                                    onClick={handleDownloadLogs}
                                    disabled={syncLogs.length === 0}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    <Download size={16} />
                                    Download Logs
                                </button>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                {syncingDynamics ? (
                                    <span className="flex items-center gap-1.5 text-purple-400 font-medium text-sm">
                                        <RefreshCw size={16} className="animate-spin" />
                                        Syncing active...
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1 text-emerald-400 font-medium text-sm">
                                        <Check size={16} />
                                        Idle
                                    </span>
                                )}
                                <button
                                    onClick={() => setShowSyncModal(false)}
                                    disabled={syncingDynamics}
                                    className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all disabled:opacity-50 text-sm shadow-md shadow-purple-900/30"
                                >
                                    Close Console
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
