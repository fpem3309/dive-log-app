import Svg, { Path, Rect, Circle } from 'react-native-svg';

import { inkA } from '@/design/tokens';

/**
 * 화면 아이콘 — 끝이 둥근 선. `›` `✕` `♡` 같은 글자 기호는 폰트마다 굵기·높이가 달라
 * 둥근 화면 결과 안 맞았다. `<Defs>`가 없으므로 svgIds(§10-㉛)는 필요 없다.
 */

type P = { size?: number; color?: string };

const stroke = (color: string, w = 2.2) => ({
  stroke: color,
  strokeWidth: w,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  fill: 'none',
});

export function ChevronRight({ size = 18, color = inkA(0.3) }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 6l6 6-6 6" {...stroke(color)} />
    </Svg>
  );
}

export function ChevronLeft({ size = 20, color = inkA(0.85) }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M15 6l-6 6 6 6" {...stroke(color)} />
    </Svg>
  );
}

export function ChevronDown({ size = 18, color = inkA(0.3) }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6 9l6 6 6-6" {...stroke(color)} />
    </Svg>
  );
}

export function Plus({ size = 18, color = '#FFFFFF' }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 5v14M5 12h14" {...stroke(color, 2.4)} />
    </Svg>
  );
}

export function Close({ size = 18, color = inkA(0.45) }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M6.5 6.5l11 11M17.5 6.5l-11 11" {...stroke(color)} />
    </Svg>
  );
}

const HEART = 'M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z';

export function Heart({ size = 20, color = inkA(0.4), filled }: P & { filled?: boolean }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d={HEART} {...stroke(color, 2)} fill={filled ? color : 'none'} />
    </Svg>
  );
}

export function Waves({ size = 16, color = inkA(0.85) }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M2 10c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" {...stroke(color, 2)} />
      <Path d="M2 16c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" {...stroke(color, 2)} />
    </Svg>
  );
}

export function Camera({ size = 24, color = inkA(0.45) }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Rect x={3} y={5} width={18} height={15} rx={4} {...stroke(color, 2)} />
      <Circle cx={12} cy={12.5} r={3.5} {...stroke(color, 2)} />
      <Path d="M9 5l1.2-2h3.6L15 5" {...stroke(color, 2)} />
    </Svg>
  );
}
