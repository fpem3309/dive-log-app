import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { dangerA, hex, inkA } from '@/design/tokens';
import { hit, radius, sp, surface, t } from './theme';

/** 선택 가능한 칩. 날짜·생물 제안·종목 등에 두루 쓴다. */
export function Chip({
  label,
  selected,
  onPress,
  mono,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  /** 숫자·날짜처럼 계기판 느낌이 맞는 것 */
  mono?: boolean;
  style?: ViewStyle;
}) {
  const on = !!selected;
  return (
    <Pressable
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [
        {
          paddingVertical: 7,
          paddingHorizontal: 13,
          borderRadius: radius.pill,
          borderWidth: 1,
          borderColor: on ? surface.accent : surface.lineStrong,
          backgroundColor: on ? 'rgba(29,95,176,0.08)' : 'transparent',
          opacity: pressed ? 0.6 : 1,
        },
        style,
      ]}>
      <Text
        style={[mono ? t.chipMono : t.chip, on && { color: surface.accent, fontWeight: '600' }]}>
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
            <Text style={[t.chip, on && { color: surface.accent, fontWeight: '600' }]}>
              {o.label}
            </Text>
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
