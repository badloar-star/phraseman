// ═══════════════════════════════════════════════════════════════════════════
// SpireHomeTitle.tsx — заголовок экрана Пика: «Пик», пометка «бета» у непроверенных языков и строка «Гранит · до конца недели 2 д 14 ч».
//
// зачем (координатор 22.10: «SpireHomeScreen — вынеси кусок в компонент, чтобы стало ≤ 400 строк»): блок перенесён из SpireHomeScreen
// без изменений вида и текстов. Стиль «тонкой шапки» (budget.headerThin ? thin.title : null) экран передаёт сам — его читает сторож
// tests/spire_tower_window_height.test.ts в экране. Плашка энергии (SpireEnergyPill) осталась в экране рядом с этим заголовком.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from 'react-native';

import { triLang, type Lang } from '../../constants/i18n';
import { V2_TYPE } from '../../constants/v2Style';
import SpireWeekSubtitle from './SpireWeekSubtitle';
import { SPIRE_BETA_LANGS } from './spire_home_week';
import { spireText } from './spire_strings';
import { useSpirePalette } from './useSpirePalette';

type Props = Readonly<{
  lang: Lang;
  /** Язык пула Шпиля (asSpireLang); null — пула нет. */
  spireLang: string | null;
  /** «Гранит · до конца недели 2 д 14 ч». */
  subtitle: string;
  /** Лига для значка у строки недели (SpireWeekSubtitle). */
  tier: unknown;
  /** Тонкая шапка экрана (бюджет высоты): экран передаёт thin.title или null. */
  titleStyle: StyleProp<TextStyle>;
}>;

function SpireHomeTitle({ lang, spireLang, subtitle, tier, titleStyle }: Props) {
  const p = useSpirePalette();
  return (
    <View style={s.headText}>
      <View style={s.titleRow}>
        <Text accessibilityRole="header" style={[s.title, titleStyle, { color: p.text }]}>{spireText(lang, 'title')}</Text>
        {/* зачем (D77, владелец 30.09): пулы es/de/fr без проверки носителем — первые 2–4 недели
            с пометкой «бета» рядом с языком. Снять: убрать язык из SPIRE_BETA_LANGS. */}
        {spireLang && SPIRE_BETA_LANGS.includes(spireLang) ? (
          <View style={[s.betaPill, { backgroundColor: p.cardRaised }]} testID="spire-beta-pill">
            <Text style={[s.betaText, { color: p.textSecondary }]}>{triLang(lang, { ru: 'бета', uk: 'бета', en: 'beta', es: 'beta', 'pt-BR': 'beta', vi: 'beta', id: 'beta', tr: 'beta', pl: 'beta' })}</Text>
          </View>
        ) : null}
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
  betaPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  betaText: { fontSize: 13, lineHeight: 17, fontWeight: '700', letterSpacing: 0.3 }, // зачем (аудит D145, 11.10): межстрочный ≥ 1.25× — шкала V2_TYPE 13/17
});
