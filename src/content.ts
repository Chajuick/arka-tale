// 원고 → 장(chapter) 단위로 나누기
//   큰 서사: content/saga.md         → 장 번호 (1, 2, …, 'last')
//   세계의 조각들·빛나던 이들: content/lore/<책id>.md → '<책id>:<장 번호>' (예: 'dob-bob:1')
import saga from './content/saga.md?raw';
import type { ChapterRef } from './books';

export interface Chapter {
  ref: ChapterRef;
  title: string; // "제1장. 가장 아름다운 별"
  paragraphs: string[]; // 인라인 마크다운 → HTML 변환된 문단
}

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]!);

/** **굵게**, *기울임* 정도만 지원 */
export function inline(md: string) {
  return esc(md)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>');
}

/** 원고에서 '* * *' 한 줄 = 장면 전환 표시 */
export const SCENE_BREAK = '\u0000scene';

const chapters = new Map<ChapterRef, Chapter>();

// 세계의 조각들·빛나던 이들 원고는 아직 비공개 → 배포 빌드에는 넣지 않고 개발 서버에서만 불러옴
const lore: Record<string, string> = import.meta.env.DEV
  ? (import.meta.glob('./content/lore/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  : {};

function parse(md: string, book?: string) {
  for (const block of md.split(/^## /m).slice(1)) {
    const [head, ...rest] = block.split('\n');
    const title = head.trim();
    const m = title.match(/^제(\d+)장/);
    const ref: ChapterRef = book ? `${book}:${m ? m[1] : 'last'}` : m ? Number(m[1]) : 'last';
    const paragraphs = rest
      .join('\n')
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p && p !== '---')
      .map((p) => (p === '* * *' || p === '***' ? SCENE_BREAK : inline(p)));
    chapters.set(ref, { ref, title, paragraphs });
  }
}

parse(saga);
for (const [path, md] of Object.entries(lore)) parse(md, path.split('/').pop()!.replace(/\.md$/, ''));

export const getChapter = (ref: ChapterRef) => chapters.get(ref);
