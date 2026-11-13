import React from 'react'
import { setMeta } from './store/db'

const LAST_BOOK_KEY = 'biling_last_book'

// Without a boundary any render error (e.g. an unexpected value in a book)
// left a blank screen. Worse, the last book is reopened on every launch, so
// the app would crash again on every start. The boundary forgets the last
// book, so a restart lands safely in the library.
export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    try { localStorage.removeItem(LAST_BOOK_KEY) } catch { /* ignore */ }
    // The IndexedDB copy is the launch-time fallback, so clear it as well.
    setMeta('lastBookId', '').catch(() => {})
    console.error(error)
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <div className="app theme-dark">
        <div className="lib">
          <div className="empty">
            Что-то пошло не так.<br />
            <button className="btn primary" style={{ marginTop: 16 }} onClick={() => window.location.reload()}>
              Перезапустить
            </button>
          </div>
        </div>
      </div>
    )
  }
}
