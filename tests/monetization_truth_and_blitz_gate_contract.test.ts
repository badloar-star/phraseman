import { CONTEXT_BENEFITS } from '../app/paywall_copy';
import { MAIN_COURSE_PLUS_BENEFITS } from '../app/main_course_plus_copy';
import type { Lang } from '../constants/i18n';

const MAIN_COURSE_CONTEXTS = [
  'course_after_lesson3',
  'lesson_b1',
  'free_lessons_complete',
  'level_up',
  'notification_upsell',
] as const;

const UNLIMITED_ENERGY_COPY = {
  ru: 'Безлимитная энергия',
  uk: 'Безлімітна енергія',
  en: 'Unlimited energy',
  es: 'Energía ilimitada',
  'pt-BR': 'Energia ilimitada',
  vi: 'Năng lượng không giới hạn',
  id: 'Energi tanpa batas',
  tr: 'Sınırsız enerji',
  pl: 'Nielimitowana energia',
} as const;

const RETIRED_PERSONAL_PLAN_COPY = {
  ru: 'Личный план занятий',
  uk: 'Особистий план занять',
  en: 'Personal learning plan',
  es: 'Plan de estudio personal',
  'pt-BR': 'Plano de estudos pessoal',
  vi: 'Kế hoạch học cá nhân',
  id: 'Rencana belajar pribadi',
  tr: 'Kişisel çalışma planı',
  pl: 'Osobisty plan nauki',
} as const;

describe('monetization truth and direct-route access contracts', () => {
  test('main Plus sales copy advertises unlimited energy instead of retired Personal Plan', () => {
    expect(MAIN_COURSE_PLUS_BENEFITS[1]).toEqual(UNLIMITED_ENERGY_COPY);

    for (const context of MAIN_COURSE_CONTEXTS) {
      const benefits = CONTEXT_BENEFITS[context];
      expect(benefits).toEqual(MAIN_COURSE_PLUS_BENEFITS);
      const localizedBenefits = benefits as Record<Lang, string>[];

      for (const locale of Object.keys(UNLIMITED_ENERGY_COPY) as (keyof typeof UNLIMITED_ENERGY_COPY)[]) {
        expect(localizedBenefits[1]?.[locale]).toBe(UNLIMITED_ENERGY_COPY[locale]);
        expect(localizedBenefits.map((benefit) => benefit[locale])).not.toContain(RETIRED_PERSONAL_PLAN_COPY[locale]);
      }
    }
  });
});
