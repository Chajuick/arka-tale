// 텍스트 서재 — 책장 화면은 자바스크립트로 그려서 AI(ChatGPT 등)나 검색엔진이 주소를 열어도 본문을 못 읽음.
// 그래서 빌드할 때 공개된 책의 본문을 "그냥 글자로 된" 페이지로도 같이 만들어 둠.
//
//   /llms.txt            AI용 안내 + 책 목록 (각 책 주소)
//   /llms-full.txt       공개된 모든 책의 전문을 한 파일로
//   /library/            사람·AI 모두 읽을 수 있는 목차 페이지
//   /library/<책id>/     책 한 권의 전문
//
// 공개 범위는 책장과 같음: saga.md + content/lore/*.md 만 읽고 content/draft 는 절대 읽지 않음.
// 개발 서버(npm run dev)에서도 같은 주소로 미리 볼 수 있음.
import fs from 'node:fs';
import path from 'node:path';
import { createServer, type Plugin, type ViteDevServer } from 'vite';
import type { BookDef, BookCase, ChapterRef } from '../src/books';
import type { Chapter } from '../src/manuscript';

type BooksModule = typeof import('../src/books');
type ManuscriptModule = typeof import('../src/manuscript');

const escHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
/** 문단 HTML(<strong>/<em>) → 마크다운 글자 */
const toText = (html: string) =>
  html
    .replace(/<strong>(.*?)<\/strong>/g, '**$1**')
    .replace(/<em>(.*?)<\/em>/g, '*$1*')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

interface Shelf {
  case: BookCase;
  books: { def: BookDef; vol: number; chapters: Chapter[] | null }[];
}

async function collect(root: string, load: (id: string) => Promise<Record<string, unknown>>) {
  const books = (await load('/src/books.ts')) as unknown as BooksModule;
  const { parseManuscript, SCENE_BREAK } = (await load('/src/manuscript.ts')) as unknown as ManuscriptModule;

  // 공개 원고만 직접 읽음 (draft 폴더는 보지 않음)
  const all = new Map<ChapterRef, Chapter>();
  const add = (list: Chapter[]) => list.forEach((c) => all.set(c.ref, c));
  add(parseManuscript(fs.readFileSync(path.join(root, 'src/content/saga.md'), 'utf8')));
  const loreDir = path.join(root, 'src/content/lore');
  for (const f of fs.readdirSync(loreDir).filter((f) => f.endsWith('.md')))
    add(parseManuscript(fs.readFileSync(path.join(loreDir, f), 'utf8'), f.replace(/\.md$/, '')));

  const shelves: Shelf[] = books.CASES.map((c) => ({
    case: c,
    books: books.BOOKS.filter((b) => books.caseOf(b) === c.id).map((def) => {
      const chs = def.chapters?.map((r) => all.get(r));
      const open = !!chs?.length && chs.every(Boolean);
      return { def, vol: books.volOf(def), chapters: open ? (chs as Chapter[]) : null };
    }),
  }));
  return { shelves, series: books.SERIES, bookById: books.bookById, SCENE_BREAK };
}

type Data = Awaited<ReturnType<typeof collect>>;

const INTRO = '가장 아름다운 별을 사랑한 코브와, 그 별에서 스스로 미래를 만들어 간 이들의 이야기.';

const bookLabel = (b: { def: BookDef; vol: number }) => `${b.vol ? `제${b.vol}권 ` : ''}『${b.def.title}』`;

function render(d: Data, site: string): Map<string, string> {
  const out = new Map<string, string>();
  const url = (p: string) => `${site}${p}`;
  const bookPath = (id: string) => `/library/${id}/`;
  const open = d.shelves.flatMap((s) => s.books.filter((b) => b.chapters));

  // ── 본문 (마크다운) ──
  const bookText = (b: Shelf['books'][number], heading: string) => {
    const lines = [`${heading} ${bookLabel(b)}${b.def.subtitle ? ` — ${b.def.subtitle}` : ''}`, ''];
    for (const ch of b.chapters!) {
      lines.push(`${heading}# ${ch.title}`, '');
      for (const p of ch.paragraphs) lines.push(p === d.SCENE_BREAK ? '* * *' : toText(p), '');
    }
    for (const l of b.def.links ?? []) {
      const to = d.bookById(l.to);
      lines.push(`> 이어지는 이야기: ${l.text}${to ? ` (『${to.title}』)` : ''}`, '');
    }
    return lines.join('\n');
  };

  // ── llms.txt ──
  const idx: string[] = [
    `# ${d.series} (Arka Tale) — 이야기 서재`,
    '',
    `> ${INTRO} 창작 판타지 동화 세계관입니다. 첫 화면(책장)은 자바스크립트로 그려지므로, 본문은 아래 주소들에서 글로 읽을 수 있습니다.`,
    '',
    `- 전체 공개 원고 한 번에 읽기: ${url('/llms-full.txt')}`,
    `- 목차 페이지: ${url('/library/')}`,
    '',
  ];
  for (const s of d.shelves) {
    idx.push(`## ${s.case.title}`, '');
    for (const b of s.books) {
      const sub = b.def.subtitle ? `: ${b.def.subtitle}` : '';
      idx.push(
        b.chapters
          ? `- [${bookLabel(b)}](${url(bookPath(b.def.id))})${sub} — ${b.chapters.map((c) => c.title).join(' / ')}`
          : `- ${bookLabel(b)}${sub} — (준비 중, 아직 공개되지 않음)`,
      );
    }
    idx.push('');
  }
  out.set('/llms.txt', idx.join('\n'));

  // ── llms-full.txt ──
  out.set(
    '/llms-full.txt',
    [`# ${d.series} — 공개된 모든 원고`, '', `> ${INTRO}`, '', ...open.map((b) => bookText(b, '##'))].join('\n'),
  );

  // ── HTML ──
  const page = (title: string, body: string) => `<!doctype html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escHtml(title)}</title>
<meta name="robots" content="index, follow" />
<link rel="alternate" type="text/plain" href="/llms.txt" />
<style>
  :root { color-scheme: light dark; --bg:#f7f1e3; --fg:#2b2118; --muted:#7a6a58; --line:#d9cbb0; --link:#7a3b12; }
  @media (prefers-color-scheme: dark) { :root { --bg:#1a1210; --fg:#f0e4cc; --muted:#a8977e; --line:#3d3027; --link:#f0b878; } }
  body { margin:0; background:var(--bg); color:var(--fg); font:17px/1.9 "Gowun Batang", serif; }
  main { max-width:40rem; margin:0 auto; padding:2.5rem 16px 5rem; }
  a { color:var(--link); }
  h1 { font-size:1.6rem; line-height:1.4; margin:0 0 .25rem; }
  h2 { font-size:1.25rem; margin:3rem 0 1rem; padding-top:1.5rem; border-top:1px solid var(--line); }
  .sub, .meta, nav { color:var(--muted); font-size:.92rem; }
  hr { border:0; text-align:center; margin:2rem 0; } hr::after { content:"◆"; color:var(--muted); }
  ul { padding-left:1.2rem; } li { margin:.35rem 0; }
  blockquote { margin:2rem 0; padding:.5rem 1rem; border-left:3px solid var(--line); color:var(--muted); }
</style>
</head>
<body><main>
${body}
</main></body>
</html>
`;

  const list = d.shelves
    .map(
      (s) => `<h2>${escHtml(s.case.title)}</h2>\n<ul>\n${s.books
        .map((b) => {
          const name = escHtml(bookLabel(b)) + (b.def.subtitle ? ` <span class="sub">— ${escHtml(b.def.subtitle)}</span>` : '');
          return b.chapters
            ? `<li><a href="${bookPath(b.def.id)}">${name}</a> <span class="meta">(${b.chapters.length}장)</span></li>`
            : `<li>${name} <span class="meta">(준비 중)</span></li>`;
        })
        .join('\n')}\n</ul>`,
    )
    .join('\n');
  out.set(
    '/library/index.html',
    page(
      `${d.series} — 글로 읽는 서재`,
      `<nav><a href="/">← 책장으로</a> · <a href="/llms-full.txt">전체 원고 한 파일로</a></nav>
<h1>${escHtml(d.series)} — 글로 읽는 서재</h1>
<p class="sub">${escHtml(INTRO)}</p>
${list}`,
    ),
  );

  for (const b of open) {
    const chs = b.chapters!
      .map(
        (ch) =>
          `<h2>${escHtml(ch.title)}</h2>\n${ch.paragraphs.map((p) => (p === d.SCENE_BREAK ? '<hr />' : `<p>${p}</p>`)).join('\n')}`,
      )
      .join('\n');
    const links = (b.def.links ?? [])
      .map((l) => {
        const to = open.find((x) => x.def.id === l.to);
        return `<blockquote>${escHtml(l.text)}${to ? ` → <a href="${bookPath(to.def.id)}">${escHtml(bookLabel(to))}</a>` : ' (준비 중)'}</blockquote>`;
      })
      .join('\n');
    const shelf = d.shelves.find((s) => s.books.includes(b))!;
    out.set(
      `${bookPath(b.def.id)}index.html`,
      page(
        `${bookLabel(b)} — ${d.series}`,
        `<nav><a href="/library/">← 목차</a> · ${escHtml(shelf.case.title)}</nav>
<h1>${escHtml(bookLabel(b))}</h1>
${b.def.subtitle ? `<p class="sub">${escHtml(b.def.subtitle)}</p>` : ''}
${chs}
${links}`,
      ),
    );
  }
  return out;
}

const typeOf = (p: string) =>
  p.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/plain; charset=utf-8';

export function textLibrary(site: string): Plugin {
  let root = process.cwd();
  return {
    name: 'text-library',
    configResolved(c) {
      root = c.root;
    },
    // 개발 서버: 같은 주소로 바로 미리보기 (요청마다 새로 만듦)
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const p = (req.url ?? '').split('?')[0];
        if (!(p.startsWith('/llms') || p.startsWith('/library'))) return next();
        try {
          const files = render(await collect(root, (id) => server.ssrLoadModule(id)), '');
          const key = p.endsWith('/') ? `${p}index.html` : files.has(p) ? p : `${p}/index.html`;
          const body = files.get(key);
          if (body === undefined) return next();
          if (!p.endsWith('/') && key.endsWith('/index.html')) {
            res.writeHead(301, { Location: `${p}/` });
            return res.end();
          }
          res.setHeader('Content-Type', typeOf(key));
          res.end(body);
        } catch (e) {
          next(e);
        }
      });
    },
    // 빌드: 원고를 읽어 dist 에 파일로 내보냄
    async generateBundle() {
      const tmp = await createServer({
        root,
        configFile: false,
        logLevel: 'silent',
        appType: 'custom',
        server: { middlewareMode: true, hmr: false, ws: false },
        optimizeDeps: { noDiscovery: true, include: [] },
      });
      try {
        const files = render(await collect(root, (id) => tmp.ssrLoadModule(id)), site);
        for (const [p, source] of files) this.emitFile({ type: 'asset', fileName: p.slice(1), source });
      } finally {
        await tmp.close();
      }
    },
  };
}
