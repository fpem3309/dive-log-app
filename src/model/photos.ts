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
export function persistPhoto(sourceUri: string, key: string): string {
  try {
    const dir = photoDir();
    filesOf(key).forEach((f) => f.delete());
    const dest = new File(dir, `${key}.${Date.now().toString(36)}.${extOf(sourceUri)}`);
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
