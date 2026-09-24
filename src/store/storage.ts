import AsyncStorage from '@react-native-async-storage/async-storage';

import { todayISO } from '@/model/dates';
import { resolvePhotoUri } from '@/model/photos';
import type { Dive, Trip } from '@/model/types';

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

/**
 * 깨진 항목을 **버리지 않고 고쳐서** 돌려준다.
 *
 * 저장소가 조금 상했다고 앱 전체가 못 뜨면 안 된다는 게 `loadDB`의 존재 이유인데,
 * 그렇다고 트립을 통째로 버리면 사용자 기록이 날아간다. 그래서 화면이 실제로 건드리는
 * 필드만 채워 준다 — `tripTitle()`은 `title.trim()`을, `autoTripTitle()`은 `region.split()`을
 * 부르고, 목록·상세는 `[...trip.dives]`를 편다. 하나라도 없으면 그 자리에서 터진다.
 *
 * 식별자(id)가 없는 것만 버린다. 그건 고쳐도 가리킬 대상이 없다.
 */
const repairDive = (d: Partial<Dive>): Dive => ({
  ...d,
  // 앱 컨테이너 UUID가 바뀌면 옛 절대경로는 죽는다 (resolvePhotoUri 주석 참조)
  photo:
    d.photo && typeof d.photo === 'object' && 'uri' in d.photo
      ? { uri: resolvePhotoUri(d.photo.uri) }
      : d.photo,
  id: d.id as string,
  date: typeof d.date === 'string' ? d.date : todayISO(),
  site: typeof d.site === 'string' ? d.site : '',
  discipline: d.discipline === 'free' ? 'free' : 'scuba',
  sightings: Array.isArray(d.sightings) ? d.sightings : [],
});

const repairTrip = (t: Partial<Trip>): Trip => {
  const startDate = typeof t.startDate === 'string' ? t.startDate : todayISO();
  return {
    ...t,
    id: t.id as string,
    title: typeof t.title === 'string' ? t.title : '',
    region: typeof t.region === 'string' ? t.region : '',
    startDate,
    endDate: typeof t.endDate === 'string' ? t.endDate : startDate,
    dives: (Array.isArray(t.dives) ? t.dives : [])
      .filter((d) => d && typeof d.id === 'string')
      .map(repairDive),
  };
};

const hasId = (t: unknown): t is Partial<Trip> =>
  typeof t === 'object' && t !== null && typeof (t as Partial<Trip>).id === 'string';

export async function loadDB(): Promise<DB> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return emptyDB();
    const parsed = JSON.parse(raw) as Partial<DB>;
    return {
      // ⚠️ 모양까지 본다 — `trips`가 배열인 것만 확인하면 그 안의 트립에 `dives`가 없을 때
      // 화면에서 `[...trip.dives]`가 터진다 (repairTrip 주석 참조)
      trips: Array.isArray(parsed.trips) ? parsed.trips.filter(hasId).map(repairTrip) : [],
      settings: { onboarded: false, ...parsed.settings },
    };
  } catch {
    // 저장된 값이 깨졌다고 앱이 못 뜨면 안 된다. 빈 상태로 시작한다.
    return emptyDB();
  }
}

/**
 * 실패하면 **던진다.** 여기서 삼키면 저장이 안 된 걸 아무도 모른다 — 앱 전체가
 * 이 로컬 저장 하나에 얹혀 있어서(§6) 저녁 내내 쓴 8다이브가 조용히 사라진다.
 * 재시도와 사용자 알림은 호출부(`TripStore`)가 책임진다.
 */
export async function saveDB(db: DB): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(db));
}

/** 개발용 — 저장소를 비운다 */
export async function clearDB(): Promise<void> {
  await AsyncStorage.removeItem(KEY);
}
