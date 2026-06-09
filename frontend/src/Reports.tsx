import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { FileText, Users, Activity, Car, Clock, Calendar, Download, Search, CheckCircle, XCircle, AlertTriangle, Truck, BookOpen, UserCheck, ShieldAlert, Printer, Shield, Inbox, RefreshCw, Filter } from 'lucide-react'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#8B5CF6']

export default function Reports() {
    const [summary, setSummary] = useState<any>(null)
    const [weeklyTraffic, setWeeklyTraffic] = useState<any[]>([])
    const [gateDist, setGateDist] = useState<any[]>([])
    const [userRoles, setUserRoles] = useState<any[]>([])
    const [peakHours, setPeakHours] = useState<any[]>([])
    const [securityFlags, setSecurityFlags] = useState<any[]>([])
    
    // Tab states
    const [activeSection, setActiveSection] = useState('overview') // overview, traffic, security, generator, hub
    
    // Generator states
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [genLoading, setGenLoading] = useState(false)
    const [genReport, setGenReport] = useState<any>(null)
    const [generatorSubTab, setGeneratorSubTab] = useState('people') // people, vehicles
    const [searchQuery, setSearchQuery] = useState('')

    // Reports Hub states
    const [hubCategory, setHubCategory] = useState('incidents')
    const [hubData, setHubData] = useState<any>(null)
    const [hubLoading, setHubLoading] = useState(false)
    const [hubSearch, setHubSearch] = useState('')
    const [hubFilters, setHubFilters] = useState<any>({
        status: '', severity: '', role: '', date_from: '', date_to: ''
    })

    // Fetch initial global summary analytics
    const fetchSummaryStats = async () => {
        const token = localStorage.getItem('token')
        const headers = { 'Authorization': `Bearer ${token}` }
        try {
            const resSum = await fetch('/api/reports/summary', { headers })
            if (resSum.ok) {
                setSummary(await resSum.json())
            } else {
                setSummary({ error: true })
            }
            
            const resWeekly = await fetch('/api/reports/traffic/weekly', { headers })
            if (resWeekly.ok) setWeeklyTraffic(await resWeekly.json())

            const resGate = await fetch('/api/reports/traffic/gate', { headers })
            if (resGate.ok) setGateDist(await resGate.json())

            const resRoles = await fetch('/api/reports/users/roles', { headers })
            if (resRoles.ok) setUserRoles(await resRoles.json())

            const resPeak = await fetch('/api/reports/traffic/peak-hours', { headers })
            if (resPeak.ok) setPeakHours(await resPeak.json())

            const resFlags = await fetch('/api/reports/security/flags', { headers })
            if (resFlags.ok) setSecurityFlags(await resFlags.json())
        } catch (e) {
            console.error("Fetch Error:", e)
            setSummary({ error: true })
        }
    }

    useEffect(() => {
        fetchSummaryStats()
    }, [])

    // Generate detailed report for a specific day
    const handleGenerateReport = async () => {
        setGenLoading(true)
        const token = localStorage.getItem('token')
        try {
            const res = await fetch(`/api/reports/detailed?date=${selectedDate}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setGenReport(data)
            } else {
                alert("Failed to generate report for selected date.")
            }
        } catch (err) {
            console.error("Error generating report:", err)
        } finally {
            setGenLoading(false)
        }
    }

    // Fetch Reports Hub data
    const fetchHubReport = async (category?: string, filters?: any) => {
        const cat = category || hubCategory
        const f = filters || hubFilters
        setHubLoading(true)
        setHubData(null)
        const token = localStorage.getItem('token')
        try {
            let url = `/api/reports/hub/${cat}`
            if (cat === 'gate_entries') url = `/api/reports/detailed?date=${f.date_from || new Date().toISOString().split('T')[0]}`
            const params = new URLSearchParams()
            if (f.status) params.append('status', f.status)
            if (f.severity) params.append('severity', f.severity)
            if (f.role) params.append('role', f.role)
            if (f.date_from) params.append('date_from', f.date_from)
            if (f.date_to) params.append('date_to', f.date_to)
            const qs = params.toString()
            const res = await fetch(`${url}${qs ? '?' + qs : ''}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                setHubData(await res.json())
            }
        } catch(e) {
            console.error('Hub report error:', e)
        } finally {
            setHubLoading(false)
        }
    }

    // Export hub report as CSV
    const exportHubCSV = () => {
        if (!hubData?.items) return
        const items = hubData.items
        if (!items.length) return
        const headers = Object.keys(items[0]).filter(k => k !== 'id').join(',')
        const rows = items.map((r: any) =>
            Object.entries(r).filter(([k]) => k !== 'id').map(([, v]) => `"${v ?? ''}"`).join(',')
        ).join('\n')
        const csv = headers + '\n' + rows
        const blob = new Blob([csv], { type: 'text/csv' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${hubCategory}_report_${new Date().toISOString().split('T')[0]}.csv`
        a.click()
    }

    // Export hub report as PDF
    const exportHubPDF = () => {
        if (!hubData?.items?.length) return
        const pdf = new jsPDF('l', 'mm', 'a4')
        const pageWidth = pdf.internal.pageSize.getWidth()
        pdf.setFontSize(16)
        pdf.setFont('helvetica', 'bold')
        pdf.text(`${hubCategory.replace('_', ' ').toUpperCase()} REPORT`, pageWidth / 2, 20, { align: 'center' })
        pdf.setFontSize(10)
        pdf.setFont('helvetica', 'normal')
        pdf.setTextColor(107, 114, 128)
        pdf.text(`Generated: ${new Date().toLocaleString()}   |   Total: ${hubData.total}`, pageWidth / 2, 28, { align: 'center' })
        const cols = Object.keys(hubData.items[0]).filter(k => k !== 'id')
        const rows = hubData.items.map((r: any) => cols.map((c: string) => r[c] ?? '-'))
        autoTable(pdf, {
            startY: 35,
            head: [cols.map(c => c.replace(/_/g, ' ').toUpperCase())],
            body: rows,
            theme: 'striped',
            headStyles: { fillColor: [79, 70, 229], fontSize: 8 },
            bodyStyles: { fontSize: 7 },
            margin: { left: 10, right: 10 },
            didParseCell: (data: any) => {
                if (data.section === 'body') {
                    const row = hubData.items[data.row.index]
                    if (row && (row.is_flagged || row.status === 'flagged')) {
                        data.cell.styles.fillColor = [254, 226, 226]
                        data.cell.styles.textColor = [153, 27, 27]
                    }
                }
            }
        })
        pdf.save(`${hubCategory}_report_${new Date().toISOString().split('T')[0]}.pdf`)
    }

    // Export generated logs as CSV
    const exportToCSV = (type: 'people' | 'vehicles') => {
        if (!genReport) return

        let csvContent = ""
        let filename = ""

        if (type === 'people') {
            filename = `people_scans_report_${selectedDate}.csv`
            // Headers
            csvContent += "Name,Email,Role,Gate Entered,Gate Exited,Entry Time,Exit Time,Method,Guard,Status\n"
            genReport.entry_logs.forEach((log: any) => {
                const row = [
                    `"${log.name}"`,
                    `"${log.email}"`,
                    `"${log.role}"`,
                    `"${log.gate}"`,
                    `"${log.exit_gate || '-'}"`,
                    `"${log.entry_time || '-'}"`,
                    `"${log.exit_time || '-'}"`,
                    `"${log.method}"`,
                    `"${log.guard}"`,
                    `"${log.status}"`
                ].join(",")
                csvContent += row + "\n"
            })
        } else {
            filename = `vehicle_scans_report_${selectedDate}.csv`
            // Headers
            csvContent += "Plate Number,Driver Name,Vehicle Type,Gate Entered,Gate Exited,Entry Time,Exit Time,Guard\n"
            genReport.vehicle_logs.forEach((log: any) => {
                const row = [
                    `"${log.plate_number}"`,
                    `"${log.driver_name}"`,
                    `"${log.vehicle_type}"`,
                    `"${log.gate}"`,
                    `"${log.exit_gate || '-'}"`,
                    `"${log.entry_time || '-'}"`,
                    `"${log.exit_time || '-'}"`,
                    `"${log.guard}"`
                ].join(",")
                csvContent += row + "\n"
            })
        }

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement("a")
        link.setAttribute("href", url)
        link.setAttribute("download", filename)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Export generated logs as Professional PDF
    const exportToPDF = async (type: 'people' | 'vehicles') => {
        if (!genReport) return;
        setGenLoading(true);

        try {
            const token = localStorage.getItem('token');
            let companyLogo = null;
            let companyName = "Smart Campus";
            
            try {
                const settingsRes = await fetch('/api/admin/company-settings', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (settingsRes.ok) {
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
            } catch (e) {
                console.warn("Using default branding", e);
            }

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            const pageWidth = pdf.internal.pageSize.getWidth();
            let currentY = 15;
            const marginX = 14;

            if (companyLogo) {
                const logoSize = 25;
                pdf.addImage(companyLogo, 'PNG', marginX, currentY, logoSize, logoSize);
                pdf.setFontSize(22);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text(companyName, marginX + logoSize + 8, currentY + 10);
                pdf.setFontSize(11);
                pdf.setTextColor(107, 114, 128);
                pdf.setFont('helvetica', 'normal');
                pdf.text("System Reports & Analytics", marginX + logoSize + 8, currentY + 18);
                currentY += logoSize + 15;
            } else {
                pdf.setFontSize(22);
                pdf.setFont('helvetica', 'bold');
                pdf.setTextColor(31, 41, 55);
                pdf.text(companyName, marginX, currentY + 10);
                pdf.setFontSize(11);
                pdf.setTextColor(107, 114, 128);
                pdf.setFont('helvetica', 'normal');
                pdf.text("System Reports & Analytics", marginX, currentY + 18);
                currentY += 30;
            }

            pdf.setDrawColor(229, 231, 235);
            pdf.setLineWidth(0.5);
            pdf.line(marginX, currentY, pageWidth - marginX, currentY);
            currentY += 10;

            pdf.setFontSize(16);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(17, 24, 39);
            const reportTitle = type === 'people' ? "People Entry Logs Report" : "Vehicle Scan Logs Report";
            pdf.text(reportTitle, marginX, currentY);
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(107, 114, 128);
            pdf.text(`Date: ${selectedDate}  |  Generated on: ${new Date().toLocaleString()}`, marginX, currentY + 6);
            currentY += 15;

            pdf.setFillColor(249, 250, 251);
            pdf.roundedRect(marginX, currentY, pageWidth - (marginX * 2), 25, 3, 3, 'F');
            
            pdf.setFontSize(10);
            pdf.setFont('helvetica', 'bold');
            pdf.setTextColor(75, 85, 99);
            
            if (type === 'people') {
                pdf.text(`Total Entered: ${genReport.metrics.people_entered}`, marginX + 10, currentY + 10);
                pdf.text(`Visitors: ${genReport.metrics.visitors_entered}`, marginX + 60, currentY + 10);
                pdf.text(`Total Exited: ${genReport.metrics.people_exited}`, marginX + 10, currentY + 18);
                pdf.text(`Flagged/Rejected: ${genReport.metrics.rejected_attempts}`, marginX + 60, currentY + 18);
            } else {
                pdf.text(`Vehicles Entered: ${genReport.metrics.vehicles_entered}`, marginX + 10, currentY + 10);
                pdf.text(`Deliveries: ${genReport.metrics.deliveries_logged}`, marginX + 60, currentY + 10);
            }
            
            currentY += 35;

            const tableCols = type === 'people' 
                ? ["Name", "Role", "Gate Entered", "Gate Exited", "Method", "Entry Time", "Exit Time", "Status"]
                : ["Plate Number", "Driver Name", "Type", "Gate Entered", "Gate Exited", "Entry Time", "Exit Time"];

            const tableRows = type === 'people'
                ? genReport.entry_logs.map((log: any) => [
                    log.name,
                    log.role,
                    log.gate,
                    log.exit_gate || '-',
                    log.method,
                    log.entry_time ? new Date(log.entry_time).toLocaleTimeString() : '-',
                    log.exit_time ? new Date(log.exit_time).toLocaleTimeString() : 'On Campus',
                    log.status
                ])
                : genReport.vehicle_logs.map((log: any) => [
                    log.plate_number,
                    log.driver_name,
                    log.vehicle_type,
                    log.gate,
                    log.exit_gate || '-',
                    log.entry_time ? new Date(log.entry_time).toLocaleTimeString() : '-',
                    log.exit_time ? new Date(log.exit_time).toLocaleTimeString() : 'Parked'
                ]);

            autoTable(pdf, {
                startY: currentY,
                head: [tableCols],
                body: tableRows,
                theme: 'striped',
                headStyles: { fillColor: [79, 70, 229], fontSize: 9 }, // primary-600
                bodyStyles: { fontSize: 8 },
                margin: { left: marginX, right: marginX },
                didParseCell: function (data: any) {
                    if (type === 'people' && data.section === 'body') {
                        const rowIndex = data.row.index;
                        const logEntry = genReport.entry_logs[rowIndex];
                        if (logEntry && logEntry.is_flagged) {
                            data.cell.styles.fillColor = [254, 226, 226]; // light red
                            data.cell.styles.textColor = [153, 27, 27];   // dark red
                            data.cell.styles.fontStyle = 'bold';
                        }
                    }
                },
                didDrawPage: function () {
                    pdf.setFontSize(8);
                    pdf.setTextColor(156, 163, 175);
                    const pageNumber = pdf.internal.getCurrentPageInfo().pageNumber;
                    pdf.text(
                        `Page ${pageNumber}`,
                        pageWidth / 2,
                        pdf.internal.pageSize.getHeight() - 10,
                        { align: 'center' }
                    );
                }
            });

            pdf.save(`Report_${type}_${selectedDate}.pdf`);

        } catch (error) {
            console.error("PDF Export failed", error);
            alert("Failed to export PDF.");
        } finally {
            setGenLoading(false);
        }
    }

    if (summary?.error) return <div className="p-8 text-center text-red-500">Failed to load reports. Check console/network logs.</div>
    if (!summary) return <div className="p-8 text-center text-[var(--text-secondary)]">Loading reports...</div>

    return (
        <div className="animate-fade-in space-y-6 w-full max-w-full overflow-x-hidden min-w-0 px-2 sm:px-4 md:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">System Reports & Analytics</h2>
                    <p className="text-[var(--text-secondary)]">Comprehensive stats and interactive detailed daily report generator.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['Overview', 'Traffic', 'Security', 'Generator', 'Hub'].map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setActiveSection(s.toLowerCase());
                                if (s.toLowerCase() === 'generator' && !genReport) {
                                    handleGenerateReport();
                                }
                                if (s.toLowerCase() === 'hub') {
                                    fetchHubReport(hubCategory, hubFilters);
                                }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${activeSection === s.toLowerCase()
                                ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20'
                                : 'bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)]'}`}
                        >
                            {s === 'Generator' && <Calendar size={14} />}
                            {s === 'Overview' && <Activity size={14} />}
                            {s === 'Traffic' && <Car size={14} />}
                            {s === 'Security' && <ShieldAlert size={14} />}
                            {s === 'Hub' && <Filter size={14} />}
                            {s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard title="Total Registered Users" value={summary.total_users} icon={<Users size={20} />} color="blue" />
                <StatCard title="All-Time Gate Entries" value={summary.total_entries} icon={<FileText size={20} />} color="indigo" />
                <StatCard title="Entries Today" value={summary.entries_today} icon={<Activity size={20} />} color="green" />
                <StatCard title="Vehicles Parked" value={summary.vehicles_parked} icon={<Car size={20} />} color="amber" />
                <StatCard title="Attendance Logs" value={summary.total_attendance_records} icon={<Clock size={20} />} color="purple" />
            </div>

            {/* Main Sections */}
            {activeSection === 'overview' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weekly Traffic Area Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Weekly Entry Volume</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={weeklyTraffic}>
                                    <defs>
                                        <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="day" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)', borderRadius: '12px' }} />
                                    <Area type="monotone" dataKey="count" stroke="#4F46E5" fillOpacity={1} fill="url(#colorCount)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* User Distribution Pie Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">User Role Distribution</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={userRoles}
                                        cx="50%"
                                        cy="50%"
                                        labelLine={false}
                                        label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="value"
                                    >
                                        {userRoles.map((_entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'traffic' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Gate Distribution Bar Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Traffic by Gate</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={gateDist} layout="vertical">
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis type="number" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis type="category" dataKey="name" stroke="var(--text-secondary)" fontSize={12} width={100} />
                                    <Tooltip cursor={{ fill: 'var(--bg-primary)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }} />
                                    <Bar dataKey="value" fill="#10B981" radius={[0, 4, 4, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Peak Hours Bar Chart */}
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Peak Traffic Hours</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={peakHours}>
                                    <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                                    <XAxis dataKey="hour" stroke="var(--text-secondary)" fontSize={12} />
                                    <YAxis stroke="var(--text-secondary)" fontSize={12} />
                                    <Tooltip cursor={{ fill: 'var(--bg-primary)' }} contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-color)' }} />
                                    <Bar dataKey="count" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'security' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="glass-card p-6">
                        <h3 className="font-bold mb-6">Access Status Breakdown</h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={securityFlags}
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        fill="#8884d8"
                                        dataKey="count"
                                        label
                                    >
                                        {securityFlags.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.status === 'allowed' ? '#10B981' : '#EF4444'} />
                                        ))}
                                    </Pie>
                                    <Tooltip />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}

            {activeSection === 'generator' && (
                <div className="space-y-6">
                    {/* Controls Row */}
                    <div className="glass-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <Calendar className="text-[var(--primary-color)]" size={24} />
                            <div>
                                <h3 className="font-bold text-lg">Daily Report Generator</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Select a date to query every scan and vehicle transaction.</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="px-4 py-2 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] focus:border-[var(--primary-color)] outline-none text-sm font-semibold"
                            />
                            <button
                                onClick={handleGenerateReport}
                                disabled={genLoading}
                                className="px-6 py-2.5 bg-[var(--primary-color)] text-white font-bold rounded-lg hover:opacity-90 active:scale-95 transition-all text-sm flex items-center gap-2"
                            >
                                {genLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <Search size={16} />
                                        Generate Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {genReport && (
                        <>
                            {/* Daily Statistics / Metrics */}
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                                <GenMiniStat label="People Entered" value={genReport.metrics.people_entered} icon={<Users size={16} />} color="emerald" />
                                <GenMiniStat label="People Exited" value={genReport.metrics.people_exited} icon={<UserCheck size={16} />} color="blue" />
                                <GenMiniStat label="Visitors Logged" value={genReport.metrics.visitors_entered} icon={<Users size={16} />} color="indigo" />
                                <GenMiniStat label="Students Logged" value={genReport.metrics.students_entered} icon={<Users size={16} />} color="purple" />
                                <GenMiniStat label="Flagged/Rejected" value={genReport.metrics.rejected_attempts} icon={<AlertTriangle size={16} />} color="red" />
                                <GenMiniStat label="Vehicles Entered" value={genReport.metrics.vehicles_entered} icon={<Car size={16} />} color="amber" />
                                <GenMiniStat label="Deliveries Logged" value={genReport.metrics.deliveries_logged} icon={<Truck size={16} />} color="orange" />
                                <GenMiniStat label="Classes Held" value={genReport.metrics.classes_held} icon={<BookOpen size={16} />} color="cyan" />
                            </div>

                            {/* Detailed Scans & Transactions Panel */}
                            <div className="glass-card overflow-hidden">
                                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-primary)]/40 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setGeneratorSubTab('people')}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${generatorSubTab === 'people'
                                                ? 'bg-white dark:bg-gray-800 text-[var(--text-primary)] shadow-sm'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        >
                                            People Entry Logs ({genReport.entry_logs.length})
                                        </button>
                                        <button
                                            onClick={() => setGeneratorSubTab('vehicles')}
                                            className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${generatorSubTab === 'vehicles'
                                                ? 'bg-white dark:bg-gray-800 text-[var(--text-primary)] shadow-sm'
                                                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                                        >
                                            Vehicle Scan Logs ({genReport.vehicle_logs.length})
                                        </button>
                                    </div>
                                    <div className="flex items-center gap-2 w-full md:w-auto">
                                        <input
                                            type="text"
                                            placeholder="Search results..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="px-3 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-color)] text-xs outline-none focus:border-[var(--primary-color)] w-full md:w-48"
                                        />
                                        <button
                                            onClick={() => exportToCSV(generatorSubTab as 'people' | 'vehicles')}
                                            className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-bold hover:bg-green-700 active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap"
                                        >
                                            <Download size={12} />
                                            CSV
                                        </button>
                                        <button
                                            onClick={() => exportToPDF(generatorSubTab as 'people' | 'vehicles')}
                                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5 whitespace-nowrap"
                                        >
                                            <Printer size={12} />
                                            PDF
                                        </button>
                                    </div>
                                </div>

                                <div className="overflow-x-auto">
                                    {generatorSubTab === 'people' ? (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/10 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                                    <th className="p-4">Name</th>
                                                    <th className="p-4">Role</th>
                                                    <th className="p-4">Gate Entered</th>
                                                    <th className="p-4">Gate Exited</th>
                                                    <th className="p-4">Method</th>
                                                    <th className="p-4">Entry Time</th>
                                                    <th className="p-4">Exit Time</th>
                                                    <th className="p-4">Scanned By</th>
                                                    <th className="p-4 text-center">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                                {genReport.entry_logs
                                                    .filter((log: any) =>
                                                        log.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        log.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        log.gate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        (log.exit_gate && log.exit_gate.toLowerCase().includes(searchQuery.toLowerCase())) ||
                                                        log.method.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        log.guard.toLowerCase().includes(searchQuery.toLowerCase())
                                                    )
                                                    .map((log: any) => (
                                                        <tr key={log.id} className={`transition-colors ${log.is_flagged ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500' : 'hover:bg-[var(--bg-primary)]/30'}`}>
                                                            <td className={`p-4 font-bold ${log.is_flagged ? 'text-red-700 dark:text-red-400' : 'text-[var(--text-primary)]'}`}>
                                                                <div className="flex items-center gap-1.5">
                                                                    {log.name}
                                                                    {log.is_flagged && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse">⚠ FLAGGED</span>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-4 text-[var(--text-secondary)] text-xs"><span className="px-2 py-0.5 rounded bg-[var(--bg-primary)] border border-[var(--border-color)]">{log.role}</span></td>
                                                            <td className="p-4 font-semibold">{log.gate}</td>
                                                            <td className="p-4 font-semibold text-[var(--text-secondary)]">{log.exit_gate || '-'}</td>
                                                            <td className="p-4 text-xs font-bold uppercase">{log.method}</td>
                                                            <td className="p-4 text-xs text-[var(--text-secondary)]">{log.entry_time ? new Date(log.entry_time).toLocaleTimeString() : '-'}</td>
                                                            <td className="p-4 text-xs text-[var(--text-secondary)]">{log.exit_time ? new Date(log.exit_time).toLocaleTimeString() : <span className="text-gray-400">On Campus</span>}</td>
                                                            <td className="p-4 font-medium text-xs">{log.guard}</td>
                                                            <td className="p-4 text-center">
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${log.status === 'allowed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                                    {log.status === 'allowed' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                                                    {log.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                {genReport.entry_logs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={8} className="p-8 text-center text-[var(--text-secondary)]">No entry scans found for this day.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    ) : (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)] bg-[var(--bg-primary)]/10 text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">
                                                    <th className="p-4">Plate Number</th>
                                                    <th className="p-4">Driver Name</th>
                                                    <th className="p-4">Type</th>
                                                    <th className="p-4">Gate Entered</th>
                                                    <th className="p-4">Gate Exited</th>
                                                    <th className="p-4">Entry Time</th>
                                                    <th className="p-4">Exit Time</th>
                                                    <th className="p-4">Guard</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                                {genReport.vehicle_logs
                                                    .filter((log: any) =>
                                                        log.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        log.driver_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        log.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        log.gate.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                        (log.exit_gate && log.exit_gate.toLowerCase().includes(searchQuery.toLowerCase()))
                                                    )
                                                    .map((log: any) => (
                                                        <tr key={log.id} className="hover:bg-[var(--bg-primary)]/30 transition-colors">
                                                            <td className="p-4 font-black tracking-wider text-indigo-600 dark:text-indigo-400">{log.plate_number}</td>
                                                            <td className="p-4 font-semibold">{log.driver_name}</td>
                                                            <td className="p-4 text-xs capitalize"><span className="px-2 py-0.5 rounded bg-[var(--bg-primary)]">{log.vehicle_type}</span></td>
                                                            <td className="p-4 font-semibold">{log.gate}</td>
                                                            <td className="p-4 font-semibold text-[var(--text-secondary)]">{log.exit_gate || '-'}</td>
                                                            <td className="p-4 text-xs text-[var(--text-secondary)]">{log.entry_time ? new Date(log.entry_time).toLocaleTimeString() : '-'}</td>
                                                            <td className="p-4 text-xs text-[var(--text-secondary)]">{log.exit_time ? new Date(log.exit_time).toLocaleTimeString() : <span className="text-gray-400">Parked</span>}</td>
                                                            <td className="p-4 text-xs font-medium">{log.guard}</td>
                                                        </tr>
                                                    ))}
                                                {genReport.vehicle_logs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={7} className="p-8 text-center text-[var(--text-secondary)]">No vehicle transactions found for this day.</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════
                REPORTS HUB — System-Wide Filterable Reports
            ═══════════════════════════════════════════════════════ */}
            {activeSection === 'hub' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Hub Header */}
                    <div className="glass-card p-5 border border-indigo-200 dark:border-indigo-900/30 bg-gradient-to-br from-indigo-50/50 to-white dark:from-indigo-950/10 dark:to-transparent">
                        <div className="flex items-center gap-3 mb-1">
                            <Filter className="text-indigo-600" size={22} />
                            <h3 className="text-lg font-black text-gray-900 dark:text-white">System-Wide Reports Hub</h3>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Filter, search, and export any system report — incidents, lost & found, users, gate entries, and attendance logs.</p>
                    </div>

                    {/* Category Tabs */}
                    <div className="flex flex-wrap gap-2">
                        {[
                            { key: 'incidents', label: 'Incident Reports', icon: <Shield size={14} />, },
                            { key: 'lost_found', label: 'Lost & Found', icon: <Inbox size={14} />, },
                            { key: 'users', label: 'User Directory', icon: <Users size={14} />, },
                            { key: 'gate_entries', label: 'Gate Entry Logs', icon: <Activity size={14} />, },
                            { key: 'attendance', label: 'Attendance', icon: <BookOpen size={14} />, },
                        ].map(cat => (
                            <button
                                key={cat.key}
                                onClick={() => {
                                    setHubCategory(cat.key)
                                    setHubData(null)
                                    setHubSearch('')
                                    setHubFilters({ status: '', severity: '', role: '', date_from: '', date_to: '' })
                                    fetchHubReport(cat.key, { status: '', severity: '', role: '', date_from: '', date_to: '' })
                                }}
                                className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shadow-sm ${
                                    hubCategory === cat.key
                                        ? 'bg-[var(--primary-color)] text-white shadow-[var(--primary-color)]/30 scale-[1.02]'
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-[var(--primary-color)] hover:text-[var(--primary-color)]'
                                }`}
                            >
                                {cat.icon}
                                {cat.label}
                            </button>
                        ))}
                    </div>

                    {/* Filters Row */}
                    <div className="glass-card p-4">
                        <div className="flex flex-wrap items-end gap-3">
                            <div className="flex-1 min-w-[140px]">
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Search</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                    <input
                                        type="text"
                                        value={hubSearch}
                                        onChange={e => setHubSearch(e.target.value)}
                                        placeholder="Search results..."
                                        className="w-full pl-8 pr-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs border-none outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                                    />
                                </div>
                            </div>

                            {(hubCategory === 'incidents' || hubCategory === 'lost_found' || hubCategory === 'users') && (
                                <div className="min-w-[120px]">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Status</label>
                                    <select
                                        value={hubFilters.status}
                                        onChange={e => setHubFilters((p: any) => ({ ...p, status: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs border-none outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                                    >
                                        <option value="">All Status</option>
                                        {hubCategory === 'incidents' && <>
                                            <option value="reported">Reported</option>
                                            <option value="under_investigation">Under Investigation</option>
                                            <option value="police_reported">Police Reported</option>
                                            <option value="disciplinary">Disciplinary</option>
                                            <option value="resolved">Resolved</option>
                                        </>}
                                        {hubCategory === 'lost_found' && <>
                                            <option value="found">Found</option>
                                            <option value="claimed">Claimed</option>
                                            <option value="disposed">Disposed</option>
                                        </>}
                                        {hubCategory === 'users' && <>
                                            <option value="active">Active</option>
                                            <option value="flagged">Flagged</option>
                                            <option value="inactive">Inactive</option>
                                        </>}
                                    </select>
                                </div>
                            )}

                            {hubCategory === 'incidents' && (
                                <div className="min-w-[120px]">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Severity</label>
                                    <select
                                        value={hubFilters.severity}
                                        onChange={e => setHubFilters((p: any) => ({ ...p, severity: e.target.value }))}
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs border-none outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                                    >
                                        <option value="">All Severities</option>
                                        <option value="high">High</option>
                                        <option value="medium">Medium</option>
                                        <option value="low">Low</option>
                                    </select>
                                </div>
                            )}

                            {hubCategory === 'users' && (
                                <div className="min-w-[120px]">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Role</label>
                                    <input
                                        type="text"
                                        value={hubFilters.role}
                                        onChange={e => setHubFilters((p: any) => ({ ...p, role: e.target.value }))}
                                        placeholder="e.g. student"
                                        className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs border-none outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                                    />
                                </div>
                            )}

                            {hubCategory !== 'users' && (
                                <>
                                    <div className="min-w-[130px]">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Date From</label>
                                        <input
                                            type="date"
                                            value={hubFilters.date_from}
                                            onChange={e => setHubFilters((p: any) => ({ ...p, date_from: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs border-none outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                                        />
                                    </div>
                                    <div className="min-w-[130px]">
                                        <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1.5">Date To</label>
                                        <input
                                            type="date"
                                            value={hubFilters.date_to}
                                            onChange={e => setHubFilters((p: any) => ({ ...p, date_to: e.target.value }))}
                                            className="w-full px-3 py-2.5 bg-gray-50 dark:bg-gray-900 rounded-xl text-xs border-none outline-none focus:ring-1 focus:ring-[var(--primary-color)]"
                                        />
                                    </div>
                                </>
                            )}

                            <button
                                onClick={() => fetchHubReport(hubCategory, hubFilters)}
                                className="px-4 py-2.5 bg-[var(--primary-color)] hover:opacity-90 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-[var(--primary-color)]/20"
                            >
                                <RefreshCw size={13} className={hubLoading ? 'animate-spin' : ''} />
                                {hubLoading ? 'Loading...' : 'Generate Report'}
                            </button>
                        </div>
                    </div>

                    {/* Summary Stats + Export */}
                    {hubData && (
                        <div className="flex flex-wrap justify-between items-center gap-4">
                            <div className="flex flex-wrap gap-2">
                                {hubData.summary && Object.entries(hubData.summary).map(([k, v]: any) => (
                                    <span key={k} className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs font-bold text-gray-700 dark:text-gray-300 shadow-sm">
                                        <span className="text-gray-400 capitalize">{k.replace(/_/g, ' ')}: </span>
                                        <span className="text-[var(--primary-color)]">{v}</span>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={exportHubCSV}
                                    className="px-3 py-2 bg-green-600 text-white rounded-xl text-xs font-bold hover:bg-green-700 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    <Download size={12} /> Export CSV
                                </button>
                                <button
                                    onClick={exportHubPDF}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 active:scale-95 transition-all flex items-center gap-1.5"
                                >
                                    <Printer size={12} /> Export PDF
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Data Table */}
                    {hubLoading ? (
                        <div className="glass-card p-12 text-center">
                            <RefreshCw className="animate-spin mx-auto text-[var(--primary-color)] mb-3" size={32} />
                            <p className="text-sm text-gray-500">Generating report...</p>
                        </div>
                    ) : hubData ? (
                        <div className="glass-card overflow-hidden">
                            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
                                    {hubCategory === 'gate_entries' ? (hubData.entry_logs?.length || 0) : hubData.total} records found
                                    {hubSearch && ` • Filtered`}
                                </p>
                            </div>
                            <div className="overflow-x-auto max-h-[600px] overflow-y-auto table-responsive">
                                {/* INCIDENTS TABLE */}
                                {hubCategory === 'incidents' && (() => {
                                    const rows = hubData.items.filter((r: any) =>
                                        !hubSearch || [r.title, r.reporter_name, r.target_name, r.location, r.severity, r.status, r.serial_number].some((v: any) => v?.toLowerCase().includes(hubSearch.toLowerCase()))
                                    )
                                    return (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-900/50 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0">
                                                    <th className="p-4">#</th>
                                                    <th className="p-4">Title</th>
                                                    <th className="p-4">Reporter</th>
                                                    <th className="p-4">Target</th>
                                                    <th className="p-4">Location</th>
                                                    <th className="p-4">Severity</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                                {rows.map((r: any) => (
                                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="p-4"><span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">{r.serial_number}</span></td>
                                                        <td className="p-4 font-bold text-sm max-w-[200px]"><div className="line-clamp-2">{r.title}</div></td>
                                                        <td className="p-4 text-xs text-gray-600 dark:text-gray-400">{r.reporter_name}</td>
                                                        <td className="p-4 text-xs">{r.target_name || '-'}</td>
                                                        <td className="p-4 text-xs">{r.location}</td>
                                                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.severity === 'high' ? 'bg-red-100 text-red-700' : r.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-blue-100 text-blue-700'}`}>{r.severity}</span></td>
                                                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>{r.status.replace('_', ' ')}</span></td>
                                                        <td className="p-4 text-xs text-gray-500">{new Date(r.incident_date).toLocaleDateString()}</td>
                                                    </tr>
                                                ))}
                                                {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-400">No incidents found matching filters.</td></tr>}
                                            </tbody>
                                        </table>
                                    )
                                })()}

                                {/* LOST & FOUND TABLE */}
                                {hubCategory === 'lost_found' && (() => {
                                    const rows = hubData.items.filter((r: any) =>
                                        !hubSearch || [r.item_name, r.description, r.location_found, r.finder_name, r.claimant_name, r.serial_number].some((v: any) => v?.toLowerCase().includes(hubSearch.toLowerCase()))
                                    )
                                    return (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-900/50 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0">
                                                    <th className="p-4">#</th>
                                                    <th className="p-4">Item</th>
                                                    <th className="p-4">Location Found</th>
                                                    <th className="p-4">Date Found</th>
                                                    <th className="p-4">Finder</th>
                                                    <th className="p-4">Claimant</th>
                                                    <th className="p-4">Date Claimed</th>
                                                    <th className="p-4">Handler</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                                {rows.map((r: any) => (
                                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="p-4"><span className="font-mono text-xs font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">{r.serial_number}</span></td>
                                                        <td className="p-4 font-bold text-sm">{r.item_name}</td>
                                                        <td className="p-4 text-xs text-gray-600">{r.location_found}</td>
                                                        <td className="p-4 text-xs text-gray-500">{new Date(r.date_found).toLocaleDateString()}</td>
                                                        <td className="p-4 text-xs">{r.finder_name}</td>
                                                        <td className="p-4 text-xs font-medium">{r.claimant_name}</td>
                                                        <td className="p-4 text-xs text-gray-500">{r.date_claimed ? new Date(r.date_claimed).toLocaleDateString() : '-'}</td>
                                                        <td className="p-4 text-xs">{r.handler_name}</td>
                                                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === 'claimed' ? 'bg-green-100 text-green-700' : r.status === 'disposed' ? 'bg-gray-100 text-gray-600' : 'bg-blue-100 text-blue-700'}`}>{r.status}</span></td>
                                                    </tr>
                                                ))}
                                                {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-400">No lost & found items found.</td></tr>}
                                            </tbody>
                                        </table>
                                    )
                                })()}

                                {/* USERS TABLE */}
                                {hubCategory === 'users' && (() => {
                                    const rows = hubData.items.filter((r: any) =>
                                        !hubSearch || [r.full_name, r.email, r.admission_number, r.role, r.status, r.school, r.serial_number].some((v: any) => v?.toLowerCase().includes(hubSearch.toLowerCase()))
                                    )
                                    return (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-900/50 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0">
                                                    <th className="p-4">#</th>
                                                    <th className="p-4">Full Name</th>
                                                    <th className="p-4">Admission No.</th>
                                                    <th className="p-4">Email</th>
                                                    <th className="p-4">Role</th>
                                                    <th className="p-4">School</th>
                                                    <th className="p-4">Gender</th>
                                                    <th className="p-4">Status</th>
                                                    <th className="p-4">Registered</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                                {rows.map((r: any) => (
                                                    <tr key={r.id} className={`transition-colors ${r.status === 'flagged' ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                                                        <td className="p-4"><span className="font-mono text-xs font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-0.5 rounded">{r.serial_number}</span></td>
                                                        <td className="p-4 font-bold">
                                                            <div className="flex items-center gap-1.5">
                                                                {r.full_name}
                                                                {r.status === 'flagged' && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white">FLAGGED</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 font-mono text-xs text-purple-600 dark:text-purple-400">{r.admission_number}</td>
                                                        <td className="p-4 text-xs text-gray-600">{r.email}</td>
                                                        <td className="p-4 text-xs capitalize"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">{r.role}</span></td>
                                                        <td className="p-4 text-xs text-gray-600">{r.school}</td>
                                                        <td className="p-4 text-xs capitalize">{r.gender}</td>
                                                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === 'active' ? 'bg-green-100 text-green-700' : r.status === 'flagged' ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>{r.status}</span></td>
                                                        <td className="p-4 text-xs text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleDateString() : '-'}</td>
                                                    </tr>
                                                ))}
                                                {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-400">No users found.</td></tr>}
                                            </tbody>
                                        </table>
                                    )
                                })()}

                                {/* GATE ENTRIES TABLE */}
                                {hubCategory === 'gate_entries' && (() => {
                                    const logs = hubData.entry_logs || []
                                    const rows = logs.filter((r: any) =>
                                        !hubSearch || [r.name, r.role, r.gate, r.method, r.guard, r.status].some((v: any) => v?.toLowerCase().includes(hubSearch.toLowerCase()))
                                    )
                                    return (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-900/50 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0">
                                                    <th className="p-4">#</th>
                                                    <th className="p-4">Name</th>
                                                    <th className="p-4">Role</th>
                                                    <th className="p-4">Gate</th>
                                                    <th className="p-4">Method</th>
                                                    <th className="p-4">Entry Time</th>
                                                    <th className="p-4">Exit Time</th>
                                                    <th className="p-4">Guard</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                                {rows.map((r: any, idx: number) => (
                                                    <tr key={r.id || idx} className={`transition-colors ${r.is_flagged ? 'bg-red-50 dark:bg-red-950/20 border-l-4 border-red-500' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'}`}>
                                                        <td className="p-4"><span className="font-mono text-xs font-black text-green-700 bg-green-50 px-2 py-0.5 rounded">{String(idx + 1).padStart(4, '0')}</span></td>
                                                        <td className="p-4 font-bold text-sm">
                                                            <div className="flex items-center gap-1.5">
                                                                {r.name}
                                                                {r.is_flagged && <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-red-600 text-white animate-pulse">FLAGGED</span>}
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-xs"><span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 rounded capitalize">{r.role}</span></td>
                                                        <td className="p-4 text-xs font-semibold">{r.gate}</td>
                                                        <td className="p-4 text-xs font-bold uppercase">{r.method}</td>
                                                        <td className="p-4 text-xs text-gray-500">{r.entry_time ? new Date(r.entry_time).toLocaleTimeString() : '-'}</td>
                                                        <td className="p-4 text-xs text-gray-500">{r.exit_time ? new Date(r.exit_time).toLocaleTimeString() : <span className="text-gray-400">On Campus</span>}</td>
                                                        <td className="p-4 text-xs">{r.guard}</td>
                                                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.status === 'allowed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.status}</span></td>
                                                    </tr>
                                                ))}
                                                {rows.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-gray-400">No gate entries found for selected date.</td></tr>}
                                            </tbody>
                                        </table>
                                    )
                                })()}

                                {/* ATTENDANCE TABLE */}
                                {hubCategory === 'attendance' && (() => {
                                    const rows = (hubData.items || []).filter((r: any) =>
                                        !hubSearch || [r.student_name, r.admission_number, r.course_name, r.room_code, r.serial_number].some((v: any) => v?.toLowerCase().includes(hubSearch.toLowerCase()))
                                    )
                                    return (
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="border-b border-[var(--border-color)] bg-gray-50 dark:bg-gray-900/50 text-xs font-bold uppercase tracking-wider text-gray-500 sticky top-0">
                                                    <th className="p-4">#</th>
                                                    <th className="p-4">Student</th>
                                                    <th className="p-4">Admission No.</th>
                                                    <th className="p-4">Course</th>
                                                    <th className="p-4">Room</th>
                                                    <th className="p-4">Timestamp</th>
                                                    <th className="p-4">Method</th>
                                                    <th className="p-4">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                                {rows.map((r: any) => (
                                                    <tr key={r.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                                                        <td className="p-4"><span className="font-mono text-xs font-black text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-0.5 rounded">{r.serial_number}</span></td>
                                                        <td className="p-4 font-bold text-sm">{r.student_name}</td>
                                                        <td className="p-4 font-mono text-xs text-purple-600">{r.admission_number}</td>
                                                        <td className="p-4 text-xs">{r.course_name}</td>
                                                        <td className="p-4 text-xs font-mono">{r.room_code}</td>
                                                        <td className="p-4 text-xs text-gray-500">{r.timestamp ? new Date(r.timestamp).toLocaleString() : '-'}</td>
                                                        <td className="p-4 text-xs font-bold uppercase">{r.method}</td>
                                                        <td className="p-4"><span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${r.is_successful ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{r.is_successful ? 'Present' : 'Failed'}</span></td>
                                                    </tr>
                                                ))}
                                                {rows.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-gray-400">No attendance records found.</td></tr>}
                                            </tbody>
                                        </table>
                                    )
                                })()}
                            </div>
                        </div>
                    ) : !hubLoading && (
                        <div className="glass-card p-12 text-center border-2 border-dashed border-gray-200 dark:border-gray-700">
                            <Filter className="mx-auto text-gray-300 dark:text-gray-600 mb-3" size={40} />
                            <p className="font-bold text-gray-500">Select a category and click Generate Report</p>
                            <p className="text-xs text-gray-400 mt-1">Apply filters above then click the Generate Report button</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}

function StatCard({ title, value, icon, color }: any) {
    const colorClasses: any = {
        blue: 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
        green: 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400',
        amber: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
        indigo: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400',
        purple: 'bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400',
        red: 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400'
    }

    return (
        <div className="glass-card p-4 flex flex-col justify-between h-full hover:scale-[1.02] transition-transform">
            <div className="flex justify-between items-start mb-2 gap-2">
                <span className="text-[var(--text-secondary)] text-[11px] sm:text-xs font-semibold leading-tight">{title}</span>
                <span className={`p-1.5 rounded-lg shrink-0 ${colorClasses[color] || 'bg-gray-100'}`}>
                    {icon}
                </span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-[var(--text-primary)]">{value !== undefined ? value : '-'}</div>
        </div>
    )
}

function GenMiniStat({ label, value, icon, color }: any) {
    const colorClasses: any = {
        emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30',
        blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
        indigo: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/20 dark:text-indigo-400 dark:border-indigo-900/30',
        purple: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30',
        red: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/30',
        amber: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30',
        orange: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/20 dark:text-orange-400 dark:border-orange-900/30',
        cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-950/20 dark:text-cyan-400 dark:border-cyan-900/30'
    }

    return (
        <div className={`p-3 rounded-xl border flex flex-col justify-between ${colorClasses[color]} hover:shadow-sm transition-shadow`}>
            <div className="flex items-center justify-between mb-1 gap-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-85 truncate leading-none">{label}</span>
                <span className="opacity-90">{icon}</span>
            </div>
            <div className="text-lg font-black leading-none mt-1">{value !== undefined ? value : '0'}</div>
        </div>
    )
}
