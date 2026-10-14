// ═══════════════════════════════════════════════════════════════════════════
// MomentStay.tsx — момент m02 «Удержался в лиге» (эталон engagement-moments-v3-all.html, m02; снимок C:/Temp/claude/sec6/m0123.png, средний кадр).
//
// зачем (владелец 14.10: «перенести точно по макетам»; D190/D191): окно как GlassAlertDialog поверх Главной (итог недели — при первом открытии после закрытия недели):
// монета кивает «Держимся.», место и дистанция до топ-5 — в МОНЕТАХ недели (D162). Окно: затемнение 0,62, карточка по центру (поля 20, радиус 28, отступы 26/22/22),
// монета 80, заголовок 27/32/700, текст 16/22 (вторичный, цифра дистанции — основным), кнопка «Играть» без стрелки. Анимация: окно пружиной 520 мс, кивок + реплика с 0,4 с;
// reduceMotion — сразу в конечном виде. Монеты НЕ начисляет и ничего не пишет: компонент только показывает результат, пришедший пропсами. Где и когда показывать — решает Ядро (флаг moments_v3).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { Easing, FadeIn, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { spireTierName } from '../../../modules/spire/tier_names';
import { hapticTap } from '../../../hooks/use-haptics';
import { V2Button } from '../../v2/V2Kit';
import { useSpirePalette } from '../useSpirePalette';
import { PlateFill, plateBoxShadow, sheetPlateTokens, useShadowGlass } from '../../v2/ShadowSurface';
import { MomentCoin } from './moments_coin';
import { MOMENT_DIM_COLOR } from './moments_layout';
import { MOMENT_SOUND_EVENTS, playMomentSound } from './moments_sound';
import { momentLeagueIn, momentNumber, momentText } from './moments_strings';

export type MomentStayProps = Readonly<{
  lang: Lang;
  /** Лига, в которой человек остаётся (индекс 0…11). */
  tier: number;
  /** Ранг монеты человека 0…19 (null — базовая монета). */
  coinRank: number | null;
  /** Место в комнате недели. */
  place: number;
  /** Монеты недели человека (все режимы, D162). */
  weekCoins: number;
  /** Сколько монет не хватило до топ-5. */
  /** Сколько монет не хватило до топ-5. зачем (Ядро 14.10): сервер присылает границу зоны только с 17.10 — нет поля → строки «До топ-5 не хватило N» нет, остальное окно как есть. */
  gapToTop5?: number;
  onPlay: () => void;
  testID?: string;
}>;

/** Тайминг эталона: кивок и реплика «Держимся.» — через 400 мс после появления окна. */
export const MOMENT_STAY_SAY_DELAY_MS = 400;
const GAP_MARK = '\u0001';

function MomentStay({ lang, tier, coinRank, place, weekCoins, gapToTop5, onPlay, testID = 'moment-stay' }: MomentStayProps) {
  const p = useSpirePalette();
  // зачем (гейт Макетов, круг 1, m02 п. 3): окно эталона светлее фона — заливка шторки (`.modal`: градиент sheetplate1 → sheetplate2) и тень шторки, а не плита карточки
  const gs = sheetPlateTokens(useShadowGlass());
  const reduceMotion = useReducedMotion();
  const [saying, setSaying] = useState(reduceMotion);
  const pop = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (__DEV__) console.log(`[MOMENT-STAY] показ tier=${tier} место=${place} монеты=${weekCoins} до_топ5=${gapToTop5} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    playMomentSound(MOMENT_SOUND_EVENTS.stayFlip);
    void hapticTap();
    if (!reduceMotion) pop.value = withTiming(1, { duration: 520, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
    const t = reduceMotion ? null : setTimeout(() => { setSaying(true); playMomentSound(MOMENT_SOUND_EVENTS.stayTick); }, MOMENT_STAY_SAY_DELAY_MS);
    return () => { if (t) clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: показ один раз на монтирование, пропсы не перезапускают анимацию
  }, []);

  const cardStyle = useAnimatedStyle(() => ({ opacity: Math.min(1, pop.value * 1.6), transform: [{ scale: 0.9 + 0.1 * pop.value }] }));
  const league = momentLeagueIn(lang, tier, spireTierName(tier, lang));
  const hasGap = gapToTop5 !== undefined;
  const [bodyBefore, bodyAfter] = hasGap
    ? momentText(lang, 'stayBody', { place, coins: momentNumber(weekCoins), gap: GAP_MARK }).split(GAP_MARK)
    : [momentText(lang, 'stayBodyNoGap', { place, coins: momentNumber(weekCoins) }), ''];

  return (
    <View style={s.root} testID={testID} accessibilityViewIsModal>
      <Animated.View entering={reduceMotion ? undefined : FadeIn.duration(320)} style={[StyleSheet.absoluteFill, { backgroundColor: MOMENT_DIM_COLOR }]} pointerEvents="none" />
      <Animated.View style={[s.card, { boxShadow: plateBoxShadow(gs) }, cardStyle]}>
        <PlateFill g={gs} radius={28} />
        <View style={s.coinWrap}>
          <MomentCoin rank={coinRank} size={80} mood={saying ? 'nod' : 'idle'} say={saying ? momentText(lang, 'staySay') : undefined} testID={`${testID}-coin`} />
        </View>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{momentText(lang, 'stayTitle', { league })}</Text>
        <Text style={[s.body, { color: p.textSecondary }]}>
          {bodyBefore}
          {hasGap ? <Text style={[s.bold, { color: p.text }]}>{momentNumber(gapToTop5)}</Text> : null}
          {bodyAfter ?? ''}
        </Text>
        <View style={s.acts}>
          <V2Button label={momentText(lang, 'play')} onPress={onPlay} testID={`${testID}-play`} />
        </View>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', paddingHorizontal: 20 },
  // `.modal`: поля 20, радиус 28, отступы 26/22/22
  card: { borderRadius: 28, paddingTop: 26, paddingHorizontal: 22, paddingBottom: 22, alignItems: 'center' },
  // монета 80 + место под реплику над ней (пузырь стоит над монетой)
  coinWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 42 },
  // `.h-lg`: 27/32/700, отступ сверху 12
  title: { marginTop: 12, fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.4, textAlign: 'center' },
  // `.p`: 16/22
  body: { marginTop: 8, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  bold: { fontWeight: '600' },
  acts: { alignSelf: 'stretch', marginTop: 20 },
});

export default memo(MomentStay);
