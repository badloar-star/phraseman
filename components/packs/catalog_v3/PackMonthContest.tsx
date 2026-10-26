// ═══════════════════════════════════════════════════════════════════════════
// PackMonthContest.tsx — «Набор месяца»: ОДИН игровой блок на сцене каталога — подиум топ-3, дни до конца, своё место.
//
// зачем (слово владельца 26.10: «конкурс — один игровой блок на сцене каталога; голос = лайк, участвуют все новые наборы месяца, призы — Plus и монеты»;
// «не заметки в айфоне, а сцена»): язык блока — тот же, что у «Комнаты недели» Пика: белое стекло блоков пьедестала (SPIRE_SCENE_BLOCK, первое место ярче),
// белый текст сцены (SPIRE_SCENE_INK), порядок 2-1-3, у лидера корона. Внутри — только заголовок, «N дн.», названия, сердца и место: подписей-расшифровок
// нет. Нажатие на колонку открывает набор. Пустые места — те же блоки приглушённо, чтобы высота не прыгала, пока наборов мало (скелет без «Загрузки…»).
// ═══════════════════════════════════════════════════════════════════════════
import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { Lang } from '../../../constants/i18n';
import { useScaledTextStyles } from '../../../hooks/useLineScale';
import { SPIRE_SCENE_BLOCK, SPIRE_SCENE_INK } from '../../spire/scene/spire_scene_palette';
import { colorWithAlpha } from '../../v2/plateAlpha';
import V2Pressable from '../../v2/V2Pressable';
import PackCoverV3 from './PackCoverV3';
import { packsCatalogV3Text } from './packs_catalog_v3_copy';
import type { ContestEntry, ContestStanding } from './packs_contest_model';
import { packCoverPaint, type PacksCatalogColors } from './packs_catalog_v3_tokens';

const TEXT_MAX_SCALE = 1.3;
/** Высоты блоков пьедестала по местам (1 — выше всех) и стороны обложек, dp. */
const BLOCK_H = { 1: 84, 2: 60, 3: 44 } as const;
const COVER = { 1: 60, 2: 48, 3: 48 } as const;
/** Порядок колонок на сцене: второй слева, первый в центре, третий справа. */
const COLUMN_ORDER = [2, 1, 3] as const;

type Place = 1 | 2 | 3;

type Props = Readonly<{
  lang: Lang;
  colors: PacksCatalogColors;
  standing: ContestStanding;
  titleOf: (packId: string) => string;
  onOpenPack: (id: string) => void;
}>;

const PILL = colorWithAlpha(SPIRE_SCENE_INK.text, 0.12);
const GHOST = colorWithAlpha(SPIRE_SCENE_INK.text, 0.06);

function Column({ lang, place, entry, colors, titleOf, onOpenPack }: Readonly<{ lang: Lang; place: Place; entry: ContestEntry | null; colors: PacksCatalogColors; titleOf: (id: string) => string; onOpenPack: (id: string) => void }>) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const paint = useMemo(() => (entry ? packCoverPaint(entry.id, colors) : null), [entry, colors]);
  const block = place === 1 ? SPIRE_SCENE_BLOCK.first : SPIRE_SCENE_BLOCK.regular;
  const inner = (
    <>
      <View style={s.head}>
        {place === 1 ? <Ionicons name="trophy" size={20} color={SPIRE_SCENE_INK.text} style={s.crown} /> : null}
        {paint ? <PackCoverV3 paint={paint} glyphSize={place === 1 ? 28 : 22} style={{ width: COVER[place], height: COVER[place], borderRadius: COVER[place] / 3 }} /> : <View style={[{ width: COVER[place], height: COVER[place], borderRadius: COVER[place] / 3 }, s.ghost]} />}
        <Text style={ts.title} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{entry ? titleOf(entry.id) : ' '}</Text>
        <View style={s.likes}>
          <Ionicons name="heart" size={16} color={SPIRE_SCENE_INK.text} style={entry ? null : s.hidden} />
          <Text style={ts.num} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{entry ? entry.likes : ' '}</Text>
        </View>
      </View>
      <View style={[s.block, { height: BLOCK_H[place] }]}>
        <LinearGradient colors={[...block]} locations={[...SPIRE_SCENE_BLOCK.locations]} style={StyleSheet.absoluteFill} />
        <Text style={ts.place} maxFontSizeMultiplier={1}>{place}</Text>
      </View>
    </>
  );
  if (!entry) return <View style={s.col} testID={`packs-v3-contest-empty-${place}`}>{inner}</View>;
  return (
    <V2Pressable testID={`packs-v3-contest-${place}`} accessibilityLabel={`${place}. ${titleOf(entry.id)}, ${entry.likes} ${packsCatalogV3Text(lang, 'likesA11y')}`} onPress={() => onOpenPack(entry.id)} scaleTo={0.97} outerStyle={s.col} style={s.colInner}>
      {inner}
    </V2Pressable>
  );
}

function PackMonthContest({ lang, colors, standing, titleOf, onOpenPack }: Props) {
  const ts = useScaledTextStyles(s, TEXT_MAX_SCALE);
  const by = (place: Place): ContestEntry | null => standing.podium[place - 1] ?? null;
  const myText = standing.myPlace !== null ? packsCatalogV3Text(lang, 'myPlace', standing.myPlace) : packsCatalogV3Text(lang, 'notInContest');
  return (
    <View testID="packs-v3-contest" style={s.wrap}>
      <View style={s.top}>
        <Ionicons name="trophy-outline" size={22} color={SPIRE_SCENE_INK.text} />
        <Text style={[ts.heading, s.grow]} numberOfLines={1} maxFontSizeMultiplier={TEXT_MAX_SCALE} accessibilityRole="header">{packsCatalogV3Text(lang, 'contestTitle')}</Text>
        <View style={s.days} testID="packs-v3-contest-days">
          <Ionicons name="time-outline" size={16} color={SPIRE_SCENE_INK.text} />
          <Text style={ts.num} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{packsCatalogV3Text(lang, 'daysLeft', standing.daysLeft)}</Text>
        </View>
      </View>
      <View style={s.podium}>
        {COLUMN_ORDER.map((place) => <Column key={place} lang={lang} place={place} entry={by(place)} colors={colors} titleOf={titleOf} onOpenPack={onOpenPack} />)}
      </View>
      <View style={s.me} testID="packs-v3-contest-me">
        {standing.myPlace !== null ? <Ionicons name="heart" size={16} color={SPIRE_SCENE_INK.text} /> : null}
        <Text style={[ts.meText, s.grow]} numberOfLines={2} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{myText}</Text>
        {standing.myPlace !== null ? <Text style={ts.num} maxFontSizeMultiplier={TEXT_MAX_SCALE}>{standing.myLikes}</Text> : null}
      </View>
    </View>
  );
}

export default memo(PackMonthContest);

const s = StyleSheet.create({
  wrap: { paddingTop: 4 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  grow: { flex: 1 },
  heading: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: SPIRE_SCENE_INK.text, letterSpacing: -0.3 },
  days: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 36, paddingHorizontal: 12, borderRadius: 18, backgroundColor: PILL },
  podium: { marginTop: 10, flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1 },
  colInner: { alignItems: 'stretch' },
  head: { alignItems: 'center', gap: 6, paddingBottom: 8 },
  crown: { marginBottom: -2 },
  ghost: { backgroundColor: GHOST },
  hidden: { opacity: 0 },
  title: { alignSelf: 'stretch', textAlign: 'center', fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  likes: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  num: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text, fontVariant: ['tabular-nums'] },
  block: { borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-start', paddingTop: 8 },
  place: { fontSize: 26, lineHeight: 32, fontWeight: '800', color: SPIRE_SCENE_INK.text },
  meText: { fontSize: 13, lineHeight: 18, fontWeight: '700', color: SPIRE_SCENE_INK.text },
  me: { marginTop: 12, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRadius: 22, backgroundColor: PILL },
});
