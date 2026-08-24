import { createHash } from 'node:crypto';

import {
  TOURNAMENT_ROUND_MODE_PLAN,
  TOURNAMENT_V11_EXPOSURE_DWELL_DAYS,
  TOURNAMENT_V11_EXPOSURE_EPOCH_DAY,
  tournamentV11ExposureCellOffset,
  validateTournamentTaskForNewRoom,
  type TournamentTask,
  type TournamentTaskExplanation,
} from './tournament_core';
import {
  validateTournamentSemanticCandidate,
  type ReviewSubject,
  type TournamentSemanticCandidate,
} from './tournament_semantic_contract';
import {
  semanticReceiptId,
  semanticReceiptLedgerSha256,
  semanticReceiptSha256,
  validateTournamentSemanticReceipt,
  type TournamentSemanticReceipt,
} from './tournament_semantic_receipt_store';
import {
  TOURNAMENT_V11_CELL_QUOTAS,
  TOURNAMENT_V11_REQUIRED_FILL_TRAP_TYPES,
  type TournamentV11Selection,
} from './tournament_pool_v11_selector';
import { TOURNAMENT_TASKS_PER_MODE_SLICE } from './tournament_pool_plan';

export const TOURNAMENT_POOL_V11_VERSION = 'tpool_20260808_v11' as const;
export const TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS = Object.freeze({
  guess_phrase: 38,
  fill_gap: 13,
  find_oddity: 8,
  translate_build: 38,
  speed_match: 5,
} as const);

export type TournamentV11Task = TournamentTask & Required<Pick<TournamentTask,
  | 'source' | 'poolVersion' | 'exposureBucket' | 'lifecycle'
  | 'semanticSignature' | 'contentSha256' | 'semanticReceiptId'
  | 'semanticReceiptSha256' | 'reviewContractVersion' | 'promptSetSha256'
  | 'provenanceKeys'
>>;

export type FinalizedTournamentV11TaskPool = Readonly<{
  poolVersion: typeof TOURNAMENT_POOL_V11_VERSION;
  tasks: readonly TournamentV11Task[];
  taskCount: 4_000;
  exposureBucketCounts: typeof TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS;
  exposureLayoutHash: string;
  manifestSha256: string;
  bundleSha256: string;
  receiptLedgerSha256: string;
}>;

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Readonly<Record<string, unknown>>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('tournament_v11_canonical_value_invalid');
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

export function tournamentV11TaskId(poolVersion: string, contentSha256: string): string {
  if (poolVersion !== TOURNAMENT_POOL_V11_VERSION || !/^[a-f0-9]{64}$/u.test(contentSha256)) {
    throw new Error('tournament_v11_task_identity_invalid');
  }
  return `tv11_${createHash('sha256').update(`${poolVersion}\n${contentSha256}`, 'utf8').digest('hex')}`;
}

function explanationForChoice(subjects: readonly ReviewSubject[], correctIndex: number): TournamentTaskExplanation {
  return Object.freeze({
    ruleNote: 'Choose the one exact reviewed answer.',
    example: 'Every option was checked independently before publication.',
    wrongOptionReasons: Object.freeze(subjects.map((subject, index) => (
      index === correctIndex ? '' : subject.reason || 'This option does not satisfy the reviewed task.'
    ))) as string[],
  });
}

function choiceProjection(candidate: TournamentSemanticCandidate): Pick<TournamentTask, 'payload' | 'explanation'> {
  const subjects = candidate.reviewSubjects;
  const correctIndex = subjects.findIndex((subject) => (
    subject.declaredRole === 'correct' || subject.declaredRole === 'odd'
  ));
  if (subjects.length !== 4 || correctIndex < 0) throw new Error('tournament_v11_candidate_projection_invalid');
  return {
    payload: {
      phrase: candidate.prompt,
      options: subjects.map((subject) => subject.text),
      correctIndex,
    },
    explanation: explanationForChoice(subjects, correctIndex),
  };
}

function translateProjection(candidate: TournamentSemanticCandidate): Pick<TournamentTask, 'payload' | 'explanation'> {
  const required = candidate.reviewSubjects
    .filter((subject) => subject.declaredRole === 'required')
    .sort((left, right) => Number(left.metadata?.sequenceIndex) - Number(right.metadata?.sequenceIndex));
  const decoys = candidate.reviewSubjects.filter((subject) => subject.declaredRole === 'decoy');
  if (required.length < 1 || decoys.length !== 1) throw new Error('tournament_v11_candidate_projection_invalid');
  const correctTokens = required.map(({ text }) => text);
  return {
    payload: {
      phrase: candidate.prompt,
      wordBank: [...correctTokens, decoys[0].text],
      correctTokens,
      correctTokenCount: correctTokens.length,
      correctAnswer: correctTokens.join(' '),
    },
    explanation: {
      ruleNote: 'Build the exact authored phrase; one reviewed decoy does not belong.',
      example: `${correctTokens.join(' ')} — exact authored sequence.`,
      wrongOptionReasons: [],
    },
  };
}

function speedProjection(candidate: TournamentSemanticCandidate): Pick<TournamentTask, 'payload' | 'explanation'> {
  const pairs = candidate.reviewSubjects;
  if (pairs.length !== 6 || pairs.some((subject) => subject.declaredRole !== 'pair' || !subject.completedText)) {
    throw new Error('tournament_v11_candidate_projection_invalid');
  }
  const rightOptions = pairs.map((subject) => subject.completedText!);
  return {
    payload: {
      prompt: candidate.prompt,
      rightOptions,
      items: pairs.map((subject, correctIndex) => ({
        prompt: subject.text,
        options: rightOptions,
        correctIndex,
        explanation: {
          ruleNote: 'Use the exact reviewed lexical pair.',
          example: `${subject.text} — ${subject.completedText}.`,
          wrongOptionReasons: rightOptions.map((_, index) => index === correctIndex ? '' : 'This is another pair.'),
        },
      })),
    },
    explanation: {
      ruleNote: 'Match all six reviewed pairs.',
      example: `${pairs[0].text} — ${pairs[0].completedText}.`,
      wrongOptionReasons: [],
    },
  };
}

function projection(candidate: TournamentSemanticCandidate): Pick<TournamentTask, 'payload' | 'explanation'> {
  if (candidate.mode === 'translate_build') return translateProjection(candidate);
  if (candidate.mode === 'speed_match') return speedProjection(candidate);
  return choiceProjection(candidate);
}

function exactSelection(selection: TournamentV11Selection): selection is Extract<TournamentV11Selection, { ok: true }> {
  if (!selection.ok || selection.selected.length !== 4_000 || selection.manifest.total !== 4_000
    || selection.manifest.semanticSignatureCount !== 4_000) return false;
  const fill = selection.manifest.fill;
  return Object.entries(TOURNAMENT_V11_CELL_QUOTAS).every(([cell, count]) => (
    selection.manifest.modeDifficultyCounts[cell as keyof typeof TOURNAMENT_V11_CELL_QUOTAS] === count
  ))
    && fill.total === 500
    && fill.contentWordCount >= 300
    && fill.articleAndToBeCount <= 75
    && fill.positionCounts.first >= 75
    && fill.positionCounts.middle >= 75
    && fill.positionCounts.middle <= 325
    && fill.positionCounts.last >= 75
    && TOURNAMENT_V11_REQUIRED_FILL_TRAP_TYPES.every((trapType) => fill.trapTypeCounts[trapType] > 0);
}

function provenanceParityByContent(
  selected: readonly TournamentSemanticCandidate[],
): ReadonlyMap<string, 0 | 1> {
  const parent = selected.map((_, index) => index);
  const find = (start: number): number => {
    let root = start;
    while (parent[root] !== root) root = parent[root];
    let index = start;
    while (parent[index] !== index) {
      const next = parent[index];
      parent[index] = root;
      index = next;
    }
    return root;
  };
  const union = (left: number, right: number): void => {
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent[Math.max(leftRoot, rightRoot)] = Math.min(leftRoot, rightRoot);
  };
  const firstByKey = new Map<string, number>();
  selected.forEach((candidate, index) => candidate.provenanceKeys.forEach((key) => {
    const first = firstByKey.get(key);
    if (first === undefined) firstByKey.set(key, index);
    else union(first, index);
  }));
  const components = new Map<number, number[]>();
  selected.forEach((_, index) => {
    const root = find(index);
    const members = components.get(root) ?? [];
    members.push(index);
    components.set(root, members);
  });
  const cellCounts = [new Map<string, number>(), new Map<string, number>()] as const;
  const result = new Map<string, 0 | 1>();
  [...components.values()].sort((left, right) => (
    selected[left[0]].candidateId.localeCompare(selected[right[0]].candidateId)
  )).forEach((members, componentIndex) => {
    const cells = new Map<string, number>();
    members.forEach((index) => {
      const candidate = selected[index];
      const cell = `${candidate.mode}:${candidate.difficulty}`;
      cells.set(cell, (cells.get(cell) ?? 0) + 1);
    });
    const load = ([0, 1] as const).map((parity) => [...cells].reduce((sum, [cell, count]) => (
      sum + (cellCounts[parity].get(cell) ?? 0) * count
    ), 0));
    const parity: 0 | 1 = load[0] === load[1]
      ? componentIndex % 2 as 0 | 1
      : load[0] < load[1] ? 0 : 1;
    members.forEach((index) => result.set(selected[index].contentSha256, parity));
    cells.forEach((count, cell) => cellCounts[parity].set(cell, (cellCounts[parity].get(cell) ?? 0) + count));
  });
  return result;
}

function exposureBucketOrdinalByContent(
  selected: readonly TournamentSemanticCandidate[],
  provenanceParity: ReadonlyMap<string, 0 | 1>,
): ReadonlyMap<string, number> {
  const reachableCapacity = new Map<string, number[]>();
  const difficultyForRound = (roundNo: number, dayOrdinal: number): number => {
    if (roundNo === 1) return 1;
    if (roundNo === 2) return dayOrdinal % 2 === 0 ? 1 : 2;
    if (roundNo === 3) return 2;
    return 3;
  };
  const capacitiesFor = (mode: TournamentSemanticCandidate['mode'], difficulty: number, parity: 0 | 1) => {
    const key = `${mode}:${difficulty}:${parity}`;
    const cached = reachableCapacity.get(key);
    if (cached) return cached;
    const bucketCount = TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS[mode];
    const offsets = Array.from({ length: bucketCount }, () => [] as number[]);
    const dwellDays = TOURNAMENT_V11_EXPOSURE_DWELL_DAYS[mode] ?? 1;
    for (let relativeDay = 0; relativeDay < 730; relativeDay += 1) {
      const dayOrdinal = TOURNAMENT_V11_EXPOSURE_EPOCH_DAY + relativeDay;
      if (((dayOrdinal % 2) + 2) % 2 !== parity) continue;
      const bucket = Math.floor(relativeDay / dwellDays) % bucketCount;
      const matchingRounds = TOURNAMENT_ROUND_MODE_PLAN.map((modes, index) => ({ modes, roundNo: index + 1 }))
        .filter(({ modes, roundNo }) => modes.includes(mode as never)
          && difficultyForRound(roundNo, dayOrdinal) === difficulty);
      for (let occurrence = 0; occurrence < matchingRounds.length; occurrence += 1) {
        for (const [series, shard] of [['daily_1200', 0], ['daily_1900', 1]] as const) {
          offsets[bucket].push(tournamentV11ExposureCellOffset(
            dayOrdinal, series, shard, matchingRounds.length, occurrence,
          ));
        }
      }
    }
    const capacities = offsets.map((bucketOffsets) => {
      let maximum = 0;
      for (let size = 1; size <= TOURNAMENT_TASKS_PER_MODE_SLICE; size += 1) {
        if (new Set(bucketOffsets.map((offset) => offset % size)).size === size) maximum = size;
      }
      return maximum;
    });
    reachableCapacity.set(key, capacities);
    return capacities;
  };
  const cellOrdinals = new Map<string, number>();
  const assignments = selected.map((candidate) => {
    const parity = provenanceParity.get(candidate.contentSha256);
    if (parity === undefined) throw new Error('tournament_v11_provenance_parity_invalid');
    const cell = `${candidate.mode}:${candidate.difficulty}:${parity}`;
    capacitiesFor(candidate.mode, candidate.difficulty, parity);
    const ordinal = cellOrdinals.get(cell) ?? 0;
    cellOrdinals.set(cell, ordinal + 1);
    return { candidate, cell, bucket: ordinal % TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS[candidate.mode] };
  });
  for (const mode of Object.keys(TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS) as Array<keyof typeof TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS>) {
    const bucketCount = TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS[mode];
    const modeAssignments = assignments.filter(({ candidate }) => candidate.mode === mode);
    const loads = Array.from({ length: bucketCount }, () => 0);
    const cellLoads = new Map<string, number[]>();
    for (const assignment of modeAssignments) {
      loads[assignment.bucket] += 1;
      const counts = cellLoads.get(assignment.cell) ?? Array.from({ length: bucketCount }, () => 0);
      counts[assignment.bucket] += 1;
      cellLoads.set(assignment.cell, counts);
    }
    while (Math.max(...loads) > TOURNAMENT_TASKS_PER_MODE_SLICE) {
      const source = loads.findIndex((load) => load > TOURNAMENT_TASKS_PER_MODE_SLICE);
      const movable = modeAssignments.filter((assignment) => assignment.bucket === source)
        .sort((left, right) => right.candidate.candidateId.localeCompare(left.candidate.candidateId));
      let moved = false;
      for (const assignment of movable) {
        const counts = cellLoads.get(assignment.cell)!;
        const capacities = reachableCapacity.get(assignment.cell)!;
        const target = Array.from({ length: bucketCount }, (_, bucket) => bucket)
          .filter((bucket) => loads[bucket] < TOURNAMENT_TASKS_PER_MODE_SLICE
            && counts[bucket] < counts[source]
            && counts[bucket] + 1 <= capacities[bucket])
          .sort((left, right) => (capacities[right] - counts[right]) - (capacities[left] - counts[left])
            || counts[left] - counts[right]
            || loads[left] - loads[right] || left - right)[0];
        if (target === undefined) continue;
        loads[source] -= 1;
        loads[target] += 1;
        counts[source] -= 1;
        counts[target] += 1;
        assignment.bucket = target;
        moved = true;
        break;
      }
      if (!moved) throw new Error('tournament_v11_exposure_bucket_limit');
    }
  }
  return new Map(assignments.map(({ candidate, bucket }) => [candidate.contentSha256, bucket] as const));
}

export function finalizeTournamentV11TaskPool(input: Readonly<{
  selection: TournamentV11Selection;
  receipts: ReadonlyMap<string, TournamentSemanticReceipt>;
}>): FinalizedTournamentV11TaskPool {
  if (!input || !exactSelection(input.selection) || !(input.receipts instanceof Map)) {
    throw new Error('tournament_v11_selection_invalid');
  }
  const selected = [...input.selection.selected].sort((left, right) => (
    left.mode.localeCompare(right.mode) || left.difficulty - right.difficulty
      || left.candidateId.localeCompare(right.candidateId)
  ));
  const provenanceParity = provenanceParityByContent(selected);
  const exposureBucketOrdinals = exposureBucketOrdinalByContent(selected, provenanceParity);
  const tasks: TournamentV11Task[] = [];
  const receiptLedger: Array<Readonly<{ id: string; sha256: string }>> = [];
  for (const candidate of selected) {
    if (!validateTournamentSemanticCandidate(candidate).ok) throw new Error('tournament_v11_candidate_invalid');
    const receipt = input.receipts.get(candidate.contentSha256);
    if (!receipt) throw new Error('tournament_v11_receipt_missing');
    try { validateTournamentSemanticReceipt(receipt, candidate); }
    catch { throw new Error('tournament_v11_receipt_invalid'); }
    if (receipt.decision !== 'PASS') throw new Error('tournament_v11_receipt_invalid');
    const receiptId = semanticReceiptId(candidate.contentSha256, receipt.reviewContractVersion, receipt.promptSetSha256, receipt);
    const receiptSha256 = semanticReceiptSha256(receipt);
    const parity = provenanceParity.get(candidate.contentSha256);
    if (parity === undefined) throw new Error('tournament_v11_provenance_parity_invalid');
    const bucketOrdinal = exposureBucketOrdinals.get(candidate.contentSha256);
    if (bucketOrdinal === undefined) throw new Error('tournament_v11_exposure_bucket_limit');
    const exposureBucket = `${TOURNAMENT_POOL_V11_VERSION}:${candidate.mode}:${String(bucketOrdinal).padStart(3, '0')}`;
    const projected = projection(candidate);
    const task: TournamentV11Task = {
      taskId: tournamentV11TaskId(TOURNAMENT_POOL_V11_VERSION, candidate.contentSha256),
      mode: candidate.mode,
      isVoice: false,
      difficulty: candidate.difficulty,
      payload: projected.payload,
      explanation: projected.explanation,
      tags: [`pool:${TOURNAMENT_POOL_V11_VERSION}`, `provenance-parity:${parity}`],
      provenanceKeys: [...candidate.provenanceKeys],
      verified: true,
      source: 'ai',
      poolVersion: TOURNAMENT_POOL_V11_VERSION,
      exposureBucket,
      lifecycle: 'published',
      semanticSignature: candidate.semanticSignature,
      contentSha256: candidate.contentSha256,
      semanticReceiptId: receiptId,
      semanticReceiptSha256: receiptSha256,
      reviewContractVersion: receipt.reviewContractVersion,
      promptSetSha256: receipt.promptSetSha256,
    };
    if (!validateTournamentTaskForNewRoom(task).ok) throw new Error('tournament_v11_task_invalid');
    tasks.push(Object.freeze(task));
    receiptLedger.push(Object.freeze({ id: receiptId, sha256: receiptSha256 }));
  }
  if (new Set(tasks.map(({ taskId }) => taskId)).size !== 4_000
    || new Set(tasks.map(({ semanticSignature }) => semanticSignature)).size !== 4_000) {
    throw new Error('tournament_v11_task_identity_invalid');
  }
  const bucketLoads = new Map<string, number>();
  tasks.forEach((task) => bucketLoads.set(task.exposureBucket, (bucketLoads.get(task.exposureBucket) ?? 0) + 1));
  const expectedBucketCount = Object.values(TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS)
    .reduce((sum, count) => sum + count, 0);
  if (bucketLoads.size !== expectedBucketCount
    || [...bucketLoads.values()].some((count) => count > TOURNAMENT_TASKS_PER_MODE_SLICE)) {
    throw new Error('tournament_v11_exposure_bucket_limit');
  }
  const hashOrderedTasks = [...tasks].sort((left, right) => left.taskId.localeCompare(right.taskId));
  const exposureLayoutHash = sha256({
    counts: TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
    entries: hashOrderedTasks.map(({ taskId, exposureBucket }) => ({ taskId, exposureBucket })),
  });
  const manifestSha256 = sha256(input.selection.manifest);
  const receiptLedgerSha256 = semanticReceiptLedgerSha256(receiptLedger);
  const bundleSha256 = sha256({
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    manifestSha256,
    tasks: hashOrderedTasks,
  });
  return Object.freeze({
    poolVersion: TOURNAMENT_POOL_V11_VERSION,
    tasks: Object.freeze(tasks),
    taskCount: 4_000,
    exposureBucketCounts: TOURNAMENT_V11_EXPOSURE_BUCKET_COUNTS,
    exposureLayoutHash,
    manifestSha256,
    bundleSha256,
    receiptLedgerSha256,
  });
}
