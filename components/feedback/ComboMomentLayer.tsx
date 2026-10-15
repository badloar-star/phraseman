// ═══════════════════════════════════════════════════════════════════════════
// ComboMomentLayer.tsx — m08 «Молния» поверх экрана урока: монета выглядывает на 5 подряд, на 10 — молния через экран, вспышка и монета радуется («!»),
// при ошибке после серии — холодная виньетка и монета дрожит («пот»). Эталон engagement-moments-v3-all.html `comboInit` + engagement-moments-v2.js `zap`.
//
// зачем (владелец 15.10: «ДА ДЕЛАЙ», монета — «НЕ УБИРАЕМ А ОСТАВЛЯЕМ»): серия ответов держит внимание до конца урока. Слой не ловит касаний (pointerEvents none),
// монета видна 1,8 с после своего удара и уходит — вопрос урока не закрывает. Грузится require'ом только при moments_v3. Звук порога уже играет ComboRing (lightning);
// здесь — только звук обрыва swipe_learn. reduced-motion — без молнии, вспышки и виньетки (монета — сразу в итоговой позе). Журнал [MOMENT-m08].
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Reanimated, { useAnimatedProps, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import Svg, { Defs, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

import { useMyCoinRank } from '../../hooks/use_my_coin_rank';
import MomentCoin, { type MomentCoinEmote, type MomentCoinMood } from '../moments/MomentCoin';
import { useStreakColors } from '../streak/moments/use_streak_colors';
import { COMBO_MOMENT_LOG, COMBO_MOMENT_TIMELINE as T, deriveComboBeat, type ComboBeat } from './combo_moment_gate';

const AnimatedPath = Reanimated.createAnimatedComponent(Path);
// эталон `zap`: путь в кадре 390 × 844, растягивается на экран
const ZAP_D = 'M60 0 L170 240 L120 250 L250 520 L200 530 L330 844';
const ZAP_LEN = 1200;
// theme-exempt: молния — свет, а не цвет темы (эталон svg.zap: штрих #FFF3C4, свечение #FFD166)
const ZAP_STROKE = '#FFF3C4';
const ZAP_GLOW = '#FFD166';
const FLASH = '#FFFFFF'; // theme-exempt: вспышка эталона `.flash` — белая
const COIN_SIZE = 52;

function playBreakSound(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSoundV2Enabled } = require('../../modules/sound_v2/sound_v2_flag') as typeof import('../../modules/sound_v2/sound_v2_flag');
    if (!isSoundV2Enabled()) { console.log(`${COMBO_MOMENT_LOG} звук обрыва пропущен: sound_v2 выключен`); return; } // guard-ok: ветка без звука
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playEvent } = require('../../modules/sound_v2/sound_bank') as typeof import('../../modules/sound_v2/sound_bank');
    const result = playEvent('swipe_learn');
    if (!result.played) console.log(`${COMBO_MOMENT_LOG} звук swipe_learn не сыграл: ${String(result.reason)}`); // guard-ok: причина отказа движка
  } catch (error) {
    console.warn(`${COMBO_MOMENT_LOG} звук обрыва не сыграл (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина отказа
  }
}

type CoinState = Readonly<{ mood: MomentCoinMood; emote?: MomentCoinEmote; key: number }>;

const COIN_FOR: Readonly<Record<Exclude<ComboBeat, 'spark'>, Readonly<{ mood: MomentCoinMood; emote?: MomentCoinEmote }>>> = {
  lightning: { mood: 'peek' },
  storm: { mood: 'cheer', emote: 'bang' },
  break: { mood: 'shiver', emote: 'sweat' },
};

export type ComboMomentLayerProps = Readonly<{ comboCount: number }>;

function ComboMomentLayer({ comboCount }: ComboMomentLayerProps) {
  const reduced = useReducedMotion();
  const coinRank = useMyCoinRank();
  const colors = useStreakColors();
  const prevRef = useRef(comboCount);
  const [coin, setCoin] = useState<CoinState | null>(null);
  const zap = useSharedValue(ZAP_LEN);
  const zapOpacity = useSharedValue(0);
  const flash = useSharedValue(0);
  const cold = useSharedValue(0);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = comboCount;
    const beat = deriveComboBeat(prev, comboCount);
    if (!beat || beat === 'spark') return undefined;
    console.log(`${COMBO_MOMENT_LOG} слой: удар «${beat}» (${prev} → ${comboCount}), монета=${COIN_FOR[beat].mood} ранг=${String(coinRank)}`); // guard-ok: журнал удара
    setCoin((c) => ({ ...COIN_FOR[beat], key: (c?.key ?? 0) + 1 }));
    if (beat === 'break') playBreakSound();
    if (!reduced && beat === 'storm') {
      zap.value = withSequence(withTiming(ZAP_LEN, { duration: 0 }), withTiming(0, { duration: T.zapDraw }));
      zapOpacity.value = withSequence(withTiming(1, { duration: 0 }), withDelay(T.zapFadeAt, withTiming(0, { duration: T.zapFade })));
      // emFlash: 0 → пик на 15 % → 0
      flash.value = withSequence(withTiming(T.flashPeak, { duration: T.flash * 0.15 }), withTiming(0, { duration: T.flash * 0.85 }));
    }
    if (!reduced && beat === 'break') {
      cold.value = withSequence(withTiming(1, { duration: 0 }), withDelay(T.coldHold, withTiming(0, { duration: T.coldFade })));
    }
    const id = setTimeout(() => setCoin(null), T.coinStay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: удар решается только сменой серии
  }, [comboCount]);

  const zapProps = useAnimatedProps(() => ({ strokeDashoffset: zap.value }));
  const zapStyle = useAnimatedStyle(() => ({ opacity: zapOpacity.value }));
  const flashStyle = useAnimatedStyle(() => ({ opacity: flash.value }));
  const coldStyle = useAnimatedStyle(() => ({ opacity: cold.value }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill} testID="lesson1-combo-layer">
      {/* `.vignette.cold`: прозрачный центр → второй цвет темы 35 % по краям */}
      <Reanimated.View style={[StyleSheet.absoluteFill, coldStyle]}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
          <Defs>
            <RadialGradient id="m08cold" cx="50" cy="50" r="71" gradientUnits="userSpaceOnUse">
              <Stop offset="0.55" stopColor={colors.second} stopOpacity="0" />
              <Stop offset="1" stopColor={colors.second} stopOpacity="0.35" />
            </RadialGradient>
          </Defs>
          <Rect x="0" y="0" width="100" height="100" fill="url(#m08cold)" />
        </Svg>
      </Reanimated.View>
      <Reanimated.View style={[StyleSheet.absoluteFill, { backgroundColor: FLASH }, flashStyle]} />
      <Reanimated.View style={[StyleSheet.absoluteFill, zapStyle]}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 390 844">
          <Path d={ZAP_D} stroke={ZAP_GLOW} strokeOpacity={0.45} strokeWidth={14} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          <AnimatedPath d={ZAP_D} stroke={ZAP_STROKE} strokeWidth={4} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={ZAP_LEN} animatedProps={zapProps} />
        </Svg>
      </Reanimated.View>
      {coin ? (
        // эталон `[data-cc]`: монета 52 по центру под шапкой урока, без тени
        <View style={s.coinRow}>
          <MomentCoin rank={coinRank} size={COIN_SIZE} mood={coin.mood} moodKey={coin.key} shadow={false} emote={coin.emote} emoteKey={coin.emote ? coin.key : undefined} testID="lesson1-combo-coin" />
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  coinRow: { position: 'absolute', left: 0, right: 0, top: 118, alignItems: 'center' },
});

export default memo(ComboMomentLayer);
