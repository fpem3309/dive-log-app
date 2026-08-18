import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { inkA } from '@/design/tokens';
import type { Sighting } from '@/model/types';
import { Chip, HeartToggle } from '@/ui/controls';
import { TextField } from '@/ui/fields';
import { radius, sp, surface, t } from '@/ui/theme';

/**
 * 생물 입력 — CLAUDE.md §3.
 *
 * 전체 어종 도감 검색은 무겁고 자유 입력은 오타가 난다. 그래서 ① 내가 전에 적은 것을
 * 위에 띄워 두 번 탭으로 끝내고, 없으면 자유 입력을 허용한다.
 *
 * ② "같은 지역에서 많이 적힌 것"은 아직 못 만든다 — 다른 사용자 데이터가 없다.
 * 서버가 생기기 전까지는 내 기록만으로 제안한다.
 *
 * 하트는 앱이 아니라 사용자가 누른다 (§2-④). 흔한 종/귀한 종 목록 같은 건 만들지 않는다.
 */

type Props = {
  sightings: Sighting[];
  onChange: (next: Sighting[]) => void;
  /** 내가 전에 적은 이름들 — 최근 순 */
  history: string[];
};

export function SightingsEditor({ sightings, onChange, history }: Props) {
  const [draft, setDraft] = useState('');

  const already = new Set(sightings.map((s) => s.name.trim().toLowerCase()));
  const suggestions = history.filter((h) => !already.has(h.trim().toLowerCase())).slice(0, 8);

  const add = (name: string) => {
    const clean = name.trim();
    if (!clean || already.has(clean.toLowerCase())) return;
    onChange([...sightings, { name: clean, isHighlight: false }]);
    setDraft('');
  };

  const remove = (i: number) => onChange(sightings.filter((_, k) => k !== i));

  /** 하트는 하나만 — 카드 주인공이 둘일 수 없다 (§3) */
  const toggleHeart = (i: number) =>
    onChange(
      sightings.map((s, k) => ({ ...s, isHighlight: k === i ? !s.isHighlight : false })),
    );

  return (
    <View style={{ gap: sp.md }}>
      {sightings.length > 0 && (
        <View style={{ gap: sp.sm }}>
          {sightings.map((s, i) => (
            <View
              key={`${s.name}-${i}`}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: sp.md,
                paddingVertical: 9,
                paddingHorizontal: sp.md,
                borderRadius: radius.md,
                backgroundColor: s.isHighlight ? 'rgba(29,95,176,0.07)' : surface.raised,
                borderWidth: 1,
                borderColor: s.isHighlight ? 'rgba(29,95,176,0.40)' : surface.line,
              }}>
              <HeartToggle on={s.isHighlight} onPress={() => toggleHeart(i)} />
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={t.rowTitle} numberOfLines={1}>
                  {s.name}
                </Text>
                {s.isHighlight && (
                  <Text style={[t.meta, { color: surface.accent, fontSize: 10 }]}>
                    이 다이브의 하이라이트 · 카드 주인공
                  </Text>
                )}
              </View>
              <Pressable onPress={() => remove(i)} hitSlop={12}>
                <Text style={{ color: inkA(0.42), fontSize: 17 }}>✕</Text>
              </Pressable>
            </View>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: sp.sm }}>
        <TextField
          value={draft}
          onChangeText={setDraft}
          placeholder="본 생물 이름"
          onSubmitEditing={() => add(draft)}
          returnKeyType="done"
          style={{ flex: 1 }}
        />
        <Pressable
          onPress={() => add(draft)}
          disabled={!draft.trim()}
          hitSlop={10}
          style={({ pressed }) => ({
            paddingHorizontal: 14,
            paddingVertical: 7,
            borderRadius: radius.pill,
            borderWidth: 1,
            borderColor: draft.trim() ? surface.accent : surface.lineStrong,
            opacity: pressed ? 0.6 : draft.trim() ? 1 : 0.4,
          })}>
          <Text style={[t.chip, { color: draft.trim() ? surface.accent : inkA(0.45) }]}>추가</Text>
        </Pressable>
      </View>

      {suggestions.length > 0 && (
        <View style={{ gap: sp.sm }}>
          <Text style={[t.meta, { fontSize: 10.5 }]}>전에 적은 것</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm }}>
            {suggestions.map((name) => (
              <Chip key={name} label={name} onPress={() => add(name)} />
            ))}
          </View>
        </View>
      )}
    </View>
  );
}
