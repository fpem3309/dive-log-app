import { describe, expect, it } from 'vitest';

import {
  depthToY,
  MAJOR_STEP,
  MINOR_STEP,
  pickScaleMax,
  SCALE_BOTTOM,
  SCALE_TOP,
  ticksFor,
} from '@/cards/layers/depthScale';
import { cellsFor, durationSegs } from '@/cards/parts/fields';
import { chooseHero, heroAvailable, heroCandidates, resolveHero } from '@/model/chooseHero';
import { everyDive, heart, justAdded, minimal, seen } from './support/dives';
import { expectCardComplete } from './support/invariants';

/**
 * 묶음 1 — 카드가 비지 않는다.
 *
 * 화면을 하나도 부르지 않는다. `src/app` · `src/components` · `src/ui`를 고쳤을 때
 * 여기가 깨지면 범위를 잘못 그은 것이다.
 */

describe('§2-② 빈 값 조합 전수 — 불변식', () => {
  const dives = everyDive();

  it('빈 값 조합 전체에서 카드가 비지 않는다', () => {
    expect(dives.length).toBeGreaterThan(500);
    dives.forEach(expectCardComplete);
  });

  it('조합에 "방금 추가한 빈 다이브"가 실제로 들어 있다', () => {
    // 픽스처가 언제부턴가 전부 채워진 다이브만 만들고 있으면 위 검사가 무의미해진다
    const blank = dives.filter(
      (d) => !d.site && d.maxDepth == null && d.diveNumber == null && d.sightings.length === 0,
    );
    expect(blank.length).toBeGreaterThan(0);
    blank.forEach((d) => expect(chooseHero(d)).toBe('date'));
  });
});

describe('§3 주인공 결정', () => {
  it('하트가 있으면 종목·수심과 무관하게 생물형', () => {
    expect(chooseHero(minimal({ sightings: heart(), maxDepth: 30, discipline: 'free' }))).toBe(
      'species',
    );
    expect(chooseHero(minimal({ sightings: heart(), diveNumber: 313 }))).toBe('species');
  });

  it('프리는 수심, 스쿠버는 누적 번호', () => {
    expect(chooseHero(minimal({ discipline: 'free', maxDepth: 38, diveNumber: undefined }))).toBe(
      'depth',
    );
    expect(chooseHero(minimal({ discipline: 'scuba', maxDepth: 18, diveNumber: 313 }))).toBe(
      'count',
    );
  });

  it('가리킬 값이 없으면 서로 넘기고, 마지막은 장소 → 날짜 (§10-③)', () => {
    // 프리인데 수심을 안 적음 → 누적 번호로
    expect(chooseHero(minimal({ discipline: 'scuba', maxDepth: undefined, diveNumber: 313 }))).toBe(
      'count',
    );
    // 스쿠버인데 시작 번호를 안 넣음 → 수심으로
    expect(chooseHero(minimal({ maxDepth: 24.5 }))).toBe('depth');
    // 필수 3개만 → 장소
    expect(chooseHero(minimal())).toBe('site');
    // 추가만 누른 다이브 → 날짜. 여기가 비면 라벨만 남은 카드가 나온다
    expect(chooseHero(justAdded())).toBe('date');
    expect(chooseHero(justAdded({ site: '   ' }))).toBe('date');
  });

  it('누적 번호는 스쿠버만 후보로 내놓는다', () => {
    const scuba = minimal({ diveNumber: 313 });
    expect(heroCandidates(scuba)).toContain('count');
    // 번호가 붙은 채로 프리로 바꾼 상태 — 프리 카드에 "313번째"를 내놓으면 안 된다
    const free = { ...scuba, discipline: 'free' as const };
    expect(heroAvailable(free, 'count')).toBe(false);
    expect(heroCandidates(free)).not.toContain('count');
  });

  it('후보가 2개 미만이면 화면은 선택 UI를 안 그린다 — 그 상태가 실제로 생긴다', () => {
    expect(heroCandidates(justAdded())).toEqual([]);
    expect(heroCandidates(minimal())).toEqual(['site']);
  });
});

describe('§10-㉜ 저장된 선택은 값이 사라지면 무효, 돌아오면 되살아난다', () => {
  it('수심을 지웠다 다시 적으면 수심형으로 돌아온다', () => {
    const picked = minimal({ maxDepth: 30, heroOverride: 'depth', diveNumber: 313 });
    expect(resolveHero(picked)).toBe('depth');
    const cleared = { ...picked, maxDepth: undefined };
    expect(resolveHero(cleared)).toBe('count');
    expect(cleared.heroOverride).toBe('depth'); // 지우지 않는다 — 무시만 한다
    expect(resolveHero({ ...cleared, maxDepth: 12 })).toBe('depth');
  });

  it('하트를 떼면 생물형 선택이 무효가 된다', () => {
    const picked = minimal({ sightings: heart(), heroOverride: 'species', maxDepth: 18 });
    expect(resolveHero(picked)).toBe('species');
    expect(resolveHero({ ...picked, sightings: seen() })).toBe('depth');
  });

  it('종목을 스쿠버→프리로 바꾸면 횟수형 선택이 무효가 된다', () => {
    const picked = minimal({ diveNumber: 313, heroOverride: 'count', maxDepth: 24 });
    expect(resolveHero(picked)).toBe('count');
    expect(resolveHero({ ...picked, discipline: 'free' })).toBe('depth');
  });
});

describe('§2-② 하단 칸', () => {
  it('선택 항목을 하나도 안 적으면 칸이 아예 없다', () => {
    expect(cellsFor(minimal(), 'site')).toEqual([]);
    expect(cellsFor(justAdded(), 'date')).toEqual([]);
  });

  it('전부 적어도 4칸을 넘지 않는다', () => {
    const full = minimal({
      maxDepth: 24.5,
      duration: 42,
      waterTemp: 23,
      visibility: 12,
      airEnd: 60,
      style: 'CWT',
      diveNumber: 313,
      sightings: heart(),
    });
    expect(cellsFor(full, resolveHero(full))).toHaveLength(4);
  });

  it('히어로가 이미 보여준 값은 칸으로 되풀이하지 않는다', () => {
    const d = minimal({ maxDepth: 24.5, duration: 42, waterTemp: 23, diveNumber: 313 });
    expect(cellsFor(d, 'depth').map((c) => c.key)).not.toContain('maxDepth');
    expect(cellsFor(d, 'count').map((c) => c.key)).not.toContain('diveNumber');
  });

  it('§10-⑧ 시간 표기는 종목별로 나뉜다', () => {
    expect(durationSegs(minimal({ discipline: 'free', duration: 128 }))).toEqual([
      { t: '2' },
      { t: ':', small: true },
      { t: '08' },
    ]);
    expect(durationSegs(minimal({ discipline: 'free', duration: 8 }))).toEqual([
      { t: '0' },
      { t: ':', small: true },
      { t: '08' },
    ]);
    expect(durationSegs(minimal({ discipline: 'scuba', duration: 42 }))).toEqual([
      { t: '42' },
      { t: '분', small: true },
    ]);
  });
});

describe('§10-④ 수심 축', () => {
  it('40m 기본, 넘으면 20 단위로 확장', () => {
    expect(pickScaleMax(undefined)).toBe(40);
    expect(pickScaleMax(0)).toBe(40);
    expect(pickScaleMax(24.5)).toBe(40);
    expect(pickScaleMax(40)).toBe(40);
    expect(pickScaleMax(41)).toBe(60);
    expect(pickScaleMax(45)).toBe(60);
    expect(pickScaleMax(62)).toBe(80);
    expect(pickScaleMax(100)).toBe(100);
  });

  it('눈금은 10m마다, 20m마다 major — 축이 늘어나도 단위가 안 변한다', () => {
    for (const scaleMax of [40, 60, 80, 100]) {
      const ticks = ticksFor(scaleMax);
      expect(ticks.map((t) => t.depth)).toEqual(
        Array.from({ length: scaleMax / MINOR_STEP + 1 }, (_, i) => i * MINOR_STEP),
      );
      ticks.forEach((t) => expect(t.major).toBe(t.depth % MAJOR_STEP === 0));
      expect(ticks[0].y).toBe(SCALE_TOP);
      expect(ticks[ticks.length - 1].y).toBeCloseTo(SCALE_BOTTOM, 6);
    }
  });

  it('마크는 어떤 수심에서도 축 안에 있다', () => {
    for (let d = 0; d <= 120; d += 0.5) {
      const y = depthToY(d, pickScaleMax(d));
      expect(y, `${d}m가 축 밖으로 나갔다`).toBeGreaterThanOrEqual(SCALE_TOP);
      expect(y, `${d}m가 축 밖으로 나갔다`).toBeLessThanOrEqual(SCALE_BOTTOM);
    }
  });

  it('깊을수록 아래에 찍힌다 (같은 축 안에서)', () => {
    expect(depthToY(18, 40)).toBeLessThan(depthToY(24.5, 40));
    expect(depthToY(0, 40)).toBe(SCALE_TOP);
  });
});

