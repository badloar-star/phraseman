import React, { memo, useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import { fxKindForProfileCard, type ProfileCardFxKind } from '../app/profile_card_system';
import { useIsScreenFocused } from '../hooks/use_is_screen_focused';

export { fxKindForProfileCard };
export type { ProfileCardFxKind };

type Props = {
  kind: ProfileCardFxKind;
  radius: number;
  accent: string;
  secondary: string;
  accentSoft: string;
  /** Цвет свечения снизу (обязателен для glow-линейки; fallback — accent). */
  glowBottom?: string;
  /** Цвет ореола сверху (fallback — accentSoft-тон). */
  glowTop?: string;
  enabled?: boolean;
};

/**
 * Общий «водитель» лупов эффектов: 0→1 по кругу, живёт только на видимом экране
 * и активном приложении (freezeOnBlur:false держит ушедшие экраны живыми, без
 * гарда эффект грел бы телефон в фоне — паттерн components/AvatarAura.tsx).
 */
function useFxLoop(duration: number, linear = false): SharedValue<number> {
  const progress = useSharedValue(0);
  const isFocused = useIsScreenFocused();

  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(progress);
      progress.value = 0;
      progress.value = withRepeat(
        withTiming(1, { duration, easing: linear ? Easing.linear : Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
    };
    const stop = () => {
      cancelAnimation(progress);
      progress.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(progress);
    };
  }, [progress, duration, linear, isFocused]);

  return progress;
}

type SheenColors = readonly [string, string, ...string[]];

// Тонкий, едва заметный проход света: узкая полоса, мягкие края, низкая яркость —
// «дорогой» перелив вместо жирной белой полосы (фидбек владельца 2026-07-05).
const DEFAULT_SHEEN_COLORS: SheenColors = [
  'transparent', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.11)', 'rgba(255,255,255,0.05)', 'transparent',
];

function SheenBand({ radius, colors }: { radius: number; colors?: SheenColors }) {
  const sweep = useSharedValue(0);
  const [w, setW] = useState(0);
  const isFocused = useIsScreenFocused();

  // Луп живёт только на видимом экране и активном приложении: freezeOnBlur:false
  // держит ушедшие экраны живыми, без гарда блик грел бы телефон в фоне
  // (паттерн components/AvatarAura.tsx).
  useEffect(() => {
    if (!isFocused) {
      cancelAnimation(sweep);
      sweep.value = 0;
      return;
    }

    const start = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(1, { duration: 5600, easing: Easing.inOut(Easing.ease) }),
        -1,
        false,
      );
    };
    const stop = () => {
      cancelAnimation(sweep);
      sweep.value = 0;
    };

    if (AppState.currentState === 'active') start();
    const appSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') start();
      else stop();
    });
    return () => {
      appSub.remove();
      cancelAnimation(sweep);
    };
  }, [sweep, w, isFocused]);

  // Узкая полоса (≤22% ширины) и длинная пауза между проходами: свет «скользнул и ушёл».
  const band = Math.min(110, Math.max(48, w * 0.22));
  const style = useAnimatedStyle(() => {
    const pass = 0.42;
    const t = Math.min(1, sweep.value / pass);
    const x = interpolate(t, [0, 1], [-band, w + band]);
    return { transform: [{ translateX: x }, { rotateZ: '16deg' }] } as any;
  });

  return (
    <View
      pointerEvents="none"
      onLayout={(e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      {w > 0 && (
        <Reanimated.View style={[{ width: band, height: '200%', marginTop: '-50%' }, style]}>
          <LinearGradient
            colors={colors ?? DEFAULT_SHEEN_COLORS}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
    </View>
  );
}

/** Свечение от НИЖНЕЙ кромки карточки (главный «дорогой» приём с референсов): яркий
 * цвет у низа → растворяется к центру, мягко «дышит». Никаких рамок — только свет. */
function BottomGlow({ radius, bottom, accent }: { radius: number; bottom: string; accent: string }) {
  const progress = useFxLoop(5000);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.72, 1, 0.72]),
  }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, right: 0, bottom: 0, height: '62%', borderRadius: radius, overflow: 'hidden' },
        style,
      ]}
    >
      <LinearGradient
        colors={['transparent', `${bottom}3D`, `${bottom}8A`]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {/* тонкая светящаяся линия у самого низа */}
      <View style={{ position: 'absolute', left: '8%', right: '8%', bottom: 0, height: 2, borderRadius: 2, backgroundColor: accent, opacity: 0.85 }} />
    </Reanimated.View>
  );
}

/** Мягкий ореол у ВЕРХНЕЙ кромки (за аватаром) — карта подсвечена с двух сторон. */
function TopGlow({ radius, top }: { radius: number; top: string }) {
  const progress = useFxLoop(6000);
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.55, 0.82, 0.55]),
  }));
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        { position: 'absolute', left: 0, right: 0, top: 0, height: '46%', borderRadius: radius, overflow: 'hidden' },
        style,
      ]}
    >
      <LinearGradient
        colors={[`${top}6E`, `${top}1F`, 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
    </Reanimated.View>
  );
}

/** Падающая звезда: короткий пролёт по диагонали, потом длинная пауза (≈1 раз в 7 секунд). */
function CometStreak({ radius, tint }: { radius: number; tint: string }) {
  const progress = useFxLoop(7000, true);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;

  const style = useAnimatedStyle(() => {
    // Полёт занимает первые 22% лупа, остальное — пауза (звезда невидима).
    const t = Math.min(1, progress.value / 0.22);
    const flying = progress.value < 0.22;
    return {
      opacity: flying ? interpolate(t, [0, 0.12, 0.85, 1], [0, 1, 1, 0]) : 0,
      transform: [
        { translateX: interpolate(t, [0, 1], [-0.3 * w, w * 1.05]) },
        { translateY: interpolate(t, [0, 1], [h * 0.16, h * 0.52]) },
        { rotateZ: '14deg' },
      ],
    };
  });

  return (
    <View
      pointerEvents="none"
      onLayout={(e: LayoutChangeEvent) => setSize({
        w: Math.round(e.nativeEvent.layout.width),
        h: Math.round(e.nativeEvent.layout.height),
      })}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      {w > 0 && (
        <Reanimated.View style={[{ width: 86, height: 2, flexDirection: 'row', alignItems: 'center' }, style]}>
          <LinearGradient
            colors={['transparent', tint]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ flex: 1, height: 2, borderRadius: 1 }}
          />
          <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF', marginLeft: -2 }} />
        </Reanimated.View>
      )}
    </View>
  );
}

type StarSpec = { left: `${number}%`; top: `${number}%`; size: number };

// Две группы звёзд мерцают в противофазе — небо «живёт», а не мигает целиком.
const STARS_A: StarSpec[] = [
  { left: '12%', top: '20%', size: 2 },
  { left: '46%', top: '12%', size: 1.6 },
  { left: '78%', top: '30%', size: 2.2 },
  { left: '24%', top: '64%', size: 1.6 },
  { left: '88%', top: '72%', size: 2 },
];
const STARS_B: StarSpec[] = [
  { left: '32%', top: '38%', size: 1.6 },
  { left: '62%', top: '22%', size: 2 },
  { left: '14%', top: '82%', size: 2 },
  { left: '70%', top: '58%', size: 1.6 },
  { left: '52%', top: '84%', size: 2.2 },
];

function StarField({ stars, style }: { stars: StarSpec[]; style: { opacity: number } | object }) {
  return (
    <Reanimated.View pointerEvents="none" style={[StyleSheet.absoluteFill, style]}>
      {stars.map((s, idx) => (
        <View
          key={idx}
          style={{
            position: 'absolute',
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            borderRadius: s.size / 2,
            backgroundColor: '#FFFFFF',
          }}
        />
      ))}
    </Reanimated.View>
  );
}

/** Мерцающие звёзды: две группы точек в противофазе. */
function TwinkleStars({ radius }: { radius: number }) {
  const progress = useFxLoop(2800);
  const styleA = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.16, 0.7, 0.16]),
  }));
  const styleB = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.5, 1], [0.6, 0.18, 0.6]),
  }));
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <StarField stars={STARS_A} style={styleA} />
      <StarField stars={STARS_B} style={styleB} />
    </View>
  );
}

// Платиновый голографический проход вершины — холодный перелив бело-голубо-розовый,
// той же деликатности, что и обычный шиин (переливается, а не светит).
const PLATINUM_SHEEN_COLORS: SheenColors = [
  'transparent',
  'rgba(191,227,255,0.12)',
  'rgba(255,217,228,0.12)',
  'rgba(214,224,255,0.12)',
  'transparent',
];

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(v));
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
  return reduce;
}

function ProfileCardMotionFxBase({ kind, radius, accent, secondary, accentSoft, glowBottom, glowTop, enabled = true }: Props) {
  const reduceMotion = useReduceMotion();
  if (!enabled || kind === 'none') return null;
  const bottom = glowBottom ?? accent;
  const top = glowTop ?? accentSoft;

  // Свечение снизу+сверху — статичная основа ВСЕХ уровней (видна и при reduce-motion).
  const glow = (
    <>
      <BottomGlow radius={radius} bottom={bottom} accent={accent} />
      <TopGlow radius={radius} top={top} />
    </>
  );

  // При reduce-motion оставляем только статичное свечение, без блика/звёзд/кометы.
  if (reduceMotion) return glow;

  switch (kind) {
    case 'steel':
      // Сталь: свечение + редкий деликатный блик.
      return (<>{glow}<SheenBand radius={radius} /></>);
    case 'teal':
      // Teal: свечение (дышит ярче) + блик.
      return (<>{glow}<SheenBand radius={radius} /></>);
    case 'azure':
      // Azure: свечение + падающая звезда + блик.
      return (
        <>
          {glow}
          <CometStreak radius={radius} tint={secondary} />
          <SheenBand radius={radius} />
        </>
      );
    case 'crimson':
      // Crimson: свечение + мерцающие звёзды + блик.
      return (
        <>
          {glow}
          <TwinkleStars radius={radius} />
          <SheenBand radius={radius} />
        </>
      );
    case 'platinum':
      // Platinum (вершина): свечение + звёзды + голографический перелив.
      return (
        <>
          {glow}
          <TwinkleStars radius={radius} />
          <SheenBand radius={radius} colors={PLATINUM_SHEEN_COLORS} />
        </>
      );
    default:
      return glow;
  }
}

export default memo(ProfileCardMotionFxBase);
