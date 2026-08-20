const BG_PREFIXES = ['bg', 'bg-', 'bg_', 'bulgarian']
// If neither onstart nor onend/onerror fires within this window, the
// browser silently dropped the utterance (a known WebKit/Chrome quirk) —
// treat it as an error instead of hanging continuous reading forever.
const START_WATCHDOG_MS = 3000

function isBg(lang: string): boolean {
  const l = lang.toLowerCase()
  return BG_PREFIXES.some((p) => l.startsWith(p)) || l.includes('bulgaria')
}

export function findBgVoice(): SpeechSynthesisVoice | undefined {
  const synth = window.speechSynthesis
  if (!synth) return undefined
  return synth.getVoices().find((v) => isBg(v.lang) || isBg(v.name))
}

export function hasBulgarianVoice(): Promise<boolean> {
  return new Promise((resolve) => {
    const synth = window.speechSynthesis
    if (!synth) return resolve(false)
    if (findBgVoice()) return resolve(true)
    let done = false
    const finish = (v: boolean) => {
      if (!done) { done = true; resolve(v) }
    }
    const onChange = () => finish(Boolean(findBgVoice()))
    synth.addEventListener('voiceschanged', onChange)
    window.setTimeout(() => {
      synth.removeEventListener('voiceschanged', onChange)
      finish(Boolean(findBgVoice()))
    }, 3000)
  })
}

export interface TtsController {
  speak(text: string): void
  stop(): void
  isSpeaking(): boolean
  onDone: () => void
  onError: () => void
  onMissingVoice: () => void
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

  let intentionalStop = false
  let speaking = false
  let watchdog: number | null = null
  let currentUtter: SpeechSynthesisUtterance | null = null
  // Once we've successfully found a Bulgarian voice, keep using that same
  // voice object instead of re-querying getVoices() on every call.
  // getVoices() can momentarily return an empty/stale list right after a
  // previous utterance's `onend` fires (exactly when continuous reading
  // calls speak() again), which otherwise looks like the voice
  // "disappeared" after the first line or two.
  let knownVoice: SpeechSynthesisVoice | undefined

  const resolveVoice = (): SpeechSynthesisVoice | undefined => {
    if (knownVoice) return knownVoice
    knownVoice = findBgVoice()
    return knownVoice
  }
  synth.addEventListener('voiceschanged', () => {
    if (!knownVoice) knownVoice = findBgVoice()
  })

  const clearWatchdog = () => {
    if (watchdog != null) {
      window.clearTimeout(watchdog)
      watchdog = null
    }
  }

  controller.isSpeaking = () => speaking

  controller.speak = (text: string) => {
    const voice = resolveVoice()
    if (!voice) {
      controller.onMissingVoice()
      return
    }
    intentionalStop = false
    clearWatchdog()
    // Safari has a known bug where calling cancel() when nothing is
    // actually speaking/queued corrupts the synthesis engine's internal
    // state, and every speak() call after that is silently swallowed —
    // this is what made continuous reading stop after a couple of lines.
    // Only cancel if there is genuinely something to interrupt.
    if (synth.speaking || synth.pending) synth.cancel()

    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'bg-BG'
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

  controller.stop = () => {
    intentionalStop = true
    clearWatchdog()
    currentUtter = null
    synth.cancel()
    speaking = false
  }
  return controller
}
