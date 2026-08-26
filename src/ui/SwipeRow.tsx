import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, PanResponder, Platform, Pressable, Text, View } from 'react-native';

import { dangerA, hex } from '@/design/tokens';
import { surface, t } from './theme';

/**
 * 왼쪽으로 밀면 지우기가 나오는 행.
 *
 * ⚠️ react-native-gesture-handler의 Swipeable을 쓰지 않는다. 웹에서 pan 제스처가
 * 활성화되지 않아 행이 아예 움직이지 않는다. RN 코어의 PanResponder + Animated로
 * 직접 만들면 웹·네이티브가 같은 코드로 돈다.
 *
 * ⚠️ 탭을 이 컴포넌트가 직접 받는다. 자식에 Pressable을 두면 웹에서 밀 때마다 화면이
 * 넘어가 버린다 — PanResponder가 응답자를 가져가도 브라우저는 mouseup 뒤에 DOM click을
 * 따로 쏘고, RNW Pressable이 그걸 받아 onPress를 또 부르기 때문이다.
 * 그래서 드래그 직후의 탭은 여기서 막는다.
 *
 * 지우기를 눌러도 바로 지우지 않는다 — `onDelete`가 확인을 거치고, 취소하면 닫힌다.
 *
 * 열린 행은 **화면에 하나뿐이다.** 여럿이 열려 있으면 "지우기"가 여러 개 보여서 어느 것이
 * 방금 민 것인지 헷갈리고, 실수로 다른 행을 지울 수 있다. 목록 컴포넌트가 상태를 들고
 * 내려주는 방법도 있지만, 트립 목록·다이브 목록 두 곳이 같은 컴포넌트를 쓰므로
 * (§10-㉔) 여기서 모듈 수준으로 관리하는 편이 호출부를 안 건드린다.
 */

/** 지금 열려 있는 행. 화면에 하나만 열리게 하는 장치 */
type Row = { close: () => void };
let openRow: Row | null = null;

const ACTION_W = 96;
/** 이 이상 밀어야 열린다 */
const OPEN_AT = ACTION_W * 0.45;
/** 가로로 이 정도는 움직여야 제스처로 인정 — 세로 스크롤을 방해하지 않으려고 */
const START_AT = 10;
/** 드래그가 끝난 뒤 이 시간 동안의 탭은 무시한다 (뒤늦게 오는 click 방어) */
const TAP_GUARD_MS = 320;

type Props = {
  children: ReactNode;
  onPress: () => void;
  /** true를 돌려주면 지워진 것으로 본다 */
  onDelete: () => Promise<boolean>;
  label?: string;
};

export function SwipeRow({ children, onPress, onDelete, label = '지우기' }: Props) {
  /**
   * `useRef(new Animated.Value(0)).current`가 아니다 — 렌더마다 Value를 새로 만들어
   * 버리고, 렌더 중에 ref를 읽는다(react-hooks/refs). useState의 지연 초기화는
   * 인스턴스를 한 번만 만들고 그대로 유지한다.
   */
  const [tx] = useState(() => new Animated.Value(0));
  const opened = useRef(false);
  const dragged = useRef(false);
  /**
   * 이 행의 신원. `openRow`와 `===`로 비교하고 닫는 함수도 여기 담는다.
   * ref 안의 객체는 인스턴스마다 하나이고 렌더가 돌아도 그대로다.
   * **`.current`는 콜백·이펙트 안에서만 읽는다** — 렌더 중에 만지면 react-hooks/refs에 걸리고,
   * useState 값을 직접 고치는 것도 같은 이유로 막혀 있다.
   */
  const selfRef = useRef<Row>({ close: () => {} });

  const slideTo = useCallback(
    (to: number) => {
      const self = selfRef.current;
      if (to !== 0) {
        // 다른 행이 열려 있으면 먼저 닫는다
        if (openRow && openRow !== self) openRow.close();
        openRow = self;
      } else if (openRow === self) {
        openRow = null;
      }
      opened.current = to !== 0;
      Animated.spring(tx, {
        toValue: to,
        // 웹에는 네이티브 애니메이션 모듈이 없다
        useNativeDriver: Platform.OS !== 'web',
        bounciness: 0,
        speed: 20,
      }).start();
    },
    [tx],
  );

  useEffect(() => {
    const self = selfRef.current;
    self.close = () => slideTo(0);
    // 지워지거나 화면을 떠날 때 자기 자리를 비운다 — 안 그러면 다음 행이 안 열린다
    return () => {
      if (openRow === self) openRow = null;
    };
  }, [slideTo]);

  const endDrag = useCallback(() => {
    setTimeout(() => {
      dragged.current = false;
    }, TAP_GUARD_MS);
  }, []);

  /**
   * react-hooks/refs를 여기서만 끈다. 규칙은 "렌더 중에 refs를 읽는 함수에 넘겼다"고
   * 보지만, `PanResponder.create`는 핸들러를 모아 두기만 하고 부르지 않는다.
   * `opened`·`dragged`를 읽는 곳은 전부 제스처 콜백 안이라 렌더가 아니다.
   */
  const pan = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        // 탭은 아래 Pressable이 받는다
        onStartShouldSetPanResponderCapture: () => false,
        /**
         * Capture여야 한다 — 안쪽 Pressable이 터치 시작에 이미 응답자를 가져가서
         * 비-capture 핸들러는 호출조차 되지 않는다. 세로로 긋는 것은 스크롤에 양보한다.
         */
        onMoveShouldSetPanResponderCapture: (_e, g) =>
          Math.abs(g.dx) > START_AT && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderMove: (_e, g) => {
          dragged.current = true;
          const base = opened.current ? -ACTION_W : 0;
          tx.setValue(Math.min(0, Math.max(-ACTION_W, base + g.dx)));
        },
        onPanResponderRelease: (_e, g) => {
          const base = opened.current ? -ACTION_W : 0;
          slideTo(base + g.dx < -OPEN_AT ? -ACTION_W : 0);
          endDrag();
        },
        onPanResponderTerminate: () => {
          slideTo(opened.current ? -ACTION_W : 0);
          endDrag();
        },
      }),
    [tx, slideTo, endDrag],
  );

  const handleTap = () => {
    if (dragged.current) return; // 방금 민 것이므로 탭이 아니다
    if (opened.current) {
      slideTo(0); // 열려 있으면 먼저 닫는다
      return;
    }
    onPress();
  };

  const handleDelete = async () => {
    const deleted = await onDelete();
    if (!deleted) slideTo(0); // 취소했으면 닫아 준다
  };

  return (
    <View>
      {/* 액션은 뒤에 깔리고, 행이 그 위를 미끄러진다 */}
      <View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: ACTION_W }}>
        <Pressable
          onPress={handleDelete}
          style={({ pressed }) => ({
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: pressed ? dangerA(0.22) : dangerA(0.1),
          })}>
          <Text style={[t.button, { color: hex.danger, fontSize: 13.5 }]}>{label}</Text>
        </Pressable>
      </View>

      {/* 행은 불투명해야 한다 — 반투명이면 밀 때 뒤의 "지우기"가 비쳐 보인다 */}
      <Animated.View
        {...pan.panHandlers}
        style={{ transform: [{ translateX: tx }], backgroundColor: surface.raisedSolid }}>
        <Pressable onPress={handleTap} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          {children}
        </Pressable>
      </Animated.View>
    </View>
  );
}
