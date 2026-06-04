import { HARBOR_WEEK1_BLUEPRINT_DRAFT } from './personal_plan_harbor_week1_blueprint_draft';
import type {
  PersonalPlanAuthoringDayPassport,
  PersonalPlanAuthoringExerciseBlock,
  PersonalPlanWeekAuthoringPassport as CorePersonalPlanWeekAuthoringPassport,
  PersonalPlanWeekBlueprintReference,
} from './personal_plan_week_authoring_passport';
import { validatePersonalPlanWeekAuthoringPassport as validateCorePersonalPlanWeekAuthoringPassport } from './personal_plan_week_authoring_passport';

export type PersonalPlanWeekAuthoringPassport = Omit<
  CorePersonalPlanWeekAuthoringPassport,
  'days'
> & {
  days: Array<
    Omit<PersonalPlanAuthoringDayPassport, 'exerciseMix'> & {
      exerciseMix: Array<
        Omit<Partial<PersonalPlanAuthoringExerciseBlock>, 'weight' | 'type'> & {
          id: string;
          type: string;
          title: string;
          weight: PersonalPlanAuthoringExerciseBlock['weight'] | 'light';
          focusTags: string[];
        }
      >;
    }
  >;
};

export const validatePersonalPlanWeekAuthoringPassport = (
  passport: PersonalPlanWeekAuthoringPassport,
  blueprint: PersonalPlanWeekBlueprintReference,
) =>
  validateCorePersonalPlanWeekAuthoringPassport(
    {
      ...passport,
      days: passport.days.map((day) => ({
        ...day,
        exerciseMix: day.exerciseMix.map((block) => ({
          ...block,
          tags: block.tags ?? block.focusTags,
          weight: block.weight === 'light' ? 'short' : block.weight,
        })) as PersonalPlanAuthoringExerciseBlock[],
      })),
    },
    blueprint,
  );

const outcomes = [
  'Start with short, natural everyday phrases without personal details or narrow scenarios.',
  'Recognize simple polite requests and choose the phrase that sounds normal in real life.',
  'Build short answers with the same grammar in a few different everyday contexts.',
  'Recall the first week phrases without hints and notice what still feels slow.',
  'Understand short audio-style prompts before the real audio pipeline is connected.',
  'Recover after a mistake: repeat the useful phrase, not the whole day.',
  'Check the week with a short quiz and reserve pronunciation work for the next pipeline step.',
];

const blockSets: Array<Array<Omit<PersonalPlanAuthoringExerciseBlock, 'id' | 'tags'>>> = [
  [
    {
      type: 'phrase_build',
      title: 'Build the first useful phrases',
      weight: 'medium',
      focusTags: ['universal_start', 'short_answer'],
    },
    {
      type: 'missing_word',
      title: 'Choose the missing everyday word',
      weight: 'short',
      focusTags: ['universal_start', 'word_meaning'],
    },
    {
      type: 'phrase_recall',
      title: 'Recall without hints',
      weight: 'medium',
      focusTags: ['active_recall', 'short_answer'],
    },
    {
      type: 'plan_quiz',
      title: 'Quick check',
      weight: 'heavy',
      focusTags: ['quiz', 'week1_check'],
    },
  ],
  [
    {
      type: 'choose_natural_phrase',
      title: 'Pick what sounds natural',
      weight: 'short',
      focusTags: ['natural_phrase', 'polite_request'],
    },
    {
      type: 'listen_choose',
      title: 'Listen and choose',
      weight: 'medium',
      focusTags: ['listening_placeholder', 'polite_request'],
      audioStatus: 'placeholder',
    },
    {
      type: 'phrase_build',
      title: 'Build the answer',
      weight: 'medium',
      focusTags: ['phrase_build', 'short_answer'],
    },
    {
      type: 'phrase_recall',
      title: 'Recall the useful line',
      weight: 'medium',
      focusTags: ['active_recall', 'polite_request'],
    },
  ],
  [
    {
      type: 'missing_word',
      title: 'Fill the phrase',
      weight: 'short',
      focusTags: ['word_meaning', 'everyday_action'],
    },
    {
      type: 'listen_build',
      title: 'Build after listening',
      weight: 'medium',
      focusTags: ['listening_placeholder', 'phrase_build'],
      audioStatus: 'placeholder',
    },
    {
      type: 'phrase_build',
      title: 'Make it sound simple',
      weight: 'medium',
      focusTags: ['phrase_build', 'simple_speech'],
    },
    {
      type: 'plan_quiz',
      title: 'Ten-question check',
      weight: 'heavy',
      focusTags: ['quiz', 'week1_check'],
    },
  ],
  [
    {
      type: 'phrase_build',
      title: 'Build the short reply',
      weight: 'medium',
      focusTags: ['short_reply', 'everyday_action'],
    },
    {
      type: 'choose_natural_phrase',
      title: 'Choose the human version',
      weight: 'short',
      focusTags: ['natural_phrase', 'simple_speech'],
    },
    {
      type: 'phrase_recall',
      title: 'Bring it back from memory',
      weight: 'medium',
      focusTags: ['active_recall', 'short_reply'],
    },
    {
      type: 'pronunciation_placeholder',
      title: 'Pronunciation slot',
      weight: 'heavy',
      focusTags: ['pronunciation_placeholder'],
      pronunciationStatus: 'placeholder',
    },
  ],
  [
    {
      type: 'choose_natural_phrase',
      title: 'Find the natural phrase',
      weight: 'short',
      focusTags: ['natural_phrase', 'everyday_action'],
    },
    {
      type: 'listen_choose',
      title: 'Catch the meaning',
      weight: 'medium',
      focusTags: ['listening_placeholder', 'meaning'],
      audioStatus: 'placeholder',
    },
    {
      type: 'missing_word',
      title: 'Add the key word',
      weight: 'short',
      focusTags: ['word_meaning', 'phrase_completion'],
    },
    {
      type: 'plan_quiz',
      title: 'Small checkpoint',
      weight: 'heavy',
      focusTags: ['quiz', 'week1_check'],
    },
  ],
  [
    {
      type: 'phrase_recall',
      title: 'Recall yesterday first',
      weight: 'medium',
      focusTags: ['active_recall', 'carryover'],
    },
    {
      type: 'missing_word',
      title: 'Fix the missing piece',
      weight: 'short',
      focusTags: ['word_meaning', 'mistake_recovery'],
    },
    {
      type: 'listen_build',
      title: 'Build what you hear',
      weight: 'medium',
      focusTags: ['listening_placeholder', 'phrase_build'],
      audioStatus: 'placeholder',
    },
    {
      type: 'choose_natural_phrase',
      title: 'Choose the smoother answer',
      weight: 'short',
      focusTags: ['natural_phrase', 'short_answer'],
    },
  ],
  [
    {
      type: 'phrase_recall',
      title: 'Recall the week',
      weight: 'medium',
      focusTags: ['active_recall', 'week1_review'],
    },
    {
      type: 'plan_quiz',
      title: 'Week check',
      weight: 'heavy',
      focusTags: ['quiz', 'week1_check'],
    },
    {
      type: 'listen_choose',
      title: 'Listen for the meaning',
      weight: 'medium',
      focusTags: ['listening_placeholder', 'meaning'],
      audioStatus: 'placeholder',
    },
    {
      type: 'pronunciation_placeholder',
      title: 'Pronunciation slot',
      weight: 'heavy',
      focusTags: ['pronunciation_placeholder'],
      pronunciationStatus: 'placeholder',
    },
  ],
];

const buildDayPassport = (
  dayId: string,
  dayIndex: number,
): PersonalPlanAuthoringDayPassport => {
  const exerciseMix = blockSets[dayIndex].map((block, blockIndex) => ({
    ...block,
    id: `${dayId}:block-${blockIndex + 1}`,
    tags: block.focusTags,
    placeholder:
      block.audioStatus === 'placeholder'
        ? { kind: 'audio' as const, status: 'placeholder' as const }
        : block.pronunciationStatus === 'placeholder'
          ? { kind: 'pronunciation' as const, status: 'placeholder' as const }
          : undefined,
  }));

  return {
    dayId,
    learningOutcome: outcomes[dayIndex],
    exerciseMix,
    loadByMinutes: {
      5: [exerciseMix[0].id],
      10: [exerciseMix[0].id, exerciseMix[1].id],
      15: [exerciseMix[0].id, exerciseMix[1].id, exerciseMix[2].id],
      20: [exerciseMix[0].id, exerciseMix[1].id, exerciseMix[2].id, exerciseMix[3].id],
    },
  };
};

export const GAVAN_WEEK1_AUTHORING_PASSPORT: CorePersonalPlanWeekAuthoringPassport = {
  weekId: HARBOR_WEEK1_BLUEPRINT_DRAFT.weekId,
  planId: HARBOR_WEEK1_BLUEPRINT_DRAFT.planId,
  days: HARBOR_WEEK1_BLUEPRINT_DRAFT.days.map((day, index) =>
    buildDayPassport(day.dayId, index),
  ),
};

export const HARBOR_WEEK1_AUTHORING_PASSPORT = GAVAN_WEEK1_AUTHORING_PASSPORT;
