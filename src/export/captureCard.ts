import type { RefObject } from 'react';
import type { View } from 'react-native';
import { Asset, requestPermissionsAsync } from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';

/**
 * 카드를 PNG로 저장.
 *
 * 화면에 보이는 카드를 확대 캡처하지 않는다. 화면 밖에 카드를 따로 렌더해서 그 쪽을
 * 캡처한다 — 카드가 width만 받고 치수를 유도하는 구조라 가능한 방법이다.
 * 렌더 폭은 `exportRenderWidth()`(= 1080 / 기기 배율)를 쓴다. 자세한 이유는 scale.ts 주석.
 *
 * ⚠️ `saveToLibraryAsync`를 쓰지 않는다. SDK 57에서 폐기됐고 **호출하면 런타임에 throw**한다
 * ("Method saveToLibraryAsync ... is deprecated"). 빌드는 통과하므로 실기기에서 눌러 보기
 * 전까지 드러나지 않는다. 새 클래스 API인 `Asset.create(uri)`를 쓴다.
 *
 * 웹에는 captureCard.web.ts 스텁이 대신 잡힌다 (둘 다 네이티브 전용).
 */

export type SaveResult = { uri: string; saved: boolean; reason?: string };

export async function captureCard(ref: RefObject<View | null>): Promise<string> {
  return captureRef(ref, { format: 'png', quality: 1 });
}

export async function saveCardToLibrary(ref: RefObject<View | null>): Promise<SaveResult> {
  const uri = await captureCard(ref);
  const perm = await requestPermissionsAsync();
  if (!perm.granted) return { uri, saved: false, reason: '사진 접근 권한이 없습니다' };
  await Asset.create(uri);
  return { uri, saved: true };
}
