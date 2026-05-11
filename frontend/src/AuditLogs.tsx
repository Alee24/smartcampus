import React, { useState, useEffect } from 'react';
import { 
    History, Search, Filter, Calendar, 
    User as UserIcon, Activity, ArrowRight,
    CheckCircle, AlertCircle, Trash2, Edit, LogIn, LogOut, Plus, Info, X,
    Database, FileText, AlertTriangle
} from 'lucide-react';

interface AuditLog {
    id: string;
    timestamp: string;
    user_name: string;
    action_type: string;
    table_name: string;
    record_id: string;
    description: string;
    ip_address: string;
    old_values: any;
    new_values: any;
}

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        startDate: '',
        endDate: '',
        actionType: '',
    });
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        fetchLogs();
    }, [filters]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = '/api/audit?';
            if (filters.startDate) url += `start_date=${filters.startDate}&`;
            if (filters.endDate) url += `end_date=${filters.endDate}&`;
            if (filters.actionType) url += `action_type=${filters.actionType.toLowerCase()}&`;

            const res = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setLogs(data);
            }
        } catch (err) {
            console.error("Failed to fetch audit logs", err);
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action: string) => {
        switch (action.toLowerCase()) {
            case 'login': return <LogIn size={16} className="text-green-500" />;
            case 'logout': return <LogOut size={16} className="text-orange-500" />;
            case 'create': return <Plus size={16} className="text-blue-500" />;
            case 'update': return <Edit size={16} className="text-purple-500" />;
            case 'delete': return <Trash2 size={16} className="text-red-500" />;
            default: return <Activity size={16} className="text-gray-500" />;
        }
    };

    const filteredLogs = logs.filter(log => 
        log.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.table_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedLogs = filteredLogs.slice(startIndex, startIndex + itemsPerPage);

    const downloadCSV = () => {
        const headers = ['Timestamp', 'User', 'Action', 'Table', 'Description', 'IP Address'];
        const rows = filteredLogs.map(log => [
            new Date(log.timestamp).toLocaleString(),
            log.user_name,
            log.action_type,
            log.table_name,
            log.description.replace(/,/g, ';'), // Prevent CSV breaking
            log.ip_address || 'Internal'
        ]);

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `audit_log_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <div>
                    <h2 className="text-2xl font-black flex items-center gap-2">
                        <History className="text-primary-500" />
                        System Audit Trail
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">
                        Track all administrative actions and security events. (Read-Only)
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <div className="flex items-center bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full text-xs font-bold border border-green-200 dark:border-green-800/50">
                        <CheckCircle size={14} className="mr-1" />
                        Tamper-Proof
                    </div>
                    <button 
                        onClick={downloadCSV}
                        className="flex items-center bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-lg shadow-primary-500/20 active:scale-95"
                    >
                        <FileText size={14} className="mr-2" />
                        Download Entire Log (CSV)
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-[var(--bg-surface)] p-4 rounded-2xl border border-[var(--border-color)] shadow-sm">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search users, actions..."
                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] outline-none focus:ring-2 focus:ring-primary-500/20 transition-all text-sm"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Calendar size={18} className="text-gray-400" />
                    <input 
                        type="date" 
                        className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm"
                        value={filters.startDate}
                        onChange={(e) => setFilters({...filters, startDate: e.target.value})}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <ArrowRight size={18} className="text-gray-400" />
                    <input 
                        type="date" 
                        className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm"
                        value={filters.endDate}
                        onChange={(e) => setFilters({...filters, endDate: e.target.value})}
                    />
                </div>

                <div className="flex items-center gap-2">
                    <Filter size={18} className="text-gray-400" />
                    <select 
                        className="flex-1 p-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] text-sm"
                        value={filters.actionType}
                        onChange={(e) => setFilters({...filters, actionType: e.target.value})}
                    >
                        <option value="">All Actions</option>
                        <option value="Login">Login</option>
                        <option value="Logout">Logout</option>
                        <option value="Create">Create</option>
                        <option value="Update">Update</option>
                        <option value="Delete">Delete</option>
                    </select>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-[var(--border-color)] shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Timestamp</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Description</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">IP Address</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4 h-16 bg-gray-50/50 dark:bg-gray-800/50"></td>
                                    </tr>
                                ))
                            ) : paginatedLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                        No audit records found matching your filters.
                                    </td>
                                </tr>
                            ) : (
                                paginatedLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-[var(--text-primary)]">
                                                {new Date(log.timestamp).toLocaleDateString()}
                                            </div>
                                            <div className="text-xs text-[var(--text-secondary)]">
                                                {new Date(log.timestamp).toLocaleTimeString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                                                    <UserIcon size={14} className="text-gray-500" />
                                                </div>
                                                <span className="text-sm font-bold text-[var(--text-primary)]">
                                                    {log.user_name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action_type)}
                                                <span className="text-xs font-black uppercase tracking-wider">
                                                    {log.action_type}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <p className="text-sm text-[var(--text-secondary)] line-clamp-1 max-w-xs">
                                                {log.description}
                                            </p>
                                            {log.table_name && (
                                                <span className="text-[10px] font-bold text-primary-500 bg-primary-50 dark:bg-primary-900/20 px-1.5 py-0.5 rounded uppercase">
                                                    {log.table_name}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-mono text-xs text-gray-400">
                                            {log.ip_address || 'Internal'}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button 
                                                onClick={() => setSelectedLog(log)}
                                                className="p-2 hover:bg-primary-50 dark:hover:bg-primary-900/20 text-primary-500 rounded-lg transition-colors"
                                                title="View Details"
                                            >
                                                <Info size={18} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                
                {/* Pagination Controls */}
                {!loading && filteredLogs.length > itemsPerPage && (
                    <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900/30 border-t border-[var(--border-color)] flex items-center justify-between">
                        <div className="text-xs text-[var(--text-secondary)]">
                            Showing <span className="font-bold text-[var(--text-primary)]">{startIndex + 1}</span> to <span className="font-bold text-[var(--text-primary)]">{Math.min(startIndex + itemsPerPage, filteredLogs.length)}</span> of <span className="font-bold text-[var(--text-primary)]">{filteredLogs.length}</span> logs
                        </div>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                <ArrowRight className="rotate-180" size={16} />
                            </button>
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Simple sliding window for page numbers
                                let pageNum = i + 1;
                                if (totalPages > 5 && currentPage > 3) {
                                    pageNum = currentPage - 2 + i;
                                    if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${currentPage === pageNum ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/20' : 'hover:bg-white dark:hover:bg-gray-800 border border-[var(--border-color)]'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            <button 
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="p-2 rounded-lg border border-[var(--border-color)] hover:bg-white dark:hover:bg-gray-800 disabled:opacity-50 transition-colors"
                            >
                                <ArrowRight size={16} />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            {selectedLog && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden border border-[var(--border-color)]">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-gray-50 dark:bg-gray-900/50">
                            <div>
                                <h3 className="text-xl font-black flex items-center gap-2">
                                    <Activity className="text-primary-500" />
                                    Audit Detail
                                </h3>
                                <p className="text-xs text-[var(--text-secondary)] mt-0.5">
                                    Full metadata capture for record {selectedLog.id.slice(0,8)}
                                </p>
                            </div>
                            <button 
                                onClick={() => setSelectedLog(null)}
                                className="p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase">Timestamp</span>
                                    <span className="text-sm font-medium">{new Date(selectedLog.timestamp).toLocaleString()}</span>
                                </div>
                                <div className="p-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase">Operator</span>
                                    <span className="text-sm font-bold text-primary-500">{selectedLog.user_name}</span>
                                </div>
                                <div className="p-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase">IP Address</span>
                                    <span className="text-sm font-mono">{selectedLog.ip_address || 'System Internal'}</span>
                                </div>
                                <div className="p-3 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase">Action Type</span>
                                    <span className="text-xs font-black uppercase">{selectedLog.action_type}</span>
                                </div>
                            </div>

                            {/* Description */}
                            <div>
                                <span className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Event Description</span>
                                <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-2xl text-sm font-medium">
                                    {selectedLog.description}
                                </div>
                            </div>

                            {/* Browser Metadata (User Agent) */}
                            {selectedLog.new_values?.browser_metadata && (
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Browser Environment Logs</span>
                                    <div className="p-4 bg-gray-900 rounded-2xl text-green-400 font-mono text-[11px] overflow-x-auto">
                                        <pre>{JSON.stringify(selectedLog.new_values.browser_metadata, null, 2)}</pre>
                                    </div>
                                </div>
                            )}

                            {/* Data Changes */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">Old State</span>
                                    <div className="p-3 bg-red-500/5 border border-red-500/10 rounded-2xl text-[10px] font-mono overflow-auto max-h-40">
                                        <pre>{JSON.stringify(selectedLog.old_values, null, 2)}</pre>
                                    </div>
                                </div>
                                <div>
                                    <span className="block text-[10px] font-bold text-gray-500 uppercase mb-2 ml-1">New State / Payload</span>
                                    <div className="p-3 bg-green-500/5 border border-green-500/10 rounded-2xl text-[10px] font-mono overflow-auto max-h-40">
                                        <pre>{JSON.stringify(selectedLog.new_values, null, 2)}</pre>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 dark:bg-gray-900/50 border-t border-[var(--border-color)] flex justify-end">
                            <button 
                                onClick={() => setSelectedLog(null)}
                                className="px-6 py-2.5 bg-[var(--bg-primary)] hover:bg-gray-200 dark:hover:bg-gray-700 text-[var(--text-primary)] font-bold rounded-xl transition-all border border-[var(--border-color)]"
                            >
                                Close View
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
