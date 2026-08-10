import { useRef, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link } from 'expo-router';

import { DiveCard } from '@/cards/DiveCard';
import { EXPORT_H, EXPORT_W, exportRenderHeight, exportRenderWidth, makeScale } from '@/design/scale';
import { inkA } from '@/design/tokens';
import { family, makeType } from '@/design/type';
import { surface, t as tt } from '@/ui/theme';
import { saveCardToLibrary } from '@/export/captureCard';
import { fixtures, type Fixture } from '@/model/fixtures';
import { useConfirm } from '@/ui/Confirm';

/**
 * 카드 검증 갤러리 — 개발용 화면.
 *
 * 픽스처 8종을 전부 세워 놓고 눈으로 본다. 특히 ⑥(필수 3개만)에서
 * "뭔가 빠진 느낌"이 나면 §2-② 위반이니 되돌아가야 한다.
 * 실제 사용자 데이터가 아니라 고정 목 데이터다 — 카드 레이아웃 회귀 확인용.
 *
 * 시안은 데스크톱에서 2단이지만 720px 아래에서는 1단으로 접히므로 폰에서는 1단이 맞다.
 */

const PAD = 20;

export default function Gallery() {
  const { notify } = useConfirm();
  const { width } = useWindowDimensions();
  const cardW = Math.min(width - PAD * 2, 380);
  const s = makeScale(cardW);
  const type = makeType(s);

  // 화면 밖 1080 렌더 — 저장 대상
  const shotRef = useRef<View>(null);
  const [pending, setPending] = useState<Fixture | null>(null);

  const onSave = async (f: Fixture) => {
    if (Platform.OS === 'web') {
      await notify('저장은 네이티브에서만', '웹에서는 view-shot을 쓸 수 없습니다.');
      return;
    }
    setPending(f);
    // 화면 밖 카드가 실제로 배치될 때까지 두 프레임 기다린다
    await new Promise<void>((r) =>
      requestAnimationFrame(() => requestAnimationFrame(() => r())),
    );
    try {
      const res = await saveCardToLibrary(shotRef);
      await notify(
        res.saved ? '저장했습니다' : '저장하지 못했습니다',
        res.saved ? `${EXPORT_W}×${EXPORT_H}` : (res.reason ?? ''),
      );
    } catch (e) {
      await notify('캡처 실패', String(e));
    } finally {
      setPending(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: surface.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={{ paddingVertical: PAD, paddingBottom: 72, alignItems: 'center' }}>
        {/* 카드 폭에 맞춰 본문도 같이 접히게 한다 (넓은 화면에서 글이 카드보다 길어지지 않도록) */}
        <View style={{ width: cardW }}>
        <Text
          style={{
            fontFamily: family.mono,
            fontSize: 11,
            letterSpacing: 2.4,
            textTransform: 'uppercase',
            color: surface.accent,
            marginBottom: 14,
          }}>
          Dive log — card fixtures
        </Text>
        <Text
          style={{
            fontFamily: family.krBold,
            fontSize: 24,
            color: '#0A2E39',
            letterSpacing: -0.5,
            marginBottom: 10,
          }}>
          카드 8종 검증
        </Text>
        <Link href="/" style={{ marginBottom: 14 }}>
          <Text style={{ fontFamily: family.mono, fontSize: 11, letterSpacing: 1.2, color: surface.accent }}>
            ‹ 트립 목록으로
          </Text>
        </Link>
        <Text
          style={{
            fontFamily: family.kr,
            fontSize: 13.5,
            lineHeight: 23,
            color: inkA(0.66),
            marginBottom: 34,
          }}>
          8장이 전부 멀쩡해야 통과입니다. 각 카드에서 주황이 정확히 한 군데인지,
          그리고 ⑥번에서 무엇을 안 적었는지 티가 나지 않는지 보세요.
        </Text>

        {fixtures.map((f) => (
          <View key={f.dive.id} style={{ marginBottom: 40 }}>
            <Text
              style={{
                fontFamily: family.mono,
                fontSize: 11,
                letterSpacing: 1.3,
                color: inkA(0.5),
                marginBottom: 6,
              }}>
              {f.label}
            </Text>
            <Text
              style={{
                fontFamily: family.kr,
                fontSize: 12.5,
                color: surface.accent,
                marginBottom: 12,
              }}>
              {f.checks}
            </Text>

            <DiveCard dive={f.dive} region={f.region} width={cardW} />

            <Pressable
              onPress={() => onSave(f)}
              style={({ pressed }) => ({
                marginTop: 12,
                alignSelf: 'flex-start',
                paddingVertical: 9,
                paddingHorizontal: 16,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: surface.lineStrong,
                opacity: pressed ? 0.55 : 1,
              })}>
              <Text style={[tt.label, { color: inkA(0.78), fontSize: 11 }]}>
                PNG로 저장
              </Text>
            </Pressable>
          </View>
        ))}
        </View>
      </ScrollView>

      {/*
        화면 밖 1080 렌더. 보이는 카드를 확대하는 게 아니라 여기를 캡처한다.
        left를 크게 밀어 두면 레이아웃은 되지만 화면에는 안 보인다.
      */}
      {pending && (
        <View
          collapsable={false}
          style={{
            position: 'absolute',
            left: -EXPORT_W * 2,
            top: 0,
            width: exportRenderWidth(),
            height: exportRenderHeight(),
          }}>
          <DiveCard
            dive={pending.dive}
            region={pending.region}
            width={exportRenderWidth()}
            cardRef={shotRef}
          />
        </View>
      )}
    </SafeAreaView>
  );
}
