import type { PersonalPlanId } from './personal_plan_catalog';

export type PlanPromptForbiddenPattern =
  | 'generic_travel_business_school_mix'
  | 'lesson_card_language'
  | 'all_modes_every_day'
  | 'time_based_task_count'
  | 'production_ready_claim';

export type PlanPromptProgressionRule =
  | 'use_daily_task_set_matrix'
  | 'vary_initial_visibility_by_selected_time'
  | 'review_days_must_recall_previous_plan_phrases'
  | 'block_audio_until_approved'
  | 'block_pronunciation_until_scorer_evidence';

export type PlanSpecificGenerationPrompt = {
  planId: PersonalPlanId;
  promptText: string;
  scenarioKeywords: string[];
  scenarioRules: string[];
  progressionRules: PlanPromptProgressionRule[];
  forbiddenPatterns: PlanPromptForbiddenPattern[];
};

export type PlanSpecificGenerationPromptPacket = {
  kind: 'personal_plan_generation_plan_specific_prompt_packet';
  status: 'ready_for_internal_quality_gate' | 'blocked';
  prompts: PlanSpecificGenerationPrompt[];
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  generatedContentCreationAllowed: false;
  nextRequiredStep: 'internal_quality_gate';
};

export type PlanSpecificGenerationPromptIssueCode =
  | 'missing_plan_prompt'
  | 'generic_prompt_reuse'
  | 'missing_forbidden_patterns'
  | 'missing_progression_rules'
  | 'missing_scenario_rules'
  | 'unsafe_prompt_text'
  | 'source_runtime_write_not_allowed'
  | 'live_registration_not_allowed'
  | 'generated_content_creation_not_allowed';

export type PlanSpecificGenerationPromptValidation = {
  status: 'valid_non_live_prompt_packet' | 'invalid';
  issueCodes: PlanSpecificGenerationPromptIssueCode[];
  promptCount: number;
  sourceRuntimeWriteAllowed: false;
  liveRegistrationAllowed: false;
  nextRequiredStep: 'internal_quality_gate';
};

const REQUIRED_PLAN_IDS: PersonalPlanId[] = ['voyazh', 'mitap', 'gavan', 'impuls', 'echo'];

const REQUIRED_FORBIDDEN_PATTERNS: PlanPromptForbiddenPattern[] = [
  'generic_travel_business_school_mix',
  'lesson_card_language',
  'time_based_task_count',
  'production_ready_claim',
];

const REQUIRED_PROGRESSION_RULES: PlanPromptProgressionRule[] = [
  'use_daily_task_set_matrix',
  'vary_initial_visibility_by_selected_time',
  'review_days_must_recall_previous_plan_phrases',
];

function promptText(planName: string, scenario: string, tone: string): string {
  return [
    `Generate only for ${planName}: ${scenario}.`,
    `Tone: ${tone}.`,
    'Generate the full maximum day pool with one task per plan-native mode.',
    'Selected daily time chooses only the initial visible slice.',
    'Use 5/10/15/20 minute tiers for initial visibility and keep add-more tasks available.',
    'lessons are not plan tasks.',
    'Use the daily task set matrix and vary the initial visible count by selected time.',
    'return blockers instead of fake readiness.',
    'Do not claim production-ready, audio-ready, pronunciation-ready, or live-ready.',
  ].join('\n');
}

export const PLAN_SPECIFIC_GENERATION_PROMPTS: Record<PersonalPlanId, PlanSpecificGenerationPrompt> = {
  voyazh: {
    planId: 'voyazh',
    promptText: promptText('Voyazh', 'travel pressure, airport, hotel, transport, and asking for help', 'calm survival English, short and practical'),
    scenarioKeywords: ['travel', 'airport', 'hotel', 'help', 'transport', 'lost item'],
    scenarioRules: [
      'Keep phrases useful for airport, hotel, transport, cafe, directions, and urgent help.',
      'Prefer short requests and clarification lines over long tourist monologues.',
      'Do not mix business meeting or school-story language into travel days.',
      'When a day is a review day, recall earlier travel phrases from the same plan.',
    ],
    progressionRules: [...REQUIRED_PROGRESSION_RULES, 'block_audio_until_approved', 'block_pronunciation_until_scorer_evidence'],
    forbiddenPatterns: REQUIRED_FORBIDDEN_PATTERNS,
  },
  mitap: {
    planId: 'mitap',
    promptText: promptText('Mitap', 'meetings, next steps, blockers, owners, deadlines, and follow-up', 'professional, concise, not corporate theater'),
    scenarioKeywords: ['meeting', 'next steps', 'deadline', 'owner', 'blocker', 'follow-up'],
    scenarioRules: [
      'Keep phrases useful for calls, standups, blockers, deadlines, owners, and follow-up messages.',
      'Prefer short workplace lines that a learner can actually say in a meeting.',
      'Do not drift into travel, immigration, or random small-talk scenarios.',
      'Review days must recall earlier meeting phrases and repair common clarity mistakes.',
    ],
    progressionRules: [...REQUIRED_PROGRESSION_RULES, 'block_audio_until_approved', 'block_pronunciation_until_scorer_evidence'],
    forbiddenPatterns: REQUIRED_FORBIDDEN_PATTERNS,
  },
  gavan: {
    planId: 'gavan',
    promptText: promptText('Gavan', 'forms, address, doctor, bank, housing, city services, and practical relocation tasks', 'plain, careful, low-stress everyday English'),
    scenarioKeywords: ['forms', 'address', 'doctor', 'bank', 'housing', 'city services'],
    scenarioRules: [
      'Keep phrases useful for forms, addresses, appointments, housing, doctor, bank, and city-service situations.',
      'Avoid personal-data-heavy examples; use safe generic placeholders when needed.',
      'Do not turn the plan into normal lesson slices or grammar lectures.',
      'Review days must recall practical survival phrases from earlier Gavan days.',
    ],
    progressionRules: [...REQUIRED_PROGRESSION_RULES, 'block_audio_until_approved', 'block_pronunciation_until_scorer_evidence'],
    forbiddenPatterns: REQUIRED_FORBIDDEN_PATTERNS,
  },
  impuls: {
    planId: 'impuls',
    promptText: promptText('Impuls', 'spontaneous speech, short story, because, quick answer, and recovery after mistakes', 'fast, simple, energetic, but controlled'),
    scenarioKeywords: ['spontaneous speech', 'short story', 'because', 'quick answer', 'recovery', 'opinion'],
    scenarioRules: [
      'Keep phrases useful for quick answers, short stories, because-links, opinions, and mistake recovery.',
      'Prefer compact speaking lines that can be produced under pressure.',
      'Do not make long essays or over-polished written English.',
      'Review days must recall earlier speaking links and repair hesitation patterns.',
    ],
    progressionRules: [...REQUIRED_PROGRESSION_RULES, 'block_audio_until_approved', 'block_pronunciation_until_scorer_evidence'],
    forbiddenPatterns: REQUIRED_FORBIDDEN_PATTERNS,
  },
  echo: {
    planId: 'echo',
    promptText: promptText('Echo', 'listening, repeat, heard, missed, time, place, and short responses after audio', 'listener-first, minimal, clear'),
    scenarioKeywords: ['listening', 'repeat', 'heard', 'missed', 'time', 'place'],
    scenarioRules: [
      'Keep phrases useful for hearing, repeating, asking for slower speech, catching time/place, and answering after audio.',
      'Prefer listen-and-react language over long prepared sentences.',
      'Do not claim listening audio is ready unless approved audio evidence exists.',
      'Review days must recall confusing heard/missed pairs from earlier Echo days.',
    ],
    progressionRules: [...REQUIRED_PROGRESSION_RULES, 'block_audio_until_approved', 'block_pronunciation_until_scorer_evidence'],
    forbiddenPatterns: REQUIRED_FORBIDDEN_PATTERNS,
  },
};

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

export function buildPlanSpecificGenerationPromptPacket(): PlanSpecificGenerationPromptPacket {
  return {
    kind: 'personal_plan_generation_plan_specific_prompt_packet',
    status: 'ready_for_internal_quality_gate',
    prompts: REQUIRED_PLAN_IDS.map((planId) => PLAN_SPECIFIC_GENERATION_PROMPTS[planId]),
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    generatedContentCreationAllowed: false,
    nextRequiredStep: 'internal_quality_gate',
  };
}

export function validatePlanSpecificGenerationPromptPacket(
  packet: PlanSpecificGenerationPromptPacket,
): PlanSpecificGenerationPromptValidation {
  const issueCodes: PlanSpecificGenerationPromptIssueCode[] = [];

  if ((packet as { sourceRuntimeWriteAllowed?: boolean }).sourceRuntimeWriteAllowed) {
    issueCodes.push('source_runtime_write_not_allowed');
  }
  if ((packet as { liveRegistrationAllowed?: boolean }).liveRegistrationAllowed) {
    issueCodes.push('live_registration_not_allowed');
  }
  if ((packet as { generatedContentCreationAllowed?: boolean }).generatedContentCreationAllowed) {
    issueCodes.push('generated_content_creation_not_allowed');
  }

  const planIds = new Set(packet.prompts.map((prompt) => prompt.planId));
  for (const planId of REQUIRED_PLAN_IDS) {
    if (!planIds.has(planId)) {
      issueCodes.push('missing_plan_prompt');
    }
  }

  if (new Set(packet.prompts.map((prompt) => prompt.promptText)).size !== packet.prompts.length) {
    issueCodes.push('generic_prompt_reuse');
  }

  for (const prompt of packet.prompts) {
    const promptTextLower = prompt.promptText.toLowerCase();
    if (
      !promptTextLower.includes('full maximum day pool')
      || !promptTextLower.includes('initial visible slice')
      || !promptTextLower.includes('lessons are not plan tasks')
      || !promptTextLower.includes('return blockers instead of fake readiness')
    ) {
      issueCodes.push('unsafe_prompt_text');
    }

    if (prompt.scenarioRules.length < 4 || prompt.scenarioKeywords.length < 4) {
      issueCodes.push('missing_scenario_rules');
    }
    for (const pattern of REQUIRED_FORBIDDEN_PATTERNS) {
      if (!prompt.forbiddenPatterns.includes(pattern)) {
        issueCodes.push('missing_forbidden_patterns');
      }
    }
    for (const rule of REQUIRED_PROGRESSION_RULES) {
      if (!prompt.progressionRules.includes(rule)) {
        issueCodes.push('missing_progression_rules');
      }
    }
  }

  const uniqueCodes = unique(issueCodes);
  return {
    status: uniqueCodes.length === 0 ? 'valid_non_live_prompt_packet' : 'invalid',
    issueCodes: uniqueCodes,
    promptCount: packet.prompts.length,
    sourceRuntimeWriteAllowed: false,
    liveRegistrationAllowed: false,
    nextRequiredStep: 'internal_quality_gate',
  };
}
