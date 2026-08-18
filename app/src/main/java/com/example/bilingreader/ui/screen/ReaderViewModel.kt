package com.example.bilingreader.ui.screen

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.bilingreader.data.datastore.ReaderPreferences
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.repository.BookRepository
import com.example.bilingreader.translate.TranslatorHelper
import com.example.bilingreader.tts.TtsPlayer
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ScrollRequest(val index: Int, val token: Int, val isSlow: Boolean = false)

/**
 * Single-column "expand" feature. NONE = normal two-column view. AWAITING_SIDE_TAP = the user
 * pressed the toolbar expand button and now needs to tap the left or right half of the content
 * area to say which column should take over the full width. SRC/TGT = that column is currently
 * expanded to full width; pressing the toolbar button again (or from AWAITING_SIDE_TAP) returns
 * to NONE.
 */
enum class ExpandMode { NONE, AWAITING_SIDE_TAP, SRC, TGT }

data class ReaderUiState(
    val book: Book? = null,
    val currentPairIndex: Int = 0,
    val fontSizeSp: Int = 15,
    val isDarkTheme: Boolean = true,
    val columnsSwapped: Boolean = false,
    val expandMode: ExpandMode = ExpandMode.NONE,
    val chapterStarts: List<Int> = emptyList(),
    val speakingPairIndex: Int? = null,
    val isContinuousReading: Boolean = false,
    // Pairs 0..readThrough are read, except any index listed in readExceptions. See the note on
    // ReaderPreferences.Settings.readThrough for why this replaced a plain Set<Int> of every
    // read index — that shape made every single swipe-to-mark-read allocate and union a
    // range-sized set (thousands of entries for a long book), on top of costing the same on
    // every debounced persist.
    val readThrough: Int = -1,
    val readExceptions: Set<Int> = emptySet(),
    val fileHash: String = "",
    val fileName: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val scrollRequest: ScrollRequest? = null
) {
    fun isRead(index: Int): Boolean = index <= readThrough && index !in readExceptions
}

class ReaderViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = BookRepository(application)
    private val prefs = ReaderPreferences(application)
    private val tts = TtsPlayer(application).apply {
        onDone = {
            if (_state.value.isContinuousReading) {
                advanceContinuousReading()
            } else {
                _state.update { it.copy(speakingPairIndex = null) }
            }
        }
        onError = { _state.update { it.copy(speakingPairIndex = null, isContinuousReading = false) } }
        onMissingVoice = {
            _state.update {
                it.copy(
                    speakingPairIndex = null,
                    isContinuousReading = false,
                    error = "Болгарский голос для чтения вслух не установлен. Настройки → Языки и ввод → Синтез речи → Google → Установить голосовые данные → Bulgarian."
                )
            }
        }
    }
    private val _state = MutableStateFlow(ReaderUiState())
    val state: StateFlow<ReaderUiState> = _state.asStateFlow()

    private val translator = TranslatorHelper()

    /** Word-tap dictionary popup: translates in-app, no browser hand-off. */
    suspend fun translateWord(word: String, isBulgarian: Boolean): String =
        translator.translate(word, isBulgarian)

    // Reading position + read-set are saved together, debounced — see schedulePersistProgress().
    private var persistProgressJob: Job? = null

    private fun totalPairs(): Int = _state.value.book?.totalPairs ?: 0

    fun tryRestoreLastFile() {
        viewModelScope.launch {
            val lastUri = prefs.getLastFileUri()
            if (lastUri != null) {
                loadBook(Uri.parse(lastUri))
            } else {
                loadBundledBook("nested_sample.json")
            }
        }
    }

    private suspend fun loadBundledBook(fileName: String) {
        val hash = "bundled_$fileName"
        _state.update { it.copy(isLoading = true, fileHash = hash) }
        try {
            val book = withContext(Dispatchers.IO) { repo.loadBookFromAssets(fileName) }
            val settings = prefs.observe(hash).first()
            val displayName = fileName.substringBeforeLast(".")
            _state.update {
                it.copy(
                    book = book,
                    fileName = displayName,
                    fontSizeSp = settings.fontSize,
                    isDarkTheme = settings.darkTheme,
                    columnsSwapped = settings.columnsSwapped,
                    chapterStarts = computeChapterStarts(book, settings.columnsSwapped),
                    readThrough = settings.readThrough,
                    readExceptions = settings.readExceptions,
                    currentPairIndex = settings.lastReadPair.coerceIn(0, (book.totalPairs - 1).coerceAtLeast(0)),
                    isLoading = false
                )
            }
        } catch (e: Exception) {
            _state.update { it.copy(error = e.message, isLoading = false) }
        }
    }

    fun loadBook(uri: Uri) {
        val hash = uri.toString().hashCode().toString()
        _state.update { it.copy(isLoading = true, fileHash = hash) }
        viewModelScope.launch {
            try {
                prefs.saveLastFileUri(uri.toString())
                val book = withContext(Dispatchers.IO) { repo.loadBook(uri) }
                val settings = prefs.observe(hash).first()
                val total = book.totalPairs
                val rawName = uri.lastPathSegment ?: uri.toString()
                val fileName = rawName.substringAfterLast(":").substringAfterLast("/").substringBeforeLast(".")
                _state.update {
                    it.copy(
                        book = book,
                        fileName = fileName,
                        fontSizeSp = settings.fontSize,
                        isDarkTheme = settings.darkTheme,
                        columnsSwapped = settings.columnsSwapped,
                        chapterStarts = computeChapterStarts(book, settings.columnsSwapped),
                        readThrough = settings.readThrough,
                        readExceptions = settings.readExceptions,
                        currentPairIndex = settings.lastReadPair.coerceIn(0, (total - 1).coerceAtLeast(0)),
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }

    /**
     * Marks this pair and every earlier pair as read. Previously this unioned in a freshly
     * allocated `(0..clamped).toSet()` range (up to thousands of boxed Ints) on every single
     * swipe. Now it's just a high-water-mark bump plus clearing any exceptions that range now
     * covers — O(number of exceptions), not O(pairIndex).
     */
    fun markAsRead(pairIndex: Int) {
        val clamped = pairIndex.coerceIn(0, (totalPairs() - 1).coerceAtLeast(0))
        _state.update {
            if (clamped <= it.readThrough && clamped !in it.readExceptions) return@update it
            it.copy(
                readThrough = maxOf(it.readThrough, clamped),
                readExceptions = it.readExceptions.filterTo(mutableSetOf()) { idx -> idx > clamped }
            )
        }
        schedulePersistProgress()
    }

    fun markAsUnread(pairIndex: Int) {
        val current = _state.value
        if (!current.isRead(pairIndex)) return
        _state.update { it.copy(readExceptions = it.readExceptions + pairIndex) }
        schedulePersistProgress()
    }

    fun markAsReadAndNext(pairIndex: Int) {
        markAsRead(pairIndex)
        if (pairIndex + 1 < totalPairs()) {
            setCurrentPairIndex(pairIndex + 1, isSlow = true)
        }
    }

    /**
     * Called for programmatic navigation (swipe-mark-as-read, chapter jump, sidebar tap,
     * slider drag). Always requests an explicit smooth scroll that lands the target row
     * exactly at the top of the screen.
     */
    fun setCurrentPairIndex(index: Int, isSlow: Boolean = false) {
        val clamped = index.coerceIn(0, (totalPairs() - 1).coerceAtLeast(0))
        _state.update {
            it.copy(
                currentPairIndex = clamped,
                scrollRequest = ScrollRequest(clamped, (it.scrollRequest?.token ?: 0) + 1, isSlow)
            )
        }
        schedulePersistProgress()
    }

    /**
     * Called by BookPager when it observes the list settling after the *user's own* manual
     * scroll. Only bookkeeping (persisted position) — must NOT re-trigger an animated scroll,
     * or the list would fight the user's own gesture.
     */
    fun onUserScrolled(index: Int) {
        val clamped = index.coerceIn(0, (totalPairs() - 1).coerceAtLeast(0))
        if (clamped == _state.value.currentPairIndex) return
        _state.update { it.copy(currentPairIndex = clamped) }
        schedulePersistProgress()
    }

    /**
     * Position and read-set are the app's most frequently-changing state — every swipe and
     * every scroll settle touches one or both. DataStore's Preferences implementation rewrites
     * its entire backing file on every `edit` call, so writing on every single interaction was
     * putting disk I/O directly on the hot path of reading. Debouncing batches bursts of rapid
     * interaction (fast swiping, a flurry of scroll settles) into a single write ~500ms after
     * things calm down, without ever going more than that long without persisting.
     */
    private fun schedulePersistProgress() {
        persistProgressJob?.cancel()
        persistProgressJob = viewModelScope.launch {
            delay(500)
            val snapshot = _state.value
            prefs.saveProgress(snapshot.fileHash, snapshot.currentPairIndex, snapshot.readThrough, snapshot.readExceptions)
        }
    }

    /**
     * Best-effort flush of a pending debounced write. viewModelScope is cancelled as soon as
     * onCleared() starts, so the delayed job above would simply be dropped without this — we
     * fire the final write on an independent scope so it isn't cancelled along with it.
     */
    override fun onCleared() {
        super.onCleared()
        tts.shutdown()
        translator.close()
        if (persistProgressJob?.isActive == true) {
            val snapshot = _state.value
            CoroutineScope(Dispatchers.IO).launch {
                prefs.saveProgress(snapshot.fileHash, snapshot.currentPairIndex, snapshot.readThrough, snapshot.readExceptions)
            }
        }
    }

    fun goToPrevChapter() {
        val starts = _state.value.chapterStarts
        if (starts.isEmpty()) return
        val current = _state.value.currentPairIndex
        val curStart = starts.lastOrNull { it <= current }
        val prev = if (current == curStart) {
            val idx = starts.indexOf(curStart)
            if (idx > 0) starts[idx - 1] else current
        } else {
            curStart ?: 0
        }
        if (prev != current) setCurrentPairIndex(prev)
    }

    fun goToNextChapter() {
        val starts = _state.value.chapterStarts
        if (starts.isEmpty()) return
        val current = _state.value.currentPairIndex
        val curStart = starts.lastOrNull { it <= current }
        val idx = starts.indexOf(curStart)
        val next = if (idx < starts.size - 1) starts[idx + 1] else current
        if (next != current) setCurrentPairIndex(next)
    }

    /** Global pair-index of the first pair of every chapter that has a real (non-blank) title. */
    private fun computeChapterStarts(book: Book?, swapped: Boolean): List<Int> {
        val chapters = book?.chapters ?: return emptyList()
        val result = mutableListOf<Int>()
        var acc = 0
        for (ch in chapters) {
            val title = if (swapped) ch.displayTitleTgt() else ch.displayTitleSrc()
            if (title.isNotBlank() && title != "—") result.add(acc)
            acc += ch.pairs.size
        }
        return result
    }

    fun setFontSize(size: Int) {
        val clamped = size.coerceIn(12, 24)
        _state.update { it.copy(fontSizeSp = clamped) }
        viewModelScope.launch { prefs.saveFontSize(_state.value.fileHash, clamped) }
    }

    fun toggleTheme() {
        _state.update { it.copy(isDarkTheme = !it.isDarkTheme) }
        viewModelScope.launch { prefs.saveTheme(_state.value.fileHash, _state.value.isDarkTheme) }
    }

    fun toggleColumns() {
        _state.update {
            val swapped = !it.columnsSwapped
            it.copy(columnsSwapped = swapped, chapterStarts = computeChapterStarts(it.book, swapped))
        }
        viewModelScope.launch { prefs.saveColumnsSwapped(_state.value.fileHash, _state.value.columnsSwapped) }
    }

    /**
     * Toolbar expand button. From NONE, arms the "pick a side" mode. From AWAITING_SIDE_TAP
     * (armed but no side chosen yet) or from an already-expanded column, it just cancels back
     * to the normal two-column view — so the same button always works to return.
     */
    fun toggleExpandMode() {
        _state.update {
            it.copy(
                expandMode = if (it.expandMode == ExpandMode.NONE) ExpandMode.AWAITING_SIDE_TAP else ExpandMode.NONE
            )
        }
    }

    /** Called when the user taps the left or right half of the content area while armed. */
    fun expandColumn(mode: ExpandMode) {
        if (_state.value.expandMode != ExpandMode.AWAITING_SIDE_TAP) return
        _state.update { it.copy(expandMode = mode) }
    }

    fun dismissError() { _state.update { it.copy(error = null) } }

    /** Speaker icon on a row. Tap again on the same row to stop; tapping a different row while
     * one is already speaking flushes to the new text. A plain tap always plays a single line —
     * it also cancels continuous reading if that was running. */
    fun toggleSpeak(index: Int, bulgarianText: String) {
        if (_state.value.speakingPairIndex == index) {
            tts.stop()
            _state.update { it.copy(speakingPairIndex = null, isContinuousReading = false) }
            return
        }
        _state.update { it.copy(speakingPairIndex = index, isContinuousReading = false) }
        tts.speak(bulgarianText)
    }

    /**
     * Long-press on the speaker icon: starts reading aloud from this row and keeps going into
     * subsequent rows automatically (advanced from [advanceContinuousReading] as each line
     * finishes), following along with a scroll so the currently-read row stays in view. Stops
     * on a plain tap (see [toggleSpeak]), at the end of the book, or on TTS error.
     */
    fun startContinuousReading(index: Int, bulgarianText: String) {
        _state.update { it.copy(isContinuousReading = true, speakingPairIndex = index) }
        tts.speak(bulgarianText)
    }

    private fun advanceContinuousReading() {
        val current = _state.value
        val nextIdx = (current.speakingPairIndex ?: -1) + 1
        val nextText = current.book?.bulgarianPairs?.getOrNull(nextIdx)
        if (nextText == null) {
            _state.update { it.copy(isContinuousReading = false, speakingPairIndex = null) }
            return
        }
        _state.update { it.copy(speakingPairIndex = nextIdx) }
        setCurrentPairIndex(nextIdx)
        tts.speak(nextText)
    }
}
