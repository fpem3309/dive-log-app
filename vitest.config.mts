import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

/**
 * 통합테스트 러너 — CLAUDE.md §7의 "화면을 눌러 보는" 검증을 **대체하지 않는다.**
 * 여기서 도는 것은 화면 없이 도는 앱의 두뇌뿐이다 (히어로 결정 · 날짜 · 저장소 · 스토어).
 *
 * ⚠️ 경로에 공백이 있다 (§11). alias 경로는 반드시 `fileURLToPath(new URL(...))`로 만든다 —
 * 문자열 이어붙이기나 `new URL(...).pathname`을 쓰면 공백이 `%20`으로 남아 해석이 깨진다.
 */
const dir = (p: string) => fileURLToPath(new URL(p, import.meta.url));

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/(.*)$/, replacement: `${dir('./src')}/$1` },

      /**
       * 네이티브 모듈은 **테스트 대상이 아니다.** ㊱㊲㊹㊻은 "모듈이 문서와 다르게
       * 행동해서" 난 버그라 가짜로는 애초에 잡히지 않는다 (기획: 범위 밖).
       * 아래 둘은 검사 대상을 부를 수 있게 하는 최소한의 받침대일 뿐이다.
       *   - async-storage: 저장소 **백엔드**. 거부시키는 스위치가 있어야 ㉞을 볼 수 있다.
       *   - expo-file-system: `resolvePhotoUri`가 경로를 다시 조립하는지만 본다 (㊺).
       */
      {
        find: /^@react-native-async-storage\/async-storage$/,
        replacement: dir('./test/fakes/async-storage.ts'),
      },
      { find: /^expo-file-system$/, replacement: dir('./test/fakes/expo-file-system.ts') },
      // photos.ts가 최상단에서 import한다 — 부르면 던지는 자리막이
      {
        find: /^expo-image-manipulator$/,
        replacement: dir('./test/fakes/expo-image-manipulator.ts'),
      },

      // 묶음 3만 해당 — 웹 빌드와 같은 방식으로 렌더한다 (§10-⑨).
      // `react-native-svg` 같은 다른 패키지가 걸리지 않게 정확히 일치할 때만 바꾼다.
      { find: /^react-native$/, replacement: 'react-native-web' },
    ],
  },
  test: {
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    // 기본은 node. 리액트 렌더러가 필요한 파일만 `@vitest-environment jsdom`을 단다.
    environment: 'node',
    /**
     * 날짜 계산은 UTC로 다루면 하루가 밀린다 (dates.ts 첫 줄). 한국(UTC+9)에서는
     * 그 실수가 드러나지 않으므로, 음수 오프셋 시간대에서 돌려 밀림이 바로 빨개지게 한다.
     * 테스트 자체는 어떤 시간대에서도 통과해야 한다 — 이건 감도를 올리는 장치다.
     */
    env: { TZ: 'America/Los_Angeles' },
  },
});
