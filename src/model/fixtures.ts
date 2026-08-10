import type { Dive } from './types';

/**
 * 검증용 목 데이터. 계획서의 픽스처 표 8종 그대로.
 * 이 8장이 전부 멀쩡해야 카드 시스템이 통과다 — 특히 #6.
 */

export type Fixture = {
  /** 갤러리 캡션 (시안 .caption 자리) */
  label: string;
  /** 이 픽스처가 무엇을 확인하는지 */
  checks: string;
  region: string;
  dive: Dive;
};

const none: Dive['sightings'] = [];

export const fixtures: Fixture[] = [
  {
    label: '① 프리 · 사진 있음 · 전 항목',
    checks: '시안 좌측 상단과 나란히 비교',
    region: 'Seogwipo · Jeju',
    dive: {
      id: 'f1',
      date: '2026-08-02',
      time: '14:20',
      site: '문섬 새끼섬',
      discipline: 'free',
      maxDepth: 24.5,
      duration: 128, // 프리는 초 — 2:08
      waterTemp: 23,
      visibility: 15,
      style: 'CWT',
      sightings: none,
      photo: require('../../assets/dev-photos/freedive.png'),
    },
  },
  {
    label: '② 프리 · 사진 없음',
    checks: '물기둥이 배경, 눈금자가 주인공',
    region: 'Seogwipo · Jeju',
    dive: {
      id: 'f2',
      date: '2026-08-02',
      time: '14:20',
      site: '문섬 새끼섬',
      discipline: 'free',
      maxDepth: 24.5,
      duration: 128,
      waterTemp: 23,
      visibility: 15,
      style: 'CWT',
      sightings: none,
    },
  },
  {
    label: '③ 스쿠버 · 4칸',
    checks: '횟수형 히어로',
    region: 'Seogwipo · Jeju',
    dive: {
      id: 'f3',
      date: '2026-07-19',
      time: '10:05',
      site: '섶섬 큰안통',
      discipline: 'scuba',
      maxDepth: 18,
      duration: 42, // 스쿠버는 분
      waterTemp: 21,
      airEnd: 50,
      diveNumber: 312,
      sightings: none,
      photo: require('../../assets/dev-photos/scuba.png'),
    },
  },
  {
    label: '④ 스쿠버 · 공기압 기억 안 남',
    checks: '칸이 3개로 줄고 자리를 나눠 가짐',
    region: 'Seogwipo · Jeju',
    dive: {
      id: 'f4',
      date: '2026-07-19',
      site: '섶섬 큰안통',
      discipline: 'scuba',
      maxDepth: 18,
      duration: 42,
      waterTemp: 21,
      diveNumber: 312,
      sightings: none,
    },
  },
  {
    label: '⑤ 생물형 · 하트 지정',
    checks: '수심·횟수를 밀어냄',
    region: 'Daejeong · Jeju',
    dive: {
      id: 'f5',
      date: '2026-06-28',
      time: '07:40',
      site: '대정 앞바다',
      discipline: 'scuba',
      maxDepth: 7,
      duration: 36,
      waterTemp: 22,
      diveNumber: 308,
      // ⚠️ CLAUDE.md §9 — 남방큰돌고래는 실제 다이빙 중 만나기 어려운 종이라
      // 자리만 채운 것이다. 실제 포인트 데이터가 정해지면 교체할 것.
      sightings: [
        { name: '남방큰돌고래', scientificName: 'Tursiops aduncus', count: 4, isHighlight: true },
      ],
      photo: require('../../assets/dev-photos/dolphin.png'),
    },
  },
  {
    label: '⑥ 필수 3개만 (날짜·장소·종목)',
    checks: 'strip·구분선 없음, 주황 점 없음, 그래도 멀쩡해야 함',
    region: 'Seogwipo · Jeju',
    dive: {
      id: 'f6',
      date: '2026-05-11',
      site: '문섬 한계창',
      discipline: 'free',
      sightings: none,
    },
  },
  {
    label: '⑦ 프리 45m',
    checks: '축이 0~60으로 확장, 라벨 20/40/60',
    region: 'Gapado · Jeju',
    dive: {
      id: 'f7',
      date: '2026-09-14',
      time: '09:10',
      site: '가파도 남단',
      discipline: 'free',
      maxDepth: 45,
      duration: 172, // 2:52
      waterTemp: 24,
      visibility: 22,
      style: 'FIM',
      sightings: none,
    },
  },
  {
    label: '⑧ 자유 입력한 긴 생물명',
    checks: '2줄로 축소, 레이아웃 안 밀림',
    region: 'Seogwipo · Jeju',
    dive: {
      id: 'f8',
      date: '2026-05-11',
      site: '문섬 한계창',
      discipline: 'scuba',
      maxDepth: 15,
      duration: 44,
      diveNumber: 287,
      // 도감에 없어서 자유 입력한 이름 (§3 — 목록에 없으면 자유 입력 허용).
      // 실제로 사람들이 이렇게 적는다. 가장 긴 현실적 입력을 가정한 값.
      sightings: [
        { name: '이름 모르는 파란 줄무늬 갯민숭달팽이 무리', isHighlight: true, memo: '처음 봄' },
      ],
    },
  },
];
