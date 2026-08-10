import { useId } from 'react';
import Svg, { Defs, G, LinearGradient, RadialGradient, Rect, Stop } from 'react-native-svg';

import { columnScrimStops, columnStops, hex } from '@/design/tokens';
import { BASE_H } from './depthScale';
import { BASE_W, svgIds } from '@/design/scale';
import type { Scale } from '@/design/scale';

/**
 * 사진이 없을 때의 배경 — 물기둥.
 *
 * CLAUDE.md §5: "대체 이미지나 아이콘을 넣지 마라. 수심에 따라 아래쪽이 어두워지는
 * 물기둥 그라데이션이 배경이 되고, 눈금자와 숫자가 주인공이 된다."
 *
 * ⚠️ 시안의 .column은 고정 그라데이션이라 이 규칙이 구현돼 있지 않다. 스펙 쪽을 따라
 * 깊이로 보간한다. 기준은 축 최대값이 아니라 절대 수심 40m다 — 축이 60으로 늘어났다고
 * 45m 다이브가 40m보다 밝아지면 안 되기 때문.
 */

/** 이 깊이에서 가장 어둡다 */
const REF_DEPTH = 40;
/** 수심을 안 적었을 때의 중립값 (시안의 고정 그라데이션과 비슷한 밝기) */
const NEUTRAL_T = 0.45;

const hexToRgb = (h: string) => [
  parseInt(h.slice(1, 3), 16),
  parseInt(h.slice(3, 5), 16),
  parseInt(h.slice(5, 7), 16),
];
const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
const lerpHex = ([a, b]: readonly [string, string], t: number) => {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  return `#${toHex(r1 + (r2 - r1) * t)}${toHex(g1 + (g2 - g1) * t)}${toHex(b1 + (b2 - b1) * t)}`;
};

/**
 * 시안 .caustic — 102deg / 78deg 두 겹의 얇은 사선.
 * 두 겹은 굵기·간격·기울기가 다르고, 세로 페이드 그라데이션은 겹마다 따로 쓴다.
 */
const causticLines = () => {
  const out: { x: number; w: number; skew: number; grad: 'caustic0' | 'caustic1' }[] = [];
  for (let x = -120; x < BASE_W + 120; x += 26) {
    out.push({ x, w: 2, skew: -9.5, grad: 'caustic0' }); // 102deg
  }
  for (let x = -120; x < BASE_W + 120; x += 19) {
    out.push({ x, w: 1, skew: 9.5, grad: 'caustic1' }); // 78deg
  }
  return out;
};
const LINES = causticLines();

/**
 * 겹별 최대 불투명도.
 * 시안은 .11/.08 인데 여기에 상단 마스크(0.68)가 곱해져 실효 최대가 0.075였다 —
 * 사실상 안 보이면서 <Rect> 55개를 쓰고 있었다. 물기둥이 채도를 되찾았으니
 * 이제 값이 있다. 물이 물처럼 읽히는 데 기여하는 만큼 올린다.
 */
const CAUSTIC_OP = [0.16, 0.11];

/*
 * 코스틱이 덮는 범위는 시안 CSS를 그대로 풀어서 구한다.
 *   .caustic { inset:-20% ... auto ...; height:62%; mask: 0%→#000, 100%→transparent }
 * 요소는 카드 y=-20%에서 시작해 62% 높이이므로 y=+42%에서 끝난다. 즉 카드 안에서
 * 보이는 건 위 42%뿐이고, 마스크는 요소 기준이라 카드 상단(요소의 32% 지점)에서
 * 이미 1-0.32=0.68로 시작한다. "62%"를 그대로 쓰면 시안보다 훨씬 길고 진해진다.
 */
const CAUSTIC_H = BASE_H * 0.42;
const CAUSTIC_TOP_MASK = 0.68;

type Props = { s: Scale; maxDepth?: number };

export function WaterColumn({ s, maxDepth }: Props) {
  const t = maxDepth == null ? NEUTRAL_T : Math.min(1, Math.max(0, maxDepth / REF_DEPTH));
  /**
   * 웹에서 id는 문서 전역이라 카드를 여러 장 그리면 전부 1번 카드의 그라데이션을 쓴다.
   * 하필 여기가 깊이별 색을 만드는 곳이라, 갈라 주지 않으면 §10-⑤("깊이 들어간 날일수록
   * 어둡다")가 통째로 죽는다 — 18m 카드와 38m 카드가 같아진다. svgIds 주석 참조.
   */
  const id = svgIds(useId(), 'col', 'sun', 'colScrim', 'caustic0', 'caustic1');

  return (
    <Svg
      width={s.w}
      height={s.h}
      viewBox={`0 0 ${BASE_W} ${BASE_H}`}
      style={{ position: 'absolute', left: 0, top: 0 }}>
      <Defs>
        <LinearGradient id={id.col} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={lerpHex(columnStops.top, t)} />
          <Stop offset="0.46" stopColor={lerpHex(columnStops.mid, t)} />
          <Stop offset="1" stopColor={lerpHex(columnStops.bottom, t)} />
        </LinearGradient>

        {/* 수면 광원 — 시안 radial-gradient(120% 68% at 50% -12%) */}
        <RadialGradient id={id.sun} cx="0.5" cy="-0.12" rx="0.6" ry="0.34">
          <Stop offset="0" stopColor={columnStops.sun.color} stopOpacity={columnStops.sun.opacity} />
          <Stop offset="0.34" stopColor={columnStops.haze.color} stopOpacity={columnStops.haze.opacity} />
          <Stop offset="0.62" stopColor={columnStops.haze.color} stopOpacity={0} />
        </RadialGradient>

        {/*
          시안은 mask-image로 아래로 갈수록 사라지게 하지만, react-native-svg의 <Mask>는
          플랫폼마다 결과가 갈린다(웹에서 아예 안 먹어 선이 카드 전체를 덮었다).
          선 자체를 세로 페이드 그라데이션으로 칠하면 마스크 없이 같은 결과가 나온다.
        */}
        <LinearGradient id={id.colScrim} x1="0" y1="0" x2="0" y2="1">
          {columnScrimStops.map((st) => (
            <Stop key={st.offset} offset={st.offset} stopColor={hex.abyss} stopOpacity={st.opacity} />
          ))}
        </LinearGradient>

        {CAUSTIC_OP.map((op, i) => (
          <LinearGradient key={i} id={i === 0 ? id.caustic0 : id.caustic1} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={columnStops.sun.color} stopOpacity={op * CAUSTIC_TOP_MASK} />
            <Stop offset="1" stopColor={columnStops.sun.color} stopOpacity={0} />
          </LinearGradient>
        ))}
      </Defs>

      <Rect x={0} y={0} width={BASE_W} height={BASE_H} fill={`url(#${id.col})`} />
      <Rect x={0} y={0} width={BASE_W} height={BASE_H} fill={`url(#${id.sun})`} />
      {/* 글자가 앉는 위·아래만 눌러 준다 — 가운데 물빛은 살린다 */}
      <Rect x={0} y={0} width={BASE_W} height={BASE_H} fill={`url(#${id.colScrim})`} />

      {/*
        시안은 mix-blend-mode:screen 인데 RN에 대응물이 없다. 어두운 배경 위에
        밝은 색을 낮은 알파로 얹으면 screen과 거의 같은 결과라 그대로 둔다.
        애니메이션(@keyframes drift)은 뺐다 — 결과물이 캡처된 정지 PNG라 나타나지 않는다.
      */}
      <G>
        {LINES.map((l, i) => (
          <Rect
            key={i}
            x={l.x}
            y={0}
            width={l.w}
            height={CAUSTIC_H}
            fill={`url(#${id[l.grad]})`}
            transform={`skewX(${l.skew})`}
          />
        ))}
      </G>
    </Svg>
  );
}
