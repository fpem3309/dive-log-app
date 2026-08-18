import { router } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { inkA } from '@/design/tokens';
import { dateWithDay, tripTitle, yearOf } from '@/model/dates';
import type { Trip } from '@/model/types';
import { useTrips } from '@/store/TripStore';
import { Button, Divider } from '@/ui/controls';
import { useConfirm } from '@/ui/Confirm';
import { SwipeRow } from '@/ui/SwipeRow';
import { radius, sp, surface, t } from '@/ui/theme';

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
        (n > 0 ? `\n다이브 ${n}개가 함께 사라집니다. 되돌릴 수 없습니다.` : '\n되돌릴 수 없습니다.'),
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
    <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: sp.xl, paddingBottom: 72, gap: sp.xl }}>
        <View style={{ gap: sp.md }}>
          <Text style={t.eyebrow}>Dive log</Text>
          <Text style={t.title}>다이브 로그</Text>
          {trips.length > 0 && (
            // 트립 수는 연도 헤더가 말하므로 여기서는 전체 합계만
            <Text style={t.meta}>
              다이브 {totalDives}
              {settings.diveNumberStart != null && ` · 누적 ${settings.diveNumberStart + totalDives}`}
            </Text>
          )}
        </View>

        {trips.length === 0 ? (
          <View style={{ gap: sp.lg, paddingVertical: sp.xxl }}>
            <Text style={t.heading}>아직 트립이 없습니다</Text>
            <Text style={t.body}>
              트립을 만들고 그 안에 다이브를 툭툭 추가하세요.{'\n'}
              날짜 · 장소 · 종목만 있으면 카드가 나옵니다.
            </Text>
          </View>
        ) : (
          groups.map(([year, yearTrips]) => (
            <View key={year} style={{ gap: sp.md }}>
              {/* 연도가 날짜의 연도를 책임진다 — 행에는 월·일만 남는다 */}
              <View style={{ gap: sp.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: sp.md }}>
                  <Text style={[t.label, { fontSize: 13, letterSpacing: 2.6, color: inkA(0.72) }]}>
                    {year}
                  </Text>
                  <Text style={[t.meta, { flex: 1, minWidth: 0, textAlign: 'right' }]}>
                    트립 {yearTrips.length} · 다이브{' '}
                    {yearTrips.reduce((n, tr) => n + tr.dives.length, 0)}
                  </Text>
                </View>
                <Divider />
              </View>

              <View
                style={{
                  borderRadius: radius.lg,
                  backgroundColor: surface.raised,
                  borderWidth: 1,
                  borderColor: surface.line,
                  overflow: 'hidden',
                }}>
                {yearTrips.map((trip, i) => {
                  const highlights = trip.dives.filter((d) =>
                    d.sightings.some((s) => s.isHighlight),
                  ).length;
                  return (
                    <View key={trip.id}>
                      {i > 0 && <Divider style={{ marginHorizontal: sp.md }} />}
                      {/*
                        <Link asChild>를 쓰지 않는다 — 자식 Pressable의 style을 통째로
                        덮어써서 행이 패딩도 flexDirection도 잃는다 (§10-⑳).
                        날짜는 점 체인에 끼우지 않고 오른쪽에 세운다.
                      */}
                      <SwipeRow
                        onPress={() => router.push(`/trip/${trip.id}`)}
                        onDelete={() => confirmDelete(trip)}>
                        <View
                          style={{
                            gap: 5,
                            paddingVertical: 15,
                            paddingHorizontal: sp.lg,
                          }}>
                          <View
                            style={{ flexDirection: 'row', alignItems: 'baseline', gap: sp.md }}>
                            <Text style={[t.rowTitle, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                              {tripTitle(trip)}
                            </Text>
                            <Text style={t.meta}>{dateWithDay(trip.startDate)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: sp.md }}>
                            <Text style={[t.meta, { flex: 1, minWidth: 0 }]} numberOfLines={1}>
                              {trip.region ? `${trip.region} · ` : ''}
                              {`다이브 ${trip.dives.length}`}
                            </Text>
                            {highlights > 0 && (
                              <Text style={{ color: surface.accent, fontSize: 12.5 }}>
                                ♥ {highlights}
                              </Text>
                            )}
                            <Text style={{ color: inkA(0.3), fontSize: 17 }}>›</Text>
                          </View>
                        </View>
                      </SwipeRow>
                    </View>
                  );
                })}
              </View>
            </View>
          ))
        )}

        {trips.length > 0 && (
          // 숨은 제스처는 없는 기능이나 마찬가지다. 조용히 알려는 준다.
          <Text style={[t.meta, { fontSize: 10.5, color: inkA(0.4), textAlign: 'center' }]}>
            왼쪽으로 밀면 지울 수 있습니다
          </Text>
        )}

        <Button label="+ 새 트립" variant="primary" onPress={onNewTrip} />

        <View style={{ marginTop: sp.huge, gap: sp.md, alignItems: 'center' }}>
          <Pressable hitSlop={10} onPress={() => router.push('/cards')}>
            <Text style={[t.meta, { color: inkA(0.42) }]}>카드 레이아웃 검증 (개발용)</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
