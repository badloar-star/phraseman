import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { triLang, type Lang } from '../../constants/i18n';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import { PLUS_TAB_FREE_LABEL, PLUS_TAB_PLUS_LABEL, PLUS_TAB_SUBLINE, type PlusTabCopy, type PlusTabItem } from './plus_tab_items';
import type { SubscriptionTier } from '../../app/subscription_tier';
import { PlusTabCompareTable } from './PlusTabCompareTable';

const word = (lang: Lang, copy: PlusTabCopy): string => triLang(lang, copy) ?? copy.ru;

export const PlusTabBenefits = memo(function PlusTabBenefits({ lang, g, items, layout = 'cards', tier = 'plus' }: {
  lang: Lang; g: GlassTokens; items: readonly PlusTabItem[];
  /** 'table' — таблица в стиле пейвола «Два пути» (вкладка Plus, владелец 11.11); 'cards' — прежние карточки (окно оплаты без «Двух путей»). */
  layout?: 'cards' | 'table';
  /** Уровень, чьим цветом подсвечена колонка таблицы. */
  tier?: SubscriptionTier;
}) {
  if (layout === 'table') return <PlusTabCompareTable lang={lang} g={g} items={items} tier={tier} />;
  return (
    <View testID="plus-benefits">
      <Text testID="plus-tab-subtitle" style={[S.sub, { color: g.secondary }]}>{word(lang, PLUS_TAB_SUBLINE)}</Text>

      {/* guard-ok: 15–16 статичных карточек, виртуализация не нужна; список целиком, как в макете */}
      {items.map((item) => (
        <View key={item.key} testID={`plus-tab-item-${item.key}`} style={[S.card, { backgroundColor: g.opaqueCard }]} accessible accessibilityLabel={`${word(lang, item.title)}. ${word(lang, PLUS_TAB_FREE_LABEL)}: ${item.free ? word(lang, item.free) : '—'}. Plus: ${word(lang, item.plus)}`}>
          <View style={S.cardHead}>
            <Text style={S.icon} accessible={false}>{item.icon}</Text>
            <Text style={[S.itemTitle, { color: g.text }]}>{word(lang, item.title)}</Text>
          </View>
          <View style={S.pills}>
            <View style={[S.pill, { backgroundColor: g.opaqueControl }]}>
              <Text style={[S.pillLabel, { color: g.secondary }]}>{word(lang, PLUS_TAB_FREE_LABEL)}</Text>
              <Text style={[S.pillText, { color: g.secondary }]}>{item.free ? word(lang, item.free) : '—'}</Text>
            </View>
            <View style={[S.pill, { backgroundColor: g.selected }]}>
              <Text style={[S.pillLabel, { color: g.text }]}>{word(lang, PLUS_TAB_PLUS_LABEL)}</Text>
              <Text style={[S.pillText, S.pillTextPlus, { color: g.text }]}>{word(lang, item.plus)}</Text>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
});

const S = StyleSheet.create({
  sub: { fontSize: 14, lineHeight: 19, marginTop: 20, marginBottom: 10 },
  card: { borderRadius: 16, paddingVertical: 11, paddingHorizontal: 12, marginBottom: 6 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { width: 24, textAlign: 'center', fontSize: 15 },
  itemTitle: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '700' },
  pills: { flexDirection: 'row', gap: 6, marginTop: 8 },
  pill: { flex: 1, borderRadius: 11, paddingVertical: 7, paddingHorizontal: 9 },
  // guard-ok: подпись плашки «Бесплатно / Plus» — по утверждённому макету владельца (05.11), мелкая подпись внутри плашки разрешена
  pillLabel: { fontSize: 13, lineHeight: 16, fontWeight: '700', opacity: 0.75, marginBottom: 1 },
  pillText: { fontSize: 14, lineHeight: 18 },
  pillTextPlus: { fontWeight: '800' },
});
