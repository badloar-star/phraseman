import {
  canonicalJsonV1,
  hashCanonicalBody,
  utf8ByteLengthV1,
} from "../policies/decision_registry";
import {
  progressAccountKey,
  type ProgressAccountScope,
  type ProgressGenerationGuard,
  type ProgressStorage,
} from "./progress_store";

interface SpoolIndexHeadV1 {
  readonly schemaVersion: "learning-v2-required-session-spool-index.v1";
  readonly accountKey: string;
  readonly firstPageId: number | null;
  readonly lastPageId: number | null;
  readonly nextPageId: number;
  readonly pendingCount: number;
  readonly indexFingerprint: string;
}

interface SpoolIndexPageV1 {
  readonly schemaVersion: "learning-v2-required-session-spool-index-page.v1";
  readonly accountKey: string;
  readonly pageId: number;
  readonly mutationIds: readonly string[];
  readonly pageFingerprint: string;
}

interface SpoolIndexMemberV1 {
  readonly schemaVersion: "learning-v2-required-session-spool-index-member.v1";
  readonly accountKey: string;
  readonly mutationId: string;
  readonly pageId: number;
  readonly memberFingerprint: string;
}

interface SpoolIndexTransactionV1 {
  readonly schemaVersion: "learning-v2-required-session-spool-index-transaction.v1";
  readonly accountKey: string;
  readonly operation: "append" | "shift";
  readonly mutationId: string;
  readonly pageKey: string;
  readonly pageBefore: string | null;
  readonly pageAfter: string | null;
  readonly headBefore: string | null;
  readonly headAfter: string;
  readonly memberKey: string;
  readonly memberBefore: string | null;
  readonly memberAfter: string | null;
  readonly transactionFingerprint: string;
}

const HASH = /^[a-f0-9]{64}$/;
const ID = /^[A-Za-z0-9._:-]{1,160}$/;
const HEAD_BODY_KEYS = [
  "schemaVersion", "accountKey", "firstPageId", "lastPageId", "nextPageId",
  "pendingCount",
] as const;
const HEAD_KEYS = [...HEAD_BODY_KEYS, "indexFingerprint"] as const;
const PAGE_BODY_KEYS = ["schemaVersion", "accountKey", "pageId", "mutationIds"] as const;
const PAGE_KEYS = [...PAGE_BODY_KEYS, "pageFingerprint"] as const;
const MEMBER_BODY_KEYS = ["schemaVersion", "accountKey", "mutationId", "pageId"] as const;
const MEMBER_KEYS = [...MEMBER_BODY_KEYS, "memberFingerprint"] as const;
const TRANSACTION_BODY_KEYS = [
  "schemaVersion", "accountKey", "operation", "mutationId", "pageKey",
  "pageBefore", "pageAfter", "headBefore", "headAfter", "memberKey",
  "memberBefore", "memberAfter",
] as const;
const TRANSACTION_KEYS = [...TRANSACTION_BODY_KEYS, "transactionFingerprint"] as const;
const MAX_PAGE_ENTRIES = 64;
const MAX_PAGE_BYTES = 16 * 1024;
const MAX_HEAD_BYTES = 4 * 1024;
const MAX_MEMBER_BYTES = 2 * 1024;
const MAX_TRANSACTION_BYTES = 40 * 1024;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const exactKeys = (value: Record<string, unknown>, keys: readonly string[]): boolean => {
  const own = Reflect.ownKeys(value);
  return own.length === keys.length && own.every((key) =>
    typeof key === "string" && keys.includes(key));
};
const safeCount = (value: unknown): value is number =>
  Number.isSafeInteger(value) && Number(value) >= 0;
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== "object" || value === null || Object.isFrozen(value)) return value;
  Object.freeze(value);
  for (const child of Object.values(value as Record<string, unknown>)) deepFreeze(child);
  return value;
};
const fail = (code = "required_session_spool_index_corrupt"): never => {
  throw new Error(code);
};

const headKey = (accountKey: string): string =>
  `v2:required-session-local-commit-index:v1:${accountKey}:head`;
const pageKey = (accountKey: string, pageId: number): string =>
  `v2:required-session-local-commit-index:v1:${accountKey}:page:${pageId}`;
const memberKey = (accountKey: string, mutationId: string): string =>
  `v2:required-session-local-commit-index:v1:${accountKey}:member:${encodeURIComponent(mutationId)}`;
const transactionKey = (accountKey: string): string =>
  `v2:required-session-local-commit-index:v1:${accountKey}:transaction`;

const emptyHead = (accountKey: string): SpoolIndexHeadV1 => {
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index.v1" as const,
    accountKey,
    firstPageId: null,
    lastPageId: null,
    nextPageId: 0,
    pendingCount: 0,
  };
  return deepFreeze({ ...body, indexFingerprint: hashCanonicalBody(body) });
};

const parseHead = (raw: string | null, accountKey: string): SpoolIndexHeadV1 => {
  if (raw === null) return emptyHead(accountKey);
  if (raw.length > MAX_HEAD_BYTES || utf8ByteLengthV1(raw) > MAX_HEAD_BYTES) return fail();
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch { return fail(); }
  if (!isRecord(value) || !exactKeys(value, HEAD_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-spool-index.v1" ||
    value.accountKey !== accountKey || !safeCount(value.nextPageId) ||
    !safeCount(value.pendingCount) ||
    typeof value.indexFingerprint !== "string" || !HASH.test(value.indexFingerprint)) return fail();
  const firstPageId = value.firstPageId;
  const lastPageId = value.lastPageId;
  if ((firstPageId !== null && !safeCount(firstPageId)) ||
    (lastPageId !== null && !safeCount(lastPageId)) ||
    (value.pendingCount === 0 && (firstPageId !== null || lastPageId !== null)) ||
    (value.pendingCount > 0 && (firstPageId === null || lastPageId === null)) ||
    (typeof firstPageId === "number" && typeof lastPageId === "number" &&
      (firstPageId > lastPageId || lastPageId >= Number(value.nextPageId) ||
        Number(value.nextPageId) !== lastPageId + 1))) return fail();
  if (typeof firstPageId === "number" && typeof lastPageId === "number") {
    const pageCount = lastPageId - firstPageId + 1;
    const minimumEntries = pageCount === 1 ? 1 : (pageCount - 2) * MAX_PAGE_ENTRIES + 2;
    if (!Number.isSafeInteger(pageCount) || !Number.isSafeInteger(pageCount * MAX_PAGE_ENTRIES) ||
      !Number.isSafeInteger(minimumEntries) || Number(value.pendingCount) < minimumEntries ||
      Number(value.pendingCount) > pageCount * MAX_PAGE_ENTRIES) return fail();
  }
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index.v1" as const,
    accountKey,
    firstPageId: firstPageId as number | null,
    lastPageId: lastPageId as number | null,
    nextPageId: Number(value.nextPageId),
    pendingCount: Number(value.pendingCount),
  };
  const head = deepFreeze({ ...body, indexFingerprint: value.indexFingerprint });
  if (hashCanonicalBody(body) !== head.indexFingerprint || canonicalJsonV1(head) !== raw) return fail();
  return head;
};

const parsePage = (raw: string, accountKey: string, expectedPageId: number): SpoolIndexPageV1 => {
  if (raw.length > MAX_PAGE_BYTES || utf8ByteLengthV1(raw) > MAX_PAGE_BYTES) return fail();
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch { return fail(); }
  if (!isRecord(value) || !exactKeys(value, PAGE_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-spool-index-page.v1" ||
    value.accountKey !== accountKey || value.pageId !== expectedPageId ||
    !Array.isArray(value.mutationIds) || value.mutationIds.length < 1 ||
    value.mutationIds.length > MAX_PAGE_ENTRIES ||
    value.mutationIds.some((id) => typeof id !== "string" || !ID.test(id)) ||
    new Set(value.mutationIds).size !== value.mutationIds.length ||
    typeof value.pageFingerprint !== "string" || !HASH.test(value.pageFingerprint)) return fail();
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index-page.v1" as const,
    accountKey,
    pageId: expectedPageId,
    mutationIds: Object.freeze([...value.mutationIds]) as readonly string[],
  };
  const page = deepFreeze({ ...body, pageFingerprint: value.pageFingerprint });
  if (hashCanonicalBody(body) !== page.pageFingerprint || canonicalJsonV1(page) !== raw) return fail();
  return page;
};

const assertFirstPageCountClosure = (
  head: SpoolIndexHeadV1,
  page: SpoolIndexPageV1,
): void => {
  if (head.firstPageId !== page.pageId || head.lastPageId === null) return fail();
  const pageCount = head.lastPageId - page.pageId + 1;
  if (pageCount === 1) {
    if (head.pendingCount !== page.mutationIds.length) return fail();
    return;
  }
  const remaining = head.pendingCount - page.mutationIds.length;
  const minimumRemaining = (pageCount - 2) * MAX_PAGE_ENTRIES + 1;
  const maximumRemaining = (pageCount - 1) * MAX_PAGE_ENTRIES;
  if (remaining < minimumRemaining || remaining > maximumRemaining) return fail();
};

const assertLastPageCountClosure = (
  head: SpoolIndexHeadV1,
  page: SpoolIndexPageV1,
): void => {
  if (head.lastPageId !== page.pageId || head.firstPageId === null) return fail();
  const pageCount = page.pageId - head.firstPageId + 1;
  if (pageCount === 1) {
    if (head.pendingCount !== page.mutationIds.length) return fail();
    return;
  }
  const preceding = head.pendingCount - page.mutationIds.length;
  const minimumPreceding = (pageCount - 2) * MAX_PAGE_ENTRIES + 1;
  const maximumPreceding = (pageCount - 1) * MAX_PAGE_ENTRIES;
  if (preceding < minimumPreceding || preceding > maximumPreceding) return fail();
};

const parseMember = (
  raw: string,
  accountKey: string,
  expectedMutationId: string,
): SpoolIndexMemberV1 => {
  if (raw.length > MAX_MEMBER_BYTES || utf8ByteLengthV1(raw) > MAX_MEMBER_BYTES) return fail();
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch { return fail(); }
  if (!isRecord(value) || !exactKeys(value, MEMBER_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-spool-index-member.v1" ||
    value.accountKey !== accountKey || value.mutationId !== expectedMutationId ||
    !safeCount(value.pageId) || typeof value.memberFingerprint !== "string" ||
    !HASH.test(value.memberFingerprint)) return fail();
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index-member.v1" as const,
    accountKey,
    mutationId: expectedMutationId,
    pageId: Number(value.pageId),
  };
  const member = deepFreeze({ ...body, memberFingerprint: value.memberFingerprint });
  if (hashCanonicalBody(body) !== member.memberFingerprint || canonicalJsonV1(member) !== raw) {
    return fail();
  }
  return member;
};

const parseTransaction = (
  raw: string,
  accountKey: string,
): SpoolIndexTransactionV1 => {
  if (raw.length > MAX_TRANSACTION_BYTES || utf8ByteLengthV1(raw) > MAX_TRANSACTION_BYTES) {
    return fail();
  }
  let value: unknown;
  try { value = JSON.parse(raw) as unknown; } catch { return fail(); }
  if (!isRecord(value) || !exactKeys(value, TRANSACTION_KEYS) ||
    value.schemaVersion !== "learning-v2-required-session-spool-index-transaction.v1" ||
    value.accountKey !== accountKey ||
    (value.operation !== "append" && value.operation !== "shift") ||
    typeof value.mutationId !== "string" || !ID.test(value.mutationId) ||
    typeof value.pageKey !== "string" || typeof value.headAfter !== "string" ||
    typeof value.memberKey !== "string" ||
    ![value.pageBefore, value.pageAfter, value.headBefore, value.memberBefore, value.memberAfter]
      .every((candidate) => candidate === null || typeof candidate === "string") ||
    typeof value.transactionFingerprint !== "string" ||
    !HASH.test(value.transactionFingerprint)) return fail();
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index-transaction.v1" as const,
    accountKey,
    operation: value.operation as "append" | "shift",
    mutationId: value.mutationId,
    pageKey: value.pageKey,
    pageBefore: value.pageBefore as string | null,
    pageAfter: value.pageAfter as string | null,
    headBefore: value.headBefore as string | null,
    headAfter: value.headAfter,
    memberKey: value.memberKey,
    memberBefore: value.memberBefore as string | null,
    memberAfter: value.memberAfter as string | null,
  };
  const transaction = deepFreeze({
    ...body,
    transactionFingerprint: value.transactionFingerprint,
  });
  if (hashCanonicalBody(body) !== transaction.transactionFingerprint ||
    canonicalJsonV1(transaction) !== raw) return fail();
  const pagePrefix = `v2:required-session-local-commit-index:v1:${accountKey}:page:`;
  if (!transaction.pageKey.startsWith(pagePrefix)) return fail();
  const pageIdText = transaction.pageKey.slice(pagePrefix.length);
  if (!/^(0|[1-9][0-9]*)$/.test(pageIdText)) return fail();
  const pageId = Number(pageIdText);
  if (!safeCount(pageId) || transaction.pageKey !== pageKey(accountKey, pageId) ||
    transaction.memberKey !== memberKey(accountKey, transaction.mutationId)) return fail();
  const headBefore = parseHead(transaction.headBefore, accountKey);
  const headAfter = parseHead(transaction.headAfter, accountKey);
  const pageBefore = transaction.pageBefore === null
    ? null
    : parsePage(transaction.pageBefore, accountKey, pageId);
  const pageAfter = transaction.pageAfter === null
    ? null
    : parsePage(transaction.pageAfter, accountKey, pageId);
  const memberBefore = transaction.memberBefore === null
    ? null
    : parseMember(transaction.memberBefore, accountKey, transaction.mutationId);
  const memberAfter = transaction.memberAfter === null
    ? null
    : parseMember(transaction.memberAfter, accountKey, transaction.mutationId);
  if (transaction.operation === "append") {
    if (pageBefore !== null) assertLastPageCountClosure(headBefore, pageBefore);
    if (pageAfter !== null) assertLastPageCountClosure(headAfter, pageAfter);
    if (memberBefore !== null || memberAfter?.pageId !== pageId || pageAfter === null ||
      pageAfter.mutationIds.at(-1) !== transaction.mutationId ||
      headAfter.pendingCount !== headBefore.pendingCount + 1 ||
      (pageBefore !== null && (
        pageAfter.mutationIds.length !== pageBefore.mutationIds.length + 1 ||
        pageBefore.mutationIds.some((id, index) => pageAfter.mutationIds[index] !== id)
      )) ||
      (pageBefore === null && pageAfter.mutationIds.length !== 1) ||
      (headBefore.pendingCount === 0 && (
        pageId !== headBefore.nextPageId || headAfter.firstPageId !== pageId ||
        headAfter.lastPageId !== pageId || headAfter.nextPageId !== headBefore.nextPageId + 1
      )) ||
      (headBefore.pendingCount > 0 && pageBefore !== null && (
        pageId !== headBefore.lastPageId || headAfter.firstPageId !== headBefore.firstPageId ||
        headAfter.lastPageId !== headBefore.lastPageId ||
        headAfter.nextPageId !== headBefore.nextPageId
      )) ||
      (headBefore.pendingCount > 0 && pageBefore === null && (
        pageId !== headBefore.nextPageId || headAfter.firstPageId !== headBefore.firstPageId ||
        headAfter.lastPageId !== pageId || headAfter.nextPageId !== headBefore.nextPageId + 1
      ))) return fail();
  } else {
    if (pageBefore !== null) assertFirstPageCountClosure(headBefore, pageBefore);
    if (pageAfter !== null) assertFirstPageCountClosure(headAfter, pageAfter);
    if (memberBefore?.pageId !== pageId || memberAfter !== null || pageBefore === null ||
      pageBefore.mutationIds[0] !== transaction.mutationId ||
      headAfter.pendingCount !== headBefore.pendingCount - 1 ||
      (pageAfter === null && pageBefore.mutationIds.length !== 1) ||
      (pageAfter !== null && (
        pageAfter.mutationIds.length !== pageBefore.mutationIds.length - 1 ||
        pageAfter.mutationIds.some((id, index) => pageBefore.mutationIds[index + 1] !== id)
      )) || pageId !== headBefore.firstPageId ||
      headAfter.nextPageId !== headBefore.nextPageId ||
      (pageAfter !== null && (
        headAfter.firstPageId !== headBefore.firstPageId ||
        headAfter.lastPageId !== headBefore.lastPageId
      )) ||
      (pageAfter === null && headAfter.pendingCount === 0 && (
        headAfter.firstPageId !== null || headAfter.lastPageId !== null
      )) ||
      (pageAfter === null && headAfter.pendingCount > 0 && (
        headAfter.firstPageId !== pageId + 1 || headAfter.lastPageId !== headBefore.lastPageId
      ))) return fail();
  }
  return transaction;
};

const materializePage = (
  accountKey: string,
  pageId: number,
  mutationIds: readonly string[],
): string => {
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index-page.v1" as const,
    accountKey,
    pageId,
    mutationIds: Object.freeze([...mutationIds]),
  };
  return canonicalJsonV1({ ...body, pageFingerprint: hashCanonicalBody(body) });
};

const materializeHead = (
  accountKey: string,
  input: Omit<SpoolIndexHeadV1, "schemaVersion" | "accountKey" | "indexFingerprint">,
): string => {
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index.v1" as const,
    accountKey,
    ...input,
  };
  return canonicalJsonV1({ ...body, indexFingerprint: hashCanonicalBody(body) });
};

const materializeMember = (accountKey: string, mutationId: string, pageId: number): string => {
  const body = {
    schemaVersion: "learning-v2-required-session-spool-index-member.v1" as const,
    accountKey,
    mutationId,
    pageId,
  };
  return canonicalJsonV1({ ...body, memberFingerprint: hashCanonicalBody(body) });
};

export const createRequiredSessionSpoolIndex = (
  storage: ProgressStorage,
  isCurrentGeneration: ProgressGenerationGuard,
) => {
  if (typeof storage.removeItem !== "function") {
    throw new Error("required_session_spool_index_storage_unsupported");
  }
  const removeItem = storage.removeItem.bind(storage);
  const assertCurrent = (scope: ProgressAccountScope): void => {
    if (!isCurrentGeneration(scope)) throw new Error("progress_generation_stale");
  };
  const applySlot = async (
    scope: ProgressAccountScope,
    key: string,
    before: string | null,
    after: string | null,
  ): Promise<void> => {
    assertCurrent(scope);
    const current = await storage.getItem(key);
    if (current === after) return;
    if (current !== before) fail("required_session_spool_index_conflict");
    if (after === null) await removeItem(key);
    else await storage.setItem(key, after);
    assertCurrent(scope);
    if (await storage.getItem(key) !== after) {
      fail("required_session_spool_index_indeterminate");
    }
  };
  const applyTransaction = async (
    scope: ProgressAccountScope,
    transaction: SpoolIndexTransactionV1,
  ): Promise<void> => {
    await applySlot(scope, transaction.pageKey, transaction.pageBefore, transaction.pageAfter);
    await applySlot(
      scope,
      headKey(transaction.accountKey),
      transaction.headBefore,
      transaction.headAfter,
    );
    await applySlot(
      scope,
      transaction.memberKey,
      transaction.memberBefore,
      transaction.memberAfter,
    );
  };
  const recoverTransaction = async (scope: ProgressAccountScope): Promise<void> => {
    assertCurrent(scope);
    const accountKey = progressAccountKey(scope);
    const key = transactionKey(accountKey);
    const raw = await storage.getItem(key);
    if (raw === null) return;
    const transaction = parseTransaction(raw, accountKey);
    await applyTransaction(scope, transaction);
    await removeItem(key);
    assertCurrent(scope);
    if (await storage.getItem(key) !== null) {
      fail("required_session_spool_index_indeterminate");
    }
  };
  const commitTransaction = async (
    scope: ProgressAccountScope,
    body: Omit<SpoolIndexTransactionV1, "schemaVersion" | "transactionFingerprint">,
  ): Promise<void> => {
    await recoverTransaction(scope);
    const accountKey = progressAccountKey(scope);
    const fullBody = {
      schemaVersion: "learning-v2-required-session-spool-index-transaction.v1" as const,
      ...body,
    };
    const encoded = canonicalJsonV1({
      ...fullBody,
      transactionFingerprint: hashCanonicalBody(fullBody),
    });
    if (utf8ByteLengthV1(encoded) > MAX_TRANSACTION_BYTES) {
      fail("required_session_spool_index_overflow");
    }
    const parsedTransaction = parseTransaction(encoded, accountKey);
    const key = transactionKey(accountKey);
    if (await storage.getItem(key) !== null) fail("required_session_spool_index_conflict");
    await storage.setItem(key, encoded);
    assertCurrent(scope);
    if (await storage.getItem(key) !== encoded) {
      fail("required_session_spool_index_indeterminate");
    }
    await applyTransaction(scope, parsedTransaction);
    await removeItem(key);
    assertCurrent(scope);
    if (await storage.getItem(key) !== null) {
      fail("required_session_spool_index_indeterminate");
    }
  };
  const readHead = async (
    scope: ProgressAccountScope,
  ): Promise<{ readonly raw: string | null; readonly head: SpoolIndexHeadV1 }> => {
    await recoverTransaction(scope);
    const accountKey = progressAccountKey(scope);
    const raw = await storage.getItem(headKey(accountKey));
    assertCurrent(scope);
    return Object.freeze({ raw, head: parseHead(raw, accountKey) });
  };
  const readMemberClosure = async (
    scope: ProgressAccountScope,
    mutationId: string,
  ): Promise<SpoolIndexMemberV1 | null> => {
    await recoverTransaction(scope);
    const accountKey = progressAccountKey(scope);
    const raw = await storage.getItem(memberKey(accountKey, mutationId));
    if (raw === null) return null;
    const member = parseMember(raw, accountKey, mutationId);
    const { head } = await readHead(scope);
    if (head.pendingCount === 0 || head.firstPageId === null || head.lastPageId === null ||
      member.pageId < head.firstPageId || member.pageId > head.lastPageId) return fail();
    const pageRaw = await storage.getItem(pageKey(accountKey, member.pageId));
    if (pageRaw === null) return fail();
    const page = parsePage(pageRaw, accountKey, member.pageId);
    if (member.pageId === head.firstPageId) assertFirstPageCountClosure(head, page);
    if (member.pageId === head.lastPageId) assertLastPageCountClosure(head, page);
    if (member.pageId !== head.firstPageId && member.pageId !== head.lastPageId &&
      page.mutationIds.length !== MAX_PAGE_ENTRIES) return fail();
    if (page.mutationIds.filter((candidate) => candidate === mutationId).length !== 1) return fail();
    return member;
  };

  return Object.freeze({
    recover: (scope: ProgressAccountScope): Promise<void> => recoverTransaction(scope),
    async append(scope: ProgressAccountScope, mutationId: string): Promise<void> {
      assertCurrent(scope);
      if (!ID.test(mutationId)) fail("required_session_spool_index_mutation_invalid");
      await recoverTransaction(scope);
      const accountKey = progressAccountKey(scope);
      const memberStorageKey = memberKey(accountKey, mutationId);
      if (await readMemberClosure(scope, mutationId)) return;
      const { raw: headBefore, head } = await readHead(scope);
      let targetPageId: number;
      let pageBefore: string | null;
      let mutationIds: readonly string[];
      let nextPageId = head.nextPageId;
      let firstPageId = head.firstPageId;
      let lastPageId = head.lastPageId;
      if (head.lastPageId === null) {
        targetPageId = head.nextPageId;
        pageBefore = null;
        mutationIds = [mutationId];
        firstPageId = targetPageId;
        lastPageId = targetPageId;
        nextPageId += 1;
      } else {
        targetPageId = head.lastPageId;
        const currentPageKey = pageKey(accountKey, targetPageId);
        pageBefore = await storage.getItem(currentPageKey);
        if (pageBefore === null) return fail();
        const tail = parsePage(pageBefore, accountKey, targetPageId);
        assertLastPageCountClosure(head, tail);
        if (tail.mutationIds.length < MAX_PAGE_ENTRIES) {
          mutationIds = [...tail.mutationIds, mutationId];
        } else {
          targetPageId = head.nextPageId;
          pageBefore = null;
          mutationIds = [mutationId];
          lastPageId = targetPageId;
          nextPageId += 1;
        }
      }
      if (!Number.isSafeInteger(head.pendingCount + 1) || !Number.isSafeInteger(nextPageId)) {
        fail("required_session_spool_index_overflow");
      }
      const targetPageKey = pageKey(accountKey, targetPageId);
      const pageAfter = materializePage(accountKey, targetPageId, mutationIds);
      const headAfter = materializeHead(accountKey, {
        firstPageId,
        lastPageId,
        nextPageId,
        pendingCount: head.pendingCount + 1,
      });
      const memberAfter = materializeMember(accountKey, mutationId, targetPageId);
      await commitTransaction(scope, {
        accountKey,
        operation: "append",
        mutationId,
        pageKey: targetPageKey,
        pageBefore,
        pageAfter,
        headBefore,
        headAfter,
        memberKey: memberStorageKey,
        memberBefore: null,
        memberAfter,
      });
    },
    async peek(scope: ProgressAccountScope): Promise<readonly string[]> {
      const { head } = await readHead(scope);
      if (head.firstPageId === null) return Object.freeze([]);
      const accountKey = progressAccountKey(scope);
      const raw = await storage.getItem(pageKey(accountKey, head.firstPageId));
      assertCurrent(scope);
      if (raw === null) return fail();
      const page = parsePage(raw, accountKey, head.firstPageId);
      assertFirstPageCountClosure(head, page);
      for (const mutationId of page.mutationIds) {
        const memberRaw = await storage.getItem(memberKey(accountKey, mutationId));
        if (memberRaw === null ||
          parseMember(memberRaw, accountKey, mutationId).pageId !== head.firstPageId) return fail();
      }
      return page.mutationIds;
    },
    async shift(scope: ProgressAccountScope, mutationId: string): Promise<void> {
      assertCurrent(scope);
      if (!ID.test(mutationId)) fail("required_session_spool_index_mutation_invalid");
      await recoverTransaction(scope);
      const accountKey = progressAccountKey(scope);
      const { raw: headBefore, head } = await readHead(scope);
      const firstPageIdBefore = head.firstPageId;
      if (firstPageIdBefore === null || head.pendingCount === 0) {
        fail("required_session_spool_index_order_mismatch");
      }
      const currentPageId = Number(firstPageIdBefore);
      const targetPageKey = pageKey(accountKey, currentPageId);
      const pageBefore = await storage.getItem(targetPageKey);
      if (pageBefore === null) return fail();
      const page = parsePage(pageBefore, accountKey, currentPageId);
      assertFirstPageCountClosure(head, page);
      if (page.mutationIds[0] !== mutationId) {
        fail("required_session_spool_index_order_mismatch");
      }
      const memberStorageKey = memberKey(accountKey, mutationId);
      const memberBefore = await storage.getItem(memberStorageKey);
      if (memberBefore === null ||
        parseMember(memberBefore, accountKey, mutationId).pageId !== currentPageId) return fail();
      const remainingIds = page.mutationIds.slice(1);
      const pendingCount = head.pendingCount - 1;
      const pageAfter = remainingIds.length === 0
        ? null
        : materializePage(accountKey, currentPageId, remainingIds);
      const firstPageId = remainingIds.length > 0
        ? currentPageId
        : pendingCount === 0 ? null : currentPageId + 1;
      const lastPageId = pendingCount === 0 ? null : head.lastPageId;
      const headAfter = materializeHead(accountKey, {
        firstPageId,
        lastPageId,
        nextPageId: head.nextPageId,
        pendingCount,
      });
      await commitTransaction(scope, {
        accountKey,
        operation: "shift",
        mutationId,
        pageKey: targetPageKey,
        pageBefore,
        pageAfter,
        headBefore,
        headAfter,
        memberKey: memberStorageKey,
        memberBefore,
        memberAfter: null,
      });
    },
    async count(scope: ProgressAccountScope): Promise<number> {
      return (await readHead(scope)).head.pendingCount;
    },
    has(scope: ProgressAccountScope, mutationId: string): Promise<boolean> {
      if (!ID.test(mutationId)) fail("required_session_spool_index_mutation_invalid");
      return readMemberClosure(scope, mutationId).then((member) => member !== null);
    },
  });
};
