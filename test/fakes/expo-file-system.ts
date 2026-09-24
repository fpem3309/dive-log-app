/**
 * expo-file-system 대역 — **경로 조립만** 흉내 낸다.
 *
 * 이걸로 검사하는 건 `resolvePhotoUri`가 저장된 사진 경로를 "지금 문서 디렉토리"
 * 기준으로 **다시 만드는가** 하나뿐이다 (㊺: 앱 컨테이너 UUID가 바뀌면 옛 절대경로는
 * 죽는다). 파일이 실제로 읽히는지 · 캐시가 지워지는지는 여기서 확인할 수 없고,
 * 확인하려 들면 안 된다 — 그건 기기에서 본다.
 *
 * 그래서 `document`를 일부러 **새 UUID**로 둔다. 옛 경로를 그대로 통과시키는 구현은
 * 이 대역 위에서 바로 빨개진다.
 *
 * ⚠️ **파일을 실제로 만지는 것은 전부 던진다.** 예전엔 `copy`·`delete`가 조용한 no-op였는데,
 * 그러면 `persistPhoto`가 자르기도 복사도 아무것도 안 하고 **그럴듯한 문서 경로를 돌려주면서
 * 테스트가 초록이 된다.** 이게 정확히 "모킹은 문서대로 행동하는 가짜라 그 부류 버그를
 * 정의상 못 잡는다"는 함정이다 — 통과시키는 가짜가 아니라 **차단기**여야 한다.
 * 파일 I/O를 검사하고 싶어지면 여기를 고치지 말고 시뮬레이터로 가라 (§10-㊸).
 */

const blocked = (what: string): never => {
  throw new Error(
    `${what}: 파일 I/O는 이 대역에서 못 한다. 실제 동작은 시뮬레이터에서 확인해라 (§10-㊸·㊹·㊻).`,
  );
};

export const DOC_URI = 'file:///data/Application/NEW-CONTAINER-UUID/Documents/';

const uriOf = (p: string | { uri: string }) => (typeof p === 'string' ? p : p.uri);

const join = (parts: (string | { uri: string })[]) =>
  parts
    .map(uriOf)
    .reduce((acc, seg) => `${acc.replace(/\/+$/, '')}/${seg.replace(/^\/+/, '')}`);

export class Directory {
  uri: string;
  exists = true;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = `${join(parts).replace(/\/+$/, '')}/`;
  }
  create(_options?: { intermediates?: boolean }): never {
    return blocked('Directory.create');
  }
  list(): never {
    return blocked('Directory.list');
  }
}

export class File {
  uri: string;
  exists = false;
  constructor(...parts: (string | { uri: string })[]) {
    this.uri = join(parts).replace(/\/+$/, '');
  }
  get name() {
    return this.uri.split('/').pop() ?? '';
  }
  delete(): never {
    return blocked('File.delete');
  }
  copy(_dest: File): never {
    return blocked('File.copy');
  }
}

export const Paths = { document: new Directory(DOC_URI), cache: new Directory('file:///cache/') };
