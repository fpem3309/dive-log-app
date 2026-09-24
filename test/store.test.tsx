// @vitest-environment jsdom
import { act, StrictMode, useEffect, useState, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { todayISO } from '@/model/dates';
import { saveDB } from '@/store/storage';
import { TripProvider, useTrips } from '@/store/TripStore';
import { fake } from './fakes/async-storage';

/**
 * 묶음 3 — 저장 실패와 순서 (㉞ · ㊴ · ㊳).
 *
 * 여기만 리액트 렌더러를 쓴다. 화면은 하나도 마운트하지 않는다 — `TripProvider`가
 * 프로바이더라서 훅을 돌리려면 렌더가 필요할 뿐이다.
 *
 * ㉞는 **화면을 눌러서는 못 잡는다.** 디스크가 거부해야 재현되는데 기기에서 그걸
 * 만들려면 저장 공간을 채워야 한다. 그래서 저장소 백엔드를 거부하게 만들어 본다.
 */

const { notify, deletePhoto } = vi.hoisted(() => ({
  notify: vi.fn(async () => true),
  deletePhoto: vi.fn(),
}));

// 확인창 자체는 confirm.test.tsx가 본다. 여기서는 "몇 번 불렀나"만 센다
vi.mock('@/ui/Confirm', () => ({ useConfirm: () => ({ confirm: vi.fn(async () => true), notify }) }));

vi.mock('@/model/photos', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/model/photos')>()),
  deletePhoto,
}));

type Store = ReturnType<typeof useTrips>;

let store: Store;
let root: Root;

// 렌더 중에 바깥 변수를 건드리지 않는다 — 앱 코드와 같은 규칙(React Compiler)을 지킨다
function Probe() {
  const ctx = useTrips();
  useEffect(() => {
    store = ctx;
  }, [ctx]);
  return null;
}

const mount = async (wrap: (node: ReactNode) => ReactNode = (n) => n) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(
      wrap(
        <TripProvider>
          <Probe />
        </TripProvider>,
      ),
    );
  });
};

/** 디바운스·재시도 타이머를 실제 시간 없이 넘긴다 */
const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

const savedTrips = () => {
  const raw = fake.raw(fake.onlyKey());
  return raw ? (JSON.parse(raw).trips as { id: string; dives: { site: string }[] }[]) : [];
};

beforeEach(() => {
  fake.reset();
  notify.mockClear();
  deletePhoto.mockClear();
  vi.useFakeTimers();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root.unmount());
  vi.useRealTimers();
});

describe('㊴ addDive — 명시적 undefined가 기본값을 지우지 않는다', () => {
  it('date: undefined로 불러도 오늘 날짜가 남는다', async () => {
    await mount();
    let dive!: { date: string; site: string; discipline: string; sightings: unknown[] };
    act(() => {
      const trip = store.createTrip();
      // 화면에서 직전 다이브를 물려줄 때 실제로 이런 모양이 온다 (§10-⑭)
      dive = store.addDive(trip.id, { date: undefined, site: undefined, discipline: undefined });
    });
    expect(dive.date).toBe(todayISO());
    expect(dive.site).toBe('');
    expect(dive.discipline).toBe('scuba');
    expect(dive.sightings).toEqual([]);
  });

  it('직전 다이브의 날짜·종목은 물려받는다', async () => {
    await mount();
    act(() => {
      const trip = store.createTrip();
      const dive = store.addDive(trip.id, { date: '2026-08-06', discipline: 'free' });
      expect(dive.date).toBe('2026-08-06');
      expect(dive.discipline).toBe('free');
    });
  });
});

describe('㉞ 저장이 거부돼도 마지막 상태가 결국 들어간다', () => {
  it('실패한 옛 스냅샷이 되살아나지 않는다', async () => {
    await mount();
    fake.fail(true);

    let tripId = '';
    act(() => {
      tripId = store.createTrip().id;
      store.addDive(tripId, { site: '문섬' });
    });
    // 디바운스 → 첫 시도 실패 → 200ms 뒤 재시도
    await tick(400);
    expect(fake.writes).toBe(0);

    // 재시도가 도는 사이에 한 개 더 적는다 — 이게 날아가면 안 된다
    act(() => {
      store.addDive(tripId, { site: '섭지코지' });
    });
    await tick(300);

    fake.fail(false);
    await tick(3000);

    const dives = savedTrips()[0].dives;
    expect(dives.map((d) => d.site)).toEqual(['문섬', '섭지코지']);
  });

  it('계속 실패하면 알림이 정확히 한 번, 성공하면 풀린다', async () => {
    await mount();
    fake.fail(true);

    let tripId = '';
    act(() => {
      tripId = store.createTrip().id;
    });
    await tick(5000); // 재시도(200·600·1500)까지 전부 소진
    expect(notify).toHaveBeenCalledTimes(1);

    // 타이핑할 때마다 모달이 뜨면 안 된다
    act(() => store.updateTrip(tripId, { region: '제' }));
    await tick(5000);
    act(() => store.updateTrip(tripId, { region: '제주' }));
    await tick(5000);
    expect(notify).toHaveBeenCalledTimes(1);

    // 한 번 성공하면 경고가 풀리고, 다시 막히면 다시 알린다
    fake.fail(false);
    act(() => store.updateTrip(tripId, { region: '제주도' }));
    await tick(1000);
    expect(fake.writes).toBeGreaterThan(0);
    expect(notify).toHaveBeenCalledTimes(1);

    fake.fail(true);
    act(() => store.updateTrip(tripId, { region: '서귀포' }));
    await tick(5000);
    expect(notify).toHaveBeenCalledTimes(2);
  });

  it('불러오기 전에는 저장하지 않는다 — 빈 상태로 덮어쓰면 데이터가 날아간다', async () => {
    // 이미 저장돼 있는 상태에서 앱을 켠다
    await saveDB({
      trips: [{ id: 'trip_old', title: '', region: '', startDate: '2026-08-05', endDate: '2026-08-05', dives: [] }],
      settings: { onboarded: true },
    });
    fake.writes = 0;
    await mount();
    await tick(1000);
    expect(savedTrips().map((t) => t.id)).toEqual(['trip_old']);
  });
});

describe('㊳ setDb 업데이터는 순수하다 — 사진이 두 번 지워지지 않는다', () => {
  it('StrictMode에서 업데이터가 실제로 두 번 돈다 (아래 검사가 헛돌지 않게)', async () => {
    let calls = 0;
    let bump!: () => void;
    function Canary() {
      const [, setN] = useState(0);
      useEffect(() => {
        bump = () =>
          setN((v) => {
            calls += 1;
            return v + 1;
          });
      }, []);
      return null;
    }
    const container = document.createElement('div');
    const canaryRoot = createRoot(container);
    await act(async () => canaryRoot.render(<StrictMode><Canary /></StrictMode>));
    act(() => bump());
    expect(calls, 'StrictMode가 업데이터를 두 번 부르지 않는다 — ㊳ 검사가 무의미해졌다').toBe(2);
    await act(async () => canaryRoot.unmount());
  });

  it('트립을 지우면 사진 파일 삭제가 다이브마다 한 번씩만 일어난다', async () => {
    await mount((n) => <StrictMode>{n}</StrictMode>);
    let tripId = '';
    act(() => {
      tripId = store.createTrip().id;
      store.addDive(tripId, { site: '문섬', photo: { uri: 'file:///doc/dive-photos/a.jpg' } });
      store.addDive(tripId, { site: '섭지', photo: { uri: 'file:///doc/dive-photos/b.jpg' } });
    });
    act(() => store.deleteTrip(tripId));
    expect(deletePhoto.mock.calls.map((c) => c[0])).toEqual([
      'file:///doc/dive-photos/a.jpg',
      'file:///doc/dive-photos/b.jpg',
    ]);
  });

  it('다이브를 지울 때도 한 번만', async () => {
    await mount((n) => <StrictMode>{n}</StrictMode>);
    let tripId = '';
    let diveId = '';
    act(() => {
      tripId = store.createTrip().id;
      diveId = store.addDive(tripId, { photo: { uri: 'file:///doc/dive-photos/a.jpg' } }).id;
    });
    act(() => store.deleteDive(tripId, diveId));
    expect(deletePhoto).toHaveBeenCalledTimes(1);
    expect(store.trips[0].dives).toEqual([]);
  });
});
