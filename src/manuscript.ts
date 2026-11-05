// 원고(마크다운) → 장(chapter) 나누기 — import.meta 없이 순수 함수로 둬서
// 브라우저(content.ts)와 빌드 시 텍스트 서재 생성(scripts/text-library.ts)이 함께 씀
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

/** 원고 하나를 장 단위로 나눔. book이 있으면 장 이름은 '<book>:<번호>' */
export function parseManuscript(md: string, book?: string): Chapter[] {
  const out: Chapter[] = [];
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
    out.push({ ref, title, paragraphs });
  }
  return out;
}
