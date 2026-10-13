#!/usr/bin/env node
/**
 * Опросы осколков 13.10: выключить 058/072/100 (упоминают удалённые Лигу и Арену) и исправить опечатку в 069.
 *
 * зачем (владелец 13.10 10:45 через координатора): «058/072/100 — ВЫКЛЮЧИТЬ, только флаг включённости, ничего не удалять»;
 * «069 — исправить ru на „в неподходящий момент“ и выровнять переводы».
 * Почему выключаются ДВА флага: в режиме ротации getActiveShardSurvey (functions/src/shard_survey.ts) не смотрит enabled —
 * опрос дня берётся по rotation. С rotation.enabled=false parseRotation даёт null, сервер уходит в обычный подбор, где
 * выключенный опрос отсеивает where('enabled','==',true). Пустого дня нет: показывается другой включённый опрос.
 *
 * Вход — учётка gcloud владельца (ADC), файл ключа не читается.
 *   План:      node scripts/shard_surveys_disable_and_fix_2026-10-13.mjs
 *   Запись:    node scripts/shard_surveys_disable_and_fix_2026-10-13.mjs --write --confirm SHARD_SURVEYS_DISABLE_FIX_2026_10_13
 *   Откат:     … --restore --write --confirm SHARD_SURVEYS_DISABLE_FIX_2026_10_13 (снова включает 058/072/100; текст 069 не трогает)
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const TAG = '[SURVEY-FIX]';
const PROJECT_ID = 'phraseman-ea0b3';
const COLLECTION = 'shard_surveys';
const CONFIRM = 'SHARD_SURVEYS_DISABLE_FIX_2026_10_13';
const DISABLE_IDS = ['survey_preset_058', 'survey_preset_072', 'survey_preset_100'];
const TYPO_ID = 'survey_preset_069';
const TYPO_OPTION_INDEX = 2;
const TYPO_RU_OLD = 'Часто останавливает в подходящий момент';
const TYPO_RU_NEW = 'Часто останавливает в неподходящий момент';
const UPDATED_BY = 'survey_disable_fix_2026_10_13';

const args = process.argv.slice(2);
const write = args.includes('--write');
const restore = args.includes('--restore');
const confirmAt = args.indexOf('--confirm');
const confirmed = confirmAt >= 0 && args[confirmAt + 1] === CONFIRM;
const log = (event, extra = {}) => console.log(`${TAG} ${event} ${JSON.stringify(extra)}`);

if (write && !confirmed) {
  log('refused', { reason: `для записи нужен --confirm ${CONFIRM}` });
  process.exit(2);
}

const draft = JSON.parse(readFileSync(new URL('../docs/phraseman-2.0/shard_survey_translations_draft.json', import.meta.url), 'utf8'));
const typoTranslations = Object.fromEntries(
  Object.entries(draft.presets['69'] ?? {}).map(([lang, t]) => [lang, t?.o?.[TYPO_OPTION_INDEX]]).filter(([, v]) => typeof v === 'string' && v.trim()),
);

function planDisable(id, data) {
  if (!data) return { id, skip: 'документа нет' };
  const before = { enabled: data.enabled ?? null, rotationEnabled: data.rotation?.enabled ?? null };
  const wantEnabled = restore;
  const patch = {};
  if (data.enabled !== wantEnabled) patch.enabled = wantEnabled;
  if (data.rotation && typeof data.rotation === 'object' && data.rotation.enabled !== wantEnabled) patch['rotation.enabled'] = wantEnabled;
  return { id, before, patch, changes: Object.keys(patch).length };
}

function planTypo(data) {
  if (restore) return { id: TYPO_ID, skip: 'режим отката — текст 069 не трогаем' };
  if (!data) return { id: TYPO_ID, skip: 'документа нет' };
  const questions = Array.isArray(data.questions) ? data.questions : [];
  const options = questions[0]?.options;
  if (!Array.isArray(options) || options.length !== 5) return { id: TYPO_ID, skip: `вариантов ${options?.length ?? 'нет'} вместо 5 — опрос правили, пропуск` };
  const label = options[TYPO_OPTION_INDEX]?.label ?? {};
  if (label.ru !== TYPO_RU_OLD && label.ru !== TYPO_RU_NEW) return { id: TYPO_ID, skip: `ru варианта 3 неожиданный: «${label.ru}» — пропуск` };
  const nextLabel = { ...label, ru: TYPO_RU_NEW, ...typoTranslations };
  const diff = Object.keys(nextLabel).filter((lang) => label[lang] !== nextLabel[lang]);
  const nextOptions = options.map((o, i) => (i === TYPO_OPTION_INDEX ? { ...o, label: nextLabel } : o));
  const nextQuestions = [{ ...questions[0], options: nextOptions }, ...questions.slice(1)];
  return { id: TYPO_ID, before: label, diff, patch: diff.length ? { questions: nextQuestions } : {}, changes: diff.length };
}

async function main() {
  log('start', { mode: write ? 'ЗАПИСЬ' : 'план', restore, typoLangsFromDraft: Object.keys(typoTranslations) });
  const require = createRequire(import.meta.url);
  const admin = require('../functions/node_modules/firebase-admin');
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore();
  const refs = [...DISABLE_IDS, TYPO_ID].map((id) => db.collection(COLLECTION).doc(id));
  const snaps = await db.getAll(...refs);
  const byId = Object.fromEntries(snaps.map((s) => [s.id, s.exists ? s.data() : null]));

  const plans = [...DISABLE_IDS.map((id) => planDisable(id, byId[id])), planTypo(byId[TYPO_ID])];
  for (const p of plans) {
    if (p.skip) log('skip', { id: p.id, reason: p.skip });
    else if (p.id === TYPO_ID) log('plan', { id: p.id, changes: p.changes, langs: p.diff, ruBefore: p.before?.ru ?? null });
    else log('plan', { id: p.id, changes: p.changes, before: p.before, patch: p.patch });
  }
  const ready = plans.filter((p) => !p.skip && p.changes > 0);
  log('summary', { documents: plans.length, toWrite: ready.length, skipped: plans.filter((p) => p.skip).length, mode: write ? 'ЗАПИСЬ' : 'план' });
  if (!write) return;

  for (const p of ready) {
    await db.collection(COLLECTION).doc(p.id).update({ ...p.patch, updatedAtMs: Date.now(), updatedBy: UPDATED_BY });
    log('written', { id: p.id, fields: Object.keys(p.patch) });
  }
  // Проверка тем же чтением: что реально лежит после записи.
  const after = await db.getAll(...refs);
  for (const s of after) {
    const x = s.data() ?? {};
    if (s.id === TYPO_ID) log('verify', { id: s.id, option3: x.questions?.[0]?.options?.[TYPO_OPTION_INDEX]?.label ?? null });
    else log('verify', { id: s.id, enabled: x.enabled ?? null, rotationEnabled: x.rotation?.enabled ?? null });
  }
}

main().then(() => process.exit(0)).catch((error) => {
  log('failed', { message: String(error?.message ?? error).slice(0, 300), code: error?.code ?? 'unknown' });
  process.exit(1);
});
