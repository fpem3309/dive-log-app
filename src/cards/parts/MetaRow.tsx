import { Text, View } from 'react-native';

import type { Scale } from '@/design/scale';
import { hasHangul, type CardType } from '@/design/type';
import type { Dive } from '@/model/types';
import { formatDate } from './fields';

/**
 * 카드 상단 — 장소·지역 / 날짜·시각. 시안 .meta.
 *
 * 장소가 히어로로 올라간 카드(site형)에서는 여기서 빼서 같은 글자가 두 번 나오지 않게 한다.
 * 날짜(date형)도 마찬가지 — 다만 시각은 히어로가 안 가져가므로 여기 남는다.
 * 시각은 optional이라 없으면 줄이 하나로 줄어든다.
 */

type Props = {
  s: Scale;
  type: CardType;
  dive: Dive;
  region?: string;
  showPlace: boolean;
  /** 날짜가 히어로로 올라갔으면 여기선 뺀다 */
  showDate: boolean;
};

export function MetaRow({ s, type, dive, region, showPlace, showDate }: Props) {
  const right = [showDate ? formatDate(dive.date) : null, dive.time || null].filter(Boolean);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: s.px(10) }}>
      <View style={{ flex: 1, minWidth: 0 }}>
        {showPlace && (
          <Text style={type.place} numberOfLines={1}>
            {dive.site}
          </Text>
        )}
        {!!region && (
          <Text
            style={[
              hasHangul(region) ? type.regionKr : type.region,
              showPlace && { marginTop: s.px(5) },
            ]}
            numberOfLines={1}>
            {region}
          </Text>
        )}
      </View>
      {right.length > 0 && (
        <Text style={[type.date, { textAlign: 'right' }]}>{right.join('\n')}</Text>
      )}
    </View>
  );
}
