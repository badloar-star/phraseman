import { createHash } from 'node:crypto';

import type { App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

import { consumeRateWindow, type RateWindow } from './admin_staff_membership_core';
import {
  ADMIN_STAFF_ISOLATED_MEMBERS_COLLECTION,
  parseIsolatedStaffPrincipalKey,
} from './admin_staff_isolated_core';
import type { IsolatedStaffGatewayDependencies } from './admin_staff_isolated_gateway_core';

const RATE_LIMITS_COLLECTION = 'admin_staff_rate_limits' as const;
const RATE_SCOPE = 'isolated-session-read' as const;
const PROJECT_ID_RE = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;
const RATE_ROW_KEYS = ['schemaVersion', 'scope', 'windowStartedAtMs', 'count', 'updatedAtMs'] as const;

export interface IsolatedStaffStorePort {
  readonly projectId: string;
  readonly getDocument: (collection: string, id: string) => Promise<unknown | null>;
  readonly updateDocumentAtomically: (
    collection: string,
    id: string,
    update: (current: unknown | null) => Readonly<Record<string, unknown>>,
  ) => Promise<void>;
}

export type IsolatedStaffStoreDependencies = Pick<
  IsolatedStaffGatewayDependencies,
  'consumeRateLimit' | 'loadMembershipV2'
>;

function fail(code: string): never { throw new Error(code); }
function isPlain(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}
function exact(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const actual = Object.keys(record);
  return actual.length === keys.length && actual.every(key => keys.includes(key)) &&
    keys.every(key => Object.prototype.hasOwnProperty.call(record, key));
}
function parseRateWindow(raw: unknown | null): RateWindow | null {
  if (raw === null) return null;
  if (!isPlain(raw) || !exact(raw, RATE_ROW_KEYS) || raw.schemaVersion !== 1 || raw.scope !== RATE_SCOPE ||
      !Number.isSafeInteger(raw.windowStartedAtMs) || Number(raw.windowStartedAtMs) < 0 ||
      !Number.isSafeInteger(raw.count) || Number(raw.count) < 0 ||
      !Number.isSafeInteger(raw.updatedAtMs) || Number(raw.updatedAtMs) < 0) fail('invalid_rate_state');
  return Object.freeze({ windowStartedAtMs: raw.windowStartedAtMs as number, count: raw.count as number });
}
function validateProjectBinding(port: IsolatedStaffStorePort, expectedMainProjectId: string): void {
  if (!PROJECT_ID_RE.test(expectedMainProjectId) || port.projectId !== expectedMainProjectId) {
    fail('isolated_staff_not_configured');
  }
}

export function createIsolatedStaffStoreDependencies(
  port: IsolatedStaffStorePort,
  expectedMainProjectId: string,
  now: () => number = () => Date.now(),
): IsolatedStaffStoreDependencies {
  validateProjectBinding(port, expectedMainProjectId);
  return Object.freeze({
    async loadMembershipV2(principalKey: string): Promise<unknown | null> {
      parseIsolatedStaffPrincipalKey(principalKey);
      return port.getDocument(ADMIN_STAFF_ISOLATED_MEMBERS_COLLECTION, principalKey);
    },
    async consumeRateLimit(scope: string, principalKey: string, limit: number, windowMs: number): Promise<void> {
      if (scope !== RATE_SCOPE) fail('invalid_rate_policy');
      parseIsolatedStaffPrincipalKey(principalKey);
      const nowMs = now();
      if (!Number.isSafeInteger(nowMs) || nowMs < 0) fail('invalid_rate_policy');
      const documentId = createHash('sha256').update(`${scope}\u0000${principalKey}`).digest('hex');
      await port.updateDocumentAtomically(RATE_LIMITS_COLLECTION, documentId, raw => {
        const next = consumeRateWindow(parseRateWindow(raw), nowMs, limit, windowMs);
        return Object.freeze({ schemaVersion: 1, scope: RATE_SCOPE, ...next, updatedAtMs: nowMs });
      });
    },
  });
}

export function createIsolatedStaffFirestoreDependencies(
  app: App,
  expectedMainProjectId: string,
  now: () => number = () => Date.now(),
): IsolatedStaffStoreDependencies {
  const actualMainProjectId = app.options.projectId;
  if (typeof actualMainProjectId !== 'string' || actualMainProjectId !== expectedMainProjectId) {
    fail('isolated_staff_not_configured');
  }
  const db: Firestore = getFirestore(app);
  const port: IsolatedStaffStorePort = Object.freeze({
    projectId: actualMainProjectId,
    async getDocument(collection: string, id: string): Promise<unknown | null> {
      const snapshot = await db.collection(collection).doc(id).get();
      return snapshot.exists ? snapshot.data() ?? null : null;
    },
    async updateDocumentAtomically(
      collection: string,
      id: string,
      update: (current: unknown | null) => Readonly<Record<string, unknown>>,
    ): Promise<void> {
      const ref = db.collection(collection).doc(id);
      await db.runTransaction(async transaction => {
        const snapshot = await transaction.get(ref);
        const next = update(snapshot.exists ? snapshot.data() ?? null : null);
        transaction.set(ref, next, { merge: false });
      });
    },
  });
  return createIsolatedStaffStoreDependencies(port, expectedMainProjectId, now);
}
