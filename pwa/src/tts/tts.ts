import { ttsTag } from '../languages'

// If neither onstart nor onend/onerror fires within this window, the
// browser silently dropped the utterance (a known WebKit/Chrome quirk) —
// treat it as an error instead of hanging continuous reading forever.
const START_WATCHDOG_MS = 3000
// How long to wait for the voice list to finish loading before giving up.
// getVoices() is frequently empty on the very first call right after page
// load (voices load asynchronously), which used to surface the "voice not
// found" message even though a matching voice was available a moment later.
const VOICE_WAIT_MS = 4000

// Browsers disagree on the separator (iOS "bg-BG", Android "bg_BG").
const norm = (l: string) => l.toLowerCase().replace(/_/g, '-')
const primary = (l: string) => norm(l).split('-')[0]

// Finds the best installed voice for a language code ("bg", "en", "ru"…):
// same primary language, preferring the exact region of our default tag,
// then the system default voice, then an on-device voice over a network one.
export function findVoice(lang: string): SpeechSynthesisVoice | undefined {
  const synth = window.speechSynthesis
  if (!synth) return undefined
  const wantTag = norm(ttsTag(lang))
  const wantPrimary = primary(lang)
  const candidates = synth.getVoices().filter((v) => primary(v.lang) === wantPrimary)
  if (candidates.length === 0) return undefined
  const score = (v: SpeechSynthesisVoice) =>
    (norm(v.lang) === wantTag ? 4 : 0) + (v.default ? 2 : 0) + (v.localService ? 1 : 0)
  return candidates.reduce((best, v) => (score(v) > score(best) ? v : best))
}

export interface TtsController {
  speak(text: string, lang: string): void
  stop(): void
  isSpeaking(): boolean
  onDone: () => void
  onError: () => void
  onMissingVoice: (lang: string) => void
}

export function createTts(): TtsController {
  const controller: TtsController = {
    onDone: () => {},
    onError: () => {},
    onMissingVoice: () => {},
    isSpeaking: () => false,
    stop: () => {},
    speak: () => {}
  }
  const synth = window.speechSynthesis
  if (!synth) return controller
  // Nudge some browsers into loading the voice list sooner.
  synth.getVoices()

  let intentionalStop = false
  let speaking = false
  let watchdog: number | null = null
  let currentUtter: SpeechSynthesisUtterance | null = null
  // A token bumped on every speak()/stop() call, so a voice-list wait that
  // resolves late (see waitForVoice) can tell it's no longer the active
  // request and avoid speaking after stop() or a newer speak() call.
  let callToken = 0
  // Once a voice has been found for a language, keep using that same voice
  // object instead of re-querying getVoices() on every call. getVoices() can
  // momentarily return an empty/stale list right after a previous utterance's
  // `onend` fires (exactly when continuous reading calls speak() again),
  // which otherwise looks like the voice "disappeared" after a line or two.
  const knownVoices = new Map<string, SpeechSynthesisVoice>()

  const resolveVoice = (lang: string): SpeechSynthesisVoice | undefined => {
    let v = knownVoices.get(lang)
    if (!v) {
      v = findVoice(lang)
      if (v) knownVoices.set(lang, v)
    }
    return v
  }

  function waitForVoice(lang: string): Promise<SpeechSynthesisVoice | undefined> {
    const existing = resolveVoice(lang)
    if (existing) return Promise.resolve(existing)
    return new Promise((resolve) => {
      let done = false
      const finish = (v?: SpeechSynthesisVoice) => {
        if (done) return
        done = true
        synth.removeEventListener('voiceschanged', onChange)
        resolve(v)
      }
      const onChange = () => {
        const v = resolveVoice(lang)
        if (v) finish(v)
      }
      synth.addEventListener('voiceschanged', onChange)
      window.setTimeout(() => finish(resolveVoice(lang)), VOICE_WAIT_MS)
    })
  }

  const clearWatchdog = () => {
    if (watchdog != null) {
      window.clearTimeout(watchdog)
      watchdog = null
    }
  }

  const doSpeak = (text: string, voice: SpeechSynthesisVoice, lang: string) => {
    clearWatchdog()
    // Safari has a known bug where calling cancel() when nothing is
    // actually speaking/queued corrupts the synthesis engine's internal
    // state, and every speak() call after that is silently swallowed —
    // this is what made continuous reading stop after a couple of lines.
    // Only cancel if there is genuinely something to interrupt.
    if (synth.speaking || synth.pending) synth.cancel()

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = voice.lang || ttsTag(lang)
    utter.rate = 0.95
    utter.voice = voice
    currentUtter = utter

    utter.onstart = () => {
      clearWatchdog()
    }
    utter.onend = () => {
      if (currentUtter !== utter) return
      clearWatchdog()
      speaking = false
      if (!intentionalStop) controller.onDone()
    }
    utter.onerror = () => {
      if (currentUtter !== utter) return
      clearWatchdog()
      speaking = false
      if (!intentionalStop) controller.onError()
    }

    speaking = true
    synth.speak(utter)
    // Guard against the utterance being silently dropped (no onstart, no
    // onend, no onerror at all) instead of hanging forever.
    watchdog = window.setTimeout(() => {
      watchdog = null
      if (currentUtter !== utter) return
      speaking = false
      if (!intentionalStop) controller.onError()
    }, START_WATCHDOG_MS)
  }

  controller.isSpeaking = () => speaking

  controller.speak = (text: string, lang: string) => {
    intentionalStop = false
    const token = ++callToken
    const existing = resolveVoice(lang)
    if (existing) {
      doSpeak(text, existing, lang)
      return
    }
    // Voices aren't loaded yet — wait briefly instead of failing right
    // away; most of the time they finish loading within a few hundred ms.
    waitForVoice(lang).then((voice) => {
      if (token !== callToken) return // superseded by a newer speak()/stop()
      if (!voice) {
        controller.onMissingVoice(lang)
        return
      }
      doSpeak(text, voice, lang)
    })
  }

  controller.stop = () => {
    intentionalStop = true
    callToken++
    clearWatchdog()
    currentUtter = null
    synth.cancel()
    speaking = false
  }
  return controller
}
