// Голо-фойл наклон-карта для дропа коллекции (RN-порт макета .codex-tmp/holo-foil-rarities.html).
// У каждой редкости свой цвет и «мощность» голо-эффекта: от матового отлива (common)
// до полного радужного фойла с искрами (legendary). Карта наклоняется за пальцем,
// блик/радуга/спекуляр бегут за касанием; при появлении — авто-«тряс» под редкость.
//
// Web→RN адаптации (нет conic-gradient/mix-blend-mode/perspective как в CSS):
//   • 3D-наклон — transform perspective + rotateX/rotateY (Reanimated worklet);
//   • радужный «фойл» — наложенный LinearGradient, угол/яркость зависят от наклона;
//   • спекуляр — белый блик-градиент, бежит за касанием;
//   • искры — лёгкие точки по площади (число растёт с редкостью).
import React, { useEffect, useMemo } from 'react';
import { AppState, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { LinearGradient } from './SafeLinearGradient';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';
import type { CollectibleRarity } from '../app/collectibles/catalog';

/** Голо-профиль на редкость — мощность эффекта растёт от common к legendary. */
type HoloProfile = {
  power: 1 | 2 | 3 | 4;
  tilt: number; // макс. наклон, градусы
  holoMax: number; // макс. непрозрачность радужного фойла
  gloss: number; // яркость движущегося глянца
  spec: number; // яркость спекуляра под касанием
  edgeGlow: number; // свечение края, px
  glints: number; // число искр на «тряс»
  idleShimmer: boolean; // живёт ли в покое (epic/legendary)
};

const HOLO_PROFILES: Record<CollectibleRarity, HoloProfile> = {
  common: { power: 1, tilt: 7, holoMax: 0.1, gloss: 0.55, spec: 0.18, edgeGlow: 0, glints: 0, idleShimmer: false },
  rare: { power: 2, tilt: 12, holoMax: 0.3, gloss: 0.8, spec: 0.32, edgeGlow: 10, glints: 3, idleShimmer: false },
  epic: { power: 3, tilt: 16, holoMax: 0.5, gloss: 1.0, spec: 0.42, edgeGlow: 18, glints: 6, idleShimmer: true },
  legendary: { power: 4, tilt: 20, holoMax: 0.72, gloss: 1.0, spec: 0.55, edgeGlow: 30, glints: 12, idleShimmer: true },
};

const RAINBOW = ['#ff6ec4', '#7873f5', '#42d7f5', '#4ade80', '#facc15', '#ff8a5c', '#ff6ec4'] as const;

interface HoloFoilCardProps {
  rarity: CollectibleRarity;
  rarityColor: string;
  /** Сама карточка-арт (SVG/заглушка) — её мы и «фойлим». */
  children: React.ReactNode;
  /** Размеры площадки карты. */
  width?: number;
  height?: number;
  style?: StyleProp<ViewStyle>;
  /** Запускать приветственный авто-«тряс» при появлении. */
  autoShake?: boolean;
  /** 3D-наклон/вращение карты (за пальцем, на «трясе» и в idle). false — карта
      не крутится, но радуга/глянец/спекуляр продолжают жить. */
  tiltEnabled?: boolean;
}

/** Полупрозрачный hex-суффикс из 0..1 (для краёв/подложек). */
function alphaHex(a: number): string {
  const v = Math.round(Math.max(0, Math.min(1, a)) * 255);
  return v.toString(16).padStart(2, '0');
}

export default function HoloFoilCard({
  rarity,
  rarityColor,
  children,
  width = 184,
  height = 147,
  style,
  autoShake = true,
  tiltEnabled = true,
}: HoloFoilCardProps) {
  const p = HOLO_PROFILES[rarity] ?? HOLO_PROFILES.common;
  const isFocused = useIsScreenFocused();

  // нормализованный наклон -1..1 по двум осям + «прилёт» масштаба
  const nx = useSharedValue(0);
  const ny = useSharedValue(0);
  const enter = useSharedValue(0); // 0 — до прилёта, 1 — на месте
  const idle = useSharedValue(0); // постоянный шиммер epic/legendary
  const gloss = useSharedValue(-1.3); // позиция движущегося глянца, доли ширины

  // удалённость касания от центра 0..1 → интенсивность всего эффекта
  const dist = useDerivedDist(nx, ny);

  useEffect(() => {
    enter.value = 0;
    enter.value = withTiming(1, { duration: 520, easing: Easing.out(Easing.cubic) });

    if (autoShake) {
      const seq = [
        { x: 0, y: 0, t: 0 },
        { x: -0.9, y: -0.2, t: 260 },
        { x: 0.9, y: 0.1, t: 300 },
        { x: -0.5, y: 0.4, t: 280 },
        { x: 0.3, y: -0.3, t: 240 },
        { x: 0, y: 0, t: 240 },
      ];
      nx.value = withSequence(
        ...seq.map((s) => withTiming(s.x, { duration: s.t, easing: Easing.inOut(Easing.quad) })),
      );
      ny.value = withSequence(
        ...seq.map((s) => withTiming(s.y, { duration: s.t, easing: Easing.inOut(Easing.quad) })),
      );
      // движущийся глянец один раз поверх «тряса»
      gloss.value = withDelay(180, withTiming(1.3, { duration: 700, easing: Easing.inOut(Easing.ease) }));
    }

    return () => {
      cancelAnimation(nx);
      cancelAnimation(ny);
      cancelAnimation(enter);
      cancelAnimation(gloss);
    };
    // профиль зависит только от редкости
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rarity, autoShake]);

  // idle крутится ВЕЧНО (даёт мерцание искрам/наклон-шиммер) — гардим его фокусом
  // экрана и AppState: при freezeOnBlur:false карта дропа переживает уход с экрана,
  // и без гарда луп продолжал бы перерисовывать голо-эффект в фоне и греть телефон.
  const idleAnimates = p.idleShimmer || p.glints > 0;
  useEffect(() => {
    if (!idleAnimates || !isFocused) {
      cancelAnimation(idle);
      idle.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(idle);
      idle.value = 0;
      idle.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    };
    const stop = () => {
      cancelAnimation(idle);
      idle.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(idle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idle, idleAnimates, isFocused]);

  // Палец водит по карте → наклон следует за касанием (как pointermove в макете).
  const pan = useMemo(
    () =>
      Gesture.Pan()
        .onBegin((e) => {
          'worklet';
          nx.value = clamp01((e.x / width - 0.5) * 2);
          ny.value = clamp01((e.y / height - 0.5) * 2);
        })
        .onUpdate((e) => {
          'worklet';
          nx.value = clamp01((e.x / width - 0.5) * 2);
          ny.value = clamp01((e.y / height - 0.5) * 2);
        })
        .onFinalize(() => {
          'worklet';
          nx.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) });
          ny.value = withTiming(0, { duration: 420, easing: Easing.out(Easing.quad) });
        }),
    [width, height],
  );

  // Каркас карты: 3D-наклон + лёгкий прилёт-масштаб. При tiltEnabled:false
  // вращение отключено («не надо крутить») — остаются прилёт и голография.
  const cardStyle = useAnimatedStyle(() => {
    const ix = tiltEnabled && p.idleShimmer ? Math.sin(idle.value * Math.PI * 2) * 0.18 : 0;
    const iy = tiltEnabled && p.idleShimmer ? Math.cos(idle.value * Math.PI * 2) * 0.14 : 0;
    const rx = tiltEnabled ? (-(ny.value + iy)) * p.tilt : 0;
    const ry = tiltEnabled ? (nx.value + ix) * p.tilt : 0;
    const scale = interpolate(enter.value, [0, 0.5, 1], [0.86, 1.05, 1]);
    return {
      opacity: interpolate(enter.value, [0, 1], [0.4, 1]),
      transform: [{ perspective: 900 }, { rotateX: `${rx}deg` }, { rotateY: `${ry}deg` }, { scale }],
    };
  });

  // Радужный «фойл»: ярче к краям, угол зависит от направления наклона.
  const holoStyle = useAnimatedStyle(() => {
    const d = dist.value;
    const idlePulse = p.idleShimmer ? 0.16 + 0.1 * (0.5 + 0.5 * Math.sin(idle.value * Math.PI * 2)) : 0.18;
    return { opacity: p.holoMax * (idlePulse + 0.65 * d) };
  });
  // угол радуги поворачиваем сдвигом самого градиента (start/end следуют за наклоном)
  const holoGradStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: nx.value * width * 0.16 },
      { translateY: ny.value * height * 0.16 },
      { scale: 1.6 },
    ],
  }));

  // Спекуляр — белый блик бежит за касанием.
  const specStyle = useAnimatedStyle(() => {
    const d = dist.value;
    return {
      opacity: p.spec * (0.4 + 0.6 * d),
      transform: [
        { translateX: nx.value * width * 0.34 },
        { translateY: ny.value * height * 0.34 },
      ],
    };
  });

  // Движущийся глянец на «тряс».
  const glossStyle = useAnimatedStyle(() => ({
    opacity: p.gloss,
    transform: [{ translateX: gloss.value * width }, { rotateZ: '18deg' }],
  }));

  // Свечение края усиливается на наклоне.
  const edgeStyle = useAnimatedStyle(() => {
    if (p.edgeGlow <= 0) return { opacity: 0 };
    const d = dist.value;
    return { opacity: 0.25 + 0.45 * d };
  });

  // Искры (статичный набор, мигают по фазе) — число растёт с редкостью.
  const glints = useMemo(
    () =>
      Array.from({ length: p.glints }, (_, i) => ({
        left: 8 + ((i * 137) % 84),
        top: 8 + ((i * 71) % 84),
        delay: i * 90,
        gold: rarity === 'legendary' && i % 2 === 0,
      })),
    [p.glints, rarity],
  );

  return (
    <GestureDetector gesture={pan}>
      <View style={[{ width, height }, style]}>
        <Animated.View style={[styles.card, { borderColor: rarityColor }, cardStyle]}>
          {/* подложка-арт */}
          <View style={styles.fill}>{children}</View>

          {/* радужный фойл */}
          <Animated.View pointerEvents="none" style={[styles.layer, holoStyle]}>
            <Animated.View style={[styles.holoGrad, holoGradStyle]}>
              <LinearGradient
                colors={RAINBOW}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
            </Animated.View>
          </Animated.View>

          {/* движущийся глянец */}
          <Animated.View pointerEvents="none" style={[styles.glossWrap, glossStyle]}>
            <LinearGradient
              colors={['transparent', 'rgba(255,255,255,0.42)', 'transparent']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.glossBar}
            />
          </Animated.View>

          {/* спекуляр под касанием */}
          <Animated.View pointerEvents="none" style={[styles.spec, specStyle]}>
            <LinearGradient
              colors={['rgba(255,255,255,0.55)', 'rgba(255,255,255,0)']}
              start={{ x: 0.5, y: 0.5 }}
              end={{ x: 1, y: 1 }}
              style={styles.specInner}
            />
          </Animated.View>

          {/* искры */}
          {glints.map((g, i) => (
            <Glint key={i} {...g} color={g.gold ? rarityColor : '#fff'} idle={idle} />
          ))}

          {/* свечение края */}
          <Animated.View
            pointerEvents="none"
            style={[
              styles.edge,
              { borderColor: `${rarityColor}${alphaHex(0.7)}`, shadowColor: rarityColor },
              edgeStyle,
            ]}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

/** Одна искра: мерцает по фазе общего idle-таймера со своим сдвигом. */
function Glint({
  left,
  top,
  delay,
  color,
  idle,
}: {
  left: number;
  top: number;
  delay: number;
  color: string;
  idle: SharedValue<number>;
}) {
  const phase = (delay % 1000) / 1000;
  const st = useAnimatedStyle(() => {
    const t = (idle.value + phase) % 1;
    const o = Math.max(0, Math.sin(t * Math.PI));
    return { opacity: o, transform: [{ scale: 0.4 + 0.6 * o }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.glint, { left: `${left}%`, top: `${top}%`, backgroundColor: color, shadowColor: color }, st]}
    />
  );
}

/** -1..1 clamp (worklet-safe). */
function clamp01(v: number): number {
  'worklet';
  return Math.max(-1, Math.min(1, v));
}

/** Удалённость от центра 0..1 из двух осей. */
function useDerivedDist(nx: SharedValue<number>, ny: SharedValue<number>) {
  const d = useSharedValue(0);
  useAnimatedReaction(
    () => Math.min(1, Math.hypot(nx.value, ny.value)),
    (v) => {
      d.value = v;
    },
  );
  return d;
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 18,
    borderWidth: 0,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  fill: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  layer: { ...StyleSheet.absoluteFillObject, borderRadius: 18, overflow: 'hidden' },
  holoGrad: { ...StyleSheet.absoluteFillObject },
  glossWrap: { ...StyleSheet.absoluteFillObject },
  glossBar: { position: 'absolute', top: '-30%', bottom: '-30%', left: '-40%', width: '40%' },
  spec: {
    position: 'absolute',
    left: '50%',
    top: '50%',
    width: 180,
    height: 180,
    marginLeft: -90,
    marginTop: -90,
  },
  specInner: { flex: 1, borderRadius: 90 },
  glint: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    shadowOpacity: 0.8,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  edge: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
    borderWidth: 0,
    shadowOpacity: 0.9,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
  },
});
