import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import {
  buildMitapDay2GeneratedDayPacket,
  runPersonalPlanGenerationDryRunHarness,
} from '../app/personal_plan_generation_dry_run_harness';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanQuizPhrases } from '../app/personal_plan_quizzes';

const MOJIBAKE_RE = /[ÃÃ‘ÃƒÃ‚]/u;

describe('Mitap day 2 real content', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'mitap')!;
  const day = plan.days[1];
  const lesson = getPersonalPlanPhraseLesson('mitap_d002_content_unit')!;

  it('certifies the standup-update day with generator evidence', () => {
    expect(day).toEqual(expect.objectContaining({
      id: 'mitap_d002',
      dayIndex: 2,
      status: 'certified',
      source: expect.objectContaining({
        generatedPacketId: 'mitap_d002_generator_packet',
        generationHarnessStatus: 'valid_non_live_dry_run',
      }),
      title: 'Короткий standup update',
      lifeOutcome: expect.stringContaining('короткий апдейт'),
    }));

    expect(JSON.stringify({ day, lesson })).not.toMatch(MOJIBAKE_RE);
  });

  it('keeps phrase introduction first and supports time-based reveal', () => {
    const expectedKinds = [
      'plan_phrase_lesson',
      'plan_choose_natural_phrase',
      'plan_missing_word',
      'plan_phrase_recall',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_quiz',
    ];

    expect(allTasksForDay(day).map((task) => task.kind)).toEqual(expectedKinds);
    expect(tasksForMinutes(day, 5).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 3));
    expect(tasksForMinutes(day, 10).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 4));
    expect(tasksForMinutes(day, 15).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 5));
    expect(tasksForMinutes(day, 20).map((task) => task.kind)).toEqual(expectedKinds.slice(0, 6));
  });

  it('has complete material for every Mitap day-2 mode', () => {
    const contentUnitIds = lesson.phrases.slice(0, 5).map((phrase) => String(phrase.id));

    expect(lesson.phrases.map((phrase) => phrase.english)).toEqual([
      'My update is short.',
      'The first task is done.',
      'I am working on the next part.',
      'I have one small blocker.',
      'I need ten more minutes.',
      'I will share the result today.',
    ]);
    expect(lesson.phrases.map((phrase) => phrase.russian)).toEqual([
      'Мой апдейт короткий.',
      'Первая задача готова.',
      'Я работаю над следующей частью.',
      'У меня есть один небольшой блокер.',
      'Мне нужно еще десять минут.',
      'Я поделюсь результатом сегодня.',
    ]);
    expect(lesson.phrases.every((phrase) => phrase.words.some((word) => word.teachingNote))).toBe(true);

    expect(getPersonalPlanMissingWordItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanChooseNaturalPhraseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenChooseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenBuildItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanPronunciationRepeatItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanQuizPhrases('mitap_day_2_quiz', 'Sam')).toHaveLength(10);
  });

  it('passes generator dry-run before progress marks the day certified', () => {
    const packet = buildMitapDay2GeneratedDayPacket();
    const report = runPersonalPlanGenerationDryRunHarness({
      packet,
      reviewerId: 'mitap-day2-reviewer',
      reviewedAt: '2026-06-05T03:00:00.000Z',
    });

    expect(packet).toEqual(expect.objectContaining({
      packetId: 'mitap_d002_generator_packet',
      planId: 'mitap',
      dayIndex: 2,
      dayTheme: 'Короткий standup update',
    }));
    expect(packet.phrases.map((phrase) => phrase.english)).toEqual(lesson.phrases.map((phrase) => phrase.english));
    expect(report.status).toBe('valid_non_live_dry_run');
    expect(report.importFormat.days).toEqual([
      expect.objectContaining({
        packetId: 'mitap_d002_generator_packet',
        planId: 'mitap',
        dayIndex: 2,
      }),
    ]);
    expect(report.writtenSourceFamilies).toEqual([]);
  });
});
