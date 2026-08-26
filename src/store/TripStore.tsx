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
import { useConfirm } from '@/ui/Confirm';
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

/** 저장이 거부됐을 때 다시 시도하는 간격(ms). 다 쓰면 화면에 띄운다. */
const RETRY_DELAYS = [200, 600, 1500];

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

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
  const { notify } = useConfirm();

  /** 저장 루프가 항상 집어 가는 최신 상태. 실패한 옛 스냅샷을 재시도하면 그 사이 적은 게 날아간다 */
  const latest = useRef<DB>(db);
  /** 변경할 때마다 오르는 번호 / 마지막으로 디스크에 들어간 번호 */
  const version = useRef(0);
  const savedVersion = useRef(0);
  const running = useRef(false);
  /** 실패를 이미 알렸는지 — 타이핑할 때마다 모달이 뜨면 안 된다. 한 번 성공하면 풀린다 */
  const warned = useRef(false);

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

  /**
   * 저장 — 실패하면 몇 번 더 시도하고, 그래도 안 되면 화면에 띄운다.
   *
   * `saveDB`는 던진다. 예전에는 `void saveDB(db)`라 거부가 unhandled rejection으로
   * 조용히 흘러갔다 — 저녁 내내 쓴 8다이브가 안 저장된 걸 사용자가 몰랐다.
   *
   * 재시도는 **매번 `latest.current`를 다시 집는다.** 실패한 스냅샷을 붙들고 있으면
   * 재시도가 성공하는 순간 그 사이 적은 것이 덮여 사라진다. 저장이 도는 동안 들어온
   * 변경은 버전 번호로 잡아서, 루프가 최신 버전까지 따라간 뒤에 끝난다.
   */
  const persist = useCallback(async () => {
    if (running.current) return; // 돌고 있는 루프가 최신 버전까지 책임진다
    running.current = true;
    try {
      while (savedVersion.current !== version.current) {
        let ok = false;
        for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
          if (attempt > 0) await delay(RETRY_DELAYS[attempt - 1]);
          const target = version.current; // 지금 쓰려는 상태의 번호
          try {
            await saveDB(latest.current);
            savedVersion.current = target;
            warned.current = false;
            ok = true;
            break;
          } catch {
            // 다음 회차에서 최신 상태로 다시 시도한다
          }
        }
        if (!ok) {
          if (!warned.current) {
            warned.current = true;
            // 기다리지 않는다 — 모달이 떠 있는 동안에도 다음 변경이 저장을 다시 시도할 수 있어야 한다
            void notify(
              '저장되지 않았습니다',
              '방금 적은 내용이 이 기기에 저장되지 않았습니다. 저장 공간이 부족하지는 않은지 살펴봐 주세요.',
            );
          }
          return; // 여기서 멈춘다. 다음 변경 때 다시 시도한다
        }
      }
    } finally {
      running.current = false;
    }
  }, [notify]);

  // 불러오기 전에는 저장하지 않는다 — 빈 상태로 덮어쓰면 데이터가 날아간다
  useEffect(() => {
    latest.current = db;
    if (!ready) return;
    version.current += 1;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      void persist();
    }, 350);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [db, ready, persist]);

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
    // 사진 파일도 같이 치운다 — 안 그러면 문서 디렉토리에 계속 쌓인다.
    // ⚠️ setDb 업데이터 안에서 지우지 않는다. 업데이터는 순수해야 하고, StrictMode는
    // 개발 중 두 번 부른다 (파일 삭제가 두 번 실행된다).
    latest.current.trips.find((t) => t.id === tripId)?.dives.forEach((d) => deletePhotoOf(d));
    setDb((prev) => ({ ...prev, trips: prev.trips.filter((t) => t.id !== tripId) }));
  }, []);

  const addDive = useCallback<Ctx['addDive']>(
    (tripId, init) => {
      /*
       * ⚠️ `...init`이 **맨 위**다. 아래에 두면 `init`에 명시적 `undefined`가 들어왔을 때
       * (`{ date: undefined }`) 기본값을 도로 지운다 — `??`는 그 앞에서 이미 끝나 있다.
       * id는 항상 새로 만든다.
       */
      const dive: Dive = {
        ...init,
        id: newId('dive'),
        date: init?.date ?? todayISO(),
        site: init?.site ?? '',
        discipline: init?.discipline ?? 'scuba',
        sightings: init?.sightings ?? [],
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
    (tripId, diveId) => {
      // deleteTrip과 같은 이유로 업데이터 밖에서 지운다
      const trip = latest.current.trips.find((t) => t.id === tripId);
      deletePhotoOf(trip?.dives.find((d) => d.id === diveId));
      mutateTrip(tripId, (t) => ({ ...t, dives: t.dives.filter((d) => d.id !== diveId) }));
    },
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
