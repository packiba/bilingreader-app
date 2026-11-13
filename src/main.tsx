import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReaderProvider } from './store/ReaderProvider'
import App from './App'
import ErrorBoundary from './ErrorBoundary'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ReaderProvider>
        <App />
      </ReaderProvider>
    </ErrorBoundary>
  </React.StrictMode>
)