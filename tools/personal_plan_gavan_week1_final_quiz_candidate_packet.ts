import { mkdirSync, writeFileSync } from 'fs';
import path from 'path';

import type {
  GavanWeek1SignedApprovalHandoffPacket,
} from './personal_plan_gavan_week1_signed_approval_handoff_packet';

export const GAVAN_WEEK1_FINAL_QUIZ_CANDIDATE_PACKET_PATH = path.join(
  process.cwd(),
  '.codex-tmp',
  'personal-plans',
  'gavan-week1-final-quiz-candidate-packet.json',
);

const ALLOWED_TARGET_ROOTS = [
  ['.codex-tmp'],
  ['docs', 'reports'],
];

const EXPECTED_DAY_IDS = [
  'gavan-week1-day1',
  'gavan-week1-day2',
  'gavan-week1-day3',
  'gavan-week1-day4',
  'gavan-week1-day5',
  'gavan-week1-day6',
  'gavan-week1-day7',
] as const;

export type GavanWeek1FinalQuizCandidatePacketStatus =
  'final_quiz_candidates_not_live_not_registered';

export type GavanWeek1FinalQuizCandidateIssueCode =
  | 'wrong_handoff_kind'
  | 'wrong_plan_or_week'
  | 'handoff_not_blocked'
  | 'handoff_already_approved'
  | 'material_export_packets_incomplete'
  | 'material_export_packet_not_blocked'
  | 'material_export_phrase_coverage_incomplete'
  | 'target_path_not_allowed';

export type GavanWeek1FinalQuizCandidateIssue = {
  code: GavanWeek1FinalQuizCandidateIssueCode;
  detail: string;
};

export type GavanWeek1FinalQuizCandidatePacketOptions = {
  generatedAt: string;
};

export type GavanWeek1FinalQuizCandidatePacketWriteOptions =
  GavanWeek1FinalQuizCandidatePacketOptions & {
    targetPath: string;
  };

export type GavanWeek1MaterialExportQuizCandidateInput = {
  kind: string;
  dayId: string;
  status: string;
  liveIntegration: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  reviewerSummary: {
    quizBlueprintCount: number;
    phraseCount: number;
  };
  preview: {
    titleRu: string;
    phrases: Array<{
      english: string;
      meaningRu: string;
    }>;
    quizLine: string;
  };
};

export type GavanWeek1FinalQuizQuestionCandidate = {
  id: string;
  promptRu: string;
  answerEnglish: string;
  choices: string[];
  correctIndex: 0;
  inputModes: ['choice', 'typing'];
  source: {
    type: 'material_export_phrase';
    dayId: string;
    phraseEnglish: string;
  };
  registeredInQuizSource: false;
};

export type GavanWeek1FinalQuizCandidate = {
  quizId: string;
  dayId: string;
  dayIndex: number;
  titleRu: string;
  questionCount: 10;
  questions: GavanWeek1FinalQuizQuestionCandidate[];
  inputModes: ['choice', 'typing'];
  taskCopyLocales: ['ru', 'uk', 'es'];
  coverageStatus: 'covers_material_export_phrases';
  candidateStatus: 'final_quiz_candidate_not_registered';
  routeRegistered: false;
  playable: false;
  quizSourceEdited: false;
  sourceMaterialExportStatus: string;
  registrationBlocker: 'missing_signature:product_copy';
};

export type GavanWeek1FinalQuizCandidatePacket = {
  kind: 'gavan_week1_final_quiz_candidate_packet';
  generatedAt: string;
  planId: 'gavan';
  weekId: 'gavan-week1';
  status: GavanWeek1FinalQuizCandidatePacketStatus;
  sourceHandoffStatus: GavanWeek1SignedApprovalHandoffPacket['status'];
  blockerStillOpen: 'missing_signature:product_copy';
  readyForLive: false;
  liveEditsAllowed: false;
  quizSourceEdited: false;
  quizRouteRegistrationAllowed: false;
  routeRegistrationAllowed: false;
  sourceWritesUsed: false;
  phaseWriteTargets: [];
  quizCandidates: GavanWeek1FinalQuizCandidate[];
  summary: {
    quizCandidateCount: number;
    totalQuestionCount: number;
    quizzesWithTenQuestions: number;
    registeredQuizCount: number;
    playableQuizCount: number;
    materialExportPacketCount: number;
    coverageReadyQuizCount: number;
  };
  registrationPolicy: {
    candidateOnly: true;
    requiresSignedApproval: true;
    requiresQuizSourceRegistrationTask: true;
    requiresRegressionAfterRegistration: true;
    liveBridgeAllowedInThisPass: false;
  };
  writePolicy: {
    dryRunOnly: true;
    allowedOutputRoots: ['.codex-tmp', 'docs/reports'];
    liveFilesEdited: false;
  };
};

export type GavanWeek1FinalQuizCandidatePacketBuildResult = {
  valid: boolean;
  issues: GavanWeek1FinalQuizCandidateIssue[];
  packet?: GavanWeek1FinalQuizCandidatePacket;
};

export type GavanWeek1FinalQuizCandidatePacketWriteResult =
  GavanWeek1FinalQuizCandidatePacketBuildResult & {
    targetPath?: string;
    bytesWritten?: number;
  };

function issue(
  code: GavanWeek1FinalQuizCandidateIssueCode,
  detail: string,
): GavanWeek1FinalQuizCandidateIssue {
  return { code, detail };
}

function withTrailingSeparator(value: string): string {
  const resolved = path.resolve(value);
  return resolved.endsWith(path.sep) ? resolved : `${resolved}${path.sep}`;
}

function isInside(target: string, parentWithSeparator: string): boolean {
  return target === parentWithSeparator.slice(0, -1) || target.startsWith(parentWithSeparator);
}

function allowedRootPaths(cwd = process.cwd()): string[] {
  return ALLOWED_TARGET_ROOTS.map((segments) =>
    withTrailingSeparator(path.join(cwd, ...segments)),
  );
}

export function isGavanWeek1FinalQuizCandidatePacketTargetAllowed(
  targetPath: string,
  cwd = process.cwd(),
): boolean {
  const resolvedTarget = path.resolve(cwd, targetPath);
  const rootWithSeparator = withTrailingSeparator(cwd);

  if (!isInside(resolvedTarget, rootWithSeparator)) {
    return false;
  }

  return allowedRootPaths(cwd).some((allowedRoot) => isInside(resolvedTarget, allowedRoot));
}

function validateHandoff(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
): GavanWeek1FinalQuizCandidateIssue[] {
  const issues: GavanWeek1FinalQuizCandidateIssue[] = [];

  if (handoff.kind !== 'gavan_week1_signed_approval_handoff_packet') {
    issues.push(issue(
      'wrong_handoff_kind',
      'Final quiz candidate packet requires the signed approval handoff packet.',
    ));
  }

  if (handoff.planId !== 'gavan' || handoff.weekId !== 'gavan-week1') {
    issues.push(issue(
      'wrong_plan_or_week',
      'Final quiz candidate packet can only target Gavan week 1.',
    ));
  }

  if (
    handoff.readyForLive !== false ||
    handoff.liveEditsAllowed !== false ||
    handoff.quizRouteRegistrationAllowed !== false ||
    handoff.blockerStillOpen !== 'missing_signature:product_copy' ||
    handoff.sourceWritesUsed !== false ||
    handoff.phaseWriteTargets.length > 0
  ) {
    issues.push(issue(
      'handoff_not_blocked',
      'Final quiz candidate packet cannot start from a live-ready or unblocked handoff.',
    ));
  }

  if (
    handoff.approvalStillMissing !== true ||
    handoff.signatureStatus !== 'missing' ||
    handoff.approvalMayBeInferred !== false ||
    handoff.signedApprovalAcceptedInThisPass !== false
  ) {
    issues.push(issue(
      'handoff_already_approved',
      'Final quiz candidate packet cannot infer approval from the handoff.',
    ));
  }

  return issues;
}

function dayIndexFromId(dayId: string): number {
  const match = dayId.match(/day(\d+)$/);
  return match ? Number(match[1]) : 0;
}

function expectedNotLiveStatus(dayId: string): string {
  return `day${dayIndexFromId(dayId)}_material_export_not_live`;
}

function validateMaterialExports(
  packets: GavanWeek1MaterialExportQuizCandidateInput[],
): GavanWeek1FinalQuizCandidateIssue[] {
  const issues: GavanWeek1FinalQuizCandidateIssue[] = [];
  const providedDayIds = packets.map((packet) => packet.dayId);
  const missingDayIds = EXPECTED_DAY_IDS.filter((dayId) => !providedDayIds.includes(dayId));

  if (packets.length !== 7 || missingDayIds.length > 0) {
    issues.push(issue(
      'material_export_packets_incomplete',
      `Final quiz candidates require all seven material export packets. Missing: ${missingDayIds.join(', ') || 'count mismatch'}.`,
    ));
  }

  for (const packet of packets) {
    if (
      !EXPECTED_DAY_IDS.includes(packet.dayId as typeof EXPECTED_DAY_IDS[number]) ||
      packet.status !== expectedNotLiveStatus(packet.dayId) ||
      packet.liveIntegration !== false ||
      packet.sourceWritesUsed !== false ||
      packet.phaseWriteTargets.length > 0 ||
      packet.reviewerSummary.quizBlueprintCount !== 10
    ) {
      issues.push(issue(
        'material_export_packet_not_blocked',
        `Material export ${packet.dayId} must stay non-live and keep exactly 10 quiz blueprints.`,
      ));
    }

    if (packet.preview.phrases.length < 5 || packet.reviewerSummary.phraseCount < 5) {
      issues.push(issue(
        'material_export_phrase_coverage_incomplete',
        `Material export ${packet.dayId} must expose at least five phrases for quiz coverage.`,
      ));
    }
  }

  return issues;
}

function uniqueChoices(answer: string, phrases: Array<{ english: string }>): string[] {
  const distractors = phrases
    .map((phrase) => phrase.english)
    .filter((phrase) => phrase !== answer);

  return [answer, ...distractors.slice(0, 3)];
}

function questionsForPacket(
  packet: GavanWeek1MaterialExportQuizCandidateInput,
): GavanWeek1FinalQuizQuestionCandidate[] {
  const dayIndex = dayIndexFromId(packet.dayId);
  const phrases = packet.preview.phrases;

  return Array.from({ length: 10 }, (_, index) => {
    const phrase = phrases[index % phrases.length];

    return {
      id: `${packet.dayId}-quiz:item-${index + 1}`,
      promptRu: `Выбери фразу: ${phrase.meaningRu}`,
      answerEnglish: phrase.english,
      choices: uniqueChoices(phrase.english, phrases),
      correctIndex: 0 as const,
      inputModes: ['choice', 'typing'] as ['choice', 'typing'],
      source: {
        type: 'material_export_phrase' as const,
        dayId: packet.dayId,
        phraseEnglish: phrase.english,
      },
      registeredInQuizSource: false as const,
    };
  }).map((question, index) => ({
    ...question,
    id: `gavan-week1-day${dayIndex}-quiz:item-${index + 1}`,
  }));
}

function candidateForPacket(
  packet: GavanWeek1MaterialExportQuizCandidateInput,
): GavanWeek1FinalQuizCandidate {
  const dayIndex = dayIndexFromId(packet.dayId);

  return {
    quizId: `gavan-week1-day${dayIndex}-quiz`,
    dayId: packet.dayId,
    dayIndex,
    titleRu: packet.preview.titleRu,
    questionCount: 10,
    questions: questionsForPacket(packet),
    inputModes: ['choice', 'typing'],
    taskCopyLocales: ['ru', 'uk', 'es'],
    coverageStatus: 'covers_material_export_phrases',
    candidateStatus: 'final_quiz_candidate_not_registered',
    routeRegistered: false,
    playable: false,
    quizSourceEdited: false,
    sourceMaterialExportStatus: packet.status,
    registrationBlocker: 'missing_signature:product_copy',
  };
}

function summary(
  candidates: GavanWeek1FinalQuizCandidate[],
  packetCount: number,
): GavanWeek1FinalQuizCandidatePacket['summary'] {
  return {
    quizCandidateCount: candidates.length,
    totalQuestionCount: candidates.reduce((total, candidate) => total + candidate.questionCount, 0),
    quizzesWithTenQuestions: candidates.filter((candidate) => candidate.questionCount === 10).length,
    registeredQuizCount: candidates.filter((candidate) => candidate.routeRegistered).length,
    playableQuizCount: candidates.filter((candidate) => candidate.playable).length,
    materialExportPacketCount: packetCount,
    coverageReadyQuizCount: candidates.filter((candidate) =>
      candidate.coverageStatus === 'covers_material_export_phrases',
    ).length,
  };
}

export function buildGavanWeek1FinalQuizCandidatePacket(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
  materialExportPackets: GavanWeek1MaterialExportQuizCandidateInput[],
  options: GavanWeek1FinalQuizCandidatePacketOptions,
): GavanWeek1FinalQuizCandidatePacketBuildResult {
  const issues = [
    ...validateHandoff(handoff),
    ...validateMaterialExports(materialExportPackets),
  ];

  if (issues.length > 0) {
    return { valid: false, issues };
  }

  const candidates = materialExportPackets
    .slice()
    .sort((left, right) => dayIndexFromId(left.dayId) - dayIndexFromId(right.dayId))
    .map(candidateForPacket);

  return {
    valid: true,
    issues: [],
    packet: {
      kind: 'gavan_week1_final_quiz_candidate_packet',
      generatedAt: options.generatedAt,
      planId: 'gavan',
      weekId: 'gavan-week1',
      status: 'final_quiz_candidates_not_live_not_registered',
      sourceHandoffStatus: handoff.status,
      blockerStillOpen: 'missing_signature:product_copy',
      readyForLive: false,
      liveEditsAllowed: false,
      quizSourceEdited: false,
      quizRouteRegistrationAllowed: false,
      routeRegistrationAllowed: false,
      sourceWritesUsed: false,
      phaseWriteTargets: [],
      quizCandidates: candidates,
      summary: summary(candidates, materialExportPackets.length),
      registrationPolicy: {
        candidateOnly: true,
        requiresSignedApproval: true,
        requiresQuizSourceRegistrationTask: true,
        requiresRegressionAfterRegistration: true,
        liveBridgeAllowedInThisPass: false,
      },
      writePolicy: {
        dryRunOnly: true,
        allowedOutputRoots: ['.codex-tmp', 'docs/reports'],
        liveFilesEdited: false,
      },
    },
  };
}

export function serializeGavanWeek1FinalQuizCandidatePacket(
  packet: GavanWeek1FinalQuizCandidatePacket,
): string {
  return `${JSON.stringify(packet, null, 2)}\n`;
}

export function writeGavanWeek1FinalQuizCandidatePacket(
  handoff: GavanWeek1SignedApprovalHandoffPacket,
  materialExportPackets: GavanWeek1MaterialExportQuizCandidateInput[],
  options: GavanWeek1FinalQuizCandidatePacketWriteOptions,
): GavanWeek1FinalQuizCandidatePacketWriteResult {
  const resolvedTargetPath = path.resolve(options.targetPath);

  if (!isGavanWeek1FinalQuizCandidatePacketTargetAllowed(resolvedTargetPath)) {
    return {
      valid: false,
      issues: [
        issue(
          'target_path_not_allowed',
          'Final quiz candidate packet can only write under .codex-tmp or docs/reports.',
        ),
      ],
    };
  }

  const buildResult = buildGavanWeek1FinalQuizCandidatePacket(
    handoff,
    materialExportPackets,
    options,
  );

  if (!buildResult.valid || !buildResult.packet) {
    return buildResult;
  }

  const serialized = serializeGavanWeek1FinalQuizCandidatePacket(buildResult.packet);
  mkdirSync(path.dirname(resolvedTargetPath), { recursive: true });
  writeFileSync(resolvedTargetPath, serialized, 'utf8');

  return {
    valid: true,
    issues: [],
    targetPath: resolvedTargetPath,
    bytesWritten: Buffer.byteLength(serialized, 'utf8'),
    packet: buildResult.packet,
  };
}
