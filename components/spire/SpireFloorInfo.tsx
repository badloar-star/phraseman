// ═══════════════════════════════════════════════════════════════════════════
// SpireFloorInfo.tsx — карточка «Этаж N · ступеней · монеты» под башней (.finfo макета).
//
// зачем: тап по этажу показывает, сколько на нём ступеней и монет. Монеты считаются
// из config/spire_v1 (perFloorPerLevel, guardianMultiplier, summitBonus), а не из
// чисел макета. «Кто на этаже» (аватары соперников) в макете справа — здесь нет:
// комнату недели ещё никто не читает (пакет B), поэтому ничего не рисуем.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Lang } from '../../constants/i18n';
import { V2_TYPE } from '../../constants/v2Style';
import type { SpireCoinsConfig } from '../../modules/spire/config_contract';
import { useSpirePalette } from './useSpirePalette';
import { SpireInitial } from './SpirePodium';
import { spireText } from './spire_strings';
import { spireFloorCoinsOf, spireIsGuard, spireIsSummit, spireStepsIn, type SpireRival } from './spire_tower_model';

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
}>;

const WHO_MAX = 4;

export function spireFloorTitle(lang: Lang, floor: number): string {
  const tail = spireIsSummit(floor) ? ` · ${spireText(lang, 'summit')}` : spireIsGuard(floor) ? ` · ${spireText(lang, 'guard')}` : '';
  return `${spireText(lang, 'floor')} ${floor}${tail}`;
}

export function spireFloorSubtitle(lang: Lang, floor: number, myFloor: number | null, stepInFloor: number | null, coins: SpireCoinsConfig): string {
  const total = spireStepsIn(floor);
  const steps = spireText(lang, 'steps');
  let status = `${total} ${steps}`;
  if (myFloor !== null && floor === myFloor) {
    status = stepInFloor === null
      ? spireText(lang, 'youHere')
      : `${spireText(lang, 'youHere')} · ${stepInFloor} ${spireText(lang, 'outOf')} ${total} ${steps}`;
  } else if (myFloor !== null && floor < myFloor) {
    status = `${spireText(lang, 'passed')} · ${total} ${steps}`;
  }
  const guardMark = spireIsGuard(floor) ? ` (×${coins.guardianMultiplier})` : '';
  const summitMark = spireIsSummit(floor) ? ` + ${coins.summitBonus}` : '';
  return `${status} · ${spireFloorCoinsOf(floor, coins)} ${spireText(lang, 'coinsPerFloor')}${guardMark}${summitMark}`;
}

function SpireFloorInfo({ lang, floor, myFloor, stepInFloor, coins, others = [] }: Props) {
  const p = useSpirePalette();
  return (
    <View
      style={[s.card, { backgroundColor: p.cardRaised, borderColor: p.hairline }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${spireFloorTitle(lang, floor)}. ${spireFloorSubtitle(lang, floor, myFloor, stepInFloor, coins)}${others.length > 0 ? `. ${others.map((m) => m.name).join(', ')}` : ''}`}
      testID="spire-floor-info"
    >
      <View style={s.text}>
        <Text style={[s.title, { color: p.text }]}>{spireFloorTitle(lang, floor)}</Text>
        <Text style={[s.sub, { color: p.textSecondary }]}>{spireFloorSubtitle(lang, floor, myFloor, stepInFloor, coins)}</Text>
      </View>
      {others.length > 0 ? (
        <View style={s.who} testID="spire-floor-who">
          {others.slice(0, WHO_MAX).map((m, k) => (
            <View key={m.uid} style={k === 0 ? null : s.whoOverlap}><SpireInitial name={m.name} size={28} /></View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  // Тонкая (1px) полупрозрачная кромка карточки, как .finfo макета.
  card: { marginTop: 12, minHeight: 72, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  text: { flex: 1, minWidth: 0 },
  who: { flexDirection: 'row' },
  whoOverlap: { marginLeft: -8 },
  title: { fontSize: 16, lineHeight: 21, fontWeight: '700' },
  sub: { ...V2_TYPE.body, fontSize: 16, lineHeight: 20, marginTop: 2 },
});

export default memo(SpireFloorInfo);
