/**
 * 날짜 도우미. 전부 `YYYY-MM-DD` 로컬 날짜 문자열 기준이다.
 *
 * Date 객체를 UTC로 다루면 한국에서 하루씩 밀린다. 그래서 파싱·포맷 모두
 * 로컬 연·월·일만 쓰고, 산술은 정오(12:00)로 고정해 DST 경계에서도 날이 안 넘어가게 한다.
 */

const pad = (n: number) => String(n).padStart(2, '0');

export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const todayISO = () => toISO(new Date());

/** "2026-08-02" → Date (로컬 정오) */
export const fromISO = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
};

export const addDays = (iso: string, n: number) => {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
};

export const diffDays = (a: string, b: string) =>
  Math.round((fromISO(b).getTime() - fromISO(a).getTime()) / 86_400_000);

/** 트립 기간의 날짜들. 다이브 날짜를 칩으로 고르게 하는 데 쓴다. */
export const daysOfTrip = (startDate: string, endDate: string): string[] => {
  const n = Math.max(0, diffDays(startDate, endDate));
  // 방어: 기간이 이상하게 길면(입력 실수) 60일에서 끊는다
  return Array.from({ length: Math.min(n, 60) + 1 }, (_, i) => addDays(startDate, i));
};

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];
export const weekdayKr = (iso: string) => WEEKDAY[fromISO(iso).getDay()];

/** "2026-08-02" → "8.2" */
export const shortDate = (iso: string) => {
  const [, m, d] = iso.split('-').map(Number);
  return `${m}.${d}`;
};

/**
 * "2026-08-05" → "08.05".
 *
 * 자리수를 채운다. mono로 찍으면 폭이 항상 같아서 목록에서 열이 딱 맞고,
 * 카드가 쓰는 표기(2026.08.02)와 같은 결이 된다.
 * 연도는 목록의 연도 헤더가 책임지므로 여기서는 붙이지 않는다.
 */
export const padMD = (iso: string) => {
  const [, m, d] = iso.split('-');
  return `${m}.${d}`;
};

/** "08.05 수" — 요일이 붙어야 "아 수요일에 갔지"가 살아난다 */
export const dateWithDay = (iso: string) => `${padMD(iso)} ${weekdayKr(iso)}`;

/** "08.05 – 08.07". 당일이면 요일까지 붙은 "08.05 수". */
export const dateRange = (startDate: string, endDate: string) =>
  startDate === endDate ? dateWithDay(startDate) : `${padMD(startDate)} – ${padMD(endDate)}`;

export const yearOf = (iso: string) => iso.slice(0, 4);

/**
 * 트립 제목이 비었을 때 자동 생성 — CLAUDE.md §4.
 *
 * 저장할 때 굽지 않고 **표시할 때마다 계산한다.** 트립을 만든 직후에는 지역도 기간도
 * 비어 있어서, 그 시점에 구워 두면 "8.5" 같은 껍데기가 남고 나중에 지역·기간을 채워도
 * 안 따라온다. 빈 문자열이 곧 "자동" 상태라는 게 §4의 뜻이다.
 */
export const autoTripTitle = (region: string, startDate: string, endDate: string) => {
  const nights = Math.max(0, diffDays(startDate, endDate));
  // "서귀포 · 제주" → "제주". 지점보다 광역이 트립 이름으로 자연스럽다.
  const place = region.split('·').pop()?.trim() || region.trim();
  // 날짜는 목록·상세 모두에서 제목 바로 옆에 이미 있다. 제목에 또 넣지 않는다.
  if (!place) return '새 트립';
  return nights > 0 ? `${place} ${nights}박` : place;
};

/** 화면에 보여줄 트립 이름. 사용자가 적은 게 있으면 그것, 없으면 자동 생성. */
export const tripTitle = (trip: {
  title: string;
  region: string;
  startDate: string;
  endDate: string;
}) => trip.title.trim() || autoTripTitle(trip.region, trip.startDate, trip.endDate);
