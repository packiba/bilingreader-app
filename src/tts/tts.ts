const BG_PREFIXES = ['bg', 'bg-', 'bg_', 'bulgarian']

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
  let pendingTimer: number | null = null
  // Once we've successfully found a Bulgarian voice, keep using that same
  // voice object instead of re-querying getVoices() on every call.
  // getVoices() can momentarily return an empty/stale list right after a
  // previous utterance's `onend` fires (this is exactly when continuous
  // reading calls speak() again), which otherwise looks like the voice
  // "disappeared" after the first line or two.
  let knownVoice: SpeechSynthesisVoice | undefined

  const resolveVoice = (): SpeechSynthesisVoice | undefined => {
    if (knownVoice) return knownVoice
    knownVoice = findBgVoice()
    return knownVoice
  }
  synth.addEventListener('voiceschanged', () => {
    // Refresh only if we don't already have a working voice.
    if (!knownVoice) knownVoice = findBgVoice()
  })

  const makeUtterance = (text: string, voice: SpeechSynthesisVoice) => {
    const utter = new SpeechSynthesisUtterance(text)
    utter.lang = 'bg-BG'
    utter.rate = 0.95
    utter.voice = voice
    utter.onend = () => {
      speaking = false
      if (!intentionalStop) controller.onDone()
    }
    utter.onerror = () => {
      speaking = false
      if (!intentionalStop) controller.onError()
    }
    return utter
  }

  controller.isSpeaking = () => speaking

  controller.speak = (text: string) => {
    const voice = resolveVoice()
    if (!voice) {
      controller.onMissingVoice()
      return
    }
    intentionalStop = false
    if (pendingTimer != null) {
      window.clearTimeout(pendingTimer)
      pendingTimer = null
    }
    synth.cancel()
    speaking = true
    // Cancel/speak back-to-back (or speak() called synchronously from
    // within the previous utterance's onend, as continuous reading does)
    // can silently drop the utterance in some browsers; deferring to the
    // next tick avoids that.
    pendingTimer = window.setTimeout(() => {
      pendingTimer = null
      synth.speak(makeUtterance(text, voice))
    }, 0)
  }
  controller.stop = () => {
    intentionalStop = true
    if (pendingTimer != null) {
      window.clearTimeout(pendingTimer)
      pendingTimer = null
    }
    synth.cancel()
    speaking = false
  }
  return controller
}
