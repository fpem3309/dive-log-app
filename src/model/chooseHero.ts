import { highlightOf, type Dive, type HeroKind } from './types';

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
 * (무엇을 안 적었는지 카드에 티가 남). 그래서 서로 넘겨준다.
 *
 * ⚠️ 마지막은 장소가 아니라 **날짜**다. 원래 "장소는 필수라 항상 있다"고 보고 장소에서
 * 끝냈는데, `addDive`가 `site: ''`로 만들기 때문에 그 전제가 틀렸다 — 다이브를 추가만
 * 하고 아무것도 안 적으면 "SCUBA" 라벨만 있고 그 밑이 통째로 비었다. 정확히 §2-② 위반이고
 * 새 다이브의 기본 상태라 흔하다. 날짜는 `date: init?.date ?? todayISO()`라 어떤 경로로도
 * 비지 않는다.
 *
 * 카드가 실제로 쓰는 건 `chooseHero`가 아니라 `resolveHero`다 — 사용자가 카드에서
 * 직접 고른 게 있으면 그게 이긴다 (§3 마지막 줄). `chooseHero`는 그 아래 깔린 기본값.
 */

export type { HeroKind };

export const chooseHero = (dive: Dive): HeroKind => {
  /*
   * ⚠️ "값이 있는가"는 **`heroAvailable` 하나로만 판정한다.**
   * 예전엔 여기서 조건을 따로 적었는데 `heroAvailable`과 어긋났다 — 이쪽은 종목을 안 보고
   * 저쪽은 봤다. 그래서 프리 다이브에 `diveNumber`가 남아 있으면 카드는 "313번째"를
   * 보여주는데 **후보 줄에는 그게 없어서 되돌릴 수 없는 히어로**가 됐다 (§3·§10-㉜ 위반).
   * 같은 규칙을 두 곳에 적으면 언젠가 갈라진다.
   */
  if (heroAvailable(dive, 'species')) return 'species';

  // §3 본문 — 종목이 가리키는 것 먼저
  if (dive.discipline === 'free' && heroAvailable(dive, 'depth')) return 'depth';
  if (dive.discipline === 'scuba' && heroAvailable(dive, 'count')) return 'count';

  // 기본값이 빈 경우 — 남은 것으로 넘긴다
  if (heroAvailable(dive, 'depth')) return 'depth';
  if (heroAvailable(dive, 'count')) return 'count';

  // 장소만 적힌 다이브
  if (heroAvailable(dive, 'site')) return 'site';

  // 아무것도 안 적은 다이브 — 날짜만은 항상 있다
  return 'date';
};

/**
 * 카드가 보여줄 수 있는 순서 — §3의 우선순위. 후보 줄도 항상 이 순서로 놓는다.
 *
 * `date`는 일부러 빠져 있다. 폴백 전용이라 사용자에게 내놓지 않는다 — 넣으면 모든 카드에
 * 날짜 칩이 하나씩 생기는데, 그건 이 버그를 고치는 것과 다른 이야기(주인공 종류 추가)다.
 */
const HERO_ORDER: HeroKind[] = ['species', 'depth', 'count', 'site'];

/**
 * 그 다이브에서 이 주인공이 **가리킬 값이 실제로 있는가.**
 *
 * §2-②의 방어선이 여기 걸린다. 값이 없는 주인공은 후보로 내놓지도 않고(회색·비활성·
 * "안 적음" 전부 금지), 저장된 선택이 이걸 가리키고 있어도 무효로 친다. 그래야
 * "라벨만 남고 숫자가 빈 카드"가 어떤 경로로도 나오지 않는다.
 */
export const heroAvailable = (dive: Dive, kind: HeroKind): boolean => {
  switch (kind) {
    // ⚠️ 이름이 비면 성립하지 않는다. 입력 화면은 빈 이름을 막지만(SightingsEditor)
    // 저장소에서 들어온 것은 안 거쳐 온다 — 그대로 두면 "오늘의 하이라이트" 라벨 밑이
    // 통째로 빈다 (§10-③과 같은 부류).
    case 'species':
      return !!highlightOf(dive)?.name.trim();
    case 'depth':
      return dive.maxDepth != null;
    // 누적 번호는 스쿠버만 센다 — 스쿠버→프리로 바꾸면 이 선택은 무효가 된다
    case 'count':
      return dive.discipline === 'scuba' && dive.diveNumber != null;
    case 'site':
      return dive.site.trim().length > 0;
    // 날짜는 필수라 항상 있다 (§4). 후보로는 안 나가고 폴백으로만 쓰인다
    case 'date':
      return true;
  }
};

/**
 * 실제로 카드에 쓰일 주인공 — **유효한 사용자 선택이 있으면 그것, 없으면 자동 규칙.**
 *
 * 무효한 선택은 지우지 않고 무시만 한다. 수심을 지웠다가 다시 적으면 원래 고른 대로
 * 돌아오는 편이 의도에 맞고, 편집기에서 값을 건드릴 때마다 저장을 때리지 않아도 된다.
 */
export const resolveHero = (dive: Dive): HeroKind => {
  const picked = dive.heroOverride;
  if (picked && heroAvailable(dive, picked)) return picked;
  return chooseHero(dive);
};

/**
 * 사용자가 고를 수 있는 주인공들. **값이 있는 것만** 담긴다.
 * 2개 미만이면 화면은 선택 UI를 아예 렌더하지 않는다 — 눌리는데 반응이 없는 상태를
 * 만들지 않고, 비활성으로 보여주지도 않는다.
 */
export const heroCandidates = (dive: Dive): HeroKind[] =>
  HERO_ORDER.filter((k) => heroAvailable(dive, k));

/**
 * 후보에 붙는 글자 — **카드에 실제로 찍힐 값 그대로**다 ("38m" / "313번째" / "가시해마").
 * 종류 이름("최대 수심")을 쓰지 않는 건 고르기 전에 결과를 정확히 예측하게 하려는 것.
 * 값이 없는 후보는 애초에 목록에 없으므로 여기서 빈 문자열이 나올 일은 없다.
 */
export const heroLabel = (dive: Dive, kind: HeroKind): string => {
  switch (kind) {
    case 'species':
      return highlightOf(dive)?.name.trim() ?? '';
    case 'depth':
      return `${dive.maxDepth}m`;
    case 'count':
      return `${dive.diveNumber}번째`;
    case 'site':
      return dive.site;
    // fields.ts의 formatDate와 같은 표기. import하면 fields → chooseHero 순환이 된다
    case 'date':
      return dive.date.replaceAll('-', '.');
  }
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
