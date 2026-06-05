import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import {
  buildVoyazhDay3GeneratedDayPacket,
  runPersonalPlanGenerationDryRunHarness,
} from '../app/personal_plan_generation_dry_run_harness';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanQuizPhrases } from '../app/personal_plan_quizzes';

const MOJIBAKE_RE = /[ÃÃ‘ÃƒÃ‚]/u;

describe('Voyazh day 3 real content', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'voyazh')!;
  const day = plan.days[2];
  const lesson = getPersonalPlanPhraseLesson('voyazh_d003_content_unit')!;

  it('certifies the baggage/check-in day with generator evidence', () => {
    expect(day).toEqual(expect.objectContaining({
      id: 'voyazh_d003',
      dayIndex: 3,
      status: 'certified',
      source: expect.objectContaining({
        generatedPacketId: 'voyazh_d003_generator_packet',
        generationHarnessStatus: 'valid_non_live_dry_run',
      }),
      title: 'Багаж и регистрация',
      lifeOutcome: expect.stringContaining('сдать сумку'),
    }));

    expect(JSON.stringify({ day, lesson })).not.toMatch(MOJIBAKE_RE);
  });

  it('keeps phrase introduction first and supports the day-3 order', () => {
    const expectedKinds = [
      'plan_phrase_lesson',
      'plan_listen_choose',
      'plan_missing_word',
      'plan_listen_build',
      'plan_choose_natural_phrase',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ];

    expect(allTasksForDay(day).map((task) => task.kind)).toEqual(expectedKinds);
    expect(tasksForMinutes(day, 5).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 2));
    expect(tasksForMinutes(day, 10).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 3));
    expect(tasksForMinutes(day, 15).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 4));
    expect(tasksForMinutes(day, 20).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 5));
  });

  it('has complete material for every Voyazh day-3 mode', () => {
    const contentUnitIds = lesson.phrases.slice(0, 5).map((phrase) => String(phrase.id));

    expect(lesson.phrases.map((phrase) => phrase.english)).toEqual([
      'I need to check this bag.',
      'Here is my boarding pass.',
      'The bag is not heavy.',
      'There is one fragile item.',
      'Can I get a baggage receipt?',
      'Which gate should I use?',
    ]);
    expect(lesson.phrases.map((phrase) => phrase.russian)).toEqual([
      'Мне нужно сдать эту сумку.',
      'Вот мой посадочный талон.',
      'Сумка не тяжелая.',
      'Там есть одна хрупкая вещь.',
      'Могу я получить багажную квитанцию?',
      'Каким выходом мне пользоваться?',
    ]);
    expect(lesson.phrases.every((phrase) => phrase.words.some((word) => word.teachingNote))).toBe(true);

    expect(getPersonalPlanMissingWordItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanChooseNaturalPhraseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenChooseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenBuildItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanPronunciationRepeatItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanQuizPhrases('voyazh_day_3_quiz', 'Sam')).toHaveLength(10);
  });

  it('passes generator dry-run before progress marks the day certified', () => {
    const packet = buildVoyazhDay3GeneratedDayPacket();
    const report = runPersonalPlanGenerationDryRunHarness({
      packet,
      reviewerId: 'voyazh-day3-reviewer',
      reviewedAt: '2026-06-05T04:00:00.000Z',
    });

    expect(packet).toEqual(expect.objectContaining({
      packetId: 'voyazh_d003_generator_packet',
      planId: 'voyazh',
      dayIndex: 3,
      dayTheme: 'Багаж и регистрация',
    }));
    expect(packet.phrases.map((phrase) => phrase.english)).toEqual(lesson.phrases.map((phrase) => phrase.english));
    expect(report.status).toBe('valid_non_live_dry_run');
    expect(report.importFormat.days).toEqual([
      expect.objectContaining({
        packetId: 'voyazh_d003_generator_packet',
        planId: 'voyazh',
        dayIndex: 3,
      }),
    ]);
    expect(report.writtenSourceFamilies).toEqual([]);
  });
});
