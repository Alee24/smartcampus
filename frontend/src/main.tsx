import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { NotificationProvider } from './components/Notification'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <NotificationProvider>
            <App />
        </NotificationProvider>
    </React.StrictMode>,
)

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(reg => console.log('SW Registered:', reg.scope))
            .catch(err => console.error('SW Registration Failed:', err));
    });
}
