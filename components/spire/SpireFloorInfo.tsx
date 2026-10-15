// ═══════════════════════════════════════════════════════════════════════════
// SpireFloorInfo.tsx — карточка «Этаж N · ступеней · монеты» под башней (.finfo макета).
//
// зачем: тап по этажу показывает, сколько на нём ступеней и монет. Монеты считаются
// из config/spire_v1 (perFloorPerLevel, guardianMultiplier, summitBonus), а не из
// чисел макета. «Кто на этаже» (кружки соперников справа, до 4 + «+N») берётся из кэша
// комнаты недели (пакет B: SpireHomeScreen → useSpireRivals → `others`), без новых чтений;
// других на этаже нет — блока нет. Журнал карты — [SPIRE-RIVALS] (use_spire_rivals.ts).
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { V2_TYPE } from '../../constants/v2Style';
import type { SpireCoinsConfig } from '../../modules/spire/config_contract';
import { useSpirePalette } from './useSpirePalette';
import { PlateFill, plateBoxShadow, useShadowGlass } from '../v2/ShadowSurface';
import SpireRankCoin from './SpireRankCoin';
import { spireText } from './spire_strings';
import { spireStepsCount, spireStepsWordAfterOf } from './spire_plurals';
import { spireFloorCoinsOf, spireIsGuard, spireIsSummit, spireStepsIn, type SpireRival } from './spire_tower_model';
import { spireFloorInfoCompact } from './spire_tower_window';

type Props = Readonly<{
  lang: Lang;
  floor: number;
  /** Этаж игрока; null = локальной недели нет. */
  myFloor: number | null;
  /** Сколько ступеней пройдено на своём этаже; null = нет данных. */
  stepInFloor: number | null;
  coins: SpireCoinsConfig;
  /** Кто ещё на этом этаже (кэш комнаты недели, без новых чтений); до 4 кружков. */
  others?: readonly SpireRival[];
  /** Высота окна башни, dp: при крупном шрифте и узком окне (флаг SPIRE_COMPACT_FLOOR_INFO_ENABLED) карточка — компактная строка. */
  windowH?: number;
}>;

const WHO_MAX = 4;

export function spireFloorTitle(lang: Lang, floor: number): string {
  const tail = spireIsSummit(floor) ? ` · ${spireText(lang, 'summit')}` : spireIsGuard(floor) ? ` · ${spireText(lang, 'guard')}` : '';
  return `${spireText(lang, 'floor')} ${floor}${tail}`;
}

export function spireFloorSubtitle(lang: Lang, floor: number, myFloor: number | null, stepInFloor: number | null, coins: SpireCoinsConfig): string {
  const total = spireStepsIn(floor);
  let status = spireStepsCount(lang, total);
  if (myFloor !== null && floor === myFloor) {
    status = stepInFloor === null
      ? spireText(lang, 'youHere')
      : `${spireText(lang, 'youHere')} · ${stepInFloor} ${spireText(lang, 'outOf')} ${total} ${spireStepsWordAfterOf(lang, total)}`;
  } else if (myFloor !== null && floor < myFloor) {
    status = `${spireText(lang, 'passed')} · ${spireStepsCount(lang, total)}`;
  }
  const guardMark = spireIsGuard(floor) ? ` (×${coins.guardianMultiplier})` : '';
  const summitMark = spireIsSummit(floor) ? ` + ${coins.summitBonus}` : '';
  return `${status} · ${spireFloorCoinsOf(floor, coins)} ${spireText(lang, 'coinsPerFloor')}${guardMark}${summitMark}`;
}

function SpireFloorInfo({ lang, floor, myFloor, stepInFloor, coins, others = [], windowH = 0 }: Props) {
  const p = useSpirePalette();
  const g = useShadowGlass();
  const compact = spireFloorInfoCompact(useWindowDimensions().fontScale, windowH);
  if (compact) {
    // зачем (запасной вариант 15.10, выключен): одна строка — «Этаж N · ступень» без подписи и без кружков соперников; окно башни получает освободившееся место
    const one = myFloor !== null && floor === myFloor && stepInFloor !== null ? `${spireFloorTitle(lang, floor)} · ${stepInFloor}/${spireStepsIn(floor)}` : spireFloorTitle(lang, floor);
    return (
      <View style={[s.compactCard, { boxShadow: plateBoxShadow(g) }]} accessible accessibilityRole="text" accessibilityLabel={one} testID="spire-floor-info-compact">
        <PlateFill g={g} radius={14} />
        <Text numberOfLines={1} style={[s.title, { color: p.text }]}>{one}</Text>
      </View>
    );
  }
  return (
    <View
      // зачем (владелец 12.10, стиль «Тень»): карточка этажа — плашка с тенью, без кромки.
      style={[s.card, { boxShadow: plateBoxShadow(g) }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${spireFloorTitle(lang, floor)}. ${spireFloorSubtitle(lang, floor, myFloor, stepInFloor, coins)}${others.length > 0 ? `. ${others.map((m) => m.name).join(', ')}` : ''}`}
      testID="spire-floor-info"
    >
      <PlateFill g={g} radius={16} />
      <View style={s.text}>
        <Text style={[s.title, { color: p.text }]}>{spireFloorTitle(lang, floor)}</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>{spireFloorSubtitle(lang, floor, myFloor, stepInFloor, coins)}</Text>
      </View>
      {others.length > 0 ? (
        <View style={s.who} testID="spire-floor-who">
          {others.slice(0, WHO_MAX).map((m, k) => (
            <View key={m.uid} style={k === 0 ? null : s.whoOverlap}><SpireRankCoin rank={m.coinRank} size={28} /></View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  // Тонкая (1px) полупрозрачная кромка карточки, как .finfo макета.
  card: { marginTop: 12, minHeight: 72, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  compactCard: { marginTop: 8, minHeight: 44, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, justifyContent: 'center' },
  text: { flex: 1, minWidth: 0 },
  who: { flexDirection: 'row' },
  whoOverlap: { marginLeft: -8 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  sub: { ...V2_TYPE.body, fontSize: 16, lineHeight: 20, marginTop: 2 },
});

export default memo(SpireFloorInfo);
