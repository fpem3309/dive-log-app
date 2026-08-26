import { useState, type RefObject } from 'react';
import { StyleSheet, View } from 'react-native';

import { hex } from '@/design/tokens';
import { makeScale } from '@/design/scale';
import { makeType } from '@/design/type';
import { accentTarget, resolveHero } from '@/model/chooseHero';
import type { Dive } from '@/model/types';
import { DepthRuler } from './layers/DepthRuler';
import { PhotoLayer } from './layers/PhotoLayer';
import { WaterColumn } from './layers/WaterColumn';
import { Hero } from './parts/Hero';
import { FieldStrip } from './parts/FieldStrip';
import { MetaRow } from './parts/MetaRow';
import { cellsFor } from './parts/fields';

/**
 * 로그 카드.
 *
 * width 하나만 받고 나머지 치수는 전부 makeScale()로 유도한다. 덕분에 화면에서는
 * 화면 폭으로, 저장할 때는 1080으로 같은 컴포넌트를 렌더할 수 있다 (뷰를 확대하는 게
 * 아니라 1080 해상도로 진짜 렌더하는 것이라 글자가 뭉개지지 않는다).
 *
 * 레이어 순서는 시안과 같다: 배경(사진 또는 물기둥) → 눈금자 → 내용.
 */

type Props = {
  dive: Dive;
  /** 트립에서 내려온 지역명 */
  region?: string;
  width: number;
  cardRef?: RefObject<View | null>;
};

export function DiveCard({ dive, region, width, cardRef }: Props) {
  const s = makeScale(width);
  const type = makeType(s);
  // 사용자가 고른 게 있으면 그것, 없거나 무효면 자동 규칙 (chooseHero.ts)
  const hero = resolveHero(dive);
  const target = accentTarget(dive, hero);
  const cells = cellsFor(dive, hero);

  /**
   * 히어로 블록의 상단 y — 눈금 마크에서 히어로까지 리드선을 잇는 데 쓴다.
   * 히어로는 marginTop:'auto'로 앉아서 위치를 미리 계산할 수 없어 재야 한다.
   * 부모가 카드 전체를 덮는 absoluteFill이라 layout.y가 곧 카드 좌표(패딩 포함)이고,
   * s.u로 나눠 시안 360 좌표계로 되돌린다.
   *
   * 레이아웃 → 상태 → 재렌더가 한 번 더 도는데, 저장 경로는 화면 밖 카드를 캡처하기 전에
   * 이미 두 프레임을 기다린다 (app/trip/[id]/cards.tsx) — 캡처 시점에는 반영돼 있다.
   */
  const [heroTop, setHeroTop] = useState<number | null>(null);

  return (
    <View
      ref={cardRef}
      // Android에서 뷰가 평탄화돼 캡처 대상이 사라지는 것을 막는다
      collapsable={false}
      style={{
        width: s.w,
        height: s.h,
        borderRadius: s.px(20),
        overflow: 'hidden',
        backgroundColor: hex.deep,
      }}>
      {dive.photo ? (
        <PhotoLayer s={s} photo={dive.photo} />
      ) : (
        <WaterColumn s={s} maxDepth={dive.maxDepth} />
      )}

      <DepthRuler
        s={s}
        type={type}
        maxDepth={dive.maxDepth}
        markColor={target === 'mark' ? hex.point : hex.foam}
        leadTo={heroTop}
      />

      <View
        style={[
          StyleSheet.absoluteFill,
          {
            paddingTop: s.px(26),
            paddingRight: s.px(24),
            paddingBottom: s.px(26),
            paddingLeft: s.px(52), // 눈금자 폭만큼 비운다
          },
        ]}>
        {/* 히어로로 올라간 값은 위에서 뺀다. 빈 장소도 빼야 region이 헛되이 밀려나지 않는다 */}
        <MetaRow
          s={s}
          type={type}
          dive={dive}
          region={region}
          showPlace={hero !== 'site' && dive.site.trim().length > 0}
          showDate={hero !== 'date'}
        />
        <View
          style={{ marginTop: 'auto' }}
          onLayout={(e) => setHeroTop(e.nativeEvent.layout.y / s.u)}>
          <Hero s={s} type={type} dive={dive} hero={hero} kickerAccent={target === 'kicker'} />
          <FieldStrip s={s} type={type} cells={cells} />
        </View>
      </View>
    </View>
  );
}
