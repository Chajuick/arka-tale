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

export const playFlip = () => swish(0.35, 1800, 4200, 0.18, 0.7);
export const playSlide = () => swish(0.4, 500, 1400, 0.12, 1.2);
export const playThud = () => swish(0.18, 300, 120, 0.2, 1.5);
