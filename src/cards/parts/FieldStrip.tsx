import { Text, View } from 'react-native';

import { color } from '@/design/tokens';
import type { Scale } from '@/design/scale';
import type { CardType } from '@/design/type';
import type { Cell } from './fields';

/**
 * 하단 정보 칸 — 시안 .strip / .cell.
 *
 * 칸이 0개면 구분선까지 통째로 렌더하지 않는다. 안 그러면 선만 덩그러니 남아서
 * "여기 뭔가 있었는데 비었다"고 티가 난다 (§2-② 위반). 필수 3개만 적은 다이브가
 * 실제로 이 경우다.
 */

type Props = { s: Scale; type: CardType; cells: Cell[] };

export function FieldStrip({ s, type, cells }: Props) {
  if (cells.length === 0) return null;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: s.px(12),
        marginTop: s.px(20),
        paddingTop: s.px(14),
        borderTopWidth: s.px(1),
        borderTopColor: color.line,
      }}>
      {cells.map((c) => (
        <View key={c.key} style={{ flex: 1, minWidth: 0 }}>
          <Text style={[type.cellKey, { marginBottom: s.px(6) }]} numberOfLines={1}>
            {c.label}
          </Text>
          {/* 중첩 Text — RN flex에는 baseline 정렬이 없지만 중첩 Text는 베이스라인으로 붙는다 */}
          <Text style={type.cellValue} numberOfLines={1}>
            {c.segs.map((seg, i) => (
              <Text key={i} style={seg.small ? type.cellUnit : undefined}>
                {seg.t}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </View>
  );
}
