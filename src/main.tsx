import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.scss'
import App from './App.tsx'
import { CrunchyrollDataProvider } from './contexts/CrunchyrollDataContext'

// Expose l'API Crunchyroll dans la console (window.crunchyAPI)
import './utils/exposeApiToConsole.js'

// Support both standalone and extension modes
const rootElement = document.getElementById('bettercrunchyroll-root') || document.getElementById('root');

if (rootElement) {
  createRoot(rootElement).render(
    <StrictMode>
      <CrunchyrollDataProvider>
        <App />
      </CrunchyrollDataProvider>
    </StrictMode>,
  )
} else {
  console.error('Root element not found');
}
