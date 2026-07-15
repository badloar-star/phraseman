import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (...parts: string[]) => fs.readFileSync(path.join(root, ...parts), 'utf8');

describe('Admin Content Studio R10B contracts', () => {
  const core = read('admin','v2','scripts','admin-core.js');
  const page = read('admin','v2','scripts','pages','content-generator.js');
  const state = read('admin','v2','scripts','content-factory','state.js');
  const controller = read('admin','v2','scripts','content-factory','controller.js');
  const renderers = read('admin','v2','scripts','content-factory','stage-renderers.js');
  const firebase = read('admin','v2','scripts','admin-firebase.js');
  const css = read('admin','v2','styles','admin.css');

  test('decomposes state, controller and renderer boundaries out of admin-core', () => {
    expect(core).toContain("from './content-factory/state.js'");
    expect(core).toContain("from './content-factory/controller.js'");
    expect(core).toContain("from './content-factory/renderers.js'");
    expect(state).toContain('createContentFactoryState');
    expect(controller).toContain('loadContentStagesPage');
    expect(page).toContain('renderStudioWorkflow(model)');
  });

  test('uses server capability matrix for types, languages, counts and prerequisites', () => {
    expect(firebase).toContain("httpsCallable(functionsUs, 'adminGetContentStageCapabilities')");
    expect(controller).toContain('model.capabilities?.capabilities?.[kind]');
    expect(renderers).toContain('languagePolicy.studyTargets');
    expect(renderers).toContain('prerequisiteCardinality');
    expect(page).toContain('stageOptions(selectedKind, model.capabilities?.capabilities)');
  });

  test('creates range work with one server call and exposes approved dependency picker', () => {
    expect(core).toContain('actions.createContentStageBulkPlan({');
    expect(core).not.toMatch(/for\s*\([^)]*\)\s*await actions\.createContentStage/);
    expect(controller).toContain('actions.listContentStageDependencies');
    expect(renderers).toContain('data-content-dependency-id');
    expect(renderers).toContain('content-dependency-search');
    expect(renderers).toContain('dependenciesPartial');
    expect(renderers).toContain('load-more-content-dependencies');
    expect(controller).toContain('append && model.dependenciesNextCursor');
  });

  test('renders stage-specific review, correct answers, immutable edit and semantic diff', () => {
    for (const token of ['lesson_phrases','lesson_theory','quiz_questions','flashcard_items','arena_questions','correct-option','distractor-option','semantic-diff','Технические данные JSON','Автоматические проверки пройдены']) expect(renderers).toContain(token);
    expect(core).toContain('actions.editContentStageArtifact');
    expect(core).toContain('expectedBaseReviewFingerprint');
    expect(renderers).toContain('Исходная версия не изменится');
  });

  test('keeps bounded pagination, server filters and accessible responsive states', () => {
    for (const token of ['content-filter-request','content-filter-kind','content-filter-state','content-filter-target','content-filter-source','content-filter-scope','load-more-content-stages','bulk-stage-progress','stage.retryable === true','data-run-content-stage']) expect(`${renderers}\n${page}`).toContain(token);
    expect(controller).toContain('cursor: append ? model.nextCursor');
    expect(controller).toContain('scopeId: filters.scopeId');
    expect(renderers).toContain('role="status"');
    expect(renderers).toContain('role="alert"');
    expect(css).toContain('@media (max-width: 640px)');
    expect(css).toContain('@media (prefers-reduced-motion: reduce)');
    expect(css).toContain('min-height: 44px');
  });
});
