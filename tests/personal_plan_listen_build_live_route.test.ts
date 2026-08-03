import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import fs from 'fs';
import path from 'path';
import {
  getPersonalPlanListenBuildItems,
  registerPlanListenBuildAudioAssetsForTest,
  validatePersonalPlanListenBuildItem,
  type PersonalPlanListenBuildItem,
} from '../app/personal_plan_listen_build_items';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';

const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/u;

function expectCleanRussian(item: PersonalPlanListenBuildItem): void {
  const copy = [
    item.promptRu,
    item.promptUk,
    item.explanation.titleRu,
    item.explanation.correctRu,
    item.explanation.wrongRu,
  ].join('\n');

  expect(copy).not.toMatch(MOJIBAKE_RE);
}

describe('personal plan listen-build live route', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[0];

  afterEach(() => {
    registerPlanListenBuildAudioAssetsForTest(null);
  });

  it('opens the dedicated plan exercise screen with listening word-bank renderer params', () => {
    const router = { push: jest.fn() };
    const task: PlanDailyTask = {
      id: 'gavan_d003_listen_build',
      kind: 'plan_listen_build',
      title: 'Собери на слух',
      subtitle: 'Сначала слушаешь короткую фразу, потом собираешь ее из слов.',
      minutes: 5,
      requiredFor: [15, 20],
      destination: {
        type: 'plan_exercise',
        exerciseType: 'plan_listen_build',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: ['gavan_d1_phrase_1', 'gavan_d1_phrase_2'],
        requiredCorrect: 2,
      },
    };

    openPersonalPlanTask(router as any, plan, day, task, 'instance_listen_build_1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_listen_build',
        planId: 'gavan',
        planDayIndex: '1',
        planTaskId: 'gavan_d003_listen_build',
        planInstanceId: 'instance_listen_build_1',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: 'gavan_d1_phrase_1,gavan_d1_phrase_2',
        requiredCorrect: '2',
      },
    });
  });

  it('blocks listening-build while approved audio is missing', () => {
    registerPlanListenBuildAudioAssetsForTest([]);

    const items = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({
      id: 'gavan_d1_phrase_1',
      promptRu: 'Я здесь.',
      correctAnswer: "I'm here.",
      audioReady: false,
      blockedReason: 'missing_approved_audio',
      targetWords: ["I'm", 'here'],
      wordOptions: expect.arrayContaining(["I'm", 'here']),
    }));
    expect(items[0].audioUri).toBeUndefined();
    expectCleanRussian(items[0]);
  });

  it('builds word-bank listening items only from approved audio assets', () => {
    registerPlanListenBuildAudioAssetsForTest([
      {
        id: 'audio:gavan_d1_phrase_1',
        blockId: 'gavan_d003_listen_build',
        contentUnitIds: ['gavan_d1_phrase_1'],
        targetText: "I'm here.",
        locale: 'en',
        status: 'approved',
        assetId: 'approved-gavan-d1-p1',
        uri: 'https://cdn.example.test/gavan/d1/p1.mp3',
        durationMs: 1200,
        voiceId: 'openai-voice-1',
        provider: 'openai',
        finalAssetReady: true,
      },
    ]);

    const items = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(items[0]).toEqual(expect.objectContaining({
      audioReady: true,
      audioUri: 'https://cdn.example.test/gavan/d1/p1.mp3',
      correctAnswer: "I'm here.",
      targetWords: ["I'm", 'here'],
      wordOptions: expect.arrayContaining(["I'm", 'here']),
      explanation: expect.objectContaining({
        wrongRu: expect.stringContaining('Послушай ещё раз'),
      }),
    }));
    expectCleanRussian(items[0]);
  });

  it('keeps listening-build source copy clean and user-safe', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'personal_plan_listen_build_items.ts'), 'utf8');

    expect(source).not.toMatch(MOJIBAKE_RE);
    expect(source).not.toMatch(/ты выбрал|выбранный вариант|selected option/i);
    expect(source).toContain('Послушай ещё раз');
    expect(source).toContain('сначала поймай общий звук');
  });

  it('keeps generated but not approved audio blocked', () => {
    registerPlanListenBuildAudioAssetsForTest([
      {
        id: 'audio:gavan_d1_phrase_1_generated',
        blockId: 'gavan_d003_listen_build',
        contentUnitIds: ['gavan_d1_phrase_1'],
        targetText: "I'm here.",
        locale: 'en',
        status: 'generated',
        assetId: 'generated-gavan-d1-p1',
        uri: 'https://cdn.example.test/gavan/d1/p1-generated.mp3',
        durationMs: 1200,
        voiceId: 'openai-voice-1',
        provider: 'openai',
        finalAssetReady: false,
      },
    ]);

    const [item] = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(item.audioReady).toBe(false);
    expect(item.audioUri).toBeUndefined();
    expect(item.blockedReason).toBe('missing_approved_audio');
    expectCleanRussian(item);
  });

  it('keeps the listening word bank strict: all target words, no duplicate-answer distractors', () => {
    registerPlanListenBuildAudioAssetsForTest([
      {
        id: 'audio:gavan_d1_phrase_4',
        blockId: 'gavan_d003_listen_build',
        contentUnitIds: ['gavan_d1_phrase_4'],
        targetText: "It's not clear.",
        locale: 'en',
        status: 'approved',
        assetId: 'approved-gavan-d1-p4',
        uri: 'https://cdn.example.test/gavan/d1/p4.mp3',
        durationMs: 1400,
        voiceId: 'openai-voice-1',
        provider: 'openai',
        finalAssetReady: true,
      },
    ]);

    const [item] = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_4'],
    });

    expect(item.targetWords).toEqual(["It's", 'not', 'clear']);
    expect(item.wordOptions).toEqual(expect.arrayContaining(["It's", 'not', 'clear']));
    expect(item.wordOptions.length).toBeLessThanOrEqual(8);
    expect(validatePersonalPlanListenBuildItem(item)).toEqual([]);

    expect(validatePersonalPlanListenBuildItem({
      targetWords: ['I', 'am', 'here'],
      wordOptions: ['I', 'here', 'am', 'am'],
    })).toContain('distractor_duplicates_target');
  });

  it('keeps the live word-bank UI strict: users can check only a complete phrase length', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'personal_plan_exercise.tsx'), 'utf8');

    expect(source).toContain('buildWords.length >= item.targetWords.length');
    expect(source).toContain('disabled={saving || buildWords.length !== item.targetWords.length}');
    expect(source).toContain('isCorrectAnswer(answer, item.correctAnswer)');
    expect(source).toContain("mistakeTags: isCorrect ? [] : ['listen_build']");
  });

  it('builds listen-build word banks from canonical Gavan media lesson ids with approved audio gate intact', () => {
    registerPlanListenBuildAudioAssetsForTest([]);

    const [blockedItem] = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });

    expect(blockedItem).toEqual(expect.objectContaining({
      id: 'gavan-week1-day2:phrase-1',
      correctAnswer: 'Could you say that again?',
      audioReady: false,
      blockedReason: 'missing_approved_audio',
      targetWords: ['Could', 'you', 'say', 'that', 'again'],
      wordOptions: expect.arrayContaining(['Could', 'you', 'say', 'that', 'again']),
    }));
    expect(validatePersonalPlanListenBuildItem(blockedItem)).toEqual([]);
    expectCleanRussian(blockedItem);

    registerPlanListenBuildAudioAssetsForTest([
      {
        id: 'audio:gavan-week1-day2:phrase-1',
        blockId: 'gavan-week1-day2:block-2',
        contentUnitIds: ['gavan-week1-day2:phrase-1'],
        targetText: 'Could you say that again?',
        locale: 'en',
        status: 'approved',
        assetId: 'approved-gavan-week1-day2-p1',
        uri: 'https://cdn.example.test/gavan/week1/day2/p1.mp3',
        durationMs: 1500,
        voiceId: 'openai-voice-1',
        provider: 'openai',
        finalAssetReady: true,
      },
    ]);

    const [readyItem] = getPersonalPlanListenBuildItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });

    expect(readyItem).toEqual(expect.objectContaining({
      audioReady: true,
      audioAssetId: 'approved-gavan-week1-day2-p1',
      audioUri: 'https://cdn.example.test/gavan/week1/day2/p1.mp3',
      correctAnswer: 'Could you say that again?',
    }));
    expect(validatePersonalPlanListenBuildItem(readyItem)).toEqual([]);
    expectCleanRussian(readyItem);
  });
});
