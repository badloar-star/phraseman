import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Reanimated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { DebugLogger } from '../../app/debug-logger';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import { hapticWarning } from '../../hooks/use-haptics';
import EnergyIcon from '../EnergyIcon';
import { AnimatedEnergyNumber } from './AnimatedEnergyNumber';

const TAG = '[ENERGY-MISTAKE-HUD]';

/** Длительность всплывающего «−1»: подъём + растворение. Shake иконки — 264 мс (EnergyIcon), «−1» стартует вместе с ним. */
export const ENERGY_MISTAKE_LOSS_MS = 620;
const SHAKE_FLAG_MS = 320;
const LOSS_RISE_PX = -16;

type Props = Readonly<{
  /** Сколько энергии осталось сейчас. */
  energy: number;
  /** Потолок (5): для подписи доступности. */
  maxEnergy: number;
  /**
   * Счётчик списаний за ошибку (`attempts.energyLossSeq`, Ядро): растёт на 1 РОВНО при списании за ошибку.
   * зачем: нельзя определять ошибку по падению energy — энергия падает и от истечения подарочной, и от сверки с сервером (ложный shake).
   */
  lossSeq: number;
  /** Цвета пилюли. glassPill — тот же контракт, что у сердечек Learning V2; без него — токены темы. */
  color: string;
  lossColor: string;
  plate?: string;
  /** Подпись для озвучки экрана («Энергия: 3 из 5»). */
  accessibilityLabel: string;
  testID?: string;
}>;

/**
 * Энергия в шапке занятия в режиме Б (владелец 11.10): сердечек нет, каждая ошибка снимает 1 энергию.
 * Анимация потери: иконка трясётся (нативный драйвер), число «проваливается», над ней всплывает «−1» и гаснет.
 * Reduce motion: без shake и подъёма — «−1» только появляется и растворяется на месте.
 */
function EnergyMistakeHud({ energy, maxEnergy, lossSeq, color, lossColor, plate, accessibilityLabel, testID = 'energy-mistake-hud' }: Props) {
  const reduceMotion = useReduceMotion();
  const prevSeqRef = useRef(lossSeq);
  const [shake, setShake] = useState(false);
  const lossOpacity = useSharedValue(0);
  const lossY = useSharedValue(0);

  useEffect(() => {
    const prev = prevSeqRef.current;
    prevSeqRef.current = lossSeq;
    if (lossSeq === prev) return undefined;
    if (lossSeq < prev) {
      // зачем: счётчик нового занятия начинается заново — это не потеря, анимировать нечего.
      DebugLogger.info(TAG, `lossSeq сброшен ${prev}→${lossSeq}: новое занятие, без анимации energy=${energy}`);
      return undefined;
    }
    DebugLogger.info(TAG, `потеря за ошибку lossSeq ${prev}→${lossSeq} energy=${energy} reduceMotion=${String(reduceMotion)}`);
    hapticWarning().catch((error: unknown) => {
      DebugLogger.warn(TAG, `haptic не сработал: ${error instanceof Error ? error.message : String(error)}`);
    });
    cancelAnimation(lossOpacity);
    cancelAnimation(lossY);
    lossY.value = 0;
    lossOpacity.value = 1;
    lossOpacity.value = withDelay(220, withTiming(0, { duration: ENERGY_MISTAKE_LOSS_MS - 220 }));
    if (!reduceMotion) {
      lossY.value = withTiming(LOSS_RISE_PX, { duration: ENERGY_MISTAKE_LOSS_MS });
      setShake(true);
    }
    const timer = setTimeout(() => setShake(false), SHAKE_FLAG_MS);
    return () => clearTimeout(timer);
  }, [lossSeq, energy, reduceMotion, lossOpacity, lossY]);

  const lossStyle = useAnimatedStyle(() => ({
    opacity: lossOpacity.value,
    transform: [{ translateY: lossY.value }],
  }));

  const safeEnergy = Math.max(0, Math.floor(energy));
  return (
    <View
      testID={testID}
      style={[styles.pill, plate ? { backgroundColor: plate } : null]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: Math.max(1, Math.floor(maxEnergy)), now: Math.min(safeEnergy, Math.floor(maxEnergy)) }}
    >
      <EnergyIcon
        filled={safeEnergy > 0}
        themeColor={color}
        tintColor={color}
        size={18}
        animateChange={false}
        animateLoop={false}
        shouldShake={shake}
      />
      <AnimatedEnergyNumber value={safeEnergy} color={color} style={styles.value} />
      <Reanimated.View pointerEvents="none" style={[styles.loss, lossStyle]}>
        <Text style={[styles.lossText, { color: lossColor }]} maxFontSizeMultiplier={1.15} testID={`${testID}-loss`}>−1</Text>
      </Reanimated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    minHeight: 30,
    borderRadius: 15,
    paddingLeft: 10,
    paddingRight: 6,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  value: { width: 22, height: 24, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  loss: { position: 'absolute', top: -2, right: 4 },
  lossText: { fontSize: 13, lineHeight: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
});

export default memo(EnergyMistakeHud);
