import {
  applicationDefault,
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

export type IamPermissionResponse = {
  readonly permissions?: readonly string[];
};

export type XpAuditReaderDependencies = {
  readonly documentIdField: unknown;
  testIamPermissions(
    projectId: string,
    permissions: readonly string[],
  ): Promise<IamPermissionResponse>;
  getFirestore(): FirestoreLike;
  getAuth(): AuthLike;
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

export type XpAuditReader = {
  countUserDocuments(pageSize: number): Promise<number>;
  pageUsers(afterUid: string | null, limit: number): Promise<UserPage>;
  pageProgressEvents(
    uid: string,
    afterEventId: string | null,
    limit: number,
  ): Promise<EventPage>;
  readAliases(user: RawUser): Promise<readonly AliasEvidence[]>;
  readMirrors(user: RawUser): Promise<MirrorValues>;
  resolveControlEmail(email: string): Promise<string | null>;
  getReadCount(): number;
};

export type CreateXpAuditReaderOptions = {
  readonly projectId: string;
  readonly maximumReads: number;
  readonly signal?: AbortSignal;
  readonly aliasPageSize?: number;
  readonly eventPageSize?: number;
  readonly dependencies?: XpAuditReaderDependencies;
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

function normalizeEvent(
  ownerUid: string,
  snapshot: DocumentSnapshotLike,
): NormalizedAuditEvent {
  const data = record(snapshot.data());
  const result = record(data.result);
  const xpDelta = integer(result.xpDelta);
  const totalXpAfter = integer(result.totalXp);
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
  };
}

function defaultDependencies(projectId: string): XpAuditReaderDependencies {
  const credential: Credential = applicationDefault();
  const app =
    getApps().find((candidate) => candidate.options.projectId === projectId) ??
    initializeApp({ credential, projectId }, `xp-integrity-audit-${projectId}`);

  return {
    documentIdField: FieldPath.documentId(),
    async testIamPermissions(id, permissions) {
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
    },
    getFirestore: () => getFirestore(app) as unknown as FirestoreLike,
    getAuth: () => getAuth(app) as unknown as AuthLike,
  };
}

async function assertReadOnlyIam(
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
    throw new Error("xp_audit_cannot_prove_read_only_principal");
  }
  if (!Array.isArray(response?.permissions)) {
    throw new Error("xp_audit_cannot_prove_read_only_principal");
  }
  const granted = new Set(response.permissions);
  if (WRITE_PERMISSIONS.some((permission) => granted.has(permission))) {
    throw new Error("xp_audit_principal_has_write_permissions");
  }
  if (
    !REQUIRED_READ_PERMISSIONS.every((permission) => granted.has(permission))
  ) {
    throw new Error("xp_audit_cannot_prove_read_only_principal");
  }
}

export async function createXpAuditReader(
  options: CreateXpAuditReaderOptions,
): Promise<XpAuditReader> {
  if (!text(options.projectId)) {
    throw new Error("xp_audit_cannot_prove_read_only_principal");
  }
  const dependencies =
    options.dependencies ?? defaultDependencies(options.projectId);
  await assertReadOnlyIam(options.projectId, dependencies);

  const firestore = dependencies.getFirestore();
  const auth = dependencies.getAuth();
  const budget = new ReadBudget(options.maximumReads);
  const aliasPageSize = checkedPageSize(options.aliasPageSize ?? 100);
  const eventPageSize = checkedPageSize(options.eventPageSize ?? 100);
  const signal = options.signal;

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
    const migrated = data.migrated === true;
    return {
      exists: snapshot.exists && migrated,
      createdAtMs: migrated ? timestampMs(data.createdAt) : null,
      keys:
        migrated && Array.isArray(data.keys)
          ? data.keys.filter((key): key is string => typeof key === "string")
          : [],
    };
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
        xpLevelRestoreAtMs: timestampMs(data.xpLevelRestoreAt),
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
      const snapshot = await runQuery(() => {
        let query = firestore
          .collection("users")
          .where(field, "==", value)
          .orderBy(dependencies.documentIdField)
          .limit(aliasPageSize);
        if (after !== null) query = query.startAfter(after);
        return query;
      }, aliasPageSize);
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
      const candidates = new Map<string, DocumentSnapshotLike>();
      const groups: readonly [
        "canonicalStableId" | "duplicateOfStableId" | "firebaseAuthUid",
        string | null,
      ][] = [
        ["canonicalStableId", user.uid],
        ["duplicateOfStableId", user.uid],
        ["firebaseAuthUid", user.firebaseAuthUid],
      ];
      for (const [field, value] of groups) {
        if (value === null) continue;
        const documents = await discoverAliases(field, value);
        for (const document of documents) {
          if (document.id !== user.uid) candidates.set(document.id, document);
        }
      }

      const aliases: AliasEvidence[] = [];
      for (const document of [...candidates.values()].sort((left, right) =>
        left.id.localeCompare(right.id),
      )) {
        const data = record(document.data());
        const events: NormalizedAuditEvent[] = [];
        let after: string | null = null;
        for (;;) {
          const page = await pageProgressEvents(
            document.id,
            after,
            eventPageSize,
          );
          events.push(...page.events);
          if (page.done) break;
          after = page.nextAfterEventId;
        }
        const linkage =
          text(data.canonicalStableId) === user.uid
            ? "canonical_pointer"
            : text(data.duplicateOfStableId) === user.uid
              ? "duplicate_pointer"
              : "shared_auth_uid";
        aliases.push({
          uid: document.id,
          canonicalUid: user.uid,
          linkage,
          identityMergedAtMs: timestampMs(data.identityMergedAt),
          events,
          complete: true,
        });
      }
      return aliases;
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
      let leagueXp: number | null = null;
      if (groupId !== null) {
        const group = await readDocument(
          firestore.collection("league_groups").doc(groupId),
        );
        const member = record(record(group.data()).members)[user.uid];
        leagueXp = number(record(member).totalXp);
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
        const code = record(error).code;
        if (code === "auth/user-not-found") return null;
        throw error;
      }
    },
    getReadCount: () => budget.count,
  };
}
