const BG_PREFIXES = ['bg', 'bg-', 'bg_', 'bulgarian']
// If neither onstart nor onend/onerror fires within this window, the
// browser silently dropped the utterance (a known WebKit/Chrome quirk) —
// treat it as an error instead of hanging continuous reading forever.
const START_WATCHDOG_MS = 3000
// How long to wait for the voice list to finish loading before giving up.
// getVoices() is frequently empty on the very first call right after page
// load (voices load asynchronously), which used to surface the "voice not
// found" message even though a Bulgarian voice was available a moment
// later.
const VOICE_WAIT_MS = 4000

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
  // Once we've successfully found a Bulgarian voice, keep using that same
  // voice object instead of re-querying getVoices() on every call.
  // getVoices() can momentarily return an empty/stale list right after a
  // previous utterance's `onend` fires (exactly when continuous reading
  // calls speak() again), which otherwise looks like the voice
  // "disappeared" after the first line or two.
  let knownVoice: SpeechSynthesisVoice | undefined

  const resolveVoice = (): SpeechSynthesisVoice | undefined => {
    if (!knownVoice) knownVoice = findBgVoice()
    return knownVoice
  }
  synth.addEventListener('voiceschanged', () => {
    if (!knownVoice) knownVoice = findBgVoice()
  })

  function waitForVoice(): Promise<SpeechSynthesisVoice | undefined> {
    const existing = resolveVoice()
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
        const v = resolveVoice()
        if (v) finish(v)
      }
      synth.addEventListener('voiceschanged', onChange)
      window.setTimeout(() => finish(resolveVoice()), VOICE_WAIT_MS)
    })
  }

  const clearWatchdog = () => {
    if (watchdog != null) {
      window.clearTimeout(watchdog)
      watchdog = null
    }
  }

  const doSpeak = (text: string, voice: SpeechSynthesisVoice) => {
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

  controller.isSpeaking = () => speaking

  controller.speak = (text: string) => {
    intentionalStop = false
    const token = ++callToken
    const existing = resolveVoice()
    if (existing) {
      doSpeak(text, existing)
      return
    }
    // Voices aren't loaded yet — wait briefly instead of failing right
    // away; most of the time they finish loading within a few hundred ms.
    waitForVoice().then((voice) => {
      if (token !== callToken) return // superseded by a newer speak()/stop()
      if (!voice) {
        controller.onMissingVoice()
        return
      }
      doSpeak(text, voice)
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
