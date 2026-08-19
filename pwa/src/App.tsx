import { useReader } from './store/ReaderProvider'
import LibraryScreen from './components/LibraryScreen'
import ReaderScreen from './components/ReaderScreen'

export default function App() {
  const { state } = useReader()
  return state.book ? <ReaderScreen /> : <LibraryScreen />
}