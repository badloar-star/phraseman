// зачем (E2 и E9 из R1_DIALOGS_OPTIMISTIC_UI.md, координатор 12.10; правила владельца «никаких спиннеров на весь экран» и «раздел открывается мгновенно»):
// холодный вход в каталог/брифинг/сессию показывает скелет на месте будущего содержимого, а не полноэкранное «Загружаем диалоги…» со спиннером; итог диалога показывает локальные цифры
// и «Что исправить» сразу, а цели и оценку сервера догружает скелетом той же высоты.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8').replace(/\r\n/g, '\n');

describe('Диалоги: скелеты вместо полноэкранных загрузок', () => {
  it('E2: экран-гейт в состоянии загрузки рисует скелет сцены, а не спиннер', () => {
    const kit = read('components/dialogs/glass/DialogueGlassKit.tsx');
    expect(kit).toContain('<DialogueGlassSceneSkeleton glass={glass} label={title} testID={`${testID}-skeleton`} />');
    expect(kit).not.toContain('ActivityIndicator');
    // подпись загрузки остаётся только для озвучки экрана
    expect(kit).toContain('accessibilityState={{ busy: true }}');
  });

  it('E2: хаб без каталога/проекции рисует скелет карточек той же геометрии, а не пустое место', () => {
    const container = read('components/dialogs/DialogueV2CatalogueContainer.tsx');
    expect(container.match(/<DialogueV2CatalogueSkeleton \/>/g)?.length).toBe(2);
    expect(container).not.toMatch(/hub:render → no local catalogue \(embedded missing\)', \{ studyTarget \}\);\n    return plusTools;/);
    const skeleton = read('components/dialogs/DialogueV2CatalogueSkeleton.tsx');
    const section = read('components/dialogs/DialogueV2CatalogueSection.tsx');
    // тот же ритм и поля свёрнутой карточки категории
    expect(skeleton).toContain('style={{ gap: 13, marginTop: 32 }}');
    expect(section).toContain("style={{ gap: 13, marginTop: 32 }}");
    expect(skeleton).toContain('paddingHorizontal: 16, paddingTop: 16, paddingBottom: 18');
    expect(skeleton).toContain('width={55} height={55}');
    expect(skeleton).toContain('height: 7, borderRadius: 4');
  });

  it('журнал [DIALOGS-FIRST-FRAME] стоит в хабе, брифинге, сессии и итоге (только dev)', () => {
    for (const file of ['components/dialogs/DialogueV2CatalogueContainer.tsx', 'app/dialogue_v2_briefing.tsx', 'app/dialogue_v2_session.tsx', 'app/dialogue_v2_completion.tsx']) {
      const src = read(file);
      expect(src).toContain('[DIALOGS-FIRST-FRAME]');
      expect(src).toContain("typeof __DEV__ === 'undefined' || !__DEV__");
    }
  });

  it('E9: итог показывает локальные цифры и «Что исправить» до ответа сервера; цели — скелет с числом строк из каталога', () => {
    const src = read('app/dialogue_v2_completion.tsx');
    expect(src).toContain('const showLocalStats = outcome !== null || learnerTurns > 0;');
    expect(src).toContain('{showLocalStats ? (');
    // «Что исправить» не внутри блока review
    // зачем (координатор 15.10, m18): блок «Ошибки»/отзыв вынесен в const errorsAndFeedback (общий для прежней раскладки и цепочки m18) — проверяем место его вставки и то,
    // что внутри самого блока «Ошибки» стоят ДО ветки review (отзыв), то есть не зависят от ответа сервера
    const errorsAt = src.indexOf('{errorsAndFeedback}');
    const reviewBeforeErrors = src.lastIndexOf('{review ? (', errorsAt);
    const stateAfterReview = src.indexOf(') : state.kind === \'loading\' ? (', reviewBeforeErrors);
    expect(stateAfterReview).toBeGreaterThan(0);
    expect(stateAfterReview).toBeLessThan(errorsAt);
    const errorsDecl = src.slice(src.indexOf('const errorsAndFeedback = ('), src.indexOf('const chainScope'));
    expect(errorsDecl.indexOf('testID="dialogue-v2-completion-errors"')).toBeGreaterThan(0);
    expect(errorsDecl.indexOf('testID="dialogue-v2-completion-errors"')).toBeLessThan(errorsDecl.indexOf('{review ? ('));
    expect(src).toContain('<GoalsStatSkeleton glass={glass} label={labels.goals} />');
    expect(src).toContain('<GoalsSkeleton glass={glass} rows={goalRowsGuess} />');
    expect(src).toContain('Object.keys(goalLabels).length');
    // спиннера на экране итога больше нет
    expect(src).not.toContain('ActivityIndicator');
  });
});
