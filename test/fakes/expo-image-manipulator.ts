/**
 * expo-image-manipulator 자리막이.
 *
 * `photos.ts`가 최상단에서 import하기 때문에 `resolvePhotoUri` 하나를 부르려 해도
 * 모듈 전체가 로드된다. 실제 구현은 expo-modules-core를 끌고 오고 네이티브가 없는
 * 곳에서는 뜨지 않는다.
 *
 * **부르면 던진다.** 자르기(㊹)·캐시 정리(㊻)는 기기에서만 확인되는 것이고,
 * 여기서 가짜로 통과시키면 "확인했다"는 착각만 남는다.
 */

const nope = (): never => {
  throw new Error('expo-image-manipulator는 테스트에서 부를 수 없다 (기기에서 확인한다)');
};

export const ImageManipulator = { manipulate: nope };
export const SaveFormat = { JPEG: 'jpeg', PNG: 'png' } as const;
