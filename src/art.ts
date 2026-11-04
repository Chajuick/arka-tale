// 코드로 그리는 그림: 표지 문양(도트) + 장 첫머리 동화풍 삽화 (임시 — 나중에 직접 그린 그림으로 교체)
import type { ChapterRef, Emblem } from './books';

// ───────── 문양 (12×12 도트) ─────────
const EMB: Record<Emblem, string[]> = {
  star: ['.....#......', '.....#......', '....###.....', '############', '.##########.', '...######...', '...######...', '..###..###..', '..##....##..', '.#........#.', '............', '............'],
  orb: ['............', '..####......', '.######.....', '.######.....', '..####......', '......####..', '.....#....#.', '.....#....#.', '......####..', '............', '#####.#####.', '............'],
  mountain: ['............', '.....##.....', '....####....', '....#..#....', '...######...', '..########..', '..##.##.##..', '.##########.', '############', '############', '............', '............'],
  tear: ['.....#......', '.....#......', '....###.....', '....###.....', '...#####....', '..#######...', '..#######...', '..#######...', '...#####....', '....###.....', '............', '............'],
  abyss: ['....####....', '..##....##..', '.#..####..#.', '#..#....#..#', '#.#..##..#.#', '#.#.#..#.#.#', '#.#.#.##.#.#', '#.#..##..#.#', '#..#....#..#', '.#..####..#.', '..##....##..', '....####....'],
  rescue: ['....####....', '..##....##..', '.#..####..#.', '#..######..#', '#.###..###.#', '#.##....##.#', '#.##....##.#', '#.###..###.#', '#..######..#', '.#..####..#.', '..##....##..', '....####....'],
  sea: ['............', '..##........', '.#..#...##..', '#....#.#..#.', '......#....#', '............', '..##........', '.#..#...##..', '#....#.#..#.', '......#....#', '............', '############'],
  friends: ['............', '..##....##..', '.####..####.', '.####..####.', '..##....##..', '.####..####.', '######.#####', '.####..####.', '.#..#..#..#.', '.#..#..#..#.', '............', '............'],
  castle: ['#.#......#.#', '###......###', '###.#..#.###', '###.####.###', '############', '#####..#####', '####....####', '####....####', '############', '############', '............', '............'],
  lantern: ['....####....', '.....##.....', '...######...', '..#......#..', '..#.####.#..', '..#.####.#..', '..#.####.#..', '..#......#..', '...######...', '.....##.....', '....####....', '............'],
  dragon: ['#..........#', '##........##', '.##.####.##.', '..########..', '..#.####.#..', '..########..', '...######...', '....####....', '...##..##...', '..##....##..', '............', '............'],
  four: ['............', '.###....###.', '.###....###.', '.###....###.', '............', '.....##.....', '............', '.###....###.', '.###....###.', '.###....###.', '............', '............'],
  shield: ['.##########.', '.#........#.', '.#.######.#.', '.#.######.#.', '.#.######.#.', '.#.######.#.', '..#.####.#..', '..#.####.#..', '...#.##.#...', '....#..#....', '.....##.....', '............'],
  // 새싹: 무너진 땅 위에 다시 돋는 잎
  sprout: ['............', '.##......##.', '####....####', '#####..#####', '.####..####.', '..###..###..', '....####....', '.....##.....', '.....##.....', '.....##.....', '.##.####.##.', '############'],
  brush: ['..........##', '.........###', '........###.', '.......###..', '......###...', '.....###....', '....###.....', '...##.......', '..###.......', '.####.......', '.###........', '............'],
};

/** 문양을 캔버스에 그리기 (cell: 도트 크기) */
export function drawEmblem(ctx: CanvasRenderingContext2D, e: Emblem, x: number, y: number, cell: number, color: string) {
  ctx.fillStyle = color;
  EMB[e].forEach((row, j) => [...row].forEach((c, i) => c === '#' && ctx.fillRect(x + i * cell, y + j * cell, cell, cell)));
}

export function emblemDataURL(e: Emblem, color: string, size = 96) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  drawEmblem(ctx, e, 0, 0, size / 12, color);
  return c.toDataURL();
}

// ───────── 동화풍 삽화 (낮은 해상도로 그린 뒤 확대) ─────────
const W = 220;
const H = 130;

type Ctx = CanvasRenderingContext2D;

function prng(seed: number) {
  let s = seed;
  return () => ((s = (s * 1664525 + 1013904223) | 0) >>> 0) / 4294967296;
}

/** 단계별로 끊긴 하늘 그라데이션 + 디더링 */
function sky(c: Ctx, cols: string[], h = H) {
  const band = h / cols.length;
  cols.forEach((col, i) => {
    c.fillStyle = col;
    c.fillRect(0, Math.floor(i * band), W, Math.ceil(band) + 1);
    if (i > 0) {
      // 경계 디더링
      c.fillStyle = cols[i - 1];
      for (let x = (i % 2); x < W; x += 2) c.fillRect(x, Math.floor(i * band), 1, 1);
    }
  });
}

function stars(c: Ctx, n: number, seed: number, maxY = H, color = '#fff6d8') {
  const r = prng(seed);
  for (let i = 0; i < n; i++) {
    const x = Math.floor(r() * W);
    const y = Math.floor(r() * maxY);
    c.fillStyle = color;
    c.fillRect(x, y, 1, 1);
    if (r() < 0.12) {
      c.fillRect(x - 1, y, 3, 1);
      c.fillRect(x, y - 1, 1, 3);
    }
  }
}

function disc(c: Ctx, cx: number, cy: number, r: number, col: string) {
  c.fillStyle = col;
  for (let y = -r; y <= r; y++) {
    const w = Math.floor(Math.sqrt(r * r - y * y));
    c.fillRect(cx - w, cy + y, w * 2 + 1, 1);
  }
}

function hills(c: Ctx, base: number, amp: number, col: string, seed: number, freq = 0.04) {
  c.fillStyle = col;
  const ph = seed * 1.7;
  for (let x = 0; x < W; x++) {
    const y = Math.floor(base + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph) * amp * 0.4);
    c.fillRect(x, y, 1, H - y);
  }
}

function tree(c: Ctx, x: number, y: number, s: number, col: string, trunk = '#4a3020') {
  c.fillStyle = trunk;
  c.fillRect(x, y - s, 1 + Math.floor(s / 6), s);
  c.fillStyle = col;
  for (let i = 0; i < s; i++) {
    const w = Math.floor((i / s) * s * 0.55);
    c.fillRect(x - w, y - s - Math.floor(s * 0.6) + i, w * 2 + 1, 1);
  }
}

/** 작은 사람 실루엣 */
function person(c: Ctx, x: number, y: number, col: string, h = 9) {
  c.fillStyle = col;
  disc(c, x, y - h, 2, col);
  c.fillRect(x - 2, y - h + 2, 5, h - 4);
  c.fillRect(x - 2, y - 2, 2, 2);
  c.fillRect(x + 1, y - 2, 2, 2);
}

/** 슬라임(모브) */
function slime(c: Ctx, x: number, y: number, col: string, s = 4) {
  for (let i = 0; i < s; i++) {
    const w = Math.floor(Math.sqrt(i / s) * s * 1.4);
    c.fillStyle = col;
    c.fillRect(x - w, y - s + i, w * 2 + 1, 1);
  }
  c.fillStyle = '#1a1420';
  c.fillRect(x - 2, y - Math.ceil(s / 2) - 1, 1, 1);
  c.fillRect(x + 2, y - Math.ceil(s / 2) - 1, 1, 1);
}

function glow(c: Ctx, cx: number, cy: number, r: number, col: string) {
  for (let k = 3; k >= 1; k--) {
    c.globalAlpha = 0.18 * (4 - k);
    disc(c, cx, cy, Math.floor((r * k) / 3), col);
  }
  c.globalAlpha = 1;
}

function building(c: Ctx, x: number, w: number, h: number, base: number, col: string, win: string, seed: number) {
  c.fillStyle = col;
  c.fillRect(x, base - h, w, h);
  const r = prng(seed);
  c.fillStyle = win;
  for (let yy = base - h + 3; yy < base - 3; yy += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) if (r() < 0.45) c.fillRect(xx, yy, 1, 2);
}

const SCENES: Record<string, (c: Ctx) => void> = {
  // 1. 우주를 떠도는 코브와 가장 아름다운 별
  '1': (c) => {
    sky(c, ['#0c0f24', '#141a3a', '#1c2552', '#24306a']);
    stars(c, 140, 3);
    disc(c, 150, 78, 30, '#2a6fb0');
    disc(c, 144, 72, 14, '#3a9a58');
    disc(c, 160, 90, 9, '#3a9a58');
    disc(c, 141, 86, 5, '#3a9a58');
    c.fillStyle = 'rgba(255,255,255,0.25)';
    disc(c, 140, 66, 6, 'rgba(255,255,255,0.25)');
    glow(c, 58, 40, 14, '#fff3b0');
    disc(c, 58, 40, 3, '#ffffff');
  },
  // 2. 숲에 둘러싸인 왕국과 모브
  '2': (c) => {
    sky(c, ['#f7d9a8', '#f2c08a', '#e8a878', '#c88a70']);
    hills(c, 70, 6, '#7a8a6a', 2);
    building(c, 92, 36, 34, 92, '#8a7a6a', '#5a4a3a', 2);
    c.fillStyle = '#6a5a4a';
    c.fillRect(100, 50, 6, 10);
    c.fillRect(114, 46, 6, 14);
    hills(c, 92, 4, '#3f6a3a', 5, 0.08);
    for (let i = 0; i < 9; i++) tree(c, 10 + i * 25, 104, 14 + (i % 3) * 4, '#2f5a30');
    hills(c, 108, 3, '#2a4a2a', 9, 0.1);
    slime(c, 60, 116, '#8ad0a0', 5);
    slime(c, 170, 118, '#e0a0c0', 4);
    slime(c, 186, 120, '#a0c0f0', 3);
  },
  // 3. 동굴 밖으로 걸어 나온 아이
  'dob-bob:1': (c) => {
    sky(c, ['#bfe3f0', '#a8d8c8', '#90c8a0']);
    hills(c, 60, 8, '#5a8a50', 1);
    for (let i = 0; i < 6; i++) tree(c, 120 + i * 18, 92, 16 + (i % 2) * 6, '#3a6a38');
    c.fillStyle = '#4a4040';
    disc(c, 40, 112, 34, '#5a5050');
    disc(c, 40, 116, 22, '#1a1416');
    hills(c, 112, 3, '#4a7a40', 4, 0.1);
    person(c, 78, 116, '#f2e6c8', 10);
    slime(c, 96, 118, '#ffd080', 4);
  },
  // 4. 별빛 아래 두 동행
  'dob-bob:2': (c) => {
    sky(c, ['#1a1838', '#2a2450', '#3a3060', '#4a3a68']);
    stars(c, 90, 7, 70);
    disc(c, 180, 26, 9, '#fff3c8');
    hills(c, 98, 8, '#2a2a40', 3);
    c.fillStyle = '#ff9a40';
    disc(c, 110, 108, 3, '#ffb060');
    glow(c, 110, 106, 12, '#ffb060');
    person(c, 98, 112, '#e8dcc0', 10);
    person(c, 122, 112, '#3a3048', 12);
    c.fillStyle = '#c84040';
    c.fillRect(121, 98, 3, 1);
  },
  // 3. 백의 조율사와 흑의 조율사 — 마주 선 두 무리, 가운데 부딪치는 오브
  '3': (c) => {
    sky(c, ['#2a2438', '#3a3048', '#4a3a52', '#5a4458']);
    stars(c, 30, 31, 50, '#e8d8ff');
    hills(c, 100, 5, '#2a2230', 4);
    // 가운데 부딪치는 빛
    glow(c, 110, 78, 22, '#fff0c8');
    disc(c, 110, 78, 4, '#ffffff');
    c.fillStyle = '#ffe8a0';
    for (let a = 0; a < 10; a++) {
      const ang = (a / 10) * Math.PI * 2;
      for (let d = 7; d < 18; d += 2) c.fillRect(110 + Math.cos(ang) * d, 78 + Math.sin(ang) * d, 1, 1);
    }
    // 왼쪽: 백의 조율사 / 오른쪽: 흑의 조율사
    for (let i = 0; i < 4; i++) person(c, 30 + i * 13, 116 - (i % 2) * 2, '#ece6da', 11);
    for (let i = 0; i < 4; i++) person(c, 152 + i * 13, 116 - (i % 2) * 2, '#1e1826', 11);
    disc(c, 82, 98, 3, '#fff6d8');
    disc(c, 138, 98, 3, '#8a6aff');
    hills(c, 118, 1, '#18121e', 2, 0.1);
  },
  // 4. 두 개의 동굴 — 가까운 밝은 동굴, 멀리 숨겨진 어두운 동굴
  '4': (c) => {
    sky(c, ['#c8d8e8', '#b8c8d8', '#a8b8c8', '#98a8b8']);
    // 먼 산과 그 속의 어두운 동굴
    c.fillStyle = '#6a7080';
    for (let x = 0; x < W; x++) {
      const y = Math.floor(48 + Math.abs(x - 170) * 0.5);
      c.fillRect(x, y, 1, H - y);
    }
    disc(c, 172, 74, 7, '#2a1c2a');
    c.fillStyle = '#a03030';
    c.fillRect(171, 72, 1, 1);
    c.fillRect(173, 72, 1, 1);
    hills(c, 92, 5, '#4a6a48', 3);
    hills(c, 120, 2, '#3a5a38', 6, 0.1);
    // 가까운 바위와 따뜻한 빛이 새어 나오는 동굴 (풀밭 위에 그려야 가려지지 않음)
    disc(c, 60, 108, 28, '#7a6a5a');
    c.fillStyle = '#3a5a38';
    c.fillRect(0, 121, W, H - 121);
    disc(c, 60, 112, 15, '#3a2a1c');
    c.fillStyle = '#3a2a1c';
    c.fillRect(45, 112, 31, 9);
    glow(c, 60, 114, 13, '#ffd890');
    disc(c, 60, 115, 6, '#ffe8b0');
    person(c, 104, 118, '#f2e6c8', 10);
    person(c, 118, 118, '#4a3a48', 11);
  },
  // 도브와 보브 3. 징벌의 동굴 앞의 두 존재
  'dob-bob:3': (c) => {
    sky(c, ['#1a1024', '#24142e', '#2e1a36', '#3a2040']);
    stars(c, 40, 41, 40, '#d8c0ff');
    c.fillStyle = '#2a1e2a';
    for (let x = 0; x < W; x++) {
      const y = Math.floor(30 + Math.abs(x - 110) * 0.45);
      c.fillRect(x, y, 1, H - y);
    }
    disc(c, 110, 92, 26, '#0c060c');
    c.fillStyle = '#0c060c';
    c.fillRect(84, 92, 53, 30);
    glow(c, 110, 96, 12, '#c03040');
    c.fillStyle = '#ff5050';
    c.fillRect(104, 90, 2, 1);
    c.fillRect(115, 90, 2, 1);
    hills(c, 118, 2, '#1a1218', 3, 0.1);
    person(c, 70, 120, '#f2e6c8', 10);
    person(c, 152, 120, '#4a3a58', 12);
    glow(c, 76, 110, 5, '#ffd890');
  },
  // 선인의 이야기 — 먼 산 위의 네 사람, 길을 걷는 이
  'sasin:1': (c) => {
    sky(c, ['#d8c8e0', '#c8b8d8', '#b8a8c8', '#a898b8']);
    c.fillStyle = '#8a7a9a';
    for (let x = 0; x < W; x++) {
      const y = Math.floor(40 + Math.abs(x - 140) * 0.42);
      c.fillRect(x, y, 1, H - y);
    }
    c.fillStyle = '#f2ecf4';
    for (let x = 122; x < 158; x++) c.fillRect(x, Math.floor(40 + Math.abs(x - 140) * 0.42), 1, 3);
    const cols = ['#f4f0e8', '#7ab0e0', '#3a3a4a', '#e07060'];
    cols.forEach((col, i) => person(c, 126 + i * 9, 50 + Math.abs(126 + i * 9 - 140) * 0.42, col, 6));
    hills(c, 100, 4, '#6a6a5a', 3);
    hills(c, 112, 2, '#4a5a40', 7, 0.08);
    c.fillStyle = '#c8b890';
    for (let x = 20; x < 110; x++) c.fillRect(x, 122 - Math.floor((x - 20) * 0.12), 1, 2);
    person(c, 46, 120, '#2a2430', 9);
  },
  // 잊힌 선인 — 심연 깊은 곳, 갈래 길들 끝의 금빛 황룡
  'hwangryong:1': (c) => {
    sky(c, ['#0c0a14', '#14101e', '#1c1428', '#241a30']);
    stars(c, 30, 61, H, '#8a7ab0');
    c.fillStyle = '#d8b050';
    const r = prng(91);
    for (let k = 0; k < 7; k++) {
      let x = 110, y = 118;
      const dx = (k - 3) * 0.9;
      for (let t = 0; t < 70; t++) {
        x += dx + (r() - 0.5) * 1.2;
        y -= 1;
        if (t % 2) c.fillRect(Math.round(x), y, 1, 1);
      }
    }
    glow(c, 110, 40, 20, '#ffd060');
    c.fillStyle = '#e8b830';
    for (let i = 0; i < 28; i++) {
      const ang = i * 0.45;
      c.fillRect(110 + Math.round(Math.cos(ang) * (14 - i * 0.3)), 40 + Math.round(Math.sin(ang) * (8 - i * 0.15)), 3, 2);
    }
    disc(c, 110, 40, 3, '#fff0b0');
    person(c, 110, 122, '#c8c0d8', 8);
  },
  // 5. 코브의 빛 앞에 선 두 존재
  '5': (c) => {
    sky(c, ['#fff6e0', '#f8e8c0', '#f0d8a8', '#e8c890']);
    glow(c, 110, 40, 36, '#ffffff');
    disc(c, 110, 40, 6, '#ffffff');
    for (let a = 0; a < 12; a++) {
      c.fillStyle = 'rgba(255,240,200,0.5)';
      const ang = (a / 12) * Math.PI * 2;
      for (let d = 12; d < 40; d += 2) c.fillRect(110 + Math.cos(ang) * d, 40 + Math.sin(ang) * d, 1, 1);
    }
    hills(c, 104, 4, '#c8b088', 6);
    person(c, 100, 112, '#6a5a48', 10);
    person(c, 120, 112, '#3a3048', 12);
  },
  // 6. 높은 산 위의 도시 아르카
  // 6. 인간에게 맡겨진 세계 — 연기를 뿜는 도시와 베어진 숲, 남은 나무 한 그루
  '6': (c) => {
    sky(c, ['#8a8898', '#9a9098', '#b0a098', '#c8a890']);
    for (let i = 0; i < 12; i++) building(c, 92 + i * 10, 9, 18 + ((i * 11) % 26), 96, '#4a4a58', '#ffe0a0', i + 50);
    c.fillStyle = '#3a3a48';
    for (const x of [112, 150, 186]) {
      c.fillRect(x, 50, 4, 46);
      for (let k = 0; k < 6; k++) {
        c.globalAlpha = 0.5 - k * 0.07;
        disc(c, x + 2 + k * 5, 46 - k * 6, 4 + k, '#6a6670');
      }
      c.globalAlpha = 1;
    }
    hills(c, 96, 2, '#6a7a58', 2, 0.05);
    c.fillStyle = '#5a4030';
    for (let x = 8; x < 86; x += 11) c.fillRect(x, 104 + (x % 3), 5, 3);
    tree(c, 44, 104, 18, '#4a7a40');
    hills(c, 112, 2, '#4a5a3a', 5, 0.1);
    person(c, 62, 118, '#e8dcc0', 10);
  },
  '7': (c) => {
    sky(c, ['#c8c0b8', '#b8b0b0', '#a8a0a8', '#9890a0']);
    c.fillStyle = '#6a6070';
    for (let x = 0; x < W; x++) {
      const y = Math.floor(70 + Math.abs(x - 110) * 0.55);
      c.fillRect(x, y, 1, H - y);
    }
    for (let i = 0; i < 9; i++) building(c, 72 + i * 9, 8, 14 + ((i * 7) % 16), 74, '#e8e4ec', '#ffe8a0', i + 3);
    c.fillStyle = '#8a8098';
    c.fillRect(66, 72, 88, 4);
    hills(c, 112, 5, '#5a5048', 8, 0.05);
    c.fillStyle = '#4a4440';
    for (let x = 0; x < W; x += 7) c.fillRect(x, 116 + (x % 3), 4, 1);
  },
  // 7. 세계의 첫 번째 울음 (붉은 하늘, 뒤틀린 거리)
  // 8. 잊혀진 힘 — 연구실의 유리관 속에서 빛나는 감정 물질
  '8': (c) => {
    sky(c, ['#101828', '#141e30', '#18243a', '#1c2a44']);
    c.fillStyle = '#26324a';
    c.fillRect(0, 96, W, H - 96);
    c.fillStyle = '#2e3c58';
    for (let x = 0; x < W; x += 22) c.fillRect(x, 96, 1, H - 96);
    // 유리관
    c.fillStyle = 'rgba(160, 210, 255, 0.18)';
    c.fillRect(92, 34, 36, 62);
    c.fillStyle = '#8ab0d8';
    c.fillRect(90, 30, 40, 4);
    c.fillRect(90, 96, 40, 4);
    c.fillRect(92, 34, 1, 62);
    c.fillRect(127, 34, 1, 62);
    // 감정 물질: 여러 빛깔이 뒤섞인 빛
    glow(c, 110, 64, 18, '#c8a0ff');
    disc(c, 110, 64, 6, '#fff0ff');
    const cols = ['#ffd060', '#60a0ff', '#ff6060', '#a0ff90'];
    for (let k = 0; k < 4; k++) disc(c, 110 + Math.round(Math.cos(k * 1.6) * 9), 64 + Math.round(Math.sin(k * 1.6) * 9), 2, cols[k]);
    // 모니터와 연구원
    c.fillStyle = '#0c1220';
    c.fillRect(30, 70, 34, 24);
    c.fillStyle = '#3ae0a0';
    for (let x = 33; x < 61; x += 2) c.fillRect(x, 82 + Math.round(Math.sin(x * 0.7) * 4), 1, 1);
    c.fillStyle = '#0c1220';
    c.fillRect(160, 76, 30, 18);
    c.fillStyle = '#c8a0ff';
    for (let k = 0; k < 5; k++) c.fillRect(164 + k * 5, 90 - ((k * 7) % 11), 3, ((k * 7) % 11) + 1);
    person(c, 70, 118, '#e8ecf4', 11);
    person(c, 150, 118, '#e8ecf4', 11);
  },
  '9': (c) => {
    sky(c, ['#3a0f1a', '#5a1a24', '#8a2a2a', '#c84a30']);
    const r = prng(11);
    for (let i = 0; i < 14; i++) {
      const x = i * 16 + Math.floor(r() * 6);
      const h = 20 + Math.floor(r() * 40);
      c.save();
      c.translate(x + 4, 110);
      c.rotate((r() - 0.5) * 0.35);
      building(c, -4, 9 + Math.floor(r() * 5), h, 0, '#1a0a10', '#ff6a4a', i);
      c.restore();
    }
    c.fillStyle = '#ffd080';
    for (let i = 0; i < 4; i++) {
      let x = 30 + i * 50;
      for (let y = 0; y < 60; y += 3) {
        x += Math.floor((r() - 0.5) * 6);
        c.fillRect(x, y, 1, 3);
      }
    }
    hills(c, 112, 2, '#120608', 3, 0.1);
  },
  // 8. 심연의 소용돌이
  // 10. 재앙이 남긴 세계 — 무너진 거리를 다시 세우는 사람들, 멀리 빛나는 안전한 도시
  '10': (c) => {
    sky(c, ['#3a3448', '#4a4054', '#6a5460', '#8a6a68']);
    for (let i = 0; i < 9; i++) building(c, 128 + i * 10, 9, 22 + ((i * 7) % 20), 92, '#5a5a70', '#ffe8a0', i + 70);
    glow(c, 168, 78, 26, '#ffe8b0');
    hills(c, 92, 2, '#3a3038', 2, 0.05);
    // 무너진 건물 (기울어진 잔해)
    const r = prng(77);
    for (let i = 0; i < 6; i++) {
      c.save();
      c.translate(14 + i * 18, 108);
      c.rotate((r() - 0.5) * 0.6);
      c.fillStyle = '#2a2430';
      c.fillRect(-4, -14 - Math.floor(r() * 12), 9, 26);
      c.restore();
    }
    hills(c, 110, 2, '#24202a', 5, 0.1);
    // 잔해를 치우고 다시 세우는 사람들
    c.fillStyle = '#8a7a6a';
    c.fillRect(60, 100, 14, 3);
    person(c, 54, 118, '#e8dcc0', 10);
    person(c, 80, 118, '#c8b8a8', 10);
    person(c, 100, 118, '#e8dcc0', 8);
  },
  'aurora:1': (c) => {
    sky(c, ['#0a0818', '#120e28', '#1a1438']);
    stars(c, 40, 13, H, '#a8a0ff');
    for (let k = 0; k < 520; k++) {
      const t = k / 520;
      const ang = t * Math.PI * 9;
      const rr = 6 + t * 56;
      c.fillStyle = t < 0.3 ? '#e0d8ff' : t < 0.6 ? '#8a7af0' : '#4a3aa0';
      c.fillRect(110 + Math.cos(ang) * rr, 64 + Math.sin(ang) * rr * 0.55, 2, 1);
    }
    disc(c, 110, 64, 4, '#000000');
    person(c, 40, 118, '#a8b8ff', 9);
  },
  // 9. 두 명의 오로라 (마주 선 두 실루엣)
  'aurora:2': (c) => {
    sky(c, ['#0f1a3a', '#16285a', '#1e3a7a', '#2a4a8a']);
    stars(c, 60, 21, 60, '#c8e0ff');
    c.fillStyle = '#9ad0ff';
    for (let y = 30; y < 118; y += 2) c.fillRect(110, y, 1, 1);
    glow(c, 80, 96, 16, '#5aa0ff');
    glow(c, 140, 96, 16, '#ffd0a0');
    person(c, 80, 116, '#bfe0ff', 12);
    person(c, 140, 116, '#ffe0c0', 12);
    hills(c, 118, 1, '#0a1428', 2, 0.1);
  },
  // 10. 세이프존과 두 요원
  '11': (c) => {
    sky(c, ['#5a6a7a', '#6a7a88', '#7a8898', '#8a96a4']);
    c.fillStyle = 'rgba(150,230,255,0.25)';
    for (let x = 30; x <= 190; x++) {
      const y = 104 - Math.sqrt(Math.max(0, 80 * 80 - (x - 110) * (x - 110))) * 0.8;
      c.fillRect(x, y, 1, 104 - y);
    }
    c.fillStyle = '#9ae8ff';
    for (let x = 30; x <= 190; x++) {
      const y = 104 - Math.sqrt(Math.max(0, 80 * 80 - (x - 110) * (x - 110))) * 0.8;
      c.fillRect(x, Math.floor(y), 1, 1);
    }
    for (let i = 0; i < 8; i++) building(c, 60 + i * 13, 10, 14 + ((i * 5) % 18), 104, '#3a4a5a', '#ffe8a0', i + 30);
    hills(c, 104, 1, '#3a3a40', 1, 0.1);
    person(c, 100, 120, '#5a6a8a', 11);
    person(c, 116, 120, '#c87aa8', 10);
  },
  // 11. 세계의 마지막 울음 (빛으로 감싸는 손들)
  'old-13': (c) => {
    sky(c, ['#1a1030', '#2a1a40', '#3a2a58', '#4a3a70']);
    glow(c, 110, 52, 40, '#ffd8f0');
    disc(c, 110, 52, 10, '#fff4fa');
    for (let a = 0; a < 16; a++) {
      const ang = (a / 16) * Math.PI * 2;
      c.fillStyle = a % 2 ? '#9ad0ff' : '#ffd080';
      for (let d = 18; d < 50; d += 3) c.fillRect(110 + Math.cos(ang) * d, 52 + Math.sin(ang) * d * 0.7, 1, 1);
    }
    hills(c, 108, 3, '#1a1028', 4);
    for (let i = 0; i < 7; i++) person(c, 60 + i * 16, 118, i === 3 ? '#9ad0ff' : '#d8c8f0', 9 + (i % 2));
  },
  // 마지막 장. 바다를 처음 본 아이
  '12': (c) => {
    sky(c, ['#ffd8b8', '#ffc8a8', '#f8b8a8', '#e8a8b0']);
    glow(c, 160, 62, 20, '#fff0c0');
    disc(c, 160, 62, 9, '#fff6d8');
    c.fillStyle = '#3a8ac0';
    c.fillRect(0, 66, W, 30);
    c.fillStyle = '#5aaad8';
    for (let y = 68; y < 96; y += 4) for (let x = (y % 8); x < W; x += 9) c.fillRect(x, y, 4, 1);
    c.fillStyle = '#fff0c0';
    for (let y = 68; y < 96; y += 3) c.fillRect(156 + ((y * 7) % 9) - 4, y, 6, 1);
    hills(c, 98, 2, '#e8d0a0', 3, 0.05);
    person(c, 70, 118, '#4a3a48', 12);
    person(c, 82, 118, '#4a3a48', 8);
  },
};

const cache = new Map<string, string>();

/** 장 첫머리 삽화 (dataURL). 없는 장이면 문양 기반 기본 그림 */
export function chapterArt(ref: ChapterRef): string {
  const key = String(ref);
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  (SCENES[key] ?? SCENES['1'])(ctx);
  // 액자 안쪽 그림자
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  ctx.fillRect(0, 0, W, 2);
  ctx.fillRect(0, 0, 2, H);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
