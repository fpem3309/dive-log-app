import { View } from 'react-native';

import { hasHangul } from '@/design/type';
import { heroLabel, resolveHero, type HeroKind } from '@/model/chooseHero';
import type { Dive } from '@/model/types';
import { Chip } from '@/ui/controls';
import { radius, sp, surface } from '@/ui/theme';

/**
 * 카드 주인공 후보 트레이 — §3 "사용자가 카드에서 탭해서 바꿀 수 있게 한다".
 *
 * ⚠️ **화면 컴포넌트다. src/cards/ 아래로 옮기지 마라.** 카드 컴포넌트는 1080 캡처에도
 * 똑같이 렌더되므로, 선택 UI가 카드 안에 있으면 결과물 PNG에 찍힌다 (§10-①).
 * 그래서 카드 밖, 카드 **바로 아래**에 놓는다 — 위가 아니라 아래인 건 레이아웃 때문이다.
 * 세로 ScrollView에서 아래에 열면 판단 대상(카드)의 y가 안 움직이고 버튼만 밀린다.
 *
 * 색은 전부 화면 팔레트다. 코럴(--point)은 카드 안에만 쓴다 (§5).
 */

type Props = {
  dive: Dive;
  /** 값이 있는 후보만. 2개 미만이면 호출부가 아예 렌더하지 않는다 */
  candidates: HeroKind[];
  /** 카드 폭 — 칩 최대 폭을 여기서 유도한다 */
  width: number;
  onSelect: (kind: HeroKind) => void;
};

export function HeroPicker({ dive, candidates, width, onSelect }: Props) {
  const current = resolveHero(dive);

  return (
    <View
      style={{
        // 그룹의 gap(12)에서 위로 4를 당기고 아래로 4를 밀어 8 : 16을 만든다.
        // "이건 저 카드의 것이지 버튼의 것이 아니다"를 간격이 말한다.
        marginTop: -sp.xs,
        marginBottom: sp.xs,
        backgroundColor: surface.sunken,
        borderWidth: 1,
        borderColor: surface.line,
        borderRadius: radius.md,
        padding: sp.md,
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: sp.sm,
      }}>
      {candidates.map((kind) => {
        const label = heroLabel(dive, kind);
        return (
          <Chip
            key={kind}
            label={label}
            selected={kind === current}
            filled
            truncate
            // 트레이 좌우 패딩을 뺀 나머지. 넘치면 한 줄 말줄임 — 2줄 칩을 만들면
            // 칩 높이가 제각각이 되어 줄이 울퉁불퉁해진다.
            maxWidth={width - sp.md * 2}
            // mono에 한글 글리프가 없다 (§10-⑫). "38m"은 계기판 결로, "313번째"·
            // "가시해마"는 Pretendard로 받는다. 여기서는 자동 판정한다.
            mono={!hasHangul(label)}
            onPress={() => onSelect(kind)}
            testID={`hero-chip-${dive.id}-${kind}`}
          />
        );
      })}
    </View>
  );
}
