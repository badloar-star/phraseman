// ═══════════════════════════════════════════════════════════════════════════
// SpireAllMembers.tsx — «Все участники»: строки комнаты с зонами повышения/понижения.
//
// зачем: макет делит 30 строк на «Зона повышения / Остаются / Зона понижения». Размер
// зоны — не константа 5, а SPIRE_ZONE_RATIO (15%) от размера комнаты, как у правил
// сервера (spireLiveZoneSize); понижение забирает и всех с нулём ступеней (TOWER §4.5).
// Ранга монеты у участников в данных комнаты нет — вместо монеты кружок с инициалом.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import type { Lang } from '../../constants/i18n';
import { V2 } from '../../constants/v2Style';
import { SPIRE_ZONE_RATIO } from '../../modules/spire/residents';
import { V2ScreenHeader } from '../v2/V2Kit';
import { useSpirePalette } from './useSpirePalette';
import { SpireInitial } from './SpirePodium';
import { spireText } from './spire_strings';
import type { SpireMemberRow } from './spire_room_types';

type Zone = 'up' | 'stay' | 'down';

/** Раскладывает отсортированных участников по зонам (чистая функция — удобно тестировать). */
export function spireZonesFor(sorted: readonly SpireMemberRow[]): readonly Zone[] {
  const size = Math.max(1, Math.round(sorted.length * SPIRE_ZONE_RATIO));
  return sorted.map((m, i) => {
    if (i < size && m.steps > 0) return 'up';
    if (i >= sorted.length - size || m.steps === 0) return 'down';
    return 'stay';
  });
}

type Props = Readonly<{ lang: Lang; members: readonly SpireMemberRow[]; onBack: () => void }>;

function SpireAllMembers({ lang, members, onBack }: Props) {
  const p = useSpirePalette();
  const { rows, zones } = useMemo(() => {
    const sorted = [...members].sort((a, b) => b.steps - a.steps);
    return { rows: sorted, zones: spireZonesFor(sorted) };
  }, [members]);

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
            accessibilityLabel={`${i + 1}. ${m.name}${m.isMe ? `, ${spireText(lang, 'you')}` : ''}, ${m.steps} ${spireText(lang, 'steps')}`}
          >
            <Text style={[s.place, { color: p.textSecondary }]}>{i + 1}</Text>
            <SpireInitial name={m.name} size={40} />
            <View style={s.nameWrap}>
              <Text style={[s.name, { color: p.text }]}>{m.name}</Text>
              {m.isMe ? <View style={[s.you, { backgroundColor: p.cta }]}><Text style={[s.youText, { color: p.ctaText }]}>{spireText(lang, 'you')}</Text></View> : null}
            </View>
            {zone === 'up' ? <Ionicons name="arrow-up" size={16} color={p.correct} /> : null}
            {zone === 'down' ? <Ionicons name="arrow-down" size={16} color={p.wrong} /> : null}
            <Text style={[s.steps, { color: p.text }]}>{m.steps}<Text style={[s.stepsUnit, { color: p.textSecondary }]}> {spireText(lang, 'stepsShort')}</Text></Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <View style={s.root} testID="spire-all-screen">
      <View style={s.header}>
        <V2ScreenHeader title={spireText(lang, 'allMembers')} onBack={onBack} backLabel={spireText(lang, 'back')} />
      </View>
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {renderZone('up', spireText(lang, 'zoneUp'), p.correct)}
        {renderZone('stay', spireText(lang, 'zoneStay'), p.textSecondary)}
        {renderZone('down', spireText(lang, 'zoneDown'), p.wrong)}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  header: { paddingHorizontal: V2.screenPad, paddingTop: 12 },
  content: { paddingHorizontal: V2.screenPad, paddingBottom: 40 },
  zone: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 22, marginBottom: 10, marginHorizontal: 2 },
  zoneText: { fontSize: 13, fontWeight: '700', letterSpacing: 2 },
  zoneLine: { flex: 1, height: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 14, minHeight: 62, paddingVertical: 8, paddingLeft: 12, paddingRight: 14, borderRadius: 14 },
  place: { width: 26, textAlign: 'center', fontSize: 16, fontWeight: '700' },
  nameWrap: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { flexShrink: 1, fontSize: 17, fontWeight: '600' },
  you: { height: 20, paddingHorizontal: 8, borderRadius: 10, justifyContent: 'center' },
  youText: { fontSize: 11, fontWeight: '700' },
  steps: { fontSize: 16, fontWeight: '700' },
  stepsUnit: { fontSize: 13, fontWeight: '600' },
});

export default memo(SpireAllMembers);
