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
import { ASPECT, EXPORT_H, EXPORT_W, exportRenderHeight, exportRenderWidth } from '@/design/scale';
import { paperA } from '@/design/tokens';
import { HeroPicker } from '@/components/HeroPicker';
import { saveCardToLibrary } from '@/export/captureCard';
import { chooseHero, heroCandidates, type HeroKind } from '@/model/chooseHero';
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
 *
 * 주인공을 바꾸는 것도 여기서 받는다 (§3). "313번째 말고 38m였으면 좋겠다"는 판단은
 * 결과물을 본 순간에만 생기고, 저장 버튼이 이 화면에 있기 때문이다 — 고치러 다른 화면으로
 * 나가야 하면 저장 흐름이 끊긴다. 편집기에는 아무것도 끼워 넣지 않는다 (§2-③).
 */

const PAD = 20;

/**
 * 히어로 탭 영역 — 카드 위가 아니라 **카드를 덮는 형제 뷰**다.
 * DiveCard의 props가 안 바뀌고, 저장 경로(화면 밖 1080 렌더)는 DiveCard만 렌더하므로
 * 선택 UI가 결과물 PNG에 찍힐 경로가 없다 (§10-①).
 *
 * 비율은 시안 360×640 좌표계를 실측해서 얻었다:
 *   - 하단 패딩 26 → 콘텐츠 바닥 y=614. FieldStrip 블록 74 → 히어로 바닥 y≈540 (84.4%)
 *   - 2줄 생물명 + 학명 줄이 최대일 때 히어로 최상단 y≈355 (55.5%)
 * 좌측은 눈금자 폭(52/360)만큼 비운다 — 서명 요소 위에는 눌림 워시도 깔지 않는다 (§10-㉘).
 *
 * ⚠️ 히어로 블록의 세로 위치를 바꾸는 작업을 하면 이 비율을 다시 봐야 한다.
 */
const TAP = { left: 52 / 360, top: 0.56, bottom: 0.15 } as const;

export default function TripCardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { trips, diveNumbers, updateDive, ready } = useTrips();
  const trip = trips.find((tr) => tr.id === id);
  const { notify } = useConfirm();

  const { width } = useWindowDimensions();
  const cardW = Math.min(width - PAD * 2, 380);
  const cardH = cardW * ASPECT;

  const shotRef = useRef<View>(null);
  const [pending, setPending] = useState<Dive | null>(null);
  /** 후보 줄이 열린 카드. 한 번에 하나만 열린다 */
  const [openId, setOpenId] = useState<string | null>(null);

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

  /**
   * 다이브별로 고를 수 있는 주인공들. **값이 있는 것만** 들어간다 (§2-②).
   * 2개 미만이면 탭 대상도, 트레이도, 안내문 둘째 줄도 없다 — 셋이 같은 조건으로
   * 함께 사라져서 "이 카드는 바꿀 게 없다"는 흔적이 화면 어디에도 안 남는다.
   */
  const picks = useMemo(
    () => new Map(dives.map((d) => [d.id, heroCandidates(d)])),
    [dives],
  );
  const anyPickable = useMemo(
    () => [...picks.values()].some((c) => c.length >= 2),
    [picks],
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

  /**
   * 주인공을 골랐다 — 즉시 반영하고 트레이를 닫는다. 확인창도, 별도 "적용" 단계도 없다
   * (그 버튼 자리는 사진 저장이라 헷갈린다). 되돌리기는 원래 것을 다시 고르는 것.
   *
   * 자동 규칙이 고를 것과 같은 걸 골랐으면 **저장하지 않고 지운다** — "자동(=수심)"과
   * "수동 수심"은 카드에서 완전히 똑같아 보이므로, 구별되지 않는 두 상태를 만들지 않는다.
   * 여기 넘어오는 dive는 누적 번호가 채워진 것이라 자동 규칙이 정확히 계산된다.
   */
  const onPickHero = (dive: Dive, kind: HeroKind) => {
    updateDive(trip.id, dive.id, {
      heroOverride: kind === chooseHero(dive) ? undefined : kind,
    });
    setOpenId(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: PAD, paddingBottom: 72, alignItems: 'center' }}>
        <View style={{ width: cardW, gap: sp.md }}>
          <Pressable hitSlop={10} onPress={() => router.push(`/trip/${trip.id}`)}>
            <Text style={[t.meta, { color: surface.accent }]}>‹ {tripTitle(trip)}</Text>
          </Pressable>
          <Text style={t.title}>카드 {dives.length}장</Text>
          {/* 두 줄이 한 문단으로 읽혀야 해서 그룹 gap 밖으로 묶는다 (둘째 줄은 +23px뿐) */}
          <View style={{ marginBottom: sp.md }}>
            <Text style={t.body}>
              올리고 싶은 걸 고르세요. 9:16 · {EXPORT_W}×{EXPORT_H}로 저장됩니다.
            </Text>
            {/* 바꿀 게 있는 카드가 하나라도 있을 때만 — 누를 수 없는 걸 누르라고 하지 않는다 */}
            {anyPickable && (
              <Text style={t.body}>카드에서 제일 큰 글자를 누르면 다른 값으로 바꿀 수 있습니다.</Text>
            )}
          </View>

          {dives.map((d, i) => {
            const candidates = picks.get(d.id) ?? [];
            const pickable = candidates.length >= 2;
            return (
              <View key={d.id} style={{ marginBottom: sp.xxl, gap: sp.md }}>
                <Text style={t.meta}>
                  {i + 1} · {padMD(d.date)} · {d.site || '장소 없음'}
                </Text>

                <View>
                  <DiveCard dive={d} region={trip.region} width={cardW} />
                  {pickable && (
                    <Pressable
                      onPress={() => setOpenId((prev) => (prev === d.id ? null : d.id))}
                      accessibilityRole="button"
                      accessibilityLabel="카드에 크게 넣을 값 바꾸기"
                      testID={`hero-tap-${d.id}`}
                      style={({ pressed }) => ({
                        position: 'absolute',
                        left: cardW * TAP.left,
                        right: 0,
                        top: cardH * TAP.top,
                        bottom: cardH * TAP.bottom,
                        // 오버레이 자신이 투명이라 opacity를 줄여도 아무 변화가 없다.
                        // 어두운 카드 표면 위이므로 카드 팔레트로 워시를 깐다 (§5).
                        backgroundColor: pressed ? paperA(0.12) : 'transparent',
                      })}
                    />
                  )}
                </View>

                {pickable && openId === d.id && (
                  <HeroPicker
                    dive={d}
                    candidates={candidates}
                    width={cardW}
                    onSelect={(kind) => onPickHero(d, kind)}
                  />
                )}

                <Button label="사진에 저장" onPress={() => onSave(d)} />
              </View>
            );
          })}
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
