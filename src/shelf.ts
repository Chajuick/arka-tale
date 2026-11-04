// 3D 책장: 툰 로우폴리 + 외곽선. 책 목록에 맞춰 선반이 자동으로 늘어남
import * as THREE from 'three';
import { BOOKS, CASES, SERIES, caseOf, isLocked, type BookCase, type BookDef } from './books';
import { drawEmblem } from './art';

const DEPTH = 1.5; // 책 앞뒤 길이 (= 표지 가로)
const INNER_W = 6.2; // 선반 안쪽 너비
const SAGA_H = 2.35;
const LORE_H = 1.95;
const ROW_GAP = 0.55; // 책 위 여유 공간
const BOARD = 0.14;

// ───────── 재질 ─────────
const gradTex = (() => {
  const d = new Uint8Array([110, 110, 120, 255, 190, 190, 190, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.magFilter = t.minFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();
const toon = (opts: THREE.MeshToonMaterialParameters) => new THREE.MeshToonMaterial({ gradientMap: gradTex, ...opts });
const OUTLINE = new THREE.MeshBasicMaterial({ color: '#120c0a', side: THREE.BackSide });

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const shade = (hex: string, k: number) => {
  const c = new THREE.Color(hex).multiplyScalar(k);
  return `#${c.getHexString()}`;
};

function woodTexture() {
  return canvasTex(64, 64, (c) => {
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const band = Math.floor((y + Math.sin(x * 0.18) * 2) / 3);
        c.fillStyle = band % 5 === 0 ? '#5a3a22' : band % 2 ? '#6e4a2c' : '#764f2f';
        c.fillRect(x, y, 1, 1);
      }
  });
}

// ───────── 책 텍스처 ─────────

/** 책등: 색 + (큰 서사는 금박 띠) + 세로 제목 + 문양 */
function spineTexture(b: BookDef, t: number, h: number) {
  const W = 72;
  const H = Math.round((W * h) / t);
  const ink = b.ink ?? '#f4ecd8';
  const locked = isLocked(b);
  return canvasTex(W, H, (c) => {
    c.fillStyle = b.color;
    c.fillRect(0, 0, W, H);
    // 가장자리 어둡게 (둥근 책등 느낌)
    c.fillStyle = 'rgba(0,0,0,0.22)';
    c.fillRect(0, 0, 6, H);
    c.fillRect(W - 6, 0, 6, H);
    c.fillStyle = 'rgba(255,255,255,0.08)';
    c.fillRect(14, 0, 8, H);
    const gold = b.shelf === 'saga' ? '#e8c060' : shade(b.color, 0.6);
    for (const y of [H * 0.06, H * 0.94]) {
      c.fillStyle = gold;
      c.fillRect(0, y - 4, W, 3);
      c.fillRect(0, y + 3, W, 3);
    }
    // 세로 제목
    const chars = [...b.title.replace(/ /g, '·')].map((ch) => (ch === '·' ? '' : ch));
    const size = Math.min(34, Math.floor((H * 0.62) / Math.max(4, chars.length)));
    c.font = `${size}px Galmuri11, "Gowun Batang", serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    let y = H * 0.14;
    const step = size * 1.08;
    for (const ch of chars) {
      if (!ch) {
        y += step * 0.45;
        continue;
      }
      c.fillStyle = 'rgba(0,0,0,0.35)';
      c.fillText(ch, W / 2 + 2, y + 2);
      c.fillStyle = locked ? shade(ink, 0.75) : ink;
      c.fillText(ch, W / 2, y);
      y += step;
    }
    // 문양
    drawEmblem(c, b.emblem, W / 2 - 18, H * 0.8, 3, b.emblemColor ?? gold);
    if (b.shelf === 'saga') {
      const vol = BOOKS.filter((x) => x.shelf === 'saga').indexOf(b) + 1;
      c.font = '22px Galmuri11, serif';
      c.fillStyle = gold;
      c.fillText(String(vol), W / 2, H * 0.74);
    }
    if (locked) {
      c.fillStyle = 'rgba(10,6,4,0.35)';
      c.fillRect(0, 0, W, H);
    }
  });
}

/** 앞표지 */
export function coverCanvas(b: BookDef, w = 360, h = 520) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const c = cv.getContext('2d')!;
  c.imageSmoothingEnabled = false;
  const ink = b.ink ?? '#f4ecd8';
  const gold = b.shelf === 'saga' ? '#e8c060' : shade(ink, 0.9);
  c.fillStyle = b.color;
  c.fillRect(0, 0, w, h);
  // 가죽 질감 (점)
  for (let i = 0; i < 1800; i++) {
    c.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)';
    c.fillRect(Math.random() * w, Math.random() * h, 2, 2);
  }
  // 책등 쪽 접힘선
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.fillRect(0, 0, 14, h);
  // 장식 테두리
  c.strokeStyle = gold;
  c.lineWidth = 4;
  c.strokeRect(30, 26, w - 56, h - 52);
  c.lineWidth = 2;
  c.strokeRect(40, 36, w - 76, h - 72);
  for (const [x, y] of [[30, 26], [w - 26, 26], [30, h - 26], [w - 26, h - 26]]) {
    c.fillStyle = gold;
    c.fillRect(x - 6, y - 6, 12, 12);
  }
  // 문양
  drawEmblem(c, b.emblem, w / 2 - 54, h * 0.2, 9, b.emblemColor ?? gold);
  // 제목
  c.textAlign = 'center';
  c.fillStyle = ink;
  let size = 34;
  c.font = `bold ${size}px "Gowun Batang", serif`;
  while (c.measureText(b.title).width > w - 100 && size > 18) c.font = `bold ${--size}px "Gowun Batang", serif`;
  c.fillText(b.title, w / 2, h * 0.62);
  if (b.subtitle) {
    c.font = '16px "Gowun Batang", serif';
    c.fillStyle = shade(ink, 0.8);
    c.fillText(b.subtitle, w / 2, h * 0.62 + 34);
  }
  c.font = '14px Galmuri11, serif';
  c.fillStyle = gold;
  c.fillText(b.shelf === 'saga' ? `${SERIES} · 제${BOOKS.filter((x) => x.shelf === 'saga').indexOf(b) + 1}권` : '세계의 조각', w / 2, h - 60);
  return cv;
}

// ───────── 책장 ─────────

interface BookMesh {
  def: BookDef;
  group: THREE.Group;
  home: THREE.Vector3;
  out: number; // 호버로 빠져나온 정도 (0~1)
  target: number;
}

type Tween = { t: number; dur: number; fn: (k: number) => void; done: () => void };

export class Shelf {
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  readonly renderer: THREE.WebGLRenderer;
  /** 책장별 세로 범위 (위에서부터) */
  readonly cases: { id: string; title: string; top: number; bottom: number }[] = [];
  private books: BookMesh[] = [];
  private ray = new THREE.Raycaster();
  private hovered: BookMesh | null = null;
  private tweens: Tween[] = [];
  private clock = new THREE.Clock();
  private camBase = new THREE.Vector3();
  private parallax = new THREE.Vector2();
  private scrollY = 0;
  private scrollTarget = 0;
  private scrollRange: [number, number] = [0, 0];
  private scrollReady = false;
  private visibleH = 1;
  private drag: { y: number; from: number; moved: boolean } | null = null;
  private suppressClick = false;
  private activeCase = '';
  private lamp!: THREE.DirectionalLight;
  private fill!: THREE.PointLight;
  private dust!: THREE.Points;
  private busy = false;
  onHover?: (b: BookDef | null, x: number, y: number) => void;
  onPick?: (b: BookDef) => void;
  onCaseChange?: (id: string) => void;
  /** 위/아래로 더 볼 것이 있는지 바뀔 때 */
  onScrollState?: (up: boolean, down: boolean) => void;
  /** 가장자리 화살표에 올려둔 방향 (-1 위, 1 아래, 0 없음) */
  edge = 0;
  private edgeSpeed = 0;
  private scrollState = '';

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.scene.background = new THREE.Color('#1a1210');
    this.scene.fog = new THREE.Fog('#1a1210', 14, 30);
    this.build();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', (e) => this.onDown(e));
    canvas.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', () => this.onUp());
    window.addEventListener('pointercancel', () => this.onUp());
    canvas.addEventListener('click', (e) => this.onClick(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: true });
    window.addEventListener('keydown', (e) => this.onKey(e));
    this.renderer.setAnimationLoop(() => this.frame());
  }

  private build() {
    const s = this.scene;
    s.add(new THREE.HemisphereLight('#ffe8c8', '#2a1a14', 1.0));
    // 조명은 카메라를 따라 위아래로 움직임 (frame 참고)
    const lamp = (this.lamp = new THREE.DirectionalLight('#ffd8a0', 1.8));
    lamp.castShadow = true;
    lamp.shadow.mapSize.set(2048, 2048);
    const sc = lamp.shadow.camera as THREE.OrthographicCamera;
    sc.left = sc.bottom = -10;
    sc.right = sc.top = 10;
    s.add(lamp, lamp.target);
    this.fill = new THREE.PointLight('#ff9a50', 14, 14);
    s.add(this.fill);

    // 책장을 위에서 아래로 쌓기
    let top = 0;
    for (const bc of CASES) {
      const h = this.buildCase(bc, top);
      this.cases.push({ id: bc.id, title: bc.title, top, bottom: top - h });
      top -= h; // 책장은 이어 붙임 (사이 간격 없음)
    }
    const bottom = this.cases[this.cases.length - 1].bottom;
    const span = -bottom + 4;

    // 하나로 이어진 책장 몸체: 뒷판·옆판은 전체 높이로 한 장씩, 위 장식판과 아래 받침은 한 번만
    const H = -bottom;
    const wood = this.wood;
    this.box(INNER_W + 0.6, H + 0.2, 0.12, 0, bottom / 2, -DEPTH / 2 - 0.12, this.woodDark); // 뒷판
    this.box(0.3, H + 0.45, DEPTH + 0.3, -INNER_W / 2 - 0.15, bottom / 2 - 0.1, 0, wood); // 옆판
    this.box(0.3, H + 0.45, DEPTH + 0.3, INNER_W / 2 + 0.15, bottom / 2 - 0.1, 0, wood);
    this.box(INNER_W + 0.9, 0.24, DEPTH + 0.5, 0, 0.12, 0.05, wood); // 윗판(장식)
    this.box(INNER_W + 0.9, 0.3, DEPTH + 0.5, 0, bottom - 0.15, 0.05, wood); // 받침

    // 바닥과 벽
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), toon({ color: '#2a1c16' }));
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = bottom - 0.3;
    floorMesh.receiveShadow = true;
    s.add(floorMesh);
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(60, span + 30), toon({ color: '#3a2620' }));
    wall.position.set(0, bottom / 2, -DEPTH / 2 - 0.3);
    wall.receiveShadow = true;
    s.add(wall);

    // 떠다니는 먼지 (카메라 주변만, 카메라를 따라감)
    const n = 220;
    const pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 14;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 10;
      pos[i * 3 + 2] = Math.random() * 5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.dust = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#ffd9a0', size: 0.035, transparent: true, opacity: 0.6, fog: false }));
    s.add(this.dust);
  }

  private wood = toon({ map: woodTexture(), color: '#a07050' });
  private woodDark = toon({ color: '#3a2416' });

  /** 툰 상자 + 외곽선 */
  private box(bw: number, bh: number, bd: number, x: number, y: number, z: number, m: THREE.Material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    this.scene.add(mesh);
    const ol = new THREE.Mesh(mesh.geometry, OUTLINE);
    ol.position.copy(mesh.position);
    ol.scale.set(1 + 0.04 / bw, 1 + 0.04 / bh, 1 + 0.04 / bd);
    this.scene.add(ol);
    return mesh;
  }

  /** 책장 한 구역(칸 묶음) 만들기. top = 구역 윗면 y. 구역 높이를 돌려줌 */
  private buildCase(bc: BookCase, top: number) {
    const s = this.scene;
    // 칸 배치: 칸마다 책을 왼쪽부터 꽂고, 넘치면 같은 칸이 한 줄 더 생김
    const rows: { books: BookDef[]; h: number; label: string; tall: boolean }[] = [];
    const thick = (b: BookDef, tall: boolean) => (tall ? 0.5 : 0.34 + ((b.id.length * 7) % 5) * 0.025);
    for (const def of bc.rows) {
      const list = BOOKS.filter((b) => caseOf(b) === bc.id && b.shelf === def.key);
      const h = def.tall ? SAGA_H : LORE_H;
      const tall = !!def.tall;
      let cur: BookDef[] = [];
      let w = 0;
      let first = true;
      const push = () => {
        rows.push({ books: cur, h, label: first ? def.label : '', tall });
        first = false;
        cur = [];
        w = 0;
      };
      for (const b of list) {
        const t = thick(b, tall) + 0.03;
        if (w + t > INNER_W - 0.3 && cur.length) push();
        cur.push(b);
        w += t;
      }
      push(); // 빈 칸도 선반은 만들어 둠
    }

    // 칸마다: 책 공간(h + 여유) + 아래 선반 판
    const totalH = rows.reduce((a, r) => a + r.h + ROW_GAP + BOARD, 0);
    const box = this.box.bind(this);
    const wood = this.wood;

    let y = top;
    for (const row of rows) {
      const floor = y - row.h - ROW_GAP;
      box(INNER_W, BOARD, DEPTH + 0.2, 0, floor - BOARD / 2, 0.05, wood); // 선반
      if (row.label) this.plaque(row.label, floor - BOARD / 2, DEPTH / 2 + 0.17);
      let x = -INNER_W / 2 + 0.18;
      row.books.forEach((b, i) => {
        const t = thick(b, row.tall);
        const h = row.h * (row.tall ? 1 : 0.86 + ((b.id.charCodeAt(0) + i) % 4) * 0.04);
        const g = this.makeBook(b, t, h);
        g.position.set(x + t / 2, floor + h / 2, 0);
        s.add(g);
        this.books.push({ def: b, group: g, home: g.position.clone(), out: 0, target: 0 });
        x += t + 0.03;
      });
      // 남는 자리: 아직 꽂히지 않은 책들 (흐린 자리 표시)
      if (!row.tall) {
        const ghostMat = new THREE.MeshBasicMaterial({ color: '#000', transparent: true, opacity: 0.18 });
        for (let gx = x + 0.2; gx < INNER_W / 2 - 0.3; gx += 0.42) {
          const gh = row.h * 0.8;
          const m = new THREE.Mesh(new THREE.PlaneGeometry(0.32, gh), ghostMat);
          m.position.set(gx, floor + gh / 2, -DEPTH / 2 + 0.01);
          s.add(m);
        }
      }
      y = floor - BOARD;
    }
    return totalH;
  }

  private plaque(text: string, y: number, z: number) {
    const tex = canvasTex(512, 64, (c) => {
      c.fillStyle = '#c8a050';
      c.fillRect(0, 0, 512, 64);
      c.fillStyle = '#8a6420';
      c.fillRect(0, 0, 512, 4);
      c.fillRect(0, 60, 512, 4);
      c.font = '30px Galmuri11, "Gowun Batang", serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = '#3a2610';
      c.fillText(text, 256, 34);
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.24), new THREE.MeshBasicMaterial({ map: tex }));
    m.position.set(0, y, z);
    this.scene.add(m);
  }

  private makeBook(b: BookDef, t: number, h: number) {
    const g = new THREE.Group();
    const page = toon({ color: '#efe4c8' });
    const cover = toon({ color: b.color });
    const front = toon({ map: new THREE.CanvasTexture(coverCanvas(b)) });
    (front.map as THREE.Texture).colorSpace = THREE.SRGBColorSpace;
    const spine = toon({ map: spineTexture(b, t, h) });
    // 면 순서: +x(앞표지) -x(뒤표지) +y -y +z(책등) -z
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(t, h, DEPTH), [front, cover, page, page, spine, page]);
    mesh.castShadow = mesh.receiveShadow = true;
    g.add(mesh);
    const ol = new THREE.Mesh(mesh.geometry, OUTLINE);
    ol.scale.set(1 + 0.05 / t, 1 + 0.03 / h, 1 + 0.03 / DEPTH);
    g.add(ol);
    g.userData.id = b.id;
    return g;
  }

  // ───────── 화면 / 입력 ─────────

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // 책장 너비가 화면에 들어오도록 거리 계산 (세로는 스크롤)
    const fovV = THREE.MathUtils.degToRad(this.camera.fov);
    const fovH = 2 * Math.atan(Math.tan(fovV / 2) * this.camera.aspect);
    const needW = INNER_W + 1.6;
    const first = this.cases[0];
    const viewH = Math.min(first.top - first.bottom + 1.8, 7.6);
    const dist = Math.max(needW / 2 / Math.tan(fovH / 2), viewH / 2 / Math.tan(fovV / 2));
    this.camBase.set(0, 0, dist + DEPTH / 2);
    this.visibleH = 2 * dist * Math.tan(fovV / 2);
    // 스크롤 범위: 맨 위 이름판 ~ 맨 아래 책장 바닥
    const hi = 0.9 - this.visibleH / 2;
    const lo = this.cases[this.cases.length - 1].bottom - 0.5 + this.visibleH / 2;
    this.scrollRange = lo > hi ? [(lo + hi) / 2, (lo + hi) / 2] : [lo, hi];
    if (!this.scrollReady) {
      this.scrollY = this.scrollTarget = this.scrollRange[1];
      this.scrollReady = true;
    }
    this.scrollTo(this.scrollTarget);
    this.camera.updateProjectionMatrix();
  }

  private scrollTo(y: number) {
    const [lo, hi] = this.scrollRange;
    this.scrollTarget = Math.min(hi, Math.max(lo, y));
  }

  /** 다음/이전 책장으로 (dir: -1 위, 1 아래). 책장이 없으면 한 화면만큼 */
  stepCase(dir: -1 | 1) {
    const i = this.cases.findIndex((c) => c.id === this.activeCase);
    const to = this.cases[i + dir];
    if (to) this.scrollToCase(to.id);
    else this.scrollTo(this.scrollTarget - dir * this.visibleH * 0.8);
  }

  /** 책장으로 이동 (그 책장 꼭대기가 화면 위쪽에 오게) */
  scrollToCase(id: string) {
    const c = this.cases.find((x) => x.id === id);
    if (c) this.scrollTo(c.top + 0.9 - this.visibleH / 2);
  }

  private pick(e: { clientX: number; clientY: number }) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), this.camera);
    const hits = this.ray.intersectObjects(this.books.map((b) => b.group), true);
    if (!hits.length) return null;
    let o: THREE.Object3D | null = hits[0].object;
    while (o && !o.userData.id) o = o.parent;
    return this.books.find((b) => b.group === o) ?? null;
  }

  private onDown(e: PointerEvent) {
    if (this.busy) return;
    this.drag = { y: e.clientY, from: this.scrollTarget, moved: false };
  }

  private onUp() {
    if (this.drag?.moved) this.suppressClick = true;
    this.drag = null;
    this.renderer.domElement.classList.remove('dragging');
  }

  private onMove(e: PointerEvent) {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.parallax.set((e.clientX - r.left) / r.width - 0.5, (e.clientY - r.top) / r.height - 0.5);
    if (this.busy) return;
    // 드래그: 화면을 잡고 위아래로 끌기
    if (this.drag) {
      const dy = e.clientY - this.drag.y;
      if (Math.abs(dy) > 6) this.drag.moved = true;
      if (this.drag.moved) {
        this.scrollTo(this.drag.from + (dy * this.visibleH) / r.height);
        this.renderer.domElement.classList.add('dragging');
        this.setHover(null);
        this.onHover?.(null, 0, 0);
        return;
      }
    }
    if (e.pointerType === 'touch') return;
    const b = this.pick(e);
    this.setHover(b);
    this.onHover?.(b?.def ?? null, e.clientX, e.clientY);
  }

  private setHover(b: BookMesh | null) {
    if (b === this.hovered) return;
    if (this.hovered) this.hovered.target = 0;
    this.hovered = b;
    if (b) b.target = 1;
    this.renderer.domElement.style.cursor = b ? 'pointer' : '';
  }

  private onClick(e: MouseEvent) {
    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }
    if (this.busy) return;
    const b = this.pick(e);
    if (!b) return;
    if (isLocked(b.def)) {
      void this.wiggle(b);
      return;
    }
    this.onPick?.(b.def);
  }

  private onWheel(e: WheelEvent) {
    if (this.busy) return;
    this.scrollTo(this.scrollTarget - e.deltaY * 0.004);
  }

  private onKey(e: KeyboardEvent) {
    if (this.busy) return;
    const steps: Record<string, number> = { ArrowUp: 1, ArrowDown: -1, PageUp: 4, PageDown: -4 };
    const step = steps[e.key];
    if (step) this.scrollTo(this.scrollTarget + step);
    else if (e.key === 'Home') this.scrollTo(Infinity);
    else if (e.key === 'End') this.scrollTo(-Infinity);
  }

  // ───────── 애니메이션 ─────────

  private tween(dur: number, fn: (k: number) => void) {
    return new Promise<void>((done) => this.tweens.push({ t: 0, dur, fn, done }));
  }

  private async wiggle(b: BookMesh) {
    await this.tween(360, (k) => (b.group.rotation.z = Math.sin(k * Math.PI * 4) * 0.05 * (1 - k)));
  }

  private meshOf(id: string) {
    return this.books.find((b) => b.def.id === id);
  }

  /** 책 꺼내기: 슉 빠져나와 앞표지를 보이며 화면 앞으로 */
  async pullOut(id: string) {
    const b = this.meshOf(id);
    if (!b) return;
    this.busy = true;
    this.onHover?.(null, 0, 0);
    const g = b.group;
    const start = g.position.clone();
    await this.tween(260, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      g.position.z = start.z + e * 1.6;
    });
    const p0 = g.position.clone();
    const cam = this.camera.position;
    const target = new THREE.Vector3(cam.x, cam.y, cam.z - 3.4);
    await this.tween(520, (k) => {
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      g.position.lerpVectors(p0, target, e);
      g.position.y += Math.sin(e * Math.PI) * 0.4;
      g.rotation.y = -Math.PI / 2 * e;
      g.rotation.z = Math.sin(e * Math.PI) * 0.12;
    });
  }

  /** 책 다시 꽂기 */
  async putBack(id: string) {
    const b = this.meshOf(id);
    if (!b) return;
    const g = b.group;
    const p0 = g.position.clone();
    const mid = b.home.clone().setZ(b.home.z + 1.6);
    await this.tween(480, (k) => {
      const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      g.position.lerpVectors(p0, mid, e);
      g.rotation.y = -Math.PI / 2 * (1 - e);
      g.rotation.z = 0;
    });
    await this.tween(240, (k) => {
      g.position.lerpVectors(mid, b.home, 1 - Math.pow(1 - k, 2));
    });
    b.out = b.target = 0;
    this.busy = false;
  }

  /** 다른 책으로 이동할 때: 지금 책은 바로 제자리로 */
  snapBack(id: string) {
    const b = this.meshOf(id);
    if (!b) return;
    b.group.position.copy(b.home);
    b.group.rotation.set(0, 0, 0);
    b.out = b.target = 0;
  }

  setDim(on: boolean) {
    this.renderer.domElement.classList.toggle('dim', on);
  }

  private frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    for (const tw of [...this.tweens]) {
      tw.t += dt * 1000;
      const k = Math.min(1, tw.t / tw.dur);
      tw.fn(k);
      if (k >= 1) {
        this.tweens.splice(this.tweens.indexOf(tw), 1);
        tw.done();
      }
    }
    // 호버: 책이 살짝 빠져나옴
    if (!this.busy) {
      for (const b of this.books) {
        b.out += (b.target - b.out) * Math.min(1, dt * 12);
        b.group.position.z = b.home.z + b.out * 0.28;
      }
    }
    // 가장자리 화살표: 올려두면 점점 빨라지며 천천히 스크롤
    this.edgeSpeed += ((this.busy ? 0 : this.edge) - this.edgeSpeed) * Math.min(1, dt * 3);
    if (Math.abs(this.edgeSpeed) > 0.01) this.scrollTo(this.scrollTarget - this.edgeSpeed * dt * 3.2);
    const [lo, hi] = this.scrollRange;
    const state = `${this.scrollTarget < hi - 0.05}|${this.scrollTarget > lo + 0.05}`;
    if (state !== this.scrollState) {
      this.scrollState = state;
      this.onScrollState?.(this.scrollTarget < hi - 0.05, this.scrollTarget > lo + 0.05);
    }
    // 카메라: 부드러운 스크롤 + 살짝 시차
    this.scrollY += (this.scrollTarget - this.scrollY) * Math.min(1, dt * 10);
    const cy = this.scrollY;
    this.camera.position.set(this.camBase.x + this.parallax.x * 0.5, this.camBase.y + cy - this.parallax.y * 0.3, this.camBase.z);
    this.camera.lookAt(this.parallax.x * 0.2, cy, 0);
    this.lamp.position.set(-4, cy + 6, 8);
    this.lamp.target.position.set(0, cy, 0);
    this.fill.position.set(5, cy - 1, 4);
    this.dust.position.y = cy;
    // 지금 화면에서 가장 많이 보이는 책장 (이름판 포함)
    const vTop = cy + this.visibleH / 2;
    const vBot = cy - this.visibleH / 2;
    const seen = (c: { top: number; bottom: number }) => Math.min(vTop, c.top + 0.5) - Math.max(vBot, c.bottom);
    // 맨 아래까지 내렸으면 마지막 책장 (짧은 책장도 선택되게)
    const atEnd = this.scrollTarget <= this.scrollRange[0] + 0.05 && this.scrollRange[0] < this.scrollRange[1];
    const now = atEnd ? this.cases[this.cases.length - 1] : this.cases.reduce((a, c) => (seen(c) > seen(a) ? c : a));
    if (now.id !== this.activeCase) {
      this.activeCase = now.id;
      this.onCaseChange?.(now.id);
    }
    // 먼지
    const p = this.dust.geometry.attributes.position as THREE.BufferAttribute;
    const t = this.clock.elapsedTime;
    for (let i = 0; i < p.count; i++) {
      p.setY(i, p.getY(i) + Math.sin(t * 0.3 + i) * 0.0008);
      p.setX(i, p.getX(i) + Math.cos(t * 0.2 + i * 1.3) * 0.0006);
    }
    p.needsUpdate = true;
    this.renderer.render(this.scene, this.camera);
  }
}
