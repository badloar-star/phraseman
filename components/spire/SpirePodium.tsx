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
import { PODIUM_SIZES } from './spire_podium_sizes';
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
  /** Комната недели ещё грузится: вместо пустоты — скелет той же высоты, чтобы башня и карточка этажа не прыгали, когда подиум появится (координатор 15.10, 🔴 Pixel 8). */
  loading?: boolean;
  /** Места на первом экране мало (ступень ужатия 1–2, use_spire_tower_budget): монеты 44/36 и плиты 60/50/42 вместо 56/46 и 88/66/50 — высота подиума ниже на 40 dp (SPIRE_PODIUM_COMPACT_SAVE). */
  compact?: boolean;
}>;

// порядок колонок как на подиуме: 2-е место, 1-е, 3-е; размеры монет и ступеней — как в рабочей раскладке ниже
const SKELETON_PLACES = [2, 1, 3] as const;

function SpirePodium({ lang, members, onOpenAll, rankBy = 'steps', loading = false, compact = false }: Props) {
  const p = useSpirePalette(); const sh = useSpireShadow();
  const ranked = members ? spireSortMembers(members, rankBy) : [];
  // зачем (координатор 14.10, D162): в колонке ≈101 dp слово «монет» не помещается рядом с числом — на подиуме число с неразрывным пробелом тысяч («8 511») и маленькая монета; слово остаётся в «Всех участниках», подзаголовке и подписи для читалки
  const stepsScore = (m: SpireMemberRow): string => `${m.steps} ${spireStepsShort(lang, m.steps)}`;
  const top = ranked.slice(0, 3);
  const meIndex = ranked.findIndex((m) => m.isMe);
  const order = top.length === 3 ? [1, 0, 2] : top.map((_, i) => i);
  const hasRoom = ranked.length > 0;
  const sizes = compact ? PODIUM_SIZES.compact : PODIUM_SIZES.full;
  const allLabel = `${spireText(lang, 'allMembers')} · ${meIndex >= 0 ? `${meIndex + 1}` : '—'}`;
  return (
    <View testID="spire-podium">
      <View style={s.head}>
        <Text accessibilityRole="header" style={[s.title, { color: p.text }]}>{spireText(lang, 'roomWeek')}</Text>
        <Text style={[s.count, { color: p.textSecondary }]}>{hasRoom ? String(ranked.length) : '—'}</Text>
      </View>
      {top.length === 0 && loading ? (
        // зачем (координатор 15.10, 🔴): до прихода комнаты подиум занимал 0 dp, а потом отъедал ~220 dp — бюджет высоты строился на пустом экране. Скелет повторяет колонки (монета, ник, счёт, ступень) теми же высотами
        <View style={s.podium} testID="spire-podium-skeleton" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {SKELETON_PLACES.map((place) => {
            const coin = place === 1 ? sizes.coinFirst : sizes.coinOther;
            return (
            <View key={place} style={s.col}>
              <View style={{ width: coin, height: coin, borderRadius: coin / 2, backgroundColor: p.card }} />
              <View style={[s.skelName, { backgroundColor: p.card }]} />
              <View style={[s.skelScore, { backgroundColor: p.card }]} />
              <View style={[s.block, { height: sizes.blocks[place - 1], backgroundColor: p.card }]} />
            </View>
            );
          })}
        </View>
      ) : null}
      {top.length > 0 ? (
        <View style={s.podium}>
          {order.map((idx) => {
            const m = top[idx];
            const place = idx + 1;
            const blk = sizes.blocks[place - 1];
            return (
              <View key={m.uid} style={s.col} accessible accessibilityLabel={`${place}. ${m.name}, ${rankBy === 'coins' ? spireCoinsCount(lang, m.weekCoins ?? 0) : spireStepsCount(lang, m.steps)}`}>
                <SpireRankCoin rank={m.coinRank} size={place === 1 ? sizes.coinFirst : sizes.coinOther} />
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
                <View style={[s.block, { minHeight: blk, backgroundColor: place === 1 ? p.cardRaised : p.card }, sh.plate]}>
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
  skelName: { width: '70%', height: 21, borderRadius: 8 },
  skelScore: { width: '50%', height: 16, borderRadius: 8 },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  block: { width: '100%', borderTopLeftRadius: 14, borderTopRightRadius: 14, borderBottomLeftRadius: 6, borderBottomRightRadius: 6, alignItems: 'center', paddingTop: 10, paddingBottom: 8 }, // зачем (Макеты 15.10): плита растёт по цифре — «3» не режется ни при 1.0, ни при крупном шрифте
  place: { fontSize: 20, fontWeight: '700' },
  all: { marginTop: 16, minHeight: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  allText: { fontSize: 16, fontWeight: '600' },
});

export default memo(SpirePodium);
