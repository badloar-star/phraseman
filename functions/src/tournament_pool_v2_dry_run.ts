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
  buildNewTournamentPool,
  type NewTournamentTask,
} from './tournament_pool_v2_factory';

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
      'create only the 180 new versioned documents',
      'read back all 180 documents and rerun strict validator plus room preflight',
      'delete only the backed-up old document ids using update-time preconditions',
      'verify tournamentTasks contains exactly the 180 new ids',
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
