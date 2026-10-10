import fs from 'fs';
import path from 'path';

import {
  applyWinBackCopy,
  applyWinBackPlannedCopy,
  CONTEXT_BENEFITS,
  getHeroPlannedCopy,
  getPaywallCopy,
  makeLP,
} from '../app/paywall_copy';
import {
  MAIN_COURSE_PLUS_BENEFITS,
  MAIN_COURSE_PLUS_DESCRIPTION,
  MAIN_COURSE_PLUS_TITLE,
} from '../app/main_course_plus_copy';
import type { Lang } from '../constants/i18n';

const MAIN_COURSE_CONTEXTS = [
  'course_after_lesson3',
  'lesson_b1',
  'free_lessons_complete',
  'level_up',
  'notification_upsell',
] as const;

const read = (file: string): string => fs.readFileSync(path.join(process.cwd(), file), 'utf8');

describe('active paywalls wire truthful English main-course copy', () => {
  test.each(MAIN_COURSE_CONTEXTS)('%s exposes English hero and benefit copy to makeLP', (context) => {
    const planned = getHeroPlannedCopy(context, 0) as {
      title: Record<Lang, string>;
      subtitle: Record<Lang, string>;
    };
    const benefits = CONTEXT_BENEFITS[context] as Record<Lang, string>[];
    const LP = makeLP('en');

    expect(planned.title.en).toBe(MAIN_COURSE_PLUS_TITLE.en);
    expect(planned.subtitle.en).toBe(MAIN_COURSE_PLUS_DESCRIPTION.en);
    expect(benefits).toEqual(MAIN_COURSE_PLUS_BENEFITS);
    expect(benefits.map((benefit) => LP(
      benefit.ru,
      benefit.uk,
      benefit.en,
      benefit.es,
      benefit,
    ))).toEqual(MAIN_COURSE_PLUS_BENEFITS.map((benefit) => benefit.en));
  });

  test.each(MAIN_COURSE_CONTEXTS)('%s keeps an English title for returning subscribers', (context) => {
    const copy = applyWinBackCopy(getPaywallCopy(context), context, true);
    const planned = applyWinBackPlannedCopy(getHeroPlannedCopy(context, 0), context, true);
    const LP = makeLP('en');

    expect(LP(
      copy.titleRu,
      copy.titleUk,
      planned.title.en ?? copy.titleRu,
      copy.titleEs,
      planned.title,
    )).toBe(context === 'notification_upsell' ? MAIN_COURSE_PLUS_TITLE.en : 'Everything is still here — shall we go on?'); // тексты возврата 22.09 (114baf437)
    expect(LP(
      copy.subtitleRu,
      copy.subtitleUk,
      planned.subtitle.en ?? copy.subtitleRu,
      copy.subtitleEs,
      planned.subtitle,
    )).toBe(MAIN_COURSE_PLUS_DESCRIPTION.en);
  });

  // зачем (10.10): пейволы A–G удалены (60155883a, единственный пейвол Plus) — проверка их рендеров снята.

  test('shared benefits send b.en to the English makeLP slot', () => {
    const source = read('components/paywall/paywallShared.tsx');

    expect(source).toContain('LP(b.ru, b.uk, b.en ?? b.ru, b.es,');
  });
});
