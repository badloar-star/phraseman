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
import PaywallPromoCorner from './PaywallPromoCorner';
import { noAndroidOutline } from '../../constants/androidGlow';
import type { PaywallPlan } from '../../app/paywall_purchase';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import { useTheme } from '../ThemeContext';
import { OLIVE_RICH, oliveShadow } from '../../constants/oliveTheme';

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
  /** Реальный offer текущего выбранного плана из стора. */
  promo?: StorePromoPricing | null;
  loading: boolean;
  disabled?: boolean;
  /** Compact opt-in for the non-onboarding D price dock. */
  compact?: boolean;
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
  savingsPct, perDayLabel, promo = null, loading, disabled,
  lifetimePrice, lifetimeAvailable, compact = false,
}: Props) {
  const { themeMode } = useTheme();
  const isOlive = themeMode === 'olive';
  const { tc, textPrimary, textMuted, cardBg } = chrome;
  const annualPromoActive = selected === 'yearly' && promo !== null;
  const perMonthLabel = triLang(lang, {
    ru: '/ мес',
    uk: '/ міс',
    en: '/ mo',
    es: '/ mes',
    'pt-BR': '/ mês',
    vi: '/ tháng',
    id: '/ bln',
    tr: '/ ay',
    pl: '/ mies.',
  });

  const yearSubParts: string[] = [];
  if (yearlyPerMonth && !annualPromoActive) yearSubParts.push(`${yearlyPerMonth} ${perMonthLabel}`);
  if (perDayLabel && !annualPromoActive) {
    yearSubParts.push(triLang(lang, {
      ru: `${perDayLabel} в день`,
      uk: `${perDayLabel} на день`,
      en: `${perDayLabel} per day`,
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
        ru: 'Месяц', uk: 'Місяць', en: 'Month', es: 'Mes', 'pt-BR': 'Mês',
        vi: 'Tháng', id: 'Bulan', tr: 'Ay', pl: 'Miesiąc',
      }),
      price: monthlyPrice,
      sub: monthlyPrice ? triLang(lang, {
        ru: 'каждый месяц', uk: 'щомісяця', en: 'every month', es: 'cada mes', 'pt-BR': 'todo mês',
        vi: 'mỗi tháng', id: 'tiap bulan', tr: 'her ay', pl: 'co miesiąc',
      }) : null,
      badge: null,
    },
    {
      plan: 'yearly',
      name: triLang(lang, {
        ru: 'Год', uk: 'Рік', en: 'Year', es: 'Año', 'pt-BR': 'Ano',
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
        ru: 'разовая покупка', uk: 'разова покупка', en: 'one-time purchase', es: 'compra única', 'pt-BR': 'compra única',
        vi: 'mua một lần', id: 'pembelian sekali', tr: 'tek seferlik satın alma', pl: 'zakup jednorazowy',
      }),
      badge: null,
    });
  }
  return (
    <View style={[S.row, compact && S.rowCompact]}>
      {tiles.map((tile) => {
        const sel = selected === tile.plan;
        const activePromo = sel ? promo : null;
        const billedPrice = activePromo?.promoPriceString || tile.price;
        const tileDisabled = !!disabled || (compact && !billedPrice);
        return (
          <TouchableOpacity
            key={tile.plan}
            accessibilityRole="radio"
            accessibilityLabel={`${tile.name} ${billedPrice}`.trim()}
            accessibilityState={{ selected: sel, disabled: tileDisabled }}
            activeOpacity={0.72}
            disabled={tileDisabled}
            onPress={() => onSelect(tile.plan)}
            style={[
              S.tile,
              compact && S.tileCompact,
              // зачем: в оливковой теме выбранная плитка намеренно БЕЗ увеличения
              // и без рамки — матовый вид (см. olive_paywall_reward_contract).
              // Выбор там показывают фон cardBgStrong, галочка и тень.
              sel && !isOlive && S.tileSelected,
              {
                backgroundColor: sel ? chrome.cardBgStrong : cardBg,
                shadowColor: sel ? tc.selectedCardShadow : 'transparent',
                ...(isOlive ? oliveShadow(sel ? 2 : 1) : null),
              },
            ]}
          >
            {tile.badge !== null && (
              <PaywallBadgePop pulse style={[S.saveBadge, { backgroundColor: tc.savingsBadgeBg }]}>
                <Text style={[S.saveBadgeText, { color: tc.savingsBadgeText }]}>{tile.badge}</Text>
              </PaywallBadgePop>
            )}
            <PaywallPromoCorner
              compact
              lang={lang}
              chrome={chrome}
              promo={activePromo}
              style={[S.promoCorner, compact && S.promoCornerCompact]}
            />
            <View style={[S.checkWrap, compact && S.checkWrapCompact]}>
              <Ionicons
                name={sel ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={sel ? tc.heroAccent : chrome.uncheckedBorder}
              />
            </View>
            <Text style={[S.name, compact && S.nameCompact, { color: sel ? textPrimary : textMuted }]}>
              {tile.name}
            </Text>
            {/* зачем: название и цена показываются ЦЕЛИКОМ (владелец 2026-09-17:
                «текст не должен уходить в три точки»). Плитка узкая (~110px на
                390px-экране), поэтому длинная цена переносится на вторую строку;
                высота плитки тянется по содержимому (minHeight вместо фикса).
                Шрифт не сжимаем — это запрет владельца. */}
            <Text
              style={[S.price, compact && S.priceCompact, { color: isOlive && sel ? OLIVE_RICH.ivory : sel ? tc.urgencyCurrentPriceText : textPrimary }]}
            >
              {billedPrice || (loading ? '…' : '—')}
            </Text>
            {activePromo ? (
              <Text style={[S.standardPrice, { color: tc.urgencyStrikethroughColor }]}>
                {activePromo.standardPriceString}
              </Text>
            ) : null}
            {tile.sub ? (
              <Text style={[S.sub, compact && S.subCompact, { color: textMuted }]}>{tile.sub}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const S = StyleSheet.create({
  // 390px-экран: wrap-паддинг экрана 22×2, gap 8×2 → плитка ~110px, всё влезает
  // без обрезки крайних плиток и без горизонтального скролла (2-3 плитки).
  row: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'stretch' },
  rowCompact: { marginTop: 0 },
  // зачем (аудит по Библии + запрет владельца, 2026-08-26): обводка контейнера
  // запрещена — разделяем тоном. Выбор тарифа и без рамки читается тремя
  // способами: галочка checkmark-circle, увеличение scale 1.04 и более
  // насыщенный фон cardBgStrong против cardBg.
  tile: {
    flex: 1,
    minHeight: 148,
    borderRadius: 16,
    borderWidth: 0,
    paddingHorizontal: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 4,
    // зачем: фон плитки тарифа задаёт тема — Android не выводил скруглённый
    // outline и рисовал квадрат вокруг радиуса 16.
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 10,
    ...noAndroidOutline,
  },
  tileCompact: { minHeight: 48, paddingHorizontal: 7, paddingVertical: 7, borderRadius: 14, gap: 2 },
  // Выбранная плитка доминирует статично (без анимаций): чуть крупнее и выше.
  tileSelected: {
    transform: [{ scale: 1.04 }],
  },
  saveBadge: {
    position: 'absolute', top: -9, alignSelf: 'center',
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9,
  },
  promoCorner: { right: -3, top: 42 },
  promoCornerCompact: { top: 31 },
  saveBadgeText: { fontSize: 11, fontWeight: '900', letterSpacing: 0 },
  checkWrap: { alignSelf: 'flex-end' },
  checkWrapCompact: { position: 'absolute', right: 6, top: 6 },
  // зачем: имя тарифа переносится по словам и центрируется — на узкой плитке
  // двухстрочное имя должно читаться как единый блок, а не жаться к краю.
  name: { fontSize: 13.5, fontWeight: '800', letterSpacing: 0, textAlign: 'center' },
  nameCompact: { paddingHorizontal: 18, fontSize: 12.5, lineHeight: 16 },
  price: {
    fontSize: 19, fontWeight: '900', letterSpacing: 0,
    fontVariant: ['tabular-nums'], textAlign: 'center',
  },
  priceCompact: { fontSize: 17, lineHeight: 21 },
  standardPrice: { fontSize: 10, fontWeight: '700', textDecorationLine: 'line-through', textAlign: 'center' },
  sub: { fontSize: 11, lineHeight: 15, textAlign: 'center' },
  subCompact: { fontSize: 10, lineHeight: 13 },
});
