package com.example.bilingreader.translate

import com.google.mlkit.common.model.DownloadConditions
import com.google.mlkit.nl.translate.TranslateLanguage
import com.google.mlkit.nl.translate.Translation
import com.google.mlkit.nl.translate.Translator
import com.google.mlkit.nl.translate.TranslatorOptions
import kotlinx.coroutines.suspendCancellableCoroutine
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException

/**
 * Thin wrapper around ML Kit's on-device Translate API — free, no API key, no billing account.
 * The small per-language model downloads once (over whatever network is available) and is then
 * cached on the device, so lookups after that work fully offline. This app only ever needs the
 * Bulgarian↔Russian pair, so it keeps at most two [Translator] instances alive (one per
 * direction) instead of recreating one on every tap.
 */
class TranslatorHelper {
    private val translators = mutableMapOf<Pair<String, String>, Translator>()

    /** Translates [text] in the direction implied by [isBulgarian]: Bulgarian→Russian if true,
     * Russian→Bulgarian if false. Downloads the language model first if it isn't cached yet. */
    suspend fun translate(text: String, isBulgarian: Boolean): String {
        val from = if (isBulgarian) TranslateLanguage.BULGARIAN else TranslateLanguage.RUSSIAN
        val to = if (isBulgarian) TranslateLanguage.RUSSIAN else TranslateLanguage.BULGARIAN
        val translator = translatorFor(from, to)
        downloadIfNeeded(translator)
        return suspendCancellableCoroutine { cont ->
            translator.translate(text)
                .addOnSuccessListener { result -> cont.resume(result) }
                .addOnFailureListener { e -> cont.resumeWithException(e) }
        }
    }

    private fun translatorFor(from: String, to: String): Translator =
        translators.getOrPut(from to to) {
            val options = TranslatorOptions.Builder()
                .setSourceLanguage(from)
                .setTargetLanguage(to)
                .build()
            Translation.getClient(options)
        }

    private suspend fun downloadIfNeeded(translator: Translator) {
        suspendCancellableCoroutine<Unit> { cont ->
            val conditions = DownloadConditions.Builder().build()
            translator.downloadModelIfNeeded(conditions)
                .addOnSuccessListener { cont.resume(Unit) }
                .addOnFailureListener { e -> cont.resumeWithException(e) }
        }
    }

    fun close() {
        translators.values.forEach { it.close() }
        translators.clear()
    }
}
