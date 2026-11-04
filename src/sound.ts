// 작은 효과음 (Web Audio 합성): 종이 넘기는 소리, 책 꺼내는 소리
let ctx: AudioContext | null = null;
let buf: AudioBuffer;

function ensure() {
  if (!ctx) {
    ctx = new AudioContext();
    buf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

function swish(dur: number, from: number, to: number, vol: number, q = 0.8) {
  const c = ensure();
  const t0 = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t0);
  f.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(c.destination);
  src.start(t0, Math.random() * 0.5);
  src.stop(t0 + dur + 0.02);
}

/** 인트로 종소리: 맑은 음 몇 개가 차례로 */
export function playChime() {
  const c = ensure();
  const t0 = c.currentTime;
  [784, 988, 1175, 1568].forEach((f, i) => {
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const t = t0 + i * 0.12;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.08, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 1.7);
  });
  swish(1.2, 3000, 600, 0.05, 0.5);
}

export const playFlip = () => swish(0.35, 1800, 4200, 0.18, 0.7);
export const playSlide = () => swish(0.4, 500, 1400, 0.12, 1.2);
export const playThud = () => swish(0.18, 300, 120, 0.2, 1.5);
