import { useState, useEffect, useRef } from 'react'
import { 
    Search, Printer, Download, FileText, ImageIcon, CheckSquare, Square, 
    ChevronLeft, ChevronRight, User, Building, Shield, ArrowLeft, Loader2, QrCode
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function IDPrinting() {
    const [users, setUsers] = useState<any[]>([])
    const [filteredUsers, setFilteredUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
    const [isExporting, setIsExporting] = useState(false)
    const [companySettings, setCompanySettings] = useState<any>({
        company_name: 'Riara University',
        logo_url: ''
    })

    const cardsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        fetchUsers()
        fetchCompanySettings()
    }, [])

    useEffect(() => {
        const filtered = users.filter(u => 
            u.role === 'Student' && (
            u.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            u.admission_number?.toLowerCase().includes(searchQuery.toLowerCase())
        ))
        setFilteredUsers(filtered)
    }, [users, searchQuery])

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/users', {
                headers: { 'Authorization': `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setUsers(data)
            }
        } catch (e) {
            console.error(e)
        } finally {
            setLoading(false)
        }
    }

    const fetchCompanySettings = async () => {
        try {
            const res = await fetch('/api/users/public-company-settings')
            if (res.ok) {
                const data = await res.json()
                setCompanySettings(data)
            }
        } catch (e) {
            console.error(e)
        }
    }

    const toggleSelect = (id: number) => {
        const next = new Set(selectedIds)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setSelectedIds(next)
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredUsers.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(filteredUsers.map(u => u.id)))
        }
    }

    const exportToPNG = async (userId: number) => {
        const front = document.getElementById(`id-card-front-${userId}`)
        const back = document.getElementById(`id-card-back-${userId}`)
        if (!front || !back) return

        try {
            const canvasFront = await html2canvas(front, { scale: 2, useCORS: true })
            const canvasBack = await html2canvas(back, { scale: 2, useCORS: true })
            
            const link = document.createElement('a')
            
            // Download Front
            link.download = `ID_Front_${userId}.png`
            link.href = canvasFront.toDataURL('image/png')
            link.click()
            
            // Download Back
            link.download = `ID_Back_${userId}.png`
            link.href = canvasBack.toDataURL('image/png')
            link.click()
        } catch (e) {
            console.error(e)
        }
    }

    const exportBulkPDF = async () => {
        if (selectedIds.size === 0) return
        setIsExporting(true)
        
        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            const margin = 10
            const cardWidth = 85
            const cardHeight = 54
            let x = margin
            let y = margin
            
            const selectedUsers = users.filter(u => selectedIds.has(u.id))
            
            for (let i = 0; i < selectedUsers.length; i++) {
                const user = selectedUsers[i]
                const front = document.getElementById(`id-card-front-${user.id}`)
                const back = document.getElementById(`id-card-back-${user.id}`)
                
                if (front && back) {
                    const canvasFront = await html2canvas(front, { scale: 2, useCORS: true })
                    const canvasBack = await html2canvas(back, { scale: 2, useCORS: true })
                    
                    const imgFront = canvasFront.toDataURL('image/jpeg', 0.95)
                    const imgBack = canvasBack.toDataURL('image/jpeg', 0.95)
                    
                    // Add Front
                    pdf.addImage(imgFront, 'JPEG', x, y, cardWidth, cardHeight)
                    
                    // Add Back next to it or below
                    if (x + cardWidth * 2 + margin <= 210) {
                        pdf.addImage(imgBack, 'JPEG', x + cardWidth + 5, y, cardWidth, cardHeight)
                        y += cardHeight + 10
                    } else {
                        y += cardHeight + 5
                        pdf.addImage(imgBack, 'JPEG', x, y, cardWidth, cardHeight)
                        y += cardHeight + 10
                    }
                    
                    if (y + cardHeight + margin > 297) {
                        pdf.addPage()
                        y = margin
                    }
                }
            }
            
            pdf.save(`Student_IDs_${new Date().getTime()}.pdf`)
        } catch (e) {
            console.error(e)
            alert('Failed to generate PDF. Check console for details.')
        } finally {
            setIsExporting(false)
        }
    }

    const exportOnlyQRCodes = async () => {
        if (selectedIds.size === 0) return
        setIsExporting(true)
        
        try {
            const pdf = new jsPDF('p', 'mm', 'a4')
            const margin = 20
            const qrSize = 40
            const spacing = 10
            let x = margin
            let y = margin
            
            const selectedUsers = users.filter(u => selectedIds.has(u.id))
            
            for (let i = 0; i < selectedUsers.length; i++) {
                const user = selectedUsers[i]
                const back = document.getElementById(`id-card-back-${user.id}`)
                
                if (back) {
                    const qrContainer = back.querySelector('.bg-white.rounded-2xl') as HTMLElement
                    if (qrContainer) {
                        const canvas = await html2canvas(qrContainer, { scale: 3, useCORS: true })
                        const imgData = canvas.toDataURL('image/png')
                        
                        pdf.addImage(imgData, 'PNG', x, y, qrSize, qrSize)
                        pdf.setFontSize(8)
                        pdf.text(user.admission_number, x + qrSize/2, y + qrSize + 5, { align: 'center' })
                        pdf.text(user.full_name, x + qrSize/2, y + qrSize + 8, { align: 'center' })
                        
                        x += qrSize + spacing
                        
                        if (x + qrSize + margin > 210) {
                            x = margin
                            y += qrSize + 20
                        }
                        
                        if (y + qrSize + margin > 297) {
                            pdf.addPage()
                            x = margin
                            y = margin
                        }
                    }
                }
            }
            
            pdf.save(`Student_QR_Codes_${new Date().getTime()}.pdf`)
        } catch (e) {
            console.error(e)
            alert('Failed to generate QR PDF')
        } finally {
            setIsExporting(false)
        }
    }

    if (loading) return (
        <div className="flex items-center justify-center h-96">
            <Loader2 className="animate-spin text-purple-600" size={48} />
        </div>
    )

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
                        ID Card Production
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">
                        Select students to generate and print ID cards (Front & Back)
                    </p>
                </div>

                <div className="flex gap-3">
                    <button 
                        onClick={exportBulkPDF}
                        disabled={selectedIds.size === 0 || isExporting}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileText size={20} />}
                        Export Selected (PDF)
                    </button>
                    <button 
                        onClick={exportOnlyQRCodes}
                        disabled={selectedIds.size === 0 || isExporting}
                        className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-gray-100 dark:border-gray-700 rounded-xl font-bold hover:bg-gray-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <QrCode size={20} />
                        QR Codes Only
                    </button>
                </div>
            </div>

            {/* Controls */}
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text"
                        placeholder="Search students by name or admission number..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                </div>
                <button 
                    onClick={toggleSelectAll}
                    className="flex items-center gap-2 px-4 py-3 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
                >
                    {selectedIds.size === filteredUsers.length ? <CheckSquare className="text-purple-600" /> : <Square />}
                    {selectedIds.size === filteredUsers.length ? 'Deselect All' : 'Select All'}
                </button>
            </div>

            {/* Student List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredUsers.map(student => (
                    <div 
                        key={student.id}
                        className={`bg-white dark:bg-gray-800 rounded-2xl p-4 border-2 transition-all cursor-pointer ${selectedIds.has(student.id) ? 'border-purple-500 shadow-xl scale-[1.02]' : 'border-gray-100 dark:border-gray-700 shadow-sm'}`}
                        onClick={() => toggleSelect(student.id)}
                    >
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 flex items-center justify-center text-purple-600 font-bold overflow-hidden">
                                    {student.profile_image ? (
                                        <img src={student.profile_image} className="w-full h-full object-cover" />
                                    ) : (
                                        student.full_name.charAt(0)
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-gray-100">{student.full_name}</h3>
                                    <p className="text-xs font-mono text-gray-500">{student.admission_number}</p>
                                </div>
                            </div>
                            <div className={`p-1 rounded-md ${selectedIds.has(student.id) ? 'text-purple-600' : 'text-gray-300'}`}>
                                {selectedIds.has(student.id) ? <CheckSquare size={24} /> : <Square size={24} />}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); exportToPNG(student.id) }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 text-xs font-bold transition-colors"
                            >
                                <ImageIcon size={14} /> PNG
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); /* TODO: Single PDF? */ }}
                                className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-100 text-xs font-bold transition-colors"
                            >
                                <Printer size={14} /> Print
                            </button>
                        </div>

                        {/* Hidden Real Card Renderers for Capturing */}
                        <div className="fixed -left-[2000px] top-0">
                            <IDCardFront student={student} companySettings={companySettings} />
                            <IDCardBack student={student} companySettings={companySettings} />
                        </div>
                    </div>
                ))}
            </div>

            {filteredUsers.length === 0 && (
                <div className="text-center py-20">
                    <Search className="mx-auto text-gray-300 mb-4" size={64} />
                    <h3 className="text-xl font-bold text-gray-500">No students found</h3>
                    <p className="text-gray-400">Try searching for a different name or admission number</p>
                </div>
            )}
        </div>
    )
}

// Sub-components for actual ID rendering (High Resolution)
function IDCardFront({ student, companySettings }: any) {
    return (
        <div 
            id={`id-card-front-${student.id}`}
            className="w-[340px] h-[216px] bg-white rounded-[15px] overflow-hidden relative shadow-2xl"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
            {/* Header */}
            <div className="h-[60px] bg-gradient-to-r from-purple-700 to-indigo-800 flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-white rounded-lg p-1">
                        <img src={companySettings.logo_url || "/logo.png"} className="w-full h-full object-contain" />
                    </div>
                    <div className="text-white">
                        <h2 className="text-[12px] font-black uppercase tracking-tight leading-none">{companySettings.company_name}</h2>
                        <p className="text-[7px] font-bold opacity-80 tracking-widest mt-0.5">OFFICIAL STUDENT ID</p>
                    </div>
                </div>
                <div className="text-white text-[8px] font-black border border-white/30 px-2 py-1 rounded bg-white/10 uppercase">Verified</div>
            </div>

            {/* Content */}
            <div className="p-4 flex gap-4">
                <div className="w-[100px] h-[120px] bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-100 shadow-sm">
                    {student.profile_image ? (
                        <img src={student.profile_image} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300"><User size={40} /></div>
                    )}
                </div>
                <div className="flex-1 pt-1">
                    <h3 className="text-indigo-900 text-[18px] font-black leading-tight break-words">{student.full_name.toUpperCase()}</h3>
                    <p className="text-purple-600 text-[14px] font-black mt-1">{student.admission_number}</p>
                    
                    <div className="mt-4 space-y-2">
                        <div>
                            <p className="text-[7px] text-gray-400 font-bold uppercase">School/Dept</p>
                            <p className="text-[10px] font-bold text-gray-800">{student.school || 'General Studies'}</p>
                        </div>
                        <div className="flex justify-between items-end">
                            <div>
                                <p className="text-[7px] text-gray-400 font-bold uppercase">Status</p>
                                <p className="text-[9px] font-black text-green-600">ACTIVE</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[7px] text-gray-400 font-bold uppercase">Expiry</p>
                                <p className="text-[9px] font-bold text-gray-800">DEC 2026</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Footer Accent */}
            <div className="absolute bottom-0 left-0 w-full h-2 bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600"></div>
        </div>
    )
}

function IDCardBack({ student, companySettings }: any) {
    return (
        <div 
            id={`id-card-back-${student.id}`}
            className="w-[340px] h-[216px] bg-white rounded-[15px] overflow-hidden relative shadow-2xl flex flex-col items-center justify-center"
            style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
        >
            <div className="absolute top-4 left-0 w-full text-center">
                <h4 className="text-[12px] font-black text-gray-800 uppercase tracking-[0.2em]">Security Authorization</h4>
                <p className="text-[8px] text-gray-400 font-medium">Valid only within the university premises</p>
            </div>

            <div className="p-3 bg-white rounded-2xl shadow-inner border border-gray-100">
                <QRCodeSVG 
                    value={student.admission_number} 
                    size={110} 
                    level="H" 
                    imageSettings={{
                        src: companySettings.logo_url || "/logo.png",
                        height: 20,
                        width: 20,
                        excavate: true
                    }}
                />
            </div>

            <div className="mt-3 text-center">
                <p className="text-[12px] font-black text-purple-600 tracking-wider">{student.admission_number}</p>
                <p className="text-[6px] text-gray-400 mt-1 uppercase max-w-[200px]">This card remains property of the university. If found, please return to the nearest security office.</p>
            </div>

            <div className="absolute bottom-4 right-6 opacity-30">
                <img src={companySettings.logo_url || "/logo.png"} className="w-12 h-12 object-contain grayscale" />
            </div>
        </div>
    )
}
