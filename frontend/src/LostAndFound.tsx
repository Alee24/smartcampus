import { useState, useEffect } from 'react';
import { 
    Search, Plus, MapPin, Calendar, User, UserCheck, Inbox, CheckCircle, 
    RefreshCw, Upload, Trash2, ShieldCheck, Tag, Info, AlertCircle
} from 'lucide-react';
import { useNotification } from './components/Notification';

interface LostFoundItem {
    id: string;
    item_name: string;
    description: string;
    location_found: string;
    date_found: string;
    status: string;
    finder_name: string | null;
    claimant_name: string | null;
    claimant_id: string | null;
    date_claimed: string | null;
    image_path: string | null;
    notes: string | null;
    handler_name: string;
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

export default function LostAndFound() {
    const { showNotification } = useNotification();
    const [items, setItems] = useState<LostFoundItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeItem, setActiveItem] = useState<LostFoundItem | null>(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [showClaimModal, setShowClaimModal] = useState(false);

    // Form inputs for logging items
    const [itemName, setItemName] = useState('');
    const [description, setDescription] = useState('');
    const [locationFound, setLocationFound] = useState('');
    const [dateFound, setDateFound] = useState('');
    const [finderName, setFinderName] = useState('');
    const [notes, setNotes] = useState('');
    const [itemFile, setItemFile] = useState<File | null>(null);
    const [itemPreview, setItemPreview] = useState<string | null>(null);
    const [submittingItem, setSubmittingItem] = useState(false);

    // Form inputs for claiming
    const [searchQuery, setSearchQuery] = useState('');
    const [userSuggestions, setUserSuggestions] = useState<UserLookupResult[]>([]);
    const [selectedClaimant, setSelectedClaimant] = useState<UserLookupResult | null>(null);
    const [externalClaimantName, setExternalClaimantName] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [submittingClaim, setSubmittingClaim] = useState(false);

    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('userRole') || 'student';
    const isWriteAllowed = ['superadmin', 'admin', 'security lead', 'security', 'guard'].includes(userRole.toLowerCase());

    const fetchItems = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/security/lost-found', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setItems(data);
            } else {
                showNotification('error', 'Failed to retrieve items registry');
            }
        } catch (e) {
            showNotification('error', 'Error connecting to lost & found registry');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, []);

    // Search Autocomplete for Claimants
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
            setItemFile(file);
            setItemPreview(URL.createObjectURL(file));
        }
    };

    const handleLogItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!itemName || !description || !locationFound) {
            showNotification('warning', 'Please fill all required fields');
            return;
        }

        setSubmittingItem(true);
        try {
            const formData = new FormData();
            formData.append('item_name', itemName);
            formData.append('description', description);
            formData.append('location_found', locationFound);
            if (dateFound) {
                formData.append('date_found', dateFound);
            }
            if (finderName) {
                formData.append('finder_name', finderName);
            }
            if (notes) {
                formData.append('notes', notes);
            }
            if (itemFile) {
                formData.append('file', itemFile);
            }

            const res = await fetch('/api/security/lost-found', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                showNotification('success', 'Found item registry log saved');
                setShowLogModal(false);
                // Reset states
                setItemName('');
                setDescription('');
                setLocationFound('');
                setDateFound('');
                setFinderName('');
                setNotes('');
                setItemFile(null);
                setItemPreview(null);
                
                fetchItems();
            } else {
                const err = await res.json();
                showNotification('error', err.detail || 'Failed to log found item');
            }
        } catch (e) {
            showNotification('error', 'Server error logging found item');
        } finally {
            setSubmittingItem(false);
        }
    };

    const handleClaimItem = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!activeItem) return;
        if (!selectedClaimant && !externalClaimantName) {
            showNotification('warning', 'Please specify a claimant from system or external');
            return;
        }

        setSubmittingClaim(true);
        try {
            const formData = new FormData();
            if (selectedClaimant) {
                formData.append('claimant_id', selectedClaimant.id);
            }
            if (externalClaimantName) {
                formData.append('claimant_name_external', externalClaimantName);
            }

            const res = await fetch(`/api/security/lost-found/${activeItem.id}/claim`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                showNotification('success', 'Item marked successfully as Claimed');
                setShowClaimModal(false);
                setSelectedClaimant(null);
                setExternalClaimantName('');
                setSearchQuery('');
                
                // Refresh list and details
                fetchItems();
                setActiveItem(null);
            } else {
                const err = await res.json();
                showNotification('error', err.detail || 'Failed to mark as claimed');
            }
        } catch (e) {
            showNotification('error', 'Server error claiming item');
        } finally {
            setSubmittingClaim(false);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status.toLowerCase() === 'claimed') {
            return 'bg-green-100 text-green-800 border-green-200';
        }
        return 'bg-blue-100 text-blue-800 border-blue-200';
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-fade-in">
            {/* Top Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
                        <Inbox className="text-primary-600" size={32} />
                        Lost & Found Registry
                    </h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        Register, store, and return lost property items safely to verified campus students or staff.
                    </p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={fetchItems} 
                        className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 shadow-sm"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    {isWriteAllowed && (
                        <button
                            onClick={() => setShowLogModal(true)}
                            className="px-5 py-3 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-primary-500/20"
                        >
                            <Plus size={20} />
                            Log Found Item
                        </button>
                    )}
                </div>
            </div>

            {/* Split layout grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Items List Column */}
                <div className="lg:col-span-1 space-y-4 max-h-[75vh] overflow-y-auto pr-2">
                    <h2 className="text-lg font-bold text-gray-800 dark:text-gray-200">Found Property list</h2>
                    {loading ? (
                        <div className="flex justify-center p-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                            <RefreshCw className="animate-spin text-primary-600" size={32} />
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm text-gray-400">
                            <Tag className="mx-auto mb-3 text-gray-300" size={40} />
                            <p className="font-bold text-sm">No items logged yet</p>
                            <p className="text-xs text-gray-400 mt-1">Found property items will display here.</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div
                                key={item.id}
                                onClick={() => setActiveItem(item)}
                                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                                    activeItem?.id === item.id
                                        ? 'bg-primary-50/50 border-primary-300 dark:bg-primary-950/20 dark:border-primary-800'
                                        : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 hover:border-gray-200'
                                }`}
                            >
                                <div className="flex justify-between items-start gap-2 mb-2">
                                    <h4 className="font-bold text-sm text-gray-800 dark:text-white line-clamp-1">{item.item_name}</h4>
                                    <span className={`px-2.5 py-0.5 text-[9px] font-black rounded-full uppercase border ${getStatusBadge(item.status)}`}>
                                        {item.status}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-3">
                                    {item.description}
                                </p>
                                <div className="flex justify-between items-center text-[10px] text-gray-400 dark:text-gray-500 font-medium">
                                    <span className="flex items-center gap-1">
                                        <MapPin size={12} />
                                        {item.location_found}
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <Calendar size={12} />
                                        {new Date(item.date_found).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Details Column */}
                <div className="lg:col-span-2">
                    {activeItem ? (
                        <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-xl overflow-hidden animate-scale-in">
                            <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 sm:p-8 text-white">
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`px-3 py-1 text-xs font-black rounded-lg uppercase border ${getStatusBadge(activeItem.status)}`}>
                                        {activeItem.status}
                                    </span>
                                    {isWriteAllowed && activeItem.status !== 'claimed' && (
                                        <button
                                            onClick={() => setShowClaimModal(true)}
                                            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                                        >
                                            Return / Handover Item
                                        </button>
                                    )}
                                </div>
                                <h2 className="text-2xl font-black">{activeItem.item_name}</h2>
                                <p className="text-indigo-200 text-xs mt-2 flex items-center gap-4">
                                    <span>Found Date: <b>{new Date(activeItem.date_found).toLocaleDateString()}</b></span>
                                    <span>Officer: <b>{activeItem.handler_name}</b></span>
                                </p>
                            </div>

                            <div className="p-6 sm:p-8 space-y-6">
                                {/* Details Description */}
                                <div className="space-y-2">
                                    <h3 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Property Description</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
                                        {activeItem.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                                            <MapPin size={14} /> Location Found
                                        </h4>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">{activeItem.location_found}</p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-2 flex items-center gap-1.5">
                                            <User size={14} /> Finder Name
                                        </h4>
                                        <p className="text-sm font-bold text-gray-800 dark:text-white">{activeItem.finder_name || 'Anonymous'}</p>
                                    </div>
                                </div>

                                {/* Claims status */}
                                {activeItem.status === 'claimed' && (
                                    <div className="p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-950/40 rounded-2xl flex items-start gap-3">
                                        <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
                                        <div>
                                            <h4 className="text-xs font-black text-green-800 dark:text-green-300 uppercase tracking-wider">Property Returned / Claimed</h4>
                                            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
                                                This item has been successfully claimed by <b>{activeItem.claimant_name}</b>.
                                            </p>
                                            <p className="text-[10px] text-green-500 mt-1">
                                                Claimed Date: {activeItem.date_claimed ? new Date(activeItem.date_claimed).toLocaleDateString() : 'N/A'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Image or Notes */}
                                {(activeItem.image_path || activeItem.notes) && (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {activeItem.image_path && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase">Item Image</h4>
                                                <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden aspect-video relative bg-gray-100 dark:bg-gray-900">
                                                    <img src={activeItem.image_path} alt="Item" className="w-full h-full object-cover" />
                                                </div>
                                            </div>
                                        )}
                                        {activeItem.notes && (
                                            <div className="space-y-2">
                                                <h4 className="text-xs font-bold text-gray-500 uppercase">Registry Notes</h4>
                                                <p className="text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/50 p-4 rounded-2xl italic">
                                                    "{activeItem.notes}"
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-96 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-3xl flex flex-col items-center justify-center text-center p-8 text-gray-400 bg-white dark:bg-gray-800 shadow-sm">
                            <Inbox className="text-gray-300 dark:text-gray-600 mb-3" size={48} />
                            <p className="font-bold">Select a Logged Item</p>
                            <p className="text-xs mt-1">Select an item from the registry list to view its description, finder details, and return status.</p>
                        </div>
                    )}
                </div>

            </div>

            {/* Log Found Item Modal */}
            {showLogModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden animate-scale-in max-h-[95vh] overflow-y-auto">
                        <div className="bg-gradient-to-br from-primary-600 to-indigo-700 p-6 text-white flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-black">Register Found Property</h3>
                                <p className="text-xs text-primary-100 mt-1">Log found wallets, keys, electronics, or cards to match claimants.</p>
                            </div>
                            <button
                                onClick={() => setShowLogModal(false)}
                                className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all"
                            >
                                <Plus size={20} className="rotate-45" />
                            </button>
                        </div>

                        <form onSubmit={handleLogItem} className="p-6 sm:p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Item Name / Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={itemName}
                                        onChange={(e) => setItemName(e.target.value)}
                                        placeholder="e.g. Black HP Laptop Charger"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Location Found *</label>
                                    <input
                                        type="text"
                                        required
                                        value={locationFound}
                                        onChange={(e) => setLocationFound(e.target.value)}
                                        placeholder="e.g. Science Block Room 102"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Date Found</label>
                                    <input
                                        type="date"
                                        value={dateFound}
                                        onChange={(e) => setDateFound(e.target.value)}
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Finder Name (Optional)</label>
                                    <input
                                        type="text"
                                        value={finderName}
                                        onChange={(e) => setFinderName(e.target.value)}
                                        placeholder="Anonymous or Person name"
                                        className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Description *</label>
                                <textarea
                                    required
                                    rows={3}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe physical features, serial number, brands, colors..."
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                />
                            </div>

                            {/* File Upload */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Item Image Upload</label>
                                    <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-6 text-center hover:border-primary-500 transition-all cursor-pointer relative bg-gray-50 dark:bg-gray-900/40">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Upload size={24} className="mx-auto text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-500 block">Click to upload item picture</span>
                                        <span className="text-[10px] text-gray-400 block mt-1">PNG, JPG up to 5MB</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="block text-xs font-bold text-gray-500 uppercase">Item Preview / Office Notes</label>
                                    {itemPreview ? (
                                        <div className="border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden aspect-video relative">
                                            <img src={itemPreview} alt="Preview" className="w-full h-full object-cover" />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setItemFile(null);
                                                    setItemPreview(null);
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
                                            placeholder="Logged tag serial, cupboard shelf number, or office storage code..."
                                            className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-xs outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                        />
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700/80 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowLogModal(false)}
                                    className="px-6 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 text-sm font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingItem}
                                    className="px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-primary-500/20 transition-all flex items-center gap-1.5"
                                >
                                    {submittingItem ? <RefreshCw className="animate-spin" size={16} /> : null}
                                    Save Registry Log
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Handover Claim Modal */}
            {showClaimModal && activeItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in">
                        <div className="bg-gradient-to-br from-green-600 to-emerald-700 p-6 text-white">
                            <h3 className="text-lg font-black flex items-center gap-2">
                                <ShieldCheck size={22} />
                                Claim & Handover Form
                            </h3>
                            <p className="text-xs text-green-100 mt-1">Verify student/staff identity cards before handing over valuable property.</p>
                        </div>

                        <form onSubmit={handleClaimItem} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Search Student/Staff Database</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search claimant name or admission number..."
                                        className="w-full pl-9 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 text-gray-800 dark:text-white"
                                    />
                                </div>

                                {/* Autocomplete Suggestions */}
                                {userSuggestions.length > 0 && (
                                    <div className="absolute left-6 right-6 mt-1 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-xl z-20 max-h-40 overflow-y-auto">
                                        {userSuggestions.map((u) => (
                                            <div
                                                key={u.id}
                                                onClick={() => {
                                                    setSelectedClaimant(u);
                                                    setUserSuggestions([]);
                                                    setSearchQuery('');
                                                }}
                                                className="p-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <p className="font-bold text-gray-800 dark:text-white">{u.full_name}</p>
                                                    <p className="text-[10px] text-gray-400">{u.admission_number}</p>
                                                </div>
                                                <UserCheck size={14} className="text-primary-600" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {isSearching && (
                                    <div className="p-2 text-center text-xs text-gray-400">Searching...</div>
                                )}
                            </div>

                            <div>
                                <div className="text-center text-xs text-gray-400 my-2">-- OR --</div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Manual External Claimant Name</label>
                                <input
                                    type="text"
                                    value={externalClaimantName}
                                    onChange={(e) => setExternalClaimantName(e.target.value)}
                                    placeholder="Enter visitor's full name"
                                    disabled={!!selectedClaimant}
                                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border-none rounded-xl text-sm outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-60 text-gray-800 dark:text-white"
                                />
                            </div>

                            {selectedClaimant && (
                                <div className="p-3 bg-green-50/50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-xl flex justify-between items-center text-xs">
                                    <div>
                                        <p className="font-bold text-green-700 dark:text-green-300">{selectedClaimant.full_name}</p>
                                        <p className="text-[10px] text-green-500 font-mono mt-0.5">{selectedClaimant.admission_number} ({selectedClaimant.role})</p>
                                    </div>
                                    <button 
                                        type="button" 
                                        onClick={() => setSelectedClaimant(null)} 
                                        className="text-red-500 hover:bg-red-50 p-1.5 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            )}

                            <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 dark:border-gray-700/80">
                                <button
                                    type="button"
                                    onClick={() => setShowClaimModal(false)}
                                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={submittingClaim}
                                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-1.5"
                                >
                                    {submittingClaim ? <RefreshCw className="animate-spin" size={12} /> : null}
                                    Confirm Release
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
