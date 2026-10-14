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
import RuneGlyph from '../RuneGlyph';
import { useSpirePalette } from './useSpirePalette';
import { useSpireShadow } from './useSpireShadow';
import SpireRankCoin from './SpireRankCoin';
import { spireNickWrap } from './spire_nick_wrap';
import { spireText } from './spire_strings';
import { spireCoinsCount, spireGroupThousands, spireStepsCount, spireStepsShort } from './spire_plurals';
import { spireSortMembers, type SpireMemberRow, type SpireRankByView } from './spire_room_types';

type Props = Readonly<{
  lang: Lang;
  /** null = комната недели недоступна (нет источника данных). */
  members: readonly SpireMemberRow[] | null;
  onOpenAll: () => void;
  /** D162: 'coins' — место и подпись по монетам недели; нет — ступени, как раньше. */
  rankBy?: SpireRankByView;
}>;

function SpirePodium({ lang, members, onOpenAll, rankBy = 'steps' }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const ranked = members ? spireSortMembers(members, rankBy) : [];
  // зачем (координатор 14.10, D162): в колонке ≈101 dp слово «монет» не помещается рядом с числом — на подиуме число с неразрывным пробелом тысяч («8 511») и маленькая монета; слово остаётся в «Всех участниках», подзаголовке и подписи для читалки
  const stepsScore = (m: SpireMemberRow): string => `${m.steps} ${spireStepsShort(lang, m.steps)}`;
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
              <View key={m.uid} style={s.col} accessible accessibilityLabel={`${place}. ${m.name}, ${rankBy === 'coins' ? spireCoinsCount(lang, m.weekCoins ?? 0) : spireStepsCount(lang, m.steps)}`}>
                <SpireRankCoin rank={m.coinRank} size={place === 1 ? 56 : 46} />
                {/* зачем (координатор 13.10): на 360 dp колонка ≈ 101 dp, при шрифте ×1,3 длинное имя без пробела рвалось посреди слова. До 2 строк, перенос по слогам (Android hyphenationFrequency=full, iOS переносит сам), потолок роста шрифта 1,15 только у имени — это не ужатие шрифта под ширину */}
                <Text style={[s.name, { color: p.text }]} numberOfLines={2} maxFontSizeMultiplier={1.15} android_hyphenationFrequency="full">{spireNickWrap(m.name)}</Text>
                {rankBy === 'coins' ? (
                  <View style={s.scoreRow}>
                    <Text style={[s.steps, { color: p.textSecondary }]} numberOfLines={1}>{spireGroupThousands(m.weekCoins ?? 0)}</Text>
                    <RuneGlyph size={14} />
                  </View>
                ) : (
                  <Text style={[s.steps, { color: p.textSecondary }]}>{stepsScore(m)}</Text>
                )}
                <View style={[s.block, { height: blk, backgroundColor: place === 1 ? p.cardRaised : p.card }, sh.plate]}>
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
        style={[s.all, { backgroundColor: p.control, opacity: hasRoom ? 1 : 0.5 }, sh.nested]}
        testID="spire-all-members"
      >
        <Text style={[s.allText, { color: p.text }]}>{allLabel}</Text>
      </V2Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 26, marginHorizontal: 2 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  count: { ...V2_TYPE.body, fontWeight: '600' },
  podium: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 12, marginTop: 18 },
  col: { flex: 1, alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', textAlign: 'center', maxWidth: 110 },
  steps: { fontSize: 13 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  block: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, alignItems: 'center', paddingTop: 10 },
  place: { fontSize: 20, fontWeight: '700' },
  all: { marginTop: 16, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  allText: { fontSize: 16, fontWeight: '600' },
});

export default memo(SpirePodium);
