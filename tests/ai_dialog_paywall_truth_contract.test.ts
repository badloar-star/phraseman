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

    // D111: лимит месячный — имя состояния monthlyLimitExhausted.
    expect(decision).toContain("monthlyLimitExhausted ? 'dialog_limit' : 'dialog_locked_level'");
    /**
     * Источник истины про ЛИМИТ — состояние квоты, а не «нет Plus».
     *
     * зачем ПОДПРАВЛЕНО (2026-09-14): проверка требовала точного текста
     * `quota?.status === 'exhausted'` и покраснела, когда в код добавился
     * `!hasPremiumAccess &&`. Красным сторож стоял с коммита 0217c4a21.
     * Код при этом прав: у Plus квота не читается вовсе (setQuota(null)),
     * поэтому премиум обязан участвовать в решении. Сторожим суть — что
     * решение опирается на статус квоты, — не дословную форму строки.
     */
    expect(dialoguesCatalogue).toMatch(
      /const monthlyLimitExhausted =[^;]*quota\?\.status === 'exhausted'/,
    );
  });

  test('a scenario tap blames the monthly limit only inside the exhausted branch', () => {
    // Вне ветки !dialogsOpenThisMonth контекст 'dialog_limit' у сценариев
    // появляться не должен. Карточка «Свободный разговор» (только Plus) — отдельный
    // вход со своим source и в счёт сценариев не идёт.
    // зачем (координатор 25.10, пейвол «М»): params входа строит dialogLimitPaywallParams — те же context/source + итог первого разговора.
    const scenarioLimitMentions = dialoguesCatalogue.split("context: 'dialog_limit', source: 'dialogs_catalogue'").length - 1
      + dialoguesCatalogue.split("dialogLimitPaywallParams('dialogs_catalogue')").length - 1;
    const exhaustedBranches = dialoguesCatalogue.split('if (!dialogsOpenThisMonth) {').length - 1;
    expect(exhaustedBranches).toBeGreaterThan(0);
    expect(scenarioLimitMentions).toBe(exhaustedBranches * 2); // trackAiDialogEvent + router.push
  });

  // зачем ПЕРЕПИСАНО (D111, 2026-09-30): лимит Free — 30 ответов в МЕСЯЦ (сервер
  // считает по календарному месяцу UTC). Прежний сторож требовал «10 реплик в день»
  // и тем самым охранял ложь — чиним сторожа, а не подгоняем текст под него.
  test('dialog_limit states the monthly limit of a regular account and that Plus has no counter', () => {
    const copy = getPaywallCopy('dialog_limit');
    const planned = getHeroPlannedCopy('dialog_limit', 0);
    expect(copy.subtitleRu).toContain('30 ответов в месяц');
    expect(copy.subtitleRu).toContain('с подпиской счётчика нет');
    expect(copy.subtitleUk).toContain('30 відповідей на місяць');
    expect(copy.subtitleEs).toContain('30 respuestas al mes');
    expect(planned.subtitle.en).toContain('30 replies a month');
    const all = JSON.stringify({ copy, planned }).toLocaleLowerCase();
    for (const dailyClaim of ['в день', 'на день', 'al día', 'a day', 'por dia', 'mỗi ngày', 'per hari', 'günde', 'dziennie']) {
      expect(all).not.toContain(dailyClaim);
    }
  });

  // D124 (владелец 30.09): сценарии открывает ТОЛЬКО ранг монеты — Plus их не открывает.
  // Прежний сторож требовал «Остальные диалоги — в Plus» и охранял уже ложное обещание.
  test.each(['dialog_locked_level'] as const)(
    '%s says scenarios open with the coin rank and Plus lifts the reply limit',
    (context) => {
      const copy = getPaywallCopy(context);
      const planned = getHeroPlannedCopy(context, 0);
      expect(copy.titleRu).toBe('Сценарий откроется на ранге монеты');
      expect(copy.subtitleRu).toContain('рангом монеты');
      expect(copy.subtitleRu).toContain('Plus снимает месячный лимит ответов');
      expect(planned.title.en).toBe('The scenario opens with your coin rank');
      const all = JSON.stringify({ copy, planned }).toLocaleLowerCase();
      for (const lie of ['все остальные', 'все сценарии', 'all the others', 'all dialogue scenarios']) {
        expect(all).not.toContain(lie);
      }
    },
  );

  test.each(['dialog_limit', 'dialog_locked_level'] as const)(
    '%s describes actual dialogue benefits without free or unlimited claims',
    (context) => {
      expect(CONTEXT_BENEFITS[context]?.map((benefit) => benefit.ru)).toEqual([
        'Ответы в диалогах без месячного лимита',
        'Свободные ответы своими словами',
        'Подсказки и разбор реплик во время практики',
      ]);
      expect(CONTEXT_BENEFITS[context]?.map((benefit) => benefit.en)).toEqual([
        'Dialogue replies with no monthly limit',
        'Open responses in your own words',
        'Guidance and feedback on your replies as you practice',
      ]);

      const allCopy = JSON.stringify({
        copy: getPaywallCopy(context),
        planned: getHeroPlannedCopy(context, 0),
        benefits: CONTEXT_BENEFITS[context],
        plannedBenefits: CONTEXT_BENEFITS_PLANNED[context],
      }).toLocaleLowerCase();

      // зачем (аудит 2026-09-14): заголовок «Остальные диалоги — в Plus».
      // Это правда: isScenarioUnlockedForAccount() открывает обычному аккаунту
      // ровно три сценария (FREE_DIALOG_SCENARIO_IDS), а весь остальной
      // каталог — по Plus, независимо от уровня. Прежняя формулировка про
      // «уровни выше» отсюда убрана: она пережила смену правила и стала ложью.
      // Под запретом остаются «бесплатно», «без дневного лимита» и «раньше»
      // (обещание опережения, которого Plus не даёт).
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
