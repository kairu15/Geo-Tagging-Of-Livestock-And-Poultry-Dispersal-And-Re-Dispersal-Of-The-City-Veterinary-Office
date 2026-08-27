import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ToastProvider } from './components/ui/Toast'
import ApiErrorHandler from './api/ApiErrorHandler'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      <ApiErrorHandler>
        <App />
      </ApiErrorHandler>
    </ToastProvider>
  </StrictMode>,
)
