import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const WORK_ORDER_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'planning', 'fr_lesson02_next_pass_work_order_v1.json');
const MD_PATH = path.join(ROOT, 'docs', 'gustav', 'generated', 'fr', 'planning', 'fr_lesson02_next_pass_work_order_v1.md');
const SCRIPT_PATH = path.join(ROOT, 'scripts', 'gustav_build_fr_lesson02_next_pass_work_order.mjs');

describe('Gustav French lesson 2 next-pass work order', () => {
  it('prepares the next large pass from the English negation/question blueprint without opening production', () => {
    const workOrder = JSON.parse(fs.readFileSync(WORK_ORDER_PATH, 'utf8'));
    const markdown = fs.readFileSync(MD_PATH, 'utf8');
    const script = fs.readFileSync(SCRIPT_PATH, 'utf8');

    expect(script).toContain('PASS_INTEGRITY_WITH_AUDIO_HOLD');
    expect(script).toContain('Create scripts/gustav_build_fr_lesson02_review_draft.mjs');
    expect(script).toContain('Use ne ... pas for simple negation.');
    expect(script).toContain('Use Est-ce que ... ? as the main beginner yes/no question frame.');

    expect(workOrder.schemaVersion).toBe('gustav-fr-lesson02-next-pass-work-order-v1');
    expect(workOrder.status).toBe('READY_FOR_LESSON02_REVIEW_DRAFT');
    expect(workOrder.blockers).toEqual([]);
    expect(workOrder.studyTarget).toBe('fr');
    expect(workOrder.targetContentLang).toBe('fr');
    expect(workOrder.sourceLocales).toEqual(['ru', 'uk']);
    expect(workOrder.lessonId).toBe(2);
    expect(workOrder.appCourseLevel).toBe('A1');
    expect(workOrder.previousLessonIntegrity).toMatchObject({
      status: 'PASS_INTEGRITY_WITH_AUDIO_HOLD',
      structuralIntegrityReady: true,
      readyForAudioGeneration: true,
      productionStillBlocked: true,
    });

    expect(workOrder.englishBlueprint).toMatchObject({
      englishTopic: 'To be negation and questions',
      phraseRows: 50,
      wordsEnSlots: 181,
    });
    expect(workOrder.englishBlueprint.sampleEnglishPhrases).toEqual(expect.arrayContaining([
      'I am not hungry',
      'Are you sure?',
      'He is not here',
      'Is it expensive?',
    ]));
    expect(workOrder.frenchNativeBuildTarget.mustCreate).toMatchObject({
      phraseRows: 50,
      sourceMeanings: ['ru', 'uk'],
      reviewPacket: '50 row LLM official-source review packet plus lesson-level gate',
      packCandidates: 'RU and UK source-locale pack candidates only after 50 accepted decisions',
      audioManifest: '100 source-locale TTS slots only after pack candidates pass',
    });
    expect(workOrder.frenchNativeBuildTarget.frenchScopeBoundaries).toEqual(expect.arrayContaining([
      'Use ne ... pas for simple negation.',
      'Use Est-ce que ... ? as the main beginner yes/no question frame.',
      'Keep tu/vous stable inside a row.',
    ]));
    expect(workOrder.exactNextCommands).toEqual([
      'Create scripts/gustav_build_fr_lesson02_review_draft.mjs',
      'Create tests/gustav_fr_lesson02_review_draft.test.ts',
      'Run node scripts/gustav_build_fr_lesson02_review_draft.mjs',
      'Run node node_modules/jest/bin/jest.js --watchman=false --runTestsByPath tests/gustav_fr_lesson02_review_draft.test.ts',
    ]);
    expect(workOrder.safety).toMatchObject({
      appBundleModifiedByThisScript: false,
      serverUploadAllowed: false,
      firebaseUploadAllowed: false,
      runtimeDownloadsEnabled: false,
      productionApplyApproved: false,
      activationApproved: false,
    });

    expect(markdown).toContain('# French Lesson 2 Next Pass Work Order');
    expect(markdown).toContain('Status: READY_FOR_LESSON02_REVIEW_DRAFT');
    expect(markdown).toContain('Use ne ... pas for simple negation.');
  });
});
