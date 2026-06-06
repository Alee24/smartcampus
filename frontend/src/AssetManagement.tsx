import { useState, useEffect } from 'react'
import {
    Package, CheckCircle, AlertTriangle, ShieldAlert,
    Search, Plus, Trash2, Edit, Check, X, QrCode,
    RefreshCw, User, MapPin, Tag, DollarSign, Calendar,
    FileText, ArrowUpRight, ArrowDownLeft, Wrench, Loader2
} from 'lucide-react'
import { useNotification } from './components/Notification'
import { QRCodeCanvas } from 'qrcode.react'

interface Asset {
    id: string
    tag_number: string
    name: string
    category: string
    status: string
    location: string
    serial_number?: string
    purchase_date?: string
    cost: number
    assigned_to_id?: string
    assigned_to_name?: string
    assigned_to_identifier?: string
    notes?: string
    created_at: string
    handover_name?: string
    handover_email?: string
    handover_phone?: string
    handover_no?: string
    handover_department?: string
    handover_date?: string
}

interface AssetLog {
    id: string
    asset_id: string
    action: string
    timestamp: string
    handled_by_name: string
    borrower_name?: string
    notes?: string
    handover_name?: string
    handover_email?: string
    handover_phone?: string
    handover_no?: string
    handover_department?: string
    handover_date?: string
}

export default function AssetManagement() {
    const { showConfirm, showNotification } = useNotification()
    const [assets, setAssets] = useState<Asset[]>([])
    const [stats, setStats] = useState({
        total: 0,
        available: 0,
        checked_out: 0,
        maintenance: 0,
        disposed: 0,
        categories: {} as Record<string, number>
    })
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'list' | 'scanner' | 'logs'>('list')
    const [categoryFilter, setCategoryFilter] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    
    // Modal states
    const [showAddModal, setShowAddModal] = useState(false)
    const [showEditModal, setShowEditModal] = useState<Asset | null>(null)
    const [showCheckoutModal, setShowCheckoutModal] = useState<Asset | null>(null)
    const [showCheckinModal, setShowCheckinModal] = useState<Asset | null>(null)
    const [showMaintenanceModal, setShowMaintenanceModal] = useState<Asset | null>(null)
    const [showDetailModal, setShowDetailModal] = useState<{ asset: Asset; logs: AssetLog[] } | null>(null)

    // Form states
    const [newAsset, setNewAsset] = useState({
        tag_number: '',
        name: '',
        category: 'electronics',
        status: 'available',
        location: 'General',
        serial_number: '',
        purchase_date: new Date().toISOString().split('T')[0],
        cost: 0.0,
        notes: ''
    })
    const [checkoutData, setCheckoutData] = useState({
        borrower_identifier: '',
        handover_name: '',
        handover_email: '',
        handover_phone: '',
        handover_no: '',
        handover_department: '',
        handover_date: new Date().toISOString().split('T')[0],
        notes: ''
    })
    const [isManualHandover, setIsManualHandover] = useState(false)
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [uploadingCsv, setUploadingCsv] = useState(false)
    const [uploadResults, setUploadResults] = useState<{ message: string; errors: string[] } | null>(null)
    const [checkinNotes, setCheckinNotes] = useState('')
    const [maintenanceNotes, setMaintenanceNotes] = useState('')
    const [scanBarcode, setScanBarcode] = useState('')
    const [scannedAsset, setScannedAsset] = useState<any | null>(null)
    const [scanning, setScanning] = useState(false)
    const [allLogs, setAllLogs] = useState<AssetLog[]>([])

    const fetchAssets = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }
            
            // Build query params
            const params = new URLSearchParams()
            if (categoryFilter) params.append('category', categoryFilter)
            if (statusFilter) params.append('status', statusFilter)
            if (searchQuery) params.append('query', searchQuery)

            const [assetsRes, statsRes] = await Promise.all([
                fetch(`/api/assets?${params.toString()}`, { headers }),
                fetch('/api/assets/stats', { headers })
            ])

            if (assetsRes.ok) setAssets(await assetsRes.json())
            if (statsRes.ok) setStats(await statsRes.json())
        } catch (e) {
            console.error("Failed to fetch assets", e)
        } finally {
            setLoading(false)
        }
    }

    const fetchAllLogs = async () => {
        try {
            const token = localStorage.getItem('token')
            // Fetch logs of a dummy asset or list all. Since we want general logs, 
            // we will query from audit logs under 'assets' table name or custom query.
            // For general tab, we'll fetch the first active asset logs or merge logs of all assets
            const logsList: AssetLog[] = []
            for (const asset of assets.slice(0, 5)) {
                const res = await fetch(`/api/assets/${asset.id}`, { headers: { 'Authorization': `Bearer ${token}` } })
                if (res.ok) {
                    const data = await res.json()
                    logsList.push(...data.logs)
                }
            }
            // Sort merged logs
            logsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            setAllLogs(logsList)
        } catch (e) { }
    }

    useEffect(() => {
        fetchAssets()
    }, [categoryFilter, statusFilter, searchQuery])

    useEffect(() => {
        if (activeTab === 'logs') {
            fetchAllLogs()
        }
    }, [activeTab, assets])

    const generateTagNumber = () => {
        const num = Math.floor(100000 + Math.random() * 900000)
        setNewAsset(prev => ({ ...prev, tag_number: `AST-${num}` }))
    }

    const handleCreateAsset = async (e: any) => {
        e.preventDefault()
        if (!newAsset.tag_number || !newAsset.name) {
            showNotification("Please fill in the required fields.", "error")
            return
        }
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/assets', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newAsset)
            })
            if (res.ok) {
                setShowAddModal(false)
                setNewAsset({
                    tag_number: '',
                    name: '',
                    category: 'electronics',
                    status: 'available',
                    location: 'General',
                    serial_number: '',
                    purchase_date: new Date().toISOString().split('T')[0],
                    cost: 0.0,
                    notes: ''
                })
                fetchAssets()
                showNotification("Asset registered successfully!", "success")
            } else {
                const data = await res.json()
                showNotification(data.detail || "Failed to register asset.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred.", "error")
        }
    }

    const handleEditAsset = async (e: any) => {
        e.preventDefault()
        if (!showEditModal) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/assets/${showEditModal.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(showEditModal)
            })
            if (res.ok) {
                setShowEditModal(null)
                fetchAssets()
                showNotification("Asset details updated successfully!", "success")
            } else {
                showNotification("Failed to update asset.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred.", "error")
        }
    }

    const handleDeleteAsset = async (id: string, name: string) => {
        const confirmed = await showConfirm({
            title: "Delete Asset",
            message: `Are you absolutely sure you want to delete ${name} from inventory? This action is permanent.`,
            confirmText: "Delete",
            cancelText: "Cancel",
            isDanger: true
        })
        if (!confirmed) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/assets/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                showNotification("Asset deleted successfully.", "success")
                fetchAssets()
            } else {
                showNotification("Failed to delete asset.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred.", "error")
        }
    }

    const handleCheckout = async (e: any) => {
        e.preventDefault()
        if (!showCheckoutModal) return
        
        if (!isManualHandover && !checkoutData.borrower_identifier) {
            showNotification("Please specify the borrower's Admission Number, Email or ID.", "error")
            return
        }
        if (isManualHandover && !checkoutData.handover_name) {
            showNotification("Please enter the recipient's name.", "error")
            return
        }

        try {
            const token = localStorage.getItem('token')
            const payload = {
                borrower_identifier: isManualHandover ? null : checkoutData.borrower_identifier,
                handover_name: isManualHandover ? checkoutData.handover_name : null,
                handover_email: isManualHandover ? checkoutData.handover_email : null,
                handover_phone: isManualHandover ? checkoutData.handover_phone : null,
                handover_no: isManualHandover ? checkoutData.handover_no : null,
                handover_department: isManualHandover ? checkoutData.handover_department : null,
                handover_date: isManualHandover ? checkoutData.handover_date : null,
                notes: checkoutData.notes
            }

            const res = await fetch(`/api/assets/${showCheckoutModal.id}/checkout`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            })
            if (res.ok) {
                setShowCheckoutModal(null)
                setCheckoutData({
                    borrower_identifier: '',
                    handover_name: '',
                    handover_email: '',
                    handover_phone: '',
                    handover_no: '',
                    handover_department: '',
                    handover_date: new Date().toISOString().split('T')[0],
                    notes: ''
                })
                fetchAssets()
                showNotification("Asset checked out successfully!", "success")
            } else {
                const data = await res.json()
                showNotification(data.detail || "Checkout failed.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred.", "error")
        }
    }

    const handleCsvUpload = async (e: any) => {
        e.preventDefault()
        if (!csvFile) return
        setUploadingCsv(true)
        setUploadResults(null)
        try {
            const token = localStorage.getItem('token')
            const formData = new FormData()
            formData.append('file', csvFile)
            const res = await fetch('/api/assets/upload/csv', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            const data = await res.json()
            if (res.ok) {
                setUploadResults(data)
                showNotification(data.message || "CSV upload processed successfully.", "success")
                fetchAssets()
                setCsvFile(null)
            } else {
                showNotification(data.detail || "Failed to process CSV file.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred during CSV upload.", "error")
        } finally {
            setUploadingCsv(false)
        }
    }

    const handleCheckin = async (e: any) => {
        e.preventDefault()
        if (!showCheckinModal) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/assets/${showCheckinModal.id}/checkin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ notes: checkinNotes })
            })
            if (res.ok) {
                setShowCheckinModal(null)
                setCheckinNotes('')
                fetchAssets()
                showNotification("Asset returned to inventory successfully!", "success")
            } else {
                showNotification("Check-in failed.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred.", "error")
        }
    }

    const handleMaintenance = async (e: any) => {
        e.preventDefault()
        if (!showMaintenanceModal) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/assets/${showMaintenanceModal.id}/maintenance`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ notes: maintenanceNotes })
            })
            if (res.ok) {
                setShowMaintenanceModal(null)
                setMaintenanceNotes('')
                fetchAssets()
                showNotification("Asset status updated to Maintenance.", "success")
            } else {
                showNotification("Failed to update status.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred.", "error")
        }
    }

    const handleBarcodeScan = async (e?: any) => {
        if (e) e.preventDefault()
        if (!scanBarcode) return
        setScanning(true)
        setScannedAsset(null)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/assets/scan/${scanBarcode}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setScannedAsset(data)
                showNotification("Asset barcode scanned!", "success")
            } else {
                const data = await res.json()
                showNotification(data.detail || "Asset barcode not found.", "error")
            }
        } catch (e) {
            showNotification("Network error occurred.", "error")
        } finally {
            setScanning(false)
        }
    }

    const handleViewDetails = async (asset: Asset) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/assets/${asset.id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setShowDetailModal(data)
            }
        } catch (e) {
            showNotification("Could not fetch asset logs.", "error")
        }
    }

    const getCategoryBadgeColor = (cat: string) => {
        switch (cat) {
            case 'electronics': return 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200'
            case 'furniture': return 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200'
            case 'lab_equipment': return 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200'
            case 'sports_equipment': return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 border-emerald-200'
            default: return 'bg-slate-50 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400 border-slate-200'
        }
    }

    const getStatusBadgeColor = (stat: string) => {
        switch (stat) {
            case 'available': return 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400'
            case 'checked_out': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
            case 'maintenance': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400 animate-pulse'
            case 'disposed': return 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
            default: return 'bg-slate-100 text-slate-700'
        }
    }

    return (
        <div className="animate-fade-in p-2 md:p-6 space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 flex items-center gap-2">
                        <Package size={32} className="text-blue-600" />
                        Asset Barcode Tracking & Inventory
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1">Register, monitor, check-out, and audit physical campus assets using barcode tags</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={fetchAssets} className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors shadow-sm">
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button
                        onClick={() => {
                            setUploadResults(null);
                            setCsvFile(null);
                            setShowUploadModal(true);
                        }}
                        className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl font-bold transition-all flex items-center gap-2 shadow-sm"
                    >
                        <FileText size={18} /> Bulk Import CSV
                    </button>
                    <button
                        onClick={() => {
                            generateTagNumber()
                            setShowAddModal(true)
                        }}
                        className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-500/10 flex items-center gap-2"
                    >
                        <Plus size={18} /> Register Asset
                    </button>
                </div>
            </header>

            {/* KPI Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="glass-card p-5 border-l-4 border-blue-500">
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Total Assets</p>
                    <div className="text-3xl font-black mt-2 text-slate-800 dark:text-white">{stats.total}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-green-500">
                    <p className="text-xs font-black text-green-600/70 uppercase tracking-widest">Available</p>
                    <div className="text-3xl font-black mt-2 text-green-700 dark:text-green-400">{stats.available}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-indigo-500">
                    <p className="text-xs font-black text-indigo-600/70 uppercase tracking-widest">Checked Out</p>
                    <div className="text-3xl font-black mt-2 text-indigo-700 dark:text-indigo-400">{stats.checked_out}</div>
                </div>
                <div className="glass-card p-5 border-l-4 border-yellow-500">
                    <p className="text-xs font-black text-yellow-600/70 uppercase tracking-widest">Maintenance</p>
                    <div className="text-3xl font-black mt-2 text-yellow-700 dark:text-yellow-400">{stats.maintenance}</div>
                </div>
            </div>

            {/* Navigation Switcher */}
            <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-fit">
                <button
                    onClick={() => setActiveTab('list')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Asset Inventory
                </button>
                <button
                    onClick={() => setActiveTab('scanner')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'scanner' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Barcode Desk Scanner
                </button>
                <button
                    onClick={() => setActiveTab('logs')}
                    className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'logs' ? 'bg-blue-600 text-white shadow' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
                >
                    Transaction Log History
                </button>
            </div>

            {/* Tab: Inventory List */}
            {activeTab === 'list' && (
                <div className="space-y-6">
                    {/* Filters Bar */}
                    <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                        <div className="relative flex-1 max-w-md">
                            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 pointer-events-none">
                                <Search size={18} />
                            </span>
                            <input
                                type="text"
                                placeholder="Search by name, tag barcode, location..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-sm"
                            />
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={categoryFilter}
                                onChange={e => setCategoryFilter(e.target.value)}
                                className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                            >
                                <option value="">All Categories</option>
                                <option value="electronics">Electronics</option>
                                <option value="furniture">Furniture</option>
                                <option value="lab_equipment">Lab Equipment</option>
                                <option value="sports_equipment">Sports Equipment</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                            >
                                <option value="">All Statuses</option>
                                <option value="available">Available</option>
                                <option value="checked_out">Checked Out</option>
                                <option value="maintenance">Maintenance</option>
                                <option value="disposed">Disposed</option>
                            </select>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="glass-card overflow-hidden border border-slate-200 dark:border-slate-700">
                        {loading && assets.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 animate-pulse font-medium">Syncing Asset Registry...</div>
                        ) : assets.length === 0 ? (
                            <div className="text-center py-20 text-slate-400 font-bold">No assets registered matching criteria.</div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 font-black text-xs uppercase tracking-wider">
                                        <tr>
                                            <th className="p-4 border-b border-slate-100 dark:border-slate-700">Barcode Tag</th>
                                            <th className="p-4 border-b border-slate-100 dark:border-slate-700">Asset Name</th>
                                            <th className="p-4 border-b border-slate-100 dark:border-slate-700">Category</th>
                                            <th className="p-4 border-b border-slate-100 dark:border-slate-700">Location</th>
                                            <th className="p-4 border-b border-slate-100 dark:border-slate-700">Custodian / Borrower</th>
                                            <th className="p-4 border-b border-slate-100 dark:border-slate-700">Status</th>
                                            <th className="p-4 border-b border-slate-100 dark:border-slate-700 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {assets.map((a) => (
                                            <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 cursor-pointer" onClick={() => handleViewDetails(a)}>
                                                <td className="p-4 font-mono font-bold text-blue-600 dark:text-blue-400 text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <Tag size={14} />
                                                        {a.tag_number}
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-slate-800 dark:text-white">{a.name}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize border ${getCategoryBadgeColor(a.category)}`}>
                                                        {a.category.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs font-bold text-slate-600 dark:text-slate-300">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin size={12} className="text-slate-400" />
                                                        {a.location}
                                                    </div>
                                                </td>
                                                <td className="p-4 text-sm font-semibold">
                                                                                    {a.handover_name ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-800 dark:text-slate-100 font-bold">{a.handover_name}</span>
                                                            <span className="text-[10px] font-mono text-slate-400">
                                                                {a.handover_no || a.handover_email || 'Manual Recipient'}
                                                            </span>
                                                        </div>
                                                    ) : a.assigned_to_name ? (
                                                        <div className="flex flex-col">
                                                            <span className="text-slate-800 dark:text-slate-100 font-bold">{a.assigned_to_name}</span>
                                                            <span className="text-[10px] font-mono text-slate-400">{a.assigned_to_identifier}</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-slate-400 italic">Central Inventory</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${getStatusBadgeColor(a.status)}`}>
                                                        {a.status.replace('_', ' ')}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                                                    {a.status === 'available' && (
                                                        <button
                                                            onClick={() => setShowCheckoutModal(a)}
                                                            className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                                                            title="Check Out"
                                                        >
                                                            <ArrowUpRight size={16} />
                                                        </button>
                                                    )}
                                                    {a.status === 'checked_out' && (
                                                        <button
                                                            onClick={() => setShowCheckinModal(a)}
                                                            className="p-1.5 bg-green-50 text-green-600 rounded hover:bg-green-100 transition-colors"
                                                            title="Check In / Return"
                                                        >
                                                            <ArrowDownLeft size={16} />
                                                        </button>
                                                    )}
                                                    {a.status === 'available' && (
                                                        <button
                                                            onClick={() => setShowMaintenanceModal(a)}
                                                            className="p-1.5 bg-yellow-50 text-yellow-600 rounded hover:bg-yellow-100 transition-colors"
                                                            title="Send to Maintenance"
                                                        >
                                                            <Wrench size={16} />
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => setShowEditModal(a)}
                                                        className="p-1.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-700/50 rounded transition-colors text-slate-600 dark:text-slate-300"
                                                        title="Modify"
                                                    >
                                                        <Edit size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteAsset(a.id, a.name)}
                                                        className="p-1.5 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Tab: Barcode Desk Scanner */}
            {activeTab === 'scanner' && (
                <div className="max-w-3xl mx-auto space-y-6">
                    <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-md text-center">
                        <div className="w-16 h-16 bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
                            <QrCode size={32} />
                        </div>
                        <h2 className="text-xl font-bold mb-2 text-slate-800 dark:text-white">Desk Barcode Reader Desk</h2>
                        <p className="text-[var(--text-secondary)] text-sm mb-6 max-w-md mx-auto">Scan or enter the unique Asset barcode tag to quickly view details, check-out, check-in, or flag assets.</p>
                        
                        <form onSubmit={handleBarcodeScan} className="flex gap-2 max-w-lg mx-auto">
                            <input
                                type="text"
                                placeholder="Scan Barcode / Enter tag (e.g. AST-000123)"
                                className="flex-1 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                value={scanBarcode}
                                onChange={e => setScanBarcode(e.target.value)}
                                required
                            />
                            <button
                                type="submit"
                                disabled={scanning}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold flex items-center gap-2"
                            >
                                {scanning ? <Loader2 className="animate-spin" size={16} /> : "Query Tag"}
                            </button>
                        </form>

                        <div className="mt-4 flex justify-center gap-2">
                            <button 
                                type="button"
                                onClick={() => { setScanBarcode('AST-100201'); setTimeout(() => handleBarcodeScan(), 100); }}
                                className="px-3 py-1 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-full text-xs font-bold text-slate-600 dark:text-slate-300"
                            >
                                Simulated Scan: AST-100201
                            </button>
                        </div>
                    </div>

                    {/* Scanned Asset Panel */}
                    {scannedAsset && (
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-lg animate-scale-in">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded text-xs font-mono font-bold tracking-wider">
                                        {scannedAsset.tag_number}
                                    </span>
                                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mt-1">{scannedAsset.name}</h3>
                                </div>
                                <span className={`px-2.5 py-0.5 rounded text-xs font-black uppercase tracking-wider ${getStatusBadgeColor(scannedAsset.status)}`}>
                                    {scannedAsset.status}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Category</p>
                                    <p className="text-sm font-semibold capitalize mt-1 text-slate-700 dark:text-slate-300">{scannedAsset.category}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Location</p>
                                    <p className="text-sm font-semibold mt-1 text-slate-700 dark:text-slate-300">{scannedAsset.location}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Custodian</p>
                                    <p className="text-sm font-semibold mt-1 text-slate-700 dark:text-slate-300">{scannedAsset.assigned_to_name || "Central Inventory"}</p>
                                </div>
                            </div>

                            <div className="mt-8 flex gap-3">
                                {scannedAsset.status === 'available' && (
                                    <button
                                        onClick={() => setShowCheckoutModal(scannedAsset)}
                                        className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <ArrowUpRight size={18} /> Check Out Asset
                                    </button>
                                )}
                                {scannedAsset.status === 'checked_out' && (
                                    <button
                                        onClick={() => setShowCheckinModal(scannedAsset)}
                                        className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <ArrowDownLeft size={18} /> Check In / Return
                                    </button>
                                )}
                                {scannedAsset.status === 'available' && (
                                    <button
                                        onClick={() => setShowMaintenanceModal(scannedAsset)}
                                        className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold flex items-center justify-center gap-2"
                                    >
                                        <Wrench size={18} /> Send to repairs
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Tab: General Logs */}
            {activeTab === 'logs' && (
                <div className="space-y-6">
                    <div className="glass-card p-6">
                        <h3 className="font-bold text-lg mb-4">Central Assets Transaction Log</h3>
                        <div className="space-y-4">
                            {allLogs.length === 0 ? (
                                <p className="text-slate-400 text-center py-12">No transactions recorded yet.</p>
                            ) : (
                                allLogs.map((l) => (
                                    <div key={l.id} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <span className={`w-3 h-3 rounded-full ${
                                                l.action === 'check_out' ? 'bg-indigo-500' :
                                                l.action === 'check_in' ? 'bg-green-500' : 'bg-yellow-500'
                                            }`} />
                                            <div>
                                                <p className="text-sm font-bold capitalize text-slate-800 dark:text-white">
                                                    {l.action.replace('_', ' ')}
                                                </p>
                                                {l.borrower_name && (
                                                    <p className="text-xs text-slate-500">Borrower: {l.borrower_name}</p>
                                                )}
                                                <p className="text-[10px] text-slate-400 font-semibold">{l.notes}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-slate-400 font-mono">{new Date(l.timestamp).toLocaleString()}</p>
                                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-wider mt-1">By: {l.handled_by_name}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Register Asset Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-scale-in relative overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">Register Campus Asset</h3>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleCreateAsset} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Tag Number (Barcode)</label>
                                    <div className="flex gap-2">
                                        <input
                                            required
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                            value={newAsset.tag_number}
                                            onChange={e => setNewAsset({ ...newAsset, tag_number: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={generateTagNumber}
                                            className="px-3 bg-slate-100 dark:bg-slate-700 rounded-lg text-xs font-bold"
                                        >
                                            Generate
                                        </button>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Asset Name</label>
                                    <input
                                        required
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        placeholder="e.g. Dell Monitor 24\"
                                        value={newAsset.name}
                                        onChange={e => setNewAsset({ ...newAsset, name: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        value={newAsset.category}
                                        onChange={e => setNewAsset({ ...newAsset, category: e.target.value })}
                                    >
                                        <option value="electronics">Electronics</option>
                                        <option value="furniture">Furniture</option>
                                        <option value="lab_equipment">Lab Equipment</option>
                                        <option value="sports_equipment">Sports Equipment</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location / Room</label>
                                    <input
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        placeholder="e.g. LAB1 or LH2"
                                        value={newAsset.location}
                                        onChange={e => setNewAsset({ ...newAsset, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Serial Number</label>
                                    <input
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        placeholder="S/N Code"
                                        value={newAsset.serial_number}
                                        onChange={e => setNewAsset({ ...newAsset, serial_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Purchase Date</label>
                                    <input
                                        type="date"
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        value={newAsset.purchase_date}
                                        onChange={e => setNewAsset({ ...newAsset, purchase_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Purchase Cost (KES)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                    value={newAsset.cost}
                                    onChange={e => setNewAsset({ ...newAsset, cost: parseFloat(e.target.value) || 0 })}
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Additional Notes</label>
                                <textarea
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                    placeholder="Condition or warranty info..."
                                    value={newAsset.notes}
                                    onChange={e => setNewAsset({ ...newAsset, notes: e.target.value })}
                                />
                            </div>

                            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg mt-4 transition-all">
                                Register Asset
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modify Asset Modal */}
            {showEditModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-scale-in relative overflow-y-auto max-h-[90vh]">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">Modify Asset</h3>
                            <button onClick={() => setShowEditModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleEditAsset} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Asset Name</label>
                                <input
                                    required
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                    value={showEditModal.name}
                                    onChange={e => setShowEditModal({ ...showEditModal, name: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Category</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        value={showEditModal.category}
                                        onChange={e => setShowEditModal({ ...showEditModal, category: e.target.value })}
                                    >
                                        <option value="electronics">Electronics</option>
                                        <option value="furniture">Furniture</option>
                                        <option value="lab_equipment">Lab Equipment</option>
                                        <option value="sports_equipment">Sports Equipment</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Location / Room</label>
                                    <input
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        value={showEditModal.location}
                                        onChange={e => setShowEditModal({ ...showEditModal, location: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Serial Number</label>
                                    <input
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        value={showEditModal.serial_number || ''}
                                        onChange={e => setShowEditModal({ ...showEditModal, serial_number: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Status</label>
                                    <select
                                        className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                        value={showEditModal.status}
                                        onChange={e => setShowEditModal({ ...showEditModal, status: e.target.value })}
                                    >
                                        <option value="available">Available</option>
                                        <option value="checked_out">Checked Out</option>
                                        <option value="maintenance">Maintenance</option>
                                        <option value="disposed">Disposed</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Additional Notes</label>
                                <textarea
                                    className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                    value={showEditModal.notes || ''}
                                    onChange={e => setShowEditModal({ ...showEditModal, notes: e.target.value })}
                                />
                            </div>

                            <button className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg mt-4 transition-all">
                                Update Asset
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Check-out Modal */}
            {showCheckoutModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-scale-in text-center overflow-y-auto max-h-[95vh]">
                        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ArrowUpRight size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Check-Out / Handover Asset</h3>
                        <p className="text-xs text-slate-400 mb-6">{showCheckoutModal.name} ({showCheckoutModal.tag_number})</p>

                        <div className="flex items-center justify-center gap-4 mb-4 bg-slate-50 dark:bg-slate-800 p-2 rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                            <button
                                type="button"
                                onClick={() => setIsManualHandover(false)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${!isManualHandover ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Registered User
                            </button>
                            <button
                                type="button"
                                onClick={() => setIsManualHandover(true)}
                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${isManualHandover ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Manual Handover
                            </button>
                        </div>

                        <form onSubmit={handleCheckout} className="space-y-4 text-left">
                            {!isManualHandover ? (
                                <div>
                                    <label className="block text-left text-xs font-bold text-slate-400 uppercase mb-1">Borrower Email / Admission No.</label>
                                    <input
                                        required
                                        className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-sm"
                                        placeholder="e.g. STD001 or student@test.com"
                                        value={checkoutData.borrower_identifier}
                                        onChange={e => setCheckoutData({ ...checkoutData, borrower_identifier: e.target.value })}
                                    />
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Recipient Full Name *</label>
                                        <input
                                            required
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                            placeholder="e.g. Jane Doe"
                                            value={checkoutData.handover_name}
                                            onChange={e => setCheckoutData({ ...checkoutData, handover_name: e.target.value })}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                            placeholder="e.g. jane.doe@example.com"
                                            value={checkoutData.handover_email}
                                            onChange={e => setCheckoutData({ ...checkoutData, handover_email: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                                            <input
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                                placeholder="e.g. +254700..."
                                                value={checkoutData.handover_phone}
                                                onChange={e => setCheckoutData({ ...checkoutData, handover_phone: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Staff / Student No. (e.g. RU01171)</label>
                                            <input
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                                placeholder="e.g. RU01171"
                                                value={checkoutData.handover_no}
                                                onChange={e => setCheckoutData({ ...checkoutData, handover_no: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Department</label>
                                            <input
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                                placeholder="e.g. Finance"
                                                value={checkoutData.handover_department}
                                                onChange={e => setCheckoutData({ ...checkoutData, handover_department: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Handover Date</label>
                                            <input
                                                type="date"
                                                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border rounded-lg text-sm"
                                                value={checkoutData.handover_date}
                                                onChange={e => setCheckoutData({ ...checkoutData, handover_date: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 font-semibold text-slate-400 uppercase tracking-wider">Additional Notes</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                                    placeholder="e.g. Handover for teaching research activities..."
                                    value={checkoutData.notes}
                                    onChange={e => setCheckoutData({ ...checkoutData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-2 pt-2">
                                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm">
                                    Approve Check-Out
                                </button>
                                <button type="button" onClick={() => setShowCheckoutModal(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Check-in Modal */}
            {showCheckinModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ArrowDownLeft size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Check-in Asset</h3>
                        <p className="text-xs text-slate-400 mb-6">Return {showCheckinModal.name} back to central inventory.</p>

                        <form onSubmit={handleCheckin} className="space-y-4">
                            <div>
                                <label className="block text-left text-xs font-bold text-slate-400 uppercase mb-1">Return Notes / Condition</label>
                                <textarea
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                                    placeholder="Returned in good condition / minor scratches..."
                                    value={checkinNotes}
                                    onChange={e => setCheckinNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold text-sm">
                                    Confirm Return
                                </button>
                                <button type="button" onClick={() => setShowCheckinModal(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Maintenance Modal */}
            {showMaintenanceModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl animate-scale-in text-center">
                        <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Wrench size={24} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 dark:text-white">Flag for Maintenance</h3>
                        <p className="text-xs text-slate-400 mb-6">Send {showMaintenanceModal.name} to repairs.</p>

                        <form onSubmit={handleMaintenance} className="space-y-4">
                            <div>
                                <label className="block text-left text-xs font-bold text-slate-400 uppercase mb-1">Reason / Repair description</label>
                                <textarea
                                    required
                                    className="w-full p-3 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs"
                                    placeholder="Lens replacement / screen flickering..."
                                    value={maintenanceNotes}
                                    onChange={e => setMaintenanceNotes(e.target.value)}
                                />
                            </div>

                            <div className="flex gap-2">
                                <button type="submit" className="flex-1 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-bold text-sm">
                                    Confirm Flag
                                </button>
                                <button type="button" onClick={() => setShowMaintenanceModal(null)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-700 rounded-xl font-bold text-sm text-slate-700 dark:text-slate-200">
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Detail / Logs Modal */}
            {showDetailModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-scale-in relative max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <span className="px-2.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300 rounded text-xs font-mono font-bold tracking-wider">
                                    {showDetailModal.asset.tag_number}
                                </span>
                                <h3 className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{showDetailModal.asset.name}</h3>
                            </div>
                            <button onClick={() => setShowDetailModal(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={20} /></button>
                        </div>

                        {/* Barcode / QR Preview */}
                        <div className="mb-6 bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl flex flex-col items-center justify-center border border-slate-100 dark:border-slate-800">
                            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-inner">
                                <QRCodeCanvas value={`${window.location.origin}/api/assets/scan/${showDetailModal.asset.tag_number}`} size={140} />
                            </div>
                            <p className="text-[10px] text-slate-400 font-mono mt-3 uppercase tracking-widest">Asset Barcode Verification Link</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm mb-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Category</span>
                                <span className="font-semibold capitalize text-slate-700 dark:text-slate-300">{showDetailModal.asset.category.replace('_', ' ')}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Location</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{showDetailModal.asset.location}</span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Custodian / Borrower</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300 font-bold">
                                    {showDetailModal.asset.handover_name || showDetailModal.asset.assigned_to_name || "Central Inventory"}
                                </span>
                            </div>
                            <div>
                                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block">Onetime Cost</span>
                                <span className="font-mono font-bold text-emerald-600 font-mono">KES {showDetailModal.asset.cost.toLocaleString()}</span>
                            </div>

                            {showDetailModal.asset.handover_name && (
                                <div className="col-span-2 bg-blue-50/50 dark:bg-blue-900/10 p-3.5 rounded-xl border border-blue-100 dark:border-blue-800/40 text-xs space-y-1">
                                    <p className="font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-2">Handover / Allocation Details</p>
                                    <div className="grid grid-cols-2 gap-2">
                                        <p><span className="text-slate-400">Recipient Name:</span> <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{showDetailModal.asset.handover_name}</span></p>
                                        <p><span className="text-slate-400">Email:</span> <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{showDetailModal.asset.handover_email || 'N/A'}</span></p>
                                        <p><span className="text-slate-400">Phone:</span> <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{showDetailModal.asset.handover_phone || 'N/A'}</span></p>
                                        <p><span className="text-slate-400">Staff / Student No:</span> <span className="font-bold text-slate-800 dark:text-slate-200 font-mono block mt-0.5">{showDetailModal.asset.handover_no || 'N/A'}</span></p>
                                        <p><span className="text-slate-400">Department:</span> <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{showDetailModal.asset.handover_department || 'N/A'}</span></p>
                                        <p><span className="text-slate-400">Date Handed Over:</span> <span className="font-bold text-slate-800 dark:text-slate-200 block mt-0.5">{showDetailModal.asset.handover_date || 'N/A'}</span></p>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Transaction History logs</h4>
                            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                                {showDetailModal.logs.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">No checkout records recorded yet.</p>
                                ) : (
                                    showDetailModal.logs.map((log) => (
                                        <div key={log.id} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs flex justify-between items-center border border-slate-100/50">
                                            <div>
                                                <p className="font-bold capitalize">{log.action.replace('_', ' ')}</p>
                                                {log.notes && <p className="text-[10px] text-slate-500 mt-0.5">{log.notes}</p>}
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[9px] text-slate-400 font-mono">{new Date(log.timestamp).toLocaleTimeString()}</p>
                                                <p className="text-[8px] text-slate-400 mt-0.5 font-bold">By: {log.handled_by_name}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* CSV Bulk Upload Modal */}
            {showUploadModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl w-full max-w-lg p-6 shadow-2xl animate-scale-in relative max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                                <FileText className="text-blue-600" size={24} />
                                Bulk Import Assets via CSV
                            </h3>
                            <button 
                                onClick={() => { setShowUploadModal(false); setUploadResults(null); }} 
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-800/40 text-xs mb-6 space-y-2">
                            <p className="font-bold text-blue-600 dark:text-blue-400">Step 1: Download CSV Template</p>
                            <p className="text-[var(--text-secondary)]">Populate the template using any spreadsheet editor (Excel, Google Sheets). Use the correct column formats. Barcode tags (e.g. <b>RU01171</b>) must be unique.</p>
                            <a 
                                href="/api/assets/template/csv" 
                                download 
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors mt-2"
                            >
                                <FileText size={14} /> Download Template
                            </a>
                        </div>

                        <form onSubmit={handleCsvUpload} className="space-y-4">
                            <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-blue-500 rounded-2xl p-6 text-center transition-colors relative cursor-pointer">
                                <input 
                                    type="file" 
                                    accept=".csv"
                                    required
                                    onChange={e => setCsvFile(e.target.files?.[0] || null)}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                />
                                <div className="space-y-2">
                                    <FileText className="mx-auto text-slate-400" size={36} />
                                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                        {csvFile ? csvFile.name : "Select CSV File"}
                                    </p>
                                    <p className="text-xs text-slate-400">
                                        {csvFile ? `${(csvFile.size / 1024).toFixed(2)} KB` : "Click or drag & drop asset CSV here"}
                                    </p>
                                </div>
                            </div>

                            <button 
                                type="submit" 
                                disabled={uploadingCsv || !csvFile}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-xl font-bold transition-all flex items-center justify-center gap-2"
                            >
                                {uploadingCsv ? (
                                    <>
                                        <Loader2 className="animate-spin" size={18} />
                                        Uploading assets...
                                    </>
                                ) : "Upload & Parse CSV"}
                            </button>
                        </form>

                        {/* Import Results Logs */}
                        {uploadResults && (
                            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                                <div className="p-4 rounded-xl bg-green-50 dark:bg-green-950/20 text-xs font-bold text-green-700 dark:text-green-400">
                                    {uploadResults.message}
                                </div>
                                {uploadResults.errors && uploadResults.errors.length > 0 && (
                                    <div className="space-y-2">
                                        <p className="text-xs font-black text-red-500 uppercase tracking-wider">Failed Rows ({uploadResults.errors.length})</p>
                                        <div className="bg-red-50/50 dark:bg-red-950/10 p-3 rounded-xl border border-red-100 dark:border-red-800/40 text-[10px] text-red-600 dark:text-red-400 font-mono space-y-1 max-h-36 overflow-y-auto">
                                            {uploadResults.errors.map((err, i) => (
                                                <p key={i}>• {err}</p>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
