// 2D 읽기 화면: 자동 쪽 나누기 + 3D 페이지 넘김
import { SERIES, bookById, isLocked, nextVolume, volOf, type BookDef } from './books';
import { chapterArt, emblemDataURL } from './art';
import { getChapter } from './content';
import { coverCanvas } from './shelf';
import { playFlip } from './sound';

const PAGE_W = 460;
const PAGE_H = 640;

type Block = { html: string; cls?: string };

/** 장 첫 문단의 첫 글자를 살짝 크게 (앞에 태그가 있으면 건너뜀, 따옴표로 시작하면 그대로) */
function initial(html: string) {
  return html.replace(/^((?:<[^>]+>)*)([^<\s"'“‘])/, '$1<span class="initial">$2</span>');
}

export class Reader {
  private root = document.getElementById('reader')!;
  private bookEl = this.root.querySelector('.book') as HTMLElement;
  private stage = this.root.querySelector('.stage') as HTMLElement;
  private pages: string[] = []; // 각 쪽의 HTML
  private spread = 0; // 0 = 표지(오른쪽만)
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
    window.addEventListener('resize', () => this.fit());
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
      ch.paragraphs.forEach((p, i) => bl.push({ html: i === 0 ? initial(p) : p, cls: i === 0 ? 'p first' : 'p' }));
      for (const l of b.links ?? []) {
        if (l.after !== ref) continue;
        const to = bookById(l.to);
        const locked = !to || isLocked(to);
        bl.push({
          html: `<span class="bm-icon"></span><span>${l.text}</span><b>${locked ? '아직 쓰이지 않은 이야기' : '이어 읽기 →'}</b>`,
          cls: `bookmark${locked ? ' locked' : ''}" data-link="${l.to}`,
        });
      }
      out.push(bl);
    }
    return out;
  }

  /** 측정용 쪽에 블록을 채워 넣으며 넘치면 다음 쪽으로 */
  private paginate(b: BookDef): string[] {
    const meas = document.getElementById('measure')!;
    meas.innerHTML = '';
    const page = document.createElement('div');
    page.className = 'page-inner';
    meas.appendChild(page);
    const pages: string[] = [];
    // 아래 여백(쪽 번호 자리) 안으로 글이 들어가면 넘친 것으로 봄
    const overflows = () => {
      const last = page.lastElementChild as HTMLElement | null;
      if (!last) return false;
      const pad = parseFloat(getComputedStyle(page).paddingBottom);
      const limit = page.getBoundingClientRect().bottom - pad;
      return last.getBoundingClientRect().bottom > limit + 1;
    };
    const flush = () => {
      if (page.innerHTML.trim()) pages.push(page.innerHTML);
      page.innerHTML = '';
    };
    for (const chapter of this.blocks(b)) {
      // 장은 항상 오른쪽 쪽(홀수 인덱스 맞춤)에서 시작하면 그림책 느낌 → 새 쪽에서 시작
      flush();
      for (const bl of chapter) {
        const el = document.createElement('div');
        el.className = bl.cls ?? '';
        el.innerHTML = bl.html;
        // bookmark는 cls 안에 data-link 속성을 같이 넣었으므로 outerHTML로 재구성
        const html = bl.cls?.startsWith('bookmark') ? `<div class="${bl.cls}">${bl.html}</div>` : el.outerHTML;
        page.insertAdjacentHTML('beforeend', html);
        if (overflows()) {
          page.lastElementChild?.remove();
          flush();
          page.insertAdjacentHTML('beforeend', html);
        }
      }
    }
    flush();
    meas.innerHTML = '';
    return pages;
  }

  private coverHTML(b: BookDef) {
    const url = coverCanvas(b, PAGE_W, PAGE_H).toDataURL();
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
      <div class="tp-vol">${vol ? `제 ${vol} 권` : '세계의 조각'}</div>
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

  open(b: BookDef) {
    this.nextBook = nextVolume(b);
    // 쪽 구성: [표지][면지(빈)][속표지][본문...][끝][뒤표지]
    const body = this.paginate(b);
    this.pages = [this.coverHTML(b), '<div class="endpaper"></div>', this.titlePageHTML(b), ...body, this.endHTML()];
    this.endIndex = this.pages.length - 1;
    if (this.pages.length % 2 === 1) this.pages.push('<div class="blank"></div>');
    this.pages.push(`<div class="back-cover" style="background:${b.color}"></div>`);
    this.spread = 0;
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

  private pageEl(html: string, side: 'left' | 'right', index: number) {
    const el = document.createElement('div');
    el.className = `page ${side}${index === 0 || index === this.pages.length - 1 ? ' hard' : ''}`;
    el.innerHTML = `<div class="page-inner">${html}</div>${index > 2 && index < this.pages.length - 2 ? `<div class="folio">${index - 2}</div>` : ''}`;
    return el;
  }

  next() {
    if (this.flipping) return;
    // '끝' 쪽이 보이는 상태에서 다음 권이 있으면 → 이어서 다음 권 꺼내기
    const showing = [this.spread * 2 - 1, this.spread * 2];
    if (this.nextBook && showing.includes(this.endIndex)) return this.onNext?.(this.nextBook.id);
    if (this.spread * 2 >= this.pages.length - 1) return this.close(); // 뒤표지까지 봤으면 덮기
    this.flip(1);
  }

  prev() {
    if (this.flipping || this.spread === 0) return;
    this.flip(-1);
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

  /** 화면 크기에 맞춰 책 크기 조절 (두 쪽 펼침 기준) */
  private fit() {
    const scale = Math.min((window.innerWidth - 40) / (PAGE_W * 2), (window.innerHeight - 110) / PAGE_H, 1.25);
    this.stage.style.setProperty('--scale', String(scale));
  }
}
