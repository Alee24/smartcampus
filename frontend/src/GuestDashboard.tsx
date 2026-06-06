import { useState, useEffect } from 'react';
import { 
    QrCode, MapPin, Calendar, Clock, LogIn, 
    BookOpen, ShieldCheck, Info
} from 'lucide-react';
import QRCode from 'qrcode';

export default function GuestDashboard({ currentUser }: { currentUser: any }) {
    const [qrDataUrl, setQrDataUrl] = useState('');

    useEffect(() => {
        const generatePassQR = async () => {
            if (currentUser?.admission_number) {
                // Pick Domain or Local IP or host for QR pass URL
                const domainOrIp = localStorage.getItem('server_ip_or_domain') || window.location.host;
                const protocol = window.location.protocol;
                const qrValue = `${protocol}//${domainOrIp}/gate-pass/${currentUser.id}`;
                
                try {
                    const url = await QRCode.toDataURL(qrValue, { width: 300, margin: 2 });
                    setQrDataUrl(url);
                } catch (err) {
                    console.error("QR Pass generation error:", err);
                }
            }
        };

        generatePassQR();
    }, [currentUser]);

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-fade-in">
            {/* Main Pass Card */}
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6">
                <div>
                    <span className="px-3 py-1 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800 rounded-lg text-xs font-black uppercase tracking-wider">
                        Active Campus Visitor Pass
                    </span>
                    <h1 className="text-2xl font-black mt-3 text-gray-900 dark:text-white">
                        {currentUser?.full_name || 'Guest Visitor'}
                    </h1>
                    <p className="text-xs text-gray-500 mt-1">
                        Visitor ID / Pass No: <code className="font-mono text-gray-700 dark:text-gray-300 font-bold">{currentUser?.admission_number}</code>
                    </p>
                </div>

                {/* QR Code */}
                <div className="max-w-[220px] mx-auto border-4 border-gray-50 dark:border-gray-700 rounded-2xl overflow-hidden shadow-md p-3 bg-white">
                    {qrDataUrl ? (
                        <img src={qrDataUrl} alt="Visitor Pass QR" className="w-full h-auto" />
                    ) : (
                        <div className="h-48 flex items-center justify-center text-xs text-gray-400">Generating pass QR...</div>
                    )}
                </div>

                <div className="max-w-md mx-auto p-4 bg-green-50/50 dark:bg-green-950/10 border border-green-100 dark:border-green-950/20 rounded-2xl flex items-center gap-3 text-left">
                    <ShieldCheck className="text-green-600 shrink-0" size={20} />
                    <span className="text-xs text-green-700 dark:text-green-400">
                        Scan this QR code at any university gate checkpoint barrier to authenticate your entry and exit logs.
                    </span>
                </div>

                {/* Details list */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-gray-100 dark:border-gray-700/80 pt-6">
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5"><MapPin size={12} /> Access Location</h4>
                        <p className="text-xs font-bold text-gray-800 dark:text-white mt-1">All General Gates</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5"><Calendar size={12} /> Valid Until</h4>
                        <p className="text-xs font-bold text-gray-800 dark:text-white mt-1">24 Hours</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-900/50 border border-gray-100 dark:border-gray-800 rounded-2xl">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase flex items-center gap-1.5"><Clock size={12} /> Status</h4>
                        <p className="text-xs font-bold text-green-600 dark:text-green-400 mt-1 uppercase">ACTIVE</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
