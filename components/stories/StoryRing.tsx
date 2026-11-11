// ═══════════════════════════════════════════════════════════════════════════
// StoryRing.tsx — красное кольцо сторис вокруг аватара-монеты в шапке Главной (D192).
//
// зачем (владелец 14.10: «иконка аватарки с кругом, как история в Instagram, когда есть хоть одно событие»; образец docs/design/v2-app/stories-avatar.html, `.story-ring`):
// слот аватара остаётся 48 × 48 — шапка не сдвигается. Кольцо 3 dp тёплым градиентом 45° (#FF2D55 → #FF3B30 → #FF6A1A → #FF9500), зазор 2 dp, внутри монета 38.
// Зазор прозрачный (в образце он цвета фона — на любой теме это то же самое), поэтому кольцу не нужен токен фона. «Дышит» scale 1 → 1,06 за 1,8 с на UI-треде и только пока
// экран в фокусе и приложение активно (perf_freeze_contract); reduceMotion — кольцо стоит. Монета тут только аватар ранга, не персонаж.
// Владелец 11.11: «когда есть история, пусть аватарка пульсирует всегда, пока есть непросмотренная история» — цикл вечный (образец: srPulse 1.8s infinite).
// Кольцо смонтировано, только пока непросмотренное есть (решает StoryAvatarSlot), поэтому «всё просмотрено» = размонтирование = конец пульсации.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import Animated, { Easing, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useRuntimeActive } from '../../hooks/use_runtime_active';

// зачем: размеры вынесены в лёгкий story_ring_constants.ts (слот аватара на Главной не грузит это кольцо ради цифр); здесь прежний экспорт
import { STORY_RING_COIN, STORY_RING_SLOT, STORY_RING_STROKE } from './story_ring_constants';

export { STORY_RING_COIN, STORY_RING_SLOT, STORY_RING_STROKE };
// зачем (координатор 17.10): пометка стоит на строке с цветами — храповик theme_hardcoded_colors читает её только на той же строке
export const STORY_RING_COLORS = ['#FF2D55', '#FF3B30', '#FF6A1A', '#FF9500'] as const; // theme-exempt: красный «сторис»-градиент — фирменный цвет кольца, одинаковый во всех темах (образец .story-ring.has)
const STOPS = [0, 0.35, 0.7, 1] as const;
const BREATH_HALF_MS = 900;

// «Волны» (владелец 11.11 выбрал на макете способ 1): от кольца расходятся и тают два тонких круга — для тех, кто два дня заходил и не открыл историю.
// Числа образца: круг 2,6 с, cubic-bezier(.2,.7,.3,1), масштаб 1 → 1,85, прозрачность 0,75 → 0, второй круг позже на 1,3 с.
export const STORY_WAVE_MS = 2600;
export const STORY_WAVE_DELAYS_MS = [0, 1300] as const;
const WAVE_SCALE = 0.85;
const WAVE_OPACITY = 0.75;

const Wave = memo(function Wave({ delayMs, active }: Readonly<{ delayMs: number; active: boolean }>) {
  const wave = useSharedValue(0);
  // зачем: как и «дыхание» — круг идёт только на видимой Главной; вне фокуса и в фоне стоит невидимым (opacity 0 при wave = 1 недостижима, поэтому прячем явно)
  useEffect(() => {
    if (!active) { cancelAnimation(wave); wave.value = 0; return; }
    wave.value = withDelay(delayMs, withRepeat(withTiming(1, { duration: STORY_WAVE_MS, easing: Easing.bezier(0.2, 0.7, 0.3, 1) }), -1, false));
    return () => cancelAnimation(wave);
  }, [active, delayMs, wave]);
  const style = useAnimatedStyle(() => ({ opacity: wave.value === 0 ? 0 : WAVE_OPACITY * (1 - wave.value), transform: [{ scale: 1 + WAVE_SCALE * wave.value }] }));
  const r = (STORY_RING_SLOT - STORY_RING_STROKE) / 2;
  return (
    <Animated.View testID="story-ring-wave" style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      <Svg width={STORY_RING_SLOT} height={STORY_RING_SLOT}>
        <Defs>
          <LinearGradient id="storyRingWaveGradient" x1="0" y1="1" x2="1" y2="0">
            {STORY_RING_COLORS.map((color, i) => <Stop key={color} offset={STOPS[i]} stopColor={color} />)}
          </LinearGradient>
        </Defs>
        <Circle cx={STORY_RING_SLOT / 2} cy={STORY_RING_SLOT / 2} r={r} fill="none" stroke="url(#storyRingWaveGradient)" strokeWidth={STORY_RING_STROKE} />
      </Svg>
    </Animated.View>
  );
});

export type StoryRingProps = Readonly<{
  children: React.ReactNode;
  testID?: string;
  /** Усиленный сигнал: от кольца расходятся волны (истории игнорируют два дня захода). */
  waves?: boolean;
}>;

function StoryRing({ children, testID = 'story-ring', waves = false }: StoryRingProps) {
  const reduceMotion = useReducedMotion();
  const runtimeActive = useRuntimeActive(true);
  const breath = useSharedValue(0);

  // зачем: бесконечное «дыхание» живёт только на видимой Главной (экран в фокусе + приложение активно), иначе стоит
  useEffect(() => {
    if (reduceMotion || !runtimeActive) { cancelAnimation(breath); breath.value = 0; return; }
    const ease = Easing.inOut(Easing.quad);
    // зачем (владелец 11.11): прежние 4 повтора (15.10, после R08) гасли через ~7 с — человек, открывший Главную позже, видел мёртвое кольцо. Теперь цикл вечный;
    // кадры в фоне не ест: гейт фокуса и активности выше останавливает его, возврат на экран запускает заново. Причина записана в motion_allowlist_contract.
    breath.value = withRepeat(withSequence(withTiming(1, { duration: BREATH_HALF_MS, easing: ease }), withTiming(0, { duration: BREATH_HALF_MS, easing: ease })), -1, false);
    return () => cancelAnimation(breath);
  }, [breath, reduceMotion, runtimeActive]);

  const breathStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.06 * breath.value }] }));
  const r = (STORY_RING_SLOT - STORY_RING_STROKE) / 2;

  // зачем: волны — соседи «дышащего» слоя, а не его дети: иначе они раскачивались бы вместе с дыханием. Слот прежние 48 × 48, волны только transform и прозрачность — вёрстка не сдвигается.
  // При «уменьшить движение» волн нет совсем: неподвижный круг сигналом не является.
  return (
    <View testID={testID} style={s.slot}>
    {waves && !reduceMotion ? STORY_WAVE_DELAYS_MS.map((delayMs) => <Wave key={delayMs} delayMs={delayMs} active={runtimeActive} />) : null}
    <Animated.View style={[s.slot, breathStyle]}>
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
    </View>
  );
}

const s = StyleSheet.create({
  slot: { width: STORY_RING_SLOT, height: STORY_RING_SLOT, alignItems: 'center', justifyContent: 'center' },
  coin: { width: STORY_RING_COIN, height: STORY_RING_COIN, alignItems: 'center', justifyContent: 'center' },
});

export default memo(StoryRing);
