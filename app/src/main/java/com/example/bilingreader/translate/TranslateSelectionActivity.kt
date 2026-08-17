package com.example.bilingreader.translate

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

/**
 * Android PROCESS_TEXT entry point. It adds our in-app translator to the text-selection menu
 * without replacing Compose's native Copy/Select All actions.
 */
class TranslateSelectionActivity : ComponentActivity() {
    private val translator = TranslatorHelper()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val selectedText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)
            ?.toString()
            ?.trim()
            .orEmpty()

        setContent {
            var result by remember { mutableStateOf<String?>(null) }
            var error by remember { mutableStateOf<String?>(null) }

            LaunchedEffect(selectedText) {
                if (selectedText.isBlank()) {
                    error = "Текст не выбран"
                    return@LaunchedEffect
                }

                runCatching {
                    withContext(Dispatchers.IO) {
                        val isBulgarian = looksBulgarian(selectedText)
                        translator.translate(selectedText, isBulgarian)
                    }
                }.onSuccess { result = it }
                    .onFailure { error = it.message ?: "Не удалось выполнить перевод" }
            }

            Surface(modifier = Modifier.fillMaxSize()) {
                Column(
                    modifier = Modifier.padding(24.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Перевод", style = MaterialTheme.typography.titleLarge)
                    Text(selectedText, style = MaterialTheme.typography.bodyMedium)
                    when {
                        result != null -> Text(result!!, style = MaterialTheme.typography.bodyLarge)
                        error != null -> Text(error!!, style = MaterialTheme.typography.bodyLarge)
                        else -> CircularProgressIndicator()
                    }
                }
            }
        }
    }

    override fun onDestroy() {
        translator.close()
        super.onDestroy()
    }

    private fun looksBulgarian(text: String): Boolean {
        // These characters are useful signals for distinguishing Bulgarian from Russian in a
        // standalone selection. For ambiguous Cyrillic text, Bulgarian is the default because
        // the reader is primarily used for Bulgarian text.
        if (text.any { it in "ыэё" }) return false
        return text.any { it in "ъщ" } || !text.any { it in "ь" }
    }
}
