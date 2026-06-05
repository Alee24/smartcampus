import { useState, useEffect, useRef } from 'react'
import {
    UserPlus, Search, Filter, X, Edit, Trash2, Mail, Phone,
    Building, GraduationCap, Shield, ChevronLeft, ChevronRight,
    MoreVertical, CheckCircle, XCircle, AlertCircle, Camera, Key, LayoutGrid, Users as UsersIcon,
    Ban, Power, Lock, RefreshCw, Calendar, Terminal, Download, Copy, Check
} from 'lucide-react'
import { useNotification } from './components/Notification'

export default function Users() {
    const { showConfirm, showNotification } = useNotification()
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
    const [users, setUsers] = useState<any[]>([])
    const [filteredUsers, setFilteredUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [filterPhoto, setFilterPhoto] = useState('all')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [showAddModal, setShowAddModal] = useState(false)
    const [syncingDynamics, setSyncingDynamics] = useState(false)
    const [showSyncModal, setShowSyncModal] = useState(false)
    const [syncLogs, setSyncLogs] = useState<Array<{ time: string; level: 'info' | 'success' | 'error'; msg: string }>>([])

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const usersPerPage = 10

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        filterUsers()
    }, [users, searchQuery, filterRole, filterStatus, filterPhoto])

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

    const syncDynamicsUsersNow = async () => {
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
            
            addLog("Fetching integration config...", "info")
            const token = localStorage.getItem('token')
            
            // Try fetching config to extract Dynamics URL for display in log
            let dynamicsUrl = "https://dynamics.api.riara.ac.ke/v1"
            let clientId = ""
            try {
                const configRes = await fetch('/api/admin/ai-config', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (configRes.ok) {
                    const configData = await configRes.json()
                    dynamicsUrl = configData.dynamics_base_url || dynamicsUrl
                    clientId = configData.dynamics_client_id || ""
                }
            } catch (configErr) {}
            
            addLog(`OData Service Base URL: ${dynamicsUrl}`, "info")
            await sleep(400)

            const isMock = !clientId || clientId.toLowerCase().includes("mock") || clientId.toLowerCase().includes("test")

            if (isMock) {
                addLog("OAuth credentials missing or contain 'mock/test'. Entering high-fidelity simulation mode.", "info")
            } else {
                addLog("Validating OAuth/Basic credentials for OData endpoints...", "info")
            }
            await sleep(500)

            addLog("Executing remote sync procedure at backend route `/api/admin/dynamics/sync`...", "info")
            
            const startTime = Date.now()
            const res = await fetch('/api/admin/dynamics/sync', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
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
                addLog(`Database transactions committed successfully. Refreshing user directory...`, "success")
                
                showNotification("Dynamics ERP Sync completed successfully!", "success")
                fetchUsers()
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
        a.download = `dynamics-users-sync-log-${new Date().toISOString().slice(0,19).replace(/:/g, '-')}.txt`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            } else {
                console.error("Failed to fetch users:", res.status, res.statusText)
                if (res.status !== 404) { // Don't alert on 404 immediately during hot reload
                    // alert(`Failed to load users: ${res.status}`) 
                }
            }
        } catch (e) {
            console.error("Network error fetching users:", e)
        } finally {
            setLoading(false)
        }
    }

    const filterUsers = () => {
        let filtered = users

        // Search filter
        if (searchQuery) {
            filtered = filtered.filter(u =>
                u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.admission_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                u.email?.toLowerCase().includes(searchQuery.toLowerCase())
            )
        }

        // Role filter
        if (filterRole !== 'all') {
            filtered = filtered.filter(u => u.role?.toLowerCase() === filterRole.toLowerCase())
        }

        // Status filter
        if (filterStatus !== 'all') {
            filtered = filtered.filter(u => u.status?.toLowerCase() === filterStatus.toLowerCase())
        }

        // Photo filter
        if (filterPhoto === 'has_photo') {
            filtered = filtered.filter(u => !!u.profile_image && u.profile_image.trim() !== '')
        } else if (filterPhoto === 'missing_photo') {
            filtered = filtered.filter(u => !u.profile_image || u.profile_image.trim() === '')
        }

        setFilteredUsers(filtered)
        setCurrentPage(1) // Reset to first page when filtering
    }

    // Pagination logic
    const indexOfLastUser = currentPage * usersPerPage
    const indexOfFirstUser = indexOfLastUser - usersPerPage
    const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser)
    const totalPages = Math.ceil(filteredUsers.length / usersPerPage)

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': 
            case 'registered': return 'bg-green-100 text-green-700 border-green-200'
            case 'suspended': return 'bg-red-100 text-red-700 border-red-200'
            case 'graduated': return 'bg-blue-100 text-blue-700 border-blue-200'
            case 'deferred': return 'bg-orange-100 text-orange-700 border-orange-200'
            default: return 'bg-gray-100 text-gray-700 border-gray-200'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': 
            case 'registered': return <CheckCircle size={14} />
            case 'suspended': return <Ban size={14} />
            case 'graduated': return <GraduationCap size={14} />
            case 'deferred': return <Calendar size={14} />
            default: return <AlertCircle size={14} />
        }
    }

    const handleQuickStatusUpdate = async (user: any, newStatus: string) => {
        const confirmed = await showConfirm({
            title: "Update User Status",
            message: `Are you sure you want to change the status of ${user.full_name || 'this user'} to ${newStatus}?`,
            confirmText: "Change Status",
            cancelText: "Cancel"
        })
        if (!confirmed) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                fetchUsers() // Refresh
                showNotification(`Status updated to ${newStatus}`, 'success')
            } else {
                showNotification('Failed to update status', 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Error updating status', 'error')
        }
    }

    const handleQuickPasswordReset = async (user: any) => {
        const newPassword = prompt(`Enter new password for ${user.full_name}:`, "Student123")
        if (!newPassword) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}/reset-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: newPassword })
            })
            if (res.ok) {
                showNotification('Password reset successfully', 'success')
            } else {
                const data = await res.json().catch(() => ({}))
                showNotification(`Failed to reset password: ${data.detail || 'Unknown error'}`, 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Failed to reset password: Network error', 'error')
        }
    }

    // Calculate Stats
    const stats = {
        total: users.length,
        active: users.filter(u => ['active', 'Active', 'Registered'].includes(u.status)).length,
        students: users.filter(u => u.role === 'Student').length,
        staff: users.filter(u => u.role === 'Lecturer' || u.role === 'Admin' || u.role === 'Security' || u.role === 'Driver').length
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                <p className="text-gray-500 animate-pulse">Loading directory...</p>
            </div>
        )
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        User Directory
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Manage students, staff, and administrators
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {/* View Toggles */}
                    <div className="bg-white dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex items-center">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-400 hover:text-gray-600'}`}
                            title="List View"
                        >
                            <div className="rotate-90"><Filter size={20} /></div>
                        </button>
                        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1"></div>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'text-gray-400 hover:text-gray-600'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={20} />
                        </button>
                    </div>

                    <button
                        onClick={syncDynamicsUsersNow}
                        disabled={syncingDynamics}
                        className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-semibold shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50 active:scale-95"
                    >
                        <RefreshCw size={18} className={syncingDynamics ? "animate-spin" : ""} />
                        Sync ERP Users
                    </button>

                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-semibold shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                    >
                        <UserPlus size={20} />
                        Add User
                    </button>
                </div>
            </div>

            {/* Quick Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <StatCard
                    label="Total Users"
                    value={stats.total}
                    icon={<UsersIcon size={20} />}
                    color="blue"
                />
                <StatCard
                    label="Active Now"
                    value={stats.active}
                    icon={<CheckCircle size={20} />}
                    color="green"
                />
                <StatCard
                    label="Students"
                    value={stats.students}
                    icon={<GraduationCap size={20} />}
                    color="purple"
                />
                <StatCard
                    label="Staff & Admin"
                    value={stats.staff}
                    icon={<Shield size={20} />}
                    color="orange"
                />
            </div>

            {/* Search & Filter Bar */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    {/* Search - Takes up 3 columns */}
                    <div className="md:col-span-3 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search by name, ID, or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-gray-50 dark:bg-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors sm:text-sm"
                        />
                    </div>

                    {/* Filters */}
                    <div className="md:col-span-3">
                        <select
                            value={filterRole}
                            onChange={(e) => setFilterRole(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-900"
                        >
                            <option value="all">All Roles</option>
                            <option value="student">Students</option>
                            <option value="lecturer">Lecturers</option>
                            <option value="admin">Admins</option>
                            <option value="security">Security</option>
                            <option value="driver">Drivers</option>
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-900"
                        >
                            <option value="all">All Status</option>
                            <option value="active">Active</option>
                            <option value="registered">Registered</option>
                            <option value="suspended">Suspended</option>
                            <option value="graduated">Graduated</option>
                            <option value="deferred">Deferred</option>
                        </select>
                    </div>

                    <div className="md:col-span-3">
                        <select
                            value={filterPhoto}
                            onChange={(e) => setFilterPhoto(e.target.value)}
                            className="block w-full pl-3 pr-10 py-2.5 text-base border-gray-300 dark:border-gray-600 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm rounded-xl bg-gray-50 dark:bg-gray-900"
                        >
                            <option value="all">All Photo Status</option>
                            <option value="has_photo">With Photo ID</option>
                            <option value="missing_photo">Missing Photo ID</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            {viewMode === 'list' ? (
                <div className="glass-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                                        Contact
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider hidden lg:table-cell">
                                        School
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {currentUsers.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                                            <div className="flex flex-col items-center gap-2">
                                                <Search size={48} className="text-gray-300" />
                                                <p className="font-medium">No users found</p>
                                                <p className="text-sm">Try adjusting your filters</p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    currentUsers.map((user) => (
                                        <tr
                                            key={user.id}
                                            className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                                            onClick={() => setSelectedUser(user)}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-3">
                                                    {user.profile_image ? (
                                                        <img
                                                            src={user.profile_image}
                                                            alt={user.full_name}
                                                            className="w-10 h-10 rounded-full object-cover"
                                                        />
                                                    ) : (
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                                            {user.full_name?.charAt(0) || '?'}
                                                        </div>
                                                    )}
                                                    <div>
                                                        <div className="font-medium text-gray-900 dark:text-gray-100">
                                                            {user.full_name || 'Unknown'}
                                                        </div>
                                                        <div className="text-xs text-gray-500 font-mono">
                                                            {user.admission_number}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden md:table-cell">
                                                <div className="space-y-1">
                                                    {user.email && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                            <Mail size={14} />
                                                            <span className="truncate max-w-[200px]">{user.email}</span>
                                                        </div>
                                                    )}
                                                    {user.phone_number && (
                                                        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                            <Phone size={14} />
                                                            {user.phone_number}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 hidden lg:table-cell">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                                                    <Building size={14} />
                                                    {user.school || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                    <Shield size={12} />
                                                    {user.role || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(user.status)}`}>
                                                    {getStatusIcon(user.status)}
                                                    {user.status || 'Unknown'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setSelectedUser(user)
                                                    }}
                                                    className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                                >
                                                    <MoreVertical size={18} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="px-3 py-1 text-sm font-medium">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* GRID VIEW */
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-6">
                        {currentUsers.map((user) => (
                            <div
                                key={user.id}
                                className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-[var(--border-color)] overflow-hidden cursor-pointer group flex flex-col items-center p-6 relative animate-fade-in"
                                onClick={() => setSelectedUser(user)}
                            >


                                {/* Status Indicator (Top Left) */}
                                <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${user.status === 'active' ? 'bg-green-500' :
                                    user.status === 'suspended' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`}></div>

                                {/* Profile Image */}
                                <div className="mb-4 relative">
                                    {user.profile_image ? (
                                        <img
                                            src={user.profile_image.startsWith('http') ? user.profile_image : user.profile_image}
                                            alt={user.full_name}
                                            className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md group-hover:scale-105 transition-transform duration-300"
                                        />
                                    ) : (
                                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md group-hover:scale-105 transition-transform duration-300">
                                            {user.full_name?.charAt(0) || '?'}
                                        </div>
                                    )}
                                    {/* Role Badge floating */}
                                    <div className="absolute -bottom-2 translate-x-1/2 right-1/2 whitespace-nowrap px-3 py-1 bg-white/90 backdrop-blur-sm border border-gray-100 rounded-full text-xs font-bold text-purple-600 shadow-sm">
                                        {user.role}
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="text-center w-full mt-2 mb-4">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 transition-colors">
                                        {user.full_name}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-mono">{user.admission_number}</p>

                                    <div className="space-y-2 w-full text-sm mt-3">
                                        {user.school && (
                                            <div className="flex items-center gap-2 justify-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 py-1.5 rounded-lg">
                                                <Building size={14} />
                                                <span className="truncate max-w-[150px]">{user.school}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Quick Actions Row */}
                                <div className="grid grid-cols-3 gap-2 w-full mt-auto pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setSelectedUser(user) }}
                                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-purple-600 transition-colors"
                                        title="Edit Profile"
                                    >
                                        <Edit size={16} />
                                        <span className="text-[10px] font-medium">Edit</span>
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const statuses = ['Active', 'Suspended', 'Graduated', 'Registered', 'Deferred'];
                                            const currentIndex = statuses.indexOf(user.status || 'Active');
                                            const nextStatus = statuses[(currentIndex + 1) % statuses.length];
                                            handleQuickStatusUpdate(user, nextStatus)
                                        }}
                                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600"
                                        title="Cycle Status"
                                    >
                                        <RefreshCw size={16} />
                                        <span className="text-[10px] font-medium">Cycle Status</span>
                                    </button>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleQuickPasswordReset(user) }}
                                        className="flex flex-col items-center justify-center gap-1 p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 hover:text-blue-600 transition-colors"
                                        title="Reset Password"
                                    >
                                        <Key size={16} />
                                        <span className="text-[10px] font-medium">Reset</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination for Grid (Duplicated to avoid nested div issues) */}
                    {totalPages > 1 && (
                        <div className="px-4 py-3 bg-[var(--bg-surface)] rounded-xl border border-[var(--border-color)] flex items-center justify-between">
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                Showing {indexOfFirstUser + 1} to {Math.min(indexOfLastUser, filteredUsers.length)} of {filteredUsers.length}
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronLeft size={18} />
                                </button>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    <ChevronRight size={18} />
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Side Panel for User Details */}
            {selectedUser && (
                <UserDetailPanel
                    user={selectedUser}
                    onClose={() => setSelectedUser(null)}
                    onRefresh={fetchUsers}
                />
            )}

            {/* Add User Modal */}
            {showAddModal && (
                <AddUserModal
                    onClose={() => setShowAddModal(false)}
                    onRefresh={fetchUsers}
                />
            )}

            {/* Sync Progress Modal */}
            {showSyncModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-700 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[550px]">
                        {/* Header */}
                        <div className="bg-slate-800 px-6 py-4 flex items-center justify-between border-b border-slate-700">
                            <div className="flex items-center gap-3">
                                <Terminal className="text-purple-400" size={24} />
                                <span className="font-bold text-slate-100 font-mono text-lg">Dynamics ERP Users Sync Console</span>
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

// Side Panel Component
function UserDetailPanel({ user, onClose, onRefresh }: any) {
    const { showConfirm, showNotification } = useNotification()
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState(user)
    const fileInputRef = useRef<HTMLInputElement>(null)

    // Sync state when user prop changes
    useEffect(() => {
        setEditForm(user)
    }, [user])

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        
        const formData = new FormData()
        formData.append('file', file)
        formData.append('user_id', user.id)
        
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/upload-profile-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            
            if (res.ok) {
                const data = await res.json()
                showNotification('Profile image uploaded successfully!', 'success')
                setEditForm((prev: any) => ({ ...prev, profile_image: data.image_url }))
                onRefresh()
            } else {
                const data = await res.json().catch(() => ({}))
                showNotification(`Upload failed: ${data.detail || 'Unknown error'}`, 'error')
            }
        } catch (err) {
            console.error(err)
            showNotification('Error uploading file', 'error')
        }
    }

    const handleRemovePhoto = async () => {
        const confirmed = await showConfirm({
            title: "Remove Profile Photo",
            message: "Are you sure you want to remove this user's profile photo?",
            confirmText: "Remove Photo",
            cancelText: "Cancel",
            isDanger: true
        })
        if (!confirmed) return

        try {
            const token = localStorage.getItem('token')
            const formData = new FormData()
            formData.append('user_id', user.id)
            
            const res = await fetch('/api/users/remove-profile-image', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })
            
            if (res.ok) {
                showNotification('Profile image removed successfully!', 'success')
                setEditForm((prev: any) => ({ ...prev, profile_image: null }))
                onRefresh()
            } else {
                const data = await res.json().catch(() => ({}))
                showNotification(`Failed to remove image: ${data.detail || 'Unknown error'}`, 'error')
            }
        } catch (err) {
            console.error(err)
            showNotification('Error removing profile photo', 'error')
        }
    }

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('token')

            // Sanitize payload (Fix date formats)
            const payload = { ...editForm }
            if (payload.admission_date && typeof payload.admission_date === 'string') {
                payload.admission_date = payload.admission_date.split('T')[0]
            }
            if (payload.expiry_date && typeof payload.expiry_date === 'string') {
                payload.expiry_date = payload.expiry_date.split('T')[0]
            }

            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            })

            if (res.ok) {
                showNotification('User updated successfully!', 'success')
                setIsEditing(false)
                onRefresh()
            } else {
                const data = await res.json()
                showNotification(`Failed to update user: ${data.detail || res.statusText}`, 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Error updating user: Network or Server Error', 'error')
        }
    }

    const handleDelete = async () => {
        const confirmed = await showConfirm({
            title: "Delete User",
            message: `Are you sure you want to delete ${user.full_name || 'this user'}? This action cannot be undone.`,
            confirmText: "Delete User",
            cancelText: "Cancel",
            isDanger: true
        })
        if (!confirmed) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                showNotification('User deleted successfully', 'success')
                onRefresh()
                onClose()
            } else {
                showNotification('Failed to delete user', 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Error deleting user', 'error')
        }
    }

    const handleResetPassword = async () => {
        const newPassword = prompt("Enter new password for this user (leave empty to reset to default 'Student123'):")
        if (newPassword === null) return

        const passwordToSet = newPassword.trim() || 'Student123'

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}/reset-password`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ new_password: passwordToSet })
            })

            if (res.ok) {
                showNotification(`Password reset to: ${passwordToSet}`, 'success')
            } else {
                const data = await res.json().catch(() => ({}))
                showNotification(`Failed to reset password: ${data.detail || 'Unknown error'}`, 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Failed to reset password: Network error', 'error')
        }
    }

    const handleStatusToggle = async () => {
        const newStatus = user.status === 'active' ? 'suspended' : 'active'
        const confirmed = await showConfirm({
            title: "Toggle User Status",
            message: `Are you sure you want to change status to ${newStatus}?`,
            confirmText: "Change Status",
            cancelText: "Cancel"
        })
        if (!confirmed) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            })
            if (res.ok) {
                showNotification(`Status changed to ${newStatus}`, 'success')
                onRefresh()
                onClose()
            } else {
                showNotification('Failed to update status', 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Error changing status', 'error')
        }
    }

    // Modern "Slide-over" with NO dark backdrop
    return (
        <>
            {/* Invisible overlay to catch clicks outside */}
            <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={onClose}
            ></div>

            {/* The Panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full md:w-[480px] bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-100 dark:border-gray-800 transform transition-transform animate-slide-in-right flex flex-col">

                {/* Header Actions */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-800">
                    <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                        {isEditing ? 'Edit User Profile' : 'User Profile'}
                    </h2>
                    <div className="flex items-center gap-2">
                        {isEditing ? (
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        ) : (
                            <button
                                onClick={() => setIsEditing(true)}
                                className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Edit Profile"
                            >
                                <Edit size={20} />
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Identity Section */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative group">
                            {editForm.profile_image ? (
                                <img
                                    src={editForm.profile_image}
                                    alt={editForm.full_name || user.full_name}
                                    className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-800 shadow-lg transition-transform duration-200 group-hover:scale-105"
                                />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-5xl font-bold shadow-lg">
                                    {(editForm.full_name || user.full_name)?.charAt(0) || '?'}
                                </div>
                            )}
                            <div className={`absolute bottom-1 right-1 w-6 h-6 border-4 border-white dark:border-gray-900 rounded-full ${editForm.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            
                            {isEditing && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex flex-col items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-white hover:text-purple-300 p-1 flex items-center gap-1 text-xs font-semibold"
                                        title="Upload New Photo"
                                    >
                                        <Camera size={16} />
                                        <span>Change</span>
                                    </button>
                                    {editForm.profile_image && (
                                        <button
                                            type="button"
                                            onClick={handleRemovePhoto}
                                            className="text-red-400 hover:text-red-300 p-1 flex items-center gap-1 text-xs font-semibold"
                                            title="Remove Photo"
                                        >
                                            <Trash2 size={16} />
                                            <span>Remove</span>
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                        {isEditing && (
                            <div className="mt-3 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-3 py-1 text-xs bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/50 rounded-lg font-medium transition-colors flex items-center gap-1"
                                >
                                    <Camera size={14} /> Upload Photo
                                </button>
                                {editForm.profile_image && (
                                    <button
                                        type="button"
                                        onClick={handleRemovePhoto}
                                        className="px-3 py-1 text-xs bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-lg font-medium transition-colors flex items-center gap-1"
                                    >
                                        <Trash2 size={14} /> Remove Photo
                                    </button>
                                )}
                            </div>
                        )}

                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            accept="image/*"
                            className="hidden"
                        />

                        {!isEditing && (
                            <div className="text-center mt-4">
                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{user.full_name}</h3>
                                <div className="flex items-center justify-center gap-2 mt-2">
                                    <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full text-xs font-bold uppercase tracking-wide">
                                        {user.role}
                                    </span>
                                    <span className="text-gray-500 dark:text-gray-400 font-mono text-sm">
                                        {user.admission_number}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {isEditing ? (
                        /* EDIT FORM */
                        <div className="space-y-6 animate-fade-in">
                            {/* Personal Information */}
                            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Personal Details</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">First Name</label>
                                        <input
                                            type="text"
                                            value={editForm.first_name || ''}
                                            onChange={e => setEditForm({ ...editForm, first_name: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Last Name</label>
                                        <input
                                            type="text"
                                            value={editForm.last_name || ''}
                                            onChange={e => setEditForm({ ...editForm, last_name: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Email Address</label>
                                        <input
                                            type="email"
                                            value={editForm.email || ''}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Phone Number</label>
                                        <input
                                            type="text"
                                            value={editForm.phone_number || ''}
                                            onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Gender</label>
                                        <select
                                            value={editForm.gender || ''}
                                            onChange={e => setEditForm({ ...editForm, gender: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        >
                                            <option value="">Select Gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Institution Profile */}
                            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Institution Profile</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Admission / ID Number</label>
                                        <input
                                            type="text"
                                            value={editForm.admission_number || ''}
                                            onChange={e => setEditForm({ ...editForm, admission_number: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white font-mono"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">User Role</label>
                                        <select
                                            value={editForm.role || ''}
                                            onChange={e => setEditForm({ ...editForm, role: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        >
                                            <option value="student">Student</option>
                                            <option value="staff">Staff</option>
                                            <option value="gatekeeper">Gatekeeper</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Program / Course</label>
                                        <input
                                            type="text"
                                            value={editForm.program || ''}
                                            onChange={e => setEditForm({ ...editForm, program: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">School / Department</label>
                                        <input
                                            type="text"
                                            value={editForm.school || ''}
                                            onChange={e => setEditForm({ ...editForm, school: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Account Administration */}
                            <div className="bg-gray-50 dark:bg-gray-800/30 rounded-2xl p-5 border border-gray-100 dark:border-gray-800 space-y-4">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Account Settings</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Account Status</label>
                                        <select
                                            value={editForm.status || 'active'}
                                            onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        >
                                            <option value="active">Active</option>
                                            <option value="suspended">Suspended</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Expiry Date</label>
                                        <input
                                            type="date"
                                            value={editForm.expiry_date ? editForm.expiry_date.split('T')[0] : ''}
                                            onChange={e => setEditForm({ ...editForm, expiry_date: e.target.value })}
                                            className="w-full px-4 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all text-gray-950 dark:text-white"
                                        />
                                    </div>
                                </div>

                                <div className="pt-2 flex justify-between gap-3 border-t border-gray-200/50 dark:border-gray-700/50">
                                    <button
                                        type="button"
                                        onClick={handleResetPassword}
                                        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white dark:bg-gray-800 text-xs text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-bold transition-all"
                                    >
                                        <Key size={14} /> Reset Password
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    onClick={handleUpdate}
                                    className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:shadow-purple-500/10 transition-all active:scale-[0.98]"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-5 py-3 bg-gray-100 hover:bg-gray-250 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* READ ONLY DETAILS */
                        <div className="space-y-6">
                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Contact Information</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-blue-500 shadow-sm border border-gray-100 dark:border-gray-700">
                                            <Mail size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Email Address</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.email || 'Not set'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-green-500 shadow-sm border border-gray-100 dark:border-gray-700">
                                            <Phone size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Phone Number</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.phone_number || 'Not set'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-2xl p-5 border border-gray-100 dark:border-gray-800">
                                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Academic & Status</h4>
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-purple-500 shadow-sm border border-gray-100 dark:border-gray-700">
                                            <Building size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">School / Department</p>
                                            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{user.school || 'Not set'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 flex items-center justify-center text-orange-500 shadow-sm border border-gray-100 dark:border-gray-700">
                                            <Shield size={18} />
                                        </div>
                                        <div>
                                            <p className="text-xs text-gray-500 font-medium">Account Status</p>
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full ${user.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 capitalize">{user.status}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions (Only visible when not editing) */}
                {!isEditing && (
                    <div className="p-6 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900">
                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={handleStatusToggle}
                                className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-bold transition-all shadow-sm border ${user.status === 'active'
                                    ? 'bg-white text-red-600 border-gray-200 hover:bg-red-50 hover:border-red-200'
                                    : 'bg-green-600 text-white border-transparent hover:bg-green-700 shadow-green-500/20'
                                    }`}
                            >
                                {user.status === 'active' ? <Ban size={18} /> : <Power size={18} />}
                                {user.status === 'active' ? 'Suspend' : 'Activate'}
                            </button>

                            <button
                                onClick={handleResetPassword}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-200 dark:border-gray-700 rounded-xl font-bold hover:bg-gray-50 dark:hover:bg-gray-700 transition-all shadow-sm"
                            >
                                <Key size={18} />
                                Reset Pwd
                            </button>
                        </div>
                        <button
                            onClick={handleDelete}
                            className="w-full mt-3 flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 text-sm font-medium transition-colors py-2"
                        >
                            <Trash2 size={16} />
                            Permanently Delete User
                        </button>
                    </div>
                )}
            </div>
        </>
    )
}

// Detail Row Component
function DetailRow({ icon, label, value }: any) {
    return (
        <div className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-purple-600 mt-0.5">{icon}</div>
            <div className="flex-1">
                <div className="text-xs text-gray-500 uppercase font-semibold">{label}</div>
                <div className="text-sm font-medium mt-0.5">{value}</div>
            </div>
        </div>
    )
}

// Add User Modal (Simplified)
function AddUserModal({ onClose, onRefresh }: any) {
    const [formData, setFormData] = useState({
        admission_number: '',
        first_name: '',
        last_name: '',
        email: '',
        phone_number: '',
        school: '',
        program: '',
        gender: '',
        role_name: 'Student',
        password: ''
    })

    const handleSubmit = async (e: any) => {
        e.preventDefault()
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            })

            if (res.ok) {
                alert('User created successfully!')
                onRefresh()
                onClose()
            } else {
                alert('Failed to create user')
            }
        } catch (e) {
            console.error(e)
            alert('Error creating user')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-bold">Add New User</h3>
                        <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Admission Number</label>
                            <input
                                type="text"
                                required
                                value={formData.admission_number}
                                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">First Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.first_name}
                                    onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Last Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.last_name}
                                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Phone</label>
                                <input
                                    type="text"
                                    value={formData.phone_number}
                                    onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Gender</label>
                                <select
                                    value={formData.gender}
                                    onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="">Select</option>
                                    <option value="male">Male</option>
                                    <option value="female">Female</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Role</label>
                                <select
                                    value={formData.role_name}
                                    onChange={(e) => setFormData({ ...formData, role_name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                                >
                                    <option value="Student">Student</option>
                                    <option value="Lecturer">Lecturer</option>
                                    <option value="Admin">Admin</option>
                                    <option value="Security">Security</option>
                                    <option value="Driver">Driver</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Program / Course</label>
                            <input
                                type="text"
                                placeholder="e.g. B.Sc Computer Science"
                                value={formData.program}
                                onChange={(e) => setFormData({ ...formData, program: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">School/Department</label>
                            <input
                                type="text"
                                value={formData.school}
                                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Password</label>
                            <input
                                type="password"
                                required
                                placeholder="Initial Password"
                                value={formData.password}
                                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                            />
                            <p className="text-[10px] text-gray-500 mt-1 italic">* Users can change this after their first login</p>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
                            >
                                Create User
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-all"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}

function StatCard({ label, value, icon, color }: any) {
    const colors: any = {
        blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        green: 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        purple: 'bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        orange: 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400',
    }

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-[var(--border-color)] shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
            <div className={`p-3 rounded-xl ${colors[color]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</div>
            </div>
        </div>
    )
}


