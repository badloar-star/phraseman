#!/usr/bin/env node
/**
 * Включение «Историй» всем игрокам одной командой: remote_config/app.bools.stories_v1.
 *
 * зачем (владелец 11.11: «Включить всем сейчас», затем «Включи скриптом»): выключателя для этого ключа в админке нет,
 * а править документ руками в консоли — значит обойти ревизию и журнал. Скрипт пишет РОВНО то же, что серверная
 * публикация настройки (adminPublishRemoteConfig), и тем же кодом (импорт из functions/src), без копирования логики:
 * ревизия +1, история, аудит, операция идемпотентности. Меняется один булев ключ, остальные ветки не трогаются.
 * Образец — scripts/spire_enable_prod.mjs (шаг публикации флага вкладки).
 *
 * Запуск (из корня, ADC владельца — `gcloud auth application-default login`, ключи не нужны):
 *   npx tsx scripts/stories_enable_prod.mjs                    — dry-run: только чтение и план
 *   npx tsx scripts/stories_enable_prod.mjs --apply            — записать
 *   npx tsx scripts/stories_enable_prod.mjs --disable --apply  — откат: истории снова скрыты
 * Логи: [STORIES-ENABLE].
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ID = 'phraseman-ea0b3';
const LOG = '[STORIES-ENABLE]';
const FLAG_KEY = 'stories_v1';
const ACTOR_UID = 'script:stories_enable_prod';
const ACTOR_ROLE = 'owner';
const REASON = 'владелец 11.11: включить истории всем (scripts/stories_enable_prod.mjs)';

const APPLY = process.argv.includes('--apply');
const TARGET_ENABLED = !process.argv.includes('--disable');

// Тот же экземпляр firebase-admin, что у модулей функций (functions/node_modules).
const requireFromFunctions = createRequire(path.join(ROOT, 'functions', 'package.json'));
const admin = requireFromFunctions('firebase-admin');
if (admin.apps.length === 0) admin.initializeApp({ projectId: PROJECT_ID });

// Windows: динамический import требует file:// URL, а не путь «C:\…».
const fn = (rel) => pathToFileURL(path.join(ROOT, 'functions', 'src', rel)).href;
const { createAuditRecord } = await import(fn('admin/audit_contract.ts'));
const { mergeRemoteConfigBranches, buildRemoteConfigRequestFingerprint, parseRemoteConfigRequest } = await import(fn('admin_remote_config.ts'));

const db = admin.firestore();
const remoteRef = db.collection('remote_config').doc('app');

async function readState() {
  const snap = await remoteRef.get();
  const remote = snap.exists ? (snap.data() ?? {}) : {};
  return { exists: snap.exists, revision: Number(remote.revision ?? 0), value: remote?.bools?.[FLAG_KEY] ?? null };
}

async function publishFlag(before) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const input = parseRemoteConfigRequest({
    nextConfig: { bools: { [FLAG_KEY]: TARGET_ENABLED } },
    expectedRevision: before.revision,
    idempotencyKey: `stories_enable_prod_${stamp}`,
    reason: `${REASON}: ${TARGET_ENABLED ? 'показать' : 'скрыть'}`,
    requestId: `stories_enable_prod_req_${stamp}`,
  });
  const operationRef = db.collection('admin_command_operations').doc(input.idempotencyKey);
  const auditRef = db.collection('admin_log').doc();
  const historyRef = db.collection('remote_config_history').doc();
  const now = new Date().toISOString();
  const requestFingerprint = buildRemoteConfigRequestFingerprint(input);
  const revision = await db.runTransaction(async (tx) => {
    const [configSnap, operationSnap] = await Promise.all([tx.get(remoteRef), tx.get(operationRef)]);
    if (operationSnap.exists) throw new Error('idempotency_key_collision');
    const current = configSnap.data() ?? {};
    const currentRevision = Number(current.revision ?? 0);
    // зачем: между чтением и записью настройку мог опубликовать кто-то ещё — чужую публикацию не затираем.
    if (!Number.isInteger(currentRevision) || currentRevision !== input.expectedRevision) {
      throw new Error(`remote_config changed (revision ${currentRevision} != ${input.expectedRevision}) — перезапустите`);
    }
    const after = { ...mergeRemoteConfigBranches(current, input.nextConfig), revision: currentRevision + 1, updatedBy: ACTOR_UID };
    const audit = createAuditRecord({
      action: 'remote_config.publish',
      actorUid: ACTOR_UID,
      role: ACTOR_ROLE,
      entity: { collection: 'remote_config', id: 'app' },
      reason: input.reason,
      before: current,
      after,
      rollbackReference: historyRef.id,
      requestId: input.requestId,
      timestamp: now,
    });
    tx.set(remoteRef, { ...after, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.create(historyRef, { ...audit, operationId: input.idempotencyKey, revision: currentRevision + 1 });
    tx.create(auditRef, { ...audit, operationId: input.idempotencyKey });
    tx.create(operationRef, {
      operationId: input.idempotencyKey,
      requestFingerprint,
      actorUid: ACTOR_UID,
      auditId: auditRef.id,
      revision: currentRevision + 1,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return currentRevision + 1;
  });
  console.log(`${LOG} remote_config/app.bools.${FLAG_KEY}=${TARGET_ENABLED} ${JSON.stringify({ revision, auditId: auditRef.id })}`);
}

async function main() {
  console.log(`${LOG} режим=${APPLY ? 'APPLY' : 'DRY-RUN'} цель=${TARGET_ENABLED ? 'включить' : 'выключить'} проект=${PROJECT_ID}`);
  const before = await readState();
  console.log(`${LOG} до ${JSON.stringify(before)}`);
  if (!before.exists) {
    // зачем: документа настройки нет — это не «флаг выключен», а чужая поломка; создавать его с нуля скрипт не вправе.
    console.error(`${LOG} СТОП: документа remote_config/app нет — ничего не записано.`);
    process.exitCode = 1;
    return;
  }
  if (before.value === TARGET_ENABLED) {
    console.log(`${LOG} уже как нужно (${FLAG_KEY}=${String(before.value)}) — запись не требуется.`);
    return;
  }
  console.log(`${LOG} план: remote_config/app.bools.${FLAG_KEY} ${String(before.value)} → ${TARGET_ENABLED} (ревизия ${before.revision} → ${before.revision + 1})`);
  if (!APPLY) {
    console.log(`${LOG} DRY-RUN: ничего не записано. Для записи — добавьте --apply.`);
    return;
  }
  await publishFlag(before);
  const after = await readState();
  console.log(`${LOG} после ${JSON.stringify(after)}`);
  const ok = after.value === TARGET_ENABLED;
  console.log(`${LOG} итог: ${ok ? 'OK' : 'НЕ СОШЛОСЬ — смотрите строки выше'}`);
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`${LOG} ОШИБКА: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});
