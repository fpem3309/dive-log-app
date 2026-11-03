import { Pressable, Text, View, type ViewStyle } from 'react-native';

import { hex, inkA } from '@/design/tokens';
import { hit, radius, shadow, sp, surface, t } from './theme';

/*
 * ⚠️ 여기서 `./icons`(react-native-svg)를 import하지 마라. `Confirm`이 이 파일의 `Button`을
 * 쓰고, `test/confirm.test.tsx`가 `Confirm`을 실제로 렌더한다 — react-native-svg는 vitest에서
 * 로드되지 않는다. 아이콘은 호출부가 `icon`으로 넘긴다.
 */

/**
 * 선택 가능한 칩. 날짜·생물 제안·종목 등에 두루 쓴다.
 *
 * 두 가지 얼굴이 있다:
 * - **고르는 칩** (`selected`를 넘김) — 채운 면 위에 떠 있고, 고르면 선택 면으로 바뀐다.
 * - **누르면 무언가 생기는 칩** (`selected`를 안 넘김, 생물 제안) — 흰 면에 옅은 테두리.
 *   고를 수 있는 것과 누르면 추가되는 것이 같은 모양이면 안 된다.
 *
 * `filled`·`truncate`·`maxWidth`는 전부 기본이 꺼져 있다. 특히 `truncate`를 기본으로
 * 켜면 안 된다: SightingsEditor의 긴 생물명 제안 칩이 2줄로 늘어나는 지금 동작이
 * 말줄임으로 바뀐다.
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
  /** 숫자·날짜 — 같은 글꼴에 고정폭 숫자 */
  mono?: boolean;
  style?: ViewStyle;
  /**
   * 채움 변형 — 선택 상태가 "여럿 중 하나가 켜졌다"가 아니라 **"지금 이게 쓰이고 있다"**
   * 인 자리에 쓴다 (카드 주인공 고르기). 액센트로 꽉 채워 한눈에 잡힌다.
   * 흰 칩이 채운 트레이 위에 떠 있고 그중 하나만 잠긴 형태라 세그먼티드로 읽힌다.
   */
  filled?: boolean;
  /** 넘치면 한 줄 말줄임. 칩 높이를 고르게 유지해야 하는 줄에서만 켠다 */
  truncate?: boolean;
  maxWidth?: number;
  testID?: string;
}) {
  const on = !!selected;
  const action = selected == null && !filled;
  return (
    <Pressable
      onPress={onPress}
      // 칩은 세로 38px 남짓이라 위아래로 벌려 44를 넘긴다. 좌우는 gap 8의 절반이라
      // 이웃 칩과 겹치지 않는다.
      hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
      accessibilityRole="button"
      // 고르는 칩에만 선택 상태를 알린다 — 생물 제안 칩처럼 selected를 안 넘기는 곳에
      // "선택 안 됨"이 붙으면 오히려 틀린 정보가 된다
      accessibilityState={selected == null ? undefined : { selected: on }}
      testID={testID}
      style={({ pressed }) => [
        {
          paddingVertical: 9,
          paddingHorizontal: 14,
          borderRadius: action ? radius.pill : 14,
          backgroundColor: filled
            ? on
              ? surface.accent
              : surface.raised
            : action
              ? surface.raised
              : on
                ? surface.selected
                : surface.field,
          opacity: pressed ? 0.6 : 1,
        },
        action && { borderWidth: 1.5, borderColor: surface.lineStrong },
        filled && !on && { boxShadow: shadow.small },
        maxWidth != null && { maxWidth },
        style,
      ]}>
      <Text
        numberOfLines={truncate ? 1 : undefined}
        ellipsizeMode={truncate ? 'tail' : undefined}
        style={[
          mono ? t.chipMono : t.chip,
          // ⚠️ 선택돼도 **굵기를 바꾸지 않는다 — 색만 바꾼다.** (§10-㊵)
          // Pretendard는 weight마다 별도 패밀리라 fontWeight가 네이티브에서 안 먹는데
          // react-native-web은 CSS라 먹는다 — 웹에서만 굵어져 갈렸다.
          // 게다가 굵어지면 글자 폭이 변해 고를 때마다 줄바꿈이 다시 계산되고 칩이
          // 손가락 밑에서 움직인다.
          on && (filled ? { color: '#FFFFFF' } : { color: surface.accent }),
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

/** 종목처럼 둘 중 하나를 고르는 것 — 채운 트랙 위에 흰 알약이 올라앉는다 */
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
      accessibilityRole="radiogroup"
      style={{
        flexDirection: 'row',
        padding: 4,
        borderRadius: 18,
        backgroundColor: surface.field,
      }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => [
              {
                flex: 1,
                height: 44,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? surface.raised : 'transparent',
                opacity: pressed ? 0.6 : 1,
              },
              on && { boxShadow: shadow.small },
            ]}>
            {/* 굵기를 바꾸지 않는다 — 웹에서만 먹어서 실기기와 갈린다 (§10-㊵) */}
            <Text style={[t.chip, { fontSize: 15, color: on ? hex.deep : inkA(0.66) }]}>
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
  icon,
}: {
  label: string;
  onPress?: () => void;
  /** 글자 앞 아이콘 — "새 트립"·"다이브 추가"처럼 무언가 생기는 버튼에만 */
  icon?: React.ReactNode;
  /**
   * - primary — 화면에서 제일 중요한 한 가지. 액센트로 채우고 그림자로 띄운다.
   * - ghost — 보조. 옅은 물빛 면. 흰 면 위·배경 위 어디서나 보인다.
   * - danger — 지우기. 옅은 붉은 면.
   * - add — 목록에 하나 더하기. 점선 테두리가 "여기에 생긴다"를 말한다.
   */
  variant?: 'primary' | 'ghost' | 'danger' | 'add';
  style?: ViewStyle;
  disabled?: boolean;
}) {
  const palette = {
    primary: { bg: surface.accent, fg: '#FFFFFF' },
    ghost: { bg: surface.tint, fg: hex.deep },
    danger: { bg: surface.dangerSoft, fg: hex.danger },
    add: { bg: 'rgba(29,95,176,0.05)', fg: surface.accent },
  }[variant];
  const big = variant === 'primary' || variant === 'add';

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      hitSlop={hit}
      accessibilityRole="button"
      style={({ pressed }) => [
        {
          minHeight: big ? 56 : 50,
          paddingHorizontal: 20,
          borderRadius: big ? 20 : radius.md,
          backgroundColor: palette.bg,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sp.sm,
          opacity: disabled ? 0.35 : pressed ? 0.7 : 1,
        },
        variant === 'primary' && !disabled && { boxShadow: shadow.primary },
        variant === 'add' && {
          borderWidth: 2,
          borderStyle: 'dashed',
          borderColor: 'rgba(29,95,176,0.3)',
        },
        style,
      ]}>
      {icon}
      <Text style={[t.button, big && { fontSize: 16 }, { color: palette.fg }]}>{label}</Text>
    </Pressable>
  );
}

/** 둥근 아이콘 버튼 — 뒤로 가기 등. 흰 원이 배경 위에 떠 있다 */
export function IconButton({
  onPress,
  label,
  children,
}: {
  onPress: () => void;
  /** 아이콘만 있으므로 스크린리더용 이름이 꼭 필요하다 */
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        borderRadius: radius.pill,
        backgroundColor: surface.raised,
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: shadow.raised,
        opacity: pressed ? 0.6 : 1,
      })}>
      {children}
    </Pressable>
  );
}

/**
 * 떠 있는 흰 면. 테두리 대신 그림자.
 * 그림자와 클리핑을 두 겹으로 나눈다 — 한 뷰에 `overflow:'hidden'`을 같이 두면 iOS에서
 * 그림자가 잘린다. 안쪽은 SwipeRow처럼 밀리는 내용이 둥근 모서리 밖으로 새지 않게 자른다.
 */
export function Raised({
  children,
  style,
  r = radius.lg,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  r?: number;
}) {
  return (
    <View style={[{ borderRadius: r, backgroundColor: surface.raised, boxShadow: shadow.raised }, style]}>
      <View style={{ borderRadius: r, overflow: 'hidden' }}>{children}</View>
    </View>
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
      {!!label && <Text style={[t.heading, { paddingHorizontal: sp.xs }]}>{label}</Text>}
      {children}
    </View>
  );
}
