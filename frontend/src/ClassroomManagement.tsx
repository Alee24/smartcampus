import { useState, useEffect } from 'react'
import {
    Building, QrCode, RefreshCw, Clock,
    CheckCircle, AlertCircle, Activity, MapPin, Wifi, XCircle, Printer
} from 'lucide-react'
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { QRCodeCanvas } from 'qrcode.react';

interface Classroom {
    id: string
    room_code: string
    room_name: string
    building: string
    floor: string
    capacity: number
    qr_code?: string
    last_attendance?: string
    last_student?: string
    last_student_adm?: string
    current_class?: string
    total_scans_today?: number
    is_active?: boolean
    amenities?: string[]
}

interface PrintableRoom {
    room_code: string;
    room_name: string;
    building: string;
    floor: number | string;
    capacity: number;
    qr_content: string;
    schedule: string[];
}

export default function ClassroomManagement() {
    const [classrooms, setClassrooms] = useState<Classroom[]>([])
    const [printableRooms, setPrintableRooms] = useState<PrintableRoom[]>([])
    const [loading, setLoading] = useState(true)
    const [generating, setGenerating] = useState(false)
    const [downloading, setDownloading] = useState(false)
    const [editingRoom, setEditingRoom] = useState<Classroom | null>(null)
    const [amenityOptions, setAmenityOptions] = useState<string[]>([])
    // Mode switched to inline, so showEditModal is deprecated/removed logic
    const [showEditModal, setShowEditModal] = useState(false)

    // Stats
    const [stats, setStats] = useState({
        total: 0,
        active: 0,
        inactive: 0,
        with_qr: 0
    })

    useEffect(() => {
        fetchClassrooms()
        fetchAmenityOptions()
        fetchPrintableData() // Fetch rich data for PDFs

        // Auto-refresh every 2 seconds for near real-time updates
        const interval = setInterval(fetchClassrooms, 2000)
        return () => clearInterval(interval)
    }, [])

    const fetchClassrooms = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/classrooms-detailed', {
                headers: { 'Authorization': `Bearer ${token}` }
            })

            if (res.ok) {
                const data = await res.json()
                setClassrooms(data.classrooms || [])
                setStats(data.stats || {
                    total: data.classrooms?.length || 0,
                    active: data.classrooms?.filter((r: Classroom) => r.is_active).length || 0,
                    inactive: data.classrooms?.filter((r: Classroom) => !r.is_active).length || 0,
                    with_qr: data.classrooms?.filter((r: Classroom) => r.qr_code).length || 0
                })
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchPrintableData = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/attendance/room-qr-list', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setPrintableRooms(data)
            }
        } catch (e) {
            console.error("Failed to fetch printable data", e)
        }
    }

    const generateAllQRCodes = async () => {
        setGenerating(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/generate-all-qr', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            })

            if (res.ok) {
                const data = await res.json()
                alert(`✓ Generated ${data.generated} QR codes successfully!`)
                fetchClassrooms() // Refresh UI
                fetchPrintableData() // Refresh printable data
            } else {
                const error = await res.json()
                alert(`Failed: ${error.detail || 'Unknown error'}`)
            }
        } catch (e) {
            console.error(e)
            alert('Error generating QR codes')
        } finally {
            setGenerating(false)
        }
    }

    const deactivateAll = async () => {
        if (!confirm("⚠️ Are you sure you want to DEACTIVATE all classrooms?\n\nThis will remove existing QR codes and prevent students from scanning attendance until you Activate again.")) return

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/deactivate-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            })

            if (res.ok) {
                const data = await res.json()
                alert(`✓ System Deactivated: QR codes removed from ${data.deactivated} classrooms.`)
                fetchClassrooms()
            } else {
                alert("Failed to deactivate system")
            }
        } catch (e) {
            console.error(e)
            alert("Error deactivating system")
        }
    }

    const fetchAmenityOptions = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/timetable/amenities/options', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setAmenityOptions(data.amenities)
            }
        } catch (err) {
            console.error(err)
        }
    }

    // --- PDF Poster Generator (Matches LiveClasses.tsx) ---
    const generatePosters = async (targets: PrintableRoom[]) => {
        if (targets.length === 0) {
            alert("No data available to print. Please regenerate QR codes first.")
            return
        }

        setDownloading(true)
        try {
            const token = localStorage.getItem('token');

            // 1. Fetch Company Settings (Logo)
            let companyLogo = null;
            let companyName = "Smart Campus";
            try {
                const settingsRes = await fetch('/api/admin/company-settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (settingsRes.ok) {
                    const cType = settingsRes.headers.get("content-type");
                    if (cType && cType.includes("application/json")) {
                        const settings = await settingsRes.json();
                        if (settings.logo_url) {
                            companyLogo = await new Promise<string>((resolve) => {
                                const img = new Image();
                                img.crossOrigin = "Anonymous";
                                img.onload = () => {
                                    const canvas = document.createElement('canvas');
                                    canvas.width = img.width;
                                    canvas.height = img.height;
                                    const ctx = canvas.getContext('2d');
                                    ctx?.drawImage(img, 0, 0);
                                    resolve(canvas.toDataURL('image/png'));
                                };
                                img.onerror = () => resolve("");
                                img.src = settings.logo_url;
                            });
                        }
                        if (settings.company_name) companyName = settings.company_name;
                    }
                }
            } catch (e) {
                console.warn("Using default branding", e);
            }

            // 2. Setup PDF (A3 Landscape)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a3'
            });

            const pageWidth = 420;
            const pageHeight = 297;
            const margin = 20;

            let isFirstPage = true;

            for (const room of targets) {
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;

                // Layout: Split Screen
                // Background
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');

                // Left Panel Background
                pdf.setFillColor(249, 250, 251);
                pdf.rect(0, 0, pageHeight, pageHeight, 'F');

                // QR Generation
                const content = room.qr_content ? `${window.location.origin}${room.qr_content}` : `${window.location.origin}/?room=${room.room_code}`;
                const qrDataUrl = await QRCode.toDataURL(content, {
                    width: 1000,
                    margin: 1,
                    color: { dark: '#000000', light: '#00000000' }
                });

                const qrSize = pageHeight * 0.85;
                const qrMargin = (pageHeight - qrSize) / 2;
                pdf.addImage(qrDataUrl, 'PNG', qrMargin, qrMargin, qrSize, qrSize);

                // --- Right Side Content ---
                const startX = pageHeight + margin;
                const contentWidth = pageWidth - pageHeight - (margin * 2);
                let currentY = margin;

                // Logo/Name
                if (companyLogo) {
                    const logoSize = 30;
                    pdf.addImage(companyLogo, 'PNG', startX, currentY, logoSize, logoSize);
                    pdf.setFontSize(24);
                    pdf.setFont('helvetica', 'bold');
                    pdf.setTextColor(55, 65, 81);
                    pdf.text(companyName, startX + logoSize + 10, currentY + 12);
                    pdf.setFontSize(12);
                    pdf.setTextColor(107, 114, 128);
                    pdf.setFont('helvetica', 'normal');
                    pdf.text("Smart Attendance System", startX + logoSize + 10, currentY + 22);
                    currentY += logoSize + 20;
                } else {
                    currentY += 20;
                }

                // Room Details
                pdf.setFontSize(80);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(17, 24, 39);
                pdf.text(room.room_code, startX, currentY + 15);
                currentY += 35;

                pdf.setFontSize(32);
                pdf.setTextColor(75, 85, 99);
                pdf.text(room.room_name, startX, currentY);
                currentY += 15;

                pdf.setFontSize(18);
                pdf.setTextColor(107, 114, 128);
                pdf.text(`${room.building} • ${room.floor} • Cap: ${room.capacity}`, startX, currentY);
                currentY += 30;

                // Schedule
                pdf.setDrawColor(229, 231, 235);
                pdf.setLineWidth(1);
                pdf.line(startX, currentY, startX + contentWidth, currentY);
                currentY += 20;

                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(79, 70, 229);
                pdf.text("SCHEDULED CLASSES", startX, currentY);
                currentY += 15;

                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(55, 65, 81);

                // Calculate available space to avoid overlap with footer
                // Footer starts approx at pageHeight - margin - 15
                const footerStart = pageHeight - margin - 15;
                const itemHeight = 10;
                const availableHeight = footerStart - currentY - 10; // -10 for buffer
                const calculatedMaxItems = Math.floor(availableHeight / itemHeight);
                const maxItems = Math.min(calculatedMaxItems, 7); // Cap at 7 for aesthetics

                if (room.schedule && room.schedule.length > 0) {
                    room.schedule.slice(0, maxItems).forEach((slot: string) => {
                        // Format: "Mon 08:00 • CODE" -> Bold Day/Time, Normal Code?
                        // For now keep simple but ensure no overlap
                        pdf.text(`• ${slot}`, startX, currentY);
                        currentY += itemHeight;
                    });
                    if (room.schedule.length > maxItems) {
                        pdf.setTextColor(156, 163, 175);
                        pdf.text(`+ ${room.schedule.length - maxItems} more sessions...`, startX, currentY);
                    }
                } else {
                    pdf.setTextColor(156, 163, 175);
                    pdf.text("No fixed classes scheduled.", startX, currentY);
                    pdf.text("Room available for open study", startX, currentY + 10);
                }

                // Footer
                const footerY = pageHeight - margin - 10;
                pdf.setFontSize(10); // Slightly smaller to be less intrusive
                pdf.setTextColor(156, 163, 175); // Lighter gray
                pdf.text("Scan the QR code on the left to mark attendance.", startX, footerY);
                pdf.text("Ensure GPS and Camera permissions are enabled.", startX, footerY + 5);
            }

            const fileName = targets.length === 1
                ? `Poster_${targets[0].room_code}.pdf`
                : `Classroom_Posters_All_${new Date().toISOString().split('T')[0]}.pdf`;

            pdf.save(fileName);

        } catch (error: any) {
            console.error('Error generating posters:', error);
            alert(`Failed: ${error.message}`);
        } finally {
            setDownloading(false);
        }
    }

    const downloadSinglePoster = (roomCode: string) => {
        const target = printableRooms.find(r => r.room_code === roomCode);
        if (target) {
            generatePosters([target]);
        } else {
            // Fallback if not found in printable list (should rarely happen if synced)
            alert("Poster data not ready yet. Please try generating all QRs first.");
        }
    }

    const handleEditRoom = (room: Classroom) => {
        setEditingRoom(room)
        // setShowEditModal(true) // Removed to prevent double modal/inline issue
    }

    const handleUpdateRoom = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingRoom) return

        try {
            const token = localStorage.getItem('token')
            const formData = new FormData(e.target as HTMLFormElement)

            const updateData = {
                room_name: formData.get('room_name'),
                building: formData.get('building'),
                floor: formData.get('floor'),
                capacity: parseInt(formData.get('capacity') as string)
            }

            const res = await fetch(`/api/timetable/classrooms/${editingRoom.id}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(updateData)
            })

            if (res.ok) {
                alert('✓ Room updated successfully!')
                setShowEditModal(false)
                setEditingRoom(null)
                fetchClassrooms()
            } else {
                alert('Failed to update room')
            }
        } catch (e) {
            console.error(e)
            alert('Error updating room')
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <RefreshCw className="animate-spin mx-auto mb-4" size={48} />
                    <p>Loading classrooms...</p>
                </div>
            </div>
        )
    }

    const latestActive = [...classrooms]
        .filter(c => c.is_active)
        .sort((a, b) => {
            const timeA = new Date(a.last_attendance || 0).getTime()
            const timeB = new Date(b.last_attendance || 0).getTime()
            return timeB - timeA
        })
        .slice(0, 3)

    return (
        <div className="p-4 md:p-8 animate-fade-in">
            {/* Header */}
            <div className="mb-8">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                            <Building className="text-blue-600" size={32} />
                            Classroom Management
                        </h1>
                        <p className="text-[var(--text-secondary)]">
                            Activate classrooms for scanning or deactivate to stop attendance.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        <button
                            onClick={deactivateAll}
                            className="flex items-center gap-2 px-4 py-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all border border-red-200 dark:border-red-800"
                            title="Remove all QR codes"
                        >
                            <AlertCircle size={20} />
                            Deactivate All
                        </button>

                        <button
                            onClick={generateAllQRCodes}
                            disabled={generating}
                            className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all"
                        >
                            {generating ? (
                                <>
                                    <RefreshCw className="animate-spin" size={20} />
                                    Activating...
                                </>
                            ) : (
                                <>
                                    <CheckCircle size={20} />
                                    Activate All (Generate QRs)
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => generatePosters(printableRooms)}
                            disabled={downloading || printableRooms.length === 0}
                            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50 transition-all"
                        >
                            {downloading ? (
                                <>
                                    <RefreshCw className="animate-spin" size={20} />
                                    PDF...
                                </>
                            ) : (
                                <>
                                    <Printer size={20} />
                                    Download All Posters
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <div className="glass-card p-6 border-l-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] font-medium">Total Rooms</p>
                            <p className="text-3xl font-bold mt-1">{stats.total}</p>
                        </div>
                        <Building className="text-blue-500" size={32} />
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-green-500 relative overflow-hidden">
                    <div className="flex items-start justify-between relative z-10">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] font-medium">Active Today</p>
                            <p className="text-3xl font-bold mt-1 text-green-600">{stats.active}</p>

                            {latestActive.length > 0 && (
                                <div className="mt-4 flex flex-col gap-1.5">
                                    <p className="text-[10px] font-bold text-green-800 dark:text-green-200 uppercase tracking-widest opacity-70">
                                        Latest Activity
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {latestActive.map(room => (
                                            <span
                                                key={room.id}
                                                className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-black px-2 py-1 rounded shadow-sm border border-green-200 dark:border-green-800 animate-pulse"
                                                style={{ animationDuration: '3s' }}
                                            >
                                                {room.room_code}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                        <Activity className="text-green-500" size={32} />
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-red-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] font-medium">Inactive</p>
                            <p className="text-3xl font-bold mt-1 text-red-600">{stats.inactive}</p>
                        </div>
                        <AlertCircle className="text-red-500" size={32} />
                    </div>
                </div>

                <div className="glass-card p-6 border-l-4 border-purple-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)] font-medium">With QR Codes</p>
                            <p className="text-3xl font-bold mt-1 text-purple-600">{stats.with_qr}</p>
                        </div>
                        <QrCode className="text-purple-500" size={32} />
                    </div>
                </div>
            </div>

            {/* Classrooms Grid (Sorted by Usage) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative">
                {[...classrooms]
                    .sort((a, b) => {
                        // Priority: Most scans -> Active -> Recent -> Alphabetical
                        const scansA = a.total_scans_today || 0
                        const scansB = b.total_scans_today || 0
                        if (scansA !== scansB) return scansB - scansA

                        if (a.is_active && !b.is_active) return -1
                        if (!a.is_active && b.is_active) return 1

                        const timeA = new Date(a.last_attendance || 0).getTime()
                        const timeB = new Date(b.last_attendance || 0).getTime()
                        if (timeA !== timeB) return timeB - timeA

                        return a.room_code.localeCompare(b.room_code)
                    })
                    .map((room) => {
                        const isEditing = editingRoom?.id === room.id

                        return (
                            <div
                                key={room.id}
                                className={`glass-card border-2 transition-all duration-500 relative overflow-hidden ${isEditing ? 'col-span-full lg:col-span-2' : ''
                                    } ${room.is_active
                                        ? 'border-green-500 bg-green-50 dark:bg-green-900/10 shadow-[0_0_40px_-10px_rgba(34,197,94,0.4)] order-first scale-100 z-10'
                                        : 'border-red-200 dark:border-red-800 bg-opacity-50'
                                    }`}
                            >
                                {/* Live Indicator Overlay */}
                                {room.is_active && (
                                    <div className="absolute top-0 right-0 p-4 z-20">
                                        <span className="relative flex h-3 w-3">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                                        </span>
                                    </div>
                                )}

                                {!isEditing ? (
                                    /* View Mode */
                                    <div className="p-6 cursor-pointer" onClick={() => handleEditRoom(room)}>
                                        {/* Header */}
                                        <div className="flex items-start justify-between mb-4 relative z-10">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="text-2xl font-black tracking-tight">{room.room_code}</h3>
                                                    {room.is_active ? (
                                                        <span className="px-2 py-0.5 bg-green-600 text-white text-[10px] font-black uppercase tracking-widest rounded-md shadow-sm animate-pulse">
                                                            LIVE
                                                        </span>
                                                    ) : (
                                                        <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 text-[10px] font-bold uppercase tracking-widest rounded-md border border-gray-200 dark:border-gray-700">
                                                            IDLE
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm font-medium text-[var(--text-secondary)]">{room.room_name}</p>
                                            </div>
                                            {(room.qr_code || printableRooms.find(p => p.room_code === room.room_code)) && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); downloadSinglePoster(room.room_code); }}
                                                    className="p-2 bg-gray-50 dark:bg-gray-800 hover:bg-gray-200 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 group/btn"
                                                    title="Download Poster PDF"
                                                >
                                                    <Printer size={16} className="group-hover/btn:text-indigo-600" />
                                                </button>
                                            )}
                                        </div>

                                        {/* Active Session Highlight Card */}
                                        {room.is_active && (
                                            <div className="mb-6 p-4 bg-green-100/80 dark:bg-green-900/40 rounded-2xl border border-green-200 dark:border-green-800 animate-in slide-in-from-bottom-2 fade-in duration-500">
                                                <div className="flex items-center gap-2 text-green-700 dark:text-green-300 font-bold text-xs uppercase tracking-widest mb-2 opacity-80">
                                                    <Wifi size={14} className="animate-pulse" /> Active Session
                                                </div>
                                                <p className="font-extrabold text-xl leading-tight mb-3 text-green-900 dark:text-green-100 tracking-tight">
                                                    {room.current_class || "Ad-hoc Scan"}
                                                </p>
                                                <div className="grid grid-cols-2 gap-2 border-t border-green-200 dark:border-green-800 pt-3">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase mb-0.5">Scanned By</span>
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                                                            <span className="text-sm font-mono font-black">{room.last_student_adm || "N/A"}</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] text-green-600 dark:text-green-400 font-bold uppercase mb-0.5">Total Today</span>
                                                        <span className="text-sm font-mono font-black">{room.total_scans_today}</span>
                                                    </div>
                                                </div>
                                                <div className="mt-3 flex justify-center">
                                                    <span className="text-xs font-bold text-green-700 dark:text-green-300 bg-white/50 dark:bg-black/20 px-3 py-1 rounded-full flex items-center gap-2">
                                                        <Clock size={12} /> {new Date(room.last_attendance || Date.now()).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Details (Only show if not active to reduce clutter, or minimal) */}
                                        {!room.is_active && (
                                            <div className="space-y-3 mb-6">
                                                <div className="flex items-center gap-3 text-xs font-medium text-[var(--text-secondary)]">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center">
                                                        <MapPin size={14} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="uppercase text-[10px] font-bold opacity-50">Location</span>
                                                        <span>{room.building} • Flr {room.floor}</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3 text-xs font-medium text-[var(--text-secondary)]">
                                                    <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-color)] flex items-center justify-center">
                                                        <Activity size={14} />
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="uppercase text-[10px] font-bold opacity-50">Usage</span>
                                                        <span>{room.total_scans_today || 0} Scans Today</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* QR Code */}
                                        {!room.is_active && (
                                            <div className="mt-auto group" onClick={(e) => { e.stopPropagation(); downloadSinglePoster(room.room_code); }}>
                                                <div className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm group-hover:shadow-md transition-all relative flex justify-center items-center">
                                                    <QRCodeCanvas
                                                        value={`${window.location.origin}/?room=${room.room_code}`}
                                                        size={120}
                                                        level="H"
                                                        includeMargin={true}
                                                        className="opacity-80 group-hover:opacity-100 transition-opacity"
                                                    />
                                                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10 rounded-xl">
                                                        <Printer className="text-black drop-shadow-sm" size={24} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        <div className="mt-4 text-center text-xs text-[var(--text-secondary)] opacity-60">
                                            Click to edit details
                                        </div>
                                    </div>
                                ) : (
                                    /* Edit Mode */
                                    <form onSubmit={handleUpdateRoom} className="p-6">
                                        <div className="flex justify-between items-center mb-6">
                                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Edit {room.room_code}</h3>
                                            <button
                                                type="button"
                                                onClick={() => setEditingRoom(null)}
                                                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                                            >
                                                <XCircle size={20} />
                                            </button>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-4">
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Room Code</label>
                                                <input
                                                    name="room_code"
                                                    type="text"
                                                    defaultValue={room.room_code}
                                                    required
                                                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. LAB-101"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Room Name</label>
                                                <input
                                                    name="room_name"
                                                    defaultValue={room.room_name}
                                                    required
                                                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. Computer Lab 1"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Building</label>
                                                <input
                                                    name="building"
                                                    defaultValue={room.building}
                                                    required
                                                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. Main"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Floor</label>
                                                <input
                                                    name="floor"
                                                    defaultValue={room.floor}
                                                    required
                                                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. 2"
                                                />
                                            </div>

                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Capacity</label>
                                                <input
                                                    name="capacity"
                                                    type="number"
                                                    defaultValue={room.capacity}
                                                    required
                                                    min="1"
                                                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                                    placeholder="e.g. 50"
                                                />
                                            </div>

                                            {/* Amenities */}
                                            <div className="md:col-span-2">
                                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-3">Amenities</label>
                                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                                    {amenityOptions.map((amenity) => (
                                                        <label key={amenity} className="flex items-center gap-2 p-2 rounded-lg hover:bg-[var(--bg-surface)] cursor-pointer transition-colors">
                                                            <input
                                                                type="checkbox"
                                                                name="amenities"
                                                                value={amenity}
                                                                defaultChecked={room.amenities?.includes(amenity)}
                                                                className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                                                            />
                                                            <span className="text-sm text-[var(--text-primary)]">{amenity}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>

                                            <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                                    <strong>Usage Stats:</strong> {room.total_scans_today || 0} scans today
                                                </p>
                                                {room.last_attendance && (
                                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                                        Last scan: {new Date(room.last_attendance).toLocaleString()}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border-color)]">
                                            <button
                                                type="button"
                                                onClick={() => { setEditingRoom(null); setShowEditModal(false); }}
                                                className="px-6 py-3 rounded-xl text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-primary)] transition-all"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="px-8 py-3 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-1"
                                            >
                                                Update Room
                                            </button>
                                        </div>
                                    </form>
                                )}
                            </div>
                        )
                    })}
            </div>

            {/* Empty State */}
            {classrooms.length === 0 && (
                <div className="text-center py-20">
                    <Building className="mx-auto mb-4 text-gray-400" size={64} />
                    <h3 className="text-xl font-bold mb-2">No Classrooms Found</h3>
                    <p className="text-[var(--text-secondary)] mb-4">
                        Upload classrooms using the Data Import page
                    </p>
                </div>
            )}

            {/* Info Box */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                <h3 className="font-bold text-blue-900 dark:text-blue-100 mb-2">💡 How It Works</h3>
                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <li>• <strong>Green rooms</strong> have recorded attendance recently (active)</li>
                    <li>• <strong>Red/Gray rooms</strong> have no recent activity (inactive)</li>
                    <li>• <strong>Click any room card</strong> to edit its details (name, building, floor, capacity)</li>
                    <li>• <strong>Rooms are sorted</strong> by most scans today (most used first)</li>
                    <li>• Click "Activate All" to generate secure network QR codes for all rooms.</li>
                    <li>• Use "Download All Posters" to get high-quality A3 PDF posters for printing.</li>
                </ul>
            </div>

            {/* Edit Room Modal */}
            {showEditModal && editingRoom && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto" onClick={() => setShowEditModal(false)}>
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] w-full max-w-lg rounded-2xl shadow-2xl animate-fade-in my-8 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex-shrink-0 p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[image:var(--gradient-primary)] text-white rounded-t-2xl">
                            <h3 className="text-2xl font-bold">Edit Classroom</h3>
                            <button onClick={() => setShowEditModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleUpdateRoom} className="p-6 space-y-4 overflow-y-auto flex-1">
                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Room Code</label>
                                <input
                                    type="text"
                                    value={editingRoom.room_code}
                                    disabled
                                    className="w-full p-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-[var(--border-color)] text-[var(--text-secondary)] cursor-not-allowed"
                                />
                                <p className="text-xs text-[var(--text-secondary)] mt-1">Room code cannot be changed</p>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Room Name</label>
                                <input
                                    name="room_name"
                                    defaultValue={editingRoom.room_name}
                                    required
                                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="e.g. Computer Lab 1"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Building</label>
                                    <input
                                        name="building"
                                        defaultValue={editingRoom.building}
                                        required
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. Main"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Floor</label>
                                    <input
                                        name="floor"
                                        defaultValue={editingRoom.floor}
                                        required
                                        className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                        placeholder="e.g. 2"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Capacity</label>
                                <input
                                    name="capacity"
                                    type="number"
                                    defaultValue={editingRoom.capacity}
                                    required
                                    min="1"
                                    className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none"
                                    placeholder="e.g. 50"
                                />
                            </div>

                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border border-blue-200 dark:border-blue-800">
                                <p className="text-sm text-blue-800 dark:text-blue-200">
                                    <strong>Usage Stats:</strong> {editingRoom.total_scans_today || 0} scans today
                                </p>
                                {editingRoom.last_attendance && (
                                    <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                                        Last scan: {new Date(editingRoom.last_attendance).toLocaleString()}
                                    </p>
                                )}
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)] flex-shrink-0 sticky bottom-0 bg-[var(--bg-surface)] -mx-6 px-6 pb-2">
                                <button
                                    type="button"
                                    onClick={() => setShowEditModal(false)}
                                    className="px-6 py-3 rounded-xl text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-primary)] transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-1"
                                >
                                    Update Room
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
