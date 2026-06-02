import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, Bell, HelpCircle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface ConfirmOptions {
    title?: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    isDanger?: boolean;
}

interface AlertOptions {
    title?: string;
    message: string;
    buttonText?: string;
    type?: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
    showConfirm: (options: ConfirmOptions | string) => Promise<boolean>;
    showAlert: (options: AlertOptions | string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
    const context = useContext(NotificationContext);
    if (!context) {
        throw new Error('useNotification must be used within a NotificationProvider');
    }
    return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [confirmConfig, setConfirmConfig] = useState<{
        options: ConfirmOptions;
        resolve: (val: boolean) => void;
    } | null>(null);
    const [alertConfig, setAlertConfig] = useState<{
        options: AlertOptions;
        resolve: () => void;
    } | null>(null);

    const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);
    }, []);

    const showConfirm = useCallback((options: ConfirmOptions | string) => {
        return new Promise<boolean>((resolve) => {
            const opt = typeof options === 'string' ? { message: options } : options;
            setConfirmConfig({
                options: opt,
                resolve: (value: boolean) => {
                    setConfirmConfig(null);
                    resolve(value);
                }
            });
        });
    }, []);

    const showAlert = useCallback((options: AlertOptions | string) => {
        return new Promise<void>((resolve) => {
            const opt = typeof options === 'string' ? { message: options } : options;
            setAlertConfig({
                options: opt,
                resolve: () => {
                    setAlertConfig(null);
                    resolve();
                }
            });
        });
    }, []);

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const getAlertIcon = (type?: NotificationType) => {
        switch (type) {
            case 'success':
                return <CheckCircle size={28} className="text-green-500" />;
            case 'error':
                return <AlertCircle size={28} className="text-red-500" />;
            case 'warning':
                return <Bell size={28} className="text-amber-500" />;
            default:
                return <Info size={28} className="text-blue-500" />;
        }
    };

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm, showAlert }}>
            {children}
            
            {/* Toast Notifications */}
            <div className="fixed top-6 right-6 z-[5000] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
                <AnimatePresence>
                    {notifications.map((n) => (
                        <Toast 
                            key={n.id} 
                            notification={n} 
                            onClose={() => removeNotification(n.id)} 
                        />
                    ))}
                </AnimatePresence>
            </div>

            {/* Premium Confirm Modal Dialog */}
            <AnimatePresence>
                {confirmConfig && (
                    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => confirmConfig.resolve(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        
                        {/* Modal Box */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center text-center overflow-hidden"
                        >
                            {/* Visual Highlight line */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${confirmConfig.options.isDanger ? 'bg-red-500' : 'bg-blue-500'}`} />

                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mt-3 mb-4 ${
                                confirmConfig.options.isDanger 
                                    ? 'bg-red-50 dark:bg-red-950/20 text-red-500' 
                                    : 'bg-blue-50 dark:bg-blue-950/20 text-blue-500'
                            }`}>
                                <HelpCircle size={28} />
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                                {confirmConfig.options.title || 'Action Confirmation'}
                            </h3>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 mb-6 max-w-sm whitespace-pre-line">
                                {confirmConfig.options.message}
                            </p>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 w-full">
                                <button
                                    onClick={() => confirmConfig.resolve(false)}
                                    className="py-3 bg-slate-100 dark:bg-slate-750 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-colors text-sm"
                                >
                                    {confirmConfig.options.cancelText || 'Cancel'}
                                </button>
                                <button
                                    onClick={() => confirmConfig.resolve(true)}
                                    className={`py-3 text-white rounded-xl font-bold transition-all shadow-md text-sm ${
                                        confirmConfig.options.isDanger 
                                            ? 'bg-red-600 hover:bg-red-700 shadow-red-500/10' 
                                            : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'
                                    }`}
                                >
                                    {confirmConfig.options.confirmText || 'Confirm'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Premium Alert Modal Dialog */}
            <AnimatePresence>
                {alertConfig && (
                    <div className="fixed inset-0 z-[6000] flex items-center justify-center p-4">
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => alertConfig.resolve()}
                            className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        />
                        
                        {/* Modal Box */}
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="relative bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 w-full max-w-md rounded-3xl p-6 shadow-2xl z-10 flex flex-col items-center text-center overflow-hidden"
                        >
                            {/* Visual Highlight line */}
                            <div className={`absolute top-0 left-0 right-0 h-1.5 ${
                                alertConfig.options.type === 'success' ? 'bg-green-500' :
                                alertConfig.options.type === 'error' ? 'bg-red-500' :
                                alertConfig.options.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                            }`} />

                            <div className={`w-14 h-14 rounded-full flex items-center justify-center mt-3 mb-4 ${
                                alertConfig.options.type === 'success' ? 'bg-green-50 dark:bg-green-950/20 text-green-500' :
                                alertConfig.options.type === 'error' ? 'bg-red-50 dark:bg-red-950/20 text-red-500' :
                                alertConfig.options.type === 'warning' ? 'bg-amber-50 dark:bg-amber-950/20 text-amber-500' :
                                'bg-blue-50 dark:bg-blue-950/20 text-blue-500'
                            }`}>
                                {getAlertIcon(alertConfig.options.type)}
                            </div>

                            <h3 className="text-xl font-bold text-slate-800 dark:text-white leading-tight">
                                {alertConfig.options.title || (
                                    alertConfig.options.type === 'success' ? 'Success' :
                                    alertConfig.options.type === 'error' ? 'Error' :
                                    alertConfig.options.type === 'warning' ? 'Warning' : 'Notification'
                                )}
                            </h3>
                            
                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 mb-6 max-w-sm whitespace-pre-line">
                                {alertConfig.options.message}
                            </p>

                            {/* Actions */}
                            <div className="w-full">
                                <button
                                    onClick={() => alertConfig.resolve()}
                                    className={`w-full py-3 text-white rounded-xl font-bold transition-all shadow-md text-sm ${
                                        alertConfig.options.type === 'success' ? 'bg-green-600 hover:bg-green-700 shadow-green-500/10' :
                                        alertConfig.options.type === 'error' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/10' :
                                        alertConfig.options.type === 'warning' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/10' :
                                        'bg-blue-600 hover:bg-blue-700 shadow-blue-500/10'
                                    }`}
                                >
                                    {alertConfig.options.buttonText || 'OK'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </NotificationContext.Provider>
    );
};

const Toast: React.FC<{ notification: Notification; onClose: () => void }> = ({ notification, onClose }) => {
    const icons = {
        success: <CheckCircle className="text-green-500" size={20} />,
        error: <AlertCircle className="text-red-500" size={20} />,
        info: <Info className="text-blue-500" size={20} />,
        warning: <Bell className="text-amber-500" size={20} />
    };

    const colors = {
        success: 'border-green-500/20 bg-green-50/90 dark:bg-green-900/20 text-green-900 dark:text-green-100',
        error: 'border-red-500/20 bg-red-50/90 dark:bg-red-900/20 text-red-900 dark:text-red-100',
        info: 'border-blue-500/20 bg-blue-50/90 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100',
        warning: 'border-amber-500/20 bg-amber-50/90 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100'
    };

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl shadow-2xl ${colors[notification.type]}`}
        >
            <div className="shrink-0">
                {icons[notification.type]}
            </div>
            <p className="text-sm font-bold flex-1">
                {notification.message}
            </p>
            <button 
                onClick={onClose}
                className="shrink-0 p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
            >
                <X size={16} className="opacity-50" />
            </button>
        </motion.div>
    );
};
