/**
 * Контракт контекста окна Plus: «контекст → заголовок / подзаголовок / первая выгода».
 *
 * зачем (владелец 11.10: «Я НЕ ВИЖУ КОНТЕКСТА! ВСЕ ПЕЙВОЛЫ ДОЛЖНЫ БЫТЬ КОНТЕКСТНЫМИ ВСЕГДА»; координатор 14:45):
 * экран Plus получает entry.context, но шапка его не показывала — контекст уходил только в аналитику. Тексты под каждый
 * контекст в 9 языках уже написаны (app/paywall_copy.ts) и раньше жили в удалённых пейволах A–G. Эта функция
 * ничего не сочиняет: только выбирает готовую строку. Подключение к шапке — по макету Дизайна (гейт «приложение = макет»).
 *
 * Язык без своей строки (например, нет английской выгоды) — пустая строка, а НЕ русская подстановка:
 * русский текст англоязычному человеку хуже, чем отсутствие строки. Пробелы видит сторож
 * tests/paywall_context_headline_contract.test.ts.
 */
import type { Lang } from '../constants/i18n';
import type { PremiumContext } from './premium_context';
import {
  CONTEXT_BENEFITS,
  CONTEXT_BENEFITS_PLANNED,
  PAYWALL_PLANNED_COPY,
  getPaywallCopy,
  type PremiumPlannedCopy,
} from './paywall_copy';

export type PaywallContextHeadline = Readonly<{
  /** Контекст, чьи тексты реально взяты (свой или generic). */
  copyContext: PremiumContext | 'generic';
  title: string;
  subtitle: string;
  firstBenefit: string;
}>;

type PlannedLang = Exclude<keyof PremiumPlannedCopy, never>;

function planned(copy: PremiumPlannedCopy | undefined, lang: PlannedLang): string {
  return String(copy?.[lang] ?? '').trim();
}

function firstBenefitFor(ctx: PremiumContext, lang: Lang): string {
  const row = (CONTEXT_BENEFITS[ctx] ?? CONTEXT_BENEFITS.generic)[0];
  if (!row) return '';
  if (lang === 'ru' || lang === 'uk' || lang === 'es') return String(row[lang] ?? '').trim();
  const own = planned(row, lang as PlannedLang);
  if (own) return own;
  // зачем: часть строк держит перевод в параллельной таблице CONTEXT_BENEFITS_PLANNED.
  return planned((CONTEXT_BENEFITS_PLANNED[ctx] ?? CONTEXT_BENEFITS_PLANNED.generic)[0], lang as PlannedLang);
}

export function paywallContextHeadline(ctx: PremiumContext, lang: Lang): PaywallContextHeadline {
  const hasOwnCopy = getPaywallCopy(ctx) !== getPaywallCopy('generic') || ctx === 'generic';
  const copyContext: PremiumContext | 'generic' = hasOwnCopy ? ctx : 'generic';
  if (lang === 'ru' || lang === 'uk' || lang === 'es') {
    const copy = getPaywallCopy(ctx);
    const suffix = lang === 'ru' ? 'Ru' : lang === 'uk' ? 'Uk' : 'Es';
    return {
      copyContext,
      title: copy[`title${suffix}`].trim(),
      subtitle: copy[`subtitle${suffix}`].trim(),
      firstBenefit: firstBenefitFor(ctx, lang),
    };
  }
  // зачем: у части контекстов нет текста на этом языке (mastery/avatar_aura/arena_limit без en) — тогда честный
  // общий текст этого же языка, а не пустая шапка и не русская подстановка.
  const own = PAYWALL_PLANNED_COPY[ctx];
  const ownHasLang = !!own && !!planned(own.title, lang as PlannedLang);
  const hero = ownHasLang && own ? own : PAYWALL_PLANNED_COPY.generic;
  return {
    copyContext: ownHasLang ? ctx : 'generic',
    title: planned(hero.title, lang as PlannedLang),
    subtitle: planned(hero.subtitle, lang as PlannedLang),
    firstBenefit: firstBenefitFor(ctx, lang),
  };
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __RouteShim() { return null; }
