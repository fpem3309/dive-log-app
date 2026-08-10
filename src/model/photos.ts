import { Directory, File, Paths } from 'expo-file-system';

/**
 * 고른 사진을 앱이 소유하는 곳으로 복사해 둔다.
 *
 * ⚠️ 이미지 피커가 돌려주는 uri는 **캐시/임시 경로**다. iOS는 저장 공간이 모자라면
 * 캐시를 예고 없이 비운다 — 그 uri를 그대로 저장하면 며칠 뒤 카드를 열었을 때
 * 사진만 사라져 있다. 로그는 몇 년을 보관하는 물건이라 이건 치명적이다.
 *
 * 그래서 문서 디렉토리(`Paths.document`)로 복사하고 그 경로를 저장한다.
 * 문서 디렉토리는 OS가 임의로 지우지 않는다.
 */

const DIR_NAME = 'dive-photos';

const photoDir = () => {
  const dir = new Directory(Paths.document, DIR_NAME);
  if (!dir.exists) dir.create({ intermediates: true });
  return dir;
};

/** 확장자만 뽑는다 — 쿼리스트링이 붙어 오는 경우가 있다 */
const extOf = (uri: string) => {
  const tail = uri.split('/').pop() ?? '';
  const ext = tail.split('?')[0].split('.').pop();
  return ext && ext.length <= 5 ? ext : 'jpg';
};

/**
 * @param sourceUri 피커가 준 uri
 * @param key 다이브 id — 다이브당 사진 1장이라 그대로 파일명으로 쓴다
 * @returns 저장된 파일의 uri. 실패하면 원본 uri를 그대로 돌려준다
 *          (사진이 안 붙는 것보다는 캐시 경로라도 붙는 편이 낫다)
 */
export function persistPhoto(sourceUri: string, key: string): string {
  try {
    const dest = new File(photoDir(), `${key}.${extOf(sourceUri)}`);
    if (dest.exists) dest.delete();
    new File(sourceUri).copy(dest);
    return dest.uri;
  } catch {
    return sourceUri;
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
