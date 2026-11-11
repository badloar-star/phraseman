// Governance-ID: TG-B42465FCD922
import React, { memo } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { paywallPriceFontSize, paywallPriceLineHeight } from '../paywall/paywall_price_font';
import type { PaywallPlan } from '../../app/paywall_purchase';
import { triLang, type Lang, type PlannedTriLangCopy } from '../../constants/i18n';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import V2Pressable from '../v2/V2Pressable';

type Copy = { ru: string; uk: string; en: string; es: string } & PlannedTriLangCopy;
const MONTH: Copy = { ru: 'Месяц', uk: 'Місяць', en: 'Month', es: 'Mes', 'pt-BR': 'Mês', vi: 'Tháng', id: 'Bulan', tr: 'Ay', pl: 'Miesiąc' };
const YEAR: Copy = { ru: 'Год', uk: 'Рік', en: 'Year', es: 'Año', 'pt-BR': 'Ano', vi: 'Năm', id: 'Tahun', tr: 'Yıl', pl: 'Rok' };
const PER_MONTH: Copy = { ru: 'в месяц', uk: 'на місяць', en: 'a month', es: 'al mes', 'pt-BR': 'por mês', vi: 'mỗi tháng', id: 'per bulan', tr: 'aylık', pl: 'miesięcznie' };
const TRIAL = (lang: Lang, days: number): string => triLang(lang, {
  ru: `${days} дн. бесплатно`, uk: `${days} дн. безкоштовно`, en: `${days} days free`, es: `${days} días gratis`, 'pt-BR': `${days} dias grátis`,
  vi: `${days} ngày miễn phí`, id: `${days} hari gratis`, tr: `${days} gün ücretsiz`, pl: `${days} dni za darmo`,
}) ?? `${days}`;
const word = (lang: Lang, copy: Copy): string => triLang(lang, copy) ?? copy.ru;

type Props = Readonly<{
  lang: Lang;
  g: GlassTokens;
  selected: PaywallPlan;
  onSelect: (plan: PaywallPlan) => void;
  disabled: boolean;
  monthlyPrice: string;
  yearlyPrice: string;
  yearlyPerMonth: string;
  monthlyApprox?: boolean;
  yearlyApprox?: boolean;
  monthlyTrialDays: number | null;
  yearlyTrialDays: number | null;
}>;

function Tile({ testID, g, selected, disabled, onPress, name, sub, price }: Readonly<{
  testID: string; g: GlassTokens; selected: boolean; disabled: boolean; onPress: () => void;
  name: string; sub: string; price: string;
}>) {
  const { fontScale } = useWindowDimensions();
  const fontSize = paywallPriceFontSize(price, fontScale);
  return (
    <V2Pressable
      testID={testID}
      accessibilityRole="radio"
      accessibilityLabel={`${name}. ${sub}. ${price}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      scaleTo={0.98}
      outerStyle={S.outer}
      style={[S.tile, { backgroundColor: selected ? g.opaqueControl : g.opaqueCard, borderColor: selected ? g.accentGraphic : g.line }]}
    >
      <View style={S.head}>
        <Text style={[S.name, { color: g.text }]}>{name}</Text>
        <View style={[S.radio, { borderColor: selected ? g.accentGraphic : g.secondary }, selected && S.radioSelected]} />
      </View>
      <Text style={[S.price, { color: g.text, fontSize, lineHeight: paywallPriceLineHeight(fontSize) }]}>{price || '—'}</Text>
      <Text style={[S.sub, { color: g.secondary }]}>{sub}</Text>
    </V2Pressable>
  );
}

export const PlusTabPlans = memo(function PlusTabPlans({
  lang, g, selected, onSelect, disabled, monthlyPrice, yearlyPrice, yearlyPerMonth, monthlyApprox, yearlyApprox, monthlyTrialDays, yearlyTrialDays,
}: Props) {
  const monthSub = monthlyTrialDays ? `${word(lang, MONTH)} · ${TRIAL(lang, monthlyTrialDays)}` : word(lang, MONTH);
  const yearBase = yearlyPerMonth ? `${word(lang, YEAR)} · ≈ ${yearlyPerMonth} ${word(lang, PER_MONTH)}` : word(lang, YEAR);
  const yearSub = yearlyTrialDays ? `${yearBase} · ${TRIAL(lang, yearlyTrialDays)}` : yearBase;
  return (
    <View style={S.row} testID="plus-tab-plans">
      <Tile
        testID="plus-tab-plan-monthly" g={g} selected={selected === 'monthly'} disabled={disabled}
        onPress={() => onSelect('monthly')} name="Plus" sub={monthSub}
        price={`${monthlyApprox ? '≈ ' : ''}${monthlyPrice}`}
      />
      <Tile
        testID="plus-tab-plan-yearly" g={g} selected={selected === 'yearly'} disabled={disabled}
        onPress={() => onSelect('yearly')} name="Ultra" sub={yearSub}
        price={`${yearlyApprox ? '≈ ' : ''}${yearlyPrice}`}
      />
    </View>
  );
});

const S = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  outer: { flex: 1 },
  tile: { flex: 1, borderRadius: 18, padding: 12, minHeight: 108, borderWidth: 2 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  radio: { width: 16, height: 16, borderRadius: 8, borderWidth: 1 },
  radioSelected: { borderWidth: 5 },
  name: { flexShrink: 1, fontSize: 15, lineHeight: 20, fontWeight: '800' },
  sub: { marginTop: 4, fontSize: 13, lineHeight: 17 },
  price: { marginTop: 4, fontWeight: '800' },
});
