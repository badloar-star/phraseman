import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { DebugLogger } from '../../app/debug-logger';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticWarning } from '../../hooks/use-haptics';
import EnergyIcon from '../EnergyIcon';

const TAG = '[ENERGY-MISTAKE-HUD]';

/**
 * Хронометраж 1 в 1 с макета energy-modes-states.html (владелец 11.10, «прям анимация»):
 * тряска пилюли 520 мс (gshake), иконка вспухает ×1.25 на середине (gboltshake), «−1» летит 900 мс (gfly),
 * цифра меняется через 260 мс после начала тряски и «падает» 420 мс с пружиной (gtick), пульс красным на последней энергии 1100 мс ×3 (gwarn).
 */
export const ENERGY_MISTAKE_MOTION = {
  shakeMs: 520,
  shakeSteps: [
    { atPct: 0.15, x: -6, rot: -3 },
    { atPct: 0.35, x: 6, rot: 3 },
    { atPct: 0.55, x: -4, rot: 0 },
    { atPct: 0.75, x: 3, rot: 0 },
    { atPct: 1, x: 0, rot: 0 },
  ],
  boltPeakScale: 1.25,
  flyMs: 900,
  flyRisePx: -44,
  flyPeakPct: 0.15,
  numberSwapDelayMs: 260,
  tickMs: 420,
  tickFromY: -9,
  tickFromScale: 0.7,
  warnMs: 1100,
  warnCycles: 3,
} as const;

type Props = Readonly<{
  /** Сколько энергии осталось сейчас. */
  energy: number;
  /** Потолок (5): для значения доступности. */
  maxEnergy: number;
  /**
   * Счётчик списаний за ошибку (`attempts.energyLossSeq`, Ядро): растёт на 1 РОВНО при списании за ошибку.
   * зачем: нельзя определять ошибку по падению energy — энергия падает и от истечения подарочной, и от сверки с сервером (ложная тряска).
   */
  lossSeq: number;
  /** Цвета из токенов темы (liquidGlassTokens): иконка/цифра, «пустая» иконка, красный «ошибки», заливка и тонкая кромка пилюли. */
  accent: string;
  muted: string;
  textColor: string;
  bad: string;
  /** Подпись для озвучки экрана («Энергия: 3 из 5»). */
  accessibilityLabel: string;
  testID?: string;
}>;

/**
 * Энергия в шапке занятия в режиме Б (макет energy-modes-states.html, кадры Б1–Б4): пилюля 34 pt с молнией и цифрой, сердечек нет.
 * Ошибка: пилюля трясётся, молния вспухает, над ней вылетает «−1», цифра перекатывается. Последняя энергия (1) — красный пульс.
 * Ноль — пилюля приглушена, цифра красная. «Уменьшить движение»: без тряски и подъёма, «−1» только появляется и гаснет на месте.
 */
function EnergyMistakeHud({ energy, maxEnergy, lossSeq, accent, muted, textColor, bad, accessibilityLabel, testID = 'energy-mistake-hud' }: Props) {
  const M = ENERGY_MISTAKE_MOTION;
  const reduceMotion = useReduceMotion();
  const safeEnergy = Math.max(0, Math.floor(energy));
  const [shown, setShown] = useState(safeEnergy);
  const shownRef = useRef(safeEnergy);
  const energyRef = useRef(safeEnergy);
  energyRef.current = safeEnergy;
  const prevSeqRef = useRef(lossSeq);
  const swapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const shakeX = useSharedValue(0);
  const shakeRot = useSharedValue(0);
  const boltScale = useSharedValue(1);
  const flyOpacity = useSharedValue(0);
  const flyY = useSharedValue(0);
  const flyScale = useSharedValue(0.8);
  const tickY = useSharedValue(0);
  const tickScale = useSharedValue(1);
  const tickOpacity = useSharedValue(1);

  const playTick = () => {
    cancelAnimation(tickY);
    cancelAnimation(tickScale);
    cancelAnimation(tickOpacity);
    if (reduceMotion) { tickY.value = 0; tickScale.value = 1; tickOpacity.value = 1; return; }
    const spring = Easing.bezier(0.3, 1.4, 0.5, 1);
    tickY.value = M.tickFromY; tickScale.value = M.tickFromScale; tickOpacity.value = 0;
    tickY.value = withTiming(0, { duration: M.tickMs, easing: spring });
    tickScale.value = withTiming(1, { duration: M.tickMs, easing: spring });
    tickOpacity.value = withTiming(1, { duration: M.tickMs });
  };

  // Потеря за ошибку: явный счётчик от Ядра. Объявлен ПЕРЕД эффектом цифры — таймер подмены цифры должен быть взведён раньше его проверки.
  useEffect(() => {
    const prev = prevSeqRef.current;
    prevSeqRef.current = lossSeq;
    if (lossSeq === prev) return;
    if (lossSeq < prev) {
      // зачем: счётчик нового занятия начинается заново — это не потеря, анимировать нечего.
      DebugLogger.info(TAG, `lossSeq сброшен ${prev}→${lossSeq}: новое занятие, без анимации energy=${energyRef.current}`);
      return;
    }
    DebugLogger.info(TAG, `потеря за ошибку lossSeq ${prev}→${lossSeq} energy=${energyRef.current} shown=${shownRef.current} reduceMotion=${String(reduceMotion)}`);
    hapticWarning().catch((error: unknown) => {
      DebugLogger.warn(TAG, `haptic не сработал: ${error instanceof Error ? error.message : String(error)}`);
    });
    [shakeX, shakeRot, boltScale, flyOpacity, flyY, flyScale].forEach((v) => cancelAnimation(v));
    flyY.value = 0;
    if (reduceMotion) {
      flyOpacity.value = 1;
      flyOpacity.value = withDelay(M.flyMs * 0.4, withTiming(0, { duration: M.flyMs * 0.6 }));
    } else {
      const sec = (pct: number) => M.shakeMs * pct;
      let last = 0;
      const xs = M.shakeSteps.map((s) => { const d = sec(s.atPct - last); last = s.atPct; return withTiming(s.x, { duration: d }); });
      last = 0;
      const rs = M.shakeSteps.map((s) => { const d = sec(s.atPct - last); last = s.atPct; return withTiming(s.rot, { duration: d }); });
      shakeX.value = withSequence(...xs);
      shakeRot.value = withSequence(...rs);
      boltScale.value = withSequence(
        withTiming(M.boltPeakScale, { duration: M.shakeMs / 2 }),
        withTiming(1, { duration: M.shakeMs / 2 }),
      );
      flyScale.value = withSequence(
        withTiming(1.2, { duration: M.flyMs * M.flyPeakPct }),
        withTiming(1, { duration: M.flyMs * (1 - M.flyPeakPct) }),
      );
      flyOpacity.value = withSequence(
        withTiming(1, { duration: M.flyMs * M.flyPeakPct }),
        withTiming(0, { duration: M.flyMs * (1 - M.flyPeakPct) }),
      );
      flyY.value = withTiming(M.flyRisePx, { duration: M.flyMs, easing: Easing.bezier(0.2, 0.8, 0.3, 1) });
    }
    if (swapTimerRef.current) clearTimeout(swapTimerRef.current);
    swapTimerRef.current = setTimeout(() => {
      swapTimerRef.current = null;
      shownRef.current = energyRef.current;
      setShown(energyRef.current);
      playTick();
    }, reduceMotion ? 0 : M.numberSwapDelayMs);
    // зачем: energy и reduceMotion намеренно вне deps — эффект привязан к событию потери (lossSeq), а не к значениям.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lossSeq]);

  // Любое другое изменение энергии (восстановление, сверка, полночь) — цифра меняется сразу, без тряски.
  useEffect(() => {
    if (swapTimerRef.current) return;
    if (shownRef.current === safeEnergy) return;
    DebugLogger.info(TAG, `энергия изменилась вне ошибки ${shownRef.current}→${safeEnergy}: цифра сразу, без тряски`);
    shownRef.current = safeEnergy;
    setShown(safeEnergy);
    playTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeEnergy]);

  useEffect(() => () => { if (swapTimerRef.current) clearTimeout(swapTimerRef.current); }, []);

  // зачем (владелец 18.10 «только молния и число, без подложки»): красное кольцо-пульс по контуру пилюли рисовало ту же капсулу — снято;
  // последнюю энергию показывает красная цифра.
  const lastEnergy = safeEnergy === 1;

  const pillStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }, { rotate: `${shakeRot.value}deg` }],
  }));
  const boltStyle = useAnimatedStyle(() => ({ transform: [{ scale: boltScale.value }] }));
  const flyStyle = useAnimatedStyle(() => ({
    opacity: flyOpacity.value,
    transform: [{ translateY: flyY.value }, { scale: flyScale.value }],
  }));
  const tickStyle = useAnimatedStyle(() => ({
    opacity: tickOpacity.value,
    transform: [{ translateY: tickY.value }, { scale: tickScale.value }],
  }));

  const zero = shown === 0;
  return (
    <Reanimated.View
      testID={testID}
      // зачем (владелец 18.10): без заливки, кромки и приглушения нуля — молния и цифра прямо на фоне шапки (цвета ≥ 3 / ≥ 4,5 к фону)
      style={[styles.pill, pillStyle]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: Math.max(1, Math.floor(maxEnergy)), now: Math.min(safeEnergy, Math.floor(maxEnergy)) }}
    >
      <Reanimated.View style={boltStyle}>
        <EnergyIcon
          filled={!zero}
          themeColor={zero ? muted : accent}
          tintColor={zero ? muted : accent}
          size={16}
          animateChange={false}
          animateLoop={false}
        />
      </Reanimated.View>
      <Reanimated.View style={[styles.valueBox, tickStyle]}>
        <Text
          testID={`${testID}-value`}
          style={[styles.value, { color: zero || lastEnergy ? bad : textColor }]}
          maxFontSizeMultiplier={1.15}
        >
          {shown}
        </Text>
      </Reanimated.View>
      <Reanimated.View pointerEvents="none" style={[styles.fly, flyStyle]}>
        <Text style={[styles.flyText, { color: bad }]} maxFontSizeMultiplier={1.15} testID={`${testID}-loss`}>−1</Text>
      </Reanimated.View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  pill: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 11,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  valueBox: { minWidth: 10, alignItems: 'center', justifyContent: 'center' },
  value: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center', fontVariant: ['tabular-nums'] },
  fly: { position: 'absolute', alignSelf: 'center', top: 6, zIndex: 9 },
  flyText: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
});

export default memo(EnergyMistakeHud);
