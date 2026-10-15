// ════════════════════════════════════════════════════════════════════════════
// PaywallPlus.tsx — ЕДИНСТВЕННЫЙ пейвол Plus (владелец 2026-09-30, макет
// paywall-v3.html «Честный пробный период»; все прочие пейволы A–G удалены, D78).
//
// Правила владельца, которые держит этот файл:
//  • цена за ГОД — главная и крупная, «≈ X в месяц» у года — мелко
//    («сторы отклоняют если наоборот», Apple 3.1.2);
//  • пробный период — ТОЛЬКО из магазина (purchase.yearlyTrialDays) и только если
//    доступен; лента пробного — если пробный есть И выбран год И цены загружены;
//  • кнопка закреплена внизу, сравнение раскрывается на месте, никаких окон;
//  • все цвета — токены АКТИВНОЙ темы (темы бесплатны), своих цветов нет.
// ════════════════════════════════════════════════════════════════════════════
import React, { memo } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import { ctaFillGradient } from '../../constants/accentFill';
import type { PaywallPlan } from '../../app/paywall_purchase';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import { canPromiseTrialReminder, trialReminderDayNumber } from '../../app/trial_end_reminder_schedule';
import { DebugLogger } from '../../app/debug-logger';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../../app/config';
import { openLegalLink } from '../../app/open_legal_link';
import SkeletonBlock from '../SkeletonShimmer';
import { LinearGradient } from '../SafeLinearGradient';
import { paywallPlateBg, paywallSheetBg } from './paywall_surfaces';
import V2Pressable from '../v2/V2Pressable';
import { nestedBoxShadow, PlateFill, raisedBoxShadow, RAISED_LIFT } from '../v2/ShadowSurface';
import type { PaywallPriceSource } from '../../app/paywall_reference_prices';
import { PaywallPlusBenefits, PaywallPlusComparison } from './PaywallBenefitComparison';
import {
  COPY, chargeLine, ctaBuyMonth, ctaBuyYear, ctaStartTrial, fineAfterTrial, fineThenMonth, heroTrialTitle,
  pick, reminderDayTitle, trialFreeLabel, yearPerMonthApprox,
} from './PaywallPlusCopy';

export type GlassTokens = ReturnType<typeof liquidGlassTokens>;

/**
 * Фон самой шторки и «впадины» на плашках. зачем (Сверка 11.10): в графитовой тёмной теме opaqueSheet == opaqueControl (#222429),
 * поэтому плитки на шторке сливались с ней. Тёмная: шторка на opaqueCard (темнее), плитки на opaqueControl; светлая: шторка белая,
 * плитки #ECECEF. Один источник для экрана и вложенных элементов.
 */
// зачем (paywall-gap-001, координатор 13.10): поверхности листа и плашек живут в paywall_surfaces.ts (нейтраль «Тени» в тёмном); здесь реэкспорт для прежних импортов.
export { paywallSheetBg, paywallPlateBg };
export type PaywallPlusState = 'ready' | 'loading' | 'error';

/** Высота плашек тарифов (и скелета/«недоступно» на их месте) — первый кадр без прыжка, когда придут цены. */
const PLAN_CARD_HEIGHT = 160;

/** Приглушение недоступной управляющей кнопки (закрыть / восстановить на время оплаты). */
const PAYWALL_DISABLED_OPACITY = 0.4;

// зачем (аудит R58 #1, координатор 15.10): ссылки вели на phraseman.app — такого домена нет (NXDOMAIN), а пейвол без
// рабочих «Условий» и «Конфиденциальности» — прямой повод отказа стора (Apple 3.1.2). Один источник с остальным приложением.
const TERMS_URL = KNOWLY_LEGAL_TERMS_URL;
const PRIVACY_URL = KNOWLY_LEGAL_PRIVACY_URL;

// зачем (темы 2.0, проверка в эмуляторе 30.09): выбор тарифа, плашка «Выгоднее всего» и значок
// пробного периода красятся в цвет темы в «Акценте/Максимуме» — иначе в светлом режиме они
// оставались чёрными рядом с синей кнопкой. В «Спокойно» — прежние g.text / g.bg.
function markFill(g: GlassTokens): string { return g.level === 'accent' || g.level === 'max' ? g.accent : g.text; } // light-accent-ok: диск с галкой чернилами markInk (accentInk на accent ≥ 4,98:1)
function markInk(g: GlassTokens): string { return g.level === 'accent' || g.level === 'max' ? g.accentInk : g.bg; }

// зачем (R58 #53): одна функция открытия юридических ссылок на всё приложение (тост при сбое) — app/open_legal_link.ts
function openLegal(url: string): void { openLegalLink(url, 'paywall_plus'); }

// ── шапка ───────────────────────────────────────────────────────────────────
export const PaywallPlusHeader = memo(function PaywallPlusHeader({ lang, g, trialDays, closeDisabled, onClose, contextTitle, contextSubtitle, contextIcon, contextPill }: {
  lang: Lang; g: GlassTokens; trialDays: number | null; closeDisabled: boolean; onClose: () => void;
  /** Заголовок/подзаголовок КОНТЕКСТА входа (paywallContextHeadline). Нет — прежняя шапка пробного периода. */
  contextTitle?: string; contextSubtitle?: string;
  /** Значок входа в плитке слева (PaywallContextIcon) и пилюля «что закончилось» рядом с ним (макет paywall-context-redesign #c1). */
  contextIcon?: React.ReactNode; contextPill?: string;
}) {
  // зачем (владелец 11.10: «Я НЕ ВИЖУ КОНТЕКСТА! ВСЕ ПЕЙВОЛЫ ДОЛЖНЫ БЫТЬ КОНТЕКСТНЫМИ»; решение 1 «Шторка»): окно говорит про место, откуда
  // человек пришёл — значок входа и пилюля «что закончилось» наверху, ниже заголовок и одна фраза.
  const title = contextTitle || (trialDays ? heroTrialTitle(lang, trialDays) : pick(lang, COPY.heroNoTrial));
  const subtitle = contextTitle
    ? (contextSubtitle || '')
    : trialDays && canPromiseTrialReminder(trialDays) ? pick(lang, COPY.heroTrialSub) : '';
  const close = (
    <V2Pressable
      testID="paywall-close"
      accessibilityLabel={pick(lang, COPY.close)}
      disabled={closeDisabled}
      onPress={onClose}
      withHaptic={false}
      scaleTo={0.92}
      // зачем (R1_PAYWALL_UX): пока идёт оплата, закрыть нельзя — кнопка это показывает приглушением, а не молча не отзывается.
      style={[S.close, { backgroundColor: paywallPlateBg(g), opacity: closeDisabled ? PAYWALL_DISABLED_OPACITY : 1 }]}
    >
      <Ionicons name="close" size={18} color={g.text} />
    </V2Pressable>
  );
  return (
    <View>
      <View style={[S.handle, { backgroundColor: g.glassEdge }]} />
      {contextTitle ? (
        <View style={S.ctxRow}>
          <View testID="paywall-context-icon" style={[S.ctxTile, { backgroundColor: `${g.accent}2E` }]}>{contextIcon}</View>
          {contextPill ? (
            <View testID="paywall-context-pill" style={[S.ctxPill, { backgroundColor: paywallPlateBg(g) }]}>
              <Text style={[S.ctxPillText, { color: g.text }]}>{contextPill}</Text>
            </View>
          ) : null}
          <View style={S.ctxSpacer} />
          {close}
        </View>
      ) : (
        <View style={S.topRow}>
          <Text style={[S.kicker, { color: g.secondary }]}>{pick(lang, COPY.kicker)}</Text>
          {close}
        </View>
      )}
      <Text testID="paywall-title" accessibilityRole="header" style={[S.h1, contextTitle && S.h1Sheet, { color: g.text }]}>{title}</Text>
      {subtitle ? <Text testID="paywall-subtitle" style={[S.sub, { color: g.secondary }]}>{subtitle}</Text> : null}
    </View>
  );
});

// ── лента пробного: Сегодня → День N−2 → День N ────────────────────────────
export const PaywallPlusTrialTimeline = memo(function PaywallPlusTrialTimeline({ lang, g, trialDays, yearlyPrice }: {
  lang: Lang; g: GlassTokens; trialDays: number; yearlyPrice: string;
}) {
  // зачем (Сверка 11.10, светлая тема): на шторке поверхности сплошные (g.opaqueControl), полупрозрачное стекло там было белым по белому.
  const surface = { backgroundColor: paywallPlateBg(g) };
  const reminderDay = trialReminderDayNumber(trialDays);
  const steps: { icon: keyof typeof Ionicons.glyphMap; title: string; detail: string }[] = [
    { icon: 'gift-outline', title: pick(lang, COPY.today), detail: pick(lang, COPY.todayDetail) },
    ...(reminderDay ? [{ icon: 'notifications-outline' as const, title: reminderDayTitle(lang, reminderDay), detail: pick(lang, COPY.reminderDetail) }] : []),
    { icon: 'card-outline', title: reminderDayTitle(lang, trialDays), detail: chargeLine(lang, yearlyPrice) },
  ];
  return (
    <View testID="paywall-trial-timeline" style={[S.card, S.timeline, surface]}>
      {steps.map((step, index) => {
        const first = index === 0;
        const last = index === steps.length - 1;
        return (
          <View key={step.icon} style={S.tlRow}>
            <View style={S.tlRail}>
              <View style={[S.tlDot, { backgroundColor: first ? markFill(g) : paywallSheetBg(g) /* зачем (paywall-gaps-states): диски 2 и 3 цвета шторки, иначе сливаются с карточкой ленты */ }]}>
                <Ionicons name={step.icon} size={16} color={first ? markInk(g) : g.text} />
              </View>
              {last ? null : <View style={[S.tlLine, { backgroundColor: g.glassEdge }]} />}
            </View>
            <View style={[S.tlCopy, !last && S.tlCopyGap]}>
              <Text style={[S.tlTitle, { color: g.text }]}>{step.title}</Text>
              <Text style={[S.tlDetail, { color: g.secondary }]}>{step.detail}</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

// ── тарифы ──────────────────────────────────────────────────────────────────
export const PaywallPlusPlans = memo(function PaywallPlusPlans({
  lang, g, selected, onSelect, disabled, yearlyPrice, yearlyPerMonth, monthlyPrice, yearlyTrialDays, monthlyTrialDays,
  yearlyPromo, monthlyPromo, yearlyPriceSource, monthlyPriceSource,
}: {
  lang: Lang; g: GlassTokens; selected: PaywallPlan; onSelect: (plan: PaywallPlan) => void; disabled: boolean;
  yearlyPrice: string; yearlyPerMonth: string; monthlyPrice: string;
  yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  /** Скидка стора на первый период (владелец 2026-09-04: «написано = спишется»). */
  yearlyPromo: StorePromoPricing | null; monthlyPromo: StorePromoPricing | null;
  /** Откуда цена плитки (Ядро a0a910e9d): 'reference' — справочная, перед ней «≈». Не передан — как живая. */
  yearlyPriceSource?: PaywallPriceSource; monthlyPriceSource?: PaywallPriceSource;
}) {
  const yearOn = selected === 'yearly';
  const monthOn = selected === 'monthly';
  // Выбранный тариф: тон подложки + тонкая светлая кромка (исключение 2.0: 1px полупрозрачная).
  // зачем (решение владельца 05.10, OM-PROMO-PRESENT): над тарифами плашка «Скидка действует сейчас» —
  // процент, цена со скидкой и зачёркнутая обычная, ниже «далее {обычная}». Только вид данных стора: нет промо — нет плашки.
  const promo = (selected === 'monthly' ? monthlyPromo : yearlyPromo) ?? yearlyPromo ?? monthlyPromo;
  // зачем (владелец 12.10, стиль «Тень»): выбранный тариф — приподнятая плашка (градиент raised, тень raised, сдвиг вверх), а не плашка с кольцом.
  // Невыбранный — обычная плашка. Сдвиг — только transform на внешней обёртке, высота ряда не меняется.
  const tileShadow = (on: boolean) => ({ boxShadow: on ? raisedBoxShadow(g) : nestedBoxShadow(g) });
  const tileOuter = (on: boolean) => [S.planCell, on ? { transform: [{ translateY: RAISED_LIFT }], zIndex: 2 } : null];
  // «≈» только у справочной цены: перед живой и кэш-ценой его нет.
  const yearApprox = yearlyPriceSource === 'reference' ? '≈ ' : '';
  const monthApprox = monthlyPriceSource === 'reference' ? '≈ ' : '';
  return (
    <View>
      {promo ? (
        <View testID="paywall-promo-plate" style={[S.promo, { backgroundColor: paywallPlateBg(g) }]}>
          <Text style={[S.promoKicker, { color: g.mutedText }]}>{pick(lang, COPY.promoNow)}</Text>
          <View style={S.promoRow}>
            <View style={[S.promoPill, { backgroundColor: paywallSheetBg(g) }]}>
              <Text style={[S.promoPct, { color: g.text }]}>{`−${promo.discountPercent}%`}</Text>
            </View>
            <Text style={[S.promoPrice, { color: g.text }]}>{promo.promoPriceString}</Text>
            <Text style={[S.promoStandard, { color: g.mutedText }]}>{promo.standardPriceString}</Text>
          </View>
          <Text style={[S.promoThen, { color: g.secondary }]}>{`${pick(lang, COPY.promoThen)} ${promo.standardPriceString}`}</Text>
        </View>
      ) : null}
      {/* зачем (макет paywall-context-redesign #c1, `.pl2`): «Год» и «Месяц» рядом двумя плашками, выбранная — тоном и кромкой. */}
      <View style={S.planRow}>
        <V2Pressable
          testID="paywall-plan-yearly"
          accessibilityRole="radio"
          accessibilityState={{ selected: yearOn, checked: yearOn, disabled }}
          disabled={disabled || !yearlyPrice}
          onPress={() => onSelect('yearly')}
          withHaptic={false}
          scaleTo={0.98}
          outerStyle={tileOuter(yearOn)}
          // зачем (Макеты 13.10, paywalls-013): пока идёт оплата/восстановление — плашки приглушены до ответа магазина, как на макете.
          style={[S.card, S.planCol, tileShadow(yearOn), disabled ? S.planDisabled : null]}
        >
          <PlateFill g={g} radius={22} raised={yearOn} />
          <View style={S.planNameRow}>
            <Text style={[S.planName, { color: g.text }]}>{pick(lang, COPY.year)}</Text>
            <View style={[S.badge, { backgroundColor: markFill(g) }]}>
              <Text style={[S.badgeText, { color: markInk(g) }]}>{pick(lang, COPY.bestValue)}</Text>
            </View>
          </View>
          {yearlyPromo ? <Text testID="paywall-year-standard" style={[S.priceStrike, { color: g.mutedText }]}>{yearlyPromo.standardPriceString}</Text> : null}
          <Text testID="paywall-year-price" style={[S.priceBig, { color: g.text }]}>{yearlyPromo?.promoPriceString || `${yearApprox}${yearlyPrice}`}</Text>
          <Text style={[S.priceSmall, { color: g.secondary }]}>{pick(lang, COPY.perYear)}</Text>
          {/* Мелко: «≈ X в месяц». Главная цена года — крупно (магазины требуют именно так). */}
          {yearlyPerMonth ? <Text style={[S.planSmall, { color: g.secondary }]}>{yearPerMonthApprox(lang, yearlyPerMonth)}</Text> : null}
          {yearlyTrialDays ? (
            <View testID="paywall-trial-plate" style={S.trialLine}>
              <Ionicons name="gift-outline" size={16} color={g.accentText} />
              <Text style={[S.trialLineText, { color: g.accentText }]}>{trialFreeLabel(lang, yearlyTrialDays)}</Text>
            </View>
          ) : null}
        </V2Pressable>

        <V2Pressable
          testID="paywall-plan-monthly"
          accessibilityRole="radio"
          accessibilityState={{ selected: monthOn, checked: monthOn, disabled }}
          disabled={disabled || !monthlyPrice}
          onPress={() => onSelect('monthly')}
          withHaptic={false}
          scaleTo={0.98}
          outerStyle={tileOuter(monthOn)}
          style={[S.card, S.planCol, tileShadow(monthOn), disabled ? S.planDisabled : null]}
        >
          <PlateFill g={g} radius={22} raised={monthOn} />
          <Text style={[S.planName, { color: g.text }]}>{pick(lang, COPY.month)}</Text>
          {monthlyPromo ? <Text style={[S.priceStrike, { color: g.mutedText }]}>{monthlyPromo.standardPriceString}</Text> : null}
          <Text testID="paywall-month-price" style={[S.priceMonth, { color: g.text }]}>{monthlyPromo?.promoPriceString || `${monthApprox}${monthlyPrice}`}</Text>
          <Text style={[S.priceSmall, { color: g.secondary }]}>{pick(lang, COPY.perMonth)}</Text>
          <Text style={[S.planSmall, { color: g.secondary }]}>
            {monthlyTrialDays ? trialFreeLabel(lang, monthlyTrialDays) : pick(lang, COPY.noTrial)}
          </Text>
        </V2Pressable>
      </View>
    </View>
  );
});

// ── цены грузятся: скелет той же высоты, что и карточки ────────────────────
// зачем (Сверка 11.10: «плитки пустые, нет скелета»): прежний мигающий прямоугольник тона opaqueControl при самом тусклом такте был почти
// неотличим от шторки. Теперь общий shimmer-блок проекта (бегущий блик, Reanimated, уважает «уменьшить движение») с явными цветами по теме.
export const PaywallPlusPlansSkeleton = memo(function PaywallPlusPlansSkeleton({ g }: { g: GlassTokens }) {
  const baseColor = paywallPlateBg(g);
  const highlightColor = g.isLight ? g.opaqueSheet : `${g.text}24`;
  return (
    <View testID="paywall-plans-skeleton" accessibilityRole="progressbar">
      <View style={S.planRow}>
        <View style={S.planCell}><SkeletonBlock width="100%" height={PLAN_CARD_HEIGHT} borderRadius={22} baseColor={baseColor} highlightColor={highlightColor} /></View>
        <View style={S.planCell}><SkeletonBlock width="100%" height={PLAN_CARD_HEIGHT} borderRadius={22} baseColor={baseColor} highlightColor={highlightColor} /></View>
      </View>
    </View>
  );
});

// ── цен нет совсем: тихая строка на месте плиток ───────────────────────────
// зачем (владелец 11.10: «цены должны показываться все равно, везде»; Ядро a0a910e9d, приказ «пейволы все сделать»): блок «Цены не загрузились» с кнопкой «Ещё раз»
// убран. Справочная/кэш-цена закрывает почти все случаи; если тарифа нет совсем (магазин ответил, а плана нет) — на месте плиток спокойная строка той же высоты,
// кнопка покупки жива, а цены докачиваются тихо (useLoadGate). Причину «магазина на устройстве нет» оставляем тихой строкой.
export const PaywallPlusPriceNote = memo(function PaywallPlusPriceNote({ lang, g, reason }: {
  lang: Lang; g: GlassTokens;
  reason?: 'billing_unavailable' | 'network' | null;
}) {
  const storeMissing = reason === 'billing_unavailable';
  return (
    <View testID="paywall-plans-note" style={[S.noteBox, S.planRowTop, { minHeight: PLAN_CARD_HEIGHT }]}>
      <Text style={[S.unavailableSub, { color: g.mutedText }]}>{pick(lang, storeMissing ? COPY.storeUnavailable : COPY.priceWillConfirm)}</Text>
    </View>
  );
});

// ── тело: «Что входит», «Free и Plus», ссылки ──────────────────────────────
export const PaywallPlusDetails = memo(function PaywallPlusDetails({ lang, g, leadBenefit }: {
  lang: Lang; g: GlassTokens; leadBenefit?: string;
}) {
  // зачем (владелец 11.10, макет paywall-context-redesign #c1): у контекстного окна ровно ОДНА выгода — та, что про этот момент
  // (`.ben.glass`); общие «Что входит» и «Free и Plus» остаются только у входа без своего текста.
  if (leadBenefit) {
    return (
      <View testID="paywall-lead-benefit" style={[S.card, S.leadRow, { backgroundColor: paywallPlateBg(g) }]}>
        <View style={[S.leadCheck, { backgroundColor: g.accent }]}>
          <Ionicons name="checkmark" size={16} color={g.accentInk} />
        </View>
        <Text style={[S.leadText, { color: g.text }]}>{leadBenefit}</Text>
      </View>
    );
  }
  return (
    <View>
      <Text style={[S.sectionLabel, { color: g.mutedText }]}>{pick(lang, COPY.whatsIncluded)}</Text>
      <PaywallPlusBenefits lang={lang} g={g} />
      <Text style={[S.sectionLabel, { color: g.mutedText }]}>{pick(lang, COPY.freeVsPlus)}</Text>
      <PaywallPlusComparison lang={lang} g={g} />
    </View>
  );
});

// ── закреплённая кнопка ─────────────────────────────────────────────────────
export function paywallPlusCtaCopy(lang: Lang, args: {
  selected: PaywallPlan; yearlyPrice: string; monthlyPrice: string;
  yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  yearlyPromo: StorePromoPricing | null; monthlyPromo: StorePromoPricing | null;
  /** Справочная цена (не из магазина): на кнопке и в мелком тексте перед ценой «≈». */
  yearlyApprox?: boolean; monthlyApprox?: boolean;
}): { label: string; fine: string } {
  // Списание = первая платная фаза стора (промо-цена, если есть), дальше — обычная.
  if (args.selected === 'monthly') {
    const monthShown = `${args.monthlyApprox ? '≈ ' : ''}${args.monthlyPrice}`;
    const charge = args.monthlyPromo?.promoPriceString || monthShown;
    const fine = args.monthlyTrialDays || args.monthlyPromo ? fineThenMonth(lang, args.monthlyPromo?.standardPriceString || monthShown) : pick(lang, COPY.fineMonth);
    return { label: args.monthlyTrialDays ? ctaStartTrial(lang, args.monthlyTrialDays) : ctaBuyMonth(lang, charge), fine };
  }
  const yearCharge = args.yearlyPromo?.promoPriceString || `${args.yearlyApprox ? '≈ ' : ''}${args.yearlyPrice}`;
  if (args.yearlyTrialDays) {
    return { label: ctaStartTrial(lang, args.yearlyTrialDays), fine: fineAfterTrial(lang, yearCharge) };
  }
  return {
    label: ctaBuyYear(lang, yearCharge),
    fine: args.yearlyPromo ? fineAfterTrial(lang, args.yearlyPromo.standardPriceString) : pick(lang, COPY.fineYear),
  };
}

export const PaywallPlusDock = memo(function PaywallPlusDock({ lang, g, state, label, fine, notice, purchasing, disabled, bottomInset, onPress, restoring, restoreDisabled, onRestore }: {
  lang: Lang; g: GlassTokens; state: PaywallPlusState; label: string; fine: string; notice: boolean;
  purchasing: boolean; disabled: boolean; bottomInset: number; onPress: () => void;
  restoring: boolean; restoreDisabled: boolean; onRestore: () => void;
}) {
  const ready = state === 'ready';
  // зачем (D158): кнопка покупки ВСЕГДА активна, кроме самой покупки/восстановления (disabled от экрана).
  // Нет цен — тап сам загрузит offerings и купит. Подпись под кнопкой — тихая: либо «Попробуй через минуту»
  // после сбоя тапа, либо мелкий текст тарифа; строка резервируется, чтобы геометрия не прыгала.
  const ctaDisabled = disabled;
  // зачем (макет paywall-context-redesign №9/№10): без цен под кнопкой — «Кнопка работает и без цен…», а не пустая строка.
  const fineText = notice ? pick(lang, COPY.tryInMinute) : ready ? fine : pick(lang, COPY.fineNoPrices);
  return (
    <View style={[S.dock, { paddingBottom: Math.max(bottomInset, 16) }]}>
      {/* зачем (макет `.cta`): кнопка 58 с лёгким переливом тона и свечением цвета темы. */}
      <V2Pressable
        testID="paywall-cta"
        accessibilityLabel={label}
        accessibilityState={{ disabled: ctaDisabled, busy: purchasing }}
        disabled={ctaDisabled}
        onPress={onPress}
        withHaptic={false}
        scaleTo={0.97}
        // зачем (владелец 13.10, №35): основная кнопка пейвола — ctaFill (>= 1,8 к поверхностям, >= 1,3 к вторичной, подпись >= 4,5 во всех 23 темах)
        style={[S.cta, { backgroundColor: g.ctaFill, boxShadow: [{ offsetX: 0, offsetY: 8, blurRadius: 26, color: `${g.ctaFill}4D` }] }]}
      >
        {/* зачем (Дизайн 12.10): заливка под accentInk — только с гарантией контраста ≥ 4,5 (accentFillGradient), accentBright в светлых градиентных темах слишком тёмный */}
        <LinearGradient pointerEvents="none" colors={[...ctaFillGradient(g)]} style={StyleSheet.absoluteFill} />
        {purchasing
          ? <ActivityIndicator color={g.ctaFillInk} />
          : <Text style={[S.ctaText, { color: g.ctaFillInk }]}>{label}</Text>}
      </V2Pressable>
      <Text testID="paywall-fine" style={[S.fine, { color: g.mutedText }]}>{fineText}</Text>
      <View style={S.links}>
        {/* зачем (R1_PAYWALL_UX): восстановление видно — крутилка рядом с «Восстанавливаем…»; недоступная ссылка приглушена (раньше не отличалась от активной). */}
        <V2Pressable testID="paywall-restore" withHaptic={false} scaleTo={0.95} disabled={restoreDisabled}
          accessibilityState={{ busy: restoring }} onPress={onRestore}
          style={[S.linkHit, S.restoreRow, { opacity: restoreDisabled && !restoring ? PAYWALL_DISABLED_OPACITY : 1 }]}>
          {restoring ? <ActivityIndicator size="small" color={g.mutedText} /> : null}
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, restoring ? COPY.restoring : COPY.restore)}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegal(TERMS_URL)} style={S.linkHit}>
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, COPY.terms)}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegal(PRIVACY_URL)} style={S.linkHit}>
          <Text style={[S.link, { color: g.mutedText }]}>{pick(lang, COPY.privacy)}</Text>
        </V2Pressable>
      </View>
    </View>
  );
});

/** Прокручиваемое тело — отдельный экспорт, чтобы экран собирал порядок блоков по макету. */
export function PaywallPlusScroll({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false} decelerationRate="fast">
      {children}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  handle: { width: 40, height: 5, borderRadius: 3, alignSelf: 'center', marginTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 20, paddingRight: 14, marginTop: 6 },
  kicker: { fontSize: 13, fontWeight: '700', letterSpacing: 2.4 },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // `.ctx` макета: плитка входа 52 (r16), пилюля «что закончилось» 32 (r16, 14/700 → 13/700 по шкале D145), закрыть справа.
  ctxRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingLeft: 20, paddingRight: 14, marginTop: 14 },
  ctxTile: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctxPill: { minHeight: 32, borderRadius: 16, paddingHorizontal: 13, justifyContent: 'center', flexShrink: 1 },
  ctxPillText: { fontSize: 13, lineHeight: 18, fontWeight: '700' },
  ctxSpacer: { flex: 1 },
  h1: { marginTop: 8, marginHorizontal: 20, fontSize: 31, lineHeight: 36, fontWeight: '800', letterSpacing: -0.7 },
  // макет: заголовок шторки 27/32, 700, трекинг -.5
  h1Sheet: { marginTop: 16, fontSize: 27, lineHeight: 32, fontWeight: '700', letterSpacing: -0.5 },
  sub: { marginTop: 6, marginHorizontal: 20, fontSize: 16, lineHeight: 22 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingTop: 14, paddingHorizontal: 16, paddingBottom: 18 },
  card: { borderRadius: 22 },
  timeline: { paddingTop: 16, paddingHorizontal: 16, paddingBottom: 4, marginTop: 12, marginBottom: 12 },
  tlRow: { flexDirection: 'row', gap: 12 },
  tlRail: { width: 36, alignItems: 'center' },
  tlDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tlLine: { flex: 1, width: 2, borderRadius: 1, marginVertical: 2 },
  tlCopy: { flex: 1, minWidth: 0, paddingTop: 2, paddingBottom: 12 },
  tlCopyGap: { paddingBottom: 16 },
  tlTitle: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  tlDetail: { marginTop: 2, fontSize: 13, lineHeight: 17 },
  planRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  planCell: { flex: 1, minWidth: 0 },
  planCol: { paddingVertical: 14, paddingHorizontal: 14, minHeight: PLAN_CARD_HEIGHT },
  trialLine: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, paddingTop: 10 },
  trialLineText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  leadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, paddingHorizontal: 16 },
  leadCheck: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  leadText: { flex: 1, minWidth: 0, fontSize: 16, lineHeight: 22, fontWeight: '700' },
  planDisabled: { opacity: PAYWALL_DISABLED_OPACITY },
  // overlay-more.css `.om-promo`: поля 14, r18; `.om-kicker` 11/800 по центру; цена 21/800; обычная 13/700 зачёркнута; «далее» 14/21
  promo: { padding: 14, borderRadius: 18, marginBottom: 12, alignItems: 'center' },
  promoKicker: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', textAlign: 'center' },
  promoRow: { flexDirection: 'row', alignItems: 'baseline', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  promoPill: { minHeight: 35, borderRadius: 18, paddingHorizontal: 17, justifyContent: 'center', alignSelf: 'center' },
  promoPct: { fontSize: 16, fontWeight: '700', fontVariant: ['tabular-nums'] },
  promoPrice: { fontSize: 21, fontWeight: '800', fontVariant: ['tabular-nums'] },
  promoStandard: { fontSize: 13, fontWeight: '700', textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  promoThen: { fontSize: 13, lineHeight: 21, marginTop: 9, textAlign: 'center' },
  // зачем (Сверка paywall-gap-001/009, 15.10): «Выгоднее всего» рядом с «Год» в одну строку, как в эталоне; плашка на 3 dp компактнее по полям и зазору, чтобы строка помещалась в плитке на реальных экранах (прежняя ширина 153 dp держала её на границе и переносила под слово).
  planNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  planName: { fontSize: 16, lineHeight: 22, fontWeight: '700' },
  planSmall: { marginTop: 3, fontSize: 13, lineHeight: 18 },
  // зачем: сумма за год — самая крупная цена экрана (22), месяц — меньше (18),
  // «≈ в месяц» у года — мелкая подпись (13.5). Магазины требуют именно так.
  priceBig: { fontSize: 22, lineHeight: 27, fontWeight: '800', letterSpacing: -0.3, fontVariant: ['tabular-nums'] },
  // зачем: цена месяца меньше цены года (магазины требуют, чтобы год был главным числом).
  priceMonth: { fontSize: 16, lineHeight: 22, fontWeight: '700', fontVariant: ['tabular-nums'] },
  priceSmall: { fontSize: 13, lineHeight: 18 },
  priceStrike: { fontSize: 13, lineHeight: 18, textDecorationLine: 'line-through', fontVariant: ['tabular-nums'] },
  badge: { minHeight: 22, paddingHorizontal: 8, borderRadius: 11, justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '700' },
  skeleton: { borderRadius: 22 },
  noteBox: { alignItems: 'center', justifyContent: 'center' },
  unavailableSub: { marginTop: 4, fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: 16 },
  planRowTop: { marginTop: 14 },
  sectionLabel: { marginTop: 22, marginBottom: 10, marginHorizontal: 4, fontSize: 13, fontWeight: '700', letterSpacing: 2.2 },
  links: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 14 },
  linkHit: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  restoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { fontSize: 13, lineHeight: 18 },
  dock: { paddingTop: 14, paddingHorizontal: 16 },
  cta: { minHeight: 58, borderRadius: 29, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaText: { fontSize: 16, lineHeight: 22, fontWeight: '700', textAlign: 'center' },
  fine: { marginTop: 9, fontSize: 13, lineHeight: 18, textAlign: 'center', fontVariant: ['tabular-nums'] },
});
