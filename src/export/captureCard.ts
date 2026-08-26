import type { RefObject } from 'react';
import type { View } from 'react-native';
import { File } from 'expo-file-system';
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
 * ⚠️ `captureRef`가 만든 파일은 **캐시에 남는다.** 사진첩으로 복사한 뒤 지우지 않으면
 * 저장 한 번에 1080×1920 PNG가 하나씩 쌓인다. 카드는 §7의 핵심 동작이라 반복 호출된다.
 *
 * 웹에는 captureCard.web.ts 스텁이 대신 잡힌다 (둘 다 네이티브 전용).
 */

export type SaveResult = { uri: string; saved: boolean; reason?: string };

export async function captureCard(ref: RefObject<View | null>): Promise<string> {
  return captureRef(ref, { format: 'png', quality: 1 });
}

/** 캡처가 캐시에 남긴 임시 파일을 치운다. 실패해도 저장 결과에 영향을 주면 안 된다 */
const discard = (uri: string) => {
  try {
    const f = new File(uri);
    if (f.exists) f.delete();
  } catch {
    // 이미 없거나 접근 불가 — 조용히 넘어간다
  }
};

export async function saveCardToLibrary(ref: RefObject<View | null>): Promise<SaveResult> {
  const uri = await captureCard(ref);
  const perm = await requestPermissionsAsync();
  // 권한이 없으면 사진첩에 못 넣는다. 임시 파일을 남길 이유도 없다.
  if (!perm.granted) {
    discard(uri);
    return { uri, saved: false, reason: '사진 접근 권한이 없습니다' };
  }
  try {
    await Asset.create(uri);
  } finally {
    // 사진첩으로 복사가 끝났으므로 원본은 필요 없다 (실패해도 마찬가지)
    discard(uri);
  }
  return { uri, saved: true };
}
