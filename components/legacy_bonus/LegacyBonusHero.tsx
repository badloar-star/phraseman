// ═══════════════════════════════════════════════════════════════════════════
// LegacyBonusHero.tsx — верх плашки пересчёта: большая монета слева, «Итого» и растущее число справа.
//
// зачем (макет Q9jqpBbjwJEFV1DpdEGx2h, .hero / .bigcoin / finish): монета подпрыгивает (1,06 за 220 мс) на каждую прилетевшую монету, а на итоге —
// большой пульс 1,14 за 640 мс, кольцо-свечение (760 мс, 0,92→1,9 с затуханием) и блик по диагонали (820 мс); число в этот миг тоже пульсирует 1,06 за 560 мс.
// Монета — настоящая монета ранга человека (MomentCoin), движение на UI-треде; число — отдельный узел со своим состоянием.
// ═══════════════════════════════════════════════════════════════════════════
import { LinearGradient } from 'expo-linear-gradient';
import React, { forwardRef, memo, useImperativeHandle, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { legacyBonusTotalLabel } from '../../modules/legacy_bonus/legacy_bonus_strings';
import MomentCoin from '../moments/MomentCoin';
import LegacyBonusTotalCounter, { type LegacyBonusTotalCounterHandle } from './LegacyBonusTotalCounter';

export const LEGACY_BONUS_COIN_SIZE = 64;
const EASE_POP = Easing.bezier(0.34, 1.56, 0.64, 1);
const EASE_SWEEP = Easing.bezier(0.4, 0, 0.2, 1);
const EASE_RING = Easing.bezier(0.22, 1, 0.36, 1);

export type LegacyBonusHeroHandle = Readonly<{
  /** Прилетела монета: цифра растёт на add, монета подпрыгивает. */
  coinLanded: (add: number) => void;
  /** Итог достигнут: пульс, кольцо и блик. */
  celebrate: () => void;
  /** Сразу показать итог без движения. */
  settle: (value: number) => void;
}>;

type Props = Readonly<{
  lang: Lang;
  coinRank: number | null;
  total: number;
  glass: GlassTokens;
  reduceMotion: boolean;
  onReachedTotal: () => void;
}>;

const LegacyBonusHero = forwardRef<LegacyBonusHeroHandle, Props>(function LegacyBonusHero({ lang, coinRank, total, glass, reduceMotion, onReachedTotal }, ref) {
  const counterRef = useRef<LegacyBonusTotalCounterHandle>(null);
  const coinScale = useSharedValue(1);
  const numScale = useSharedValue(1);
  const ring = useSharedValue(0);
  const sweep = useSharedValue(0);

  const bumpCoin = (scale: number, ms: number): void => {
    if (reduceMotion) return;
    coinScale.value = withSequence(withTiming(scale, { duration: ms * 0.4, easing: EASE_POP }), withTiming(1, { duration: ms * 0.6, easing: EASE_POP }));
  };

  useImperativeHandle(ref, () => ({
    coinLanded: (add: number) => {
      counterRef.current?.bump(add);
      bumpCoin(1.06, 220);
    },
    celebrate: () => {
      if (reduceMotion) return;
      bumpCoin(1.14, 640);
      numScale.value = withSequence(withTiming(1.06, { duration: 224, easing: EASE_POP }), withTiming(1, { duration: 336, easing: EASE_POP }));
      ring.value = 0;
      ring.value = withTiming(1, { duration: 760, easing: EASE_RING });
      sweep.value = 0;
      sweep.value = withTiming(1, { duration: 820, easing: EASE_SWEEP });
    },
    settle: (value: number) => counterRef.current?.settle(value),
  }), [coinScale, numScale, reduceMotion, ring, sweep]);

  const coinStyle = useAnimatedStyle(() => ({ transform: [{ scale: coinScale.value }] }));
  const numStyle = useAnimatedStyle(() => ({ transform: [{ scale: numScale.value }] }));
  const ringStyle = useAnimatedStyle(() => ({ opacity: 0.9 * (1 - ring.value), transform: [{ scale: 0.92 + ring.value * 0.98 }] }));
  // блик: полоса 60 % ширины, наклон 18°, из −160 % в 260 %, виден в первые 15 % и гаснет к концу (макет @keyframes sheen)
  const sweepStyle = useAnimatedStyle(() => {
    const t = sweep.value;
    return {
      opacity: t <= 0 ? 0 : t < 0.15 ? t / 0.15 : 1 - (t - 0.15) / 0.85,
      transform: [{ translateX: LEGACY_BONUS_COIN_SIZE * 0.6 * (-1.6 + t * 4.2) }, { rotate: '18deg' }], // guard-ok: геометрия блика, не баланс
    };
  });

  return (
    <View style={s.hero}>
      <Animated.View style={[s.coinWrap, coinStyle]} testID="legacy-bonus-coin">
        <MomentCoin rank={coinRank} size={LEGACY_BONUS_COIN_SIZE} mood="still" shadow={false} />
        <Animated.View pointerEvents="none" style={[s.ring, { boxShadow: `0 0 0 2px ${glass.accent}8C, 0 0 24px 6px ${glass.accent}59` }, ringStyle]} />
        <View pointerEvents="none" style={s.mask}>
          <Animated.View style={[s.sweep, sweepStyle]}>
            <LinearGradient colors={['rgba(255,255,255,0)', 'rgba(255,255,255,0.75)', 'rgba(255,255,255,0)']} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
        </View>
      </Animated.View>
      <View style={s.numCol}>
        <Text style={[s.label, { color: glass.secondary }]}>{legacyBonusTotalLabel(lang).toUpperCase()}</Text>
        <Animated.View style={[s.numWrap, numStyle]}>
          <LegacyBonusTotalCounter ref={counterRef} lang={lang} total={total} onReachedTotal={onReachedTotal} color={glass.text} unitColor={glass.secondary} />
        </Animated.View>
      </View>
    </View>
  );
});

const s = StyleSheet.create({
  // макет `.hero`: gap 16, поля 2/2/12
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingTop: 2, paddingHorizontal: 2, paddingBottom: 12 },
  coinWrap: { width: LEGACY_BONUS_COIN_SIZE, height: LEGACY_BONUS_COIN_SIZE },
  ring: { position: 'absolute', top: -2, left: -2, right: -2, bottom: -2, borderRadius: 999 },
  mask: { position: 'absolute', top: 1, left: 1, right: 1, bottom: 1, borderRadius: 999, overflow: 'hidden' },
  sweep: { position: 'absolute', top: -LEGACY_BONUS_COIN_SIZE * 0.2, bottom: -LEGACY_BONUS_COIN_SIZE * 0.2, left: 0, width: '60%' },
  numCol: { flex: 1, minWidth: 0 },
  // `.hnum .k`: 13/17, 700, трекинг 1.4, заглавные
  label: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4 },
  numWrap: { alignSelf: 'flex-start' },
});

export default memo(LegacyBonusHero);
