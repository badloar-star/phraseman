import { createHash } from 'node:crypto';

export interface CreateOnlyPublicationPersistence {
  get(path: string): Promise<unknown | null>;
  create(path: string, value: unknown): Promise<void>;
  compareAndSet(path: string, expectedRevision: number, value: unknown): Promise<void>;
}

export type CreateOnlyPublicationEntry = Readonly<{ path: string; value: unknown }>;

export type CreateOnlyPublicationPlan = Readonly<{
  kind: 'create_only_publication_plan_v1';
  publicationId: string;
  checkpointPath: string;
  entries: readonly CreateOnlyPublicationEntry[];
  root: CreateOnlyPublicationEntry;
  binding: Readonly<Record<string, unknown>>;
  planSha256: string;
}>;

type PublicationPhase = 'writing' | 'verifying' | 'root' | 'ready';

type PublicationCheckpoint = Readonly<{
  kind: 'create_only_publication_checkpoint_v1';
  publicationId: string;
  planSha256: string;
  binding: Readonly<Record<string, unknown>>;
  revision: number;
  phase: PublicationPhase;
  writeCursor: number;
  verifyCursor: number;
}>;

export type CreateOnlyPublicationResult = Readonly<{
  state: PublicationPhase;
  writeCursor: number;
  verifyCursor: number;
  taskCount: number;
  createdThisBatch: number;
  reusedThisBatch: number;
  continuation: boolean;
  planSha256: string;
}>;

const HASH = /^[a-f0-9]{64}$/u;
const PUBLICATION_ID = /^[a-z0-9_-]{1,200}$/u;
const DEFAULT_MAX_OPERATIONS = 100;
const MAX_OPERATIONS = 500;

function canonical(value: unknown): string {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'number' && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  throw new Error('publication_value_invalid');
}

function sha256(value: unknown): string {
  return createHash('sha256').update(canonical(value), 'utf8').digest('hex');
}

function validPath(path: string): boolean {
  return typeof path === 'string' && path === path.trim() && path.length > 2 && path.length <= 1_500
    && !path.startsWith('/') && !path.endsWith('/') && !path.includes('//');
}

export function createOnlyPublicationEntriesSha256(
  entries: readonly CreateOnlyPublicationEntry[],
): string {
  if (!Array.isArray(entries)) throw new Error('publication_plan_invalid');
  return sha256(entries);
}

export function createOnlyPublicationPlanSha256(input: Readonly<{
  publicationId: string;
  checkpointPath: string;
  entriesSha256: string;
  root: CreateOnlyPublicationEntry;
  binding: Readonly<Record<string, unknown>>;
}>): string {
  if (!PUBLICATION_ID.test(input.publicationId) || !validPath(input.checkpointPath)
    || !HASH.test(input.entriesSha256) || !input.root || !validPath(input.root.path)) {
    throw new Error('publication_plan_invalid');
  }
  return sha256({
    publicationId: input.publicationId,
    checkpointPath: input.checkpointPath,
    entriesSha256: input.entriesSha256,
    root: input.root,
    binding: input.binding,
  });
}

function planHash(input: Readonly<{
  publicationId: string;
  checkpointPath: string;
  entries: readonly CreateOnlyPublicationEntry[];
  root: CreateOnlyPublicationEntry;
  binding: Readonly<Record<string, unknown>>;
}>): string {
  return createOnlyPublicationPlanSha256({
    publicationId: input.publicationId,
    checkpointPath: input.checkpointPath,
    entriesSha256: createOnlyPublicationEntriesSha256(input.entries),
    root: input.root,
    binding: input.binding,
  });
}

export function createCreateOnlyPublicationPlan(input: Readonly<{
  publicationId: string;
  checkpointPath: string;
  entries: readonly CreateOnlyPublicationEntry[];
  root: CreateOnlyPublicationEntry;
  binding?: Readonly<Record<string, unknown>>;
}>): CreateOnlyPublicationPlan {
  if (!PUBLICATION_ID.test(input.publicationId) || !validPath(input.checkpointPath)
    || !Array.isArray(input.entries) || input.entries.length < 1
    || !input.root || !validPath(input.root.path)
    || input.checkpointPath === input.root.path) {
    throw new Error('publication_plan_invalid');
  }
  const paths = new Set<string>();
  const entries = input.entries.map((entry) => {
    if (!entry || !validPath(entry.path) || entry.path === input.root.path
      || entry.path === input.checkpointPath || paths.has(entry.path)) {
      throw new Error('publication_plan_invalid');
    }
    canonical(entry.value);
    paths.add(entry.path);
    return Object.freeze({ path: entry.path, value: entry.value });
  });
  canonical(input.root.value);
  canonical(input.binding ?? {});
  const root = Object.freeze({ path: input.root.path, value: input.root.value });
  const binding = Object.freeze({ ...(input.binding ?? {}) });
  const checkpointPath = input.checkpointPath;
  const publicationId = input.publicationId;
  const planSha256 = planHash({ publicationId, checkpointPath, entries, root, binding });
  return Object.freeze({
    kind: 'create_only_publication_plan_v1',
    publicationId,
    checkpointPath,
    entries: Object.freeze(entries),
    root,
    binding,
    planSha256,
  });
}

function validatePlan(plan: CreateOnlyPublicationPlan): void {
  if (!plan || plan.kind !== 'create_only_publication_plan_v1'
    || !HASH.test(plan.planSha256)
    || planHash(plan) !== plan.planSha256) {
    throw new Error('publication_plan_invalid');
  }
  createCreateOnlyPublicationPlan(plan);
}

function initialCheckpoint(plan: CreateOnlyPublicationPlan): PublicationCheckpoint {
  return Object.freeze({
    kind: 'create_only_publication_checkpoint_v1',
    publicationId: plan.publicationId,
    planSha256: plan.planSha256,
    binding: plan.binding,
    revision: 0,
    phase: 'writing',
    writeCursor: 0,
    verifyCursor: 0,
  });
}

function parseCheckpoint(value: unknown, plan: CreateOnlyPublicationPlan): PublicationCheckpoint {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('publication_checkpoint_invalid');
  const checkpoint = value as Record<string, unknown>;
  const keys = Object.keys(checkpoint).sort().join(',');
  if (keys !== 'binding,kind,phase,planSha256,publicationId,revision,verifyCursor,writeCursor'
    || checkpoint.kind !== 'create_only_publication_checkpoint_v1'
    || typeof checkpoint.publicationId !== 'string' || !PUBLICATION_ID.test(checkpoint.publicationId)
    || typeof checkpoint.planSha256 !== 'string' || !HASH.test(checkpoint.planSha256)
    || !Number.isSafeInteger(checkpoint.revision) || (checkpoint.revision as number) < 0
    || !['writing', 'verifying', 'root', 'ready'].includes(checkpoint.phase as string)
    || !Number.isSafeInteger(checkpoint.writeCursor) || (checkpoint.writeCursor as number) < 0
    || (checkpoint.writeCursor as number) > plan.entries.length
    || !Number.isSafeInteger(checkpoint.verifyCursor) || (checkpoint.verifyCursor as number) < 0
    || (checkpoint.verifyCursor as number) > plan.entries.length) {
    throw new Error('publication_checkpoint_invalid');
  }
  if (checkpoint.publicationId !== plan.publicationId
    || checkpoint.planSha256 !== plan.planSha256
    || canonical(checkpoint.binding) !== canonical(plan.binding)) {
    throw new Error('publication_plan_conflict');
  }
  const parsed = checkpoint as unknown as PublicationCheckpoint;
  if ((parsed.phase === 'writing' && parsed.verifyCursor !== 0)
    || ((parsed.phase === 'verifying' || parsed.phase === 'root' || parsed.phase === 'ready')
      && parsed.writeCursor !== plan.entries.length)
    || ((parsed.phase === 'root' || parsed.phase === 'ready') && parsed.verifyCursor !== plan.entries.length)) {
    throw new Error('publication_checkpoint_invalid');
  }
  return Object.freeze({ ...parsed });
}

async function createExact(
  persistence: CreateOnlyPublicationPersistence,
  entry: CreateOnlyPublicationEntry,
): Promise<boolean> {
  const existing = await persistence.get(entry.path);
  if (existing !== null) {
    if (canonical(existing) !== canonical(entry.value)) throw new Error('publication_conflict');
    return true;
  }
  try {
    await persistence.create(entry.path, entry.value);
    return false;
  } catch (error) {
    const raced = await persistence.get(entry.path);
    if (raced !== null && canonical(raced) === canonical(entry.value)) return true;
    if (error instanceof Error && error.message === 'already_exists') throw new Error('publication_conflict');
    throw error;
  }
}

async function ensureInitialCheckpoint(
  persistence: CreateOnlyPublicationPersistence,
  plan: CreateOnlyPublicationPlan,
): Promise<PublicationCheckpoint> {
  const existing = await persistence.get(plan.checkpointPath);
  if (existing !== null) return parseCheckpoint(existing, plan);
  try {
    await persistence.create(plan.checkpointPath, initialCheckpoint(plan));
  } catch (error) {
    const raced = await persistence.get(plan.checkpointPath);
    if (raced === null) throw error;
  }
  const created = await persistence.get(plan.checkpointPath);
  return parseCheckpoint(created, plan);
}

function nextCheckpoint(
  checkpoint: PublicationCheckpoint,
  changes: Partial<Pick<PublicationCheckpoint, 'phase' | 'writeCursor' | 'verifyCursor'>>,
): PublicationCheckpoint {
  return Object.freeze({ ...checkpoint, ...changes, revision: checkpoint.revision + 1 });
}

function publicationResult(
  checkpoint: PublicationCheckpoint,
  plan: CreateOnlyPublicationPlan,
  createdThisBatch: number,
  reusedThisBatch: number,
): CreateOnlyPublicationResult {
  return Object.freeze({
    state: checkpoint.phase,
    writeCursor: checkpoint.writeCursor,
    verifyCursor: checkpoint.verifyCursor,
    taskCount: plan.entries.length,
    createdThisBatch,
    reusedThisBatch,
    continuation: checkpoint.phase !== 'ready',
    planSha256: plan.planSha256,
  });
}

export async function advanceCreateOnlyPublication(input: Readonly<{
  publication: CreateOnlyPublicationPlan;
  persistence: CreateOnlyPublicationPersistence;
  maxOperations?: number;
}>): Promise<CreateOnlyPublicationResult> {
  validatePlan(input.publication);
  const maxOperations = input.maxOperations ?? DEFAULT_MAX_OPERATIONS;
  if (!Number.isSafeInteger(maxOperations) || maxOperations < 1 || maxOperations > MAX_OPERATIONS) {
    throw new Error('publication_batch_invalid');
  }
  const plan = input.publication;
  let checkpoint = await ensureInitialCheckpoint(input.persistence, plan);
  let createdThisBatch = 0;
  let reusedThisBatch = 0;

  if ((checkpoint.phase === 'writing' || checkpoint.phase === 'verifying')
    && await input.persistence.get(plan.root.path) !== null) {
    throw new Error('publication_root_premature');
  }

  if (checkpoint.phase === 'ready') {
    const reused = await createExact(input.persistence, plan.root);
    return publicationResult(checkpoint, plan, createdThisBatch, reused ? 1 : 0);
  }

  if (checkpoint.phase === 'writing') {
    let cursor = checkpoint.writeCursor;
    const end = Math.min(plan.entries.length, cursor + maxOperations);
    while (cursor < end) {
      const reused = await createExact(input.persistence, plan.entries[cursor]);
      if (reused) reusedThisBatch += 1;
      else createdThisBatch += 1;
      cursor += 1;
    }
    const next = nextCheckpoint(checkpoint, {
      writeCursor: cursor,
      phase: cursor === plan.entries.length ? 'verifying' : 'writing',
    });
    await input.persistence.compareAndSet(plan.checkpointPath, checkpoint.revision, next);
    return publicationResult(next, plan, createdThisBatch, reusedThisBatch);
  }

  if (checkpoint.phase === 'verifying') {
    let cursor = checkpoint.verifyCursor;
    const end = Math.min(plan.entries.length, cursor + maxOperations);
    while (cursor < end) {
      const existing = await input.persistence.get(plan.entries[cursor].path);
      if (existing === null || canonical(existing) !== canonical(plan.entries[cursor].value)) {
        throw new Error('publication_verification_failed');
      }
      cursor += 1;
    }
    const next = nextCheckpoint(checkpoint, {
      verifyCursor: cursor,
      phase: cursor === plan.entries.length ? 'root' : 'verifying',
    });
    await input.persistence.compareAndSet(plan.checkpointPath, checkpoint.revision, next);
    return publicationResult(next, plan, createdThisBatch, reusedThisBatch);
  }

  if (checkpoint.phase === 'root') {
    const reused = await createExact(input.persistence, plan.root);
    if (reused) reusedThisBatch += 1;
    else createdThisBatch += 1;
    checkpoint = nextCheckpoint(checkpoint, { phase: 'ready' });
    await input.persistence.compareAndSet(plan.checkpointPath, checkpoint.revision - 1, checkpoint);
    return publicationResult(checkpoint, plan, createdThisBatch, reusedThisBatch);
  }

  throw new Error('publication_checkpoint_invalid');
}
