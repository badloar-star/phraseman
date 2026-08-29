import * as Crypto from 'expo-crypto';

import {
  CUSTOMIZATION_SELECTION_HEAD_PREFIX,
  CUSTOMIZATION_SELECTION_OPERATION_PREFIX,
  CUSTOMIZATION_SELECTION_OUTBOX_PREFIX,
  CUSTOMIZATION_SELECTION_QUARANTINE_PREFIX,
} from '../constants/customization_storage_keys';

import {
  isCurrentAccountGeneration,
  resolvePhoneStateAccountContext,
  withAccountTransitionLock,
  type AccountGenerationToken,
  type AccountTransitionLockLease,
} from './account_generation';
import { withStorageLock } from './storage_mutex';

const OPERATION_PREFIX = CUSTOMIZATION_SELECTION_OPERATION_PREFIX;
const HEAD_PREFIX = CUSTOMIZATION_SELECTION_HEAD_PREFIX;
const OUTBOX_PREFIX = CUSTOMIZATION_SELECTION_OUTBOX_PREFIX;
const QUARANTINE_PREFIX = CUSTOMIZATION_SELECTION_QUARANTINE_PREFIX;
const OPERATION_ID_RE = /^[A-Za-z0-9_.:-]{1,200}$/;
const FINGERPRINT_RE = /^[a-f0-9]{64}$/;
const MAX_OUTBOX_OPERATIONS = 4_096;
const MAX_CHAIN_AUDIT = 128;

export type CustomizationSelection = Readonly<{
  avatarValue: string;
  frameId: string;
  storedAuraSelection: string | null;
  level: number;
}>;

export type CustomizationSelectionOperation = Readonly<{
  schemaVersion: 'customization-selection-operation.v1';
  operationId: string;
  ownerStableId: string;
  lineage: number;
  accountGeneration: number;
  parentOperationId: string | null;
  revision: number;
  source: 'user' | 'external' | 'legacy';
  occurrenceId?: string;
  selection: CustomizationSelection;
  createdAtMs: number;
  requestFingerprint: string;
}>;

type SelectionHead = Readonly<{
  schemaVersion: 'customization-selection-head.v1';
  ownerStableId: string;
  lineage: number;
  operationId: string;
  revision: number;
  /** Roots below this revision are already verified by the adopted PhoneState projection. */
  auditFloorRevision: number;
}>;

export type CustomizationSelectionStorage = Readonly<{
  getItem(key: string): Promise<string | null>;
  multiGet(keys: readonly string[]): Promise<readonly (readonly [string, string | null])[]>;
  multiSet(pairs: readonly (readonly [string, string])[]): Promise<void>;
  multiRemove(keys: readonly string[]): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
}>;

type SelectionJournalDeps = Readonly<{
  storage: CustomizationSelectionStorage;
  resolveLineage?: (ownerStableId: string) => Promise<number>;
  mirror: (operation: CustomizationSelectionOperation) => Promise<boolean>;
}>;

type SelectionAuthorityDeps = SelectionJournalDeps & Readonly<{
  readPhoneState?: (ownerStableId: string, lineage: number) => Promise<CustomizationSelectionOperation | null>;
}>;

function ownerPart(ownerStableId: string): string {
  return encodeURIComponent(ownerStableId);
}

function operationPart(operationId: string): string {
  return encodeURIComponent(operationId);
}

export function customizationSelectionOperationKey(
  ownerStableId: string,
  lineage: number,
  operationId: string,
): string {
  return `${OPERATION_PREFIX}${ownerPart(ownerStableId)}:${lineage}:${operationPart(operationId)}`;
}

export function customizationSelectionHeadKey(ownerStableId: string, lineage: number): string {
  return `${HEAD_PREFIX}${ownerPart(ownerStableId)}:${lineage}`;
}

export function customizationSelectionOutboxKey(ownerStableId: string, lineage: number): string {
  return `${OUTBOX_PREFIX}${ownerPart(ownerStableId)}:${lineage}`;
}

export function customizationSelectionQuarantineKey(ownerStableId: string, lineage: number): string {
  return `${QUARANTINE_PREFIX}${ownerPart(ownerStableId)}:${lineage}`;
}

function validOwner(ownerStableId: string): boolean {
  return ownerStableId.length > 0 && ownerStableId.length <= 160 && !ownerStableId.includes('/');
}

function normalizeSelection(input: CustomizationSelection): CustomizationSelection {
  const avatarValue = String(input.avatarValue ?? '').trim();
  const frameId = String(input.frameId ?? '').trim();
  const storedAuraSelection = input.storedAuraSelection === null
    ? null
    : String(input.storedAuraSelection ?? '').trim() || null;
  const level = Math.max(1, Math.floor(Number(input.level) || 1));
  if (!avatarValue || avatarValue.length > 240 || !frameId || frameId.length > 160) {
    throw new Error('customization_selection_invalid');
  }
  if (storedAuraSelection && storedAuraSelection.length > 160) {
    throw new Error('customization_selection_invalid');
  }
  return Object.freeze({ avatarValue, frameId, storedAuraSelection, level });
}

function fingerprintPayload(operation: Omit<CustomizationSelectionOperation, 'schemaVersion' | 'requestFingerprint'>): unknown {
  return {
    schemaVersion: 1,
    operationId: operation.operationId,
    ownerStableId: operation.ownerStableId,
    lineage: operation.lineage,
    accountGeneration: operation.accountGeneration,
    parentOperationId: operation.parentOperationId,
    revision: operation.revision,
    source: operation.source,
    occurrenceId: operation.occurrenceId ?? null,
    selection: operation.selection,
    createdAtMs: operation.createdAtMs,
  };
}

async function operationFingerprint(
  operation: Omit<CustomizationSelectionOperation, 'schemaVersion' | 'requestFingerprint'>,
): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    JSON.stringify(fingerprintPayload(operation)),
  );
}

function parseHead(raw: string | null, ownerStableId: string, lineage: number): SelectionHead | null {
  if (!raw) return null;
  try {
    const head = JSON.parse(raw) as Partial<SelectionHead>;
    const auditFloorRevision = Number(head.auditFloorRevision ?? 1);
    if (head.schemaVersion !== 'customization-selection-head.v1'
      || head.ownerStableId !== ownerStableId
      || head.lineage !== lineage
      || !OPERATION_ID_RE.test(String(head.operationId ?? ''))
      || !Number.isSafeInteger(head.revision)
      || Number(head.revision) < 1
      || !Number.isSafeInteger(auditFloorRevision)
      || auditFloorRevision < 1
      || auditFloorRevision > Number(head.revision)) return null;
    return Object.freeze({ ...head, auditFloorRevision }) as SelectionHead;
  } catch {
    return null;
  }
}

function parseOperationShape(raw: string | null): CustomizationSelectionOperation | null {
  if (!raw) return null;
  try {
    const operation = JSON.parse(raw) as Partial<CustomizationSelectionOperation>;
    if (operation.schemaVersion !== 'customization-selection-operation.v1'
      || !OPERATION_ID_RE.test(String(operation.operationId ?? ''))
      || !validOwner(String(operation.ownerStableId ?? ''))
      || !Number.isSafeInteger(operation.lineage) || Number(operation.lineage) < 1
      || !Number.isSafeInteger(operation.accountGeneration) || Number(operation.accountGeneration) < 1
      || (operation.parentOperationId !== null && !OPERATION_ID_RE.test(String(operation.parentOperationId ?? '')))
      || !Number.isSafeInteger(operation.revision) || Number(operation.revision) < 1
      || (operation.source !== 'user' && operation.source !== 'external' && operation.source !== 'legacy')
      || (operation.source === 'external' && !String(operation.occurrenceId ?? '').trim())
      || !Number.isSafeInteger(operation.createdAtMs) || Number(operation.createdAtMs) < 0
      || !FINGERPRINT_RE.test(String(operation.requestFingerprint ?? ''))
      || !operation.selection) return null;
    const selection = normalizeSelection(operation.selection);
    return Object.freeze({ ...operation, selection }) as CustomizationSelectionOperation;
  } catch {
    return null;
  }
}

async function parseStoredOperation(raw: string | null): Promise<CustomizationSelectionOperation | null> {
  const operation = parseOperationShape(raw);
  if (!operation) return null;
  const { schemaVersion: _schemaVersion, requestFingerprint, ...payload } = operation;
  return requestFingerprint === await operationFingerprint(payload) ? operation : null;
}

function parseOutbox(raw: string | null): string[] {
  if (raw === null) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > MAX_OUTBOX_OPERATIONS) {
      throw new Error('customization_selection_outbox_corrupt');
    }
    const ids = parsed.map(String);
    if (ids.some((id) => !OPERATION_ID_RE.test(id)) || new Set(ids).size !== ids.length) {
      throw new Error('customization_selection_outbox_corrupt');
    }
    return ids;
  } catch (error) {
    if (error instanceof Error && error.message === 'customization_selection_outbox_corrupt') throw error;
    throw new Error('customization_selection_outbox_corrupt');
  }
}

function rawProjectionPairs(selection: CustomizationSelection): readonly (readonly [string, string])[] {
  return [
    ['user_avatar', selection.avatarValue],
    ['user_frame', selection.frameId],
    ['user_avatar_aura', selection.storedAuraSelection ?? ''],
  ];
}

async function quarantine(
  deps: Pick<SelectionJournalDeps, 'storage'>,
  ownerStableId: string,
  lineage: number,
  reason: string,
  operationId?: string,
): Promise<void> {
  await deps.storage.multiSet([[customizationSelectionQuarantineKey(ownerStableId, lineage), JSON.stringify({
    schemaVersion: 'customization-selection-quarantine.v1',
    ownerStableId,
    lineage,
    reason,
    operationId: operationId ?? null,
  })]]);
}

async function readHeadOperation(
  storage: CustomizationSelectionStorage,
  ownerStableId: string,
  lineage: number,
): Promise<Readonly<{ operation: CustomizationSelectionOperation; head: SelectionHead }> | null> {
  const headRaw = await storage.getItem(customizationSelectionHeadKey(ownerStableId, lineage));
  if (headRaw === null) return null;
  const head = parseHead(headRaw, ownerStableId, lineage);
  if (!head) throw new Error('customization_selection_head_corrupt');
  const operation = await parseStoredOperation(await storage.getItem(
    customizationSelectionOperationKey(ownerStableId, lineage, head.operationId),
  ));
  if (!operation
    || operation.ownerStableId !== ownerStableId
    || operation.lineage !== lineage
    || operation.revision !== head.revision) {
    throw new Error('customization_selection_head_gap');
  }
  let cursor = operation;
  for (let audited = 0;
    audited < MAX_CHAIN_AUDIT
      && cursor.parentOperationId
      && cursor.revision > head.auditFloorRevision;
    audited += 1) {
    const parent = await parseStoredOperation(await storage.getItem(
      customizationSelectionOperationKey(ownerStableId, lineage, cursor.parentOperationId),
    ));
    if (!parent || parent.revision !== cursor.revision - 1) {
      throw new Error('customization_selection_chain_gap');
    }
    cursor = parent;
  }
  return Object.freeze({ operation, head });
}

async function resolveContext(
  token: AccountGenerationToken,
  resolveLineage?: (ownerStableId: string) => Promise<number>,
): Promise<Readonly<{ ownerStableId: string; lineage: number }>> {
  const ownerStableId = token.stableId?.trim() ?? '';
  if (!validOwner(ownerStableId) || !isCurrentAccountGeneration(token, ownerStableId)) {
    throw new Error('customization_selection_account_changed');
  }
  const context = await resolvePhoneStateAccountContext(ownerStableId, token, resolveLineage);
  return Object.freeze({ ownerStableId, lineage: context.lineage });
}

function newer(
  left: CustomizationSelectionOperation | null,
  right: CustomizationSelectionOperation | null,
): CustomizationSelectionOperation | null {
  if (!left) return right;
  if (!right) return left;
  if (left.revision !== right.revision) return left.revision > right.revision ? left : right;
  if (left.operationId === right.operationId) {
    if (left.requestFingerprint !== right.requestFingerprint) {
      throw new Error('customization_selection_operation_conflict');
    }
    return left;
  }
  return left.operationId.localeCompare(right.operationId) >= 0 ? left : right;
}

export async function commitCustomizationSelection(
  input: Readonly<{
    token: AccountGenerationToken;
    operationId: string;
    source: 'user' | 'external' | 'legacy';
    occurrenceId?: string;
    selection: CustomizationSelection;
    createdAtMs?: number;
    inheritedLease?: AccountTransitionLockLease;
  }>,
  deps: SelectionJournalDeps,
): Promise<Readonly<{ duplicate: boolean; operation: CustomizationSelectionOperation }>> {
  if (!OPERATION_ID_RE.test(input.operationId)
    || (input.source === 'external' && !input.occurrenceId?.trim())) {
    throw new Error('customization_selection_invalid');
  }
  const selection = normalizeSelection(input.selection);
  const context = await resolveContext(input.token, deps.resolveLineage);
  return withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(input.token, context.ownerStableId)) {
      throw new Error('customization_selection_account_changed');
    }
    const operationKey = customizationSelectionOperationKey(
      context.ownerStableId, context.lineage, input.operationId,
    );
    const existingRaw = await deps.storage.getItem(operationKey);
    if (existingRaw !== null) {
      const existing = await parseStoredOperation(existingRaw);
      if (!existing) {
        await quarantine(deps, context.ownerStableId, context.lineage, 'operation_corrupt', input.operationId);
        throw new Error('customization_selection_operation_corrupt');
      }
      const sameRequest = existing.source === input.source
        && existing.occurrenceId === input.occurrenceId
        && JSON.stringify(existing.selection) === JSON.stringify(selection);
      if (!sameRequest) {
        await quarantine(deps, context.ownerStableId, context.lineage, 'operation_id_conflict', input.operationId);
        throw new Error('customization_selection_operation_conflict');
      }
      const current = await readHeadOperation(deps.storage, context.ownerStableId, context.lineage);
      // AsyncStorage.multiSet is a batch API, not our immutable commit proof.
      // A process cut may leave the root while head/outbox/raw projections are
      // absent. Re-materialize only when that root is the exact next head;
      // replaying an older occurrence must never roll a later user choice back.
      const canRematerialize = (!current
        && existing.revision === 1
        && existing.parentOperationId === null)
        || (current?.operation.operationId === existing.operationId)
        || (current
          && existing.revision === current.operation.revision + 1
          && existing.parentOperationId === current.operation.operationId);
      if (canRematerialize && current?.operation.revision !== undefined
        && existing.revision < current.operation.revision) {
        return Object.freeze({ duplicate: true, operation: existing });
      }
      if (canRematerialize) {
        const outboxKey = customizationSelectionOutboxKey(context.ownerStableId, context.lineage);
        const outbox = parseOutbox(await deps.storage.getItem(outboxKey));
        const nextOutbox = outbox.includes(existing.operationId)
          ? outbox
          : [...outbox, existing.operationId];
        if (nextOutbox.length > MAX_OUTBOX_OPERATIONS) {
          await quarantine(deps, context.ownerStableId, context.lineage, 'outbox_full', input.operationId);
          throw new Error('customization_selection_outbox_full');
        }
        const head: SelectionHead = Object.freeze({
          schemaVersion: 'customization-selection-head.v1',
          ownerStableId: context.ownerStableId,
          lineage: context.lineage,
          operationId: existing.operationId,
          revision: existing.revision,
          auditFloorRevision: current?.head.auditFloorRevision ?? 1,
        });
        await deps.storage.multiSet([
          [customizationSelectionHeadKey(context.ownerStableId, context.lineage), JSON.stringify(head)],
          [outboxKey, JSON.stringify(nextOutbox)],
          ...rawProjectionPairs(existing.selection),
        ]);
        return Object.freeze({ duplicate: true, operation: existing });
      }
      if (current && current.operation.revision > existing.revision) {
        return Object.freeze({ duplicate: true, operation: existing });
      }
      await quarantine(deps, context.ownerStableId, context.lineage, 'operation_head_conflict', input.operationId);
      throw new Error('customization_selection_operation_conflict');
    }

    const current = await readHeadOperation(deps.storage, context.ownerStableId, context.lineage);
    const payload = {
      operationId: input.operationId,
      ownerStableId: context.ownerStableId,
      lineage: context.lineage,
      accountGeneration: input.token.generation,
      parentOperationId: current?.operation.operationId ?? null,
      revision: (current?.operation.revision ?? 0) + 1,
      source: input.source,
      ...(input.occurrenceId ? { occurrenceId: input.occurrenceId } : {}),
      selection,
      createdAtMs: Number.isSafeInteger(input.createdAtMs) && Number(input.createdAtMs) >= 0
        ? Number(input.createdAtMs)
        : Date.now(),
    } as const;
    const operation: CustomizationSelectionOperation = Object.freeze({
      schemaVersion: 'customization-selection-operation.v1',
      ...payload,
      requestFingerprint: await operationFingerprint(payload),
    });
    const outboxKey = customizationSelectionOutboxKey(context.ownerStableId, context.lineage);
    const outbox = parseOutbox(await deps.storage.getItem(outboxKey));
    if (outbox.length >= MAX_OUTBOX_OPERATIONS) {
      await quarantine(deps, context.ownerStableId, context.lineage, 'outbox_full', input.operationId);
      throw new Error('customization_selection_outbox_full');
    }
    const head: SelectionHead = Object.freeze({
      schemaVersion: 'customization-selection-head.v1',
      ownerStableId: context.ownerStableId,
      lineage: context.lineage,
      operationId: operation.operationId,
      revision: operation.revision,
      auditFloorRevision: current?.head.auditFloorRevision ?? 1,
    });
    await deps.storage.multiSet([
      [operationKey, JSON.stringify(operation)],
      [customizationSelectionHeadKey(context.ownerStableId, context.lineage), JSON.stringify(head)],
      [outboxKey, JSON.stringify([...outbox, operation.operationId])],
      ...rawProjectionPairs(selection),
    ]);
    if (!isCurrentAccountGeneration(input.token, context.ownerStableId)) {
      throw new Error('customization_selection_account_changed');
    }
    return Object.freeze({ duplicate: false, operation });
  }), input.inheritedLease);
}

function bounded<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: T | null): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), Math.max(1, timeoutMs));
    promise.then((value) => finish(value), () => finish(null));
  });
}

export async function drainCustomizationSelectionOutbox(
  input: Readonly<{ token: AccountGenerationToken; lineage: number }>,
  deps: Readonly<{
    storage: CustomizationSelectionStorage;
    mirror: (operation: CustomizationSelectionOperation) => Promise<boolean>;
    timeoutMs?: number;
  }>,
): Promise<Readonly<{ synced: number; pending: number }>> {
  const ownerStableId = input.token.stableId?.trim() ?? '';
  if (!validOwner(ownerStableId) || !isCurrentAccountGeneration(input.token, ownerStableId)) {
    return Object.freeze({ synced: 0, pending: 0 });
  }
  const outboxKey = customizationSelectionOutboxKey(ownerStableId, input.lineage);
  const ids = await withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) return [];
    return parseOutbox(await deps.storage.getItem(outboxKey));
  }));
  const synced = new Set<string>();
  for (const operationId of ids.slice(0, 16)) {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) break;
    const operation = await parseStoredOperation(await deps.storage.getItem(
      customizationSelectionOperationKey(ownerStableId, input.lineage, operationId),
    ));
    // Marker without its immutable root is evidence of an interrupted commit.
    // Preserve it for quarantine/recovery; never pretend it synced.
    if (!operation || operation.ownerStableId !== ownerStableId || operation.lineage !== input.lineage) continue;
    const stored = await bounded(deps.mirror(operation), deps.timeoutMs ?? 1_500);
    if (stored !== true || !isCurrentAccountGeneration(input.token, ownerStableId)) continue;
    synced.add(operationId);
  }
  if (!isCurrentAccountGeneration(input.token, ownerStableId)) {
    return Object.freeze({ synced: 0, pending: ids.length });
  }
  const remaining = await withAccountTransitionLock(async () => withStorageLock(async () => {
    if (!isCurrentAccountGeneration(input.token, ownerStableId)) return null;
    const latest = parseOutbox(await deps.storage.getItem(outboxKey));
    const next = latest.filter((operationId) => !synced.has(operationId));
    await deps.storage.multiSet([[outboxKey, JSON.stringify(next)]]);
    return next;
  }));
  if (!remaining) return Object.freeze({ synced: 0, pending: ids.length });
  return Object.freeze({ synced: synced.size, pending: remaining.length });
}

async function adoptPhoneStateWinner(
  operation: CustomizationSelectionOperation,
  token: AccountGenerationToken,
  deps: SelectionAuthorityDeps,
): Promise<void> {
  if (!isCurrentAccountGeneration(token, operation.ownerStableId)) {
    throw new Error('customization_selection_account_changed');
  }
  const head: SelectionHead = {
    schemaVersion: 'customization-selection-head.v1',
    ownerStableId: operation.ownerStableId,
    lineage: operation.lineage,
    operationId: operation.operationId,
    revision: operation.revision,
    auditFloorRevision: operation.revision,
  };
  await deps.storage.multiSet([
    [customizationSelectionOperationKey(operation.ownerStableId, operation.lineage, operation.operationId), JSON.stringify(operation)],
    [customizationSelectionHeadKey(operation.ownerStableId, operation.lineage), JSON.stringify(head)],
    ...rawProjectionPairs(operation.selection),
  ]);
}

export async function resolveCustomizationSelectionAuthority(
  input: Readonly<{
    token: AccountGenerationToken;
    cloudSelection: CustomizationSelection;
    inheritedLease?: AccountTransitionLockLease;
  }>,
  deps: SelectionAuthorityDeps,
): Promise<CustomizationSelectionOperation> {
  const context = await resolveContext(input.token, deps.resolveLineage);
  return withAccountTransitionLock(async (lease) => {
    if (!isCurrentAccountGeneration(input.token, context.ownerStableId)) {
      throw new Error('customization_selection_account_changed');
    }
    const existing = await withStorageLock(async () => {
      const localRead = await readHeadOperation(deps.storage, context.ownerStableId, context.lineage);
      const local = localRead?.operation ?? null;
      const phone = await deps.readPhoneState?.(context.ownerStableId, context.lineage) ?? null;
      const validPhone = phone
        && phone.ownerStableId === context.ownerStableId
        && phone.lineage === context.lineage
        ? phone
        : null;
      const winner = newer(local, validPhone);
      if (winner) {
        if (!local || winner.operationId !== local.operationId) {
          await adoptPhoneStateWinner(winner, input.token, deps);
        } else {
          await deps.storage.multiSet(rawProjectionPairs(winner.selection));
        }
      }
      return winner;
    });
    if (existing) return existing;
    const rows = await deps.storage.multiGet(['user_avatar', 'user_frame', 'user_avatar_aura']);
    const values = new Map(rows.map(([key, value]) => [key, value]));
    const legacySelection = normalizeSelection({
      avatarValue: values.get('user_avatar')?.trim() || input.cloudSelection.avatarValue,
      frameId: values.get('user_frame')?.trim() || input.cloudSelection.frameId,
      storedAuraSelection: values.get('user_avatar_aura') === null
        ? input.cloudSelection.storedAuraSelection
        : (values.get('user_avatar_aura')?.trim() || null),
      level: input.cloudSelection.level,
    });
    return (await commitCustomizationSelection({
      token: input.token,
      operationId: 'customization_legacy_v1',
      source: 'legacy',
      selection: legacySelection,
      createdAtMs: 0,
      inheritedLease: lease,
    }, deps)).operation;
  }, input.inheritedLease);
}

export const CUSTOMIZATION_SELECTION_ACCOUNT_LOCAL_PREFIXES = Object.freeze([
  OPERATION_PREFIX,
  HEAD_PREFIX,
  OUTBOX_PREFIX,
  QUARANTINE_PREFIX,
]);
