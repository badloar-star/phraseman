// ═══════════════════════════════════════════════════════════════════════════
// MomentPromotionShort.tsx — момент m01, вариант B «Короткая: для повторных повышений» (эталон engagement-moments-v3-all.html, m01 B; лист приёмки CHECKLIST_m01.md → «Вариант B»).
//
// зачем (владелец 14.10: «перенести точно по макетам»; координатор 15.10: вариант B утверждён; Ядро 4d5fefbcf: признак isRepeatPromotion = promoted && prevTier ≥ 1): кто поднимается из 1+ лиги, уже повышался — три акта
// ему не нужны. Монета cheer + искры на 0,4 с; на 0,9 с — фейерверк и дрожь 700 мс; тексты по очереди (надпись «Топ-5 · {Лига}» 0,42 с · «Поднимаешься» 0,65 с · строка «5 место · 470 монет за неделю · +100» 0,81 с),
// кнопки «Играть» и «Поделиться» на 1,04 с. Монеты за повышение начисляет ночной крон — компонент ничего не начисляет и не пишет; «Поделиться» отдаёт готовый текст наружу (системное окно — на стороне хоста,
// без отправки данных на наш сервер). reduceMotion — сразу итоговый кадр. Анимации на UI-потоке (Reanimated).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion } from 'react-native-reanimated';
import type { Lang } from '../../../constants/i18n';
import { hapticHeavyImpact, hapticSuccess } from '../../../hooks/use-haptics';
import { spireTierName } from '../../../modules/spire/tier_names';
import { useStableSafeAreaInsets } from '../../../app/stable_safe_area_metrics';
import { useFireOnce } from '../../moments/use_fire_once';
import { streakMomentText } from '../../streak/moments/streak_moments_strings';
import { V2Button } from '../../v2/V2Kit';
import { useSpirePalette } from '../useSpirePalette';
import MomentFirework, { useMomentRumble } from './moments_effects';
import { MomentCoin } from './moments_coin';
import { MomentFullScreen } from './moments_layout';
import { MOMENT_SOUND_EVENTS, playMomentSound } from './moments_sound';
import { momentNumber, momentText } from './moments_strings';
import { MOMENT_TITLE_MAX_FONT_SCALE } from '../../moments/title_scale';

/** Тайминги эталона (вариант B), мс: монета cheer + искры 400 · фейерверк, дрожь, итог 900 · тексты 422/648/813 · кнопки 1044. */
export const MOMENT_PROMO_SHORT_TIMELINE = { cheer: 400, final: 900, overline: 422, title: 648, body: 813, buttons: 1044 } as const;
const DESIGN_W = 390;

export type MomentPromotionShortProps = Readonly<{
  lang: Lang;
  /** Лига, В КОТОРУЮ поднимаемся (индекс 0…11). */
  toTier: number;
  /** Моё место в комнате (1…30). */
  myPlace: number;
  /** Мой ранг монеты 0…19 (null — базовая). */
  myCoinRank: number | null;
  /** Монеты недели; undefined — нет данных (строка без монет). */
  weekCoins?: number;
  /** Монеты за повышение — число сервера (promotionCoins); 0 — «+N» не показываем. */
  bonusCoins: number;
  onPlay: () => void;
  /** «Поделиться»: хост открывает системное окно (повтор допустим — хост сам не даёт открыть два окна сразу). Нет колбэка — кнопки нет. */
  onShare?: () => void;
  testID?: string;
}>;

/** Строка под заголовком: «5 место · 470 монет за неделю · +100»; нет монет недели — только место. */
export function promotionShortBody(lang: Lang, place: number, weekCoins: number | undefined, bonusCoins: number): string {
  if (weekCoins === undefined || weekCoins <= 0) return momentText(lang, 'promoShortPlaceOnly', { place });
  const base = momentText(lang, 'promoShortBody', { place, coins: momentNumber(weekCoins) });
  return bonusCoins > 0 ? `${base} · +${momentNumber(bonusCoins)}` : base;
}

function MomentPromotionShort({ lang, toTier, myPlace, myCoinRank, weekCoins, bonusCoins, onPlay, onShare, testID = 'moment-promotion-short' }: MomentPromotionShortProps) {
  const p = useSpirePalette();
  const reduceMotion = useReducedMotion();
  const insets = useStableSafeAreaInsets();
  const rumble = useMomentRumble();
  const fire = useFireOnce('MOMENT-PROMO-SHORT');
  const [cheer, setCheer] = useState(reduceMotion);
  const [boom, setBoom] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const league = spireTierName(toTier, lang);
  const T = MOMENT_PROMO_SHORT_TIMELINE;

  useEffect(() => {
    console.log(`[MOMENT-PROMO-SHORT] показ лига=${toTier} место=${myPlace} монеты=${String(weekCoins)} бонус=${bonusCoins} поделиться=${String(Boolean(onShare))} reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный лог показа
    if (reduceMotion) return undefined;
    timers.current.push(setTimeout(() => { setCheer(true); playMomentSound(MOMENT_SOUND_EVENTS.promoCorrect); void hapticSuccess(); }, T.cheer));
    timers.current.push(setTimeout(() => { setBoom(true); rumble.play(); playMomentSound(MOMENT_SOUND_EVENTS.promoDone); void hapticHeavyImpact(); }, T.final));
    return () => { timers.current.forEach(clearTimeout); timers.current = []; };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: сценарий играет один раз на показ
  }, []);

  const beat = (delay: number) => (reduceMotion ? undefined : FadeIn.delay(delay).duration(400));
  const fw = 390 / DESIGN_W;

  return (
    <MomentFullScreen testID={testID} glowTop="30%">
      <Animated.View style={[s.stage, rumble.style]}>
        <View style={s.center}>
          <MomentCoin rank={myCoinRank} size={120} mood={cheer ? 'cheer' : 'idle'} glints emote={cheer ? 'star' : null} emoteCount={4} testID={`${testID}-coin`} />
          <Animated.Text entering={beat(T.overline)} style={[s.ov, { color: p.accentTextSafe }]} testID={`${testID}-overline`}>{momentText(lang, 'promoShortOverline', { league }).toUpperCase()}</Animated.Text>
          <Animated.Text entering={beat(T.title)} accessibilityRole="header" maxFontSizeMultiplier={MOMENT_TITLE_MAX_FONT_SCALE} style={[s.title, { color: p.text }]} testID={`${testID}-title`}>{momentText(lang, 'promoShortTitle')}</Animated.Text>
          <Animated.Text entering={beat(T.body)} style={[s.body, { color: p.textSecondary }]} testID={`${testID}-body`}>{promotionShortBody(lang, myPlace, weekCoins, bonusCoins)}</Animated.Text>
        </View>
        <Animated.View entering={beat(T.buttons)} style={[s.dock, { paddingBottom: Math.max(insets.bottom, 12) + 24 }]}>
          <V2Button label={momentText(lang, 'play')} icon="arrow-forward" onPress={() => fire(onPlay, 'play')} testID={`${testID}-play`} />
          {onShare ? (
            <>
              <View style={s.gap} />
              <V2Button label={streakMomentText(lang, 'share')} variant="secondary" onPress={onShare} testID={`${testID}-share`} />
            </>
          ) : null}
        </Animated.View>
        <MomentFirework fire={boom} x={195 * fw} y={130} r={110} />
        <MomentFirework fire={boom} x={120 * fw} y={200} r={70} delayMs={250} />
        <MomentFirework fire={boom} x={270 * fw} y={180} r={80} delayMs={450} />
      </Animated.View>
    </MomentFullScreen>
  );
}

const s = StyleSheet.create({
  stage: { flex: 1 },
  // `.full`: колонка по центру, поля 24; монета 120, затем надпись (отступ 20), заголовок (6), строка (6)
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  ov: { marginTop: 20, fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 1.4, textAlign: 'center' },
  title: { marginTop: 6, fontSize: 34, lineHeight: 40, fontWeight: '800', letterSpacing: -0.6, textAlign: 'center' },
  body: { marginTop: 6, fontSize: 16, lineHeight: 22, textAlign: 'center' },
  // кнопки: поля 24, между ними 24 (эталон: «Играть» y751, «Поделиться» y827)
  dock: { position: 'absolute', left: 24, right: 24, bottom: 0 },
  gap: { height: 24 },
});

export default memo(MomentPromotionShort);
