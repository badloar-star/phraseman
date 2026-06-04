import {
  buildGavanDay1ContentCandidate,
  validateGavanDay1ContentCandidate,
  type GavanDay1ContentCandidate,
} from './personal_plan_gavan_day1_content_candidate';
import {
  buildGavanDay1PackageDraft,
  type GavanDay1PackageDraft,
} from './personal_plan_gavan_day1_package_draft';
import {
  buildGavanDay1ProductionBridge,
  type GavanDay1ProductionBridge,
  type GavanDay1ProductionBridgeIssue,
} from './personal_plan_gavan_day1_production_bridge';

export type GavanDay1ReleaseFixtureSection =
  | 'content'
  | 'package'
  | 'quiz'
  | 'copy'
  | 'audio'
  | 'pronunciation';

export type GavanDay1ReleaseFixture = {
  kind: 'candidate_release_gate';
  liveIntegration: false;
  contentCandidate: GavanDay1ContentCandidate;
  draft: GavanDay1PackageDraft;
  bridge: GavanDay1ProductionBridge;
  release: {
    sections: GavanDay1ReleaseFixtureSection[];
    productionCanRelease: boolean;
    blockedSections: string[];
    acceptedNotRequiredSections: string[];
  };
};

export type GavanDay1ReleaseEvidenceDecision = {
  label: 'go' | 'hold';
  canRelease: boolean;
  blockedSections: string[];
  acceptedNotRequiredSections: string[];
};

export type GavanDay1ReleaseEvidenceSection = {
  section: GavanDay1ReleaseFixtureSection;
  status: 'ready' | 'blocked' | 'not_required';
  required: boolean;
  acceptedNotRequired: boolean;
  issueCodes: string[];
  counts: Record<string, number>;
  reviewerMessage: string;
};

export type GavanDay1ReleaseEvidenceCopyPreview = {
  blockId: string;
  label: string;
  body: string;
};

export type GavanDay1ReleaseEvidence = {
  kind: 'candidate_release_evidence';
  dayId: 'gavan-week1-day1';
  liveIntegration: false;
  candidate: {
    contentSource: GavanDay1PackageDraft['content']['source'];
    candidateStatus?: GavanDay1ContentCandidate['status'];
    phraseCount: number;
    quizItemCount: number;
    quizChoiceCount: number;
    quizExplanationRequirements: number;
    taskReasonCopies: number;
    contentQualityValid: boolean;
  };
  decision: GavanDay1ReleaseEvidenceDecision;
  sections: GavanDay1ReleaseEvidenceSection[];
  copyPreview: GavanDay1ReleaseEvidenceCopyPreview[];
};

export type GavanDay1ReleaseFixtureInput = {
  contentCandidate?: GavanDay1ContentCandidate;
  draft?: GavanDay1PackageDraft;
};

export type GavanDay1ReleaseFixtureIssueCode =
  | 'not_candidate_release_gate'
  | 'live_integration_enabled'
  | 'invalid_content_candidate'
  | 'content_not_approved'
  | 'package_not_ready'
  | 'quiz_not_ready'
  | 'copy_not_ready'
  | 'audio_not_ready'
  | 'pronunciation_not_ready'
  | 'production_not_releasable';

export type GavanDay1ReleaseFixtureIssue = {
  code: GavanDay1ReleaseFixtureIssueCode;
  section?: GavanDay1ReleaseFixtureSection | 'production';
  detail: string;
};

export type GavanDay1ReleaseFixtureValidationResult = {
  valid: boolean;
  issues: GavanDay1ReleaseFixtureIssue[];
};

const RELEASE_SECTIONS: GavanDay1ReleaseFixtureSection[] = [
  'content',
  'package',
  'quiz',
  'copy',
  'audio',
  'pronunciation',
];

const REQUIRED_SECTIONS = new Set<GavanDay1ReleaseFixtureSection>([
  'content',
  'package',
  'quiz',
  'copy',
]);

function issue(
  code: GavanDay1ReleaseFixtureIssueCode,
  detail: string,
  section?: GavanDay1ReleaseFixtureIssue['section'],
): GavanDay1ReleaseFixtureIssue {
  return { code, detail, section };
}

function codeForBridgeIssue(
  bridgeIssue: GavanDay1ProductionBridgeIssue,
): GavanDay1ReleaseFixtureIssueCode {
  if (bridgeIssue.section === 'content') return 'content_not_approved';
  if (bridgeIssue.section === 'package') return 'package_not_ready';
  if (bridgeIssue.section === 'quiz') return 'quiz_not_ready';
  if (bridgeIssue.section === 'copy') return 'copy_not_ready';
  if (bridgeIssue.section === 'audio') return 'audio_not_ready';
  return 'pronunciation_not_ready';
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function bridgeIssueCodesForSection(
  fixture: GavanDay1ReleaseFixture,
  section: GavanDay1ReleaseFixtureSection,
): string[] {
  return fixture.bridge.issues
    .filter((item) => item.section === section)
    .map((item) => item.code);
}

function sectionStatus(
  fixture: GavanDay1ReleaseFixture,
  section: GavanDay1ReleaseFixtureSection,
): GavanDay1ReleaseEvidenceSection['status'] {
  return fixture.bridge[section].status;
}

function sectionIssueCodes(
  fixture: GavanDay1ReleaseFixture,
  section: GavanDay1ReleaseFixtureSection,
): string[] {
  if (section === 'content') {
    return unique([
      ...fixture.draft.content.qualityIssueCodes,
      ...bridgeIssueCodesForSection(fixture, section),
    ]);
  }

  return unique([
    ...fixture.bridge[section].issues,
    ...bridgeIssueCodesForSection(fixture, section),
  ]);
}

function sectionCounts(
  fixture: GavanDay1ReleaseFixture,
  section: GavanDay1ReleaseFixtureSection,
): Record<string, number> {
  if (section === 'content') {
    return {
      phrases: fixture.draft.content.phrases.length,
      qualityIssues: fixture.draft.content.qualityIssueCodes.length,
    };
  }

  if (section === 'package') {
    return {
      blocks: fixture.bridge.package.blocks,
      issues: fixture.bridge.package.issues.length,
    };
  }

  if (section === 'quiz') {
    return {
      items: fixture.bridge.quiz.items,
      choices: fixture.bridge.quiz.choices,
      explanationRequirements: fixture.bridge.quiz.explanationRequirements,
      issues: fixture.bridge.quiz.issues.length,
    };
  }

  if (section === 'copy') {
    return {
      blocks: fixture.bridge.copy.blocks,
      copies: fixture.bridge.copy.copies,
      issues: fixture.bridge.copy.issues.length,
    };
  }

  if (section === 'audio') {
    return {
      requirements: fixture.bridge.audio.requirements,
      finalReadyClaims: fixture.bridge.audio.finalReadyClaims,
      issues: fixture.bridge.audio.issues.length,
    };
  }

  return {
    requirements: fixture.bridge.pronunciation.requirements,
    finalScoringClaims: fixture.bridge.pronunciation.finalScoringClaims,
    issues: fixture.bridge.pronunciation.issues.length,
  };
}

function reviewerMessage(
  status: GavanDay1ReleaseEvidenceSection['status'],
  issueCodes: string[],
): string {
  if (status === 'ready') return 'Ready: release evidence passed for this section.';
  if (status === 'not_required') return 'Accepted: this section is not required for the current candidate.';
  return `Blocked: ${issueCodes.length > 0 ? issueCodes.join(', ') : 'section is not ready'}.`;
}

function buildSectionEvidence(
  fixture: GavanDay1ReleaseFixture,
  section: GavanDay1ReleaseFixtureSection,
): GavanDay1ReleaseEvidenceSection {
  const status = sectionStatus(fixture, section);
  const issueCodes = sectionIssueCodes(fixture, section);

  return {
    section,
    status,
    required: REQUIRED_SECTIONS.has(section) || sectionCounts(fixture, section).requirements > 0,
    acceptedNotRequired: fixture.release.acceptedNotRequiredSections.includes(section),
    issueCodes,
    counts: sectionCounts(fixture, section),
    reviewerMessage: reviewerMessage(status, issueCodes),
  };
}

function buildCopyPreview(
  fixture: GavanDay1ReleaseFixture,
): GavanDay1ReleaseEvidenceCopyPreview[] {
  return Object.entries(fixture.draft.personalization.taskReasonCopy.copiesByBlockId)
    .flatMap(([blockId, copies]) =>
      copies.map((copy) => ({
        blockId,
        label: copy.label,
        body: copy.body,
      })),
    );
}

export function buildGavanDay1ReleaseFixture(
  input: GavanDay1ReleaseFixtureInput = {},
): GavanDay1ReleaseFixture {
  const contentCandidate = input.contentCandidate ?? buildGavanDay1ContentCandidate();
  const draft = input.draft ?? buildGavanDay1PackageDraft({ contentCandidate });
  const bridge = buildGavanDay1ProductionBridge({
    draft,
    contentApproval: 'approved',
  });

  return {
    kind: 'candidate_release_gate',
    liveIntegration: false,
    contentCandidate,
    draft,
    bridge,
    release: {
      sections: [...RELEASE_SECTIONS],
      productionCanRelease: bridge.production.canRelease,
      blockedSections: [...bridge.production.blockedSections],
      acceptedNotRequiredSections: [...bridge.production.acceptedNotRequiredSections],
    },
  };
}

export function buildGavanDay1ReleaseEvidence(
  fixture: GavanDay1ReleaseFixture = buildGavanDay1ReleaseFixture(),
): GavanDay1ReleaseEvidence {
  return {
    kind: 'candidate_release_evidence',
    dayId: fixture.draft.dayId,
    liveIntegration: false,
    candidate: {
      contentSource: fixture.draft.content.source,
      candidateStatus: fixture.draft.content.candidateStatus,
      phraseCount: fixture.draft.summary.contentPhrases,
      quizItemCount: fixture.bridge.quiz.items,
      quizChoiceCount: fixture.bridge.quiz.choices,
      quizExplanationRequirements: fixture.bridge.quiz.explanationRequirements,
      taskReasonCopies: fixture.draft.summary.taskReasonCopies,
      contentQualityValid: fixture.draft.content.qualityValid,
    },
    decision: {
      label: fixture.release.productionCanRelease ? 'go' : 'hold',
      canRelease: fixture.release.productionCanRelease,
      blockedSections: [...fixture.release.blockedSections],
      acceptedNotRequiredSections: [...fixture.release.acceptedNotRequiredSections],
    },
    sections: fixture.release.sections.map((section) =>
      buildSectionEvidence(fixture, section),
    ),
    copyPreview: buildCopyPreview(fixture),
  };
}

export function validateGavanDay1ReleaseFixture(
  fixture: GavanDay1ReleaseFixture,
): GavanDay1ReleaseFixtureValidationResult {
  const issues: GavanDay1ReleaseFixtureIssue[] = [];
  const contentValidation = validateGavanDay1ContentCandidate(fixture.contentCandidate);

  if (fixture.kind !== 'candidate_release_gate') {
    issues.push(issue(
      'not_candidate_release_gate',
      'Release fixture must stay explicitly marked as a candidate release gate.',
      'production',
    ));
  }

  if (fixture.liveIntegration !== false) {
    issues.push(issue(
      'live_integration_enabled',
      'Release fixture must not integrate with live product registries.',
      'production',
    ));
  }

  if (!contentValidation.valid || !fixture.draft.content.qualityValid) {
    issues.push(issue(
      'invalid_content_candidate',
      'Candidate content must pass its content quality gate before release evaluation.',
      'content',
    ));
  }

  fixture.bridge.issues.forEach((bridgeIssue) => {
    issues.push(issue(
      codeForBridgeIssue(bridgeIssue),
      bridgeIssue.detail,
      bridgeIssue.section,
    ));
  });

  if (!fixture.bridge.production.canRelease) {
    issues.push(issue(
      'production_not_releasable',
      'Candidate day 1 cannot release until every bridge section is ready or honestly not required.',
      'production',
    ));
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}
