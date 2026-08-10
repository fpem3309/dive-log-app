import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DiveCard } from '@/cards/DiveCard';
import { EXPORT_H, EXPORT_W, exportRenderHeight, exportRenderWidth } from '@/design/scale';
import { inkA } from '@/design/tokens';
import { saveCardToLibrary } from '@/export/captureCard';
import { padMD, tripTitle } from '@/model/dates';
import type { Dive } from '@/model/types';
import { useTrips } from '@/store/TripStore';
import { Button } from '@/ui/controls';
import { useConfirm } from '@/ui/Confirm';
import { sp, surface, t } from '@/ui/theme';

/**
 * 이 트립의 카드들.
 *
 * §7의 검증 신호는 "좋다"는 말이 아니라 저장 버튼을 누르는지다. 그래서 카드마다
 * 저장을 바로 옆에 둔다.
 *
 * 저장은 화면에 보이는 카드를 확대하는 게 아니라, 화면 밖에 1080 폭으로 따로 렌더한
 * 카드를 캡처한다 (captureCard.ts 참조).
 */

const PAD = 20;

export default function TripCardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, diveNumbers, ready } = useTrips();
  const trip = trips.find((tr) => tr.id === id);
  const { notify } = useConfirm();

  const { width } = useWindowDimensions();
  const cardW = Math.min(width - PAD * 2, 380);

  const shotRef = useRef<View>(null);
  const [pending, setPending] = useState<Dive | null>(null);

  // 카드에는 계산된 누적 번호를 채워서 넘긴다 (저장하지 않는 값이라)
  const dives = useMemo(
    () =>
      trip
        ? [...trip.dives]
            .sort((a, b) => (a.date !== b.date ? (a.date < b.date ? -1 : 1) : (a.time ?? '') < (b.time ?? '') ? -1 : 1))
            .map((d) => {
              const n = diveNumbers.get(d.id);
              return n == null ? d : { ...d, diveNumber: n };
            })
        : [],
    [trip, diveNumbers],
  );

  if (!ready) return <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} />;
  if (!trip) return null;

  const onSave = async (dive: Dive) => {
    if (Platform.OS === 'web') {
      await notify('저장은 앱에서만', '웹에서는 카드 이미지를 만들 수 없습니다.');
      return;
    }
    setPending(dive);
    // 화면 밖 카드가 실제로 배치될 때까지 두 프레임 기다린다
    await new Promise<void>((r) => requestAnimationFrame(() => requestAnimationFrame(() => r())));
    try {
      const res = await saveCardToLibrary(shotRef);
      await notify(
        res.saved ? '사진에 저장했습니다' : '저장하지 못했습니다',
        res.saved ? `${EXPORT_W}×${EXPORT_H}` : (res.reason ?? ''),
      );
    } catch (e) {
      await notify('만들지 못했습니다', String(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 72, alignItems: 'center' }}>
        <View style={{ width: cardW, gap: sp.md }}>
          <Pressable hitSlop={10} onPress={() => router.push(`/trip/${trip.id}`)}>
            <Text style={[t.meta, { color: surface.accent }]}>‹ {tripTitle(trip)}</Text>
          </Pressable>
          <Text style={t.title}>카드 {dives.length}장</Text>
          <Text style={[t.body, { marginBottom: sp.md }]}>
            올리고 싶은 걸 고르세요. 9:16 · {EXPORT_W}×{EXPORT_H}로 저장됩니다.
          </Text>

          {dives.map((d, i) => (
            <View key={d.id} style={{ marginBottom: sp.xxl, gap: sp.md }}>
              <Text style={t.meta}>
                {i + 1} · {padMD(d.date)} · {d.site || '장소 없음'}
              </Text>
              <DiveCard dive={d} region={trip.region} width={cardW} />
              <Button label="사진에 저장" onPress={() => onSave(d)} />
            </View>
          ))}

          <Text style={[t.meta, { fontSize: 10.5, color: inkA(0.4), textAlign: 'center' }]}>
            트립 요약 카드는 아직 없습니다
          </Text>
        </View>
      </ScrollView>

      {/* 화면 밖 1080 렌더 — 저장 대상 */}
      {pending && (
        <View
          collapsable={false}
          style={{
            position: 'absolute',
            left: -EXPORT_W * 2,
            top: 0,
            // 포인트 크기 × 기기 배율 = 정확히 1080×1920 픽셀 (scale.ts 주석 참조)
            width: exportRenderWidth(),
            height: exportRenderHeight(),
          }}>
          <DiveCard
            dive={pending}
            region={trip.region}
            width={exportRenderWidth()}
            cardRef={shotRef}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
