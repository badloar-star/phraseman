import {
  buildGavanDay1ContentCandidate,
  validateGavanDay1ContentCandidate,
  type GavanDay1ContentCandidate,
} from './personal_plan_gavan_day1_content_candidate';
import {
  buildGavanDay1PackageDraft,
  validateGavanDay1PackageDraft,
  type GavanDay1PackageDraft,
} from './personal_plan_gavan_day1_package_draft';
import {
  validateGavanDay1QuizDraft,
} from './personal_plan_gavan_day1_quiz_draft';
import {
  buildGavanDay1ReleaseEvidence,
  buildGavanDay1ReleaseFixture,
  type GavanDay1ReleaseEvidence,
} from './personal_plan_gavan_day1_release_fixture';
import {
  attachGavanDay1ListeningAuthoringToDraft,
  buildGavanDay1ListeningAuthoringPlan,
  validateGavanDay1ListeningAuthoringPlan,
} from './personal_plan_gavan_day1_listening_authoring';
import {
  attachGavanDay1PronunciationAuthoringToDraft,
  buildGavanDay1PronunciationAuthoringPlan,
  validateGavanDay1PronunciationAuthoringPlan,
} from './personal_plan_gavan_day1_pronunciation_authoring';

export type GavanDay1AuthoringBundleSectionStatus = 'ready' | 'blocked' | 'planned';

export type GavanDay1AuthoringBundleChecklistItem = {
  id:
    | 'content'
    | 'package'
    | 'quiz'
    | 'explanations'
    | 'listening'
    | 'pronunciation'
    | 'release';
  status: GavanDay1AuthoringBundleSectionStatus;
  issueCodes: string[];
};

export type GavanDay1AuthoringBundle = {
  kind: 'gavan_day1_authoring_readiness_bundle';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  content: {
    source: GavanDay1PackageDraft['content']['source'];
    candidateStatus?: GavanDay1ContentCandidate['status'];
    phraseCount: number;
    focusTags: string[];
    exerciseGoals: string[];
    qualityValid: boolean;
    qualityIssueCodes: string[];
  };
  package: {
    blockCount: number;
    explanationRequirementCount: number;
    valid: boolean;
    issueCodes: string[];
  };
  quiz: {
    itemCount: number;
    choiceCount: number;
    explanationRequirementCount: number;
    valid: boolean;
    issueCodes: string[];
  };
  explanations: {
    requiredCount: number;
    coveredPhraseCount: number;
    coverageTargets: number;
  };
  listening: {
    planned: true;
    attachedToRelease: boolean;
    promptCount: number;
    contentUnits: number;
    requiredAudioAssets: number;
    authoringValid: boolean;
    issueCodes: string[];
    releaseSectionStatus: GavanDay1ReleaseEvidence['sections'][number]['status'];
    productionBlocked: boolean;
    productionIssueCodes: string[];
  };
  pronunciation: {
    planned: true;
    attachedToRelease: boolean;
    targetCount: number;
    contentUnits: number;
    requiredScoringRequirements: number;
    authoringValid: boolean;
    issueCodes: string[];
    releaseSectionStatus: GavanDay1ReleaseEvidence['sections'][number]['status'];
    productionBlocked: boolean;
    productionIssueCodes: string[];
  };
  releaseEvidence: GavanDay1ReleaseEvidence;
  reviewerChecklist: GavanDay1AuthoringBundleChecklistItem[];
};

export type GavanDay1AuthoringBundleOptions = {
  contentCandidate?: GavanDay1ContentCandidate;
  draft?: GavanDay1PackageDraft;
  attachListeningToRelease?: boolean;
  attachPronunciationToRelease?: boolean;
};

export type GavanDay1AuthoringBundleIssueCode =
  | 'wrong_bundle_kind'
  | 'wrong_day_id'
  | 'live_integration_enabled'
  | 'content_not_ready'
  | 'package_not_ready'
  | 'quiz_not_ready'
  | 'explanations_not_ready'
  | 'listening_authoring_not_ready'
  | 'pronunciation_authoring_not_ready'
  | 'release_decision_hides_blockers';

export type GavanDay1AuthoringBundleIssue = {
  code: GavanDay1AuthoringBundleIssueCode;
  detail: string;
};

export type GavanDay1AuthoringBundleValidationResult = {
  valid: boolean;
  issues: GavanDay1AuthoringBundleIssue[];
};

function issue(
  code: GavanDay1AuthoringBundleIssueCode,
  detail: string,
): GavanDay1AuthoringBundleIssue {
  return { code, detail };
}

function releaseSection(
  evidence: GavanDay1ReleaseEvidence,
  section: 'audio' | 'pronunciation',
): GavanDay1ReleaseEvidence['sections'][number] {
  const found = evidence.sections.find((candidate) => candidate.section === section);
  if (!found) {
    throw new Error(`Missing release evidence section: ${section}.`);
  }
  return found;
}

function statusFromValid(valid: boolean): GavanDay1AuthoringBundleSectionStatus {
  return valid ? 'ready' : 'blocked';
}

function releaseStatus(
  evidence: GavanDay1ReleaseEvidence,
): GavanDay1AuthoringBundleSectionStatus {
  return evidence.decision.canRelease ? 'ready' : 'blocked';
}

function buildReviewerChecklist(
  bundle: Omit<GavanDay1AuthoringBundle, 'reviewerChecklist'>,
): GavanDay1AuthoringBundleChecklistItem[] {
  return [
    {
      id: 'content',
      status: statusFromValid(bundle.content.qualityValid),
      issueCodes: [...bundle.content.qualityIssueCodes],
    },
    {
      id: 'package',
      status: statusFromValid(bundle.package.valid),
      issueCodes: [...bundle.package.issueCodes],
    },
    {
      id: 'quiz',
      status: statusFromValid(bundle.quiz.valid),
      issueCodes: [...bundle.quiz.issueCodes],
    },
    {
      id: 'explanations',
      status: bundle.explanations.requiredCount > 0 ? 'ready' : 'blocked',
      issueCodes: bundle.explanations.requiredCount > 0 ? [] : ['explanations_not_ready'],
    },
    {
      id: 'listening',
      status: bundle.listening.productionBlocked
        ? 'blocked'
        : bundle.listening.attachedToRelease ? 'ready' : 'planned',
      issueCodes: [
        ...bundle.listening.issueCodes,
        ...bundle.listening.productionIssueCodes,
      ],
    },
    {
      id: 'pronunciation',
      status: bundle.pronunciation.productionBlocked
        ? 'blocked'
        : bundle.pronunciation.attachedToRelease ? 'ready' : 'planned',
      issueCodes: [
        ...bundle.pronunciation.issueCodes,
        ...bundle.pronunciation.productionIssueCodes,
      ],
    },
    {
      id: 'release',
      status: releaseStatus(bundle.releaseEvidence),
      issueCodes: [...bundle.releaseEvidence.decision.blockedSections],
    },
  ];
}

export function buildGavanDay1AuthoringBundle(
  options: GavanDay1AuthoringBundleOptions = {},
): GavanDay1AuthoringBundle {
  const contentCandidate = options.contentCandidate ?? buildGavanDay1ContentCandidate();
  const contentValidation = validateGavanDay1ContentCandidate(contentCandidate);
  const baseDraft = options.draft ?? buildGavanDay1PackageDraft({ contentCandidate });
  const listeningPlan = buildGavanDay1ListeningAuthoringPlan(contentCandidate);
  const pronunciationPlan = buildGavanDay1PronunciationAuthoringPlan(contentCandidate);
  const listeningValidation =
    validateGavanDay1ListeningAuthoringPlan(listeningPlan, contentCandidate);
  const pronunciationValidation =
    validateGavanDay1PronunciationAuthoringPlan(pronunciationPlan, contentCandidate);

  let releaseDraft = baseDraft;
  if (options.attachListeningToRelease) {
    releaseDraft = attachGavanDay1ListeningAuthoringToDraft(releaseDraft, listeningPlan);
  }
  if (options.attachPronunciationToRelease) {
    releaseDraft = attachGavanDay1PronunciationAuthoringToDraft(
      releaseDraft,
      pronunciationPlan,
    );
  }

  const packageValidation = validateGavanDay1PackageDraft(baseDraft);
  const quizValidation = validateGavanDay1QuizDraft(baseDraft.quizDraft, {
    contentPhrases: baseDraft.content.phrases,
    candidateCopyGate: baseDraft.content.source === 'candidate',
  });
  const releaseEvidence = buildGavanDay1ReleaseEvidence(
    buildGavanDay1ReleaseFixture({
      contentCandidate,
      draft: releaseDraft,
    }),
  );
  const audioSection = releaseSection(releaseEvidence, 'audio');
  const pronunciationSection = releaseSection(releaseEvidence, 'pronunciation');
  const explanationPhraseIds = new Set(
    baseDraft.explanationRequirements.map((requirement) => requirement.phraseId),
  );
  const bundleWithoutChecklist: Omit<GavanDay1AuthoringBundle, 'reviewerChecklist'> = {
    kind: 'gavan_day1_authoring_readiness_bundle',
    dayId: 'gavan-week1-day1',
    liveIntegration: false,
    content: {
      source: baseDraft.content.source,
      candidateStatus: baseDraft.content.candidateStatus,
      phraseCount: contentCandidate.phrases.length,
      focusTags: [...contentCandidate.focusTags],
      exerciseGoals: [...contentCandidate.exerciseGoals],
      qualityValid: contentValidation.valid && baseDraft.content.qualityValid,
      qualityIssueCodes: [
        ...contentValidation.issues.map((item) => item.code),
        ...baseDraft.content.qualityIssueCodes,
      ],
    },
    package: {
      blockCount: baseDraft.blocks.length,
      explanationRequirementCount: baseDraft.explanationRequirements.length,
      valid: packageValidation.valid,
      issueCodes: packageValidation.issues.map((item) => item.code),
    },
    quiz: {
      itemCount: quizValidation.summary.items,
      choiceCount: quizValidation.summary.choices,
      explanationRequirementCount: quizValidation.summary.explanationRequirements,
      valid: quizValidation.valid,
      issueCodes: quizValidation.issues.map((item) => item.code),
    },
    explanations: {
      requiredCount: baseDraft.explanationRequirements.length,
      coveredPhraseCount: explanationPhraseIds.size,
      coverageTargets: baseDraft.explanationRequirements.reduce(
        (sum, requirement) => sum + requirement.covers.length,
        0,
      ),
    },
    listening: {
      planned: true,
      attachedToRelease: Boolean(options.attachListeningToRelease),
      promptCount: listeningPlan.summary.prompts,
      contentUnits: listeningPlan.summary.contentUnits,
      requiredAudioAssets: listeningPlan.summary.requiredAudioAssets,
      authoringValid: listeningValidation.valid,
      issueCodes: listeningValidation.issues.map((item) => item.code),
      releaseSectionStatus: audioSection.status,
      productionBlocked: audioSection.status === 'blocked',
      productionIssueCodes: [...audioSection.issueCodes],
    },
    pronunciation: {
      planned: true,
      attachedToRelease: Boolean(options.attachPronunciationToRelease),
      targetCount: pronunciationPlan.summary.targets,
      contentUnits: pronunciationPlan.summary.contentUnits,
      requiredScoringRequirements: pronunciationPlan.summary.requiredScoringRequirements,
      authoringValid: pronunciationValidation.valid,
      issueCodes: pronunciationValidation.issues.map((item) => item.code),
      releaseSectionStatus: pronunciationSection.status,
      productionBlocked: pronunciationSection.status === 'blocked',
      productionIssueCodes: [...pronunciationSection.issueCodes],
    },
    releaseEvidence,
  };

  return {
    ...bundleWithoutChecklist,
    reviewerChecklist: buildReviewerChecklist(bundleWithoutChecklist),
  };
}

export function validateGavanDay1AuthoringBundle(
  bundle: GavanDay1AuthoringBundle,
): GavanDay1AuthoringBundleValidationResult {
  const issues: GavanDay1AuthoringBundleIssue[] = [];

  if (bundle.kind !== 'gavan_day1_authoring_readiness_bundle') {
    issues.push(issue(
      'wrong_bundle_kind',
      'Day 1 authoring bundle must use the reviewer bundle kind.',
    ));
  }

  if (bundle.dayId !== 'gavan-week1-day1') {
    issues.push(issue('wrong_day_id', 'Day 1 authoring bundle must describe Gavan day 1.'));
  }

  if (bundle.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Authoring bundle must stay outside live product integration.',
    ));
  }

  if (!bundle.content.qualityValid) {
    issues.push(issue('content_not_ready', 'Candidate content must pass the content gate.'));
  }

  if (!bundle.package.valid) {
    issues.push(issue('package_not_ready', 'Package draft must pass the package gate.'));
  }

  if (!bundle.quiz.valid) {
    issues.push(issue('quiz_not_ready', 'Quiz draft must pass the quiz gate.'));
  }

  if (bundle.explanations.requiredCount === 0 || bundle.explanations.coverageTargets === 0) {
    issues.push(issue(
      'explanations_not_ready',
      'Authoring bundle must expose explanation requirements for review.',
    ));
  }

  if (!bundle.listening.authoringValid) {
    issues.push(issue(
      'listening_authoring_not_ready',
      'Listening authoring plan must pass its authoring gate.',
    ));
  }

  if (!bundle.pronunciation.authoringValid) {
    issues.push(issue(
      'pronunciation_authoring_not_ready',
      'Pronunciation authoring plan must pass its authoring gate.',
    ));
  }

  const attachedBlockedSections = [
    ...(bundle.listening.attachedToRelease && bundle.listening.productionBlocked
      ? ['audio']
      : []),
    ...(bundle.pronunciation.attachedToRelease && bundle.pronunciation.productionBlocked
      ? ['pronunciation']
      : []),
  ];
  const hiddenBlocker = attachedBlockedSections.some((section) =>
    !bundle.releaseEvidence.decision.blockedSections.includes(section),
  );

  if (
    attachedBlockedSections.length > 0 &&
    (bundle.releaseEvidence.decision.canRelease || hiddenBlocker)
  ) {
    issues.push(issue(
      'release_decision_hides_blockers',
      'Release evidence cannot mark the day releasable while attached media authoring blockers exist.',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
