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
 */

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
  create(_options?: { intermediates?: boolean }) {}
  list(): File[] {
    return [];
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
  delete() {}
  copy(_dest: File) {}
}

export const Paths = { document: new Directory(DOC_URI), cache: new Directory('file:///cache/') };
