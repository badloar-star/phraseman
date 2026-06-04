import {
  buildPlaceholderPlanAudioAsset,
  validatePlanAudioAsset,
  type PlanAudioAsset,
} from './personal_plan_audio_asset_readiness';
import {
  buildGavanDay1ContentCandidate,
  type GavanDay1ContentCandidate,
} from './personal_plan_gavan_day1_content_candidate';
import type { GavanDay1PackageDraft } from './personal_plan_gavan_day1_package_draft';

export type GavanDay1ListeningPromptMode = 'listen_choose';

export type GavanDay1ListeningPrompt = {
  id: string;
  phraseId: string;
  contentUnitIds: string[];
  targetText: string;
  mode: GavanDay1ListeningPromptMode;
  focus: 'sound_to_meaning';
  requiredAudio: true;
};

export type GavanDay1ListeningAuthoringPlan = {
  dayId: 'gavan-week1-day1';
  status: 'authoring_plan';
  blockId: string;
  prompts: GavanDay1ListeningPrompt[];
  audioAsset: PlanAudioAsset;
  finalAudioReady: false;
  summary: {
    prompts: number;
    contentUnits: number;
    requiredAudioAssets: number;
  };
};

export type GavanDay1ListeningAuthoringIssueCode =
  | 'listening_prompt_unknown_phrase'
  | 'listening_prompt_text_mismatch'
  | 'listening_prompt_missing_audio_requirement'
  | 'listening_audio_invalid_for_authoring'
  | 'listening_audio_fake_final_claim'
  | 'listening_audio_generated_claim';

export type GavanDay1ListeningAuthoringIssue = {
  code: GavanDay1ListeningAuthoringIssueCode;
  promptId?: string;
  detail: string;
};

export type GavanDay1ListeningAuthoringValidationResult = {
  valid: boolean;
  issues: GavanDay1ListeningAuthoringIssue[];
};

const DAY_ID = 'gavan-week1-day1' as const;
const LISTENING_BLOCK_ID = 'gavan-week1-day1:listening-authoring';

function issue(
  code: GavanDay1ListeningAuthoringIssueCode,
  detail: string,
  promptId?: string,
): GavanDay1ListeningAuthoringIssue {
  return { code, detail, promptId };
}

export function buildGavanDay1ListeningAuthoringPlan(
  contentCandidate: GavanDay1ContentCandidate = buildGavanDay1ContentCandidate(),
): GavanDay1ListeningAuthoringPlan {
  const prompts = contentCandidate.phrases.map((phrase, index) => ({
    id: `gavan-day1-listening-prompt-${index + 1}`,
    phraseId: phrase.id,
    contentUnitIds: [phrase.id],
    targetText: phrase.english,
    mode: 'listen_choose' as const,
    focus: 'sound_to_meaning' as const,
    requiredAudio: true as const,
  }));

  const contentUnitIds = prompts.map((prompt) => prompt.phraseId);
  const audioAsset = buildPlaceholderPlanAudioAsset({
    blockId: LISTENING_BLOCK_ID,
    contentUnitIds,
    targetText: prompts.map((prompt) => prompt.targetText).join(' / '),
  });

  return {
    dayId: DAY_ID,
    status: 'authoring_plan',
    blockId: LISTENING_BLOCK_ID,
    prompts,
    audioAsset,
    finalAudioReady: false,
    summary: {
      prompts: prompts.length,
      contentUnits: contentUnitIds.length,
      requiredAudioAssets: 1,
    },
  };
}

export function validateGavanDay1ListeningAuthoringPlan(
  plan: GavanDay1ListeningAuthoringPlan,
  contentCandidate: GavanDay1ContentCandidate = buildGavanDay1ContentCandidate(),
): GavanDay1ListeningAuthoringValidationResult {
  const issues: GavanDay1ListeningAuthoringIssue[] = [];
  const phraseById = new Map(contentCandidate.phrases.map((phrase) => [phrase.id, phrase]));

  plan.prompts.forEach((prompt) => {
    const phrase = phraseById.get(prompt.phraseId);
    if (!phrase) {
      issues.push(issue(
        'listening_prompt_unknown_phrase',
        'Listening prompt must reference a phrase from the current day candidate.',
        prompt.id,
      ));
      return;
    }

    if (prompt.contentUnitIds.length !== 1 || prompt.contentUnitIds[0] !== prompt.phraseId) {
      issues.push(issue(
        'listening_prompt_missing_audio_requirement',
        'Listening prompt must point to exactly one candidate phrase content unit.',
        prompt.id,
      ));
    }

    if (prompt.targetText !== phrase.english) {
      issues.push(issue(
        'listening_prompt_text_mismatch',
        'Listening prompt target text must match the candidate phrase text.',
        prompt.id,
      ));
    }

    if (!plan.audioAsset.contentUnitIds.includes(prompt.phraseId)) {
      issues.push(issue(
        'listening_prompt_missing_audio_requirement',
        'Listening prompt must be covered by the declared placeholder audio requirement.',
        prompt.id,
      ));
    }
  });

  const audioReadiness = validatePlanAudioAsset(plan.audioAsset);
  if (!audioReadiness.validForAuthoring) {
    issues.push(issue(
      'listening_audio_invalid_for_authoring',
      `Listening audio authoring asset is invalid: ${audioReadiness.issues.map((item) => item.code).join(', ')}.`,
    ));
  }

  if (audioReadiness.issues.some((item) => item.code === 'fake_final_audio_claim')) {
    issues.push(issue(
      'listening_audio_fake_final_claim',
      'Listening authoring may request audio, but cannot claim final audio before approval.',
    ));
  }

  if (plan.audioAsset.status === 'generated' || plan.audioAsset.status === 'approved') {
    issues.push(issue(
      'listening_audio_generated_claim',
      'Listening authoring can request audio, but generated or approved media belongs to the final asset pipeline.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function attachGavanDay1ListeningAuthoringToDraft(
  draft: GavanDay1PackageDraft,
  authoringPlan: GavanDay1ListeningAuthoringPlan = buildGavanDay1ListeningAuthoringPlan(),
): GavanDay1PackageDraft {
  return {
    ...draft,
    readinessInput: {
      ...draft.readinessInput,
      audioRequirementsByBlockId: {
        ...draft.readinessInput.audioRequirementsByBlockId,
        [authoringPlan.blockId]: authoringPlan.audioAsset,
      },
    },
  };
}
