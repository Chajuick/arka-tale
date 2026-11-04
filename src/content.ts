// saga.md → 장(chapter) 단위로 나누기
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

const chapters = new Map<ChapterRef, Chapter>();

for (const block of saga.split(/^## /m).slice(1)) {
  const [head, ...rest] = block.split('\n');
  const title = head.trim();
  const m = title.match(/^제(\d+)장/);
  const ref: ChapterRef = m ? Number(m[1]) : 'last';
  const paragraphs = rest
    .join('\n')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && p !== '---')
    .map(inline);
  chapters.set(ref, { ref, title, paragraphs });
}

export const getChapter = (ref: ChapterRef) => chapters.get(ref);
