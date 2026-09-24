import type { Dive, Sighting } from '@/model/types';

/**
 * 테스트 픽스처 — **기본형은 빈 다이브다** (CLAUDE.md §2-①②).
 *
 * 이 앱을 깨뜨린 건 화려한 카드가 아니라 "추가만 누르고 아무것도 안 적은 다이브"였다
 * (§10-③). 그래서 전 항목을 채운 다이브는 여기서 소수고, 조합의 중심은 빈 값이다.
 * `src/model/fixtures.ts`는 카드 시각 검증용이라 `require(png)`가 섞여 있어 쓰지 않는다.
 */

export const DATE = '2026-08-05';

/** 방금 `+ 다이브 추가`를 누른 상태 그대로 — 장소도 아직 비어 있다 */
export const justAdded = (over: Partial<Dive> = {}): Dive => ({
  id: 'dive_new',
  date: DATE,
  site: '',
  discipline: 'scuba',
  sightings: [],
  ...over,
});

/** 필수 세 개만 적힌 다이브 */
export const minimal = (over: Partial<Dive> = {}): Dive =>
  justAdded({ id: 'dive_min', site: '문섬 새끼섬', ...over });

export const heart = (name = '가시해마'): Sighting[] => [{ name, isHighlight: true }];
export const seen = (name = '놀래기'): Sighting[] => [{ name, isHighlight: false }];

/**
 * 빈 값 조합을 전부 만든다. 카드 한 장씩 기대값을 적는 대신 **성질**을 검사하기 위한 것.
 *
 * ⚠️ **프리 다이브에도 `diveNumber`를 붙인다.** 지금 UI로는 안 만들어지지만
 * (`computeDiveNumbers`는 스쿠버만 센다) 저장소에서 들어온 데이터에는 있을 수 있다.
 * 예전엔 이 조합을 일부러 뺐었고, 그래서 `chooseHero`의 폴백이 종목을 안 보는 버그가
 * 테스트를 통과했다 — 프리 카드에 "313번째"가 찍히는데 후보 줄에는 없었다.
 * **픽스처가 피해 가면 불변식은 아무것도 보증하지 않는다.**
 */
export const everyDive = (): Dive[] => {
  const optionals: Partial<Dive>[] = [
    {},
    { duration: 42, waterTemp: 23 },
    { duration: 42, waterTemp: 23, visibility: 12, airEnd: 60, style: 'CWT' },
  ];
  const out: Dive[] = [];
  let n = 0;
  for (const discipline of ['free', 'scuba'] as const)
    for (const site of ['', '문섬 새끼섬'])
      for (const maxDepth of [undefined, 12, 24.5, 45])
        for (const diveNumber of [undefined, 313])
          for (const sightings of [[], seen(), heart()])
            for (const extra of optionals)
              for (const heroOverride of [
                undefined,
                'species',
                'depth',
                'count',
                'site',
                'date',
              ] as const)
                out.push({
                  ...extra,
                  id: `dive_${(n += 1)}`,
                  date: DATE,
                  site,
                  discipline,
                  maxDepth,
                  diveNumber,
                  sightings,
                  heroOverride,
                });
  return out;
};
