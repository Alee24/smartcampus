import { useState, useEffect } from 'react';
import { Download, Calendar, Users, ChevronRight, BookOpen, Clock, MapPin, ChevronDown, CheckCircle, XCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function CourseReports() {
    const [courses, setCourses] = useState<any[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<any>(null);
    const [sessions, setSessions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedSession, setExpandedSession] = useState<string | null>(null);
    const [sessionDetails, setSessionDetails] = useState<any[]>([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');
        fetch('/api/attendance/courses', {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setCourses(data);
                setLoading(false);
            });
    }, []);

    const handleSelectCourse = (course: any) => {
        setSelectedCourse(course);
        setSessions([]);
        setExpandedSession(null);

        const token = localStorage.getItem('token');
        fetch(`/api/attendance/courses/${course.id}/reports`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => setSessions(data));
    };

    const handleExpandSession = (sessionId: string) => {
        if (expandedSession === sessionId) {
            setExpandedSession(null);
            return;
        }

        setExpandedSession(sessionId);
        setLoadingDetails(true);
        setSessionDetails([]);

        const token = localStorage.getItem('token');
        fetch(`/api/attendance/reports/${sessionId}/details`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.json())
            .then(data => {
                setSessionDetails(data);
                setLoadingDetails(false);
            });
    };

    const handleDownload = (e: any, sessionId: string, date: string) => {
        e.stopPropagation();
        const token = localStorage.getItem('token');
        fetch(`/api/attendance/reports/${sessionId}/download`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Attendance_${selectedCourse.course_code}_${date}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
    };

    const handleDownloadWeekly = (dateStr: string) => {
        const d = new Date(dateStr);
        // Adjust for timezone offset to avoid previous day issue
        const offset = d.getTimezoneOffset();
        const adjustedDate = new Date(d.getTime() - (offset * 60 * 1000));
        const isoDate = adjustedDate.toISOString().split('T')[0];

        const token = localStorage.getItem('token');
        fetch(`/api/attendance/courses/${selectedCourse.id}/reports/weekly-download?start_date=${isoDate}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(res => res.blob())
            .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Weekly_Attendance_${selectedCourse.course_code}_WeekOf_${isoDate}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            });
    };

    // Group sessions by Date
    const groupedSessions: { [key: string]: any[] } = {};
    sessions.forEach(s => {
        const d = new Date(s.date).toDateString(); // "Mon Jan 19 2026"
        if (!groupedSessions[d]) groupedSessions[d] = [];
        groupedSessions[d].push(s);
    });

    return (
        <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500 h-full flex flex-col">
            <header className="flex justify-between items-center shrink-0">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                        Course Reports
                    </h1>
                    <p className="text-[var(--text-secondary)]">View and download attendance registers per course.</p>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1 min-h-0">
                {/* Course List */}
                <div className="bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] overflow-hidden flex flex-col shadow-sm">
                    <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                        <h2 className="font-semibold flex items-center gap-2">
                            <BookOpen size={18} /> All Courses
                        </h2>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                        {loading ? <div className="p-4 text-center text-sm text-[var(--text-secondary)]">Loading courses...</div> : courses.map(course => (
                            <button
                                key={course.id}
                                onClick={() => handleSelectCourse(course)}
                                className={`w-full text-left p-3 rounded-lg border transition-all flex justify-between items-center group
                                    ${selectedCourse?.id === course.id
                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                                        : 'border-transparent hover:bg-[var(--bg-secondary)]'}`}
                            >
                                <div>
                                    <div className="font-bold text-sm text-[var(--text-primary)]">{course.course_code}</div>
                                    <div className="text-xs text-[var(--text-secondary)] line-clamp-1">{course.course_name}</div>
                                </div>
                                <ChevronRight size={16} className={`text-gray-400 group-hover:text-blue-500 transition-transform ${selectedCourse?.id === course.id ? 'rotate-90 text-blue-500' : ''}`} />
                            </button>
                        ))}
                    </div>
                </div>

                {/* Session Details */}
                <div className="md:col-span-2 bg-[var(--card-bg)] rounded-xl border border-[var(--border-color)] flex flex-col overflow-hidden shadow-sm">
                    {selectedCourse ? (
                        <>
                            <div className="p-6 border-b border-[var(--border-color)] bg-[var(--bg-secondary)] flex justify-between items-center shrink-0">
                                <div>
                                    <h2 className="text-xl font-bold text-[var(--text-primary)]">{selectedCourse.course_name}</h2>
                                    <p className="text-sm text-[var(--text-secondary)]">Historical Attendance Records</p>
                                </div>
                                <div className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                                    {sessions.length} Sessions
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                                {sessions.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-gray-400">
                                        <Calendar size={48} className="mb-4 opacity-50" />
                                        <p>No past sessions found for this course.</p>
                                    </div>
                                )}

                                {Object.keys(groupedSessions).map((dateStr, i) => (
                                    <div key={i} className="animate-in slide-in-from-bottom-5 fade-in duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-3 ml-1 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Calendar size={14} /> {dateStr}
                                            </div>
                                            <button
                                                onClick={() => handleDownloadWeekly(dateStr)}
                                                className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-3 py-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors flex items-center gap-1.5 font-semibold"
                                                title="Download combined report for this week"
                                            >
                                                <Download size={14} /> Weekly Report
                                            </button>
                                        </h3>
                                        <div className="space-y-3">
                                            {groupedSessions[dateStr].map((session) => {
                                                const isPresent = session.attendance_count > 0;
                                                const statusColor = isPresent
                                                    ? 'border-green-200 bg-green-50/50 dark:border-green-900/30 dark:bg-green-900/10'
                                                    : 'border-red-200 bg-red-50/50 dark:border-red-900/30 dark:bg-red-900/10';

                                                const iconColor = isPresent
                                                    ? 'bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400'
                                                    : 'bg-red-100 text-red-600 dark:bg-red-900/20 dark:text-red-400';

                                                return (
                                                    <div key={session.session_id} className={`border rounded-xl overflow-hidden transition-all ${statusColor}`}>
                                                        {/* Session Header Card */}
                                                        <div
                                                            onClick={() => handleExpandSession(session.session_id)}
                                                            className="p-4 flex items-center justify-between hover:bg-[var(--bg-secondary)] cursor-pointer transition-colors"
                                                        >
                                                            <div className="flex items-center gap-4">
                                                                <div className={`w-12 h-12 rounded-lg flex flex-col items-center justify-center ${iconColor}`}>
                                                                    <Clock size={20} />
                                                                </div>
                                                                <div>
                                                                    <div className="text-sm font-bold flex items-center gap-2 text-[var(--text-primary)]">
                                                                        {session.start_time.substring(0, 5)} - {session.end_time.substring(0, 5)}
                                                                    </div>
                                                                    <div className="text-xs text-[var(--text-secondary)] mt-1 flex items-center gap-3">
                                                                        <span className="flex items-center gap-1"><MapPin size={10} /> {session.room_code || "Room N/A"}</span>
                                                                        <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                                                        <span className={`font-medium flex items-center gap-1 ${isPresent ? 'text-green-600' : 'text-red-500'}`}>
                                                                            <Users size={10} /> {session.attendance_count} Present
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={(e) => handleDownload(e, session.session_id, session.date)}
                                                                    className="px-3 py-1.5 bg-white hover:bg-gray-50 dark:bg-black/20 dark:hover:bg-black/40 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm border border-transparent hover:border-gray-200"
                                                                >
                                                                    <Download size={14} /> Download CSV
                                                                </button>
                                                                <ChevronDown size={18} className={`text-gray-400 transition-transform ${expandedSession === session.session_id ? 'rotate-180' : ''}`} />
                                                            </div>
                                                        </div>

                                                        {/* Expanded Details */}
                                                        <AnimatePresence>
                                                            {expandedSession === session.session_id && (
                                                                <motion.div
                                                                    initial={{ height: 0, opacity: 0 }}
                                                                    animate={{ height: 'auto', opacity: 1 }}
                                                                    exit={{ height: 0, opacity: 0 }}
                                                                    className="border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/30 backdrop-blur-sm"
                                                                >
                                                                    <div className="p-4">
                                                                        <h4 className="text-xs font-bold uppercase text-[var(--text-secondary)] mb-3">Scanned Students</h4>
                                                                        {loadingDetails ? (
                                                                            <div className="flex justify-center py-4 text-xs text-gray-500">Loading scans...</div>
                                                                        ) : (
                                                                            <div className="space-y-1">
                                                                                {sessionDetails.length === 0 ? (
                                                                                    <p className="text-xs text-gray-500 italic">No scans recorded for this session.</p>
                                                                                ) : (
                                                                                    sessionDetails.map((student, j) => (
                                                                                        <div key={j} className="flex justify-between items-center p-2 rounded hover:bg-[var(--bg-primary)] text-sm">
                                                                                            <div className="flex items-center gap-3">
                                                                                                <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold">
                                                                                                    {j + 1}
                                                                                                </div>
                                                                                                <div>
                                                                                                    <div className="font-medium text-[var(--text-primary)]">{student.student_name}</div>
                                                                                                    <div className="text-[10px] text-[var(--text-secondary)]">{student.admission_number}</div>
                                                                                                </div>
                                                                                            </div>
                                                                                            <div className="flex items-center gap-4 text-xs">
                                                                                                <span className="text-gray-500 font-mono">{student.scan_time}</span>
                                                                                                {student.status === 'present'
                                                                                                    ? <span className="text-green-600 flex items-center gap-1 font-bold"><CheckCircle size={10} /> Present</span>
                                                                                                    : <span className="text-red-500 flex items-center gap-1 font-bold"><XCircle size={10} /> {student.status}</span>
                                                                                                }
                                                                                            </div>
                                                                                        </div>
                                                                                    ))
                                                                                )}
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                </motion.div>
                                                            )}
                                                        </AnimatePresence>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400">
                            <BookOpen size={64} className="mb-4 opacity-20" />
                            <p>Select a course to view reports.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
