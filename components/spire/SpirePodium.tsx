// ═══════════════════════════════════════════════════════════════════════════
// SpirePodium.tsx — «Комната недели»: пьедестал топ-3 и кнопка «Все участники» (пакет C).
//
// зачем: макет рисует 30 человек и «ты 7-й». Комнату недели пока никто не читает
// (пакет B), поэтому без списка участников секция честно показывает «—» вместо числа
// людей, пьедестала и места, а кнопка «Все участники» неактивна.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { V2_TYPE } from '../../constants/v2Style';
import V2Pressable from '../v2/V2Pressable';
import { useSpirePalette } from './useSpirePalette';
import { spireText } from './spire_strings';
import type { SpireMemberRow } from './spire_room_types';

type Props = Readonly<{
  lang: Lang;
  /** null = комната недели недоступна (нет источника данных). */
  members: readonly SpireMemberRow[] | null;
  onOpenAll: () => void;
}>;

/** Кружок-заглушка с инициалом: ранга монеты у участника комнаты в данных нет. */
export function SpireInitial({ name, size }: Readonly<{ name: string; size: number }>) {
  const p = useSpirePalette();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: p.control, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: p.text, fontSize: size * 0.42, fontWeight: '700' }}>{name.trim().slice(0, 1).toUpperCase() || '—'}</Text>
    </View>
  );
}

function SpirePodium({ lang, members, onOpenAll }: Props) {
  const p = useSpirePalette();
  const ranked = members ? [...members].sort((a, b) => b.steps - a.steps) : [];
  const top = ranked.slice(0, 3);
  const meIndex = ranked.findIndex((m) => m.isMe);
  const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
  const hasRoom = ranked.length > 0;
  const allLabel = `${spireText(lang, 'allMembers')} · ${meIndex >= 0 ? `${meIndex + 1}` : '—'}`;
  return (
    <View testID="spire-podium">
      <View style={s.head}>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireText(lang, 'roomWeek')}</Text>
        <Text style={[s.count, { color: p.textSecondary }]}>{hasRoom ? String(ranked.length) : '—'}</Text>
      </View>
      {top.length > 0 ? (
        <View style={s.podium}>
          {order.map((idx) => {
            const m = top[idx];
            const place = idx + 1;
            const blk = place === 1 ? 88 : place === 2 ? 66 : 50;
            return (
              <View key={m.uid} style={s.col} accessible accessibilityLabel={`${place}. ${m.name}, ${m.steps} ${spireText(lang, 'steps')}`}>
                <SpireInitial name={m.name} size={place === 1 ? 56 : 46} />
                <Text style={[s.name, { color: p.text }]}>{m.name}</Text>
                <Text style={[s.steps, { color: p.textSecondary }]}>{m.steps} {spireText(lang, 'stepsShort')}</Text>
                <View style={[s.block, { height: blk, backgroundColor: place === 1 ? p.cardRaised : p.card }]}>
                  <Text style={[s.place, { color: p.text }]}>{place}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
      <V2Pressable
        onPress={onOpenAll}
        disabled={!hasRoom}
        accessibilityLabel={allLabel}
        accessibilityState={{ disabled: !hasRoom }}
        style={[s.all, { backgroundColor: p.control, opacity: hasRoom ? 1 : 0.5 }]}
        testID="spire-all-members"
      >
        <Text style={[s.allText, { color: p.text }]}>{allLabel}</Text>
      </V2Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginHorizontal: 2 },
  title: { fontSize: 18, lineHeight: 24, fontWeight: '700' },
  count: { ...V2_TYPE.body, fontWeight: '600' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginTop: 18 },
  col: { flex: 1, alignItems: 'center', gap: 8 },
  name: { fontSize: 15, fontWeight: '600', textAlign: 'center', maxWidth: 110 },
  steps: { fontSize: 14 },
  block: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, alignItems: 'center', paddingTop: 10 },
  place: { fontSize: 20, fontWeight: '700' },
  all: { marginTop: 16, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  allText: { fontSize: 16, fontWeight: '600' },
});

export default memo(SpirePodium);
