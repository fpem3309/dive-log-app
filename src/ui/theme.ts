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
 *
 * **화면에는 mono를 쓰지 않는다.** 대문자+넓은 자간 mono 라벨, 밑줄 입력칸, 1px 테두리가
 * 화면을 계기판·문서처럼 딱딱하게 만들었다. 계기판 질감은 카드(결과물)의 것이고,
 * 화면은 Pretendard 하나로 둥글게 간다. 숫자는 `tabular-nums`로 열을 맞춘다.
 *
 * 보조 글자는 `inkA(0.66)` 아래로 내리지 않는다 — 0.6이면 배경(#F2F6F8) 위 13px에서
 * 대비가 4.0으로 모자란다.
 */

export const sp = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, huge: 40 } as const;

/** 둥글게 — 안쪽 것일수록 작다 (입력칸 16 < 목록 행 22 < 편집기 26) */
export const radius = { sm: 12, md: 16, lg: 22, xl: 26, pill: 999 } as const;

/** 터치 영역이 44pt는 되게 */
export const hit = { top: 10, bottom: 10, left: 10, right: 10 } as const;

/**
 * 화면 액센트. 카드 액센트(코럴 `--point`)와는 다른 색이다 — 코럴은 결과물에만 (§5).
 */
const accent = '#1D5FB0';

const tabular: TextStyle['fontVariant'] = ['tabular-nums'];

export const t = {
  title: {
    fontFamily: family.krBold,
    fontSize: 28,
    letterSpacing: -0.6,
    color: hex.deep,
  } as TextStyle,

  heading: {
    fontFamily: family.krBold,
    fontSize: 18,
    letterSpacing: -0.3,
    color: hex.deep,
  } as TextStyle,

  body: {
    fontFamily: family.kr,
    fontSize: 14.5,
    lineHeight: 23,
    color: inkA(0.7),
  } as TextStyle,

  /** 폼 라벨 — 평범한 한글. 계기판 대문자는 카드에만 */
  label: {
    fontFamily: family.kr,
    fontSize: 13,
    color: inkA(0.68),
  } as TextStyle,

  rowTitle: {
    fontFamily: family.krBold,
    fontSize: 16,
    letterSpacing: -0.2,
    color: hex.deep,
  } as TextStyle,

  meta: {
    fontFamily: family.kr,
    fontSize: 13,
    fontVariant: tabular,
    color: inkA(0.66),
  } as TextStyle,

  /** 한글이 들어가는 입력칸 */
  input: {
    fontFamily: family.kr,
    fontSize: 16,
    color: hex.deep,
  } as TextStyle,

  /** 숫자 입력칸 */
  inputNum: {
    fontFamily: family.krBold,
    fontSize: 17,
    fontVariant: tabular,
    color: hex.deep,
  } as TextStyle,

  chip: {
    fontFamily: family.kr,
    fontSize: 14,
    color: hex.deep,
  } as TextStyle,

  /** 숫자·날짜 칩 — 같은 글꼴에 고정폭 숫자만 */
  chipMono: {
    fontFamily: family.kr,
    fontSize: 14,
    fontVariant: tabular,
    color: hex.deep,
  } as TextStyle,

  button: {
    fontFamily: family.krBold,
    fontSize: 15.5,
    color: hex.deep,
  } as TextStyle,
} as const;

export const surface = {
  /** 화면 배경 — 아주 옅은 물빛 */
  bg: '#F2F6F8',
  /** 카드/행 배경 — 테두리 없이 그림자로 떠오른다 */
  raised: '#FFFFFF',
  /** 스와이프로 미는 행은 불투명해야 한다 (반투명이면 뒤의 "지우기"가 비친다) */
  raisedSolid: '#FFFFFF',
  /** 입력칸·트레이 — 흰 면 안에 채운 면. 밑줄 대신 이걸 쓴다 */
  field: '#EEF3F7',
  /** 태그·번호 타일·보조 버튼 — field보다 한 단 진해서 bg 위에서도 보인다 */
  tint: '#E4EEF5',
  /** 선택된 칩·하트 면 */
  selected: '#DCE8F7',
  /** 지우기 버튼 면 */
  dangerSoft: '#FCECEA',
  line: inkA(0.07),
  lineStrong: inkA(0.12),
  /** 모달 바깥 */
  scrim: inkA(0.4),
  /** 액센트(포커스·선택) */
  accent,
} as const;

/**
 * 떠 있는 면의 그림자. RN 0.76+의 `boxShadow`는 iOS·Android·웹이 같은 문자열을 쓴다.
 * ⚠️ `overflow:'hidden'`과 같은 뷰에 두면 iOS에서 그림자가 잘린다 — 바깥 뷰에 그림자,
 * 안쪽 뷰에 클리핑 (`Raised` 참조).
 */
export const shadow = {
  raised: '0px 1px 2px rgba(11,42,71,0.04), 0px 6px 20px rgba(11,42,71,0.06)',
  small: '0px 1px 2px rgba(11,42,71,0.06), 0px 3px 8px rgba(11,42,71,0.07)',
  primary: '0px 8px 20px rgba(29,95,176,0.26)',
  modal: '0px 16px 40px rgba(11,42,71,0.18)',
} as const;
