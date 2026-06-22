import React, { memo, useEffect, useState } from 'react';
import { AccessibilityInfo, LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Reanimated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from './SafeLinearGradient';
import { fxKindForProfileCard, type ProfileCardFxKind } from '../app/profile_card_system';

/**
 * Живые Reanimated-анимации для карточки профиля. РАНЬШЕ превью «Моя карточка»
 * (avatar_select) было статичным LinearGradient — выбранный motion не проигрывался
 * вообще. Этот компонент кладётся ПОСЛЕДНИМ ребёнком внутрь карточки с
 * overflow:'hidden' (через StyleSheet.absoluteFill) и рисует эффект текущего уровня
 * ПОВЕРХ контента. pointerEvents='none' у всех слоёв — тапы по карточке/кнопкам не
 * перехватываются. Полупрозрачные полосы/ореолы не мешают читать белый текст сверху.
 *
 * Все анимации на UI-потоке (useSharedValue + withRepeat), по образцу ShineOverlay /
 * SkeletonShimmer. Уважает системную reduce-motion (AccessibilityInfo) — при ней
 * вообще ничего не анимируется; проп `enabled=false` гасит дополнительно.
 *
 * Маппинг уровень → motion (см. profile_card_system):
 *   1 polished  → 'sheen'      мягкий проблеск канта
 *   2 signature → 'breath'     дыхание акцент-ореола
 *   3 motion    → 'runner'     бегущий луч по периметру + парящие искры
 *   4 prestige  → 'holo'       голографический перелив + параллакс-блик
 *   5 elite     → 'elite'      призма-скан + аура-частицы
 */

/** Реэкспорт маппинга уровня→эффект (живёт в profile_card_system как источник истины). */
export { fxKindForProfileCard };
export type { ProfileCardFxKind };

type Props = {
  kind: ProfileCardFxKind;
  /** Радиус карточки — чтобы эффекты не вылезали за скругление. */
  radius: number;
  /** Главный акцентный цвет темы. */
  accent: string;
  /** Вторичный цвет темы (для перелива/частиц). */
  secondary: string;
  /** Полупрозрачная заливка акцента (ореол). */
  accentSoft: string;
  /** Включить анимацию. false → ничего не рисуем (reduce-motion / экономия). */
  enabled?: boolean;
};

/**
 * Добавляет альфу к цвету для градиентов перелива. Работает только для 6-значного hex
 * (#RRGGBB → #RRGGBBAA). Если тема вдруг даст rgba()/3-hex — возвращаем цвет как есть
 * (без альфы), чтобы НЕ собрать невалидную строку и не сломать градиент молча.
 */
const HEX6_RE = /^#[0-9a-fA-F]{6}$/;
function withAlpha(color: string, alphaHex: string): string {
  return HEX6_RE.test(color) ? `${color}${alphaHex}` : color;
}

function SheenBand({ radius }: { radius: number }) {
  const sweep = useSharedValue(0);
  const [w, setW] = useState(0);

  useEffect(() => {
    sweep.value = 0;
    sweep.value = withRepeat(
      withTiming(1, { duration: 3400, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );
    return () => cancelAnimation(sweep);
  }, [sweep, w]);

  const band = Math.max(56, w * 0.4);
  const style = useAnimatedStyle(() => {
    const pass = 0.6;
    const t = Math.min(1, sweep.value / pass);
    const x = interpolate(t, [0, 1], [-band, w + band]);
    return { transform: [{ translateX: x }, { rotateZ: '16deg' }] };
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
            colors={['transparent', 'rgba(255,255,255,0.22)', 'rgba(255,255,255,0.32)', 'rgba(255,255,255,0.22)', 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
    </View>
  );
}

function BreathGlow({ accentSoft, radius }: { accentSoft: string; radius: number }) {
  const pulse = useSharedValue(0);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1, { duration: 1800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(pulse.value, [0, 1], [0.32, 0.66]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [0.96, 1.06]) }],
  }));

  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}>
      <Reanimated.View
        style={[
          {
            position: 'absolute',
            top: -42,
            right: -48,
            width: 150,
            height: 150,
            borderRadius: 75,
            backgroundColor: accentSoft,
          },
          style,
        ]}
      />
    </View>
  );
}

function RunnerEdge({ accent, secondary, radius }: { accent: string; secondary: string; radius: number }) {
  const run = useSharedValue(0);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    run.value = 0;
    run.value = withRepeat(withTiming(1, { duration: 2600, easing: Easing.linear }), -1, false);
    return () => cancelAnimation(run);
  }, [run, size.w, size.h]);

  const { w, h } = size;
  // Луч едет по периметру: top → right → bottom → left, длина сегмента = доля стороны.
  const dotStyle = useAnimatedStyle(() => {
    'worklet';
    const p = run.value; // 0..1 вдоль периметра
    const segTop = 0.25, segRight = 0.5, segBottom = 0.75;
    let x = 0;
    let y = 0;
    if (p < segTop) {
      x = interpolate(p, [0, segTop], [0, w]);
      y = 0;
    } else if (p < segRight) {
      x = w;
      y = interpolate(p, [segTop, segRight], [0, h]);
    } else if (p < segBottom) {
      x = interpolate(p, [segRight, segBottom], [w, 0]);
      y = h;
    } else {
      x = 0;
      y = interpolate(p, [segBottom, 1], [h, 0]);
    }
    return { transform: [{ translateX: x - 6 }, { translateY: y - 6 }] };
  });

  const onLayout = (e: LayoutChangeEvent) => {
    const nw = Math.round(e.nativeEvent.layout.width);
    const nh = Math.round(e.nativeEvent.layout.height);
    // Пишем стейт только при реальном изменении (как SkeletonShimmer) — иначе каждый
    // reflow родителя даёт лишний ре-рендер и пересоздание worklet-замыкания.
    if (nw !== size.w || nh !== size.h) setSize({ w: nw, h: nh });
  };

  return (
    <View
      pointerEvents="none"
      onLayout={onLayout}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      {/* Рамку карточки рисует сам LinearGradient — здесь свою НЕ дублируем (иначе
          двойной кант). Луч читается на тёмном фоне за счёт shadow самой точки. */}
      {w > 0 && h > 0 && (
        <Reanimated.View style={[{ position: 'absolute', width: 12, height: 12 }, dotStyle]}>
          <View
            style={{
              width: 12,
              height: 12,
              borderRadius: 6,
              backgroundColor: secondary,
              shadowColor: accent,
              shadowOpacity: 0.95,
              shadowRadius: 8,
              shadowOffset: { width: 0, height: 0 },
              elevation: 6,
            }}
          />
        </Reanimated.View>
      )}
      <Sparks accent={accent} secondary={secondary} count={3} />
    </View>
  );
}

function Sparks({ accent, secondary, count }: { accent: string; secondary: string; count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Spark key={i} accent={accent} secondary={secondary} index={i} total={count} />
      ))}
    </>
  );
}

function Spark({ accent, secondary, index, total }: { accent: string; secondary: string; index: number; total: number }) {
  const t = useSharedValue(0);
  const dur = 2400 + index * 260;
  useEffect(() => {
    t.value = withDelay(index * 700, withRepeat(withTiming(1, { duration: dur, easing: Easing.out(Easing.cubic) }), -1, false));
    return () => cancelAnimation(t);
  }, [t, dur, index]);

  // Искры парят в ВЕРХНЕЙ зоне карточки (рядом с аватаром/именем), а не снизу — там
  // внизу лежит блок статистики и частицы прятались бы за плашками (см. аудит).
  const style = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.2, 0.85, 1], [0, 0.95, 0.6, 0]),
    transform: [
      { translateY: interpolate(t.value, [0, 1], [6, -30]) },
      { scale: interpolate(t.value, [0, 1], [0.6, 1.1]) },
    ],
  }));

  const left = `${14 + (index / Math.max(1, total - 1)) * 64}%`;
  const sz = index % 2 === 0 ? 4 : 3;
  return (
    <Reanimated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          top: 36,
          left: left as unknown as number,
          width: sz,
          height: sz,
          borderRadius: sz,
          backgroundColor: index % 2 === 0 ? secondary : accent,
          shadowColor: accent,
          shadowOpacity: 0.9,
          shadowRadius: 6,
          shadowOffset: { width: 0, height: 0 },
        },
        style,
      ]}
    />
  );
}

function HoloSweep({ accent, secondary, accentSoft, radius }: { accent: string; secondary: string; accentSoft: string; radius: number }) {
  const drift = useSharedValue(0);
  const sweep = useSharedValue(0);
  const [w, setW] = useState(0);

  useEffect(() => {
    drift.value = withRepeat(withTiming(1, { duration: 5200, easing: Easing.inOut(Easing.ease) }), -1, true);
    sweep.value = withRepeat(withTiming(1, { duration: 3600, easing: Easing.inOut(Easing.ease) }), -1, false);
    return () => {
      cancelAnimation(drift);
      cancelAnimation(sweep);
    };
  }, [drift, sweep, w]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 1], [0.34, 0.6]),
    transform: [
      { translateX: interpolate(drift.value, [0, 1], [-14, 14]) },
      { translateY: interpolate(drift.value, [0, 1], [-10, 10]) },
    ],
  }));

  const band = Math.max(70, w * 0.4);
  const sweepStyle = useAnimatedStyle(() => {
    const pass = 0.7;
    const tt = Math.min(1, sweep.value / pass);
    return { transform: [{ translateX: interpolate(tt, [0, 1], [-band, w + band]) }, { rotateZ: '14deg' }] };
  });

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Reanimated.View
        style={[
          { position: 'absolute', top: '-30%', left: '-20%', width: '90%', height: '160%', borderRadius: 200, backgroundColor: accentSoft },
          haloStyle,
        ]}
      />
      {w > 0 && (
        <Reanimated.View style={[{ width: band, height: '200%', marginTop: '-50%' }, sweepStyle]}>
          <LinearGradient
            colors={['transparent', withAlpha(secondary, '44'), withAlpha(accent, '55'), withAlpha(secondary, '44'), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
    </View>
  );
}

function EliteFx({ accent, secondary, accentSoft, radius }: { accent: string; secondary: string; accentSoft: string; radius: number }) {
  const prism = useSharedValue(0);
  const drift = useSharedValue(0);
  const [w, setW] = useState(0);

  useEffect(() => {
    prism.value = withRepeat(withTiming(1, { duration: 3200, easing: Easing.inOut(Easing.ease) }), -1, false);
    drift.value = withRepeat(withTiming(1, { duration: 4600, easing: Easing.inOut(Easing.ease) }), -1, true);
    return () => {
      cancelAnimation(prism);
      cancelAnimation(drift);
    };
  }, [prism, drift, w]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: interpolate(drift.value, [0, 1], [0.4, 0.72]),
    transform: [{ scale: interpolate(drift.value, [0, 1], [0.95, 1.08]) }],
  }));

  const band = Math.max(74, w * 0.34);
  const prismStyle = useAnimatedStyle(() => {
    const pass = 0.72;
    const tt = Math.min(1, prism.value / pass);
    return { transform: [{ translateX: interpolate(tt, [0, 1], [-band, w + band]) }, { rotateZ: '16deg' }] };
  });

  return (
    <View
      pointerEvents="none"
      onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
      style={[StyleSheet.absoluteFill, { borderRadius: radius, overflow: 'hidden' }]}
    >
      <Reanimated.View
        style={[
          { position: 'absolute', top: -44, left: '18%', width: 150, height: 150, borderRadius: 75, backgroundColor: accentSoft },
          haloStyle,
        ]}
      />
      {w > 0 && (
        <Reanimated.View style={[{ width: band, height: '200%', marginTop: '-50%' }, prismStyle]}>
          <LinearGradient
            colors={['transparent', withAlpha(secondary, '66'), withAlpha(accent, '77'), '#FFFFFF55', withAlpha(accent, '77'), withAlpha(secondary, '66'), 'transparent']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Reanimated.View>
      )}
      <Sparks accent={accent} secondary={secondary} count={6} />
    </View>
  );
}

/**
 * Системная настройка «Уменьшение движения» (iOS Accessibility → Motion). Если она
 * включена — мы НЕ запускаем бесконечные лупы карточки (укачивание/доступность).
 * Паттерн заимствован из AiTypingBubble.
 */
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

function ProfileCardMotionFxBase({ kind, radius, accent, secondary, accentSoft, enabled = true }: Props) {
  const reduceMotion = useReduceMotion();
  // Хуки выше любого return — правила хуков. Гасим эффект если выключено пропом или
  // системной настройкой reduce-motion.
  if (!enabled || reduceMotion || kind === 'none') return null;
  if (kind === 'sheen') return <SheenBand radius={radius} />;
  if (kind === 'breath') return <BreathGlow accentSoft={accentSoft} radius={radius} />;
  if (kind === 'runner') return <RunnerEdge accent={accent} secondary={secondary} radius={radius} />;
  if (kind === 'holo') return <HoloSweep accent={accent} secondary={secondary} accentSoft={accentSoft} radius={radius} />;
  if (kind === 'elite') return <EliteFx accent={accent} secondary={secondary} accentSoft={accentSoft} radius={radius} />;
  return null;
}

export default memo(ProfileCardMotionFxBase);
