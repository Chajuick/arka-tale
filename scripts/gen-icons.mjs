// 아이콘 생성 (도트 책 SVG → PNG)
//   실행: npm run icons   → public/ 에 저장 (결과물은 저장소에 커밋)
//   OG 이미지(public/og-image.png)는 실제 화면을 찍어서 만듦: 개발 서버에서 /?og 를 1200×630으로 캡처
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const OUT = resolve('public');
mkdirSync(OUT, { recursive: true });

const C = {
  bg: '#1a1210',
  ink: '#0c0806',
  cover: '#1e2a52',
  coverHi: '#2a3a6e',
  spine: '#141c3a',
  page: '#efe4c8',
  pageLine: '#cbbd98',
  gold: '#e8c060',
  goldHi: '#fff1b0',
  ribbon: '#b8402a',
};

/** 32×32 도트 그림: 별 문양이 있는 남색 책 + 책갈피 끈. pad: 마스커블용 여백(도트) */
export function iconArt(pad = 0) {
  const r = [];
  const k = (32 - pad * 2) / 32; // 여백만큼 축소
  const px = (x, y, w, h, c) => r.push(`<rect x="${pad + x * k}" y="${pad + y * k}" width="${w * k}" height="${h * k}" fill="${c}"/>`);
  // 책장(종이) 뭉치 — 표지 뒤로 살짝 보임
  px(9, 5, 18, 23, C.ink);
  px(10, 6, 16, 21, C.page);
  for (let y = 8; y < 26; y += 2) px(24, y, 2, 1, C.pageLine);
  // 표지
  px(5, 3, 19, 25, C.ink);
  px(6, 4, 17, 23, C.cover);
  px(6, 4, 3, 23, C.spine); // 책등 쪽
  px(9, 4, 1, 23, C.coverHi);
  // 금박 테두리
  px(11, 6, 11, 1, C.gold);
  px(11, 24, 11, 1, C.gold);
  px(11, 6, 1, 19, C.gold);
  px(21, 6, 1, 19, C.gold);
  // 별 (7도트)
  const star = ['...#...', '..###..', '#######', '.#####.', '..###..', '.##.##.', '.#...#.'];
  star.forEach((row, y) => [...row].forEach((c, x) => c === '#' && px(13 + x, 9 + y, 1, 1, y < 2 ? C.goldHi : C.gold)));
  // 제목 줄
  px(14, 19, 5, 1, C.gold);
  px(15, 21, 3, 1, C.gold);
  // 책갈피 끈
  px(17, 27, 3, 3, C.ink);
  px(18, 27, 1, 2, C.ribbon);
  // 반짝임
  px(26, 2, 1, 3, C.goldHi);
  px(25, 3, 3, 1, C.goldHi);
  return r.join('');
}

function iconSvg(size, { pad = 0, round = true } = {}) {
  const bg = round ? `<rect width="32" height="32" rx="6" fill="${C.bg}"/>` : `<rect width="32" height="32" fill="${C.bg}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32" shape-rendering="crispEdges">${bg}${iconArt(pad)}</svg>`;
}

function png(svg, width, file) {
  const out = new Resvg(svg, { fitTo: { mode: 'width', value: width }, shapeRendering: 0 }).render();
  writeFileSync(resolve(OUT, file), out.asPng());
  console.log('wrote', file, `${out.width}x${out.height}`);
}

writeFileSync(resolve(OUT, 'favicon.svg'), iconSvg(32));
// 인트로 화면용 (배경 없는 큰 그림)
writeFileSync(
  resolve(OUT, 'emblem.svg'),
  `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 32 32" shape-rendering="crispEdges">${iconArt(0)}</svg>`,
);
png(iconSvg(32), 32, 'favicon-32.png');
png(iconSvg(180, { round: false }), 180, 'apple-touch-icon.png');
png(iconSvg(192), 192, 'icon-192.png');
png(iconSvg(512), 512, 'icon-512.png');
png(iconSvg(512, { pad: 4, round: false }), 512, 'icon-maskable-512.png');
