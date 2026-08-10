// 깊은 경로로 가져온다 — 패키지 루트에서 import하면 안 쓰는 14개 weight가 전부 번들된다
import { IBMPlexMono_300Light } from '@expo-google-fonts/ibm-plex-mono/300Light';
import { IBMPlexMono_300Light_Italic } from '@expo-google-fonts/ibm-plex-mono/300Light_Italic';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono/400Regular';
import type { TextStyle } from 'react-native';

import { foamA, paperA } from './tokens';
import type { Scale } from './scale';

/**
 * 타이포.
 *
 * RN(특히 Android)은 fontFamily + fontWeight 조합을 제대로 해석하지 못한다.
 * weight마다 별도 패밀리명으로 등록하고, 화면에서는 fontFamily를 직접 쓰지 않고
 * makeType()이 주는 완성된 스타일만 쓴다.
 *
 * CSS → RN 단위 변환도 전부 여기서 끝낸다:
 *   letter-spacing: -.045em  → letterSpacing = -0.045 * fontSize   (RN은 pt)
 *   line-height: .86 (무단위) → lineHeight    =  0.86 * fontSize   (RN은 절대값)
 */

export const family = {
  monoLight: 'IBMPlexMono-Light',
  monoLightItalic: 'IBMPlexMono-LightItalic',
  mono: 'IBMPlexMono-Regular',
  kr: 'Pretendard-Regular',
  krBold: 'Pretendard-SemiBold',
} as const;

/** expo-font useFonts()에 그대로 넘긴다 */
export const fontAssets = {
  [family.monoLight]: IBMPlexMono_300Light,
  [family.monoLightItalic]: IBMPlexMono_300Light_Italic,
  [family.mono]: IBMPlexMono_400Regular,
  [family.kr]: require('../../assets/fonts/Pretendard-Regular.ttf'),
  [family.krBold]: require('../../assets/fonts/Pretendard-SemiBold.ttf'),
};

type Spec = {
  /** 시안 기준 px */
  size: number;
  /** CSS letter-spacing, em 단위 */
  tracking?: number;
  /** CSS line-height, 무단위 */
  leading?: number;
  color?: string;
  upper?: boolean;
};

const build = (fontFamily: string, spec: Spec, s: Scale): TextStyle => {
  const fontSize = s.px(spec.size);
  return {
    fontFamily,
    fontSize,
    ...(spec.tracking != null && { letterSpacing: spec.tracking * fontSize }),
    ...(spec.leading != null && { lineHeight: spec.leading * fontSize }),
    ...(spec.color && { color: spec.color }),
    ...(spec.upper && { textTransform: 'uppercase' as const }),
  };
};

/**
 * 시안(dive-log-cards.html)의 텍스트 규칙을 카드 폭에 맞춰 실체화한다.
 *
 * 주의 — 베이스라인 정렬: 시안은 .figure에 `align-items:baseline`을 쓰지만 RN flex에는
 * baseline 정렬이 없다. 대신 <Text> 안에 <Text>를 중첩하면 실제 베이스라인으로 붙으므로
 * figure/unit, cellValue/cellUnit 은 중첩 Text로 렌더한다.
 */
export const makeType = (s: Scale) => ({
  /** 장소명 — "문섬 새끼섬" */
  place: build(family.krBold, { size: 17, tracking: -0.01, color: paperA(1) }, s),
  /**
   * 지역 — "Seogwipo · Jeju".
   * 대문자+넓은 자간을 뺐다. 그 질감은 kicker 하나만 갖는다 — region·kicker·cellKey가
   * 전부 대문자 트래킹 mono라 세 개가 같은 소리를 내고 있었다.
   */
  region: build(family.mono, { size: 11, tracking: 0.05, color: paperA(0.58) }, s),
  /**
   * 지역명을 한글로 적은 경우 — "서귀포 · 제주".
   * mono에 한글 글리프가 없어 그대로 두면 시스템 폰트로 떨어지고, 라틴용 자간이
   * 한글에 붙어 성기게 벌어진다. Pretendard로 받고 자간을 줄인다. (speciesSubKr과 같은 이유)
   */
  regionKr: build(family.kr, { size: 11, tracking: 0.02, color: paperA(0.58) }, s),
  /** 날짜·시각 — 위계의 중간 단 */
  date: build(family.mono, { size: 12.5, tracking: 0.04, color: paperA(0.58) }, s),

  /** 히어로 위 라벨 — 색은 호출부에서 (주황 배정 규칙, CLAUDE.md §5) */
  kicker: build(family.mono, { size: 10, tracking: 0.2, upper: true }, s),

  /** 큰 숫자 — 24.5 / 312 */
  /**
   * ⚠️ leading을 주지 않는다. 시안은 `line-height:.86`이지만 CSS는 넘친 글자를 그냥
   * 보여 주는 반면 **RN의 Text는 라인 박스에 클리핑한다** — 1em보다 작은 leading을 주면
   * 숫자 윗부분이 잘린다. 실기기 캡처(1080×1920)에서 "24.5"의 2와 5가 잘린 걸 보고 잡았다.
   * 웹에서는 재현되지 않는다 (react-native-web은 CSS line-height를 그대로 쓴다).
   */
  figure: build(family.monoLight, { size: 76, tracking: -0.015, color: paperA(1) }, s),
  /** 숫자 뒤 단위 — "m" */
  figureUnit: build(family.mono, { size: 24, tracking: 0, color: paperA(0.66) }, s),
  /** 숫자 뒤 한글 — "번째" */
  figureOrd: build(family.kr, { size: 19, tracking: -0.01, color: paperA(0.7) }, s),

  /** 생물명 — 크기는 폭에 맞춰 호출부에서 덮어쓴다 (speciesSize 참조) */
  species: build(family.krBold, { size: 46, tracking: -0.03, leading: 1.12, color: paperA(1) }, s),
  /** 학명 — 라틴 이탤릭 */
  speciesSub: build(family.monoLightItalic, { size: 12, tracking: 0.1, color: paperA(0.55) }, s),
  /**
   * 학명 줄의 한글 조각 — "4개체", "처음 봄".
   * IBM Plex Mono에는 한글 글리프가 없어 그대로 두면 시스템 폰트로 떨어진다.
   * (시안도 브라우저에서 같은 폴백이 일어난다.) 같은 크기의 Pretendard로 명시한다.
   */
  speciesSubKr: build(family.kr, { size: 12, tracking: 0.02, color: paperA(0.55) }, s),

  /** 하단 칸 라벨 — DEPTH / TIME */
  cellKey: build(family.mono, { size: 9.5, tracking: 0.16, color: paperA(0.52), upper: true }, s),
  /** 하단 칸 값 — 위계의 중간 단. 하단 스트립이 카드에서 가장 넓은 요소다 */
  cellValue: build(family.mono, { size: 17, tracking: -0.01, color: paperA(1) }, s),
  /** 값 뒤 단위 — "m" / "°C" */
  cellUnit: build(family.mono, { size: 11, color: paperA(0.6) }, s),

  /** 눈금 라벨 — 0 / 20 / 40. 축소해도 남도록 시안(8px/.45)보다 키웠다 */
  tickLabel: build(family.mono, { size: 9, tracking: 0.04, color: foamA(0.55) }, s),
});

export type CardType = ReturnType<typeof makeType>;

/** 한글이 섞였는지 — mono로 둘지 Pretendard로 받을지 가른다 */
export const hasHangul = (s: string) => /[ㄱ-ㆎ가-힣]/.test(s);

/** 카드 콘텐츠 폭 (시안 360 좌표계) = 360 − 좌 52(눈금자) − 우 24 */
const CONTENT_W = 284;

/** 대략의 글자 폭 — 한글·CJK·가나는 ≈1em, 라틴·숫자는 ≈0.55em */
const widthEm = (name: string) =>
  [...name].reduce((w, ch) => w + (/[ㄱ-힝一-鿿぀-ヿ]/.test(ch) ? 1 : 0.55), 0);

/**
 * 생물명(과 site 히어로의 장소명)은 자유 입력이라 폭이 제각각이다.
 *
 * adjustsFontSizeToFit은 Android에서 불안정하고, 1080 캡처 시 화면과 다른 배율로 줄어
 * 결과물이 갈린다. 그래서 **측정하지 않고** 글자 폭 합에서 결정론적으로 계산한다 —
 * 화면이든 1080이든 같은 값이 나온다.
 *
 * 예전에는 38/30/24 세 단 티어였는데, 수심형 히어로(76)의 정확히 절반이라 카드 3종이
 * 한 가족으로 안 보였다. 짧은 이름은 56까지 키우고 긴 이름만 26에서 멈춘다 —
 * 거기서부터는 호출부의 numberOfLines={2}가 받는다.
 */
export const speciesSize = (name: string): number =>
  Math.max(26, Math.min(56, (CONTENT_W * 0.98) / Math.max(widthEm(name), 1)));
