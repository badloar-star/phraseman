// ═══════════════════════════════════════════════════════════════════════════
// PaywallMSheet.tsx — шторка пейвола «Вариант М»: «Не сейчас» и пилюля места, личная шапка, график, дорога на 30 дней, сравнение, планы, кнопка.
//
// зачем (владелец «Да, так», координатор 25.10; макет AKuWv3RWqbu3a4Xe7EBj7q): окно про человека, а не про функции. Покупка, восстановление, цены, пробный, закрытие,
// аналитика — те же, что у прежнего окна: экран отдаёт сюда готовые значения и обработчики, здесь только вид и порядок блоков. Включается флагом «Пульта»
// paywall_m_enabled (по умолчанию выключен) — прежнее окно не тронуто. Цены и пробный — ТОЛЬКО строки магазина; нет цен — «цены грузятся» тихой строкой, кнопка остаётся
// рабочей (D158), «Сегодня 0» без цены не показываем.
// ═══════════════════════════════════════════════════════════════════════════
import React, { memo, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

import type { Lang } from '../../../constants/i18n';
import type { GlassTokens } from '../../../constants/liquidGlassThemePalette';
import type { PaywallPlan } from '../../../app/paywall_purchase';
import V2Pressable from '../../v2/V2Pressable';
import { PaywallSwipeSheet } from '../PaywallSwipeSheet';
import { COPY, pick } from '../PaywallPlusCopy';
import { paywallPlateBg, paywallSheetBg } from '../paywall_surfaces';
import { PaywallMChart } from './PaywallMChart';
import { PaywallMCompare } from './PaywallMCompare';
import { PaywallMDock } from './PaywallMDock';
import { PaywallMHeaderCard, type PaywallMStat } from './PaywallMHeaderCard';
import { PaywallMPlans } from './PaywallMPlans';
import { PaywallMRoad } from './PaywallMRoad';
import { paywallMText, paywallMZeroFromPrice } from './paywall_m_copy';
import type { PaywallMHead } from './paywall_m_head';
import {
  PAYWALL_M_TOTAL_LESSONS, paywallMChartModel, paywallMCompareRows, paywallMFooter, paywallMPace,
  type PaywallMChartKind, type PaywallMPerson,
} from './paywall_m_model';
import { usePaywallMRoad } from './use_paywall_m_person';

export type PaywallMSheetProps = Readonly<{
  g: GlassTokens; lang: Lang;
  // окно и жесты — как у прежнего окна
  maxHeight: number; windowHeight: number; swipeEnabled: boolean; onSwipeClose: (dy: number) => void; onLater: () => void; laterDisabled: boolean; bottomInset: number;
  // человек и шапка места
  person: PaywallMPerson; head: PaywallMHead; chartKind: PaywallMChartKind;
  // планы и цены (только магазин)
  plansReady: boolean; selected: PaywallPlan; onSelect: (plan: PaywallPlan) => void;
  yearlyPrice: string | null; monthlyPrice: string | null; yearlyPerMonth: string | null; savingsPct: number | null;
  yearlyTrialDays: number | null; monthlyTrialDays: number | null;
  // покупка
  purchasing: boolean; ctaBusy: boolean; restoring: boolean; onPurchase: () => void; onRestore: () => void;
  promoVisible: boolean; onPromo: () => void;
  /** Подпись «попробуй позже» после неудачного тапа — вместо строки про деньги. */
  tapNotice: string | null;
}>;

/** «3 из 32» → {value: '3', total: 'из 32'}: число крупно, остальное мелко (макет); без пробела — всё крупно. */
function splitProgress(text: string): { value: string; total?: string } {
  const i = text.indexOf(' ');
  return i > 0 ? { value: text.slice(0, i), total: text.slice(i + 1) } : { value: text };
}

export const PaywallMSheet = memo(function PaywallMSheet(props: PaywallMSheetProps) {
  const { g, lang, person, head, chartKind } = props;
  const road = usePaywallMRoad(lang);
  const pace = paywallMPace(person);
  const chart = useMemo(() => paywallMChartModel(chartKind, pace), [chartKind, pace]);
  const rows = useMemo(() => paywallMCompareRows(), []);

  const stats = useMemo<readonly PaywallMStat[]>(() => {
    const lessons = splitProgress(paywallMText(lang, 'mc.lock.progress', { done: person.lessonsDone, total: PAYWALL_M_TOTAL_LESSONS }));
    return [
      { value: String(person.streakDays), label: paywallMText(lang, 'm.stats.daysStreak', { n: person.streakDays }) },
      { value: person.phrasesLearned === null ? '–' : String(person.phrasesLearned), label: paywallMText(lang, 'm.stats.phrases') },
      { value: lessons.value, total: lessons.total, label: paywallMText(lang, 'm.stats.lessons') },
    ];
  }, [lang, person.lessonsDone, person.phrasesLearned, person.streakDays]);

  const chartTexts = useMemo(() => ({
    title: paywallMText(lang, chart.titleKey),
    today: paywallMText(lang, 'm.chart.today'),
    in30: paywallMText(lang, 'm.chart.in30'),
    legendPlus: paywallMText(lang, 'm.chart.legendPlus'),
    legendFree: paywallMText(lang, chart.legendFreeKey, { n: chart.legendFreeN }),
    note: paywallMText(lang, chart.noteKey, chart.noteVars),
    plusEndLabel: `≈ ${chart.plusEnd}`,
    freeEndLabel: String(chart.freeEnd),
  }), [chart, lang]);

  const compareRows = useMemo(() => rows.map((r) => ({
    id: r.id,
    label: paywallMText(lang, r.labelKey),
    free: r.free.key ? paywallMText(lang, r.free.key, { n: r.free.n ?? 0 }) : r.free.n !== undefined ? String(r.free.n) : '–',
    plus: paywallMText(lang, r.plusKey, { n: r.plusN ?? 0 }),
  })), [lang, rows]);

  const roadLines = useMemo(() => road.map((it) => ({
    key: `d${it.day}`,
    meta: paywallMText(lang, 'm.road.day', { day: it.day, lesson: it.lesson }),
    english: it.english,
    translation: it.translation,
  })), [lang, road]);

  const zero = paywallMZeroFromPrice(props.yearlyPrice);
  const footer = paywallMFooter({ yearlyTrialDays: props.yearlyTrialDays, yearlyPrice: props.yearlyPrice, yearlyPerMonth: props.yearlyPerMonth, zero });
  const havePrice = props.plansReady && !!props.yearlyPrice;
  // зачем (D158): без цены кнопка остаётся рабочей — «Оформить Plus» без суммы; цену не выдумываем
  const cta = havePrice ? paywallMText(lang, footer.ctaKey, footer.ctaVars) : paywallMText(lang, 'm.cta.noTrial', { price: '' }).replace(/\s+/g, ' ').trim();
  const fine = props.tapNotice ?? (havePrice && footer.fineKey ? paywallMText(lang, footer.fineKey, footer.fineVars) : null);

  const plate = paywallPlateBg(g);
  return (
    <PaywallSwipeSheet
      testID="paywall-sheet"
      style={[S.sheet, { backgroundColor: paywallSheetBg(g), maxHeight: props.maxHeight }]}
      enabled={props.swipeEnabled}
      travel={props.windowHeight}
      onSwipeClose={props.onSwipeClose}
      header={(
        <View>
          <View style={[S.handle, { backgroundColor: g.glassEdge }]} />
          <View style={S.topRow}>
            <V2Pressable testID="paywall-close" accessibilityRole="button" accessibilityLabel={paywallMText(lang, 'm.notNow')} disabled={props.laterDisabled}
              withHaptic={false} scaleTo={0.95} onPress={props.onLater} style={[S.later, { opacity: props.laterDisabled ? 0.5 : 1 }]}>
              <Text style={[S.laterText, { color: g.secondary }]}>{paywallMText(lang, 'm.notNow')}</Text>
            </V2Pressable>
            <View testID="paywall-m-pill" style={[S.pill, { backgroundColor: plate }]}>
              {head.pill ? null : <Ionicons name="add" size={14} color={g.text} />}
              <Text style={[S.pillText, { color: g.text }]}>{head.pill ?? 'Plus'}</Text>
            </View>
          </View>
        </View>
      )}
    >
      <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
        <PaywallMHeaderCard g={g} kicker={head.kicker} title={head.title} stats={stats} />
        <Text style={[S.sub, { color: g.secondary }]}>{head.sub}</Text>
        <PaywallMChart g={g} model={chart} texts={chartTexts} />
        <PaywallMRoad g={g} title={paywallMText(lang, 'm.road.title')} items={roadLines} />
        <PaywallMCompare g={g} title={paywallMText(lang, 'm.cmp.title')} freeHead={paywallMText(lang, 'm.cmp.free')} plusHead="Plus" rows={compareRows} />
        {havePrice && props.monthlyPrice ? (
          <PaywallMPlans
            g={g} selected={props.selected} onSelect={props.onSelect} disabled={props.ctaBusy}
            yearlyPrice={props.yearlyPrice as string} monthlyPrice={props.monthlyPrice}
            texts={{
              title: paywallMText(lang, 'm.plans.title'), year: paywallMText(lang, 'm.plans.year'), month: paywallMText(lang, 'm.plans.month'),
              yearPerMonth: props.yearlyPerMonth ? paywallMText(lang, 'm.plans.perMonthApprox', { price: props.yearlyPerMonth }) : null,
              monthNote: props.monthlyTrialDays ? null : paywallMText(lang, 'm.plans.noTrial'),
              badge: props.savingsPct && props.savingsPct > 0 ? `−${Math.round(props.savingsPct)} %` : null,
            }}
          />
        ) : null}
      </ScrollView>
      <PaywallMDock
        g={g}
        texts={{
          cta, fine,
          restore: paywallMText(lang, 'm.links.restore'), restoring: pick(lang, COPY.restoring),
          terms: paywallMText(lang, 'm.links.terms'), privacy: paywallMText(lang, 'm.links.privacy'), promo: pick(lang, COPY.enterPromo),
        }}
        purchasing={props.purchasing} disabled={props.ctaBusy} bottomInset={props.bottomInset}
        onPress={props.onPurchase} restoring={props.restoring} restoreDisabled={props.ctaBusy} onRestore={props.onRestore}
        promoVisible={props.promoVisible} promoDisabled={props.ctaBusy} onPromo={props.onPromo}
      />
    </PaywallSwipeSheet>
  );
});

const S = StyleSheet.create({
  sheet: { borderTopLeftRadius: 30, borderTopRightRadius: 30, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginTop: 8 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, minHeight: 52 },
  later: { minHeight: 44, justifyContent: 'center', paddingRight: 12 },
  laterText: { fontSize: 15, lineHeight: 20, fontWeight: '600' },
  pill: { minHeight: 32, borderRadius: 16, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 4 },
  pillText: { fontSize: 13, lineHeight: 17, fontWeight: '700' },
  scroll: { flexShrink: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 20, gap: 22 },
  sub: { fontSize: 15, lineHeight: 22 },
});
