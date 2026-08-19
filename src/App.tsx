import { useEffect } from 'react'
import { useReader } from './store/ReaderProvider'
import LibraryScreen from './components/LibraryScreen'
import ReaderScreen from './components/ReaderScreen'

export default function App() {
  const { state } = useReader()

  useEffect(() => {
    document.body.classList.toggle('theme-light', !state.dark)
    document.body.classList.toggle('theme-dark', state.dark)
  }, [state.dark])

  return state.book ? <ReaderScreen /> : <LibraryScreen />
}