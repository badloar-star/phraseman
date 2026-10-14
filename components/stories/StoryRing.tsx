// ═══════════════════════════════════════════════════════════════════════════
// StoryRing.tsx — красное кольцо сторис вокруг аватара-монеты в шапке Главной (D192).
//
// зачем (владелец 14.10: «иконка аватарки с кругом, как история в Instagram, когда есть хоть одно событие»; образец docs/design/v2-app/stories-avatar.html, `.story-ring`):
// слот аватара остаётся 48 × 48 — шапка не сдвигается. Кольцо 3 dp тёплым градиентом 45° (#FF2D55 → #FF3B30 → #FF6A1A → #FF9500), зазор 2 dp, внутри монета 38.
// Зазор прозрачный (в образце он цвета фона — на любой теме это то же самое), поэтому кольцу не нужен токен фона. «Дышит» scale 1 → 1,06 за 1,8 с на UI-треде и только пока
// экран в фокусе и приложение активно (perf_freeze_contract); reduceMotion — кольцо стоит. Монета тут только аватар ранга, не персонаж.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

// зачем: размеры вынесены в лёгкий story_ring_constants.ts (слот аватара на Главной не грузит это кольцо ради цифр); здесь прежний экспорт
import { STORY_RING_COIN, STORY_RING_SLOT, STORY_RING_STROKE } from './story_ring_constants';

export { STORY_RING_COIN, STORY_RING_SLOT, STORY_RING_STROKE };
// theme-exempt: красный «сторис»-градиент — фирменный цвет кольца, одинаковый во всех темах (образец .story-ring.has)
export const STORY_RING_COLORS = ['#FF2D55', '#FF3B30', '#FF6A1A', '#FF9500'] as const;
const STOPS = [0, 0.35, 0.7, 1] as const;
const BREATH_HALF_MS = 900;

export type StoryRingProps = Readonly<{
  children: React.ReactNode;
  testID?: string;
}>;

function StoryRing({ children, testID = 'story-ring' }: StoryRingProps) {
  const reduceMotion = useReducedMotion();
  const runtimeActive = useRuntimeActive(true);
  const breath = useSharedValue(0);

  // зачем: бесконечное «дыхание» живёт только на видимой Главной (экран в фокусе + приложение активно), иначе стоит
  useEffect(() => {
    if (reduceMotion || !runtimeActive) { cancelAnimation(breath); breath.value = 0; return; }
    const ease = Easing.inOut(Easing.quad);
    breath.value = withRepeat(withSequence(withTiming(1, { duration: BREATH_HALF_MS, easing: ease }), withTiming(0, { duration: BREATH_HALF_MS, easing: ease })), -1, false);
    return () => cancelAnimation(breath);
  }, [breath, reduceMotion, runtimeActive]);

  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * breath.value }] }));
  const r = (STORY_RING_SLOT - STORY_RING_STROKE) / 2;

  return (
    <Animated.View testID={testID} style={[s.slot, breathStyle]}>
      <Svg width={STORY_RING_SLOT} height={STORY_RING_SLOT} style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          {/* 45°: от нижнего левого угла к верхнему правому, как linear-gradient(45deg) образца */}
          <LinearGradient id="storyRingGradient" x1="0" y1="1" x2="1" y2="0">
            {STORY_RING_COLORS.map((color, i) => <Stop key={color} offset={STOPS[i]} stopColor={color} />)}
          </LinearGradient>
        </Defs>
        <Circle cx={STORY_RING_SLOT / 2} cy={STORY_RING_SLOT / 2} r={r} fill="none" stroke="url(#storyRingGradient)" strokeWidth={STORY_RING_STROKE} />
      </Svg>
      <View style={s.coin}>{children}</View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  slot: { width: STORY_RING_SLOT, height: STORY_RING_SLOT, alignItems: 'center', justifyContent: 'center' },
  coin: { width: STORY_RING_COIN, height: STORY_RING_COIN, alignItems: 'center', justifyContent: 'center' },
});

export default memo(StoryRing);
