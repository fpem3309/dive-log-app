import { useMemo, useRef, type ReactNode } from 'react';
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
 */

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
  const tx = useRef(new Animated.Value(0)).current;
  const opened = useRef(false);
  const dragged = useRef(false);

  const slideTo = (to: number) => {
    opened.current = to !== 0;
    Animated.spring(tx, {
      toValue: to,
      // 웹에는 네이티브 애니메이션 모듈이 없다
      useNativeDriver: Platform.OS !== 'web',
      bounciness: 0,
      speed: 20,
    }).start();
  };

  const endDrag = () => {
    setTimeout(() => {
      dragged.current = false;
    }, TAP_GUARD_MS);
  };

  const pan = useMemo(
    () =>
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
    // tx는 ref라 안 바뀐다
    [tx],
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
