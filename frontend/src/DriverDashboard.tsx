import { useState, useEffect } from 'react';
import { 
    Car, MapPin, Navigation, Clock, User, Phone, CheckCircle2, 
    AlertTriangle, ShieldCheck, Play, Square, FileText, 
    ChevronRight, Activity, Calendar, Fuel, RefreshCw, LogIn, LogOut, Scan
} from 'lucide-react';

interface DriverDashboardProps {
    currentUser: any;
    onNavigate?: (tab: string) => void;
}

export default function DriverDashboard({ currentUser, onNavigate }: DriverDashboardProps) {
    const [trips, setTrips] = useState<any[]>([]);
    const [vehicles, setVehicles] = useState<any[]>([]);
    const [activeTripDetails, setActiveTripDetails] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingTrip, setLoadingTrip] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // overview, active-trip, fuel-log

    // Form states
    const [fuelForm, setFuelForm] = useState({
        vehicle_id: '',
        amount_liters: '',
        cost: '',
        odometer_reading: '',
        station_name: ''
    });
    const [fuelSubmitting, setFuelSubmitting] = useState(false);

    // Trip states
    const [odoInput, setOdoInput] = useState('');
    const [tripNotes, setTripNotes] = useState('');
    const [tripSubmitting, setTripSubmitting] = useState(false);

    // Passenger scanning
    const [scanInput, setScanInput] = useState('');
    const [scanSubmitting, setScanSubmitting] = useState(false);
    const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Global messaging
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const token = localStorage.getItem('token');

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const headers = { 'Authorization': `Bearer ${token}` };
            const [resTrips, resVehicles] = await Promise.all([
                fetch('/api/fleet/trips', { headers }),
                fetch('/api/fleet/vehicles', { headers })
            ]);

            let fetchedTrips = [];
            if (resTrips.ok) {
                fetchedTrips = await resTrips.json();
                setTrips(fetchedTrips);
            }

            let fetchedVehicles = [];
            if (resVehicles.ok) {
                fetchedVehicles = await resVehicles.json();
                setVehicles(fetchedVehicles);
            }

            // Find current vehicle & select active/ongoing trip
            const driverVehicle = fetchedVehicles.find((v: any) => 
                v.driver_name?.toLowerCase() === currentUser.full_name?.toLowerCase() ||
                v.driver_contact === currentUser.phone_number
            );

            // Filter driver trips
            const driverTrips = fetchedTrips.filter((t: any) => 
                t.driver_id === currentUser.id || 
                t.vehicle_id === driverVehicle?.id
            );

            const active = driverTrips.find((t: any) => t.status === 'ongoing' || t.status === 'scheduled');
            if (active) {
                fetchActiveTripDetails(active.id);
            } else {
                setActiveTripDetails(null);
            }
        } catch (e) {
            console.error("Error loading driver dashboard data", e);
            showFeedback('error', 'Failed to synchronize live transit schedules');
        } finally {
            setLoading(false);
        }
    };

    const fetchActiveTripDetails = async (tripId: string) => {
        setLoadingTrip(true);
        try {
            const res = await fetch(`/api/fleet/trips/${tripId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const details = await res.json();
                setActiveTripDetails(details);
                // Pre-populate odometer
                if (details.status === 'scheduled') {
                    setOdoInput(details.vehicle?.current_odometer || '');
                } else if (details.status === 'ongoing') {
                    setOdoInput(details.start_odometer || '');
                }
            }
        } catch (e) {
            console.error("Error loading trip details", e);
        } finally {
            setLoadingTrip(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [currentUser]);

    const showFeedback = (type: 'success' | 'error', text: string) => {
        setFeedback({ type, text });
        setTimeout(() => setFeedback(null), 5000);
    };

    const handleStartTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!odoInput || isNaN(parseFloat(odoInput))) {
            showFeedback('error', 'Please input a valid starting odometer reading.');
            return;
        }

        setTripSubmitting(true);
        try {
            const odometer = parseFloat(odoInput);
            const res = await fetch(`/api/fleet/trips/${activeTripDetails.id}/start?odometer=${odometer}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showFeedback('success', 'Trip started successfully. Stay safe!');
                await fetchActiveTripDetails(activeTripDetails.id);
                fetchAllData();
            } else {
                const err = await res.json();
                showFeedback('error', err.detail || 'Failed to start trip');
            }
        } catch (err: any) {
            showFeedback('error', `Connection error: ${err.message}`);
        } finally {
            setTripSubmitting(false);
        }
    };

    const handleEndTrip = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!odoInput || isNaN(parseFloat(odoInput))) {
            showFeedback('error', 'Please input a valid ending odometer reading.');
            return;
        }

        const odometer = parseFloat(odoInput);
        if (activeTripDetails.start_odometer && odometer < activeTripDetails.start_odometer) {
            showFeedback('error', `Ending odometer cannot be less than start odometer (${activeTripDetails.start_odometer}).`);
            return;
        }

        setTripSubmitting(true);
        try {
            const res = await fetch(`/api/fleet/trips/${activeTripDetails.id}/end?odometer=${odometer}&notes=${encodeURIComponent(tripNotes)}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                showFeedback('success', 'Trip completed. Excellent driving!');
                setTripNotes('');
                setOdoInput('');
                setActiveTripDetails(null);
                fetchAllData();
                setActiveTab('overview');
            } else {
                const err = await res.json();
                showFeedback('error', err.detail || 'Failed to complete trip');
            }
        } catch (err: any) {
            showFeedback('error', `Connection error: ${err.message}`);
        } finally {
            setTripSubmitting(false);
        }
    };

    const handleBoardPassenger = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!scanInput.trim()) return;

        setScanSubmitting(true);
        setScanMessage(null);
        try {
            const res = await fetch(`/api/fleet/trips/${activeTripDetails.id}/board`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ scanned_data: scanInput.trim() })
            });

            const data = await res.json();
            if (res.ok) {
                setScanMessage({ type: 'success', text: data.message || 'Passenger checked in successfully.' });
                setScanInput('');
                await fetchActiveTripDetails(activeTripDetails.id);
            } else {
                setScanMessage({ type: 'error', text: data.detail || 'Failed to check in passenger.' });
            }
        } catch (err: any) {
            setScanMessage({ type: 'error', text: `Connection error: ${err.message}` });
        } finally {
            setScanSubmitting(false);
        }
    };

    const handleFuelSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!fuelForm.vehicle_id || !fuelForm.amount_liters || !fuelForm.cost || !fuelForm.odometer_reading) {
            showFeedback('error', 'All fields except station name are required.');
            return;
        }

        setFuelSubmitting(true);
        try {
            const res = await fetch('/api/fleet/fuel-logs', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    vehicle_id: fuelForm.vehicle_id,
                    driver_id: currentUser.id,
                    amount_liters: parseFloat(fuelForm.amount_liters),
                    cost: parseFloat(fuelForm.cost),
                    odometer_reading: parseFloat(fuelForm.odometer_reading),
                    station_name: fuelForm.station_name || 'Generic Station'
                })
            });

            if (res.ok) {
                showFeedback('success', 'Fuel purchase logged successfully.');
                setFuelForm({
                    vehicle_id: '',
                    amount_liters: '',
                    cost: '',
                    odometer_reading: '',
                    station_name: ''
                });
                fetchAllData();
            } else {
                const err = await res.json();
                showFeedback('error', err.detail || 'Failed to save fuel log.');
            }
        } catch (err: any) {
            showFeedback('error', `Connection error: ${err.message}`);
        } finally {
            setFuelSubmitting(false);
        }
    };

    // Find driver's vehicle
    const driverVehicle = vehicles.find((v: any) => 
        v.driver_name?.toLowerCase() === currentUser.full_name?.toLowerCase() ||
        v.driver_contact === currentUser.phone_number
    );

    // Filter driver trips
    const driverTrips = trips.filter((t: any) => 
        t.driver_id === currentUser.id || 
        t.vehicle_id === driverVehicle?.id
    );

    const ongoingTrip = driverTrips.find((t: any) => t.status === 'ongoing');
    const scheduledTrip = driverTrips.find((t: any) => t.status === 'scheduled');
    const currentActiveTrip = ongoingTrip || scheduledTrip || activeTripDetails;

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-fade-in pb-10">
            {/* Global feedback message */}
            {feedback && (
                <div className={`fixed top-4 right-4 z-50 p-4 rounded-xl shadow-xl flex items-center gap-3 border transition-all animate-bounce ${
                    feedback.type === 'success' 
                        ? 'bg-emerald-50 border-emerald-250 text-emerald-800' 
                        : 'bg-rose-50 border-rose-250 text-rose-800'
                }`}>
                    {feedback.type === 'success' ? <ShieldCheck size={20} /> : <AlertTriangle size={20} />}
                    <span className="text-xs font-bold">{feedback.text}</span>
                </div>
            )}

            {/* Dashboard Title & Top Banner */}
            <div className="bg-gradient-to-br from-teal-700 via-emerald-600 to-teal-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 transition-all duration-300">
                <div>
                    <span className="px-3 py-1 bg-white/20 text-white rounded-lg text-xs font-black uppercase tracking-wider">
                        Transit Logistics Panel
                    </span>
                    <h1 className="text-3xl font-extrabold tracking-tight mt-3">
                        Driver Command Portal
                    </h1>
                    <p className="text-teal-100 text-sm mt-1">
                        Log trips, confirm passenger manifest compliance, register fuel logs, and monitor assigned vehicles.
                    </p>
                </div>
                {driverVehicle && (
                    <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shadow-md">
                        <div className="p-2.5 bg-emerald-500 rounded-xl text-white"><Car size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black text-emerald-200 uppercase">Assigned Unit</p>
                            <h4 className="font-black text-sm">{driverVehicle.plate_number}</h4>
                            <p className="text-[9px] text-gray-200">{driverVehicle.make} {driverVehicle.model}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                        <Navigation size={22} />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Assigned Trips</div>
                        <div className="text-xl font-black text-gray-800 dark:text-white mt-0.5">{driverTrips.length}</div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                        <Activity size={22} />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Status</div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1 uppercase flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                            {ongoingTrip ? 'On Route' : 'Ready'}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
                        <Fuel size={22} />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Odometer</div>
                        <div className="text-xl font-black text-gray-800 dark:text-white mt-0.5">
                            {driverVehicle?.current_odometer ? `${driverVehicle.current_odometer} KM` : 'N/A'}
                        </div>
                    </div>
                </div>

                <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl border border-gray-150 dark:border-gray-700 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                        <Clock size={22} />
                    </div>
                    <div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase">Next Departure</div>
                        <div className="text-xs font-black text-gray-800 dark:text-white mt-1 truncate">
                            {scheduledTrip ? new Date(scheduledTrip.scheduled_departure).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'None Scheduled'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Navigation tabs */}
            <div className="flex border-b border-gray-150 dark:border-gray-700 gap-6">
                <button 
                    onClick={() => setActiveTab('overview')} 
                    className={`pb-3 text-sm font-black border-b-2 transition-all ${
                        activeTab === 'overview' 
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    Transit Overview
                </button>
                <button 
                    onClick={() => {
                        setActiveTab('active-trip');
                        if (currentActiveTrip && (!activeTripDetails || activeTripDetails.id !== currentActiveTrip.id)) {
                            fetchActiveTripDetails(currentActiveTrip.id);
                        }
                    }} 
                    className={`pb-3 text-sm font-black border-b-2 transition-all flex items-center gap-1.5 ${
                        activeTab === 'active-trip' 
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    Active Trip & Boarding
                    {ongoingTrip && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />}
                </button>
                <button 
                    onClick={() => setActiveTab('fuel-log')} 
                    className={`pb-3 text-sm font-black border-b-2 transition-all ${
                        activeTab === 'fuel-log' 
                            ? 'border-teal-600 text-teal-600 dark:text-teal-400' 
                            : 'border-transparent text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                    }`}
                >
                    Log Fuel Purchase
                </button>
            </div>

            {/* Loading Indicator */}
            {loading && activeTab === 'overview' ? (
                <div className="flex flex-col justify-center items-center py-20 space-y-3">
                    <RefreshCw className="animate-spin text-teal-600" size={32} />
                    <span className="text-xs text-gray-500 font-bold">Synchronizing dispatch log...</span>
                </div>
            ) : (
                <>
                    {/* Tab: Overview */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Trip schedules / checklist */}
                            <div className="lg:col-span-2 space-y-4">
                                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">Assigned Trip Log</h3>
                                
                                {driverTrips.length === 0 ? (
                                    <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-10 text-center text-gray-400 font-medium">
                                        <Calendar className="mx-auto opacity-20 mb-4" size={48} />
                                        No transit trips currently assigned to your account.
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {driverTrips.map((trip: any) => (
                                            <div 
                                                key={trip.id} 
                                                className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-5 hover:border-teal-400 transition-all flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
                                            >
                                                <div>
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase ${
                                                            trip.status === 'completed' ? 'bg-gray-100 text-gray-500' :
                                                            trip.status === 'ongoing' ? 'bg-emerald-100 text-emerald-800 border border-emerald-250 animate-pulse' :
                                                            'bg-blue-100 text-blue-800'
                                                        }`}>
                                                            {trip.status}
                                                        </span>
                                                        <span className="text-xs font-bold text-gray-400">
                                                            {new Date(trip.scheduled_departure).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                                                        {trip.origin} <ChevronRight size={14} className="text-gray-300" /> {trip.destination}
                                                    </h4>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
                                                        Purpose: <b className="text-gray-700 dark:text-gray-300">{trip.purpose}</b> • Passengers: <b className="text-gray-700 dark:text-gray-300">{trip.passengers_count}</b>
                                                    </p>
                                                </div>

                                                <button
                                                    onClick={() => {
                                                        setActiveTab('active-trip');
                                                        fetchActiveTripDetails(trip.id);
                                                    }}
                                                    className="px-4 py-2.5 bg-gray-50 dark:bg-gray-900 hover:bg-teal-50 dark:hover:bg-teal-950/20 text-gray-700 dark:text-gray-300 hover:text-teal-700 dark:hover:text-teal-400 border border-gray-150 dark:border-gray-750 font-bold rounded-xl text-xs transition-all flex items-center gap-1 hover:scale-105"
                                                >
                                                    Manage Trip
                                                    <ChevronRight size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Sidebar vehicle details & support */}
                            <div className="space-y-6">
                                <h3 className="text-sm font-black text-gray-800 dark:text-white uppercase tracking-wider">Vehicle Details</h3>
                                
                                {driverVehicle ? (
                                    <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center pb-3 border-b border-gray-100 dark:border-gray-700">
                                            <div>
                                                <h4 className="text-base font-black">{driverVehicle.plate_number}</h4>
                                                <p className="text-xs text-gray-400">{driverVehicle.make} {driverVehicle.model} ({driverVehicle.year})</p>
                                            </div>
                                            <span className="px-2.5 py-1 bg-green-50 dark:bg-green-950/20 border border-green-200 text-green-700 dark:text-green-400 text-[9px] font-black uppercase rounded">
                                                {driverVehicle.status}
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 text-xs font-semibold">
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                                <p className="text-[9px] text-gray-400 uppercase">Fuel Type</p>
                                                <p className="font-bold text-gray-800 dark:text-white mt-1 capitalize">{driverVehicle.fuel_type}</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                                <p className="text-[9px] text-gray-400 uppercase">Capacity</p>
                                                <p className="font-bold text-gray-800 dark:text-white mt-1">{driverVehicle.seating_capacity} Seats</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                                <p className="text-[9px] text-gray-400 uppercase">Odometer</p>
                                                <p className="font-bold text-gray-800 dark:text-white mt-1">{driverVehicle.current_odometer} KM</p>
                                            </div>
                                            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-2xl">
                                                <p className="text-[9px] text-gray-400 uppercase">Tank Size</p>
                                                <p className="font-bold text-gray-800 dark:text-white mt-1">{driverVehicle.fuel_capacity} L</p>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-6 text-center text-gray-400 text-xs italic">
                                        No vehicle assigned to your profile in the fleet directory.
                                    </div>
                                )}

                                {/* Quick Fuel Log Reminder */}
                                <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-3xl p-6 shadow-md space-y-3">
                                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"><Fuel size={20} /></div>
                                    <h4 className="font-bold text-sm">Refill fuel recently?</h4>
                                    <p className="text-xs text-orange-100 font-medium leading-relaxed">Ensure you report and log every fuel purchase immediately to verify mileage efficiency calculations.</p>
                                    <button 
                                        onClick={() => setActiveTab('fuel-log')}
                                        className="w-full py-2.5 bg-white text-orange-700 font-bold text-xs rounded-xl shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
                                    >
                                        Log Refill Now
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Tab: Active Trip & Boarding */}
                    {activeTab === 'active-trip' && (
                        <div className="space-y-6">
                            {!activeTripDetails ? (
                                <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-10 text-center max-w-lg mx-auto shadow-sm">
                                    <Navigation className="mx-auto text-gray-200 dark:text-gray-700 mb-4" size={56} />
                                    <h3 className="text-lg font-black text-gray-800 dark:text-white mb-2">No active trip selected</h3>
                                    <p className="text-xs text-gray-400 font-medium mb-6">Select a trip from the schedule on the overview page to start it, track passengers, and complete odometer records.</p>
                                    <button 
                                        onClick={() => setActiveTab('overview')} 
                                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs shadow-md transition-all hover:scale-105"
                                    >
                                        View Dispatch Log
                                    </button>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                    {/* Left: Odometer, Status and Scanner Panel */}
                                    <div className="space-y-6">
                                        {/* Status / Control Card */}
                                        <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                                            <div className="flex justify-between items-center">
                                                <h3 className="text-sm font-black text-gray-850 dark:text-white uppercase tracking-wider">Trip Control</h3>
                                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                                                    activeTripDetails.status === 'ongoing' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                    {activeTripDetails.status}
                                                </span>
                                            </div>

                                            <div className="space-y-2">
                                                <p className="text-xs text-gray-500 font-medium">Route:</p>
                                                <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-1.5">
                                                    {activeTripDetails.origin} <ChevronRight size={14} /> {activeTripDetails.destination}
                                                </h4>
                                                <p className="text-xs text-gray-400 font-medium">Scheduled: {new Date(activeTripDetails.scheduled_departure).toLocaleString()}</p>
                                            </div>

                                            {activeTripDetails.status === 'scheduled' && (
                                                <form onSubmit={handleStartTrip} className="space-y-4 pt-2">
                                                    <div>
                                                        <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Starting Odometer Reading (KM)</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.1" 
                                                            required
                                                            placeholder="e.g. 15200.0" 
                                                            value={odoInput}
                                                            onChange={e => setOdoInput(e.target.value)}
                                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500"
                                                        />
                                                    </div>
                                                    <button 
                                                        type="submit" 
                                                        disabled={tripSubmitting}
                                                        className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl text-xs shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                                    >
                                                        <Play size={14} />
                                                        {tripSubmitting ? 'Starting...' : 'START TRANSIT TRIP'}
                                                    </button>
                                                </form>
                                            )}

                                            {activeTripDetails.status === 'ongoing' && (
                                                <form onSubmit={handleEndTrip} className="space-y-4 pt-2">
                                                    <div>
                                                        <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Ending Odometer Reading (KM)</label>
                                                        <input 
                                                            type="number" 
                                                            step="0.1" 
                                                            required
                                                            placeholder="e.g. 15340.5" 
                                                            value={odoInput}
                                                            onChange={e => setOdoInput(e.target.value)}
                                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-rose-500"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="block text-[10px] text-gray-400 font-black uppercase mb-1">Transit & Log Notes</label>
                                                        <textarea 
                                                            placeholder="Add details about vehicle performance, route issues, or delays..." 
                                                            value={tripNotes}
                                                            onChange={e => setTripNotes(e.target.value)}
                                                            rows={3}
                                                            className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-rose-500 resize-none"
                                                        />
                                                    </div>
                                                    <button 
                                                        type="submit" 
                                                        disabled={tripSubmitting}
                                                        className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2"
                                                    >
                                                        <Square size={14} />
                                                        {tripSubmitting ? 'Ending...' : 'END TRANSIT TRIP'}
                                                    </button>
                                                </form>
                                            )}
                                        </div>

                                        {/* Boarding scanner simulation */}
                                        {activeTripDetails.status === 'ongoing' && (
                                            <div className="bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4">
                                                <h3 className="text-sm font-black text-gray-850 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                                                    <Scan size={18} className="text-teal-600" />
                                                    Manifest Scanner
                                                </h3>
                                                <p className="text-xs text-gray-500 font-medium leading-relaxed">Scan passenger QR codes or input student registration numbers to verify boarding clearance.</p>

                                                {scanMessage && (
                                                    <div className={`p-3 rounded-xl border text-xs font-bold text-center animate-fade-in ${
                                                        scanMessage.type === 'success' 
                                                            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                                                            : 'bg-rose-50 border-rose-250 text-rose-800'
                                                    }`}>
                                                        {scanMessage.text}
                                                    </div>
                                                )}

                                                <form onSubmit={handleBoardPassenger} className="flex gap-2">
                                                    <input 
                                                        type="text" 
                                                        placeholder="RU-001 or STD001..." 
                                                        value={scanInput}
                                                        onChange={e => setScanInput(e.target.value)}
                                                        className="flex-1 px-4 py-3 bg-gray-50 border-none rounded-xl text-xs font-black text-gray-900 dark:text-white outline-none focus:ring-1 focus:ring-teal-500 placeholder:font-bold"
                                                    />
                                                    <button 
                                                        type="submit" 
                                                        disabled={scanSubmitting}
                                                        className="px-4 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-all shadow-md active:scale-95 disabled:opacity-50"
                                                    >
                                                        Board
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>

                                    {/* Right: Passenger Manifest List */}
                                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
                                        <div>
                                            <div className="flex justify-between items-center mb-6">
                                                <h3 className="text-sm font-black text-gray-850 dark:text-white uppercase tracking-wider flex items-center gap-2">
                                                    <FileText size={18} className="text-teal-600" />
                                                    Passenger Manifest
                                                </h3>
                                                <span className="px-2.5 py-1 bg-teal-50 dark:bg-teal-950/20 text-teal-700 dark:text-teal-400 border border-teal-200 text-[10px] font-black rounded-lg">
                                                    Boarded: {activeTripDetails.passengers?.filter((p: any) => p.arrival_confirmed).length || 0} / {activeTripDetails.passengers?.length || 0}
                                                </span>
                                            </div>

                                            {loadingTrip ? (
                                                <div className="flex justify-center py-20">
                                                    <RefreshCw className="animate-spin text-teal-600" size={28} />
                                                </div>
                                            ) : !activeTripDetails.passengers || activeTripDetails.passengers.length === 0 ? (
                                                <div className="py-20 text-center text-gray-400 font-bold text-xs italic">
                                                    No passengers registered on this transit manifest.
                                                </div>
                                            ) : (
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-left">
                                                        <thead>
                                                            <tr className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-150 pb-2">
                                                                <th className="pb-3">Passenger</th>
                                                                <th className="pb-3">Reg/ID</th>
                                                                <th className="pb-3">Transit Route</th>
                                                                <th className="pb-3">Status</th>
                                                                <th className="pb-3 text-right">Confirm</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                                                            {activeTripDetails.passengers.map((p: any) => (
                                                                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 text-xs font-semibold text-gray-750 dark:text-gray-200 transition-colors">
                                                                    <td className="py-3.5">
                                                                        <div>
                                                                            <p className="font-black text-gray-900 dark:text-white">{p.passenger_name}</p>
                                                                            <p className="text-[10px] text-gray-400">{p.phone_number}</p>
                                                                        </div>
                                                                    </td>
                                                                    <td className="py-3.5 font-mono text-[10px] font-black">{p.admission_number}</td>
                                                                    <td className="py-3.5 text-[10px] text-gray-400">
                                                                        {p.pickup_location} <ChevronRight size={10} className="inline text-gray-300" /> {p.drop_off_location}
                                                                    </td>
                                                                    <td className="py-3.5">
                                                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                                                                            p.arrival_confirmed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                                        }`}>
                                                                            {p.arrival_confirmed ? 'Boarded' : 'Pending'}
                                                                        </span>
                                                                    </td>
                                                                    <td className="py-3.5 text-right">
                                                                        {!p.arrival_confirmed ? (
                                                                            <button 
                                                                                onClick={async () => {
                                                                                    setScanInput(p.admission_number);
                                                                                    // Trigger click via boarding helper
                                                                                    setScanSubmitting(true);
                                                                                    try {
                                                                                        const res = await fetch(`/api/fleet/trips/${activeTripDetails.id}/board`, {
                                                                                            method: 'POST',
                                                                                            headers: { 
                                                                                                'Content-Type': 'application/json',
                                                                                                'Authorization': `Bearer ${token}`
                                                                                            },
                                                                                            body: JSON.stringify({ scanned_data: p.admission_number })
                                                                                        });
                                                                                        if (res.ok) {
                                                                                            showFeedback('success', `Boarded ${p.passenger_name}`);
                                                                                            setScanInput('');
                                                                                            fetchActiveTripDetails(activeTripDetails.id);
                                                                                        }
                                                                                    } catch(e) {}
                                                                                    setScanSubmitting(false);
                                                                                }}
                                                                                className="px-2.5 py-1 bg-teal-50 hover:bg-teal-600 hover:text-white text-teal-700 font-black rounded-lg text-[9px] border border-teal-150 transition-all hover:scale-105"
                                                                            >
                                                                                Check In
                                                                            </button>
                                                                        ) : (
                                                                            <CheckCircle2 size={16} className="text-emerald-500 ml-auto mr-4" />
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            )}
                                        </div>

                                        <div className="border-t border-gray-100 dark:border-gray-700/80 pt-4 text-[10px] text-gray-400 uppercase tracking-widest text-center font-bold">
                                            Smart Campus Logistics Security Audit Log
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Fuel Log */}
                    {activeTab === 'fuel-log' && (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Fuel refuel logging form */}
                            <div className="lg:col-span-1 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-6 shadow-sm">
                                <h3 className="text-base font-black mb-6">Log Fuel Purchase</h3>
                                <form onSubmit={handleFuelSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] text-gray-450 font-black uppercase mb-1">Vehicle Unit</label>
                                        <select 
                                            required 
                                            value={fuelForm.vehicle_id}
                                            onChange={e => setFuelForm({...fuelForm, vehicle_id: e.target.value})}
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold outline-none text-gray-900 dark:text-white"
                                        >
                                            <option value="">Select Fleet Vehicle</option>
                                            {vehicles.map((v: any) => (
                                                <option key={v.id} value={v.id}>{v.plate_number} ({v.make} {v.model})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] text-gray-450 font-black uppercase mb-1">Liters Refilled</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                required 
                                                placeholder="Liters" 
                                                value={fuelForm.amount_liters} 
                                                onChange={e => setFuelForm({...fuelForm, amount_liters: e.target.value})} 
                                                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold outline-none text-gray-900 dark:text-white" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] text-gray-450 font-black uppercase mb-1">Cost (KES)</label>
                                            <input 
                                                type="number" 
                                                step="0.01" 
                                                required 
                                                placeholder="Cost" 
                                                value={fuelForm.cost} 
                                                onChange={e => setFuelForm({...fuelForm, cost: e.target.value})} 
                                                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold outline-none text-gray-900 dark:text-white" 
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-gray-450 font-black uppercase mb-1">Current Odometer Reading (KM)</label>
                                        <input 
                                            type="number" 
                                            required 
                                            placeholder="Odometer Reading" 
                                            value={fuelForm.odometer_reading} 
                                            onChange={e => setFuelForm({...fuelForm, odometer_reading: e.target.value})} 
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold outline-none text-gray-900 dark:text-white" 
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-[10px] text-gray-450 font-black uppercase mb-1">Fuel Station</label>
                                        <input 
                                            type="text" 
                                            required 
                                            placeholder="Station Name (e.g. Shell, Total)" 
                                            value={fuelForm.station_name} 
                                            onChange={e => setFuelForm({...fuelForm, station_name: e.target.value})} 
                                            className="w-full p-4 bg-gray-50 dark:bg-gray-900 border-none rounded-2xl text-xs font-bold outline-none text-gray-900 dark:text-white" 
                                        />
                                    </div>

                                    <button 
                                        type="submit" 
                                        disabled={fuelSubmitting}
                                        className="w-full py-4 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl shadow-xl hover:opacity-90 disabled:opacity-50 transition-all text-xs flex justify-center items-center gap-2"
                                    >
                                        {fuelSubmitting ? (
                                            <RefreshCw className="animate-spin" size={16} />
                                        ) : (
                                            <Fuel size={16} />
                                        )}
                                        {fuelSubmitting ? 'Saving...' : 'SAVE FUEL REPORT'}
                                    </button>
                                </form>
                            </div>

                            {/* Refuel history feed */}
                            <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                                <div>
                                    <h3 className="text-base font-black mb-6">Fuel Reporting History</h3>
                                    
                                    {driverVehicle?.fuel_logs?.length === 0 ? (
                                        <div className="py-20 text-center text-gray-400 font-bold text-xs italic">
                                            No fuel refill reports found for this vehicle.
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {(driverVehicle?.fuel_logs || []).slice(0, 5).map((log: any, i: number) => (
                                                <div key={i} className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl flex items-center justify-between shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-10 h-10 bg-orange-100 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 rounded-xl flex items-center justify-center"><Fuel size={18} /></div>
                                                        <div>
                                                            <h4 className="font-bold text-xs">{log.station_name || 'Fuel Purchase'}</h4>
                                                            <p className="text-[10px] font-black text-gray-400 uppercase mt-0.5">{log.amount_liters}L • Odo: {log.odometer_reading} KM</p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-black text-gray-950 dark:text-gray-200 text-xs">KES {log.cost.toLocaleString()}</p>
                                                        <p className="text-[9px] font-bold text-emerald-600 uppercase mt-0.5">Verified</p>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div className="border-t border-gray-100 dark:border-gray-700/80 pt-4 text-[10px] text-gray-400 uppercase tracking-widest text-center font-bold">
                                    Official Campus Dispatch Operations Review Logs
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
