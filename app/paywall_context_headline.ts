/**
 * Контракт контекста окна Plus: «контекст → заголовок / подзаголовок / первая выгода / пилюля „что закончилось“».
 *
 * зачем (владелец 11.10: «ВСЕ ПЕЙВОЛЫ ДОЛЖНЫ БЫТЬ КОНТЕКСТНЫМИ ВСЕГДА»; тексты утверждены владельцем 11.10 —
 * таблица сессии 3, docs/design/v2-app/paywall-context-texts.md): окно говорит про место, откуда человек пришёл.
 * Тексты на 9 языках — app/paywall_context_texts.ts (числа из констант кода). Вход без своего текста и снятые входы
 * (`theme`, `arena_limit`) получают общий текст `generic`, а экран оставляет прежнюю шапку пробного периода.
 */
import type { Lang } from '../constants/i18n';
import type { PremiumContext } from './premium_context';
import {
  PAYWALL_RETIRED_CONTEXTS,
  isPaywallTextLang,
  paywallContextPill,
  paywallContextTexts,
  type PaywallEntryFacts,
  type PaywallTextContext,
  type PaywallTextLang,
} from './paywall_context_texts';

export type { PaywallEntryFacts } from './paywall_context_texts';

export type PaywallContextHeadline = Readonly<{
  /** Контекст, чьи тексты реально взяты (свой или generic). */
  copyContext: PremiumContext | 'generic';
  title: string;
  subtitle: string;
  firstBenefit: string;
  /** Пилюля «что закончилось / что закрыто» (макет #c1). Пустая строка — пилюли нет. */
  pill: string;
}>;

function textContext(ctx: PremiumContext): PaywallTextContext | 'generic' {
  if ((PAYWALL_RETIRED_CONTEXTS as readonly string[]).includes(ctx)) return 'generic';
  return ctx as PaywallTextContext;
}

/** Язык интерфейса → язык текстов (неизвестный — английский, но никогда не русская подстановка). */
function textLang(lang: Lang): PaywallTextLang {
  return isPaywallTextLang(lang) ? lang : 'en';
}

/** Факты входа из параметров маршрута: номер закрытого урока (`lessons_done` + 1) и длина серии (`streak`). */
export function paywallEntryFactsFromParams(params: Readonly<Record<string, string | string[] | undefined>>): PaywallEntryFacts {
  const first = (raw: string | string[] | undefined) => Number(Array.isArray(raw) ? raw[0] : raw);
  const lessonsDone = first(params.lessons_done);
  const streak = first(params.streak);
  return {
    lessonNumber: Number.isSafeInteger(lessonsDone) && lessonsDone >= 0 ? lessonsDone + 1 : null,
    streakDays: Number.isSafeInteger(streak) && streak > 0 ? streak : null,
  };
}

export function paywallContextHeadline(ctx: PremiumContext, lang: Lang, facts: PaywallEntryFacts = {}): PaywallContextHeadline {
  const copyContext = textContext(ctx);
  const tl = textLang(lang);
  const text = paywallContextTexts()[copyContext][tl];
  return {
    copyContext,
    title: text.title,
    subtitle: text.subtitle,
    firstBenefit: text.benefit,
    pill: copyContext === 'generic' ? '' : paywallContextPill(copyContext, tl, facts),
  };
}

/* expo-router route shim: служебный модуль в app/ не должен становиться экраном. */
export default function __RouteShim() { return null; }
