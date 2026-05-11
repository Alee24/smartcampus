import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, AlertCircle, Info, X, Bell } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
    id: string;
    message: string;
    type: NotificationType;
}

interface NotificationContextType {
    showNotification: (message: string, type?: NotificationType) => void;
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

    const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setNotifications((prev) => [...prev, { id, message, type }]);

        // Auto-remove after 4 seconds
        setTimeout(() => {
            setNotifications((prev) => prev.filter((n) => n.id !== id));
        }, 4000);
    }, []);

    const removeNotification = (id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
        <NotificationContext.Provider value={{ showNotification }}>
            {children}
            <div className="fixed top-6 right-6 z-[3000] flex flex-col gap-3 pointer-events-none w-full max-w-sm">
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
