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
import React, { memo, useCallback, useRef } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../constants/i18n';
import type { liquidGlassTokens } from '../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../app/paywall_purchase';
import type { StorePromoPricing } from '../../app/premium_store_promo_display';
import { canPromiseTrialReminder } from '../../app/trial_end_reminder_schedule';
import { DebugLogger } from '../../app/debug-logger';
import { KNOWLY_LEGAL_PRIVACY_URL, KNOWLY_LEGAL_TERMS_URL } from '../../app/config';
import { openLegalLink } from '../../app/open_legal_link';
import { PaywallPlanRows, PaywallPlanRowsSkeleton, PLAN_ROWS_BLOCK_HEIGHT } from './PaywallPlanRows';
import { paywallPlateBg, paywallSheetBg } from './paywall_surfaces';
import V2Pressable from '../v2/V2Pressable';
import type { PaywallPriceSource } from '../../app/paywall_reference_prices';
import { PaywallCBenefits, PAYWALL_C_BENEFIT_COUNT } from './PaywallCBenefits';
import { PAYWALL_V3_RESTORE } from '../../app/paywall_v3_rows';
import {
  COPY, ctaBuyMonth, ctaBuyYear, ctaStartTrial, fineAfterTrial, fineThenMonth, heroTrialTitle, pick,
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
export { PAYWALL_C_BENEFIT_COUNT };

/** Приглушение недоступной управляющей кнопки (закрыть / восстановить на время оплаты). */
const PAYWALL_DISABLED_OPACITY = 0.4;

// зачем (аудит R58 #1, координатор 15.10): ссылки вели на phraseman.app — такого домена нет (NXDOMAIN), а пейвол без
// рабочих «Условий» и «Конфиденциальности» — прямой повод отказа стора (Apple 3.1.2). Один источник с остальным приложением.
const TERMS_URL = KNOWLY_LEGAL_TERMS_URL;
const PRIVACY_URL = KNOWLY_LEGAL_PRIVACY_URL;

// зачем (R58 #53): одна функция открытия юридических ссылок на всё приложение (тост при сбое) — app/open_legal_link.ts
function openLegal(url: string): void { openLegalLink(url, 'paywall_plus'); }

// ── шапка ───────────────────────────────────────────────────────────────────
export const PaywallPlusHeader = memo(function PaywallPlusHeader({ lang, g, trialDays, closeVisible, closeDisabled, onClose, contextTitle, contextSubtitle, contextPill }: {
  lang: Lang; g: GlassTokens; trialDays: number | null; closeVisible: boolean; closeDisabled: boolean; onClose: () => void;
  /** Заголовок/подзаголовок КОНТЕКСТА входа (paywallContextHeadline). Нет — прежняя шапка пробного периода. */
  contextTitle?: string; contextSubtitle?: string;
  /** Пилюля «что закончилось» (макет «Все окна Plus»: под строкой «PhraseMan Plus», над заголовком). */
  contextPill?: string;
}) {
  // зачем (владелец 11.10: «Я НЕ ВИЖУ КОНТЕКСТА! ВСЕ ПЕЙВОЛЫ ДОЛЖНЫ БЫТЬ КОНТЕКСТНЫМИ»; решение 1 «Шторка»): окно говорит про место, откуда
  // человек пришёл — значок входа и пилюля «что закончилось» наверху, ниже заголовок и одна фраза.
  const title = contextTitle || (trialDays ? heroTrialTitle(lang, trialDays) : pick(lang, COPY.heroNoTrial));
  const subtitle = contextTitle
    ? (contextSubtitle || '')
    : trialDays && canPromiseTrialReminder(trialDays) ? pick(lang, COPY.heroTrialSub) : '';
  const close = closeVisible ? (
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
  ) : null;
  return (
    <View style={S.cHeader}>
      <View style={S.topRow}>
        <Text style={[S.kicker, { color: g.text }]}>PhraseMan Plus</Text>
        {close}
      </View>
      {contextPill ? <View testID="paywall-pill" style={[S.pill, { backgroundColor: paywallPlateBg(g) }]}><Text style={[S.pillText, { color: g.text }]}>{contextPill}</Text></View> : null}
      <Text testID="paywall-title" accessibilityRole="header" style={[S.h1, { color: g.text }]}>{title}</Text>
      {subtitle ? <Text testID="paywall-subtitle" style={[S.sub, { color: g.text }]}>{subtitle}</Text> : null}
    </View>
  );
});

// ── тарифы ──────────────────────────────────────────────────────────────────
export const PaywallPlusPlans = memo(function PaywallPlusPlans({
  lang, g, selected, onSelect, disabled, yearlyPrice, yearlyPerMonth, monthlyPrice, yearlyTrialDays, monthlyTrialDays,
  yearlyPromo, monthlyPromo, yearlyPriceSource, monthlyPriceSource, savingsPct = null,
}: {
  lang: Lang; g: GlassTokens; selected: PaywallPlan; onSelect: (plan: PaywallPlan) => void; disabled: boolean;
  yearlyPrice: string; yearlyPerMonth: string; monthlyPrice: string;
  yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  /** Скидка стора на первый период (владелец 2026-09-04: «написано = спишется»). */
  yearlyPromo: StorePromoPricing | null; monthlyPromo: StorePromoPricing | null;
  /** Откуда цена плитки (Ядро a0a910e9d): 'reference' — справочная, перед ней «≈». Не передан — как живая. */
  yearlyPriceSource?: PaywallPriceSource; monthlyPriceSource?: PaywallPriceSource; savingsPct?: number | null;
}) {
  // Выбранный тариф: тон подложки + тонкая светлая кромка (исключение 2.0: 1px полупрозрачная).
  // зачем (решение владельца 05.10, OM-PROMO-PRESENT): над тарифами плашка «Скидка действует сейчас» —
  // процент, цена со скидкой и зачёркнутая обычная, ниже «далее {обычная}». Только вид данных стора: нет промо — нет плашки.
  const promo = (selected === 'monthly' ? monthlyPromo : yearlyPromo) ?? yearlyPromo ?? monthlyPromo;
  return (
    <View>
      {promo ? (
        <View testID="paywall-promo-plate" style={[S.promo, { backgroundColor: paywallPlateBg(g) }]}>
          <Text style={[S.promoKicker, { color: g.text }]}>{pick(lang, COPY.promoNow)}</Text>
          <View style={S.promoRow}>
            <View style={[S.promoPill, { backgroundColor: paywallSheetBg(g) }]}>
              <Text style={[S.promoPct, { color: g.text }]}>{`−${promo.discountPercent}%`}</Text>
            </View>
            <Text style={[S.promoPrice, { color: g.text }]}>{promo.promoPriceString}</Text>
            <Text style={[S.promoStandard, { color: g.text }]}>{promo.standardPriceString}</Text>
          </View>
          <Text style={[S.promoThen, { color: g.text }]}>{`${pick(lang, COPY.promoThen)} ${promo.standardPriceString}`}</Text>
        </View>
      ) : null}
      <PaywallPlanRows lang={lang} g={g} selected={selected} onSelect={onSelect} disabled={disabled}
        yearlyPrice={yearlyPrice} yearlyPerMonth={yearlyPerMonth} monthlyPrice={monthlyPrice}
        yearlyTrialDays={yearlyTrialDays} monthlyTrialDays={monthlyTrialDays}
        yearlyPromo={yearlyPromo} monthlyPromo={monthlyPromo}
        yearlyPriceSource={yearlyPriceSource} monthlyPriceSource={monthlyPriceSource} savingsPct={savingsPct} />
    </View>
  );
});

// ── цены грузятся: скелет той же высоты, что и карточки ────────────────────
// зачем (Сверка 11.10: «плитки пустые, нет скелета»): прежний мигающий прямоугольник тона opaqueControl при самом тусклом такте был почти
// неотличим от шторки. Теперь общий shimmer-блок проекта (бегущий блик, Reanimated, уважает «уменьшить движение») с явными цветами по теме.
export const PaywallPlusPlansSkeleton = memo(function PaywallPlusPlansSkeleton({ g }: { g: GlassTokens }) {
  return <PaywallPlanRowsSkeleton g={g} />;
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
    <View testID="paywall-plans-note" style={[S.noteBox, S.planRowTop, { minHeight: PLAN_ROWS_BLOCK_HEIGHT }]}>
      <Text style={[S.unavailableSub, { color: g.text }]}>{pick(lang, storeMissing ? COPY.storeUnavailable : COPY.priceWillConfirm)}</Text>
    </View>
  );
});

// ── тело: «Что входит», «Free и Plus», ссылки ──────────────────────────────
export const PaywallPlusDetails = memo(function PaywallPlusDetails({ lang, g, leadBenefit, leadCaption, factCaption, items, paragraph }: {
  lang: Lang; g: GlassTokens; leadBenefit?: string; leadCaption?: string; factCaption?: string;
  items?: ReadonlyArray<Readonly<{ title: string; detail: string }>>; paragraph?: string;
}) {
  return <PaywallCBenefits lang={lang} g={g} leadBenefit={leadBenefit} leadCaption={leadCaption} factCaption={factCaption} items={items} paragraph={paragraph} />;
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

export const PaywallPlusDock = memo(function PaywallPlusDock({ lang, g, state, label, fine, notice, purchasing, disabled, bottomInset, onPress, restoring, restoreVisible, restoreDisabled, onRestore, promoVisible, promoDisabled, onPromo }: {
  lang: Lang; g: GlassTokens; state: PaywallPlusState; label: string; fine: string; notice: boolean;
  purchasing: boolean; disabled: boolean; bottomInset: number; onPress: () => void;
  restoring: boolean; restoreVisible: boolean; restoreDisabled: boolean; onRestore: () => void;
  promoVisible: boolean; promoDisabled: boolean; onPromo: () => void;
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
      {/* макет «Все окна Plus»: строка про автопродление — над кнопкой */}
      <Text testID="paywall-fine" style={[S.fine, { color: g.text }]}>{fineText}</Text>
      {/* Вариант C: плоская кнопка активной темы, без декоративного свечения/3D. */}
      <V2Pressable
        testID="paywall-cta"
        accessibilityLabel={label}
        accessibilityState={{ disabled: ctaDisabled, busy: purchasing }}
        disabled={ctaDisabled}
        onPress={onPress}
        withHaptic={false}
        scaleTo={0.97}
        // зачем (владелец 13.10, №35): основная кнопка пейвола — ctaFill (>= 1,8 к поверхностям, >= 1,3 к вторичной, подпись >= 4,5 во всех 23 темах)
        style={[S.cta, { backgroundColor: g.ctaFill }]}
      >
        {purchasing
          ? <ActivityIndicator color={g.ctaFillInk} />
          : <Text style={[S.ctaText, { color: g.ctaFillInk }]}>{label}</Text>}
      </V2Pressable>
      {restoreVisible || promoVisible ? <View style={S.secondaryActions}>
        {/* зачем (R1_PAYWALL_UX): восстановление видно — крутилка рядом с «Восстанавливаем…»; недоступная ссылка приглушена (раньше не отличалась от активной). */}
        {restoreVisible ? <V2Pressable testID="paywall-restore" accessibilityRole="button" accessibilityLabel={pick(lang, COPY.restore)} withHaptic={false} scaleTo={0.95} disabled={restoreDisabled} outerStyle={S.secondaryOuter}
          accessibilityState={{ disabled: restoreDisabled, busy: restoring }} onPress={onRestore}
          style={[S.secondaryAction, { opacity: restoreDisabled && !restoring ? PAYWALL_DISABLED_OPACITY : 1 }]}>
          {restoring ? <ActivityIndicator size="small" color={g.text} /> : null}
          <Text style={[S.secondaryActionText, { color: g.text }]}>{restoring ? pick(lang, COPY.restoring) : (PAYWALL_V3_RESTORE[lang] ?? PAYWALL_V3_RESTORE.en)}</Text>
        </V2Pressable> : null}
        {promoVisible ? <V2Pressable testID="paywall-promo-code" accessibilityRole="button" accessibilityLabel={pick(lang, COPY.enterPromo)}
          accessibilityState={{ disabled: promoDisabled }} withHaptic={false} scaleTo={0.95} disabled={promoDisabled} outerStyle={S.secondaryOuter} onPress={onPromo}
          style={[S.secondaryAction, { opacity: promoDisabled ? PAYWALL_DISABLED_OPACITY : 1 }]}>
          <Text style={[S.secondaryActionText, { color: g.text }]}>{pick(lang, COPY.enterPromo)}</Text>
        </V2Pressable> : null}
      </View> : null}
      <View style={S.links}>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegal(TERMS_URL)} style={S.linkHit}>
          <Text style={[S.link, { color: g.text }]}>{pick(lang, COPY.terms)}</Text>
        </V2Pressable>
        <V2Pressable accessibilityRole="link" scaleTo={0.95} onPress={() => openLegal(PRIVACY_URL)} style={S.linkHit}>
          <Text style={[S.link, { color: g.text }]}>{pick(lang, COPY.privacy)}</Text>
        </V2Pressable>
      </View>
    </View>
  );
});

/** Прокручиваемое тело — отдельный экспорт, чтобы экран собирал порядок блоков по макету. */
/**
 * зачем (баг по кадру Макетов 05.11, paywall-language-0852; слово координатора: «плитки Год/Месяц обрезаны залипшей кнопкой — на 360×800 и 412×915 видны полностью над кнопкой»):
 * на низком экране тело шторки длиннее окна, и при открытии плитки тарифов торчали краем из-под кнопки покупки. Пока человек не трогал прокрутку, тело один раз встаёт в конец —
 * плитки (и строка про цену под ними) целиком над кнопкой; сверху остаётся то, что помещается. Ничего не мигает: прокрутка без анимации до первого касания.
 * Журнал [PAYWALL-FIT]: высота окна прокрутки, высота содержимого, на сколько прокрутили — по нему видно, на каких экранах срабатывает.
 */
export function PaywallPlusScroll({ children }: { children: React.ReactNode }) {
  const scrollRef = useRef<ScrollView | null>(null);
  const viewportRef = useRef(0);
  const touchedRef = useRef(false);
  const contentRef = useRef(0);
  const lastOffsetRef = useRef(-1);
  const fitToEnd = useCallback((contentH: number) => {
    const viewportH = viewportRef.current;
    if (touchedRef.current || viewportH <= 0 || contentH <= 0) {
      console.log('[PAYWALL-FIT] skip', JSON.stringify({ touched: touchedRef.current, viewportH: Math.round(viewportH), contentH: Math.round(contentH) })); // guard-ok: ранний выход называет причину
      return;
    }
    const overflow = Math.max(0, Math.round(contentH - viewportH));
    if (overflow === lastOffsetRef.current) return;
    lastOffsetRef.current = overflow;
    console.log('[PAYWALL-FIT]', JSON.stringify({ viewportH: Math.round(viewportH), contentH: Math.round(contentH), overflow, action: overflow > 0 ? 'scroll_to_end' : 'fits' })); // guard-ok: одна строка на смену высоты
    if (overflow > 0) scrollRef.current?.scrollTo({ y: overflow, animated: false });
  }, []);
  // зачем: окно и содержимое измеряются в любом порядке — подгон считается, когда известны оба
  const onLayout = useCallback((e: LayoutChangeEvent) => { viewportRef.current = e.nativeEvent.layout.height; fitToEnd(contentRef.current); }, [fitToEnd]);
  return (
    <ScrollView ref={scrollRef} style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false} decelerationRate="fast"
      onLayout={onLayout} onContentSizeChange={(_w, h) => { contentRef.current = h; fitToEnd(h); }} onScrollBeginDrag={() => { touchedRef.current = true; }}>
      {children}
    </ScrollView>
  );
}

const S = StyleSheet.create({
  cHeader: { paddingTop: 18, paddingHorizontal: 24 },
  topRow: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // зачем (макет «Все окна Plus», слово владельца 05.11 «1 в 1»): «PhraseMan Plus» обычным регистром, 600 (не капслок), пилюля места входа, заголовок 29/32, подзаголовок 15/20
  kicker: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  pill: { alignSelf: 'flex-start', marginTop: 14, minHeight: 28, borderRadius: 14, paddingHorizontal: 12, justifyContent: 'center' },
  pillText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  close: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  // зачем (ревью 05.11): межстрочный ≥1,15× кегля (было 35 при 32) — две строки заголовка при шрифте ×1,3 не слипаются
  h1: { marginTop: 16, fontSize: 29, lineHeight: 34, fontWeight: '800', letterSpacing: -0.6 },
  sub: { marginTop: 8, fontSize: 15, lineHeight: 21 },
  scroll: { flexGrow: 0, flexShrink: 1 },
  scrollContent: { paddingTop: 18, paddingHorizontal: 24, paddingBottom: 30 },
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
  // макет: «Восстановить покупки» — одна текстовая ссылка по центру, ниже (по решению владельца 05.11 она остаётся) «Ввести промокод»
  secondaryActions: { flexDirection: 'column', alignItems: 'center', gap: 0, marginTop: 6 },
  // зачем (владелец 26.10, «Условия» и «Конфиденциальность» наезжали на плашки): V2Pressable кладёт style на ВНУТРЕННИЙ слой, а flex:1 там давал ему
  // базу высоты 0 — плашка занимала только minHeight 44, текст в 2–3 строки (крупный шрифт, длинный перевод) вылезал вниз на ссылки.
  // Место в ряду (flex) — на внешний слой (outerStyle), внутренний слой растёт по содержимому и тянется до высоты соседней плашки.
  secondaryOuter: { alignSelf: 'center', minWidth: 0 },
  secondaryAction: { flexGrow: 1, minHeight: 44, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  secondaryActionText: { flexShrink: 1, fontSize: 13, lineHeight: 18, fontWeight: '500', textAlign: 'center' },
  linkHit: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  restoreRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  link: { fontSize: 13, lineHeight: 18 },
  dock: { paddingTop: 14, paddingHorizontal: 24 },
  cta: { minHeight: 54, borderRadius: 28, paddingHorizontal: 20, paddingVertical: 12, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ctaText: { fontSize: 15, lineHeight: 21, fontWeight: '700', textAlign: 'center' },
  fine: { marginBottom: 10, fontSize: 13, lineHeight: 18, textAlign: 'left', fontVariant: ['tabular-nums'] },
});
