import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { NotificationProvider } from './components/Notification'

import { ErrorBoundary } from './ErrorBoundary'

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <ErrorBoundary>
            <NotificationProvider>
                <App />
            </NotificationProvider>
        </ErrorBoundary>
    </React.StrictMode>,
)

// PWA registration is handled automatically by vite-plugin-pwa via the 'injectRegister' option in vite.config.ts
