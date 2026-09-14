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
  // зачем (владелец 2026-09-14): прежний сторож ТРЕБОВАЛ от карточки апселла
  // жёсткого `context: 'dialog_limit'`. Из-за этого человек, потративший 1
  // реплику из 10, по тапу читал «Дневной лимит диалогов исчерпан» — прямая
  // ложь. Теперь правило обратное: контекст выбирается по факту квоты.
  test('upsell card picks the paywall context from the real quota, never hardcodes it', () => {
    const upsell = dialoguesCatalogue.slice(
      dialoguesCatalogue.indexOf('{hasLockedCourseLevels && ('),
      dialoguesCatalogue.indexOf('{hasLockedCourseLevels && (') + 2200,
    );

    // Ни один контекст не зашит в точке входа — идёт вычисленный upsellContext.
    expect(upsell).not.toContain("context: 'dialog_limit'");
    expect(upsell).not.toContain("context: 'dialog_locked_level'");
    expect(upsell).toContain('context: upsellContext');
  });

  test('upsellContext says "limit reached" only when the quota is actually exhausted', () => {
    const decision = dialoguesCatalogue.slice(
      dialoguesCatalogue.indexOf('const upsellContext'),
      dialoguesCatalogue.indexOf('const upsellContext') + 200,
    );

    expect(decision).toContain("dailyLimitExhausted ? 'dialog_limit' : 'dialog_locked_level'");
    // Источник истины — состояние квоты с сервера, а не «нет Plus».
    expect(dialoguesCatalogue).toContain("const dailyLimitExhausted = quota?.status === 'exhausted'");
  });

  test('a scenario tap blames the daily limit only inside the exhausted branch', () => {
    // Вне ветки !dialogsOpenToday контекст 'dialog_limit' появляться не должен.
    const limitMentions = dialoguesCatalogue.split("context: 'dialog_limit'").length - 1;
    const exhaustedBranches = dialoguesCatalogue.split('if (!dialogsOpenToday) {').length - 1;
    expect(limitMentions).toBe(exhaustedBranches * 2); // trackAiDialogEvent + router.push
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
    '%s says higher-level dialogues are in Plus and all scenarios are included',
    (context) => {
      const copy = getPaywallCopy(context);
      const planned = getHeroPlannedCopy(context, 0);

      expect(copy).toEqual({
        // зачем (владелец 2026-09-13): заголовок называет причину — уровни выше.
        titleRu: 'Диалоги уровней выше — в Plus',
        titleUk: 'Діалоги вищих рівнів — у Plus',
        titleEs: 'Diálogos de niveles superiores, en Plus',
        subtitleRu:
          'Все сценарии диалогов входят в Plus. Практикуй ситуации из уроков и жизни, отвечай своими словами и получай подсказки по ходу разговора.',
        subtitleUk:
          'Усі сценарії діалогів входять у Plus. Практикуй ситуації з уроків і життя, відповідай своїми словами та отримуй підказки під час розмови.',
        subtitleEs:
          'Todos los escenarios de diálogo están incluidos en Plus. Practica situaciones de las lecciones y de la vida real, responde con tus propias palabras y recibe ayuda durante la conversación.',
      });
      expect(planned.title.en).toBe('Higher-level dialogues are in Plus');
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

      // зачем (владелец 2026-09-13): заголовок «Диалоги уровней выше — в Plus»
      // утверждён. Это правда: isScenarioLevelUnlocked() возвращает true при
      // hasPremiumAccess для любого CEFR, поэтому «уровни выше» — не ложь, а
      // причина показа. Под запретом остаются «бесплатно», «без дневного
      // лимита» и «раньше» (обещание опережения, которого Plus не даёт).
      for (const misleadingClaim of [
        'бесплатн',
        'без дневного лимита',
        'sin límite diario',
        'sem limite diário',
        'раньше',
      ]) {
        expect(allCopy).not.toContain(misleadingClaim);
      }
    },
  );
});
