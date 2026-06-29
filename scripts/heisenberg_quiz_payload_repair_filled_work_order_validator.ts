import fs from 'node:fs';
import path from 'node:path';

import {
  getQuizPoolAuditEntries,
  type QuizDifficulty,
} from '../app/quiz_data';
import {
  QUIZ_SOURCE_LOCALE_PAYLOADS,
  type QuizSourceLocalePayload,
  type QuizSourceLocalePayloadMap,
} from '../app/quiz_source_locale_payloads';
import { findPayloadMatchingQuizEntries } from './heisenberg_semantic_audit';

type CliOptions = {
  repairPlanPath?: string;
  workOrderPath?: string;
  filledArtifactPath?: string;
  outputPath?: string;
  candidateOutputPath?: string;
  generatedAt?: string;
};

type RepairPlanAction = {
  action: string;
  difficulty: QuizDifficulty;
  key: number;
  sourceKey?: number;
  sourceKeys?: number[];
};

type RepairPlan = {
  generatedAt: string;
  sourceFile: 'app/quiz_source_locale_payloads.ts';
  candidate: {
    sourceApplyReady: boolean;
    summary: {
      acceptedRemaps: number;
      sourceEntryCoverageDrops: number;
      unresolvedMultipleTargets: number;
      residualOrdinalBlockers: number;
    };
    residualOrdinalFindings: ResidualOrdinalFinding[];
    workOrder: WorkOrder;
    actions: RepairPlanAction[];
  };
};

type WorkOrder = {
  mode: 'quiz-payload-repair-work-order';
  status: 'READY_FOR_REVIEW';
  generatedFilledArtifact: false;
  summary: {
    replacementPayloadTasks: number;
    collisionDecisionTasks: number;
    residualValidationTasks: number;
    localesPerReplacementTask: string[];
  };
  replacementPayloadTasks: ReplacementPayloadTask[];
  collisionDecisionTasks: CollisionDecisionTask[];
  residualValidationTasks: ResidualValidationTask[];
};

type SourceEntryContext = {
  ordinal: number;
  ru?: string;
  uk?: string;
  es?: string;
  correctChoice: string;
  choices: string[];
  explanations: string[];
};

type ReplacementPayloadTask = {
  taskId: string;
  difficulty: QuizDifficulty;
  ordinal: number;
  currentPayloadHash?: string;
  sourceEntry: SourceEntryContext | null;
  requiredLocales: string[];
};

type CollisionDecisionTask = {
  taskId: string;
  difficulty: QuizDifficulty;
  targetOrdinal: number;
  currentPayloadHash?: string;
  incomingSourceKeys: number[];
  sourceEntry: SourceEntryContext | null;
};

type ResidualValidationTask = {
  taskId: string;
  difficulty: QuizDifficulty;
  ordinal: number;
  code: ResidualOrdinalFinding['code'];
  matchedOrdinal?: number;
  matchedOrdinals?: number[];
  sourceEntry: SourceEntryContext | null;
};

type ResidualOrdinalFinding = {
  code:
    | 'quiz-payload-ordinal-mismatch'
    | 'quiz-payload-ordinal-ambiguous'
    | 'quiz-payload-ordinal-drift'
    | 'quiz-payload-without-source-entry';
  difficulty: QuizDifficulty;
  ordinal: number;
  matchedOrdinal?: number;
  matchedOrdinals?: number[];
  sample?: string;
};

type FilledArtifact = {
  schemaVersion?: string;
  generatedFilledArtifact?: unknown;
  generatedDecisionsOrEvidence?: unknown;
  replacements?: FilledReplacement[];
  replacementPayloads?: FilledReplacement[];
  collisionDecisions?: FilledCollisionDecision[];
  residualValidations?: FilledResidualValidation[];
};

type FilledReplacement = {
  taskId?: unknown;
  difficulty?: unknown;
  ordinal?: unknown;
  payloads?: unknown;
  reviewerEvidenceId?: unknown;
  localeEvidenceIds?: unknown;
};

type FilledCollisionDecision = {
  taskId?: unknown;
  difficulty?: unknown;
  targetOrdinal?: unknown;
  decision?: unknown;
  selectedSourceKey?: unknown;
  replacementPayloads?: unknown;
  reviewerEvidenceId?: unknown;
};

type FilledResidualValidation = {
  taskId?: unknown;
  difficulty?: unknown;
  ordinal?: unknown;
  status?: unknown;
  reviewerEvidenceId?: unknown;
  replacementPayloads?: unknown;
  notes?: unknown;
};

type ValidationReport = {
  schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1';
  status: 'PASS' | 'HOLD';
  validationStatus: 'SOURCE_APPLY_CANDIDATE_READY' | 'MISSING_FILLED_ARTIFACT' | 'HOLD';
  generatedAt: string;
  repairPlanPath: string;
  workOrderPath: string;
  filledArtifactPath: string;
  candidateArtifactPath?: string;
  sourceFile: 'app/quiz_source_locale_payloads.ts';
  sourceApplyCandidateReady: boolean;
  candidateGenerated: boolean;
  generatedDecisionsOrEvidence: false;
  activationApproved: false;
  runtimeManifestRegistered: false;
  remoteLoadingEnabled: false;
  bundledContentRemoved: false;
  productionActivationApproved: false;
  workOrder: WorkOrder['summary'];
  filled: {
    replacements: number;
    collisionDecisions: number;
    residualValidations: number;
  };
  missingReplacementTaskIds: string[];
  duplicateReplacementTaskIds: string[];
  unknownReplacementTaskIds: string[];
  missingCollisionTaskIds: string[];
  duplicateCollisionTaskIds: string[];
  unknownCollisionTaskIds: string[];
  missingResidualTaskIds: string[];
  duplicateResidualTaskIds: string[];
  unknownResidualTaskIds: string[];
  finalResidualOrdinalFindings: ResidualOrdinalFinding[];
  blockers: string[];
};

type ValidationResult = {
  outputPath: string;
  report: ValidationReport;
};

type SourceApplyCandidate = {
  schemaVersion: 'heisenberg-quiz-payload-repair-source-apply-candidate-v1';
  status: 'PASS';
  generatedAt: string;
  sourceFile: 'app/quiz_source_locale_payloads.ts';
  sourceApplyReady: true;
  activationApproved: false;
  runtimeManifestRegistered: false;
  remoteLoadingEnabled: false;
  bundledContentRemoved: false;
  productionActivationApproved: false;
  acceptedRemaps: number;
  replacementPayloads: number;
  collisionDecisions: number;
  residualValidationFixes: number;
  finalResidualOrdinalFindings: [];
  candidatePayloads: Partial<Record<QuizDifficulty, Record<number, QuizSourceLocalePayloadMap>>>;
};

const FILLED_SCHEMA_VERSION = 'quiz-payload-repair-filled-work-order-v1';
const STRUCTURED_PAYLOAD_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'];
const DEFAULT_FILLED_NAME = 'filled_work_order.json';
const DEFAULT_OUTPUT_NAME = 'filled_work_order_validation.json';
const DEFAULT_CANDIDATE_NAME = 'source_apply_candidate.json';

export function writeHeisenbergQuizPayloadRepairFilledWorkOrderValidation(
  repoRoot: string,
  options: CliOptions = {},
): ValidationResult {
  const repairPlanPath = resolveAllowedPath(
    repoRoot,
    options.repairPlanPath,
    findLatestRepairPlan(repoRoot),
    'Heisenberg quiz repair plan input',
  );
  const workOrderPath = resolveAllowedPath(
    repoRoot,
    options.workOrderPath,
    path.join(path.dirname(repairPlanPath), 'work_order.json'),
    'Heisenberg quiz repair work-order input',
  );
  const filledArtifactPath = resolveAllowedPath(
    repoRoot,
    options.filledArtifactPath,
    path.join(path.dirname(repairPlanPath), DEFAULT_FILLED_NAME),
    'Heisenberg quiz repair filled artifact input',
  );
  const outputPath = resolveAllowedPath(
    repoRoot,
    options.outputPath,
    path.join(path.dirname(repairPlanPath), DEFAULT_OUTPUT_NAME),
    'Heisenberg quiz repair filled work-order validation output',
  );
  const candidateOutputPath = resolveAllowedPath(
    repoRoot,
    options.candidateOutputPath,
    path.join(path.dirname(repairPlanPath), DEFAULT_CANDIDATE_NAME),
    'Heisenberg quiz repair source-apply candidate output',
  );

  const repairPlan = readJsonFile<RepairPlan>(repairPlanPath);
  const workOrder = readJsonFile<WorkOrder>(workOrderPath);
  const evidenceBlockers = validateRepairPlanAndWorkOrder(repairPlan, workOrder);

  const filledArtifact = fs.existsSync(filledArtifactPath)
    ? readJsonFile<FilledArtifact>(filledArtifactPath)
    : null;
  const filledBlockers = filledArtifact ? validateFilledEnvelope(filledArtifact) : [];
  const validation = filledArtifact
    ? validateFilledTasks(repairPlan, workOrder, filledArtifact)
    : emptyFilledValidation(workOrder);

  const finalCandidatePayloads = filledArtifact && evidenceBlockers.length === 0 && filledBlockers.length === 0
    ? buildFinalCandidatePayloads(repairPlan, workOrder, validation)
    : null;
  const finalResidualOrdinalFindings = finalCandidatePayloads
    ? evaluateOrdinalFindings(finalCandidatePayloads)
    : repairPlan.candidate.residualOrdinalFindings;
  const finalResidualBlockers = filledArtifact && finalResidualOrdinalFindings.length > 0
    ? finalResidualOrdinalFindings.map((finding) =>
      `final candidate still has ${finding.code} at ${finding.difficulty} #${finding.ordinal}`,
    )
    : [];
  const missingFilledBlockers = filledArtifact ? [] : ['external filled Heisenberg quiz payload repair work-order artifact is missing'];
  const blockers = uniqueStrings([
    ...evidenceBlockers,
    ...filledBlockers,
    ...validation.blockers,
    ...finalResidualBlockers,
    ...missingFilledBlockers,
  ]);
  const sourceApplyCandidateReady = filledArtifact !== null && blockers.length === 0 && finalCandidatePayloads !== null;

  const report: ValidationReport = {
    schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1',
    status: sourceApplyCandidateReady ? 'PASS' : 'HOLD',
    validationStatus: sourceApplyCandidateReady
      ? 'SOURCE_APPLY_CANDIDATE_READY'
      : filledArtifact
        ? 'HOLD'
        : 'MISSING_FILLED_ARTIFACT',
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    repairPlanPath: relativePath(repoRoot, repairPlanPath),
    workOrderPath: relativePath(repoRoot, workOrderPath),
    filledArtifactPath: relativePath(repoRoot, filledArtifactPath),
    ...(sourceApplyCandidateReady ? { candidateArtifactPath: relativePath(repoRoot, candidateOutputPath) } : {}),
    sourceFile: 'app/quiz_source_locale_payloads.ts',
    sourceApplyCandidateReady,
    candidateGenerated: sourceApplyCandidateReady,
    generatedDecisionsOrEvidence: false,
    activationApproved: false,
    runtimeManifestRegistered: false,
    remoteLoadingEnabled: false,
    bundledContentRemoved: false,
    productionActivationApproved: false,
    workOrder: workOrder.summary,
    filled: {
      replacements: validation.replacementRows,
      collisionDecisions: validation.collisionRows,
      residualValidations: validation.residualRows,
    },
    missingReplacementTaskIds: validation.missingReplacementTaskIds,
    duplicateReplacementTaskIds: validation.duplicateReplacementTaskIds,
    unknownReplacementTaskIds: validation.unknownReplacementTaskIds,
    missingCollisionTaskIds: validation.missingCollisionTaskIds,
    duplicateCollisionTaskIds: validation.duplicateCollisionTaskIds,
    unknownCollisionTaskIds: validation.unknownCollisionTaskIds,
    missingResidualTaskIds: validation.missingResidualTaskIds,
    duplicateResidualTaskIds: validation.duplicateResidualTaskIds,
    unknownResidualTaskIds: validation.unknownResidualTaskIds,
    finalResidualOrdinalFindings,
    blockers,
  };

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  if (sourceApplyCandidateReady && finalCandidatePayloads) {
    const candidate: SourceApplyCandidate = {
      schemaVersion: 'heisenberg-quiz-payload-repair-source-apply-candidate-v1',
      status: 'PASS',
      generatedAt: report.generatedAt,
      sourceFile: 'app/quiz_source_locale_payloads.ts',
      sourceApplyReady: true,
      activationApproved: false,
      runtimeManifestRegistered: false,
      remoteLoadingEnabled: false,
      bundledContentRemoved: false,
      productionActivationApproved: false,
      acceptedRemaps: repairPlan.candidate.summary.acceptedRemaps,
      replacementPayloads: validation.replacementRows,
      collisionDecisions: validation.collisionRows,
      residualValidationFixes: validation.residualRows,
      finalResidualOrdinalFindings: [],
      candidatePayloads: finalCandidatePayloads,
    };
    fs.mkdirSync(path.dirname(candidateOutputPath), { recursive: true });
    fs.writeFileSync(candidateOutputPath, `${JSON.stringify(candidate, null, 2)}\n`, 'utf8');
  }

  if (filledArtifact && report.status !== 'PASS') {
    throw new Error(`Heisenberg quiz payload repair filled work-order validation failed: ${blockers.join('; ')}`);
  }

  return { outputPath, report };
}

type FilledTaskValidation = {
  replacementsByTaskId: Map<string, FilledReplacement>;
  collisionDecisionsByTaskId: Map<string, FilledCollisionDecision>;
  residualValidationsByTaskId: Map<string, FilledResidualValidation>;
  replacementRows: number;
  collisionRows: number;
  residualRows: number;
  missingReplacementTaskIds: string[];
  duplicateReplacementTaskIds: string[];
  unknownReplacementTaskIds: string[];
  missingCollisionTaskIds: string[];
  duplicateCollisionTaskIds: string[];
  unknownCollisionTaskIds: string[];
  missingResidualTaskIds: string[];
  duplicateResidualTaskIds: string[];
  unknownResidualTaskIds: string[];
  blockers: string[];
};

function validateFilledTasks(
  repairPlan: RepairPlan,
  workOrder: WorkOrder,
  filledArtifact: FilledArtifact,
): FilledTaskValidation {
  const blockers: string[] = [];
  const replacements = filledArtifact.replacements ?? filledArtifact.replacementPayloads ?? [];
  const collisionDecisions = filledArtifact.collisionDecisions ?? [];
  const residualValidations = filledArtifact.residualValidations ?? [];
  const replacementsByTaskId = collectUniqueByTaskId(replacements, blockers, 'replacement');
  const collisionDecisionsByTaskId = collectUniqueByTaskId(collisionDecisions, blockers, 'collision decision');
  const residualValidationsByTaskId = collectUniqueByTaskId(residualValidations, blockers, 'residual validation');

  const replacementTaskIds = new Set(workOrder.replacementPayloadTasks.map((task) => task.taskId));
  const collisionTaskIds = new Set(workOrder.collisionDecisionTasks.map((task) => task.taskId));
  const residualTaskIds = new Set(workOrder.residualValidationTasks.map((task) => task.taskId));

  const missingReplacementTaskIds = [...replacementTaskIds].filter((taskId) => !replacementsByTaskId.has(taskId));
  const unknownReplacementTaskIds = [...replacementsByTaskId.keys()].filter((taskId) => !replacementTaskIds.has(taskId));
  const missingCollisionTaskIds = [...collisionTaskIds].filter((taskId) => !collisionDecisionsByTaskId.has(taskId));
  const unknownCollisionTaskIds = [...collisionDecisionsByTaskId.keys()].filter((taskId) => !collisionTaskIds.has(taskId));
  const missingResidualTaskIds = [...residualTaskIds].filter((taskId) => !residualValidationsByTaskId.has(taskId));
  const unknownResidualTaskIds = [...residualValidationsByTaskId.keys()].filter((taskId) => !residualTaskIds.has(taskId));

  for (const taskId of missingReplacementTaskIds) blockers.push(`filled artifact is missing replacement task ${taskId}`);
  for (const taskId of unknownReplacementTaskIds) blockers.push(`filled artifact contains unknown replacement task ${taskId}`);
  for (const taskId of missingCollisionTaskIds) blockers.push(`filled artifact is missing collision decision task ${taskId}`);
  for (const taskId of unknownCollisionTaskIds) blockers.push(`filled artifact contains unknown collision decision task ${taskId}`);
  for (const taskId of missingResidualTaskIds) blockers.push(`filled artifact is missing residual validation task ${taskId}`);
  for (const taskId of unknownResidualTaskIds) blockers.push(`filled artifact contains unknown residual validation task ${taskId}`);

  for (const task of workOrder.replacementPayloadTasks) {
    const filled = replacementsByTaskId.get(task.taskId);
    if (!filled) continue;
    validateTaskIdentity(filled, task.difficulty, task.ordinal, blockers, task.taskId);
    validateEvidence(filled.reviewerEvidenceId, blockers, `${task.taskId} reviewerEvidenceId`);
    const payloads = validatePayloadMap(filled.payloads, task, blockers, task.taskId);
    if (payloads) validatePayloadMatchesOrdinal(payloads, task.difficulty, task.ordinal, blockers, task.taskId);
  }

  for (const task of workOrder.collisionDecisionTasks) {
    const filled = collisionDecisionsByTaskId.get(task.taskId);
    if (!filled) continue;
    validateTaskIdentity(filled, task.difficulty, task.targetOrdinal, blockers, task.taskId);
    validateEvidence(filled.reviewerEvidenceId, blockers, `${task.taskId} reviewerEvidenceId`);
    if (filled.decision === 'select-source') {
      if (typeof filled.selectedSourceKey !== 'number' || !task.incomingSourceKeys.includes(filled.selectedSourceKey)) {
        blockers.push(`${task.taskId} selectedSourceKey must be one of ${task.incomingSourceKeys.join(', ')}`);
      }
    } else if (filled.decision === 'replacement-payload' || filled.decision === 'merge-replacement') {
      const payloads = validatePayloadMap(filled.replacementPayloads, replacementTaskFromCollision(task), blockers, task.taskId);
      if (payloads) validatePayloadMatchesOrdinal(payloads, task.difficulty, task.targetOrdinal, blockers, task.taskId);
    } else {
      blockers.push(`${task.taskId} decision must be select-source, replacement-payload, or merge-replacement`);
    }
  }

  for (const task of workOrder.residualValidationTasks) {
    const filled = residualValidationsByTaskId.get(task.taskId);
    if (!filled) continue;
    validateTaskIdentity(filled, task.difficulty, task.ordinal, blockers, task.taskId);
    validateEvidence(filled.reviewerEvidenceId, blockers, `${task.taskId} reviewerEvidenceId`);
    if (filled.status !== 'resolved') {
      blockers.push(`${task.taskId} status must be resolved`);
    }
    if (filled.replacementPayloads !== undefined) {
      const payloads = validatePayloadMap(filled.replacementPayloads, replacementTaskFromResidual(task), blockers, task.taskId);
      if (payloads) validatePayloadMatchesOrdinal(payloads, task.difficulty, task.ordinal, blockers, task.taskId);
    }
  }

  const duplicateReplacementTaskIds = duplicateTaskIds(replacements);
  const duplicateCollisionTaskIds = duplicateTaskIds(collisionDecisions);
  const duplicateResidualTaskIds = duplicateTaskIds(residualValidations);
  for (const taskId of duplicateReplacementTaskIds) blockers.push(`filled artifact contains duplicate replacement task ${taskId}`);
  for (const taskId of duplicateCollisionTaskIds) blockers.push(`filled artifact contains duplicate collision decision task ${taskId}`);
  for (const taskId of duplicateResidualTaskIds) blockers.push(`filled artifact contains duplicate residual validation task ${taskId}`);

  // Keep the current repair plan wired into validation so stale filled artifacts cannot silently pass.
  if (repairPlan.candidate.workOrder.summary.replacementPayloadTasks !== workOrder.summary.replacementPayloadTasks) {
    blockers.push('repair plan and work-order replacement task counts differ');
  }

  return {
    replacementsByTaskId,
    collisionDecisionsByTaskId,
    residualValidationsByTaskId,
    replacementRows: replacements.length,
    collisionRows: collisionDecisions.length,
    residualRows: residualValidations.length,
    missingReplacementTaskIds,
    duplicateReplacementTaskIds,
    unknownReplacementTaskIds,
    missingCollisionTaskIds,
    duplicateCollisionTaskIds,
    unknownCollisionTaskIds,
    missingResidualTaskIds,
    duplicateResidualTaskIds,
    unknownResidualTaskIds,
    blockers: uniqueStrings(blockers),
  };
}

function buildFinalCandidatePayloads(
  repairPlan: RepairPlan,
  workOrder: WorkOrder,
  validation: FilledTaskValidation,
): Partial<Record<QuizDifficulty, Record<number, QuizSourceLocalePayloadMap>>> {
  const payloadsByDifficulty: Partial<Record<QuizDifficulty, Record<number, QuizSourceLocalePayloadMap>>> = {};
  for (const difficulty of ['easy', 'medium', 'hard'] as QuizDifficulty[]) {
    payloadsByDifficulty[difficulty] = {};
  }

  for (const action of repairPlan.candidate.actions) {
    const scoped = payloadsByDifficulty[action.difficulty] ?? {};
    payloadsByDifficulty[action.difficulty] = scoped;
    const original = QUIZ_SOURCE_LOCALE_PAYLOADS[action.difficulty] ?? {};

    if (action.action === 'keep' || action.action === 'archive-incoming-duplicate') {
      if (original[action.key]) scoped[action.key] = original[action.key];
    } else if (action.action === 'remap-incoming' && typeof action.sourceKey === 'number') {
      if (original[action.sourceKey]) scoped[action.key] = original[action.sourceKey];
    } else if (action.action === 'coverage-drop-needs-new-payload') {
      const filled = validation.replacementsByTaskId.get(`replacement:${action.difficulty}:${action.key}`);
      const payloads = parsePayloadMap(filled?.payloads);
      if (payloads) scoped[action.key] = payloads;
    } else if (action.action === 'unresolved-multiple-incoming') {
      const filled = validation.collisionDecisionsByTaskId.get(`collision:${action.difficulty}:${action.key}`);
      if (filled?.decision === 'select-source' && typeof filled.selectedSourceKey === 'number') {
        if (original[filled.selectedSourceKey]) scoped[action.key] = original[filled.selectedSourceKey];
      } else {
        const payloads = parsePayloadMap(filled?.replacementPayloads);
        if (payloads) scoped[action.key] = payloads;
      }
    }
  }

  for (const task of workOrder.residualValidationTasks) {
    const filled = validation.residualValidationsByTaskId.get(task.taskId);
    const replacement = parsePayloadMap(filled?.replacementPayloads);
    if (replacement) {
      const scoped = payloadsByDifficulty[task.difficulty] ?? {};
      payloadsByDifficulty[task.difficulty] = scoped;
      scoped[task.ordinal] = replacement;
    }
  }

  return payloadsByDifficulty;
}

function evaluateOrdinalFindings(
  payloadsByDifficulty: Partial<Record<QuizDifficulty, Record<number, QuizSourceLocalePayloadMap>>>,
): ResidualOrdinalFinding[] {
  const findings: ResidualOrdinalFinding[] = [];
  for (const difficulty of ['easy', 'medium', 'hard'] as QuizDifficulty[]) {
    const entries = getQuizPoolAuditEntries(difficulty);
    const payloadOrdinals = Object.keys(payloadsByDifficulty[difficulty] ?? {})
      .map(Number)
      .filter((value) => Number.isInteger(value) && value > 0)
      .sort((left, right) => left - right);

    for (const ordinal of payloadOrdinals) {
      const payloads = payloadsByDifficulty[difficulty]?.[ordinal] ?? {};
      const entry = entries.find((candidate) => candidate.ordinal === ordinal);
      const matchingEntries = findPayloadMatchingQuizEntries(entries, payloads);

      if (!entry) {
        if (matchingEntries.length === 1) {
          findings.push({
            code: 'quiz-payload-ordinal-drift',
            difficulty,
            ordinal,
            matchedOrdinal: matchingEntries[0].ordinal,
            sample: primaryCorrectChoice(matchingEntries[0]),
          });
        } else {
          findings.push({
            code: 'quiz-payload-without-source-entry',
            difficulty,
            ordinal,
            matchedOrdinals: matchingEntries.map((candidate) => candidate.ordinal),
          });
        }
        continue;
      }

      const hasCurrentEntryEvidence = matchingEntries.some((candidate) => candidate.ordinal === ordinal);
      if (matchingEntries.length === 1 && matchingEntries[0].ordinal !== ordinal) {
        findings.push({
          code: 'quiz-payload-ordinal-mismatch',
          difficulty,
          ordinal,
          matchedOrdinal: matchingEntries[0].ordinal,
          sample: primaryCorrectChoice(matchingEntries[0]),
        });
      } else if (matchingEntries.length > 1 && !hasCurrentEntryEvidence) {
        findings.push({
          code: 'quiz-payload-ordinal-ambiguous',
          difficulty,
          ordinal,
          matchedOrdinals: matchingEntries.map((candidate) => candidate.ordinal),
          sample: matchingEntries.map((candidate) => primaryCorrectChoice(candidate)).join(' | '),
        });
      }
    }
  }
  return findings;
}

function validateRepairPlanAndWorkOrder(repairPlan: RepairPlan, workOrder: WorkOrder): string[] {
  const blockers: string[] = [];
  if (repairPlan.sourceFile !== 'app/quiz_source_locale_payloads.ts') {
    blockers.push('repair plan sourceFile must be app/quiz_source_locale_payloads.ts');
  }
  if (repairPlan.candidate.sourceApplyReady !== false) {
    blockers.push('repair plan candidate must not already be source-apply-ready');
  }
  if (workOrder.mode !== 'quiz-payload-repair-work-order') {
    blockers.push('work-order mode must be quiz-payload-repair-work-order');
  }
  if (workOrder.status !== 'READY_FOR_REVIEW') {
    blockers.push('work-order status must be READY_FOR_REVIEW');
  }
  if (workOrder.generatedFilledArtifact !== false) {
    blockers.push('work-order generatedFilledArtifact must be false');
  }
  if (workOrder.summary.replacementPayloadTasks !== workOrder.replacementPayloadTasks.length) {
    blockers.push('work-order replacementPayloadTasks count does not match tasks');
  }
  if (workOrder.summary.collisionDecisionTasks !== workOrder.collisionDecisionTasks.length) {
    blockers.push('work-order collisionDecisionTasks count does not match tasks');
  }
  if (workOrder.summary.residualValidationTasks !== workOrder.residualValidationTasks.length) {
    blockers.push('work-order residualValidationTasks count does not match tasks');
  }
  if (workOrder.summary.localesPerReplacementTask.join('|') !== STRUCTURED_PAYLOAD_LOCALES.join('|')) {
    blockers.push(`work-order replacement locales must be ${STRUCTURED_PAYLOAD_LOCALES.join(', ')}`);
  }
  return blockers;
}

function validateFilledEnvelope(filledArtifact: FilledArtifact): string[] {
  const blockers: string[] = [];
  if (filledArtifact.schemaVersion !== FILLED_SCHEMA_VERSION) {
    blockers.push(`filled artifact schemaVersion must be ${FILLED_SCHEMA_VERSION}`);
  }
  if (filledArtifact.generatedFilledArtifact !== false) {
    blockers.push('filled artifact generatedFilledArtifact must be false');
  }
  if (filledArtifact.generatedDecisionsOrEvidence !== false) {
    blockers.push('filled artifact generatedDecisionsOrEvidence must be false');
  }
  return blockers;
}

function validatePayloadMap(
  raw: unknown,
  task: Pick<ReplacementPayloadTask, 'requiredLocales' | 'sourceEntry'>,
  blockers: string[],
  label: string,
): QuizSourceLocalePayloadMap | null {
  const payloads = parsePayloadMap(raw);
  if (!payloads) {
    blockers.push(`${label} payloads must be an object`);
    return null;
  }

  for (const locale of task.requiredLocales) {
    const payload = payloads[locale as keyof QuizSourceLocalePayloadMap];
    if (!payload?.prompt?.trim()) {
      blockers.push(`${label} ${locale} prompt is required`);
      continue;
    }
    if (!Array.isArray(payload.explanations) || payload.explanations.length !== 4) {
      blockers.push(`${label} ${locale} explanations must have exactly four entries`);
      continue;
    }
    payload.explanations.forEach((line, index) => {
      if (!line.trim()) blockers.push(`${label} ${locale} explanations[${index}] is required`);
    });
    const forbiddenExact = [
      task.sourceEntry?.ru,
      task.sourceEntry?.uk,
      task.sourceEntry?.es,
      ...(task.sourceEntry?.choices ?? []),
    ].filter((value): value is string => Boolean(value?.trim()));
    if (forbiddenExact.some((value) => value.trim() === payload.prompt.trim())) {
      blockers.push(`${label} ${locale} prompt must not exactly copy source fallback or English choice`);
    }
  }
  return payloads;
}

function validatePayloadMatchesOrdinal(
  payloads: QuizSourceLocalePayloadMap,
  difficulty: QuizDifficulty,
  ordinal: number,
  blockers: string[],
  label: string,
): void {
  const entries = getQuizPoolAuditEntries(difficulty);
  const matchingEntries = findPayloadMatchingQuizEntries(entries, payloads);
  if (!matchingEntries.some((entry) => entry.ordinal === ordinal)) {
    const entry = entries.find((candidate) => candidate.ordinal === ordinal);
    const correctChoice = entry ? normalizeEnglish(primaryCorrectChoice(entry)) : '';
    const payloadText = normalizeEnglish(
      Object.values(payloads)
        .filter((payload): payload is QuizSourceLocalePayload => Boolean(payload))
        .flatMap((payload) => [payload.prompt, ...payload.explanations])
        .join(' '),
    );
    if (!correctChoice || !payloadText.includes(correctChoice)) {
      blockers.push(`${label} payloads do not contain English target evidence for ${difficulty} #${ordinal}`);
    }
  }
}

function normalizeEnglish(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function parsePayloadMap(raw: unknown): QuizSourceLocalePayloadMap | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const result: QuizSourceLocalePayloadMap = {};
  for (const locale of STRUCTURED_PAYLOAD_LOCALES) {
    const value = (raw as Record<string, unknown>)[locale];
    if (!value || typeof value !== 'object' || Array.isArray(value)) continue;
    const prompt = (value as { prompt?: unknown }).prompt;
    const explanations = (value as { explanations?: unknown }).explanations;
    if (typeof prompt !== 'string' || !Array.isArray(explanations)) continue;
    result[locale as keyof QuizSourceLocalePayloadMap] = {
      prompt,
      explanations: explanations.map(String).slice(0, 4) as QuizSourceLocalePayload['explanations'],
    };
  }
  return result;
}

function replacementTaskFromCollision(task: CollisionDecisionTask): ReplacementPayloadTask {
  return {
    taskId: task.taskId,
    difficulty: task.difficulty,
    ordinal: task.targetOrdinal,
    currentPayloadHash: task.currentPayloadHash,
    sourceEntry: task.sourceEntry,
    requiredLocales: STRUCTURED_PAYLOAD_LOCALES,
  };
}

function replacementTaskFromResidual(task: ResidualValidationTask): ReplacementPayloadTask {
  return {
    taskId: task.taskId,
    difficulty: task.difficulty,
    ordinal: task.ordinal,
    sourceEntry: task.sourceEntry,
    requiredLocales: STRUCTURED_PAYLOAD_LOCALES,
  };
}

function validateTaskIdentity(
  value: { difficulty?: unknown; ordinal?: unknown; targetOrdinal?: unknown },
  difficulty: QuizDifficulty,
  ordinal: number,
  blockers: string[],
  taskId: string,
): void {
  if (value.difficulty !== undefined && value.difficulty !== difficulty) {
    blockers.push(`${taskId} difficulty must be ${difficulty}`);
  }
  const filledOrdinal = value.ordinal ?? value.targetOrdinal;
  if (filledOrdinal !== undefined && filledOrdinal !== ordinal) {
    blockers.push(`${taskId} ordinal must be ${ordinal}`);
  }
}

function validateEvidence(value: unknown, blockers: string[], label: string): void {
  if (typeof value !== 'string' || value.trim().length === 0) {
    blockers.push(`${label} must be non-empty`);
  }
}

function collectUniqueByTaskId<T extends { taskId?: unknown }>(
  rows: T[],
  blockers: string[],
  label: string,
): Map<string, T> {
  const byTaskId = new Map<string, T>();
  for (const row of rows) {
    if (typeof row.taskId !== 'string' || row.taskId.trim().length === 0) {
      blockers.push(`filled ${label} row is missing taskId`);
      continue;
    }
    if (byTaskId.has(row.taskId)) continue;
    byTaskId.set(row.taskId, row);
  }
  return byTaskId;
}

function duplicateTaskIds(rows: Array<{ taskId?: unknown }>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const row of rows) {
    if (typeof row.taskId !== 'string') continue;
    if (seen.has(row.taskId)) duplicates.add(row.taskId);
    seen.add(row.taskId);
  }
  return [...duplicates].sort();
}

function emptyFilledValidation(workOrder: WorkOrder): FilledTaskValidation {
  return {
    replacementsByTaskId: new Map(),
    collisionDecisionsByTaskId: new Map(),
    residualValidationsByTaskId: new Map(),
    replacementRows: 0,
    collisionRows: 0,
    residualRows: 0,
    missingReplacementTaskIds: workOrder.replacementPayloadTasks.map((task) => task.taskId),
    duplicateReplacementTaskIds: [],
    unknownReplacementTaskIds: [],
    missingCollisionTaskIds: workOrder.collisionDecisionTasks.map((task) => task.taskId),
    duplicateCollisionTaskIds: [],
    unknownCollisionTaskIds: [],
    missingResidualTaskIds: workOrder.residualValidationTasks.map((task) => task.taskId),
    duplicateResidualTaskIds: [],
    unknownResidualTaskIds: [],
    blockers: [],
  };
}

function primaryCorrectChoice(entry: ReturnType<typeof getQuizPoolAuditEntries>[number]): string {
  const index = Array.isArray(entry.correct) ? entry.correct[0] : entry.correct;
  return entry.choices[index] ?? '';
}

function findLatestRepairPlan(repoRoot: string): string {
  const root = path.join(repoRoot, 'docs', 'heisenberg', 'quiz-payload-ordinal-repair');
  if (!fs.existsSync(root)) return path.join(root, 'missing', 'repair_plan.json');
  const latest = fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .reverse()[0];
  return path.join(root, latest ?? 'missing', 'repair_plan.json');
}

function resolveAllowedPath(repoRoot: string, requestedPath: string | undefined, fallbackPath: string, label: string): string {
  const requested = path.resolve(repoRoot, requestedPath ?? fallbackPath);
  const allowedRoots = [
    path.resolve(repoRoot, '.codex-tmp'),
    path.resolve(repoRoot, 'docs', 'heisenberg'),
  ];
  if (!allowedRoots.some((root) => requested === root || requested.startsWith(`${root}${path.sep}`))) {
    throw new Error(`${label} must stay under .codex-tmp or docs/heisenberg`);
  }
  return requested;
}

function readJsonFile<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '')) as T;
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function relativePath(repoRoot: string, filePath: string): string {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function parseCli(argv: readonly string[]): CliOptions {
  const options: CliOptions = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--repair-plan') {
      options.repairPlanPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--work-order') {
      options.workOrderPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--filled') {
      options.filledArtifactPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--out') {
      options.outputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--candidate-out') {
      options.candidateOutputPath = readValue(argv, index, arg);
      index += 1;
    } else if (arg === '--generated-at') {
      options.generatedAt = readValue(argv, index, arg);
      index += 1;
    } else {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }
  return options;
}

function readValue(argv: readonly string[], index: number, flag: string): string {
  const value = argv[index + 1];
  if (!value) throw new Error(`${flag} requires a value`);
  return value;
}

if (require.main === module) {
  try {
    const result = writeHeisenbergQuizPayloadRepairFilledWorkOrderValidation(process.cwd(), parseCli(process.argv.slice(2)));
    console.log(`Heisenberg quiz payload repair filled work-order validation: ${result.report.status}`);
    console.log(`Validation: ${result.report.validationStatus}`);
    console.log(`Report: ${relativePath(process.cwd(), result.outputPath)}`);
    console.log(`Source apply candidate ready: ${result.report.sourceApplyCandidateReady}`);
    if (result.report.candidateArtifactPath) {
      console.log(`Candidate: ${result.report.candidateArtifactPath}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
