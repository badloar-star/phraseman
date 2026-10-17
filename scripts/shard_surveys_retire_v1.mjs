#!/usr/bin/env node
/**
 * R116: выключить СТАРЫЕ опросы за осколки (ротация owner-selected-63-v1) в день выхода опросов 2.0 — ничего не удаляя.
 *
 * зачем (владелец 17.10: «убери старые бредовые»; решение в docs/work/tasks/surveys-v2-2026-10-17.md §7 п.4): старый показ
 * «1 опрос в сутки» должен замолчать ровно в день, когда начнут показываться новые. Документы, ответы и статистика
 * (shard_surveys / shard_survey_responses / shard_survey_stats) остаются — их по-прежнему видно в админке.
 *
 * Как выключается (тот же приём, что scripts/shard_surveys_disable_and_fix_2026-10-13.mjs):
 *   getActiveShardSurvey (functions/src/shard_survey.ts) в режиме ротации НЕ смотрит `enabled` — берёт опрос дня по rotation.
 *   С rotation.enabled=false parseRotation даёт null → сервер уходит в обычный подбор where('enabled','==',true) → при
 *   enabled=false у всех ответ «опроса нет». Поэтому выключаются ОБА флага у каждого документа. Деплой функций не нужен.
 *   Клиент кэширует «опроса нет» 6 часов (app/home_survey_entry.ts) — строка на Главной исчезнет в течение 6 ч.
 *
 * Вход — учётка gcloud владельца (ADC), файл ключа не читается.
 *   План (только чтение):  node scripts/shard_surveys_retire_v1.mjs
 *   Запись:                node scripts/shard_surveys_retire_v1.mjs --write --confirm SHARD_SURVEYS_RETIRE_V1
 *   Откат:                 node scripts/shard_surveys_retire_v1.mjs --restore <checkpoint.json> --write --confirm SHARD_SURVEYS_RETIRE_V1
 * Перед записью сохраняется контрольная точка с прежними флагами каждого документа — откат возвращает ровно их.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const TAG = '[SURVEY-RETIRE]';
const PROJECT_ID = 'phraseman-ea0b3';
const COLLECTION = 'shard_surveys';
const CONFIRM = 'SHARD_SURVEYS_RETIRE_V1';
const UPDATED_BY = 'surveys_v2_retire_v1';

const args = process.argv.slice(2);
const write = args.includes('--write');
const restoreAt = args.indexOf('--restore');
const restoreFile = restoreAt >= 0 ? args[restoreAt + 1] : null;
const confirmAt = args.indexOf('--confirm');
const confirmed = confirmAt >= 0 && args[confirmAt + 1] === CONFIRM;
const log = (event, extra = {}) => console.log(`${TAG} ${event} ${JSON.stringify(extra)}`);

/** План одного документа: какие флаги поменять (чистая функция). */
export function planRetire(id, data) {
  const before = { enabled: data?.enabled === true, rotationEnabled: data?.rotation?.enabled === true };
  const patch = {};
  if (before.enabled) patch.enabled = false;
  if (data?.rotation && typeof data.rotation === 'object' && before.rotationEnabled) patch['rotation.enabled'] = false;
  return { id, before, patch, changes: Object.keys(patch).length };
}

export function planRestore(id, data, saved) {
  const patch = {};
  if (saved.enabled !== (data?.enabled === true)) patch.enabled = saved.enabled;
  if (data?.rotation && typeof data.rotation === 'object' && saved.rotationEnabled !== (data.rotation.enabled === true)) patch['rotation.enabled'] = saved.rotationEnabled;
  return { id, before: { enabled: data?.enabled === true, rotationEnabled: data?.rotation?.enabled === true }, patch, changes: Object.keys(patch).length };
}

async function main() {
  if (write && !confirmed) { log('refused', { reason: `для записи нужен --confirm ${CONFIRM}` }); process.exit(2); }
  if (restoreAt >= 0 && !restoreFile) { log('refused', { reason: 'нужен путь к контрольной точке после --restore' }); process.exit(2); }
  log('start', { mode: write ? 'ЗАПИСЬ' : 'план', restore: Boolean(restoreFile) });
  const require = createRequire(import.meta.url);
  const admin = require('../functions/node_modules/firebase-admin');
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore();

  const snap = await db.collection(COLLECTION).select('enabled', 'rotation').get();
  log('read', { docs: snap.size });
  const saved = restoreFile ? JSON.parse(readFileSync(restoreFile, 'utf8')).before : null;
  const plans = snap.docs.map((doc) => (saved
    ? (saved[doc.id] ? planRestore(doc.id, doc.data(), saved[doc.id]) : { id: doc.id, skip: 'нет в контрольной точке' })
    : planRetire(doc.id, doc.data())));
  for (const p of plans) {
    if (p.skip) log('skip', { id: p.id, reason: p.skip });
    else if (p.changes > 0) log('plan', { id: p.id, before: p.before, patch: p.patch });
  }
  const ready = plans.filter((p) => !p.skip && p.changes > 0);
  const stillLive = plans.filter((p) => !p.skip && (p.before.enabled || p.before.rotationEnabled)).length;
  log('summary', { documents: plans.length, live: stillLive, toWrite: ready.length, mode: write ? 'ЗАПИСЬ' : 'план' });
  if (!write || ready.length === 0) { if (!write) log('dry_run_only', { hint: `запись: --write --confirm ${CONFIRM}` }); return; }

  if (!saved) {
    const dir = new URL('../.codex-tmp/survey-retire/', import.meta.url);
    mkdirSync(dir, { recursive: true });
    const file = new URL(`checkpoint-${Date.now()}.json`, dir);
    writeFileSync(file, JSON.stringify({ createdAt: new Date().toISOString(), before: Object.fromEntries(plans.filter((p) => !p.skip).map((p) => [p.id, p.before])) }, null, 2));
    log('checkpoint', { file: file.pathname });
  }
  const nowMs = Date.now();
  for (let i = 0; i < ready.length; i += 400) {
    const batch = db.batch();
    for (const p of ready.slice(i, i + 400)) batch.update(db.collection(COLLECTION).doc(p.id), { ...p.patch, updatedAtMs: nowMs, updatedBy: UPDATED_BY });
    await batch.commit();
    log('written', { from: i, count: Math.min(400, ready.length - i) });
  }
  log('done', { written: ready.length });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch((error) => { console.error(`${TAG} failed ${String(error?.message || error)}`); process.exit(1); });
}
