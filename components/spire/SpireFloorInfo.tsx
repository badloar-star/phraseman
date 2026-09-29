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
import { useV2Palette } from '../v2/useV2Palette';
import { spireText } from './spire_strings';
import { spireFloorCoinsOf, spireIsGuard, spireIsSummit, spireStepsIn } from './spire_tower_model';

type Props = Readonly<{
  lang: Lang;
  floor: number;
  /** Этаж игрока; null = локальной недели нет. */
  myFloor: number | null;
  /** Сколько ступеней пройдено на своём этаже; null = нет данных. */
  stepInFloor: number | null;
  coins: SpireCoinsConfig;
}>;

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

function SpireFloorInfo({ lang, floor, myFloor, stepInFloor, coins }: Props) {
  const p = useV2Palette();
  return (
    <View
      style={[s.card, { backgroundColor: p.cardRaised, borderColor: p.hairline }]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${spireFloorTitle(lang, floor)}. ${spireFloorSubtitle(lang, floor, myFloor, stepInFloor, coins)}`}
      testID="spire-floor-info"
    >
      <Text style={[s.title, { color: p.text }]}>{spireFloorTitle(lang, floor)}</Text>
      <Text style={[s.sub, { color: p.textSecondary }]}>{spireFloorSubtitle(lang, floor, myFloor, stepInFloor, coins)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  // Тонкая (1px) полупрозрачная кромка карточки, как .finfo макета.
  card: { marginTop: 12, minHeight: 72, paddingHorizontal: 16, paddingVertical: 14, borderRadius: 16, borderWidth: 1, justifyContent: 'center' },
  title: { fontSize: 17, lineHeight: 22, fontWeight: '700' },
  sub: { ...V2_TYPE.body, fontSize: 15, lineHeight: 19, marginTop: 2 },
});

export default memo(SpireFloorInfo);
