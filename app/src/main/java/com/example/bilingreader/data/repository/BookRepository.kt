package com.example.bilingreader.data.repository

import android.content.Context
import android.net.Uri
import com.example.bilingreader.data.model.Book
import com.example.bilingreader.data.parser.BookParser

class BookRepository(private val context: Context) {
    suspend fun loadBook(uri: Uri): Book {
        val stream = context.contentResolver.openInputStream(uri)
            ?: throw IllegalStateException("Cannot open: $uri")
        return stream.use { BookParser.parse(it) }
    }

    suspend fun loadBookFromAssets(fileName: String): Book {
        val stream = context.assets.open(fileName)
        return stream.use { BookParser.parse(it) }
    }
}