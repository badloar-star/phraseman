// ═══════════════════════════════════════════════════════════════════════════
// paywall_m_head.ts — шапка общего экрана М по месту входа: пилюля, строка над заголовком, заголовок, абзац под шапкой.
//
// зачем (макет AKuWv3RWqbu3a4Xe7EBj7q и 6dkmYjjEX3kCv2s1nuFT9B; строки — docs/work/paywall-m-context-strings-2026-10-25*.md): каждое место входа говорит своё
// («Не останавливайся на самом интересном», «Пусть серия переживёт и занятой день»), а ниже — один и тот же честный экран. Число, которого нет (минуты разговора,
// фразы урока), не выдумываем: такая шапка падает на общую, а не печатает «0» или пусто. Чистый модуль — тест tests/paywall_m_head_2026_10_25.test.ts.
// ═══════════════════════════════════════════════════════════════════════════
import type { Lang } from '../../../constants/i18n';
import { paywallMText } from './paywall_m_copy';
import { PAYWALL_M_LIMITS, PAYWALL_M_TOTAL_LESSONS, type PaywallMChartKind, type PaywallMPerson } from './paywall_m_model';

export type PaywallMHeadKind = 'general' | 'energy' | 'dialog' | 'streak' | 'workshop' | 'lock';

export type PaywallMHead = Readonly<{ pill: string | null; kicker: string; title: string; sub: string }>;

/** Факты места входа (из параметров маршрута и локальных данных). Нет факта — null, и шапка места уступает общей. */
export type PaywallMHeadFacts = Readonly<{
  /** Минуты и фразы первого разговора с ИИ. */
  dialogMinutes?: number | null;
  dialogPhrases?: number | null;
  /** Номер закрытого урока (для «общего замка» и Мастерской). */
  lockedLesson?: number | null;
  /** Фраз в пройденном уроке (Мастерская). */
  workshopPhrases?: number | null;
}>;

/** Какой график показывает место: разговор с ИИ — про реплики, остальные — про голос. */
export function paywallMChartKindFor(kind: PaywallMHeadKind): PaywallMChartKind {
  return kind === 'dialog' ? 'dialog' : 'voice';
}

const finite = (n: number | null | undefined): n is number => typeof n === 'number' && Number.isFinite(n) && n >= 0;

function general(lang: Lang, person: PaywallMPerson): PaywallMHead {
  const lesson = Math.min(PAYWALL_M_TOTAL_LESSONS, Math.max(1, person.lessonsDone));
  return {
    pill: null,
    kicker: paywallMText(lang, 'm.head.general.kicker', { lesson, total: PAYWALL_M_TOTAL_LESSONS }),
    title: paywallMText(lang, 'm.head.general.title'),
    sub: paywallMText(lang, 'm.head.general.sub'),
  };
}

/** Шапка по месту. Не хватает факта — общая шапка (вид места не ломается из-за пустого числа). */
export function paywallMHeadFor(kind: PaywallMHeadKind, lang: Lang, person: PaywallMPerson, facts: PaywallMHeadFacts = {}): PaywallMHead {
  const base = general(lang, person);
  switch (kind) {
    case 'energy':
      return {
        pill: paywallMText(lang, 'm.head.energy.pill'),
        kicker: paywallMText(lang, 'm.head.energy.kicker', { n: PAYWALL_M_LIMITS.energy }),
        title: paywallMText(lang, 'm.head.energy.title'),
        sub: paywallMText(lang, 'm.head.energy.sub'),
      };
    case 'dialog':
      if (!finite(facts.dialogMinutes) || !finite(facts.dialogPhrases)) return base;
      return {
        pill: paywallMText(lang, 'm.head.dialog.pill'),
        kicker: paywallMText(lang, 'm.head.dialog.kicker', { min: facts.dialogMinutes, n: facts.dialogPhrases }),
        title: paywallMText(lang, 'm.head.dialog.title'),
        sub: paywallMText(lang, 'm.head.dialog.sub', { limit: PAYWALL_M_LIMITS.dialogPerMonth }),
      };
    case 'streak':
      if (person.streakDays <= 0) return base;
      return {
        pill: paywallMText(lang, 'm.head.streak.pill', { n: person.streakDays }),
        kicker: paywallMText(lang, 'm.head.streak.kicker', { n: person.streakDays }),
        title: paywallMText(lang, 'm.head.streak.title'),
        sub: paywallMText(lang, 'm.head.streak.sub'),
      };
    case 'workshop':
      if (!finite(facts.lockedLesson) || !finite(facts.workshopPhrases)) return base;
      return {
        pill: paywallMText(lang, 'm.head.workshop.pill'),
        kicker: paywallMText(lang, 'm.head.workshop.kicker', { lesson: facts.lockedLesson, n: facts.workshopPhrases }),
        title: paywallMText(lang, 'm.head.workshop.title'),
        sub: paywallMText(lang, 'm.head.workshop.sub'),
      };
    case 'lock': {
      if (!finite(facts.lockedLesson)) return base;
      const ahead = Math.max(0, PAYWALL_M_TOTAL_LESSONS - person.lessonsDone);
      return {
        pill: paywallMText(lang, 'm.head.lock.pill', { lesson: facts.lockedLesson }),
        kicker: base.kicker,
        title: base.title,
        sub: paywallMText(lang, 'm.head.lock.sub', { n: ahead }),
      };
    }
    default:
      return base;
  }
}

/**
 * Какое «место» М соответствует контексту входа окна. Новых context/source не заводим (сторож paywall_entry_contract): только раскладываем существующие.
 * Остальные входы — общий экран с общей шапкой.
 */
export function paywallMHeadKindForContext(context: string): PaywallMHeadKind {
  switch (context) {
    case 'no_energy': return 'energy';
    case 'dialog_limit': case 'dialog_locked_level': case 'dialog_analysis': return 'dialog';
    case 'streak': return 'streak';
    case 'phrase_workshop': return 'workshop';
    case 'course_after_lesson3': case 'lesson_b1': return 'lock';
    default: return 'general';
  }
}
