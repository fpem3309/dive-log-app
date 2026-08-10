/**
 * 색 토큰 — CLAUDE.md §5 그대로.
 *
 * 알파가 섞인 값은 시안(dive-log-cards.html)에서 rgba()로 쓰인 것들인데,
 * 헬퍼로 만들어 둔다. react-native-svg의 <Stop>은 rgba() 문자열을 신뢰할 수
 * 없어서 stopColor(hex) + stopOpacity로 나눠 넘겨야 하므로 원본 hex도 함께 내보낸다.
 */

export const hex = {
  abyss: '#050E1C',
  deep: '#0B2A47',
  mid: '#1B4C7A',
  shal: '#3E86C4',
  foam: '#C9E2F5',
  paper: '#EAF1FA',
  /**
   * 카드의 액센트 — 카드당 한 곳 (CLAUDE.md §5).
   * 코럴. 네이비 물기둥의 보색이라 썸네일 크기에서도 살아남는다.
   * 붉은 계열은 물속에서 주황보다 **먼저** 사라지므로 "수면 밖 기록"이라는
   * 시안의 원래 근거가 오히려 더 정확해진다. columnStops 주석 참조.
   */
  point: '#FF5C7A',
  /** 되돌릴 수 없는 동작 전용. 액센트가 아니다 — 지우기·경고에만 */
  danger: '#C93B2B',
} as const;

const rgba = (r: number, g: number, b: number, a: number) => `rgba(${r}, ${g}, ${b}, ${a})`;

/** #EAF1FA — 본문 텍스트 */
export const paperA = (a: number) => rgba(234, 241, 250, a);
/** #C9E2F5 — 눈금·보조선 */
export const foamA = (a: number) => rgba(201, 226, 245, a);
/** #050E1C — scrim */
export const abyssA = (a: number) => rgba(5, 14, 28, a);
/** #FF5C7A — 액센트 (카드당 한 곳) */
export const pointA = (a: number) => rgba(255, 92, 122, a);
/** #C93B2B — 지우기·경고 */
export const dangerA = (a: number) => rgba(201, 59, 43, a);
/** #0B2A47(--deep) — 밝은 배경 위의 글자. 앱 화면이 라이트 테마라 필요하다 */
export const inkA = (a: number) => rgba(11, 42, 71, a);

export const color = {
  ...hex,
  /** 시안 --line */
  line: foamA(0.18),
} as const;

/**
 * 사진 없는 카드의 물기둥.
 * 시안 .column은 고정 그라데이션이지만, CLAUDE.md §5는 "깊이 들어간 날일수록
 * 카드가 어둡다"고 정한다. 스펙을 따라 깊이(t)로 보간한다 — WaterColumn.tsx 참조.
 */
/**
 * 물기둥은 **심해 네이비**다.
 *
 * 한동안 슬레이트(회청, 채도 ~25%)였다. 액센트가 파랑이던 시절에 "파란 배경 위의
 * 파란 점"을 피하려고 배경에서 채도를 뺀 결과인데, 물이 회색이 되고도 점은 여전히
 * 안 튀어서 양쪽을 다 잃었다. 액센트를 코럴로 옮기면서 채도를 시안 수준으로 되돌렸다.
 *
 * ⚠️ 액센트와 물색은 한 몸이다. 물기둥을 다른 계열로 옮기려면 hex.point도 같이 옮겨야
 * 한다 — 배경과 같은 계열의 점은 눈금자(§5의 서명)를 무력화한다.
 */
export const columnStops = {
  /** 얕은 날(t=0) → 깊은 날(t=1) 의 상·중·하 스톱 */
  top: ['#3A6E96', '#1E4568'] as const,
  mid: ['#28527A', '#122F4C'] as const,
  bottom: ['#173650', '#061524'] as const,
  /** 수면 광원 */
  sun: { color: '#DDEBF7', opacity: 0.34 },
  haze: { color: '#5C8CB8', opacity: 0.2 },
} as const;

/**
 * 사진 없는 카드용 부드러운 scrim.
 *
 * 물기둥을 밝히면 그 위의 흰 글자가 안 읽힌다 — 원래 시안은 물기둥이 충분히 어두워서
 * scrim이 없었다. 글자가 앉는 위·아래만 눌러 주고 가운데는 밝게 둔다.
 * (사진용 scrimStops보다 약하다.)
 */
export const columnScrimStops = [
  { offset: 0, opacity: 0.34 },
  { offset: 0.26, opacity: 0.02 },
  { offset: 0.62, opacity: 0.14 },
  { offset: 1, opacity: 0.68 },
] as const;

/** 사진 위 scrim — 시안 .scrim 4스톱 그대로 */
export const scrimStops = [
  { offset: 0, opacity: 0.62 },
  { offset: 0.26, opacity: 0 },
  { offset: 0.56, opacity: 0.3 },
  { offset: 1, opacity: 0.92 },
] as const;
