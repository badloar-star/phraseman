// ═══════════════════════════════════════════════════════════════════════════
// SpireWeekResultCard.tsx — «Итог недели» карточкой на главном экране Шпиля (макет §9).
//
// зачем (владелец: «при первом заходе новой недели — карточка фактом, не модалка»):
// данные — документ spire_week_results, который записал крон (решения о повышении
// и понижении принимает только сервер). Крестика нет (владелец 13.10): карточка показывается один раз — при первом входе на новой неделе,
// отметку ставит spire_week_result_client. Глаголы в настоящем времени — род игрока не угадываем.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
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
  const pop = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;
  useEffect(() => {
    if (reduceMotion) { pop.setValue(1); return; }
    Animated.spring(pop, { toValue: 1, stiffness: 240, damping: 14, mass: 0.9, useNativeDriver: true }).start();
  }, [pop, reduceMotion]);
  const popStyle = {
    opacity: pop.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] }) }],
  };
  return (
    <View style={[s.card, { backgroundColor: p.cardRaised }, sh.plate]} accessible={false} testID="spire-week-result">
      <Animated.View style={[s.tower, { width: towerW }, popStyle]} testID="spire-week-result-pop" pointerEvents="none">
        <SpireTowerSvg variant="weekTop" lang={lang} myFloor={towerFloor} selected={0} onSelect={noop} width={towerW} skin={skin} />
        {myCoinRank !== null ? (
          <View style={[s.coin, { backgroundColor: p.cardRaised }]}>
            <AvatarView avatar="" coinRank={myCoinRank} size={COIN} />
          </View>
        ) : null}
      </Animated.View>
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
