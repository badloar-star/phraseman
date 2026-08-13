import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import fs from 'fs';
import path from 'path';
import {
  getPersonalPlanListenChooseItems,
  registerPlanListenChooseAudioAssetsForTest,
  type PersonalPlanListenChooseItem,
} from '../app/personal_plan_listen_choose_items';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';

const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/u;

function expectCleanRussian(item: PersonalPlanListenChooseItem): void {
  const copy = [
    item.promptRu,
    item.promptUk,
    item.explanation.titleRu,
    item.explanation.correctRu,
    item.explanation.wrongRu,
  ].join('\n');

  expect(copy).not.toMatch(MOJIBAKE_RE);
}

describe('personal plan listen-choose live route', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[0];

  afterEach(() => {
    registerPlanListenChooseAudioAssetsForTest(null);
  });

  it('opens the dedicated plan exercise screen with listening renderer params', () => {
    const router = { push: jest.fn() };
    const task: PlanDailyTask = {
      id: 'gavan_d003_listen_choose',
      kind: 'plan_listen_choose',
      title: 'На слух',
      subtitle: 'Сначала слушаешь, потом выбираешь смысл.',
      minutes: 4,
      requiredFor: [15, 20],
      destination: {
        type: 'plan_exercise',
        exerciseType: 'plan_listen_choose',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: ['gavan_d1_phrase_1', 'gavan_d1_phrase_2'],
        requiredCorrect: 2,
      },
    };

    openPersonalPlanTask(router as any, plan, day, task, 'instance_listen_1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_listen_choose',
        planId: 'gavan',
        planDayIndex: '1',
        planTaskId: 'gavan_d003_listen_choose',
        planInstanceId: 'instance_listen_1',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: 'gavan_d1_phrase_1,gavan_d1_phrase_2',
        requiredCorrect: '2',
      },
    });
  });

  it('does not claim listening is playable while final audio assets are missing', () => {
    registerPlanListenChooseAudioAssetsForTest([]);

    const items = getPersonalPlanListenChooseItems({
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
      options: expect.arrayContaining(["I'm here."]),
    }));
    expect(items[0].audioUri).toBeUndefined();
    expectCleanRussian(items[0]);
  });

  it('builds playable listening choices only from explicitly approved assets', () => {
    registerPlanListenChooseAudioAssetsForTest([
      {
        id: 'audio:gavan_d1_phrase_1',
        blockId: 'gavan_d003_listen_choose',
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

    const items = getPersonalPlanListenChooseItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(items[0]).toEqual(expect.objectContaining({
      audioReady: true,
      audioUri: 'https://cdn.example.test/gavan/d1/p1.mp3',
      correctAnswer: "I'm here.",
      options: expect.arrayContaining(["I'm here."]),
      explanation: expect.objectContaining({
        wrongRu: expect.stringContaining('Послушай ещё раз'),
      }),
    }));
    expectCleanRussian(items[0]);
  });

  it('keeps listening-choice source copy clean and user-safe', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'personal_plan_listen_choose_items.ts'), 'utf8');

    expect(source).not.toMatch(MOJIBAKE_RE);
    expect(source).not.toMatch(/ты выбрал|выбранный вариант|selected option/i);
    expect(source).toContain('Послушай ещё раз');
    expect(source).toContain('всю услышанную реплику');
  });

  it('keeps generated but not approved audio blocked even when an asset row exists', () => {
    registerPlanListenChooseAudioAssetsForTest([
      {
        id: 'audio:gavan_d1_phrase_1_draft',
        blockId: 'gavan_d003_listen_choose',
        contentUnitIds: ['gavan_d1_phrase_1'],
        targetText: "I'm here.",
        locale: 'en',
        status: 'generated',
        assetId: 'draft-gavan-d1-p1',
        uri: 'https://cdn.example.test/gavan/d1/p1-draft.mp3',
        durationMs: 1200,
        voiceId: 'openai-voice-1',
        provider: 'openai',
        finalAssetReady: false,
      },
    ]);

    const [item] = getPersonalPlanListenChooseItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(item.audioReady).toBe(false);
    expect(item.audioUri).toBeUndefined();
    expect(item.blockedReason).toBe('missing_approved_audio');
    expectCleanRussian(item);
  });

  it('builds listening choices from canonical Gavan media lesson ids without bypassing audio approval', () => {
    registerPlanListenChooseAudioAssetsForTest([]);

    const [blockedItem] = getPersonalPlanListenChooseItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });

    expect(blockedItem).toEqual(expect.objectContaining({
      id: 'gavan-week1-day2:phrase-1',
      correctAnswer: 'Could you say that again?',
      audioReady: false,
      blockedReason: 'missing_approved_audio',
      options: expect.arrayContaining(['Could you say that again?']),
    }));
    expect(blockedItem.audioUri).toBeUndefined();
    expectCleanRussian(blockedItem);

    registerPlanListenChooseAudioAssetsForTest([
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

    const [readyItem] = getPersonalPlanListenChooseItems({
      lessonId: 'gavan_week1_day2_canonical_media',
      contentUnitIds: ['gavan-week1-day2:phrase-1'],
    });

    expect(readyItem).toEqual(expect.objectContaining({
      audioReady: true,
      audioAssetId: 'approved-gavan-week1-day2-p1',
      audioUri: 'https://cdn.example.test/gavan/week1/day2/p1.mp3',
      correctAnswer: 'Could you say that again?',
    }));
    expectCleanRussian(readyItem);
  });
});
