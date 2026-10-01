#!/usr/bin/env node
/*
 * Account V2, Пакет 6D (TG-D3DE53F2D345) — сидер ЛОКАЛЬНОГО Firebase Emulator Suite.
 *
 * зачем: проверка «на 3 аккаунтах» без паролей владельца и без прода. Скрипт:
 *   1) создаёт в Auth-эмуляторе 3 тестовых аккаунта (почта на .test, пароль —
 *      случайный); учётки пишутся ТОЛЬКО в scripts/accounts-v2-emulator-seed.local.json
 *      (в .gitignore), в консоль — никогда;
 *   2) ставит флаги ТОЛЬКО в эмуляторе Firestore:
 *      config/accounts_v2 {syncEnabled, deletionPurgeEnabled} и
 *      remote_config/app.bools.accounts_v2_client_enabled.
 *
 * Прод недостижим по построению: обращения идут только по REST на
 * FIREBASE_AUTH_EMULATOR_HOST / FIRESTORE_EMULATOR_HOST (обе переменные
 * обязательны и обязаны указывать на loopback), никаких SDK, ключей и
 * учётных данных Google. Нет переменной / чужой хост → отказ до первого запроса.
 *
 *   FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 FIRESTORE_EMULATOR_HOST=127.0.0.1:8080 \
 *     node scripts/accounts-v2-emulator-seed.mjs --project phraseman-ea0b3 \
 *       [--client-flag on|off] [--server-flag on|off] [--flags-only]
 *
 * Логи — префикс [ACCOUNTS-V2-SEED]; без паролей.
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const LOG = '[ACCOUNTS-V2-SEED]';
const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SEED_LOCAL_FILE = path.join(HERE, 'accounts-v2-emulator-seed.local.json');
export const SEED_ACCOUNT_LABELS = Object.freeze(['a', 'b', 'c']);
const LOOPBACK = new Set(['127.0.0.1', 'localhost', '[::1]', '::1']);
const PROJECT_ID = /^[a-z][a-z0-9-]{4,28}[a-z0-9]$/;

export class SeedRefusedError extends Error {
  constructor(code) {
    super(code);
    this.name = 'SeedRefusedError';
    this.code = code;
  }
}

function loopbackHostPort(raw, name) {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (value.length === 0) throw new SeedRefusedError(`${name}_unset`);
  const match = /^(\[::1\]|[^:]+):(\d{2,5})$/.exec(value);
  if (match === null) throw new SeedRefusedError(`${name}_malformed`);
  if (!LOOPBACK.has(match[1])) throw new SeedRefusedError(`${name}_not_loopback`);
  return `${match[1]}:${match[2]}`;
}

/**
 * Защита от прода. Обе переменные эмуляторов обязательны и только loopback.
 * зачем: без них любая библиотека Firebase пошла бы в настоящий проект.
 */
export function assertEmulatorOnly(env) {
  return Object.freeze({
    authHost: loopbackHostPort(env.FIREBASE_AUTH_EMULATOR_HOST, 'auth_emulator_host'),
    firestoreHost: loopbackHostPort(env.FIRESTORE_EMULATOR_HOST, 'firestore_emulator_host'),
  });
}

export function parseArgs(argv) {
  const options = { project: null, clientFlag: 'on', serverFlag: 'on', flagsOnly: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = () => {
      const value = argv[index + 1];
      index += 1;
      if (value === undefined) throw new SeedRefusedError(`missing_value:${arg}`);
      return value;
    };
    if (arg === '--project') options.project = next();
    else if (arg === '--client-flag') options.clientFlag = next();
    else if (arg === '--server-flag') options.serverFlag = next();
    else if (arg === '--flags-only') options.flagsOnly = true;
    else throw new SeedRefusedError(`unknown_arg:${arg}`);
  }
  if (options.project === null || !PROJECT_ID.test(options.project)) throw new SeedRefusedError('project_invalid');
  for (const flag of [options.clientFlag, options.serverFlag]) {
    if (flag !== 'on' && flag !== 'off') throw new SeedRefusedError('flag_value_invalid');
  }
  return Object.freeze(options);
}

/** Учётки: прежние из .local-файла (повторный запуск идемпотентен), иначе новые. */
export function buildSeedAccounts(existing, randomBytes = crypto.randomBytes) {
  const byLabel = new Map(
    (Array.isArray(existing?.accounts) ? existing.accounts : [])
      .filter((row) => row && typeof row.email === 'string' && typeof row.password === 'string')
      .map((row) => [row.label, row]),
  );
  return SEED_ACCOUNT_LABELS.map((label) => {
    const kept = byLabel.get(label);
    if (kept) return Object.freeze({ label, email: kept.email, password: kept.password });
    return Object.freeze({
      label,
      email: `accounts-v2-e2e-${label}@phraseman.test`,
      password: `e2e-${randomBytes(18).toString('base64url')}`,
    });
  });
}

function readLocal(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    if (error?.code !== 'ENOENT') console.warn(`${LOG} local_file_unreadable kind=${error?.name ?? typeof error}`);
    return null;
  }
}

async function postJson(url, body, headers = {}) {
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => ({}));
  return { status: response.status, json, ms: Date.now() - startedAt };
}

/** Аккаунт в Auth-эмуляторе: создать или (уже есть) войти. Возвращает uid. */
async function ensureAuthAccount(authHost, account) {
  const base = `http://${authHost}/identitytoolkit.googleapis.com/v1`;
  const body = { email: account.email, password: account.password, returnSecureToken: true };
  const created = await postJson(`${base}/accounts:signUp?key=emulator-only`, body);
  if (created.status === 200 && typeof created.json.localId === 'string') {
    console.log(`${LOG} auth created label=${account.label} ms=${created.ms}`);
    return created.json.localId;
  }
  const reason = created.json?.error?.message ?? `http_${created.status}`;
  if (reason !== 'EMAIL_EXISTS') throw new Error(`auth_signup_failed:${reason}`);
  const signedIn = await postJson(`${base}/accounts:signInWithPassword?key=emulator-only`, body);
  if (signedIn.status !== 200 || typeof signedIn.json.localId !== 'string') {
    throw new Error(`auth_signin_failed:${signedIn.json?.error?.message ?? `http_${signedIn.status}`}`);
  }
  console.log(`${LOG} auth existing label=${account.label} ms=${signedIn.ms}`);
  return signedIn.json.localId;
}

/** Слияние полей документа в эмуляторе Firestore (owner-токен эмулятора обходит правила). */
async function patchFirestore(firestoreHost, project, docPath, fieldPaths, fields) {
  const mask = fieldPaths.map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`).join('&');
  const url = `http://${firestoreHost}/v1/projects/${project}/databases/(default)/documents/${docPath}?${mask}`;
  const startedAt = Date.now();
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json', authorization: 'Bearer owner' },
    body: JSON.stringify({ fields }),
  });
  if (!response.ok) throw new Error(`firestore_patch_failed:${docPath}:http_${response.status}`);
  console.log(`${LOG} firestore patched doc=${docPath} fields=${fieldPaths.join(',')} ms=${Date.now() - startedAt}`);
}

export async function seedFlags(hosts, options) {
  const server = options.serverFlag === 'on';
  await patchFirestore(hosts.firestoreHost, options.project, 'config/accounts_v2',
    ['syncEnabled', 'deletionPurgeEnabled'],
    { syncEnabled: { booleanValue: server }, deletionPurgeEnabled: { booleanValue: server } });
  await patchFirestore(hosts.firestoreHost, options.project, 'remote_config/app',
    ['bools.accounts_v2_client_enabled'],
    { bools: { mapValue: { fields: { accounts_v2_client_enabled: { booleanValue: options.clientFlag === 'on' } } } } });
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  // Порядок важен: защита от прода — ДО любого другого действия.
  const hosts = assertEmulatorOnly(env);
  const options = parseArgs(argv);
  console.log(`${LOG} start project=${options.project} auth=${hosts.authHost} firestore=${hosts.firestoreHost} client=${options.clientFlag} server=${options.serverFlag}`);
  if (!options.flagsOnly) {
    const accounts = buildSeedAccounts(readLocal(SEED_LOCAL_FILE));
    const rows = [];
    for (const account of accounts) rows.push({ ...account, uid: await ensureAuthAccount(hosts.authHost, account) });
    fs.writeFileSync(SEED_LOCAL_FILE, `${JSON.stringify({
      note: 'Account V2 6D: ЛОКАЛЬНЫЕ учётки Firebase Auth Emulator. Не коммитить, не реальные аккаунты.',
      project: options.project,
      accounts: rows,
    }, null, 2)}\n`, { mode: 0o600 });
    console.log(`${LOG} accounts written count=${rows.length} file=scripts/${path.basename(SEED_LOCAL_FILE)}`);
  }
  await seedFlags(hosts, options);
  console.log(`${LOG} done`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(`${LOG} failed code=${error?.code ?? error?.message ?? 'unknown'}`);
    process.exitCode = 1;
  });
}
