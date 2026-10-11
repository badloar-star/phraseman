#!/usr/bin/env node
/**
 * Включение Шпиля в проде одной командой — то же, что три кнопки админки («Контент Spire» → «Шпиль для игроков»).
 *
 * зачем (владелец 11.10, капсом: «ШПИЛЬ НЕМЕДЛЕННО ОПУБЛИКОВАТЬ!», «КАК Я ДОЛЖЕН ТЕСТИРОВАТЬ»): нажать кнопки в
 * админке долго, а прежнее «включать после выхода сборки» отменено. Скрипт пишет РОВНО то же, что callable'ы, и тем же
 * кодом (импорт из functions/src), без копирования логики:
 *   1) config/spire_v1 = spireBuildConfigDoc({ enabled: true, …текущие настройки }) + admin_log — как adminSpireConfigSet;
 *   2) remote_config/app.bools.spire_tab_enabled = true — как adminPublishRemoteConfig (ревизия +1, история, аудит,
 *      операция идемпотентности);
 *   3) недельные наборы заданий на текущую неделю для всех языков — runSpirePackBuild, как adminSpirePackBuild
 *      (существующие файлы не трогает, force=false);
 *   4) read-back: enabled, флаг вкладки, наборы по языкам.
 * 1.6.x не затронуты: у них нет Шпиля, ключ рубильника им неизвестен.
 *
 * Запуск (из корня, ADC владельца — `gcloud auth application-default login`, ключи не нужны):
 *   npx tsx scripts/spire_enable_prod.mjs            — dry-run: только чтение и план
 *   npx tsx scripts/spire_enable_prod.mjs --apply    — записать
 *   npx tsx scripts/spire_enable_prod.mjs --disable --apply — откат: Шпиль выключен, вкладка скрыта (наборы остаются)
 * Логи: [SPIRE-ENABLE].
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT_ID = 'phraseman-ea0b3';
const STORAGE_BUCKET = 'phraseman-ea0b3.firebasestorage.app';
const LOG = '[SPIRE-ENABLE]';
const ACTOR_UID = 'script:spire_enable_prod';
const ACTOR_ROLE = 'owner';
const REASON = 'владелец: опубликовать Шпиль 11.10 (scripts/spire_enable_prod.mjs)';

const APPLY = process.argv.includes('--apply');
const DISABLE = process.argv.includes('--disable');
const TARGET_ENABLED = !DISABLE;

// Тот же экземпляр firebase-admin, что у модулей функций (functions/node_modules), — иначе их admin.firestore() не
// увидит инициализированное приложение.
const requireFromFunctions = createRequire(path.join(ROOT, 'functions', 'package.json'));
const admin = requireFromFunctions('firebase-admin');
if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID, storageBucket: STORAGE_BUCKET });
}

// Windows: динамический import требует file:// URL, а не путь «C:\…».
const fn = (rel) => pathToFileURL(path.join(ROOT, 'functions', 'src', rel)).href;
const { spireBuildConfigDoc, spireConfigStatus, SPIRE_CONFIG_COLLECTION, SPIRE_CONFIG_DOC_ID } = await import(fn('spire_config_contract.ts'));
const { createAuditRecord } = await import(fn('admin/audit_contract.ts'));
const { mergeRemoteConfigBranches, buildRemoteConfigRequestFingerprint, parseRemoteConfigRequest } = await import(fn('admin_remote_config.ts'));
const { SPIRE_LANGS } = await import(fn('spire_progress_contract.ts'));
const { SPIRE_PACK_MAX_TIER, spirePackPath } = await import(fn('spire_pack_contract.ts'));
const { runSpirePackBuild, spirePackWeekIdAt } = await import(fn('spire_pack_build.ts'));

const db = admin.firestore();
const configRef = db.collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID);
const remoteRef = db.collection('remote_config').doc('app');

async function readState() {
  const [configSnap, remoteSnap] = await Promise.all([configRef.get(), remoteRef.get()]);
  const status = spireConfigStatus(configSnap.exists ? configSnap.data() : null);
  const remote = remoteSnap.exists ? (remoteSnap.data() ?? {}) : {};
  const weekId = spirePackWeekIdAt(Date.now());
  const bucket = admin.storage().bucket();
  const packs = {};
  for (const lang of SPIRE_LANGS) {
    let present = 0;
    for (let tier = 0; tier <= SPIRE_PACK_MAX_TIER; tier += 1) {
      const [exists] = await bucket.file(spirePackPath(lang, tier, weekId)).exists();
      if (exists) present += 1;
    }
    packs[lang] = `${present}/${SPIRE_PACK_MAX_TIER + 1}`;
  }
  return {
    weekId,
    config: { exists: status.exists, valid: status.valid, enabled: status.config.enabled, liveForPlayers: status.liveForPlayers },
    configFull: status.config,
    remote: {
      exists: remoteSnap.exists,
      revision: Number(remote.revision ?? 0),
      spire_tab_enabled: remote?.bools?.spire_tab_enabled ?? null,
    },
    packs,
  };
}

function printState(label, state) {
  console.log(`${LOG} ${label} ${JSON.stringify({ weekId: state.weekId, config: state.config, remote: state.remote, packs: state.packs })}`);
}

async function writeSpireConfig(before) {
  const auditRef = db.collection('admin_log').doc();
  const nowMs = Date.now();
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(configRef);
    const beforeStatus = spireConfigStatus(snap.exists ? snap.data() : null);
    // Настройки (таймер, монеты, жители, защита) — текущие; меняется только enabled, как в кнопке админки.
    const next = spireBuildConfigDoc({
      enabled: TARGET_ENABLED,
      timer: beforeStatus.config.timer,
      coins: beforeStatus.config.coins,
      residents: beforeStatus.config.residents,
      integrity: beforeStatus.config.integrity,
    });
    tx.set(configRef, { ...next, updatedAtMs: nowMs, updatedByUid: ACTOR_UID });
    tx.set(auditRef, createAuditRecord({
      action: 'spire_config_write',
      actorUid: ACTOR_UID,
      role: ACTOR_ROLE,
      entity: { collection: SPIRE_CONFIG_COLLECTION, id: SPIRE_CONFIG_DOC_ID },
      reason: REASON,
      before: { enabled: beforeStatus.config.enabled },
      after: { enabled: next.enabled },
      requestId: auditRef.id,
      timestamp: new Date(nowMs).toISOString(),
    }));
  });
  console.log(`${LOG} config/spire_v1 записан ${JSON.stringify({ enabled: TARGET_ENABLED, wasEnabled: before.config.enabled, auditId: auditRef.id })}`);
}

async function publishTabFlag(before) {
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const input = parseRemoteConfigRequest({
    nextConfig: { bools: { spire_tab_enabled: TARGET_ENABLED } },
    expectedRevision: before.remote.revision,
    idempotencyKey: `spire_enable_prod_${stamp}`,
    reason: `${REASON}: ${TARGET_ENABLED ? 'показать' : 'скрыть'} вкладку`,
    requestId: `spire_enable_prod_req_${stamp}`,
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
  console.log(`${LOG} remote_config/app.bools.spire_tab_enabled=${TARGET_ENABLED} ${JSON.stringify({ revision, auditId: auditRef.id })}`);
}

async function buildPacks(weekId) {
  const result = await runSpirePackBuild({
    weekIds: [weekId],
    langs: [...SPIRE_LANGS],
    force: false,
    requireLive: false,
    trigger: 'admin',
  });
  const outcomes = Array.isArray(result.outcomes) ? result.outcomes : [];
  const summary = {};
  for (const item of outcomes) {
    const key = `${item.lang ?? '?'}:${item.status ?? '?'}`;
    summary[key] = (summary[key] ?? 0) + 1;
  }
  console.log(`${LOG} наборы ${JSON.stringify({ weekId, skipped: result.skipped ?? null, poolReads: result.poolReads, summary, unavailableLangs: result.unavailableLangs })}`);
}

async function main() {
  console.log(`${LOG} режим=${APPLY ? 'APPLY' : 'DRY-RUN'} цель=${TARGET_ENABLED ? 'включить' : 'выключить'} проект=${PROJECT_ID}`);
  const before = await readState();
  printState('до', before);
  const plan = [
    before.config.enabled === TARGET_ENABLED ? 'config/spire_v1: уже как нужно — пропуск' : `config/spire_v1.enabled → ${TARGET_ENABLED}`,
    before.remote.spire_tab_enabled === TARGET_ENABLED ? 'spire_tab_enabled: уже как нужно — пропуск' : `remote_config/app.bools.spire_tab_enabled → ${TARGET_ENABLED} (ревизия ${before.remote.revision} → ${before.remote.revision + 1})`,
    TARGET_ENABLED ? `наборы недели ${before.weekId} для ${SPIRE_LANGS.join(', ')} (существующие файлы не трогаются)` : 'наборы не трогаются',
  ];
  console.log(`${LOG} план:\n  - ${plan.join('\n  - ')}`);
  if (!APPLY) {
    console.log(`${LOG} DRY-RUN: ничего не записано. Для записи — добавьте --apply.`);
    return;
  }
  // Порядок как в OWNER_RELEASE_STEPS §4: сервер → наборы → вкладка (при выключении — наоборот: вкладка → сервер).
  if (TARGET_ENABLED) {
    if (before.config.enabled !== true) await writeSpireConfig(before);
    await buildPacks(before.weekId);
    if (before.remote.spire_tab_enabled !== true) await publishTabFlag(await readState());
  } else {
    if (before.remote.spire_tab_enabled !== false) await publishTabFlag(before);
    if (before.config.enabled !== false) await writeSpireConfig(before);
  }
  const after = await readState();
  printState('после', after);
  const ok = after.config.enabled === TARGET_ENABLED && after.remote.spire_tab_enabled === TARGET_ENABLED;
  console.log(`${LOG} итог: ${ok ? 'OK' : 'НЕ СОШЛОСЬ — смотрите строки выше'}`);
  if (!ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(`${LOG} ОШИБКА: ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exitCode = 1;
});
