import Ionicons from '@expo/vector-icons/Ionicons';
import React, { memo, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { getSessionAttemptsCopy } from '../../app/session_attempts/session_attempts_copy';
import { SESSION_ATTEMPTS_MAX } from '../../app/session_attempts/session_attempts_domain';
import { SESSION_ATTEMPTS_MOTION } from '../../constants/motionHybrid';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { soundDirector } from '../../modules/audio/sound_director';
import EnergyAttemptsHud, { type SessionAttemptsEnergyModel } from '../energy/EnergyAttemptsHud';
import { useTheme } from '../ThemeContext';

export type { SessionAttemptsEnergyModel };

type Props = {
  remaining: number;
  /** Режим Б: без него HUD рисует сердечки, как раньше (экраны-заглушки загрузки его не передают). */
  attempts?: SessionAttemptsEnergyModel;
  /** Выйти из остановленного занятия (режим Б). По умолчанию — назад по стеку: состояние занятия уже сохранено. */
  onStoppedExit?: () => void;
  locale: string;
  total?: number;
  testID?: string;
  /**
   * зачем (learning-v2.html, `.pill.hearts`): Learning V2 показывает попытки нейтральной
   * пилюлей стекла — светлые сердца на плите, потерянные гаснут до 22%. Остальные экраны
   * (карточки, слова) передают ничего и остаются на прежних красных сердцах.
   */
  glassPill?: {
    readonly fill: string;
    readonly empty: string;
    readonly plate: string;
    /** Цвет сердца в одиночной таблетке «♥ N» (макет learning-v2-tasks-review.html: красное сердце); без него — `fill`. */
    readonly heart?: string;
    /** Тень плиты таблетки (стиль «Тень»). */
    readonly shadow?: ViewStyle['boxShadow'];
  };
};

type HeartSlotProps = {
  index: number;
  filled: boolean;
  activeColor: string;
  emptyColor: string;
};

function HeartSlot({ index, filled, activeColor, emptyColor }: HeartSlotProps) {
  const reduceMotion = useReduceMotion();
  const previousFilled = useRef(filled);
  const opacity = useSharedValue(filled ? 1 : 0);
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const rotation = useSharedValue(0);
  const haloOpacity = useSharedValue(0);
  // зачем <number> (2026-08-30): as const в MOTION давал литеральный тип
  // 0.55, и анимация к haloEndScale не типизировалась.
  const haloScale = useSharedValue<number>(SESSION_ATTEMPTS_MOTION.haloStartScale);

  useEffect(() => {
    cancelAnimation(opacity);
    cancelAnimation(scale);
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(rotation);
    cancelAnimation(haloOpacity);
    cancelAnimation(haloScale);

    const wasFilled = previousFilled.current;
    haloOpacity.value = 0;
    haloScale.value = SESSION_ATTEMPTS_MOTION.haloStartScale;

    if (filled) {
      x.value = 0;
      if (!wasFilled && !reduceMotion) {
        const delayMs = index * SESSION_ATTEMPTS_MOTION.refillStaggerMs;
        opacity.value = 0;
        scale.value = SESSION_ATTEMPTS_MOTION.refillStartScale;
        y.value = SESSION_ATTEMPTS_MOTION.refillLiftPx;
        rotation.value = -SESSION_ATTEMPTS_MOTION.lossTiltDeg;
        opacity.value = withDelay(
          delayMs,
          withTiming(1, { duration: SESSION_ATTEMPTS_MOTION.refillFadeMs }),
        );
        scale.value = withDelay(
          delayMs,
          withSpring(1, SESSION_ATTEMPTS_MOTION.refillSpring),
        );
        y.value = withDelay(
          delayMs,
          withSpring(0, SESSION_ATTEMPTS_MOTION.refillSpring),
        );
        rotation.value = withDelay(
          delayMs,
          withSequence(
            withTiming(8, { duration: 90 }),
            withSpring(0, SESSION_ATTEMPTS_MOTION.refillSpring),
          ),
        );
        haloOpacity.value = withDelay(
          delayMs,
          withSequence(
            withTiming(0.72, { duration: 70 }),
            withTiming(0, { duration: SESSION_ATTEMPTS_MOTION.haloMs - 70 }),
          ),
        );
        haloScale.value = withDelay(
          delayMs,
          withTiming(SESSION_ATTEMPTS_MOTION.haloEndScale, {
            duration: SESSION_ATTEMPTS_MOTION.haloMs,
          }),
        );
      } else {
        opacity.value = 1;
        scale.value = 1;
        y.value = 0;
        rotation.value = 0;
      }
    } else if (wasFilled && !reduceMotion) {
      x.value = withSequence(
        ...SESSION_ATTEMPTS_MOTION.shakeOffsetsPx.map((offset) =>
          withTiming(offset, { duration: SESSION_ATTEMPTS_MOTION.shakeSegmentMs })),
      );
      scale.value = withSequence(
        withTiming(SESSION_ATTEMPTS_MOTION.lossPopScale, {
          duration: SESSION_ATTEMPTS_MOTION.lossPopMs,
        }),
        withTiming(SESSION_ATTEMPTS_MOTION.consumedScale, {
          duration: SESSION_ATTEMPTS_MOTION.lossExitMs,
        }),
      );
      y.value = withSequence(
        withTiming(SESSION_ATTEMPTS_MOTION.lossLiftPx, {
          duration: SESSION_ATTEMPTS_MOTION.lossPopMs,
        }),
        withTiming(SESSION_ATTEMPTS_MOTION.lossDropPx, {
          duration: SESSION_ATTEMPTS_MOTION.lossExitMs,
        }),
      );
      rotation.value = withSequence(
        withTiming(-SESSION_ATTEMPTS_MOTION.lossTiltDeg, { duration: 60 }),
        withTiming(10, { duration: 60 }),
        withTiming(-6, { duration: 60 }),
        withTiming(0, { duration: 120 }),
      );
      opacity.value = withDelay(
        SESSION_ATTEMPTS_MOTION.lossPopMs,
        withTiming(0, { duration: SESSION_ATTEMPTS_MOTION.consumedFadeMs }),
      );
      haloOpacity.value = withSequence(
        withTiming(0.68, { duration: 60 }),
        withTiming(0, { duration: SESSION_ATTEMPTS_MOTION.haloMs - 60 }),
      );
      haloScale.value = withTiming(SESSION_ATTEMPTS_MOTION.haloEndScale, {
        duration: SESSION_ATTEMPTS_MOTION.haloMs,
      });
    } else {
      opacity.value = 0;
      scale.value = SESSION_ATTEMPTS_MOTION.consumedScale;
      x.value = 0;
      y.value = 0;
      rotation.value = 0;
    }

    previousFilled.current = filled;
  }, [filled, haloOpacity, haloScale, index, opacity, reduceMotion, rotation, scale, x, y]);

  const filledStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: x.value },
      { translateY: y.value },
      { rotate: `${rotation.value}deg` },
      { scale: scale.value },
    ],
  }));
  const haloStyle = useAnimatedStyle(() => ({
    opacity: haloOpacity.value,
    transform: [{ scale: haloScale.value }],
  }));

  return (
    <View style={styles.slot} accessible={false}>
      <Reanimated.View
        pointerEvents="none"
        style={[styles.halo, { borderColor: activeColor }, haloStyle]}
      />
      <Ionicons name="heart-outline" size={20} color={emptyColor} accessible={false} />
      <Reanimated.View style={[styles.filledHeart, filledStyle]} pointerEvents="none">
        <Ionicons name="heart" size={20} color={activeColor} accessible={false} />
      </Reanimated.View>
    </View>
  );
}

/**
 * зачем (вердикт «Сверки» 21.10, одобренный макет learning-v2-tasks-review.html): в шапке занятия попытки — одна таблетка «♥ 3» с красным
 * сердцем и числом, а не три белых сердечка. Сердце (HeartSlot) сохраняет анимацию потери последней попытки, число «подпрыгивает» на каждой
 * потере; звук потери и восстановления живёт в SessionAttemptsHud выше и не менялся.
 */
function GlassHeartCount({ remaining, heartColor, emptyColor, textColor }: Readonly<{ remaining: number; heartColor: string; emptyColor: string; textColor: string }>) {
  const reduceMotion = useReduceMotion();
  const pop = useSharedValue(1);
  const previous = useRef(remaining);
  useEffect(() => {
    if (remaining < previous.current && !reduceMotion) {
      pop.value = withSequence(withTiming(1.35, { duration: 90 }), withSpring(1, { damping: 12, stiffness: 220 }));
    }
    previous.current = remaining;
  }, [pop, reduceMotion, remaining]);
  const popStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.value }] }));
  return (
    <>
      <HeartSlot index={0} filled={remaining > 0} activeColor={heartColor} emptyColor={emptyColor} />
      <Reanimated.View style={popStyle}>
        <Text style={[styles.heartCount, { color: textColor }]}>{remaining}</Text>
      </Reanimated.View>
    </>
  );
}

function SessionAttemptsHud({
  remaining,
  attempts,
  onStoppedExit,
  locale,
  total = SESSION_ATTEMPTS_MAX,
  testID = 'session-attempts-hud',
  glassPill,
}: Props) {
  const { theme: t } = useTheme();
  const safeTotal = Math.max(1, Math.floor(total));
  const safeRemaining = Math.min(safeTotal, Math.max(0, Math.floor(remaining)));
  const accessibilityLabel = getSessionAttemptsCopy(locale).attemptsStatus(safeRemaining, safeTotal);
  // зачем (D09/D148, 04.10): подарочное спасение, его оверлей и DEV-кнопка анимации убраны вместе с подарками — HUD только показывает сердечки.
  const displayRemaining = safeRemaining;

  // зачем: звук сердечек живёт в HUD, а не в 10 экранах-хостах — потеря и
  // восстановление видны здесь как смена remaining. Первый рендер молчит
  // (prev=null): при входе в сессию текущее состояние не озвучивается.
  const prevRemainingRef = useRef<number | null>(null);
  useEffect(() => {
    const prev = prevRemainingRef.current;
    prevRemainingRef.current = safeRemaining;
    if (prev === null || safeRemaining === prev) return undefined;
    if (safeRemaining < prev) {
      // зачем: потеря совпадает по времени с pm.learn.needs_work неверного
      // ответа; задержка 300мс разводит их в последовательность «ответ →
      // сердечко ушло» и попадает в shake-фазу анимации HeartSlot.
      const timer = setTimeout(() => {
        // зачем rateLimit (аудит 2026-08-30): в ту же секунду уже стартуют
        // pm.learn.needs_work и возможный pm.ui.tap_primary — общий бюджет
        // 2 старта/сек молча глотал бы сердечко третьим. Свой scope-бюджет
        // не ослабляет защиту от спама остальному приложению.
        soundDirector.request('pm.hearts.lost', {
          scope: 'session-attempts',
          rateLimit: { maxStarts: 4, windowMs: 1000 },
        });
      }, 300);
      return () => clearTimeout(timer);
    }
    // Восстановление (за руны) звучит сразу: модалка уже закрылась,
    // конкурирующих звуков в этот момент нет.
    soundDirector.request('pm.hearts.restored', { scope: 'session-attempts' });
    return undefined;
  }, [safeRemaining]);

  // зачем (владелец 11.10, режим Б; макет energy-modes-states.html Б1): сердечек нет — вместо них пилюля энергии и остановка занятия.
  // Вынесено в отдельный компонент: подписка на энергию и роутер нужны только в режиме Б, режим А остаётся как был.
  if (attempts?.mistakeChargeActive === true) {
    return <EnergyAttemptsHud attempts={attempts} locale={locale} onStoppedExit={onStoppedExit} testID={testID} />;
  }

  return (
    <View
      testID={testID}
      style={[styles.row, glassPill ? styles.glassPill : null, glassPill ? { backgroundColor: glassPill.plate, boxShadow: glassPill.shadow } : null]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
    >
      {glassPill ? (
        <GlassHeartCount remaining={displayRemaining} heartColor={glassPill.heart ?? glassPill.fill} emptyColor={glassPill.empty} textColor={glassPill.fill} />
      ) : Array.from({ length: safeTotal }, (_, index) => (
        <HeartSlot
          key={index}
          index={index}
          filled={index < displayRemaining}
          activeColor={t.wrong}
          emptyColor={t.textGhost}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 6,
  },
  // `.hp` макета: высота 34, радиус 17, поля 10, gap 4
  glassPill: {
    minHeight: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    gap: 4,
    alignSelf: 'center',
  },
  heartCount: { fontSize: 16, lineHeight: 20, fontWeight: '700', fontVariant: ['tabular-nums'] },
  slot: {
    width: 22,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filledHeart: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2, // shadow-ok: анимированное кольцо-вспышка попытки (пульс индикатора), не контейнер
  },
});

export default memo(SessionAttemptsHud);
