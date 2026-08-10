import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Trip } from '@/model/types';

/**
 * 로컬 저장 — CLAUDE.md §6 "로컬 우선". 계정·서버는 나중이다.
 *
 * 트립 전체를 통짜 JSON으로 넣는다. 개인 로그는 수백~수천 건이라 성능 문제가 없고,
 * 모델이 아직 흔들리는 단계라 스키마·마이그레이션 비용을 지지 않는 쪽이 낫다.
 * (§8의 "로컬 저장으로 충분히 오래 버틸 수 있다"와 같은 판단.)
 */

const KEY = 'dive-log/v1';

export type Settings = {
  /**
   * 앱을 켜기 전까지 이미 한 스쿠버 다이브 수 — CLAUDE.md §4 주의.
   * 이 값이 없으면 누적 번호를 매기지 않는다 (횟수형 카드가 안 나올 뿐, 앱은 정상 동작).
   */
  diveNumberStart?: number;
  /** 온보딩을 한 번이라도 지났는지 (건너뛴 것도 포함) */
  onboarded: boolean;
};

export type DB = {
  trips: Trip[];
  settings: Settings;
};

export const emptyDB = (): DB => ({ trips: [], settings: { onboarded: false } });

export async function loadDB(): Promise<DB> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as Partial<DB>;
    return {
      trips: Array.isArray(parsed.trips) ? parsed.trips : [],
      settings: { onboarded: false, ...parsed.settings },
    };
  } catch {
    // 저장된 값이 깨졌다고 앱이 못 뜨면 안 된다. 빈 상태로 시작한다.
    return emptyDB();
  }
}

export async function saveDB(db: DB): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

/** 개발용 — 저장소를 비운다 */
export async function clearDB(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
