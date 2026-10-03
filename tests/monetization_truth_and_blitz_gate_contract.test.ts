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

// зачем (владелец 22.09, 114baf437): пункты названы действиями человека — «Безлимитная энергия» стала
// «Занятия без ожидания энергии» и переехала третьей; смысл сторожа прежний: энергия вместо снятого плана.
const UNLIMITED_ENERGY_COPY = {
  ru: 'Занятия без ожидания энергии',
  uk: 'Заняття без очікування енергії',
  en: 'Study without waiting for energy',
  es: 'Estudia sin esperar energía',
  'pt-BR': 'Estude sem esperar energia',
  vi: 'Học mà không cần chờ năng lượng',
  id: 'Belajar tanpa menunggu energi',
  tr: 'Enerji beklemeden çalışma',
  pl: 'Nauka bez czekania na energię',
} as const;
const ENERGY_BENEFIT_INDEX = 2;

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
    expect(MAIN_COURSE_PLUS_BENEFITS[ENERGY_BENEFIT_INDEX]).toEqual(UNLIMITED_ENERGY_COPY);

    for (const context of MAIN_COURSE_CONTEXTS) {
      const benefits = CONTEXT_BENEFITS[context];
      expect(benefits).toEqual(MAIN_COURSE_PLUS_BENEFITS);
      const localizedBenefits = benefits as Record<Lang, string>[];

      for (const locale of Object.keys(UNLIMITED_ENERGY_COPY) as (keyof typeof UNLIMITED_ENERGY_COPY)[]) {
        expect(localizedBenefits[ENERGY_BENEFIT_INDEX]?.[locale]).toBe(UNLIMITED_ENERGY_COPY[locale]);
        expect(localizedBenefits.map((benefit) => benefit[locale])).not.toContain(RETIRED_PERSONAL_PLAN_COPY[locale]);
      }
    }
  });
});
