import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { inkA } from '@/design/tokens';
import { DateField } from '@/components/DateField';
import { DiveRow } from '@/components/DiveRow';
import { addDays, autoTripTitle, dateRange, diffDays, tripTitle } from '@/model/dates';
import { useTrips } from '@/store/TripStore';
import { Button, Chip, Divider, Section } from '@/ui/controls';
import { useConfirm } from '@/ui/Confirm';
import { Field, TextField } from '@/ui/fields';
import { radius, sp, surface, t } from '@/ui/theme';

/**
 * 트립 상세 — 입력의 중심 화면.
 *
 * 여기서 다이브를 툭툭 추가하고 이 화면을 떠나지 않는다 (§2-③).
 * "제주 3일 8다이브"를 저녁에 한 번에 쓰는 흐름이다.
 */

/** 며칠 묵었는지 고르는 칩 — 달력 두 번 여는 것보다 빠르다 */
const NIGHTS = [0, 1, 2, 3, 4, 5, 6];

export default function TripScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, updateTrip, deleteTrip, addDive, diveNumbers, ready } = useTrips();
  const trip = trips.find((tr) => tr.id === id);
  const { confirm } = useConfirm();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editHeader, setEditHeader] = useState(false);

  // 날짜순으로 보여준다 — 입력 순서가 아니라 실제 다이브 순서가 자연스럽다
  const dives = useMemo(
    () =>
      trip
        ? [...trip.dives].sort((a, b) => {
            if (a.date !== b.date) return a.date < b.date ? -1 : 1;
            return (a.time ?? '') < (b.time ?? '') ? -1 : 1;
          })
        : [],
    [trip],
  );

  if (!ready) return <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} />;

  if (!trip) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg, padding: sp.xl, gap: sp.lg }}>
        <Text style={t.body}>없는 트립입니다.</Text>
        <Button label="트립 목록으로" onPress={() => router.replace('/')} />
      </SafeAreaView>
    );
  }

  const nights = Math.max(0, diffDays(trip.startDate, trip.endDate));

  const onAddDive = () => {
    // 마지막 다이브와 같은 날·같은 종목으로 시작한다 — 연속 입력에서 탭 수를 줄인다
    const last = dives[dives.length - 1];
    const dive = addDive(trip.id, {
      date: last?.date ?? trip.startDate,
      discipline: last?.discipline ?? 'scuba',
      site: '',
    });
    setExpandedId(dive.id);
  };

  const confirmDeleteTrip = async () => {
    const ok = await confirm({
      title: '이 트립을 지울까요?',
      message: `다이브 ${trip.dives.length}개가 함께 사라집니다. 되돌릴 수 없습니다.`,
      destructive: true,
    });
    if (ok) {
      deleteTrip(trip.id);
      router.replace('/');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ padding: sp.xl, paddingBottom: 96, gap: sp.xl }}
          keyboardShouldPersistTaps="handled">
          <Pressable hitSlop={10} onPress={() => router.push('/')}>
            <Text style={[t.meta, { color: surface.accent }]}>‹ 트립 목록</Text>
          </Pressable>

          {/*
            ---------- 트립 머리 ----------
            장소는 장소끼리, 숫자는 숫자끼리 묶는다. 기간은 날짜 범위가 이미 말해 주므로
            "2박"을 덧붙이지 않는다 (한 줄에 같은 말을 두 번 하고 있었다).
          */}
          {!editHeader ? (
            <Pressable onPress={() => setEditHeader(true)} style={{ gap: 6 }}>
              <Text style={t.title}>{tripTitle(trip)}</Text>
              {!!trip.region && <Text style={t.meta}>{trip.region}</Text>}
              <Text style={t.meta}>
                {dateRange(trip.startDate, trip.endDate)}
                {`  ·  다이브 ${trip.dives.length}`}
              </Text>
              <Text style={[t.meta, { color: surface.accent, fontSize: 10.5 }]}>탭해서 고치기</Text>
            </Pressable>
          ) : (
            <View
              style={{
                gap: sp.lg,
                padding: sp.lg,
                borderRadius: radius.lg,
                backgroundColor: surface.sunken,
                borderWidth: 1,
                borderColor: surface.line,
              }}>
              <Field label="제목" hint="비우면 자동으로 지어집니다">
                <TextField
                  value={trip.title}
                  onChangeText={(v) => updateTrip(trip.id, { title: v })}
                  placeholder={autoTripTitle(trip.region, trip.startDate, trip.endDate)}
                />
              </Field>
              <Field label="지역" hint="카드에 올라갑니다">
                <TextField
                  value={trip.region}
                  onChangeText={(v) => updateTrip(trip.id, { region: v })}
                  placeholder="Seogwipo · Jeju"
                  autoCapitalize="words"
                />
              </Field>
              <Field label="시작일">
                <DateField
                  value={trip.startDate}
                  onChange={(iso) =>
                    updateTrip(trip.id, { startDate: iso, endDate: addDays(iso, nights) })
                  }
                />
              </Field>
              <Field label="기간">
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: sp.sm }}>
                  {NIGHTS.map((n) => (
                    <Chip
                      key={n}
                      mono
                      label={n === 0 ? '당일' : `${n}박`}
                      selected={nights === n}
                      onPress={() => updateTrip(trip.id, { endDate: addDays(trip.startDate, n) })}
                    />
                  ))}
                </View>
              </Field>
              <Divider />
              <View style={{ flexDirection: 'row', gap: sp.md }}>
                <Button
                  label="완료"
                  variant="primary"
                  style={{ flex: 1 }}
                  onPress={() => setEditHeader(false)}
                />
                <Button label="트립 지우기" variant="danger" onPress={confirmDeleteTrip} />
              </View>
            </View>
          )}

          {/* ---------- 다이브 목록 ---------- */}
          <Section label={trip.dives.length > 0 ? `다이브 ${trip.dives.length}개` : '다이브'}>
            {dives.length === 0 ? (
              <Text style={t.body}>
                아직 없습니다. 아래에서 하나 추가하세요. 날짜·장소·종목만 있으면 됩니다.
              </Text>
            ) : (
              <View
                style={{
                  borderRadius: radius.lg,
                  backgroundColor: surface.raised,
                  borderWidth: 1,
                  borderColor: surface.line,
                  overflow: 'hidden',
                }}>
                {dives.map((d, i) => (
                  <View key={d.id}>
                    {i > 0 && expandedId !== d.id && expandedId !== dives[i - 1]?.id && (
                      <Divider style={{ marginHorizontal: sp.md }} />
                    )}
                    <DiveRow
                      trip={trip}
                      dive={d}
                      ordinal={i + 1}
                      diveNumber={diveNumbers.get(d.id)}
                      expanded={expandedId === d.id}
                      onToggle={() => setExpandedId((cur) => (cur === d.id ? null : d.id))}
                    />
                  </View>
                ))}
              </View>
            )}

            <Button label="+ 다이브 추가" variant="primary" onPress={onAddDive} />
          </Section>

          {trip.dives.length > 0 && (
            <Pressable
              onPress={() => router.push(`/trip/${trip.id}/cards`)}
              style={({ pressed }) => ({
                paddingVertical: 14,
                alignItems: 'center',
                borderRadius: radius.pill,
                borderWidth: 1,
                borderColor: 'rgba(29,95,176,0.45)',
                opacity: pressed ? 0.6 : 1,
              })}>
                            <Text style={[t.button, { color: surface.accent }]}>카드 보기 · 저장</Text>
            </Pressable>
          )}

          <Text style={[t.meta, { fontSize: 10.5, color: inkA(0.4), textAlign: 'center' }]}>
            적은 내용은 이 기기에만 저장됩니다
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
