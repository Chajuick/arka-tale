// 서재 구성 — 책장(CASES)과 책(BOOKS)
//   책장을 추가하려면 CASES에 한 줄, 책을 추가하려면 BOOKS에 한 줄 (선반이 차면 자동으로 한 칸 늘어남)
//   case: 꽂힐 책장 id (없으면 첫 책장) / shelf: 그 책장 안의 칸 key
//   chapters: saga.md의 장 번호 ('last' = 마지막 장). 비어 있으면 잠긴 책 ("아직 쓰이지 않은 이야기")
//   links: 그 장이 끝난 뒤 다른 책으로 이어지는 책갈피

export type ChapterRef = number | 'last';
export type Emblem =
  | 'star' | 'orb' | 'mountain' | 'tear' | 'abyss' | 'rescue' | 'sea'
  | 'friends' | 'castle' | 'lantern' | 'dragon' | 'four' | 'shield' | 'brush';

export interface BookLink {
  after: ChapterRef;
  to: string;
  text: string;
}

export interface ShelfRow {
  key: string;
  label: string; // 선반 이름판 ('' = 없음)
  tall?: boolean; // 큰 책 칸 (금박 띠, 권 번호)
}

export interface BookCase {
  id: string;
  title: string; // 책장 이름 (오른쪽 목록에 표시)
  rows: ShelfRow[];
}

export interface BookDef {
  id: string;
  case?: string;
  shelf: string;
  title: string;
  subtitle?: string;
  color: string; // 표지 색
  ink?: string; // 표지 글자 색 (밝은 표지면 어둡게)
  emblem: Emblem;
  emblemColor?: string;
  chapters?: ChapterRef[];
  links?: BookLink[];
}

export const SERIES = '세상이 눈을 뜬 날';

export const CASES: BookCase[] = [
  {
    id: 'arca',
    title: '아르카 테일',
    rows: [
      { key: 'saga', label: '아르카 테일', tall: true },
      { key: 'lore', label: '세계의 조각' },
    ],
  },
  // 예시용 빈 책장 — 이름을 바꾸거나 지워도 됨
  { id: 'next', title: '두 번째 책장', rows: [{ key: 'main', label: '두 번째 책장' }] },
];

export const BOOKS: BookDef[] = [
  // ── 윗칸: 큰 서사 (시대별) ──
  { id: 'saga-1', shelf: 'saga', title: '가장 아름다운 별', subtitle: '태초의 이야기', color: '#1d2a4f', emblem: 'star', chapters: [1] },
  {
    id: 'saga-2', shelf: 'saga', title: '조율사의 시대', subtitle: '세상이 다시 눈을 뜬 날', color: '#24432f', emblem: 'orb', chapters: [2, 5],
    links: [{ after: 2, to: 'dob-bob', text: '도브와 보브의 여정은 『도브와 보브』에서 이어집니다' }],
  },
  {
    id: 'saga-3', shelf: 'saga', title: '평화의 산', subtitle: '아르카의 시대', color: '#4a3d63', emblem: 'mountain', chapters: [6],
    links: [{ after: 6, to: 'arca', text: '여섯 가문의 이야기는 『아르카 대륙』에 기록되어 있습니다' }],
  },
  {
    id: 'saga-4', shelf: 'saga', title: '세계의 첫 번째 울음', subtitle: '재앙과 개화자', color: '#5c2230', emblem: 'tear', chapters: [7],
    links: [
      { after: 7, to: 'sasin', text: '선인들의 이야기는 『사신』에서 이어집니다' },
      { after: 7, to: 'hwangryong', text: '다섯 번째 선인의 이야기는 『황룡의 책』에' },
    ],
  },
  {
    id: 'saga-5', shelf: 'saga', title: '길을 잃은 사람들', subtitle: '심연과 길잡이', color: '#22284f', emblem: 'abyss', chapters: [8],
    links: [
      { after: 8, to: 'aurora', text: '오로라의 여정은 『푸른 길잡이』에서 이어집니다' },
      { after: 8, to: 'amane', text: '다른 길잡이들의 이야기: 『백색 길잡이』 『황색 길잡이』 『녹색 길잡이』' },
    ],
  },
  {
    id: 'saga-6', shelf: 'saga', title: '푸른구원', subtitle: '기억하는 아이와 자신을 지키는 아이', color: '#1f4d5a', emblem: 'rescue', chapters: [10],
    links: [
      { after: 10, to: 'doyun', text: '도윤의 이야기는 『도윤의 책』에' },
      { after: 10, to: 'seoyun', text: '서윤의 이야기는 『서윤의 책』에' },
    ],
  },
  { id: 'saga-7', shelf: 'saga', title: '다시, 가장 아름다운 별', subtitle: '세계의 마지막 울음', color: '#265f84', emblem: 'sea', chapters: [11, 'last'] },

  // ── 아랫칸: 세계의 조각 (계속 추가 가능) ──
  { id: 'dob-bob', shelf: 'lore', title: '도브와 보브', subtitle: '모르는 아이와 모든 것을 알려는 아이', color: '#6b4a2b', emblem: 'friends', chapters: [3, 4] },
  { id: 'arca', shelf: 'lore', title: '아르카 대륙', subtitle: '여섯 가문의 기록', color: '#5f6070', emblem: 'castle' },
  { id: 'amane', shelf: 'lore', title: '백색 길잡이 아마네', color: '#e8e2d2', ink: '#3a3530', emblem: 'lantern', emblemColor: '#ffffff' },
  { id: 'lingsha', shelf: 'lore', title: '황색 길잡이 링샤', color: '#c49a2a', ink: '#2e2210', emblem: 'lantern', emblemColor: '#fff1a8' },
  { id: 'yeonhwa', shelf: 'lore', title: '녹색 길잡이 연화', color: '#3c7848', emblem: 'lantern', emblemColor: '#b8f0a0' },
  { id: 'hwangryong', shelf: 'lore', title: '황룡의 책', subtitle: '아이들을 가르치던 선인', color: '#a8781c', ink: '#2a1c08', emblem: 'dragon' },
  { id: 'aurora', shelf: 'lore', title: '푸른 길잡이 오로라', subtitle: '두 명의 오로라', color: '#2f6cbf', emblem: 'lantern', emblemColor: '#a8e0ff', chapters: [9] },
  { id: 'sasin', shelf: 'lore', title: '사신', subtitle: '남은 네 명의 선인', color: '#3a3043', emblem: 'four' },
  { id: 'doyun', shelf: 'lore', title: '도윤의 책', subtitle: '자신을 지키는 아이', color: '#45566a', emblem: 'shield' },
  { id: 'seoyun', shelf: 'lore', title: '서윤의 책', subtitle: '기억하는 아이', color: '#8a5a7c', emblem: 'brush' },
];

export const caseOf = (b: BookDef) => b.case ?? CASES[0].id;
export const bookById = (id: string) => BOOKS.find((b) => b.id === id);
export const isLocked = (b: BookDef) => !b.chapters || b.chapters.length === 0;
