// https://docs.expo.dev/guides/using-eslint/
//
// ⚠️ npm run lint는 `expo lint`가 아니라 `eslint .`다.
// `expo lint`는 자기가 정한 대상 목록만 보고 **test/를 건너뛴다** — 테스트에 에러를 심고
// 대조해서 확인했다. 그러면 테스트를 고쳐도 lint가 조용해서, 검증 장치 쪽이 먼저 썩는다.
// 규칙은 아래 eslint-config-expo 그대로라 바뀌는 건 "무엇을 보는가"뿐이다.
const { defineConfig } = require('eslint/config');
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([
  expoConfig,
  {
    // 우리가 쓴 코드만 본다. 아래는 전부 생성물이거나 작업용 산출물이다.
    ignores: ["dist/*", ".expo/*", ".claude/*", "ios/*", "android/*"],
  }
]);
