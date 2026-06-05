import { getPersonalPlanChooseNaturalPhraseItems } from '../app/personal_plan_choose_natural_phrase_items';
import { PERSONAL_PLAN_CATALOG, allTasksForDay, tasksForMinutes } from '../app/personal_plan_catalog';
import {
  buildGavanDay2GeneratedDayPacket,
  runPersonalPlanGenerationDryRunHarness,
} from '../app/personal_plan_generation_dry_run_harness';
import { getPersonalPlanListenBuildItems } from '../app/personal_plan_listen_build_items';
import { getPersonalPlanListenChooseItems } from '../app/personal_plan_listen_choose_items';
import { getPersonalPlanMissingWordItems } from '../app/personal_plan_missing_word_items';
import { getPersonalPlanPhraseLesson } from '../app/personal_plan_phrase_lessons';
import { getPersonalPlanPronunciationRepeatItems } from '../app/personal_plan_pronunciation_repeat_items';
import { getPersonalPlanQuizPhrases } from '../app/personal_plan_quizzes';

const MOJIBAKE_RE = /[ÃÃ‘ÃƒÃ‚]/u;

describe('Gavan day 2 real content', () => {
  const plan = PERSONAL_PLAN_CATALOG.find((item) => item.id === 'gavan')!;
  const day = plan.days[1];
  const lesson = getPersonalPlanPhraseLesson('gavan_d002_content_unit')!;

  it('certifies the address/postcode day with generator evidence', () => {
    expect(day).toEqual(expect.objectContaining({
      id: 'gavan_d002',
      dayIndex: 2,
      status: 'certified',
      source: expect.objectContaining({
        generatedPacketId: 'gavan_d002_generator_packet',
        generationHarnessStatus: 'valid_non_live_dry_run',
      }),
      title: 'Postcode и номер квартиры',
      lifeOutcome: expect.stringContaining('полный адрес'),
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

  it('has complete material for every Gavan day-2 mode', () => {
    const contentUnitIds = lesson.phrases.slice(0, 5).map((phrase) => String(phrase.id));

    expect(lesson.phrases.map((phrase) => phrase.english)).toEqual([
      'This is my full address.',
      'The postcode is correct.',
      'My flat number is five.',
      'Can you spell the street name?',
      'The address is on this form.',
      'I can send proof of address.',
    ]);
    expect(lesson.phrases.map((phrase) => phrase.russian)).toEqual([
      'Это мой полный адрес.',
      'Почтовый индекс верный.',
      'Номер моей квартиры пять.',
      'Можете произнести название улицы по буквам?',
      'Адрес указан в этой форме.',
      'Я могу отправить подтверждение адреса.',
    ]);
    expect(lesson.phrases.every((phrase) => phrase.words.some((word) => word.teachingNote))).toBe(true);

    expect(getPersonalPlanMissingWordItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanChooseNaturalPhraseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenChooseItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanListenBuildItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanPronunciationRepeatItems({ lessonId: lesson.id, contentUnitIds })).toHaveLength(5);
    expect(getPersonalPlanQuizPhrases('gavan_day_2_quiz', 'Sam')).toHaveLength(10);
  });

  it('passes generator dry-run before progress marks the day certified', () => {
    const packet = buildGavanDay2GeneratedDayPacket();
    const report = runPersonalPlanGenerationDryRunHarness({
      packet,
      reviewerId: 'gavan-day2-reviewer',
      reviewedAt: '2026-06-05T03:15:00.000Z',
    });

    expect(packet).toEqual(expect.objectContaining({
      packetId: 'gavan_d002_generator_packet',
      planId: 'gavan',
      dayIndex: 2,
      dayTheme: 'Postcode и номер квартиры',
    }));
    expect(packet.phrases.map((phrase) => phrase.english)).toEqual(lesson.phrases.map((phrase) => phrase.english));
    expect(report.status).toBe('valid_non_live_dry_run');
    expect(report.importFormat.days).toEqual([
      expect.objectContaining({
        packetId: 'gavan_d002_generator_packet',
        planId: 'gavan',
        dayIndex: 2,
      }),
    ]);
    expect(report.writtenSourceFamilies).toEqual([]);
  });
});
