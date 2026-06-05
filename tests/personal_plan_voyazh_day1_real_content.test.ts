import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanQuizPhrases } from '../app/personal_plan_quizzes';
import {
  buildVoyazhDay1GeneratedDayPacket,
  runPersonalPlanGenerationDryRunHarness,
} from '../app/personal_plan_generation_dry_run_harness';

const MOJIBAKE_RE = /[ÐÑÃÂ][^\s]*/u;

describe('Voyazh day 1 real content', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'voyazh')!;
  const day = plan.days[0];
  const lesson = getPersonalPlanPhraseLesson('voyazh_d001_content_unit')!;

  it('certifies the first day instead of relying on a generated scaffold', () => {
    expect(day).toEqual(expect.objectContaining({
      id: 'voyazh_d001',
      dayIndex: 1,
      status: 'certified',
      source: expect.objectContaining({
        generatedPacketId: 'voyazh_d001_generator_packet',
        generationHarnessStatus: 'valid_non_live_dry_run',
      }),
      title: 'Аэропорт: попросить помощь',
      lifeOutcome: expect.stringContaining('информационную стойку'),
    }));

    const visibleCopy = JSON.stringify({
      planName: plan.name,
      day,
      lesson,
    });

    expect(visibleCopy).not.toMatch(MOJIBAKE_RE);
    expect(visibleCopy.toLowerCase()).not.toMatch(/placeholder|scaffold|generated shell|normal lesson shell/);
  });

  it('starts with the phrase introduction and exposes more tasks by selected time', () => {
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

  it('has complete task material for every day-1 mode', () => {
    const contentUnitIds = lesson.phrases.slice(0, 5).map((phrase) => String(phrase.id));

    expect(lesson.phrases.map((phrase) => phrase.english)).toEqual([
      'I need help now.',
      'Can you help me, please?',
      'I lost my bag.',
      'I need the information desk.',
      'Please call airport staff.',
      'I can wait here.',
    ]);
    expect(lesson.phrases.map((phrase) => phrase.russian)).toEqual([
      'Мне нужна помощь сейчас.',
      'Можете мне помочь, пожалуйста?',
      'Я потерял сумку.',
      'Мне нужна информационная стойка.',
      'Пожалуйста, позовите сотрудников аэропорта.',
      'Я могу подождать здесь.',
    ]);
    expect(lesson.phrases.every((phrase) => phrase.words.some((word) => word.teachingNote))).toBe(true);

    expect(getPersonalPlanMissingWordItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanChooseNaturalPhraseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenChooseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenBuildItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanPronunciationRepeatItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanQuizPhrases('voyazh_day_1_quiz', 'Sam')).toHaveLength(10);
  });

  it('passes the generator pipeline before the day is counted as certified progress', () => {
    const packet = buildVoyazhDay1GeneratedDayPacket();
    const report = runPersonalPlanGenerationDryRunHarness({
      packet,
      reviewerId: 'voyazh-day1-reviewer',
      reviewedAt: '2026-06-05T01:30:00.000Z',
    });

    expect(packet).toEqual(expect.objectContaining({
      packetId: 'voyazh_d001_generator_packet',
      planId: 'voyazh',
      dayIndex: 1,
      dayTheme: 'Аэропорт: попросить помощь',
    }));
    expect(packet.phrases.map((phrase) => phrase.english)).toEqual(lesson.phrases.map((phrase) => phrase.english));
    expect(report.status).toBe('valid_non_live_dry_run');
    expect(report.importFormat.days).toEqual([
      expect.objectContaining({
        packetId: 'voyazh_d001_generator_packet',
        planId: 'voyazh',
        dayIndex: 1,
      }),
    ]);
    expect(report.writtenSourceFamilies).toEqual([]);
    expect(report.productionReady).toBe(false);
  });
});
