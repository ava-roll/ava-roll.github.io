// Simple sound effects using the Web Audio API (no external assets)

let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    try {
      ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
};

type Tone = { freq: number; dur: number; type?: OscillatorType; vol?: number; delay?: number };

const playTones = (tones: Tone[]) => {
  const ac = getCtx();
  if (!ac) return;
  const now = ac.currentTime;
  let t = now;
  for (const tone of tones) {
    t += tone.delay ?? 0;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = tone.type ?? 'sine';
    osc.frequency.setValueAtTime(tone.freq, t);
    const vol = tone.vol ?? 0.15;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.dur);
    osc.connect(gain);
    gain.connect(ac.destination);
    osc.start(t);
    osc.stop(t + tone.dur + 0.02);
    t += tone.dur;
  }
};

export const sounds = {
  click: () =>
    playTones([{ freq: 600, dur: 0.06, type: 'square', vol: 0.1 }]),
  diceRoll: () =>
    playTones([
      { freq: 300, dur: 0.05, type: 'square' },
      { freq: 450, dur: 0.05, type: 'square', delay: 0.05 },
      { freq: 380, dur: 0.05, type: 'square', delay: 0.05 },
      { freq: 520, dur: 0.05, type: 'square', delay: 0.05 },
      { freq: 600, dur: 0.08, type: 'square', delay: 0.05 },
    ]),
  move: () =>
    playTones([{ freq: 700, dur: 0.08, type: 'triangle', vol: 0.12 }]),
  reveal: () =>
    playTones([
      { freq: 523, dur: 0.12, type: 'sine' },
      { freq: 659, dur: 0.12, type: 'sine', delay: 0.02 },
      { freq: 784, dur: 0.18, type: 'sine', delay: 0.02 },
    ]),
  shortcut: () =>
    playTones([
      { freq: 880, dur: 0.1, type: 'triangle' },
      { freq: 1175, dur: 0.15, type: 'triangle', delay: 0.02 },
    ]),
  win: () =>
    playTones([
      { freq: 523, dur: 0.15 },
      { freq: 659, dur: 0.15, delay: 0.02 },
      { freq: 784, dur: 0.15, delay: 0.02 },
      { freq: 1047, dur: 0.3, delay: 0.02 },
    ]),
};
