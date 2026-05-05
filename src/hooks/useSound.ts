let audioCtx: AudioContext | null = null

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext()
  return audioCtx
}

export function getVolume(): number {
  const stored = localStorage.getItem('moment-sound-volume')
  return stored !== null ? parseInt(stored) / 50 : 1.0  // 0-200% range
}

export function setVolume(percent: number): void {
  localStorage.setItem('moment-sound-volume', String(percent))
}

function playTone(freq: number, duration: number, type: OscillatorType = 'sine', vol = 0.08) {
  try {
    const ctx = getCtx()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = type
    osc.frequency.value = freq
    gain.gain.setValueAtTime(vol * getVolume(), ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
  } catch {
    // Silently ignore audio errors
  }
}

export function playCompleteSound() {
  playTone(880, 0.12, 'sine', 0.06)
  setTimeout(() => playTone(1100, 0.15, 'sine', 0.05), 80)
}

export function playDeleteSound() {
  playTone(200, 0.15, 'triangle', 0.06)
}

export function playCelebrationSound() {
  const notes = [523, 659, 784, 1047]
  notes.forEach((freq, i) => {
    setTimeout(() => playTone(freq, 0.2, 'sine', 0.07), i * 100)
  })
}

export function playPinSound() {
  playTone(800, 0.06, 'square', 0.05)
}

export function playDragPickupSound() {
  playTone(300, 0.05, 'sine', 0.04)
}

export function playDragDropSound() {
  playTone(180, 0.08, 'triangle', 0.05)
}

export function playUndoSound() {
  playTone(1100, 0.06, 'sine', 0.05)
  setTimeout(() => playTone(600, 0.08, 'sine', 0.05), 60)
}

export function playQuickAddSound() {
  playTone(660, 0.08, 'sine', 0.05)
}
