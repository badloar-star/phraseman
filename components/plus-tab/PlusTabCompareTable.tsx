// PlusTabCompareTable — список «Бесплатно / уровень» вкладки Plus одной таблицей, как в пейволе «Два пути».
// зачем (владелец 11.11, макет docs/work/mockups/plus-screens-duo-2026-11-11/index.html, «в точности как на макете»): вместо 15 карточек
// с плашками — одна таблица: название, «Бесплатно» приглушённо, колонка уровня подсвечена его цветом (12 %) и меняется вместе с выбором тарифа.
// Пункты и тексты — прежние (plus_tab_items), список целиком, без заголовков разделов (замок 05.11). Размеры из макета: колонки 1fr / 88 / 96.
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { SUBSCRIPTION_TIER_NAME, type SubscriptionTier } from '../../app/subscription_tier';
import { triLang, type Lang } from '../../constants/i18n';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { DUO_TIER_COLORS } from '../paywall/duo/PaywallDuoHero';
import { PLUS_TAB_FREE_LABEL, PLUS_TAB_SUBLINE, type PlusTabCopy, type PlusTabItem } from './plus_tab_items';

const word = (lang: Lang, copy: PlusTabCopy): string => triLang(lang, copy) ?? copy.ru;

export const PlusTabCompareTable = memo(function PlusTabCompareTable({ lang, g, items, tier }: {
  lang: Lang; g: GlassTokens; items: readonly PlusTabItem[]; tier: SubscriptionTier;
}) {
  const [c1, c2] = DUO_TIER_COLORS[tier];
  const tint = `${c2}1F`; // макет: колонка уровня — цвет уровня 12 %
  // зачем: в светлой теме яркий цвет уровня на светлой подложке не читается — заголовок колонки цветом текста темы (как в пейволе)
  const headInk = g.isLight ? g.text : c1;
  const tierName = SUBSCRIPTION_TIER_NAME[tier];
  return (
    <View testID="plus-benefits">
      <Text accessibilityRole="header" testID="plus-tab-subtitle" style={[S.h3, { color: g.text }]}>{word(lang, PLUS_TAB_SUBLINE)}</Text>
      <View style={S.tr} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <View style={S.cName} />
        <Text style={[S.cFree, S.th, { color: g.mutedText }]}>{word(lang, PLUS_TAB_FREE_LABEL)}</Text>
        <View style={[S.cTier, S.thTier, { backgroundColor: tint }]}><Text style={[S.th, { color: headInk }]}>{tierName}</Text></View>
      </View>
      {/* guard-ok: 15–16 статичных строк, виртуализация не нужна; список целиком, как в макете */}
      {items.map((item, index) => (
        <View
          key={item.key} testID={`plus-tab-item-${item.key}`} style={S.tr} accessible
          accessibilityLabel={`${word(lang, item.title)}. ${word(lang, PLUS_TAB_FREE_LABEL)}: ${item.free ? word(lang, item.free) : '—'}. ${tierName}: ${word(lang, item.plus)}`}
        >
          <Text style={[S.cName, S.td, S.line, { color: g.text, borderTopColor: g.line }]}>{word(lang, item.title)}</Text>
          <Text style={[S.cFree, S.td, S.line, { color: g.mutedText, borderTopColor: g.line }]}>{item.free ? word(lang, item.free) : '—'}</Text>
          <View style={[S.cTier, S.line, { backgroundColor: tint, borderTopColor: g.line }, index === items.length - 1 ? S.tierLast : null]}>
            <Text style={[S.td, S.tdTier, { color: g.text }]}>{word(lang, item.plus)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
});

const S = StyleSheet.create({
  // макет .more h3: 20 / 700 / −0.3, отступы 24 сверху и 12 снизу
  h3: { marginTop: 24, marginBottom: 12, fontSize: 20, lineHeight: 26, fontWeight: '700', letterSpacing: -0.3 },
  tr: { flexDirection: 'row', alignItems: 'stretch' },
  cName: { flex: 1, minWidth: 0 },
  cFree: { width: 88, textAlign: 'center' },
  cTier: { width: 96, alignItems: 'center', justifyContent: 'center' },
  th: { fontSize: 13, lineHeight: 18, fontWeight: '600', paddingBottom: 6 },
  thTier: { paddingTop: 8, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  td: { fontSize: 14, lineHeight: 20, paddingVertical: 11 },
  tdTier: { fontWeight: '700', textAlign: 'center', paddingHorizontal: 4 },
  line: { borderTopWidth: StyleSheet.hairlineWidth },
  tierLast: { borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
});
