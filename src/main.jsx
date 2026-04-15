import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { base44 } from '@/api/base44Client'

// Log out when the browser tab/window is closed (not on reload)
window.addEventListener('beforeunload', () => {
  base44.auth.logout();
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)