import type { RefObject } from 'react';
import type { View } from 'react-native';

/**
 * 웹 스텁.
 *
 * expo-media-library와 react-native-view-shot은 네이티브 전용이라 웹에서는 import만
 * 해도 'Cannot find native module' 로 터진다. 웹은 카드 레이아웃을 눈으로 확인하는
 * 용도로만 쓰므로 저장 경로는 막아 둔다.
 */

export type SaveResult = { uri: string; saved: boolean; reason?: string };

const UNSUPPORTED = '웹에서는 카드 저장을 지원하지 않습니다 (네이티브 전용)';

export async function captureCard(_ref: RefObject<View | null>): Promise<string> {
  throw new Error(UNSUPPORTED);
}

export async function saveCardToLibrary(_ref: RefObject<View | null>): Promise<SaveResult> {
  return { uri: '', saved: false, reason: UNSUPPORTED };
}
