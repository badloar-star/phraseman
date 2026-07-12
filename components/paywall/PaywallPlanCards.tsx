// ════════════════════════════════════════════════════════════════════════════
// PaywallPlanCards.tsx — селектор планов: Год (default, доминирует, честный
// «−N%» из цен стора, цена/мес крупно + полная цена года + цена/день) и
// Месяц (якорь). Паттерн с подтверждёнными цифрами: annual-default +15–20%,
// SAVE-бейджи +64–72% в кейсах RevenueCat. Никаких выдуманных зачёркиваний.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';
import type { PaywallPlan } from '../../app/paywall_purchase';

interface Props {
  lang: Lang;
  chrome: PaywallChrome;
  selected: PaywallPlan;
  onSelect: (plan: PaywallPlan) => void;
  yearlyPerMonth: string;
  yearlyFull: string;
  monthlyPrice: string;
  savingsPct: number | null;
  perDayLabel: string | null;
  /** Дни бесплатного триала (для строки «Сначала N дней бесплатно»); null = нет. */
  trialDays: number | null;
  loading: boolean;
  disabled?: boolean;
  /** Цена lifetime из стора (priceString). Показываем третью карточку Phraseman Pro
   *  ТОЛЬКО когда lifetimeAvailable=true (флаг включён + пакет реально пришёл). */
  lifetimePrice?: string | null;
  lifetimeAvailable?: boolean;
}

export default function PaywallPlanCards({
  lang, chrome, selected, onSelect,
  yearlyPerMonth, yearlyFull, monthlyPrice,
  savingsPct, perDayLabel, trialDays, loading, disabled,
  lifetimePrice, lifetimeAvailable,
}: Props) {
  const { tc, textPrimary, textMuted, cardBg, cardBorder, uncheckedBorder } = chrome;
  const perMonthLabel = triLang(lang, {
    ru: '/ мес',
    uk: '/ міс',
    es: '/ mes',
    'pt-BR': '/ mês',
    vi: '/ tháng',
    id: '/ bln',
    tr: '/ ay',
    pl: '/ mies.',
  });

  // Apple 3.1.2(c): списываемая сумма (billed amount) обязана быть самым крупным и
  // заметным ценовым элементом. Поэтому у «Года» КРУПНО показываем полную цену за
  // год (yearlyFull, напр. «$24.99»), а расчётную цену за месяц/день и триал уводим
  // в мелкую подчинённую подпись под ценой. Раньше было наоборот — за это и отклонили.
  const yearSubParts: string[] = [];
  if (trialDays) {
    yearSubParts.push(triLang(lang, {
      ru: `Сначала ${trialDays} дн. бесплатно`,
      uk: `Спершу ${trialDays} дн. безкоштовно`,
      es: `Primero ${trialDays} días gratis`,
      'pt-BR': `Primeiro ${trialDays} dias grátis`,
      vi: `${trialDays} ngày đầu miễn phí`,
      id: `${trialDays} hari pertama gratis`,
      tr: `Önce ${trialDays} gün ücretsiz`,
      pl: `Najpierw ${trialDays} dni za darmo`,
    }));
  }
  if (yearlyPerMonth) {
    yearSubParts.push(`${yearlyPerMonth} ${perMonthLabel}`);
  }
  if (perDayLabel) {
    yearSubParts.push(triLang(lang, {
      ru: `${perDayLabel} в день`,
      uk: `${perDayLabel} на день`,
      es: `${perDayLabel} al día`,
      'pt-BR': `${perDayLabel} por dia`,
      vi: `${perDayLabel} mỗi ngày`,
      id: `${perDayLabel} per hari`,
      tr: `Günde ${perDayLabel}`,
      pl: `${perDayLabel} dziennie`,
    }));
  }

  const renderCard = (
    plan: PaywallPlan,
    name: string,
    price: string,
    sub: string | null,
    badge: string | null,
    hidePerMonth = false,
  ) => {
    const sel = selected === plan;
    return (
      <TouchableOpacity
        activeOpacity={0.72}
        disabled={disabled}
        onPress={() => onSelect(plan)}
        style={[S.card, {
          borderColor: sel ? tc.selectedCardBorder : cardBorder,
          backgroundColor: sel ? `${tc.heroAccent}10` : cardBg,
          shadowColor: sel ? tc.selectedCardShadow : 'transparent',
        }]}
      >
        <View style={S.planHeader}>
          <View style={S.nameWrap}>
            <Ionicons
              name={sel ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={sel ? tc.heroAccent : uncheckedBorder}
            />
            <Text style={[S.name, { color: sel ? textPrimary : textMuted }]}>{name}</Text>
          </View>
          {badge !== null && (
            <View style={[S.saveBadge, { backgroundColor: tc.savingsBadgeBg }]}>
              <Text style={[S.saveBadgeText, { color: tc.savingsBadgeText }]}>{badge}</Text>
            </View>
          )}
        </View>
        <View style={S.priceWrap}>
          <Text
            style={[S.price, { color: sel ? tc.urgencyCurrentPriceText : textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {price || (loading ? '…' : '—')}
          </Text>
          {!hidePerMonth && <Text style={[S.per, { color: textMuted }]}>{perMonthLabel}</Text>}
        </View>
        {sub ? <Text style={[S.sub, { color: textMuted }]}>{sub}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={S.wrap}>
      {renderCard(
        'yearly',
        triLang(lang, {
          ru: 'Год',
          uk: 'Рік',
          es: 'Año',
          'pt-BR': 'Ano',
          vi: 'Năm',
          id: 'Tahun',
          tr: 'Yıl',
          pl: 'Rok',
        }),
        // Крупно — списываемая сумма за год (billed amount), без «/мес».
        yearlyFull || yearlyPerMonth,
        yearSubParts.length ? yearSubParts.join(' · ') : null,
        savingsPct !== null && savingsPct > 0 ? `−${savingsPct}%` : null,
        true, // hidePerMonth — это годовая сумма, а не цена за месяц
      )}
      {renderCard(
        'monthly',
        triLang(lang, {
          ru: 'Месяц',
          uk: 'Місяць',
          es: 'Mes',
          'pt-BR': 'Mês',
          vi: 'Tháng',
          id: 'Bulan',
          tr: 'Ay',
          pl: 'Miesiąc',
        }),
        monthlyPrice,
        null,
        null,
      )}
      {lifetimeAvailable && renderCard(
        'lifetime',
        'Phraseman Pro',
        lifetimePrice || '',
        triLang(lang, {
          ru: 'Разовая покупка',
          uk: 'Разова покупка',
          es: 'Compra única',
          'pt-BR': 'Compra única',
          vi: 'Mua một lần',
          id: 'Pembelian sekali',
          tr: 'Tek seferlik satın alma',
          pl: 'Zakup jednorazowy',
        }),
        triLang(lang, { ru: 'разовый', uk: 'разовий', es: 'único', 'pt-BR': 'único', vi: 'một lần', id: 'sekali', tr: 'tek', pl: 'jednorazowo' }),
        true, // hidePerMonth — lifetime это не /мес
      )}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { gap: 11, marginTop: 16 },
  card: {
    borderRadius: 18, borderWidth: 0, paddingHorizontal: 17, paddingVertical: 15,
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 5,
  },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 },
  name: { flexShrink: 1, fontSize: 16.5, fontWeight: '800', letterSpacing: 0 },
  saveBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  saveBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0 },
  priceWrap: { marginTop: 10, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  price: { flexShrink: 1, fontSize: 23, fontWeight: '900', letterSpacing: 0, fontVariant: ['tabular-nums'] },
  per: { fontSize: 13, fontWeight: '700' },
  sub: { marginTop: 7, fontSize: 13, lineHeight: 18 },
});
