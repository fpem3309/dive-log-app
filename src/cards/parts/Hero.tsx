import { Text, View } from 'react-native';

import { foamA, hex } from '@/design/tokens';
import { speciesSize, type CardType } from '@/design/type';
import type { Scale } from '@/design/scale';
import type { HeroKind } from '@/model/chooseHero';
import { highlightOf, type Dive } from '@/model/types';

/**
 * 카드 주인공 — CLAUDE.md §3.
 *
 * 숫자와 그 뒤의 단위/조사는 중첩 <Text>로 렌더한다. 시안은 flex + align-items:baseline
 * 으로 붙이지만 RN flex에는 baseline 정렬이 없고, 중첩 Text는 실제 베이스라인으로 붙는다.
 */

type Props = {
  s: Scale;
  type: CardType;
  dive: Dive;
  hero: HeroKind;
  /** 액센트가 kicker로 배정됐는지 (아니면 눈금 마크가 갖는다) */
  kickerAccent: boolean;
};

const Kicker = ({ type, s, on, children }: { type: CardType; s: Scale; on: boolean; children: string }) => (
  <Text style={[type.kicker, { color: on ? hex.point : foamA(0.72), marginBottom: s.px(10) }]}>
    {children}
  </Text>
);

export function Hero({ s, type, dive, hero, kickerAccent }: Props) {
  if (hero === 'species') {
    const sighting = highlightOf(dive)!;
    const size = s.px(speciesSize(sighting.name));
    const kr = [
      sighting.count != null ? `${sighting.count}개체` : null,
      sighting.memo ?? null,
    ].filter(Boolean) as string[];
    const hasSub = !!sighting.scientificName || kr.length > 0;

    return (
      <View>
        <Kicker type={type} s={s} on={kickerAccent}>
          오늘의 하이라이트
        </Kicker>
        <Text
          style={[type.species, { fontSize: size, lineHeight: size * 1.12, letterSpacing: size * -0.03 }]}
          numberOfLines={2}>
          {sighting.name}
        </Text>
        {hasSub && (
          <Text style={{ marginTop: s.px(9) }} numberOfLines={1}>
            {!!sighting.scientificName && <Text style={type.speciesSub}>{sighting.scientificName}</Text>}
            {!!sighting.scientificName && kr.length > 0 && <Text style={type.speciesSub}>{' · '}</Text>}
            {kr.length > 0 && <Text style={type.speciesSubKr}>{kr.join(' · ')}</Text>}
          </Text>
        )}
      </View>
    );
  }

  if (hero === 'depth') {
    return (
      <View>
        <Kicker type={type} s={s} on={kickerAccent}>
          Max depth
        </Kicker>
        <Text style={type.figure}>
          {dive.maxDepth}
          <Text style={type.figureUnit}>m</Text>
        </Text>
      </View>
    );
  }

  if (hero === 'count') {
    return (
      <View>
        <Kicker type={type} s={s} on={kickerAccent}>
          Logged dive
        </Kicker>
        <Text style={type.figure}>
          {dive.diveNumber}
          <Text style={type.figureOrd}>번째</Text>
        </Text>
      </View>
    );
  }

  const kicker = dive.discipline === 'free' ? 'Freedive' : 'Scuba';

  /*
   * date — 아무것도 안 적은 다이브의 최후 폴백 (chooseHero 주석 참조).
   *
   * 크기는 재지 않고 고정한다. 표기가 항상 `YYYY.MM.DD` 10자라 잴 이유가 없다.
   * mono 자간(≈0.6em)으로 10자 × 46 × 0.6 = 276 ≤ 콘텐츠 폭 284. 76(수심형)보다 작고
   * 생물명 대역(26–56) 안이라 §10-㉚의 위계를 그대로 지킨다.
   */
  if (hero === 'date') {
    const size = s.px(46);
    return (
      <View>
        <Kicker type={type} s={s} on={kickerAccent}>
          {kicker}
        </Kicker>
        <Text style={[type.figure, { fontSize: size }]}>{dive.date.replaceAll('-', '.')}</Text>
      </View>
    );
  }

  // site — 수심도 누적 횟수도 없는 다이브. 장소가 주인공이 된다.
  const size = s.px(speciesSize(dive.site));
  return (
    <View>
      <Kicker type={type} s={s} on={kickerAccent}>
        {kicker}
      </Kicker>
      <Text
        style={[type.species, { fontSize: size, lineHeight: size * 1.12, letterSpacing: size * -0.03 }]}
        numberOfLines={2}>
        {dive.site}
      </Text>
    </View>
  );
}
