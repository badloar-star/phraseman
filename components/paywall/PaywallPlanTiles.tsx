// ════════════════════════════════════════════════════════════════════════════
// PaywallPlanTiles.tsx — селектор планов «плитками» для варианта D («Плитки»):
// горизонтальный ряд квадратных плиток Месяц / Год / Pro (если lifetime
// доступен). Год предвыбран и визуально доминирует: рамка акцента,
// галочка, статичное увеличение через стили (без анимаций). На годовой плитке —
// честный бейдж −N% из цен стора и фрейминг цены за месяц/день под ней.
// Списываемая сумма года (billed amount) показывается крупно — Apple 3.1.2(c).
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';
import { PaywallBadgePop } from './PaywallMotion';
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
  loading: boolean;
  disabled?: boolean;
  lifetimePrice?: string | null;
  lifetimeAvailable?: boolean;
}

interface TileSpec {
  plan: PaywallPlan;
  name: string;
  price: string;
  sub: string | null;
  badge: string | null;
}

export default function PaywallPlanTiles({
  lang, chrome, selected, onSelect,
  yearlyPerMonth, yearlyFull, monthlyPrice,
  savingsPct, perDayLabel, loading, disabled,
  lifetimePrice, lifetimeAvailable,
}: Props) {
  const { tc, textPrimary, textMuted, cardBg, cardBorder } = chrome;
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

  const yearSubParts: string[] = [];
  if (yearlyPerMonth) yearSubParts.push(`${yearlyPerMonth} ${perMonthLabel}`);
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

  const tiles: TileSpec[] = [
    {
      plan: 'monthly',
      name: triLang(lang, {
        ru: 'Месяц', uk: 'Місяць', es: 'Mes', 'pt-BR': 'Mês',
        vi: 'Tháng', id: 'Bulan', tr: 'Ay', pl: 'Miesiąc',
      }),
      price: monthlyPrice,
      sub: monthlyPrice ? triLang(lang, {
        ru: 'каждый месяц', uk: 'щомісяця', es: 'cada mes', 'pt-BR': 'todo mês',
        vi: 'mỗi tháng', id: 'tiap bulan', tr: 'her ay', pl: 'co miesiąc',
      }) : null,
      badge: null,
    },
    {
      plan: 'yearly',
      name: triLang(lang, {
        ru: 'Год', uk: 'Рік', es: 'Año', 'pt-BR': 'Ano',
        vi: 'Năm', id: 'Tahun', tr: 'Yıl', pl: 'Rok',
      }),
      // Крупно — списываемая сумма за год (billed amount).
      price: yearlyFull || yearlyPerMonth,
      sub: yearSubParts.length ? yearSubParts.join('\n') : null,
      badge: savingsPct !== null && savingsPct > 0 ? `−${savingsPct}%` : null,
    },
  ];
  if (lifetimeAvailable) {
    tiles.push({
      plan: 'lifetime',
      // Короткий лейбл: «Phraseman Pro» не влезал в узкую плитку и резался
      // («Phrasem…»). Подпись — «разовая покупка»: прежняя подпись про вечность
      // запрещена владельцем на этой плитке.
      name: 'Pro',
      price: lifetimePrice || '',
      sub: triLang(lang, {
        ru: 'разовая покупка', uk: 'разова покупка', es: 'compra única', 'pt-BR': 'compra única',
        vi: 'mua một lần', id: 'pembelian sekali', tr: 'tek seferlik satın alma', pl: 'zakup jednorazowy',
      }),
      badge: null,
    });
  }

  return (
    <View style={S.row}>
      {tiles.map((tile) => {
        const sel = selected === tile.plan;
        return (
          <TouchableOpacity
            key={tile.plan}
            accessibilityRole="radio"
            accessibilityLabel={`${tile.name} ${tile.price}`.trim()}
            accessibilityState={{ selected: sel, disabled: !!disabled }}
            activeOpacity={0.72}
            disabled={disabled}
            onPress={() => onSelect(tile.plan)}
            style={[
              S.tile,
              sel && S.tileSelected,
              {
                borderColor: sel ? tc.selectedCardBorder : cardBorder,
                backgroundColor: sel ? chrome.cardBgStrong : cardBg,
                shadowColor: sel ? tc.selectedCardShadow : 'transparent',
              },
            ]}
          >
            {tile.badge !== null && (
              <PaywallBadgePop pulse style={[S.saveBadge, { backgroundColor: tc.savingsBadgeBg }]}>
                <Text style={[S.saveBadgeText, { color: tc.savingsBadgeText }]}>{tile.badge}</Text>
              </PaywallBadgePop>
            )}
            <View style={S.checkWrap}>
              <Ionicons
                name={sel ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={sel ? tc.heroAccent : chrome.uncheckedBorder}
              />
            </View>
            <Text style={[S.name, { color: sel ? textPrimary : textMuted }]} numberOfLines={1}>
              {tile.name}
            </Text>
            <Text
              style={[S.price, { color: sel ? tc.urgencyCurrentPriceText : textPrimary }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.72}
            >
              {tile.price || (loading ? '…' : '—')}
            </Text>
            {tile.sub ? (
              <Text style={[S.sub, { color: textMuted }]}>{tile.sub}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const S = StyleSheet.create({
  // 390px-экран: wrap-паддинг экрана 22×2, gap 8×2 → плитка ~110px, всё влезает
  // без обрезки крайних плиток и без горизонтального скролла.
  row: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'stretch' },
  tile: {
    flex: 1,
    minHeight: 148,
    borderRadius: 16,
    borderWidth: 1.5,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    elevation: 4,
  },
  // Выбранная плитка доминирует статично (без анимаций): чуть крупнее и выше.
  tileSelected: {
    transform: [{ scale: 1.04 }],
    borderWidth: 2,
  },
  saveBadge: {
    position: 'absolute', top: -9, alignSelf: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9,
  },
  saveBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0 },
  checkWrap: { alignSelf: 'flex-end' },
  name: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0 },
  price: {
    fontSize: 19, fontWeight: '900', letterSpacing: 0,
    fontVariant: ['tabular-nums'], textAlign: 'center',
  },
  sub: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
});
