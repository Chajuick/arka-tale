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

/** 책장 넘기는 소리: 종이가 스치는 '사락' + 넘어가며 닿는 '툭' */
export function playFlip() {
  const c = ensure();
  const t0 = c.currentTime;
  const out = c.createGain();
  out.gain.value = 0.9;
  out.connect(c.destination);

  // 1) 사락: 대역 필터를 올리며 훑는 잡음 + 종이 바스락거림(진폭 떨림)
  const rustle = c.createBufferSource();
  rustle.buffer = buf;
  const bp = c.createBiquadFilter();
  bp.type = 'bandpass';
  bp.Q.value = 0.9;
  bp.frequency.setValueAtTime(900, t0);
  bp.frequency.exponentialRampToValueAtTime(3800, t0 + 0.22);
  bp.frequency.exponentialRampToValueAtTime(1600, t0 + 0.36);
  const hp = c.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 500;
  const env = c.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(0.32, t0 + 0.05);
  env.gain.exponentialRampToValueAtTime(0.18, t0 + 0.2);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);
  const crinkle = c.createGain();
  for (let t = 0; t < 0.38; t += 0.018) crinkle.gain.setValueAtTime(0.55 + Math.random() * 0.45, t0 + t);
  rustle.connect(hp).connect(bp).connect(env).connect(crinkle).connect(out);
  rustle.start(t0, Math.random() * 0.5);
  rustle.stop(t0 + 0.4);

  // 2) 툭: 종이가 넘어가 닿는 낮고 짧은 소리
  const t1 = t0 + 0.3;
  const flap = c.createBufferSource();
  flap.buffer = buf;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 650;
  const fe = c.createGain();
  fe.gain.setValueAtTime(0.0001, t1);
  fe.gain.exponentialRampToValueAtTime(0.5, t1 + 0.008);
  fe.gain.exponentialRampToValueAtTime(0.0001, t1 + 0.09);
  flap.connect(lp).connect(fe).connect(out);
  flap.start(t1, Math.random() * 0.5);
  flap.stop(t1 + 0.1);
}
export const playSlide = () => swish(0.4, 500, 1400, 0.12, 1.2);
export const playThud = () => swish(0.18, 300, 120, 0.2, 1.5);
