// ═══════════════════════════════════════════════════════════════════════════
// SpireAllMembers.tsx — «Все участники»: строки комнаты с зонами повышения/понижения.
//
// зачем: макет делит 30 строк на «Зона повышения / Остаются / Зона понижения». Размер
// зоны — не константа 5, а SPIRE_ZONE_RATIO (15%) от размера комнаты, как у правил
// сервера (spireLiveZoneSize); понижение забирает и всех с нулём ступеней (TOWER §4.5).
// Ранга монеты у участников в данных комнаты нет — вместо монеты кружок с инициалом.
// Пакет B (30.09): строки — живая комната недели (живые + боты формулой + свои локальные
// ступени); шапка своя, без обрезки текста в одну строку (подпись «камень · N человек»).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { SPIRE_ZONE_RATIO } from '../../modules/spire/residents';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import SpireRankCoin from './SpireRankCoin';
import { spireText } from './spire_strings';
import { spireCoinsCount, spireGroupThousands, spireStepsCount, spireStepsShort } from './spire_plurals';
import { spireMemberScored, spireSortMembers, type SpireMemberRow, type SpireRankByView } from './spire_room_types';
import { runeWord } from '../../constants/runes';

type Zone = 'up' | 'stay' | 'down';

/** Раскладывает отсортированных участников по зонам (чистая функция — удобно тестировать). */
export function spireZonesFor(sorted: readonly SpireMemberRow[], rankBy: SpireRankByView = 'steps'): readonly Zone[] {
  const size = Math.max(1, Math.round(sorted.length * SPIRE_ZONE_RATIO));
  return sorted.map((m, i) => {
    const scored = spireMemberScored(m, rankBy);
    if (i < size && scored) return 'up';
    if (i >= sorted.length - size || !scored) return 'down';
    return 'stay';
  });
}

type Props = Readonly<{ lang: Lang; members: readonly SpireMemberRow[]; subtitle?: string; onBack: () => void; rankBy?: SpireRankByView }>;

function SpireAllMembers({ lang, members, subtitle, onBack, rankBy = 'steps' }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const { rows, zones } = useMemo(() => {
    const sorted = spireSortMembers(members, rankBy);
    return { rows: sorted, zones: spireZonesFor(sorted, rankBy) };
  }, [members, rankBy]);

  const renderZone = (zone: Zone, label: string, color: string) => {
    const items = rows.map((m, i) => ({ m, i })).filter(({ i }) => zones[i] === zone);
    if (items.length === 0) return null;
    return (
      <View key={zone}>
        <View style={s.zone}>
          <Text style={[s.zoneText, { color }]}>{label.toUpperCase()}</Text>
          <View style={[s.zoneLine, { backgroundColor: p.hairline }]} />
        </View>
        {items.map(({ m, i }) => (
          <View
            key={m.uid}
            style={[s.row, m.isMe ? { backgroundColor: p.cardRaised } : null]}
            accessible
            accessibilityLabel={`${i + 1}. ${m.name}${m.isMe ? `, ${spireText(lang, 'you')}` : ''}, ${rankBy === 'coins' ? spireCoinsCount(lang, m.weekCoins ?? 0) : spireStepsCount(lang, m.steps)}`}
          >
            <Text style={[s.place, { color: p.textSecondary }]}>{i + 1}</Text>
            <SpireRankCoin rank={m.coinRank} size={40} />
            <View style={s.nameWrap}>
              <Text style={[s.name, { color: p.text }]}>{m.name}</Text>
              {m.isMe ? <View style={[s.you, { backgroundColor: p.cta }]}><Text style={[s.youText, { color: p.ctaText }]}>{spireText(lang, 'you')}</Text></View> : null}
            </View>
            {zone === 'up' ? <Ionicons name="arrow-up" size={16} color={p.correct} /> : null}
            {zone === 'down' ? <Ionicons name="arrow-down" size={16} color={p.wrong} /> : null}
            <Text style={[s.steps, { color: p.text }]}>{rankBy === 'coins' ? spireGroupThousands(m.weekCoins ?? 0) : m.steps}<Text style={[s.stepsUnit, { color: p.textSecondary }]}> {rankBy === 'coins' ? runeWord(lang, m.weekCoins ?? 0) : spireStepsShort(lang, m.steps)}</Text></Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={s.root} testID="spire-all-screen">
      <View style={s.header}>
        <V2Pressable onPress={onBack} accessibilityRole="button" accessibilityLabel={spireText(lang, 'back')} style={[s.back, { backgroundColor: p.control }, sh.nested]} testID="spire-all-back">
          <Ionicons name="chevron-back" size={20} color={p.text} />
        </V2Pressable>
        <View style={s.headText}>
          <Text accessibilityRole="header" style={[s.headTitle, { color: p.text }]}>{spireText(lang, 'allMembers')}</Text>
          {subtitle ? <Text style={[s.headSub, { color: p.textSecondary }]}>{subtitle}</Text> : null}
        </View>
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false} decelerationRate="fast">
        {renderZone('up', spireText(lang, 'zoneUp'), p.correct)}
        {renderZone('stay', spireText(lang, 'zoneStay'), p.textSecondary)}
        {renderZone('down', spireText(lang, 'zoneDown'), p.wrong)}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: V2.screenPad, paddingTop: 12, flexDirection: 'row', alignItems: 'center', gap: 18 },
  back: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  headText: { flex: 1, minWidth: 0 },
  headTitle: { fontSize: 26, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  headSub: { fontSize: 16, lineHeight: 20, marginTop: 2 },
  content: { paddingHorizontal: V2.screenPad, paddingBottom: 40 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 10, marginHorizontal: 2 },
  zoneText: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  zoneLine: { flex: 1, height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 62, paddingVertical: 8, paddingLeft: 12, paddingRight: 14, borderRadius: 14 },
  place: { minWidth: 26, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  nameWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 16, fontWeight: '700' },
  you: { minHeight: 20, paddingHorizontal: 8, borderRadius: 10, justifyContent: 'center' },
  youText: { fontSize: 13, fontWeight: '700' },
  steps: { fontSize: 16, fontWeight: '700' },
  stepsUnit: { fontSize: 13, fontWeight: '600' },
});

export default memo(SpireAllMembers);
