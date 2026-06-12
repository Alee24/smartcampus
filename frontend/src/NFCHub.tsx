import { useState, useEffect, useRef } from 'react'
import {
    Radio, CreditCard, Search, Users, ShieldAlert,
    Trash2, Plus, X, Check, Loader2, Sliders,
    Clock, RefreshCw, Smartphone, CheckCircle, AlertTriangle,
    ChevronLeft, ChevronRight
} from 'lucide-react'

interface User {
    id: string
    admission_number: string
    full_name: string
    email: string | null
    school: string
    role: string
    status: string
    profile_image: string | null
    nfc_card_uid: string | null
    nfc_written_at: string | null
    nfc_status: string | null
}

export default function NFCHub() {
    const [users, setUsers] = useState<User[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedRole, setSelectedRole] = useState<string>('all')
    const [selectedNfcStatus, setSelectedNfcStatus] = useState<string>('all') // all, tagged, untagged
    const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
    const [writingUser, setWritingUser] = useState<User | null>(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 8
    
    // Web NFC States
    const [isNfcWriting, setIsNfcWriting] = useState(false)
    const [manualUid, setManualUid] = useState('')
    const [nfcWriteError, setNfcWriteError] = useState<string | null>(null)
    const [nfcWriteSuccess, setNfcWriteSuccess] = useState(false)
    const [nfcReaderSupported, setNfcReaderSupported] = useState(false)
    
    // Quick Verify States
    const [verifyUid, setVerifyUid] = useState('')
    const [verifiedUser, setVerifiedUser] = useState<User | null>(null)
    const [verifyLoading, setVerifyLoading] = useState(false)
    const [verifyError, setVerifyError] = useState<string | null>(null)
    const [isNfcScanning, setIsNfcScanning] = useState(false)

    const abortControllerRef = useRef<AbortController | null>(null)

    useEffect(() => {
        fetchUsers()
        // Check if Web NFC is supported
        if ('NDEFReader' in window) {
            setNfcReaderSupported(true)
        }
        
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, selectedRole, selectedNfcStatus])

    const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
        setToast({ msg, type })
        setTimeout(() => setToast(null), 4000)
    }

    const fetchUsers = async () => {
        setLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            const contentType = res.headers.get("content-type")
            if (res.ok) {
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const data = await res.json()
                    setUsers(data)
                } else {
                    showToast('Server returned non-JSON response', 'error')
                }
            } else {
                let detail = 'Failed to fetch users'
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const err = await res.json()
                    detail = err.detail || detail
                } else {
                    detail = await res.text() || detail
                }
                showToast(detail, 'error')
            }
        } catch (e: any) {
            showToast(e.message || 'Network error fetching users', 'error')
        } finally {
            setLoading(false)
        }
    }

    // Assign NFC Tag
    const handleAssignNfc = async (userId: string, nfcUid: string) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${userId}/nfc`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ nfc_card_uid: nfcUid, nfc_status: 'Active' })
            })

            let data: any = {}
            const contentType = res.headers.get("content-type")
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json()
            } else {
                const text = await res.text()
                data = { detail: text || `Server error: ${res.status} ${res.statusText}` }
            }

            if (res.ok) {
                showToast(`NFC Tag assigned to ${data.user?.full_name || 'user'}!`, 'success')
                setWritingUser(null)
                setNfcWriteSuccess(true)
                setTimeout(() => setNfcWriteSuccess(false), 2000)
                fetchUsers()
            } else {
                setNfcWriteError(data.detail || 'Failed to assign tag')
                showToast(data.detail || 'NFC assignment failed', 'error')
            }
        } catch (e: any) {
            setNfcWriteError(e.message)
            showToast(e.message, 'error')
        }
    }

    // Revoke NFC Tag
    const handleRevokeNfc = async (user: User) => {
        if (!window.confirm(`Are you sure you want to revoke the NFC tag for ${user.full_name}?`)) return
        
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}/nfc`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                showToast(`NFC Tag revoked for ${user.full_name}`, 'success')
                fetchUsers()
                if (verifiedUser?.id === user.id) {
                    setVerifiedUser(null)
                }
            } else {
                let detail = 'Failed to revoke NFC tag'
                const contentType = res.headers.get("content-type")
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const err = await res.json()
                    detail = err.detail || detail
                } else {
                    detail = await res.text() || detail
                }
                showToast(detail, 'error')
            }
        } catch (e: any) {
            showToast(e.message, 'error')
        }
    }

    // Start Web NFC Writing
    const startWebNfcWrite = async (user: User) => {
        setNfcWriteError(null)
        setIsNfcWriting(true)
        
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()
        
        try {
            // @ts-ignore
            const ndef = new NDEFReader()
            await ndef.write({
                records: [{
                    recordType: "url",
                    data: `${window.location.origin}/verify?user=${user.admission_number}`
                }]
            }, { signal: abortControllerRef.current.signal })

            // Get UID from reader if possible (supported in Chrome/Android)
            // Note: NDEFReader write doesn't directly return the scanned UID, but we can scan it as well
            ndef.addEventListener("reading", ({ serialNumber }: any) => {
                if (serialNumber) {
                    handleAssignNfc(user.id, serialNumber)
                }
            })
            
            // Fallback: if no direct UID read in write, prompt for UID or let them tap scan
            // To be highly sophisticated, we run a short scan to capture serialNumber
            await ndef.scan({ signal: abortControllerRef.current.signal })
            ndef.onreading = (event: any) => {
                const serial = event.serialNumber
                if (serial) {
                    handleAssignNfc(user.id, serial)
                }
            }
        } catch (e: any) {
            console.error(e)
            if (e.name !== 'AbortError') {
                setNfcWriteError(e.message || 'NFC write failed. Tap card to retry.')
            }
        }
    }

    // Simulated Tag Generator
    const generateSimulatedTag = (user: User) => {
        const chars = '0123456789ABCDEF'
        let uid = ''
        for (let i = 0; i < 14; i++) {
            uid += chars[Math.floor(Math.random() * 16)]
            if (i % 2 === 1 && i < 13) uid += ':'
        }
        setManualUid(uid)
        showToast('Simulated tag UID generated!', 'success')
    }

    // Quick Verify Card UID Lookup
    const lookupCardUid = async (uid: string) => {
        if (!uid.trim()) return
        setVerifyLoading(true)
        setVerifyError(null)
        setVerifiedUser(null)
        
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/nfc/${encodeURIComponent(uid.trim())}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                let data: any = {}
                const contentType = res.headers.get("content-type")
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    data = await res.json()
                } else {
                    const text = await res.text()
                    data = { full_name: 'Unknown', detail: text }
                }
                setVerifiedUser(data)
                showToast(`NFC Tag verified: ${data.full_name}`, 'success')
            } else {
                let detail = 'Card not registered or suspended.'
                const contentType = res.headers.get("content-type")
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    const err = await res.json()
                    detail = err.detail || detail
                } else {
                    detail = await res.text() || detail
                }
                setVerifyError(detail)
            }
        } catch (e: any) {
            setVerifyError(e.message || 'Failed to verify card.')
        } finally {
            setVerifyLoading(false)
        }
    }

    // Start Web NFC Scanning for Quick Verify
    const startWebNfcScan = async () => {
        setIsNfcScanning(true)
        setVerifyError(null)
        setVerifiedUser(null)

        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        abortControllerRef.current = new AbortController()

        try {
            // @ts-ignore
            const ndef = new NDEFReader()
            await ndef.scan({ signal: abortControllerRef.current.signal })
            
            ndef.onreading = async (event: any) => {
                const serial = event.serialNumber
                if (serial) {
                    setVerifyUid(serial)
                    await lookupCardUid(serial)
                }
            }
        } catch (e: any) {
            console.error(e)
            if (e.name !== 'AbortError') {
                setVerifyError(e.message || 'Scanning failed')
            }
            setIsNfcScanning(false)
        }
    }

    const stopNfcOperations = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
            abortControllerRef.current = null
        }
        setIsNfcWriting(false)
        setIsNfcScanning(false)
    }

    // Filters & Search
    const filteredUsers = users.filter(user => {
        const matchesSearch = 
            user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.admission_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (user.nfc_card_uid && user.nfc_card_uid.toLowerCase().includes(searchQuery.toLowerCase()))
            
        const matchesRole = selectedRole === 'all' || user.role === selectedRole
        
        let matchesNfcStatus = true
        if (selectedNfcStatus === 'tagged') {
            matchesNfcStatus = user.nfc_card_uid !== null
        } else if (selectedNfcStatus === 'untagged') {
            matchesNfcStatus = user.nfc_card_uid === null
        }
        
        return matchesSearch && matchesRole && matchesNfcStatus
    })

    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

    const taggedCount = users.filter(u => u.nfc_card_uid).length
    const untaggedCount = users.length - taggedCount

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen text-slate-800">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
                        <Radio className="text-purple-600 animate-pulse" size={32} />
                        NFC Tagging & Asset Hub
                    </h1>
                    <p className="text-slate-500 mt-1">
                        Sophisticated tag writer, encoder, and verification management for smart campus gates.
                    </p>
                </div>
                <button 
                    onClick={fetchUsers}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition duration-150 active:scale-95"
                >
                    <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    Sync Directory
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Total Campus Directory</p>
                        <h3 className="text-3xl font-black text-slate-800 mt-1">{users.length}</h3>
                        <p className="text-slate-500 text-xs mt-1">Students, staff and administrators</p>
                    </div>
                    <div className="p-4 bg-purple-50 text-purple-600 rounded-2xl">
                        <Users size={28} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">NFC Tagged Users</p>
                        <h3 className="text-3xl font-black text-emerald-600 mt-1">{taggedCount}</h3>
                        <p className="text-emerald-500 text-xs mt-1">✓ Active physical smart cards</p>
                    </div>
                    <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                        <CreditCard size={28} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                    <div>
                        <p className="text-slate-400 text-sm font-semibold uppercase tracking-wider">Untagged Users</p>
                        <h3 className="text-3xl font-black text-amber-500 mt-1">{untaggedCount}</h3>
                        <p className="text-amber-500 text-xs mt-1">⚠️ Awaiting tag assignment</p>
                    </div>
                    <div className="p-4 bg-amber-50 text-amber-500 rounded-2xl">
                        <ShieldAlert size={28} />
                    </div>
                </div>
            </div>

            {/* Content Tabs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                
                {/* Main Directory Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm lg:col-span-2 overflow-hidden">
                    {/* Filter bar */}
                    <div className="p-6 border-b border-slate-100 space-y-4 bg-slate-50/50">
                        <h2 className="text-lg font-bold text-slate-800">Enrollment & Search Directory</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name, ID or UID..."
                                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            {/* Role Filter */}
                            <div className="relative flex items-center">
                                <Sliders className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
                                <select
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white appearance-none cursor-pointer"
                                    value={selectedRole}
                                    onChange={(e) => setSelectedRole(e.target.value)}
                                >
                                    <option value="all">All Roles</option>
                                    <option value="Student">Students</option>
                                    <option value="Staff">Staff</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Security Lead">Security Lead</option>
                                </select>
                            </div>
                            {/* NFC Status Filter */}
                            <div className="relative flex items-center">
                                <CreditCard className="absolute left-3 text-slate-400 pointer-events-none" size={16} />
                                <select
                                    className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white appearance-none cursor-pointer"
                                    value={selectedNfcStatus}
                                    onChange={(e) => setSelectedNfcStatus(e.target.value)}
                                >
                                    <option value="all">All Enrollment Status</option>
                                    <option value="tagged">Tagged / Registered Only</option>
                                    <option value="untagged">Untagged Awaiting Cards</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Table View */}
                    <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-left">
                            <thead>
                                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                    <th className="py-4 px-6">User / Profile</th>
                                    <th className="py-4 px-6">Admission / ID</th>
                                    <th className="py-4 px-6">School / Department</th>
                                    <th className="py-4 px-6">NFC Tag Status</th>
                                    <th className="py-4 px-6 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            <Loader2 className="animate-spin inline-block mr-2 text-purple-600" size={24} />
                                            Synchronizing Directory Data...
                                        </td>
                                    </tr>
                                ) : filteredUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-12 text-center text-slate-400">
                                            No matching students or staff records found.
                                        </td>
                                    </tr>
                                ) : (
                                    paginatedUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-slate-50/50 transition">
                                            <td className="py-4 px-6 flex items-center gap-3">
                                                <img 
                                                    src={user.profile_image || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                                    alt={user.full_name} 
                                                    className="w-10 h-10 rounded-full object-cover border border-slate-100 shadow-sm"
                                                />
                                                <div>
                                                    <span className="font-bold text-slate-900 block">{user.full_name}</span>
                                                    <span className="text-xs text-slate-400 capitalize">{user.role}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 font-mono text-slate-600 font-medium">
                                                {user.admission_number}
                                            </td>
                                            <td className="py-4 px-6 text-slate-500">
                                                {user.school || 'Unspecified school'}
                                            </td>
                                            <td className="py-4 px-6">
                                                {user.nfc_card_uid ? (
                                                    <div className="flex flex-col gap-1">
                                                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-emerald-50 text-emerald-700 rounded-full w-max border border-emerald-100">
                                                            <Check size={12} />
                                                            Active: {user.nfc_card_uid.substring(0, 12)}...
                                                        </span>
                                                        {user.nfc_written_at && (
                                                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                <Clock size={10} />
                                                                {new Date(user.nfc_written_at).toLocaleDateString()}
                                                            </span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-slate-100 text-slate-500 rounded-full w-max">
                                                        Not Enrolled
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-4 px-6 text-right">
                                                {user.nfc_card_uid ? (
                                                    <button 
                                                        onClick={() => handleRevokeNfc(user)}
                                                        className="p-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl transition duration-150"
                                                        title="Revoke Tag"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={() => {
                                                            setWritingUser(user)
                                                            setManualUid('')
                                                            setNfcWriteError(null)
                                                        }}
                                                        className="px-3.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-xl text-xs flex items-center gap-1.5 ml-auto shadow-sm transition active:scale-95 duration-100"
                                                    >
                                                        <Plus size={14} />
                                                        Write Tag
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                        <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="text-xs text-slate-500">
                                Showing <span className="font-bold text-slate-900">{startIndex + 1}</span> to <span className="font-bold text-slate-900">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of <span className="font-bold text-slate-900">{filteredUsers.length}</span> records
                            </div>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                
                                {Array.from({ length: totalPages }, (_, i) => i + 1)
                                    .filter(pageNum => pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1)
                                    .map((pageNum, index, arr) => {
                                        const showEllipsis = index > 0 && pageNum - arr[index - 1] > 1;
                                        return (
                                            <div key={pageNum} className="flex items-center gap-1.5">
                                                {showEllipsis && <span className="text-slate-400 text-xs">...</span>}
                                                <button
                                                    onClick={() => setCurrentPage(pageNum)}
                                                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                                                        currentPage === pageNum
                                                            ? 'bg-purple-600 text-white shadow-md'
                                                            : 'hover:bg-slate-100 border border-slate-200 text-slate-700 bg-white'
                                                    }`}
                                                >
                                                    {pageNum}
                                                </button>
                                            </div>
                                        );
                                    })
                                }

                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-600 transition"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Quick Verify Component */}
                <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
                    <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 border-b border-slate-50 pb-3">
                        <CreditCard size={20} className="text-purple-600" />
                        Quick Card Verifier
                    </h2>

                    <div className="space-y-4">
                        <p className="text-slate-500 text-xs leading-relaxed">
                            Lookup any NFC tag details immediately. Place the smart card against the reader or manually input the tag UID.
                        </p>

                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Scan/Type card UID..."
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                value={verifyUid}
                                onChange={(e) => setVerifyUid(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') lookupCardUid(verifyUid)
                                }}
                            />
                            <button
                                onClick={() => lookupCardUid(verifyUid)}
                                disabled={verifyLoading || !verifyUid.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-xl text-sm transition"
                            >
                                {verifyLoading ? <Loader2 size={16} className="animate-spin" /> : 'Lookup'}
                            </button>
                        </div>

                        {nfcReaderSupported && (
                            <button
                                onClick={isNfcScanning ? stopNfcOperations : startWebNfcScan}
                                className={`w-full py-2.5 px-4 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border shadow-sm transition ${
                                    isNfcScanning 
                                        ? 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' 
                                        : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                            >
                                <Smartphone size={16} className={isNfcScanning ? 'animate-bounce' : ''} />
                                {isNfcScanning ? 'Stop Scanning' : 'Scan Card (Web NFC)'}
                            </button>
                        )}
                    </div>

                    {/* Verification Results */}
                    {verifyError && (
                        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex gap-3 text-red-700 text-xs">
                            <AlertTriangle size={18} className="flex-shrink-0" />
                            <div>
                                <h4 className="font-bold">Lookup Failed</h4>
                                <p className="mt-0.5">{verifyError}</p>
                            </div>
                        </div>
                    )}

                    {verifiedUser ? (
                        <div className="p-5 border border-purple-100 bg-gradient-to-br from-purple-50/50 to-white rounded-2xl space-y-4 shadow-sm relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-100/30 rounded-full blur-xl -mr-6 -mt-6"></div>
                            
                            <div className="flex gap-4 items-center">
                                <img 
                                    src={verifiedUser.profile_image || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                    alt={verifiedUser.full_name} 
                                    className="w-16 h-16 rounded-full object-cover border-2 border-purple-200 shadow"
                                />
                                <div>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-wider">
                                        Verified Member
                                    </span>
                                    <h3 className="font-extrabold text-slate-900 text-lg leading-tight mt-1">{verifiedUser.full_name}</h3>
                                    <p className="text-xs text-purple-600 font-semibold">{verifiedUser.role} • {verifiedUser.school}</p>
                                </div>
                            </div>

                            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs">
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Admission / ID</span>
                                    <span className="font-mono text-slate-800 font-bold">{verifiedUser.admission_number}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Card UID</span>
                                    <span className="font-mono text-purple-700 font-bold">{verifiedUser.nfc_card_uid}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Enrolled On</span>
                                    <span className="text-slate-800 font-medium">
                                        {verifiedUser.nfc_written_at ? new Date(verifiedUser.nfc_written_at).toLocaleString() : 'N/A'}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-400">Security Status</span>
                                    <span className={`font-semibold ${verifiedUser.status.toLowerCase() === 'active' ? 'text-emerald-600' : 'text-red-500'}`}>
                                        ● {verifiedUser.status}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ) : !verifyError && !verifyLoading && (
                        <div className="border-2 border-dashed border-slate-100 rounded-2xl p-8 text-center text-slate-400">
                            <Radio size={28} className="mx-auto mb-2 text-slate-300" />
                            <p className="text-xs">Awaiting Card Scans...</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Write Tag Modal */}
            {writingUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-2xl w-full max-w-md overflow-hidden relative">
                        {/* Header */}
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-900">Assign NFC Smart Card</h3>
                            <button 
                                onClick={() => {
                                    stopNfcOperations()
                                    setWritingUser(null)
                                }}
                                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="p-6 space-y-6">
                            {/* Profile Header */}
                            <div className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                <img 
                                    src={writingUser.profile_image || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} 
                                    alt={writingUser.full_name} 
                                    className="w-14 h-14 rounded-full object-cover border border-slate-200 shadow-sm"
                                />
                                <div>
                                    <h4 className="font-extrabold text-slate-900 leading-tight">{writingUser.full_name}</h4>
                                    <p className="text-xs text-slate-500 mt-0.5">{writingUser.role} • ID: {writingUser.admission_number}</p>
                                    <p className="text-[10px] text-slate-400">{writingUser.school}</p>
                                </div>
                            </div>

                            {/* Writer Controls */}
                            {nfcReaderSupported ? (
                                <div className="space-y-4">
                                    {!isNfcWriting ? (
                                        <button
                                            onClick={() => startWebNfcWrite(writingUser)}
                                            className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl shadow flex items-center justify-center gap-2 transition active:scale-95 duration-100"
                                        >
                                            <Smartphone size={20} />
                                            Encode via Web NFC
                                        </button>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-6 bg-purple-50/50 rounded-2xl border border-purple-100 text-center space-y-3 relative overflow-hidden">
                                            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center animate-ping absolute opacity-20"></div>
                                            <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center shadow-lg relative z-10">
                                                <Radio size={24} className="animate-pulse" />
                                            </div>
                                            <div>
                                                <h5 className="font-bold text-purple-900">Awaiting Smart Card...</h5>
                                                <p className="text-xs text-purple-600 mt-1">Tap the card on the back of your NFC device.</p>
                                            </div>
                                            <button
                                                onClick={stopNfcOperations}
                                                className="px-4 py-1.5 bg-white border border-purple-200 text-purple-700 text-xs font-semibold rounded-lg hover:bg-purple-50 transition"
                                            >
                                                Cancel Scan
                                            </button>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl text-amber-700 text-xs flex gap-2.5">
                                    <Smartphone className="flex-shrink-0 text-amber-600" size={18} />
                                    <div>
                                        <h5 className="font-bold">Web NFC Unsupported</h5>
                                        <p className="mt-0.5">Your browser or device does not support Web NFC API. Use manual enrollment below.</p>
                                    </div>
                                </div>
                            )}

                            {/* Manual Entry Fallback */}
                            <div className="space-y-3 pt-2">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                                    Manual Tag UID Enrollment
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. 04:A5:12:BC:EF:90:A0"
                                        className="flex-1 px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                                        value={manualUid}
                                        onChange={(e) => setManualUid(e.target.value)}
                                    />
                                    <button
                                        onClick={() => generateSimulatedTag(writingUser)}
                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                                        title="Simulate Card Tag"
                                    >
                                        Simulate
                                    </button>
                                </div>
                            </div>

                            {/* Error notification */}
                            {nfcWriteError && (
                                <div className="p-3 bg-red-50 border border-red-100 text-red-700 rounded-xl text-xs flex gap-2">
                                    <AlertTriangle className="flex-shrink-0" size={16} />
                                    <span>{nfcWriteError}</span>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => {
                                    stopNfcOperations()
                                    setWritingUser(null)
                                }}
                                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 font-semibold rounded-xl text-sm hover:bg-slate-50 transition"
                            >
                                Close
                            </button>
                            <button
                                onClick={() => handleAssignNfc(writingUser.id, manualUid)}
                                disabled={!manualUid.trim()}
                                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white font-semibold rounded-xl text-sm shadow transition"
                            >
                                Enroll Tag
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast Notifications */}
            {toast && (
                <div className="fixed bottom-6 right-6 z-50 animate-bounce-short">
                    <div className={`px-4 py-3 rounded-2xl text-white shadow-2xl flex items-center gap-3 font-semibold text-sm transition-all duration-300 border ${
                        toast.type === 'success' 
                            ? 'bg-emerald-600 border-emerald-500' 
                            : 'bg-red-600 border-red-500'
                    }`}>
                        {toast.type === 'success' ? <CheckCircle size={20} /> : <AlertTriangle size={20} />}
                        <span>{toast.msg}</span>
                    </div>
                </div>
            )}
        </div>
    )
}
