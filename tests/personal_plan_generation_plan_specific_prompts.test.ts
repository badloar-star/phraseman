import {
  PLAN_SPECIFIC_GENERATION_PROMPTS,
  buildPlanSpecificGenerationPromptPacket,
  validatePlanSpecificGenerationPromptPacket,
} from '../app/personal_plan_generation_plan_specific_prompts';

describe('personal plan generation plan-specific prompts', () => {
  it('defines separate prompts for every Personal Plan instead of one generic generator prompt', () => {
    expect(Object.keys(PLAN_SPECIFIC_GENERATION_PROMPTS).sort()).toEqual([
      'echo',
      'gavan',
      'impuls',
      'mitap',
      'voyazh',
    ]);

    const promptTexts = Object.values(PLAN_SPECIFIC_GENERATION_PROMPTS).map((prompt) => prompt.promptText);
    expect(new Set(promptTexts).size).toBe(5);

    for (const prompt of Object.values(PLAN_SPECIFIC_GENERATION_PROMPTS)) {
      expect(prompt.promptText).toContain('full maximum day pool');
      expect(prompt.promptText).toContain('initial visible slice');
      expect(prompt.promptText).toContain('lessons are not plan tasks');
      expect(prompt.promptText).toContain('return blockers instead of fake readiness');
      expect(prompt.scenarioRules.length).toBeGreaterThanOrEqual(4);
      expect(prompt.forbiddenPatterns).toEqual(expect.arrayContaining([
        'generic_travel_business_school_mix',
        'lesson_card_language',
        'time_based_task_count',
        'production_ready_claim',
      ]));
      expect(prompt.progressionRules).toEqual(expect.arrayContaining([
        'use_daily_task_set_matrix',
        'vary_initial_visibility_by_selected_time',
        'review_days_must_recall_previous_plan_phrases',
      ]));
    }
  });

  it('keeps each plan scenario-specific', () => {
    expect(PLAN_SPECIFIC_GENERATION_PROMPTS.mitap.scenarioKeywords).toEqual(expect.arrayContaining([
      'meeting',
      'next steps',
      'deadline',
      'owner',
    ]));
    expect(PLAN_SPECIFIC_GENERATION_PROMPTS.voyazh.scenarioKeywords).toEqual(expect.arrayContaining([
      'travel',
      'airport',
      'hotel',
      'help',
    ]));
    expect(PLAN_SPECIFIC_GENERATION_PROMPTS.impuls.scenarioKeywords).toEqual(expect.arrayContaining([
      'spontaneous speech',
      'short story',
      'because',
      'quick answer',
    ]));
    expect(PLAN_SPECIFIC_GENERATION_PROMPTS.echo.scenarioKeywords).toEqual(expect.arrayContaining([
      'listening',
      'repeat',
      'heard',
      'missed',
    ]));
    expect(PLAN_SPECIFIC_GENERATION_PROMPTS.gavan.scenarioKeywords).toEqual(expect.arrayContaining([
      'forms',
      'address',
      'doctor',
      'bank',
    ]));
  });

  it('builds and validates a non-live prompt packet for controlled generation preparation', () => {
    const packet = buildPlanSpecificGenerationPromptPacket();

    expect(packet.kind).toBe('personal_plan_generation_plan_specific_prompt_packet');
    expect(packet.status).toBe('ready_for_internal_quality_gate');
    expect(packet.sourceRuntimeWriteAllowed).toBe(false);
    expect(packet.liveRegistrationAllowed).toBe(false);
    expect(packet.generatedContentCreationAllowed).toBe(false);
    expect(packet.prompts).toHaveLength(5);
    expect(packet.nextRequiredStep).toBe('internal_quality_gate');

    expect(validatePlanSpecificGenerationPromptPacket(packet)).toEqual({
      status: 'valid_non_live_prompt_packet',
      issueCodes: [],
      promptCount: 5,
      sourceRuntimeWriteAllowed: false,
      liveRegistrationAllowed: false,
      nextRequiredStep: 'internal_quality_gate',
    });
  });

  it('blocks missing prompts, generic prompt reuse, unsafe rules, source writes, and generation attempts', () => {
    const packet = buildPlanSpecificGenerationPromptPacket();

    expect(validatePlanSpecificGenerationPromptPacket({
      ...packet,
      prompts: packet.prompts.slice(0, 4),
    }).issueCodes).toContain('missing_plan_prompt');

    expect(validatePlanSpecificGenerationPromptPacket({
      ...packet,
      prompts: packet.prompts.map((prompt) => ({ ...prompt, promptText: packet.prompts[0].promptText })),
    }).issueCodes).toContain('generic_prompt_reuse');

    expect(validatePlanSpecificGenerationPromptPacket({
      ...packet,
      prompts: [{ ...packet.prompts[0], forbiddenPatterns: [] }, ...packet.prompts.slice(1)],
    }).issueCodes).toContain('missing_forbidden_patterns');

    expect(validatePlanSpecificGenerationPromptPacket({
      ...packet,
      sourceRuntimeWriteAllowed: true as any,
    }).issueCodes).toContain('source_runtime_write_not_allowed');

    expect(validatePlanSpecificGenerationPromptPacket({
      ...packet,
      generatedContentCreationAllowed: true as any,
    }).issueCodes).toContain('generated_content_creation_not_allowed');
  });
});
