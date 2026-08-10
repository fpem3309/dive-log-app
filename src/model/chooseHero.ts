import { highlightOf, type Dive } from './types';

/**
 * 카드 주인공 결정 — CLAUDE.md §3.
 *
 *   if (하이라이트 생물 있음)  → 생물형
 *   else if (프리다이빙)       → 수심형
 *   else if (스쿠버)           → 횟수형
 *
 * ⚠️ 스펙에 없는 경우를 하나 메웠다: 종목 기본값이 가리키는 값 자체가 비어 있을 때.
 * 프리다이빙인데 수심을 안 적었거나, 스쿠버인데 시작 번호를 아직 안 넣은 경우다.
 * 그대로 두면 "MAX DEPTH" 라벨 밑에 숫자가 없는 카드가 나오는데, 이건 §2-② 위반이다
 * (무엇을 안 적었는지 카드에 티가 남). 그래서 서로 넘겨주고, 둘 다 없으면 장소명을
 * 주인공으로 올린다 — 장소는 필수라 항상 있다.
 */

export type HeroKind = 'species' | 'depth' | 'count' | 'site';

export const chooseHero = (dive: Dive): HeroKind => {
  if (highlightOf(dive)) return 'species';

  // §3 본문
  if (dive.discipline === 'free' && dive.maxDepth != null) return 'depth';
  if (dive.discipline === 'scuba' && dive.diveNumber != null) return 'count';

  // 기본값이 빈 경우 — 남은 것으로 넘긴다
  if (dive.maxDepth != null) return 'depth';
  if (dive.diveNumber != null) return 'count';

  // 필수 3개만 적힌 다이브
  return 'site';
};

/**
 * 액센트(--point)는 카드당 한 곳 (§5).
 * 시안은 kicker와 눈금 마크 두 곳에 쓰지만 스펙이 우선이다. 수심 점이 있으면 그쪽이
 * 서명 요소라 액센트를 갖고, 없으면 kicker로 넘어간다. 결과적으로 항상 정확히 하나.
 */
export const accentTarget = (dive: Dive, hero: HeroKind): 'mark' | 'kicker' => {
  if (hero === 'species') return 'kicker';
  return dive.maxDepth != null ? 'mark' : 'kicker';
};
