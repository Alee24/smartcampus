import { useState, useEffect } from 'react'
import {
    UserPlus, Search, Filter, X, Edit, Trash2, Mail, Phone,
    Building, GraduationCap, Shield, ChevronLeft, ChevronRight,
    MoreVertical, CheckCircle, XCircle, AlertCircle, Camera, Key, LayoutGrid, Users as UsersIcon
} from 'lucide-react'

export default function Users() {
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid')
    const [users, setUsers] = useState<any[]>([])
    const [filteredUsers, setFilteredUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [filterRole, setFilterRole] = useState('all')
    const [filterStatus, setFilterStatus] = useState('all')
    const [selectedUser, setSelectedUser] = useState<any>(null)
    const [showAddModal, setShowAddModal] = useState(false)

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const usersPerPage = 10

    useEffect(() => {
        fetchUsers()
    }, [])

    useEffect(() => {
        filterUsers()
    }, [users, searchQuery, filterRole, filterStatus])

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
            case 'active': return 'bg-green-100 text-green-700 border-green-200'
            case 'suspended': return 'bg-red-100 text-red-700 border-red-200'
            case 'cleared': return 'bg-blue-100 text-blue-700 border-blue-200'
            default: return 'bg-yellow-100 text-yellow-700 border-yellow-200'
        }
    }

    const getStatusIcon = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'active': return <CheckCircle size={14} />
            case 'suspended': return <XCircle size={14} />
            default: return <AlertCircle size={14} />
        }
    }

    // Calculate Stats
    const stats = {
        total: users.length,
        active: users.filter(u => u.status === 'active').length,
        students: users.filter(u => u.role === 'Student').length,
        staff: users.filter(u => u.role === 'Lecturer' || u.role === 'Admin').length
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
                    {/* Search - Takes up more space */}
                    <div className="md:col-span-6 relative">
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
                            <option value="suspended">Suspended</option>
                            <option value="cleared">Cleared</option>
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
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm">
                                                        {user.full_name?.charAt(0) || '?'}
                                                    </div>
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
                                {/* Actions Button */}
                                <button className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all z-10" onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedUser(user);
                                }}>
                                    <MoreVertical size={18} />
                                </button>

                                {/* Status Indicator (Top Left) */}
                                <div className={`absolute top-4 left-4 w-3 h-3 rounded-full ${user.status === 'active' ? 'bg-green-500' :
                                    user.status === 'suspended' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`}></div>

                                {/* Profile Image */}
                                <div className="mb-4 relative">
                                    {user.profile_image ? (
                                        <img
                                            src={user.profile_image}
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
                                <div className="text-center w-full mt-2">
                                    <h3 className="font-bold text-lg text-gray-900 dark:text-gray-100 truncate group-hover:text-purple-600 transition-colors">
                                        {user.full_name}
                                    </h3>
                                    <p className="text-sm text-gray-500 font-mono mb-4">{user.admission_number}</p>

                                    <div className="space-y-2 w-full text-sm">
                                        {user.school && (
                                            <div className="flex items-center gap-2 justify-center text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 py-1.5 rounded-lg">
                                                <Building size={14} />
                                                <span className="truncate max-w-[150px]">{user.school}</span>
                                            </div>
                                        )}
                                        {user.email && (
                                            <div className="flex items-center gap-2 justify-center text-gray-600 dark:text-gray-400">
                                                <Mail size={14} />
                                                <span className="truncate max-w-[180px]">{user.email}</span>
                                            </div>
                                        )}
                                    </div>
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
        </div>
    )
}

// Side Panel Component
function UserDetailPanel({ user, onClose, onRefresh }: any) {


    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState(user)

    const handleUpdate = async () => {
        try {
            const token = localStorage.getItem('token')
            // Map 'role' name to what API expects if needed, currently API handles role name update
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(editForm)
            })

            if (res.ok) {
                alert('User updated successfully!')
                setIsEditing(false)
                onRefresh()
            } else {
                alert('Failed to update user')
            }
        } catch (e) {
            console.error(e)
            alert('Error updating user')
        }
    }

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                // alert('User deleted successfully!')
                onRefresh()
                onClose()
            } else {
                alert('Failed to delete user')
            }
        } catch (e) {
            console.error(e)
            alert('Error deleting user')
        }
    }

    const handleResetPassword = async () => {
        const newPassword = prompt("Enter new password for this user (leave empty to reset to default 'Student123'):")
        if (newPassword === null) return // Cancelled

        const passwordToSet = newPassword.trim() || 'Student123'

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/users/${user.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ password: passwordToSet })
            })

            if (res.ok) {
                alert(`Password reset to: ${passwordToSet}`)
            } else {
                alert('Failed to reset password')
            }
        } catch (e) {
            console.error(e)
            alert('Error resetting password')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm animate-fade-in">
            <div
                className="w-full sm:w-96 bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto animate-slide-in-right"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 p-4 flex items-center justify-between z-10">
                    <h3 className="text-lg font-bold text-white">{isEditing ? 'Edit User' : 'User Details'}</h3>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-white" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4">
                    {/* Profile Picture */}
                    <div className="flex flex-col items-center gap-3 py-4">
                        {user.profile_image ? (
                            <img
                                src={user.profile_image}
                                alt={user.full_name}
                                className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md relative z-0"
                            />
                        ) : (
                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-3xl font-bold border-4 border-white shadow-md">
                                {user.full_name?.charAt(0) || '?'}
                            </div>
                        )}
                        {!isEditing && (
                            <div className="text-center">
                                <h4 className="font-bold text-lg text-gray-900 dark:text-gray-100">{user.full_name}</h4>
                                <p className="text-sm text-gray-500 font-mono">{user.admission_number}</p>
                            </div>
                        )}
                    </div>

                    {/* Form or Details */}
                    {isEditing ? (
                        <div className="space-y-4 animate-fade-in">
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
                                <input
                                    type="text"
                                    value={editForm.full_name || ''}
                                    onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 mt-1 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Email</label>
                                <input
                                    type="email"
                                    value={editForm.email || ''}
                                    onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 mt-1 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">Phone</label>
                                <input
                                    type="text"
                                    value={editForm.phone_number || ''}
                                    onChange={e => setEditForm({ ...editForm, phone_number: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 mt-1 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-semibold text-gray-500 uppercase">School/Department</label>
                                <input
                                    type="text"
                                    value={editForm.school || ''}
                                    onChange={e => setEditForm({ ...editForm, school: e.target.value })}
                                    className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 mt-1 dark:bg-gray-800 dark:border-gray-700"
                                />
                            </div>
                            <div className="flex gap-2 pt-2">
                                <button
                                    onClick={handleUpdate}
                                    className="flex-1 bg-purple-600 text-white py-2 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                                >
                                    Save Changes
                                </button>
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg font-bold hover:bg-gray-300 transition-colors dark:bg-gray-700 dark:text-gray-300"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-3 animate-fade-in">
                            <DetailRow icon={<Mail size={16} />} label="Email" value={user.email || 'Not set'} />
                            <DetailRow icon={<Phone size={16} />} label="Phone" value={user.phone_number || 'Not set'} />
                            <DetailRow icon={<Building size={16} />} label="School" value={user.school || 'Not set'} />
                            <DetailRow icon={<Shield size={16} />} label="Role" value={user.role || 'Not set'} />
                            <DetailRow icon={<GraduationCap size={16} />} label="Status" value={user.status || 'Unknown'} />
                        </div>
                    )}

                    {/* Actions */}
                    {!isEditing && (
                        <div className="pt-4 space-y-2 border-t border-gray-200 dark:border-gray-700">
                            <button
                                onClick={() => setIsEditing(true)}
                                className="w-full flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-all"
                            >
                                <Edit size={16} />
                                Edit User
                            </button>
                            <button
                                onClick={handleResetPassword}
                                className="w-full flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all"
                            >
                                <Key size={16} />
                                Reset Password
                            </button>
                            <button
                                onClick={handleDelete}
                                className="w-full flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                            >
                                <Trash2 size={16} />
                                Delete User
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
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
        full_name: '',
        email: '',
        school: '',
        role: 'Student'
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

                        <div>
                            <label className="block text-sm font-medium mb-1">Full Name</label>
                            <input
                                type="text"
                                required
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

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
                            <label className="block text-sm font-medium mb-1">School/Department</label>
                            <input
                                type="text"
                                value={formData.school}
                                onChange={(e) => setFormData({ ...formData, school: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Role</label>
                            <select
                                value={formData.role}
                                onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="Student">Student</option>
                                <option value="Lecturer">Lecturer</option>
                                <option value="Admin">Admin</option>
                                <option value="Security">Security</option>
                            </select>
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


