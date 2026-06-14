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
}

export default function PaywallPlanCards({
  lang, chrome, selected, onSelect,
  yearlyPerMonth, yearlyFull, monthlyPrice,
  savingsPct, perDayLabel, trialDays, loading, disabled,
}: Props) {
  const { tc, textPrimary, textMuted, cardBg, cardBorder, uncheckedBorder } = chrome;
  const perMonthLabel = triLang(lang, { ru: '/ мес', uk: '/ міс', es: '/ mes' });

  const yearSubParts: string[] = [];
  if (trialDays) {
    yearSubParts.push(triLang(lang, {
      ru: `Сначала ${trialDays} дн. бесплатно`,
      uk: `Спершу ${trialDays} дн. безкоштовно`,
      es: `Primero ${trialDays} días gratis`,
    }));
  }
  if (yearlyFull) {
    yearSubParts.push(triLang(lang, {
      ru: `${yearlyFull} раз в год`,
      uk: `${yearlyFull} раз на рік`,
      es: `${yearlyFull} al año`,
    }));
  }
  if (perDayLabel) {
    yearSubParts.push(triLang(lang, {
      ru: `${perDayLabel} в день`,
      uk: `${perDayLabel} на день`,
      es: `${perDayLabel} al día`,
    }));
  }

  const renderCard = (plan: PaywallPlan, name: string, price: string, sub: string | null, badge: string | null) => {
    const sel = selected === plan;
    return (
      <TouchableOpacity
        activeOpacity={0.72}
        disabled={disabled}
        onPress={() => onSelect(plan)}
        style={[S.card, {
          borderColor: sel ? tc.selectedCardBorder : cardBorder,
          backgroundColor: 'transparent',
          shadowColor: sel ? tc.selectedCardShadow : 'transparent',
        }]}
      >
        <View style={S.row1}>
          <Ionicons
            name={sel ? 'checkmark-circle' : 'ellipse-outline'}
            size={20}
            color={sel ? tc.heroAccent : uncheckedBorder}
          />
          <Text style={[S.name, { color: sel ? textPrimary : textMuted }]}>{name}</Text>
          {badge !== null && (
            <View style={[S.saveBadge, { backgroundColor: tc.savingsBadgeBg }]}>
              <Text style={[S.saveBadgeText, { color: tc.savingsBadgeText }]}>{badge}</Text>
            </View>
          )}
          <View style={S.priceWrap}>
            <Text style={[S.price, { color: sel ? tc.urgencyCurrentPriceText : textMuted }]}>
              {price || (loading ? '…' : '—')}
            </Text>
            <Text style={[S.per, { color: textMuted }]}>{perMonthLabel}</Text>
          </View>
        </View>
        {sub ? <Text style={[S.sub, { color: textMuted }]}>{sub}</Text> : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={S.wrap}>
      {renderCard(
        'yearly',
        triLang(lang, { ru: 'Год', uk: 'Рік', es: 'Año' }),
        yearlyPerMonth,
        yearSubParts.length ? yearSubParts.join(' · ') : null,
        savingsPct !== null && savingsPct > 0 ? `−${savingsPct}%` : null,
      )}
      {renderCard(
        'monthly',
        triLang(lang, { ru: 'Месяц', uk: 'Місяць', es: 'Mes' }),
        monthlyPrice,
        null,
        null,
      )}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { gap: 9, marginTop: 14 },
  card: {
    borderRadius: 16, borderWidth: 1.5, paddingHorizontal: 15, paddingVertical: 13,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.28, shadowRadius: 10, elevation: 4,
  },
  row1: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  name: { fontSize: 14.5, fontWeight: '700' },
  saveBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 2 },
  saveBadgeText: { fontSize: 10.5, fontWeight: '800', letterSpacing: 0.3 },
  priceWrap: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  price: { fontSize: 16.5, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  per: { fontSize: 10.5, fontWeight: '500' },
  sub: { marginTop: 7, paddingLeft: 30, fontSize: 11, lineHeight: 15 },
});
