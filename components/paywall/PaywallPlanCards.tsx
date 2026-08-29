// ════════════════════════════════════════════════════════════════════════════
// PaywallPlanCards.tsx — селектор планов: Год (default, доминирует, честный
// «−N%» из цен стора, цена/мес крупно + полная цена года + цена/день) и
// Месяц (якорь). Паттерн с подтверждёнными цифрами: annual-default +15–20%,
// SAVE-бейджи +64–72% в кейсах RevenueCat. Никаких выдуманных зачёркиваний.
// ════════════════════════════════════════════════════════════════════════════
import React from 'react';
import { View, Text, TouchableOpacity, Pressable, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import { LinearGradient } from '../SafeLinearGradient';
import { triLang, type Lang } from '../../constants/i18n';
import type { PaywallChrome } from './paywallShared';
import { PaywallBadgePop } from './PaywallMotion';
import { noAndroidOutline } from '../../constants/androidGlow';
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
  /** Цена разовой покупки из стора. Раскрытие Phraseman Pro доступно только когда
   *  lifetimeAvailable=true (флаг включён + пакет реально пришёл). */
  lifetimePrice?: string | null;
  lifetimeAvailable?: boolean;
  /** Цена приманки-якоря «6 месяцев» (вариант G, computeDecoyPriceString).
   *  Когда задана — между «Годом» и «Месяцем» рендерится полноразмерная
   *  display-only карточка: без onSelect, не выбирается и не покупается. */
  decoyPriceString?: string | null;
  /**
   * Витрина MAX с неистекающими пакетами минут. Карточка визуально
   * идентична карточке Phraseman Pro (та же renderCard) и живёт под ТЕМ ЖЕ
   * тогглом «Дополнительное предложение» — владелец 2026-08-24 отверг
   * отдельный второй тоггл со своим текстом, обе карточки должны
   * разворачиваться вместе, одним движением. Тап уводит на отдельный
   * /max_paywall, а не выбирает MAX как Premium-план. Минуты выдаёт только
   * серверный wallet после подтверждённого store webhook.
   */
  onOpenMaxPaywall?: () => void;
}

export default function PaywallPlanCards({
  lang, chrome, selected, onSelect,
  yearlyPerMonth, yearlyFull, monthlyPrice,
  savingsPct, perDayLabel, trialDays, loading, disabled,
  lifetimePrice, lifetimeAvailable, decoyPriceString, onOpenMaxPaywall,
}: Props) {
  const { tc, textPrimary, textMuted, cardBg, uncheckedBorder } = chrome;
  const [showAdditionalOffer, setShowAdditionalOffer] = React.useState(false);
  // зачем: один тоггл «Дополнительное предложение» открывает ОБЕ карточки —
  // Pro и MAX — одним движением (владелец 2026-08-24 отверг второй отдельный
  // тоггл со своим текстом). Выбор Pro как плана тоже держит секцию открытой.
  const additionalOfferExpanded = showAdditionalOffer || selected === 'lifetime';
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

  // Apple 3.1.2(c): списываемая сумма (billed amount) обязана быть самым крупным и
  // заметным ценовым элементом. Поэтому у «Года» КРУПНО показываем полную цену за
  // год (yearlyFull, напр. «$24.99»), а расчётную цену за месяц/день и триал уводим
  // в мелкую подчинённую подпись под ценой. Раньше было наоборот — за это и отклонили.
  const yearSubParts: string[] = [];
  if (trialDays) {
    yearSubParts.push(triLang(lang, {
      ru: `Сначала ${trialDays} дн. бесплатно`,
      uk: `Спершу ${trialDays} дн. безкоштовно`,
      en: `First ${trialDays} days free`,
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
      en: `${perDayLabel} per day`,
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
    /**
     * Карточка-переход, а не карточка-выбор (MAX): тап сразу открывает
     * /max_paywall вместо onSelect. Визуально идентична карточке Pro —
     * та же вёрстка/цвета/размеры renderCard, только вместо radio-кружка
     * chevron-forward (навигация, не выбор плана здесь).
     */
    onNavigate?: () => void,
  ) => {
    const sel = !onNavigate && selected === plan;
    const planSurfaceColors = [
      `${tc.heroAccent}${sel ? '28' : '14'}`,
      sel ? chrome.cardBgStrong : cardBg,
      cardBg,
    ] as [string, string, string];
    return (
      <TouchableOpacity
        accessibilityRole={onNavigate ? 'button' : 'radio'}
        accessibilityLabel={`${name} ${price}`.trim()}
        accessibilityState={onNavigate ? { disabled: !!disabled } : { selected: sel, disabled: !!disabled }}
        activeOpacity={0.72}
        disabled={disabled}
        onPress={() => (onNavigate ? onNavigate() : onSelect(plan))}
        style={[S.card, {
          backgroundColor: sel ? chrome.cardBgStrong : cardBg,
          shadowColor: sel ? tc.selectedCardShadow : 'transparent',
        }]}
      >
        <LinearGradient
          colors={planSurfaceColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            S.cardHighlight,
            { backgroundColor: `${tc.heroAccent}${sel ? '66' : '2E'}` },
          ]}
        />
        <View style={S.planHeader}>
          <View style={S.nameWrap}>
            <Ionicons
              name={onNavigate ? 'chevron-forward' : sel ? 'checkmark-circle' : 'ellipse-outline'}
              size={24}
              color={sel ? tc.heroAccent : uncheckedBorder}
            />
            <Text style={[S.name, { color: sel ? textPrimary : textMuted }]}>{name}</Text>
          </View>
          {badge !== null && (
            <PaywallBadgePop pulse style={[S.saveBadge, { backgroundColor: tc.savingsBadgeBg }]}>
              <Text style={[S.saveBadgeText, { color: tc.savingsBadgeText }]}>{badge}</Text>
            </PaywallBadgePop>
          )}
        </View>
        <View style={S.priceWrap}>
          {/* зачем: убран шрифто-сжимающий проп (запрещён на iOS) — S.price уже
              flexShrink:1, numberOfLines={1} усекает хвостом по умолчанию */}
          <Text
            style={[S.price, { color: sel ? tc.urgencyCurrentPriceText : textPrimary }]}
            numberOfLines={1}
          >
            {price || (loading ? '…' : '—')}
          </Text>
          {!hidePerMonth && <Text style={[S.per, { color: textMuted }]}>{perMonthLabel}</Text>}
        </View>
        {sub ? <Text style={[S.sub, { color: textMuted }]}>{sub}</Text> : null}
      </TouchableOpacity>
    );
  };

  // Якорь-приманка «6 месяцев» (вариант G): ПОЛНОРАЗМЕРНАЯ карточка, визуально
  // идентичная невыбранным карточкам планов (те же стили/градиент/подсветка),
  // но принципиально display-only — намеренно View без какой-либо обработки
  // нажатия: якорь не выбирается, не попадает в selectPlan/покупку, дефолтный
  // выбор остаётся годовым.
  const renderDecoyCard = (name: string, price: string) => {
    const decoySurfaceColors = [
      `${tc.heroAccent}14`,
      cardBg,
      cardBg,
    ] as [string, string, string];
    return (
      <View
        accessibilityRole="text"
        accessibilityLabel={`${name} ${price}`.trim()}
        style={[S.card, {
          backgroundColor: cardBg,
          shadowColor: 'transparent',
        }]}
      >
        <LinearGradient
          colors={decoySurfaceColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <View
          pointerEvents="none"
          style={[
            S.cardHighlight,
            { backgroundColor: `${tc.heroAccent}2E` },
          ]}
        />
        <View style={S.planHeader}>
          <View style={S.nameWrap}>
            <Ionicons name="ellipse-outline" size={24} color={uncheckedBorder} />
            <Text style={[S.name, { color: textMuted }]}>{name}</Text>
          </View>
        </View>
        <View style={S.priceWrap}>
          {/* зачем: убран шрифто-сжимающий проп (запрещён на iOS) — S.price уже
              flexShrink:1, numberOfLines={1} усекает хвостом по умолчанию */}
          <Text
            style={[S.price, { color: textPrimary }]}
            numberOfLines={1}
          >
            {price}
          </Text>
        </View>
      </View>
    );
  };

  const decoyName = triLang(lang, {
    ru: '6 месяцев', uk: '6 місяців', en: '6 months', es: '6 meses', 'pt-BR': '6 meses',
    vi: '6 tháng', id: '6 bulan', tr: '6 ay', pl: '6 miesięcy',
  });

  const additionalOfferTitle = triLang(lang, {
    ru: 'Дополнительное предложение',
    uk: 'Додаткова пропозиція',
    en: 'Additional offer',
    es: 'Oferta adicional',
    'pt-BR': 'Oferta adicional',
    vi: 'Ưu đãi khác',
    id: 'Penawaran tambahan',
    tr: 'Ek teklif',
    pl: 'Dodatkowa oferta',
  });
  // зачем: подпись под тогглом честно отражает, что реально раскроется —
  // и Pro, и MAX (если оба доступны), только Pro, или только MAX.
  const additionalOfferSubtitle = lifetimeAvailable && onOpenMaxPaywall
    ? triLang(lang, {
        ru: 'Phraseman Pro и MAX', uk: 'Phraseman Pro та MAX', en: 'Phraseman Pro and MAX', es: 'Phraseman Pro y MAX',
        'pt-BR': 'Phraseman Pro e MAX', vi: 'Phraseman Pro và MAX', id: 'Phraseman Pro dan MAX',
        tr: 'Phraseman Pro ve MAX', pl: 'Phraseman Pro i MAX',
      })
    : onOpenMaxPaywall
      ? triLang(lang, {
          ru: 'MAX · пакеты минут с ИИ-учителем', uk: 'MAX · пакети хвилин із ШІ-вчителем',
          en: 'MAX · minute packs with an AI teacher',
          es: 'MAX · paquetes de minutos con tu profesor de IA', 'pt-BR': 'MAX · pacotes de minutos com o professor de IA',
          vi: 'MAX · gói phút với gia sư AI', id: 'MAX · paket menit bersama guru AI',
          tr: 'MAX · yapay zekâ öğretmeninle dakika paketleri', pl: 'MAX · pakiety minut z nauczycielem AI',
        })
      : triLang(lang, {
          ru: 'Phraseman Pro · разовая покупка', uk: 'Phraseman Pro · разова покупка', en: 'Phraseman Pro · one-time purchase', es: 'Phraseman Pro · compra única',
          'pt-BR': 'Phraseman Pro · compra única', vi: 'Phraseman Pro · mua một lần', id: 'Phraseman Pro · pembelian sekali',
          tr: 'Phraseman Pro · tek seferlik satın alma', pl: 'Phraseman Pro · zakup jednorazowy',
        });
  // зачем: сброс на 'yearly' при закрытии специфичен только для Pro
  // ('lifetime' — единственное non-monthly/yearly значение PaywallPlan).
  // MAX сюда намеренно не попадает — он никогда не становится selected
  // (renderCard с onNavigate всегда даёт sel=false, тап уходит на
  // /max_paywall, а не в onSelect). Если MAX когда-нибудь станет настоящим
  // PaywallPlan-значением — эту защиту придётся расширить на него тоже.
  const toggleAdditionalOffer = () => {
    const nextExpanded = !additionalOfferExpanded;
    if (!nextExpanded && selected === 'lifetime') onSelect('yearly');
    setShowAdditionalOffer(nextExpanded);
  };

  return (
    <View style={S.wrap}>
      {renderCard(
        'yearly',
        triLang(lang, {
          ru: 'Год',
          uk: 'Рік',
          en: 'Year',
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
      {decoyPriceString ? renderDecoyCard(decoyName, decoyPriceString) : null}
      {renderCard(
        'monthly',
        triLang(lang, {
          ru: 'Месяц',
          uk: 'Місяць',
          en: 'Month',
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
      {(lifetimeAvailable || onOpenMaxPaywall) && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={additionalOfferTitle}
          accessibilityHint={additionalOfferSubtitle}
          accessibilityState={{ expanded: additionalOfferExpanded, disabled: !!disabled }}
          disabled={disabled}
          hitSlop={4}
          onPress={toggleAdditionalOffer}
          style={({ pressed }) => [
            S.offerToggle,
            { backgroundColor: cardBg },
            pressed && !disabled ? S.offerTogglePressed : null,
          ]}
        >
          <View style={S.offerToggleCopy}>
            <Text style={[S.offerToggleTitle, { color: textPrimary }]}>{additionalOfferTitle}</Text>
            <Text style={[S.offerToggleSubtitle, { color: textMuted }]}>{additionalOfferSubtitle}</Text>
          </View>
          <Ionicons
            name={additionalOfferExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={textMuted}
          />
        </Pressable>
      )}
      {lifetimeAvailable && additionalOfferExpanded && renderCard(
        'lifetime',
        'Phraseman Pro',
        lifetimePrice || '',
        triLang(lang, {
          ru: 'Разовая покупка',
          uk: 'Разова покупка',
          en: 'One-time purchase',
          es: 'Compra única',
          'pt-BR': 'Compra única',
          vi: 'Mua một lần',
          id: 'Pembelian sekali',
          tr: 'Tek seferlik satın alma',
          pl: 'Zakup jednorazowy',
        }),
        triLang(lang, { ru: 'разовый', uk: 'разовий', en: 'one-time', es: 'único', 'pt-BR': 'único', vi: 'một lần', id: 'sekali', tr: 'tek', pl: 'jednorazowo' }),
        true, // hidePerMonth — lifetime это не /мес
      )}
      {onOpenMaxPaywall && additionalOfferExpanded && renderCard(
        'monthly', // зачем: MAX не план usePaywallPurchase — plan-параметр здесь не участвует в selected (onNavigate ставит sel=false всегда)
        'MAX',
        triLang(lang, {
          ru: '30 · 120 · 300 минут', uk: '30 · 120 · 300 хвилин', en: '30 · 120 · 300 minutes', es: '30 · 120 · 300 minutos',
          'pt-BR': '30 · 120 · 300 minutos', vi: '30 · 120 · 300 phút', id: '30 · 120 · 300 menit',
          tr: '30 · 120 · 300 dakika', pl: '30 · 120 · 300 minut',
        }),
        triLang(lang, {
          ru: 'Разовая покупка · минуты не сгорают', uk: 'Разова купівля · хвилини не згорають', en: 'One-time purchase · minutes never expire', es: 'Compra única · los minutos no caducan',
          'pt-BR': 'Compra única · os minutos não expiram', vi: 'Mua một lần · số phút không hết hạn', id: 'Pembelian sekali · menit tidak kedaluwarsa',
          tr: 'Tek seferlik satın alma · dakikalar süresiz', pl: 'Jednorazowy zakup · minuty nie wygasają',
        }),
        null,
        true, // навигационная карточка пакетов, не периодическая цена
        onOpenMaxPaywall,
      )}
    </View>
  );
}

const S = StyleSheet.create({
  wrap: { gap: 11, marginTop: 16 },
  card: {
    // зачем: карточки тарифов безрамочные (тон вместо обводки — контракт
    // paywall_tonal_surfaces); мёртвые borderColor-пропсы убраны, borderWidth: 0 явно.
    borderRadius: 18, borderWidth: 0, paddingHorizontal: 17, paddingVertical: 15,
    // зачем: фон карточки тарифа приходит из темы (может быть полупрозрачным) —
    // Android рисовал квадрат вокруг скругления 18.
    shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 12,
    ...noAndroidOutline,
    overflow: 'hidden',
  },
  cardHighlight: { position: 'absolute', top: 0, left: 18, right: 18, height: 1, opacity: 0.72 },
  planHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 },
  name: { flexShrink: 1, fontSize: 16.5, fontWeight: '800', letterSpacing: 0 },
  saveBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  saveBadgeText: { fontSize: 12, fontWeight: '900', letterSpacing: 0 },
  priceWrap: { marginTop: 10, flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  price: { flexShrink: 1, fontSize: 23, fontWeight: '900', letterSpacing: 0, fontVariant: ['tabular-nums'] },
  per: { fontSize: 13, fontWeight: '700' },
  sub: { marginTop: 7, fontSize: 13, lineHeight: 18 },
  offerToggle: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  offerTogglePressed: { opacity: 0.72 },
  offerToggleCopy: { flex: 1, minWidth: 0 },
  offerToggleTitle: { fontSize: 14.5, lineHeight: 19, fontWeight: '800' },
  offerToggleSubtitle: { marginTop: 2, fontSize: 12.5, lineHeight: 17, fontWeight: '600' },
});
