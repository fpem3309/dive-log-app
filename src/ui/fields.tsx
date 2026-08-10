import { useState } from 'react';
import { Text, TextInput, View, type TextInputProps, type ViewStyle } from 'react-native';

import { hex, inkA } from '@/design/tokens';
import { sp, surface, t } from './theme';

/**
 * 입력 필드.
 *
 * 전부 optional이라는 게 이 앱의 전제다(§2-①). 그래서 비어 있는 칸이 "안 채운 잘못"처럼
 * 보이면 안 된다 — 별표도, 빨간 테두리도, "필수" 문구도 없다. 필수 3개조차 강조하지 않고
 * 그냥 위에 둔다.
 */

export function Field({
  label,
  hint,
  children,
  style,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return (
    // minWidth:0 — 가로로 나란히 놓았을 때 칸이 안 줄어들어 단위가 밖으로 밀리는 걸 막는다.
    // (RN에서는 기본값이지만 react-native-web은 CSS min-width:auto를 따라간다)
    <View style={[{ gap: 7, minWidth: 0 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: sp.sm }}>
        <Text style={t.label}>{label}</Text>
        {!!hint && <Text style={[t.meta, { fontSize: 10.5 }]}>{hint}</Text>}
      </View>
      {children}
    </View>
  );
}

function underline(focused: boolean): ViewStyle {
  return {
    borderBottomWidth: 1,
    borderBottomColor: focused ? surface.accent : surface.fieldLine,
    paddingBottom: 7,
  };
}

export function TextField({
  value,
  onChangeText,
  placeholder,
  style,
  ...rest
}: {
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  style?: ViewStyle;
} & Omit<TextInputProps, 'style' | 'value' | 'onChangeText' | 'placeholder'>) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={[underline(focused), { minWidth: 0 }, style]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={inkA(0.3)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[t.input, { padding: 0, minWidth: 0 }]}
        {...rest}
      />
    </View>
  );
}

/**
 * 숫자 입력. 값은 문자열로 들고 있다가 부모가 숫자로 바꾼다 —
 * "24." 처럼 입력 중간 상태를 숫자로 강제하면 소수점을 못 찍는다.
 */
export function NumberField({
  value,
  onChangeText,
  unit,
  placeholder,
  decimal,
  maxLength = 6,
  style,
}: {
  value: string;
  onChangeText: (v: string) => void;
  unit?: string;
  placeholder?: string;
  decimal?: boolean;
  maxLength?: number;
  style?: ViewStyle;
}) {
  const [focused, setFocused] = useState(false);
  const clean = (raw: string) => {
    const filtered = raw.replace(decimal ? /[^0-9.]/g : /[^0-9]/g, '');
    if (!decimal) return filtered;
    // 소수점은 하나만
    const [head, ...tail] = filtered.split('.');
    return tail.length ? `${head}.${tail.join('')}` : head;
  };

  return (
    <View
      style={[
        underline(focused),
        { flexDirection: 'row', alignItems: 'baseline', minWidth: 0 },
        style,
      ]}>
      <TextInput
        value={value}
        onChangeText={(v) => onChangeText(clean(v))}
        placeholder={placeholder}
        placeholderTextColor={inkA(0.26)}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        inputMode={decimal ? 'decimal' : 'numeric'}
        maxLength={maxLength}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[t.inputNum, { padding: 0, flex: 1, minWidth: 0 }]}
      />
      {!!unit && (
        <Text style={[t.meta, { fontSize: 12, color: inkA(0.5), marginLeft: 4 }]}>{unit}</Text>
      )}
    </View>
  );
}

/**
 * 프리다이빙 시간 — 분:초. CLAUDE.md §9에서 미해결이던 입력 분기를 여기서 푼다.
 * 스쿠버는 그냥 NumberField(분)를 쓴다.
 */
export function MinSecField({
  minutes,
  seconds,
  onChange,
}: {
  minutes: string;
  seconds: string;
  onChange: (m: string, s: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: sp.md }}>
      <NumberField
        value={minutes}
        onChangeText={(v) => onChange(v, seconds)}
        unit="분"
        placeholder="2"
        maxLength={3}
        style={{ flex: 1 }}
      />
      <NumberField
        value={seconds}
        // 초는 59를 넘기면 분으로 올려 준다 — "130초" 라고 적는 사람이 있다
        onChangeText={(v) => {
          const n = parseInt(v, 10);
          if (!Number.isNaN(n) && n > 59) {
            const addM = Math.floor(n / 60);
            const base = parseInt(minutes || '0', 10) || 0;
            onChange(String(base + addM), String(n % 60).padStart(2, '0'));
          } else {
            onChange(minutes, v);
          }
        }}
        unit="초"
        placeholder="08"
        maxLength={2}
        style={{ flex: 1 }}
      />
    </View>
  );
}
