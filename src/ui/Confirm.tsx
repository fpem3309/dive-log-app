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
import { Modal, Pressable, Text, View } from 'react-native';

import { Button } from './controls';
import { radius, sp, surface, t } from './theme';

/**
 * 확인 다이얼로그.
 *
 * RN의 `Alert.alert`을 쓰지 않는다. react-native-web에서는 아무 일도 일어나지 않아서
 * 웹에서 확인창이 통째로 죽는다 — "지우기"를 눌러도 조용히 무시된다. 게다가 네이티브
 * Alert은 OS 기본 스타일이라 이 앱의 톤(어두운 계기판)과 이질적이다.
 *
 * 한 곳에서 Modal 하나로 처리하고 Promise로 답을 돌려준다.
 *   const ok = await confirm({ title: '지울까요?', destructive: true });
 *
 * **요청은 줄을 선다 (FIFO).** 예전에는 resolver가 하나뿐이라, 확인창이 떠 있는 동안
 * 다른 곳에서 `confirm`/`notify`를 부르면 **이전 resolver를 resolve 없이 덮어썼다.**
 * 떠 있던 확인창이 말없이 사라지고 그 `await confirm(...)`은 영영 돌아오지 않는다
 * (Promise 누수, 예외도 안 남). 사용자는 취소도 확정도 하지 않았는데 삭제 확인이
 * 화면에서 없어진다. 저장 실패 알림처럼 **사용자가 부르지 않은 모달**이 생기면서
 * 실제로 닿는 경로가 됐다 (저장 재시도 → `notify`).
 */

/**
 * 앞 모달을 닫고 다음 모달을 띄우기까지 비워 두는 시간(ms).
 *
 * 곧바로 갈아 끼우면 방금 "확인"을 누른 손가락이 **같은 자리에 새로 올라온 버튼**을
 * 그대로 누른다 — 다음 것이 삭제 확인이면 못 보고 지우게 된다. 잠깐 사라졌다 뜨면
 * 다른 모달이라는 게 눈에 들어온다.
 *
 * 두 번 누름 간격(~300ms)보다 길어야 하고, 모달의 fade-out(~300ms)이 끝난 뒤여야
 * 실제로 "사라졌다 뜬다"로 보인다. 둘 다 넘기려고 420으로 잡았다.
 */
const HANDOFF_MS = 420;

type Req = {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** 알림 전용 — 취소 버튼 없이 확인만 */
  notice?: boolean;
};

type Ctx = {
  confirm: (req: Req) => Promise<boolean>;
  notify: (title: string, message?: string) => Promise<boolean>;
};

const ConfirmContext = createContext<Ctx | null>(null);

/** 줄 서 있는 요청 하나 — 답을 돌려줄 resolve를 자기가 들고 있다 */
type Pending = { req: Req; resolve: (v: boolean) => void };

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [current, setCurrent] = useState<Pending | null>(null);
  /** 지금 떠 있는 것 — 렌더 밖에서 동기로 읽어야 해서 state와 같이 들고 있다 */
  const showing = useRef<Pending | null>(null);
  const queue = useRef<Pending[]>([]);
  const handoff = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** 줄에서 하나 꺼내 띄운다. 비어 있으면 모달이 닫힌 채로 남는다 */
  const present = useCallback(() => {
    const next = queue.current.shift() ?? null;
    showing.current = next;
    setCurrent(next);
  }, []);

  const confirm = useCallback(
    (r: Req) =>
      new Promise<boolean>((resolve) => {
        queue.current.push({ req: r, resolve });
        // 떠 있는 게 있거나 교대 간격을 기다리는 중이면 줄만 선다 — 밀어내지 않는다
        if (!showing.current && !handoff.current) present();
      }),
    [present],
  );

  const notify = useCallback(
    (title: string, message?: string) => confirm({ title, message, notice: true }),
    [confirm],
  );

  const close = useCallback(
    (value: boolean) => {
      const done = showing.current;
      showing.current = null;
      setCurrent(null);
      done?.resolve(value); // 이 요청은 여기서 반드시 결말이 난다

      if (handoff.current) clearTimeout(handoff.current);
      handoff.current = null;
      if (queue.current.length > 0) {
        handoff.current = setTimeout(() => {
          handoff.current = null;
          present();
        }, HANDOFF_MS);
      }
    },
    [present],
  );

  // 화면이 사라져도 기다리는 쪽을 매달아 두지 않는다 — 답을 못 받았으면 "취소"다
  useEffect(
    () => () => {
      if (handoff.current) clearTimeout(handoff.current);
      handoff.current = null;
      const abandoned = [showing.current, ...queue.current];
      showing.current = null;
      queue.current = [];
      abandoned.forEach((p) => p?.resolve(false));
    },
    [],
  );

  const req = current?.req ?? null;

  const value = useMemo<Ctx>(() => ({ confirm, notify }), [confirm, notify]);

  return (
    <ConfirmContext.Provider value={value}>
      {children}
      <Modal
        visible={!!req}
        transparent
        animationType="fade"
        onRequestClose={() => close(false)}>
        {/* 바깥을 누르면 취소 — 알림일 때는 그냥 닫힌다 */}
        <Pressable
          onPress={() => close(false)}
          style={{
            flex: 1,
            backgroundColor: 'rgba(10,46,57,0.42)',
            justifyContent: 'center',
            padding: sp.xl,
          }}>
          {/* 안쪽 누름이 바깥으로 새지 않게 */}
          <Pressable
            onPress={() => {}}
            style={{
              gap: sp.xl,
              padding: sp.xxl,
              borderRadius: radius.lg,
              backgroundColor: surface.sunken,
              borderWidth: 1,
              borderColor: surface.line,
            }}>
            <View style={{ gap: sp.md }}>
              <Text style={t.heading}>{req?.title}</Text>
              {!!req?.message && <Text style={t.body}>{req.message}</Text>}
            </View>

            <View style={{ gap: sp.md }}>
              <Button
                label={req?.confirmLabel ?? (req?.notice ? '확인' : '지우기')}
                variant={req?.destructive ? 'danger' : 'primary'}
                onPress={() => close(true)}
              />
              {!req?.notice && (
                <Button label={req?.cancelLabel ?? '취소'} onPress={() => close(false)} />
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): Ctx {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm은 <ConfirmProvider> 안에서만 쓸 수 있습니다');
  return ctx;
}

/** 화면 밖(모달 없이) 쓰려는 실수를 막기 위한 표시 */
export type { Req as ConfirmRequest };
