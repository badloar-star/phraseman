import type { SoftUpsellOpportunity, SoftUpsellTrigger } from './soft_upsell_core';

export type SoftUpsellLocale = 'ru' | 'uk' | 'es' | 'pt-BR' | 'vi' | 'id' | 'tr' | 'pl' | 'en';
export type SoftUpsellCategory = 'vocabulary' | 'grammar' | 'listening' | 'speaking' | 'reading';

export type SoftUpsellCopy = Readonly<{
  proof: string;
  title: string;
  body: string;
  ctaLabel: string;
}>;

type CategoryRate = Readonly<{ category: SoftUpsellCategory; attempts: number; rate: number }>;
type CategoryErrorRate = Readonly<{ category: SoftUpsellCategory; attempts: number; errorRate: number }>;
export type SoftUpsellMeasuredSignal =
  | Readonly<{ kind: 'weekly'; strong: CategoryRate; weak: CategoryRate }>
  | Readonly<{ kind: 'trainer'; weak: CategoryErrorRate; next: CategoryErrorRate }>;

const RU_COPY: Record<SoftUpsellTrigger, SoftUpsellCopy> = {
  first_lesson: {
    proof: 'УРОК 1 ЗАВЕРШЁН',
    title: 'Ты уже начал. Теперь не теряй темп.',
    body: 'Plus превратит первый результат в понятный маршрут: что учить сегодня, что повторять и как быстрее перейти к живой речи.',
    ctaLabel: 'Продолжить с моим планом',
  },
  free_lessons_complete: {
    proof: 'БЕСПЛАТНЫЙ СТАРТ ПРОЙДЕН',
    title: 'База готова. Дальше начинается твой английский.',
    body: 'Ты прошёл бесплатный старт. Plus откроет полный маршрут, разговорную практику и повторение слабых мест — без случайных упражнений.',
    ctaLabel: 'Открыть полный маршрут',
  },
  weekly_review: {
    proof: 'ТВОЯ НЕДЕЛЯ В ЦИФРАХ',
    title: 'Неделя уже показала, что работает для тебя.',
    body: 'Plus соберёт следующие уроки и повторы вокруг твоего реального прогресса — без случайного выбора упражнений.',
    ctaLabel: 'Усилить слабое место',
  },
  second_ai_dialogue: {
    proof: '2 РАЗГОВОРА ЗАВЕРШЕНЫ',
    title: 'Ты завершил два разговора. Не останавливай практику.',
    body: 'Plus продолжит разговорную практику в реальных ситуациях и поможет довести знакомые фразы до автоматизма.',
    ctaLabel: 'Продолжить говорить',
  },
  streak_milestone: {
    proof: '7 ДНЕЙ ПОДРЯД',
    title: 'Это уже не случайность. У тебя появилась привычка.',
    body: 'Plus превратит регулярность в результат: даст следующий шаг на каждый день и вовремя вернёт то, что начинает забываться.',
    ctaLabel: 'Закрепить результат',
  },
  repeated_training: {
    proof: 'ТРЕНИРОВКА ЗАВЕРШЕНА',
    title: 'Повторение уже работает. Следующий шаг — сделать его точнее.',
    body: 'Plus откроет персональные тренировки и повторение сохранённых ошибок, чтобы практика опиралась на твои результаты.',
    ctaLabel: 'Продолжить с персональными тренировками',
  },
};

const CATEGORY_RU: Record<SoftUpsellCategory, string> = {
  vocabulary: 'лексику', grammar: 'грамматику', listening: 'аудирование', speaking: 'разговорную речь', reading: 'чтение',
};
const CATEGORY_KEYS = new Set(Object.keys(CATEGORY_RU));

function validCategory(value: unknown): value is SoftUpsellCategory {
  return typeof value === 'string' && CATEGORY_KEYS.has(value) && CATEGORY_RU[value as SoftUpsellCategory].length <= 32;
}

function validMetric(attempts: unknown, rate: unknown): boolean {
  return Number.isInteger(attempts) && Number(attempts) >= 5 && typeof rate === 'number' && Number.isFinite(rate) && rate >= 0 && rate <= 1;
}

function measuredRuCopy(trigger: SoftUpsellTrigger, signal: SoftUpsellMeasuredSignal | null | undefined): SoftUpsellCopy | null {
  if (trigger === 'weekly_review' && signal?.kind === 'weekly'
    && validCategory(signal.strong.category) && validCategory(signal.weak.category)
    && signal.strong.category !== signal.weak.category
    && validMetric(signal.strong.attempts, signal.strong.rate) && validMetric(signal.weak.attempts, signal.weak.rate)
    && signal.strong.rate - signal.weak.rate >= 0.15) {
    return {
      proof: 'ТВОЯ НЕДЕЛЯ В ЦИФРАХ',
      title: `Ты лучше запоминаешь ${CATEGORY_RU[signal.strong.category]}, чем ${CATEGORY_RU[signal.weak.category]}.`,
      body: 'Plus откроет персональные повторы и полный учебный маршрут, чтобы чаще возвращаться к слабому месту, а не повторять всё подряд.',
      ctaLabel: 'Усилить слабое место',
    };
  }
  if (trigger === 'repeated_training' && signal?.kind === 'trainer'
    && validCategory(signal.weak.category) && validCategory(signal.next.category)
    && signal.weak.category !== signal.next.category
    && validMetric(signal.weak.attempts, signal.weak.errorRate) && validMetric(signal.next.attempts, signal.next.errorRate)
    && signal.weak.errorRate - signal.next.errorRate >= 0.15) {
    const label = CATEGORY_RU[signal.weak.category];
    const titleLabel = label.charAt(0).toUpperCase() + label.slice(1);
    return {
      proof: 'СЛАБОЕ МЕСТО НАЙДЕНО',
      title: `${titleLabel} пока забирает больше всего ошибок.`,
      body: 'Plus откроет персональные тренировки и повторы ошибок, чтобы чаще возвращаться к этой теме, а не повторять всё подряд.',
      ctaLabel: 'Убрать слабое место',
    };
  }
  return null;
}

export function selectSoftUpsellCopy(input: {
  opportunity: SoftUpsellOpportunity;
  locale: SoftUpsellLocale;
  measured?: SoftUpsellMeasuredSignal | null;
}): SoftUpsellCopy {
  // Russian is the approved source copy. Other locales temporarily receive the same bounded promise
  // until their localized catalog is added; no raw/generated string is ever interpolated.
  return measuredRuCopy(input.opportunity.trigger, input.measured) ?? RU_COPY[input.opportunity.trigger];
}

export default function __RouteShim() { return null; }
