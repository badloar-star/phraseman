// зачем (владелец 11.10: «все пейволы должны быть контекстными всегда»; тексты утверждены — таблица сессии 3):
// у КАЖДОГО входа белого списка в КАЖДОМ из 9 языков есть заголовок, подзаголовок и первая выгода; латинские языки
// без кириллицы; подзаголовок короткий (ru ≤ 90 знаков); числа — из констант кода; снятые входы (theme, arena_limit)
// не продают ничего своего; пилюля «что закончилось» у входов-лимитов.
import { PREMIUM_CONTEXT_VALUES } from '../app/premium_context';
import { paywallContextHeadline, paywallEntryFactsFromParams } from '../app/paywall_context_headline';
import { PAYWALL_TEXT_LANGS } from '../app/paywall_context_texts';
import { FREE_SAVED_CARD_LIMIT } from '../app/flashcards/free_limit';
import { REVENUE_MONTHLY_LIMITS } from '../app/revenue_daily_limits';

const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;
const LATIN_LANGS = PAYWALL_TEXT_LANGS.filter((l) => l !== 'ru' && l !== 'uk');
const RETIRED = new Set(['theme', 'arena_limit']);

describe('контракт контекста окна Plus (утверждённые тексты)', () => {
  it('у каждого входа в каждом из 9 языков есть заголовок, подзаголовок и первая выгода', () => {
    const gaps: string[] = [];
    for (const ctx of PREMIUM_CONTEXT_VALUES) {
      for (const lang of PAYWALL_TEXT_LANGS) {
        const h = paywallContextHeadline(ctx, lang as never);
        if (!h.title) gaps.push(`${ctx}/${lang}: title`);
        if (!h.subtitle) gaps.push(`${ctx}/${lang}: subtitle`);
        if (!h.firstBenefit) gaps.push(`${ctx}/${lang}: benefit`);
      }
    }
    expect(gaps).toEqual([]);
  });

  it('латинские языки без кириллицы', () => {
    const leaks: string[] = [];
    for (const ctx of PREMIUM_CONTEXT_VALUES) {
      for (const lang of LATIN_LANGS) {
        const h = paywallContextHeadline(ctx, lang as never);
        for (const [field, text] of Object.entries({ title: h.title, subtitle: h.subtitle, benefit: h.firstBenefit, pill: h.pill })) {
          if (CYRILLIC.test(text)) leaks.push(`${ctx}/${lang}: ${field}`);
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it('подзаголовок — одна короткая фраза (ru ≤ 90 знаков, остальные ≤ 110)', () => {
    const long: string[] = [];
    for (const ctx of PREMIUM_CONTEXT_VALUES) {
      for (const lang of PAYWALL_TEXT_LANGS) {
        const sub = paywallContextHeadline(ctx, lang as never).subtitle;
        if (sub.length > (lang === 'ru' ? 90 : 110)) long.push(`${ctx}/${lang}: ${sub.length}`);
      }
    }
    expect(long).toEqual([]);
  });

  it('снятые входы (темы бесплатны, Арены нет) получают общий текст и без пилюли', () => {
    for (const ctx of RETIRED) {
      const h = paywallContextHeadline(ctx as never, 'ru' as never);
      expect(h.copyContext).toBe('generic');
      expect(h.pill).toBe('');
    }
  });

  it('пять входов курса больше не одинаковые «Продолжим курс?»', () => {
    const titles = ['course_after_lesson3', 'lesson_b1', 'level_up', 'free_lessons_complete', 'notification_upsell']
      .map((ctx) => paywallContextHeadline(ctx as never, 'ru' as never).title);
    expect(new Set(titles).size).toBe(5);
  });

  it('«серия» — про защиту серии, а не про энергию', () => {
    const h = paywallContextHeadline('streak', 'ru' as never);
    expect(h.title).toBe('Не потеряй серию');
    expect(`${h.subtitle} ${h.firstBenefit}`).not.toMatch(/энерги/i);
  });

  it('числа берутся из констант кода', () => {
    expect(paywallContextHeadline('flashcard_limit', 'ru' as never).subtitle).toContain(String(FREE_SAVED_CARD_LIMIT));
    expect(paywallContextHeadline('flashcard_limit', 'ru' as never).pill).toBe(`${FREE_SAVED_CARD_LIMIT} из ${FREE_SAVED_CARD_LIMIT} фраз`);
    expect(paywallContextHeadline('dialog_limit', 'en' as never).pill)
      .toBe(`${REVENUE_MONTHLY_LIMITS.ai_dialog_replies} of ${REVENUE_MONTHLY_LIMITS.ai_dialog_replies} replies`);
    expect(paywallContextHeadline('mistake_practice', 'ru' as never).pill).toBe('1 из 1 подхода');
  });

  it('пилюля берёт номер закрытого урока и длину серии из параметров входа', () => {
    const lessonFacts = paywallEntryFactsFromParams({ lessons_done: '3' });
    expect(paywallContextHeadline('course_after_lesson3', 'ru' as never, lessonFacts).pill).toBe('Урок 4 закрыт');
    expect(paywallContextHeadline('course_after_lesson3', 'ru' as never).pill).toBe('Урок закрыт');
    const streakFacts = paywallEntryFactsFromParams({ streak: '12' });
    expect(paywallContextHeadline('streak', 'ru' as never, streakFacts).pill).toBe('Серия 12 дней');
    expect(paywallContextHeadline('streak', 'uk' as never, paywallEntryFactsFromParams({ streak: '2' })).pill).toBe('Серія 2 дні');
    expect(paywallContextHeadline('streak', 'en' as never, paywallEntryFactsFromParams({ streak: '1' })).pill).toBe('1 day streak');
  });

  it('входы-лимиты имеют пилюлю на всех 9 языках', () => {
    const limitContexts = ['no_energy', 'ai_explain', 'course_after_lesson3', 'mistake_practice', 'flashcard_limit',
      'flashcard_training', 'streak', 'dialog_limit', 'ai_voice_input', 'speaking', 'free_lessons_complete',
      'intro_ended', 'premium_expired', 'vip_expired', 'referral_ended', 'language_add', 'dialog_locked_level', 'lesson_b1'];
    const missing: string[] = [];
    for (const ctx of limitContexts) {
      for (const lang of PAYWALL_TEXT_LANGS) {
        if (!paywallContextHeadline(ctx as never, lang as never).pill) missing.push(`${ctx}/${lang}`);
      }
    }
    expect(missing).toEqual([]);
  });
});
