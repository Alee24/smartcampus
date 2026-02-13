import React, { useEffect, useState } from 'react';
import { Clock, MapPin, Users, Activity, MonitorPlay, Printer, Download, BarChart2, School, UserCheck } from 'lucide-react';
import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';

export default function LiveClasses({ fullScreen = false }: { fullScreen?: boolean }) {
    const [sessions, setSessions] = useState<any[]>([]);
    const [prevStudentCounts, setPrevStudentCounts] = useState<Record<string, number>>({});
    const [flashingCards, setFlashingCards] = useState<Set<string>>(new Set());
    const [stats, setStats] = useState({
        totalStudents: 0,
        activeRooms: 0,
        totalRooms: 0,
        utilization: 0,
        busiestBuilding: "N/A"
    });
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [activating, setActivating] = useState(false);

    const fetchLive = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/attendance/live-monitor', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            let currentSessions = [];
            if (res.ok) {
                currentSessions = await res.json();

                // 1. Sort by Last Activity (Newest First) -> Pop to Top
                currentSessions.sort((a: any, b: any) => {
                    const timeA = a.last_activity ? new Date(a.last_activity).getTime() : 0;
                    const timeB = b.last_activity ? new Date(b.last_activity).getTime() : 0;
                    return timeB - timeA;
                });

                // 2. Check for changes in student count to trigger flash
                const newCounts: Record<string, number> = {};
                const newFlashing = new Set(flashingCards); // Keep existing flashes that haven't expired

                let hasNewFlash = false;
                currentSessions.forEach((s: any) => {
                    newCounts[s.session_id] = s.students;
                    // If count increased, trigger flash
                    if (prevStudentCounts[s.session_id] !== undefined && s.students > prevStudentCounts[s.session_id]) {
                        newFlashing.add(s.session_id);
                        hasNewFlash = true;
                        // Auto-remove flash class after animation completes (1s)
                        setTimeout(() => {
                            setFlashingCards(prev => {
                                const next = new Set(prev);
                                next.delete(s.session_id);
                                return next;
                            });
                        }, 1000);
                    }
                });

                if (hasNewFlash) setFlashingCards(newFlashing);
                setPrevStudentCounts(newCounts);
                setSessions(currentSessions);
            }

            // Stats Logic (Unchanged)
            let totalRooms = stats.totalRooms;
            if (totalRooms === 0) {
                const roomRes = await fetch('/api/attendance/room-qr-list', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (roomRes.ok) {
                    const rooms = await roomRes.json();
                    totalRooms = rooms.length;
                }
            }

            const totalStudents = currentSessions.reduce((acc: number, s: any) => acc + (s.students || 0), 0);
            const activeRooms = currentSessions.length;
            const utilization = totalRooms > 0 ? Math.round((activeRooms / totalRooms) * 100) : 0;
            const busiestBuilding = currentSessions.length > 0 ? "Main Campus" : "None";

            setStats({
                totalStudents,
                activeRooms,
                totalRooms,
                utilization,
                busiestBuilding
            });

        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const generateRoomQRCodes = async () => {
        setGenerating(true);
        try {
            const token = localStorage.getItem('token');

            // 1. Fetch Room List with Strict Error Handling
            const res = await fetch('/api/attendance/room-qr-list', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!res.ok) {
                const errText = await res.text();
                // Check if it's HTML (Vite Fallback)
                if (errText.trim().startsWith("<!DOCTYPE html>")) {
                    throw new Error("Server Route Not Found (404). API endpoint missing.");
                }
                throw new Error(`Server Error (${res.status}): ${errText.substring(0, 100)}`);
            }

            // Verify JSON content type
            const contentType = res.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                const badText = await res.text();
                console.error("Non-JSON Response:", badText);
                throw new Error("Invalid Server Response. Expected JSON, got Text/HTML.");
            }

            const rooms = await res.json();
            if (!rooms || rooms.length === 0) {
                alert('No classrooms found.');
                return;
            }

            // 2. Fetch Company Settings (Logo)
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

            console.log(`Generating QR codes for ${rooms.length} classrooms...`);

            // 3. Setup PDF (A3 Landscape)
            // A3 Landscape: 420mm (W) x 297mm (H)
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a3'
            });

            const pageWidth = 420;
            const pageHeight = 297;
            const margin = 20;

            let isFirstPage = true;

            for (const room of rooms) {
                if (!isFirstPage) pdf.addPage();
                isFirstPage = false;

                // --- Layout: Split Screen ---
                // Left: QR Code (Maximized)
                // Right: Info & Schedule

                // Background
                pdf.setFillColor(255, 255, 255);
                pdf.rect(0, 0, pageWidth, pageHeight, 'F');

                // Left Panel Background (Optional Light Color?)
                pdf.setFillColor(249, 250, 251);
                pdf.rect(0, 0, pageHeight, pageHeight, 'F'); // Square on left

                // QR Generation
                const content = room.qr_content ? `${window.location.origin}${room.qr_content}` : `${window.location.origin}/?room=${room.room_code}`;
                const qrDataUrl = await QRCode.toDataURL(content, {
                    width: 1000,
                    margin: 1,
                    color: { dark: '#000000', light: '#00000000' } // Transparent bg
                });

                // QR Size: 90% of Height (297mm) -> ~267mm
                const qrSize = pageHeight * 0.85;
                const qrMargin = (pageHeight - qrSize) / 2;

                pdf.addImage(qrDataUrl, 'PNG', qrMargin, qrMargin, qrSize, qrSize);

                // --- Right Side Content ---
                const startX = pageHeight + margin; // Start after the square
                const contentWidth = pageWidth - pageHeight - (margin * 2);
                let currentY = margin;

                // 1. Logo & Company Name
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

                // 2. Room Identity
                pdf.setFontSize(80);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(17, 24, 39); // Dark Gray
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

                // 3. Divider
                pdf.setDrawColor(229, 231, 235);
                pdf.setLineWidth(1);
                pdf.line(startX, currentY, startX + contentWidth, currentY);
                currentY += 20;

                // 4. Schedule / Time Allocations
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(79, 70, 229); // Indigo
                pdf.text("SCHEDULED CLASSES", startX, currentY);
                currentY += 15;

                pdf.setFontSize(14);
                pdf.setFont('helvetica', 'normal');
                pdf.setTextColor(55, 65, 81);

                if (room.schedule && room.schedule.length > 0) {
                    // Limit to fit page
                    const maxItems = 12;
                    room.schedule.slice(0, maxItems).forEach((slot: string) => {
                        pdf.text(`• ${slot}`, startX, currentY);
                        currentY += 10;
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

                // Footer Instructions (Bottom Right)
                const footerY = pageHeight - margin - 10;
                pdf.setFontSize(12);
                pdf.setTextColor(107, 114, 128);
                pdf.text("Scan the QR code on the left to mark attendance.", startX, footerY);
                pdf.text("Ensure GPS and Camera permissions are enabled.", startX, footerY + 6);

            }

            pdf.save(`Classroom_Posters_A3_${new Date().toISOString().split('T')[0]}.pdf`);

        } catch (error: any) {
            console.error('Error generating QR codes:', error);
            alert(`Failed: ${error.message}`);
        } finally {
            setGenerating(false);
        }
    };

    const activateAllClasses = async () => {
        setActivating(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/attendance/sessions/activate-all', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!res.ok) {
                throw new Error(`Failed to activate classes: ${res.status}`);
            }

            const result = await res.json();

            if (result.status === 'success') {
                alert(`✅ Successfully activated ${result.activated} classes!\n\n` +
                    `Already Active: ${result.already_active}\n` +
                    `Total Scheduled Today: ${result.total_scheduled}`);
                // Refresh the live monitor
                fetchLive();
            } else if (result.status === 'no_classes') {
                alert('ℹ️ No classes scheduled for today.');
            }
        } catch (error: any) {
            console.error('Error activating classes:', error);
            alert(`❌ Failed to activate classes: ${error.message}`);
        } finally {
            setActivating(false);
        }
    };

    useEffect(() => {
        fetchLive();
        const interval = setInterval(fetchLive, 3000);
        return () => clearInterval(interval);
    }, []);

    if (loading && sessions.length === 0) return (
        <div className={`p-6 animate-pulse ${fullScreen ? '' : 'glass-card'}`}>
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className={`gap-4 ${fullScreen ? 'grid grid-cols-3' : 'space-y-3'}`}>
                <div className="h-32 bg-gray-100 rounded-xl"></div>
                <div className="h-32 bg-gray-100 rounded-xl"></div>
                {fullScreen && <div className="h-32 bg-gray-100 rounded-xl"></div>}
            </div>
        </div>
    );

    const containerClasses = fullScreen
        ? "p-4 md:p-8 animate-fade-in w-full"
        : "glass-card p-6 animate-fade-in relative overflow-hidden h-full";

    const gridClasses = fullScreen
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
        : "space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar";

    return (
        <div className={containerClasses}>
            {/* Header with Generate Button */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                <div>
                    <h3 className={`${fullScreen ? 'text-3xl' : 'text-lg'} font-bold flex items-center gap-3 text-[var(--text-primary)]`}>
                        <div className={`p-2 rounded-lg ${fullScreen ? 'bg-indigo-100 text-indigo-600' : ''}`}>
                            <MonitorPlay className={fullScreen ? "text-indigo-600" : "text-green-500 animate-pulse"} size={fullScreen ? 32 : 20} />
                        </div>
                        Live Classes Monitor
                    </h3>
                    <p className={`${fullScreen ? 'text-base mt-2' : 'text-xs'} text-[var(--text-secondary)]`}>
                        Real-time tracking of all active sessions across campus.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {fullScreen && (
                        <>
                            <button
                                onClick={activateAllClasses}
                                disabled={activating}
                                className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {activating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Activating...
                                    </>
                                ) : (
                                    <>
                                        <Activity size={20} />
                                        Activate All Classes
                                    </>
                                )}
                            </button>
                            <button
                                onClick={generateRoomQRCodes}
                                disabled={generating}
                                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {generating ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Printer size={20} />
                                        Generate Room QR Codes
                                    </>
                                )}
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* ENHANCED STATISTICS ROW (ONLY IN FULLSCREEN) */}
            {fullScreen && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="glass-card p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Total Students</p>
                            <p className="text-2xl font-bold text-green-600">{stats.totalStudents}</p>
                        </div>
                        <div className="p-3 bg-green-100 rounded-full text-green-600"><UserCheck size={24} /></div>
                    </div>
                    <div className="glass-card p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Active Rooms</p>
                            <p className="text-2xl font-bold text-indigo-600">{stats.activeRooms} / <span className="text-sm text-gray-500">{stats.totalRooms}</span></p>
                        </div>
                        <div className="p-3 bg-indigo-100 rounded-full text-indigo-600"><School size={24} /></div>
                    </div>
                    <div className="glass-card p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Utilization</p>
                            <p className="text-2xl font-bold text-purple-600">{stats.utilization}%</p>
                        </div>
                        <div className="p-3 bg-purple-100 rounded-full text-purple-600"><BarChart2 size={24} /></div>
                    </div>
                    <div className="glass-card p-4 flex items-center justify-between">
                        <div>
                            <p className="text-sm text-[var(--text-secondary)]">Most Active</p>
                            <p className="text-lg font-bold text-blue-600 truncate max-w-[120px]">{stats.busiestBuilding}</p>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full text-blue-600"><Activity size={24} /></div>
                    </div>
                </div>
            )}

            {/* List/Grid */}
            <div className={gridClasses}>
                {sessions.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-[var(--text-secondary)] opacity-50 bg-[var(--bg-surface)] rounded-2xl border border-dashed border-[var(--border-color)]">
                        <Activity size={48} className="mb-4" />
                        <p className="text-xl font-medium">No active classes right now.</p>
                        <p className="text-sm">Classes will appear here instantly when they start.</p>
                    </div>
                ) : (
                    sessions.map((sess: any) => (
                        <div key={sess.session_id} className={`
                            relative overflow-hidden
                            bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-color)] 
                            hover:shadow-lg hover:border-indigo-200 transition-all duration-300 group
                            ${fullScreen ? 'p-6 flex flex-col h-full' : 'p-4 flex justify-between items-center'}
                            ${flashingCards.has(sess.session_id) ? 'flash-green' : ''}
                         `}>
                            {fullScreen ? (
                                <>
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="px-3 py-1 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-sm tracking-wide">
                                            {sess.room}
                                        </span>
                                        {sess.last_activity && (
                                            <span className="flex items-center gap-1 text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full">
                                                <Activity size={12} /> {timeAgo(sess.last_activity)}
                                            </span>
                                        )}
                                    </div>

                                    <h4 className="font-bold text-xl mb-2 text-[var(--text-primary)] line-clamp-2">{sess.course}</h4>

                                    <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] mb-6">
                                        <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-bold">
                                            {sess.lecturer.charAt(0)}
                                        </div>
                                        {sess.lecturer}
                                    </div>

                                    <div className="mt-auto pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-xs text-[var(--text-secondary)] uppercase font-bold">Started</span>
                                            <span className="font-mono text-sm">{sess.start_time.split('T')[1].slice(0, 5)}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-3xl font-bold text-[var(--text-primary)] block leading-none">{sess.students}</span>
                                            <span className="text-[10px] text-[var(--text-secondary)] uppercase font-bold">Present</span>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-sm">{sess.room}</span>
                                            <span className="text-sm text-[var(--text-secondary)] font-medium">{sess.course}</span>
                                        </div>
                                        <div className="text-xs text-[var(--text-secondary)] flex items-center gap-3">
                                            <span className="flex items-center gap-1"><Users size={12} /> {sess.lecturer}</span>
                                        </div>
                                    </div>
                                    <div className="text-right pl-4">
                                        <div className="text-xl font-bold text-[var(--text-primary)]">{sess.students}</div>
                                        {sess.last_activity ? (
                                            <div className="text-[10px] text-green-600 font-bold justify-end flex">
                                                {timeAgo(sess.last_activity)}
                                            </div>
                                        ) : <div className="text-[10px] text-gray-300">-</div>}
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

function timeAgo(iso: string) {
    const diff = (new Date().getTime() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
}
