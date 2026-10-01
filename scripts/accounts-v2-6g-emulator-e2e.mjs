#!/usr/bin/env node
/*
 * Account V2, Пакет 6G (TG-4CAC183BF512) — серверный E2E переноса при первом
 * входе (accountsV2MigrateMine) и гидрации (accountsV2PullMine) на ЛОКАЛЬНОМ
 * Firebase Emulator Suite.
 *
 * зачем: проверить настоящие callable (собранные functions/lib) с настоящими
 * токенами Auth-эмулятора: флаг выкл = отказ; первый вход переносит старые
 * данные (users/{stableId} через auth_links); повтор не дублирует; потеря
 * отметки → только duplicate; чужой аккаунт видит только своё; hold не пишет V2.
 *
 * Прод недостижим: те же ворота, что у сидера (assertEmulatorOnly — только
 * loopback FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST), functions —
 * только 127.0.0.1:5001. Учётки — из scripts/accounts-v2-emulator-seed.local.json
 * (gitignored, их создаёт accounts-v2-emulator-seed.mjs). В логах — метки a/b и
 * усечённый sha256 uid, без почты/пароля.
 *
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     node scripts/accounts-v2-6g-emulator-e2e.mjs --project phraseman-ea0b3 [--seed-only]
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import { SEED_LOCAL_FILE, assertEmulatorOnly } from './accounts-v2-emulator-seed.mjs';

const LOG = '[ACCOUNTS-V2-6G-E2E]';
const FUNCTIONS_HOST = '127.0.0.1:5001';
const REGION = 'us-central1';
const STABLE_A = 'stable-6g-e2e-a';

const tag = (uid) => crypto.createHash('sha256').update(uid).digest('hex').slice(0, 10);
const results = [];

function check(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${LOG} ${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` | ${detail}` : ''}`);
}

function card(id) {
  return { id, en: `phrase ${id}`, ru: `фраза ${id}`, uk: `фраза ${id}`, source: 'lesson', addedAt: 1_700_000_000_000 };
}

/** Старые данные в формате users/{id}.progress (строки AsyncStorage, как пишет приложение). */
export function legacyProgress(nowMs) {
  return {
    lesson1_best_score: '4.5',
    lesson2_best_score: '5',
    lesson3_best_score: '2',
    flashcards_v1: JSON.stringify([card('c1'), card('c2'), card('c3')]),
    community_owned_pack_ids_v1: JSON.stringify(['pack-6g-a', 'pack-6g-b']),
    flashcards_swipe_memory_v1: JSON.stringify({ 'saved:all:c1': { correct: 2, seen: 3, lastSeenAt: nowMs - 86_400_000, nextDueAt: nowMs } }),
  };
}

function toFirestore(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  if (typeof value === 'string') return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestore) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toFirestore(item)])) } };
}

async function firestore(hosts, project, method, docPath, body) {
  const url = `http://${hosts.firestoreHost}/v1/projects/${project}/databases/(default)/documents/${docPath}`;
  const response = await fetch(url, {
    method, headers: { 'content-type': 'application/json', authorization: 'Bearer owner' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json };
}

async function putDoc(hosts, project, docPath, data) {
  const result = await firestore(hosts, project, 'PATCH', docPath, { fields: toFirestore(data).mapValue.fields });
  if (result.status !== 200) throw new Error(`firestore_put_failed:${docPath}:http_${result.status}`);
}

async function listCount(hosts, project, collectionPath) {
  let count = 0;
  let pageToken = '';
  do {
    const result = await firestore(hosts, project, 'GET', `${collectionPath}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ''}`);
    if (result.status === 404) return 0;
    count += (result.json.documents ?? []).length;
    pageToken = result.json.nextPageToken ?? '';
  } while (pageToken);
  return count;
}

async function signIn(hosts, account) {
  const response = await fetch(`http://${hosts.authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator-only`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: account.email, password: account.password, returnSecureToken: true }),
  });
  const json = await response.json();
  if (typeof json.idToken !== 'string') throw new Error(`sign_in_failed:${account.label}`);
  return { uid: json.localId, idToken: json.idToken };
}

async function call(project, name, idToken, data) {
  const startedAt = Date.now();
  const response = await fetch(`http://${FUNCTIONS_HOST}/${project}/${REGION}/${name}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(idToken ? { authorization: `Bearer ${idToken}` } : {}) },
    body: JSON.stringify({ data }),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: json.result !== undefined, result: json.result, error: json.error, ms: Date.now() - startedAt };
}

async function pullAll(project, idToken) {
  const entities = [];
  let cursor = null;
  let pages = 0;
  do {
    const page = await call(project, 'accountsV2PullMine', idToken, { cursor, limit: 2 });
    if (!page.ok) throw new Error(`pull_failed:${page.error?.message}`);
    entities.push(...page.result.entities);
    cursor = page.result.nextCursor;
    pages += 1;
  } while (cursor !== null && pages < 100);
  return { entities, pages };
}

async function setServerFlag(hosts, project, on) {
  await firestore(hosts, project, 'PATCH', 'config/accounts_v2?updateMask.fieldPaths=syncEnabled', {
    fields: { syncEnabled: { booleanValue: on } },
  });
}

async function main(argv = process.argv.slice(2), env = process.env) {
  const hosts = assertEmulatorOnly(env);
  const project = argv[argv.indexOf('--project') + 1];
  if (!/^[a-z][a-z0-9-]{4,28}[a-z0-9]$/.test(project ?? '')) throw new Error('project_invalid');
  const seed = JSON.parse(fs.readFileSync(SEED_LOCAL_FILE, 'utf8'));
  const byLabel = new Map(seed.accounts.map((row) => [row.label, row]));
  const a = await signIn(hosts, byLabel.get('a'));
  const b = await signIn(hosts, byLabel.get('b'));
  console.log(`${LOG} accounts a=${tag(a.uid)} b=${tag(b.uid)}`);
  const nowMs = Date.now();
  // Старые данные: a — под stableId (auth_links), b — скрытая личность (HOLD).
  await putDoc(hosts, project, `users/${STABLE_A}`, { canonicalStableId: STABLE_A, progress: legacyProgress(nowMs) });
  await putDoc(hosts, project, `auth_links/${a.uid}`, { stable_id: STABLE_A });
  await putDoc(hosts, project, `users/${b.uid}`, { identityHidden: true, progress: legacyProgress(nowMs) });
  console.log(`${LOG} legacy seeded a=users/<stable> (auth_links) b=users/<uid> identityHidden`);
  if (argv.includes('--seed-only')) return;

  const entitiesA = `accounts_v2/${a.uid}/accounts_v2_entities`;
  const entitiesB = `accounts_v2/${b.uid}/accounts_v2_entities`;
  const opsA = `accounts_v2/${a.uid}/accounts_v2_ops`;

  await setServerFlag(hosts, project, false);
  // кэш флага инстанса функций — до 5 мин; свежий эмулятор читает флаг при первом вызове.
  const off = await call(project, 'accountsV2MigrateMine', a.idToken, {});
  check('flag OFF → accounts_v2_disabled, V2 empty', !off.ok && off.error?.message === 'accounts_v2_disabled'
    && await listCount(hosts, project, entitiesA) === 0, `error=${off.error?.message}`);

  await setServerFlag(hosts, project, true);
  console.log(`${LOG} waiting for the functions flag cache (5 min) …`);
  await new Promise((resolve) => setTimeout(resolve, 5 * 60_000 + 5_000));

  const noAuth = await call(project, 'accountsV2MigrateMine', null, {});
  check('no auth → unauthenticated', !noAuth.ok && noAuth.error?.status === 'UNAUTHENTICATED', `status=${noAuth.error?.status}`);

  const first = await call(project, 'accountsV2MigrateMine', a.idToken, {});
  const countAfterFirst = await listCount(hosts, project, entitiesA);
  const opsAfterFirst = await listCount(hosts, project, opsA);
  check('a first login → migration done (legacy under stableId via auth_links)',
    first.ok && first.result.status === 'done' && first.result.legacyFound === true && first.result.outcomes.applied === first.result.operations,
    `status=${first.result?.status} ops=${first.result?.operations} applied=${first.result?.outcomes?.applied} ms=${first.ms} entities=${countAfterFirst}`);
  check('a V2 entities = 3 lessons + 3 cards + library', countAfterFirst === 7, `entities=${countAfterFirst}`);
  const meta = await firestore(hosts, project, 'GET', `accounts_v2/${a.uid}/accounts_v2_meta/migration`);
  check('a migration mark done', meta.json.fields?.status?.stringValue === 'done', `status=${meta.json.fields?.status?.stringValue}`);

  const again = await call(project, 'accountsV2MigrateMine', a.idToken, {});
  check('a second login → already_done, no new entities/receipts',
    again.ok && again.result.status === 'already_done' && await listCount(hosts, project, entitiesA) === countAfterFirst
    && await listCount(hosts, project, opsA) === opsAfterFirst, `status=${again.result?.status} error=${again.error?.message ?? 'none'} ms=${again.ms}`);

  const pulled = await pullAll(project, a.idToken);
  const ids = pulled.entities.map((entity) => entity.entityId).sort();
  check('a "new install" pull → all own entities, paged', pulled.entities.length === countAfterFirst && pulled.pages >= 4,
    `pages=${pulled.pages} ids=${ids.join(',')}`);
  const c1 = pulled.entities.find((entity) => entity.entityId === 'en:saved:c1');
  check('a SRS carried with edit time', c1?.state?.fields?.srs?.value?.updatedAtMs === nowMs - 86_400_000, `srs=${JSON.stringify(c1?.state?.fields?.srs?.value ?? null)}`);
  const lesson2 = pulled.entities.find((entity) => entity.entityId === 'en:lesson:2');
  check('a lesson best carried', lesson2?.state?.best?.score === 5 && lesson2?.state?.best?.passed === true, JSON.stringify(lesson2?.state ?? null));

  // Отметка потеряна (ручная чистка/сбой записи) → повтор = только duplicate.
  await firestore(hosts, project, 'DELETE', `accounts_v2/${a.uid}/accounts_v2_meta/migration`);
  const rerun = await call(project, 'accountsV2MigrateMine', a.idToken, {});
  check('a mark lost → rerun gives only duplicates, entities unchanged',
    rerun.ok && rerun.result.status === 'done' && rerun.result.outcomes.applied === 0
    && rerun.result.outcomes.duplicate === first.result.operations && await listCount(hosts, project, entitiesA) === countAfterFirst,
    `outcomes=${JSON.stringify(rerun.result?.outcomes ?? null)}`);

  const hold = await call(project, 'accountsV2MigrateMine', b.idToken, {});
  check('b hidden identity → hold, V2 not written', hold.ok && hold.result.status === 'hold'
    && hold.result.holdReasons.includes('identity_hidden') && await listCount(hosts, project, entitiesB) === 0,
    `status=${hold.result?.status} reasons=${hold.result?.holdReasons?.join('|')}`);
  const pullB = await pullAll(project, b.idToken);
  check('b pull sees nothing of a', pullB.entities.length === 0, `entities=${pullB.entities.length}`);

  const failed = results.filter((row) => !row.ok).length;
  console.log(`${LOG} summary pass=${results.length - failed} fail=${failed}`);
  process.exitCode = failed === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error(`${LOG} failed code=${error?.code ?? error?.message ?? 'unknown'}`);
  process.exitCode = 1;
});
