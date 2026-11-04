// 책장 사이트 진입점
import './fonts.css';
import '@fontsource/gowun-batang/400.css';
import '@fontsource/gowun-batang/700.css';
import './style.css';
import { CASES, bookById, isLocked, type BookDef } from './books';
import { Reader } from './reader';
import { Shelf } from './shelf';
import { playChime, playSlide, playThud } from './sound';

const $ = (id: string) => document.getElementById(id)!;

const OG_MODE = new URLSearchParams(location.search).has('og');

/** 인트로 제목: 한 글자씩 떠오르게 */
function setupIntro() {
  const title = document.querySelector('.intro-title') as HTMLElement;
  title.innerHTML = [...'아르카 테일']
    .map((ch, i) => `<span style="animation-delay:${0.5 + i * 0.12}s">${ch === ' ' ? '&nbsp;' : ch}</span>`)
    .join('');
  const motes = document.querySelector('.intro-motes') as HTMLElement;
  for (let i = 0; i < 40; i++) {
    const m = document.createElement('i');
    m.style.left = `${Math.random() * 100}%`;
    m.style.animationDelay = `${-Math.random() * 12}s`;
    m.style.animationDuration = `${8 + Math.random() * 8}s`;
    m.style.setProperty('--drift', `${(Math.random() - 0.5) * 80}px`);
    motes.appendChild(m);
  }
}

async function start() {
  if (!OG_MODE) setupIntro();
  // 책등·표지 글자를 캔버스에 그리기 전에 폰트 준비
  await Promise.all([
    document.fonts.load('24px Galmuri11'),
    document.fonts.load('80px "NeoDunggeunmo Pro"'),
    document.fonts.load('bold 30px "Gowun Batang"'),
    document.fonts.load('16px "Gowun Batang"'),
  ]).catch(() => undefined);

  const shelf = new Shelf($('shelf') as HTMLCanvasElement);

  // 공유 미리보기 촬영용 구도: 인트로·안내 없이, 책장을 오른쪽에 두고 왼쪽에 제목 카드
  if (OG_MODE) {
    document.body.classList.remove('in-intro');
    document.body.classList.add('og');
    $('intro').remove();
    $('og-card').classList.remove('hidden');
    shelf.skipIntro();
    shelf.viewShiftX = -3.1;
    return;
  }

  // 인트로: 준비되면 "들어가기" → 종소리 + 책장 앞으로 다가가며 화면이 열림
  const intro = $('intro');
  const enterBtn = intro.querySelector('.intro-enter') as HTMLButtonElement;
  enterBtn.disabled = false;
  enterBtn.textContent = '서재에 들어가기';
  let entered = false;
  const enter = () => {
    if (entered) return;
    entered = true;
    playChime();
    intro.classList.add('leaving');
    void shelf.enter();
    window.setTimeout(() => {
      intro.remove();
      document.body.classList.remove('in-intro');
    }, 1500);
    window.removeEventListener('keydown', onKey);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') enter();
  };
  intro.addEventListener('click', enter);
  window.addEventListener('keydown', onKey);
  const reader = new Reader();

  // 책장 목록: 책장이 둘 이상일 때만 표시
  const nav = $('cases');
  if (CASES.length > 1) {
    nav.classList.remove('hidden');
    nav.innerHTML = shelf.cases.map((c) => `<button data-case="${c.id}"><span>${c.title}</span></button>`).join('');
    nav.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('button');
      if (btn) shelf.scrollToCase(btn.dataset.case!);
    });
  }
  const markCase = (id: string) => nav.querySelectorAll('button').forEach((b) => b.classList.toggle('on', b.dataset.case === id));
  shelf.onCaseChange = markCase;

  // 가장자리 화살표: 0.3초 올려두면 천천히 스크롤, 누르면 다음 책장
  const edges: [HTMLElement, -1 | 1][] = [[$('edge-up'), -1], [$('edge-down'), 1]];
  for (const [el, dir] of edges) {
    let timer = 0;
    el.addEventListener('pointerenter', (e) => {
      if (e.pointerType === 'touch') return;
      timer = window.setTimeout(() => (shelf.edge = dir), 300);
    });
    el.addEventListener('pointerleave', () => {
      window.clearTimeout(timer);
      shelf.edge = 0;
    });
    el.addEventListener('click', () => {
      window.clearTimeout(timer);
      shelf.edge = 0;
      shelf.stepCase(dir);
    });
  }
  shelf.onScrollState = (up, down) => {
    // 끝에 닿아 화살표가 사라지면 그 방향 스크롤도 멈춤 (숨겨지면 pointerleave가 안 옴)
    if ((!up && shelf.edge === -1) || (!down && shelf.edge === 1)) shelf.edge = 0;
    if (up) $('hint').classList.add('hidden'); // 스크롤을 시작하면 안내는 숨김
    $('edge-up').classList.toggle('hidden', !up);
    $('edge-down').classList.toggle('hidden', !down);
  };
  markCase(shelf.cases[0].id);
  let current: BookDef | null = null;

  // 호버 설명
  const tip = $('tip');
  shelf.onHover = (b, x, y) => {
    if (!b) return tip.classList.add('hidden');
    tip.innerHTML = `<b>${b.title}</b>${b.subtitle ? `<span>${b.subtitle}</span>` : ''}${isLocked(b) ? '<em>아직 쓰이지 않은 이야기</em>' : ''}`;
    tip.classList.remove('hidden');
    tip.style.left = `${Math.min(window.innerWidth - tip.offsetWidth - 12, x + 16)}px`;
    tip.style.top = `${y + 18}px`;
  };

  const openBook = async (b: BookDef) => {
    current = b;
    playSlide();
    $('hint').classList.add('hidden');
    await shelf.pullOut(b.id);
    shelf.setDim(true);
    reader.open(b);
  };

  shelf.onPick = (b) => void openBook(b);

  let linking = false; // 책갈피로 다른 책을 여는 중이면 '다시 꽂기' 연출 생략
  reader.onClose = async () => {
    shelf.setDim(false);
    if (current && !linking) {
      playSlide();
      await shelf.putBack(current.id);
      playThud();
      current = null;
    }
  };

  // 책갈피: 다른 책으로 이어 읽기
  reader.onLink = async (id) => {
    const to = bookById(id);
    if (!to || isLocked(to)) return toast('아직 쓰이지 않은 이야기예요');
    linking = true;
    await reader.close();
    if (current) shelf.snapBack(current.id);
    linking = false;
    await openBook(to);
  };

  // 다음 권: 지금 책을 덮어 제자리에 꽂고 → 다음 권을 꺼내 펼침
  reader.onNext = async (id) => {
    const to = bookById(id);
    if (!to || isLocked(to)) return;
    linking = true;
    await reader.close();
    linking = false;
    if (current) {
      playSlide();
      await shelf.putBack(current.id);
      playThud();
    }
    await openBook(to);
  };

  shelf.renderer.domElement.addEventListener('click', () => $('hint').classList.add('hidden'), { once: true });
}

let toastTimer = 0;
function toast(msg: string) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => t.classList.remove('show'), 1600);
}

void start();
