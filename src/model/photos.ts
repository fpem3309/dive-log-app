import { Directory, File, Paths } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { ASPECT, EXPORT_H, EXPORT_W } from '@/design/scale';

/**
 * 고른 사진을 앱이 소유하는 곳으로 복사해 둔다.
 *
 * ⚠️ 이미지 피커가 돌려주는 uri는 **캐시/임시 경로**다. iOS는 저장 공간이 모자라면
 * 캐시를 예고 없이 비운다 — 그 uri를 그대로 저장하면 며칠 뒤 카드를 열었을 때
 * 사진만 사라져 있다. 로그는 몇 년을 보관하는 물건이라 이건 치명적이다.
 *
 * 그래서 문서 디렉토리(`Paths.document`)로 복사하고 그 경로를 저장한다.
 * 문서 디렉토리는 OS가 임의로 지우지 않는다.
 *
 * 그리고 **9:16으로 직접 자른다.** 피커에게 맡길 수 없다 — 아래 cropTo916 주석 참조.
 */

const DIR_NAME = 'dive-photos';

const photoDir = () => {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

/** 확장자만 뽑는다 — 쿼리스트링이 붙어 오는 경우가 있다 (소스 uri 기준) */
const extOf = (uri: string) => {
  const tail = uri.split('/').pop() ?? '';
  const ext = tail.split('?')[0].split('.').pop();
  return ext && ext.length <= 5 ? ext : 'jpg';
};

/** 이 다이브가 쓰던 파일들 — 확장자가 뭐였든 전부 */
const filesOf = (key: string) => {
  try {
    return photoDir()
      .list()
      .filter((f): f is File => f instanceof File && f.name.startsWith(`${key}.`));
  } catch {
    return [];
  }
};

/**
 * 카드 비율(9:16)로 가운데를 잘라 낸다.
 *
 * ⚠️ `expo-image-picker`의 `allowsEditing` + `aspect: [9,16]`으로는 안 된다.
 * **`aspect`는 Android 전용이라 iOS에서 조용히 무시된다** — 시뮬레이터에서 실측했다:
 *   가로 1600×900 → 1200×675 (원본 비율 그대로)
 *   세로  900×1600 →  679×679 (정사각형)
 * 정사각으로 잘린 사진이 카드의 `resizeMode="cover"`에서 또 잘리므로 **손실이 두 번**이고,
 * 사용자가 고른 크롭이 카드에서 어떻게 살아남을지 예측할 수 없었다.
 *
 * 그래서 피커의 크롭 UI를 끄고(원본을 받는다) 여기서 한 번만 자른다.
 * 가운데를 자르는 건 카드의 `cover`와 같은 규칙이라 **피커에서 본 것이 카드에 그대로 나온다.**
 * 긴 변을 EXPORT 크기(1080×1920)로 맞춰 파일도 줄인다 — 카드가 그보다 크게 쓸 일이 없다.
 */
async function cropTo916(uri: string): Promise<string> {
  const ctx = ImageManipulator.manipulate(uri);
  const img = await ctx.renderAsync();
  const { width: w, height: h } = img;
  // 원본보다 세로로 길면 좌우를, 아니면 위아래를 버린다
  const tall = h / w > ASPECT;
  const cw = tall ? w : Math.round(h / ASPECT);
  const ch = tall ? Math.round(w * ASPECT) : h;
  const out = await ctx
    .crop({ originX: Math.round((w - cw) / 2), originY: Math.round((h - ch) / 2), width: cw, height: ch })
    .resize({ width: Math.min(cw, EXPORT_W), height: Math.min(ch, EXPORT_H) })
    .renderAsync();
  const saved = await out.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
  return saved.uri;
}

/**
 * @param sourceUri 피커가 준 uri
 * @param key 다이브 id — 다이브당 사진 1장이다
 * @returns 저장된 파일의 uri. 실패하면 원본 uri를 그대로 돌려준다
 *          (사진이 안 붙는 것보다는 캐시 경로라도 붙는 편이 낫다)
 *
 * ⚠️ 파일명에 타임스탬프를 붙인다. 예전엔 `${key}.${ext}`로 고정이었는데, 사진을 바꿔도
 * **uri 문자열이 똑같아서** React는 prop이 안 바뀐 줄 알고, RN Image는 uri로 캐시한 옛
 * 사진을 계속 보여줬다 — 사용자는 새 사진을 골랐는데 옛 사진이 그대로다.
 * (덤으로 jpg→png처럼 확장자가 바뀌면 옛 파일이 영영 남았다.)
 * 새 파일을 쓰기 전에 이 다이브의 옛 파일을 **확장자와 무관하게** 전부 치운다.
 */
export async function persistPhoto(sourceUri: string, key: string): Promise<string> {
  // 자르기가 실패해도 사진은 붙어야 한다 — 원본으로 넘어간다
  let src = sourceUri;
  let cropped = false;
  try {
    src = await cropTo916(sourceUri);
    cropped = true;
  } catch {
    src = sourceUri;
  }
  try {
    const dir = photoDir();
    filesOf(key).forEach((f) => f.delete());
    const dest = new File(dir, `${key}.${Date.now().toString(36)}.${extOf(src)}`);
    new File(src).copy(dest);
    // 피커·매니퓰레이터가 캐시에 남긴 원본은 복사가 끝나면 필요 없다.
    // 안 지우면 장당 몇 MB가 캐시에 그대로 쌓인다 (시뮬레이터에서 확인).
    discardCache(sourceUri);
    if (cropped) discardCache(src);
    return dest.uri;
  } catch {
    return src;
  }
}

/** 앱이 소유하지 않는 캐시 사본을 지운다. 실패는 조용히 넘긴다 */
function discardCache(uri: string): void {
  try {
    const f = new File(uri);
    if (!f.uri.includes(DIR_NAME) && f.exists) f.delete();
  } catch {
    // 이미 없거나 접근 불가
  }
}

/**
 * 저장된 사진 경로를 **지금 컨테이너 기준으로 다시 만든다.**
 *
 * ⚠️ iOS 앱 컨테이너의 UUID는 고정이 아니다 — 앱을 업데이트하면 바뀐다.
 * `file:///.../Application/<UUID>/Documents/dive-photos/x.jpg`를 그대로 저장해 두면
 * 업데이트 뒤에 **파일은 멀쩡한데 경로만 죽어서 사진이 사라진다.** 시뮬레이터 재설치로
 * 실제로 재현했다 (썸네일이 빈칸이 됐다).
 *
 * 이 앱이 사진을 캐시에서 문서 디렉토리로 복사하는 이유가 "몇 년 뒤에도 살아 있게"인데,
 * 절대경로를 저장하면 그 목적이 무너진다. 그래서 **파일명만 믿고 경로는 매번 다시 만든다.**
 * 불러올 때(storage.ts) 한 번 통과시키므로 저장된 값도 자연스럽게 최신 경로로 고쳐진다.
 */
export function resolvePhotoUri(uri: string): string {
  if (!uri.includes(`/${DIR_NAME}/`)) return uri; // 우리가 만든 게 아니면 그대로
  try {
    const name = uri.split('/').pop();
    if (!name) return uri;
    return new File(new Directory(Paths.document, DIR_NAME), name).uri;
  } catch {
    return uri;
  }
}

/** 사진을 빼거나 다이브를 지울 때 — 남겨 두면 계속 쌓인다 */
export function deletePhoto(uri?: string): void {
  if (!uri) return;
  try {
    const f = new File(uri);
    // 우리가 복사해 둔 것만 지운다. 피커 캐시 경로는 건드리지 않는다.
    if (f.uri.includes(DIR_NAME) && f.exists) f.delete();
  } catch {
    // 이미 없거나 접근 불가 — 조용히 넘어간다
  }
}
