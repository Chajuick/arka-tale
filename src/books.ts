// 서재 구성 — 책장(CASES)과 책(BOOKS)
//   책장을 추가하려면 CASES에 한 줄, 책을 추가하려면 BOOKS에 한 줄 (선반이 차면 자동으로 한 칸 늘어남)
//   case: 꽂힐 책장 id (없으면 첫 책장) / shelf: 그 책장 안의 칸 key
//   chapters: saga.md의 장 번호 ('last' = 마지막 장). 비어 있으면 잠긴 책 ("준비 중인 이야기")
//   공개 범위: OPEN_SHELVES에 든 칸의 책만 읽을 수 있음 (나머지는 준비 중으로 잠김)
//   links: 그 장이 끝난 뒤 다른 책으로 이어지는 책갈피

/** 큰 서사 장 번호(1, 2, …, 'last') 또는 개별 책의 장('dob-bob:1') */
export type ChapterRef = number | 'last' | `${string}:${string}`;
export type Emblem =
  | 'star' | 'orb' | 'mountain' | 'tear' | 'abyss' | 'rescue' | 'sea'
  | 'friends' | 'castle' | 'lantern' | 'dragon' | 'four' | 'shield' | 'brush' | 'sprout';

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

export const SERIES = '아르카 테일';

export const CASES: BookCase[] = [
  // 맨 위: 큰 이야기
  { id: 'arca', title: '아르카 테일', rows: [{ key: 'saga', label: '아르카 테일', tall: true }] },
  // 가운데: 세계의 설정·조직·국가에 관한 이야기
  { id: 'world', title: '세계의 조각들', rows: [{ key: 'world', label: '세계의 조각들' }] },
  // 아래: 한 사람 한 사람의 이야기
  { id: 'people', title: '빛나던 이들', rows: [{ key: 'people', label: '빛나던 이들' }] },
];

export const BOOKS: BookDef[] = [
  // ── 윗칸: 큰 서사 (시대별) ──
  { id: 'saga-1', shelf: 'saga', title: '가장 아름다운 별', subtitle: '태초의 이야기', color: '#1d2a4f', emblem: 'star', chapters: [1] },
  {
    id: 'saga-2', shelf: 'saga', title: '조율사의 시대', subtitle: '모브와 두 개의 동굴', color: '#24432f', emblem: 'orb', chapters: [2, 3, 4, 5],
    links: [{ after: 5, to: 'dob-bob', text: '도브와 보브의 여정은 『도브와 보브』에 더 자세히 기록되어 있습니다' }],
  },
  {
    id: 'saga-3', shelf: 'saga', title: '평화의 산', subtitle: '아르카의 시대', color: '#4a3d63', emblem: 'mountain', chapters: [6, 7],
    links: [{ after: 7, to: 'arca', text: '여섯 가문의 이야기는 『아르카 대륙』에 기록되어 있습니다' }],
  },
  {
    id: 'saga-4', shelf: 'saga', title: '세계의 첫 번째 울음', subtitle: '재앙과 개화자', color: '#5c2230', emblem: 'tear', chapters: [8, 9],
    links: [
      { after: 9, to: 'sasin', text: '네 선인의 이야기는 『선인의 이야기』에서 이어집니다' },
      { after: 9, to: 'hwangryong', text: '그리고 잊힌 다섯 번째 선인의 이야기는 『잊힌 선인』에' },
    ],
  },
  {
    id: 'saga-5', shelf: 'saga', title: '재앙이 남긴 세계', subtitle: '상처와 함께 살아가는 법', color: '#22284f', emblem: 'sprout', chapters: [10],
    links: [{ after: 10, to: 'aurora', text: '선인들이 물러난 뒤, 심연으로 들어간 황룡과 길잡이들의 이야기는 『푸른 길잡이 오로라』에 남아 있습니다' }],
  },
  {
    id: 'saga-6', shelf: 'saga', title: '푸른구원', subtitle: '기억하는 아이와 자신을 지키는 아이', color: '#1f4d5a', emblem: 'rescue', chapters: [11],
    links: [
      { after: 11, to: 'doyun', text: '도윤의 이야기는 『도윤의 책』에' },
      { after: 11, to: 'seoyun', text: '서윤의 이야기는 『서윤의 책』에' },
    ],
  },
  { id: 'saga-7', shelf: 'saga', title: '다시, 가장 아름다운 별', subtitle: '또 하나의 새로운 이야기', color: '#265f84', emblem: 'sea', chapters: [12] },

  // ── 가운데 칸: 세계의 조각들 (설정·조직·국가) ──
  { id: 'arca', shelf: 'world', title: '아르카 대륙', subtitle: '여섯 가문의 기록', color: '#5f6070', emblem: 'castle' },

  // ── 아래 칸: 빛나던 이들 (인물 이야기) ──
  { id: 'dob-bob', shelf: 'people', title: '도브와 보브', subtitle: '모르는 아이와 모든 것을 알려는 아이', color: '#6b4a2b', emblem: 'friends', chapters: ['dob-bob:1', 'dob-bob:2', 'dob-bob:3'] },
  { id: 'amane', shelf: 'people', title: '백색 길잡이 아마네', color: '#e8e2d2', ink: '#3a3530', emblem: 'lantern', emblemColor: '#ffffff' },
  { id: 'lingsha', shelf: 'people', title: '황색 길잡이 링샤', color: '#c49a2a', ink: '#2e2210', emblem: 'lantern', emblemColor: '#fff1a8' },
  { id: 'yeonhwa', shelf: 'people', title: '녹색 길잡이 연화', color: '#3c7848', emblem: 'lantern', emblemColor: '#b8f0a0' },
  {
    id: 'sasin', shelf: 'people', title: '선인의 이야기', subtitle: '산에서 기다리는 사람들', color: '#3a3043', emblem: 'four', chapters: ['sasin:1'],
    links: [{ after: 'sasin:1', to: 'hwangryong', text: '잊힌 다섯 번째 선인의 이야기는 『잊힌 선인』에 남아 있습니다' }],
  },
  { id: 'hwangryong', shelf: 'people', title: '잊힌 선인', subtitle: '옳은 길의 끝에서', color: '#a8781c', ink: '#2a1c08', emblem: 'dragon', chapters: ['hwangryong:1'] },
  { id: 'aurora', shelf: 'people', title: '푸른 길잡이 오로라', subtitle: '두 명의 오로라', color: '#2f6cbf', emblem: 'lantern', emblemColor: '#a8e0ff', chapters: ['aurora:1', 'aurora:2'] },
  { id: 'doyun', shelf: 'people', title: '도윤의 책', subtitle: '자신을 지키는 아이', color: '#45566a', emblem: 'shield' },
  { id: 'seoyun', shelf: 'people', title: '서윤의 책', subtitle: '기억하는 아이', color: '#8a5a7c', emblem: 'brush' },
];

/** 큰 서사 권 번호 (1부터). 다른 칸의 책이면 0 */
export const volOf = (b: BookDef) => (b.shelf === 'saga' ? BOOKS.filter((x) => x.shelf === 'saga').indexOf(b) + 1 : 0);
/** 큰 서사의 다음 권 (마지막 권·다른 칸의 책이면 없음) */
export const nextVolume = (b: BookDef) => {
  const v = volOf(b);
  if (!v) return undefined;
  const next = BOOKS.filter((x) => x.shelf === 'saga')[v];
  return next && !isLocked(next) ? next : undefined;
};
/** 책이 꽂힌 칸(책장 구역): 따로 지정하지 않으면 shelf 키로 찾음 */
export const caseOf = (b: BookDef) => b.case ?? (CASES.find((c) => c.rows.some((r) => r.key === b.shelf)) ?? CASES[0]).id;
/** 칸 이름 (표지·속표지 아래에 표시) */
export const categoryOf = (b: BookDef) => CASES.find((c) => c.id === caseOf(b))!.title;
export const bookById = (id: string) => BOOKS.find((b) => b.id === id);
/** 공개한 칸. 지금은 아르카 테일(큰 이야기)만 공개하고, 나머지 칸의 책은 준비 중 */
export const OPEN_SHELVES = new Set(['saga']);
export const isLocked = (b: BookDef) => !OPEN_SHELVES.has(b.shelf) || !b.chapters || b.chapters.length === 0;
