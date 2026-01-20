import { useState, useEffect, useRef } from 'react'
import { Plus, Calendar, Users, MapPin, QrCode, Download, X, Search, FileText } from 'lucide-react'
import { QRCodeCanvas } from 'qrcode.react'

export default function EventManagement() {
    const [events, setEvents] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [showQRModal, setShowQRModal] = useState(false)
    const [selectedEvent, setSelectedEvent] = useState<any>(null)

    const qrRef = useRef<HTMLDivElement>(null)

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
                            <button className="text-sm font-bold text-primary-600 hover:underline">
                                View Visitors
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
        </div>
    )
}
