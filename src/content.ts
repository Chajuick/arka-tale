// 원고 → 장(chapter) 단위로 나누기
//   큰 서사: content/saga.md         → 장 번호 (1, 2, …, 'last')
//   세계의 조각들·빛나던 이들: content/lore/<책id>.md  → 공개
//                              content/draft/<책id>.md → 준비 중 (개발 서버에서만 보이고 배포에는 넣지 않음)
//   장 이름: '<책id>:<장 번호>' (예: 'dob-bob:1')  — 책을 공개하려면 원고 파일을 draft → lore 로 옮기면 됨
//   나누는 규칙 자체는 manuscript.ts (빌드 때 만드는 텍스트 서재와 같이 씀)
import saga from './content/saga.md?raw';
import type { ChapterRef } from './books';
import { parseManuscript, type Chapter } from './manuscript';

export { SCENE_BREAK, inline, type Chapter } from './manuscript';

const chapters = new Map<ChapterRef, Chapter>();

const published = import.meta.glob('./content/lore/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;
const drafts: Record<string, string> = import.meta.env.DEV
  ? (import.meta.glob('./content/draft/*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>)
  : {};
const lore = { ...published, ...drafts };

const add = (list: Chapter[]) => list.forEach((c) => chapters.set(c.ref, c));
add(parseManuscript(saga));
for (const [path, md] of Object.entries(lore)) add(parseManuscript(md, path.split('/').pop()!.replace(/\.md$/, '')));

export const getChapter = (ref: ChapterRef) => chapters.get(ref);
