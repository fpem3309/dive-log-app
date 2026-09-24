import { expect } from 'vitest';

import { cellsFor, MAX_CELLS } from '@/cards/parts/fields';
import {
  accentTarget,
  chooseHero,
  heroAvailable,
  heroCandidates,
  heroLabel,
  resolveHero,
} from '@/model/chooseHero';
import type { Dive, HeroKind } from '@/model/types';

/**
 * "빈 값이 있어도 결과물이 멀쩡하다"(§2-②)를 **불변식으로** 적은 것.
 *
 * 단언은 존재가 아니라 **부재**다 — "Depth 칸이 있다"가 아니라 "값 없는 칸이 하나도 없다".
 * 그래야 이 테스트가 §2-①(필수는 세 개뿐)을 어기는 압력이 되지 않는다.
 *
 * 묶음 1(만들어 낸 조합)과 묶음 2(상한 저장소에서 복구한 다이브)가 **같은 함수**를 쓴다.
 * 저장소를 한 바퀴 돌아 나온 다이브도 카드가 될 수 있어야 한다는 게 "통합"의 뜻이다.
 */

/** 빈 값을 빈 값처럼 보이게 하는 표기들. 카드에 하나도 나오면 안 된다 */
const EMPTYISH = ['', '-', '–', '—', 'null', 'undefined', 'NaN', '정보 없음', 'N/A', '?'];

/** §3의 우선순위. 후보 줄은 항상 이 순서이고 `date`는 여기 없다 */
const OFFERED: HeroKind[] = ['species', 'depth', 'count', 'site'];

const where = (dive: Dive) => JSON.stringify(dive);

function expectShownText(text: unknown, what: string, dive: Dive) {
  expect(typeof text, `${what}: 문자열이 아니다 · ${where(dive)}`).toBe('string');
  const v = String(text).trim();
  expect(EMPTYISH, `${what}: 빈 값 표기 "${v}" · ${where(dive)}`).not.toContain(v);
  expect(v, `${what}: 값이 새어 나왔다 · ${where(dive)}`).not.toMatch(/undefined|NaN|null/);
}

export function expectCardComplete(dive: Dive) {
  const hero = resolveHero(dive);
  const auto = chooseHero(dive);
  const candidates = heroCandidates(dive);
  const cells = cellsFor(dive, hero);
  const at = where(dive);

  // ① 주인공은 어떤 다이브에서도 비지 않는다 (§10-③)
  expectShownText(heroLabel(dive, hero), '히어로 라벨', dive);
  expect(heroAvailable(dive, hero), `가리킬 값이 없는 히어로 · ${at}`).toBe(true);

  // ② 액센트는 정확히 한 곳 (§5, §10-②) — 그리지 않는 자리에 배정되면 0곳이 된다
  const accent = accentTarget(dive, hero);
  expect(['mark', 'kicker'], `액센트 자리가 하나가 아니다 · ${at}`).toContain(accent);
  if (accent === 'mark') expect(dive.maxDepth, `마크 없는 카드에 마크 액센트 · ${at}`).not.toBe(undefined);
  if (hero === 'species') expect(accent, `생물형 액센트는 kicker · ${at}`).toBe('kicker');

  // ③ 하단 칸: 값 없는 칸이 하나도 없고, 넘치지 않고, 히어로를 되풀이하지 않는다
  expect(cells.length, `칸이 ${MAX_CELLS}개를 넘었다 · ${at}`).toBeLessThanOrEqual(MAX_CELLS);
  expect(new Set(cells.map((c) => c.key)).size, `칸이 중복됐다 · ${at}`).toBe(cells.length);
  for (const cell of cells) {
    expect(dive[cell.key as keyof Dive], `값 없는 칸 ${cell.key} · ${at}`).not.toBe(undefined);
    expect(dive[cell.key as keyof Dive], `값 없는 칸 ${cell.key} · ${at}`).not.toBe(null);
    expectShownText(cell.label, `칸 ${cell.key} 라벨`, dive);
    expect(cell.segs.length, `칸 ${cell.key}에 값이 없다 · ${at}`).toBeGreaterThan(0);
    cell.segs.forEach((s) => expectShownText(s.t, `칸 ${cell.key} 값`, dive));
  }
  if (hero === 'depth') expect(cells.map((c) => c.key), at).not.toContain('maxDepth');
  if (hero === 'count') expect(cells.map((c) => c.key), at).not.toContain('diveNumber');

  // ④ 후보에는 값이 있는 것만, 순서는 §3, `date`는 안 나간다 (§10-㉜)
  expect(candidates, `후보에 date가 들어갔다 · ${at}`).not.toContain('date');
  expect(candidates, `후보 순서가 §3과 다르다 · ${at}`).toEqual(
    OFFERED.filter((k) => candidates.includes(k)),
  );
  for (const k of candidates) {
    expect(heroAvailable(dive, k), `값 없는 후보 ${k} · ${at}`).toBe(true);
    expectShownText(heroLabel(dive, k), `후보 ${k} 라벨`, dive);
  }

  // ⑤ 자동 규칙은 후보 중 하나를 고른다. 고를 게 하나도 없을 때만 date로 떨어진다
  if (candidates.length === 0) {
    expect(auto, `고를 게 없는데 date가 아니다 · ${at}`).toBe('date');
  } else {
    expect(candidates, `자동 히어로가 후보 밖이다 · ${at}`).toContain(auto);
  }

  // ⑥ 저장된 선택은 유효할 때만 이긴다 (§10-㉜) — 무효하면 조용히 자동 규칙
  const picked = dive.heroOverride;
  expect(hero, `무효한 선택이 살아남았다 · ${at}`).toBe(
    picked && heroAvailable(dive, picked) ? picked : auto,
  );
}
