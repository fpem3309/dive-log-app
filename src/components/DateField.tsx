import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { hex, inkA } from '@/design/tokens';
import { fromISO, padMD, toISO, weekdayKr } from '@/model/dates';
import { TextField } from '@/ui/fields';
import { radius, surface, t } from '@/ui/theme';

/**
 * 날짜 하나 고르기.
 *
 * 플랫폼마다 방식이 달라서 한 곳에 모은다:
 *   iOS      — 인라인 캘린더를 펼친다
 *   Android  — 시스템 다이얼로그를 띄운다 (명령형 API)
 *   Web      — 네이티브 피커가 없다. YYYY-MM-DD 텍스트로 받는다.
 *
 * 웹 분기는 개발 중 브라우저로 확인하기 위한 것이기도 하다.
 */

type Props = {
  value: string;
  onChange: (iso: string) => void;
};

export function DateField({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [webDraft, setWebDraft] = useState(value);

  if (Platform.OS === 'web') {
    return (
      <TextField
        value={webDraft}
        onChangeText={(v) => {
          setWebDraft(v);
          // 형식이 완성됐을 때만 반영한다 — 타이핑 중간값으로 상태를 흔들지 않는다
          if (/^\d{4}-\d{2}-\d{2}$/.test(v)) onChange(v);
        }}
        onBlur={() => setWebDraft(value)}
        placeholder="2026-08-02"
        maxLength={10}
      />
    );
  }

  const date = fromISO(value);

  const show = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: date,
        mode: 'date',
        onChange: (_e, picked) => {
          if (picked) onChange(toISO(picked));
        },
      });
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <View style={{ gap: 8 }}>
      <Pressable
        onPress={show}
        style={({ pressed }) => ({
          borderBottomWidth: 1,
          borderBottomColor: open ? surface.accent : surface.fieldLine,
          paddingBottom: 7,
          opacity: pressed ? 0.6 : 1,
        })}>
        <Text style={t.inputNum}>
          {value}
          <Text style={[t.meta, { fontSize: 12, color: inkA(0.5) }]}>
            {'  '}
            {padMD(value)} {weekdayKr(value)}
          </Text>
        </Text>
      </Pressable>

      {open && Platform.OS === 'ios' && (
        <View style={{ borderRadius: radius.md, overflow: 'hidden' }}>
          <DateTimePicker
            value={date}
            mode="date"
            display="inline"
            themeVariant="light"
            accentColor={hex.mid}
            onChange={(_e, picked) => {
              if (picked) onChange(toISO(picked));
            }}
          />
        </View>
      )}
    </View>
  );
}
