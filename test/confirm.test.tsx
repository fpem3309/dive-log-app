// @vitest-environment jsdom
import { act, useEffect, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ConfirmProvider, useConfirm } from '@/ui/Confirm';

/**
 * 묶음 3 — ㉒ 확인창 큐.
 *
 * 예전에는 resolver가 하나뿐이라, 확인창이 떠 있는 동안 저장 실패 알림(`notify`)이
 * 오면 **이전 resolver를 resolve 없이 덮어썼다.** 사용자는 취소도 확정도 하지 않았는데
 * 삭제 확인이 사라지고, `await confirm(...)`은 영영 돌아오지 않는다 (Promise 누수).
 * 조용히 새는 부류라 화면을 눌러도 눈에 띄지 않는다.
 *
 * ⚠️ 웹 빌드와 같은 방식으로 렌더한다 (react-native → react-native-web, §10-⑨).
 * react-native-web의 Modal은 fade-out을 `animationend`로 끝내는데 jsdom은 그 이벤트를
 * 쏘지 않는다 — **닫혀도 다이얼로그 DOM은 남는다.** 그래서 "떠 있는가"는 DOM 유무가
 * 아니라 **제목 글자**로 판정한다 (닫히면 req가 null이라 제목이 빈다).
 */

let root: Root;
let api: ReturnType<typeof useConfirm>;

// 렌더 중에 바깥 변수를 건드리지 않는다 — 앱 코드와 같은 규칙(React Compiler)을 지킨다
function Probe() {
  const ctx = useConfirm();
  useEffect(() => {
    api = ctx;
  }, [ctx]);
  return null;
}

const mount = async (children: ReactNode = <Probe />) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => {
    root.render(<ConfirmProvider>{children}</ConfirmProvider>);
  });
};

/** 모달은 body 끝에 포탈로 붙는다 (react-native-web ModalPortal) */
const modal = () => document.body.lastElementChild;

/** 글자 조각들 — RNW의 Text는 `div[dir="auto"]`로 렌더된다 */
const labelsInDom = () => [...(modal()?.querySelectorAll('div[dir="auto"]') ?? [])];

/** 지금 떠 있는 요청의 제목 — 다이얼로그의 첫 글자 조각. 닫혀 있으면 '' */
const showingTitle = () => labelsInDom()[0]?.textContent ?? '';

const findLabel = (text: string) => labelsInDom().find((el) => el.textContent === text);

const press = async (text: string) => {
  const label = findLabel(text);
  if (!label) throw new Error(`"${text}"를 화면에서 찾을 수 없다`);
  const pressable = label.parentElement!;
  await act(async () => {
    for (const type of ['mousedown', 'mouseup', 'click']) {
      pressable.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true }));
    }
  });
};

/**
 * 약속이 실제로 결말이 났는지 — 누수는 "아무 일도 안 일어남"이라 이렇게만 잡힌다.
 *
 * ⚠️ **Promise가 아니라 호출을 받아 `act` 안에서 실행한다.** `confirm()`은 부르는 즉시
 * `ConfirmProvider`의 `setCurrent`를 때리는데, act 밖에서 부르면 리액트가 경고하고
 * (그 경고는 vitest 기본 리포터에 가려진다) 단언이 낡은 트리를 볼 수 있다.
 * 지금은 뒤따르는 `await act(...)`가 흘려 주지만 리액트 버전이 오르면 순서 의존이 된다.
 */
const track = <T,>(call: () => Promise<T>) => {
  const state: { settled: boolean; value?: T } = { settled: false };
  act(() => {
    void call().then((v) => {
      state.settled = true;
      state.value = v;
    });
  });
  return state;
};

const tick = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

beforeEach(() => {
  vi.useFakeTimers();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(async () => {
  await act(async () => root.unmount());
  document.body.innerHTML = '';
  vi.useRealTimers();
});

describe('㉒ 확인창은 줄을 선다', () => {
  it('떠 있는 확인창이 알림에 밀려나지 않고, 둘 다 결말이 난다', async () => {
    await mount();

    const del = track(() => api.confirm({ title: '이 트립을 지울까요?', destructive: true }));
    await act(async () => {});
    expect(showingTitle()).toBe('이 트립을 지울까요?');

    // 저장 실패 알림 — 사용자가 부르지 않은 모달이 끼어드는 실제 경로 (㉞)
    const warn = track(() => api.notify('저장되지 않았습니다'));
    await act(async () => {});
    expect(showingTitle(), '알림이 확인창을 밀어냈다').toBe('이 트립을 지울까요?');
    expect(warn.settled).toBe(false);

    await press('지우기');
    expect(del.settled).toBe(true);
    expect(del.value).toBe(true);
    expect(showingTitle(), '누른 뒤에도 확인창이 남아 있다').toBe('');

    // 교대 간격이 지나면 줄 서 있던 알림이 뜬다
    await tick(500);
    expect(showingTitle()).toBe('저장되지 않았습니다');
    await press('확인');
    expect(warn.settled).toBe(true);
  });

  it('세 개가 겹쳐도 순서대로 처리되고 하나도 새지 않는다', async () => {
    await mount();
    const a = track(() => api.confirm({ title: 'A' }));
    const b = track(() => api.confirm({ title: 'B' }));
    const c = track(() => api.notify('C'));
    await act(async () => {});

    expect(showingTitle()).toBe('A');
    await press('지우기');
    expect(a.value).toBe(true);

    await tick(500);
    expect(showingTitle()).toBe('B');
    await press('취소');
    expect(b.value).toBe(false);

    await tick(500);
    expect(showingTitle()).toBe('C');
    await press('확인');

    expect([a.settled, b.settled, c.settled]).toEqual([true, true, true]);
  });

  it('알림에는 취소가 없다 — 확인만', async () => {
    await mount();
    track(() => api.notify('저장되지 않았습니다', '저장 공간을 살펴봐 주세요'));
    await act(async () => {});
    expect(findLabel('확인')).toBeTruthy();
    expect(findLabel('취소')).toBeFalsy();
    expect(findLabel('저장 공간을 살펴봐 주세요')).toBeTruthy();
  });

  it('화면이 사라지면 기다리던 쪽은 "취소"를 받는다 — 매달아 두지 않는다', async () => {
    await mount();
    const a = track(() => api.confirm({ title: 'A' }));
    const b = track(() => api.confirm({ title: 'B' }));
    await act(async () => {});

    await act(async () => root.unmount());
    await act(async () => {});
    expect([a.settled, b.settled]).toEqual([true, true]);
    expect([a.value, b.value]).toEqual([false, false]);
  });
});
