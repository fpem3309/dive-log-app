import { beforeEach, describe, expect, it } from 'vitest';

import { autoTripTitle, daysOfTrip, todayISO, tripTitle } from '@/model/dates';
import { resolvePhotoUri } from '@/model/photos';
import { heroCandidates, resolveHero } from '@/model/chooseHero';
import { cellsFor } from '@/cards/parts/fields';
import { highlightOf } from '@/model/types';
import { clearDB, emptyDB, loadDB, saveDB } from '@/store/storage';
import { fake } from './fakes/async-storage';
import { DOC_URI } from './fakes/expo-file-system';
import { heart, minimal } from './support/dives';
import { expectCardComplete } from './support/invariants';

/**
 * 묶음 2 — 저장소를 한 바퀴 돌아도 멀쩡하다.
 *
 * 여기서 "상한 저장소"는 가정이 아니다. ㊷은 `dives`가 없는 트립을 불러와
 * `[...trip.dives]`에서 앱이 통째로 못 뜬 실제 버그다.
 *
 * 마지막 검사가 이 파일이 "통합"인 이유다 — 복구된 다이브를 그대로 묶음 1의
 * 불변식에 넣는다. 저장소를 돌아 나온 데이터도 카드가 될 수 있어야 한다.
 */

/** 저장소가 쓰는 키를 코드에서 얻는다 (테스트에 키 문자열을 베끼지 않는다) */
const storageKey = async () => {
  await saveDB(emptyDB());
  return fake.onlyKey();
};

const seed = async (value: unknown) => {
  const key = await storageKey();
  fake.put(key, typeof value === 'string' ? value : JSON.stringify(value));
};

/** 화면이 실제로 하는 짓을 데이터 위에서 그대로 해 본다 — 하나라도 없으면 여기서 터진다 */
const expectTripUsable = (trip: Awaited<ReturnType<typeof loadDB>>['trips'][number]) => {
  expect(() => [...trip.dives]).not.toThrow();
  expect(tripTitle(trip).trim().length).toBeGreaterThan(0);
  expect(autoTripTitle(trip.region, trip.startDate, trip.endDate).trim().length).toBeGreaterThan(0);
  expect(daysOfTrip(trip.startDate, trip.endDate).length).toBeGreaterThan(0);
  for (const dive of trip.dives) {
    expect(Array.isArray(dive.sightings)).toBe(true);
    expect(() => highlightOf(dive)).not.toThrow();
    expect(typeof dive.site).toBe('string');
    expect(typeof dive.date).toBe('string');
    expect(dive.discipline === 'free' || dive.discipline === 'scuba').toBe(true);
  }
};

beforeEach(() => fake.reset());

describe('상한 저장소에서도 앱이 뜬다', () => {
  it('JSON이 깨졌으면 빈 상태로 시작한다', async () => {
    await seed('{"trips": [');
    expect(await loadDB()).toEqual(emptyDB());
  });

  it('저장된 게 아예 없으면 빈 상태', async () => {
    expect(await loadDB()).toEqual(emptyDB());
  });

  it('trips가 배열이 아니어도 설정은 살린다', async () => {
    await seed({ trips: 5, settings: { onboarded: true, diveNumberStart: 312 } });
    const db = await loadDB();
    expect(db.trips).toEqual([]);
    expect(db.settings).toEqual({ onboarded: true, diveNumberStart: 312 });
  });

  it('settings가 없으면 온보딩 전으로 본다', async () => {
    await seed({ trips: [] });
    expect((await loadDB()).settings).toEqual({ onboarded: false });
  });

  it('id 없는 트립만 버리고 나머지는 살아남는다', async () => {
    await seed({
      trips: [{ title: 'id가 없다' }, { id: 'trip_1', title: '제주' }, null, 'string'],
    });
    const db = await loadDB();
    expect(db.trips.map((t) => t.id)).toEqual(['trip_1']);
  });

  it('㊷ dives가 없는 트립을 불러도 화면이 만지는 필드가 전부 있다', async () => {
    await seed({ trips: [{ id: 'trip_1' }] });
    const [trip] = (await loadDB()).trips;
    expect(trip.dives).toEqual([]);
    expect(trip.title).toBe('');
    expect(trip.region).toBe('');
    expect(trip.startDate).toBe(todayISO());
    expect(trip.endDate).toBe(trip.startDate);
    expectTripUsable(trip);
  });

  it('다이브가 상해도 필수 세 개는 채워서 돌려준다', async () => {
    await seed({
      trips: [
        {
          id: 'trip_1',
          startDate: '2026-08-05',
          endDate: '2026-08-07',
          dives: [
            { id: 'dive_1' }, // 전부 없음
            { id: 'dive_2', date: 5, site: null, discipline: 'freediving', sightings: 'x' },
            { site: 'id가 없다', date: '2026-08-05' }, // 버려진다
          ],
        },
      ],
    });
    const [trip] = (await loadDB()).trips;
    expect(trip.dives.map((d) => d.id)).toEqual(['dive_1', 'dive_2']);
    expect(trip.dives[0].date).toBe(todayISO());
    expect(trip.dives[0].site).toBe('');
    expect(trip.dives[0].discipline).toBe('scuba');
    expect(trip.dives[0].sightings).toEqual([]);
    expect(trip.dives[1].date).toBe(todayISO());
    expect(trip.dives[1].discipline).toBe('scuba'); // 'freediving'은 free가 아니다
    expect(trip.dives[1].sightings).toEqual([]);
    expectTripUsable(trip);
  });

  it('복구된 다이브가 그대로 카드가 된다 (묶음 1 불변식)', async () => {
    await seed({
      trips: [
        {
          id: 'trip_1',
          dives: [
            { id: 'd1' },
            { id: 'd2', site: '문섬', discipline: 'free', maxDepth: 24.5 },
            { id: 'd3', site: '', sightings: [{ name: '가시해마', isHighlight: true }] },
            { id: 'd4', site: '섭지', heroOverride: 'depth' }, // 가리킬 값이 없는 선택
            { id: 'd5', discipline: 'free', maxDepth: 45, heroOverride: 'species' }, // 하트가 없다
          ],
        },
      ],
    });
    const [trip] = (await loadDB()).trips;
    expect(trip.dives).toHaveLength(5);
    trip.dives.forEach(expectCardComplete);
  });
});

describe('왕복해도 값이 변하지 않는다', () => {
  it('heroOverride · sightings · 선택 항목이 그대로 돌아온다', async () => {
    const db = {
      trips: [
        {
          id: 'trip_1',
          title: '',
          region: '서귀포 · 제주',
          startDate: '2026-08-05',
          endDate: '2026-08-07',
          dives: [
            minimal({
              id: 'd1',
              maxDepth: 24.5,
              duration: 42,
              waterTemp: 23,
              visibility: 12,
              airEnd: 60,
              note: '처음 봄',
              time: '10:30',
              heroOverride: 'depth' as const,
              sightings: [...heart(), { name: '놀래기', isHighlight: false, count: 3 }],
            }),
            minimal({ id: 'd2', discipline: 'free' as const, style: 'CWT', duration: 128 }),
          ],
        },
      ],
      settings: { onboarded: true, diveNumberStart: 312 },
    };
    await saveDB(db);
    expect(await loadDB()).toEqual(db);
  });

  it('저장이 거부되면 던진다 — 조용히 삼키지 않는다', async () => {
    fake.fail(true);
    await expect(saveDB(emptyDB())).rejects.toThrow();
    fake.fail(false);
  });

  it('clearDB는 저장소를 비운다', async () => {
    await saveDB({ ...emptyDB(), settings: { onboarded: true } });
    await clearDB();
    expect(await loadDB()).toEqual(emptyDB());
  });
});

describe('㊺ 사진 경로는 지금 컨테이너 기준으로 다시 만든다', () => {
  const OLD = 'file:///data/Application/OLD-CONTAINER-UUID/Documents/dive-photos/d1.abc.jpg';

  it('불러올 때 옛 절대경로가 살아남지 않는다', async () => {
    await seed({
      trips: [{ id: 'trip_1', dives: [{ id: 'd1', site: '문섬', photo: { uri: OLD } }] }],
    });
    const [dive] = (await loadDB()).trips[0].dives;
    expect(dive.photo).toEqual({ uri: `${DOC_URI}dive-photos/d1.abc.jpg` });
    expect(JSON.stringify(dive)).not.toContain('OLD-CONTAINER-UUID');
  });

  it('파일명은 유지한다 — 사진을 바꿀 때마다 이름이 달라지므로(㊱) 그게 신원이다', () => {
    expect(resolvePhotoUri(OLD)).toContain('d1.abc.jpg');
  });

  it('우리가 만든 게 아닌 경로는 건드리지 않는다', () => {
    const picked = 'file:///cache/ImagePicker/AB12.jpg';
    expect(resolvePhotoUri(picked)).toBe(picked);
  });

  it('번들 이미지(require 번호)는 그대로 둔다', async () => {
    await seed({ trips: [{ id: 'trip_1', dives: [{ id: 'd1', site: '문섬', photo: 42 }] }] });
    expect((await loadDB()).trips[0].dives[0].photo).toBe(42);
  });
});

/**
 * §2-②를 지키는 자리가 **둘**인데 한 곳만 지키던 구멍들.
 *
 * 입력 화면(`SightingsEditor`·종목 칩)이 앞에서 막아 주니 렌더 쪽이 안 막아도 됐는데,
 * **저장소에서 들어오는 경로에는 그 앞단이 없다.** `loadDB`가 믿을 수 없는 입력을
 * 다루는 자리라는 게(§10-㊷) 바로 이 뜻이다.
 */
describe('저장소에서 들어온 빈 값이 카드를 비우지 않는다', () => {
  const loadOne = async (dive: Record<string, unknown>) => {
    await seed({
      settings: { onboarded: true },
      trips: [
        {
          id: 't',
          title: '',
          region: '제주',
          startDate: '2026-08-05',
          endDate: '2026-08-05',
          dives: [
            { id: 'd', date: '2026-08-05', site: '문섬', discipline: 'scuba', sightings: [], ...dive },
          ],
        },
      ],
    });
    const db = await loadDB();
    return db.trips[0].dives[0];
  };

  it('이름이 빈 하이라이트는 히어로가 되지 않는다', async () => {
    // 입력 화면은 trim()으로 막지만 저장소에는 들어올 수 있다
    const d = await loadOne({ sightings: [{ name: '   ', isHighlight: true }], maxDepth: 18 });
    expect(highlightOf(d)).toBeDefined(); // 데이터에는 있다
    expect(resolveHero(d)).not.toBe('species'); // 그래도 히어로가 되진 않는다
    expectCardComplete(d);
  });

  it('이름이 빈 하이라이트만 있으면 다른 히어로로 넘어간다', async () => {
    const d = await loadOne({ sightings: [{ name: '', isHighlight: true }] });
    expect(heroCandidates(d)).not.toContain('species');
    expectCardComplete(d);
  });

  it("style이 빈 문자열이면 칸을 만들지 않는다", async () => {
    // 칩은 undefined로 토글하지만 저장소에는 ''이 들어올 수 있다
    const d = await loadOne({ discipline: 'free', maxDepth: 24.5, style: '' });
    expect(cellsFor(d, resolveHero(d)).map((c) => c.key)).not.toContain('style');
    expectCardComplete(d);
  });

  it('공백뿐인 style도 마찬가지다', async () => {
    const d = await loadOne({ discipline: 'free', maxDepth: 24.5, style: '  ' });
    expect(cellsFor(d, resolveHero(d)).map((c) => c.key)).not.toContain('style');
  });
});
