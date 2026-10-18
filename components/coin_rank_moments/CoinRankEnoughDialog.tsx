// ═══════════════════════════════════════════════════════════════════════════
// CoinRankEnoughDialog.tsx — окно «Хватает на ранг N» (момент m14, вариант A; эталон engagement-moments-v3-all.html, `rank3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER, m14): после итога урока человек узнаёт, что накопил на следующий ранг монеты. Ранг покупается ТОЛЬКО за монеты
// (N × 1000, app/coin_rank_table_v1.ts: priceToReach). Окно как GlassAlertDialog поверх экрана: затемнение 0,62, карточка по центру (поля 20, радиус 28, отступы 26/22/22), монета 96 с бликами,
// заголовок «Хватает на ранг N», строка «{монеты} монет — ранг N стоит {цена}.», ряд «текущая монета (50 %) → следующая (пульсирует)», кнопки колонкой: «Повысить за {цена}» и «Позже».
// Анимация: окно пружиной (520 мс), на 400 мс монета прыгает (jump), следующая пульсирует (бесконечно, только при фокусе экрана и активном приложении). Звуки V2: sheet_open на появлении, coin_rank на прыжке.
// Компонент ничего не списывает и не пишет: «Повысить» ведёт в существующую церемонию чеканки (колбэк), «Позже» закрывает. Условия показа и подключение — Ядро (флаг moments_v3).
// ═══════════════════════════════════════════════════════════════════════════
import { V2_TYPE } from '../../constants/v2Style';
import React, { memo, useEffect, useState } from 'react';
import { useMemMomentsTrack } from '../moments/mem_moments_probe';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import Animated, { Easing, FadeIn, cancelAnimation, useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../constants/i18n';
import { coinRankRowForDisplay, isValidCoinRank, COIN_RANK_MAX } from '../../app/coin_rank_table_v1';
import { DebugLogger } from '../../app/debug-logger';
import { hapticMediumImpact, hapticTap } from '../../hooks/use-haptics';
import { useRuntimeActive } from '../../hooks/use_runtime_active';
import { playEvent } from '../../modules/sound_v2/sound_bank';
import MomentCoin from '../moments/MomentCoin';
import { MOMENT_DIM_COLOR } from '../spire/moments/moments_layout';
import SpireRankCoin from '../spire/SpireRankCoin';
import { useSpirePalette } from '../spire/useSpirePalette';
import { useSpireShadow } from '../spire/useSpireShadow';
import { V2Button } from '../v2/V2Kit';
import { coinRankNumber, coinRankText, coinRankCoinsWord } from './coin_rank_strings';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../moments/title_scale';

const LOG = '[COIN-RANK-ENOUGH]';
const JUMP_AT_MS = 400;

export type CoinRankEnoughDialogProps = Readonly<{
  lang: Lang;
  /** Текущий ранг монеты 0…18 (следующий = +1). */
  coinRank: number;
  /** Баланс монет человека. */
  coins: number;
  /** «Повысить за …»: ведёт в существующую церемонию чеканки (покупка там). */
  onUpgrade: () => void;
  /** «Позже». */
  onLater: () => void;
  testID?: string;
}>;

function CoinRankEnoughDialog({ lang, coinRank, coins, onUpgrade, onLater, testID = 'coin-rank-enough' }: CoinRankEnoughDialogProps) {
  useMemMomentsTrack('host:coin-rank-enough'); // зачем (R129): факт размонтирования после закрытия — [MEM-MOMENTS], только отладка
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const reduceMotion = useReducedMotion();
  const runtimeActive = useRuntimeActive(true);
  const [jump, setJump] = useState(false);
  const pop = useSharedValue(reduceMotion ? 1 : 0);
  const pulse = useSharedValue(0);

  const valid = isValidCoinRank(coinRank) && coinRank < COIN_RANK_MAX;
  const nextRank = valid ? coinRank + 1 : 0;
  const price = valid ? coinRankRowForDisplay(nextRank).priceToReach : 0;

  useEffect(() => {
    DebugLogger.info(LOG, `показ ранг=${coinRank} → ${nextRank} монеты=${coins} цена=${price} валидно=${String(valid)} reduceMotion=${String(reduceMotion)}`);
    playEvent('sheet_open');
    void hapticTap();
    if (!reduceMotion) pop.value = withTiming(1, { duration: 520, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
    const timer = setTimeout(() => { setJump(true); playEvent('coin_rank'); void hapticMediumImpact(); }, reduceMotion ? 0 : JUMP_AT_MS);
    return () => { clearTimeout(timer); cancelAnimation(pop); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: показ один раз на монтирование
  }, []);

  // следующая монета пульсирует (образец emPulse 1,6 с), но только пока экран виден
  useEffect(() => {
    if (reduceMotion || !runtimeActive) { cancelAnimation(pulse); pulse.value = 0; return; }
    // зачем (сторож motion_allowlist, координатор 15.10 после R08): вечный цикл съедал кадры в фоне — конечное число повторов покрывает время показа
    pulse.value = withRepeat(withSequence(withTiming(1, { duration: 800, easing: Easing.inOut(Easing.quad) }), withTiming(0, { duration: 800, easing: Easing.inOut(Easing.quad) })), 6, false);
    return () => cancelAnimation(pulse);
  }, [pulse, reduceMotion, runtimeActive]);

  const cardStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.6), transform: [{ scale: 0.9 + 0.1 * pop.value }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + 0.08 * pulse.value }] }));

  if (!valid) { DebugLogger.info(LOG, `ранг ${String(coinRank)} не имеет следующего — окно не рисуется`); return null; }
  const priceText = coinRankNumber(price);

  return (
    <View style={s.root} testID={testID} accessibilityViewIsModal>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(320)} style={[StyleSheet.absoluteFill, { backgroundColor: MOMENT_DIM_COLOR }]} pointerEvents="none" />
      <Animated.View style={[s.card, { backgroundColor: p.card }, sh.plate, cardStyle]}>
        <MomentCoin rank={coinRank} size={96} mood={jump ? 'jump' : 'idle'} glints testID={`${testID}-coin`} />
        <Text accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE} style={[s.title, { color: p.text }]}>{coinRankText(lang, 'title', { n: nextRank })}</Text>
        <Text style={[s.body, { color: p.textSecondary }]}>{coinRankText(lang, 'body', { coins: coinRankNumber(coins), word: coinRankCoinsWord(lang, coins), n: nextRank, price: priceText })}</Text>
        <View style={s.coins} accessible={false} importantForAccessibility="no-hide-descendants">
          <View style={s.from}><SpireRankCoin rank={coinRank} size={36} /></View>
          <Ionicons name="arrow-forward" size={18} color={p.text} />
          <Animated.View style={pulseStyle}><SpireRankCoin rank={nextRank} size={48} /></Animated.View>
        </View>
        <View style={s.acts}>
          <V2Button label={coinRankText(lang, 'upgrade', { price: priceText })} onPress={onUpgrade} testID={`${testID}-upgrade`} />
          <View style={s.gap} />
          <V2Button label={coinRankText(lang, 'later')} variant="secondary" onPress={onLater} testID={`${testID}-later`} />
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 20 },
  // `.modal`: поля 20, радиус 28, отступы 26/22/22, по центру
  card: { borderRadius: 28, paddingTop: 26, paddingHorizontal: 22, paddingBottom: 22, alignItems: 'center' },
  // зачем (Макеты 15.10, CODE_VS_ETALON; решение координатора): типографика по листам приёмки m14: заголовок окна 23/29 · 800 · −0,3
  title: { marginTop: 12, ...V2_TYPE.momentTitle, textAlign: 'center' },
  body: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  // ряд «текущая → следующая»: зазор 10, сверху 14
  coins: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 14 },
  from: { opacity: 0.5 },
  acts: { alignSelf: 'stretch', marginTop: 20 },
  gap: { height: 12 },
});

export default memo(CoinRankEnoughDialog);
