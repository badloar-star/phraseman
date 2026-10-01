import { createHash, randomBytes } from 'crypto';
import fs from 'fs';
import path from 'path';
import { createAccountsV2DeletionCredential } from '../modules/account-session-v2/account_deletion_credential';
import { createAccountDetachLatch } from '../modules/account-session-v2/account_detach_latch';
import { createAccountScopeStore } from '../modules/account-session-v2/account_scope_store';
import type { AccountSyncWireBatch } from '../modules/account-session-v2/account_sync';
import { createAccountSyncOutbox } from '../modules/account-session-v2/account_sync_outbox';
import {
  createAccountsV2ClientController,
  type AccountsV2ClientController,
} from '../modules/account-session-v2/account_v2_client_session';
import { MemoryScopeStorageAdapter } from '../modules/account-session-v2/testing/memory_scope_storage';

/*
 * Account V2, Пакет 6D (TG-D3DE53F2D345) — серверный E2E на ЛОКАЛЬНОМ Firebase
 * Emulator Suite: настоящий клиент V2 (контроллер → outbox → раннер →
 * callable-транспорт) против настоящих функций accountsV2SyncApply /
 * accountDeleteEnqueue / accountsV2DeletionStatus в эмуляторе, 3 тестовых
 * аккаунта сидера. Телефонный путь (SQLCipher, SecureStore) — в квитанции,
 * проверяется на Android-эмуляторе отдельно; здесь хранилище области — память.
 *
 * Запускается ТОЛЬКО явно: ACCOUNTS_V2_EMULATOR_E2E=1 и три loopback-хоста
 * (FIREBASE_AUTH_EMULATOR_HOST, FIRESTORE_EMULATOR_HOST, FUNCTIONS_EMULATOR_HOST).
 * Иначе — skip (обычный прогон тестов его не трогает и в сеть не ходит).
 * Факты пишутся в ACCOUNTS_V2_E2E_OUT (JSON), без паролей и токенов; uid — усечённым sha256.
 */

const RUN = process.env.ACCOUNTS_V2_EMULATOR_E2E === '1';
const LOOPBACK = /^(127\.0\.0\.1|localhost):\d{2,5}$/;
const SEED_FILE = path.resolve(__dirname, '..', 'scripts', 'accounts-v2-emulator-seed.local.json');
const OUT = process.env.ACCOUNTS_V2_E2E_OUT ?? '';
const REGION = 'us-central1';

type Account = Readonly<{ label: string; email: string; password: string }>;
type Facts = Record<string, unknown>;

function host(name: string): string {
  const value = String(process.env[name] ?? '').trim();
  if (!LOOPBACK.test(value)) throw new Error(`e2e_refused:${name}_not_loopback`);
  return value;
}

function tag(uid: string): string {
  return createHash('sha256').update(uid).digest('hex').slice(0, 10);
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitFor<T>(read: () => Promise<T>, ok: (value: T) => boolean, timeoutMs: number): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!ok(value) && Date.now() < deadline) {
    await sleep(500);
    value = await read();
  }
  return value;
}

const d = RUN ? describe : describe.skip;

d('Account V2 E2E on the Firebase Emulator Suite (3 local accounts)', () => {
  jest.setTimeout(240_000);
  const authHost = RUN ? host('FIREBASE_AUTH_EMULATOR_HOST') : '';
  const firestoreHost = RUN ? host('FIRESTORE_EMULATOR_HOST') : '';
  const functionsHost = RUN ? host('FUNCTIONS_EMULATOR_HOST') : '';
  const seed = RUN ? JSON.parse(fs.readFileSync(SEED_FILE, 'utf8')) as { project: string; accounts: Account[] } : null;
  const project = seed?.project ?? '';
  const docsBase = () => `http://${firestoreHost}/v1/projects/${project}/databases/(default)/documents`;
  const facts: Facts = { startedAt: new Date().toISOString(), project, accounts: {} };
  let log: jest.SpyInstance;
  let warn: jest.SpyInstance;
  const clientLines: string[] = [];

  beforeAll(() => {
    log = jest.spyOn(console, 'log').mockImplementation((...args: unknown[]) => { clientLines.push(args.join(' ')); });
    warn = jest.spyOn(console, 'warn').mockImplementation((...args: unknown[]) => { clientLines.push(args.join(' ')); });
  });
  afterAll(() => {
    log.mockRestore();
    warn.mockRestore();
    facts.finishedAt = new Date().toISOString();
    facts.clientLogTail = clientLines.filter((line) => line.startsWith('[ACCOUNT-V2]') || line.startsWith('[ACCOUNTS-V2-CLIENT]')).slice(0, 400);
    if (OUT.length > 0) fs.writeFileSync(OUT, JSON.stringify(facts, null, 2));
  });

  async function signIn(account: Account): Promise<{ uid: string; idToken: string }> {
    const response = await fetch(`http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: account.email, password: account.password, returnSecureToken: true }),
    });
    const json = await response.json() as { localId?: string; idToken?: string; error?: { message?: string } };
    if (!response.ok || !json.localId || !json.idToken) throw new Error(`signin_failed:${json.error?.message ?? response.status}`);
    return { uid: json.localId, idToken: json.idToken };
  }

  /** Протокол callable (как httpsCallable): успех → { data }, ошибка → { code, message, details }. */
  async function callable(name: string, data: unknown, idToken: string | null): Promise<unknown> {
    const response = await fetch(`http://${functionsHost}/${project}/${REGION}/${name}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
      body: JSON.stringify({ data }),
    });
    const json = await response.json().catch(() => ({})) as { result?: unknown; error?: { status?: string; message?: string; details?: unknown } };
    if (json.error !== undefined || !response.ok) {
      const status = String(json.error?.status ?? `http_${response.status}`).toLowerCase().replace(/_/g, '-');
      throw Object.assign(new Error(json.error?.message ?? status), { code: status, details: json.error?.details ?? null });
    }
    // зачем (диагностика): первый сырой ответ синхронизации — в факты квитанции (без токенов).
    if (name === 'accountsV2SyncApply' && facts.rawSyncResponseSample === undefined) facts.rawSyncResponseSample = json.result;
    if (name === 'accountsV2SyncApply' && facts.realmProbe === undefined) {
      const first = (json.result as { receipts?: unknown[] } | undefined)?.receipts?.[0];
      const copied = (localCopy(json.result) as { receipts?: unknown[] } | undefined)?.receipts?.[0];
      facts.realmProbe = {
        parsedProtoIsObject: first !== undefined && Reflect.getPrototypeOf(first as object) === Object.prototype,
        copiedProtoIsObject: copied !== undefined && Reflect.getPrototypeOf(copied as object) === Object.prototype,
      };
    }
    return { data: localCopy(json.result) };
  }

  /** Глубокая копия литералами этого модуля — объекты того же realm, что у клиента V2. */
  function localCopy(value: unknown): unknown {
    if (Array.isArray(value)) {
      // зачем: value.map создал бы массив ЧУЖОГО realm (species исходного массива).
      const out: unknown[] = [];
      for (const item of value) out.push(localCopy(item));
      return out;
    }
    if (typeof value === 'object' && value !== null) {
      const out: Record<string, unknown> = {};
      for (const [key, inner] of Object.entries(value)) out[key] = localCopy(inner);
      return out;
    }
    return value;
  }

  async function ownerGet(docPath: string): Promise<{ status: number; json: Record<string, unknown> }> {
    const response = await fetch(`${docsBase()}/${docPath}`, { headers: { authorization: 'Bearer owner' } });
    return { status: response.status, json: await response.json().catch(() => ({})) as Record<string, unknown> };
  }

  async function ownerPatch(docPath: string, fields: Record<string, unknown>, mask: readonly string[]): Promise<number> {
    const query = mask.map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');
    const response = await fetch(`${docsBase()}/${docPath}?${query}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json', authorization: 'Bearer owner' },
      body: JSON.stringify({ fields }),
    });
    return response.status;
  }

  async function entityCount(uid: string): Promise<number> {
    const { json } = await ownerGet(`accounts_v2/${uid}/accounts_v2_entities?pageSize=300`);
    return Array.isArray(json.documents) ? json.documents.length : 0;
  }

  async function setClientFlag(on: boolean): Promise<boolean> {
    await ownerPatch('remote_config/app', {
      bools: { mapValue: { fields: { accounts_v2_client_enabled: { booleanValue: on } } } },
    }, ['bools.accounts_v2_client_enabled']);
    // зачем: флаг клиента читается ровно из того документа, что пишет «Пульт».
    const { json } = await ownerGet('remote_config/app');
    const bools = (json.fields as Record<string, { mapValue?: { fields?: Record<string, { booleanValue?: boolean }> } }> | undefined)?.bools;
    return bools?.mapValue?.fields?.accounts_v2_client_enabled?.booleanValue === true;
  }

  // «Телефон»: одно хранилище областей и одна защёлка переживают перезапуски контроллера.
  const disk = new MemoryScopeStorageAdapter();
  const secure = new Map<string, string>();
  const latchStore = {
    getItemAsync: async (key: string) => secure.get(key) ?? null,
    setItemAsync: async (key: string, value: string) => { secure.set(key, value); },
    deleteItemAsync: async (key: string) => { secure.delete(key); },
  };
  const session = { uid: null as string | null, idToken: null as string | null, flag: false };
  const sent: { uid: string | null; batch: AccountSyncWireBatch }[] = [];

  function launchApp(): AccountsV2ClientController {
    return createAccountsV2ClientController({
      isEnabled: () => session.flag,
      createStorageAdapter: () => disk,
      latch: createAccountDetachLatch(latchStore),
      callSync: async (batch) => {
        sent.push({ uid: session.uid, batch });
        return callable('accountsV2SyncApply', batch, session.idToken);
      },
      currentAuthUid: () => session.uid,
      newNonce: () => randomBytes(8).toString('hex'),
      setTimer: (run, delayMs) => setTimeout(run, Math.min(delayMs, 2_000)),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    });
  }

  /** Урок + карточка в outbox области uid — как запишет приложение. */
  async function recordStudy(uid: string, label: string): Promise<void> {
    const fence = Object.freeze({ scopeKey: `account:${uid}` as const, uid, generation: 1, nonce: `study-${label}` });
    const store = createAccountScopeStore(disk);
    const handle = await store.open({ kind: 'account', uid, scopeKey: `account:${uid}` }, fence);
    const outbox = createAccountSyncOutbox(handle);
    await outbox.enqueue({
      ownerUid: uid,
      operation: {
        schemaVersion: 1, operationId: `e2e-${label}-lesson-1`, entityType: 'lesson_progress', entityId: `en/lesson/${label}-1`,
        clientSequence: 1, baseRevision: null, payload: { passed: true, score: 87 },
      },
    }, fence);
    await outbox.enqueue({
      ownerUid: uid,
      operation: {
        schemaVersion: 1, operationId: `e2e-${label}-card-1`, entityType: 'flashcard', entityId: `card/${label}-1`,
        clientSequence: 2, baseRevision: 0, payload: { op: 'upsert', fields: { front: `hello ${label}`, back: 'привет' } },
      },
    }, fence);
    await store.close(fence);
  }

  test('seed: 3 local accounts, server flags on in the emulator', async () => {
    expect(seed?.accounts).toHaveLength(3);
    const config = await ownerGet('config/accounts_v2');
    facts.serverFlags = config.json.fields ?? null;
    expect(config.status).toBe(200);
  });

  const labels = ['a', 'b', 'c'];
  labels.forEach((label, index) => {
    test(`account ${label}: flag off → no calls; flag on → synced; restart; sign-out; other account isolated; delete`, async () => {
      const account = seed!.accounts.find((row) => row.label === label)!;
      // зачем: «другой» аккаунт — ещё не удалённый (a удаляется первым, поэтому для c это b).
      const other = seed!.accounts.find((row) => row.label === (index === labels.length - 1 ? labels[index - 1] : labels[index + 1]))!;
      const me = await signIn(account);
      const row: Facts = { uidTag: tag(me.uid) };
      (facts.accounts as Facts)[label] = row;
      session.uid = me.uid;
      session.idToken = me.idToken;

      // 1) Вход при выключенном флаге клиента: ни одного вызова accountsV2SyncApply.
      session.flag = await setClientFlag(false);
      await recordStudy(me.uid, label);
      const sentBefore = sent.length;
      const app1 = launchApp();
      await app1.setAuthUid(me.uid);
      await sleep(1_500);
      row.flagOff = { flagRead: session.flag, calls: sent.length - sentBefore, sessionUidSet: app1.status().uid !== null };
      expect(session.flag).toBe(false);
      expect(sent.length - sentBefore).toBe(0);
      expect(await entityCount(me.uid)).toBe(0);

      // 2) Флаг включён: outbox уходит на сервер, данные в accounts_v2/{uid}.
      session.flag = await setClientFlag(true);
      const startedAt = Date.now();
      const app2 = launchApp();
      await app2.setAuthUid(me.uid);
      const linesBefore = clientLines.length;
      const count = await waitFor(() => entityCount(me.uid), (value) => value >= 2, 30_000);
      // зачем: запись на сервере видна раньше, чем телефон отметил квитанции у себя (ackCommit).
      // Ждём «outbox пуст», иначе «перезапуск» честно переотправил бы пакет (duplicate).
      const drained = await waitFor(async () => clientLines.slice(linesBefore).some((line) => line.includes('[ACCOUNT-V2] drain empty')),
        (value) => value, 15_000);
      const receiptProblems = clientLines.slice(linesBefore).filter((line) => line.includes('receipt_invalid')).length;
      row.flagOn = {
        flagRead: session.flag, calls: sent.length - sentBefore, entitiesInEmulator: count, ms: Date.now() - startedAt,
        status: app2.status(),
      };
      Object.assign(row.flagOn as Facts, { outboxDrained: drained, receiptProblems });
      expect(count).toBe(2);
      expect(drained).toBe(true);
      expect(receiptProblems).toBe(0);
      const myBatch = sent.filter((entry) => entry.uid === me.uid).at(-1)!.batch;

      // 3) «Перезапуск приложения»: новый контроллер, то же хранилище — повторной отправки нет, данные на месте.
      await app2.stop('e2e_restart');
      const sentAtRestart = sent.length;
      const app3 = launchApp();
      await app3.setAuthUid(me.uid);
      await sleep(2_000);
      row.restart = { newCalls: sent.length - sentAtRestart, entitiesInEmulator: await entityCount(me.uid), sessionUid: app3.status().uid === me.uid };
      expect(sent.length - sentAtRestart).toBe(0);
      expect(await entityCount(me.uid)).toBe(2);

      // 4) Выход.
      await app3.setAuthUid(null);
      row.signOut = { sessionUid: app3.status().uid };
      expect(app3.status().uid).toBeNull();

      // 5) Вход другим аккаунтом: доступа к области первого нет ни через callable, ни через Firestore.
      const intruder = await signIn(other);
      const replay = await callable('accountsV2SyncApply', myBatch, intruder.idToken).then(
        () => ({ code: 'accepted', final: null }),
        (error: { code?: string; message?: string; details?: { final?: unknown } }) => ({
          code: error.code, message: error.message, final: error.details?.final ?? null,
        }),
      );
      const directRead = await fetch(`${docsBase()}/accounts_v2/${me.uid}/accounts_v2_entities`, {
        headers: { authorization: `Bearer ${intruder.idToken}` },
      });
      const ownRead = await fetch(`${docsBase()}/accounts_v2/${me.uid}/accounts_v2_entities`, {
        headers: { authorization: `Bearer ${me.idToken}` },
      });
      row.otherAccount = {
        otherTag: tag(intruder.uid), replayOfMyBatch: replay, firestoreReadByOther: directRead.status,
        firestoreReadByOwnerClient: ownRead.status, entitiesAfter: await entityCount(me.uid),
      };
      expect(replay.code).not.toBe('accepted');
      expect(directRead.status).toBe(403);
      expect(ownRead.status).toBe(403);
      expect(await entityCount(me.uid)).toBe(2);

      // 6) Удаление аккаунта: локальная область стирается; сервер принимает постановку с ключом V2.
      const fresh = await signIn(account);
      session.uid = fresh.uid;
      session.idToken = fresh.idToken;
      const app4 = launchApp();
      await app4.setAuthUid(fresh.uid);
      await sleep(500);
      const detach = await app4.beginDeletionDetach(fresh.uid);
      const localLeft = disk.snapshot(`account:${fresh.uid}`).length;
      const v2Credential = await createAccountsV2DeletionCredential((n) => Uint8Array.from(randomBytes(n)));
      const proof = await createAccountsV2DeletionCredential((n) => Uint8Array.from(randomBytes(n)));
      const ack = await callable('accountDeleteEnqueue', {
        stableId: null, operationId: proof.operationId, capability: proof.capability,
        accountsV2Deletion: v2Credential,
      }, fresh.idToken).then((value) => (value as { data: Record<string, unknown> }).data, (error: { code?: string; message?: string }) => ({
        error: error.code, message: error.message,
      }));
      const statusOf = () => callable('accountsV2DeletionStatus', { purpose: 'deletion_status', ...v2Credential, nudge: true }, null).then(
        (value) => (value as { data: Record<string, unknown> }).data,
        (error: { code?: string; message?: string }) => ({ error: error.code, message: error.message }),
      );
      const statusBefore = await statusOf();
      row.deletion = {
        localDetach: detach === null ? null : { outcome: detach.outcome, closed: detach.closed, erase: detach.erase?.outcome ?? null },
        localRecordsLeft: localLeft,
        enqueueAck: { ok: (ack as { ok?: unknown }).ok ?? null, status: (ack as { status?: unknown }).status ?? null,
          authReleased: (ack as { authReleased?: unknown }).authReleased ?? null,
          credentialSafe: (ack as { credentialSafe?: unknown }).credentialSafe ?? null, error: (ack as { error?: unknown }).error ?? null,
          message: (ack as { message?: unknown }).message ?? null },
        statusAfterEnqueue: statusBefore,
      };
      expect(localLeft).toBe(0);

      if ((ack as { ok?: unknown }).ok === true) {
        // 7a) Только эмулятор: «перемотка» 14-дневного окна — срок задачи в прошлое, воркер берёт её сразу.
        const jobId = String((ack as { jobId?: unknown }).jobId ?? '');
        const past = Date.now() - 60_000;
        const patched = await ownerPatch(`account_deletion_jobs/${jobId}`, {
          nextAttemptAtMs: { integerValue: String(past) }, graceDeadlineMs: { integerValue: String(past) },
          retryRequestedAtMs: { integerValue: String(Date.now()) },
        }, ['nextAttemptAtMs', 'graceDeadlineMs', 'retryRequestedAtMs']);
        const purged = await waitFor(() => entityCount(fresh.uid), (value) => value === 0, 90_000);
        const statusAfter = await waitFor(statusOf, (value) => (value as { stage?: unknown }).stage === 'completed', 30_000);
        Object.assign(row.deletion as Facts, { path: 'pipeline', timeTravelPatch: patched, entitiesAfterPurge: purged, receiptStatusAfter: statusAfter });
        expect(purged).toBe(0);
        return;
      }

      // 7b) Обход блокера эмулятора (accountDeleteEnqueue падает в эмуляторе ДО V2-части,
      // см. квитанцию): квитанция V2 выпускается тем же серверным кодом (functions/lib) через
      // Admin SDK ТОЛЬКО на эмулятор, дальше — НАСТОЯЩИЙ callable accountsV2DeletionStatus с
      // ключом телефона: nudge дотирает accounts_v2/{uid}/**, затем квитанция завершается.
      const adminEnv = { ...process.env };
      expect(adminEnv.FIRESTORE_EMULATOR_HOST).toMatch(LOOPBACK);
      /* eslint-disable @typescript-eslint/no-require-imports */
      const admin = require(path.resolve(__dirname, '..', 'functions', 'node_modules', 'firebase-admin'));
      const ports = require(path.resolve(__dirname, '..', 'functions', 'lib', 'functions', 'src', 'accounts_v2_deletion', 'firestore_ports.js'));
      /* eslint-enable @typescript-eslint/no-require-imports */
      const app = admin.apps.find((candidate: { name: string }) => candidate.name === 'e2e')
        ?? admin.initializeApp({ projectId: project }, 'e2e');
      const db = app.firestore();
      const issued = await ports.issueAccountsV2DeletionReceipt(db, fresh.uid, v2Credential);
      const stageIssued = await statusOf();
      const nudged = await waitFor(statusOf, (value) => (value as { stage?: unknown }).stage === 'v2_purged', 30_000);
      const purged = await entityCount(fresh.uid);
      const completed = await ports.completeAccountsV2DeletionReceipt(db, issued.receiptId);
      const stageFinal = await statusOf();
      const wrongKey = await callable('accountsV2DeletionStatus', { purpose: 'deletion_status', ...proof }, null).then(
        (value) => (value as { data: unknown }).data, (error: { code?: string; message?: string }) => ({ error: error.code, message: error.message }),
      );
      Object.assign(row.deletion as Facts, {
        path: 'receipt_direct_emulator_only', issuedStage: issued.stage, statusAfterIssue: stageIssued,
        statusAfterNudge: nudged, entitiesAfterPurge: purged, completeResult: completed ?? null,
        statusFinal: stageFinal, statusWithForeignKey: wrongKey,
      });
      expect(purged).toBe(0);
      expect((stageFinal as { stage?: unknown }).stage).toBe('completed');
    });
  });
});
