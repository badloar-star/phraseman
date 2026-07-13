import { SOFT_UPSELL_ADMIN_PREVIEWS } from '../components/admin_panel/soft_upsell_preview_catalog';

const EXPECTED = [
  ['first_lesson', 'first_lesson_success', 1, 'personal_plan'],
  ['free_lessons_complete', 'free_lessons_complete', 8, 'paywall'],
  ['weekly_review', 'weekly_review', 1, 'paywall'],
  ['second_ai_dialogue', 'dialog_repeat_success', 2, 'paywall'],
  ['streak_milestone', 'streak_milestone', 7, 'paywall'],
  ['repeated_training', 'trainer_repeat_success', 1, 'paywall'],
] as const;

test('defines all six independent soft upsell previews', () => {
  expect(SOFT_UPSELL_ADMIN_PREVIEWS).toHaveLength(6);
  expect(SOFT_UPSELL_ADMIN_PREVIEWS.map(({ opportunity }) => [
    opportunity.trigger,
    opportunity.context,
    opportunity.value,
    opportunity.destination,
  ])).toEqual(EXPECTED);
});

test('uses unique ids and complete visible copy for every preview', () => {
  const ids = SOFT_UPSELL_ADMIN_PREVIEWS.map(({ id }) => id);
  expect(new Set(ids).size).toBe(6);

  for (const preview of SOFT_UPSELL_ADMIN_PREVIEWS) {
    expect(preview.adminLabel.trim()).not.toBe('');
    expect(preview.adminDescription.trim()).not.toBe('');
    expect(preview.title.trim()).not.toBe('');
    expect(preview.body.trim()).not.toBe('');
    expect(preview.ctaLabel.trim()).not.toBe('');
    expect(preview.opportunity.milestoneId).toBe(
      `${preview.opportunity.trigger}:${preview.opportunity.value}:en`,
    );
  }
});

test('keeps the first preview on personal plan and every other preview on Plus', () => {
  expect(SOFT_UPSELL_ADMIN_PREVIEWS[0].ctaLabel).toBe('Построить мой путь');
  expect(SOFT_UPSELL_ADMIN_PREVIEWS.slice(1).every(({ ctaLabel }) => ctaLabel === 'Открыть Plus')).toBe(true);
});
