import React, { useState, useEffect } from 'react'
import { Megaphone, Calendar, FileText, User, Trash2, Search, Plus, X, Upload, ExternalLink } from 'lucide-react'
import { useNotification } from './components/Notification'

interface NoticeItem {
    id: string
    title: string
    content: string
    attachment_url?: string
    author_id: string
    author_name: string
    author_role: string
    created_at: string
}

export default function NoticeBoard() {
    const { showConfirm, showNotification } = useNotification()
    const [notices, setNotices] = useState<NoticeItem[]>([])
    const [searchQuery, setSearchQuery] = useState('')
    const [loading, setLoading] = useState(true)
    const [showCreateModal, setShowCreateModal] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    // Form state
    const [formTitle, setFormTitle] = useState('')
    const [formContent, setFormContent] = useState('')
    const [selectedFile, setSelectedFile] = useState<File | null>(null)

    // User details
    const currentUserId = localStorage.getItem('userId')
    const currentUserRole = (localStorage.getItem('userRole') || '').toLowerCase()
    
    // Can post if Admin, SuperAdmin, Lecturer, or Student Leader
    const canPost = ['superadmin', 'admin', 'lecturer', 'student leader', 'student_leader'].includes(currentUserRole)

    useEffect(() => {
        fetchNotices()
    }, [])

    const fetchNotices = async () => {
        try {
            setLoading(true)
            const token = localStorage.getItem('token')
            const res = await fetch('/api/notice-board', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setNotices(data)
            } else {
                showNotification('Failed to fetch notice board announcements', 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Error loading notice board', 'error')
        } finally {
            setLoading(false)
        }
    }

    const handleCreatePost = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formTitle.trim() || !formContent.trim()) {
            showNotification('Please fill in all required fields', 'warning')
            return
        }

        try {
            setSubmitting(true)
            const token = localStorage.getItem('token')
            const formData = new FormData()
            formData.append('title', formTitle)
            formData.append('content', formContent)
            if (selectedFile) {
                formData.append('file', selectedFile)
            }

            const res = await fetch('/api/notice-board', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            })

            if (res.ok) {
                showNotification('Announcement posted successfully!', 'success')
                setFormTitle('')
                setFormContent('')
                setSelectedFile(null)
                setShowCreateModal(false)
                fetchNotices()
            } else {
                const data = await res.json().catch(() => ({}))
                showNotification(`Failed to post notice: ${data.detail || 'Unknown error'}`, 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Network error posting notice', 'error')
        } finally {
            setSubmitting(false)
        }
    }

    const handleDeleteNotice = async (noticeId: string) => {
        const confirmed = await showConfirm({
            title: "Delete Announcement",
            message: "Are you sure you want to delete this notice? This action cannot be undone.",
            confirmText: "Delete Notice",
            cancelText: "Cancel",
            isDanger: true
        })
        if (!confirmed) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/notice-board/${noticeId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                showNotification('Notice deleted successfully', 'success')
                fetchNotices()
            } else {
                showNotification('Failed to delete notice', 'error')
            }
        } catch (e) {
            console.error(e)
            showNotification('Error deleting notice', 'error')
        }
    }

    const filteredNotices = notices.filter(notice => 
        notice.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        notice.author_name.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const formatNoticeDate = (dateStr: string) => {
        try {
            const date = new Date(dateStr)
            return date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            })
        } catch {
            return dateStr
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto p-4 sm:p-6 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div>
                    <div className="flex items-center gap-2 text-purple-600 dark:text-purple-400 mb-1">
                        <Megaphone className="w-5 h-5 animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-wider">Campus Communications</span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white">University Notice Board</h1>
                    <p className="text-sm text-gray-500 mt-1">Official circulars, study resources, and university updates.</p>
                </div>
                {canPost && (
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold shadow-lg hover:shadow-purple-500/20 transition-all active:scale-[0.98] shrink-0"
                    >
                        <Plus size={18} />
                        Post Announcement
                    </button>
                )}
            </div>

            {/* Filter bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <Search size={18} />
                </div>
                <input
                    type="text"
                    placeholder="Search announcements by title, content, or author..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all text-sm text-gray-950 dark:text-white"
                />
            </div>

            {/* Notice board list */}
            {loading ? (
                <div className="grid gap-6">
                    {[1, 2].map(n => (
                        <div key={n} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm animate-pulse space-y-4">
                            <div className="h-6 bg-gray-200 dark:bg-gray-800 rounded-md w-3/4"></div>
                            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-1/4"></div>
                            <div className="space-y-2 pt-2">
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md"></div>
                                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded-md w-5/6"></div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : filteredNotices.length === 0 ? (
                <div className="bg-white dark:bg-gray-900 border border-gray-150 dark:border-gray-800 rounded-2xl p-12 text-center text-gray-500">
                    <Megaphone className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-700" />
                    <h3 className="text-lg font-bold text-gray-800 dark:text-gray-200 mb-1">No Announcements Found</h3>
                    <p className="text-sm">There are currently no notice board items matching your search query.</p>
                </div>
            ) : (
                <div className="grid gap-6">
                    {filteredNotices.map(notice => {
                        const isNoticeAuthor = notice.author_id === currentUserId
                        const isSystemAdmin = ['superadmin', 'admin'].includes(currentUserRole)
                        const canDelete = isNoticeAuthor || isSystemAdmin

                        return (
                            <div 
                                key={notice.id} 
                                className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
                            >
                                <div className="flex justify-between items-start gap-4 mb-3">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                                        {notice.title}
                                    </h2>
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDeleteNotice(notice.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors shrink-0"
                                            title="Delete Post"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-gray-500 mb-4 pb-3 border-b border-gray-100 dark:border-gray-800/80">
                                    <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
                                        <User size={14} className="text-purple-500" />
                                        <span>{notice.author_name}</span>
                                        <span className="px-2 py-0.5 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-400 rounded-md font-bold uppercase text-[9px] tracking-wider">
                                            {notice.author_role}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Calendar size={14} />
                                        <span>{formatNoticeDate(notice.created_at)}</span>
                                    </div>
                                </div>

                                <div className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                    {notice.content}
                                </div>

                                {notice.attachment_url && (
                                    <div className="mt-4 pt-3 border-t border-gray-50 dark:border-gray-800/40">
                                        {notice.attachment_url.match(/\.(jpeg|jpg|gif|png|webp)/i) ? (
                                            <div className="space-y-2">
                                                <a 
                                                    href={notice.attachment_url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:underline font-bold"
                                                >
                                                    <FileText size={14} /> View Attached Image <ExternalLink size={12} />
                                                </a>
                                                <img 
                                                    src={notice.attachment_url} 
                                                    alt="Circular Attachment" 
                                                    className="max-h-96 rounded-lg object-contain border border-gray-200 dark:border-gray-800 shadow-sm"
                                                />
                                            </div>
                                        ) : (
                                            <a 
                                                href={notice.attachment_url} 
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 text-xs text-gray-700 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 font-bold transition-all"
                                            >
                                                <FileText size={14} className="text-purple-500" />
                                                Download Attachment Material
                                                <ExternalLink size={12} />
                                            </a>
                                        )}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            {/* Create Announcement Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-100 dark:border-gray-800">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100 dark:border-gray-800">
                                <div className="flex items-center gap-2">
                                    <Megaphone className="w-5 h-5 text-purple-600" />
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">New Announcement</h3>
                                </div>
                                <button 
                                    onClick={() => setShowCreateModal(false)} 
                                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreatePost} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Title / Subject *</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. End of Semester Exam Timetable Released"
                                        value={formTitle}
                                        onChange={e => setFormTitle(e.target.value)}
                                        className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-950 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Announcement Body *</label>
                                    <textarea
                                        required
                                        rows={6}
                                        placeholder="Write details of the circular or instructions here..."
                                        value={formContent}
                                        onChange={e => setFormContent(e.target.value)}
                                        className="w-full px-4 py-2 text-sm border border-gray-300 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white dark:bg-gray-800 text-gray-950 dark:text-white"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Attachment Material (Optional)</label>
                                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-xl hover:border-purple-500 dark:hover:border-purple-400 transition-colors">
                                        <div className="space-y-1 text-center">
                                            <Upload className="mx-auto h-12 w-12 text-gray-400" />
                                            <div className="flex text-sm text-gray-600 dark:text-gray-400">
                                                <label className="relative cursor-pointer bg-white dark:bg-gray-900 rounded-md font-bold text-purple-600 hover:text-purple-500 focus-within:outline-none">
                                                    <span>Upload a file</span>
                                                    <input 
                                                        type="file" 
                                                        className="sr-only" 
                                                        onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                                                    />
                                                </label>
                                                <p className="pl-1">or drag and drop</p>
                                            </div>
                                            <p className="text-xs text-gray-500">PDF, PNG, JPG, DOC up to 10MB</p>
                                            {selectedFile && (
                                                <p className="text-xs text-purple-600 dark:text-purple-400 font-bold mt-2">
                                                    Selected: {selectedFile.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex gap-3 border-t border-gray-100 dark:border-gray-800">
                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="flex-1 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-xl font-bold shadow-lg transition-all active:scale-[0.98]"
                                    >
                                        {submitting ? 'Posting circular...' : 'Post to Notice Board'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="px-5 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-xl font-bold transition-all"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
