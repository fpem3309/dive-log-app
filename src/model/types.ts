/**
 * 데이터 모델 — CLAUDE.md §4.
 *
 * 필수는 세 개뿐이다: date, site, discipline. 나머지는 전부 optional이고,
 * 카드는 optional이 전부 비어도 멀쩡해야 한다 (§2-②).
 */

export type Discipline = 'free' | 'scuba';

/**
 * 카드 주인공의 종류 — §3.
 * 저장되는 필드(`Dive.heroOverride`)의 타입이라 모델 쪽에 둔다.
 * 자동 결정 규칙은 chooseHero.ts에 있고, 거기서 이 타입을 다시 내보낸다.
 */
export type HeroKind = 'species' | 'depth' | 'count' | 'site' | 'date';

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

  /**
   * 카드에서 사용자가 직접 고른 주인공 — §3 "사용자가 카드에서 탭해서 바꿀 수 있게 한다".
   *
   * 없으면 자동 규칙(chooseHero) 그대로다. 자동 규칙이 고를 것과 같은 것을 고르면
   * 저장하지 않고 지운다 — 구별되지 않는 두 상태를 만들지 않기 위해서다.
   *
   * ⚠️ 이 값은 **힌트**다. 가리키던 값이 사라지면(수심을 지움, 하트를 뗌, 종목을 바꿈)
   * 지우지 않고 **읽을 때 무효로 판정**해서 조용히 자동 규칙으로 돌아간다 (resolveHero).
   * 값이 다시 생기면 선택이 되살아난다.
   */
  heroOverride?: HeroKind;
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
