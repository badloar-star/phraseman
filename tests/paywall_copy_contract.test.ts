import { PREMIUM_CONTEXT_VALUES, type PremiumContext } from '../app/premium_context';
import {
  PAYWALL_COPY,
  PAYWALL_PLANNED_COPY,
  getPaywallCopy,
  getHeroPlannedCopy,
  CONTEXT_BENEFITS,
  CONTEXT_BENEFITS_PLANNED,
  getContextBenefitPlanned,
  PREMIUM_HERO_ART,
  normalizePremiumContext,
  resolvePaywallContext,
  makeLP,
} from '../app/paywall_copy';

// Уникальные контексты (в union есть дубль dialog_limit — Set убирает).
const CONTEXTS = Array.from(new Set(PREMIUM_CONTEXT_VALUES)) as PremiumContext[];

describe('paywall_copy — контракт покрытия premium-контекстов', () => {
  it.each(CONTEXTS)('контекст "%s": заголовок и сабтайтл непустые (ru/uk/es)', (ctx) => {
    const copy = getPaywallCopy(ctx);
    for (const k of ['titleRu', 'titleUk', 'titleEs', 'subtitleRu', 'subtitleUk', 'subtitleEs'] as const) {
      expect(typeof copy[k]).toBe('string');
      expect(copy[k].length).toBeGreaterThan(0);
    }
  });

  it.each(CONTEXTS)('контекст "%s": planned-герой имеет 5 языков', (ctx) => {
    const planned = getHeroPlannedCopy(ctx, 0);
    for (const lng of ['pt-BR', 'vi', 'id', 'tr', 'pl'] as const) {
      expect(typeof planned.title[lng]).toBe('string');
      expect(typeof planned.subtitle[lng]).toBe('string');
    }
  });

  it.each(CONTEXTS)('контекст "%s": есть hero-art (accent)', (ctx) => {
    expect(PREMIUM_HERO_ART[ctx]).toBeDefined();
    expect(PREMIUM_HERO_ART[ctx].accent).toMatch(/^#?[0-9a-fA-F]{3,8}$/);
  });

  it.each(CONTEXTS)('контекст "%s": есть прямые copy/benefits без generic-fallback', (ctx) => {
    expect(PAYWALL_COPY[ctx]).toBeDefined();
    expect(PAYWALL_PLANNED_COPY[ctx]).toBeDefined();
    expect(CONTEXT_BENEFITS[ctx]).toBeDefined();
    expect(CONTEXT_BENEFITS[ctx]?.length).toBeGreaterThanOrEqual(3);
    expect(CONTEXT_BENEFITS_PLANNED[ctx]).toBeDefined();
    expect(CONTEXT_BENEFITS_PLANNED[ctx]?.length).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['ai_voice_input', 'speaking'],
    ['dialog_analysis', 'dialog_limit'],
    ['dialog_locked_level', 'dialog_limit'],
    ['flashcard_training', 'flashcard_limit'],
  ] as [PremiumContext, PremiumContext][])('контекст "%s" не шарит старый текст "%s"', (fresh, legacy) => {
    expect(PAYWALL_COPY[fresh]).not.toBe(PAYWALL_COPY[legacy]);
    expect(PAYWALL_PLANNED_COPY[fresh]).not.toBe(PAYWALL_PLANNED_COPY[legacy]);
    expect(CONTEXT_BENEFITS[fresh]).not.toBe(CONTEXT_BENEFITS[legacy]);
    expect(CONTEXT_BENEFITS_PLANNED[fresh]).not.toBe(CONTEXT_BENEFITS_PLANNED[legacy]);
  });

  it('course_after_lesson3 explains the three-lesson Free limit and ordered Plus access', () => {
    const copy = getPaywallCopy('course_after_lesson3');

    // Owner 2026-09-20: Free stops after lesson 3. Plus continues the course,
    // with section starters immediately available and the rest in sequence.
    expect(copy.titleRu).toBe('Больше возможностей с Plus');
    expect(copy.subtitleRu).toBe(
      'Первые три урока доступны бесплатно. С Plus первые уроки A1, A2, B1 и B2 доступны сразу, остальные открываются по порядку.',
    );
    expect(CONTEXT_BENEFITS.course_after_lesson3?.map((benefit) => benefit.ru)).toEqual([
      'Разговорная практика',
      'Безлимитная энергия',
      'Подробная статистика',
    ]);
    expect(CONTEXT_BENEFITS_PLANNED.course_after_lesson3).toEqual(CONTEXT_BENEFITS.course_after_lesson3);
    expect(CONTEXT_BENEFITS.lesson_b1).toEqual(CONTEXT_BENEFITS.course_after_lesson3);

    const russianCopy = [
      copy.titleRu,
      copy.subtitleRu,
      ...(CONTEXT_BENEFITS.course_after_lesson3?.map((benefit) => benefit.ru) ?? []),
    ].join(' ');
    expect(russianCopy).not.toContain('текущ');
    expect(russianCopy).not.toContain('экзамен');
  });

  it('новые paywall-контексты нормализуются в себя, а не в старый экран', () => {
    expect(normalizePremiumContext('lesson_b1')).toBe('lesson_b1');
    expect(normalizePremiumContext('ai_voice_input')).toBe('ai_voice_input');
    expect(normalizePremiumContext('dialog_analysis')).toBe('dialog_analysis');
    expect(normalizePremiumContext('dialog_locked_level')).toBe('dialog_locked_level');
    expect(normalizePremiumContext('flashcard_training')).toBe('flashcard_training');
    // Аудит «пейволы-объясняют»: раньше эти точки падали в generic.
    expect(normalizePremiumContext('free_lessons_complete')).toBe('free_lessons_complete');
    expect(normalizePremiumContext('referral_ended')).toBe('referral_ended');
    expect(normalizePremiumContext('winback')).toBe('winback');
  });

  it('resolvePaywallContext: source-маппинг для триггеров, чьи файлы не трогаем', () => {
    // winback-триггер в _layout шлёт context:'streak' + source:'winback' —
    // вернувшийся после 7+ дней не должен видеть обещание спасти сгоревшую серию.
    expect(resolvePaywallContext('streak', 'winback')).toBe('winback');
    expect(resolvePaywallContext('generic', 'referral_ended')).toBe('referral_ended');
    // Обычные source не влияют на контекст.
    expect(resolvePaywallContext('streak', 'home_streak')).toBe('streak');
    expect(resolvePaywallContext('no_energy', undefined)).toBe('no_energy');
    expect(resolvePaywallContext(undefined, undefined)).toBe('generic');
  });

  it('generic всегда есть как фолбэк', () => {
    expect(getPaywallCopy('unknown_ctx_xyz' as PremiumContext)).toBe(getPaywallCopy('generic'));
    expect(CONTEXT_BENEFITS.generic.length).toBeGreaterThanOrEqual(3);
  });

  it('getContextBenefitPlanned не падает на крайних индексах', () => {
    expect(getContextBenefitPlanned('generic', 0)).toBeDefined();
    expect(getContextBenefitPlanned('generic', 99)).toBeDefined();
  });
});

describe('paywall_copy — makeLP', () => {
  it('ru-язык берёт ru-строку', () => {
    const LP = makeLP('ru');
    expect(LP('Привет', 'Привіт', 'Hello', 'Hola', { 'pt-BR': 'Olá', vi: 'Xin chào', id: 'Halo', tr: 'Merhaba', pl: 'Cześć' }))
      .toBe('Привет');
  });
  it('planned-язык (pl) берёт из planned-словаря', () => {
    const LP = makeLP('pl');
    expect(LP('Привет', 'Привіт', 'Hello', 'Hola', { 'pt-BR': 'Olá', vi: 'Xin chào', id: 'Halo', tr: 'Merhaba', pl: 'Cześć' }))
      .toBe('Cześć');
  });
  it('en-язык берёт отдельную английскую строку, а не русский fallback', () => {
    const LP = makeLP('en');
    expect(LP('Привет', 'Привіт', 'Hello', 'Hola', { 'pt-BR': 'Olá', vi: 'Xin chào', id: 'Halo', tr: 'Merhaba', pl: 'Cześć' }))
      .toBe('Hello');
  });
});
