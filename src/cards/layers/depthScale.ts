import { BASE_W, ASPECT } from '@/design/scale';

/**
 * 수심 → y 좌표.
 *
 * 시안은 눈금 좌표를 상수로 박아 뒀는데(top:26/141/256/371/486, 마크 top:282),
 * 그 값들이 서로 맞지 않는다. 마크 위치들을 역산하면 약 11.5px/m 인데
 * 24.5m 카드의 점은 top:282 = 그 축에서 약 22.5m 자리다. 손으로 찍은 값이라
 * 베끼면 틀린 깊이를 그리게 되므로, 눈금 좌표(0m=26, 40m=486)만 기준으로 삼고
 * 마크는 함수로 계산한다.
 *
 * 좌표계는 시안과 같은 360×640 공간이다. 실제 렌더 시 Scale.px()를 통과시킨다.
 */

/** 시안 카드 높이 (360 기준) */
export const BASE_H = BASE_W * ASPECT; // 640

/** 눈금자 폭 — 시안 .ruler */
export const RULER_W = 52;

/** 0m 눈금 y */
export const SCALE_TOP = 26;
/** 40m 눈금 y (기본 축 기준) */
export const SCALE_BOTTOM = 486;
/** 축선은 40m 눈금을 지나 계속 내려가며 페이드아웃한다 — 시안 .axis */
export const AXIS_TOP = 26;
export const AXIS_BOTTOM = BASE_H - 26; // 614

const SPAN = SCALE_BOTTOM - SCALE_TOP; // 460

/** major 20m / minor 10m — 축이 늘어나도 다이버가 생각하는 단위를 유지한다 */
export const MAJOR_STEP = 20;
export const MINOR_STEP = 10;

/**
 * 축 최대값. 기본 40m, 넘으면 20 단위로 올린다.
 * (45m → 60, 62m → 80, 100m → 100)
 */
export const pickScaleMax = (maxDepth?: number): number => {
  if (maxDepth == null || maxDepth <= 40) return 40;
  return Math.ceil(maxDepth / MAJOR_STEP) * MAJOR_STEP;
};

export const depthToY = (depth: number, scaleMax: number): number =>
  SCALE_TOP + (depth / scaleMax) * SPAN;

export type Tick = { depth: number; y: number; major: boolean };

export const ticksFor = (scaleMax: number): Tick[] => {
  const out: Tick[] = [];
  for (let d = 0; d <= scaleMax; d += MINOR_STEP) {
    out.push({ depth: d, y: depthToY(d, scaleMax), major: d % MAJOR_STEP === 0 });
  }
  return out;
};
