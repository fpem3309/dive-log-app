import { describe, expect, it } from 'vitest';

import {
  addDays,
  autoTripTitle,
  dateRange,
  dateWithDay,
  daysOfTrip,
  diffDays,
  fromISO,
  padMD,
  toISO,
  tripTitle,
  weekdayKr,
  yearOf,
} from '@/model/dates';

/**
 * 묶음 1-b — 날짜·제목 계산.
 *
 * 시간대가 이 파일의 급소다. UTC로 파싱하면 음수 오프셋 지역에서 하루가 밀린다
 * (`new Date('2026-08-05')` → LA에서는 8월 4일 17시). 러너를 America/Los_Angeles로
 * 돌리는 이유가 이것이다 (vitest.config.mts) — 다만 아래 검사는 어느 시간대에서도 통과한다.
 */

const iso = (offsetDays: number) => {
  const d = new Date(Date.UTC(2026, 0, 1) + offsetDays * 86_400_000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(
    d.getUTCDate(),
  ).padStart(2, '0')}`;
};

describe('시간대에 상관없이 하루가 밀리지 않는다', () => {
  it('ISO → Date → ISO 왕복이 1년 내내 그대로다', () => {
    for (let i = 0; i < 366; i++) {
      const s = iso(i);
      expect(toISO(fromISO(s)), `${s}에서 날이 밀렸다`).toBe(s);
    }
  });

  it('산술은 정오에 앉는다 — DST 경계에서도 날이 안 넘어간다', () => {
    for (let i = 0; i < 366; i++) expect(fromISO(iso(i)).getHours(), iso(i)).toBe(12);
  });

  it('addDays는 1년 내내 정확히 다음 날을 준다', () => {
    for (let i = 0; i < 365; i++) expect(addDays(iso(i), 1), `${iso(i)} + 1일`).toBe(iso(i + 1));
    expect(addDays('2026-08-05', -1)).toBe('2026-08-04');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
  });

  it('diffDays', () => {
    expect(diffDays('2026-08-05', '2026-08-07')).toBe(2);
    expect(diffDays('2026-08-05', '2026-08-05')).toBe(0);
    expect(diffDays('2026-08-07', '2026-08-05')).toBe(-2);
    // DST가 끼어도 24시간 오차로 날이 늘거나 줄지 않는다 (LA: 3/8, 11/1)
    expect(diffDays('2026-03-07', '2026-03-09')).toBe(2);
    expect(diffDays('2026-10-31', '2026-11-02')).toBe(2);
  });
});

describe('트립 일자 칩 (§10-⑭)', () => {
  it('기간만큼 나온다', () => {
    expect(daysOfTrip('2026-08-05', '2026-08-07')).toEqual([
      '2026-08-05',
      '2026-08-06',
      '2026-08-07',
    ]);
    expect(daysOfTrip('2026-08-05', '2026-08-05')).toEqual(['2026-08-05']);
  });

  it('끝이 시작보다 앞서도 빈 배열이 되지 않는다', () => {
    // 편집 중에 잠깐 생기는 상태다. 여기서 []가 나오면 날짜를 고를 칩이 하나도 없다
    expect(daysOfTrip('2026-08-07', '2026-08-05')).toEqual(['2026-08-07']);
  });

  it('입력 실수로 기간이 길어도 60일에서 끊는다', () => {
    expect(daysOfTrip('2026-01-01', '2030-01-01')).toHaveLength(61);
  });
});

describe('날짜 표기 (§10-㉑)', () => {
  it('자리수를 채우고 요일을 붙인다', () => {
    expect(padMD('2026-08-05')).toBe('08.05');
    expect(weekdayKr('2026-08-05')).toBe('수');
    expect(dateWithDay('2026-08-05')).toBe('08.05 수');
  });

  it('목록에서 열이 맞도록 폭이 항상 같다', () => {
    const widths = new Set([padMD('2026-08-05'), padMD('2026-12-25'), padMD('2026-01-01')].map((s) => s.length));
    expect(widths).toEqual(new Set([5]));
  });

  it('기간 — 당일이면 요일까지', () => {
    expect(dateRange('2026-08-05', '2026-08-07')).toBe('08.05 – 08.07');
    expect(dateRange('2026-08-05', '2026-08-05')).toBe('08.05 수');
    expect(yearOf('2026-08-05')).toBe('2026');
  });
});

describe('자동 제목 (§4, §10-⑬㉑)', () => {
  it('지역이 없으면 새 트립', () => {
    expect(autoTripTitle('', '2026-08-05', '2026-08-05')).toBe('새 트립');
    expect(autoTripTitle('   ', '2026-08-05', '2026-08-07')).toBe('새 트립');
  });

  it('당일이면 지역만, 여러 날이면 N박', () => {
    expect(autoTripTitle('제주', '2026-08-05', '2026-08-05')).toBe('제주');
    expect(autoTripTitle('제주', '2026-08-05', '2026-08-07')).toBe('제주 2박');
    // "서귀포 · 제주" → 광역만
    expect(autoTripTitle('서귀포 · 제주', '2026-08-05', '2026-08-06')).toBe('제주 1박');
  });

  it('제목에 날짜를 넣지 않는다 — 목록·상세가 이미 옆에 보여준다', () => {
    for (const [s, e] of [
      ['2026-08-05', '2026-08-05'],
      ['2026-08-05', '2026-08-09'],
    ]) {
      expect(autoTripTitle('제주', s, e)).not.toMatch(/\d+\.\d+/);
    }
  });

  it('사용자가 적은 제목이 이긴다. 공백뿐이면 자동', () => {
    const trip = { region: '제주', startDate: '2026-08-05', endDate: '2026-08-07' };
    expect(tripTitle({ ...trip, title: '여름 제주' })).toBe('여름 제주');
    expect(tripTitle({ ...trip, title: '   ' })).toBe('제주 2박');
    expect(tripTitle({ ...trip, title: '' })).toBe('제주 2박');
  });

  it('제목은 어떤 트립에서도 비지 않는다', () => {
    expect(tripTitle({ title: '', region: '', startDate: '2026-08-05', endDate: '2026-08-05' })).toBe(
      '새 트립',
    );
  });
});
