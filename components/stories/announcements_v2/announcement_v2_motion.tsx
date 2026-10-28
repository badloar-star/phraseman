// ═══════════════════════════════════════════════════════════════════════════
// announcement_v2_motion.tsx — движок движения 36 кадров объявлений (макет stories-announcements-v1.html, v2.1): ключевые кадры @keyframes
// макета как есть, вечные циклы, раскрытие по оси, круговое раскрытие, корень кадра с маской «частицы вне полосы текста».
//
// зачем (владелец 28.10: «работать корректно в приложении точно так же, как на макете»): каждое движение макета — это @keyframes с
// длительностью, задержкой и кривой. Keyframed переносит их числами (ключи 0…1, значение на ключе, кривая отрезка), Loop — циклы
// `infinite` / `infinite alternate`; всё считается от часов кадра (story_frame_clock): удержание ставит на паузу, «Уменьшить движение» —
// конечное состояние (у циклов — покой). Только transform/opacity на UI-треде; раскрытия — окно и противоход (без анимации layout).
// ═══════════════════════════════════════════════════════════════════════════
import React, { createContext, memo, useCallback, useContext, useMemo, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from '../../SafeLinearGradient';
import { EASE_CSS_IN_OUT, EASE_CSS_OUT, EASE_OUT, EASE_SPRING, cubicBezier, frameMs, loop, phase, pingPong, useStoryFrameClock } from '../templates/story_frame_clock';

export type Ease = (x: number) => number;
/** linear — для циклов «linear infinite» макета. */
export const EASE_LINEAR: Ease = (x: number) => { 'worklet'; return x; };
/** CSS `ease` (дыхание точек, проявление). */
export const EASE_CSS: Ease = cubicBezier(0.25, 0.1, 0.25, 1);
/** .6,0,.4,1 — переворот песочных часов. */
export const EASE_HOUR: Ease = cubicBezier(0.6, 0, 0.4, 1);
export { EASE_CSS_IN_OUT, EASE_CSS_OUT, EASE_OUT, EASE_SPRING };

/** Ключевой кадр: доля времени `at` (0…1) и значения; отсутствующее значение берётся из соседних ключей (как в CSS). */
export type Key = Readonly<{
  at: number;
  x?: number; y?: number; scale?: number; scaleX?: number; scaleY?: number; rot?: number; rotX?: number; rotY?: number; skewY?: number; opacity?: number;
  /** Кривая отрезка, ведущего К этому ключу (CSS: animation-timing-function на отрезке). По умолчанию — кривая всего движения. */
  ease?: Ease;
}>;

type Prop = 'x' | 'y' | 'scale' | 'scaleX' | 'scaleY' | 'rot' | 'rotX' | 'rotY' | 'skewY' | 'opacity';
const PROPS: readonly Prop[] = ['x', 'y', 'scale', 'scaleX', 'scaleY', 'rot', 'rotX', 'rotY', 'skewY', 'opacity'];
const DEFAULTS: Readonly<Record<Prop, number>> = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rot: 0, rotX: 0, rotY: 0, skewY: 0, opacity: 1 };

/** Значение свойства на доле p: линейно между ближайшими ключами, у которых оно задано; за краями — крайнее. */
export function keyValue(keys: readonly Key[], prop: Prop, p: number, ease: Ease): number {
  'worklet';
  let prev: Key | null = null;
  let next: Key | null = null;
  for (let i = 0; i < keys.length; i += 1) {
    const k = keys[i]!;
    if (k[prop] === undefined) continue;
    if (k.at <= p) prev = k;
    else { next = k; break; }
  }
  if (!prev && !next) return DEFAULTS[prop];
  if (!prev) return next![prop] as number;
  if (!next || next.at === prev.at) return prev[prop] as number;
  const u = (p - prev.at) / (next.at - prev.at);
  const e = (next.ease ?? ease)(u);
  return (prev[prop] as number) + ((next[prop] as number) - (prev[prop] as number)) * e;
}

/** Элемент transform React Native (типы Reanimated не принимают произвольный Record). */
export type Tf = { perspective: number } | { translateX: number } | { translateY: number } | { rotateX: string } | { rotateY: string } | { rotate: string } | { skewY: string } | { scale: number } | { scaleX: number } | { scaleY: number };
export type KeyStyle = { opacity: number; transform: Tf[] };

export function keyStyle(keys: readonly Key[], p: number, ease: Ease, perspective: number): KeyStyle {
  'worklet';
  const v: Record<Prop, number> = { x: 0, y: 0, scale: 1, scaleX: 1, scaleY: 1, rot: 0, rotX: 0, rotY: 0, skewY: 0, opacity: 1 };
  for (let i = 0; i < PROPS.length; i += 1) v[PROPS[i]!] = keyValue(keys, PROPS[i]!, p, ease);
  const transform: Tf[] = [];
  if (v.rotX !== 0 || v.rotY !== 0) transform.push({ perspective });
  if (v.x !== 0 || v.y !== 0) transform.push({ translateX: v.x }, { translateY: v.y });
  if (v.rotX !== 0) transform.push({ rotateX: `${v.rotX}deg` });
  if (v.rotY !== 0) transform.push({ rotateY: `${v.rotY}deg` });
  if (v.rot !== 0) transform.push({ rotate: `${v.rot}deg` });
  if (v.skewY !== 0) transform.push({ skewY: `${v.skewY}deg` });
  if (v.scale !== 1) transform.push({ scale: v.scale });
  if (v.scaleX !== 1) transform.push({ scaleX: v.scaleX });
  if (v.scaleY !== 1) transform.push({ scaleY: v.scaleY });
  return { opacity: Math.max(0, Math.min(1, v.opacity)), transform };
}

type Kids = Readonly<{ children?: React.ReactNode; style?: StyleProp<ViewStyle>; testID?: string; pointerEvents?: 'none' | 'box-none' | 'auto' }>;

type KeyframedProps = Kids & Readonly<{
  keys: readonly Key[];
  /** Задержка и длительность, мс (animation-delay / animation-duration). */
  d: number; dur: number;
  /** Кривая движения (по умолчанию ease-out .23,1,.32,1 макета). */
  ease?: Ease;
  /** Перспектива для rotateX/rotateY (perspective родителя в макете). */
  perspective?: number;
  /** Точка опоры (transform-origin) в dp от центра: перенос → движение → перенос обратно. */
  originX?: number; originY?: number;
}>;

/** Одно движение макета по ключевым кадрам: до начала — первый ключ, после конца — последний (fill: both). */
export const Keyframed = memo(function Keyframed({ keys, d, dur, ease = EASE_OUT, perspective = 1000, originX = 0, originY = 0, style, children, testID, pointerEvents }: KeyframedProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const p = phase(frameMs(progress.value, durationMs, final), d, dur);
    const s = keyStyle(keys, p, ease, perspective);
    if (originX !== 0 || originY !== 0) s.transform = [{ translateX: originX }, { translateY: originY }, ...s.transform, { translateX: -originX }, { translateY: -originY }];
    return s;
  });
  return <Animated.View testID={testID} pointerEvents={pointerEvents} style={[style, animated]}>{children}</Animated.View>;
});

type LoopProps = Kids & Readonly<{
  keys: readonly Key[];
  /** Период цикла, мс; alternate — туда-обратно (`infinite alternate`), иначе по кругу. */
  periodMs: number; alternate?: boolean;
  /** Сдвиг старта, мс (отрицательная задержка макета = цикл уже идёт); положительная — покой до начала. */
  d?: number;
  ease?: Ease;
  perspective?: number;
  originX?: number; originY?: number;
}>;

/** Вечный цикл макета; в «Уменьшить движение» — покой (первый ключ). */
export const Loop = memo(function Loop({ keys, periodMs, alternate = false, d = 0, ease = EASE_CSS_IN_OUT, perspective = 1000, originX = 0, originY = 0, style, children, testID, pointerEvents }: LoopProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const animated = useAnimatedStyle(() => {
    const t = frameMs(progress.value, durationMs, final) - d;
    // зачем: покой цикла (final, до задержки) = базовый стиль элемента, как CSS без анимации, а не первый ключ (волна в покое — полная высота, блик — по центру)
    if (final || t < 0) return { transform: [] as Tf[] };
    const p = alternate ? pingPong(t, periodMs, false) : loop(t, periodMs, false);
    const s = keyStyle(keys, p, ease, perspective);
    if (originX !== 0 || originY !== 0) s.transform = [{ translateX: originX }, { translateY: originY }, ...s.transform, { translateX: -originX }, { translateY: -originY }];
    return s;
  });
  return <Animated.View testID={testID} pointerEvents={pointerEvents} style={[style, animated]}>{children}</Animated.View>;
});

// ── раскрытие по оси (clip-path: inset) — окно едет, содержимое противоходом ─────────────────────────────────────

type RevealProps = Readonly<{
  width: number; height: number;
  /** С какой стороны открывается: 'left' (inset справа 100 % → 0), 'bottom' (снизу вверх), 'top', 'right'. */
  from: 'left' | 'right' | 'top' | 'bottom';
  d: number; dur: number; ease?: Ease;
  children: React.ReactNode; style?: StyleProp<ViewStyle>;
}>;

/** clip-path: inset(…) макета без анимации размеров: окно overflow:hidden сдвигается, содержимое — на столько же назад. */
export const Reveal = memo(function Reveal({ width, height, from, d, dur, ease = EASE_OUT, children, style }: RevealProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const axisX = from === 'left' || from === 'right';
  const sign = from === 'left' || from === 'top' ? -1 : 1;
  const windowStyle = useAnimatedStyle(() => {
    const k = 1 - ease(phase(frameMs(progress.value, durationMs, final), d, dur));
    return { transform: axisX ? [{ translateX: sign * width * k }] : [{ translateY: sign * height * k }] };
  });
  const contentStyle = useAnimatedStyle(() => {
    const k = 1 - ease(phase(frameMs(progress.value, durationMs, final), d, dur));
    return { transform: axisX ? [{ translateX: -sign * width * k }] : [{ translateY: -sign * height * k }] };
  });
  return (
    <View style={[{ width, height }, style]}>
      <Animated.View style={[{ width, height, overflow: 'hidden' }, windowStyle]}>
        <Animated.View style={[{ width, height }, contentStyle]}>{children}</Animated.View>
      </Animated.View>
    </View>
  );
});

// ── круговое раскрытие (clip-path: circle(0 → R at x y)) — маска-круг растёт ─────────────────────────────────────

type CircleRevealProps = Readonly<{
  width: number; height: number;
  /** Центр круга в долях (50 % / 34 % макета) и конечный радиус, dp. */
  cx: number; cy: number; radius: number;
  d: number; dur: number; ease?: Ease;
  children: React.ReactNode; style?: StyleProp<ViewStyle>;
}>;

export const CircleReveal = memo(function CircleReveal({ width, height, cx, cy, radius, d, dur, ease = EASE_OUT, children, style }: CircleRevealProps) {
  const { progress, durationMs, final } = useStoryFrameClock();
  const size = radius * 2;
  const mask = useAnimatedStyle(() => ({ transform: [{ scale: Math.max(0.001, ease(phase(frameMs(progress.value, durationMs, final), d, dur))) }] }));
  return (
    <MaskedView
      style={[{ width, height }, style]}
      maskElement={
        <View style={{ width, height }}>
          <Animated.View style={[{ position: 'absolute', left: width * cx - radius, top: height * cy - radius, width: size, height: size, borderRadius: radius, backgroundColor: '#000' }, mask]} /> {/* theme-exempt: маска, цвет не виден */}
        </View>
      }
    >
      {children}
    </MaskedView>
  );
});

// ── корень кадра: слой частиц (с маской вне полосы текста), подложки и колонка содержимого ──────────────────────────

type Band = Readonly<{ top: number; bottom: number }> | null;
type BandCtx = Readonly<{ report: (band: Band) => void }>;
const BandContext = createContext<BandCtx | null>(null);

/** Полоса текста кадра: оборачивает текстовую часть; корень гасит частицы в этой полосе (.fx.tz макета). */
export const TextZone = memo(function TextZone({ children, style }: Readonly<{ children: React.ReactNode; style?: StyleProp<ViewStyle> }>) {
  const ctx = useContext(BandContext);
  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { y, height } = e.nativeEvent.layout;
    ctx?.report(height > 0 ? { top: y, bottom: y + height } : null);
  }, [ctx]);
  return <View style={[a.zone, style]} onLayout={ctx ? onLayout : undefined}>{children}</View>;
});

type RootProps = Readonly<{
  /** Подложки (.bg макета: плоскости, диски) — под содержимым, на весь кадр. */
  back?: React.ReactNode;
  /** Частицы (.fx макета) — под содержимым; `maskText` — гаснут в полосе TextZone (.fx.tz). */
  layer?: React.ReactNode; maskText?: boolean;
  /** Колонка: по центру (макет .sl) или слева (.sl.left). */
  left?: boolean;
  /** Колонка на всю высоту без центрирования (постер, цитата). */
  fill?: boolean;
  children: React.ReactNode; testID?: string;
}>;

/** .sl макета: поля 28, по центру; подложки и частицы — абсолютные слои на весь кадр, обрезаны кадром. */
export const AnnRoot = memo(function AnnRoot({ back, layer, maskText = false, left = false, fill = false, children, testID }: RootProps) {
  const [band, setBand] = useState<Band>(null);
  const [rootH, setRootH] = useState(0);
  const ctx = useMemo<BandCtx>(() => ({ report: setBand }), []);
  const onLayout = useCallback((e: LayoutChangeEvent) => { setRootH(e.nativeEvent.layout.height); }, []);
  // зачем (координатор 28.10: «частицы не должны заходить в зону текста»): маска — вертикальный градиент: чёрный → прозрачный за 64 dp
  // до полосы текста → прозрачный в полосе → чёрный через 64 dp после; полосы ещё нет — слой целиком
  const maskLocations = useMemo(() => {
    if (!maskText || !band || rootH <= 0) return null;
    const c = (v: number) => Math.max(0, Math.min(1, v / rootH));
    return [0, c(band.top - 64), c(band.top - 10), c(band.bottom + 10), c(band.bottom + 64), 1] as const;
  }, [band, maskText, rootH]);
  const particles = layer ? <View pointerEvents="none" style={a.clip}>{layer}</View> : null;
  return (
    <BandContext.Provider value={ctx}>
      <View testID={testID} style={a.root} onLayout={onLayout}>
        {back ? <View pointerEvents="none" style={a.clip}>{back}</View> : null}
        {particles && maskLocations ? (
          <MaskedView style={a.clip} pointerEvents="none" maskElement={<LinearGradient colors={['#000', '#000', 'transparent', 'transparent', '#000', '#000']} locations={maskLocations} style={StyleSheet.absoluteFill} />}> {/* theme-exempt: маска */}
            {particles}
          </MaskedView>
        ) : particles}
        <View style={[a.column, left ? a.left : null, fill ? a.fill : null]}>{children}</View>
      </View>
    </BandContext.Provider>
  );
});

const a = StyleSheet.create({
  root: { flex: 1, alignSelf: 'stretch', overflow: 'hidden' },
  clip: { ...StyleSheet.absoluteFillObject, overflow: 'hidden' },
  column: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 28 },
  left: { alignItems: 'flex-start' },
  fill: { justifyContent: 'flex-start' },
  zone: { alignSelf: 'stretch', alignItems: 'center' },
});
