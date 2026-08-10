import {
  createContext,
  useCallback,
  useContext,
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
 */

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

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [req, setReq] = useState<Req | null>(null);
  const resolver = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback(
    (r: Req) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve;
        setReq(r);
      }),
    [],
  );

  const notify = useCallback(
    (title: string, message?: string) => confirm({ title, message, notice: true }),
    [confirm],
  );

  const close = useCallback((value: boolean) => {
    setReq(null);
    const r = resolver.current;
    resolver.current = null;
    r?.(value);
  }, []);

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
