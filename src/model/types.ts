/**
 * 데이터 모델 — CLAUDE.md §4.
 *
 * 필수는 세 개뿐이다: date, site, discipline. 나머지는 전부 optional이고,
 * 카드는 optional이 전부 비어도 멀쩡해야 한다 (§2-②).
 */

export type Discipline = 'free' | 'scuba';

export type Sighting = {
  name: string;
  scientificName?: string;
  count?: number;
  /** 하트 — 사용자가 직접 누른다. 앱이 판단하지 않는다 (§2-④) */
  isHighlight: boolean;
  memo?: string;
};

export type Dive = {
  id: string;
  /** 필수 */
  date: string;
  time?: string;
  /** 필수 — "문섬 새끼섬" */
  site: string;
  /** 필수 */
  discipline: Discipline;

  /** m */
  maxDepth?: number;
  /** 스쿠버는 분, 프리는 초 (§9 미해결 — 표기 분기는 formatDuration에서) */
  duration?: number;
  /** °C */
  waterTemp?: number;
  /** m */
  visibility?: number;
  /** bar, 스쿠버만 */
  airEnd?: number;
  /** 'CWT' | 'FIM' | ... 프리만 */
  style?: string;

  sightings: Sighting[];
  photo?: number | { uri: string };
  note?: string;
  /** 스쿠버 누적. 온보딩에서 시작 번호를 받아 자동 증가 (§4 주의) */
  diveNumber?: number;
};

export type Trip = {
  id: string;
  /** "제주 3박" — 비면 지역명+날짜로 자동 생성 */
  title: string;
  /** "서귀포 · 제주" */
  region: string;
  startDate: string;
  endDate: string;
  dives: Dive[];
};

/** 카드에 붙는 표시용 컨텍스트 (다이브 자체에는 없는 값) */
export type CardContext = {
  /** 트립에서 내려온 지역명 — 카드 상단 우측 */
  region?: string;
};

export const highlightOf = (dive: Dive): Sighting | undefined =>
  dive.sightings.find((s) => s.isHighlight);
