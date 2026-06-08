import { pickTestimonials, TESTIMONIALS, DRAFT_MARKER, type Testimonial } from '../app/paywall_testimonials';
import type { Lang } from '../constants/i18n';

const ALL: [Lang, Testimonial[]][] = Object.entries(TESTIMONIALS) as [Lang, Testimonial[]][];

describe('paywall_testimonials — anti-fake CI gate (App Review 5.1.1)', () => {
  it('ни один verified-отзыв не содержит маркер черновика', () => {
    for (const [lang, list] of ALL) {
      for (const t of list) {
        if (t.verified) {
          expect(`${lang}: ${t.text} / ${t.author}`).not.toContain(DRAFT_MARKER);
        }
      }
    }
  });

  it('каждый черновик (verified:false) помечен DRAFT_MARKER — нельзя забыть пометку', () => {
    for (const [, list] of ALL) {
      for (const t of list) {
        if (!t.verified) {
          expect(t.author).toContain(DRAFT_MARKER);
        }
      }
    }
  });

  it('в прод-выборку (includeUnverified=false) НЕ попадают черновики', () => {
    for (const [lang] of ALL) {
      const prod = pickTestimonials(lang, 'generic', 0, 99, false);
      expect(prod.every(t => t.verified)).toBe(true);
      expect(prod.some(t => t.author.includes(DRAFT_MARKER))).toBe(false);
    }
  });
});

describe('paywall_testimonials — pickTestimonials', () => {
  it('есть черновики минимум для ru/uk/es (dev-видимость)', () => {
    expect(pickTestimonials('ru', 'generic', 0, 99, true).length).toBeGreaterThanOrEqual(3);
    expect(pickTestimonials('uk', 'generic', 0, 99, true).length).toBeGreaterThanOrEqual(3);
    expect(pickTestimonials('es', 'generic', 0, 99, true).length).toBeGreaterThanOrEqual(3);
  });

  it('возвращает запрошенное число (dev-режим)', () => {
    const out = pickTestimonials('ru', 'generic', 0, 2, true);
    expect(out).toHaveLength(2);
  });

  it('детерминирован по dayHash', () => {
    const a = pickTestimonials('ru', 'generic', 5, 2, true);
    const b = pickTestimonials('ru', 'generic', 5, 2, true);
    expect(a).toEqual(b);
  });

  it('меняет выборку при другом dayHash', () => {
    const a = pickTestimonials('ru', 'generic', 0, 1, true);
    const b = pickTestimonials('ru', 'generic', 1, 1, true);
    expect(a[0]).not.toEqual(b[0]);
  });

  it('ставит goal-matched первым (dev-режим)', () => {
    const out = pickTestimonials('ru', 'course_after_lesson3', 3, 3, true);
    const hasGoalMatch = TESTIMONIALS.ru.some(t => t.goalTag === 'course_after_lesson3');
    if (hasGoalMatch) {
      expect(out[0]?.goalTag).toBe('course_after_lesson3');
    }
  });

  it('прод-выборка пуста пока нет verified-отзывов (безопасный дефолт)', () => {
    // сейчас все отзывы — черновики → в проде блок не покажется (нет фейка)
    const prod = pickTestimonials('ru', 'generic', 0, 2, false);
    expect(prod).toHaveLength(0);
  });

  it('fallback на ru для неизвестного языка', () => {
    const out = pickTestimonials('xx' as never, 'generic', 0, 1, true);
    expect(out).toHaveLength(1);
  });
});
