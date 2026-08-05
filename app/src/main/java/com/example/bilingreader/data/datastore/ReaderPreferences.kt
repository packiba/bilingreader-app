package com.example.bilingreader.data.datastore

import android.content.Context
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.intPreferencesKey
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.store by preferencesDataStore(name = "reader_prefs")

class ReaderPreferences(private val context: Context) {

    private val lastFileUriKey = stringPreferencesKey("last_file_uri")

    data class Settings(
        val lastReadPair: Int = 0,
        val readPairs: Set<Int> = emptySet(),
        val fontSize: Int = 15,
        val darkTheme: Boolean = true,
        val columnsSwapped: Boolean = false
    )

    fun observe(hash: String): Flow<Settings> = context.store.data.map { prefs ->
        Settings(
            lastReadPair = prefs[ik("last_read_pair", hash)] ?: 0,
            readPairs = prefs[sk("read_pairs", hash)]
                ?.split(",")
                ?.filter { it.isNotBlank() }
                ?.map { it.toInt() }
                ?.toSet() ?: emptySet(),
            fontSize = prefs[ik("font_size", hash)] ?: 15,
            darkTheme = prefs[sk("theme", hash)] != "light",
            columnsSwapped = prefs[sk("columns_swapped", hash)] == "true"
        )
    }

    suspend fun saveReadPairs(hash: String, pairs: Set<Int>) {
        context.store.edit { it[sk("read_pairs", hash)] = pairs.joinToString(",") }
    }

    suspend fun saveLastReadPair(hash: String, pair: Int) {
        context.store.edit { it[ik("last_read_pair", hash)] = pair }
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

    suspend fun getLastFileUri(): String? {
        return context.store.data.first()[lastFileUriKey]
    }

    private fun ik(name: String, hash: String) = intPreferencesKey("${name}_$hash")
    private fun sk(name: String, hash: String) = stringPreferencesKey("${name}_$hash")
}