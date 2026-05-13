import { useState, useEffect } from 'react'
import {
    CheckCircle, Download, UploadCloud, Users,
    BookOpen, UserCheck, Layers, ChevronRight, Play,
    Building2, CalendarDays, Loader2, ArrowRight, Image
} from 'lucide-react'
import ThreeDProgressBar from './ThreeDProgressBar'

export default function BulkUpload() {
    const [loading, setLoading] = useState(false)
    const [messages, setMessages] = useState<{ type: string, text: string }[]>([])
    const [currentStep, setCurrentStep] = useState(0)
    const [stats, setStats] = useState({
        students: 0,
        lecturers: 0,
        courses: 0,
        classrooms: 0,
        classes: 0
    })

    const steps = [
        {
            id: 'lecturers',
            title: 'Step 1: Lecturers',
            description: 'Register staff and faculty members first.',
            endpoint: 'lecturers',
            icon: <UserCheck size={24} />,
            color: 'bg-purple-500',
            example: 'full_name,email,admission_number,school,phone_number,profile_image\nDr. Smith,smith@demo.com,LEC001,Computing,+254700123456,https://example.com/photo.jpg',
            status: 'pending'
        },
        {
            id: 'classrooms',
            title: 'Step 2: Classrooms',
            description: 'Define physical rooms, labs and lecture halls.',
            endpoint: 'classrooms',
            icon: <Building2 size={24} />,
            color: 'bg-green-500',
            example: 'room_code,room_name,building,floor,capacity\nLH1,Hall 1,Main,0,150',
            status: 'pending'
        },
        {
            id: 'courses',
            title: 'Step 3: Courses',
            description: 'Populate the academic course catalog.',
            endpoint: 'courses',
            icon: <BookOpen size={24} />,
            color: 'bg-orange-500',
            example: 'course_code,course_name,dept,credits,semester\nCS101,Computer Science,CS,3,2025',
            status: 'pending'
        },
        {
            id: 'classes',
            title: 'Step 4: Timetable',
            description: 'Link everything into weekly recurring slots.',
            endpoint: 'classes',
            icon: <CalendarDays size={24} />,
            color: 'bg-indigo-500',
            example: 'course,lecturer_email,room,day,start,end\nCS101,smith@demo.com,LH1,0,08:30,11:30',
            status: 'pending'
        },
        {
            id: 'students',
            title: 'Step 5: Students',
            description: 'Finally, register the students to the system.',
            endpoint: 'students',
            icon: <Users size={24} />,
            color: 'bg-blue-500',
            example: 'admission_number,first_name,last_name,email,school,status,phone_number,profile_image\nSTD202,Jane,Doe,jane@example.com,ICT,Active,+254711223344,/static/profiles/jane.jpg\n\nOptions: Active, Graduated, Suspended, Registered, Deferred',
            status: 'pending'
        },
        {
            id: 'registrations',
            title: 'Step 6: Course Reg.',
            description: 'Map students to their specific units (optional).',
            endpoint: 'registrations',
            icon: <BookOpen size={24} />,
            color: 'bg-pink-500',
            example: 'admission_number,course_code,semester\nSTD001,CS101,Year 1 Sem 2',
            status: 'pending'
        },
        {
            id: 'photos',
            title: 'Step 7: Student Photos',
            description: 'Bulk sync profile images using a ZIP file and mapping CSV.',
            endpoint: 'photos',
            icon: <Image size={24} />,
            color: 'bg-teal-500',
            example: 'MATCHING MODES:\n1. DIRECT: Name your photos as the Admission Number (e.g., ADM123.jpg).\n2. CSV MAPPING: Include a CSV in the ZIP or upload one below mapping Admission -> Photo Name.\n\nCSV FORMAT:\nAdmission Number, Photo ID\n23ZAD107643, 2847\n\nLOGIC:\nMatches filename to Admission Number (e.g. 2847.jpg) or ends-with match if using CSV.',
            status: 'pending'
        }
    ]

    useEffect(() => {
        fetchStats()
    }, [])

    const fetchStats = async () => {
        try {
            const token = localStorage.getItem('token')
            const headers = { 'Authorization': `Bearer ${token}` }

            // Fetch live counts
            const [statsRes, coursesRes, usersRes, roomsRes, slotsRes] = await Promise.all([
                fetch('/api/dashboard/stats', { headers }),
                fetch('/api/timetable/courses', { headers }),
                fetch('/api/users/', { headers }),
                fetch('/api/timetable/classrooms', { headers }),
                fetch('/api/timetable/timetable', { headers })
            ])

            if (statsRes.ok && coursesRes.ok && usersRes.ok && roomsRes.ok && slotsRes.ok) {
                const [dash, courses, users, rooms, slots] = await Promise.all([
                    statsRes.json(), coursesRes.json(), usersRes.json(), roomsRes.json(), slotsRes.json()
                ])

                const lecs = users.filter((u: any) => u.admission_number.startsWith('LEC') || u.email.includes('lecturer')).length

                setStats({
                    students: dash.active_students,
                    lecturers: lecs,
                    courses: courses.length,
                    classrooms: rooms.length,
                    classes: slots.length
                })

                // Auto-advance step logic based on what exists
                if (lecs > 0 && currentStep === 0) setCurrentStep(1)
                if (rooms.length > 0 && currentStep === 1) setCurrentStep(2)
                if (courses.length > 0 && currentStep === 2) setCurrentStep(3)
                if (slots.length > 0 && currentStep === 3) setCurrentStep(4)
                if (users.length > 10 && currentStep === 4) setCurrentStep(5)
            }
        } catch (e) {
            console.error("Stats fetch error", e)
        }
    }

    const [uploadProgress, setUploadProgress] = useState(0)
    const [isUploading, setIsUploading] = useState(false)
    const [uploadingType, setUploadingType] = useState('')

    // Photos Upload State
    const [csvFile, setCsvFile] = useState<File | null>(null)
    const [zipFile, setZipFile] = useState<File | null>(null)
    const [isCompressing, setIsCompressing] = useState(false)
    const [compressionProgress, setCompressionProgress] = useState(0)
    const [useCompression, setUseCompression] = useState(true)

    const handlePhotoUpload = async () => {
        if (!zipFile) return
        
        let finalZip = zipFile
        setLoading(true)

        // 1. Client-Side Compression Logic
        if (useCompression && zipFile.name.toLowerCase().endsWith('.zip')) {
            try {
                setIsCompressing(true)
                setMessages(prev => [...prev, { type: 'info', text: 'Preparing smart compression...' }])
                
                const JSZip = (await import('jszip')).default
                const imageCompression = (await import('browser-image-compression')).default
                
                const originalZip = new JSZip()
                const zipData = await originalZip.loadAsync(zipFile)
                const newZip = new JSZip()
                
                const files = Object.keys(zipData.files).filter(name => !zipData.files[name].dir)
                let processedCount = 0
                
                for (const filename of files) {
                    const fileData = await zipData.files[filename].async('blob')
                    
                    // Only compress images
                    if (filename.toLowerCase().match(/\.(jpg|jpeg|png|webp)$/)) {
                        try {
                            const options = {
                                maxSizeMB: 0.2, // Aim for 200KB per image
                                maxWidthOrHeight: 1000,
                                useWebWorker: true,
                                initialQuality: 0.7
                            }
                            const compressedBlob = await imageCompression(new File([fileData], filename), options)
                            newZip.file(filename, compressedBlob)
                        } catch (e) {
                            newZip.file(filename, fileData) // Fallback to original if compression fails
                        }
                    } else {
                        newZip.file(filename, fileData) // Keep non-image files as is
                    }
                    
                    processedCount++
                    setCompressionProgress(Math.round((processedCount / files.length) * 100))
                }
                
                setMessages(prev => [...prev, { type: 'success', text: `Compression complete! Optimized ${files.length} images.` }])
                finalZip = (await newZip.generateAsync({ type: 'blob' })) as File
                setIsCompressing(false)
            } catch (error: any) {
                console.error("Compression failed", error)
                setMessages(prev => [...prev, { type: 'error', text: `Compression failed: ${error.message}. Proceeding with original file.` }])
                setIsCompressing(false)
            }
        }

        // 2. Upload Logic
        setIsUploading(true)
        setUploadProgress(0)
        setUploadingType('Optimized Bulk Photos')

        const formData = new FormData()
        formData.append('zip_file', finalZip, "optimized_photos.zip")
        if (csvFile) formData.append('csv_file', csvFile)

        try {
            const token = localStorage.getItem('token')
            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.timeout = 1800000 
                
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
                })

                xhr.onload = () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        try {
                            const data = JSON.parse(xhr.responseText)
                            setMessages(prev => [...prev, { type: 'success', text: `Success: ${data.matched || data.count || 0} photos synced.` }])
                            resolve(data)
                        } catch (err) { reject(new Error("Invalid server response")) }
                    } else {
                        reject(new Error(`Server Error: ${xhr.status}`))
                    }
                }
                xhr.onerror = () => reject(new Error("Network Error"))
                xhr.open('POST', '/api/admin/bulk/photos')
                xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                xhr.send(formData)
            })

            setCsvFile(null)
            setZipFile(null)
            fetchStats()
        } catch (e: any) {
            setMessages(prev => [...prev, { type: 'error', text: `Upload Error: ${e.message}` }])
        } finally {
            setLoading(false)
            setTimeout(() => { setIsUploading(false); setUploadProgress(0); setCompressionProgress(0) }, 1000)
        }
    }

    const handleUpload = async (endpoint: string, file: File, type: string) => {
        setLoading(true)
        setIsUploading(true)
        setUploadingType(type)
        setUploadProgress(0)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const token = localStorage.getItem('token')
            let url = `/api/admin/bulk/${endpoint}` // Default

            if (endpoint === 'registrations') url = '/api/users/registrations/bulk-upload'

            await new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest()
                xhr.upload.addEventListener('progress', (e) => {
                    if (e.lengthComputable) {
                        setUploadProgress(Math.round((e.loaded / e.total) * 100))
                    }
                })
                xhr.addEventListener('load', () => {
                    if (xhr.status >= 200 && xhr.status < 300) {
                        const data = JSON.parse(xhr.responseText)

                        // Handle new detailed response format
                        if (data.added !== undefined && data.updated !== undefined) {
                            // New format with upsert
                            const total = data.added + data.updated
                            let msg = `✓ Success: ${total} ${type} processed`
                            if (data.added > 0) msg += ` (${data.added} new)`
                            if (data.updated > 0) msg += ` (${data.updated} updated)`
                            if (data.errors > 0) msg += ` • ${data.errors} errors`
                            setMessages(prev => [...prev, { type: 'success', text: msg }])
                        } else {
                            // Legacy format
                            const count = data.added || data.count || 0
                            setMessages(prev => [...prev, { type: 'success', text: `Success: ${count} ${type} processed.` }])
                        }

                        // Show detailed errors/warnings if any
                        const errorList = data.error_details || data.errors
                        if (errorList && Array.isArray(errorList) && errorList.length > 0) {
                            errorList.slice(0, 5).forEach((err: string) => {
                                setMessages(prev => [...prev, { type: 'error', text: err }])
                            })
                            if (errorList.length > 5) {
                                setMessages(prev => [...prev, { type: 'error', text: `...and ${errorList.length - 5} more errors.` }])
                            }
                        }

                        fetchStats()
                        resolve(data)
                    } else {
                        if (xhr.status === 401) {
                            window.location.href = '/' // Logout/Login
                            return
                        }
                        const data = JSON.parse(xhr.responseText)
                        setMessages(prev => [...prev, { type: 'error', text: `${type} Error: ${data.detail || 'Failed'}` }])
                        reject(new Error(data.detail))
                    }
                })
                xhr.addEventListener('error', () => {
                    reject(new Error("Network connection failed during upload. Check server logs."))
                })
                xhr.addEventListener('abort', () => {
                    reject(new Error("Upload aborted."))
                })
                xhr.open('POST', url)
                xhr.setRequestHeader('Authorization', `Bearer ${token}`)
                xhr.send(formData)
            })
        } catch (e: any) {
            console.error(e)
            setMessages(prev => [...prev, { type: 'error', text: `${type} Failed: ${e.message || 'Unknown error'}` }])
        } finally {
            setLoading(false)
            setTimeout(() => { setIsUploading(false); setUploadProgress(0) }, 1000)
        }
    }

    const downloadTemplate = (type: string) => {
        const step = steps.find(s => s.id === type.toLowerCase()) ||
            steps.find(s => s.title.includes(type))
        let content = step?.example.replace('&#10;', '\n') || ""

        const blob = new Blob([content], { type: 'text/csv' })
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${type.toLowerCase()}_template.csv`
        a.click()
    }

    return (
        <div className="animate-fade-in max-w-6xl mx-auto space-y-8 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-3xl font-bold mb-2">Smart Setup Guide</h2>
                    <p className="text-[var(--text-secondary)]">Follow the sequence to initialize your campus database correctly.</p>
                </div>
                <div className="flex gap-4">
                    <button onClick={fetchStats} className="px-4 py-2 border border-[var(--border-color)] rounded-lg text-sm hover:bg-[var(--bg-primary)]">Refresh Live Stats</button>
                </div>
            </div>

            {/* Stepper Hero */}
            <div className="glass-card p-1 rounded-3xl overflow-hidden">
                <div className="flex">
                    {steps.map((step, i) => (
                        <button
                            key={step.id}
                            onClick={() => setCurrentStep(i)}
                            className={`flex-1 py-4 flex flex-col items-center gap-2 transition-all relative ${currentStep === i ? 'bg-[var(--bg-primary)] shadow-sm' : 'opacity-40 hover:opacity-100'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${currentStep >= i ? step.color + ' text-white shadow-lg' : 'bg-gray-200'}`}>
                                {currentStep > i ? <CheckCircle size={20} /> : step.icon}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">{step.id}</span>
                            {i < steps.length - 1 && (
                                <ChevronRight className="absolute -right-3 top-1/2 -translate-y-1/2 opacity-20" size={16} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Active Step Panel */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="glass-card p-8 rounded-3xl relative overflow-hidden group">
                        <div className={`absolute top-0 right-0 w-32 h-32 ${steps[currentStep].color} opacity-10 rounded-bl-full transition-all group-hover:scale-110`} />

                        <div className="relative z-10">
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h3 className="text-2xl font-bold mb-2">{steps[currentStep].title}</h3>
                                    <p className="text-[var(--text-secondary)]">{steps[currentStep].description}</p>
                                </div>
                                <div className={`p-4 rounded-2xl ${steps[currentStep].color} text-white shadow-xl`}>
                                    {steps[currentStep].icon}
                                </div>
                            </div>

                            <div className="bg-[var(--bg-primary)] rounded-2xl p-6 mb-8 border border-[var(--border-color)]">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">CSV Sample Format</span>
                                    <button onClick={() => downloadTemplate(steps[currentStep].id)} className="text-xs text-[var(--primary-color)] font-bold flex items-center gap-1">
                                        <Download size={14} /> {steps[currentStep].id === 'photos' ? 'Download Instructions' : 'Download Template'}
                                    </button>
                                </div>
                                <pre className="text-sm font-mono overflow-x-auto p-4 bg-black/5 rounded-xl border border-[var(--border-color)]">
                                    {steps[currentStep].example}
                                </pre>
                            </div>

                            {steps[currentStep].id === 'photos' ? (
                                <div className="space-y-4 w-full">
                                    <div className={`p-4 border-2 border-dashed rounded-2xl bg-[var(--bg-primary)] transition-colors ${csvFile ? 'border-green-500 bg-green-50' : 'border-[var(--border-color)] hover:border-[var(--primary-color)]'}`}>
                                        <label className="flex items-center gap-4 cursor-pointer">
                                            <div className="p-3 bg-white rounded-xl shadow-sm">
                                                {csvFile ? <CheckCircle className="text-green-500" size={24} /> : <UploadCloud size={24} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold">1. Upload Mapping CSV (Optional)</p>
                                                <p className="text-sm text-[var(--text-secondary)]">{csvFile ? csvFile.name : "Only if filenames don't match Adm No"}</p>
                                            </div>
                                            <input type="file" accept=".csv" className="hidden" onChange={e => { if (e.target.files) setCsvFile(e.target.files[0]) }} />
                                        </label>
                                    </div>

                                    <div className={`p-4 border-2 border-dashed rounded-2xl bg-[var(--bg-primary)] transition-colors ${zipFile ? 'border-green-500 bg-green-50' : 'border-[var(--border-color)] hover:border-[var(--primary-color)]'}`}>
                                        <label className="flex items-center gap-4 cursor-pointer">
                                            <div className="p-3 bg-white rounded-xl shadow-sm">
                                                {zipFile ? <CheckCircle className="text-green-500" size={24} /> : <Image size={24} />}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-bold">2. Upload Images ZIP</p>
                                                <p className="text-sm text-[var(--text-secondary)]">{zipFile ? zipFile.name : "Contains actual image files"}</p>
                                            </div>
                                            <input type="file" accept=".zip" className="hidden" onChange={e => { if (e.target.files) setZipFile(e.target.files[0]) }} />
                                        </label>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-[var(--bg-primary)] rounded-2xl border border-[var(--border-color)]">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Image size={18} /></div>
                                            <div>
                                                <p className="text-sm font-bold">Enable Smart Compression</p>
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase font-black">Reduces 2GB to ~150MB automatically</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => setUseCompression(!useCompression)}
                                            className={`w-12 h-6 rounded-full transition-all relative ${useCompression ? 'bg-green-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${useCompression ? 'right-1' : 'left-1'}`} />
                                        </button>
                                    </div>

                                    <button
                                        onClick={handlePhotoUpload}
                                        disabled={!zipFile || loading}
                                        className="w-full py-4 bg-[var(--primary-color)] text-white rounded-xl font-bold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                                    >
                                        {loading ? (isCompressing ? 'Optimizing Images...' : 'Uploading...') : 'Start Bulk Photo Upload'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex gap-4">
                                    <label className={`flex-1 cursor-pointer ${steps[currentStep].color} text-white rounded-2xl py-6 flex flex-col items-center justify-center gap-2 transition-all hover:scale-[1.02] shadow-xl hover:shadow-2xl active:scale-95`}>
                                        <UploadCloud size={32} />
                                        <span className="font-bold">
                                            {`Upload ${steps[currentStep].title.split(':')[1]}`}
                                        </span>
                                        <input type="file" accept=".csv"
                                            onChange={(e) => e.target.files && handleUpload(steps[currentStep].endpoint, e.target.files[0], steps[currentStep].id)}
                                            disabled={loading}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Progress Overlay */}
                    {(isUploading || isCompressing) && (
                        <div className="bg-[var(--bg-surface)] p-6 rounded-3xl border border-[var(--border-color)] animate-in fade-in slide-in-from-bottom-4 shadow-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="animate-spin text-[var(--primary-color)]">
                                        <Loader2 size={24} />
                                    </div>
                                    <span className="font-bold">
                                        {isCompressing ? `Optimizing Images: ${compressionProgress}%` : `Uploading Optimized Package: ${uploadProgress}%`}
                                    </span>
                                </div>
                                <span className="text-xl font-bold font-mono text-[var(--primary-color)]">
                                    {isCompressing ? compressionProgress : uploadProgress}%
                                </span>
                            </div>
                            <div className="px-4 pb-2">
                                <ThreeDProgressBar 
                                    progress={isCompressing ? compressionProgress : uploadProgress} 
                                    colorClass={isCompressing ? 'bg-blue-500' : steps[currentStep].color} 
                                />
                            </div>
                            <p className="text-[10px] text-center text-[var(--text-secondary)] font-bold uppercase tracking-widest mt-2">
                                {isCompressing ? "Compressing locally - No data used yet" : "Sending compressed files to server"}
                            </p>
                        </div>
                    )}

                    {/* Log */}
                    <div className="space-y-3">
                        {messages.slice(-5).reverse().map((m, i) => (
                            <div key={i} className={`p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-left-4 border ${m.type === 'success' ? 'bg-green-50/50 border-green-200 text-green-700' : 'bg-red-50/50 border-red-200 text-red-700'}`}>
                                <div className={`p-2 rounded-full ${m.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                                    {m.type === 'success' ? <CheckCircle size={16} /> : <Play size={16} className="rotate-90" />}
                                </div>
                                <p className="text-sm font-medium">{m.text}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Live Stats Context Sidebar */}
                <div className="space-y-6">
                    <div className="glass-card p-6 rounded-3xl">
                        <h3 className="font-bold mb-6 flex items-center gap-2">
                            <Layers size={18} className="text-indigo-500" /> System State
                        </h3>
                        <div className="space-y-4">
                            <StatProgress label="Lecturers" value={stats.lecturers} target={10} color="bg-purple-500" />
                            <StatProgress label="Classrooms" value={stats.classrooms} target={15} color="bg-green-500" />
                            <StatProgress label="Courses" value={stats.courses} target={20} color="bg-orange-500" />
                            <StatProgress label="Weekly Slots" value={stats.classes} target={50} color="bg-indigo-500" />
                            <StatProgress label="Students" value={stats.students} target={100} color="bg-blue-500" />
                        </div>

                        <div className="mt-8 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                            <h4 className="text-xs font-black uppercase tracking-widest text-indigo-400 mb-2">Next Task</h4>
                            <p className="text-sm text-indigo-700 font-medium">
                                {currentStep < 4 ? `Upload ${steps[currentStep + 1].id} next` : 'System configuration complete!'}
                            </p>
                            <button
                                onClick={() => setCurrentStep(prev => Math.min(prev + 1, 4))}
                                className="mt-3 text-xs flex items-center gap-1 text-indigo-600 font-bold hover:gap-2 transition-all"
                            >
                                Advance Guide <ArrowRight size={12} />
                            </button>
                        </div>
                    </div>

                    <div className="glass-card p-6 rounded-3xl bg-[image:var(--gradient-primary)] text-white">
                        <h3 className="font-bold mb-2">Need a CSV?</h3>
                        <p className="text-xs opacity-80 mb-4">Make sure your file follows our template exactly for successful mapping.</p>
                        <button
                            onClick={() => downloadTemplate(steps[currentStep].id)}
                            className="w-full py-3 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                        >
                            <Download size={16} /> Get Step {currentStep + 1} Template
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatProgress({ label, value, target, color }: any) {
    const pct = Math.min((value / target) * 100, 100)
    return (
        <div className="space-y-1.5">
            <div className="flex justify-between items-end">
                <span className="text-xs font-bold text-[var(--text-secondary)]">{label}</span>
                <span className="text-xs font-black font-mono">{value} <span className="opacity-30">/ {target}</span></span>
            </div>
            <div className="h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden">
                <div className={`h-full ${color} transition-all duration-1000`} style={{ width: `${pct}%` }} />
            </div>
        </div>
    )
}
