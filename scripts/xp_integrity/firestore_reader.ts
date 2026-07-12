import {
  applicationDefault,
  deleteApp,
  getApps,
  initializeApp,
  type Credential,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldPath, getFirestore } from "firebase-admin/firestore";

import { ReadBudget } from "./read_budget";
import type {
  AliasEvidence,
  MirrorValues,
  NormalizedAuditEvent,
  RawUser,
} from "./types";

const WRITE_PERMISSIONS = [
  "datastore.entities.create",
  "datastore.entities.update",
  "datastore.entities.delete",
  "firebaseauth.users.create",
  "firebaseauth.users.update",
  "firebaseauth.users.delete",
] as const;

const REQUIRED_READ_PERMISSIONS = [
  "datastore.entities.get",
  "datastore.entities.list",
  "firebaseauth.users.get",
] as const;

const REQUESTED_PERMISSIONS = [
  ...WRITE_PERMISSIONS,
  ...REQUIRED_READ_PERMISSIONS,
] as const;

type DocumentSnapshotLike = {
  readonly id: string;
  readonly exists: boolean;
  data(): Record<string, unknown> | undefined;
};

type QuerySnapshotLike = {
  readonly docs: readonly DocumentSnapshotLike[];
  readonly empty: boolean;
  readonly size: number;
};

type QueryLike = {
  orderBy(field: unknown): QueryLike;
  where(field: unknown, operator: string, value: unknown): QueryLike;
  startAfter(value: string): QueryLike;
  limit(value: number): QueryLike;
  get(): Promise<QuerySnapshotLike>;
};

type DocumentReferenceLike = {
  readonly id: string;
  collection(path: string): CollectionLike;
  get(): Promise<DocumentSnapshotLike>;
};

type CollectionLike = QueryLike & {
  doc(id: string): DocumentReferenceLike;
};

type FirestoreLike = {
  collection(path: string): CollectionLike;
};

type AuthLike = {
  getUserByEmail(email: string): Promise<{ readonly uid: string }>;
};

type IamPermissionResponse = {
  readonly permissions?: readonly string[];
};

type XpAuditReaderDependencies = {
  readonly documentIdField: unknown;
  testIamPermissions(
    projectId: string,
    permissions: readonly string[],
  ): Promise<IamPermissionResponse>;
  getFirestore(): FirestoreLike;
  getAuth(): AuthLike;
  close(): Promise<void>;
};

export type UserPage = {
  users: readonly RawUser[];
  nextAfterUid: string | null;
  done: boolean;
};

export type EventPage = {
  events: readonly NormalizedAuditEvent[];
  nextAfterEventId: string | null;
  done: boolean;
};

export type AliasReadResult = {
  aliases: readonly AliasEvidence[];
  /** True only when the transitive identity closure and every returned ledger are complete. */
  complete: boolean;
};

export type XpAuditReader = {
  countUserDocuments(pageSize: number): Promise<number>;
  pageUsers(afterUid: string | null, limit: number): Promise<UserPage>;
  pageProgressEvents(
    uid: string,
    afterEventId: string | null,
    limit: number,
  ): Promise<EventPage>;
  readAliases(user: RawUser): Promise<AliasReadResult>;
  readMirrors(user: RawUser): Promise<MirrorValues>;
  resolveControlEmail(email: string): Promise<string | null>;
  readControlAccount(email: string): Promise<RawUser | null>;
  getReadCount(): number;
  /** Releases the dedicated Firebase Admin app; safe to call more than once. */
  close(): Promise<void>;
};

export type CreateXpAuditReaderOptions = {
  readonly projectId: string;
  readonly maximumReads: number;
  readonly signal?: AbortSignal;
  readonly aliasPageSize?: number;
  readonly eventPageSize?: number;
  readonly aliasMaxDepth?: number;
  readonly aliasMaxDocuments?: number;
};

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function number(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function integer(value: unknown): number | null {
  return typeof value === "number" && Number.isSafeInteger(value)
    ? value
    : null;
}

function timestampMs(value: unknown): number | null {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (value !== null && typeof value === "object") {
    const candidate = value as {
      toMillis?: unknown;
      seconds?: unknown;
      nanoseconds?: unknown;
    };
    if (typeof candidate.toMillis === "function") {
      const millis = candidate.toMillis.call(value) as unknown;
      return typeof millis === "number" && Number.isFinite(millis)
        ? millis
        : null;
    }
    if (
      typeof candidate.seconds === "number" &&
      Number.isFinite(candidate.seconds)
    ) {
      const nanos =
        typeof candidate.nanoseconds === "number" &&
        Number.isFinite(candidate.nanoseconds)
          ? candidate.nanoseconds
          : 0;
      return candidate.seconds * 1_000 + Math.floor(nanos / 1_000_000);
    }
  }
  return null;
}

function checkedPageSize(value: number): number {
  if (!Number.isInteger(value) || value < 1) {
    throw new Error("xp_audit_invalid_page_size");
  }
  return value;
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) throw new Error("xp_audit_aborted");
}

function currentUtcWeekId(now = new Date()): string {
  const date = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7,
  );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

function normalizeEvent(
  ownerUid: string,
  snapshot: DocumentSnapshotLike,
): NormalizedAuditEvent {
  const data = record(snapshot.data());
  const rawResult = data.result;
  const result = record(rawResult);
  const xpDelta = integer(result.xpDelta);
  const totalXpAfter = integer(result.totalXp);
  const normalizationValid =
    rawResult !== null &&
    typeof rawResult === "object" &&
    !Array.isArray(rawResult) &&
    xpDelta !== null &&
    xpDelta >= 0 &&
    totalXpAfter !== null &&
    totalXpAfter >= 0;
  const safeBefore =
    xpDelta !== null &&
    xpDelta >= 0 &&
    totalXpAfter !== null &&
    totalXpAfter >= xpDelta
      ? totalXpAfter - xpDelta
      : null;

  return {
    ownerUid,
    eventId: snapshot.id,
    type: text(data.type) ?? text(result.type) ?? "unknown",
    xpDelta: xpDelta ?? 0,
    totalXpAfter: totalXpAfter ?? 0,
    totalXpBefore: safeBefore,
    serverCreatedAtMs: timestampMs(data.createdAt),
    clientCreatedAtMs: timestampMs(data.clientCreatedAt),
    appVersion: text(data.appVersion),
    activeDate: text(result.activeDate),
    weekKey: text(result.weekKey),
    weekXpAfter: number(result.weekXp),
    payload: record(data.payload),
    normalizationValid,
  };
}

function iamPermissionTester(credential: Credential) {
  return async (
    id: string,
    permissions: readonly string[],
  ): Promise<IamPermissionResponse> => {
    const token = await credential.getAccessToken();
    const response = await fetch(
      `https://cloudresourcemanager.googleapis.com/v1/projects/${encodeURIComponent(id)}:testIamPermissions`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ permissions }),
      },
    );
    if (!response.ok) throw new Error("iam_test_failed");
    return (await response.json()) as IamPermissionResponse;
  };
}

let auditAppSequence = 0;

function firebaseDependencies(
  projectId: string,
  credential: Credential,
): XpAuditReaderDependencies {
  const existingNames = new Set(getApps().map((app) => app.name));
  let name: string;
  do {
    auditAppSequence += 1;
    name = `xp-integrity-audit-${Date.now()}-${auditAppSequence}`;
  } while (existingNames.has(name));
  const app = initializeApp({ credential, projectId }, name);
  return {
    documentIdField: FieldPath.documentId(),
    testIamPermissions: iamPermissionTester(credential),
    getFirestore: () => getFirestore(app) as unknown as FirestoreLike,
    getAuth: () => getAuth(app) as unknown as AuthLike,
    close: () => deleteApp(app),
  };
}

async function assertScopedEntityAndUserPermissions(
  projectId: string,
  dependencies: XpAuditReaderDependencies,
): Promise<void> {
  let response: IamPermissionResponse;
  try {
    response = await dependencies.testIamPermissions(
      projectId,
      REQUESTED_PERMISSIONS,
    );
  } catch {
    throw new Error("xp_audit_cannot_prove_scoped_entity_and_user_permissions");
  }
  if (!Array.isArray(response?.permissions)) {
    throw new Error("xp_audit_cannot_prove_scoped_entity_and_user_permissions");
  }
  const granted = new Set(response.permissions);
  if (WRITE_PERMISSIONS.some((permission) => granted.has(permission))) {
    throw new Error("xp_audit_scoped_entity_or_user_write_permission_detected");
  }
  if (
    !REQUIRED_READ_PERMISSIONS.every((permission) => granted.has(permission))
  ) {
    throw new Error("xp_audit_cannot_prove_scoped_entity_and_user_permissions");
  }
}

export async function createXpAuditReader(
  options: CreateXpAuditReaderOptions,
): Promise<XpAuditReader> {
  if (!text(options.projectId)) {
    throw new Error("xp_audit_cannot_prove_scoped_entity_and_user_permissions");
  }
  const budget = new ReadBudget(options.maximumReads);
  const aliasPageSize = checkedPageSize(options.aliasPageSize ?? 100);
  const eventPageSize = checkedPageSize(options.eventPageSize ?? 100);
  const aliasMaxDepth = checkedPageSize(options.aliasMaxDepth ?? 8);
  const aliasMaxDocuments = checkedPageSize(options.aliasMaxDocuments ?? 500);
  const credential = applicationDefault();
  await assertScopedEntityAndUserPermissions(options.projectId, {
    documentIdField: FieldPath.documentId(),
    testIamPermissions: iamPermissionTester(credential),
    getFirestore: () => {
      throw new Error("xp_audit_firestore_before_iam");
    },
    getAuth: () => {
      throw new Error("xp_audit_auth_before_iam");
    },
    close: async () => undefined,
  });
  const dependencies = firebaseDependencies(options.projectId, credential);

  let firestore: FirestoreLike;
  let auth: AuthLike;
  try {
    firestore = dependencies.getFirestore();
    auth = dependencies.getAuth();
  } catch (error) {
    try {
      await dependencies.close();
    } catch {
      // Preserve the construction failure after best-effort dedicated-app cleanup.
    }
    throw error;
  }
  const signal = options.signal;
  let closePromise: Promise<void> | null = null;

  const runQuery = async (
    makeQuery: () => QueryLike,
    reservation: number,
  ): Promise<QuerySnapshotLike> => {
    throwIfAborted(signal);
    const settle = budget.reserve(reservation);
    try {
      const snapshot = await makeQuery().get();
      settle(Math.max(1, snapshot.docs.length));
      throwIfAborted(signal);
      return snapshot;
    } catch (error) {
      try {
        settle(reservation);
      } catch (settlementError) {
        if (
          !(settlementError instanceof Error) ||
          settlementError.message !== "xp_audit_budget_reservation_reused"
        ) {
          throw settlementError;
        }
      }
      throw error;
    }
  };

  const readDocument = async (
    reference: DocumentReferenceLike,
  ): Promise<DocumentSnapshotLike> => {
    throwIfAborted(signal);
    const settle = budget.reserve(1);
    try {
      const snapshot = await reference.get();
      settle(1);
      throwIfAborted(signal);
      return snapshot;
    } catch (error) {
      try {
        settle(1);
      } catch (settlementError) {
        if (
          !(settlementError instanceof Error) ||
          settlementError.message !== "xp_audit_budget_reservation_reused"
        ) {
          throw settlementError;
        }
      }
      throw error;
    }
  };

  const makeDocumentIdPage = (
    collection: CollectionLike,
    after: string | null,
    limit: number,
  ): QueryLike => {
    let query = collection.orderBy(dependencies.documentIdField).limit(limit);
    if (after !== null) query = query.startAfter(after);
    return query;
  };

  const readMigration = async (uid: string) => {
    const snapshot = await readDocument(
      firestore
        .collection("users")
        .doc(uid)
        .collection("progress_migrations")
        .doc("client_snapshot_v1"),
    );
    const data = record(snapshot.data());
    const migrated =
      data.migrated === true ? true : data.migrated === false ? false : null;
    return {
      exists: snapshot.exists,
      migrated,
      createdAtMs: timestampMs(data.createdAt),
      keys: Array.isArray(data.keys)
        ? data.keys.filter((key): key is string => typeof key === "string")
        : [],
    };
  };

  const leagueGroupCache = new Map<string, DocumentSnapshotLike>();
  const readLeagueGroup = async (groupId: string) => {
    const cached = leagueGroupCache.get(groupId);
    if (cached) return cached;
    const snapshot = await readDocument(
      firestore.collection("league_groups").doc(groupId),
    );
    if (leagueGroupCache.size < 128) leagueGroupCache.set(groupId, snapshot);
    return snapshot;
  };

  const normalizeUser = async (
    snapshot: DocumentSnapshotLike,
  ): Promise<RawUser> => {
    const data = record(snapshot.data());
    const progressServerState = record(data.progressServerState);
    return {
      uid: snapshot.id,
      firebaseAuthUid: text(data.firebaseAuthUid),
      canonicalStableId: text(data.canonicalStableId),
      duplicateOfStableId: text(data.duplicateOfStableId),
      identityHidden: data.identityHidden === true,
      identityMergedAtMs: timestampMs(data.identityMergedAt),
      progress: record(data.progress),
      cutover: {
        progressServerAuthoritative: data.progressServerAuthoritative === true,
        progressServerCutoverAtMs: timestampMs(data.progressServerCutoverAt),
        progressMigratedAtMs: timestampMs(data.progressMigratedAt),
        xpLevelRestoreAtMs: timestampMs(data.xpLevelRestore250To400At),
        progressServerStateXp: number(progressServerState.totalXp),
        migrationDocument: await readMigration(snapshot.id),
      },
    };
  };

  const pageProgressEvents = async (
    uid: string,
    afterEventId: string | null,
    limitValue: number,
  ): Promise<EventPage> => {
    const limit = checkedPageSize(limitValue);
    const collection = firestore
      .collection("users")
      .doc(uid)
      .collection("progress_events");
    const snapshot = await runQuery(
      () => makeDocumentIdPage(collection, afterEventId, limit),
      limit,
    );
    return {
      events: snapshot.docs.map((document) => normalizeEvent(uid, document)),
      nextAfterEventId: snapshot.docs.at(-1)?.id ?? null,
      done: snapshot.docs.length < limit,
    };
  };

  const pageUsers = async (
    afterUid: string | null,
    limitValue: number,
  ): Promise<UserPage> => {
    const limit = checkedPageSize(limitValue);
    const snapshot = await runQuery(
      () => makeDocumentIdPage(firestore.collection("users"), afterUid, limit),
      limit,
    );
    const users: RawUser[] = [];
    for (const document of snapshot.docs)
      users.push(await normalizeUser(document));
    return {
      users,
      nextAfterUid: snapshot.docs.at(-1)?.id ?? null,
      done: snapshot.docs.length < limit,
    };
  };

  const discoverAliases = async (
    field: "canonicalStableId" | "duplicateOfStableId" | "firebaseAuthUid",
    value: string,
  ): Promise<readonly DocumentSnapshotLike[]> => {
    const found: DocumentSnapshotLike[] = [];
    let after: string | null = null;
    for (;;) {
      let snapshot: QuerySnapshotLike | null = null;
      for (let attempt = 0; attempt < 4 && snapshot === null; attempt += 1) {
        try {
          snapshot = await runQuery(() => {
            let query = firestore
              .collection("users")
              .where(field, "==", value)
              .orderBy(dependencies.documentIdField)
              .limit(aliasPageSize);
            if (after !== null) query = query.startAfter(after);
            return query;
          }, aliasPageSize);
        } catch (error) {
          const code = record(error).code;
          const transientPermissionFailure =
            code === 7 || code === "7" || code === "permission-denied";
          if (!transientPermissionFailure || attempt === 3) throw error;
          await new Promise((resolveDelay) => setTimeout(resolveDelay, 2_000));
        }
      }
      if (snapshot === null) throw new Error("xp_audit_alias_query_failed");
      found.push(...snapshot.docs);
      if (snapshot.docs.length < aliasPageSize) return found;
      after = snapshot.docs.at(-1)?.id ?? null;
    }
  };

  return {
    async countUserDocuments(pageSizeValue) {
      const pageSize = checkedPageSize(pageSizeValue);
      let count = 0;
      let after: string | null = null;
      for (;;) {
        const snapshot = await runQuery(
          () =>
            makeDocumentIdPage(firestore.collection("users"), after, pageSize),
          pageSize,
        );
        count += snapshot.docs.length;
        if (snapshot.docs.length < pageSize) return count;
        after = snapshot.docs.at(-1)?.id ?? null;
      }
    },
    pageUsers,
    pageProgressEvents,
    async readAliases(user) {
      throwIfAborted(signal);
      const candidates = new Map<string, DocumentSnapshotLike>();
      const queue: Array<{
        uid: string;
        authUid: string | null;
        depth: number;
      }> = [{ uid: user.uid, authUid: user.firebaseAuthUid, depth: 0 }];
      const visitedUids = new Set<string>();
      const visitedAuthUids = new Set<string>();
      let closureComplete = true;

      while (queue.length > 0) {
        const current = queue.shift() as {
          uid: string;
          authUid: string | null;
          depth: number;
        };
        if (visitedUids.has(current.uid)) continue;
        visitedUids.add(current.uid);
        if (current.depth >= aliasMaxDepth) {
          closureComplete = false;
          continue;
        }
        const groups: Array<
          [
            "canonicalStableId" | "duplicateOfStableId" | "firebaseAuthUid",
            string,
          ]
        > = [
          ["canonicalStableId", current.uid],
          ["duplicateOfStableId", current.uid],
        ];
        if (current.authUid !== null && !visitedAuthUids.has(current.authUid)) {
          visitedAuthUids.add(current.authUid);
          groups.push(["firebaseAuthUid", current.authUid]);
        }
        for (const [field, value] of groups) {
          let documents: readonly DocumentSnapshotLike[];
          try {
            documents = await discoverAliases(field, value);
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "xp_audit_aborted"
            ) {
              throw error;
            }
            if (process.env.XP_AUDIT_DEBUG_AGGREGATE === "1") {
              const rawCode = record(error).code;
              const code =
                typeof rawCode === "string" || typeof rawCode === "number"
                  ? String(rawCode)
                      .replace(/[^a-zA-Z0-9_.-]/g, "_")
                      .slice(0, 80)
                  : "unknown";
              console.error(`xp_audit_alias_discovery_failure=${field}:${code}`);
            }
            closureComplete = false;
            continue;
          }
          for (const document of documents) {
            if (document.id === user.uid || candidates.has(document.id))
              continue;
            if (candidates.size >= aliasMaxDocuments) {
              closureComplete = false;
              continue;
            }
            candidates.set(document.id, document);
            const data = record(document.data());
            queue.push({
              uid: document.id,
              authUid: text(data.firebaseAuthUid),
              depth: current.depth + 1,
            });
          }
        }
      }

      const aliases: Array<AliasEvidence & { eventHistoryComplete: boolean }> =
        [];
      for (const document of [...candidates.values()].sort((left, right) =>
        left.id.localeCompare(right.id),
      )) {
        const data = record(document.data());
        const events: NormalizedAuditEvent[] = [];
        let after: string | null = null;
        let eventHistoryComplete = true;
        for (;;) {
          let page: EventPage;
          try {
            page = await pageProgressEvents(document.id, after, eventPageSize);
          } catch (error) {
            if (
              error instanceof Error &&
              error.message === "xp_audit_aborted"
            ) {
              throw error;
            }
            eventHistoryComplete = false;
            break;
          }
          events.push(...page.events);
          if (page.done) break;
          after = page.nextAfterEventId;
        }
        const linkage =
          text(data.canonicalStableId) !== null
            ? "canonical_pointer"
            : text(data.duplicateOfStableId) !== null
              ? "duplicate_pointer"
              : "shared_auth_uid";
        aliases.push({
          uid: document.id,
          canonicalUid: user.uid,
          linkage,
          identityMergedAtMs: timestampMs(data.identityMergedAt),
          events,
          complete: closureComplete && eventHistoryComplete,
          eventHistoryComplete,
        });
      }
      const normalizedAliases = aliases.map(
        ({ eventHistoryComplete: _ignored, ...alias }) => alias,
      );
      return {
        aliases: normalizedAliases,
        complete:
          closureComplete && normalizedAliases.every((alias) => alias.complete),
      };
    },
    async readMirrors(user) {
      const leaderboard = await readDocument(
        firestore.collection("leaderboard").doc(user.uid),
      );
      const leaderboardData = record(leaderboard.data());
      const arena = await readDocument(
        firestore
          .collection("arena_profiles")
          .doc(user.firebaseAuthUid ?? user.uid),
      );
      const arenaData = record(arena.data());
      const groupId = text(leaderboardData.groupId);
      const currentWeekId = currentUtcWeekId();
      let leagueXp: number | null = null;
      if (
        groupId !== null &&
        text(leaderboardData.groupWeekId) === currentWeekId
      ) {
        const group = await readLeagueGroup(groupId);
        const groupData = record(group.data());
        if (text(groupData.weekId) === currentWeekId) {
          const member = record(groupData.members)[user.uid];
          leagueXp = number(record(member).totalXp);
        }
      }
      return {
        leaderboardXp: number(leaderboardData.points),
        arenaXp: number(arenaData.courseTotalXp),
        leagueXp,
      };
    },
    async resolveControlEmail(email) {
      throwIfAborted(signal);
      try {
        const resolved = await auth.getUserByEmail(email);
        throwIfAborted(signal);
        return text(resolved.uid);
      } catch (error) {
        throwIfAborted(signal);
        const code = record(error).code;
        if (code === "auth/user-not-found") return null;
        throw error;
      }
    },
    async readControlAccount(email) {
      throwIfAborted(signal);
      let authUid: string;
      try {
        authUid = (await auth.getUserByEmail(email)).uid;
      } catch (error) {
        throwIfAborted(signal);
        if (record(error).code === "auth/user-not-found") return null;
        throw error;
      }
      const link = await readDocument(
        firestore.collection("auth_links").doc(authUid),
      );
      const linkData = record(link.data());
      const stableUid = text(linkData.stable_id) ?? text(linkData.stableUid);
      if (stableUid === null) return null;
      const user = await readDocument(
        firestore.collection("users").doc(stableUid),
      );
      return user.exists ? normalizeUser(user) : null;
    },
    getReadCount: () => budget.count,
    async close() {
      closePromise ??= Promise.resolve().then(() => dependencies.close());
      await closePromise;
    },
  };
}

export { createXpAuditReader as createProductionXpAuditReader };
