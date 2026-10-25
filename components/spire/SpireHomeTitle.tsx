// ═══════════════════════════════════════════════════════════════════════════
// SpireHomeTitle.tsx — заголовок экрана Пика: «Пик» (плашка «бета» снята 25.10) и строка «Гранит · до конца недели 2 д 14 ч».
//
// зачем (координатор 22.10: «SpireHomeScreen — вынеси кусок в компонент, чтобы стало ≤ 400 строк»): блок перенесён из SpireHomeScreen
// без изменений вида и текстов. Стиль «тонкой шапки» (budget.headerThin ? thin.title : null) экран передаёт сам — его читает сторож
// tests/spire_tower_window_height.test.ts в экране. Плашка энергии (SpireEnergyPill) осталась в экране рядом с этим заголовком.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { type Lang } from '../../constants/i18n';
import { V2_TYPE } from '../../constants/v2Style';
import SpireWeekSubtitle from './SpireWeekSubtitle';
import { spireText } from './spire_strings';
import { useSpirePalette } from './useSpirePalette';

type Props = Readonly<{
  lang: Lang;
  /** Язык пула Шпиля (asSpireLang); null — пула нет. После снятия «беты» (25.10) не читается — проп оставлен, чтобы не трогать экран Пика (лимит 400 строк). */
  spireLang: string | null;
  /** «Гранит · до конца недели 2 д 14 ч». */
  subtitle: string;
  /** Лига для значка у строки недели (SpireWeekSubtitle). */
  tier: unknown;
  /** Тонкая шапка экрана (бюджет высоты): экран передаёт thin.title или null. */
  titleStyle: StyleProp<TextStyle>;
}>;

function SpireHomeTitle({ lang, subtitle, tier, titleStyle }: Props) {
  const p = useSpirePalette();
  return (
    <View style={s.headText}>
      <View style={s.titleRow}>
        <Text accessibilityRole="header" style={[s.title, titleStyle, { color: p.text }]}>{spireText(lang, 'title')}</Text>
        {/* зачем (владелец 25.10 через координатора): плашка «бета» у es/de/fr снята — срок решения D77 (первые 2–4 недели) истёк */}
      </View>
      <SpireWeekSubtitle text={subtitle} tier={tier} color={p.textSecondary} />
    </View>
  );
}

export default memo(SpireHomeTitle);

const s = StyleSheet.create({
  headText: { flex: 1, minWidth: 0 },
  title: { ...V2_TYPE.largeTitle, letterSpacing: -0.5 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
