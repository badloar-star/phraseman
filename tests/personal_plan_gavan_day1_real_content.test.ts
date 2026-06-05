import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import {
  buildGavanDay1GeneratedDayPacket,
  runPersonalPlanGenerationDryRunHarness,
} from '../app/personal_plan_generation_dry_run_harness';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanQuizPhrases } from '../app/personal_plan_quizzes';

const MOJIBAKE_RE = /[ÃÃ‘ÃƒÃ‚]/u;

describe('Gavan day 1 real content', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[0];
  const lesson = getPersonalPlanPhraseLesson('gavan_d001_content_unit')!;

  it('certifies the first short-answer day with generator evidence', () => {
    expect(day).toEqual(expect.objectContaining({
      id: 'gavan_d001',
      dayIndex: 1,
      status: 'certified',
      source: expect.objectContaining({
        generatedPacketId: 'gavan_d001_generator_packet',
        generationHarnessStatus: 'valid_non_live_dry_run',
      }),
      title: 'Короткие ответы',
      lifeOutcome: expect.stringContaining('все нормально'),
    }));

    expect(JSON.stringify({ day, lesson })).not.toMatch(MOJIBAKE_RE);
  });

  it('keeps the phrase introduction first and time-based task reveal intact', () => {
    const expectedKinds = [
      'plan_phrase_lesson',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ];

    expect(allTasksForDay(day).map((task) => task.kind)).toEqual(expectedKinds);
    expect(tasksForMinutes(day, 5).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 3));
    expect(tasksForMinutes(day, 10).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 4));
    expect(tasksForMinutes(day, 15).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 5));
    expect(tasksForMinutes(day, 20).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 6));
  });

  it('has complete material for every Gavan day-1 mode', () => {
    const contentUnitIds = lesson.phrases.slice(0, 5).map((phrase) => String(phrase.id));

    expect(lesson.phrases.map((phrase) => phrase.english)).toEqual([
      "I'm here.",
      "I'm okay.",
      "It's okay.",
      "It's not clear.",
      "You're right.",
      "I'm ready.",
    ]);
    expect(lesson.phrases.map((phrase) => phrase.russian)).toEqual([
      'Я здесь.',
      'Я в порядке.',
      'Все нормально.',
      'Пока непонятно.',
      'Вы правы.',
      'Я готов.',
    ]);
    expect(lesson.phrases.every((phrase) => phrase.words.some((word) => word.teachingNote))).toBe(true);

    expect(getPersonalPlanMissingWordItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanChooseNaturalPhraseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenChooseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenBuildItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanPronunciationRepeatItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanQuizPhrases('gavan_day_1_quiz', 'Sam')).toHaveLength(10);
  });

  it('passes the generator pipeline before progress can mark the day certified', () => {
    const packet = buildGavanDay1GeneratedDayPacket();
    const report = runPersonalPlanGenerationDryRunHarness({
      packet,
      reviewerId: 'gavan-day1-reviewer',
      reviewedAt: '2026-06-05T02:00:00.000Z',
    });

    expect(packet).toEqual(expect.objectContaining({
      packetId: 'gavan_d001_generator_packet',
      planId: 'gavan',
      dayIndex: 1,
      dayTheme: 'Короткие ответы',
    }));
    expect(packet.phrases.map((phrase) => phrase.english)).toEqual(lesson.phrases.map((phrase) => phrase.english));
    expect(report.status).toBe('valid_non_live_dry_run');
    expect(report.importFormat.days).toEqual([
      expect.objectContaining({
        packetId: 'gavan_d001_generator_packet',
        planId: 'gavan',
        dayIndex: 1,
      }),
    ]);
    expect(report.writtenSourceFamilies).toEqual([]);
  });
});
