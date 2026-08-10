import type { TextStyle } from 'react-native';

import { hex, inkA } from '@/design/tokens';
import { family } from '@/design/type';

/**
 * 화면(앱 크롬) 타이포·간격 — 라이트 테마.
 *
 * 카드는 폭에 비례해서 커지지만(makeScale) 화면 UI는 그러면 안 된다 — 큰 폰에서
 * 글자만 커지면 우스워진다. 그래서 카드 타이포와 분리해 고정 px로 둔다.
 *
 * ⚠️ 화면은 밝고 카드는 어둡다. 이건 의도된 대비다 — 카드가 결과물이라 배경에서
 * 확 떠 보여야 한다. 그래서 화면 색은 `hex.paper` 계열이 아니라 `inkA()`(= --deep)를
 * 쓴다. 카드 안에서는 여전히 paper/foam을 쓴다 (design/type.ts).
 */

export const sp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, huge: 40 } as const;
export const radius = { sm: 8, md: 12, lg: 16, pill: 999 } as const;

/** 터치 영역이 44pt는 되게 */
export const hit = { top: 10, bottom: 10, left: 10, right: 10 } as const;

/**
 * 화면 액센트. 카드의 `--point`(#4DA3FF)와 같은 계열이되, 흰 바탕에서 글자로 읽히도록
 * 한 단계 진하게 쓴다 — #4DA3FF는 흰 배경에서 대비가 모자란다.
 */
const accent = '#1D5FB0';

export const t = {
  eyebrow: {
    fontFamily: family.mono,
    fontSize: 11,
    letterSpacing: 2.4,
    textTransform: 'uppercase',
    color: accent,
  } as TextStyle,

  title: {
    fontFamily: family.krBold,
    fontSize: 24,
    letterSpacing: -0.5,
    color: hex.deep,
  } as TextStyle,

  heading: {
    fontFamily: family.krBold,
    fontSize: 17,
    letterSpacing: -0.3,
    color: hex.deep,
  } as TextStyle,

  body: {
    fontFamily: family.kr,
    fontSize: 13.5,
    lineHeight: 23,
    color: inkA(0.66),
  } as TextStyle,

  /** 폼 라벨 — 계기판 느낌의 작은 대문자 */
  label: {
    fontFamily: family.mono,
    fontSize: 10,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
    color: inkA(0.52),
  } as TextStyle,

  rowTitle: {
    fontFamily: family.krBold,
    fontSize: 15,
    letterSpacing: -0.2,
    color: hex.deep,
  } as TextStyle,

  meta: {
    fontFamily: family.mono,
    fontSize: 11,
    letterSpacing: 0.4,
    color: inkA(0.55),
  } as TextStyle,

  /** 한글이 들어가는 입력칸 */
  input: {
    fontFamily: family.kr,
    fontSize: 16,
    color: hex.deep,
  } as TextStyle,

  /** 숫자 입력칸 — 다이브 컴퓨터 느낌 */
  inputNum: {
    fontFamily: family.mono,
    fontSize: 17,
    letterSpacing: -0.2,
    color: hex.deep,
  } as TextStyle,

  chip: {
    fontFamily: family.kr,
    fontSize: 13.5,
    color: inkA(0.72),
  } as TextStyle,

  chipMono: {
    fontFamily: family.mono,
    fontSize: 12.5,
    letterSpacing: 0.2,
    color: inkA(0.72),
  } as TextStyle,

  button: {
    fontFamily: family.krBold,
    fontSize: 14.5,
    letterSpacing: -0.1,
    color: hex.deep,
  } as TextStyle,
} as const;

export const surface = {
  /** 화면 배경 — 아주 옅은 물빛 */
  bg: '#F1F6F6',
  /** 카드/행 배경 — 배경 위로 떠오르게 */
  raised: '#FFFFFF',
  /** 스와이프로 미는 행은 불투명해야 한다 (반투명이면 뒤의 "지우기"가 비친다) */
  raisedSolid: '#FFFFFF',
  /** 펼쳐진 편집기 — 살짝 눌러서 안으로 들어간 느낌 */
  sunken: '#E7EFEF',
  line: inkA(0.1),
  lineStrong: inkA(0.2),
  /** 입력칸 밑줄 */
  fieldLine: inkA(0.16),
  /** 액센트(포커스·선택) */
  accent,
} as const;
