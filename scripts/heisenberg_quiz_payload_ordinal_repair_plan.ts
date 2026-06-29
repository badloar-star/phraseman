import fs from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';

import {
  getQuizPoolAuditEntries,
  type QuizDifficulty,
} from '../app/quiz_data';
import {
  QUIZ_SOURCE_LOCALE_PAYLOADS,
  type QuizSourceLocalePayloadMap,
} from '../app/quiz_source_locale_payloads';
import { findPayloadMatchingQuizEntries } from './heisenberg_semantic_audit';

type PlanStatus =
  | 'keep-current'
  | 'weak-evidence-keep'
  | 'move-candidate'
  | 'ambiguous-current-keep'
  | 'ambiguous-review'
  | 'without-source-entry';

type PlanMoveSafety =
  | 'not-a-move'
  | 'safe-target-empty'
  | 'safe-target-chain-clear'
  | 'blocked-target-has-current-payload'
  | 'blocked-target-has-multiple-movers'
  | 'blocked-target-chain-blocked'
  | 'blocked-target-cycle';

type PayloadOrdinalPlanItem = {
  difficulty: QuizDifficulty;
  key: number;
  status: PlanStatus;
  moveSafety: PlanMoveSafety;
  targetOrdinal?: number;
  matchedOrdinals: number[];
  conflictKeys: number[];
  promptSample?: string;
  targetAnswerSample?: string;
};

type PayloadOrdinalComponentSummary = {
  id: string;
  difficulty: QuizDifficulty;
  nodeCount: number;
  payloadCount: number;
  ordinalRange?: {
    min: number;
    max: number;
  };
  statusCounts: Partial<Record<PlanStatus, number>>;
  moveSafetyCounts: Partial<Record<PlanMoveSafety, number>>;
  moveCandidates: number;
  blockedMoves: number;
  autoSafeMoves: number;
  ambiguousReview: number;
  withoutSourceEntry: number;
  hasMultipleMovers: boolean;
  samplePayloads: Array<{
    key: number;
    status: PlanStatus;
    moveSafety: PlanMoveSafety;
    targetOrdinal?: number;
    matchedOrdinals: number[];
    conflictKeys: number[];
  }>;
};

type PayloadOrdinalCandidateAction = {
  action:
    | 'keep'
    | 'remap-incoming'
    | 'archive-incoming-duplicate'
    | 'unresolved-multiple-incoming'
    | 'coverage-drop-needs-new-payload'
    | 'archive-without-source-entry';
  difficulty: QuizDifficulty;
  key: number;
  status?: PlanStatus;
  sourceKey?: number;
  sourceKeys?: number[];
  targetOrdinal?: number;
  replacedStatus?: PlanStatus;
  payloadHash?: string;
  sourcePayloadHash?: string;
  replacedPayloadHash?: string;
  reason?: string;
};

type PayloadOrdinalCandidateFinding = {
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

type PayloadOrdinalCandidateReport = {
  mode: 'quiz-payload-non-lossy-candidate';
  dryRun: true;
  sourceApplyReady: boolean;
  summary: {
    originalPayloadKeys: number;
    candidatePayloadKeys: number;
    acceptedRemaps: number;
    keptPayloads: number;
    archivedDuplicatePayloads: number;
    archivedWithoutSourcePayloads: number;
    sourceEntryCoverageDrops: number;
    unresolvedMultipleTargets: number;
    residualOrdinalBlockers: number;
    residualByCode: Partial<Record<PayloadOrdinalCandidateFinding['code'], number>>;
    byDifficulty: Record<string, {
      originalPayloadKeys: number;
      candidatePayloadKeys: number;
      acceptedRemaps: number;
      keptPayloads: number;
      archivedDuplicatePayloads: number;
      archivedWithoutSourcePayloads: number;
      sourceEntryCoverageDrops: number;
      unresolvedMultipleTargets: number;
      residualOrdinalBlockers: number;
    }>;
  };
  residualOrdinalFindings: PayloadOrdinalCandidateFinding[];
  workOrder: PayloadOrdinalWorkOrder;
  actions: PayloadOrdinalCandidateAction[];
};

type PayloadOrdinalWorkOrder = {
  mode: 'quiz-payload-repair-work-order';
  status: 'READY_FOR_REVIEW';
  generatedFilledArtifact: false;
  instructions: string[];
  expectedFilledArtifact: {
    schema: 'quiz-payload-repair-filled-work-order-v1';
    requiredPerReplacementTask: string[];
    requiredPerCollisionTask: string[];
  };
  summary: {
    replacementPayloadTasks: number;
    collisionDecisionTasks: number;
    residualValidationTasks: number;
    localesPerReplacementTask: string[];
  };
  replacementPayloadTasks: Array<{
    taskId: string;
    difficulty: QuizDifficulty;
    ordinal: number;
    actionHash?: string;
    currentPayloadHash?: string;
    sourceEntry: QuizSourceEntryContext | null;
    requiredLocales: string[];
    acceptanceCriteria: string[];
  }>;
  collisionDecisionTasks: Array<{
    taskId: string;
    difficulty: QuizDifficulty;
    targetOrdinal: number;
    currentPayloadHash?: string;
    incomingSourceKeys: number[];
    incomingPayloadHashes: Array<{ sourceKey: number; payloadHash?: string }>;
    sourceEntry: QuizSourceEntryContext | null;
    acceptanceCriteria: string[];
  }>;
  residualValidationTasks: Array<{
    taskId: string;
    difficulty: QuizDifficulty;
    ordinal: number;
    code: PayloadOrdinalCandidateFinding['code'];
    matchedOrdinal?: number;
    matchedOrdinals?: number[];
    sourceEntry: QuizSourceEntryContext | null;
    acceptanceCriteria: string[];
  }>;
};

type QuizSourceEntryContext = {
  ordinal: number;
  ru?: string;
  uk?: string;
  es?: string;
  correctChoice: string;
  choices: string[];
  explanations: string[];
};

type PayloadOrdinalRepairReport = {
  generatedAt: string;
  mode: 'quiz-payload-ordinal-repair-plan';
  dryRun: true;
  sourceFile: 'app/quiz_source_locale_payloads.ts';
  summary: {
    payloads: number;
    keepCurrent: number;
    weakEvidenceKeep: number;
    moveCandidates: number;
    ambiguousCurrentKeep: number;
    ambiguousReview: number;
    withoutSourceEntry: number;
    withoutSourceWithUniqueTarget: number;
    autoSafeMoves: number;
    blockedMoves: number;
    byDifficulty: Record<string, {
      payloads: number;
      moveCandidates: number;
      autoSafeMoves: number;
      blockedMoves: number;
      ambiguousReview: number;
      withoutSourceEntry: number;
      withoutSourceWithUniqueTarget: number;
    }>;
    componentGraph: {
      componentCount: number;
      statusCounts: Partial<Record<PlanStatus, number>>;
      moveSafetyCounts: Partial<Record<PlanMoveSafety, number>>;
      byDifficulty: Record<string, {
        components: number;
        largestNodeCount: number;
        blockedComponents: number;
        ambiguousComponents: number;
        withoutSourceComponents: number;
      }>;
      topComponents: PayloadOrdinalComponentSummary[];
    };
  };
  candidate: PayloadOrdinalCandidateReport;
  items: PayloadOrdinalPlanItem[];
};

const DIFFICULTIES: QuizDifficulty[] = ['easy', 'medium', 'hard'];
const STRUCTURED_PAYLOAD_LOCALES = ['pt-BR', 'vi', 'id', 'tr', 'pl'];

function itemKey(difficulty: QuizDifficulty, key: number): string {
  return `${difficulty}:${key}`;
}

function timestampSlug(): string {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function primaryCorrectChoice(entry: ReturnType<typeof getQuizPoolAuditEntries>[number]): string {
  const index = Array.isArray(entry.correct) ? entry.correct[0] : entry.correct;
  return entry.choices[index] ?? '';
}

function firstPayloadPrompt(payloads: QuizSourceLocalePayloadMap): string | undefined {
  const payload = payloads['pt-BR'] ?? payloads.vi ?? payloads.id ?? payloads.tr ?? payloads.pl ?? payloads.es;
  return payload?.prompt;
}

function classifyPayload(
  difficulty: QuizDifficulty,
  key: number,
  payloads: QuizSourceLocalePayloadMap,
): PayloadOrdinalPlanItem {
  const entries = getQuizPoolAuditEntries(difficulty);
  const entry = entries.find((item) => item.ordinal === key);
  const matches = findPayloadMatchingQuizEntries(entries, payloads);
  const matchedOrdinals = matches.map((item) => item.ordinal);
  const currentMatch = matchedOrdinals.includes(key);
  const targetAnswerSample = matches.length === 1
    ? primaryCorrectChoice(matches[0])
    : entry ? primaryCorrectChoice(entry) : undefined;

  if (!entry) {
    return {
      difficulty,
      key,
      status: 'without-source-entry',
      moveSafety: 'not-a-move',
      targetOrdinal: matches.length === 1 ? matches[0].ordinal : undefined,
      matchedOrdinals,
      conflictKeys: [],
      promptSample: firstPayloadPrompt(payloads),
      targetAnswerSample,
    };
  }

  if (matches.length === 0) {
    return {
      difficulty,
      key,
      status: 'weak-evidence-keep',
      moveSafety: 'not-a-move',
      matchedOrdinals,
      conflictKeys: [],
      promptSample: firstPayloadPrompt(payloads),
      targetAnswerSample,
    };
  }

  if (matches.length === 1) {
    const targetOrdinal = matches[0].ordinal;
    return {
      difficulty,
      key,
      status: targetOrdinal === key ? 'keep-current' : 'move-candidate',
      moveSafety: 'not-a-move',
      targetOrdinal,
      matchedOrdinals,
      conflictKeys: [],
      promptSample: firstPayloadPrompt(payloads),
      targetAnswerSample,
    };
  }

  return {
    difficulty,
    key,
    status: currentMatch ? 'ambiguous-current-keep' : 'ambiguous-review',
    moveSafety: 'not-a-move',
    matchedOrdinals,
    conflictKeys: [],
    promptSample: firstPayloadPrompt(payloads),
    targetAnswerSample,
  };
}

function attachMoveSafety(items: PayloadOrdinalPlanItem[]): void {
  const byKey = new Map(items.map((item) => [itemKey(item.difficulty, item.key), item]));
  const moversByTarget = new Map<string, PayloadOrdinalPlanItem[]>();
  for (const item of items) {
    if (item.status !== 'move-candidate' || typeof item.targetOrdinal !== 'number') continue;
    const targetKey = itemKey(item.difficulty, item.targetOrdinal);
    const list = moversByTarget.get(targetKey) ?? [];
    list.push(item);
    moversByTarget.set(targetKey, list);
  }

  const resolve = (item: PayloadOrdinalPlanItem, seen = new Set<string>()): PlanMoveSafety => {
    if (item.status !== 'move-candidate' || typeof item.targetOrdinal !== 'number') return 'not-a-move';
    const selfKey = itemKey(item.difficulty, item.key);
    if (seen.has(selfKey)) return 'blocked-target-cycle';
    seen.add(selfKey);

    const targetKey = itemKey(item.difficulty, item.targetOrdinal);
    const competingMovers = moversByTarget.get(targetKey) ?? [];
    if (competingMovers.length > 1) {
      item.conflictKeys = competingMovers.map((candidate) => candidate.key).filter((key) => key !== item.key);
      return 'blocked-target-has-multiple-movers';
    }

    const occupant = byKey.get(targetKey);
    if (!occupant) {
      return 'safe-target-empty';
    }

    if (occupant.status === 'move-candidate') {
      const occupantSafety = resolve(occupant, seen);
      if (occupantSafety === 'safe-target-empty' || occupantSafety === 'safe-target-chain-clear') {
        item.conflictKeys = [occupant.key];
        return 'safe-target-chain-clear';
      }
      item.conflictKeys = [occupant.key];
      return 'blocked-target-chain-blocked';
    }

    item.conflictKeys = [occupant.key];
    return 'blocked-target-has-current-payload';
  };

  for (const item of items) {
    if (item.status !== 'move-candidate' || typeof item.targetOrdinal !== 'number') continue;
    item.moveSafety = resolve(item, new Set());
  }
}

function increment<T extends string>(counts: Partial<Record<T, number>>, key: T): void {
  counts[key] = (counts[key] ?? 0) + 1;
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (!value || typeof value !== 'object') return JSON.stringify(value);
  return `{${Object.keys(value as Record<string, unknown>)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

function payloadHash(payloads: QuizSourceLocalePayloadMap | undefined): string | undefined {
  if (!payloads) return undefined;
  return stableHash(payloads);
}

function stableHash(value: unknown): string {
  return crypto.createHash('sha256').update(stableJson(value)).digest('hex');
}

function sourceEntryContext(difficulty: QuizDifficulty, ordinal: number): QuizSourceEntryContext | null {
  const entry = getQuizPoolAuditEntries(difficulty).find((candidate) => candidate.ordinal === ordinal);
  if (!entry) return null;
  return {
    ordinal: entry.ordinal,
    ru: entry.ru,
    uk: entry.uk,
    es: entry.es,
    correctChoice: primaryCorrectChoice(entry),
    choices: [...entry.choices],
    explanations: [...(entry.explanations ?? [])],
  };
}

function buildComponentGraph(items: PayloadOrdinalPlanItem[]): PayloadOrdinalRepairReport['summary']['componentGraph'] {
  const interestingStatuses = new Set<PlanStatus>([
    'move-candidate',
    'ambiguous-review',
    'without-source-entry',
  ]);
  const byKey = new Map(items.map((item) => [itemKey(item.difficulty, item.key), item]));
  const nodes = new Set<string>();
  const adjacency = new Map<string, Set<string>>();

  const ensureNode = (node: string): void => {
    nodes.add(node);
    if (!adjacency.has(node)) adjacency.set(node, new Set());
  };
  const connect = (left: string, right: string): void => {
    ensureNode(left);
    ensureNode(right);
    adjacency.get(left)?.add(right);
    adjacency.get(right)?.add(left);
  };

  for (const item of items) {
    if (!interestingStatuses.has(item.status)) continue;
    const sourceNode = itemKey(item.difficulty, item.key);
    ensureNode(sourceNode);
    if (typeof item.targetOrdinal === 'number') {
      connect(sourceNode, itemKey(item.difficulty, item.targetOrdinal));
    }
    for (const ordinal of item.matchedOrdinals) {
      connect(sourceNode, itemKey(item.difficulty, ordinal));
    }
    for (const conflictKey of item.conflictKeys) {
      connect(sourceNode, itemKey(item.difficulty, conflictKey));
    }
  }

  const seen = new Set<string>();
  const components: PayloadOrdinalComponentSummary[] = [];
  for (const node of [...nodes].sort()) {
    if (seen.has(node)) continue;
    const queue = [node];
    const members: string[] = [];
    seen.add(node);
    while (queue.length) {
      const current = queue.shift();
      if (!current) continue;
      members.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }

    const payloads = members
      .map((member) => byKey.get(member))
      .filter((item): item is PayloadOrdinalPlanItem => Boolean(item))
      .sort((left, right) => left.key - right.key);
    if (!payloads.some((item) => interestingStatuses.has(item.status))) continue;

    const ordinals = members
      .map((member) => Number(member.split(':')[1]))
      .filter((ordinal) => Number.isFinite(ordinal))
      .sort((left, right) => left - right);
    const statusCounts: PayloadOrdinalComponentSummary['statusCounts'] = {};
    const moveSafetyCounts: PayloadOrdinalComponentSummary['moveSafetyCounts'] = {};
    for (const payload of payloads) {
      increment(statusCounts, payload.status);
      increment(moveSafetyCounts, payload.moveSafety);
    }
    const moveCandidates = payloads.filter((item) => item.status === 'move-candidate').length;
    const blockedMoves = payloads.filter((item) =>
      item.status === 'move-candidate' && item.moveSafety.startsWith('blocked-'),
    ).length;
    const autoSafeMoves = payloads.filter((item) =>
      item.status === 'move-candidate' && (
        item.moveSafety === 'safe-target-empty' || item.moveSafety === 'safe-target-chain-clear'
      ),
    ).length;
    const difficulty = payloads[0]?.difficulty ?? (members[0].split(':')[0] as QuizDifficulty);

    components.push({
      id: `${difficulty}-${components.length + 1}`,
      difficulty,
      nodeCount: members.length,
      payloadCount: payloads.length,
      ordinalRange: ordinals.length ? { min: ordinals[0], max: ordinals[ordinals.length - 1] } : undefined,
      statusCounts,
      moveSafetyCounts,
      moveCandidates,
      blockedMoves,
      autoSafeMoves,
      ambiguousReview: payloads.filter((item) => item.status === 'ambiguous-review').length,
      withoutSourceEntry: payloads.filter((item) => item.status === 'without-source-entry').length,
      hasMultipleMovers: payloads.some((item) => item.moveSafety === 'blocked-target-has-multiple-movers'),
      samplePayloads: payloads.slice(0, 12).map((item) => ({
        key: item.key,
        status: item.status,
        moveSafety: item.moveSafety,
        targetOrdinal: item.targetOrdinal,
        matchedOrdinals: item.matchedOrdinals,
        conflictKeys: item.conflictKeys,
      })),
    });
  }

  components.sort((left, right) =>
    right.nodeCount - left.nodeCount ||
    right.blockedMoves - left.blockedMoves ||
    right.ambiguousReview - left.ambiguousReview ||
    left.difficulty.localeCompare(right.difficulty),
  );

  const statusCounts: PayloadOrdinalRepairReport['summary']['componentGraph']['statusCounts'] = {};
  const moveSafetyCounts: PayloadOrdinalRepairReport['summary']['componentGraph']['moveSafetyCounts'] = {};
  const byDifficulty: PayloadOrdinalRepairReport['summary']['componentGraph']['byDifficulty'] = {};
  for (const component of components) {
    const difficultySummary = byDifficulty[component.difficulty] ?? {
      components: 0,
      largestNodeCount: 0,
      blockedComponents: 0,
      ambiguousComponents: 0,
      withoutSourceComponents: 0,
    };
    difficultySummary.components += 1;
    difficultySummary.largestNodeCount = Math.max(difficultySummary.largestNodeCount, component.nodeCount);
    if (component.blockedMoves > 0) difficultySummary.blockedComponents += 1;
    if (component.ambiguousReview > 0) difficultySummary.ambiguousComponents += 1;
    if (component.withoutSourceEntry > 0) difficultySummary.withoutSourceComponents += 1;
    byDifficulty[component.difficulty] = difficultySummary;

    for (const [status, count] of Object.entries(component.statusCounts)) {
      statusCounts[status as PlanStatus] = (statusCounts[status as PlanStatus] ?? 0) + count;
    }
    for (const [moveSafety, count] of Object.entries(component.moveSafetyCounts)) {
      moveSafetyCounts[moveSafety as PlanMoveSafety] =
        (moveSafetyCounts[moveSafety as PlanMoveSafety] ?? 0) + count;
    }
  }

  return {
    componentCount: components.length,
    statusCounts,
    moveSafetyCounts,
    byDifficulty,
    topComponents: components.slice(0, 12),
  };
}

function evaluateOrdinalFindings(
  payloadsByDifficulty: Partial<Record<QuizDifficulty, Record<number, QuizSourceLocalePayloadMap>>>,
): PayloadOrdinalCandidateFinding[] {
  const findings: PayloadOrdinalCandidateFinding[] = [];
  for (const difficulty of DIFFICULTIES) {
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

function buildCandidateReport(items: PayloadOrdinalPlanItem[]): PayloadOrdinalCandidateReport {
  const actions: PayloadOrdinalCandidateAction[] = [];
  const candidatePayloads: Partial<Record<QuizDifficulty, Record<number, QuizSourceLocalePayloadMap>>> = {};
  const byDifficulty: PayloadOrdinalCandidateReport['summary']['byDifficulty'] = {};

  for (const difficulty of DIFFICULTIES) {
    const scoped = items.filter((item) => item.difficulty === difficulty);
    const byKey = new Map(scoped.map((item) => [item.key, item]));
    const incomingByTarget = new Map<number, PayloadOrdinalPlanItem[]>();
    const original = QUIZ_SOURCE_LOCALE_PAYLOADS[difficulty] ?? {};
    const entries = getQuizPoolAuditEntries(difficulty);
    const entryOrdinals = new Set(entries.map((entry) => entry.ordinal));
    const candidate: Record<number, QuizSourceLocalePayloadMap> = {};
    candidatePayloads[difficulty] = candidate;

    for (const item of scoped) {
      if (item.status !== 'move-candidate' || typeof item.targetOrdinal !== 'number') continue;
      const incoming = incomingByTarget.get(item.targetOrdinal) ?? [];
      incoming.push(item);
      incomingByTarget.set(item.targetOrdinal, incoming);
    }

    const summary = {
      originalPayloadKeys: Object.keys(original).length,
      candidatePayloadKeys: 0,
      acceptedRemaps: 0,
      keptPayloads: 0,
      archivedDuplicatePayloads: 0,
      archivedWithoutSourcePayloads: 0,
      sourceEntryCoverageDrops: 0,
      unresolvedMultipleTargets: 0,
      residualOrdinalBlockers: 0,
    };

    const allKeys = new Set<number>([
      ...Object.keys(original).map(Number),
      ...incomingByTarget.keys(),
    ]);

    for (const key of [...allKeys].sort((left, right) => left - right)) {
      const item = byKey.get(key);
      const incoming = incomingByTarget.get(key) ?? [];
      const originalPayload = original[key];

      if (incoming.length === 1) {
        const source = incoming[0];
        const sourcePayload = original[source.key];
        if (item?.status === 'keep-current' || item?.status === 'ambiguous-current-keep') {
          if (originalPayload) {
            candidate[key] = originalPayload;
            summary.keptPayloads += 1;
          }
          summary.archivedDuplicatePayloads += 1;
          actions.push({
            action: 'archive-incoming-duplicate',
            difficulty,
            key,
            status: item.status,
            sourceKey: source.key,
            targetOrdinal: source.targetOrdinal,
            payloadHash: payloadHash(originalPayload),
            sourcePayloadHash: payloadHash(sourcePayload),
            reason: 'target already has current-entry evidence; incoming payload is displaced instead of overwriting it',
          });
          continue;
        }

        if (sourcePayload) {
          candidate[key] = sourcePayload;
          summary.acceptedRemaps += 1;
          actions.push({
            action: 'remap-incoming',
            difficulty,
            key,
            status: item?.status,
            sourceKey: source.key,
            targetOrdinal: source.targetOrdinal,
            replacedStatus: item?.status,
            sourcePayloadHash: payloadHash(sourcePayload),
            replacedPayloadHash: payloadHash(originalPayload),
            reason: 'single incoming payload uniquely matches this target ordinal',
          });
          continue;
        }

        summary.unresolvedMultipleTargets += 1;
        actions.push({
          action: 'unresolved-multiple-incoming',
          difficulty,
          key,
          sourceKeys: [source.key],
          status: item?.status,
          reason: 'incoming source payload is missing from the original map',
        });
        if (originalPayload) {
          candidate[key] = originalPayload;
          summary.keptPayloads += 1;
        }
        continue;
      }

      if (incoming.length > 1) {
        summary.unresolvedMultipleTargets += 1;
        if (originalPayload) {
          candidate[key] = originalPayload;
          summary.keptPayloads += 1;
        }
        actions.push({
          action: 'unresolved-multiple-incoming',
          difficulty,
          key,
          status: item?.status,
          sourceKeys: incoming.map((source) => source.key),
          payloadHash: payloadHash(originalPayload),
          reason: 'multiple payloads match the same target ordinal; reviewer must pick a winner or merge content',
        });
        continue;
      }

      if (item?.status === 'without-source-entry') {
        summary.archivedWithoutSourcePayloads += 1;
        actions.push({
          action: 'archive-without-source-entry',
          difficulty,
          key,
          status: item.status,
          targetOrdinal: item.targetOrdinal,
          payloadHash: payloadHash(originalPayload),
          reason: 'payload key has no current quiz source entry',
        });
        continue;
      }

      if (item?.status === 'move-candidate') {
        if (entryOrdinals.has(key)) summary.sourceEntryCoverageDrops += 1;
        actions.push({
          action: 'coverage-drop-needs-new-payload',
          difficulty,
          key,
          status: item.status,
          targetOrdinal: item.targetOrdinal,
          payloadHash: payloadHash(originalPayload),
          reason: 'payload moves away from this source entry and no trusted incoming payload fills it',
        });
        continue;
      }

      if (originalPayload) {
        candidate[key] = originalPayload;
        summary.keptPayloads += 1;
        actions.push({
          action: 'keep',
          difficulty,
          key,
          status: item?.status,
          payloadHash: payloadHash(originalPayload),
        });
      }
    }

    summary.candidatePayloadKeys = Object.keys(candidate).length;
    byDifficulty[difficulty] = summary;
  }

  const residualOrdinalFindings = evaluateOrdinalFindings(candidatePayloads);
  const residualByCode: PayloadOrdinalCandidateReport['summary']['residualByCode'] = {};
  for (const finding of residualOrdinalFindings) {
    increment(residualByCode, finding.code);
  }

  for (const difficulty of DIFFICULTIES) {
    byDifficulty[difficulty].residualOrdinalBlockers = residualOrdinalFindings.filter(
      (finding) => finding.difficulty === difficulty,
    ).length;
  }
  const sourceApplyReady = residualOrdinalFindings.length === 0 &&
    Object.values(byDifficulty).every((item) =>
      item.sourceEntryCoverageDrops === 0 && item.unresolvedMultipleTargets === 0,
    );
  const workOrder = buildWorkOrder(actions, residualOrdinalFindings);

  return {
    mode: 'quiz-payload-non-lossy-candidate',
    dryRun: true,
    sourceApplyReady,
    summary: {
      originalPayloadKeys: Object.values(byDifficulty).reduce((sum, item) => sum + item.originalPayloadKeys, 0),
      candidatePayloadKeys: Object.values(byDifficulty).reduce((sum, item) => sum + item.candidatePayloadKeys, 0),
      acceptedRemaps: Object.values(byDifficulty).reduce((sum, item) => sum + item.acceptedRemaps, 0),
      keptPayloads: Object.values(byDifficulty).reduce((sum, item) => sum + item.keptPayloads, 0),
      archivedDuplicatePayloads: Object.values(byDifficulty).reduce((sum, item) => sum + item.archivedDuplicatePayloads, 0),
      archivedWithoutSourcePayloads: Object.values(byDifficulty).reduce((sum, item) => sum + item.archivedWithoutSourcePayloads, 0),
      sourceEntryCoverageDrops: Object.values(byDifficulty).reduce((sum, item) => sum + item.sourceEntryCoverageDrops, 0),
      unresolvedMultipleTargets: Object.values(byDifficulty).reduce((sum, item) => sum + item.unresolvedMultipleTargets, 0),
      residualOrdinalBlockers: residualOrdinalFindings.length,
      residualByCode,
      byDifficulty,
    },
    residualOrdinalFindings,
    workOrder,
    actions,
  };
}

function buildWorkOrder(
  actions: PayloadOrdinalCandidateAction[],
  residualOrdinalFindings: PayloadOrdinalCandidateFinding[],
): PayloadOrdinalWorkOrder {
  const replacementActions = actions.filter((action) => action.action === 'coverage-drop-needs-new-payload');
  const collisionActions = actions.filter((action) => action.action === 'unresolved-multiple-incoming');

  return {
    mode: 'quiz-payload-repair-work-order',
    status: 'READY_FOR_REVIEW',
    generatedFilledArtifact: false,
    instructions: [
      'Do not treat this work-order as approval or as generated replacement content.',
      'Fill replacement payloads externally for every required locale with prompt plus four explanations.',
      'Every replacement explanation must preserve the English study-target choice it explains.',
      'For collision decisions, choose one incoming payload, merge content, or request a fresh replacement payload; record evidence for the decision.',
      'After filling, run the repair candidate again and then run npm run heisenberg:semantic-audit:strict before any source apply.',
    ],
    expectedFilledArtifact: {
      schema: 'quiz-payload-repair-filled-work-order-v1',
      requiredPerReplacementTask: [
        'taskId',
        'difficulty',
        'ordinal',
        'payloads.pt-BR.prompt',
        'payloads.pt-BR.explanations[4]',
        'payloads.vi.prompt',
        'payloads.vi.explanations[4]',
        'payloads.id.prompt',
        'payloads.id.explanations[4]',
        'payloads.tr.prompt',
        'payloads.tr.explanations[4]',
        'payloads.pl.prompt',
        'payloads.pl.explanations[4]',
        'reviewerEvidenceId',
      ],
      requiredPerCollisionTask: [
        'taskId',
        'difficulty',
        'targetOrdinal',
        'decision',
        'selectedSourceKey or replacementPayloads',
        'reviewerEvidenceId',
      ],
    },
    summary: {
      replacementPayloadTasks: replacementActions.length,
      collisionDecisionTasks: collisionActions.length,
      residualValidationTasks: residualOrdinalFindings.length,
      localesPerReplacementTask: STRUCTURED_PAYLOAD_LOCALES,
    },
    replacementPayloadTasks: replacementActions.map((action) => ({
      taskId: `replacement:${action.difficulty}:${action.key}`,
      difficulty: action.difficulty,
      ordinal: action.key,
      actionHash: stableHash({
        action: action.action,
        difficulty: action.difficulty,
        key: action.key,
        payloadHash: action.payloadHash,
        reason: action.reason,
      }),
      currentPayloadHash: action.payloadHash,
      sourceEntry: sourceEntryContext(action.difficulty, action.key),
      requiredLocales: STRUCTURED_PAYLOAD_LOCALES,
      acceptanceCriteria: [
        'Payload covers this exact source entry, not the previous shifted payload.',
        'All five structured source locales are present.',
        'Each locale has one prompt and exactly four explanations.',
        'English answer choices remain the study target and are not translated.',
        'No source-locale prompt/explanation is copied from Russian, Ukrainian, Spanish unless the locale itself is Spanish.',
      ],
    })),
    collisionDecisionTasks: collisionActions.map((action) => {
      const original = QUIZ_SOURCE_LOCALE_PAYLOADS[action.difficulty] ?? {};
      return {
        taskId: `collision:${action.difficulty}:${action.key}`,
        difficulty: action.difficulty,
        targetOrdinal: action.key,
        currentPayloadHash: action.payloadHash,
        incomingSourceKeys: action.sourceKeys ?? [],
        incomingPayloadHashes: (action.sourceKeys ?? []).map((sourceKey) => ({
          sourceKey,
          payloadHash: payloadHash(original[sourceKey]),
        })),
        sourceEntry: sourceEntryContext(action.difficulty, action.key),
        acceptanceCriteria: [
          'Decision must name the selected source key, merge strategy, or replacement-payload requirement.',
          'Decision must not overwrite a current payload without archiving its hash.',
          'Decision must resolve the target to exactly one payload before source apply.',
          'Decision needs real reviewer evidence and must not be synthesized by tooling.',
        ],
      };
    }),
    residualValidationTasks: residualOrdinalFindings.map((finding) => ({
      taskId: `residual:${finding.difficulty}:${finding.ordinal}:${finding.code}`,
      difficulty: finding.difficulty,
      ordinal: finding.ordinal,
      code: finding.code,
      matchedOrdinal: finding.matchedOrdinal,
      matchedOrdinals: finding.matchedOrdinals,
      sourceEntry: sourceEntryContext(finding.difficulty, finding.ordinal),
      acceptanceCriteria: [
        'Residual finding must disappear in the next repair candidate or be explicitly documented as a reviewer decision.',
        'The final candidate must have zero residual ordinal blockers before source apply.',
      ],
    })),
  };
}

export function buildQuizPayloadOrdinalRepairPlan(): PayloadOrdinalRepairReport {
  const items: PayloadOrdinalPlanItem[] = [];
  for (const difficulty of DIFFICULTIES) {
    const payloadsByOrdinal = QUIZ_SOURCE_LOCALE_PAYLOADS[difficulty] ?? {};
    for (const key of Object.keys(payloadsByOrdinal).map(Number).sort((a, b) => a - b)) {
      const payloads = payloadsByOrdinal[key];
      if (!payloads) continue;
      items.push(classifyPayload(difficulty, key, payloads));
    }
  }
  attachMoveSafety(items);

  const byDifficulty: PayloadOrdinalRepairReport['summary']['byDifficulty'] = {};
  for (const difficulty of DIFFICULTIES) {
    const scoped = items.filter((item) => item.difficulty === difficulty);
    byDifficulty[difficulty] = {
      payloads: scoped.length,
      moveCandidates: scoped.filter((item) => item.status === 'move-candidate').length,
      autoSafeMoves: scoped.filter((item) => item.moveSafety === 'safe-target-empty' || item.moveSafety === 'safe-target-chain-clear').length,
      blockedMoves: scoped.filter((item) => item.status === 'move-candidate' && item.moveSafety.startsWith('blocked-')).length,
      ambiguousReview: scoped.filter((item) => item.status === 'ambiguous-review').length,
      withoutSourceEntry: scoped.filter((item) => item.status === 'without-source-entry').length,
      withoutSourceWithUniqueTarget: scoped.filter((item) =>
        item.status === 'without-source-entry' && typeof item.targetOrdinal === 'number',
      ).length,
    };
  }
  const componentGraph = buildComponentGraph(items);
  const candidate = buildCandidateReport(items);

  return {
    generatedAt: new Date().toISOString(),
    mode: 'quiz-payload-ordinal-repair-plan',
    dryRun: true,
    sourceFile: 'app/quiz_source_locale_payloads.ts',
    summary: {
      payloads: items.length,
      keepCurrent: items.filter((item) => item.status === 'keep-current').length,
      weakEvidenceKeep: items.filter((item) => item.status === 'weak-evidence-keep').length,
      moveCandidates: items.filter((item) => item.status === 'move-candidate').length,
      ambiguousCurrentKeep: items.filter((item) => item.status === 'ambiguous-current-keep').length,
      ambiguousReview: items.filter((item) => item.status === 'ambiguous-review').length,
      withoutSourceEntry: items.filter((item) => item.status === 'without-source-entry').length,
      withoutSourceWithUniqueTarget: items.filter((item) =>
        item.status === 'without-source-entry' && typeof item.targetOrdinal === 'number',
      ).length,
      autoSafeMoves: items.filter((item) => item.moveSafety === 'safe-target-empty' || item.moveSafety === 'safe-target-chain-clear').length,
      blockedMoves: items.filter((item) => item.status === 'move-candidate' && item.moveSafety.startsWith('blocked-')).length,
      byDifficulty,
      componentGraph,
    },
    candidate,
    items,
  };
}

function renderMarkdown(report: PayloadOrdinalRepairReport): string {
  const blocked = report.items
    .filter((item) => item.status === 'move-candidate' && item.moveSafety.startsWith('blocked-'))
    .slice(0, 60);
  const ambiguous = report.items
    .filter((item) => item.status === 'ambiguous-review')
    .slice(0, 40);
  const withoutSource = report.items
    .filter((item) => item.status === 'without-source-entry');

  return [
    '# Heisenberg Quiz Payload Ordinal Repair Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Dry run: ${report.dryRun ? 'yes' : 'no'}`,
    `Source file: ${report.sourceFile}`,
    '',
    '## Summary',
    `- Payloads: ${report.summary.payloads}`,
    `- Move candidates: ${report.summary.moveCandidates}`,
    `- Auto-safe moves: ${report.summary.autoSafeMoves}`,
    `- Blocked moves: ${report.summary.blockedMoves}`,
    `- Ambiguous review: ${report.summary.ambiguousReview}`,
    `- Without source entry: ${report.summary.withoutSourceEntry}`,
    `- Without source entry with unique target: ${report.summary.withoutSourceWithUniqueTarget}`,
    `- Conflict components: ${report.summary.componentGraph.componentCount}`,
    `- Candidate accepted remaps: ${report.candidate.summary.acceptedRemaps}`,
    `- Candidate residual ordinal blockers: ${report.candidate.summary.residualOrdinalBlockers}`,
    `- Candidate source-entry coverage drops: ${report.candidate.summary.sourceEntryCoverageDrops}`,
    `- Candidate source apply ready: ${report.candidate.sourceApplyReady ? 'yes' : 'no'}`,
    `- Work-order replacement payload tasks: ${report.candidate.workOrder.summary.replacementPayloadTasks}`,
    `- Work-order collision decision tasks: ${report.candidate.workOrder.summary.collisionDecisionTasks}`,
    '',
    '## By Difficulty',
    ...Object.entries(report.summary.byDifficulty).map(([difficulty, summary]) =>
      `- ${difficulty}: payloads ${summary.payloads}, moves ${summary.moveCandidates}, safe ${summary.autoSafeMoves}, blocked ${summary.blockedMoves}, ambiguous ${summary.ambiguousReview}, without-source ${summary.withoutSourceEntry}`,
    ),
    '',
    '## Conflict Components',
    ...(report.summary.componentGraph.topComponents.length ? report.summary.componentGraph.topComponents.map((component) =>
      `- ${component.id}: ${component.difficulty}, nodes ${component.nodeCount}, range #${component.ordinalRange?.min ?? '?'}-#${component.ordinalRange?.max ?? '?'}, moves ${component.moveCandidates}, blocked ${component.blockedMoves}, ambiguous ${component.ambiguousReview}, without-source ${component.withoutSourceEntry}, multiple-movers ${component.hasMultipleMovers ? 'yes' : 'no'}; sample: ${component.samplePayloads.map((item) => `#${item.key}:${item.status}`).join(', ')}`,
    ) : ['No conflict components']),
    '',
    '## Non-lossy Candidate',
    `- Source apply ready: ${report.candidate.sourceApplyReady ? 'yes' : 'no'}`,
    `- Accepted remaps: ${report.candidate.summary.acceptedRemaps}`,
    `- Archived duplicate payloads: ${report.candidate.summary.archivedDuplicatePayloads}`,
    `- Archived without-source payloads: ${report.candidate.summary.archivedWithoutSourcePayloads}`,
    `- Source-entry coverage drops needing new payloads: ${report.candidate.summary.sourceEntryCoverageDrops}`,
    `- Unresolved multiple targets: ${report.candidate.summary.unresolvedMultipleTargets}`,
    `- Residual ordinal blockers: ${report.candidate.summary.residualOrdinalBlockers}`,
    `- Residual by code: ${Object.entries(report.candidate.summary.residualByCode).map(([code, count]) => `${code}=${count}`).join(', ') || 'none'}`,
    `- Work-order replacement payload tasks: ${report.candidate.workOrder.summary.replacementPayloadTasks}`,
    `- Work-order collision decision tasks: ${report.candidate.workOrder.summary.collisionDecisionTasks}`,
    `- Work-order residual validation tasks: ${report.candidate.workOrder.summary.residualValidationTasks}`,
    '',
    '## Work-order Replacement Samples',
    ...(report.candidate.workOrder.replacementPayloadTasks.length ? report.candidate.workOrder.replacementPayloadTasks.slice(0, 20).map((task) =>
      `- ${task.taskId}: correct "${task.sourceEntry?.correctChoice ?? 'missing source entry'}"; locales: ${task.requiredLocales.join(', ')}`,
    ) : ['No replacement payload tasks']),
    '',
    '## Work-order Collision Decisions',
    ...(report.candidate.workOrder.collisionDecisionTasks.length ? report.candidate.workOrder.collisionDecisionTasks.map((task) =>
      `- ${task.taskId}: incoming ${task.incomingSourceKeys.join(', ')}; correct "${task.sourceEntry?.correctChoice ?? 'missing source entry'}"`,
    ) : ['No collision decision tasks']),
    '',
    '## Candidate Residual Samples',
    ...(report.candidate.residualOrdinalFindings.length ? report.candidate.residualOrdinalFindings.slice(0, 20).map((finding) =>
      `- ${finding.difficulty} #${finding.ordinal} ${finding.code}${finding.matchedOrdinal ? ` -> #${finding.matchedOrdinal}` : ''}${finding.matchedOrdinals?.length ? ` matches: ${finding.matchedOrdinals.join(', ')}` : ''}${finding.sample ? `; sample: ${finding.sample}` : ''}`,
    ) : ['No residual ordinal findings in the candidate']),
    '',
    '## Blocked Move Samples',
    ...(blocked.length ? blocked.map((item) =>
      `- ${item.difficulty} #${item.key} -> #${item.targetOrdinal} ${item.moveSafety}; conflicts: ${item.conflictKeys.join(', ') || 'none'}; prompt: ${item.promptSample ?? ''}`,
    ) : ['No blocked move samples']),
    '',
    '## Ambiguous Review Samples',
    ...(ambiguous.length ? ambiguous.map((item) =>
      `- ${item.difficulty} #${item.key}; matches: ${item.matchedOrdinals.join(', ')}; prompt: ${item.promptSample ?? ''}`,
    ) : ['No ambiguous review samples']),
    '',
    '## Without Source Entry',
    ...(withoutSource.length ? withoutSource.map((item) =>
      `- ${item.difficulty} #${item.key}${item.targetOrdinal ? ` -> #${item.targetOrdinal}` : ''}; prompt: ${item.promptSample ?? ''}`,
    ) : ['No without-source payloads']),
    '',
  ].join('\n');
}

function writeReport(report: PayloadOrdinalRepairReport): string {
  const outDir = path.join(process.cwd(), 'docs', 'heisenberg', 'quiz-payload-ordinal-repair', timestampSlug());
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'repair_plan.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(outDir, 'repair_plan.md'), renderMarkdown(report), 'utf8');
  fs.writeFileSync(path.join(outDir, 'work_order.json'), `${JSON.stringify(report.candidate.workOrder, null, 2)}\n`, 'utf8');
  fs.writeFileSync(
    path.join(outDir, 'work_order.md'),
    [
      '# Heisenberg Quiz Payload Repair Work-order',
      '',
      `Status: ${report.candidate.workOrder.status}`,
      `Generated filled artifact: ${report.candidate.workOrder.generatedFilledArtifact ? 'yes' : 'no'}`,
      '',
      '## Summary',
      `- Replacement payload tasks: ${report.candidate.workOrder.summary.replacementPayloadTasks}`,
      `- Collision decision tasks: ${report.candidate.workOrder.summary.collisionDecisionTasks}`,
      `- Residual validation tasks: ${report.candidate.workOrder.summary.residualValidationTasks}`,
      `- Required locales: ${report.candidate.workOrder.summary.localesPerReplacementTask.join(', ')}`,
      '',
      '## Instructions',
      ...report.candidate.workOrder.instructions.map((line) => `- ${line}`),
      '',
      '## Replacement Payload Tasks',
      ...report.candidate.workOrder.replacementPayloadTasks.map((task) =>
        `- ${task.taskId}: ${task.difficulty} #${task.ordinal}; correct "${task.sourceEntry?.correctChoice ?? 'missing source entry'}"; current hash ${task.currentPayloadHash ?? 'none'}`,
      ),
      '',
      '## Collision Decision Tasks',
      ...report.candidate.workOrder.collisionDecisionTasks.map((task) =>
        `- ${task.taskId}: ${task.difficulty} #${task.targetOrdinal}; incoming ${task.incomingSourceKeys.join(', ')}; correct "${task.sourceEntry?.correctChoice ?? 'missing source entry'}"`,
      ),
      '',
      '## Residual Validation Tasks',
      ...report.candidate.workOrder.residualValidationTasks.map((task) =>
        `- ${task.taskId}: ${task.code}${task.matchedOrdinal ? ` -> #${task.matchedOrdinal}` : ''}${task.matchedOrdinals?.length ? ` matches ${task.matchedOrdinals.join(', ')}` : ''}`,
      ),
      '',
    ].join('\n'),
    'utf8',
  );
  return outDir;
}

if (require.main === module) {
  const report = buildQuizPayloadOrdinalRepairPlan();
  const outDir = writeReport(report);
  console.log(
    `Heisenberg quiz payload ordinal repair plan: ${report.summary.moveCandidates} move candidates, ` +
      `${report.summary.autoSafeMoves} auto-safe, ${report.summary.blockedMoves} blocked, ` +
      `${report.summary.ambiguousReview} ambiguous, ${report.summary.withoutSourceEntry} without-source`,
  );
  console.log(`Report: ${path.relative(process.cwd(), outDir).replace(/\\/g, '/')}`);
}
