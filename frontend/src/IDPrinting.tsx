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
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10

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
        setCurrentPage(1)
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
            await document.fonts.ready;
            const canvasFront = await html2canvas(front, { scale: 2, useCORS: true, backgroundColor: null })
            const canvasBack = await html2canvas(back, { scale: 2, useCORS: true, backgroundColor: null })
            
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
            
            await document.fonts.ready;
            for (let i = 0; i < selectedUsers.length; i++) {
                const user = selectedUsers[i]
                const front = document.getElementById(`id-card-front-${user.id}`)
                const back = document.getElementById(`id-card-back-${user.id}`)
                
                if (front && back) {
                    const canvasFront = await html2canvas(front, { scale: 2, useCORS: true, backgroundColor: null })
                    const canvasBack = await html2canvas(back, { scale: 2, useCORS: true, backgroundColor: null })
                    
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
            
            await document.fonts.ready;
            for (let i = 0; i < selectedUsers.length; i++) {
                const user = selectedUsers[i]
                const back = document.getElementById(`id-card-back-${user.id}`)
                
                if (back) {
                    const qrContainer = back.querySelector('.bg-white.rounded-2xl') as HTMLElement
                    if (qrContainer) {
                        const canvas = await html2canvas(qrContainer, { scale: 3, useCORS: true, backgroundColor: null })
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
            {(() => {
                const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
                const startIndex = (currentPage - 1) * itemsPerPage
                const paginatedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage)

                return (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {paginatedUsers.map(student => (
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

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="mt-6 flex items-center justify-between bg-white dark:bg-gray-800 border border-gray-150 dark:border-gray-700 p-4 rounded-2xl shadow-sm">
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    Showing <span className="font-bold text-gray-900 dark:text-white">{startIndex + 1}</span> to <span className="font-bold text-gray-900 dark:text-white">{Math.min(startIndex + itemsPerPage, filteredUsers.length)}</span> of <span className="font-bold text-gray-900 dark:text-white">{filteredUsers.length}</span> students
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-55 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent font-bold text-xs transition-all flex items-center gap-1"
                                    >
                                        <ChevronLeft size={16} /> Prev
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter(pageNum => pageNum === 1 || pageNum === totalPages || Math.abs(pageNum - currentPage) <= 1)
                                        .map((pageNum, index, arr) => {
                                            const showEllipsis = index > 0 && pageNum - arr[index - 1] > 1;
                                            return (
                                                <div key={pageNum} className="flex items-center gap-1.5">
                                                    {showEllipsis && <span className="text-gray-400 text-xs">...</span>}
                                                    <button
                                                        onClick={() => setCurrentPage(pageNum)}
                                                        className={`w-8 h-8 rounded-xl text-xs font-extrabold transition-all ${
                                                            currentPage === pageNum
                                                                ? 'bg-purple-600 text-white shadow-md'
                                                                : 'hover:bg-gray-55 dark:hover:bg-gray-850 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800'
                                                        }`}
                                                    >
                                                        {pageNum}
                                                    </button>
                                                </div>
                                            );
                                        })
                                    }

                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-55 dark:hover:bg-gray-800 disabled:opacity-40 disabled:hover:bg-transparent font-bold text-xs transition-all flex items-center gap-1"
                                    >
                                        Next <ChevronRight size={16} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )
            })()}

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

// Sub-components for actual ID rendering (High Resolution Professional Design)
function IDCardFront({ student, companySettings }: any) {
    const nameParts = student.full_name ? student.full_name.trim().split(/\s+/) : [];
    const firstName = nameParts[0] || "";
    const lastName = nameParts.slice(1).join(" ") || "";

    return (
        <div 
            id={`id-card-front-${student.id}`}
            className="w-[340px] h-[216px] bg-white border border-gray-200 rounded-[16px] relative overflow-hidden select-none shadow-sm"
            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
        >
            {/* Left Column (Logo, Name, ID No, QR Code) */}
            <div className="absolute left-[15px] top-[14px] bottom-[14px] w-[145px] flex flex-col justify-between">
                {/* Logo & School Name */}
                <div className="flex items-center gap-2">
                    {companySettings.logo_url ? (
                        <img src={companySettings.logo_url} className="h-9 w-auto max-w-[135px] object-contain" />
                    ) : (
                        <>
                            <div className="w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center text-[#7A1975] font-black text-xs shrink-0 border border-purple-100">
                                RU
                            </div>
                            <div className="flex flex-col leading-[1.1]">
                                <div className="text-[10px] font-bold text-[#7A1975] uppercase tracking-wide leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>
                                    {companySettings.company_name || "Riara University"}
                                </div>
                                <div className="text-[5.5px] font-bold text-gray-400 uppercase tracking-widest mt-1 leading-none">
                                    {companySettings.tagline || "nurturing innovators"}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                {/* Student Name */}
                <div className="flex flex-col mt-2 space-y-0.5">
                    <div className="text-[18px] font-bold text-[#7A1975] leading-[1.1] uppercase break-words" style={{ fontFamily: "'Museo', sans-serif" }}>
                        {firstName}
                    </div>
                    <div className="text-[18px] font-bold text-[#7A1975] leading-[1.1] uppercase break-words" style={{ fontFamily: "'Museo', sans-serif" }}>
                        {lastName}
                    </div>
                </div>

                {/* ID Number */}
                <div className="text-[10px] font-bold text-[#7A1975] uppercase mt-1 leading-none tracking-wide" style={{ fontFamily: "'Museo Sans', sans-serif" }}>
                    ID NO: {student.admission_number}
                </div>

                {/* QR Code */}
                <div className="mt-1 flex items-end">
                    <div className="p-0.5 bg-white border border-gray-200 rounded-lg shadow-sm shrink-0">
                        <QRCodeSVG 
                            value={student.admission_number} 
                            size={44} 
                            level="H"
                        />
                    </div>
                </div>
            </div>

            {/* Center-Right Column (Student Image at top, Faculty Details at bottom) */}
            <div className="absolute left-[165px] top-0 bottom-0 w-[130px] flex flex-col border-l border-gray-100">
                {/* Student Photo */}
                <div className="w-full h-[148px] bg-slate-50 overflow-hidden border-b border-gray-150 relative">
                    {student.profile_image ? (
                        <img src={student.profile_image} className="w-full h-full object-cover" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 bg-slate-100">
                            <User size={44} />
                        </div>
                    )}
                </div>

                {/* Details Section (FACULTY, COURSE, VALIDITY) */}
                <div className="flex-1 bg-white px-2 py-1 flex flex-col justify-center text-[10px] leading-[1.3] text-slate-800 font-sans">
                    <div className="flex gap-1 items-baseline">
                        <span className="text-[#7A1975] font-bold text-[7.5px] tracking-wider min-w-[52px] uppercase shrink-0">FACULTY:</span>
                        <span className="font-extrabold text-slate-800 break-words text-[8.5px]">{student.school || "School of Business"}</span>
                    </div>
                    <div className="flex gap-1 mt-0.5 items-baseline">
                        <span className="text-[#7A1975] font-bold text-[7.5px] tracking-wider min-w-[52px] uppercase shrink-0">COURSE:</span>
                        <span className="font-extrabold text-slate-800 break-words text-[8.5px]">{student.program || "DBM/May 2026"}</span>
                    </div>
                    <div className="flex gap-1 mt-0.5 items-baseline">
                        <span className="text-[#7A1975] font-bold text-[7.5px] tracking-wider min-w-[52px] uppercase shrink-0">VALIDITY:</span>
                        <span className="font-extrabold text-slate-800 break-words text-[8.5px]">
                            {student.expiry_date ? new Date(student.expiry_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : "Dec 2029"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Right-most Column (Vertical STUDENT bar) */}
            <div className="absolute right-0 top-0 bottom-0 w-[45px] bg-[#7A1975] flex items-center justify-center select-none">
                <span className="text-white text-[18px] font-bold uppercase absolute transform -rotate-90 whitespace-nowrap tracking-[0.25em]" style={{ fontFamily: "'Museo', sans-serif" }}>
                    STUDENT
                </span>
            </div>
        </div>
    )
}

function IDCardBack({ student, companySettings }: any) {
    return (
        <div 
            id={`id-card-back-${student.id}`}
            className="w-[340px] h-[216px] bg-white border border-gray-200 rounded-[16px] shadow-sm relative overflow-hidden flex flex-col items-center justify-between py-3"
            style={{ fontFamily: "'Museo', 'Museo Sans', 'Inter', sans-serif", letterSpacing: '0.01px' }}
        >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#7A1975]"></div>
            
            <div className="text-center px-4 mt-1">
                <h4 className="text-[12px] font-bold text-gray-800 uppercase tracking-wider leading-none" style={{ fontFamily: "'Museo', sans-serif" }}>Security & Access Control</h4>
                <p className="text-[7px] text-gray-400 font-bold uppercase tracking-wide mt-1 leading-none">Verification Required for Campus Entry</p>
            </div>

            <div className="p-1 bg-white border border-gray-150 shadow-sm rounded-lg flex items-center justify-center">
                <QRCodeSVG 
                    value={student.admission_number} 
                    size={70} 
                    level="H"
                />
            </div>

            <div className="text-center px-6 mb-1">
                <p className="text-[11px] font-bold text-[#7A1975] tracking-wide leading-none" style={{ fontFamily: "'Museo Sans', sans-serif" }}>{student.admission_number}</p>
                <p className="text-[6.2px] text-gray-400 mt-1.5 font-bold uppercase leading-tight px-2">
                    This card is the property of {companySettings.company_name || "the university"}. If found, please return it to the University Security Office.
                </p>
            </div>

            <div className="absolute bottom-3 right-4 opacity-5 pointer-events-none">
                {companySettings.logo_url && (
                    <img src={companySettings.logo_url} className="w-12 h-12 object-contain grayscale" />
                )}
            </div>
            
            <div className="absolute bottom-0 left-0 w-full h-1.5 bg-[#7A1975]"></div>
        </div>
    )
}
