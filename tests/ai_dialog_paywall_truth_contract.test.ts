import fs from 'fs';
import path from 'path';

import {
  CONTEXT_BENEFITS,
  CONTEXT_BENEFITS_PLANNED,
  getHeroPlannedCopy,
  getPaywallCopy,
} from '../app/paywall_copy';

const dialoguesCatalogue = fs.readFileSync(
  path.join(__dirname, '..', 'components', 'DialogsTabContent.tsx'),
  'utf8',
);

describe('AI dialogue paywall truth contract', () => {
  test('Plus-only dialogue entry points use the same paywall context', () => {
    const upsell = dialoguesCatalogue.slice(
      dialoguesCatalogue.indexOf('{hasLockedCourseLevels && ('),
      dialoguesCatalogue.indexOf('{hasLockedCourseLevels && (') + 2200,
    );

    expect(upsell).toContain("context: 'dialog_limit'");
    expect(upsell).not.toContain("context: 'dialog_locked_level'");
  });

  test('dialog_limit states the daily limit of a regular account and that Plus removes it', () => {
    const copy = getPaywallCopy('dialog_limit');
    const planned = getHeroPlannedCopy('dialog_limit', 0);
    expect(copy.titleRu).toBe('Дневной лимит диалогов исчерпан');
    expect(copy.subtitleRu).toContain('10 реплик в день');
    expect(copy.subtitleRu).toContain('Plus снимает дневной лимит');
    expect(planned.title.en).toBe('Daily dialogue limit reached');
    expect(planned.subtitle.en).toContain('10 replies a day');
  });

  test.each(['dialog_locked_level'] as const)(
    '%s states that all dialogue scenarios are included in Plus',
    (context) => {
      const copy = getPaywallCopy(context);
      const planned = getHeroPlannedCopy(context, 0);

      expect(copy).toEqual({
        titleRu: 'Открой все диалоги',
        titleUk: 'Відкрий усі діалоги',
        titleEs: 'Abre todos los diálogos',
        subtitleRu:
          'Все сценарии диалогов входят в Plus. Практикуй ситуации из уроков и жизни, отвечай своими словами и получай подсказки по ходу разговора.',
        subtitleUk:
          'Усі сценарії діалогів входять у Plus. Практикуй ситуації з уроків і життя, відповідай своїми словами та отримуй підказки під час розмови.',
        subtitleEs:
          'Todos los escenarios de diálogo están incluidos en Plus. Practica situaciones de las lecciones y de la vida real, responde con tus propias palabras y recibe ayuda durante la conversación.',
      });
      expect(planned.title.en).toBe('Unlock all dialogues');
      expect(planned.subtitle.en).toBe(
        'All dialogue scenarios are included in Plus. Practice lesson-based and real-life situations, respond in your own words, and get guidance as you talk.',
      );
    },
  );

  test.each(['dialog_limit', 'dialog_locked_level'] as const)(
    '%s describes actual dialogue benefits without free or unlimited claims',
    (context) => {
      expect(CONTEXT_BENEFITS[context]?.map((benefit) => benefit.ru)).toEqual([
        'Все сценарии по урокам и жизненным ситуациям',
        'Свободные ответы своими словами',
        'Подсказки и разбор реплик во время практики',
      ]);
      expect(CONTEXT_BENEFITS[context]?.map((benefit) => benefit.en)).toEqual([
        'Every lesson-based and real-life scenario',
        'Open responses in your own words',
        'Guidance and feedback on your replies as you practice',
      ]);

      const allCopy = JSON.stringify({
        copy: getPaywallCopy(context),
        planned: getHeroPlannedCopy(context, 0),
        benefits: CONTEXT_BENEFITS[context],
        plannedBenefits: CONTEXT_BENEFITS_PLANNED[context],
      }).toLocaleLowerCase();

      for (const misleadingClaim of [
        'бесплатн',
        'без дневного лимита',
        'sin límite diario',
        'sem limite diário',
        'higher-level',
        'выше уровнем',
        'раньше',
      ]) {
        expect(allCopy).not.toContain(misleadingClaim);
      }
    },
  );
});
