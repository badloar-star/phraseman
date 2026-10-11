import { notifNudgeCopy } from '../app/notif_nudge_copy';
import { ONBOARDING_LANG_KEYS } from '../components/onboarding/clean_onboarding_dates';

// зачем (координатор 12.10): окно «Включи напоминания» в _layout.tsx показывало русский португальцам, вьетнамцам, индонезийцам, туркам и полякам.
describe('notification nudge copy', () => {
  const CYRILLIC = /[А-Яа-яЁёІіЇїЄєҐґ]/;

  it('has a full, non-empty set of strings in every interface language', () => {
    for (const lang of ONBOARDING_LANG_KEYS) {
      const copy = notifNudgeCopy(lang, 3);
      expect(copy.title).toContain('3');
      expect(copy.body.length).toBeGreaterThan(20);
      expect(copy.points).toHaveLength(3);
      copy.points.forEach((p) => expect(p.length).toBeGreaterThan(5));
      expect(copy.confirmLabel.length).toBeGreaterThan(3);
      expect(copy.cancelLabel.length).toBeGreaterThan(2);
      if (lang !== 'ru' && lang !== 'uk') {
        expect([lang, CYRILLIC.test(`${copy.title}${copy.body}${copy.points.join('')}${copy.confirmLabel}${copy.cancelLabel}`)]).toEqual([lang, false]);
      }
    }
  });

  it('declines the day word and avoids gendered past tense', () => {
    expect(notifNudgeCopy('ru', 1).title).toBe('Без практики: 1 день');
    expect(notifNudgeCopy('ru', 3).title).toBe('Без практики: 3 дня');
    expect(notifNudgeCopy('ru', 7).title).toBe('Без практики: 7 дней');
    expect(notifNudgeCopy('uk', 5).title).toBe('Без практики: 5 днів');
    expect(notifNudgeCopy('en', 1).title).toBe('1 day without practice');
    expect(notifNudgeCopy('es', 2).title).toBe('Llevas 2 días sin practicar');
  });

  it('falls back to English for an unknown language', () => {
    expect(notifNudgeCopy('xx', 2).title).toBe('2 days without practice');
  });
});
