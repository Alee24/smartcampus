import { useState, useEffect, useRef } from 'react'
import { useNotification } from './components/Notification'
import { Search, CheckCircle, XCircle, Shield, Calendar, User, Building, Sparkles, UploadCloud, Loader2, Camera, QrCode, LogIn, LogOut, RefreshCcw, Printer, AlertTriangle, Car, Radio } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
const splitPlateNumber = (plate: string) => {
    if (!plate) return { part1: 'KCU', part2: '109A' };
    const cleaned = plate.trim().toUpperCase();
    const match = cleaned.match(/^([A-Z]{3})\s*(.*)$/);
    if (match) {
        return { part1: match[1], part2: match[2] };
    }
    const mid = Math.ceil(cleaned.length / 2);
    return {
        part1: cleaned.substring(0, mid),
        part2: cleaned.substring(mid)
    };
};

const formatDuration = (mins: number) => {
    if (mins < 60) return `${mins}m`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
};

export default function StudentVerification() {
    const { showNotification } = useNotification()
    const [query, setQuery] = useState('')
    const [suggestions, setSuggestions] = useState<any[]>([])
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)
    const [showCard, setShowCard] = useState(false)
    const [companySettings, setCompanySettings] = useState<any>({
        company_name: 'Riara University',
        logo_url: ''
    })
    const [currentUser, setCurrentUser] = useState<any>(null)
    const [statusUpdating, setStatusUpdating] = useState(false)
    const [uploadingImage, setUploadingImage] = useState(false)
    const [isScanning, setIsScanning] = useState(false)
    const [actionLoading, setActionLoading] = useState<'check-in' | 'check-out' | null>(null)
    const [isNfcActive, setIsNfcActive] = useState(false)
    const nfcAbortControllerRef = useRef<AbortController | null>(null)
    const [pinModal, setPinModal] = useState<{show: boolean, pin: string, file: File | null}>({
        show: false,
        pin: '',
        file: null
    })
    const [isFlipped, setIsFlipped] = useState(false)
    const [isEditing, setIsEditing] = useState(false)
    const [editData, setEditData] = useState({ full_name: '', school: '' })
    const [saveLoading, setSaveLoading] = useState(false)
    const [rotation, setRotation] = useState(0)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [isPrinting, setIsPrinting] = useState(false)
    const [importing, setImporting] = useState(false)
    const qrScannerRef = useRef<Html5Qrcode | null>(null)
    const printRef = useRef<HTMLDivElement>(null)
    const [gates, setGates] = useState<any[]>([])
    const [selectedGateId, setSelectedGateId] = useState<string>('')
    const [scale, setScale] = useState(1)
    const cardContainerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!result) return
        const handleResize = () => {
            if (cardContainerRef.current) {
                const parentWidth = cardContainerRef.current.parentElement?.clientWidth || 896
                const newScale = Math.min(parentWidth / 896, 1)
                setScale(newScale)
            }
        }
        handleResize()
        window.addEventListener('resize', handleResize)
        const timer = setTimeout(handleResize, 100)
        return () => {
            window.removeEventListener('resize', handleResize)
            clearTimeout(timer)
        }
    }, [result])

    useEffect(() => {
        const fetchUserData = async () => {
            const token = localStorage.getItem('token')
            if (token) {
                try {
                    const res = await fetch('/api/users/me', {
                        headers: { 'Authorization': `Bearer ${token}` }
                    })
                    if (res.ok) {
                        const data = await res.json()
                        setCurrentUser(data)
                    }
                } catch (e) {
                    console.error('Failed to fetch user', e)
                }
            }
        }

        const fetchCompanySettings = async () => {
            try {
                const res = await fetch('/api/users/public-company-settings')
                if (res.ok) {
                    const data = await res.json()
                    setCompanySettings({
                        company_name: data.company_name,
                        logo_url: data.logo_url
                    })
                }
            } catch (e) {
                console.error(e)
            }
        }

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

        fetchUserData()
        fetchCompanySettings()
        fetchGates()
    }, [])

    const playSuccessSound = () => {
        if ('vibrate' in navigator) {
            try { navigator.vibrate(200); } catch (e) {}
        }
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.1)
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.5)
    }

    const playWarningSound = () => {
        if ('vibrate' in navigator) {
            try { navigator.vibrate([300, 100, 300, 100, 350]); } catch (e) {}
        }
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        
        const playBeep = (freq: number, startTime: number, duration: number) => {
            const osc = audioContext.createOscillator()
            const gainNode = audioContext.createGain()
            osc.connect(gainNode)
            gainNode.connect(audioContext.destination)
            osc.type = 'sawtooth'
            osc.frequency.setValueAtTime(freq, startTime)
            gainNode.gain.setValueAtTime(0.4, startTime)
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration - 0.05)
            osc.start(startTime)
            osc.stop(startTime + duration)
        }

        const now = audioContext.currentTime
        playBeep(220, now, 0.25)
        playBeep(180, now + 0.3, 0.35)
        playBeep(220, now + 0.7, 0.25)
        playBeep(180, now + 1.0, 0.35)
    }

    const playErrorSound = () => {
        if ('vibrate' in navigator) {
            try { navigator.vibrate([200, 100, 200]); } catch (e) {}
        }
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        oscillator.frequency.setValueAtTime(300, audioContext.currentTime)
        oscillator.frequency.exponentialRampToValueAtTime(120, audioContext.currentTime + 0.3)
        gainNode.gain.setValueAtTime(0.4, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.6)
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.6)
    }

    const [offlineQueue, setOfflineQueue] = useState<any[]>([])
    const [isOffline, setIsOffline] = useState(!navigator.onLine)
    const [syncing, setSyncing] = useState(false)
    const [cachedCount, setCachedCount] = useState(0)

    useEffect(() => {
        const localCached = JSON.parse(localStorage.getItem('cached_students') || '[]')
        setCachedCount(localCached.length)
        const localQueue = JSON.parse(localStorage.getItem('offline_scans') || '[]')
        setOfflineQueue(localQueue)

        const handleOnline = () => {
            setIsOffline(false)
            showNotification('Connection restored. Syncing offline data...', 'info')
            syncOfflineDataAndRefresh()
        }
        const handleOffline = () => {
            setIsOffline(true)
            showNotification('Working offline. Access logs will be queued locally.', 'warning')
        }

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    const syncOfflineDataAndRefresh = async () => {
        setSyncing(true)
        const online = navigator.onLine
        setIsOffline(!online)
        const queue = JSON.parse(localStorage.getItem('offline_scans') || '[]')
        
        let syncedCount = 0
        if (online && queue.length > 0) {
            const token = localStorage.getItem('token')
            const remaining = []
            for (const scan of queue) {
                try {
                    const res = await fetch(`/api/gate/${scan.action}/${encodeURIComponent(scan.admission_number)}?gate_id=${scan.gate_id || ''}`, {
                        method: 'POST',
                        headers: { 
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    })
                    if (res.ok) {
                        syncedCount++
                    } else {
                        const err = await res.json()
                        showNotification(`Offline sync failed for ${scan.admission_number}: ${err.detail || 'Server rejected request'}`, 'error')
                        remaining.push(scan)
                    }
                } catch (e: any) {
                    showNotification(`Offline sync connection error for ${scan.admission_number}: ${e.message}`, 'error')
                    remaining.push(scan)
                }
            }
            localStorage.setItem('offline_scans', JSON.stringify(remaining))
            setOfflineQueue(remaining)
            if (syncedCount > 0) {
                showNotification(`Synchronized ${syncedCount} queued scan logs with the server!`, 'success')
            }
        }

        // Just clear search inputs & cards to let the guard scan next person easily
        setQuery('')
        setResult(null)
        setShowCard(false)
        setSuggestions([])
        showNotification('View refreshed. Ready for next scan.', 'success')
        setSyncing(false)
    }

    const executeGateAction = async (action: 'check-in' | 'check-out', admissionNumber: string, fullName: string) => {
        setActionLoading(action)
        
        let online = navigator.onLine
        if (online) {
            try {
                const token = localStorage.getItem('token')
                const activeGateId = selectedGateId || localStorage.getItem('active_gate_id') || ''
                const res = await fetch(`/api/gate/${action}/${admissionNumber}?gate_id=${activeGateId}`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                })
                if (res.ok) {
                    const data = await res.json()
                    playSuccessSound()
                    showNotification(`${action === 'check-in' ? 'Check-in' : 'Check-out'} recorded for ${fullName} at ${data.time}`, 'success')
                    
                    // Update cache status for offline
                    try {
                        const cached = JSON.parse(localStorage.getItem('cached_students') || '[]')
                        const updated = cached.map((s: any) => {
                            if (s.admission_number === admissionNumber) {
                                return { ...s, gate_status: action === 'check-in' ? 'In' : 'Out' }
                            }
                            return s
                        })
                        localStorage.setItem('cached_students', JSON.stringify(updated))
                    } catch (e) {}

                    // Update UI state without disappearing the ID
                    setResult((prev: any) => {
                        if (prev && prev.admission_number === admissionNumber) {
                            return {
                                ...prev,
                                gate_status: action === 'check-in' ? 'In' : 'Out'
                            }
                        }
                        return prev
                    })
                    setActionLoading(null)
                    return;
                } else {
                    let detail = `Server error during ${action}`
                    const contentType = res.headers.get("content-type")
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        const err = await res.json()
                        detail = err.detail || detail
                    } else {
                        detail = await res.text() || detail
                    }
                    playWarningSound()
                    showNotification(detail, 'error')
                    setActionLoading(null)
                    return;
                }
            } catch (e) {
                online = false
            }
        }

        // Offline check-in/out fallback
        const queue = JSON.parse(localStorage.getItem('offline_scans') || '[]')
        queue.push({
            admission_number: admissionNumber,
            action,
            gate_id: selectedGateId,
            timestamp: new Date().toISOString()
        })
        localStorage.setItem('offline_scans', JSON.stringify(queue))
        setOfflineQueue(queue)

        // Update cached students state
        const cached = JSON.parse(localStorage.getItem('cached_students') || '[]')
        const updatedCached = cached.map((s: any) => {
            if (s.admission_number === admissionNumber) {
                return { ...s, gate_status: action === 'check-in' ? 'In' : 'Out' }
            }
            return s
        })
        localStorage.setItem('cached_students', JSON.stringify(updatedCached))
        
        playSuccessSound()
        showNotification(`Offline Queued: ${action} for ${fullName}`, 'warning')
        
        // Update UI state without disappearing the ID
        setResult((prev: any) => {
            if (prev && prev.admission_number === admissionNumber) {
                return {
                    ...prev,
                    gate_status: action === 'check-in' ? 'In' : 'Out'
                }
            }
            return prev
        })
        setActionLoading(null)
    }

    const handleGateAction = async (action: 'check-in' | 'check-out') => {
        if (!result || !result.admission_number) return
        await executeGateAction(action, result.admission_number, result.full_name || result.admission_number)
    }

    const extractAdmissionNumber = (input: string): string => {
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
                const roomParam = url.searchParams.get("room");
                if (roomParam) return `ROOM:${roomParam.trim()}`;
                const courseParam = url.searchParams.get("course");
                if (courseParam) return `COURSE:${courseParam.trim()}`;
                const eventParam = url.searchParams.get("event");
                if (eventParam) return `EVENT:${eventParam.trim()}`;
                const visitorParam = url.searchParams.get("visitor");
                if (visitorParam) return `VISITOR:${visitorParam.trim()}`;
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
        const roomMatch = cleanInput.match(/[?&]room=([^&]+)/);
        if (roomMatch && roomMatch[1]) return `ROOM:${roomMatch[1].trim()}`;
        const courseMatch = cleanInput.match(/[?&]course=([^&]+)/);
        if (courseMatch && courseMatch[1]) return `COURSE:${courseMatch[1].trim()}`;
        return cleanInput;
    };

    const handleVerify = async (qOverride?: string, isScanned = false) => {
        const rawQuery = qOverride || query
        const searchQuery = extractAdmissionNumber(rawQuery)
        if (!searchQuery.trim()) return
        setQuery(searchQuery)
        setLoading(true)
        setShowCard(false)
        setResult(null)
        setShowSuggestions(false)

        // Intercept Special QR Code scans (Trip, Vehicle, Room, Course, Event, Visitor)
        const isSpecialScan = ['TRIP:', 'VEHICLE:', 'ROOM:', 'COURSE:', 'EVENT:', 'VISITOR:'].some(prefix => 
            searchQuery.toUpperCase().startsWith(prefix)
        ) || searchQuery.toUpperCase().includes('VEHICLE:');

        if (isSpecialScan) {
            try {
                const token = localStorage.getItem('token')
                const res = await fetch('/api/gate/scan', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}` 
                    },
                    body: JSON.stringify({ admission_number: searchQuery })
                })
                let data: any = {}
                const contentType = res.headers.get("content-type")
                if (contentType && contentType.indexOf("application/json") !== -1) {
                    data = await res.json()
                } else {
                    const text = await res.text()
                    data = { status: "rejected", message: text || `Server error: ${res.status} ${res.statusText}`, data: null }
                }
                if (res.ok && (data.status === 'allowed' || data.status === 'event_pass')) {
                    showNotification(data.message || 'Verification successful', 'success')
                    playSuccessSound()
                    
                    if (data.data) {
                        setResult({
                            id: data.data.name || searchQuery,
                            full_name: data.data.name || searchQuery,
                            admission_number: searchQuery,
                            role: data.data.role || 'Scanned Log',
                            status: 'Active',
                            gate_status: 'In',
                            profile_image: data.data.image || ''
                        })
                        setTimeout(() => {
                            setShowCard(true)
                        }, 300)
                    }
                } else {
                    showNotification(data.message || 'Verification failed', 'error')
                    playWarningSound()
                }
            } catch (e: any) {
                showNotification(e.message, 'error')
                playWarningSound()
            } finally {
                setLoading(false)
            }
            return;
        }

        let online = navigator.onLine
        if (online) {
            try {
                const res = await fetch(`/api/users/verify/${encodeURIComponent(searchQuery)}`)
                if (res.ok) {
                    const data = await res.json()
                    setResult(data)
                    
                    // Dynamically cache this verified student (no full database quota limits)
                    try {
                        const cached = JSON.parse(localStorage.getItem('cached_students') || '[]')
                        const filtered = cached.filter((s: any) => s.admission_number !== data.admission_number)
                        filtered.push({
                            id: data.id,
                            full_name: data.full_name,
                            admission_number: data.admission_number,
                            email: data.email,
                            school: data.school,
                            status: data.status,
                            profile_image: data.profile_image,
                            role: data.role,
                            gate_status: data.gate_status
                        })
                        localStorage.setItem('cached_students', JSON.stringify(filtered))
                        setCachedCount(filtered.length)
                    } catch (e) {}

                    if (isScanned && data.admission_number && !data.error) {
                        const nextAction = (data.gate_status && data.gate_status.toLowerCase() === 'in') ? 'check-out' : 'check-in';
                        executeGateAction(nextAction, data.admission_number, data.full_name || data.admission_number);
                    }

                    if (!data.ad_found) {
                        setTimeout(() => {
                            setShowCard(true)
                            setEditData({ full_name: data.full_name, school: data.school })
                            if (data.status && data.status.toLowerCase() === 'flagged') {
                                playWarningSound()
                            } else {
                                playSuccessSound()
                            }
                        }, 300)
                    }
                    setLoading(false)
                    return;
                } else {
                    let detail = 'Verification failed'
                    const contentType = res.headers.get("content-type")
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        const err = await res.json()
                        detail = err.detail || detail
                    } else {
                        detail = await res.text() || detail
                    }
                    setResult({ error: detail })
                    playErrorSound()
                    setLoading(false)
                    return;
                }
            } catch (e) {
                online = false
            }
        }

        // Offline / cached lookup
        const cached = JSON.parse(localStorage.getItem('cached_students') || '[]')
        const found = cached.find((s: any) => 
            s.admission_number.toUpperCase() === searchQuery.toUpperCase() ||
            (s.email && s.email.toLowerCase() === searchQuery.toLowerCase())
        )

        if (found) {
            const data = {
                id: found.id || found.admission_number,
                full_name: found.full_name,
                admission_number: found.admission_number,
                email: found.email || '',
                school: found.school || 'General',
                status: found.status || 'Active',
                profile_image: found.profile_image || '',
                role: found.role || 'Student',
                gate_status: found.gate_status || 'Out'
            }
            setResult(data)

            if (isScanned && data.admission_number) {
                const nextAction = (data.gate_status && data.gate_status.toLowerCase() === 'in') ? 'check-out' : 'check-in';
                executeGateAction(nextAction, data.admission_number, data.full_name || data.admission_number);
            }

            setTimeout(() => {
                setShowCard(true)
                setEditData({ full_name: found.full_name, school: found.school })
                if (data.status && data.status.toLowerCase() === 'flagged') {
                    playWarningSound()
                } else {
                    playSuccessSound()
                }
            }, 300)


        } else {
            setResult({ error: 'Student not found in local offline database.' })
            playErrorSound()
        }
        setLoading(false)
    }
    // Cleanup Web NFC scanner on unmount
    useEffect(() => {
        return () => {
            if (nfcAbortControllerRef.current) {
                nfcAbortControllerRef.current.abort()
            }
        }
    }, [])

    // Check URL query parameters for automatic verification on page mount
    useEffect(() => {
        const checkUrlParams = async () => {
            const params = new URLSearchParams(window.location.search)
            const userParam = params.get('user') || params.get('admission_number')
            if (userParam) {
                setQuery(userParam)
                handleVerify(userParam, true)
                
                try {
                    const newUrl = window.location.pathname
                    window.history.replaceState({}, document.title, newUrl)
                } catch (e) {}
            }
        }
        checkUrlParams()
    }, [])

    const startNfcScan = async () => {
        if (!('NDEFReader' in window)) {
            showNotification("Web NFC is not supported on this browser or device. Please use Chrome on Android.", "error")
            return
        }

        try {
            if (nfcAbortControllerRef.current) {
                nfcAbortControllerRef.current.abort()
            }
            nfcAbortControllerRef.current = new AbortController()
            
            // @ts-ignore
            const ndef = new NDEFReader()
            await ndef.scan({ signal: nfcAbortControllerRef.current.signal })
            setIsNfcActive(true)
            showNotification("NFC scanning activated. Tap a smart card to verify.", "success")
            
            ndef.onreading = (event: any) => {
                const serial = event.serialNumber
                let parsedUser = ""
                if (event.message && event.message.records) {
                    for (const record of event.message.records) {
                        if (record.recordType === "url") {
                            try {
                                const decoder = new TextDecoder("utf-8")
                                const url = decoder.decode(record.data)
                                const parsedUrl = new URL(url)
                                const u = parsedUrl.searchParams.get("user") || parsedUrl.searchParams.get("admission_number")
                                if (u) parsedUser = u
                            } catch (err) {}
                        }
                    }
                }
                
                const verifyTarget = parsedUser || serial
                if (verifyTarget) {
                    handleVerify(verifyTarget, true)
                    showNotification(`NFC Card scanned: ${verifyTarget}`, 'success')
                } else {
                    showNotification("Scanned NFC card is empty or unrecognized", "warning")
                }
            }
            
            ndef.onreadingerror = () => {
                showNotification("Error reading NFC tag. Try again.", "error")
            }

        } catch (err: any) {
            console.error("NFC start failed:", err)
            showNotification(`Failed to start NFC scanning: ${err.message || err}`, "error")
            setIsNfcActive(false)
        }
    }

    const stopNfcScan = () => {
        if (nfcAbortControllerRef.current) {
            nfcAbortControllerRef.current.abort()
            nfcAbortControllerRef.current = null
        }
        setIsNfcActive(false)
        showNotification("NFC scanning deactivated.", "info")
    }

    const toggleNfcScan = () => {
        if (isNfcActive) {
            stopNfcScan()
        } else {
            startNfcScan()
        }
    }

    const handleQueryChange = async (val: string) => {
        setQuery(val)
        if (val.length >= 2) {
            let online = navigator.onLine
            if (online) {
                try {
                    const token = localStorage.getItem('token')
                    const res = await fetch(`/api/users/search?q=${val}`, { headers: { 'Authorization': `Bearer ${token}` } })
                    if (res.ok) {
                        setSuggestions(await res.json())
                        setShowSuggestions(true)
                        return;
                    }
                } catch (e) {
                    online = false
                }
            }

            // Local Autocomplete filter
            const cached = JSON.parse(localStorage.getItem('cached_students') || '[]')
            const matched = cached.filter((s: any) => 
                s.admission_number.toUpperCase().includes(val.toUpperCase()) ||
                s.full_name.toUpperCase().includes(val.toUpperCase())
            ).slice(0, 10)
            setSuggestions(matched)
            setShowSuggestions(true)
        } else {
            setSuggestions([])
            setShowSuggestions(false)
        }
    }

    const handleImportAD = async (adData: any) => {
        setImporting(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/import-ad-student', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(adData)
            })

            if (res.ok) {
                const data = await res.json()
                showNotification(`Successfully imported student from Active Directory!`, 'success')
                setResult(data)
                setTimeout(() => {
                    setShowCard(true)
                    setEditData({ full_name: data.full_name, school: data.school })
                    playSuccessSound()
                }, 300)
            } else {
                const err = await res.json()
                showNotification(err.detail || 'Failed to import student', 'error')
            }
        } catch (e) {
            showNotification('Network error during import', 'error')
        } finally {
            setImporting(false)
        }
    }

    const handlePrint = async () => {
        if (!result) return
        setIsPrinting(true)
        showNotification('Generating high-resolution ID card...', 'info')
        try {
            const front = document.getElementById(`printable-front-${result.id}`)
            const back = document.getElementById(`printable-back-${result.id}`)
            if (!front || !back) {
                showNotification('Error: Printable elements not found', 'error')
                return
            }
            await document.fonts.ready;
            const canvasFront = await html2canvas(front, { scale: 3, useCORS: true, backgroundColor: null })
            const canvasBack = await html2canvas(back, { scale: 3, useCORS: true, backgroundColor: null })
            const pdf = new jsPDF('p', 'mm', 'a4')
            const margin = 20
            const cardWidth = 85.6
            const cardHeight = 53.98
            pdf.setFontSize(10)
            pdf.text("Student ID Card (Front)", margin, margin - 5)
            pdf.addImage(canvasFront.toDataURL('image/png'), 'PNG', margin, margin, cardWidth, cardHeight)
            pdf.text("Student ID Card (Back)", margin, margin + cardHeight + 15)
            pdf.addImage(canvasBack.toDataURL('image/png'), 'PNG', margin, margin + cardHeight + 20, cardWidth, cardHeight)
            pdf.save(`ID_Card_${result.admission_number}.pdf`)
            showNotification('ID Card downloaded successfully!', 'success')
        } catch (e) {
            showNotification('Failed to generate PDF', 'error')
        } finally {
            setIsPrinting(false)
        }
    }

    const handleImageUpload = async (file: File) => {
        if (!result) return
        setUploadingImage(true)
        showNotification('Uploading profile photo...', 'info')
        try {
            const formData = new FormData()
            formData.append('file', file)
            formData.append('user_id', result.id)
            formData.append('supervisor_pin', '') // PIN is no longer required by backend
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users/secure-profile-image-update', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })
            if (res.ok) {
                const data = await res.json()
                setResult({ ...result, profile_image: data.image_url })
                showNotification('Profile picture updated successfully', 'success')
            } else {
                const data = await res.json()
                showNotification(data.detail || 'Failed to update profile picture', 'error')
            }
        } catch (e) {
            showNotification('Network error updating image', 'error')
        } finally {
            setUploadingImage(false)
        }
    }

    const rotateImage = () => setRotation((prev) => (prev + 90) % 360)

    const submitSecureImageUpdate = async () => {
        // Obsoleted - uploads are now direct and PIN-free
    }

    const handleVerificationFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setLoading(true)

        // Setup temporary container if "qr-reader" is not in DOM
        let tempDiv = document.getElementById("qr-reader");
        let createdTemp = false;
        if (!tempDiv) {
            tempDiv = document.createElement("div");
            tempDiv.id = "qr-reader";
            tempDiv.style.display = "none";
            document.body.appendChild(tempDiv);
            createdTemp = true;
        }

        try {
            const html5QrCode = new Html5Qrcode("qr-reader")
            const decodedText = await html5QrCode.scanFile(file, false)
            setQuery(decodedText)
            await handleVerify(decodedText, true)
        } catch (err: any) {
            console.error("QR File Scan Error", err)
            showNotification(`Could not read QR code: ${err?.message || "Invalid/blurry image"}`, "error")
        } finally {
            if (createdTemp && tempDiv) {
                tempDiv.remove()
            }
            setLoading(false)
            e.target.value = ''
        }
    }

    const startScanner = async () => {
        if (!window.isSecureContext) {
            showNotification("Insecure context: Opening device camera to capture photo...", "info")
            const el = document.getElementById("insecure-verification-qr-file-input")
            if (el) el.click()
            return
        }
        setIsScanning(true)
        setTimeout(async () => {
            try {
                const scanner = new Html5Qrcode("qr-reader")
                qrScannerRef.current = scanner
                await scanner.start(
                    { facingMode: "environment" },
                    { fps: 10, qrbox: { width: 250, height: 250 } },
                    (decodedText) => {
                        setQuery(decodedText)
                        stopScanner()
                        handleVerify(decodedText, true)
                    },
                    () => {}
                )
            } catch (err) {
                showNotification(`Could not start camera`, "error")
                setIsScanning(false)
            }
        }, 300)
    }

    const stopScanner = async () => {
        if (qrScannerRef.current) {
            try {
                await qrScannerRef.current.stop()
                qrScannerRef.current = null
            } catch (err) { console.error(err) }
        }
        setIsScanning(false)
    }

    const canEdit = currentUser && ['SuperAdmin', 'Security'].includes(currentUser.role)

    return (
        <div className="p-3 md:p-6 relative overflow-hidden min-h-screen">
            <input 
                type="file" 
                id="insecure-verification-qr-file-input" 
                accept="image/*" 
                capture="environment" 
                onChange={handleVerificationFileScan} 
                className="hidden" 
            />
            <style>{`
                .perspective-1000 { perspective: 1000px; }
                .preserve-3d { transform-style: preserve-3d; }
                .backface-hidden { backface-visibility: hidden; }
                .rotate-y-180 { transform: rotateY(180deg); }
                @keyframes float {
                    0% { transform: translateY(0px) rotate(0deg); }
                    50% { transform: translateY(-20px) rotate(5deg); }
                    100% { transform: translateY(0px) rotate(0deg); }
                }
                .animate-float { animation: float 10s ease-in-out infinite; }
            `}</style>

            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 dark:from-gray-900 dark:via-purple-900/20 dark:to-blue-900/20"></div>

            <div className="relative max-w-6xl mx-auto">
                <div className="text-center mb-6">
                    <div className="flex items-center justify-center gap-2 mb-2">
                        <Shield className="text-purple-600" size={32} />
                        <h1 className="text-3xl font-black bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent">
                            ID Verification
                        </h1>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4 max-w-2xl mx-auto bg-white/65 dark:bg-gray-800/65 backdrop-blur-md px-5 py-3 rounded-2xl border border-gray-150/80 dark:border-gray-700/80 shadow-md">
                        <div className="flex items-center gap-2">
                            {isOffline ? (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-600 border border-amber-200/50">
                                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                    Offline Mode
                                </span>
                            ) : (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 border border-emerald-250/50">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    Online
                                </span>
                            )}
                            
                            {offlineQueue.length > 0 && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 dark:bg-rose-950/30 text-rose-600 border border-rose-200/50 animate-bounce">
                                    {offlineQueue.length} Pending Sync
                                </span>
                            )}
                            
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 dark:bg-purple-950/30 text-purple-600 border border-purple-200/50">
                                {cachedCount} Cached Records
                            </span>
                            {isNfcActive && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-600 text-white border border-purple-500 animate-pulse shadow-sm">
                                    <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
                                    NFC Scanner Active
                                </span>
                            )}
                        </div>
                        
                        <button
                            onClick={syncOfflineDataAndRefresh}
                            disabled={syncing}
                            className="flex items-center gap-1.5 px-4 py-1.5 bg-gradient-to-r from-purple-600 to-pink-600 hover:opacity-90 disabled:opacity-50 text-white rounded-xl text-xs font-black shadow-sm transition-all"
                            title="Refresh system status and synchronize offline logs"
                        >
                            <RefreshCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                            {syncing ? 'Syncing...' : 'Refresh & Sync'}
                        </button>

                        {gates.length > 0 && (
                            <div className="flex items-center gap-2 text-xs font-bold border-l border-gray-200 dark:border-gray-700 pl-3">
                                <span className="text-[var(--text-secondary)]">Gate:</span>
                                <select
                                    value={selectedGateId}
                                    onChange={(e) => {
                                        const newGateId = e.target.value;
                                        setSelectedGateId(newGateId);
                                        localStorage.setItem('active_gate_id', newGateId);
                                        showNotification(`Active gate set to: ${gates.find(g => g.id === newGateId)?.name || 'Unknown'}`, 'success');
                                    }}
                                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl border-none outline-none cursor-pointer font-black transition-all"
                                >
                                    {gates.map((g) => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-2xl mx-auto mb-8">
                    <div className="relative group">
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-1.5 sm:p-2 flex gap-1.5 sm:gap-2 items-center">
                            <div className="flex-1 relative">
                                <Search className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <input
                                    type="text"
                                    value={query}
                                    onChange={(e) => handleQueryChange(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleVerify()}
                                    placeholder="Enter ID / Admission..."
                                    className="w-full pl-9 sm:pl-12 pr-2 sm:pr-4 py-2 sm:py-4 bg-transparent text-xs sm:text-lg font-medium focus:outline-none uppercase text-slate-800 dark:text-white"
                                />
                                {showSuggestions && suggestions.length > 0 && (
                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50">
                                        {suggestions.map((s, idx) => (
                                            <button 
                                                key={idx}
                                                className="w-full text-left px-3 py-2 sm:px-4 sm:py-3 hover:bg-purple-50 dark:hover:bg-purple-900/20 border-b border-gray-50 dark:border-gray-700/50 flex items-center gap-2 sm:gap-3 transition-colors last:border-none"
                                                onClick={() => {
                                                    setQuery(s.admission_number)
                                                    setShowSuggestions(false)
                                                    handleVerify(s.admission_number)
                                                }}
                                            >
                                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-purple-100 dark:bg-purple-900 overflow-hidden shrink-0">
                                                    {s.profile_image ? <img src={s.profile_image} className="w-full h-full object-cover" /> : <User size={16} className="m-auto mt-2 text-purple-600" />}
                                                </div>
                                                <div>
                                                    <div className="font-black text-gray-900 dark:text-white font-mono text-xs sm:text-base">{s.admission_number}</div>
                                                    <div className="text-[10px] sm:text-xs font-bold text-gray-500">{s.full_name}</div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1.5 sm:gap-2 shrink-0">
                                <button
                                    onClick={handleVerify}
                                    disabled={loading || !query.trim()}
                                    className="px-4 py-2.5 sm:px-8 sm:py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold rounded-xl shadow-lg hover:opacity-90 transition-all disabled:opacity-50 text-xs sm:text-base"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={14} /> : 'Verify'}
                                </button>
                                <button
                                    onClick={startScanner}
                                    className="p-2.5 sm:p-4 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl flex items-center justify-center hover:bg-slate-200 dark:hover:bg-slate-600 transition-all"
                                    title="Scan QR Code"
                                >
                                    <QrCode size={18} />
                                </button>
                                <button
                                    onClick={toggleNfcScan}
                                    className={`p-2.5 sm:p-4 font-bold rounded-xl flex items-center justify-center transition-all ${
                                        isNfcActive 
                                            ? 'bg-purple-600 text-white animate-pulse shadow-md' 
                                            : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600'
                                    }`}
                                    title={isNfcActive ? "NFC Active (Click to turn off)" : "Turn on NFC Scanning"}
                                >
                                    <Radio size={18} className={isNfcActive ? 'animate-pulse' : ''} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {isScanning && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 w-full max-w-md relative">
                            <button onClick={stopScanner} className="absolute -top-4 -right-4 bg-red-500 text-white p-2 rounded-full"><XCircle /></button>
                            <div id="qr-reader" className="w-full aspect-square bg-black rounded-2xl overflow-hidden"></div>
                        </div>
                    </div>
                )}

                {result && !result.error && !result.ad_found && (
                    <div className={`max-w-4xl mx-auto transition-all duration-500 ${showCard ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
                        <div className="mb-6 flex flex-col sm:flex-row gap-3 items-center justify-between w-full">
                            <div className="grid grid-cols-2 sm:flex gap-2 sm:gap-3 w-full sm:w-auto">
                                {result.gate_status === 'In' ? (
                                    <button 
                                        onClick={() => handleGateAction('check-out')} 
                                        disabled={!!actionLoading} 
                                        className="col-span-2 sm:col-span-1 py-3 px-4 sm:py-4 sm:px-8 bg-red-600 hover:bg-red-700 text-white rounded-xl sm:rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-95"
                                    >
                                        {actionLoading === 'check-out' ? <Loader2 className="animate-spin" size={16} /> : <LogOut size={16} />} CHECK OUT
                                    </button>
                                ) : (
                                    <button 
                                        onClick={() => handleGateAction('check-in')} 
                                        disabled={!!actionLoading} 
                                        className="col-span-2 sm:col-span-1 py-3 px-4 sm:py-4 sm:px-8 bg-green-600 hover:bg-green-700 text-white rounded-xl sm:rounded-2xl font-black shadow-lg flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-95"
                                    >
                                        {actionLoading === 'check-in' ? <Loader2 className="animate-spin" size={16} /> : <LogIn size={16} />} CHECK IN
                                    </button>
                                )}
                                <button 
                                    onClick={handlePrint} 
                                    disabled={isPrinting} 
                                    className="py-3 px-4 sm:py-4 sm:px-6 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-95"
                                >
                                    {isPrinting ? <Loader2 className="animate-spin" size={16} /> : <Printer size={16} />} Print ID
                                </button>
                                <button 
                                    onClick={() => setIsFlipped(!isFlipped)} 
                                    className="py-3 px-4 sm:py-4 sm:px-6 bg-[#7A1975] hover:bg-[#60145c] text-white rounded-xl sm:rounded-2xl font-bold flex items-center justify-center gap-2 text-xs sm:text-sm transition-all active:scale-95"
                                >
                                    <RefreshCcw size={16} /> Flip Card
                                </button>
                            </div>
                        </div>

                        <div className="w-full max-w-4xl mx-auto">
                            {(() => {
                                const nameParts = result.full_name ? result.full_name.trim().split(/\s+/) : [];
                                const firstName = nameParts[0] || "";
                                const lastName = nameParts.slice(1).join(" ") || "";
                                const statusText = result.status || 'ACTIVE';
                                const isActive = statusText.toUpperCase() === 'ACTIVE';
                                const isFlagged = statusText.toUpperCase() === 'FLAGGED';

                                const formatDateTime = (isoString?: string) => {
                                    if (!isoString) return "N/A";
                                    try {
                                        const date = new Date(isoString);
                                        return date.toLocaleString('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit',
                                            hour12: true
                                        });
                                    } catch (e) {
                                        return isoString;
                                    }
                                };

                                return (
                                    <>
                                        {isFlagged && (
                                            <div className="mb-6 bg-red-50 border-2 border-red-500 text-red-700 p-5 rounded-2xl flex items-center justify-center gap-4 animate-pulse shadow-lg">
                                                <AlertTriangle className="text-red-600 shrink-0 animate-bounce" size={36} />
                                                <div className="text-center">
                                                    <h3 className="text-lg font-black uppercase tracking-wider text-red-700">⚠️ WARNING: STUDENT UNDER INVESTIGATION</h3>
                                                    <p className="text-xs font-bold text-red-600 mt-1">This student has been flagged in active security incidents. Deny access and alert supervisors immediately.</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="w-full flex justify-center overflow-hidden" style={{ height: `${520 * scale}px` }}>
                                            <div 
                                                ref={cardContainerRef}
                                                className="relative transition-all duration-700 preserve-3d h-[520px] w-[896px] origin-top shrink-0"
                                                style={{ transform: `scale(${scale}) ${isFlipped ? 'rotateY(180deg)' : ''}` }}
                                            >
                                                {result.found_in_vehicles ? (
                                                    <>
                                                        {/* Front Side - Vehicle Pass Template */}
                                                        <div 
                                                            className="absolute inset-0 backface-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-amber-500/50 flex flex-row transition-transform hover:scale-[1.005]"
                                                            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                                        >
                                                            {/* Left Column (Logo, Details) */}
                                                            <div className="flex-1 flex flex-col justify-between p-8 min-w-0">
                                                                {/* Logo & Company Info */}
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-14 h-14 bg-slate-100 dark:bg-amber-500/10 rounded-2xl p-1 border border-slate-250 dark:border-amber-500/20 flex items-center justify-center shrink-0">
                                                                        {companySettings.logo_url ? (
                                                                            <img src={companySettings.logo_url} className="w-full h-full object-contain filter dark:brightness-110" />
                                                                        ) : (
                                                                            <div className="text-2xl font-bold text-[#7A1975] dark:text-amber-500" style={{ fontFamily: "'Museo', sans-serif" }}>RU</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[#7A1975] dark:text-amber-500 leading-none min-w-0">
                                                                        <h2 className="font-bold text-2xl tracking-tight uppercase truncate" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                            {companySettings.company_name || "Riara University"}
                                                                        </h2>
                                                                        <p className="text-[11px] font-bold text-slate-400 dark:text-amber-500/70 uppercase tracking-widest mt-1">
                                                                            VEHICLE GATE PASS
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Large License Plate Badge */}
                                                                <div className="flex-1 flex flex-col justify-center my-3">
                                                                    <span className="text-xs font-bold text-slate-400 dark:text-amber-500/60 uppercase tracking-widest mb-1">Plate Number</span>
                                                                    <div className="flex items-center gap-4 flex-wrap">
                                                                        {/* Kenyan Horizontal Plate (White) */}
                                                                        <div className="bg-white border-2 border-slate-900 text-slate-950 px-4 py-2 rounded-lg flex items-center gap-3 shadow-[0_4px_10px_rgba(0,0,0,0.15)] select-none shrink-0 font-mono tracking-wider font-extrabold text-2xl h-16 border-double">
                                                                            {/* Kenyan Flag */}
                                                                            <div className="flex flex-col w-6 h-4 border border-slate-355 rounded-[1px] overflow-hidden relative shrink-0">
                                                                                <div className="bg-black h-1/3 w-full"></div>
                                                                                <div className="bg-[#990000] h-1/3 w-full border-y-[0.5px] border-white"></div>
                                                                                <div className="bg-[#006600] h-1/3 w-full"></div>
                                                                                <div className="absolute inset-0 flex items-center justify-center">
                                                                                    <div className="w-1.5 h-2 bg-[#990000] rounded-full border-[0.5px] border-white relative">
                                                                                        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-black"></div>
                                                                                    </div>
                                                                                </div>
                                                                            </div>
                                                                            <span className="text-slate-900">
                                                                                {result.plate_number || result.admission_number}
                                                                            </span>
                                                                        </div>

                                                                        {/* Kenyan Square Plate (Yellow) */}
                                                                        {(() => {
                                                                            const { part1, part2 } = splitPlateNumber(result.plate_number || result.admission_number);
                                                                            return (
                                                                                <div className="bg-[#FFCC00] border-[3px] border-black text-black w-[150px] h-[120px] rounded-xl p-3 flex flex-col justify-between items-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] select-none shrink-0 font-mono border-double relative">
                                                                                    {/* Top Row: Flag + Part 1 */}
                                                                                    <div className="w-full flex items-center justify-between">
                                                                                        {/* Kenyan Flag */}
                                                                                        <div className="flex flex-col w-9 h-6 border border-black rounded-[1px] overflow-hidden relative shrink-0">
                                                                                            <div className="bg-black h-1/3 w-full"></div>
                                                                                            <div className="bg-[#990000] h-1/3 w-full border-y-[0.5px] border-white"></div>
                                                                                            <div className="bg-[#006600] h-1/3 w-full"></div>
                                                                                            <div className="absolute inset-0 flex items-center justify-center">
                                                                                                <div className="w-2 h-2.5 bg-[#990000] rounded-full border-[0.5px] border-white relative">
                                                                                                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-black"></div>
                                                                                                </div>
                                                                                            </div>
                                                                                        </div>
                                                                                        {/* Part 1 (Letters) */}
                                                                                        <span className="text-3xl font-black text-black leading-none tracking-tighter">
                                                                                            {part1}
                                                                                        </span>
                                                                                    </div>
                                                                                    {/* Bottom Row: Part 2 (Numbers + Letter) */}
                                                                                    <div className="w-full flex justify-center items-center pb-1">
                                                                                        <span className="text-4xl font-black text-black leading-none tracking-tight">
                                                                                            {part2}
                                                                                        </span>
                                                                                    </div>
                                                                                </div>
                                                                            );
                                                                        })()}
                                                                    </div>
                                                                    <span className="text-lg font-bold text-slate-700 dark:text-slate-300 mt-2 uppercase tracking-wide">
                                                                        {result.make || ""} {result.model || "Vehicle"}
                                                                    </span>
                                                                </div>

                                                                {/* Vehicle/Driver info details */}
                                                                <div className="space-y-3">
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-100/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 text-xs">
                                                                        <div>
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Driver Name</span>
                                                                            <span className="font-bold text-sm text-slate-850 dark:text-slate-200 truncate block">{result.driver_name || "N/A"}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Driver Contact</span>
                                                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 truncate block font-mono">{result.driver_contact || "N/A"}</span>
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Reason for Visit</span>
                                                                            <span className="font-bold text-sm text-slate-850 dark:text-slate-200 block break-words whitespace-normal leading-snug">{result.purpose || result.visit_details || "General Visit"}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Entry Time</span>
                                                                            <span className="font-bold text-xs text-amber-600 dark:text-amber-400 block font-mono">
                                                                                {result.entry_time ? formatDateTime(result.entry_time) : "Not Logged In"}
                                                                            </span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Last Stay Duration</span>
                                                                            <span className="font-bold text-xs text-slate-700 dark:text-slate-300 block font-mono">
                                                                                {result.last_stay_minutes !== undefined && result.last_stay_minutes !== null
                                                                                    ? formatDuration(result.last_stay_minutes)
                                                                                    : "No prior checkout"}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* QR Code & Status */}
                                                                    <div className="flex items-center gap-6 pt-1">
                                                                        <div className="p-1.5 bg-white rounded-2xl border border-slate-250 dark:border-slate-800 shadow-sm shrink-0">
                                                                            <QRCodeSVG value={result.admission_number} size={80} level="H" />
                                                                        </div>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className={`px-4 py-1.5 text-white font-bold text-[10px] uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5 select-none ${
                                                                                result.gate_status === 'In' 
                                                                                    ? 'bg-[#22C55E] shadow-[#22C55E]/20' 
                                                                                    : 'bg-amber-600 shadow-amber-600/20'
                                                                            }`}>
                                                                                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                                                                                {result.gate_status === 'In' ? 'Checked In' : 'Checked Out'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Center-Right Column (Illustration / Meta) */}
                                                            <div className="w-[300px] border-l border-slate-200 dark:border-slate-800 bg-slate-100/20 dark:bg-slate-900/40 flex flex-col h-full shrink-0">
                                                                <div className="w-full h-[330px] flex flex-col items-center justify-center relative border-b border-slate-200 dark:border-slate-800 p-6 bg-slate-50/20 dark:bg-slate-950/40">
                                                                    <div className="w-40 h-40 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-3 shadow-md mb-4">
                                                                        {companySettings.logo_url ? (
                                                                            <img src={companySettings.logo_url} className="w-full h-full object-contain" />
                                                                        ) : (
                                                                            <div className="text-4xl font-bold text-[#7A1975] dark:text-amber-500" style={{ fontFamily: "'Museo', sans-serif" }}>RU</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-center">
                                                                        <span className="px-3 py-1 bg-slate-250 dark:bg-amber-500/10 text-slate-700 dark:text-amber-400 border border-slate-300 dark:border-amber-500/20 rounded-full text-[11px] font-bold uppercase tracking-widest">
                                                                            {result.vehicle_type || "VEHICLE"}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Technical Details */}
                                                                <div className="flex-1 p-6 flex flex-col justify-center text-xs space-y-2.5">
                                                                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/60 pb-1.5">
                                                                        <span className="text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">VEHICLE TYPE:</span>
                                                                        <span className="font-extrabold text-slate-700 dark:text-slate-200 uppercase">{result.vehicle_type || "N/A"}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/60 pb-1.5">
                                                                        <span className="text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">COLOR:</span>
                                                                        <span className="font-extrabold text-slate-700 dark:text-slate-200 uppercase">{result.color || "N/A"}</span>
                                                                    </div>
                                                                    <div className="flex justify-between border-b border-slate-200 dark:border-slate-800/60 pb-1.5">
                                                                        <span className="text-slate-400 dark:text-slate-550 font-bold uppercase tracking-wider">PASSENGERS:</span>
                                                                        <span className="font-extrabold text-slate-700 dark:text-slate-200 font-mono">{result.passengers || "1"}</span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right-most Vertical Bar */}
                                                            <div className="w-[80px] bg-gradient-to-b from-[#7A1975] to-[#9C27B0] dark:from-amber-500 dark:to-yellow-600 flex items-center justify-center relative select-none shrink-0">
                                                                <span className="text-white dark:text-slate-950 text-[26px] font-black tracking-[0.25em] uppercase absolute transform -rotate-90 whitespace-nowrap" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                    VEHICLE PASS
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Back Side - Vehicle Pass Template */}
                                                        <div 
                                                            className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-amber-500/50 flex flex-col justify-between py-8"
                                                            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                                        >
                                                            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[#7A1975] to-[#9C27B0] dark:from-amber-500 dark:to-yellow-600"></div>
                                                            
                                                            <div className="text-center px-4 mt-6">
                                                                <h2 className="text-[#7A1975] dark:text-amber-500 font-bold tracking-[0.2em] text-2xl uppercase" style={{ fontFamily: "'Museo', sans-serif" }}>Vehicle Authorization</h2>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider mt-1">Verify Plate & Driver Details at Gate</p>
                                                            </div>
                                                            
                                                            <div className="flex justify-center my-4">
                                                                <div className="p-3 bg-white rounded-[2rem] shadow-2xl border border-slate-250 dark:border-slate-800">
                                                                    <QRCodeSVG value={result.admission_number} size={180} level="H" />
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-center px-8 mb-6">
                                                                <p className="mt-2 font-mono font-bold text-3xl text-[#7A1975] dark:text-amber-500 tracking-[0.15em]">{result.admission_number}</p>
                                                                <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase leading-relaxed max-w-md mx-auto mt-3">
                                                                    This vehicle pass must be clearly verified upon entry and exit. Unauthorized vehicles will be clamped. Property of the University Security.
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-[#7A1975] to-[#9C27B0] dark:from-amber-500 dark:to-yellow-600"></div>
                                                        </div>
                                                    </>
                                                ) : (result.found_in_visitor_logs || result.found_in_event_visitors) ? (
                                                    <>
                                                        {/* Front Side - Visitor Pass Template */}
                                                        <div 
                                                            className="absolute inset-0 backface-hidden bg-emerald-50/50 dark:bg-teal-950 text-slate-800 dark:text-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-emerald-100 dark:border-teal-500/50 flex flex-row transition-transform hover:scale-[1.005]"
                                                            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                                        >
                                                            {/* Left Column (Logo, Details) */}
                                                            <div className="flex-1 flex flex-col justify-between p-8 min-w-0">
                                                                {/* Logo & Company Info */}
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-14 h-14 bg-slate-100 dark:bg-teal-500/10 rounded-2xl p-1 border border-slate-250 dark:border-teal-500/20 flex items-center justify-center shrink-0">
                                                                        {companySettings.logo_url ? (
                                                                            <img src={companySettings.logo_url} className="w-full h-full object-contain filter dark:brightness-110" />
                                                                        ) : (
                                                                            <div className="text-2xl font-bold text-[#7A1975] dark:text-teal-400" style={{ fontFamily: "'Museo', sans-serif" }}>RU</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[#7A1975] dark:text-teal-400 leading-none min-w-0">
                                                                        <h2 className="font-bold text-2xl tracking-tight uppercase truncate" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                            {companySettings.company_name || "Riara University"}
                                                                        </h2>
                                                                        <p className="text-[11px] font-bold text-slate-400 dark:text-teal-400/70 uppercase tracking-widest mt-1">
                                                                            VISITOR PASS
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Large Visitor Name */}
                                                                <div className="flex-1 flex flex-col justify-center my-4">
                                                                    <span className="text-xs font-bold text-slate-400 dark:text-teal-400/60 uppercase tracking-widest mb-1">Visitor Name</span>
                                                                    <span className="text-[36px] font-extrabold text-[#7A1975] dark:text-teal-200 leading-[1.1] uppercase break-words tracking-tight" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                        {result.full_name || `${result.first_name || ""} ${result.last_name || ""}`.trim() || "Guest"}
                                                                    </span>
                                                                </div>

                                                                {/* Visitor Form Info */}
                                                                <div className="space-y-3">
                                                                    <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-100/50 dark:bg-teal-900/40 p-4 rounded-2xl border border-slate-200 dark:border-teal-800 text-xs">
                                                                        <div>
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-teal-400/60 uppercase tracking-wider">ID / Passport No</span>
                                                                            <span className="font-bold text-sm text-slate-800 dark:text-teal-100 truncate block font-mono">{result.admission_number || "N/A"}</span>
                                                                        </div>
                                                                        <div>
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-teal-400/60 uppercase tracking-wider">Phone Number</span>
                                                                            <span className="font-bold text-xs text-slate-700 dark:text-teal-200 truncate block font-mono">{result.phone_number || "N/A"}</span>
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-teal-400/60 uppercase tracking-wider">Reason for Visit</span>
                                                                            <span className="font-bold text-sm text-slate-800 dark:text-teal-100 block break-words whitespace-normal leading-snug">{result.visit_details || result.purpose || "General Visit"}</span>
                                                                        </div>
                                                                        <div className="col-span-2">
                                                                            <span className="block text-[10px] font-bold text-slate-400 dark:text-teal-400/60 uppercase tracking-wider">Entry Time</span>
                                                                            <span className="font-bold text-xs text-teal-600 dark:text-teal-200 block font-mono">
                                                                                {result.time_in ? formatDateTime(result.time_in) : "Not Checked In"}
                                                                            </span>
                                                                        </div>
                                                                    </div>

                                                                    {/* QR Code & Status */}
                                                                    <div className="flex items-center gap-6 pt-1">
                                                                        <div className="p-1.5 bg-white rounded-2xl border border-slate-250 dark:border-teal-800 shadow-sm shrink-0">
                                                                            <QRCodeSVG value={result.admission_number} size={80} level="H" />
                                                                        </div>
                                                                        <div className="flex flex-col gap-2">
                                                                            <div className={`px-4 py-1.5 text-white font-bold text-[10px] uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5 select-none ${
                                                                                result.gate_status === 'In' 
                                                                                    ? 'bg-[#22C55E] shadow-[#22C55E]/20' 
                                                                                    : 'bg-teal-600 shadow-teal-600/20'
                                                                            }`}>
                                                                                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                                                                                {result.gate_status === 'In' ? 'Checked In' : 'Checked Out'}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Center-Right Column (Photo & Details) */}
                                                            <div className="w-[300px] border-l border-slate-200 dark:border-teal-800 bg-slate-100/20 dark:bg-teal-900/20 flex flex-col h-full shrink-0">
                                                                <div className="w-full h-[330px] flex flex-col items-center justify-center relative border-b border-slate-200 dark:border-teal-800 p-6 bg-slate-50/20 dark:bg-teal-950/40">
                                                                    {result.profile_image ? (
                                                                        <img src={result.profile_image} className="w-full h-full object-cover rounded-[1.5rem]" />
                                                                    ) : (
                                                                        <div className="w-40 h-40 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center p-3 shadow-md mb-4">
                                                                            {companySettings.logo_url ? (
                                                                                <img src={companySettings.logo_url} className="w-full h-full object-contain" />
                                                                            ) : (
                                                                                <div className="text-4xl font-bold text-[#7A1975] dark:text-teal-400" style={{ fontFamily: "'Museo', sans-serif" }}>RU</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <div className="text-center mt-2">
                                                                        <span className="px-3 py-1 bg-slate-250 dark:bg-teal-500/10 text-slate-700 dark:text-teal-300 border border-slate-300 dark:border-teal-500/20 rounded-full text-[11px] font-bold uppercase tracking-widest">
                                                                            {result.visitor_type || result.role || "VISITOR"}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Technical Details */}
                                                                <div className="flex-1 p-6 flex flex-col justify-center text-xs space-y-2.5">
                                                                    <div className="flex justify-between border-b border-slate-200 dark:border-teal-850 pb-1.5">
                                                                        <span className="text-slate-400 dark:text-teal-400/60 font-bold uppercase tracking-wider">CATEGORY:</span>
                                                                        <span className="font-extrabold text-slate-700 dark:text-teal-200 uppercase">{result.visitor_type || "Visitor"}</span>
                                                                    </div>
                                                                    {result.plate_number && (
                                                                        <div className="flex justify-between border-b border-slate-200 dark:border-teal-850 pb-1.5">
                                                                            <span className="text-slate-400 dark:text-teal-400/60 font-bold uppercase tracking-wider">CAR PLATE:</span>
                                                                            <span className="font-extrabold text-slate-700 dark:text-teal-200 font-mono">{result.plate_number}</span>
                                                                        </div>
                                                                    )}
                                                                    {result.check_in_student && (
                                                                        <div className="flex justify-between border-b border-slate-200 dark:border-teal-850 pb-1.5 text-right">
                                                                            <span className="text-slate-400 dark:text-teal-400/60 font-bold uppercase tracking-wider text-left">HOST / STUDENT:</span>
                                                                            <span className="font-extrabold text-slate-700 dark:text-teal-200 uppercase truncate max-w-[150px]">{result.check_in_student}</span>
                                                                        </div>
                                                                    )}
                                                                    {result.event_name && (
                                                                        <div className="flex justify-between border-b border-slate-200 dark:border-teal-855 pb-1.5">
                                                                            <span className="text-slate-400 dark:text-teal-400/60 font-bold uppercase tracking-wider">EVENT:</span>
                                                                            <span className="font-extrabold text-slate-700 dark:text-teal-200 uppercase truncate max-w-[150px]">{result.event_name}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Right-most Vertical Bar */}
                                                            <div className="w-[80px] bg-gradient-to-b from-[#7A1975] to-[#9C27B0] dark:from-teal-500 dark:to-emerald-600 flex items-center justify-center relative select-none shrink-0">
                                                                <span className="text-white dark:text-teal-950 text-[26px] font-black tracking-[0.25em] uppercase absolute transform -rotate-90 whitespace-nowrap" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                    VISITOR PASS
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Back Side - Visitor Pass Template */}
                                                        <div 
                                                            className="absolute inset-0 backface-hidden rotate-y-180 bg-slate-50 dark:bg-teal-950 text-slate-800 dark:text-white rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-slate-200 dark:border-teal-500/50 flex flex-col justify-between py-8"
                                                            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                                        >
                                                            <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-[#7A1975] to-[#9C27B0] dark:from-teal-500 dark:to-emerald-600"></div>
                                                            
                                                            <div className="text-center px-4 mt-6">
                                                                <h2 className="text-[#7A1975] dark:text-teal-400 font-bold tracking-[0.2em] text-2xl uppercase" style={{ fontFamily: "'Museo', sans-serif" }}>Visitor Access Pass</h2>
                                                                <p className="text-xs text-slate-500 dark:text-teal-400/60 font-bold uppercase tracking-wider mt-1">Please Keep Pass Visible at All Times</p>
                                                            </div>
                                                            
                                                            <div className="flex justify-center my-4">
                                                                <div className="p-3 bg-white rounded-[2rem] shadow-2xl border border-slate-250 dark:border-teal-850">
                                                                    <QRCodeSVG value={result.admission_number} size={180} level="H" />
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-center px-8 mb-6">
                                                                <p className="mt-2 font-mono font-bold text-3xl text-[#7A1975] dark:text-teal-400 tracking-[0.15em]">{result.admission_number}</p>
                                                                <p className="text-xs text-slate-500 dark:text-teal-400/60 font-bold uppercase leading-relaxed max-w-md mx-auto mt-3">
                                                                    This visitor pass must be returned to security office when leaving the campus premises. Thank you for cooperation.
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="absolute bottom-0 left-0 w-full h-3 bg-gradient-to-r from-[#7A1975] to-[#9C27B0] dark:from-teal-500 dark:to-emerald-600"></div>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <>
                                                        {/* Front Side - Premium Template */}
                                                        <div 
                                                            className={`absolute inset-0 backface-hidden bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-row transition-transform hover:scale-[1.005] ${isFlagged ? 'animate-pulse-red animate-bounce' : ''}`}
                                                            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                                        >
                                                            {/* Left Column (Logo, Name, ID No, QR Code) */}
                                                            <div className="flex-1 flex flex-col justify-between p-8 min-w-0">
                                                                {/* Logo & School Name */}
                                                                <div className="flex items-center gap-4">
                                                                    <div className="w-14 h-14 bg-purple-50 dark:bg-purple-955/30 rounded-2xl p-1 border border-purple-100 dark:border-purple-900/30 flex items-center justify-center shrink-0">
                                                                        {companySettings.logo_url ? (
                                                                            <img src={companySettings.logo_url} className="w-full h-full object-contain" />
                                                                        ) : (
                                                                            <div className="text-2xl font-bold text-[#7A1975] dark:text-purple-400" style={{ fontFamily: "'Museo', sans-serif" }}>RU</div>
                                                                        )}
                                                                    </div>
                                                                    <div className="text-[#7A1975] dark:text-purple-400 leading-none min-w-0">
                                                                        <h2 className="font-bold text-2xl tracking-tight uppercase truncate" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                            {companySettings.company_name || "Riara University"}
                                                                        </h2>
                                                                        <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                                                                            {companySettings.tagline || "nurturing innovators"}
                                                                        </p>
                                                                    </div>
                                                                </div>

                                                                {/* Student Name */}
                                                                <div className="flex-1 flex flex-col justify-center my-4">
                                                                    <span className="text-[56px] font-extrabold text-[#7A1975] dark:text-purple-300 leading-[0.95] uppercase break-words tracking-tighter" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                        {firstName}
                                                                    </span>
                                                                    <span className="text-[56px] font-extrabold text-[#7A1975] dark:text-purple-300 leading-[0.95] uppercase break-words tracking-tighter mt-1" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                        {lastName}
                                                                    </span>
                                                                </div>

                                                                <div className="space-y-4">
                                                                    {/* ID Number */}
                                                                    <div className="text-[20px] font-bold text-[#7A1975] dark:text-purple-400 uppercase tracking-wider leading-none" style={{ fontFamily: "'Museo Sans', sans-serif" }}>
                                                                        ID NO: {result.admission_number}
                                                                    </div>

                                                                    {/* QR Code & Status */}
                                                                    <div className="flex items-center gap-6">
                                                                        <div className="p-1 bg-white rounded-2xl border border-gray-250 dark:border-gray-800 shadow-sm shrink-0">
                                                                            <QRCodeSVG value={result.admission_number} size={105} level="H" />
                                                                        </div>
                                                                        <div>
                                                                            <div className={`px-5 py-2 text-white font-bold text-xs uppercase tracking-widest rounded-full shadow-lg flex items-center gap-1.5 select-none ${
                                                                                isActive 
                                                                                    ? 'bg-[#22C55E] shadow-[#22C55E]/20' 
                                                                                    : 'bg-[#EF4444] shadow-[#EF4444]/20'
                                                                            }`}>
                                                                                <div className="w-2.5 h-2.5 bg-white rounded-full animate-pulse"></div>
                                                                                {statusText}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Center-Right Column (Photo & Details) */}
                                                            <div className="w-[300px] border-l border-gray-150 dark:border-gray-800 flex flex-col h-full shrink-0">
                                                                {/* Student Photo */}
                                                                <div className="w-full h-[350px] bg-slate-50 dark:bg-slate-900/50 overflow-hidden relative border-b border-gray-150 dark:border-gray-800 shrink-0">
                                                                    {result.profile_image ? (
                                                                        <img src={result.profile_image} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center p-8 bg-slate-55 dark:bg-slate-900">
                                                                            {companySettings.logo_url ? (
                                                                                <img src={companySettings.logo_url} className="w-40 h-40 object-contain" />
                                                                            ) : (
                                                                                <div className="text-4xl font-bold text-[#7A1975] dark:text-purple-400" style={{ fontFamily: "'Museo', sans-serif" }}>RU</div>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    
                                                                    {canEdit && (
                                                                        <label className="absolute bottom-4 right-4 w-12 h-12 bg-white dark:bg-gray-800 shadow-xl rounded-2xl flex items-center justify-center cursor-pointer hover:scale-115 transition-transform border border-gray-100 dark:border-gray-700 text-[#7A1975] dark:text-purple-400">
                                                                            <Camera size={24} />
                                                                            <input type="file" className="hidden" onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])} />
                                                                        </label>
                                                                    )}
                                                                </div>

                                                                {/* Details Section */}
                                                                <div className="flex-1 bg-white dark:bg-gray-900 p-6 flex flex-col justify-center text-base leading-normal text-slate-800 dark:text-gray-200 min-w-0">
                                                                    <div className="flex gap-2 items-baseline">
                                                                        <span className="text-[#7A1975] dark:text-purple-400 font-bold text-[13px] tracking-wider min-w-[100px] uppercase shrink-0">FACULTY:</span>
                                                                        <span className="font-extrabold text-slate-800 dark:text-gray-100 break-words text-[15px]">{result.school || "School of Business"}</span>
                                                                    </div>
                                                                    <div className="flex gap-2 mt-2 items-baseline">
                                                                        <span className="text-[#7A1975] dark:text-purple-400 font-bold text-[13px] tracking-wider min-w-[100px] uppercase shrink-0">COURSE:</span>
                                                                        <span className="font-extrabold text-slate-800 dark:text-gray-100 break-words text-[15px]">{result.program || ""}</span>
                                                                    </div>
                                                                    <div className="flex gap-2 mt-2 items-baseline">
                                                                        <span className="text-[#7A1975] dark:text-purple-400 font-bold text-[13px] tracking-wider min-w-[100px] uppercase shrink-0">VALIDITY:</span>
                                                                        <span className="font-extrabold text-slate-800 dark:text-gray-100 break-words text-[15px]">
                                                                            {result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ""}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Right-most Column (Vertical STUDENT bar) */}
                                                            <div className="w-[80px] bg-[#7A1975] flex items-center justify-center relative select-none shrink-0">
                                                                <span className="text-white text-[30px] font-bold tracking-[0.25em] uppercase absolute transform -rotate-90 whitespace-nowrap" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                    STUDENT
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Back Side - Premium QR Template */}
                                                        <div 
                                                            className={`absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-gray-900 rounded-[2.5rem] shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700 flex flex-col justify-between py-8 ${isFlagged ? 'animate-pulse-red animate-bounce' : ''}`}
                                                            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                                        >
                                                            <div className="absolute top-0 left-0 w-full h-3 bg-[#7A1975]"></div>
                                                            
                                                            <div className="text-center px-4 mt-6">
                                                                <h2 className="text-[#7A1975] dark:text-purple-400 font-bold tracking-[0.2em] text-2xl uppercase" style={{ fontFamily: "'Museo', sans-serif" }}>Security & Access Control</h2>
                                                                <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mt-1">Verification Required for Campus Entry</p>
                                                            </div>
                                                            
                                                            <div className="flex justify-center my-4">
                                                                <div className="p-3 bg-white rounded-[2rem] shadow-2xl border border-gray-100 dark:border-gray-800">
                                                                    <QRCodeSVG value={result.admission_number} size={200} level="H" />
                                                                </div>
                                                            </div>
                                                            
                                                            <div className="text-center px-8 mb-6">
                                                                <p className="mt-2 font-bold text-3xl text-[#7A1975] dark:text-purple-400 tracking-[0.15em]" style={{ fontFamily: "'Museo Sans', sans-serif" }}>{result.admission_number}</p>
                                                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase leading-relaxed max-w-md mx-auto mt-3">
                                                                    This card is the property of {companySettings.company_name || "the university"}. If found, please return it to the University Security Office or nearest Police Station.
                                                                </p>
                                                            </div>
                                                            
                                                            <div className="absolute bottom-0 left-0 w-full h-3 bg-[#7A1975]"></div>
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {result && result.ad_found && (
                    <div className="max-w-xl mx-auto bg-white dark:bg-gray-800 rounded-3xl shadow-2xl overflow-hidden border border-purple-100 dark:border-purple-900/30 p-8 text-center animate-in fade-in slide-in-from-bottom-5">
                        <div className="w-20 h-20 bg-purple-50 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-200 dark:border-purple-800/30 text-purple-600">
                            <Sparkles size={36} className="animate-pulse" />
                        </div>
                        <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-2">Student Found in Active Directory</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">
                            This student exists in the university directory but has not yet been registered in the Gatepass local database.
                        </p>

                        <div className="bg-slate-50 dark:bg-gray-700/30 rounded-2xl p-6 mb-8 text-left space-y-4">
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Full Name</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{result.full_name}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Admission Number</span>
                                <span className="font-bold text-purple-600 dark:text-purple-400 font-mono">{result.admission_number}</span>
                            </div>
                            <div className="flex justify-between items-center pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Email</span>
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{result.email || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">School</span>
                                <span className="font-bold text-slate-800 dark:text-slate-200">{result.school || 'General'}</span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleImportAD(result)}
                            disabled={importing}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-black rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
                        >
                            {importing ? (
                                <>
                                    <Loader2 className="animate-spin" size={20} />
                                    Importing Student...
                                </>
                            ) : (
                                <>
                                    <UploadCloud size={20} />
                                    Import & Verify Student
                                </>
                            )}
                        </button>
                    </div>
                )}

                {result && result.error && (
                    <div className="max-w-md mx-auto bg-red-50 border-2 border-red-200 p-8 rounded-3xl text-center shadow-xl">
                        <XCircle size={64} className="text-red-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-red-700">Verification Failed</h3>
                        <p className="text-red-600 mt-1">{result.error}</p>
                    </div>
                )}

                {/* Supervisor Modal */}
                {pinModal.show && (
                    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
                        <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
                            <div className="text-center mb-6">
                                <Shield className="text-purple-600 mx-auto mb-2" size={32} />
                                <h3 className="text-xl font-bold">Photo Authorization</h3>
                            </div>
                            <div className="flex flex-col items-center mb-6">
                                <div className="w-40 h-48 bg-gray-100 rounded-2xl overflow-hidden mb-4 border-2 border-purple-200">
                                    {previewUrl && <img src={previewUrl} className="w-full h-full object-cover" style={{ transform: `rotate(${rotation}deg)` }} />}
                                </div>
                                <button onClick={rotateImage} className="text-sm font-bold text-purple-600 flex items-center gap-1"><RefreshCcw size={14} /> Rotate</button>
                            </div>
                            <input 
                                type="password" 
                                maxLength={4} 
                                value={pinModal.pin} 
                                onChange={(e) => setPinModal({...pinModal, pin: e.target.value})}
                                placeholder="Supervisor PIN"
                                className="w-full text-center text-2xl py-4 bg-gray-50 rounded-2xl border-2 border-transparent focus:border-purple-500 outline-none mb-6"
                            />
                            <div className="flex gap-3">
                                <button onClick={() => setPinModal({show:false, pin:'', file:null})} className="flex-1 py-4 bg-gray-100 font-bold rounded-2xl">Cancel</button>
                                <button onClick={submitSecureImageUpdate} disabled={pinModal.pin.length < 4 || uploadingImage} className="flex-1 py-4 bg-purple-600 text-white font-bold rounded-2xl disabled:opacity-50">
                                    {uploadingImage ? 'Saving...' : 'Confirm'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Print Capture Area (Hidden) */}
                {result && !result.error && (() => {
                    const nameParts = result.full_name ? result.full_name.trim().split(/\s+/) : [];
                    const firstName = nameParts[0] || "";
                    const lastName = nameParts.slice(1).join(" ") || "";
                    const statusText = result.status || 'ACTIVE';
                    const isActive = statusText.toUpperCase() === 'ACTIVE';

                    const formatDateTime = (isoString?: string) => {
                        if (!isoString) return "N/A";
                        try {
                            const date = new Date(isoString);
                            return date.toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                            });
                        } catch (e) {
                            return isoString;
                        }
                    };

                    return (
                        <div className="fixed -left-[5000px] top-0">
                            {result.found_in_vehicles ? (
                                <>
                                    {/* Printable Front Side - Vehicle */}
                                    <div 
                                        id={`printable-front-${result.id}`} 
                                        className="w-[1011px] h-[638px] bg-slate-50 text-slate-800 border-2 border-slate-205 rounded-[48px] relative overflow-hidden select-none"
                                        style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                    >
                                         {/* Left Column */}
                                         <div className="absolute left-[45px] top-[42px] bottom-[42px] w-[430px] flex flex-col justify-between">
                                             {/* Logo & School Name */}
                                             <div className="flex items-center gap-4">
                                                 {companySettings.logo_url ? (
                                                     <img src={companySettings.logo_url} className="h-28 w-auto max-w-[400px] object-contain" />
                                                 ) : (
                                                     <>
                                                         <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-[#7A1975] font-bold text-3xl shrink-0 border border-slate-250">
                                                             RU
                                                         </div>
                                                         <div className="flex flex-col leading-[1.1] overflow-hidden">
                                                             <span className="text-[28px] font-bold text-[#7A1975] uppercase tracking-wide leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                 {companySettings.company_name || "Riara University"}
                                                             </span>
                                                             <span className="text-[16px] font-bold text-slate-450 uppercase tracking-widest mt-2">
                                                                 VEHICLE GATE PASS
                                                             </span>
                                                         </div>
                                                     </>
                                                 )}
                                             </div>

                                             {/* Plate Number */}
                                             <div className="flex flex-col mt-4 space-y-1">
                                                 <span className="text-xs font-bold text-slate-450 uppercase tracking-widest">Plate Number</span>
                                                 <div className="flex items-center gap-4">
                                                     {/* Kenyan Horizontal Plate (White) */}
                                                     <div className="bg-white border-2 border-slate-900 text-slate-950 px-4 py-2 rounded-lg flex items-center gap-3 shadow-md select-none shrink-0 font-mono tracking-wider font-extrabold text-2xl h-16 border-double">
                                                         {/* Kenyan Flag */}
                                                         <div className="flex flex-col w-6 h-4 border border-slate-300 rounded-[1px] overflow-hidden relative shrink-0">
                                                             <div className="bg-black h-1/3 w-full"></div>
                                                             <div className="bg-[#990000] h-1/3 w-full border-y-[0.5px] border-white"></div>
                                                             <div className="bg-[#006600] h-1/3 w-full"></div>
                                                             <div className="absolute inset-0 flex items-center justify-center">
                                                                 <div className="w-1.5 h-2 bg-[#990000] rounded-full border-[0.5px] border-white relative">
                                                                     <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-black"></div>
                                                                 </div>
                                                             </div>
                                                         </div>
                                                         <span className="text-slate-900">
                                                             {result.plate_number || result.admission_number}
                                                         </span>
                                                     </div>

                                                     {/* Kenyan Square Plate (Yellow) */}
                                                     {(() => {
                                                         const { part1, part2 } = splitPlateNumber(result.plate_number || result.admission_number);
                                                         return (
                                                             <div className="bg-[#FFCC00] border-[3px] border-black text-black w-[150px] h-[120px] rounded-xl p-3 flex flex-col justify-between items-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] select-none shrink-0 font-mono border-double relative">
                                                                 {/* Top Row: Flag + Part 1 */}
                                                                 <div className="w-full flex items-center justify-between">
                                                                     {/* Kenyan Flag */}
                                                                     <div className="flex flex-col w-9 h-6 border border-black rounded-[1px] overflow-hidden relative shrink-0">
                                                                         <div className="bg-black h-1/3 w-full"></div>
                                                                         <div className="bg-[#990000] h-1/3 w-full border-y-[0.5px] border-white"></div>
                                                                         <div className="bg-[#006600] h-1/3 w-full"></div>
                                                                         <div className="absolute inset-0 flex items-center justify-center">
                                                                             <div className="w-2 h-2.5 bg-[#990000] rounded-full border-[0.5px] border-white relative">
                                                                                 <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-0.5 bg-black"></div>
                                                                             </div>
                                                                         </div>
                                                                     </div>
                                                                     {/* Part 1 (Letters) */}
                                                                     <span className="text-3xl font-black text-black leading-none tracking-tighter">
                                                                         {part1}
                                                                     </span>
                                                                 </div>
                                                                 {/* Bottom Row: Part 2 (Numbers + Letter) */}
                                                                 <div className="w-full flex justify-center items-center pb-1">
                                                                     <span className="text-4xl font-black text-black leading-none tracking-tight">
                                                                         {part2}
                                                                     </span>
                                                                 </div>
                                                             </div>
                                                         );
                                                     })()}
                                                 </div>
                                                 <span className="text-2xl font-bold text-slate-700 mt-2 uppercase tracking-wide block font-sans">
                                                     {result.make || ""} {result.model || "Vehicle"}
                                                 </span>
                                             </div>

                                             {/* Info Box */}
                                             <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-100/50 p-4 rounded-2xl border border-slate-200 text-xs">
                                                 <div>
                                                     <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">Driver Name</span>
                                                     <span className="font-bold text-sm text-slate-850 truncate block">{result.driver_name || "N/A"}</span>
                                                 </div>
                                                 <div>
                                                     <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">Driver Contact</span>
                                                     <span className="font-bold text-xs text-slate-700 truncate block font-mono">{result.driver_contact || "N/A"}</span>
                                                 </div>
                                                 <div className="col-span-2">
                                                     <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">Reason for Visit</span>
                                                     <span className="font-bold text-sm text-slate-850 block break-words whitespace-normal leading-snug">{result.purpose || result.visit_details || "General Visit"}</span>
                                                 </div>
                                                 <div>
                                                     <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">Entry Time</span>
                                                     <span className="font-bold text-xs text-amber-600 block font-mono">
                                                         {result.entry_time ? formatDateTime(result.entry_time) : "Not Logged In"}
                                                     </span>
                                                 </div>
                                                 <div>
                                                     <span className="block text-[10px] font-bold text-slate-455 uppercase tracking-wider">Last Stay Duration</span>
                                                     <span className="font-bold text-xs text-slate-700 block font-mono">
                                                         {result.last_stay_minutes !== undefined && result.last_stay_minutes !== null
                                                             ? formatDuration(result.last_stay_minutes)
                                                             : "No prior checkout"}
                                                     </span>
                                                 </div>
                                             </div>

                                             {/* QR Code */}
                                             <div className="mt-3 flex items-end">
                                                 <div className="p-1.5 bg-white border border-slate-200 rounded-[20px] shadow-sm shrink-0">
                                                     <QRCodeSVG 
                                                         value={result.admission_number} 
                                                         size={110} 
                                                         level="H"
                                                     />
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Center-Right Column */}
                                         <div className="absolute left-[490px] top-0 bottom-0 w-[385px] flex flex-col border-l border-slate-200 bg-slate-50/50">
                                             {/* Icon / Company Logo */}
                                             <div className="w-full h-[438px] flex flex-col items-center justify-center relative border-b border-slate-200 p-6">
                                                 <div className="w-44 h-44 rounded-3xl bg-white border border-slate-200 flex items-center justify-center p-4 shadow-md mb-4">
                                                     {companySettings.logo_url ? (
                                                         <img src={companySettings.logo_url} className="w-full h-full object-contain" />
                                                     ) : (
                                                         <div className="text-5xl font-bold text-[#7A1975] font-sans">RU</div>
                                                     )}
                                                 </div>
                                                 <div>
                                                     <span className="px-4 py-1.5 bg-slate-200 text-slate-700 border border-slate-300 rounded-full text-[13px] font-bold uppercase tracking-widest">
                                                         {result.vehicle_type || "VEHICLE"}
                                                     </span>
                                                 </div>
                                             </div>

                                             {/* Details Section */}
                                             <div className="flex-1 p-6 flex flex-col justify-center text-sm space-y-3">
                                                 <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                                     <span className="text-slate-450 font-bold uppercase tracking-wider">VEHICLE TYPE:</span>
                                                     <span className="font-extrabold text-slate-700 uppercase">{result.vehicle_type || "N/A"}</span>
                                                 </div>
                                                 <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                                     <span className="text-slate-450 font-bold uppercase tracking-wider">COLOR:</span>
                                                     <span className="font-extrabold text-slate-700 uppercase">{result.color || "N/A"}</span>
                                                 </div>
                                                 <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                                     <span className="text-slate-450 font-bold uppercase tracking-wider">PASSENGERS:</span>
                                                     <span className="font-extrabold text-slate-700 font-mono">{result.passengers || "1"}</span>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Right-most Column */}
                                         <div className="absolute right-0 top-0 bottom-0 w-[135px] bg-gradient-to-b from-[#7A1975] to-[#9C27B0] flex items-center justify-center select-none">
                                             <span className="text-white text-[48px] font-black uppercase absolute transform -rotate-90 whitespace-nowrap tracking-[0.25em]" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                 VEHICLE
                                             </span>
                                         </div>
                                    </div>

                                    {/* Printable Back Side - Vehicle */}
                                    <div 
                                        id={`printable-back-${result.id}`} 
                                        className="w-[1011px] h-[638px] bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-[48px] relative overflow-hidden flex flex-col items-center justify-between py-10"
                                        style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                    >
                                         <div className="absolute top-0 left-0 w-full h-[18px] bg-gradient-to-r from-[#7A1975] to-[#9C27B0]"></div>
                                         
                                         <div className="text-center px-12 mt-2">
                                             <h4 className="text-[36px] font-bold text-[#7A1975] uppercase tracking-wider leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>Vehicle Authorization</h4>
                                             <p className="text-[20px] text-slate-500 font-bold uppercase tracking-wide mt-2 leading-none">Verify Plate & Driver Details at Gate</p>
                                         </div>

                                         <div className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-[24px] flex items-center justify-center my-2">
                                             <QRCodeSVG 
                                                 value={result.admission_number} 
                                                 size={200} 
                                                 level="H"
                                             />
                                         </div>

                                         <div className="text-center px-16 mb-2">
                                             <p className="text-[34px] font-mono font-bold text-[#7A1975] tracking-wide leading-none">{result.admission_number}</p>
                                             <p className="text-[18px] text-slate-500 mt-3.5 font-bold uppercase leading-relaxed px-6">
                                                 This vehicle pass must be clearly verified upon entry and exit. Unauthorized vehicles will be clamped. Property of the University Security.
                                             </p>
                                         </div>
                                         
                                         <div className="absolute bottom-0 left-0 w-full h-[18px] bg-gradient-to-r from-[#7A1975] to-[#9C27B0]"></div>
                                    </div>
                                </>
                            ) : (result.found_in_visitor_logs || result.found_in_event_visitors) ? (
                                <>
                                    {/* Printable Front Side - Visitor */}
                                    <div 
                                        id={`printable-front-${result.id}`} 
                                        className="w-[1011px] h-[638px] bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-[48px] relative overflow-hidden select-none"
                                        style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                    >
                                         {/* Left Column */}
                                         <div className="absolute left-[45px] top-[42px] bottom-[42px] w-[430px] flex flex-col justify-between">
                                             {/* Logo & School Name */}
                                             <div className="flex items-center gap-4">
                                                 {companySettings.logo_url ? (
                                                     <img src={companySettings.logo_url} className="h-28 w-auto max-w-[400px] object-contain" />
                                                 ) : (
                                                     <>
                                                         <div className="w-24 h-24 rounded-2xl bg-slate-100 flex items-center justify-center text-[#7A1975] font-bold text-3xl shrink-0 border border-slate-250">
                                                             RU
                                                         </div>
                                                         <div className="flex flex-col leading-[1.1] overflow-hidden">
                                                             <span className="text-[28px] font-bold text-[#7A1975] uppercase tracking-wide leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                 {companySettings.company_name || "Riara University"}
                                                             </span>
                                                             <span className="text-[16px] font-bold text-slate-450 uppercase tracking-widest mt-2">
                                                                 VISITOR PASS
                                                             </span>
                                                         </div>
                                                     </>
                                                 )}
                                             </div>

                                             {/* Visitor Name */}
                                             <div className="flex flex-col mt-4 space-y-1">
                                                 <span className="text-xs font-bold text-slate-450 tracking-widest">Visitor Name</span>
                                                 <span className="text-[40px] font-bold text-[#7A1975] leading-[1.1] uppercase break-words" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                     {result.full_name || `${result.first_name || ""} ${result.last_name || ""}`.trim() || "Guest"}
                                                 </span>
                                             </div>

                                             {/* Info Box */}
                                             <div className="grid grid-cols-2 gap-x-4 gap-y-3 bg-slate-100/50 p-4 rounded-2xl border border-slate-200 text-xs">
                                                 <div>
                                                     <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">ID / Passport No</span>
                                                     <span className="font-bold text-sm text-slate-850 truncate block font-mono">{result.admission_number || "N/A"}</span>
                                                 </div>
                                                 <div>
                                                     <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Phone Number</span>
                                                     <span className="font-bold text-xs text-slate-700 truncate block font-mono">{result.phone_number || "N/A"}</span>
                                                 </div>
                                                 <div className="col-span-2">
                                                     <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Reason for Visit</span>
                                                     <span className="font-bold text-sm text-slate-850 block break-words whitespace-normal leading-snug">{result.visit_details || result.purpose || "General Visit"}</span>
                                                 </div>
                                                 <div className="col-span-2">
                                                     <span className="block text-[10px] font-bold text-slate-450 uppercase tracking-wider">Entry Time</span>
                                                     <span className="font-bold text-xs text-teal-700 block font-mono">
                                                         {result.time_in ? formatDateTime(result.time_in) : "Not Checked In"}
                                                     </span>
                                                 </div>
                                             </div>

                                             {/* QR Code */}
                                             <div className="mt-3 flex items-end">
                                                 <div className="p-1.5 bg-white border border-slate-200 rounded-[20px] shadow-sm shrink-0">
                                                     <QRCodeSVG 
                                                         value={result.admission_number} 
                                                         size={110} 
                                                         level="H"
                                                     />
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Center-Right Column */}
                                         <div className="absolute left-[490px] top-0 bottom-0 w-[385px] flex flex-col border-l border-slate-200 bg-slate-50/50">
                                             {/* Photo fallback company logo */}
                                             <div className="w-full h-[438px] flex flex-col items-center justify-center relative border-b border-slate-200 bg-slate-50/20">
                                                 {result.profile_image ? (
                                                     <img src={result.profile_image} className="w-full h-full object-cover" />
                                                 ) : (
                                                     <div className="w-44 h-44 rounded-3xl bg-white border border-slate-200 flex items-center justify-center p-4 shadow-md">
                                                         {companySettings.logo_url ? (
                                                             <img src={companySettings.logo_url} className="w-full h-full object-contain" />
                                                         ) : (
                                                             <div className="text-5xl font-bold text-[#7A1975] font-sans">RU</div>
                                                         )}
                                                     </div>
                                                 )}
                                             </div>

                                             {/* Details Section */}
                                             <div className="flex-1 p-6 flex flex-col justify-center text-sm space-y-3">
                                                 <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                                     <span className="text-slate-450 font-bold uppercase tracking-wider">CATEGORY:</span>
                                                     <span className="font-extrabold text-slate-700 uppercase">{result.visitor_type || "Visitor"}</span>
                                                 </div>
                                                 {result.plate_number && (
                                                     <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                                         <span className="text-slate-450 font-bold uppercase tracking-wider">CAR PLATE:</span>
                                                         <span className="font-extrabold text-slate-700 font-mono">{result.plate_number}</span>
                                                     </div>
                                                 )}
                                                 {result.check_in_student && (
                                                     <div className="flex justify-between border-b border-slate-200 pb-1.5">
                                                         <span className="text-slate-450 font-bold uppercase tracking-wider">HOST / STUDENT:</span>
                                                         <span className="font-extrabold text-slate-700 uppercase truncate max-w-[170px]">{result.check_in_student}</span>
                                                     </div>
                                                 )}
                                             </div>
                                         </div>

                                         {/* Right-most Column */}
                                         <div className="absolute right-0 top-0 bottom-0 w-[135px] bg-gradient-to-b from-[#7A1975] to-[#9C27B0] flex items-center justify-center select-none">
                                             <span className="text-white text-[48px] font-black uppercase absolute transform -rotate-90 whitespace-nowrap tracking-[0.25em]" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                 VISITOR
                                             </span>
                                         </div>
                                    </div>

                                    {/* Printable Back Side - Visitor */}
                                    <div 
                                        id={`printable-back-${result.id}`} 
                                        className="w-[1011px] h-[638px] bg-slate-50 text-slate-800 border-2 border-slate-200 rounded-[48px] relative overflow-hidden flex flex-col items-center justify-between py-10"
                                        style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                    >
                                         <div className="absolute top-0 left-0 w-full h-[18px] bg-gradient-to-r from-[#7A1975] to-[#9C27B0]"></div>
                                         
                                         <div className="text-center px-12 mt-2">
                                             <h4 className="text-[36px] font-bold text-[#7A1975] uppercase tracking-wider leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>Visitor Access Pass</h4>
                                             <p className="text-[20px] text-slate-500 font-bold uppercase tracking-wide mt-2 leading-none">Please Keep Pass Visible at All Times</p>
                                         </div>

                                         <div className="p-2.5 bg-white border border-slate-200 shadow-sm rounded-[24px] flex items-center justify-center my-2">
                                             <QRCodeSVG 
                                                 value={result.admission_number} 
                                                 size={200} 
                                                 level="H"
                                             />
                                         </div>

                                         <div className="text-center px-16 mb-2">
                                             <p className="text-[34px] font-mono font-bold text-[#7A1975] tracking-wide leading-none">{result.admission_number}</p>
                                             <p className="text-[18px] text-slate-500 mt-3.5 font-bold uppercase leading-relaxed px-6">
                                                 This visitor pass must be returned to security office when leaving the campus premises. Thank you for cooperation.
                                             </p>
                                         </div>
                                         
                                         <div className="absolute bottom-0 left-0 w-full h-[18px] bg-gradient-to-r from-teal-500 to-emerald-600"></div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    {/* Printable Front Side */}
                                    <div 
                                        id={`printable-front-${result.id}`} 
                                        className="w-[1011px] h-[638px] bg-white border border-gray-200 rounded-[48px] relative overflow-hidden select-none"
                                        style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                    >
                                         {/* Left Column */}
                                         <div className="absolute left-[45px] top-[42px] bottom-[42px] w-[430px] flex flex-col justify-between">
                                             {/* Logo & School Name */}
                                             <div className="flex items-center gap-4">
                                                 {companySettings.logo_url ? (
                                                     <img src={companySettings.logo_url} className="h-28 w-auto max-w-[400px] object-contain" />
                                                 ) : (
                                                     <>
                                                         <div className="w-24 h-24 rounded-full bg-purple-50 flex items-center justify-center text-[#7A1975] font-bold text-3xl shrink-0 border border-purple-100">
                                                             RU
                                                         </div>
                                                         <div className="flex flex-col leading-[1.1] overflow-hidden">
                                                             <span className="text-[28px] font-bold text-[#7A1975] uppercase tracking-wide leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                                 {companySettings.company_name || "Riara University"}
                                                             </span>
                                                             <span className="text-[16px] font-bold text-gray-450 uppercase tracking-widest mt-2">
                                                                 {companySettings.tagline || "nurturing innovators"}
                                                             </span>
                                                         </div>
                                                     </>
                                                 )}
                                             </div>

                                             {/* Student Name */}
                                             <div className="flex flex-col mt-4 space-y-1">
                                                 <span className="text-[54px] font-bold text-[#7A1975] leading-[1.1] uppercase break-words" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                     {firstName}
                                                 </span>
                                                 <span className="text-[54px] font-bold text-[#7A1975] leading-[1.1] uppercase break-words" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                     {lastName}
                                                 </span>
                                             </div>

                                             {/* ID Number */}
                                             <div className="text-[30px] font-bold text-[#7A1975] uppercase mt-2 leading-none tracking-wide" style={{ fontFamily: "'Museo Sans', sans-serif" }}>
                                                 ID NO: {result.admission_number}
                                             </div>

                                             {/* QR Code */}
                                             <div className="mt-3 flex items-end">
                                                 <div className="p-1.5 bg-white border border-gray-200 rounded-[20px] shadow-sm shrink-0">
                                                     <QRCodeSVG 
                                                         value={result.admission_number} 
                                                         size={130} 
                                                         level="H"
                                                     />
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Center-Right Column */}
                                         <div className="absolute left-[490px] top-0 bottom-0 w-[385px] flex flex-col border-l border-gray-100">
                                             {/* Student Photo */}
                                             <div className="w-full h-[438px] bg-slate-50 overflow-hidden border-b border-gray-150 relative">
                                                 {result.profile_image ? (
                                                     <img src={result.profile_image} className="w-full h-full object-cover" />
                                                 ) : (
                                                     <div className="w-full h-full flex items-center justify-center p-12 bg-slate-50">
                                                         {companySettings.logo_url ? (
                                                             <img src={companySettings.logo_url} className="w-56 h-56 object-contain" />
                                                         ) : (
                                                             <div className="text-6xl font-bold text-[#7A1975]" style={{ fontFamily: "'Museo', sans-serif" }}>RU</div>
                                                         )}
                                                     </div>
                                                 )}
                                             </div>

                                             {/* Details Section */}
                                             <div className="flex-1 bg-white px-3 py-4 flex flex-col justify-center text-[25px] leading-[1.3] text-slate-800 font-sans">
                                                 <div className="flex gap-3 items-baseline">
                                                     <span className="text-[#7A1975] font-bold text-[19px] tracking-wider min-w-[155px] uppercase shrink-0">FACULTY:</span>
                                                     <span className="font-extrabold text-slate-800 break-words text-[22px]">{result.school || "School of Business"}</span>
                                                 </div>
                                                 <div className="flex gap-3 mt-2 items-baseline">
                                                     <span className="text-[#7A1975] font-bold text-[19px] tracking-wider min-w-[155px] uppercase shrink-0">COURSE:</span>
                                                     <span className="font-extrabold text-slate-800 break-words text-[22px]">{result.program || ""}</span>
                                                 </div>
                                                 <div className="flex gap-3 mt-2 items-baseline">
                                                     <span className="text-[#7A1975] font-bold text-[19px] tracking-wider min-w-[155px] uppercase shrink-0">VALIDITY:</span>
                                                     <span className="font-extrabold text-slate-800 break-words text-[22px]">
                                                         {result.expiry_date ? new Date(result.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : ""}
                                                     </span>
                                                 </div>
                                             </div>
                                         </div>

                                         {/* Right-most Column */}
                                         <div className="absolute right-0 top-0 bottom-0 w-[135px] bg-[#7A1975] flex items-center justify-center select-none">
                                             <span className="text-white text-[54px] font-bold uppercase absolute transform -rotate-90 whitespace-nowrap tracking-[0.25em]" style={{ fontFamily: "'Museo', sans-serif" }}>
                                                 STUDENT
                                             </span>
                                         </div>
                                    </div>

                                    {/* Printable Back Side */}
                                    <div 
                                        id={`printable-back-${result.id}`} 
                                        className="w-[1011px] h-[638px] bg-white border border-gray-200 rounded-[48px] relative overflow-hidden flex flex-col items-center justify-between py-10"
                                        style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
                                    >
                                         <div className="absolute top-0 left-0 w-full h-[18px] bg-[#7A1975]"></div>
                                         
                                         <div className="text-center px-12 mt-2">
                                             <h4 className="text-[36px] font-bold text-gray-800 uppercase tracking-wider leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>Security & Access Control</h4>
                                             <p className="text-[20px] text-gray-400 font-bold uppercase tracking-wide mt-2 leading-none">Verification Required for Campus Entry</p>
                                         </div>

                                         <div className="p-2.5 bg-white border border-gray-150 shadow-sm rounded-[24px] flex items-center justify-center my-2">
                                             <QRCodeSVG 
                                                 value={result.admission_number} 
                                                 size={200} 
                                                 level="H"
                                             />
                                         </div>

                                         <div className="text-center px-16 mb-2">
                                             <p className="text-[34px] font-bold text-[#7A1975] tracking-wide leading-none" style={{ fontFamily: "'Museo Sans', sans-serif" }}>{result.admission_number}</p>
                                             <p className="text-[18px] text-gray-400 mt-3.5 font-bold uppercase leading-relaxed px-6">
                                                 This card is the property of {companySettings.company_name || "the university"}. If found, please return it to the University Security Office.
                                             </p>
                                         </div>

                                        <div className="absolute bottom-[35px] right-[45px] opacity-5 pointer-events-none">
                                            {companySettings.logo_url && (
                                                <img src={companySettings.logo_url} className="w-36 h-36 object-contain grayscale" />
                                            )}
                                        </div>
                                        
                                        <div className="absolute bottom-0 left-0 w-full h-[18px] bg-[#7A1975]"></div>
                                    </div>
                                </>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>
    )
}

function PrintableIDCardFront({ student, companySettings }: any) { return null; }
function PrintableIDCardBack({ student, companySettings }: any) { return null; }
