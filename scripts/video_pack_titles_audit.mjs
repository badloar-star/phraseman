#!/usr/bin/env node
/**
 * Наборы из видео без нормального названия — ТОЛЬКО ЧТЕНИЕ (R110, владелец 17.10).
 *
 * зачем: владелец хочет, чтобы у каждого набора из видео было короткое живое название (2–3 слова), а не имя файла
 * документа («Английский по-человечески — 500 фраз»). Новые наборы получают его в админке (adminSuggestVideoPackTitle).
 * Для старых — этот список: утром владелец решает, прогонять ли по ним генерацию. Скрипт ничего не пишет.
 *
 * Читает community_packs с id «video_*» (диапазон по id, без выкачивания всей коллекции) и для каждого решает,
 * нормальное ли название. Причины «ненормального» печатаются по каждому набору.
 * Вход — учётка gcloud владельца (ADC), файл ключа не читается.
 *   node scripts/video_pack_titles_audit.mjs            → таблица
 *   node scripts/video_pack_titles_audit.mjs --json     → JSON (для отчёта)
 */
import { createRequire } from 'node:module';

const TAG = '[VIDEO-PACK-TITLE]';
const PROJECT_ID = 'phraseman-ea0b3';
const MAX_WORDS = 4;
const MAX_CHARS = 40;
const PLACEHOLDERS = new Set(['фразы из видео', 'документ', 'untitled', 'без названия']);
const LOCALES = ['titleRu', 'titleUk', 'titleEn', 'titleEs', 'titlePtBr', 'titleVi', 'titleId', 'titleTr', 'titlePl'];
const asJson = process.argv.includes('--json');
const log = (event, extra = {}) => { if (!asJson) console.log(`${TAG} audit:${event} ${JSON.stringify(extra)}`); };

/** Почему название не годится (пусто — годится). Чистая функция — проверяется тестом без сети. */
export function videoPackTitleProblems(pack) {
  const id = String(pack.id ?? '');
  const ru = String(pack.titleRu ?? '').trim();
  const problems = [];
  if (!ru) problems.push('пустое');
  if (ru && PLACEHOLDERS.has(ru.toLowerCase())) problems.push('заглушка');
  if (ru && (ru === String(pack.videoId ?? '') || ru === id.replace(/^video_/, ''))) problems.push('id ролика');
  if (pack.titleSource !== 'auto_or_admin') problems.push('имя документа');
  if (ru && ru.split(/\s+/).filter(Boolean).length > MAX_WORDS) problems.push(`длинное (${ru.split(/\s+/).filter(Boolean).length} слов)`);
  if (ru.length > MAX_CHARS) problems.push(`длинное (${ru.length} знаков)`);
  if (/\d/.test(ru)) problems.push('цифры');
  const missing = LOCALES.filter((key) => !String(pack[key] ?? '').trim());
  if (missing.length) problems.push(`нет языков: ${missing.map((k) => k.slice(5)).join(',')}`);
  return problems;
}

async function main() {
  const require = createRequire(import.meta.url);
  const admin = require('../functions/node_modules/firebase-admin');
  admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: PROJECT_ID });
  const db = admin.firestore();
  const field = admin.firestore.FieldPath.documentId();
  const startedAt = Date.now();
  // диапазон id «video_…»: читаем только наборы роликов, не всю коллекцию
  const snap = await db.collection('community_packs').where(field, '>=', 'video_').where(field, '<', 'video_')
    .select('titleRu', ...LOCALES.slice(1), 'videoId', 'videoTitle', 'titleSource', 'cardCount', 'listingStatus').get();
  log('read', { docs: snap.size, ms: Date.now() - startedAt });
  const rows = snap.docs.map((doc) => {
    const data = { id: doc.id, ...doc.data() };
    return { id: doc.id, videoId: data.videoId ?? null, titleRu: data.titleRu ?? '', cards: data.cardCount ?? 0, status: data.listingStatus ?? null, problems: videoPackTitleProblems(data) };
  });
  const bad = rows.filter((r) => r.problems.length);
  if (asJson) { console.log(JSON.stringify({ total: rows.length, needTitle: bad.length, rows: bad }, null, 2)); return; }
  for (const r of bad) log('row', r);
  log('summary', { total: rows.length, needTitle: bad.length, ok: rows.length - bad.length });
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop())) {
  main().catch((error) => { console.error(`${TAG} audit:failed ${String(error?.message || error)}`); process.exit(1); });
}
