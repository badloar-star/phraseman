import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');

describe('Admin v2 independent content stage shell', () => {
  const page = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'pages', 'content-generator.js'), 'utf8');
  const core = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-core.js'), 'utf8');
  const controller = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'content-factory', 'controller.js'), 'utf8');
  const state = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'content-factory', 'state.js'), 'utf8');
  const firebase = fs.readFileSync(path.join(root, 'admin', 'v2', 'scripts', 'admin-firebase.js'), 'utf8');

  test('supports cursor pagination and marks a partial queue', () => {
    expect(page).toContain('load-more-content-stages');
    expect(page).toContain('model.isPartial');
    expect(state).toContain('nextCursor: result?.nextCursor');
  });

  test('shows lesson phrase checkpoint progress and final hash evidence', () => {
    expect(page).toContain('Сохранено фраз');
    expect(page).toContain('Checkpoint фраз завершён');
    expect(page).toContain('finalCheckpointHash');
    expect(page).toContain('Теневой judge ниже — только подсказка');
    expect(page).toContain('Теневой AI-судья — только рекомендация');
    expect(page).toContain('Судья не может одобрить или опубликовать материал');
    expect(page).toContain('judgeReceipt');
  });

  test('offers all V2 independent generators and every lesson-derived stage', () => {
    for (const label of ['Уроки', 'Квизы', 'Вызовы', 'Карточки', 'План урока', 'Фразы', 'Словарь', 'Неправильные глаголы', 'Предлоги', 'Теория']) expect(page).toContain(label);
    expect(core).toContain("import { renderContentGeneratorShell } from './content-factory/renderers.js'");
    expect(core).toContain("if (action === 'create-content-stage')");
    expect(core).toContain("if (action === 'load-content-stages')");
  });

  test('keeps stage controls labelled, permission-gated and separate from legacy mode', () => {
    expect(page).toContain('data-control-content-stage="pause"');
    expect(page).toContain('data-control-content-stage="resume"');
    expect(page).toContain('data-control-content-stage="cancel"');
    expect(page).toContain('Повторить генерацию');
    expect(page).toContain('Продолжить без генерации');
    expect(page).toContain('без нового provider attempt');
    expect(page).toContain('aria-pressed=');
    expect(page).toContain('model.canWrite');
    expect(core).toContain('Совместимый генератор полного языкового пакета');
  });

  test('locks lesson phrase generation to the canonical 50-item artifact', () => {
    expect(page).toContain("selectedKind === 'lesson_phrases' ? 50");
    expect(page).toContain('readonly aria-readonly="true"');
    expect(page).toContain('всегда содержит ровно 50 фраз');
    expect(controller).toContain('capability?.count?.fixed');
  });

  test('shows grounding provenance and previous-lesson exclusions in preview', () => {
    expect(page).toContain('Основание и исключения');
    expect(page).toContain('groundingReceipt');
    expect(page).toContain('Квитанция качества');
  });

  test('creates every derived lesson section directly from an approved phrase artifact', () => {
    for (const kind of ['lesson_vocabulary', 'lesson_irregular_verbs', 'lesson_prepositions', 'lesson_theory']) expect(page).toContain(`'${kind}'`);
    expect(page).toContain('data-create-derived-lesson-stage="${kind}"');
    expect(page).toContain('data-prerequisite-stage-id=');
    expect(core).toContain("sourceStage.state !== 'approved'");
    expect(core).toContain('prerequisiteStageIds: [prerequisiteLessonStageId]');
    expect(core).toContain('Math.max(0, ...existingRevisions) + 1');
  });

  test('creates exact-ten question batches from approved topics and labels Challenge draft-only', () => {
    expect(page).toContain('data-create-question-batch=');
    expect(page).toContain('10 вопросов');
    expect(page).toContain('Пачка вопросов всегда содержит ровно 10 элементов');
    expect(page).toContain('Не подключено к приложению');
    expect(page).toContain('только черновик, не подключено к приложению');
    expect(core).toContain("questionBatchKind === 'quiz_questions' ? 'quiz_topic' : 'challenge_topic'");
    expect(core).toContain('count: 10, revision, prerequisiteStageIds: [prerequisiteTopicStageId]');
    expect(controller).toContain('capability?.count?.fixed');
  });

  test('offers a separate replacement stage for each question in an approved batch', () => {
    expect(page).toContain('data-create-question-replacement=');
    expect(page).toContain('data-question-id=');
    expect(page).toContain('Заменить один вопрос');
    expect(core).toContain('replacementForQuestionId');
    expect(core).toContain('count: 1, revision, prerequisiteStageIds: [replacementBatchStageId]');
  });

  test('creates bounded card batches from an approved idea and replaces one card independently', () => {
    expect(page).toContain("flashcard_item_replacement: 'Замена карточки'");
    expect(page).toContain('data-create-flashcard-batch=');
    expect(page).toContain('data-create-flashcard-replacement=');
    expect(page).toContain('data-card-id=');
    expect(page).toContain('Карточки создаются пачками от 1 до 20');
    expect(page).toContain('rich fields');
    expect(controller).toContain('capability?.count?.max');
    expect(core).toContain('replacementForCardId');
    expect(core).toContain('prerequisiteStageIds: [prerequisitePackIdeaStageId]');
    expect(page).toContain('acceptedCount');
    expect(page).toContain('missingCount');
    expect(page).toContain('Сохранено карточек');
  });

  test('does not surface Arena in the mounted full-package generator', () => {
    expect(core).not.toContain("['arena_questions', 'Вопросы Арены']");
    expect(core).not.toContain('и Арена.</div>');
    expect(core).not.toContain('уроки, квиз, карточки и Арена');
  });
});
