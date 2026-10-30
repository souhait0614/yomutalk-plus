import type { EasingFunction, TransitionConfig } from 'svelte/transition';

export interface TwAnimateParams {
  readonly delay?: number;
  readonly duration?: number;
  readonly easing?: EasingFunction;
  readonly opacity?: number;
  readonly scale?: number;
  readonly rotate?: number | string;
  readonly blur?: number | string;
  readonly x?: number | string;
  readonly y?: number | string;
}

export type TwTransition = (node: Element, params?: TwAnimateParams) => TransitionConfig;

interface BezierCoefficients {
  readonly a: number;
  readonly b: number;
  readonly c: number;
}

const toBezierCoefficients = (p1: number, p2: number): BezierCoefficients => {
  const c = 3 * p1;
  const b = (3 * (p2 - p1)) - c;
  const a = 1 - c - b;
  return { a, b, c };
};

const calcBezier = ({ a, b, c }: BezierCoefficients, t: number) => ((((a * t) + b) * t) + c) * t;
const calcSlope = ({ a, b, c }: BezierCoefficients, t: number) => (3 * a * t * t) + (2 * b * t) + c;

const createCubicBezier = (x1: number, y1: number, x2: number, y2: number): EasingFunction => {
  const cx = toBezierCoefficients(x1, x2);
  const cy = toBezierCoefficients(y1, y2);

  return (x) => {
    if (x <= 0 || x >= 1) return x;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const slope = calcSlope(cx, t);
      if (slope === 0) break;
      t -= (calcBezier(cx, t) - x) / slope;
    }
    return calcBezier(cy, t);
  };
};

export const twEase = createCubicBezier(0.25, 0.1, 0.25, 1);

export const twDuration = 150;

const toUnit = (value: number | string, unit: string) => (typeof value === 'number' ? `${value}${unit}` : value);

/**
 * tw-animate-css の `animate-in` / `animate-out` を Svelte の transition として再現する。
 * 指定したパラメーターのみがアニメーション対象になる。
 */
export const twAnimate: TwTransition = (node, params = {}) => {
  const {
    delay = 0,
    duration = twDuration,
    easing = twEase,
    opacity,
    scale,
    rotate,
    blur,
    x,
    y,
  } = params;

  return {
    delay,
    duration,
    easing,
    css: (t, u) => {
      const declarations: string[] = [];

      if (opacity !== undefined) {
        declarations.push(`opacity: ${1 - ((1 - opacity) * u)};`);
      }

      const transforms: string[] = [];
      if (x !== undefined || y !== undefined) {
        const tx = toUnit(x ?? 0, 'px');
        const ty = toUnit(y ?? 0, 'px');
        transforms.push(`translate3d(calc(${tx} * ${u}), calc(${ty} * ${u}), 0)`);
      }
      if (scale !== undefined) {
        const s = 1 - ((1 - scale) * u);
        transforms.push(`scale3d(${s}, ${s}, ${s})`);
      }
      if (rotate !== undefined) {
        transforms.push(`rotate(calc(${toUnit(rotate, 'deg')} * ${u}))`);
      }
      if (transforms.length > 0) {
        declarations.push(`transform: ${transforms.join(' ')};`);
      }

      if (blur !== undefined) {
        declarations.push(`filter: blur(calc(${toUnit(blur, 'px')} * ${u}));`);
      }

      return declarations.join(' ');
    },
  };
};

const createTwTransition = (defaults: TwAnimateParams): TwTransition => (node, params) => twAnimate(node, { ...defaults, ...params });

export const twFade = createTwTransition({ opacity: 0 });

export const twSlideToTop = createTwTransition({ y: '-100%' });

export const twSlideToBottom = createTwTransition({ y: '100%' });
