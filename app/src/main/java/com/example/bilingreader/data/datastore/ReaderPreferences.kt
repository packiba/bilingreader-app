package com.example.bilingreader.data.datastore

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import com.example.bilingreader.data.model.StoredBook
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import org.json.JSONArray
import org.json.JSONObject

private val Context.store by preferencesDataStore(name = "reader_prefs")

class ReaderPreferences(private val context: Context) {

    private val lastFileUriKey = stringPreferencesKey("last_file_uri")
    private val importedBooksKey = stringPreferencesKey("imported_books")

    data class Settings(
        val lastReadPair: Int = 0,
        // "Read" pairs are almost always a contiguous prefix (markAsRead marks 0..N in one go);
        // the only way to punch a hole in that prefix is an explicit markAsUnread on one row. So
        // instead of persisting every single read index (a CSV that grows to thousands of
        // characters for a long book, rewritten in full on every DataStore edit — see
        // saveProgress), we persist just the high-water mark plus the rare exceptions below it.
        val readThrough: Int = -1,
        val readExceptions: Set<Int> = emptySet(),
        val fontSize: Int = 15,
        val darkTheme: Boolean = true,
        val columnsSwapped: Boolean = false
    )

    fun observe(hash: String): Flow<Settings> = context.store.data.map { prefs ->
        val storedReadThrough = prefs[ik("read_through", hash)]
        val (readThrough, readExceptions) = if (storedReadThrough != null) {
            storedReadThrough to (prefs[sk("read_exceptions", hash)]
                ?.split(",")
                ?.filter { it.isNotBlank() }
                ?.map { it.toInt() }
                ?.toSet() ?: emptySet())
        } else {
            // One-time migration for installs that still have data in the old full-set format
            // (key "read_pairs_<hash>"): reconstruct the equivalent (readThrough, exceptions)
            // pair so existing reading progress isn't lost. Once saveProgress runs once after
            // this, "read_through_<hash>" exists and this branch is skipped from then on.
            val legacy = prefs[sk("read_pairs", hash)]
                ?.split(",")
                ?.filter { it.isNotBlank() }
                ?.map { it.toInt() }
                ?.toSet()
            if (legacy.isNullOrEmpty()) {
                -1 to emptySet()
            } else {
                val maxIdx = legacy.max()
                maxIdx to (0..maxIdx).filterNot { it in legacy }.toSet()
            }
        }
        Settings(
            lastReadPair = prefs[ik("last_read_pair", hash)] ?: 0,
            readThrough = readThrough,
            readExceptions = readExceptions,
            fontSize = prefs[ik("font_size", hash)] ?: 15,
            darkTheme = prefs[sk("theme", hash)] != "light",
            columnsSwapped = prefs[sk("columns_swapped", hash)] == "true"
        )
    }

    /**
     * Saves reading position and the read-set together in a single DataStore transaction.
     * Preferences DataStore rewrites its entire backing file on every `edit` call regardless of
     * how small the change is, so batching the two values that change together (current
     * position, read-set) into one write instead of two halves the disk I/O for the app's most
     * frequent interaction — reading and swiping through the text. The read-set itself is now
     * stored as (readThrough, exceptions) instead of every index, which keeps that write tiny
     * even for a book read cover to cover — see the note on [Settings.readThrough].
     */
    suspend fun saveProgress(hash: String, lastReadPair: Int, readThrough: Int, readExceptions: Set<Int>) {
        context.store.edit {
            it[ik("last_read_pair", hash)] = lastReadPair
            it[ik("read_through", hash)] = readThrough
            it[sk("read_exceptions", hash)] = readExceptions.joinToString(",")
            it.remove(sk("read_pairs", hash)) // drop the legacy key once migrated
        }
    }

    suspend fun saveFontSize(hash: String, size: Int) {
        context.store.edit { it[ik("font_size", hash)] = size }
    }

    suspend fun saveTheme(hash: String, dark: Boolean) {
        context.store.edit { it[sk("theme", hash)] = if (dark) "dark" else "light" }
    }

    suspend fun saveColumnsSwapped(hash: String, swapped: Boolean) {
        context.store.edit { it[sk("columns_swapped", hash)] = swapped.toString() }
    }

    suspend fun saveLastFileUri(uri: String) {
        context.store.edit { it[lastFileUriKey] = uri }
    }

    fun observeBookList(): Flow<List<StoredBook>> = context.store.data.map { prefs ->
        val json = prefs[importedBooksKey] ?: "[]"
        parseBookList(json)
    }

    suspend fun saveBookList(books: List<StoredBook>) {
        context.store.edit {
            it[importedBooksKey] = encodeBookList(books)
        }
    }

    private fun parseBookList(json: String): List<StoredBook> {
        val arr = JSONArray(json)
        return List(arr.length()) { i ->
            val o = arr.getJSONObject(i)
            StoredBook(
                id = o.getString("id"),
                uri = o.getString("uri"),
                name = o.getString("name"),
                title = o.optString("title").takeIf { it.isNotEmpty() },
                author = o.optString("author").takeIf { it.isNotEmpty() },
                coverThumbnailBase64 = o.optString("cover").takeIf { it.isNotEmpty() },
                totalPairs = o.getInt("totalPairs"),
                importedAt = o.getLong("importedAt")
            )
        }
    }

    private fun encodeBookList(books: List<StoredBook>): String {
        val arr = JSONArray()
        for (b in books) {
            val o = JSONObject()
            o.put("id", b.id)
            o.put("uri", b.uri)
            o.put("name", b.name)
            o.put("title", b.title ?: "")
            o.put("author", b.author ?: "")
            o.put("cover", b.coverThumbnailBase64 ?: "")
            o.put("totalPairs", b.totalPairs)
            o.put("importedAt", b.importedAt)
            arr.put(o)
        }
        return arr.toString()
    }

    suspend fun getLastFileUri(): String? {
        return context.store.data.first()[lastFileUriKey]
    }

    private fun ik(name: String, hash: String) = intPreferencesKey("${name}_$hash")
    private fun sk(name: String, hash: String) = stringPreferencesKey("${name}_$hash")
}