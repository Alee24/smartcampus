import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts'
import { FileText, Users, Activity, Car, Clock, Calendar, Download, Search, CheckCircle, XCircle, AlertTriangle, Truck, BookOpen, UserCheck, ShieldAlert, Printer } from 'lucide-react'
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
    const [activeSection, setActiveSection] = useState('overview') // overview, traffic, security, generator
    
    // Generator states
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])
    const [genLoading, setGenLoading] = useState(false)
    const [genReport, setGenReport] = useState<any>(null)
    const [generatorSubTab, setGeneratorSubTab] = useState('people') // people, vehicles
    const [searchQuery, setSearchQuery] = useState('')

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
        <div className="animate-fade-in space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold">System Reports & Analytics</h2>
                    <p className="text-[var(--text-secondary)]">Comprehensive stats and interactive detailed daily report generator.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {['Overview', 'Traffic', 'Security', 'Generator'].map((s) => (
                        <button
                            key={s}
                            onClick={() => {
                                setActiveSection(s.toLowerCase());
                                if (s.toLowerCase() === 'generator' && !genReport) {
                                    handleGenerateReport();
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
                                                        <tr key={log.id} className="hover:bg-[var(--bg-primary)]/30 transition-colors">
                                                            <td className="p-4 font-bold text-[var(--text-primary)]">{log.name}</td>
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
