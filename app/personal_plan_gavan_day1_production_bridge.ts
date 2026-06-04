import {
  buildGavanDay1PackageDraft,
  validateGavanDay1PackageDraft,
  type GavanDay1PackageDraft,
} from './personal_plan_gavan_day1_package_draft';
import { validateGavanDay1QuizDraft } from './personal_plan_gavan_day1_quiz_draft';
import { validatePlanAudioAsset } from './personal_plan_audio_asset_readiness';
import { validatePlanPronunciationScoringRequirement } from './personal_plan_pronunciation_readiness';

export type GavanDay1ProductionBridgeStatus = 'ready' | 'blocked';
export type GavanDay1ProductionBridgeSectionStatus = 'ready' | 'blocked' | 'not_required';
export type GavanDay1ContentApprovalStatus = 'draft' | 'approved';

export type GavanDay1ProductionBridgeIssueCode =
  | 'scaffold_content_not_approved'
  | 'package_gate_failed'
  | 'quiz_gate_failed'
  | 'copy_gate_failed'
  | 'audio_not_production_ready'
  | 'fake_final_audio_claim'
  | 'pronunciation_scoring_not_ready'
  | 'fake_final_pronunciation_claim';

export type GavanDay1ProductionBridgeIssue = {
  code: GavanDay1ProductionBridgeIssueCode;
  section: 'content' | 'package' | 'quiz' | 'copy' | 'audio' | 'pronunciation';
  detail: string;
};

export type GavanDay1ProductionBridge = {
  dayId: 'gavan-week1-day1';
  status: GavanDay1ProductionBridgeStatus;
  content: {
    status: GavanDay1ProductionBridgeSectionStatus;
    approval: GavanDay1ContentApprovalStatus;
  };
  package: {
    status: GavanDay1ProductionBridgeSectionStatus;
    blocks: number;
    issues: string[];
  };
  quiz: {
    status: GavanDay1ProductionBridgeSectionStatus;
    items: number;
    choices: number;
    explanationRequirements: number;
    issues: string[];
  };
  copy: {
    status: GavanDay1ProductionBridgeSectionStatus;
    blocks: number;
    copies: number;
    issues: string[];
  };
  audio: {
    status: GavanDay1ProductionBridgeSectionStatus;
    requirements: number;
    productionReady: boolean;
    finalReadyClaims: number;
    issues: string[];
  };
  pronunciation: {
    status: GavanDay1ProductionBridgeSectionStatus;
    requirements: number;
    scoringAvailable: boolean;
    finalScoringClaims: number;
    issues: string[];
  };
  production: {
    status: GavanDay1ProductionBridgeStatus;
    canRelease: boolean;
    requiredReadySections: string[];
    acceptedNotRequiredSections: string[];
    blockedSections: string[];
    criteria: {
      contentApproved: boolean;
      packageReady: boolean;
      quizReady: boolean;
      copyReady: boolean;
      audioAcceptable: boolean;
      pronunciationAcceptable: boolean;
    };
  };
  issues: GavanDay1ProductionBridgeIssue[];
  summary: {
    status: GavanDay1ProductionBridgeStatus;
    headline: string;
    blockers: string[];
    ready: string[];
  };
};

export type GavanDay1ProductionBridgeInput = {
  draft?: GavanDay1PackageDraft;
  contentApproval?: GavanDay1ContentApprovalStatus;
};

export type GavanDay1ProductionBridgeValidationResult = {
  valid: boolean;
  issues: GavanDay1ProductionBridgeIssue[];
};

function issue(
  code: GavanDay1ProductionBridgeIssueCode,
  section: GavanDay1ProductionBridgeIssue['section'],
  detail: string,
): GavanDay1ProductionBridgeIssue {
  return { code, section, detail };
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function buildSummary(
  issues: GavanDay1ProductionBridgeIssue[],
): GavanDay1ProductionBridge['summary'] {
  const blockers = unique(issues.map((item) => item.section));
  const allSections = ['content', 'package', 'quiz', 'copy', 'audio', 'pronunciation'];
  const ready = allSections.filter((section) => !blockers.includes(section));
  const status: GavanDay1ProductionBridgeStatus = blockers.length === 0 ? 'ready' : 'blocked';

  return {
    status,
    headline: status === 'ready'
      ? 'Gavan day 1 is production-ready.'
      : 'Gavan day 1 is not production-ready yet.',
    blockers,
    ready,
  };
}

function contentStatus(
  approval: GavanDay1ContentApprovalStatus,
  issues: GavanDay1ProductionBridgeIssue[],
): GavanDay1ProductionBridge['content'] {
  if (approval !== 'approved') {
    issues.push(issue(
      'scaffold_content_not_approved',
      'content',
      'Day 1 content is still draft/scaffold and needs explicit approval before production integration.',
    ));
  }

  return {
    approval,
    status: approval === 'approved' ? 'ready' : 'blocked',
  };
}

function packageStatus(
  draft: GavanDay1PackageDraft,
  issues: GavanDay1ProductionBridgeIssue[],
): GavanDay1ProductionBridge['package'] {
  const validation = validateGavanDay1PackageDraft(draft);

  if (!validation.valid) {
    issues.push(issue(
      'package_gate_failed',
      'package',
      `Day 1 package draft failed: ${validation.issues.map((item) => item.code).join(', ')}.`,
    ));
  }

  return {
    status: validation.valid ? 'ready' : 'blocked',
    blocks: draft.blocks.length,
    issues: validation.issues.map((item) => item.code),
  };
}

function copyStatus(
  draft: GavanDay1PackageDraft,
  issues: GavanDay1ProductionBridgeIssue[],
): GavanDay1ProductionBridge['copy'] {
  const copy = draft.personalization.taskReasonCopy;

  if (!copy.valid) {
    issues.push(issue(
      'copy_gate_failed',
      'copy',
      `Task reason copy failed: ${copy.issues.map((item) => item.code).join(', ')}.`,
    ));
  }

  return {
    status: copy.valid ? 'ready' : 'blocked',
    blocks: copy.summary.blocks,
    copies: copy.summary.copies,
    issues: copy.issues.map((item) => item.code),
  };
}

function quizStatus(
  draft: GavanDay1PackageDraft,
  issues: GavanDay1ProductionBridgeIssue[],
): GavanDay1ProductionBridge['quiz'] {
  const validation = validateGavanDay1QuizDraft(draft.quizDraft, {
    contentPhrases: draft.content.phrases,
    candidateCopyGate: draft.content.source === 'candidate',
  });
  const issueCodes = validation.issues.map((item) => item.code);

  if (!validation.valid) {
    issues.push(issue(
      'quiz_gate_failed',
      'quiz',
      `Day 1 quiz draft failed: ${issueCodes.join(', ')}.`,
    ));
  }

  return {
    status: validation.valid ? 'ready' : 'blocked',
    items: validation.summary.items,
    choices: validation.summary.choices,
    explanationRequirements: validation.summary.explanationRequirements,
    issues: issueCodes,
  };
}

function audioStatus(
  draft: GavanDay1PackageDraft,
  issues: GavanDay1ProductionBridgeIssue[],
): GavanDay1ProductionBridge['audio'] {
  const requirements = Object.values(draft.readinessInput.audioRequirementsByBlockId);
  const readinessByRequirement = requirements.map((requirement) =>
    validatePlanAudioAsset(requirement),
  );
  const audioIssues = readinessByRequirement.flatMap((readiness) =>
    readiness.issues.map((item) => item.code),
  );
  const productionReady = requirements.length === 0 ||
    readinessByRequirement.every((readiness) => readiness.productionReady);
  const finalReadyClaims = requirements.filter((requirement) => requirement.finalAssetReady).length +
    (draft.mediaClaims.audioFinalReady ? 1 : 0);
  const fakeFinalClaims = audioIssues.filter((code) => code === 'fake_final_audio_claim').length +
    (draft.mediaClaims.audioFinalReady ? 1 : 0);
  const sectionIssues = [
    ...audioIssues,
    ...(requirements.length > 0 && !productionReady ? ['audio_not_production_ready'] : []),
  ];

  if (fakeFinalClaims > 0) {
    issues.push(issue(
      'fake_final_audio_claim',
      'audio',
      'Day 1 cannot claim final generated audio before approved audio assets exist.',
    ));
  }

  if (requirements.length > 0 && !productionReady) {
    issues.push(issue(
      'audio_not_production_ready',
      'audio',
      'Audio requirements exist but are not production-ready.',
    ));
  }

  return {
    status: requirements.length === 0 && fakeFinalClaims === 0
      ? 'not_required'
      : productionReady && fakeFinalClaims === 0 ? 'ready' : 'blocked',
    requirements: requirements.length,
    productionReady,
    finalReadyClaims,
    issues: unique(sectionIssues),
  };
}

function pronunciationStatus(
  draft: GavanDay1PackageDraft,
  issues: GavanDay1ProductionBridgeIssue[],
): GavanDay1ProductionBridge['pronunciation'] {
  const requirements = Object.values(draft.readinessInput.pronunciationRequirementsByExerciseId);
  const readinessByRequirement = requirements.map((requirement) =>
    validatePlanPronunciationScoringRequirement(requirement),
  );
  const pronunciationIssues = readinessByRequirement.flatMap((readiness) =>
    readiness.issues.map((item) => item.code),
  );
  const finalScoringClaims = requirements.filter((requirement) => requirement.finalScoringReady).length +
    (draft.mediaClaims.pronunciationFinalScoringReady ? 1 : 0);
  const fakeFinalClaims =
    pronunciationIssues.filter((code) => code === 'fake_final_pronunciation_claim').length +
    (draft.mediaClaims.pronunciationFinalScoringReady ? 1 : 0);
  const scoringAvailable = requirements.length > 0 &&
    readinessByRequirement.every((readiness) => readiness.productionReady);
  const sectionIssues = [
    ...pronunciationIssues,
    ...(requirements.length > 0 && !scoringAvailable ? ['pronunciation_scoring_not_ready'] : []),
  ];

  if (fakeFinalClaims > 0) {
    issues.push(issue(
      'fake_final_pronunciation_claim',
      'pronunciation',
      'Day 1 cannot claim final pronunciation scoring before scoring is implemented.',
    ));
  }

  if (requirements.length > 0 && !scoringAvailable) {
    issues.push(issue(
      'pronunciation_scoring_not_ready',
      'pronunciation',
      'Pronunciation requirements exist but scoring is not ready.',
    ));
  }

  return {
    status: requirements.length === 0 && fakeFinalClaims === 0
      ? 'not_required'
      : scoringAvailable && fakeFinalClaims === 0 ? 'ready' : 'blocked',
    requirements: requirements.length,
    scoringAvailable,
    finalScoringClaims,
    issues: unique(sectionIssues),
  };
}

function productionStatus(
  bridge: Pick<
    GavanDay1ProductionBridge,
    'content' | 'package' | 'quiz' | 'copy' | 'audio' | 'pronunciation'
  >,
): GavanDay1ProductionBridge['production'] {
  const criteria = {
    contentApproved: bridge.content.status === 'ready',
    packageReady: bridge.package.status === 'ready',
    quizReady: bridge.quiz.status === 'ready',
    copyReady: bridge.copy.status === 'ready',
    audioAcceptable: bridge.audio.status === 'ready' || bridge.audio.status === 'not_required',
    pronunciationAcceptable: bridge.pronunciation.status === 'ready' ||
      bridge.pronunciation.status === 'not_required',
  };
  const blockedSections = [
    ...(!criteria.contentApproved ? ['content'] : []),
    ...(!criteria.packageReady ? ['package'] : []),
    ...(!criteria.quizReady ? ['quiz'] : []),
    ...(!criteria.copyReady ? ['copy'] : []),
    ...(!criteria.audioAcceptable ? ['audio'] : []),
    ...(!criteria.pronunciationAcceptable ? ['pronunciation'] : []),
  ];
  const canRelease = blockedSections.length === 0;

  return {
    status: canRelease ? 'ready' : 'blocked',
    canRelease,
    requiredReadySections: ['content', 'package', 'quiz', 'copy'],
    acceptedNotRequiredSections: [
      ...(bridge.audio.status === 'not_required' ? ['audio'] : []),
      ...(bridge.pronunciation.status === 'not_required' ? ['pronunciation'] : []),
    ],
    blockedSections,
    criteria,
  };
}

export function buildGavanDay1ProductionBridge(
  input: GavanDay1ProductionBridgeInput = {},
): GavanDay1ProductionBridge {
  const draft = input.draft ?? buildGavanDay1PackageDraft();
  const issues: GavanDay1ProductionBridgeIssue[] = [];

  const content = contentStatus(input.contentApproval ?? 'draft', issues);
  const packageReadiness = packageStatus(draft, issues);
  const quiz = quizStatus(draft, issues);
  const copy = copyStatus(draft, issues);
  const audio = audioStatus(draft, issues);
  const pronunciation = pronunciationStatus(draft, issues);
  const production = productionStatus({
    content,
    package: packageReadiness,
    quiz,
    copy,
    audio,
    pronunciation,
  });
  const summary = buildSummary(issues);

  return {
    dayId: 'gavan-week1-day1',
    status: summary.status,
    content,
    package: packageReadiness,
    quiz,
    copy,
    audio,
    pronunciation,
    production,
    issues,
    summary,
  };
}

export function validateGavanDay1ProductionBridge(
  bridge: GavanDay1ProductionBridge,
): GavanDay1ProductionBridgeValidationResult {
  return {
    valid: bridge.status === 'ready' && bridge.issues.length === 0,
    issues: bridge.issues,
  };
}
