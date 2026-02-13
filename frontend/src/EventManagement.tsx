import { useState, useEffect, useRef } from 'react'
import { Plus, Calendar, Users, MapPin, QrCode, Download, X, Search, FileText, Upload, Mail, Send, Check, Loader, Trash2, Eye } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

export default function EventManagement() {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showQRModal, setShowQRModal] = useState(false)
    const [showVisitorModal, setShowVisitorModal] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<any>(null)

    // Visitor Management State
    const [visitors, setVisitors] = useState<any[]>([])
    const [visitorLoading, setVisitorLoading] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [sending, setSending] = useState(false)
    const [selectedVisitor, setSelectedVisitor] = useState<any>(null)

    const qrRef = useRef<HTMLDivElement>(null)
    const visitorQrRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchEvents()
    }, [])

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/events/', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                setEvents(await res.json())
            }
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)

        const data = {
            name: formData.get('name'),
            host: formData.get('host'),
            school: formData.get('school'),
            expected_visitors: formData.get('expected_visitors'),
            event_type: formData.get('event_type'),
            event_date: formData.get('event_date'),
            description: formData.get('description'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time')
        }

        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/events/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data)
            })

            if (res.ok) {
                setShowModal(false)
                fetchEvents()
                alert("Event Created Successfully!")
            } else {
                alert("Failed to create event")
            }
        } catch (error) {
            console.error(error)
        }
    }

    const downloadQR = () => {
        if (!qrRef.current) return;
        const canvas = qrRef.current.querySelector("canvas");

        if (canvas) {
            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `Event_Pass_${selectedEvent?.name}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        }
    }

    const downloadVisitorQR = () => {
        if (!visitorQrRef.current) return;
        const canvas = visitorQrRef.current.querySelector("canvas");

        if (canvas) {
            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `GatePass_${selectedVisitor?.visitor_name}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        }
    }

    const fetchVisitors = async (eventId: string) => {
        setVisitorLoading(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/events/${eventId}/visitors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) setVisitors(await res.json())
        } catch (e) {
            console.error(e)
        } finally {
            setVisitorLoading(false)
        }
    }

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || !e.target.files[0] || !selectedEvent) return

        setUploading(true)
        const formData = new FormData()
        formData.append('file', e.target.files[0])

        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/events/${selectedEvent.id}/visitors/upload`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            })

            if (res.ok) {
                const data = await res.json()
                alert(data.message)
                fetchVisitors(selectedEvent.id)
            } else {
                const err = await res.json()
                alert("Upload failed: " + (err.detail || "Unknown error"))
            }
        } catch (e) {
            alert("Error uploading file: " + e)
        } finally {
            setUploading(false)
            // Reset input
            e.target.value = ''
        }
    }

    const handleGeneratePasses = async () => {
        if (!confirm("Generate passes for all registered guests?")) return
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/events/${selectedEvent.id}/visitors/generate-passes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) alert("Passes generated successfully!")
        } catch (e) { alert("Error generating passes") }
    }

    const handleSendEmails = async () => {
        if (!confirm("Send emails to all guests with registered email addresses?")) return
        setSending(true)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/events/${selectedEvent.id}/visitors/send-passes`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                alert(data.message)
            }
        } catch (e) { alert("Error sending emails") }
        finally { setSending(false) }
    }

    const openVisitorModal = (event: any) => {
        setSelectedEvent(event)
        setShowVisitorModal(true)
        fetchVisitors(event.id)
    }

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-3xl font-bold text-[var(--text-primary)]">Event Management</h2>
                    <p className="text-[var(--text-secondary)]">Create and manage events, visitors, and gate passes.</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 bg-[image:var(--gradient-primary)] text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:opacity-90 transition-all"
                >
                    <Plus size={20} /> Create Event
                </button>
            </div>

            {/* Events Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                    <div key={event.id} className="glass-card p-6 flex flex-col group hover:border-[var(--primary-color)] transition-colors">
                        <div className="flex justify-between items-start mb-4">
                            <div className="bg-primary-50 text-primary-700 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                {event.event_type}
                            </div>
                            <button
                                onClick={() => { setSelectedEvent(event); setShowQRModal(true); }}
                                className="text-[var(--text-secondary)] hover:text-[var(--primary-color)] transition-colors"
                                title="View Gate Pass"
                            >
                                <QrCode size={24} />
                            </button>
                        </div>

                        <h3 className="text-xl font-bold text-[var(--text-primary)] mb-2 group-hover:text-primary-600 transition-colors">{event.name}</h3>

                        <div className="space-y-3 mb-6 flex-1">
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                <Users size={16} />
                                <span>Host: {event.host} ({event.school})</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                <Calendar size={16} />
                                <span>{new Date(event.event_date).toDateString()}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                                <MapPin size={16} />
                                <span>Visitors: {event.expected_visitors}</span>
                            </div>
                        </div>

                        <div className="pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${event.is_active ? 'text-green-600 bg-green-100' : 'text-gray-500 bg-gray-100'}`}>
                                {event.is_active ? 'Active' : 'Closed'}
                            </span>
                            <button onClick={() => openVisitorModal(event)} className="text-sm font-bold text-primary-600 hover:underline">
                                Manage Guests
                            </button>
                        </div>
                    </div>
                ))}

                {events.length === 0 && !loading && (
                    <div className="col-span-full py-12 text-center text-[var(--text-secondary)] bg-[var(--bg-primary)] rounded-xl border border-dashed border-[var(--border-color)]">
                        <Calendar size={48} className="mx-auto mb-4 opacity-20" />
                        <p>No events scheduled. Create one to get started.</p>
                    </div>
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] w-full max-w-2xl rounded-2xl shadow-2xl animate-fade-in max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[image:var(--gradient-primary)] text-white rounded-t-2xl">
                            <h3 className="text-2xl font-bold">Create New Event</h3>
                            <button onClick={() => setShowModal(false)} className="hover:bg-white/20 p-2 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleCreateEvent} className="p-8 space-y-6">
                            <div className="grid md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Event Name</label>
                                    <input name="name" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none" placeholder="e.g. Annual Tech Summit" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Date</label>
                                    <input type="date" name="event_date" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] focus:ring-2 focus:ring-primary-500 outline-none" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Host Name</label>
                                    <input name="host" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="e.g. Dean of Students" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">School / Faculty</label>
                                    <input name="school" required className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]" placeholder="e.g. Engineering" />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Expected Visitors</label>
                                    <select name="expected_visitors" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                        <option value="0-20">0 - 20</option>
                                        <option value="20-40">20 - 40</option>
                                        <option value="40-80">40 - 80</option>
                                        <option value="80-100">80 - 100</option>
                                        <option value="100+">Above 100</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Event Type</label>
                                    <select name="event_type" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)]">
                                        <option value="Special Lecture">Special Lecture</option>
                                        <option value="Graduation">Graduation</option>
                                        <option value="Open Day">Open Day</option>
                                        <option value="Conference">Conference</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[var(--text-primary)] mb-2">Description / Notes</label>
                                <textarea name="description" className="w-full p-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] h-24" placeholder="Additional details..." />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl text-[var(--text-secondary)] font-bold hover:bg-[var(--bg-primary)]">Cancel</button>
                                <button type="submit" className="px-8 py-3 rounded-xl bg-[image:var(--gradient-primary)] text-white font-bold shadow-lg hover:shadow-primary-500/30 transition-all transform hover:-translate-y-1">Create Event</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* QR Code Modal */}
            {showQRModal && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-zoom-in relative">
                        <button onClick={() => setShowQRModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>

                        <div className="mb-6">
                            <h3 className="text-2xl font-black text-gray-900 mb-1">{selectedEvent.name}</h3>
                            <p className="text-gray-500 text-sm">{selectedEvent.school}</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200 inline-block mb-6 shadow-sm" ref={qrRef}>
                            <QRCodeCanvas
                                value={`EVENT:${selectedEvent.qr_code_token}`}
                                size={200}
                                level="H"
                            />
                        </div>

                        <p className="text-xs text-gray-400 mb-6 px-4">
                            Share this QR code with visitors. Guards will scan this code to register entries at the gate.
                        </p>

                        <button
                            onClick={downloadQR}
                            className="w-full py-4 bg-black text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-900 transition-colors"
                        >
                            <Download size={20} /> Download Gate Pass
                        </button>
                    </div>
                </div>
            )}
            {/* Visitor Management Modal */}
            {showVisitorModal && selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-[var(--bg-surface)] border border-[var(--border-color)] w-full max-w-4xl rounded-2xl shadow-2xl animate-fade-in h-[85vh] flex flex-col">
                        {/* Header */}
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)] rounded-t-2xl">
                            <div>
                                <h3 className="text-2xl font-bold flex items-center gap-2">
                                    <Users className="text-blue-500" /> Guest Management
                                </h3>
                                <p className="text-sm text-[var(--text-secondary)]">Manage guests for <span className="font-bold text-blue-600">{selectedEvent.name}</span></p>
                            </div>
                            <button onClick={() => setShowVisitorModal(false)} className="hover:bg-gray-100 p-2 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        {/* Toolbar */}
                        <div className="p-4 border-b border-[var(--border-color)] flex flex-wrap gap-3 items-center bg-[var(--bg-surface)]">
                            {/* Upload CSV */}
                            <label className={`flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold text-sm cursor-pointer hover:bg-blue-100 transition-colors ${uploading ? 'opacity-50 cursor-wait' : ''}`}>
                                {uploading ? <Loader size={16} className="animate-spin" /> : <Upload size={16} />}
                                {uploading ? 'Uploading...' : 'Upload CSV'}
                                <input type="file" accept=".csv" className="hidden" onChange={handleFileUpload} disabled={uploading} />
                            </label>

                            {/* Generate Passes */}
                            <button
                                onClick={handleGeneratePasses}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-700 rounded-lg font-bold text-sm hover:bg-purple-100 transition-colors"
                            >
                                <QrCode size={16} /> Generate Passes
                            </button>

                            {/* Send Emails */}
                            <button
                                onClick={handleSendEmails}
                                disabled={sending}
                                className={`flex items-center gap-2 px-4 py-2 bg-green-50 text-green-700 rounded-lg font-bold text-sm hover:bg-green-100 transition-colors ${sending ? 'opacity-50 cursor-wait' : ''}`}
                            >
                                {sending ? <Loader size={16} className="animate-spin" /> : <Mail size={16} />}
                                {sending ? 'Sending...' : 'Send Emails'}
                            </button>

                            <div className="ml-auto text-xs text-[var(--text-secondary)]">
                                Total Guests: <span className="font-bold text-[var(--text-primary)]">{visitors.length}</span>
                            </div>
                        </div>

                        {/* Table */}
                        <div className="flex-1 overflow-auto p-0">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-[var(--bg-primary)] sticky top-0 z-10 text-xs font-bold uppercase text-[var(--text-secondary)] border-b border-[var(--border-color)]">
                                    <tr>
                                        <th className="p-4">Name</th>
                                        <th className="p-4">ID Number</th>
                                        <th className="p-4">Contact</th>
                                        <th className="p-4">Email</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)] text-sm">
                                    {visitorLoading ? (
                                        <tr><td colSpan={6} className="p-8 text-center"><Loader className="mx-auto animate-spin" /> Loading...</td></tr>
                                    ) : visitors.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="p-8 text-center text-gray-400">
                                                No guests registered. Upload a CSV to get started or
                                                <a href="/guests_template.csv" download className="text-blue-500 hover:underline ml-1 font-bold">Download Template</a>.
                                            </td>
                                        </tr>
                                    ) : (
                                        visitors.map((v, i) => (
                                            <tr key={i} className="hover:bg-[var(--bg-primary)]">
                                                <td className="p-4 font-bold">{v.visitor_name}</td>
                                                <td className="p-4 font-mono">{v.visitor_identifier}</td>
                                                <td className="p-4">{v.phone_number || '-'}</td>
                                                <td className="p-4">{v.email || '-'}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold ${v.status === 'checked_in' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                                                        {v.status === 'checked_in' ? 'Checked In' : 'Registered'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        onClick={() => setSelectedVisitor(v)}
                                                        className="p-2 hover:bg-blue-50 text-blue-600 rounded-full transition-colors"
                                                        title="View Gate Pass"
                                                    >
                                                        <Eye size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Individual Visitor Pass Modal */}
            {selectedVisitor && selectedEvent && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    <div className="bg-white rounded-3xl p-8 w-full max-w-sm text-center shadow-2xl animate-zoom-in relative">
                        <button onClick={() => setSelectedVisitor(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24} /></button>

                        <div className="mb-6 border-b pb-4">
                            <h3 className="text-xl font-black text-gray-900 mb-1">{selectedEvent.name}</h3>
                            <p className="text-gray-500 text-xs uppercase tracking-widest">Guest Pass</p>
                        </div>

                        <div className="bg-white p-4 rounded-2xl border-2 border-dashed border-gray-200 inline-block mb-6 shadow-sm" ref={visitorQrRef}>
                            <QRCodeCanvas
                                value={`VISITOR:${selectedVisitor.id}`}
                                size={200}
                                level="H"
                            />
                        </div>

                        <div className="mb-6 text-left bg-gray-50 p-4 rounded-xl">
                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">Guest</div>
                            <div className="font-bold text-lg mb-2">{selectedVisitor.visitor_name}</div>

                            <div className="text-xs text-gray-500 uppercase font-bold mb-1">ID Number</div>
                            <div className="font-mono text-sm">{selectedVisitor.visitor_identifier}</div>
                        </div>

                        <button
                            onClick={downloadVisitorQR}
                            className="w-full py-4 bg-purple-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors"
                        >
                            <Download size={20} /> Download Pass
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
