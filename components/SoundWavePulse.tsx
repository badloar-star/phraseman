// ════════════════════════════════════════════════════════════════════════════
// SoundWavePulse.tsx — анимация, повторяющая форму звуковой волны события.
//
// зачем: владелец попросил, чтобы движение в приложении соответствовало именно
// звуку, который в этот момент играет. Тайминги берутся не на глаз, а из
// `SOUND_MOTION` — таблицы, измеренной разбором PCM каждого WAV:
//   • масштаб идёт к пику ровно на `attackMs` — там, где звук громче всего;
//   • вспышка срабатывает на каждом `hits[]` — на реальных ударах волны;
//   • движение гаснет на `audibleMs` — реальной длительности звучания,
//     а не на длине файла (у всех WAV длинный хвост тишины).
//
// Компонент — обёртка: рисует детей и накладывает на них пульс и вспышку.
// Не добавляет своих эмодзи и иконок; анимирует то, что уже есть на экране.
//
// Запуск — императивный, через ref, чтобы вызывать из того же места, где
// компонент дёргает soundDirector.request(), и не гонять ре-рендеры:
//
//   const pulse = useRef<SoundWavePulseHandle>(null);
//   soundDirector.request('pm.streak.saved');
//   pulse.current?.play('pm.streak.saved');
// ════════════════════════════════════════════════════════════════════════════
import React, { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { SOUND_MOTION } from '../modules/audio/sound_motion';
import type { SoundEventId } from '../modules/audio/sound_events';

export type SoundWavePulseHandle = {
  /** Проигрывает движение по профилю события. Молча выходит, если звука нет. */
  play: (id: SoundEventId) => void;
};

type Props = {
  children: React.ReactNode;
  /**
   * Насколько сильно элемент раздувается на пике звука.
   * 0.06 — деликатно (тосты), 0.18 — заметно (награды).
   */
  intensity?: number;
  /** Цвет вспышки. По умолчанию берётся по тембру: звонкий — золото, глухой — зелёный. */
  flashColor?: string;
  /** Выключить вспышку, оставив только пульс — для мелких элементов. */
  flash?: boolean;
  style?: StyleProp<ViewStyle>;
};

const GOLD = '#FFC800';
const GREEN = '#47C870';

function SoundWavePulseImpl(
  { children, intensity = 0.12, flashColor, flash = true, style }: Props,
  ref: React.Ref<SoundWavePulseHandle>,
) {
  const pulse = useSharedValue(0);
  const glow = useSharedValue(0);
  const tone = useSharedValue(GREEN);

  useEffect(() => () => {
    cancelAnimation(pulse);
    cancelAnimation(glow);
  }, [pulse, glow]);

  const play = useCallback((id: SoundEventId) => {
    const motion = SOUND_MOTION[id];
    // Событие без звукового файла (арена, vip_finale) не должно дёргать экран:
    // молчит звук — молчит и движение.
    if (!motion) return;

    const audible = motion.audibleMs;
    const attack = Math.max(16, motion.attackMs || Math.round(audible * 0.25));
    const release = Math.max(90, audible - attack);

    tone.value = flashColor ?? (motion.bright > 0.55 ? GOLD : GREEN);

    cancelAnimation(pulse);
    pulse.value = 0;
    pulse.value = withSequence(
      withTiming(1, { duration: attack, easing: Easing.out(Easing.cubic) }),
      withTiming(0, { duration: release, easing: Easing.out(Easing.quad) }),
    );

    if (!flash) return;
    cancelAnimation(glow);
    glow.value = 0;
    // Вспышки строго на удары волны. Если ударов не нашлось (ровный короткий звук) —
    // одна вспышка на атаке, чтобы движение всё равно совпало с началом.
    const hits = motion.hits.length ? motion.hits : [attack];
    for (const t of hits) {
      glow.value = withDelay(
        t,
        withSequence(
          withTiming(1, { duration: 55, easing: Easing.out(Easing.cubic) }),
          withTiming(0, { duration: 190, easing: Easing.out(Easing.quad) }),
        ),
      );
    }
  }, [pulse, glow, tone, flashColor, flash]);

  useImperativeHandle(ref, () => ({ play }), [play]);

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + pulse.value * intensity }],
  }));
  const glowStyle = useAnimatedStyle(() => ({
    opacity: glow.value * 0.55,
    backgroundColor: tone.value,
  }));

  return (
    <View style={style}>
      <Animated.View style={contentStyle}>{children}</Animated.View>
      {flash ? (
        <Animated.View style={[StyleSheet.absoluteFill, s.glow, glowStyle]} pointerEvents="none" />
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  // Свечение поверх содержимого, скруглённое — чтобы ложилось на карточки и
  // круглые элементы одинаково, без квадратной рамки на Android.
  glow: { borderRadius: 999 },
});

export const SoundWavePulse = memo(forwardRef<SoundWavePulseHandle, Props>(SoundWavePulseImpl));
export default SoundWavePulse;
