import { useId } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { hex } from '@/design/tokens';
import { BASE_W, svgIds, type Scale } from '@/design/scale';
import type { CardType } from '@/design/type';
import {
  AXIS_BOTTOM,
  AXIS_TOP,
  BASE_H,
  depthToY,
  pickScaleMax,
  ticksFor,
} from './depthScale';

/**
 * 수심 눈금자 — 이 앱의 서명 (CLAUDE.md §5).
 *
 * SVG viewBox를 시안과 같은 360×640 좌표계로 두면 시안의 치수를 그대로 쓰면서도
 * 실제 렌더 크기는 카드 폭을 따라간다. 상수를 베끼는 게 아니라 좌표계를 맞추는 것.
 *
 * ⚠️ 굵기는 시안보다 굵다. 시안 값(축 1px·투명도 .45→.06, 눈금 1px, 마크 r=3)은
 * 카드를 360px로 볼 때의 값인데, 스토리를 피드에서 보는 폭은 ~300px이라 거기서
 * 전부 1px 미만·10% 미만이 되어 사라진다. **서명이 소비되는 크기에서 안 보이면
 * 서명이 아니다.** 줄이지 마라.
 *
 * maxDepth가 없으면 축과 눈금은 그대로 두고 마크·채움·리드선만 그리지 않는다.
 * 눈금자는 값을 요구하는 게이지가 아니라 페이드되는 축이라 비어도 망가져 보이지 않는다.
 */

/** 축선 x — 채움과 마크가 이 위에 앉는다 */
const AXIS_X = 25;
/** 채움 축 폭 */
const FILL_W = 2.5;

type Props = {
  s: Scale;
  type: CardType;
  maxDepth?: number;
  /** 액센트는 카드당 한 곳 — 이 마크가 그 자리인지 (chooseHero.accentTarget) */
  markColor: string;
  /**
   * 히어로 블록 상단 y (360 좌표계). 주면 마크에서 히어로까지 리드선을 잇는다.
   * DiveCard가 onLayout으로 재서 넘긴다 — 히어로는 flex로 앉아서 여기서 계산할 수 없다.
   */
  leadTo?: number | null;
};

export function DepthRuler({ s, type, maxDepth, markColor, leadTo }: Props) {
  // 카드를 여러 장 렌더할 때 웹에서 id가 충돌한다 — svgIds 주석 참조
  const id = svgIds(useId(), 'axis', 'markline', 'lead');
  const scaleMax = pickScaleMax(maxDepth);
  const ticks = ticksFor(scaleMax);
  const markY = maxDepth != null ? depthToY(maxDepth, scaleMax) : null;

  /** 마크가 액센트를 가진 카드인지 — 채움 세기와 리드선 유무를 가른다 */
  const isAccent = markColor === hex.point;

  /**
   * 리드선은 액센트 카드에서만 그린다. 생물형에서는 눈금자가 생물을 가리키는 셈이라
   * 뜻이 맞지 않고, 이름이 커져서 가운데가 이미 차 있다.
   * 얕은 다이브라 마크가 히어로에 붙으면 그리지 않는다.
   */
  const lead =
    isAccent && markY != null && leadTo != null && leadTo > markY + 14 ? leadTo : null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg width={s.w} height={s.h} viewBox={`0 0 ${BASE_W} ${BASE_H}`}>
        <Defs>
          <LinearGradient id={id.axis} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={hex.foam} stopOpacity={0.5} />
            <Stop offset="1" stopColor={hex.foam} stopOpacity={0.14} />
          </LinearGradient>
          <LinearGradient id={id.markline} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={markColor} stopOpacity={0.7} />
            <Stop offset="1" stopColor={markColor} stopOpacity={0} />
          </LinearGradient>
          {/*
            리드선은 채움 축보다 훨씬 약해야 한다. 같은 세기로 두면 마크 위(채움)와
            아래(리드)가 한 줄로 붙어 보여서 "채운 만큼이 깊이"라는 읽기가 죽는다 —
            18m 카드와 24.5m 카드가 똑같이 "가득 찬" 것처럼 보였다.
          */}
          <LinearGradient id={id.lead} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={markColor} stopOpacity={0.22} />
            <Stop offset="1" stopColor={markColor} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* 축 — 40m 눈금을 지나 계속 내려가며 사라진다 */}
        <Rect
          x={AXIS_X}
          y={AXIS_TOP}
          width={1.5}
          height={AXIS_BOTTOM - AXIS_TOP}
          fill={`url(#${id.axis})`}
        />

        {/* 눈금 */}
        {ticks.map((t) => (
          <Rect
            key={t.depth}
            x={t.major ? 14 : 18}
            y={t.y}
            width={t.major ? 19 : 15}
            height={1.5}
            fill={hex.foam}
            fillOpacity={t.major ? 0.62 : 0.36}
          />
        ))}

        {/*
          수면(0m)부터 마크까지를 채운다 — "깊이 = 면적".
          점은 축소에 가장 약한 형태라 마크만으로는 썸네일에서 사라진다. 면적은 남는다.
          §5의 "액센트는 카드당 한 곳"은 지킨다: 채움·마크·markline은 자리가 셋인 게
          아니라 **하나의 수심 지시자**이고, 그 한 자리의 면적이 커진 것이다.
        */}
        {markY != null && (
          <>
            <Rect
              x={AXIS_X - (FILL_W - 1.5) / 2}
              y={AXIS_TOP}
              width={FILL_W}
              height={markY - AXIS_TOP}
              fill={markColor}
              fillOpacity={isAccent ? 0.9 : 0.28}
            />
            {/* 카드를 가로지르는 수심선 — 가운데 공백을 지나며 오른쪽으로 사라진다 */}
            <Rect
              x={35}
              y={markY - 0.75}
              width={BASE_W - 35}
              height={1.5}
              fill={`url(#${id.markline})`}
            />
            <Circle
              cx={AXIS_X + 1}
              cy={markY}
              r={9}
              stroke={markColor}
              strokeOpacity={0.55}
              strokeWidth={1.5}
              fill="none"
            />
            <Circle cx={AXIS_X + 1} cy={markY} r={4.5} fill={markColor} />
          </>
        )}

        {/*
          마크 → 히어로 리드선. 축을 따라 내려가다 히어로 글자 쪽으로 꺾는다.
          이게 없으면 마크(카드 중앙)와 히어로 숫자(하단)를 읽는 사람이 연결하지 못해서
          눈금자가 정보가 아니라 장식이 된다.
        */}
        {lead != null && markY != null && (
          <>
            <Rect
              x={AXIS_X - (FILL_W - 1.5) / 2}
              y={markY + 10}
              width={1.5}
              height={lead - markY - 18}
              fill={`url(#${id.lead})`}
            />
            {/* 히어로 텍스트는 x=52에서 시작한다 — 축에서 거기까지 짧게 건넌다 */}
            <Rect
              x={AXIS_X}
              y={lead - 8}
              width={46 - AXIS_X}
              height={1.5}
              fill={markColor}
              fillOpacity={0.12}
            />
          </>
        )}
      </Svg>

      {/* 눈금 라벨은 RN Text로 — SVG <Text>의 폰트 해석이 Android에서 불안정하다 */}
      {ticks
        .filter((t) => t.major)
        .map((t) => (
          <Text
            key={t.depth}
            style={[
              type.tickLabel,
              {
                position: 'absolute',
                left: 0,
                width: s.px(12),
                textAlign: 'right',
                top: s.px(t.y) - (type.tickLabel.fontSize ?? 0) * 0.7,
              },
            ]}>
            {t.depth}
          </Text>
        ))}
    </View>
  );
}
