package com.example.bilingreader.ui.screen

import android.app.Application
import android.net.Uri
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.bilingreader.data.datastore.ReaderPreferences
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.repository.BookRepository
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

data class ScrollRequest(val index: Int, val token: Int, val isSlow: Boolean = false)

data class ReaderUiState(
    val book: Book? = null,
    val currentPairIndex: Int = 0,
    val fontSizeSp: Int = 15,
    val isDarkTheme: Boolean = true,
    val columnsSwapped: Boolean = false,
    val readPairs: Set<Int> = emptySet(),
    val fileHash: String = "",
    val fileName: String = "",
    val isLoading: Boolean = false,
    val error: String? = null,
    val scrollRequest: ScrollRequest? = null
)

class ReaderViewModel(application: Application) : AndroidViewModel(application) {
    private val repo = BookRepository(application)
    private val prefs = ReaderPreferences(application)
    private val _state = MutableStateFlow(ReaderUiState())
    val state: StateFlow<ReaderUiState> = _state.asStateFlow()

    private fun totalPairs(): Int = _state.value.book?.totalPairs ?: 0

    fun tryRestoreLastFile() {
        viewModelScope.launch {
            val lastUri = prefs.getLastFileUri()
            if (lastUri != null) {
                loadBook(Uri.parse(lastUri))
            } else {
                loadBundledBook("aligned_pairs_book.json")
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
                    readPairs = settings.readPairs,
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
                        readPairs = settings.readPairs,
                        currentPairIndex = settings.lastReadPair.coerceIn(0, (total - 1).coerceAtLeast(0)),
                        isLoading = false
                    )
                }
            } catch (e: Exception) {
                _state.update { it.copy(error = e.message, isLoading = false) }
            }
        }
    }

    fun toggleRead(pairIndex: Int) {
        _state.update {
            val new = if (pairIndex in it.readPairs) it.readPairs - pairIndex else it.readPairs + pairIndex
            it.copy(readPairs = new)
        }
        viewModelScope.launch {
            prefs.saveReadPairs(_state.value.fileHash, _state.value.readPairs)
        }
    }

    fun markAsUnread(pairIndex: Int) {
        if (pairIndex !in _state.value.readPairs) return
        _state.update {
            it.copy(readPairs = it.readPairs - pairIndex)
        }
        viewModelScope.launch {
            prefs.saveReadPairs(_state.value.fileHash, _state.value.readPairs)
        }
    }

    fun toggleReadAndNext(pairIndex: Int) {
        toggleRead(pairIndex)
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
        viewModelScope.launch { prefs.saveLastReadPair(_state.value.fileHash, clamped) }
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
        viewModelScope.launch { prefs.saveLastReadPair(_state.value.fileHash, clamped) }
    }

    fun goToPrevChapter() {
        val starts = chapterStarts()
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
        val starts = chapterStarts()
        if (starts.isEmpty()) return
        val current = _state.value.currentPairIndex
        val curStart = starts.lastOrNull { it <= current }
        val idx = starts.indexOf(curStart)
        val next = if (idx < starts.size - 1) starts[idx + 1] else current
        if (next != current) setCurrentPairIndex(next)
    }

    private fun chapterStarts(): List<Int> {
        val chapters = _state.value.book?.chapters ?: return emptyList()
        val result = mutableListOf<Int>()
        var acc = 0
        for (ch in chapters) {
            val title = if (_state.value.columnsSwapped) ch.titleTgt else ch.titleSrc
            if (!title.isNullOrBlank()) result.add(acc)
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
        _state.update { it.copy(columnsSwapped = !it.columnsSwapped) }
        viewModelScope.launch { prefs.saveColumnsSwapped(_state.value.fileHash, _state.value.columnsSwapped) }
    }

    fun dismissError() { _state.update { it.copy(error = null) } }
}
