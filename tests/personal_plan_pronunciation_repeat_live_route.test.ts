import { openPersonalPlanTask } from '../app/personal_plan_navigation';
import fs from 'fs';
import path from 'path';
import {
  getPersonalPlanPronunciationRepeatItems,
  validatePersonalPlanPronunciationRepeatItem,
  type PersonalPlanPronunciationRepeatItem,
} from '../app/personal_plan_pronunciation_repeat_items';
import { PERSONAL_PLAN_CATALOG, type PlanDailyTask } from '../app/personal_plan_catalog';

const MOJIBAKE_RE = /[\u00d0\u00d1\u00c2\u00e2]/u;
const MOJIBAKE_REPEAT_DONE_LABEL = 'ÐŸÐ¾Ð²Ñ‚Ð¾Ñ€Ð¸Ð»';

function expectCleanRussian(item: PersonalPlanPronunciationRepeatItem): void {
  const copy = [
    item.promptRu,
    item.promptUk,
    item.completionLabel,
    item.explanation.titleRu,
    item.explanation.correctRu,
    item.explanation.wrongRu,
  ].join('\n');

  expect(copy).not.toMatch(MOJIBAKE_RE);
}

describe('personal plan pronunciation-repeat live route', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[0];

  it('opens the dedicated plan exercise screen with pronunciation renderer params', () => {
    const router = { push: jest.fn() };
    const task: PlanDailyTask = {
      id: 'gavan_d004_pronunciation',
      kind: 'plan_pronunciation_repeat',
      title: 'Повтори вслух',
      subtitle: 'Скажи короткую фразу спокойно и без гонки.',
      minutes: 3,
      requiredFor: [15, 20],
      destination: {
        type: 'plan_exercise',
        exerciseType: 'plan_pronunciation_repeat',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: ['gavan_d1_phrase_1', 'gavan_d1_phrase_2'],
        requiredCorrect: 2,
      },
    };

    openPersonalPlanTask(router as any, plan, day, task, 'instance_speak_1');

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/personal_plan_exercise',
      params: {
        rendererType: 'plan_pronunciation_repeat',
        planId: 'gavan',
        planDayIndex: '1',
        planTaskId: 'gavan_d004_pronunciation',
        planInstanceId: 'instance_speak_1',
        lessonId: 'gavan_day1_short_replies',
        contentUnitIds: 'gavan_d1_phrase_1,gavan_d1_phrase_2',
        requiredCorrect: '2',
      },
    });
  });

  it('builds scored pronunciation items with a real 90 percent threshold', () => {
    const items = getPersonalPlanPronunciationRepeatItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual(expect.objectContaining({
      id: 'gavan_d1_phrase_1',
      promptRu: 'Я здесь.',
      targetText: "I'm here.",
      completionLabel: 'Продолжить',
      scoringAvailable: true,
      grammarTags: expect.arrayContaining(['to-be']),
      explanation: expect.objectContaining({
        titleRu: 'Произнеси на 90%',
        correctRu: expect.stringContaining('Фраза проверена'),
        wrongRu: expect.stringContaining('медленнее'),
      }),
    }));

    const visibleCopy = [
      items[0].promptRu,
      items[0].targetText,
      items[0].completionLabel,
      items[0].explanation.titleRu,
      items[0].explanation.correctRu,
      items[0].explanation.wrongRu,
    ].join(' ');
    expect(visibleCopy).toMatch(/90%/);
    expectCleanRussian(items[0]);
    expect(validatePersonalPlanPronunciationRepeatItem(items[0])).toEqual([]);
  });

  it('fails mojibake pronunciation copy before it reaches the renderer', () => {
    const [item] = getPersonalPlanPronunciationRepeatItems({
      lessonId: 'gavan_day1_short_replies',
      contentUnitIds: ['gavan_d1_phrase_1'],
    });

    expect(validatePersonalPlanPronunciationRepeatItem({
      ...item,
      completionLabel: MOJIBAKE_REPEAT_DONE_LABEL,
    })).toContainEqual(expect.objectContaining({
      code: 'mojibake_copy',
    }));
  });

  it('keeps the live pronunciation screen honest: listen locally, score, then complete only at 90 percent', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'personal_plan_exercise.tsx'), 'utf8');
    const clientSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'personal_plan_pronunciation_scoring_client.ts'), 'utf8');

    // Recognition is started via the shared, accuracy-tuned options builder
    // (phrase biasing + alternatives + on-device) — not an inline ad-hoc object.
    expect(source).toContain('speechModule.start(');
    expect(source).toContain('buildSpeakingStartOptions({');
    expect(source).toContain("speechModule.addListener('result', applyResult)");
    expect(source).toContain('scheduleFinishAttempt');
    expect(source).toContain("if (Platform.OS !== 'android') playRecordStart();");
    expect(source).toContain('useAudio()');
    expect(source).toContain('listenPronunciationTarget');
    expect(source).toContain('speakFallbackAudio(targetText, 0.86');
    expect(source).toContain("if (Platform.OS === 'android') playFallbackAudio();");
    // Прослушивание фразы НЕ обязательно — запись доступна сразу; блок пока звучит
    // target, пока качается whisper-модель (hold-режим), и во время оценки.
    expect(source).toContain('enabled={!pronunciationSpeakingTarget');
    // Фраза скрыта по буквам (маска '_') и раскрывается пословно по мере того,
    // как юзер её правильно произнёс — ответ не виден заранее.
    expect(source).toContain("tok.replace(/[\\p{L}\\p{N}]/gu, '_')");
    expect(source).toContain('scorePlanPronunciationTranscript({');
    expect(source).toContain('PLAN_PRONUNCIATION_PASS_THRESHOLD');
    expect(source).toContain("speechModule.addListener('nomatch'");
    // Android uses the speech library AudioRecord path, then deletes its transient wav.
    expect(source).toContain('buildSpeakingStartOptions');
    expect(source).toContain("persistRecording: Platform.OS === 'android'");
    expect(source).toContain("speechModule.addListener('audioend'");
    expect(source).toContain('disabled={saving || pronunciationScoring}');
    expect(source).toContain('payload: buildPlanPronunciationAttemptPayload({');
    expect(source).toContain('score: scored?.score ?? 0');
    expect(source).toContain("transcript: scored?.transcript ?? ''");
    expect(source).toContain('passed: scored?.passed ?? false');
    expect(source).toContain("result: 'completed'");
    expect(source).toContain('PLAN_PRONUNCIATION_PASS_THRESHOLD}%');
    expect(clientSource).toContain("PLAN_PRONUNCIATION_SCORING_PROVIDER = 'device_speech_recognition'");
    expect(clientSource).not.toContain('httpsCallable');
    expect(clientSource).not.toContain('scorePronunciationAttempt');

    // The shared options builder keeps recognition fully on-device: phrase
    // biasing + alternatives + iOS persist live here, and there is no cloud call.
    const optionsSource = fs.readFileSync(path.join(__dirname, '..', 'app', 'speaking_recognition_options.ts'), 'utf8');
    expect(optionsSource).toContain('contextualStrings');
    expect(optionsSource).toContain('maxAlternatives');
    expect(optionsSource).toContain('recordingOptions');
    expect(optionsSource).not.toContain('httpsCallable');
  });

  it('keeps pronunciation-repeat source copy clean, calm and honest', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'app', 'personal_plan_pronunciation_repeat_items.ts'), 'utf8');

    expect(source).not.toMatch(MOJIBAKE_RE);
    expect(source).toContain('Повтори фразу ещё раз медленнее');
    expect(source).toContain('Результат 90% или выше');
    expect(source).toContain('scoringAvailable: true');
    expect(source).toContain('Произнеси на 90%');
  });
});
