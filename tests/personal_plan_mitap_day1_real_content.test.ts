import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import {
  buildMitapDay1GeneratedDayPacket,
  runPersonalPlanGenerationDryRunHarness,
} from '../app/personal_plan_generation_dry_run_harness';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanQuizPhrases } from '../app/personal_plan_quizzes';

const MOJIBAKE_RE = /[ÐÑÃÂ]/u;

describe('Mitap day 1 real content', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'mitap')!;
  const day = plan.days[0];
  const lesson = getPersonalPlanPhraseLesson('mitap_d001_content_unit')!;

  it('certifies the first work-call day with generator evidence', () => {
    expect(day).toEqual(expect.objectContaining({
      id: 'mitap_d001',
      dayIndex: 1,
      status: 'certified',
      source: expect.objectContaining({
        generatedPacketId: 'mitap_d001_generator_packet',
        generationHarnessStatus: 'valid_non_live_dry_run',
      }),
      title: 'Созвон: зафиксировать next steps',
      lifeOutcome: expect.stringContaining('next steps'),
    }));

    expect(JSON.stringify({ planName: plan.name, day, lesson })).not.toMatch(MOJIBAKE_RE);
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

  it('has complete material for every Mitap day-1 mode', () => {
    const contentUnitIds = lesson.phrases.slice(0, 5).map((phrase) => String(phrase.id));

    expect(lesson.phrases.map((phrase) => phrase.english)).toEqual([
      'The next steps are clear.',
      'I will send the next steps.',
      'We need one owner.',
      'The deadline is today.',
      'I will follow up after the call.',
      'Let us keep the summary short.',
    ]);
    expect(lesson.phrases.map((phrase) => phrase.russian)).toEqual([
      'Следующие шаги понятны.',
      'Я отправлю следующие шаги.',
      'Нам нужен один ответственный.',
      'Срок сегодня.',
      'Я вернусь с ответом после звонка.',
      'Давайте оставим резюме коротким.',
    ]);
    expect(lesson.phrases.every((phrase) => phrase.words.some((word) => word.teachingNote))).toBe(true);

    expect(getPersonalPlanMissingWordItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanChooseNaturalPhraseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenChooseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenBuildItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanPronunciationRepeatItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanQuizPhrases('mitap_day_1_quiz', 'Sam')).toHaveLength(10);
  });

  it('passes the generator pipeline before progress can mark the day certified', () => {
    const packet = buildMitapDay1GeneratedDayPacket();
    const report = runPersonalPlanGenerationDryRunHarness({
      packet,
      reviewerId: 'mitap-day1-reviewer',
      reviewedAt: '2026-06-05T01:45:00.000Z',
    });

    expect(packet).toEqual(expect.objectContaining({
      packetId: 'mitap_d001_generator_packet',
      planId: 'mitap',
      dayIndex: 1,
      dayTheme: 'Созвон: зафиксировать next steps',
    }));
    expect(packet.phrases.map((phrase) => phrase.english)).toEqual(lesson.phrases.map((phrase) => phrase.english));
    expect(report.status).toBe('valid_non_live_dry_run');
    expect(report.importFormat.days).toEqual([
      expect.objectContaining({
        packetId: 'mitap_d001_generator_packet',
        planId: 'mitap',
        dayIndex: 1,
      }),
    ]);
    expect(report.writtenSourceFamilies).toEqual([]);
  });
});
