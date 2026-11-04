// 2D 읽기 화면: 자동 쪽 나누기 + 3D 페이지 넘김
import { SERIES, bookById, categoryOf, isLocked, nextVolume, volOf, type BookDef } from './books';
import { chapterArt, emblemDataURL } from './art';
import { SCENE_BREAK, getChapter } from './content';
import { coverCanvas } from './shelf';
import { playFlip } from './sound';

/** 쪽 크기(디자인 px): 두 쪽 펼침 / 휴대폰 한 쪽 보기 */
const DIMS = { spread: { w: 460, h: 640 }, single: { w: 380, h: 660 } } as const;
type Mode = keyof typeof DIMS;
/** 좁거나 세로로 긴 화면이면 한 쪽씩 크게 */
const pickMode = (): Mode => (window.innerWidth < 760 || window.innerWidth / window.innerHeight < 1.05 ? 'single' : 'spread');
/** 쪽 HTML 앞에 붙는 표시: 꽉 찬 쪽 (문단 사이를 벌려 아래를 맞춤) */
const FULL = '\u0001full';

type Block = { html: string; cls?: string };

/** 토큰 n개까지 앞부분 / 나머지로 나누되, 열린 태그는 앞에서 닫고 뒤에서 다시 엶 */
function splitHtml(toks: string[], n: number): [string, string] {
  const open: { name: string; raw: string }[] = [];
  let head = '';
  for (let i = 0; i < n; i++) {
    const t = toks[i];
    head += t;
    const close = t.match(/^<\/(\w+)/);
    const opn = t.match(/^<(\w+)/);
    if (close) open.pop();
    else if (opn && !t.endsWith('/>')) open.push({ name: opn[1], raw: t });
  }
  head = head.trimEnd() + [...open].reverse().map((o) => `</${o.name}>`).join('');
  const tail = open.map((o) => o.raw).join('') + toks.slice(n).join('').trimStart();
  return [head, tail];
}

/** 장 첫 문단의 첫 글자를 살짝 크게 (앞에 태그가 있으면 건너뜀, 따옴표로 시작하면 그대로) */
function initial(html: string) {
  return html.replace(/^((?:<[^>]+>)*)([^<\s"'“‘])/, '$1<span class="initial">$2</span>');
}

export class Reader {
  private root = document.getElementById('reader')!;
  private bookEl = this.root.querySelector('.book') as HTMLElement;
  private stage = this.root.querySelector('.stage') as HTMLElement;
  private pages: string[] = []; // 각 쪽의 HTML
  private spread = 0; // 두 쪽 모드: 펼침 번호 (0 = 표지)
  private idx = 0; // 한 쪽 모드: 쪽 번호
  private mode: Mode = 'spread';
  private book: BookDef | null = null;
  private bodyStart = 0; // 본문 첫 쪽 (쪽 번호 1)
  private bodyEnd = 0; // 본문 끝 (이 쪽부터는 번호 없음)
  private flipping = false;
  private nextBook: BookDef | undefined; // 큰 서사의 다음 권
  private endIndex = -1; // '끝' 쪽 위치
  onClose?: () => void;
  onLink?: (id: string) => void;
  /** 다음 권으로 이어 읽기 */
  onNext?: (id: string) => void;

  constructor() {
    this.root.querySelector('.close')!.addEventListener('click', () => this.close());
    this.root.querySelector('.nav-prev')!.addEventListener('click', () => this.prev());
    this.root.querySelector('.nav-next')!.addEventListener('click', () => this.next());
    window.addEventListener('keydown', (e) => {
      if (this.root.classList.contains('hidden')) return;
      if (e.key === 'ArrowRight') this.next();
      else if (e.key === 'ArrowLeft') this.prev();
      else if (e.key === 'Escape') this.close();
    });
    // 쪽 클릭: 왼쪽 절반 = 이전, 오른쪽 절반 = 다음 / 스와이프
    this.bookEl.addEventListener('click', (e) => {
      const nx = (e.target as HTMLElement).closest('[data-next]') as HTMLElement | null;
      if (nx) {
        e.stopPropagation();
        return this.onNext?.(nx.dataset.next!);
      }
      const a = (e.target as HTMLElement).closest('[data-link]') as HTMLElement | null;
      if (a) {
        e.stopPropagation();
        return this.onLink?.(a.dataset.link!);
      }
      const r = this.bookEl.getBoundingClientRect();
      if (e.clientX - r.left > r.width / 2) this.next();
      else this.prev();
    });
    let sx = 0;
    this.bookEl.addEventListener('touchstart', (e) => (sx = e.touches[0].clientX), { passive: true });
    this.bookEl.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) (dx < 0 ? this.next() : this.prev());
    });
    window.addEventListener('resize', () => this.onResize());
  }

  private get dims() {
    return DIMS[this.mode];
  }

  /** 쪽 크기를 CSS 변수와 측정용 쪽에 반영 */
  private applyMode() {
    const d = this.dims;
    document.documentElement.style.setProperty('--pw', `${d.w}px`);
    document.documentElement.style.setProperty('--ph', `${d.h}px`);
    document.body.classList.toggle('single-mode', this.mode === 'single');
    this.bookEl.classList.toggle('single', this.mode === 'single');
  }

  /** 화면을 돌리거나 크기가 바뀌면: 모드가 달라질 때만 다시 쪽을 나누고, 읽던 위치를 비율로 유지 */
  private onResize() {
    const m = pickMode();
    if (this.book && !this.root.classList.contains('hidden') && m !== this.mode && !this.flipping) {
      const ratio = this.position() / Math.max(1, this.pages.length - 1);
      this.mode = m;
      this.applyMode();
      this.build(this.book);
      const target = Math.round(ratio * (this.pages.length - 1));
      if (this.mode === 'single') this.idx = target;
      else this.spread = Math.ceil(target / 2);
      this.render();
    }
    this.fit();
  }

  /** 지금 보고 있는 쪽 번호 (두 쪽 모드는 오른쪽 쪽) */
  private position() {
    return this.mode === 'single' ? this.idx : this.spread * 2;
  }

  // ───────── 쪽 만들기 ─────────

  private blocks(b: BookDef): Block[][] {
    // 장마다 블록 목록 (장 첫머리 = 삽화 + 제목)
    const out: Block[][] = [];
    for (const ref of b.chapters ?? []) {
      const ch = getChapter(ref);
      if (!ch) continue;
      const bl: Block[] = [
        { html: `<img class="art" src="${chapterArt(ref)}" width="220" height="130" alt="">`, cls: 'art-wrap' },
        { html: ch.title.replace(/^(제\d+장|마지막 장)\.?\s*/, '<small>$1</small>'), cls: 'ch-title' },
      ];
      ch.paragraphs.forEach((p, i) => {
        if (p === SCENE_BREAK) return bl.push({ html: '<span>◆</span>', cls: 'scene' });
        bl.push({ html: i === 0 ? initial(p) : p, cls: i === 0 ? 'p first' : 'p' });
      });
      for (const l of b.links ?? []) {
        if (l.after !== ref) continue;
        const to = bookById(l.to);
        const locked = !to || isLocked(to);
        bl.push({
          html: `<span class="bm-icon"></span><span>${l.text}</span><b>${locked ? '준비 중인 이야기' : '이어 읽기 →'}</b>`,
          cls: `bookmark${locked ? ' locked' : ''}" data-link="${l.to}`,
        });
      }
      out.push(bl);
    }
    return out;
  }

  /**
   * 측정용 쪽에 블록을 채워 넣으며 쪽 나누기
   *  - 문단이 넘치면 줄 단위로 쪼개서 앞부분은 이 쪽, 나머지는 다음 쪽에 (양쪽 모두 최소 2줄)
   *  - 장면 전환 표시가 쪽의 처음이나 끝에 걸리면 생략 (쪽이 바뀌는 것 자체가 전환이므로)
   */
  private paginate(b: BookDef): string[] {
    const meas = document.getElementById('measure')!;
    meas.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'page-inner';
    meas.appendChild(page);
    const pages: string[] = [];
    const limit = () => page.getBoundingClientRect().bottom - parseFloat(getComputedStyle(page).paddingBottom);
    const overflows = () => {
      const last = page.lastElementChild as HTMLElement | null;
      return !!last && last.getBoundingClientRect().bottom > limit() + 1;
    };
    const add = (html: string) => {
      page.insertAdjacentHTML('beforeend', html);
      return page.lastElementChild as HTMLElement;
    };
    /**
     * 지금 쪽을 확정. full = 글이 넘쳐서 넘기는 쪽 (→ 문단 사이를 벌려 마지막 줄 높이를 맞춤)
     * 장면 전환 표시 뒤에 글이 2줄도 안 남으면, 전환 표시부터 다음 쪽 맨 위로 넘김
     */
    const flush = (full = false) => {
      const carry: string[] = [];
      const kids = [...page.children] as HTMLElement[];
      const si = kids.map((k) => k.classList.contains('scene')).lastIndexOf(true);
      if (full && si > 0) {
        const lineH = parseFloat(getComputedStyle(page).lineHeight);
        const after = kids.slice(si + 1).reduce((a, k) => a + k.getBoundingClientRect().height, 0);
        if (after < lineH * 2 - 1) for (const k of kids.slice(si)) carry.push(k.outerHTML), k.remove();
      }
      // 꽉 찬 쪽: 남는 공간을 문단 사이에 나눠 넣되, 한 칸에 최대 12px까지만 (너무 성글지 않게)
      let mark = '';
      if (full && page.children.length > 1) {
        const lastEl = page.lastElementChild as HTMLElement;
        const left = Math.max(0, limit() - lastEl.getBoundingClientRect().bottom);
        mark = `${FULL}${Math.min(12, left / (page.children.length - 1)).toFixed(1)}|`;
      }
      if (page.innerHTML.trim()) pages.push(mark + page.innerHTML);
      page.innerHTML = '';
      for (const c of carry) add(c);
    };

    for (const chapter of this.blocks(b)) {
      flush(); // 장은 새 쪽에서 시작
      for (const bl of chapter) {
        const html = `<div class="${bl.cls ?? ''}">${bl.html}</div>`;
        const el = add(html);
        if (!overflows()) continue;
        el.remove();
        if (bl.cls?.startsWith('p') && this.splitInto(page, bl, limit)) {
          flush(true);
          const tail = this.pendingTail!;
          this.pendingTail = null;
          add(`<div class="${tail.cls}">${tail.html}</div>`);
          // 나머지도 한 쪽을 넘치면(아주 긴 문단) 다시 쪼갬
          while (overflows()) {
            const t = page.lastElementChild as HTMLElement;
            const tb = { html: t.innerHTML, cls: t.className };
            t.remove();
            if (!this.splitInto(page, tb, limit)) {
              add(`<div class="${tb.cls}">${tb.html}</div>`);
              break;
            }
            flush(true);
            const nt = this.pendingTail!;
            this.pendingTail = null;
            add(`<div class="${nt.cls}">${nt.html}</div>`);
          }
          continue;
        }
        flush(true);
        add(html);
      }
    }
    flush();
    meas.innerHTML = '';
    return pages;
  }

  /**
   * 문단을 이 쪽에 들어가는 만큼만 넣고, 나머지는 다음 쪽 첫 문단으로 이어 붙임.
   * 성공하면 true (이 쪽에 앞부분이 들어가고, 나머지는 flush 뒤에 새 쪽에 들어감)
   */
  private splitInto(page: HTMLElement, bl: Block, limit: () => number) {
    const toks = bl.html.match(/<[^>]+>|[^<\s]+\s*|\s+/g) ?? [];
    const words = toks.filter((t) => !t.startsWith('<') && t.trim()).length;
    if (words < 4) return false;
    const probe = document.createElement('div');
    probe.className = bl.cls!;
    probe.innerHTML = bl.html;
    page.appendChild(probe);
    const lineH = parseFloat(getComputedStyle(probe).lineHeight);
    const total = Math.round(probe.getBoundingClientRect().height / lineH);
    const room = Math.floor((limit() - probe.getBoundingClientRect().top + 1) / lineH);
    const want = Math.min(room, total - 2); // 다음 쪽에도 최소 2줄
    if (want < 2) {
      probe.remove();
      return false;
    }
    // 앞부분이 want줄 이하가 되는 가장 긴 토큰 수를 이분 탐색
    let lo = 1;
    let hi = toks.length - 1;
    let best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      probe.innerHTML = splitHtml(toks, mid)[0];
      if (probe.getBoundingClientRect().height <= want * lineH + 2) {
        best = mid;
        lo = mid + 1;
      } else hi = mid - 1;
    }
    if (!best) {
      probe.remove();
      return false;
    }
    const [head, tail] = splitHtml(toks, best);
    probe.innerHTML = head;
    probe.classList.add('cut'); // 다음 쪽으로 이어짐
    // 나머지는 다음 쪽 첫 블록으로 (들여쓰기 없음)
    this.pendingTail = { html: tail, cls: 'p cont' };
    return true;
  }
  private pendingTail: Block | null = null;

  private coverHTML(b: BookDef) {
    const url = coverCanvas(b, this.dims.w, this.dims.h).toDataURL();
    return `<img class="cover-img" src="${url}" alt="">`;
  }

  private titlePageHTML(b: BookDef) {
    const vol = volOf(b);
    return `<div class="title-page">
      <div class="tp-series"><i></i>${SERIES}<i></i></div>
      <img class="tp-emblem" src="${emblemDataURL(b.emblem, vol ? '#b08a30' : '#8a6a40')}" alt="">
      <h1>${b.title}</h1>
      <div class="tp-rule"></div>
      ${b.subtitle ? `<div class="tp-sub">${b.subtitle}</div>` : ''}
      <div class="tp-vol">${vol ? `제 ${vol} 권` : categoryOf(b)}</div>
    </div>`;
  }

  private endHTML() {
    const nb = this.nextBook;
    const next = nb
      ? `<div class="next-vol" data-next="${nb.id}"><small>다음 권 · 제 ${volOf(nb)} 권</small><b>『${nb.title}』</b><span>이어 읽기 →</span></div>`
      : '<small>책장으로 돌아가려면 다음 쪽으로</small>';
    return `<div class="end-page"><div class="tp-orn">❦</div><div>— 끝 —</div>${next}</div>`;
  }

  // ───────── 열기 / 닫기 ─────────

  /**
   * 쪽 구성
   *  두 쪽 모드: [표지][면지][속표지][본문...][끝][(빈 쪽)][뒤표지]
   *  한 쪽 모드: [표지][속표지][본문...][끝]
   */
  private build(b: BookDef) {
    const body = this.paginate(b);
    if (this.mode === 'single') {
      this.pages = [this.coverHTML(b), this.titlePageHTML(b), ...body, this.endHTML()];
      this.bodyStart = 2;
    } else {
      this.pages = [this.coverHTML(b), '<div class="endpaper"></div>', this.titlePageHTML(b), ...body, this.endHTML()];
      this.bodyStart = 3;
    }
    this.bodyEnd = this.bodyStart + body.length;
    this.endIndex = this.bodyEnd;
    if (this.mode === 'spread') {
      if (this.pages.length % 2 === 1) this.pages.push('<div class="blank"></div>');
      this.pages.push(`<div class="back-cover" style="background:${b.color}"></div>`);
    }
  }

  open(b: BookDef) {
    this.book = b;
    this.nextBook = nextVolume(b);
    this.mode = pickMode();
    this.applyMode();
    this.build(b);
    this.spread = 0;
    this.idx = 0;
    this.root.classList.remove('hidden', 'closing');
    this.root.style.setProperty('--book-color', b.color);
    this.render();
    this.fit();
    requestAnimationFrame(() => this.root.classList.add('shown'));
  }

  async close() {
    if (this.root.classList.contains('hidden')) return;
    this.root.classList.remove('shown');
    this.root.classList.add('closing');
    await new Promise((r) => setTimeout(r, 380));
    this.root.classList.add('hidden');
    this.onClose?.();
  }

  // ───────── 표시 ─────────

  /** spread s: 왼쪽 = pages[2s-1], 오른쪽 = pages[2s] */
  private render() {
    if (this.mode === 'single') return this.renderSingle();
    const L = this.pages[this.spread * 2 - 1];
    const R = this.pages[this.spread * 2];
    this.bookEl.innerHTML = '';
    this.bookEl.classList.toggle('closed-front', this.spread === 0);
    this.bookEl.classList.toggle('closed-back', !R);
    if (L !== undefined) this.bookEl.appendChild(this.pageEl(L, 'left', this.spread * 2 - 1));
    if (R !== undefined) this.bookEl.appendChild(this.pageEl(R, 'right', this.spread * 2));
    const total = Math.floor(this.pages.length / 2) + 1;
    (this.root.querySelector('.progress') as HTMLElement).textContent = `${this.spread + 1} / ${total}`;
  }

  private renderSingle() {
    this.bookEl.innerHTML = '';
    this.bookEl.classList.remove('closed-front', 'closed-back');
    this.bookEl.appendChild(this.pageEl(this.pages[this.idx], 'right', this.idx));
    (this.root.querySelector('.progress') as HTMLElement).textContent = `${this.idx + 1} / ${this.pages.length}`;
  }

  private isHard(index: number) {
    return index === 0 || (this.mode === 'spread' && index === this.pages.length - 1);
  }

  private pageEl(html: string, side: 'left' | 'right', index: number) {
    const el = document.createElement('div');
    el.className = `page ${side}${this.isHard(index) ? ' hard' : ''}`;
    let extra = 0;
    if (html.startsWith(FULL)) {
      const bar = html.indexOf('|');
      extra = parseFloat(html.slice(FULL.length, bar));
      html = html.slice(bar + 1);
    }
    el.innerHTML = `<div class="page-inner${extra ? ' full' : ''}" style="--extra:${extra}px">${html}</div>${index >= this.bodyStart && index < this.bodyEnd ? `<div class="folio">${index - this.bodyStart + 1}</div>` : ''}`;
    return el;
  }

  next() {
    if (this.flipping) return;
    if (this.mode === 'single') {
      if (this.nextBook && this.idx === this.endIndex) return this.onNext?.(this.nextBook.id);
      if (this.idx >= this.pages.length - 1) return this.close();
      return this.flipSingle(1);
    }
    // '끝' 쪽이 보이는 상태에서 다음 권이 있으면 → 이어서 다음 권 꺼내기
    const showing = [this.spread * 2 - 1, this.spread * 2];
    if (this.nextBook && showing.includes(this.endIndex)) return this.onNext?.(this.nextBook.id);
    if (this.spread * 2 >= this.pages.length - 1) return this.close(); // 뒤표지까지 봤으면 덮기
    this.flip(1);
  }

  prev() {
    if (this.flipping) return;
    if (this.mode === 'single') {
      if (this.idx > 0) this.flipSingle(-1);
      return;
    }
    if (this.spread === 0) return;
    this.flip(-1);
  }

  /** 한 쪽 모드: 종이 한 장이 왼쪽 가장자리를 축으로 넘어감 */
  private flipSingle(dir: 1 | -1) {
    this.flipping = true;
    playFlip();
    const i = this.idx;
    const paper = () => {
      const p = document.createElement('div');
      p.className = 'page right face back';
      return p;
    };
    this.bookEl.innerHTML = '';
    this.bookEl.classList.add('flipping');
    this.bookEl.classList.toggle('back', dir === -1);
    const leaf = document.createElement('div');
    if (dir === 1) {
      // 다음 쪽을 밑에 깔고, 지금 쪽이 넘어감
      this.bookEl.appendChild(this.pageEl(this.pages[i + 1], 'right', i + 1));
      const f = this.pageEl(this.pages[i], 'right', i);
      f.classList.add('face', 'front');
      leaf.className = 'leaf right';
      leaf.append(f, paper());
      this.bookEl.appendChild(leaf);
      void leaf.offsetWidth;
      leaf.classList.add('turn');
    } else {
      // 지금 쪽 위로, 앞 쪽이 되넘어옴
      this.bookEl.appendChild(this.pageEl(this.pages[i], 'right', i));
      const f = this.pageEl(this.pages[i - 1], 'right', i - 1);
      f.classList.add('face', 'front');
      leaf.className = 'leaf right turn no-anim';
      leaf.append(f, paper());
      this.bookEl.appendChild(leaf);
      void leaf.offsetWidth;
      leaf.classList.remove('no-anim');
      void leaf.offsetWidth;
      leaf.classList.remove('turn');
    }
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.idx += dir;
      this.bookEl.classList.remove('flipping', 'back');
      this.render();
      this.flipping = false;
    };
    leaf.addEventListener('transitionend', (e) => {
      if (e.target === leaf && e.propertyName === 'transform') finish();
    });
    window.setTimeout(finish, 900);
  }

  /** 종이 한 장이 책등을 축으로 넘어감 */
  private flip(dir: 1 | -1) {
    this.flipping = true;
    playFlip();
    const s = this.spread;
    const front = dir === 1 ? this.pages[s * 2] : this.pages[s * 2 - 1];
    const back = dir === 1 ? this.pages[s * 2 + 1] : this.pages[s * 2 - 2];
    // 밑에 깔릴 쪽을 미리 바꿈
    const under = dir === 1 ? this.pages[s * 2 + 2] : this.pages[s * 2 - 3];
    const side = dir === 1 ? 'right' : 'left';
    const old = this.bookEl.querySelector(`.page.${side}`);
    if (old) old.remove();
    if (under !== undefined) this.bookEl.appendChild(this.pageEl(under, side, dir === 1 ? s * 2 + 2 : s * 2 - 3));

    const leaf = document.createElement('div');
    leaf.className = `leaf ${side}`;
    const f = this.pageEl(front ?? '', side, dir === 1 ? s * 2 : s * 2 - 1);
    f.classList.add('face', 'front');
    const b = this.pageEl(back ?? '', side === 'right' ? 'left' : 'right', dir === 1 ? s * 2 + 1 : s * 2 - 2);
    b.classList.add('face', 'back');
    leaf.append(f, b);
    this.bookEl.appendChild(leaf);
    // 표지가 열리거나 닫힐 때 책 위치가 가운데로 움직임
    this.bookEl.classList.toggle('closed-front', dir === -1 && s - 1 === 0);
    this.bookEl.classList.remove('closed-back');
    // 스타일이 한 번 계산된 뒤에 넘김을 시작해야 전환 애니메이션이 실행됨
    void leaf.offsetWidth;
    leaf.classList.add('turn');
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.spread += dir;
      this.render();
      this.flipping = false;
    };
    leaf.addEventListener('transitionend', (e) => {
      if (e.target === leaf && e.propertyName === 'transform') finish();
    });
    window.setTimeout(finish, 900); // 전환 이벤트가 오지 않아도 멈추지 않게
  }

  /** 화면 크기에 맞춰 책 크기 조절 */
  private fit() {
    const { w, h } = this.dims;
    const scale =
      this.mode === 'single'
        ? Math.min((window.innerWidth - 20) / w, (window.innerHeight - 96) / h, 1.25)
        : Math.min((window.innerWidth - 40) / (w * 2), (window.innerHeight - 110) / h, 1.25);
    this.stage.style.setProperty('--scale', String(scale));
  }
}
