import {
  DAILY_TASK_SET_MATRIX,
  DAILY_TASK_ORDER_MATRIX,
  GENERATION_MODE_CONTRACT,
  GENERATION_PROMPT_TEMPLATE,
  GENERATION_REVIEW_RUBRIC,
  validateGeneratedDayPacket,
  type GeneratedPersonalPlanDayPacket,
} from '../app/personal_plan_generation_contract';

function validPacket(overrides: Partial<GeneratedPersonalPlanDayPacket> = {}): GeneratedPersonalPlanDayPacket {
  return {
    packetId: 'mitap_d002_packet',
    planId: 'mitap',
    dayIndex: 2,
    weekIndex: 1,
    dayTheme: 'Confirm next steps',
    weekRole: 'same_situation_faster_choice',
    selectedDailyTimeAffectsTasks: true,
    productionReady: false,
    reviewStatus: 'needs_review',
    taskModes: GENERATION_MODE_CONTRACT.map((mode) => mode.mode),
    phrases: [
      {
        id: 'mitap_d002_phrase_1',
        english: 'Can we confirm the next steps?',
        translation: 'Можем подтвердить следующие шаги?',
        teachingNote: 'Use confirm when you want a calm check before everyone leaves the call.',
      },
      {
        id: 'mitap_d002_phrase_2',
        english: 'I will write the summary.',
        translation: 'Я напишу резюме.',
        teachingNote: 'Will write is a short promise for what happens after the meeting.',
      },
      {
        id: 'mitap_d002_phrase_3',
        english: 'Who owns this task?',
        translation: 'Кто отвечает за эту задачу?',
        teachingNote: 'Owns this task means responsibility, not possession.',
      },
      {
        id: 'mitap_d002_phrase_4',
        english: 'The deadline is still Friday.',
        translation: 'Срок все еще в пятницу.',
        teachingNote: 'Still keeps the deadline unchanged.',
      },
      {
        id: 'mitap_d002_phrase_5',
        english: 'Let us keep this short.',
        translation: 'Давайте коротко.',
        teachingNote: 'Keep this short makes the tone practical, not rude.',
      },
      {
        id: 'mitap_d002_phrase_6',
        english: 'I can follow up today.',
        translation: 'Я могу вернуться с ответом сегодня.',
        teachingNote: 'Follow up means continue after the call with a message or action.',
      },
    ],
    recallLinks: [
      { fromDayIndex: 1, phraseIds: ['mitap_d001_phrase_1', 'mitap_d001_phrase_2'] },
    ],
    audioNeeds: [{ mode: 'plan_listen_choose', status: 'blocked_until_audio_approved' }],
    pronunciationNeeds: [{ mode: 'plan_pronunciation_repeat', status: 'blocked_until_scorer_evidence' }],
    blockers: ['audio_not_approved_for_listening_modes', 'pronunciation_scorer_missing'],
    ...overrides,
  };
}

describe('personal plan generation contract gate', () => {
  it('defines mode contract, prompt template, and review rubric before bulk generation', () => {
    expect(GENERATION_MODE_CONTRACT.map((mode) => mode.mode)).toEqual([
      'plan_phrase_build',
      'plan_missing_word',
      'plan_choose_natural_phrase',
      'plan_listen_choose',
      'plan_listen_build',
      'plan_pronunciation_repeat',
      'plan_phrase_recall',
      'plan_quiz',
    ]);
    expect(GENERATION_MODE_CONTRACT.every((mode) => mode.requiredFields.length > 0)).toBe(true);
    expect(GENERATION_PROMPT_TEMPLATE).toContain('Do not import generated Day 2-28 chat drafts into runtime/source without review approval');
    expect(GENERATION_PROMPT_TEMPLATE).toContain('Generate the full maximum day pool with one task per plan-native mode');
    expect(GENERATION_PROMPT_TEMPLATE).toContain('lessons are not plan tasks');
    expect(GENERATION_REVIEW_RUBRIC).toContain('review_status_must_not_be_production_ready');
  });

  it('uses a full maximum task pool across the 28-day matrix and lets time choose the initial visible slice', () => {
    expect(DAILY_TASK_SET_MATRIX).toHaveLength(28);
    expect(DAILY_TASK_SET_MATRIX[0].modes).toContain('plan_phrase_build');
    expect(DAILY_TASK_SET_MATRIX[6].modes).toContain('plan_phrase_recall');

    for (const day of DAILY_TASK_SET_MATRIX) {
      expect(day.modes).toEqual(GENERATION_MODE_CONTRACT.map((mode) => mode.mode));
    }

    const serializedSets = DAILY_TASK_SET_MATRIX.map((day) => day.modes.join('|'));
    expect(new Set(DAILY_TASK_SET_MATRIX.map((day) => day.progressionRole)).size).toBeGreaterThan(12);
  });

  it('starts every generated day with phrase build while varying the remaining mode order', () => {
    expect(DAILY_TASK_ORDER_MATRIX).toHaveLength(28);

    for (const day of DAILY_TASK_ORDER_MATRIX) {
      expect(day.modes[0]).toBe('plan_phrase_build');
      expect([...day.modes].sort()).toEqual(
        GENERATION_MODE_CONTRACT.map((mode) => mode.mode).sort(),
      );
    }

    const firstWeekTailOrders = DAILY_TASK_ORDER_MATRIX
      .slice(0, 7)
      .map((day) => day.modes.slice(1).join('|'));

    expect(new Set(firstWeekTailOrders).size).toBeGreaterThanOrEqual(4);
    expect(GENERATION_PROMPT_TEMPLATE).toContain('Always start the day with plan_phrase_build');
    expect(GENERATION_PROMPT_TEMPLATE).toContain('Vary the remaining task order by day');
  });

  it('documents time tiers as initial visible counts while the full day pool remains available for add-more', () => {
    expect(GENERATION_PROMPT_TEMPLATE).toContain('5 minutes starts with 2-4 visible tasks');
    expect(GENERATION_PROMPT_TEMPLATE).toContain('10 minutes starts with 3-5 visible tasks');
    expect(GENERATION_PROMPT_TEMPLATE).toContain('15 minutes starts with 4-5 visible tasks');
    expect(GENERATION_PROMPT_TEMPLATE).toContain('20 minutes starts with 5-6 visible tasks');
    expect(GENERATION_PROMPT_TEMPLATE).toContain('After the visible tasks are completed, show Add more tasks while unrevealed tasks remain');
  });

  it('accepts a valid pre-generation fixture without marking it production-ready', () => {
    const result = validateGeneratedDayPacket(validPacket());

    expect(result.status).toBe('valid_needs_review');
    expect(result.issues).toEqual([]);
  });

  it('rejects lesson destinations, missing time-tier visibility, placeholders, duplicate phrases, and partial mode pools', () => {
    expect(validateGeneratedDayPacket(validPacket({
      taskModes: ['plan_phrase_build', 'lesson' as any],
    })).issueCodes).toContain('lesson_task_not_allowed');

    expect(validateGeneratedDayPacket(validPacket({
      selectedDailyTimeAffectsTasks: false,
    })).issueCodes).toContain('time_based_task_selection_required_for_visible_slice');

    expect(validateGeneratedDayPacket(validPacket({
      phrases: [
        ...validPacket().phrases.slice(0, 5),
        {
          id: 'mitap_d002_phrase_6',
          english: 'Placeholder phrase.',
          translation: 'Заглушка.',
          teachingNote: 'Generated scaffold shell.',
        },
      ],
    })).issueCodes).toContain('technical_placeholder_copy');

    expect(validateGeneratedDayPacket(validPacket({
      phrases: validPacket().phrases.map((phrase, index) => (
        index === 5 ? { ...phrase, english: 'Can we confirm the next steps?' } : phrase
      )),
    })).issueCodes).toContain('duplicate_phrase_text');

    expect(validateGeneratedDayPacket(validPacket({
      taskModes: GENERATION_MODE_CONTRACT.map((mode) => mode.mode).slice(0, -1),
    })).issueCodes).toContain('missing_maximum_day_mode_pool');
  });
});
