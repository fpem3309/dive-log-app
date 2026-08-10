import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { todayISO } from '@/model/dates';
import { newId } from '@/model/ids';
import { deletePhoto } from '@/model/photos';
import type { Dive, Trip } from '@/model/types';
import { emptyDB, loadDB, saveDB, type DB, type Settings } from './storage';

/**
 * 앱 전체 상태. 트립 배열 하나가 전부라 스토어를 나눌 이유가 없다.
 *
 * 저장은 변경 후 짧게 미뤄서(디바운스) 한 번에 쓴다 — 입력 화면에서 타이핑할 때마다
 * 디스크를 때리지 않게 하려는 것.
 */

type Ctx = {
  /** 저장소에서 불러오기 전에는 false — 이때 화면을 그리면 빈 상태가 잠깐 보인다 */
  ready: boolean;
  trips: Trip[];
  settings: Settings;
  /** diveId → 누적 번호. 저장하지 않고 매번 계산한다 (아래 주석 참조) */
  diveNumbers: Map<string, number>;
  /** 내가 전에 적은 생물 이름 — 최근 순. §3의 생물 입력 제안에 쓴다 */
  speciesHistory: string[];

  createTrip: (init?: Partial<Trip>) => Trip;
  updateTrip: (tripId: string, patch: Partial<Trip>) => void;
  deleteTrip: (tripId: string) => void;

  addDive: (tripId: string, init?: Partial<Dive>) => Dive;
  updateDive: (tripId: string, diveId: string, patch: Partial<Dive>) => void;
  deleteDive: (tripId: string, diveId: string) => void;

  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
};

const TripContext = createContext<Ctx | null>(null);

/**
 * 누적 다이브 번호는 저장하지 않고 계산한다.
 *
 * 저장해 두면 나중에 빠뜨린 다이브를 중간에 끼워 넣을 때 뒤 번호가 전부 틀어진다.
 * 실제 사용자는 여행 다녀와서 몰아 쓰다가 "아 그날 한 번 더 탔지" 하고 끼워 넣는다.
 * 날짜순으로 매번 다시 세면 항상 맞는다.
 */
const computeDiveNumbers = (trips: Trip[], start?: number): Map<string, number> => {
  const map = new Map<string, number>();
  if (start == null) return map; // 온보딩에서 안 받았으면 번호를 안 매긴다

  const scuba = trips
    .flatMap((t) => t.dives)
    .filter((d) => d.discipline === 'scuba')
    .sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      const at = a.time ?? '';
      const bt = b.time ?? '';
      if (at !== bt) return at < bt ? -1 : 1;
      return a.id < b.id ? -1 : 1;
    });

  scuba.forEach((d, i) => map.set(d.id, start + i + 1));
  return map;
};

/** 다이브에 붙은 사진 파일을 지운다 (앱이 복사해 둔 것만) */
const deletePhotoOf = (dive?: Dive) => {
  const photo = dive?.photo;
  if (photo && typeof photo === 'object' && 'uri' in photo) deletePhoto(photo.uri);
};

const computeSpeciesHistory = (trips: Trip[]): string[] => {
  const seen = new Map<string, string>(); // 소문자 키 → 원래 표기
  const dives = trips.flatMap((t) => t.dives).sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const d of dives) {
    for (const s of d.sightings) {
      const key = s.name.trim().toLowerCase();
      if (key && !seen.has(key)) seen.set(key, s.name.trim());
    }
  }
  return [...seen.values()];
};

export function TripProvider({ children }: { children: ReactNode }) {
  const [db, setDb] = useState<DB>(emptyDB);
  const [ready, setReady] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let alive = true;
    loadDB().then((loaded) => {
      if (!alive) return;
      setDb(loaded);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // 불러오기 전에는 저장하지 않는다 — 빈 상태로 덮어쓰면 데이터가 날아간다
  useEffect(() => {
    if (!ready) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void saveDB(db);
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [db, ready]);

  const mutateTrip = useCallback((tripId: string, fn: (t: Trip) => Trip) => {
    setDb((prev) => ({
      ...prev,
      trips: prev.trips.map((t) => (t.id === tripId ? fn(t) : t)),
    }));
  }, []);

  const createTrip = useCallback<Ctx['createTrip']>((init) => {
    const today = todayISO();
    const startDate = init?.startDate ?? today;
    const endDate = init?.endDate ?? startDate;
    const region = init?.region ?? '';
    const trip: Trip = {
      id: newId('trip'),
      // 비워 둔다 — 표시할 때 tripTitle()이 지역·기간으로 만들어 준다 (§4)
      title: init?.title?.trim() ?? '',
      region,
      startDate,
      endDate,
      dives: init?.dives ?? [],
    };
    setDb((prev) => ({ ...prev, trips: [trip, ...prev.trips] }));
    return trip;
  }, []);

  const updateTrip = useCallback<Ctx['updateTrip']>(
    (tripId, patch) => mutateTrip(tripId, (t) => ({ ...t, ...patch })),
    [mutateTrip],
  );

  const deleteTrip = useCallback<Ctx['deleteTrip']>((tripId) => {
    setDb((prev) => {
      // 사진 파일도 같이 치운다 — 안 그러면 문서 디렉토리에 계속 쌓인다
      prev.trips.find((t) => t.id === tripId)?.dives.forEach((d) => deletePhotoOf(d));
      return { ...prev, trips: prev.trips.filter((t) => t.id !== tripId) };
    });
  }, []);

  const addDive = useCallback<Ctx['addDive']>(
    (tripId, init) => {
      const dive: Dive = {
        id: newId('dive'),
        date: init?.date ?? todayISO(),
        site: init?.site ?? '',
        discipline: init?.discipline ?? 'scuba',
        sightings: init?.sightings ?? [],
        ...init,
      };
      mutateTrip(tripId, (t) => ({ ...t, dives: [...t.dives, dive] }));
      return dive;
    },
    [mutateTrip],
  );

  const updateDive = useCallback<Ctx['updateDive']>(
    (tripId, diveId, patch) =>
      mutateTrip(tripId, (t) => ({
        ...t,
        dives: t.dives.map((d) => (d.id === diveId ? { ...d, ...patch } : d)),
      })),
    [mutateTrip],
  );

  const deleteDive = useCallback<Ctx['deleteDive']>(
    (tripId, diveId) =>
      mutateTrip(tripId, (t) => {
        deletePhotoOf(t.dives.find((d) => d.id === diveId));
        return { ...t, dives: t.dives.filter((d) => d.id !== diveId) };
      }),
    [mutateTrip],
  );

  const updateSettings = useCallback<Ctx['updateSettings']>((patch) => {
    setDb((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const resetAll = useCallback(() => setDb(emptyDB()), []);

  const diveNumbers = useMemo(
    () => computeDiveNumbers(db.trips, db.settings.diveNumberStart),
    [db.trips, db.settings.diveNumberStart],
  );
  const speciesHistory = useMemo(() => computeSpeciesHistory(db.trips), [db.trips]);

  const value = useMemo<Ctx>(
    () => ({
      ready,
      trips: db.trips,
      settings: db.settings,
      diveNumbers,
      speciesHistory,
      createTrip,
      updateTrip,
      deleteTrip,
      addDive,
      updateDive,
      deleteDive,
      updateSettings,
      resetAll,
    }),
    [
      ready,
      db.trips,
      db.settings,
      diveNumbers,
      speciesHistory,
      createTrip,
      updateTrip,
      deleteTrip,
      addDive,
      updateDive,
      deleteDive,
      updateSettings,
      resetAll,
    ],
  );

  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrips(): Ctx {
  const ctx = useContext(TripContext);
  if (!ctx) throw new Error('useTrips는 <TripProvider> 안에서만 쓸 수 있습니다');
  return ctx;
}

/** 카드에 넘길 때 계산된 누적 번호를 채워 준다 */
export function useResolvedDive(dive: Dive): Dive {
  const { diveNumbers } = useTrips();
  const n = diveNumbers.get(dive.id);
  return n == null ? dive : { ...dive, diveNumber: n };
}
