// Governance-ID: TG-B42465FCD922
/**
 * Плитки планов вкладки Plus — по утверждённому макету plus_tab_approved_2026-11-05.html (`.plans`):
 * слева «Plus · месяц», справа «Ultra · год» с бейджем «Выгоднее»; выбор — тонкое кольцо цвета плана
 * (Ultra — Рубин, Plus — фиолетовый, `0 0 0 2px`), без рамок (толстые и чёрные запрещены владельцем).
 *
 * зачем (замечание координатора 06.11 по кадрам Эмулятора): общий `PaywallPlusPlans` рисовал Ultra слева без бейджа и обводил выбранную
 * плитку толстой тёмной рамкой. Цены и пробный период приходят из магазина через usePaywallPurchase, здесь только вид.
 */
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { PaywallPlan } from '../../app/paywall_purchase';
import { triLang, type Lang, type PlannedTriLangCopy } from '../../constants/i18n';
import type { GlassTokens } from '../../constants/liquidGlassThemePalette';
import V2Pressable from '../v2/V2Pressable';
import { ULTRA_PALETTE, pinColorsForTier } from '../plus/plus_ring_spec';

type Copy = { ru: string; uk: string; en: string; es: string } & PlannedTriLangCopy;
const MONTH: Copy = { ru: 'Месяц', uk: 'Місяць', en: 'Month', es: 'Mes', 'pt-BR': 'Mês', vi: 'Tháng', id: 'Bulan', tr: 'Ay', pl: 'Miesiąc' };
const YEAR: Copy = { ru: 'Год', uk: 'Рік', en: 'Year', es: 'Año', 'pt-BR': 'Ano', vi: 'Năm', id: 'Tahun', tr: 'Yıl', pl: 'Rok' };
const PER_MONTH: Copy = { ru: 'в месяц', uk: 'на місяць', en: 'a month', es: 'al mes', 'pt-BR': 'por mês', vi: 'mỗi tháng', id: 'per bulan', tr: 'aylık', pl: 'miesięcznie' };
const BETTER: Copy = { ru: 'Выгоднее', uk: 'Вигідніше', en: 'Best value', es: 'Más ahorro', 'pt-BR': 'Melhor valor', vi: 'Tiết kiệm hơn', id: 'Lebih hemat', tr: 'Daha avantajlı', pl: 'Korzystniej' };
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

function Tile({ testID, g, ring, selected, disabled, onPress, glyph, glyphColors, name, sub, price, badge, badgeColors, hexagon }: Readonly<{
  testID: string; g: GlassTokens; ring: string; selected: boolean; disabled: boolean; onPress: () => void;
  glyph: string; glyphColors: readonly [string, string]; name: string; sub: string; price: string;
  badge?: string; badgeColors?: Readonly<{ bg: string; ink: string }>; hexagon?: boolean;
}>) {
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
      // зачем: выбор — тонкое кольцо цвета плана через boxShadow, не рамка (рамок у плиток нет вовсе)
      style={[S.tile, { backgroundColor: g.opaqueCard }, selected ? { boxShadow: `0 0 0 2px ${ring}` } : null]}
    >
      {badge && badgeColors ? (
        <View style={[S.badge, { backgroundColor: badgeColors.bg }]}>
          <Text style={[S.badgeText, { color: badgeColors.ink }]}>{badge}</Text>
        </View>
      ) : null}
      <View style={S.head}>
        <View style={[S.mark, hexagon ? S.markHex : S.markRound, { backgroundColor: glyphColors[0] }]}>
          <Text style={S.markGlyph}>{glyph}</Text>
        </View>
        <Text style={[S.name, { color: g.text }]}>{name}</Text>
      </View>
      <Text style={[S.sub, { color: g.secondary }]} numberOfLines={2}>{sub}</Text>
      <Text style={[S.price, { color: g.text }]} numberOfLines={1}>{price}</Text>
    </V2Pressable>
  );
}

export const PlusTabPlans = memo(function PlusTabPlans({
  lang, g, selected, onSelect, disabled, monthlyPrice, yearlyPrice, yearlyPerMonth, monthlyApprox, yearlyApprox, monthlyTrialDays, yearlyTrialDays,
}: Props) {
  const plusPin = pinColorsForTier('plus');
  const ultraPin = ULTRA_PALETTE.pin;
  const monthSub = monthlyTrialDays ? `${word(lang, MONTH)} · ${TRIAL(lang, monthlyTrialDays)}` : word(lang, MONTH);
  const yearBase = yearlyPerMonth ? `${word(lang, YEAR)} · ≈ ${yearlyPerMonth} ${word(lang, PER_MONTH)}` : word(lang, YEAR);
  const yearSub = yearlyTrialDays ? `${yearBase} · ${TRIAL(lang, yearlyTrialDays)}` : yearBase;
  return (
    <View style={S.row} testID="plus-tab-plans">
      <Tile
        testID="plus-tab-plan-monthly" g={g} ring={plusPin[0]} selected={selected === 'monthly'} disabled={disabled}
        onPress={() => onSelect('monthly')} glyph="◆" glyphColors={plusPin} name="Plus" sub={monthSub}
        price={`${monthlyApprox ? '≈ ' : ''}${monthlyPrice}`}
      />
      <Tile
        testID="plus-tab-plan-yearly" g={g} ring={ultraPin[0]} selected={selected === 'yearly'} disabled={disabled}
        onPress={() => onSelect('yearly')} glyph="✦" glyphColors={ultraPin} name="Ultra" sub={yearSub} hexagon
        price={`${yearlyApprox ? '≈ ' : ''}${yearlyPrice}`}
        badge={word(lang, BETTER)} badgeColors={ULTRA_PALETTE.tag}
      />
    </View>
  );
});

const S = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  outer: { flex: 1 },
  tile: { flex: 1, borderRadius: 18, padding: 12, minHeight: 112 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  mark: { width: 20, height: 20, alignItems: 'center', justifyContent: 'center' },
  markRound: { borderRadius: 10 },
  markHex: { borderRadius: 6 },
  markGlyph: { color: '#FFFFFF', fontSize: 10, lineHeight: 12 }, // theme-exempt: знак плана — фиксированные цвета по макету
  name: { fontSize: 15, lineHeight: 20, fontWeight: '800' },
  sub: { marginTop: 4, fontSize: 13, lineHeight: 17 },
  price: { marginTop: 4, fontSize: 17, lineHeight: 22, fontWeight: '800' },
  badge: { position: 'absolute', top: 9, right: 9, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 13, lineHeight: 16, fontWeight: '800' },
});
