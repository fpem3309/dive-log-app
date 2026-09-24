import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { dangerA, hex, inkA } from '@/design/tokens';
import { hit, radius, sp, surface, t } from './theme';

/**
 * 선택 가능한 칩. 날짜·생물 제안·종목 등에 두루 쓴다.
 *
 * `filled`·`truncate`·`maxWidth`는 전부 기본이 꺼져 있다 — 아무것도 넘기지 않으면
 * 지금까지와 100% 같은 칩이다. 특히 `truncate`를 기본으로 켜면 안 된다:
 * SightingsEditor의 긴 생물명 제안 칩이 2줄로 늘어나는 지금 동작이 말줄임으로 바뀐다.
 */
export function Chip({
  label,
  selected,
  onPress,
  mono,
  style,
  filled,
  truncate,
  maxWidth,
  testID,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** 숫자·날짜처럼 계기판 느낌이 맞는 것 */
  mono?: boolean;
  style?: ViewStyle;
  /**
   * 채움 변형 — 선택 상태가 "여럿 중 하나가 켜졌다"가 아니라 **"지금 이게 쓰이고 있다"**
   * 인 자리에 쓴다 (카드 주인공 고르기). 테두리 대신 액센트로 꽉 채워 한눈에 잡힌다.
   * 흰 칩이 sunken 면 위에 떠 있고 그중 하나만 잠긴 형태라 세그먼티드로 읽힌다.
   */
  filled?: boolean;
  /** 넘치면 한 줄 말줄임. 칩 높이를 고르게 유지해야 하는 줄에서만 켠다 */
  truncate?: boolean;
  maxWidth?: number;
  testID?: string;
}) {
  const on = !!selected;
  return (
    <Pressable
      onPress={onPress}
      // 채움 칩은 세로 38px이라 위아래로 8씩 벌려 54를 만든다. 좌우 4는 gap 8의 절반이라
      // 이웃 칩과 겹치지 않는다.
      hitSlop={filled ? { top: 8, bottom: 8, left: 4, right: 4 } : 6}
      accessibilityRole="button"
      // 고르는 칩에만 선택 상태를 알린다 — 생물 제안 칩처럼 selected를 안 넘기는 곳에
      // "선택 안 됨"이 붙으면 오히려 틀린 정보가 된다
      accessibilityState={selected == null ? undefined : { selected: on }}
      testID={testID}
      style={({ pressed }) => [
        {
          paddingVertical: filled ? 9 : 7,
          paddingHorizontal: 13,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: on ? surface.accent : filled ? surface.line : surface.lineStrong,
          backgroundColor: filled
            ? on
              ? surface.accent
              : surface.raised
            : on
              ? 'rgba(29,95,176,0.08)'
              : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
        maxWidth != null && { maxWidth },
        style,
      ]}>
      <Text
        numberOfLines={truncate ? 1 : undefined}
        ellipsizeMode={truncate ? 'tail' : undefined}
        style={[
          mono ? t.chipMono : t.chip,
          // ⚠️ 선택돼도 **굵기를 바꾸지 않는다 — 색만 바꾼다.**
          // Pretendard·IBM Plex Mono는 weight마다 별도 패밀리라 fontWeight가 네이티브에서
          // 안 먹는데(§10-⑩) react-native-web은 CSS라 먹는다 — 웹에서만 굵어져 갈렸다.
          // 게다가 굵어지면 글자 폭이 변해 고를 때마다 줄바꿈이 다시 계산되고 칩이
          // 손가락 밑에서 움직인다.
          on && (filled ? { color: '#FFFFFF' } : { color: surface.accent }),
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 종목처럼 둘 중 하나를 고르는 것 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T | undefined;
  onChange: (v: T) => void;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: surface.line,
        overflow: 'hidden',
      }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => ({
              flex: 1,
              paddingVertical: 11,
              alignItems: 'center',
              backgroundColor: on ? 'rgba(15,90,100,0.12)' : 'transparent',
              opacity: pressed ? 0.6 : 1,
            })}>
            {/* 굵기를 바꾸지 않는다 — 웹에서만 먹어서 실기기와 갈린다 (§10-㊵) */}
            <Text style={[t.chip, on && { color: surface.accent }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'ghost',
  style,
  disabled,
}: {
  label: string;
  onPress?: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: surface.accent, border: surface.accent, fg: '#FFFFFF' },
    ghost: { bg: 'transparent', border: surface.lineStrong, fg: inkA(0.78) },
    danger: { bg: 'transparent', border: dangerA(0.5), fg: hex.danger },
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hit}
      style={({ pressed }) => [
        {
          paddingVertical: 12,
          paddingHorizontal: 18,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: palette.border,
          backgroundColor: palette.bg,
          alignItems: 'center',
          opacity: disabled ? 0.35 : pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <Text style={[t.button, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** 하트 — "의미 있는 생물"은 사용자가 정한다 (CLAUDE.md §2-④) */
export function HeartToggle({ on, onPress }: { on: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hit}
      accessibilityRole="button"
      accessibilityLabel={on ? '하이라이트 해제' : '하이라이트로 지정'}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, padding: 2 })}>
      <Text style={{ fontSize: 19, color: on ? surface.accent : inkA(0.34) }}>{on ? '♥' : '♡'}</Text>
    </Pressable>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <View style={[{ height: 1, backgroundColor: surface.line }, style]} />;
}

/** 섹션 라벨 + 내용 */
export function Section({
  label,
  children,
  style,
}: {
  label?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    <View style={[{ gap: sp.md }, style]}>
      {!!label && <Text style={t.label}>{label}</Text>}
      {children}
    </View>
  );
}
