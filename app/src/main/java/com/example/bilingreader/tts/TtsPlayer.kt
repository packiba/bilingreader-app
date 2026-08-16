package com.example.bilingreader.tts

import android.content.Context
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import java.util.Locale
import java.util.UUID

/**
 * Thin wrapper around Android's built-in "Speech Recognition & Synthesis" engine (formerly
 * Google Text-to-Speech) — free, pre-installed on virtually all devices, no network calls, no
 * API keys. Pinned to Bulgarian: this app only ever reads the Bulgarian half of a pair aloud.
 *
 * The device needs the Bulgarian voice pack installed (Settings → Languages & input →
 * Text-to-speech output → Google → Install voice data → Bulgarian). If it's missing,
 * [onMissingVoice] fires instead of speaking.
 */
class TtsPlayer(context: Context) {
    private val appContext = context.applicationContext
    private var engine: TextToSpeech? = null
    private var initializing = false
    private var ready = false

    var onDone: (() -> Unit)? = null
    var onError: (() -> Unit)? = null
    var onMissingVoice: (() -> Unit)? = null

    private val bulgarian = Locale("bg", "BG")

    fun speak(text: String) {
        if (ready) {
            doSpeak(text)
            return
        }
        if (initializing) return // an init is already in flight; drop this rapid double-tap
        initializing = true
        engine = TextToSpeech(appContext) { status ->
            initializing = false
            if (status != TextToSpeech.SUCCESS) {
                onError?.invoke()
                return@TextToSpeech
            }
            val result = engine?.setLanguage(bulgarian)
            if (result == TextToSpeech.LANG_MISSING_DATA || result == TextToSpeech.LANG_NOT_SUPPORTED) {
                onMissingVoice?.invoke()
                return@TextToSpeech
            }
            ready = true
            engine?.setSpeechRate(0.95f)
            engine?.setOnUtteranceProgressListener(object : UtteranceProgressListener() {
                override fun onStart(utteranceId: String?) {}
                override fun onDone(utteranceId: String?) { onDone?.invoke() }
                @Deprecated("Deprecated in Java", ReplaceWith(""))
                override fun onError(utteranceId: String?) { onError?.invoke() }
                override fun onError(utteranceId: String?, errorCode: Int) { onError?.invoke() }
            })
            doSpeak(text)
        }
    }

    private fun doSpeak(text: String) {
        engine?.speak(text, TextToSpeech.QUEUE_FLUSH, null, UUID.randomUUID().toString())
    }

    fun stop() {
        engine?.stop()
    }

    fun shutdown() {
        engine?.shutdown()
        engine = null
        ready = false
        initializing = false
    }
}
