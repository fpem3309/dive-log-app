import { useId } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import { hex, scrimStops } from '@/design/tokens';
import { svgIds, type Scale } from '@/design/scale';
import type { Dive } from '@/model/types';

/**
 * 사진 + scrim.
 *
 * 사진은 cover로 채우고 그 위에 시안 .scrim의 4스톱 그라데이션을 얹는다.
 * 위(장소·날짜)와 아래(히어로·정보 칸)의 글자가 어떤 사진에서도 읽히게 하는 장치라
 * 스톱 값을 임의로 줄이면 안 된다.
 *
 * expo-image 대신 RN Image를 쓴다 — react-native-view-shot으로 캡처할 때
 * 기본 Image 쪽이 더 안전하다.
 */

type Props = { s: Scale; photo: NonNullable<Dive['photo']> };

export function PhotoLayer({ s, photo }: Props) {
  // 웹에서 id가 문서 전역이라 카드마다 갈라 준다 — svgIds 주석 참조
  const id = svgIds(useId(), 'scrim');
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Image source={photo} style={{ width: s.w, height: s.h }} resizeMode="cover" />
      <Svg width={s.w} height={s.h} style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={id.scrim} x1="0" y1="0" x2="0" y2="1">
            {scrimStops.map((st) => (
              <Stop key={st.offset} offset={st.offset} stopColor={hex.abyss} stopOpacity={st.opacity} />
            ))}
          </LinearGradient>
        </Defs>
        <Rect x={0} y={0} width={s.w} height={s.h} fill={`url(#${id.scrim})`} />
      </Svg>
    </View>
  );
}
