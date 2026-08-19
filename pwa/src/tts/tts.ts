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
  const utter = new SpeechSynthesisUtterance()
  utter.lang = 'bg-BG'
  utter.rate = 0.95

  utter.onend = () => {
    controller.isSpeaking = () => false
    if (!intentionalStop) controller.onDone()
  }
  utter.onerror = () => {
    controller.isSpeaking = () => false
    if (!intentionalStop) controller.onError()
  }

  controller.speak = (text: string) => {
    const voice = findBgVoice()
    if (!voice) {
      controller.onMissingVoice()
      return
    }
    intentionalStop = false
    synth.cancel()
    utter.text = text
    if (voice) utter.voice = voice
    controller.isSpeaking = () => true
    synth.speak(utter)
  }
  controller.stop = () => {
    intentionalStop = true
    synth.cancel()
    controller.isSpeaking = () => false
  }
  return controller
}