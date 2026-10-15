// ═══════════════════════════════════════════════════════════════════════════
// SpireWeekResultCard.tsx — «Итог недели» карточкой на главном экране Шпиля (макет §9).
//
// зачем (владелец: «при первом заходе новой недели — карточка фактом, не модалка»):
// данные — документ spire_week_results, который записал крон (решения о повышении
// и понижении принимает только сервер). Крестика нет (владелец 13.10): карточка показывается один раз — при первом входе на новой неделе,
// отметку ставит spire_week_result_client. Глаголы в настоящем времени — род игрока не угадываем.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Reanimated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withSequence, withTiming } from 'react-native-reanimated';
import { useReduceMotion } from '../../hooks/use_reduce_motion';
import type { Lang } from '../../constants/i18n';
import type { SpireWeekResultView } from '../../app/spire/spire_week_result_client';
import { spireTierName } from '../../modules/spire/tier_names';
import { spireSkinForTier } from '../../modules/spire/tower_skins';
import AvatarView from '../AvatarView';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import SpireTowerSvg from './SpireTowerSvg';
import { spireWeekTopViewBox } from './spire_tower_bounds';
import { SPIRE_FLOOR_COUNT } from './spire_tower_model';
import { spireText } from './spire_strings';
import { spireCoinsCount, spireStepsCount } from './spire_plurals';
import { spireGameText } from './spire_game_strings';
import { useMomentsV3Enabled } from '../streak/moments/use_moments_v3_flag';
import { hapticSuccess } from '../../hooks/use-haptics';

type Props = Readonly<{ lang: Lang; result: SpireWeekResultView; myCoinRank: number | null }>;

const noop = (): void => undefined;

export function spireWeekResultLines(lang: Lang, r: SpireWeekResultView): Readonly<{ title: string; sub: string }> {
  const stone = spireTierName(r.newTier, lang);
  const title = r.promoted ? spireGameText(lang, 'weekUp', { stone }) // guard-ok: показ решения сервера
    : r.demoted ? spireGameText(lang, 'weekDown', { stone }) : spireGameText(lang, 'weekStay', { stone }); // guard-ok: показ решения сервера
  const parts = [
    r.roomRank > 0 ? spireGameText(lang, 'placeN', { n: r.roomRank }) : '—',
    // зачем (D162): итог по монетам недели — показываем монеты, иначе ступени (как решал сервер)
    r.rankBy === 'coins' ? spireCoinsCount(lang, r.weekCoins ?? 0) : spireStepsCount(lang, r.steps),
  ];
  const coins = [r.placeCoins, r.promotionCoins].filter((c) => c > 0);
  if (coins.length > 0) parts.push(`${coins.map((c) => `+${c}`).join(' · ')} ${spireGameText(lang, 'coins')}`);
  else parts.push(spireGameText(lang, 'newWeekFromOne'));
  return { title, sub: parts.join(' · ') };
}

// зачем (макет «Итог недели», Макеты 13.10): слева вместо монеты 52 — верхушка башни лиги НОВОЙ недели 58×103; монета ранга 26 — значок справа снизу с кольцом цвета карточки
// зачем (закон владельца 14.10, «пик башни не обрезается, свет тоже»): высота блока башни фиксирована, ширина — из границы башни (острие, навершие, ореол ×2.6):
// нет места — башня меньше, но не режется. Раньше ширина 58 и viewBox «верх этажа − 236» резали навершие и ореол.
const TOWER_H = 112;
// зачем (координатор 15.10, m04 A по эталону v3 за moments_v3): башня «выпрыгивает» на 0,2 с — emPop 600 мс (scale .55 → 1,12 → 1, cubic-bezier(.3,1.6,.5,1)),
// хаптик успеха и звук new_week; флаг выключен — прежняя пружина без звука, ни пикселя разницы
export const WEEK_CARD_POP = { delay: 200, duration: 600, from: 0.55, peak: 1.12 } as const;
const LOG = '[MOMENT-m04]';

function playNewWeek(): void {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { isSoundV2Enabled } = require('../../modules/sound_v2/sound_v2_flag') as typeof import('../../modules/sound_v2/sound_v2_flag');
    if (!isSoundV2Enabled()) { console.log(`${LOG} звук new_week пропущен: sound_v2 выключен (запасного звука у события нет)`); return; } // guard-ok: ветка без звука
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { playEvent } = require('../../modules/sound_v2/sound_bank') as typeof import('../../modules/sound_v2/sound_bank');
    const result = playEvent('new_week');
    if (!result.played) console.log(`${LOG} звук new_week не сыграл: ${String(result.reason)}`); // guard-ok: причина отказа движка
  } catch (error) {
    console.warn(`${LOG} звук new_week не сыграл (${error instanceof Error ? error.message : String(error)})`); // guard-ok: причина отказа
  }
}

/** m04 v3: башня с монетой — emPop эталона на 0,2 с, хаптик и звук один раз за показ карточки. */
const WeekPopV3 = memo(function WeekPopV3({ reduceMotion, style, children }: { reduceMotion: boolean; style: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const v = useSharedValue(reduceMotion ? 1 : 0);
  useEffect(() => {
    console.log(`${LOG} показ карточки «Итог недели»: reduceMotion=${String(reduceMotion)}`); // guard-ok: единичный журнал показа
    if (reduceMotion) return undefined;
    const ease = Easing.bezier(0.3, 1.6, 0.5, 1);
    v.value = withDelay(WEEK_CARD_POP.delay, withSequence(withTiming(0.7, { duration: WEEK_CARD_POP.duration * 0.7, easing: ease }), withTiming(1, { duration: WEEK_CARD_POP.duration * 0.3, easing: ease })));
    const id = setTimeout(() => {
      hapticSuccess().catch((error: unknown) => console.warn(`${LOG} хаптик не сработал (${error instanceof Error ? error.message : String(error)})`));
      playNewWeek();
    }, WEEK_CARD_POP.delay);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- зачем: «выпрыгивает» один раз за показ
  }, []);
  const st = useAnimatedStyle(() => {
    const k = v.value;
    const scale = k <= 0.7 ? WEEK_CARD_POP.from + (WEEK_CARD_POP.peak - WEEK_CARD_POP.from) * (k / 0.7) : WEEK_CARD_POP.peak - (WEEK_CARD_POP.peak - 1) * ((k - 0.7) / 0.3);
    return { opacity: Math.min(1, k / 0.7), transform: [{ scale }] };
  });
  return <Reanimated.View style={[style, st]} testID="spire-week-result-pop" pointerEvents="none">{children}</Reanimated.View>;
});
const COIN = 26;
const COIN_RING = 3;

function SpireWeekResultCard({ lang, result, myCoinRank }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const { title, sub } = spireWeekResultLines(lang, result);
  // зачем: наряд по newTier, состояние окон — по решению сервера: повышение = «вершина недели» (окна горят, свечение ×2.6), остаёшься и понижение = окна тёмные
  const skin = useMemo(() => spireSkinForTier(result.newTier), [result.newTier]);
  const towerFloor = result.promoted ? SPIRE_FLOOR_COUNT : 1;
  const weekVb = useMemo(() => spireWeekTopViewBox(skin, towerFloor === SPIRE_FLOOR_COUNT), [skin, towerFloor]);
  const towerW = Math.round((TOWER_H * weekVb.w) / weekVb.h);
  // зачем (макет community.html COM-SPIRE-WEEK, anim-pop): блок башни с монетой «выпрыгивает» один раз
  // при появлении карточки. Нативный драйвер, без цикла; «уменьшить движение» — сразу на месте.
  const reduceMotion = useReduceMotion();
  const momentsV3 = useMomentsV3Enabled();
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (momentsV3) return; // зачем (m04 v3): анимацию ведёт WeekPopV3
    if (reduceMotion) { pop.setValue(1); return; }
    Animated.spring(pop, { toValue: 1, stiffness: 240, damping: 14, mass: 0.9, useNativeDriver: true }).start();
  }, [momentsV3, pop, reduceMotion]);
  const popStyle = {
    opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
  };
  const towerAndCoin = (
    <>
      <SpireTowerSvg variant="weekTop" lang={lang} myFloor={towerFloor} selected={0} onSelect={noop} width={towerW} skin={skin} />
      {myCoinRank !== null ? (
        <View style={[s.coin, { backgroundColor: p.cardRaised }]}>
          <AvatarView avatar="" coinRank={myCoinRank} size={COIN} />
        </View>
      ) : null}
    </>
  );
  return (
    <View style={[s.card, { backgroundColor: p.cardRaised }, sh.plate]} accessible={false} testID="spire-week-result">
      {momentsV3 ? (
        <WeekPopV3 reduceMotion={reduceMotion} style={[s.tower, { width: towerW }]}>{towerAndCoin}</WeekPopV3>
      ) : (
        <Animated.View style={[s.tower, { width: towerW }, popStyle]} testID="spire-week-result-pop" pointerEvents="none">
          {towerAndCoin}
        </Animated.View>
      )}
      <View style={s.text} accessible accessibilityLabel={`${spireGameText(lang, 'weekResult')}. ${title}. ${sub}`}>
        <Text style={[s.over, { color: p.textSecondary }]}>{spireGameText(lang, 'weekResult').toUpperCase()}</Text>
        <Text style={[s.title, { color: p.text }]}>{title}</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>{sub}</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { marginTop: 16, borderRadius: 20, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14 },
  tower: { height: TOWER_H },
  // кольцо цветом карточки вокруг монеты: плотный круг-подложка, а не рамка
  coin: { position: 'absolute', right: -6 - COIN_RING, bottom: -2 - COIN_RING, padding: COIN_RING, borderRadius: (COIN + COIN_RING * 2) / 2 },
  text: { flex: 1, minWidth: 0 },
  over: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  title: { fontSize: 19, lineHeight: 24, fontWeight: '700', marginTop: 6 },
  sub: { fontSize: 16, lineHeight: 21, marginTop: 4 },
});

export default memo(SpireWeekResultCard);
