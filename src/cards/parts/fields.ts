import type { HeroKind } from '@/model/chooseHero';
import type { Dive } from '@/model/types';

/**
 * 하단 정보 칸을 데이터에서 만든다.
 *
 * 시안은 카드마다 칸을 마크업으로 박아 뒀지만, §2-②("빈 값은 아예 사라진다")는
 * 마크업이 아니라 로직이어야 한다. 우선순위대로 늘어놓고 → 비어 있는 것을 버리고 →
 * 앞에서 4개만 남긴다. 남은 칸은 flex:1로 자리를 나눠 갖는다.
 */

/** 값 안에서 크기가 다른 조각 — 시안 .cell .v small */
export type Seg = { t: string; small?: boolean };
export type Cell = { key: string; label: string; segs: Seg[] };

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(n));

/** 프리는 초 단위(2:08), 스쿠버는 분 단위(42분) — CLAUDE.md §4 */
export const durationSegs = (dive: Dive): Seg[] => {
  const d = dive.duration!;
  if (dive.discipline === 'free') {
    const m = Math.floor(d / 60);
    const sec = String(d % 60).padStart(2, '0');
    return [{ t: String(m) }, { t: ':', small: true }, { t: sec }];
  }
  return [{ t: String(d) }, { t: '분', small: true }];
};

type Key = 'maxDepth' | 'duration' | 'waterTemp' | 'visibility' | 'airEnd' | 'style' | 'diveNumber';

const BUILD: Record<Key, { label: string; segs: (d: Dive) => Seg[] }> = {
  maxDepth: { label: 'Depth', segs: (d) => [{ t: num(d.maxDepth!) }, { t: 'm', small: true }] },
  duration: { label: 'Time', segs: durationSegs },
  waterTemp: { label: 'Temp', segs: (d) => [{ t: num(d.waterTemp!) }, { t: '°C', small: true }] },
  visibility: { label: 'Vis', segs: (d) => [{ t: num(d.visibility!) }, { t: 'm', small: true }] },
  airEnd: { label: 'Air', segs: (d) => [{ t: num(d.airEnd!) }, { t: 'bar', small: true }] },
  // 프리다이빙에서 CWT/FIM은 한국어로 '종목'이라 부른다 — 시안 표기 그대로
  style: { label: '종목', segs: (d) => [{ t: d.style! }] },
  diveNumber: { label: 'Dive', segs: (d) => [{ t: String(d.diveNumber!) }] },
};

/**
 * 히어로가 이미 보여준 값은 목록에서 빠진다 (수심형에 Depth 칸이 없는 이유).
 * 뒤쪽은 앞이 비었을 때 자리를 메우는 예비 항목이다.
 */
const ORDER: Record<HeroKind, Key[]> = {
  depth: ['duration', 'waterTemp', 'visibility', 'style'],
  count: ['maxDepth', 'duration', 'waterTemp', 'airEnd'],
  species: ['maxDepth', 'duration', 'waterTemp', 'diveNumber', 'visibility', 'airEnd', 'style'],
  site: ['maxDepth', 'duration', 'waterTemp', 'visibility', 'airEnd', 'style', 'diveNumber'],
  // 날짜형은 수심·누적이 둘 다 없는 게 확정이라(chooseHero) 나머지만 온다
  date: ['duration', 'waterTemp', 'visibility', 'airEnd', 'style'],
};

export const MAX_CELLS = 4;

/**
 * ⚠️ `!= null`만으로는 부족하다 — `''`는 null이 아니라서 통과한다.
 * `style: ''`이 들어오면 "종목" 라벨만 있고 값이 빈 칸이 만들어졌다 (§2-② 위반).
 * 칩으로 고르는 지금 UI는 `''`을 안 만들지만 저장소에서 들어온 것은 다르다.
 */
const hasValue = (v: unknown) => v != null && (typeof v !== 'string' || v.trim() !== '');

export const cellsFor = (dive: Dive, hero: HeroKind): Cell[] =>
  ORDER[hero]
    .filter((k) => hasValue(dive[k]))
    .slice(0, MAX_CELLS)
    .map((k) => ({ key: k, label: BUILD[k].label, segs: BUILD[k].segs(dive) }));

/** "2026-08-02" → "2026.08.02" */
export const formatDate = (iso: string) => iso.replaceAll('-', '.');
