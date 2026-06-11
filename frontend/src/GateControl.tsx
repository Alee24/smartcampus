import { useState, useRef, useEffect } from 'react'
import { 
    Scan, ShieldAlert, BadgeCheck, XCircle, Camera, Car, RefreshCw, 
    StopCircle, Clock, TrendingUp, Activity, Search, Calendar, 
    User as UserIcon, Loader2, Key, Phone, FileText, CheckCircle2,
    Users, AlertOctagon, HelpCircle, ArrowRightLeft, List, ClipboardList
} from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { useNotification } from './components/Notification'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'

export default function GateControl() {
    const { showNotification } = useNotification()
    const [admissionNumber, setAdmissionNumber] = useState('')
    const [studentSuggestions, setStudentSuggestions] = useState<any[]>([])
    const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'rejected' | 'scanning'>('idle')
    const [lastScan, setLastScan] = useState<any>(null)
    const [stream, setStream] = useState<MediaStream | null>(null)
    const [scanMode, setScanMode] = useState<'qr' | 'plate' | null>(null)
    const [refreshTrigger, setRefreshTrigger] = useState(0)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const refreshData = () => setRefreshTrigger(prev => prev + 1)

    const cleanQRData = (input: string): string => {
        if (!input) return "";
        const cleanInput = input.trim();
        try {
            if (cleanInput.toUpperCase().startsWith("HTTP://") || cleanInput.toUpperCase().startsWith("HTTPS://")) {
                const url = new URL(cleanInput);
                const userParam = url.searchParams.get("USER") || url.searchParams.get("user");
                if (userParam) return userParam.trim();
                const admParam = url.searchParams.get("admission") || url.searchParams.get("adm");
                if (admParam) return admParam.trim();
                const tripParam = url.searchParams.get("trip");
                if (tripParam) return `TRIP:${tripParam.trim()}`;
                const vehicleParam = url.searchParams.get("vehicle");
                if (vehicleParam) return `VEHICLE:${vehicleParam.trim()}`;
                const pathSegments = url.pathname.split("/").filter(Boolean);
                if (pathSegments.length > 0) return pathSegments[pathSegments.length - 1].trim();
            }
        } catch (e) {}
        const userMatch = cleanInput.match(/[?&][uU][sS][eE][rR]=([^&]+)/);
        if (userMatch && userMatch[1]) return userMatch[1].trim();
        const tripMatch = cleanInput.match(/[?&]trip=([^&]+)/);
        if (tripMatch && tripMatch[1]) return `TRIP:${tripMatch[1].trim()}`;
        const vehicleMatch = cleanInput.match(/[?&]vehicle=([^&]+)/);
        if (vehicleMatch && vehicleMatch[1]) return `VEHICLE:${vehicleMatch[1].trim()}`;
        return cleanInput;
    };

    // Manual Form States
    const [activeTab, setActiveTab] = useState<'student' | 'visitor' | 'vehicle'>('student')
    
    // Visitor Form
    const [visitorForm, setVisitorForm] = useState({ name: '', id: '', phone: '', details: '' })
    
    // Vehicle Form
    const [manualPlate, setManualPlate] = useState('')
    const [manualPassengers, setManualPassengers] = useState(1)
    const [manualDriverName, setManualDriverName] = useState('')
    const [manualDriverContact, setManualDriverContact] = useState('')
    const [manualDriverId, setManualDriverId] = useState('')
    const [manualPurpose, setManualPurpose] = useState('Visitor / External')
    const [manualDestination, setManualDestination] = useState('')
    const [plateSuggestions, setPlateSuggestions] = useState<any[]>([])
    const [vehicleIsCheckedIn, setVehicleIsCheckedIn] = useState(false)

    // Detailed lists viewing modals (to keep A4 main page compact)
    const [showLogsModal, setShowLogsModal] = useState(false)
    const [showVehiclesModal, setShowVehiclesModal] = useState(false)
    const [showEventModal, setShowEventModal] = useState(false)
    const [eventData, setEventData] = useState<any>(null)
    
    // Camera Permission States
    const [showPermissionModal, setShowPermissionModal] = useState(false)
    const [permissionError, setPermissionError] = useState('')

    // Search & Log detail states
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedVehicleLog, setSelectedVehicleLog] = useState<any>(null)

    // Data lists
    const [vehicleStats, setVehicleStats] = useState<any>({
        total_today: 0,
        current_inside: 0,
        manual_entries: 0,
        unique_vehicles: 0,
        total_exited: 0,
        longest_stays: []
    })
    const [visitorStats, setVisitorStats] = useState<any>({
        total_today: 0,
        active_now: 0,
        exited_today: 0
    })
    const [studentStats, setStudentStats] = useState<any>({
        total_today: 0,
        active_now: 0,
        exited_today: 0
    })
    const [recentVehicles, setRecentVehicles] = useState<any[]>([])
    const [registeredVehicles, setRegisteredVehicles] = useState<any[]>([])
    const [recentVisitors, setRecentVisitors] = useState<any[]>([])
    const [gates, setGates] = useState<any[]>([])
    const [selectedGateId, setSelectedGateId] = useState<string>('')

    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const qrScannerRef = useRef<Html5Qrcode | null>(null)

    const triggerHapticFeedback = (success: boolean) => {
        if ('vibrate' in navigator) {
            try {
                if (success) {
                    navigator.vibrate(200)
                } else {
                    navigator.vibrate([200, 100, 200])
                }
            } catch (e) {}
        }
    }

    // Autocomplete Lookup for Plates
    const handlePlateSearch = async (val: string) => {
        const v = val.toUpperCase().replace(/[^A-Z0-9\s]/g, '')
        setManualPlate(v)
        if (v.length > 1) {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`/api/gate/vehicles/search?q=${v}`, { headers: { 'Authorization': `Bearer ${token}` } })
                if (res.ok) {
                    const data = await res.json()
                    setPlateSuggestions(data)
                    const cleanV = v.replace(/\s+/g, '')
                    const exactMatch = data.find((item: any) => item.plate_number.toUpperCase().replace(/\s+/g, '') === cleanV)
                    if (exactMatch) {
                        setManualDriverName(exactMatch.driver_name || '')
                        setManualDriverContact(exactMatch.driver_contact || '')
                        setManualDriverId(exactMatch.driver_id_number || '')
                        setVehicleIsCheckedIn(exactMatch.is_checked_in || false)
                        if (exactMatch.vehicle_type === 'staff') {
                            setManualPurpose('Staff Check-in')
                        } else if (exactMatch.vehicle_type === 'student') {
                            setManualPurpose('Student Check-in')
                        } else {
                            setManualPurpose('Visitor / External')
                        }
                    } else {
                        setVehicleIsCheckedIn(false)
                    }
                }
            } catch (e) { }
        } else {
            setPlateSuggestions([])
            setVehicleIsCheckedIn(false)
        }
    }

    const selectSuggestion = (v: any) => {
        setManualPlate(v.plate_number)
        setManualDriverName(v.driver_name || '')
        setManualDriverContact(v.driver_contact || '')
        setManualDriverId(v.driver_id_number || '')
        setVehicleIsCheckedIn(v.is_checked_in || false)
        if (v.vehicle_type === 'staff') {
            setManualPurpose('Staff Check-in')
        } else if (v.vehicle_type === 'student') {
            setManualPurpose('Student Check-in')
        } else {
            setManualPurpose('Visitor / External')
        }
        setPlateSuggestions([])
    }

    // Autocomplete Lookup for Students
    const handleStudentSearch = async (val: string) => {
        const v = val.toUpperCase().replace(/[^A-Z0-9-]/g, '')
        setAdmissionNumber(v)
        if (v.length > 1) {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch(`/api/users/search?q=${v}`, { headers: { 'Authorization': `Bearer ${token}` } })
                if (res.ok) setStudentSuggestions(await res.json())
            } catch (e) { }
        } else {
            setStudentSuggestions([])
        }
    }

    const selectStudentSuggestion = (v: any) => {
        setAdmissionNumber(v.admission_number)
        setStudentSuggestions([])
    }

    // Submit Student Verification Check-In
    const handleStudentVerify = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!admissionNumber.trim()) return
        setIsSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ admission_number: cleanQRData(admissionNumber), gate_id: selectedGateId })
            })

            const result = await res.json()

            if (result.status === 'allowed') {
                setScanStatus('success')
                setLastScan(result.data)
                triggerHapticFeedback(true)
                showNotification(`Access granted for ${result.data.name}`, 'success')
                setAdmissionNumber('')
            } else if (result.status === 'event_pass') {
                setEventData(result.data)
                setShowEventModal(true)
                triggerHapticFeedback(true)
                setScanStatus('idle')
            } else {
                setScanStatus('rejected')
                setLastScan(result.data || {
                    name: 'Unknown / Not Found',
                    role: 'N/A',
                    time: new Date().toLocaleTimeString()
                })
                triggerHapticFeedback(false)
                showNotification('Access Denied', 'error')
            }
            refreshData()
        } catch (err) {
            setScanStatus('rejected')
            triggerHapticFeedback(false)
            showNotification('Network communication error', 'error')
        } finally {
            setIsSubmitting(false)
        }
    }

    // Submit Visitor Check-In
    const handleVisitorCheckIn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!visitorForm.name.trim()) {
            showNotification("Guest Full Name is required", "error")
            return
        }
        if (!visitorForm.id.trim()) {
            showNotification("National ID / Passport number is required", "error")
            return
        }
        if (!visitorForm.phone.trim()) {
            showNotification("Phone number is required", "error")
            return
        }
        setIsSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/visitors/check-in', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    first_name: visitorForm.name.split(' ')[0] || '',
                    last_name: visitorForm.name.split(' ').slice(1).join(' ') || 'Visitor',
                    phone_number: visitorForm.phone,
                    id_number: visitorForm.id,
                    visit_details: visitorForm.details || 'General Campus Visit',
                    gate_id: selectedGateId
                })
            })
            const result = await res.json()
            if (res.ok) {
                setScanStatus('success')
                setLastScan({
                    name: `${result.first_name} ${result.last_name}`,
                    role: `Visitor: ${result.visit_details}`,
                    time: new Date(result.time_in).toLocaleTimeString(),
                    image: "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"
                })
                setVisitorForm({ name: '', id: '', phone: '', details: '' })
                showNotification(`Visitor registered successfully`, 'success')
                refreshData()
            } else {
                showNotification(result.detail || "Failed to register visitor", "error")
            }
        } catch (e: any) {
            showNotification(`Error: ${e.message}`, "error")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Submit Vehicle Entry Check-in
    const handleVehicleCheckIn = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!manualPlate.trim()) return
        setIsSubmitting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/manual-vehicle-entry', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    plate_number: manualPlate,
                    passengers: manualPassengers,
                    driver_name: manualDriverName,
                    driver_contact: manualDriverContact,
                    driver_id_number: manualDriverId,
                    gate_id: selectedGateId,
                    purpose: manualPurpose,
                    destination: manualDestination
                })
            })
            const result = await res.json()
            if (res.ok) {
                setScanStatus('success')
                const actionMsg = result.action === 'checkout' ? 'checked out' : 'checked in';
                setLastScan({
                    name: result.data.plate,
                    role: `Driver: ${manualDriverName || 'Unknown Driver'} (${manualPurpose}) [${result.action === 'checkout' ? 'OUT' : 'IN'}]`,
                    time: result.data.time,
                    image: result.data.image,
                    isVehicle: true,
                    passengers: manualPassengers
                })
                setManualPlate('')
                setManualPassengers(1)
                setManualDriverName('')
                setManualDriverContact('')
                setManualDriverId('')
                setManualPurpose('Visitor / External')
                setManualDestination('')
                setVehicleIsCheckedIn(false)
                showNotification(`Vehicle ${result.data.plate} ${actionMsg} successfully`, 'success')
                refreshData()
            } else {
                showNotification(result.detail || "Error logging vehicle", "error")
            }
        } catch (e) {
            showNotification("Network Error", "error")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Check-out active student
    const handleStudentCheckOut = async (adm: string) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/gate/check-out/${adm}`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                showNotification(`Checked out student ${adm} successfully`, 'success')
                refreshData()
            } else {
                showNotification('Error checking out student', 'error')
            }
        } catch (e) {
            showNotification('Network Error', 'error')
        }
    }

    // Check-out Active Vehicle
    const handleVehicleExit = async (plate: string) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/vehicle-exit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ plate_number: plate, gate_id: selectedGateId })
            })
            if (res.ok) {
                showNotification(`Vehicle ${plate} has exited`, 'success')
                refreshData()
            } else {
                showNotification("Error recording vehicle exit", "error")
            }
        } catch (e) { showNotification("Network Error", "error") }
    }

    // Check-out Active Visitor
    const handleVisitorCheckOut = async (visitorId: string) => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/visitors/check-out', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ visitor_id: visitorId })
            })
            if (res.ok) {
                showNotification("Visitor checked out successfully", "success")
                refreshData()
            } else {
                showNotification("Error checking out visitor", "error")
            }
        } catch (e: any) {
            showNotification(`Error: ${e.message}`, "error")
        }
    }

    // Core Camera Operations
    const handleFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setScanStatus('scanning')

        // Setup temporary container if "gate-qr-reader" is not in DOM
        let tempDiv = document.getElementById("gate-qr-reader");
        let createdTemp = false;
        if (!tempDiv) {
            tempDiv = document.createElement("div");
            tempDiv.id = "gate-qr-reader";
            tempDiv.style.display = "none";
            document.body.appendChild(tempDiv);
            createdTemp = true;
        }

        try {
            const html5QrCode = new Html5Qrcode("gate-qr-reader")
            const decodedText = await html5QrCode.scanFile(file, false)
            setAdmissionNumber(decodedText)
            await processQR(decodedText)
        } catch (err: any) {
            console.error("QR File Scan Error", err)
            showNotification(`Could not read QR code: ${err?.message || "Invalid/blurry image"}`, "error")
            setScanStatus('idle')
        } finally {
            if (createdTemp && tempDiv) {
                tempDiv.remove()
            }
            e.target.value = ''
        }
    }

    const handlePlateFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setScanStatus('scanning')

        const formData = new FormData()
        formData.append('file', file, 'plate_scan.jpg')

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/ocr-plate', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })
            const data = await res.json()

            if (res.ok && data.plate_number) {
                setScanStatus('success')
                setManualPlate(data.plate_number)
                setActiveTab('vehicle')
                
                if (data.is_registered) {
                    setManualDriverName(data.vehicle.driver_name || '')
                    setManualDriverContact(data.vehicle.driver_contact || '')
                    setManualDriverId(data.vehicle.driver_id_number || '')
                    setVehicleIsCheckedIn(data.is_checked_in || false)
                    if (data.vehicle.vehicle_type === 'staff') {
                        setManualPurpose('Staff Check-in')
                    } else if (data.vehicle.vehicle_type === 'student') {
                        setManualPurpose('Student Check-in')
                    } else {
                        setManualPurpose('Visitor / External')
                    }
                    const actionMsg = data.is_checked_in ? 'Check Out' : 'Check In';
                    showNotification(`Plate transcribed: ${data.plate_number} (Registered vehicle). Click ${actionMsg} Vehicle to proceed.`, 'success')
                } else {
                    setManualDriverName('')
                    setManualDriverContact('')
                    setManualDriverId('')
                    setManualPurpose('Visitor / External')
                    setVehicleIsCheckedIn(false)
                    showNotification(`Plate transcribed: ${data.plate_number} (Unregistered vehicle). Please fill in the driver details.`, 'info')
                }
            } else {
                setScanStatus('rejected')
                showNotification(data.detail || 'Failed to transcribe plate number', 'warning')
            }
        } catch (err: any) {
            showNotification(`Error transcribing plate: ${err.message || err}`, "error")
            setScanStatus('idle')
        } finally {
            e.target.value = ''
        }
    }

    const startCamera = async (mode: 'qr' | 'plate') => {
        setPermissionError('')
        setScanMode(mode)
        
        if (!window.isSecureContext) {
            showNotification("Insecure context: Opening device camera to capture photo...", "info")
            if (mode === 'qr') {
                const el = document.getElementById("insecure-qr-file-input")
                if (el) el.click()
            } else {
                const el = document.getElementById("insecure-plate-file-input")
                if (el) el.click()
            }
            return
        }

        if (mode === 'qr') {
            setScanStatus('scanning')
            setTimeout(async () => {
                try {
                    const scanner = new Html5Qrcode("gate-qr-reader")
                    qrScannerRef.current = scanner
                    await scanner.start(
                        { facingMode: "environment" },
                        { fps: 10, qrbox: { width: 250, height: 250 } },
                        (decodedText) => {
                            setAdmissionNumber(decodedText)
                            stopCamera()
                            processQR(decodedText)
                        },
                        () => {}
                    )
                } catch (err: any) {
                    console.error("QR Start Error", err)
                    showNotification(`Could not start QR scanner: ${err?.message || err}`, "error")
                    setScanStatus('idle')
                }
            }, 300)
            return
        }

        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            })
            setStream(s)
            setScanStatus('scanning')
            setShowPermissionModal(false)
        } catch (err: any) {
            console.error("Camera Access Error:", err)
            const errorName = err?.name || "UnknownError"
            if (errorName === 'NotAllowedError' || errorName === 'PermissionDeniedError') {
                setPermissionError('denied')
                setShowPermissionModal(true)
            } else {
                showNotification("No camera device found on this system.", "error")
                setScanStatus('idle')
            }
        }
    }

    const stopCamera = async () => {
        if (qrScannerRef.current) {
            try {
                await qrScannerRef.current.stop()
                qrScannerRef.current = null
            } catch (e) {}
        }
        if (stream) {
            stream.getTracks().forEach(track => track.stop())
        }
        setStream(null)
        setScanMode(null)
        setScanStatus('idle')
    }

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream
        }
    }, [stream])

    const processQR = async (code: string) => {
        setScanStatus('scanning')
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/gate/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ admission_number: cleanQRData(code), gate_id: selectedGateId })
            })

            const result = await res.json()
            if (result.status === 'allowed') {
                setScanStatus('success')
                setLastScan(result.data)
                triggerHapticFeedback(true)
                showNotification(result.message || `Access granted for ${result.data.name}`, 'success')
            } else if (result.status === 'event_pass') {
                setEventData(result.data)
                setShowEventModal(true)
                triggerHapticFeedback(true)
                setScanStatus('idle')
            } else {
                setScanStatus('rejected')
                setLastScan(result.data || {
                    name: 'Unknown / Not Found',
                    role: 'N/A',
                    time: new Date().toLocaleTimeString()
                })
                triggerHapticFeedback(false)
                showNotification(result.message || 'Access Denied', 'error')
            }
            refreshData()
        } catch (err: any) {
            setScanStatus('rejected')
            triggerHapticFeedback(false)
            showNotification(`Scanner error: ${err.message || err}`, 'error')
        }
    }

    const captureAndProcess = () => {
        if (!videoRef.current || !canvasRef.current) return
        const context = canvasRef.current.getContext('2d')
        if (!context) return

        canvasRef.current.width = videoRef.current.videoWidth
        canvasRef.current.height = videoRef.current.videoHeight
        context.drawImage(videoRef.current, 0, 0)

        canvasRef.current.toBlob(async (blob) => {
            if (!blob) return
            stopCamera()

             if (scanMode === 'plate') {
                 const formData = new FormData()
                 formData.append('file', blob, 'plate_scan.jpg')
 
                 try {
                     const token = localStorage.getItem('token')
                     const res = await fetch('/api/gate/ocr-plate', {
                         method: 'POST',
                         headers: { 'Authorization': `Bearer ${token}` },
                         body: formData
                     })
                     const data = await res.json()
 
                     if (res.ok && data.plate_number) {
                         setScanStatus('success')
                         setManualPlate(data.plate_number)
                         setActiveTab('vehicle')
                         
                         if (data.is_registered) {
                             setManualDriverName(data.vehicle.driver_name || '')
                             setManualDriverContact(data.vehicle.driver_contact || '')
                             setManualDriverId(data.vehicle.driver_id_number || '')
                             setVehicleIsCheckedIn(data.is_checked_in || false)
                             if (data.vehicle.vehicle_type === 'staff') {
                                 setManualPurpose('Staff Check-in')
                             } else if (data.vehicle.vehicle_type === 'student') {
                                 setManualPurpose('Student Check-in')
                             } else {
                                 setManualPurpose('Visitor / External')
                             }
                             const actionMsg = data.is_checked_in ? 'Check Out' : 'Check In';
                             showNotification(`Plate transcribed: ${data.plate_number} (Registered vehicle). Click ${actionMsg} Vehicle to proceed.`, 'success')
                         } else {
                             setManualDriverName('')
                             setManualDriverContact('')
                             setManualDriverId('')
                             setManualPurpose('Visitor / External')
                             setVehicleIsCheckedIn(false)
                             showNotification(`Plate transcribed: ${data.plate_number} (Unregistered vehicle). Please fill in the driver details.`, 'info')
                         }
                     } else {
                         setScanStatus('rejected')
                         showNotification(data.detail || 'Failed to transcribe plate number', 'warning')
                     }
                 } catch (e) {
                     showNotification("Error processing plate transcription", "error")
                     setScanStatus('idle')
                 }
             }
        }, 'image/jpeg')
    }

    useEffect(() => {
        const fetchGates = async () => {
            const token = localStorage.getItem('token')
            try {
                const res = await fetch('/api/gate/manage/gates', {
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    setGates(data)
                    const storedGateId = localStorage.getItem('active_gate_id')
                    if (storedGateId && data.some((g: any) => g.id === storedGateId)) {
                        setSelectedGateId(storedGateId)
                    } else if (data.length > 0) {
                        setSelectedGateId(data[0].id)
                        localStorage.setItem('active_gate_id', data[0].id)
                    }
                }
            } catch (e) {
                console.error('Failed to fetch gates', e)
            }
        }
        fetchGates()
    }, [])

    // Load Stats & Data
    useEffect(() => {
        const fetchGateData = async () => {
            try {
                const token = localStorage.getItem('token')
                const headers = { 'Authorization': `Bearer ${token}` }
                const gateParam = selectedGateId ? `?gate_id=${selectedGateId}` : ''

                // Fetch Vehicle details
                const statsRes = await fetch(`/api/gate/vehicle-stats${gateParam}`, { headers })
                if (statsRes.ok) setVehicleStats(await statsRes.json())

                const regRes = await fetch(`/api/gate/vehicles?_t=${Date.now()}`, { headers })
                if (regRes.ok) setRegisteredVehicles(await regRes.json())

                const logsRes = await fetch(`/api/gate/vehicle-logs?_t=${Date.now()}`, { headers })
                if (logsRes.ok) setRecentVehicles(await logsRes.json())

                // Fetch Visitor details
                const visitorStatsRes = await fetch(`/api/gate/visitor-stats${gateParam}`, { headers })
                if (visitorStatsRes.ok) setVisitorStats(await visitorStatsRes.json())

                const visitorsRes = await fetch(`/api/gate/visitors?_t=${Date.now()}`, { headers })
                if (visitorsRes.ok) setRecentVisitors(await visitorsRes.json())

                // Fetch Student details
                const studentStatsRes = await fetch(`/api/gate/student-stats${gateParam}`, { headers })
                if (studentStatsRes.ok) setStudentStats(await studentStatsRes.json())

            } catch (e) { console.error("Error loading gate data:", e) }
        }
        fetchGateData()
    }, [refreshTrigger, selectedGateId])

    // Calculate aggregated stats
    const totalEntriesToday = vehicleStats.total_today + visitorStats.total_today + studentStats.total_today
    const currentInsideToday = vehicleStats.current_inside + visitorStats.active_now + studentStats.active_now

    return (
        <div className="w-full max-w-full overflow-x-hidden min-w-0 px-2 sm:px-4 md:px-6 lg:px-8 animate-fade-in font-sans space-y-6">
            <canvas ref={canvasRef} className="hidden" />
            <input 
                type="file" 
                id="insecure-qr-file-input" 
                accept="image/*" 
                capture="environment" 
                onChange={handleFileScan} 
                className="hidden" 
            />
            <input 
                type="file" 
                id="insecure-plate-file-input" 
                accept="image/*" 
                capture="environment" 
                onChange={handlePlateFileScan} 
                className="hidden" 
            />

            {gates.length > 0 && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-6 py-4 rounded-3xl border border-slate-150/80 dark:border-slate-850 shadow-sm mb-4">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 dark:text-white">Gate Operations & Control</h2>
                        <p className="text-xs text-slate-400 font-bold">Monitor traffic and manage entries/exits at your designated terminal.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">Active Device Terminal:</span>
                        <select
                            value={selectedGateId}
                            onChange={(e) => {
                                const newGateId = e.target.value;
                                setSelectedGateId(newGateId);
                                localStorage.setItem('active_gate_id', newGateId);
                                showNotification(`Switched active terminal to: ${gates.find(g => g.id === newGateId)?.name || 'Unknown'}`, 'success');
                            }}
                            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-2xl border-none outline-none cursor-pointer font-black transition-all shadow-sm text-sm"
                        >
                            {gates.map((g) => (
                                <option key={g.id} value={g.id}>{g.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* 1. TOP STATS ROW (ON BOARD, ON TOP OF EVERYTHING ELSE) */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-indigo-500/10 to-indigo-600/5 dark:from-indigo-950/30 dark:to-slate-900 border border-indigo-500/20 rounded-2xl p-5 shadow-sm hover:shadow transition-all relative overflow-hidden group">
                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Users size={48} className="text-indigo-600" />
                    </div>
                    <p className="text-xs font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest mb-1">Check-ins Today</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{totalEntriesToday}</span>
                        <span className="text-xs text-slate-400 font-bold">total entries</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-bold flex flex-wrap gap-2">
                        <span>🎓 {studentStats.total_today} Students</span>
                        <span>•</span>
                        <span>🚗 {vehicleStats.total_today} Vehicles</span>
                        <span>•</span>
                        <span>🎫 {visitorStats.total_today} Visitors</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/5 dark:from-teal-950/30 dark:to-slate-900 border border-teal-500/20 rounded-2xl p-5 shadow-sm hover:shadow transition-all relative overflow-hidden group">
                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <CheckCircle2 size={48} className="text-teal-600" />
                    </div>
                    <p className="text-xs font-black text-teal-600 dark:text-teal-400 uppercase tracking-widest mb-1">Currently Inside</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">{currentInsideToday}</span>
                        <span className="text-xs text-slate-400 font-bold">active now</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-bold flex flex-wrap gap-2">
                        <span>🎓 {studentStats.active_now} Students</span>
                        <span>•</span>
                        <span>🚗 {vehicleStats.current_inside} Parked</span>
                        <span>•</span>
                        <span>🎫 {visitorStats.active_now} Visitors</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 dark:from-orange-950/30 dark:to-slate-900 border border-orange-500/20 rounded-2xl p-5 shadow-sm hover:shadow transition-all relative overflow-hidden group">
                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <ArrowRightLeft size={48} className="text-orange-600" />
                    </div>
                    <p className="text-xs font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest mb-1">Total Checked Out</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">
                            {vehicleStats.total_exited + visitorStats.exited_today + studentStats.exited_today}
                        </span>
                        <span className="text-xs text-slate-400 font-bold">exited</span>
                    </div>
                    <div className="mt-2 text-[10px] text-slate-400 font-bold flex flex-wrap gap-2">
                        <span>🎓 {studentStats.exited_today} Students</span>
                        <span>•</span>
                        <span>🚗 {vehicleStats.total_exited} Cars</span>
                        <span>•</span>
                        <span>🎫 {visitorStats.exited_today} Guests</span>
                    </div>
                </div>

                <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 dark:from-red-950/30 dark:to-slate-900 border border-red-500/20 rounded-2xl p-5 shadow-sm hover:shadow transition-all relative overflow-hidden group">
                    <div className="absolute right-4 top-4 opacity-10 group-hover:opacity-20 transition-opacity">
                        <AlertOctagon size={48} className="text-red-600" />
                    </div>
                    <p className="text-xs font-black text-red-600 dark:text-red-400 uppercase tracking-widest mb-1">Security Alert</p>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-black text-slate-900 dark:text-white">0</span>
                        <span className="text-xs text-slate-400 font-bold">active threats</span>
                    </div>
                    <button 
                        onClick={async () => {
                            if (!confirm("🚨 ACTIVATE SECURITY ALARM?\n\nThis immediately broadcasts alerts to all campus guards.")) return;
                            try {
                                const token = localStorage.getItem('token')
                                await fetch('/api/gate/alarm', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } })
                                showNotification("General Security Alarm Triggered!", "error")
                            } catch (e) { showNotification("Network Error", "error") }
                        }}
                        className="mt-2 text-[10px] text-red-600 dark:text-red-400 font-black uppercase tracking-wider flex items-center gap-1 hover:underline active:scale-95"
                    >
                        🚨 Trigger General Alarm
                    </button>
                </div>
            </div>

            {/* 2. MAIN CORE LAYOUT (A4 VIEWS FIT - COMPACT FLEXIBLE GRID) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                
                {/* LEFT CONSOLE: ACTIONS & UNIFIED ENTRY CONTROL (lg:col-span-5) */}
                <div className="lg:col-span-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
                    <div className="flex justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800">
                        <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                            <Scan className="text-indigo-600 animate-pulse" />
                            Gate Terminal Entry
                        </h3>
                        <div className="flex gap-2">
                            <button onClick={() => setShowVehiclesModal(true)} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-xl text-slate-500" title="Registered Vehicles Directory">
                                <Car size={16} />
                            </button>
                            <button onClick={() => setShowLogsModal(true)} className="p-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 rounded-xl text-slate-500" title="Detailed History Logs">
                                <ClipboardList size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Tactics Mode Selectors (Student, Visitor, Vehicle) */}
                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
                        <button 
                            onClick={() => { setActiveTab('student'); setScanStatus('idle'); }}
                            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'student' ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <UserIcon size={14} /> Student/Staff
                        </button>
                        <button 
                            onClick={() => { setActiveTab('visitor'); setScanStatus('idle'); }}
                            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'visitor' ? 'bg-white dark:bg-slate-700 text-teal-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Calendar size={14} /> Guest/Visitor
                        </button>
                        <button 
                            onClick={() => { setActiveTab('vehicle'); setScanStatus('idle'); }}
                            className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${activeTab === 'vehicle' ? 'bg-white dark:bg-slate-700 text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <Car size={14} /> Vehicle
                        </button>
                    </div>

                    {/* ACTIVE FORM CONSOLE */}
                    <div className="space-y-4 min-h-[260px]">
                        {activeTab === 'student' && (
                            <form onSubmit={handleStudentVerify} className="space-y-4 animate-fade-in">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Student Admission Number</label>
                                    <div className="relative z-50">
                                        <input 
                                            required
                                            value={admissionNumber}
                                            onChange={e => handleStudentSearch(e.target.value)}
                                            placeholder="ENTER ADMISSION NO (E.G. STD1001)"
                                            className="w-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all font-mono"
                                        />
                                        <UserIcon className="absolute right-4 top-4 text-slate-400" size={18} />
                                        
                                        {studentSuggestions.length > 0 && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                                {studentSuggestions.map((s, idx) => (
                                                    <button 
                                                        type="button"
                                                        key={idx}
                                                        onClick={() => selectStudentSuggestion(s)}
                                                        className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border-b border-slate-50 dark:border-slate-700/50 flex items-center gap-3 transition-colors last:border-none"
                                                    >
                                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900 overflow-hidden shrink-0">
                                                            {s.profile_image ? <img src={s.profile_image} className="w-full h-full object-cover" /> : <UserIcon size={16} className="m-auto mt-2 text-indigo-600" />}
                                                        </div>
                                                        <div>
                                                            <div className="font-black text-slate-900 dark:text-white font-mono">{s.admission_number}</div>
                                                            <div className="text-[10px] font-bold text-slate-500">{s.full_name}</div>
                                                        </div>
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 pt-2">
                                    <button 
                                        type="button" 
                                        onClick={() => startCamera('qr')}
                                        className="py-4 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/30 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 font-bold rounded-2xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95"
                                    >
                                        <Scan size={16} /> Scan QR Pass
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
                                        Verify Access
                                    </button>
                                </div>
                            </form>
                        )}

                        {activeTab === 'visitor' && (
                            <form onSubmit={handleVisitorCheckIn} className="space-y-3.5 animate-fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Guest Full Name</label>
                                        <input 
                                            required
                                            value={visitorForm.name}
                                            onChange={e => setVisitorForm({...visitorForm, name: e.target.value})}
                                            placeholder="Jane Smith"
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">National ID / Passport</label>
                                        <input 
                                            required
                                            value={visitorForm.id}
                                            onChange={e => setVisitorForm({...visitorForm, id: e.target.value})}
                                            placeholder="ID Number"
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Phone Number</label>
                                        <input 
                                            required
                                            value={visitorForm.phone}
                                            onChange={e => setVisitorForm({...visitorForm, phone: e.target.value})}
                                            placeholder="0712345678"
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Visit Purpose / Host</label>
                                        <input 
                                            value={visitorForm.details}
                                            onChange={e => setVisitorForm({...visitorForm, details: e.target.value})}
                                            placeholder="Meeting Dr. Smith"
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-teal-500/20"
                                        />
                                    </div>
                                </div>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full py-4 mt-2 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-2xl text-xs shadow-lg shadow-teal-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                                    Register Guest Entry
                                </button>
                            </form>
                        )}

                        {activeTab === 'vehicle' && (
                            <form onSubmit={handleVehicleCheckIn} className="space-y-3.5 animate-fade-in">
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="relative">
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">License Plate</label>
                                        <input 
                                            required
                                            value={manualPlate}
                                            onChange={e => handlePlateSearch(e.target.value)}
                                            placeholder="KCA 123A"
                                            className="w-full p-3 text-xs font-bold uppercase rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500/20 font-mono"
                                        />
                                        {plateSuggestions.length > 0 && (
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl max-h-40 overflow-y-auto">
                                                {plateSuggestions.map((v: any, idx) => (
                                                    <button 
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => selectSuggestion(v)}
                                                        className="w-full text-left p-2.5 hover:bg-orange-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-800 last:border-none text-xs font-bold text-slate-700 dark:text-slate-300 transition-colors"
                                                    >
                                                        {v.plate_number} • {v.driver_name || 'Visitor'}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Passengers</label>
                                        <div className="flex items-center bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                            <button type="button" onClick={() => setManualPassengers(Math.max(1, manualPassengers - 1))} className="w-8 h-8 rounded-lg font-black text-slate-600 hover:bg-slate-200">-</button>
                                            <span className="flex-1 text-center font-black text-sm">{manualPassengers}</span>
                                            <button type="button" onClick={() => setManualPassengers(manualPassengers + 1)} className="w-8 h-8 rounded-lg font-black text-slate-600 hover:bg-slate-200">+</button>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Driver's Name</label>
                                        <input 
                                            value={manualDriverName}
                                            onChange={e => setManualDriverName(e.target.value)}
                                            placeholder="Driver Full Name"
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">National ID Number</label>
                                        <input 
                                            value={manualDriverId}
                                            onChange={e => setManualDriverId(e.target.value)}
                                            placeholder="National ID"
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Driver's Contact Phone</label>
                                        <input 
                                            value={manualDriverContact}
                                            onChange={e => setManualDriverContact(e.target.value)}
                                            placeholder="Phone Number"
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Vehicle Classification</label>
                                        <select
                                            value={manualPurpose}
                                            onChange={e => setManualPurpose(e.target.value)}
                                            className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500/20 text-slate-800 dark:text-white"
                                        >
                                            <option value="Visitor / External">Visitor / External</option>
                                            <option value="Staff Check-in">Staff Check-in</option>
                                            <option value="Student Check-in">Student Check-in</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Destination / Visit Reason</label>
                                    <input 
                                        value={manualDestination}
                                        onChange={e => setManualDestination(e.target.value)}
                                        placeholder="e.g. Finance Office, Main Hall, General Visit"
                                        className="w-full p-3 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none focus:ring-2 focus:ring-orange-500/20"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <button 
                                        type="button" 
                                        onClick={() => startCamera('plate')}
                                        className="py-3.5 bg-orange-50 hover:bg-orange-100 dark:bg-orange-950/30 dark:hover:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                                    >
                                        <Camera size={14} /> Scan Plate
                                    </button>
                                    <button 
                                        type="submit" 
                                        disabled={isSubmitting}
                                        className="py-3.5 bg-orange-600 hover:bg-orange-700 text-white font-black rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-orange-600/20 transition-all active:scale-95"
                                    >
                                        {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Car size={14} />}
                                        {vehicleIsCheckedIn ? 'Check Out Vehicle' : 'Check In Vehicle'}
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                </div>

                {/* RIGHT FEED: LIVE RESULT TERMINAL & COMPACT LIVE GATE LOGS (lg:col-span-7) */}
                <div className="lg:col-span-7 flex flex-col gap-6">
                    
                    {/* Live Camera Feed / Result Container */}
                    <div className={`glass-card p-6 min-h-[310px] flex flex-col justify-between ${scanStatus === 'scanning' ? 'bg-black border-slate-900' : ''}`}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className={`text-md font-black ${scanStatus === 'scanning' ? 'text-white' : 'text-slate-950 dark:text-white'}`}>
                                {scanStatus === 'scanning' ? (scanMode === 'plate' ? 'Aligning License Plate' : 'Scanning Student QR Pass') : 'Verification Console'}
                            </h3>
                            {scanStatus === 'scanning' && (
                                <button onClick={stopCamera} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-black">
                                    STOP CAMERA
                                </button>
                            )}
                        </div>

                        {!window.isSecureContext && (
                            <div className="mb-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-medium">
                                <div className="flex items-center gap-1.5 font-bold mb-1">
                                    <AlertOctagon size={14} className="text-amber-500 shrink-0" />
                                    <span>Insecure Origin (HTTP) Camera Bypass Active</span>
                                </div>
                                <p className="opacity-90 leading-relaxed">
                                    Live streaming requires HTTPS. Clicking the scanner buttons will prompt your device to capture or upload a photo to decode instead.
                                </p>
                                <details className="mt-2 text-[10px] cursor-pointer">
                                    <summary className="font-bold underline text-amber-700 dark:text-amber-400">
                                        Enable live camera on HTTP
                                    </summary>
                                    <div className="mt-1 p-2 bg-white/50 dark:bg-black/20 rounded font-mono leading-normal select-all">
                                        1. Open chrome://flags/#unsafely-treat-insecure-origin-as-secure<br />
                                        2. Enable it and add: {window.location.origin}<br />
                                        3. Relaunch Chrome.
                                    </div>
                                </details>
                            </div>
                        )}

                        <div className="flex-1 flex items-center justify-center relative overflow-hidden rounded-2xl min-h-[220px]">
                            {/* IDLE */}
                            {scanStatus === 'idle' && (
                                <div className="text-center text-slate-400">
                                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800 border-2 border-dashed border-slate-200 dark:border-slate-700 flex items-center justify-center mx-auto mb-3">
                                        <Scan size={24} className="opacity-40 animate-pulse text-indigo-500" />
                                    </div>
                                    <p className="text-xs font-bold">Awaiting QR scan or manual input verification...</p>
                                </div>
                            )}

                            {/* SCANNING */}
                            {scanStatus === 'scanning' && (
                                <div className="w-full h-full relative flex flex-col items-center justify-center min-h-[240px]">
                                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0 rounded-2xl" />
                                    
                                    <div className="relative z-10 w-full max-w-xs aspect-video flex flex-col items-center justify-center p-2">
                                        {scanMode === 'qr' ? (
                                            <div id="gate-qr-reader" className="w-full h-full rounded-xl overflow-hidden border-4 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.4)]"></div>
                                        ) : (
                                            <div className="w-full h-full border-2 border-dashed border-orange-500 rounded-xl flex flex-col justify-between p-3 backdrop-blur-[1px] animate-pulse">
                                                <div className="flex justify-between">
                                                    <div className="w-6 h-6 border-l-4 border-t-4 border-orange-500 rounded-tl"></div>
                                                    <div className="w-6 h-6 border-r-4 border-t-4 border-orange-500 rounded-tr"></div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-white font-black text-sm tracking-widest flex items-center justify-center gap-1.5">
                                                        <Car size={16} className="text-orange-400" />
                                                        DETECTOR ONLINE
                                                    </div>
                                                </div>
                                                <div className="flex justify-between">
                                                    <div className="w-6 h-6 border-l-4 border-b-4 border-orange-500 rounded-bl"></div>
                                                    <div className="w-6 h-6 border-r-4 border-b-4 border-orange-500 rounded-br"></div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {scanMode === 'plate' && (
                                        <button 
                                            onClick={captureAndProcess}
                                            className="absolute bottom-4 px-6 py-2.5 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 transition-all active:scale-95 z-20"
                                        >
                                            <Camera size={14} /> CAPTURE & PROCESS
                                        </button>
                                    )}
                                </div>
                            )}

                            {/* SUCCESS */}
                            {scanStatus === 'success' && lastScan && (
                                <div className="text-center animate-fade-in w-full py-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-full border-4 border-emerald-500 p-0.5 shadow-lg overflow-hidden bg-white mb-3">
                                            <img src={lastScan.image || "https://cdn-icons-png.flaticon.com/512/3135/3135715.png"} className="w-full h-full object-cover rounded-full bg-slate-50" alt="Avatar" />
                                        </div>
                                        
                                        <div className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                                            <BadgeCheck size={12} /> Access Authorized
                                        </div>
                                        
                                        <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-0.5">{lastScan.name}</h4>
                                        <p className="text-xs font-bold text-slate-500">{lastScan.role}</p>
                                        <p className="text-[10px] text-slate-400 mt-1 font-mono">Timestamp: {lastScan.time}</p>

                                        <button 
                                            onClick={() => setScanStatus('idle')} 
                                            className="mt-5 px-5 py-2 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-indigo-600 rounded-xl transition-all active:scale-95 flex items-center gap-1"
                                        >
                                            <RefreshCw size={10} /> Scan Next Pass
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* REJECTED */}
                            {scanStatus === 'rejected' && (
                                <div className="text-center animate-fade-in w-full py-4">
                                    <div className="flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-full border-4 border-red-500 bg-red-500/10 flex items-center justify-center shadow-lg mb-3">
                                            <XCircle size={40} className="text-red-500 animate-bounce" />
                                        </div>
                                        
                                        <div className="inline-flex items-center gap-1 bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider mb-2">
                                            <ShieldAlert size={12} /> Entry Blocked
                                        </div>
                                        
                                        <h4 className="text-2xl font-black text-red-600 dark:text-red-400 mb-0.5">{lastScan?.name || 'Access Denied'}</h4>
                                        <p className="text-xs font-bold text-slate-400">Credentials Rejected or Suspended</p>
                                        
                                        <button 
                                            onClick={() => setScanStatus('idle')} 
                                            className="mt-5 px-5 py-2 bg-slate-50 dark:bg-slate-800 text-[10px] font-black uppercase text-slate-500 hover:text-indigo-600 rounded-xl transition-all active:scale-95 flex items-center gap-1"
                                        >
                                            <RefreshCw size={10} /> Try Again
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* COMPACT ACTIVE LOGS TERMINAL (Fits A4 layout perfectly!) */}
                    <div className="glass-card p-5 space-y-4">
                        <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
                            <div>
                                <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">Active Campus Entries</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{currentInsideToday} units registered inside main campus</p>
                            </div>
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black">LIVE</span>
                        </div>

                        {/* HIGH DENSITY LIST FEED */}
                        <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                            {/* Merge and sort active vehicle and guest logs */}
                            {recentVehicles.filter(v => !v.exit_time).slice(0, 4).map((log, idx) => (
                                <div key={`v-${idx}`} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center justify-between hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-orange-100 text-orange-600 rounded-xl flex items-center justify-center"><Car size={18} /></div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-mono font-black text-sm text-slate-900 dark:text-white">{log.plate}</span>
                                                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[8px] font-black rounded uppercase">VEHICLE</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold">{log.driver_name || 'Guest Driver'} • 🕒 {new Date(log.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleVehicleExit(log.plate)}
                                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-xl text-[10px] uppercase shadow-sm transition-all active:scale-95"
                                    >
                                        Checkout 🚗
                                    </button>
                                </div>
                            ))}

                            {recentVisitors.filter(v => v.status === 'checked_in').slice(0, 4).map((visitor, idx) => (
                                <div key={`g-${idx}`} className="p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 rounded-2xl flex items-center justify-between hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 bg-teal-100 text-teal-600 rounded-xl flex items-center justify-center"><UserIcon size={18} /></div>
                                        <div>
                                            <div className="flex items-center gap-1.5">
                                                <span className="font-black text-sm text-slate-900 dark:text-white">{visitor.first_name} {visitor.last_name}</span>
                                                <span className="px-2 py-0.5 bg-teal-50 text-teal-600 text-[8px] font-black rounded uppercase">VISITOR</span>
                                            </div>
                                            <p className="text-[10px] text-slate-400 font-bold">ID: {visitor.id_number} • 🕒 {new Date(visitor.time_in).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => handleVisitorCheckOut(visitor.id)}
                                        className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-black rounded-xl text-[10px] uppercase shadow-sm transition-all active:scale-95"
                                    >
                                        Checkout 👤
                                    </button>
                                </div>
                            ))}

                            {recentVehicles.filter(v => !v.exit_time).length === 0 && recentVisitors.filter(v => v.status === 'checked_in').length === 0 && (
                                <div className="text-center py-6 text-slate-400">
                                    <p className="text-xs font-bold italic">No active guests or vehicles currently inside campus.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* 3. MODAL DRAWER: VEHICLES DIRECTORY */}
            {showVehiclesModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-4xl shadow-2xl relative flex flex-col h-[550px] border border-slate-100 dark:border-slate-800">
                        <button onClick={() => setShowVehiclesModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 z-10 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full shadow-sm"><XCircle size={20} /></button>
                        
                        <div className="mb-4">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <Car className="text-indigo-600" />
                                Registered Vehicles Directory
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase">{registeredVehicles.length} vehicles registered in system</p>
                        </div>

                        {/* Search in Modal */}
                        <div className="mb-4 relative">
                            <input 
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search plate, vehicle model, or driver name..."
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 text-xs font-bold rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500/20"
                            />
                            <Search className="absolute left-3.5 top-3.5 text-slate-400" size={16} />
                        </div>

                        <div className="flex-1 overflow-y-auto overflow-x-auto table-responsive rounded-2xl border border-slate-50 dark:border-slate-800">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0 uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="p-3">Plate Number</th>
                                        <th className="p-3">Vehicle details</th>
                                        <th className="p-3">Driver details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {registeredVehicles.filter(v => {
                                        if(!searchQuery) return true;
                                        const q = searchQuery.toLowerCase();
                                        return v.plate_number?.toLowerCase().includes(q) || v.driver_name?.toLowerCase().includes(q) || v.make?.toLowerCase().includes(q);
                                    }).map((v, i) => (
                                        <tr key={i} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors font-bold text-slate-700 dark:text-slate-300">
                                            <td className="p-3 font-mono text-sm text-indigo-600 dark:text-indigo-400">{v.plate_number}</td>
                                            <td className="p-3">{v.make} {v.model} <span className="text-[10px] text-slate-400 font-normal">({v.color})</span></td>
                                            <td className="p-3">
                                                <div>{v.driver_name || 'N/A'}</div>
                                                <div className="text-[10px] text-slate-400 font-normal">{v.driver_contact || '-'}</div>
                                            </td>
                                        </tr>
                                    ))}
                                    {registeredVehicles.length === 0 && (
                                        <tr>
                                            <td colSpan={3} className="text-center p-8 text-slate-400 italic">No vehicles registered.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* 4. MODAL DRAWER: HISTORY LOGS */}
            {showLogsModal && (
                <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-5xl shadow-2xl relative flex flex-col h-[550px] border border-slate-100 dark:border-slate-800">
                        <button onClick={() => setShowLogsModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 z-10 p-1.5 bg-slate-50 dark:bg-slate-800 rounded-full shadow-sm"><XCircle size={20} /></button>
                        
                        <div className="mb-4">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center gap-2">
                                <ClipboardList className="text-indigo-600" />
                                Gate Entry Logs History
                            </h3>
                            <p className="text-xs text-slate-400 font-bold uppercase">Comprehensive activity logs record</p>
                        </div>

                        <div className="flex-1 overflow-x-auto overflow-y-auto table-responsive rounded-2xl border border-slate-50 dark:border-slate-800">
                            <table className="w-full text-left text-xs font-bold">
                                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0 uppercase tracking-wider font-bold">
                                    <tr>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Identifier</th>
                                        <th className="p-3">Subject / Driver</th>
                                        <th className="p-3">Entry Time</th>
                                        <th className="p-3">Exit Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentVehicles.map((log, i) => (
                                        <tr key={`vlog-${i}`} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 font-bold">
                                            <td className="p-3"><span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-[9px] rounded">VEHICLE</span></td>
                                            <td className="p-3 font-mono text-indigo-600 dark:text-indigo-400">{log.plate}</td>
                                            <td className="p-3">
                                                <div>{log.driver_name || 'Visitor Driver'}</div>
                                                <div className="text-[10px] text-slate-400 font-normal">{log.make} {log.model}</div>
                                            </td>
                                            <td className="p-3 text-emerald-600 font-mono">{new Date(log.entry_time).toLocaleString()}</td>
                                            <td className="p-3 font-mono">
                                                {log.exit_time ? (
                                                    <span className="text-red-600">{new Date(log.exit_time).toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Inside</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {recentVisitors.map((visitor, i) => (
                                        <tr key={`vis-${i}`} className="border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 font-bold">
                                            <td className="p-3"><span className="px-2 py-0.5 bg-teal-100 text-teal-700 text-[9px] rounded">VISITOR</span></td>
                                            <td className="p-3 font-mono">{visitor.id_number}</td>
                                            <td className="p-3">
                                                <div>{visitor.first_name} {visitor.last_name}</div>
                                                <div className="text-[10px] text-slate-400 font-normal">{visitor.visit_details}</div>
                                            </td>
                                            <td className="p-3 text-emerald-600 font-mono">{new Date(visitor.time_in).toLocaleString()}</td>
                                            <td className="p-3 font-mono">
                                                {visitor.time_out ? (
                                                    <span className="text-red-600">{new Date(visitor.time_out).toLocaleString()}</span>
                                                ) : (
                                                    <span className="text-slate-400 italic">Inside</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* EVENT VISITOR CHECK IN MODAL (EXISTING SUPPORT) */}
            {showEventModal && eventData && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2010] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-lg shadow-2xl relative border border-slate-100 dark:border-slate-800">
                        <button onClick={() => setShowEventModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900"><XCircle size={24} /></button>

                        <div className="mb-6 flex items-center gap-3">
                            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                <Calendar size={24} />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white">Special Event Check-In</h3>
                                <p className="text-xs text-slate-500 font-bold">{eventData.name}</p>
                            </div>
                        </div>

                        {!eventData.is_active && (
                            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold flex items-center gap-2">
                                <ShieldAlert size={14} /> This event is officially closed.
                            </div>
                        )}

                        <form onSubmit={async (e) => {
                            e.preventDefault()
                            if (!visitorForm.name.trim()) {
                                showNotification("Visitor Full Name is required", "error")
                                return
                            }
                            if (!visitorForm.id.trim()) {
                                showNotification("ID Number is required", "error")
                                return
                            }
                            if (!visitorForm.phone.trim()) {
                                showNotification("Phone number is required", "error")
                                return
                            }
                            try {
                                const token = localStorage.getItem('token')
                                const res = await fetch(`/api/events/${eventData.event_id}/register-visitor`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                                    body: JSON.stringify({
                                        visitor_name: visitorForm.name,
                                        visitor_identifier: visitorForm.id,
                                        phone_number: visitorForm.phone
                                    })
                                })
                                if (res.ok) {
                                    showNotification("Guest Checked In to Event!", "success")
                                    setShowEventModal(false)
                                    setVisitorForm({ name: '', id: '', phone: '', details: '' })
                                    setScanStatus('success')
                                    setLastScan({
                                        name: visitorForm.name,
                                        role: `Visitor - ${eventData.name}`,
                                        time: new Date().toLocaleTimeString(),
                                        image: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png"
                                    })
                                    refreshData()
                                } else {
                                    showNotification("Check-in Failed", "error")
                                }
                            } catch (err) { showNotification("Network Error", "error") }
                        }} className="space-y-4 font-bold text-xs">
                            <div>
                                <label className="block text-slate-400 mb-1">Visitor Full Name</label>
                                <input required value={visitorForm.name} onChange={e => setVisitorForm({ ...visitorForm, name: e.target.value })} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none" placeholder="Full Name" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-slate-400 mb-1">ID Number</label>
                                    <input required value={visitorForm.id} onChange={e => setVisitorForm({ ...visitorForm, id: e.target.value })} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none" placeholder="ID Number" />
                                </div>
                                <div>
                                    <label className="block text-slate-400 mb-1">Phone Number</label>
                                    <input required value={visitorForm.phone} onChange={e => setVisitorForm({ ...visitorForm, phone: e.target.value })} className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border-none outline-none" placeholder="Phone Number" />
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl shadow-lg mt-4 transition-all active:scale-95" disabled={!eventData.is_active}>
                                Register Event Guest Entry
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* CAMERA PERMISSION MODAL */}
            {showPermissionModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[2010] flex items-center justify-center p-4">
                    <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl border border-slate-100 dark:border-slate-800">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-950/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Camera size={32} className="text-red-600 dark:text-red-400 animate-pulse" />
                        </div>

                        <h3 className="text-lg font-black text-slate-950 dark:text-white mb-2">
                            {permissionError === 'denied' ? 'Camera Access Denied' : 'Camera Access Needed'}
                        </h3>

                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            {permissionError === 'denied'
                                ? "It looks like camera access was denied. Please reset browser permission flags for this campus site to continue scanner operations."
                                : "We need access to your camera to scan QR codes and read license plates."
                            }
                        </p>

                        <div className="space-y-3">
                            {permissionError !== 'denied' && (
                                <button
                                    onClick={() => startCamera(scanMode || 'qr')}
                                    className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs shadow-md transition-all active:scale-95"
                                >
                                    Enable Camera
                                </button>
                            )}

                            <button
                                onClick={() => setShowPermissionModal(false)}
                                className="w-full py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl text-xs transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
