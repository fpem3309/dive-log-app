import { PixelRatio } from 'react-native';

/**
 * 카드 치수 스케일.
 *
 * 시안 HTML의 px 값은 전부 360×640 카드를 전제한 상수다. 그 숫자를 그대로 쓰면
 * 화면 폭이 달라질 때 깨지고, 1080×1920 캡처가 불가능하다. 대신 카드는 width 하나만
 * 받고 나머지 치수를 전부 여기서 유도한다.
 *
 *   화면:  makeScale(화면폭 - 여백)
 *   저장:  makeScale(1080)   ← 같은 컴포넌트를 1080 해상도로 진짜 렌더한다
 */

/** 시안 SVG viewBox 기준 폭 */
export const BASE_W = 360;
/** 9:16 — CLAUDE.md §5 고정 */
export const ASPECT = 16 / 9;
/** 저장용 해상도 (인스타 스토리) — 최종 PNG의 픽셀 크기 */
export const EXPORT_W = 1080;
export const EXPORT_H = EXPORT_W * ASPECT; // 1920

/**
 * 저장용 카드를 화면 밖에 렌더할 때 쓸 **포인트** 폭.
 *
 * ⚠️ react-native-view-shot은 뷰의 포인트 크기를 기기 픽셀 배율로 곱해 래스터화한다.
 * 1080포인트로 렌더하면 @3x 기기에서 3240픽셀짜리(16MB) PNG가 나오고, @2x 기기에서는
 * 2160픽셀이 나온다 — 기기마다 결과물이 달라진다. 실제로 시뮬레이터에서 3240×5760이
 * 나오는 걸 확인하고 잡았다.
 *
 * 배율로 나눠서 렌더하면 (포인트 × 배율)이 정확히 1080픽셀이 된다. 글자는 여전히
 * 기기 배율로 래스터화되므로 선명도는 그대로다.
 */
export const exportRenderWidth = () => EXPORT_W / PixelRatio.get();
export const exportRenderHeight = () => exportRenderWidth() * ASPECT;

export type Scale = {
  /** 카드 폭 */
  w: number;
  /** 카드 높이 (w × 16/9) */
  h: number;
  /** 배율 — 시안 1px = u */
  u: number;
  /** 시안 px 값을 실제 치수로 */
  px: (n: number) => number;
};

/**
 * SVG 그라데이션 id를 인스턴스마다 갈라 준다.
 *
 * ⚠️ 웹(react-native-svg → 실제 DOM)에서 `id`는 **문서 전역**이다. 카드를 여러 장
 * 렌더하면 `url(#col)`이 문서의 첫 번째 `#col`을 잡아서 **모든 카드가 1번 카드의
 * 그라데이션을 쓴다.** 실제로 이것 때문에 (a) 생물형 카드의 수심선이 1번 카드의 코럴로
 * 칠해져 액센트가 두 곳이 됐고(§5 위반), (b) "깊이 들어간 날일수록 어둡다"(§10-⑤)가
 * 조용히 죽어 18m 카드와 38m 카드가 같아졌다. 네이티브에서는 드러나지 않는다.
 *
 * useId()가 주는 `:r1:` 같은 값은 `url(#…)`에서 위험하므로 영숫자만 남긴다.
 */
export const svgIds = <K extends string>(uid: string, ...names: K[]): Record<K, string> => {
  const safe = uid.replace(/[^a-zA-Z0-9]/g, '');
  return Object.fromEntries(names.map((n) => [n, `${n}-${safe}`])) as Record<K, string>;
};

export const makeScale = (width: number): Scale => {
  const u = width / BASE_W;
  return {
    w: width,
    h: width * ASPECT,
    u,
    px: (n: number) => n * u,
  };
};
