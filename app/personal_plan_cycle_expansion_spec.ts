export type PersonalPlanExpansionId = 'voyazh' | 'mitap' | 'gavan' | 'impuls' | 'echo';

export type PersonalPlanCycleExpansion = {
  planId: PersonalPlanExpansionId;
  totalDays: number;
  fullCycles: number;
  partialCycleDays: number;
  totalCyclePasses: number;
  cycleFocus: string[];
};

const CYCLE_LENGTH_DAYS = 28;

const PLAN_LENGTH_DAYS: Record<PersonalPlanExpansionId, number> = {
  voyazh: 84,
  mitap: 112,
  gavan: 126,
  impuls: 140,
  echo: 84,
};

const PLAN_CYCLE_FOCUS: Record<PersonalPlanExpansionId, string[]> = {
  voyazh: [
    'survival route and help',
    'transport, ticket, and check-in pressure',
    'multi-step travel problem solving',
  ],
  mitap: [
    'short status and next steps',
    'blockers, ownership, and follow-up',
    'decision framing and disagreement repair',
    'meeting wrap-up with minimal prompts',
  ],
  gavan: [
    'calm replies and clarification',
    'soft boundaries and simple choices',
    'pressure without over-explaining',
    'combined calm decision flow',
    'first half-cycle reinforcement',
  ],
  impuls: [
    'simple story sequence',
    'problem, attempt, and result',
    'reason, opinion, and correction',
    'fast repair and alternative action',
    'short spontaneous monologue control',
  ],
  echo: [
    'repeat and identify key details',
    'time, place, number, and name repair',
    'short listening-memory dialogs',
  ],
};

function buildExpansion(planId: PersonalPlanExpansionId): PersonalPlanCycleExpansion {
  const totalDays = PLAN_LENGTH_DAYS[planId];
  const fullCycles = Math.floor(totalDays / CYCLE_LENGTH_DAYS);
  const partialCycleDays = totalDays % CYCLE_LENGTH_DAYS;

  return {
    planId,
    totalDays,
    fullCycles,
    partialCycleDays,
    totalCyclePasses: fullCycles + (partialCycleDays > 0 ? 1 : 0),
    cycleFocus: PLAN_CYCLE_FOCUS[planId],
  };
}

export const PERSONAL_PLAN_CYCLE_EXPANSION_SPEC = {
  cycleLengthDays: CYCLE_LENGTH_DAYS,
  dailyTimeAffectsTaskSelection: false,
  productionReady: false,
  plans: {
    voyazh: buildExpansion('voyazh'),
    mitap: buildExpansion('mitap'),
    gavan: buildExpansion('gavan'),
    impuls: buildExpansion('impuls'),
    echo: buildExpansion('echo'),
  },
} as const;

export function getPersonalPlanCycleExpansion(
  planId: PersonalPlanExpansionId,
): PersonalPlanCycleExpansion {
  return PERSONAL_PLAN_CYCLE_EXPANSION_SPEC.plans[planId];
}
