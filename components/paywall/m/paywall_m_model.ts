// ═══════════════════════════════════════════════════════════════════════════
// paywall_m_model.ts — числа пейвола «Вариант М»: темп человека, линии графика, строки «Бесплатно и Plus», вид подписи кнопки.
//
// зачем (владелец «Да, так», координатор 25.10; макеты AKuWv3RWqbu3a4Xe7EBj7q и 6dkmYjjEX3kCv2s1nuFT9B): окно говорит о человеке,
// а не о функциях — всё считается из того, что уже лежит на телефоне (прогресс, серия, выученные фразы), и из лимитов кода.
// Линия «бесплатно» — настоящие лимиты (голос в день, реплики разговора в месяц); линия Plus — сегодняшний темп человека, без обещаний.
// Чистый модуль без React и без сети — тест tests/paywall_m_model_2026_10_25.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
import { ENERGY_BASE_CAPACITY } from '../../../app/energy_contract';
import { FREE_SAVED_CARD_LIMIT } from '../../../app/flashcards/free_limit';
import { REVENUE_DAILY_LIMITS, REVENUE_MONTHLY_LIMITS } from '../../../app/revenue_daily_limits';
import { FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT } from '../../../app/ai_mistake_explain_flags';
import type { PaywallMCopyKey } from './paywall_m_copy.generated';

/** Сколько дней в окне прогноза («через 30 дней»). */
export const PAYWALL_M_HORIZON_DAYS = 30;
/** Всего уроков курса («3 из 32»). */
export const PAYWALL_M_TOTAL_LESSONS = 32;
/** Защит серии в месяц у Plus (код: premium_freeze_allowance). */
export const PAYWALL_M_PLUS_FREEZES_PER_MONTH = 3;
/** Темп, ниже которого линию Plus не рисуем «пустой»: честный минимум, чтобы график не обещал ноль и не прятал разницу (фраз в день). */
export const PAYWALL_M_MIN_PACE = 5;
export const PAYWALL_M_MAX_PACE = 60;

export const PAYWALL_M_LIMITS = Object.freeze({
  voicePerDay: REVENUE_DAILY_LIMITS.speaking_attempts,
  dialogPerMonth: REVENUE_MONTHLY_LIMITS.ai_dialog_replies,
  explainPerDay: FREE_AI_MISTAKE_EXPLAINS_PER_DAY_DEFAULT,
  savedPhrases: FREE_SAVED_CARD_LIMIT,
  energy: ENERGY_BASE_CAPACITY,
});

export type PaywallMPerson = Readonly<{
  /** Пройдено уроков курса (локальный снимок прогресса). */
  lessonsDone: number;
  streakDays: number;
  /** Выучено фраз (кэш статистики профиля); null — ещё не знаем. */
  phrasesLearned: number | null;
  /** Дней с занятием (даты активности из снимка прогресса). */
  activeDays: number;
}>;

/** Темп человека — фраз в день: выучено / дней с занятием, в пределах [MIN; MAX]. Нет данных — минимум (честно: «в твоём темпе» без выдумок). */
export function paywallMPace(person: Pick<PaywallMPerson, 'phrasesLearned' | 'activeDays'>): number {
  const { phrasesLearned, activeDays } = person;
  if (phrasesLearned === null || !Number.isFinite(phrasesLearned) || phrasesLearned <= 0 || activeDays <= 0) return PAYWALL_M_MIN_PACE;
  const raw = Math.round(phrasesLearned / activeDays);
  return Math.max(PAYWALL_M_MIN_PACE, Math.min(PAYWALL_M_MAX_PACE, raw));
}

export type PaywallMChartKind = 'voice' | 'dialog';

export type PaywallMChartModel = Readonly<{
  kind: PaywallMChartKind;
  /** Где линия Plus в конце месяца («≈ 600 фраз»). */
  plusEnd: number;
  /** Где линия «бесплатно» в конце месяца («90»). */
  freeEnd: number;
  /** Точки линий в долях (x: 0…1 по дням, y: 0…1 по высоте графика). Plus — 3 точки (0, середина, конец), бесплатно — 2. */
  plus: readonly (readonly [number, number])[];
  free: readonly (readonly [number, number])[];
  /** Подпись про темп/лимит: ключ и подстановки. */
  noteKey: PaywallMCopyKey;
  noteVars: Readonly<Record<string, number>>;
  titleKey: PaywallMCopyKey;
  legendFreeKey: PaywallMCopyKey;
  legendFreeN: number;
}>;

/**
 * Модель графика. voice: Plus = темп × 30, бесплатно = лимит голоса × 30.
 * dialog: Plus = реплики за разговор × 30 (раз в день), бесплатно упирается в месячный потолок: min(лимит, …) — линия растёт до потолка и дальше плоская.
 */
export function paywallMChartModel(kind: PaywallMChartKind, pace: number, linesPerConversation = 14): PaywallMChartModel {
  const days = PAYWALL_M_HORIZON_DAYS;
  if (kind === 'voice') {
    const plusEnd = pace * days;
    const freeEnd = PAYWALL_M_LIMITS.voicePerDay * days;
    const top = Math.max(plusEnd, freeEnd, 1);
    return {
      kind, plusEnd, freeEnd,
      plus: [[0, 0], [0.5, (plusEnd / 2) / top], [1, plusEnd / top]],
      free: [[0, 0], [1, freeEnd / top]],
      noteKey: 'm.chart.note.voice', noteVars: { pace },
      titleKey: 'm.chart.voice.title', legendFreeKey: 'm.chart.legendFreeDay', legendFreeN: PAYWALL_M_LIMITS.voicePerDay,
    };
  }
  const limit = PAYWALL_M_LIMITS.dialogPerMonth;
  const lines = Math.max(1, Math.round(linesPerConversation));
  const plusEnd = lines * days;
  const top = Math.max(plusEnd, limit, 1);
  // бесплатный потолок достигается на дне limit/lines (но не позже конца месяца): после него линия плоская
  const ceilingDay = Math.min(days, limit / lines);
  return {
    kind, plusEnd, freeEnd: limit,
    plus: [[0, 0], [0.5, (plusEnd / 2) / top], [1, plusEnd / top]],
    free: [[0, 0], [ceilingDay / days, limit / top], [1, limit / top]],
    noteKey: 'm.chart.note.dialog', noteVars: { n: lines, limit },
    titleKey: 'm.chart.dialog.title', legendFreeKey: 'm.chart.legendFreeMonth', legendFreeN: limit,
  };
}

/** Одна ячейка значения «Бесплатно» в таблице: ключ строки + подстановка числа (или тире). */
export type PaywallMCompareCell = Readonly<{ key: PaywallMCopyKey | null; n?: number }>;
export type PaywallMCompareRow = Readonly<{
  id: 'speak' | 'dialog' | 'explain' | 'energy' | 'phrases' | 'streak';
  labelKey: PaywallMCopyKey;
  free: PaywallMCompareCell;
  plusKey: PaywallMCopyKey;
  plusN?: number;
}>;

/** Шесть строк «Бесплатно и Plus» (числа из кода). Порядок — как на макете. */
export function paywallMCompareRows(): readonly PaywallMCompareRow[] {
  return [
    { id: 'speak', labelKey: 'm.cmp.speak', free: { key: 'm.cmp.perDay', n: PAYWALL_M_LIMITS.voicePerDay }, plusKey: 'm.cmp.unlimited' },
    { id: 'dialog', labelKey: 'm.cmp.aiDialog', free: { key: 'm.cmp.perMonth', n: PAYWALL_M_LIMITS.dialogPerMonth }, plusKey: 'm.cmp.unlimited' },
    { id: 'explain', labelKey: 'm.cmp.explain', free: { key: 'm.cmp.perDay', n: PAYWALL_M_LIMITS.explainPerDay }, plusKey: 'm.cmp.every' },
    { id: 'energy', labelKey: 'm.cmp.energy', free: { key: 'm.cmp.energyFree', n: PAYWALL_M_LIMITS.energy }, plusKey: 'm.cmp.asMuch' },
    { id: 'phrases', labelKey: 'm.cmp.ownPhrases', free: { key: null, n: PAYWALL_M_LIMITS.savedPhrases }, plusKey: 'm.cmp.unlimited' },
    { id: 'streak', labelKey: 'm.cmp.streakShield', free: { key: null }, plusKey: 'm.cmp.perMonth', plusN: PAYWALL_M_PLUS_FREEZES_PER_MONTH },
  ];
}

export type PaywallMFooterInput = Readonly<{
  /** Пробный годового плана ИЗ МАГАЗИНА (null — магазин пробного не дал). */
  yearlyTrialDays: number | null;
  /** Цена года как строку магазина; null — цен ещё нет. */
  yearlyPrice: string | null;
  /** Цена года в месяц строкой магазина (≈ …); null — нет. */
  yearlyPerMonth: string | null;
  /** Ноль в валюте магазина («0 €»); null — не можем честно показать «Сегодня 0». */
  zero: string | null;
}>;

export type PaywallMFooter = Readonly<{
  ctaKey: PaywallMCopyKey;
  ctaVars: Readonly<Record<string, string | number>>;
  fineKey: PaywallMCopyKey | null;
  fineVars: Readonly<Record<string, string>>;
}>;

/**
 * Подпись кнопки и строка под ней. Пробный — ТОЛЬКО из магазина (правило владельца): есть — «Начать N дней бесплатно» + «Сегодня 0 …»;
 * нет — «Оформить за {цена} в год» + «≈ {в месяц}», без нуля и без «7 дней». Нет цены — fineKey null (цену не выдумываем).
 */
export function paywallMFooter(input: PaywallMFooterInput): PaywallMFooter {
  const { yearlyTrialDays, yearlyPrice, yearlyPerMonth, zero } = input;
  if (yearlyTrialDays && yearlyTrialDays > 0) {
    const canSayZero = !!zero && !!yearlyPrice;
    return {
      ctaKey: 'm.cta.trial', ctaVars: { days: yearlyTrialDays },
      fineKey: canSayZero ? 'm.fine.trial' : null,
      fineVars: canSayZero ? { zero: zero as string, price: yearlyPrice as string } : {},
    };
  }
  return {
    ctaKey: 'm.cta.noTrial', ctaVars: { price: yearlyPrice ?? '' },
    fineKey: yearlyPerMonth ? 'm.fine.noTrial' : null,
    fineVars: yearlyPerMonth ? { monthly: yearlyPerMonth } : {},
  };
}
