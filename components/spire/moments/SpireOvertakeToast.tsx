// ═══════════════════════════════════════════════════════════════════════════
// SpireOvertakeToast.tsx — момент m05 · вариант B «Тост: соперник обогнал тебя» (эталон engagement-moments-v3-all.html, `overtake3`).
//
// зачем (владелец 14.10: «перенести точно по макетам»; ТЗ ETALON_MOMENTS_V3_TRANSFER m05; координатор): социальный толчок по кэшу комнаты, без серверных пушей. Тост сверху поверх экрана Пика: два лица-монеты 36
// (соперник и ты), «{имя} обгоняет тебя / на N монет недели», пилюля «Играть» (40, радиус 20); под тостом монета 96 вздрагивает со знаком «!» на 0,5 с. Тост выезжает пружиной (600 мс), звук tap, хаптик
// лёгкий; сам уезжает через autoDismissMs (по умолчанию 6 с) → onDismiss. Формулировка без рода («обгоняет», не «обошла»): пола соперника в данных нет. Только показ: «Играть» зовёт прежний подъём.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { hapticMediumImpact, hapticTap } from '../../../hooks/use-haptics';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { playEvent } from '../../../modules/sound_v2/sound_bank';
import MomentCoin from '../../moments/MomentCoin';
import { useFireOnce } from '../../moments/use_fire_once';
import V2Pressable from '../../v2/V2Pressable';
import SpireRankCoin from '../SpireRankCoin';
import { useSpirePalette } from '../useSpirePalette';
import { useSpireShadow } from '../useSpireShadow';
import { positionMomentText } from './position_moment_strings';
import { momentText } from './moments_strings';

/** Через сколько тост уезжает сам, мс. */
export const OVERTAKE_AUTO_DISMISS_MS = 6000;
const SHIVER_AT_MS = 500;
/** Эталон: монета под тостом на 330 из 844. */
const COIN_TOP_FRACTION = 330 / 844;

export type SpireOvertakeToastProps = Readonly<{
  lang: Lang;
  /** Имя соперника, обогнавшего тебя. */
  rivalName: string;
  /** Ранг монеты соперника 0…19 (null — базовая). */
  rivalCoinRank: number | null;
  /** Мой ранг монеты 0…19 (null — базовая). */
  myCoinRank: number | null;
  /** На сколько монет недели соперник впереди. */
  gapCoins: number;
  onPlay: () => void;
  onDismiss: () => void;
  autoDismissMs?: number;
  testID?: string;
}>;

function SpireOvertakeToast({ lang, rivalName, rivalCoinRank, myCoinRank, gapCoins, onPlay, onDismiss, autoDismissMs = OVERTAKE_AUTO_DISMISS_MS, testID = 'overtake-toast' }: SpireOvertakeToastProps) {
  const p = useSpirePalette();
  const sh = useSpireShadow();
  const reduceMotion = useReducedMotion();
  const insets = useStableSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [mood, setMood] = useState<'idle' | 'shiver'>('idle');
  const [bang, setBang] = useState(false);
  const enter = useSharedValue(reduceMotion ? 1 : 0);

  // зачем (координатор 14.10, аудит Optimistic UI): тап срабатывает один раз синхронно; родитель в onNext/onPlay СНАЧАЛА закрывает окно, потом навигация/запись
  const fire = useFireOnce('OVERTAKE');
  useEffect(() => {
    console.log(`[OVERTAKE] тост: соперник=${rivalName} разрыв=${gapCoins} автозакрытие=${autoDismissMs} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    playEvent('tap');
    void hapticTap();
    if (!reduceMotion) enter.value = withTiming(1, { duration: 600, easing: Easing.bezier(0.3, 1.6, 0.5, 1) });
    const shiver = reduceMotion ? null : setTimeout(() => { setMood('shiver'); setBang(true); void hapticMediumImpact(); }, SHIVER_AT_MS);
    const away = setTimeout(() => { console.log('[OVERTAKE] тост закрылся сам'); fire(onDismiss, 'auto-dismiss'); }, autoDismissMs); // guard-ok: журнал автозакрытия
    return () => { if (shiver) clearTimeout(shiver); clearTimeout(away); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const toastStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, enter.value * 3), transform: [{ translateY: (1 - enter.value) * -70 }] }));

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none" testID={testID}>
      <Animated.View style={[s.toast, { top: insets.top + 12, backgroundColor: p.card }, sh.plate, toastStyle]} accessibilityLiveRegion="polite">
        <View style={s.faces} accessible={false}>
          <SpireRankCoin rank={rivalCoinRank} size={36} />
          <View style={s.faceMe}><SpireRankCoin rank={myCoinRank} size={36} /></View>
        </View>
        <View style={s.copy}>
          <Text style={[s.title, { color: p.text }]} numberOfLines={2} testID={`${testID}-title`}>{positionMomentText(lang, 'overtake', { name: rivalName })}</Text>
          <Text style={[s.sub, { color: p.textSecondary }]} testID={`${testID}-sub`}>{positionMomentText(lang, 'overtakeSub', { n: gapCoins })}</Text>
        </View>
        <V2Pressable onPress={() => fire(onPlay, 'play')} accessibilityRole="button" accessibilityLabel={momentText(lang, 'play')} style={[s.play, { backgroundColor: p.cta }]} testID={`${testID}-play`}>
          <Text style={[s.playText, { color: p.ctaText }]}>{momentText(lang, 'play')}</Text>
        </V2Pressable>
      </Animated.View>
      <View style={[s.coin, { top: Math.round(height * COIN_TOP_FRACTION) }]} pointerEvents="none">
        <MomentCoin rank={myCoinRank} size={96} mood={mood} emote={bang ? 'bang' : null} testID={`${testID}-coin`} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  // `.toast`: поля 20, радиус 18, отступы 12/14, зазор 12
  toast: { position: 'absolute', left: 20, right: 20, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14, borderRadius: 18 },
  faces: { flexDirection: 'row' },
  faceMe: { marginLeft: -10 },
  copy: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  sub: { fontSize: 13, lineHeight: 17 },
  play: { height: 40, borderRadius: 20, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  playText: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  coin: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

export default memo(SpireOvertakeToast);
