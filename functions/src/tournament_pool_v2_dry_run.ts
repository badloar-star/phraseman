import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import * as admin from 'firebase-admin';
import {
  TOURNAMENT_ROUND_MODE_PLAN,
  selectRoundTasks,
  validateTournamentTaskForNewRoom,
} from './tournament_core';
import {
  TOURNAMENT_SOURCE_PLANS,
  loadTournamentSourceDays,
} from './tournament_content_source';
import {
  NEW_TOURNAMENT_POOL_VERSION,
  NEW_TOURNAMENT_POOL_MODES,
  buildNewTournamentPool,
  type NewTournamentTask,
} from './tournament_pool_v2_factory';
import {
  tournamentExposureBucketId,
  type TournamentPoolBarrierToken,
} from './tournaments';

const TOURNAMENT_TASKS_COLLECTION = 'tournamentTasks';
const PREFLIGHT_ROOM_SEEDS = 150;

type EncodedFirestoreValue = unknown;

function sha256(value: string | Buffer): string {
  return createHash('sha256').update(value).digest('hex');
}

function argValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const argument = process.argv.slice(2).find((entry) => entry.startsWith(prefix));
  return argument?.slice(prefix.length);
}

function encodeFirestoreValue(value: unknown): EncodedFirestoreValue {
  if (value === null || value === undefined || typeof value === 'string'
    || typeof value === 'number' || typeof value === 'boolean') return value;
  if (Buffer.isBuffer(value)) {
    return { __firestoreType: 'bytes', base64: value.toString('base64') };
  }
  if (value instanceof admin.firestore.Timestamp) {
    return {
      __firestoreType: 'timestamp',
      seconds: value.seconds,
      nanoseconds: value.nanoseconds,
    };
  }
  if (value instanceof admin.firestore.GeoPoint) {
    return {
      __firestoreType: 'geopoint',
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }
  if (value instanceof admin.firestore.DocumentReference) {
    return { __firestoreType: 'reference', path: value.path };
  }
  if (Array.isArray(value)) return value.map(encodeFirestoreValue);
  if (typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, encodeFirestoreValue(entry)]));
  }
  throw new Error(`unsupported_firestore_backup_value:${typeof value}`);
}

function preflightRooms(tasks: readonly NewTournamentTask[]): { roomSeeds: number; taskSlots: number } {
  let taskSlots = 0;
  for (let roomIndex = 0; roomIndex < PREFLIGHT_ROOM_SEEDS; roomIndex += 1) {
    const used = new Set<string>();
    for (let roundIndex = 0; roundIndex < TOURNAMENT_ROUND_MODE_PLAN.length; roundIndex += 1) {
      const roundNo = roundIndex + 1;
      for (const mode of TOURNAMENT_ROUND_MODE_PLAN[roundIndex]) {
        const selected = selectRoundTasks({
          pool: tasks.filter((task) => task.mode === mode && !used.has(task.taskId)),
          roomId: `new-pool-dry-run-${roomIndex}`,
          roundNo,
          count: 4,
          modeKind: 'mix',
        })[0];
        if (!selected) throw new Error(`new_pool_preflight_unavailable:${roomIndex}:${roundNo}:${mode}`);
        used.add(selected.taskId);
        taskSlots += 1;
      }
    }
    if (used.size !== 16) throw new Error(`new_pool_preflight_duplicate:${roomIndex}:${used.size}`);
  }
  return { roomSeeds: PREFLIGHT_ROOM_SEEDS, taskSlots };
}

function payloadShape(task: NewTournamentTask): Record<string, unknown> {
  const shape: Record<string, unknown> = {
    keys: Object.keys(task.payload).sort(),
    explanationReasons: task.explanation?.wrongOptionReasons?.length ?? 0,
  };
  if (Array.isArray(task.payload.options)) shape.options = task.payload.options.length;
  if (Array.isArray(task.payload.items)) {
    shape.items = task.payload.items.length;
    shape.itemOptions = (task.payload.items as Array<Record<string, unknown>>)
      .map((item) => Array.isArray(item.options) ? item.options.length : 0);
  }
  if (Array.isArray(task.payload.rightOptions)) shape.rightOptions = task.payload.rightOptions.length;
  if (Array.isArray(task.payload.wordBank)) shape.wordBank = task.payload.wordBank.length;
  return shape;
}

function normalizedSemanticSignature(task: NewTournamentTask): string {
  const normalized = (value: unknown): string => String(value ?? '').trim().toLocaleLowerCase('ru');
  if (task.mode === 'speed_match') {
    const rightOptions = task.payload.rightOptions as string[];
    const pairs = (task.payload.items as Array<Record<string, unknown>>).map((item) => (
      `${normalized(item.prompt)}=${normalized(rightOptions[Number(item.correctIndex)])}`
    )).sort();
    return `${task.mode}|${pairs.join('|')}`;
  }
  if (task.mode === 'find_oddity') {
    return `${task.mode}|${normalized(task.payload.correctAnswer)}|${normalized(task.explanation?.example)}`;
  }
  return `${task.mode}|${normalized(task.payload.phrase)}|${normalized(task.payload.correctAnswer)}`;
}

function selectCompleteTaskIds(roomId: string, tasks: readonly NewTournamentTask[]): string[] {
  const used = new Set<string>();
  for (let roundIndex = 0; roundIndex < TOURNAMENT_ROUND_MODE_PLAN.length; roundIndex += 1) {
    const roundNo = roundIndex + 1;
    for (const mode of TOURNAMENT_ROUND_MODE_PLAN[roundIndex]) {
      const task = selectRoundTasks({
        pool: tasks.filter((candidate) => candidate.mode === mode),
        roomId,
        roundNo,
        count: 4,
        modeKind: 'mix',
        excludedTaskIds: used,
      })[0];
      if (!task) throw new Error(`exposure_preflight_unavailable:${roomId}:${roundNo}:${mode}`);
      used.add(task.taskId);
    }
  }
  if (used.size !== 16) throw new Error(`exposure_preflight_duplicate:${roomId}:${used.size}`);
  return [...used];
}

function auditExposure(tasks: readonly NewTournamentTask[], modeBucketCounts: Readonly<Record<string, number>>) {
  const token: TournamentPoolBarrierToken = {
    generation: NEW_TOURNAMENT_POOL_VERSION,
    revision: 7,
    exposureBucketCounts: modeBucketCounts,
    exposureLayoutHash: '0'.repeat(64),
  };
  const byBucket = new Map<string, NewTournamentTask[]>();
  for (const task of tasks) {
    const bucket = task.exposureBucket ?? '';
    byBucket.set(bucket, [...(byBucket.get(bucket) ?? []), task]);
  }
  const exposed = new Set<string>();
  let previous = new Set<string>();
  for (let dayOffset = 0; dayOffset < 730; dayOffset += 1) {
    const date = new Date(Date.UTC(2026, 7, 1 + dayOffset)).toISOString().slice(0, 10);
    const dayOrdinal = Math.floor(Date.parse(`${date}T00:00:00.000Z`) / 86_400_000);
    const slice = NEW_TOURNAMENT_POOL_MODES.flatMap((mode) => (
      byBucket.get(tournamentExposureBucketId(token, mode, dayOrdinal)) ?? []
    ));
    if (slice.length > 200) throw new Error(`exposure_slice_oversized:${date}:${slice.length}`);
    const ids = new Set(selectCompleteTaskIds(`daily_1200_Europe-Moscow_${date}`, slice));
    if ([...ids].some((id) => previous.has(id))) throw new Error(`exposure_adjacent_repeat:${date}`);
    ids.forEach((id) => exposed.add(id));
    previous = ids;
  }
  if (exposed.size !== tasks.length) throw new Error(`exposure_unreachable:${exposed.size}/${tasks.length}`);
  return { days: 730, reachableTasks: exposed.size, adjacentRepeats: 0, maxDocumentsPerSlice: 200 };
}

async function initializeAdmin(serviceAccountPath: string): Promise<void> {
  if (admin.apps.length > 0) return;
  const raw = JSON.parse(await readFile(serviceAccountPath, 'utf8')) as admin.ServiceAccount & {
    project_id?: string;
  };
  admin.initializeApp({
    credential: admin.credential.cert(raw),
    ...(raw.project_id ? { projectId: raw.project_id } : {}),
  });
}

async function main(): Promise<void> {
  if (process.argv.includes('--apply') || process.argv.includes('--delete-old')
    || process.argv.includes('--stage-new')) {
    throw new Error('dry_run_only_no_production_writes');
  }
  const serviceAccountPath = path.resolve(argValue('service-account') ?? 'service-account.json');
  const requestedOut = argValue('out');
  const runId = `dry-run-${NEW_TOURNAMENT_POOL_VERSION}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const outDir = path.resolve(requestedOut ?? path.join('.codex-tmp', 'tournament-pool-v2', runId));
  await mkdir(outDir, { recursive: true });

  const generated = buildNewTournamentPool(loadTournamentSourceDays(TOURNAMENT_SOURCE_PLANS));
  const invalid = generated.tasks
    .map((task) => ({ task, validation: validateTournamentTaskForNewRoom(task) }))
    .filter((entry) => !entry.validation.ok);
  if (invalid.length > 0) throw new Error(`new_pool_invalid:${invalid.length}`);
  const preflight = preflightRooms(generated.tasks);
  const semanticSignatures = new Set(generated.tasks.map(normalizedSemanticSignature));
  const builderTasks = generated.tasks.filter((task) => task.mode === 'translate_build');
  const oneTrapBuilders = builderTasks.filter((task) => (
    (task.payload.wordBank as string[]).length - (task.payload.correctTokens as string[]).length === 1
  )).length;
  const speedPairs = generated.tasks.filter((task) => task.mode === 'speed_match').flatMap((task) => {
    const rightOptions = task.payload.rightOptions as string[];
    return (task.payload.items as Array<Record<string, unknown>>).map((item) => (
      `${String(item.prompt).trim().toLocaleLowerCase('en')}\u0000${String(rightOptions[Number(item.correctIndex)])
        .trim().toLocaleLowerCase('ru')}`
    ));
  });
  const exposureAudit = auditExposure(generated.tasks, generated.manifest.exposure.modeBucketCounts);
  if (semanticSignatures.size !== generated.tasks.length) {
    throw new Error(`semantic_signature_collision:${semanticSignatures.size}/${generated.tasks.length}`);
  }
  if (oneTrapBuilders !== builderTasks.length) {
    throw new Error(`builder_one_trap_mismatch:${oneTrapBuilders}/${builderTasks.length}`);
  }
  if (new Set(speedPairs).size !== speedPairs.length) {
    throw new Error(`speed_pair_reuse:${new Set(speedPairs).size}/${speedPairs.length}`);
  }

  await initializeAdmin(serviceAccountPath);
  const db = admin.firestore();
  const snapshot = await db.collection(TOURNAMENT_TASKS_COLLECTION).get();
  const existing = snapshot.docs
    .map((doc) => ({
      id: doc.id,
      data: encodeFirestoreValue(doc.data()),
      createTime: doc.createTime.toDate().toISOString(),
      updateTime: doc.updateTime.toDate().toISOString(),
    }))
    .sort((left, right) => left.id.localeCompare(right.id));
  const existingIds = new Set(existing.map((doc) => doc.id));
  const collisions = generated.tasks.map((task) => task.taskId).filter((id) => existingIds.has(id));
  if (collisions.length > 0) throw new Error(`new_pool_id_collision:${collisions.length}`);

  const backupNdjson = existing.map((doc) => JSON.stringify(doc)).join('\n') + '\n';
  const newPoolNdjson = generated.tasks.map((task) => JSON.stringify({ id: task.taskId, data: task })).join('\n') + '\n';
  const backupPath = path.join(outDir, 'old-pool-backup.ndjson');
  const newPoolPath = path.join(outDir, 'new-pool.ndjson');
  await writeFile(backupPath, backupNdjson, 'utf8');
  await writeFile(newPoolPath, newPoolNdjson, 'utf8');

  const existingCounts: Record<string, number> = {};
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const key = `${String(data.mode ?? 'unknown')}:${String(data.difficulty ?? 'unknown')}`;
    existingCounts[key] = (existingCounts[key] ?? 0) + 1;
  }
  const redactedSamples = generated.tasks
    .filter((task, index, all) => all.findIndex((candidate) => candidate.mode === task.mode) === index)
    .map((task) => ({
      taskIdSha256: sha256(task.taskId),
      mode: task.mode,
      difficulty: task.difficulty,
      shape: payloadShape(task),
      validForNewRoom: validateTournamentTaskForNewRoom(task).ok,
    }));
  const manifest = {
    kind: 'tournament_pool_v2_replacement_dry_run_v1',
    runId,
    projectId: admin.app().options.projectId,
    collection: TOURNAMENT_TASKS_COLLECTION,
    generated: generated.manifest,
    productionRead: {
      existingDocuments: existing.length,
      existingCounts,
      newIdCollisions: collisions.length,
    },
    exactProposedMutations: {
      stageNewCreates: generated.tasks.length,
      oldPoolDeletesAfterGreenReadback: existing.length,
      finalDocuments: generated.tasks.length,
      otherCollections: 0,
    },
    gates: {
      strictValidatorInvalid: invalid.length,
      preflightRoomSeeds: preflight.roomSeeds,
      preflightTaskSlots: preflight.taskSlots,
      semanticSignatures: semanticSignatures.size,
      oneTrapBuilders,
      speedPairs: speedPairs.length,
      uniqueSpeedPairs: new Set(speedPairs).size,
      exposure: exposureAudit,
      oldPoolUntouched: true,
      productionWritesPerformed: 0,
    },
    artifacts: {
      backupFile: path.basename(backupPath),
      backupSha256: sha256(backupNdjson),
      newPoolFile: path.basename(newPoolPath),
      newPoolSha256: sha256(newPoolNdjson),
    },
    rolloutOrder: [
      'verify manifest hashes and exact target ids',
      'create only the 4000 new versioned documents in Firestore-safe chunks',
      'read back all 4000 documents and rerun strict validator plus room preflight',
      'delete only the backed-up old document ids using update-time preconditions',
      'verify tournamentTasks contains exactly the 4000 new ids and the ready v7 exposure layout',
    ],
    rollback: [
      'restore old documents from old-pool-backup.ndjson preserving Firestore value types',
      'read back and hash the restored old document set',
      'delete only ids listed in new-pool.ndjson',
      'verify collection count and ids match the backup manifest',
    ],
    redactedSamples,
  };
  await writeFile(path.join(outDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  const qualityReport = [
    `poolVersion=${NEW_TOURNAMENT_POOL_VERSION}`,
    `tasks=${generated.tasks.length}`,
    `semanticSignatures=${semanticSignatures.size}`,
    `oneTrapBuilders=${oneTrapBuilders}/${builderTasks.length}`,
    `uniqueSpeedPairs=${new Set(speedPairs).size}/${speedPairs.length}`,
    `fillGapI=${generated.manifest.diversity.fillGapCorrectTokens.i ?? 0}/500`,
    `fillGapRoles=${JSON.stringify(generated.manifest.diversity.fillGapGrammarRoles)}`,
    `exposureReachable=${exposureAudit.reachableTasks}/${generated.tasks.length}`,
    `productionWrites=0`,
  ].join('\n') + '\n';
  await writeFile(path.join(outDir, 'quality-report.txt'), qualityReport, 'utf8');
  process.stdout.write(`${JSON.stringify({
    outDir,
    poolVersion: NEW_TOURNAMENT_POOL_VERSION,
    newTasks: generated.tasks.length,
    oldTasks: existing.length,
    collisions: collisions.length,
    invalid: invalid.length,
    preflightRoomSeeds: preflight.roomSeeds,
    productionWrites: 0,
    manifestSha256: sha256(JSON.stringify(manifest)),
  })}\n`);
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exitCode = 1;
});
