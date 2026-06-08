import { useState, useEffect } from 'react';
import { 
    AlertTriangle, Shield, Calendar, MapPin, User, Search, Plus, 
    FileText, CheckCircle2, Clock, Upload, Trash2, Printer, 
    UserCheck, Send, ExternalLink, RefreshCw
} from 'lucide-react';
import { useNotification } from './components/Notification';

interface Incident {
    id: string;
    serial_number: string;
    title: string;
    description: string;
    reporter_id: string;
    reporter_name: string;
    status: string;
    incident_date: string;
    location: string;
    severity: string;
    target_user_id: string | null;
    target_user_name: string | null;
    target_admission_number: string | null;
    evidence_image: string | null;
    notes: string | null;
    created_at: string;
}

interface UserLookupResult {
    id: string;
    full_name: string;
    email: string;
    admission_number: string;
    phone_number: string | null;
    role: string;
    school: string;
}

export default function IncidentReporting() {
    const { showNotification } = useNotification();
    const [incidents, setIncidents] = useState<Incident[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeIncident, setActiveIncident] = useState<any | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    // Create form states
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [severity, setSeverity] = useState('low');
    const [incidentDate, setIncidentDate] = useState('');
    const [notes, setNotes] = useState('');
    const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
    const [evidencePreview, setEvidencePreview] = useState<string | null>(null);

    // Target User Selection
    const [searchQuery, setSearchQuery] = useState('');
    const [userSuggestions, setUserSuggestions] = useState<UserLookupResult[]>([]);
    const [selectedUser, setSelectedUser] = useState<UserLookupResult | null>(null);
    const [externalTargetName, setExternalTargetName] = useState('');
    const [isSearching, setIsSearching] = useState(false);

    // Followup Form States
    const [followupType, setFollowupType] = useState('update');
    const [followupDesc, setFollowupDesc] = useState('');
    const [reactivateUser, setReactivateUser] = useState(true);
    const [submittingFollowup, setSubmittingFollowup] = useState(false);
    const [submittingIncident, setSubmittingIncident] = useState(false);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') || 'student';
    const isWriteAllowed = ['superadmin', 'admin', 'security lead', 'security', 'guard'].includes(userRole.toLowerCase());

    const fetchIncidents = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/security/incidents', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setIncidents(data);
            } else {
                showNotification('Failed to retrieve incidents', 'error');
            }
        } catch (e) {
            showNotification('Error connecting to incidents server', 'error');
        } finally {
            setLoading(false);
        }
    };

    const fetchIncidentDetails = async (id: string) => {
        try {
            const res = await fetch(`/api/security/incidents/${id}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setActiveIncident(data);
            }
        } catch (e) {
            showNotification('Could not load incident details', 'error');
        }
    };

    useEffect(() => {
        fetchIncidents();
    }, []);

    // Search Autocomplete for Students and Staff
    useEffect(() => {
        const delaySearch = setTimeout(async () => {
            if (searchQuery.trim().length > 1) {
                setIsSearching(true);
                try {
                    const res = await fetch(`/api/security/users/lookup?q=${encodeURIComponent(searchQuery)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUserSuggestions(data);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsSearching(false);
                }
            } else {
                setUserSuggestions([]);
            }
        }, 300);

        return () => clearTimeout(delaySearch);
    }, [searchQuery]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setEvidenceFile(file);
            setEvidencePreview(URL.createObjectURL(file));
        }
    };

    const handleCreateIncident = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !description || !location) {
            showNotification('Please fill all required fields: Title, Location and Description', 'warning');
            return;
        }

        setSubmittingIncident(true);
        try {
            const formData = new FormData();
            formData.append('title', title);
            formData.append('description', description);
            formData.append('location', location);
            formData.append('severity', severity);
            if (incidentDate) {
                formData.append('incident_date', new Date(incidentDate).toISOString());
            }
            if (selectedUser) {
                formData.append('target_user_id', selectedUser.id);
            }
            if (externalTargetName) {
                formData.append('target_name_external', externalTargetName);
            }
            if (notes) {
                formData.append('notes', notes);
            }
            if (evidenceFile) {
                formData.append('file', evidenceFile);
            }

            const res = await fetch('/api/security/incidents', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                showNotification('Incident reported successfully!', 'success');
                setShowCreateModal(false);
                // Reset form
                setTitle('');
                setDescription('');
                setLocation('');
                setSeverity('low');
                setIncidentDate('');
                setSelectedUser(null);
                setExternalTargetName('');
                setNotes('');
                setEvidenceFile(null);
                setEvidencePreview(null);
                setSearchQuery('');
                
                fetchIncidents();
            } else {
                const err = await res.json();
                showNotification(err.detail || 'Failed to report incident', 'error');
            }
        } catch (e) {
            showNotification('Server error reporting incident', 'error');
        } finally {
            setSubmittingIncident(false);
        }
    };

    const handleAddFollowup = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!followupDesc) {
            showNotification('Please enter a description for the followup', 'warning');
            return;
        }

        setSubmittingFollowup(true);
        try {
            const formData = new FormData();
            formData.append('followup_type', followupType);
            formData.append('description', followupDesc);
            if (followupType === 'resolved') {
                formData.append('reactivate_user', reactivateUser ? 'true' : 'false');
            }

            const res = await fetch(`/api/security/incidents/${activeIncident.id}/followup`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                showNotification('Followup timeline logged successfully!', 'success');
                setFollowupDesc('');
                fetchIncidentDetails(activeIncident.id);
                fetchIncidents(); // Refresh general list too for status change
            } else {
                const err = await res.json();
                showNotification(err.detail || 'Failed to log followup', 'error');
            }
        } catch (e) {
            showNotification('Server error logging followup', 'error');
        } finally {
            setSubmittingFollowup(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'reported': return 'bg-amber-100 text-amber-800 border-amber-200';
            case 'under_investigation': return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'police_reported': return 'bg-purple-100 text-purple-800 border-purple-200';
            case 'disciplinary': return 'bg-red-100 text-red-800 border-red-200';
            case 'resolved': return 'bg-green-100 text-green-800 border-green-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getSeverityColor = (sev: string) => {
        switch (sev.toLowerCase()) {
            case 'high': return 'bg-red-500 text-white';
            case 'medium': return 'bg-orange-500 text-white';
            case 'low': return 'bg-blue-500 text-white';
            default: return 'bg-gray-500 text-white';
        }
    };

    const printIncidentDetails = () => {
        window.print();
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
            {/* Header section */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <Shield className="text-primary-600" size={32} />
                        Security Incidents Center
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Report, track, and manage all security reports, police updates, and disciplinary processes.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={fetchIncidents} 
                        className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isWriteAllowed && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20"
                        >
                            <Plus size={20} />
                            Log Incident
                        </button>
                    )}
                </div>
            </div>

            {/* Main view split layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Incidents List Column */}
                <div className="lg:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Incident Feed</h2>
                    {loading ? (
                        <div className="flex justify-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                        </div>
                    ) : incidents.length === 0 ? (
                        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-gray-400">
                            <AlertTriangle className="mx-auto mb-3 text-gray-300" size={40} />
                            <p className="font-bold text-sm">No incidents logged yet</p>
                            <p className="text-xs text-gray-400 mt-1">All recorded incidents will display here.</p>
                        </div>
                    ) : (
                        incidents.map((inc) => (
                            <div
                                key={inc.id}
                                onClick={() => {
                                    fetchIncidentDetails(inc.id);
                                }}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                                    activeIncident?.id === inc.id
                                        ? 'bg-primary-50/50 border-primary-300 dark:bg-primary-950/20 dark:border-primary-800'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700/80 hover:border-gray-200'
                                }`}
                            >
                                <div className="flex flex-col gap-1 mb-2">
                                    <div className="flex justify-between items-start gap-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            {inc.serial_number && (
                                                <span className="text-[9px] font-black bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 px-2 py-0.5 rounded-full font-mono tracking-wider shrink-0">
                                                    {inc.serial_number}
                                                </span>
                                            )}
                                            <h4 className="font-bold text-sm text-gray-800 dark:text-white line-clamp-1">{inc.title}</h4>
                                        </div>
                                        <span className={`px-2 py-0.5 text-[9px] font-black rounded-full uppercase border shrink-0 ${getStatusColor(inc.status)}`}>
                                            {inc.status.replace("_", " ")}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                    {inc.description}
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <MapPin size={12} />
                                        {inc.location}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(inc.incident_date).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detail and Timeline Column */}
                <div className="lg:col-span-2">
                    {activeIncident ? (
                        <div id="printable-incident" className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden animate-scale-in">
                            
                            {/* Incident Details Banner */}
                            <div className="bg-gradient-to-br from-gray-900 to-slate-800 p-6 sm:p-8 text-white relative">
                                <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase ${getSeverityColor(activeIncident.severity)}`}>
                                            {activeIncident.severity} Severity
                                        </span>
                                        {activeIncident.serial_number && (
                                            <span className="px-3 py-1 text-xs font-black font-mono bg-white/15 text-white rounded-lg tracking-wider">
                                                {activeIncident.serial_number}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={printIncidentDetails} 
                                            className="p-2 bg-white/10 hover:bg-white/20 rounded-xl transition-all text-white flex items-center gap-1.5 text-xs font-bold"
                                        >
                                            <Printer size={16} />
                                            Print
                                        </button>
                                    </div>
                                </div>
                                <h2 className="text-2xl font-black">{activeIncident.title}</h2>
                                <p className="text-gray-400 text-xs mt-2 flex items-center gap-4">
                                    <span>Reporter: <b>{activeIncident.reporter_name}</b></span>
                                    <span>Date: <b>{new Date(activeIncident.incident_date).toLocaleString()}</b></span>
                                </p>
                            </div>

                            <div className="p-6 sm:p-8 space-y-6">
                                {/* Description */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Incident Details</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        {activeIncident.description}
                                    </p>
                                </div>

                                {/* Target/Affected Person */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                                            <User size={14} /> Affected User / Target
                                        </h4>
                                        {activeIncident.target_user_name ? (
                                            <div>
                                                <p className="text-sm font-bold text-gray-800 dark:text-white">{activeIncident.target_user_name}</p>
                                                {activeIncident.target_admission_number && (
                                                    <p className="text-xs text-gray-500 font-mono mt-0.5">{activeIncident.target_admission_number}</p>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-400 italic">No specific system user targeted or logged</p>
                                        )}
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                                            <MapPin size={14} /> Incident Location
                                        </h4>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">{activeIncident.location}</p>
                                    </div>
                                </div>

                                {/* Evidence & Notes */}
                                {(activeIncident.evidence_image || activeIncident.notes) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {activeIncident.evidence_image && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase">Evidence Document/Image</h4>
                                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden aspect-video relative group bg-gray-100 dark:bg-gray-900">
                                                    <img 
                                                        src={activeIncident.evidence_image} 
                                                        alt="Evidence" 
                                                        className="w-full h-full object-cover"
                                                    />
                                                    <a 
                                                        href={activeIncident.evidence_image} 
                                                        target="_blank" 
                                                        rel="noreferrer"
                                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity font-bold text-xs gap-1.5"
                                                    >
                                                        <ExternalLink size={16} />
                                                        View Full Image
                                                    </a>
                                                </div>
                                            </div>
                                        )}
                                        {activeIncident.notes && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase">Security Notes</h4>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-950/30 p-4 rounded-2xl italic leading-relaxed min-h-[100px]">
                                                    "{activeIncident.notes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Followup timeline */}
                                <div className="border-t border-gray-100 dark:border-gray-700/80 pt-6">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-6">Case Followups & Timeline</h3>
                                    
                                    <div className="space-y-6 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100 dark:before:bg-gray-700">
                                        {activeIncident.followups && activeIncident.followups.length > 0 ? (
                                            activeIncident.followups.map((fl: any, index: number) => (
                                                <div key={index} className="flex gap-4 relative animate-fade-in">
                                                    <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 border-2 border-primary-600 flex items-center justify-center shrink-0 shadow-sm z-10">
                                                        <Clock size={14} className="text-primary-600" />
                                                    </div>
                                                    <div className="flex-1 bg-gray-50 dark:bg-gray-900/40 border border-gray-100 dark:border-gray-800 p-4 rounded-2xl">
                                                        <div className="flex justify-between items-start gap-2 mb-1">
                                                            <span className="text-xs font-black text-gray-800 dark:text-white capitalize">
                                                                {fl.followup_type.replace("_", " ")}
                                                            </span>
                                                            <span className="text-[10px] text-gray-400 dark:text-gray-500">
                                                                {new Date(fl.timestamp).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{fl.description}</p>
                                                        <p className="text-[10px] text-gray-400 mt-2">Logged by: <b>{fl.officer_name}</b></p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="pl-8 text-xs text-gray-400 italic">No timeline events or follow-ups logged for this incident case.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Log Followup Timeline Action */}
                                {isWriteAllowed && activeIncident.status !== 'resolved' && (
                                    <form onSubmit={handleAddFollowup} className="border-t border-gray-100 dark:border-gray-700/80 pt-6 space-y-4">
                                        <h4 className="text-sm font-bold text-gray-800 dark:text-white">Update Case Timeline</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            <div className="md:col-span-1">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Update Type</label>
                                                <select
                                                    value={followupType}
                                                    onChange={(e) => setFollowupType(e.target.value)}
                                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                                >
                                                    <option value="update">General Investigation Update</option>
                                                    <option value="police_report">Report to Police Station</option>
                                                    <option value="disciplinary">Refer to Disciplinary Committee</option>
                                                    <option value="resolved">Mark Case as Resolved</option>
                                                </select>
                                                {/* Verdict Option - only shown when resolving */}
                                                {followupType === 'resolved' && activeIncident?.target_user && (
                                                    <div className="mt-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900/30 rounded-xl">
                                                        <label className="flex items-start gap-2.5 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={reactivateUser}
                                                                onChange={(e) => setReactivateUser(e.target.checked)}
                                                                className="mt-0.5 w-4 h-4 rounded text-green-600 border-green-300 cursor-pointer"
                                                            />
                                                            <div>
                                                                <p className="text-xs font-bold text-green-800 dark:text-green-300">Verdict: Reactivate Student</p>
                                                                <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5">
                                                                    Restore <strong>{activeIncident.target_user.full_name}</strong>'s status to Active upon resolution
                                                                </p>
                                                            </div>
                                                        </label>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description / Notes</label>
                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={followupDesc}
                                                        onChange={(e) => setFollowupDesc(e.target.value)}
                                                        placeholder="Provide followup action, station number, or resolution details..."
                                                        className="flex-1 px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={submittingFollowup}
                                                        className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-xl font-bold text-sm transition-all flex items-center gap-1.5 shadow-md shrink-0"
                                                    >
                                                        {submittingFollowup ? <RefreshCw className="animate-spin" size={16} /> : <Send size={16} />}
                                                        Post
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </form>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center text-center p-8 text-gray-400 bg-white dark:bg-gray-800 shadow-sm">
                            <Shield className="text-gray-300 dark:text-gray-600 mb-3" size={48} />
                            <p className="font-bold">Select an Incident Case</p>
                            <p className="text-xs mt-1">Select an incident from the feed to view its investigation reports and follow-up timeline.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Create Incident Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in max-h-[95vh] overflow-y-auto">
                        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black">Log Security Incident</h3>
                                <p className="text-xs text-primary-100 mt-1">Create a robust incident record with target lookup and evidence tracking.</p>
                            </div>
                            <button
                                onClick={() => setShowCreateModal(false)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleCreateIncident} className="p-6 sm:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Incident Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g. Theft of laptop at Science Lab"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Location / Venue *</label>
                                    <input
                                        type="text"
                                        required
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. Main Library Room 204"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Severity Level</label>
                                    <select
                                        value={severity}
                                        onChange={(e) => setSeverity(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    >
                                        <option value="low">Low (Minor Infraction)</option>
                                        <option value="medium">Medium (Investigation needed)</option>
                                        <option value="high">High (Police/Disciplinary intervention)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Incident Date & Time</label>
                                    <input
                                        type="datetime-local"
                                        value={incidentDate}
                                        onChange={(e) => setIncidentDate(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            {/* Autocomplete user lookup */}
                            <div className="border-t border-gray-100 dark:border-gray-700/80 pt-4 space-y-4">
                                <h4 className="text-xs font-bold text-gray-500 uppercase">Affected / Target User Lookup</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="relative">
                                        <label className="block text-xs font-bold text-gray-400 mb-2">Search Student/Staff Database</label>
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                            <input
                                                type="text"
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                placeholder="Search by name, email or admission..."
                                                className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                            />
                                        </div>
                                        
                                        {/* Suggestions box */}
                                        {userSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-20 max-h-48 overflow-y-auto">
                                                {userSuggestions.map((u) => (
                                                    <div
                                                        key={u.id}
                                                        onClick={() => {
                                                            setSelectedUser(u);
                                                            setUserSuggestions([]);
                                                            setSearchQuery('');
                                                        }}
                                                        className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center justify-between text-xs"
                                                    >
                                                        <div>
                                                            <p className="font-bold text-gray-800 dark:text-white">{u.full_name}</p>
                                                            <p className="text-[10px] text-gray-400">{u.admission_number} • {u.role}</p>
                                                        </div>
                                                        <UserCheck size={14} className="text-primary-600" />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        {isSearching && (
                                            <div className="absolute top-full left-0 right-0 mt-2 p-3 bg-white dark:bg-gray-800 text-center text-xs text-gray-400">Searching...</div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 mb-2">Or Manual External Name</label>
                                        <input
                                            type="text"
                                            value={externalTargetName}
                                            onChange={(e) => setExternalTargetName(e.target.value)}
                                            placeholder="e.g. Visitor John Doe"
                                            disabled={!!selectedUser}
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-gray-800 dark:text-white"
                                        />
                                    </div>
                                </div>
                                {selectedUser && (
                                    <div className="p-3 bg-primary-50/50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900/50 rounded-xl flex justify-between items-center animate-fade-in text-xs">
                                        <div>
                                            <p className="font-bold text-primary-700 dark:text-primary-300">Selected: {selectedUser.full_name}</p>
                                            <p className="text-[10px] text-primary-500 font-mono mt-0.5">{selectedUser.admission_number} ({selectedUser.role})</p>
                                        </div>
                                        <button 
                                            type="button" 
                                            onClick={() => setSelectedUser(null)} 
                                            className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description of Event *</label>
                                <textarea
                                    required
                                    rows={4}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Provide detailed description of the incident, timelines, behaviors, and witnesses..."
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                />
                            </div>

                            {/* Evidence Upload */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Evidence Upload</label>
                                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-primary-500 transition-all cursor-pointer relative bg-gray-50 dark:bg-gray-900/40">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-500 block">Click to upload photo evidence</span>
                                        <span className="text-[10px] text-gray-400 block mt-1">PNG, JPG up to 5MB</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Evidence Preview / Security Notes</label>
                                    {evidencePreview ? (
                                        <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden aspect-video relative">
                                            <img src={evidencePreview} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setEvidenceFile(null);
                                                    setEvidencePreview(null);
                                                }}
                                                className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-lg hover:scale-105 active:scale-95 transition-all shadow-md"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    ) : (
                                        <textarea
                                            rows={3}
                                            value={notes}
                                            onChange={(e) => setNotes(e.target.value)}
                                            placeholder="Security notes, station log info, internal reference details..."
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700/80 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingIncident}
                                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all flex items-center gap-1.5"
                                >
                                    {submittingIncident ? <RefreshCw className="animate-spin" size={16} /> : null}
                                    Submit Case Report
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
