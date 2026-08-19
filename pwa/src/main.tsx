import React from 'react'
import ReactDOM from 'react-dom/client'
import { ReaderProvider } from './store/ReaderProvider'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ReaderProvider>
      <App />
    </ReaderProvider>
  </React.StrictMode>
)