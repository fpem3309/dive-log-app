import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { hex, paperA } from '@/design/tokens';
import { dateWithDay, tripTitle, yearOf } from '@/model/dates';
import type { Trip } from '@/model/types';
import { useTrips } from '@/store/TripStore';
import { Button, Raised } from '@/ui/controls';
import { useConfirm } from '@/ui/Confirm';
import { ChevronRight, Heart, Plus, Waves } from '@/ui/icons';
import { SwipeRow } from '@/ui/SwipeRow';
import { radius, shadow, sp, surface, t } from '@/ui/theme';

/**
 * 홈 — 트립 목록.
 *
 * 새 트립을 만들 때 폼을 먼저 보여주지 않는다. 바로 만들고 트립 화면으로 들어가서
 * 거기서 제목·지역을 고친다. 시작하기 전에 넘어야 할 문턱을 두지 않는 게
 * 이 앱의 전제(§2-①)와 같은 태도다.
 */

export default function Home() {
  const { trips, ready, createTrip, deleteTrip, settings } = useTrips();
  const { confirm } = useConfirm();

  const totalDives = trips.reduce((n, tr) => n + tr.dives.length, 0);

  /**
   * 밀어서 나온 "지우기"를 눌러도 바로 지우지 않는다. 되돌릴 수 없어서다.
   * 트립 상세에도 같은 버튼이 있다.
   */
  const confirmDelete = async (trip: Trip) => {
    const n = trip.dives.length;
    // 제목을 문장에 끼우면 조사가 문제가 된다 ("리브어보드을"/"제주 2박를").
    // 이름은 본문에 따로 두고 제목 문장은 조사 없이 고정한다.
    const ok = await confirm({
      title: '이 트립을 지울까요?',
      message:
        `"${tripTitle(trip)}"` +
        (n > 0 ? `\n다이브 ${n}개가 함께 사라져요. 되돌릴 수 없어요.` : '\n되돌릴 수 없어요.'),
      destructive: true,
    });
    if (ok) deleteTrip(trip.id);
    return ok;
  };

  /** 최근 연도부터, 각 연도 안에서도 최근 트립부터 */
  const groups = useMemo(() => {
    const byYear = new Map<string, Trip[]>();
    for (const trip of [...trips].sort((a, b) => (a.startDate < b.startDate ? 1 : -1))) {
      const y = yearOf(trip.startDate);
      if (!byYear.has(y)) byYear.set(y, []);
      byYear.get(y)!.push(trip);
    }
    return [...byYear.entries()];
  }, [trips]);

  const onNewTrip = () => {
    const trip = createTrip();
    router.push(`/trip/${trip.id}`);
  };

  if (!ready) return <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} />;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={{ padding: sp.xl, paddingTop: sp.xxl, paddingBottom: sp.xxl, gap: sp.xxl }}>
        <View style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
            <Text style={[t.title, { flex: 1, minWidth: 0 }]}>다이브 로그</Text>
            {settings.diveNumberStart != null && (
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  paddingVertical: 7,
                  paddingLeft: 10,
                  paddingRight: 12,
                  borderRadius: radius.pill,
                  backgroundColor: surface.raised,
                  boxShadow: shadow.raised,
                }}>
                <Waves color={surface.accent} />
                <Text style={[t.meta, { fontFamily: t.rowTitle.fontFamily, color: hex.deep }]}>
                  누적 {settings.diveNumberStart + totalDives}번
                </Text>
              </View>
            )}
          </View>
          {trips.length > 0 && (
            // 트립 수는 연도 헤더가 말하므로 여기서는 전체 합계만
            <Text style={[t.meta, { fontSize: 14 }]}>다이브 {totalDives}번 적었어요</Text>
          )}
        </View>

        {trips.length === 0 ? (
          <View style={{ gap: sp.md, paddingVertical: sp.xl }}>
            <Text style={t.heading}>아직 트립이 없어요</Text>
            <Text style={t.body}>
              트립을 만들고 그 안에 다이브를 툭툭 추가하세요.{'\n'}
              날짜 · 장소 · 종목만 있으면 카드가 나와요.
            </Text>
          </View>
        ) : (
          groups.map(([year, yearTrips]) => (
            <View key={year} style={{ gap: sp.md }}>
              {/* 연도가 날짜의 연도를 책임진다 — 행에는 월·일만 남는다 */}
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'baseline',
                  gap: sp.md,
                  paddingHorizontal: sp.xs,
                }}>
                <Text style={[t.heading, { fontSize: 19, fontVariant: ['tabular-nums'] }]}>{year}</Text>
                <Text style={[t.meta, { flex: 1, minWidth: 0, textAlign: 'right' }]}>
                  트립 {yearTrips.length} · 다이브{' '}
                  {yearTrips.reduce((n, tr) => n + tr.dives.length, 0)}
                </Text>
              </View>

              <View style={{ gap: 10 }}>
                {yearTrips.map((trip) => {
                  const highlights = trip.dives.filter((d) =>
                    d.sightings.some((s) => s.isHighlight),
                  ).length;
                  return (
                    <Raised key={trip.id}>
                      {/*
                        <Link asChild>를 쓰지 않는다 — 자식 Pressable의 style을 통째로
                        덮어써서 행이 패딩도 flexDirection도 잃는다 (§10-⑳).
                        날짜는 점 체인에 끼우지 않고 둘째 줄 맨 앞에 둔다.
                      */}
                      <SwipeRow
                        onPress={() => router.push(`/trip/${trip.id}`)}
                        onDelete={() => confirmDelete(trip)}>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 14,
                            paddingVertical: 14,
                            paddingLeft: 14,
                            paddingRight: sp.lg,
                          }}>
                          <DiveCountTile trip={trip} />
                          <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
                            <Text style={t.rowTitle} numberOfLines={1}>
                              {tripTitle(trip)}
                            </Text>
                            <Text style={t.meta} numberOfLines={1}>
                              {dateWithDay(trip.startDate)}
                              {trip.region ? ` · ${trip.region}` : ''}
                            </Text>
                          </View>
                          {highlights > 0 && (
                            <View
                              style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                gap: 4,
                                paddingVertical: 4,
                                paddingHorizontal: 9,
                                borderRadius: radius.pill,
                                backgroundColor: surface.selected,
                              }}>
                              <Heart size={12} filled color={surface.accent} />
                              <Text style={[t.meta, { fontSize: 12, color: surface.accent }]}>
                                {highlights}
                              </Text>
                            </View>
                          )}
                          <ChevronRight />
                        </View>
                      </SwipeRow>
                    </Raised>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {trips.length > 0 && (
          // 숨은 제스처는 없는 기능이나 마찬가지다. 조용히 알려는 준다.
          <Text style={[t.meta, { fontSize: 12.5, textAlign: 'center', marginTop: -sp.md }]}>
            왼쪽으로 밀면 지울 수 있어요
          </Text>
        )}

        {/* 개발 빌드에서만 — 테스트하는 지인에게 남의 다이브 8장이 보이면 안 된다 (§7) */}
        {__DEV__ && (
          <View style={{ marginTop: sp.lg, alignItems: 'center' }}>
            <Pressable hitSlop={10} onPress={() => router.push('/cards')}>
              <Text style={t.meta}>카드 레이아웃 검증 (개발용)</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 새 트립은 화면 아래에 고정 — 목록이 길어져도 손이 닿는 자리에 있다 */}
      <View style={{ paddingHorizontal: sp.xl, paddingTop: sp.sm, paddingBottom: sp.md }}>
        <Button label="새 트립" variant="primary" icon={<Plus />} onPress={onNewTrip} />
      </View>
    </SafeAreaView>
  );
}

/**
 * 트립 행 왼쪽 타일 — 다이브 수를 담고, 그 트립에서 제일 깊이 간 만큼 어두워진다.
 * 카드 물기둥과 같은 규칙이다 (§10-⑤): 기준은 절대 수심 40m, 수심을 하나도 안 적었으면
 * 중립값 0.45. 화면에서도 "깊이 들어간 트립일수록 어둡다"가 읽힌다.
 */
function DiveCountTile({ trip }: { trip: Trip }) {
  const depths = trip.dives.map((d) => d.maxDepth).filter((v): v is number => v != null);
  const k = depths.length ? Math.min(1, Math.max(...depths) / 40) : 0.45;
  return (
    <View
      style={{
        width: 48,
        height: 48,
        borderRadius: radius.md,
        backgroundColor: mixHex(hex.mid, hex.abyss, k),
        alignItems: 'center',
        justifyContent: 'center',
      }}>
      <Text style={[t.rowTitle, { fontSize: 17, color: hex.paper, fontVariant: ['tabular-nums'] }]}>
        {trip.dives.length}
      </Text>
      <Text style={[t.meta, { fontSize: 10, color: paperA(0.8), marginTop: -1 }]}>다이브</Text>
    </View>
  );
}

const mixHex = (a: string, b: string, k: number) => {
  const ch = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) + (ch(b, i) - ch(a, i)) * k));
  return `#${out.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
};
