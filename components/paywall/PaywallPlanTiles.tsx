// ════════════════════════════════════════════════════════════════════════════
// PaywallPlanTiles.tsx — селектор планов «плитками» для варианта D («Плитки»):
// горизонтальный ряд квадратных плиток Месяц / Год / Pro (если lifetime
// доступен). Год предвыбран и визуально доминирует: рамка акцента,
// галочка, статичное увеличение через стили (без анимаций). На годовой плитке —
// честный бейдж −N% из цен стора и фрейминг цены за месяц/день под ней.
// Списываемая сумма года (billed amount) показывается крупно — Apple 3.1.2(c).
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';
import { PaywallBadgePop } from './PaywallMotion';
import { noAndroidOutline } from '../../constants/androidGlow';
import type { PaywallPlan } from '../../app/paywall_purchase';
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
  loading: boolean;
  disabled?: boolean;
  lifetimePrice?: string | null;
  lifetimeAvailable?: boolean;
  /**
   * Витрина тарифа MAX рядом с Pro в том же ряду плиток — тап сразу открывает
   * /max_paywall (там своя покупка через max_subscription_purchase), плитка
   * не выбирается как план: MAX не входит в usePaywallPurchase (денежный
   * путь Plus/Pro трогать рискованно без возможности проверить транзакцию).
   */
  onOpenMaxPaywall?: () => void;
}

interface TileSpec {
  plan: PaywallPlan;
  name: string;
  price: string;
  sub: string | null;
  badge: string | null;
  /** Плитка-переход (MAX): тап вызывает это вместо onSelect. */
  onNavigate?: () => void;
}

export default function PaywallPlanTiles({
  lang, chrome, selected, onSelect,
  yearlyPerMonth, yearlyFull, monthlyPrice,
  savingsPct, perDayLabel, loading, disabled,
  lifetimePrice, lifetimeAvailable, onOpenMaxPaywall,
}: Props) {
  const { themeMode } = useTheme();
  const isOlive = themeMode === 'olive';
  const { tc, textPrimary, textMuted, cardBg } = chrome;
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
  if (yearlyPerMonth) yearSubParts.push(`${yearlyPerMonth} ${perMonthLabel}`);
  if (perDayLabel) {
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
  if (onOpenMaxPaywall) {
    tiles.push({
      plan: 'monthly', // не участвует в выборе — плитка навигационная (onNavigate)
      name: 'MAX',
      price: triLang(lang, {
        ru: '120 минут в месяц', uk: '120 хвилин на місяць', en: '120 minutes a month', es: '120 minutos al mes',
        'pt-BR': '120 minutos por mês', vi: '120 phút mỗi tháng', id: '120 menit per bulan',
        tr: 'ayda 120 dakika', pl: '120 minut miesięcznie',
      }),
      sub: triLang(lang, {
        ru: 'звонки с ИИ', uk: 'дзвінки з ШІ', en: 'AI calls', es: 'llamadas con IA', 'pt-BR': 'ligações com IA',
        vi: 'gọi với AI', id: 'panggilan AI', tr: 'yapay zekâ ile arama', pl: 'rozmowy z AI',
      }),
      badge: null,
      onNavigate: onOpenMaxPaywall,
    });
  }

  // зачем: 4 плитки (Месяц/Год/Pro/MAX) в жёстком ряду сжимаются ниже
  // читаемой ширины на 390px-экране — комментарий в шапке файла уже
  // предупреждал об этом риске для 3 плиток. При 4+ переключаемся на
  // горизонтальный скролл с фиксированной шириной плитки; 2-3 плитки
  // (без MAX/Pro) остаются как раньше — равномерный ряд без скролла.
  const scrollable = tiles.length >= 4;
  const tilesRow = (
    <>
      {tiles.map((tile, i) => {
        const sel = !tile.onNavigate && selected === tile.plan;
        return (
          <TouchableOpacity
            key={tile.onNavigate ? `${tile.plan}-${i}` : tile.plan}
            accessibilityRole={tile.onNavigate ? 'button' : 'radio'}
            accessibilityLabel={`${tile.name} ${tile.price}`.trim()}
            accessibilityState={tile.onNavigate ? { disabled: !!disabled } : { selected: sel, disabled: !!disabled }}
            activeOpacity={0.72}
            disabled={disabled}
            onPress={() => (tile.onNavigate ? tile.onNavigate() : onSelect(tile.plan))}
            style={[
              S.tile,
              scrollable && S.tileFixedWidth,
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
            <View style={S.checkWrap}>
              <Ionicons
                name={tile.onNavigate ? 'chevron-forward-circle-outline' : sel ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={sel ? tc.heroAccent : chrome.uncheckedBorder}
              />
            </View>
            <Text style={[S.name, { color: sel ? textPrimary : textMuted }]} numberOfLines={1}>
              {tile.name}
            </Text>
            {/* зачем: убран шрифто-сжимающий проп (запрещён на iOS) — numberOfLines={1}
                уже усекает хвостом по умолчанию, крайний случай на узкой плитке */}
            <Text
              style={[S.price, { color: isOlive && sel ? OLIVE_RICH.ivory : sel ? tc.urgencyCurrentPriceText : textPrimary }]}
              numberOfLines={1}
            >
              {tile.price || (loading ? '…' : '—')}
            </Text>
            {tile.sub ? (
              <Text style={[S.sub, { color: textMuted }]}>{tile.sub}</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </>
  );

  // зачем: единственная проверка "4+ плиток" — раньше дублировалась здесь и
  // в scrollable выше; теперь оба места читают один и тот же `scrollable`,
  // порог не может рассинхронизироваться при будущей правке одного из них.
  if (scrollable) {
    return (
      <ScrollView decelerationRate="fast"
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={S.rowScroll}
      >
        {tilesRow}
      </ScrollView>
    );
  }

  return <View style={S.row}>{tilesRow}</View>;
}

const S = StyleSheet.create({
  // 390px-экран: wrap-паддинг экрана 22×2, gap 8×2 → плитка ~110px, всё влезает
  // без обрезки крайних плиток и без горизонтального скролла (2-3 плитки).
  row: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'stretch' },
  // 4+ плитки (добавлен MAX) переполняют жёсткий ряд — горизонтальный скролл
  // с плитками фиксированной ширины вместо сжатия ниже читаемого предела.
  rowScroll: { flexDirection: 'row', gap: 8, marginTop: 16, alignItems: 'stretch', paddingRight: 4 },
  tileFixedWidth: { flex: 0, width: 112 },
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
  // Выбранная плитка доминирует статично (без анимаций): чуть крупнее и выше.
  tileSelected: {
    transform: [{ scale: 1.04 }],
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
