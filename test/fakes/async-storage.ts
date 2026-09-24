/**
 * AsyncStorage 대역 — 메모리 Map 하나.
 *
 * 저장소 **백엔드**를 대신하는 것이지 동작을 흉내 내는 게 아니다. 이게 있어야
 * `saveDB`가 거부되는 상황(㉞)을 만들 수 있는데, 그건 실제 기기에서 재현하기가
 * 사실상 불가능하다 (디스크를 채워야 한다).
 */

const memory = new Map<string, string>();

let failing = false;

export const fake = {
  /** setItem이 던지게 한다 — 저장 공간 부족 상황 */
  fail(on: boolean) {
    failing = on;
  },
  /** setItem이 실제로 성공한 횟수 */
  writes: 0,
  reset() {
    memory.clear();
    failing = false;
    fake.writes = 0;
  },
  keys: () => [...memory.keys()],
  raw: (key: string) => memory.get(key) ?? null,
  /**
   * 저장소가 쓰는 키를 코드에서 알아낸다. 키 문자열을 테스트에 베껴 두면
   * 나중에 키가 바뀌었을 때 테스트가 조용히 다른 걸 검사하게 된다.
   */
  onlyKey(): string {
    const keys = fake.keys();
    if (keys.length !== 1) throw new Error(`키가 1개가 아니다: ${JSON.stringify(keys)}`);
    return keys[0];
  },
  put(key: string, value: string) {
    memory.set(key, value);
  },
};

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return memory.get(key) ?? null;
  },
  async setItem(key: string, value: string): Promise<void> {
    if (failing) throw new Error('저장 공간이 없습니다 (테스트)');
    memory.set(key, value);
    fake.writes += 1;
  },
  async removeItem(key: string): Promise<void> {
    memory.delete(key);
  },
};

export default AsyncStorage;
