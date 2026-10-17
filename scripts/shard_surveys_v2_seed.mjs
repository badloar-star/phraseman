#!/usr/bin/env node
/**
 * R116: завести опросы 2.0 в существующий формат shard_surveys — БЕЗ новой сборки приложения.
 *
 * зачем (владелец 17.10: «убери старые бредовые… дай реально полезные»; координатор 23:13): клиент сегодня (и стор 1.6.24)
 * показывает опрос из нескольких вопросов только с одиночным выбором (components/survey/SurveySheetModal.tsx), а сервер без
 * деплоя — не больше 1 опроса в сутки. Поэтому: 13 опросов по 1–3 вопроса, 36 вопросов, мультивыбор/шкала/NPS переделаны
 * в 5 строк одиночного выбора. Тексты — docs/work/tasks/surveys-v2-content.json (ru/en здесь, 7 языков — Переводчик).
 *
 * Как сервер их покажет (functions/src/shard_survey.ts getActiveShardSurvey): после retire (scripts/shard_surveys_retire_v1.mjs)
 * ротация выключена → обычный режим: enabled=true, аудитория, кулдаун 1 день, полный перевод на язык человека, неотвеченный;
 * из подходящих берётся самый свежий по updatedAtMs. Поэтому updatedAtMs выставляется по убыванию: survey_v2_01 — первый.
 * Опрос без полного перевода на все 9 языков сервер не показывает — скрипт такой опрос не пишет вовсе.
 *
 * Проверка — тем же кодом, что у сервера: parseSurveyConfig / validateSurveyConfigForWrite / missingSurveyLocaleKeys из
 * functions/lib (сборка functions). Вход — учётка gcloud владельца (ADC).
 *   План (только чтение):  node scripts/shard_surveys_v2_seed.mjs
 *   Запись:                node scripts/shard_surveys_v2_seed.mjs --write --confirm SHARD_SURVEYS_V2_SEED
 *   Откат:                 node scripts/shard_surveys_v2_seed.mjs --restore <checkpoint.json> --write --confirm SHARD_SURVEYS_V2_SEED
 * Откат не удаляет: заведённые опросы выключаются (enabled=false), прежние документы с теми же id возвращаются как были.
 * Порядок утром: этот скрипт --write, затем retire --write (иначе между ними день без опросов не случится, но и дубля не будет:
 * пока ротация жива, сервер показывает опрос ротации и в обычный режим не уходит).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const TAG = '[SURVEY-V2-SEED]';
const PROJECT_ID = 'phraseman-ea0b3';
const COLLECTION = 'shard_surveys';
const CONFIRM = 'SHARD_SURVEYS_V2_SEED';
const UPDATED_BY = 'surveys_v2_seed_v1';
const LANGS = ['ru', 'en', 'uk', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'];

const args = process.argv.slice(2);
const write = args.includes('--write');
const restoreAt = args.indexOf('--restore');
const restoreFile = restoreAt >= 0 ? args[restoreAt + 1] : null;
const confirmAt = args.indexOf('--confirm');
const confirmed = confirmAt >= 0 && args[confirmAt + 1] === CONFIRM;
const log = (event, extra = {}) => console.log(`${TAG} ${event} ${JSON.stringify(extra)}`);

const loc = (obj, vars = {}) => Object.fromEntries(LANGS.map((l) => [l, String(obj?.[l] ?? '').replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''))]).filter(([, v]) => v.trim()));

/** Документ shard_surveys из записи файла контента (чистая функция). */
export function buildSurveyDoc(content, survey, index, nowMs) {
  const n = survey.questions.length;
  const subtitle = n === 1 ? loc(content.common.subtitle_1) : loc(content.common.subtitle_n, { n });
  return {
    surveyId: survey.id,
    enabled: true,
    title: loc(survey.title),
    subtitle,
    // Выплаты за опросы сейчас нет (PM-058, SURVEY_SHARD_AMOUNT = 0) — поле обязательно 1..20 для валидации.
    rewardShards: 1,
    minDaysBetweenSurveys: 1,
    audience: { tier: survey.tier, minLessons: null, maxLessons: null, platforms: [] },
    rotation: null,
    questions: survey.questions.map((q) => ({
      id: q.id,
      type: 'single_choice',
      text: loc(q.text),
      options: q.options.map((o) => ({ id: o.id, label: loc(o.label) })),
    })),
    accentColor: '',
    finalScreen: { title: loc(content.common.final_title), subtitle: loc(content.common.final_subtitle) },
    createdAtMs: nowMs,
    // самый свежий показывается первым: 01 — максимальный updatedAtMs
    updatedAtMs: nowMs + (1000 - index),
    updatedBy: UPDATED_BY,
    librarySource: 'surveys_v2_2026_10_17',
  };
}

async function main() {
  if (write && !confirmed) { log('refused', { reason: `для записи нужен --confirm ${CONFIRM}` }); process.exit(2); }
  if (restoreAt >= 0 && !restoreFile) { log('refused', { reason: 'нужен путь к контрольной точке после --restore' }); process.exit(2); }
  const require = createRequire(import.meta.url);
  const core = require('../functions/lib/functions/src/shard_survey_core.js');
  const content = JSON.parse(readFileSync(new URL('../docs/work/tasks/surveys-v2-content.json', import.meta.url), 'utf8'));
  const nowMs = Date.now();
  log('start', { mode: write ? 'ЗАПИСЬ' : 'план', restore: Boolean(restoreFile), surveys: content.surveys.length });

  const plans = content.surveys.map((survey, index) => {
    const doc = buildSurveyDoc(content, survey, index, nowMs);
    const errors = core.validateSurveyConfigForWrite(doc);
    const parsed = core.parseSurveyConfig(doc);
    const missing = Object.fromEntries(LANGS.map((l) => [l, parsed ? core.missingSurveyLocaleKeys(parsed, l).length : -1]).filter(([, c]) => c !== 0));
    const ready = errors.length === 0 && parsed !== null && Object.keys(missing).length === 0;
    return { id: survey.id, doc, errors, parsedOk: parsed !== null, questions: survey.questions.length, tier: survey.tier, missing, ready };
  });
  for (const p of plans) log('check', { id: p.id, questions: p.questions, tier: p.tier, errors: p.errors, parsedOk: p.parsedOk, missingByLang: p.missing, ready: p.ready });
  const notReady = plans.filter((p) => !p.ready);
  log('summary', { surveys: plans.length, questions: plans.reduce((s, p) => s + p.questions, 0), ready: plans.length - notReady.length, notReady: notReady.map((p) => p.id) });

  if (!write) { log('dry_run_only', { hint: `запись: --write --confirm ${CONFIRM}` }); }
  const admin = require('../functions/node_modules/firebase-admin');
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore();
  const refs = plans.map((p) => db.collection(COLLECTION).doc(p.id));
  const snaps = await db.getAll(...refs);
  const existing = Object.fromEntries(snaps.map((s) => [s.id, s.exists ? s.data() : null]));
  log('read', { docs: snaps.length, existing: Object.values(existing).filter(Boolean).length });

  if (restoreFile) {
    const saved = JSON.parse(readFileSync(restoreFile, 'utf8')).before;
    if (!write) { log('restore_plan', { docs: Object.keys(saved).length }); return; }
    const batch = db.batch();
    for (const [id, before] of Object.entries(saved)) {
      const ref = db.collection(COLLECTION).doc(id);
      if (before) batch.set(ref, before); else batch.update(ref, { enabled: false, updatedAtMs: Date.now(), updatedBy: `${UPDATED_BY}_restore` });
    }
    await batch.commit();
    log('restored', { docs: Object.keys(saved).length });
    return;
  }
  if (!write) return;
  if (notReady.length) { log('refused', { reason: 'есть опросы без полного перевода или с ошибками — ничего не пишу', notReady: notReady.map((p) => p.id) }); process.exit(3); }

  const dir = new URL('../.codex-tmp/survey-v2-seed/', import.meta.url);
  mkdirSync(dir, { recursive: true });
  const file = new URL(`checkpoint-${nowMs}.json`, dir);
  writeFileSync(file, JSON.stringify({ createdAt: new Date(nowMs).toISOString(), before: existing }, null, 2));
  log('checkpoint', { file: file.pathname });
  const batch = db.batch();
  for (const p of plans) batch.set(db.collection(COLLECTION).doc(p.id), p.doc);
  await batch.commit();
  log('done', { written: plans.length });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch((error) => { console.error(`${TAG} failed ${String(error?.message || error)}`); process.exit(1); });
}
