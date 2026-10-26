#!/usr/bin/env node
// read_app_errors_since.mjs — ТОЛЬКО ЧТЕНИЕ: сводка боевого журнала app_errors за последние N часов, без личных данных.
//
// Запуск (владелец, со своим доступом к проекту — вход `gcloud auth application-default login` или ключ сервисного аккаунта):
//   node scripts/read_app_errors_since.mjs --hours 6 [--app-version 2.0.2] [--build 144] [--limit 500] [--service-account путь.json]
//
// зачем (координатор 26.10 после OTA3 от 7116bc581 и перед 2.0.3): Ревизору нужен разбор ошибок после раскатки, а доступа к проду у него
// нет и без «да» владельца не будет. Скрипт запускает тот, у кого доступ есть; Ревизор разбирает вывод.
// Стоимость: ОДИН запрос — where createdAtMs >= (сейчас − N часов), orderBy createdAtMs desc, limit (по умолчанию 500, потолок 2000):
// не больше limit чтений, без выкачивания коллекции и без составного индекса. Версию / сборку фильтруем уже в памяти.
// Записи нет: только .get(). Обновления по воздуху в журнале не видно — поля updateId в app_errors нет; различаем по appVersion /
// buildNumber и времени (после публикации OTA).
// Приватность: uid, authUid, deviceName, stack в вывод не попадают; e-mail и длинные id в тексте сообщений заменяются.

export const DEFAULT_LIMIT = 500;
export const MAX_LIMIT = 2000;
const MESSAGE_KEY_LEN = 140;

/** Убирает из текста то, что может указать на человека: e-mail, длинные id / токены, цифры телефонов. */
export function redactText(value) {
  return String(value ?? '')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '<email>')
    .replace(/\b[A-Za-z0-9_-]{20,}\b/g, '<id>')
    .replace(/\+?\d[\d\s-]{8,}\d/g, '<num>')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Чистая сводка: только разрешённые поля, группировка по сообщению + экрану + версии. Личных полей в результате нет по построению. */
export function summarizeAppErrors(rows, { appVersion = null, build = null } = {}) {
  const kept = rows.filter((r) => (appVersion === null || r.appVersion === appVersion) && (build === null || String(r.buildNumber ?? '') === String(build)));
  const groups = new Map();
  for (const r of kept) {
    const message = redactText(r.message).slice(0, MESSAGE_KEY_LEN);
    const key = [r.severity ?? 'warning', r.context ?? '', r.screen ?? '', message, r.appVersion ?? 'unknown', r.buildNumber ?? '', r.platform ?? ''].join('\u0001');
    const g = groups.get(key) ?? {
      severity: r.severity ?? 'warning', context: redactText(r.context), feature: redactText(r.feature), screen: r.screen ?? null,
      errorName: redactText(r.errorName), message, appVersion: r.appVersion ?? 'unknown', buildNumber: r.buildNumber ?? null,
      platform: r.platform ?? 'unknown', count: 0, firstAtMs: Infinity, lastAtMs: 0,
    };
    g.count += 1;
    g.firstAtMs = Math.min(g.firstAtMs, Number(r.createdAtMs) || Infinity);
    g.lastAtMs = Math.max(g.lastAtMs, Number(r.createdAtMs) || 0);
    groups.set(key, g);
  }
  const list = [...groups.values()].sort((a, b) => (b.severity === 'critical') - (a.severity === 'critical') || b.count - a.count);
  const byVersion = {};
  for (const r of kept) { const v = `${r.appVersion ?? 'unknown'} (${r.buildNumber ?? '?'}) ${r.platform ?? '?'}`; byVersion[v] = (byVersion[v] ?? 0) + 1; }
  return {
    read: rows.length, kept: kept.length, critical: kept.filter((r) => r.severity === 'critical').length, byVersion,
    groups: list.map((g) => ({ ...g, firstAt: Number.isFinite(g.firstAtMs) ? new Date(g.firstAtMs).toISOString() : null, lastAt: g.lastAtMs ? new Date(g.lastAtMs).toISOString() : null, firstAtMs: undefined, lastAtMs: undefined })),
  };
}

function parseArgs(argv) {
  const get = (name) => { const i = argv.indexOf(name); return i >= 0 ? argv[i + 1] : undefined; };
  const hours = Number(get('--hours') ?? 6);
  const limit = Math.min(MAX_LIMIT, Math.max(1, Number(get('--limit') ?? DEFAULT_LIMIT)));
  if (!Number.isFinite(hours) || hours <= 0 || hours > 24 * 14) throw new Error(`--hours должно быть от 0 до 336, пришло ${get('--hours')}`);
  return { hours, limit, appVersion: get('--app-version') ?? null, build: get('--build') ?? null, serviceAccount: get('--service-account') ?? null };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { createRequire } = await import('node:module');
  const { readFileSync } = await import('node:fs');
  const require = createRequire(new URL('../functions/package.json', import.meta.url));
  const admin = require('firebase-admin');
  const credential = args.serviceAccount
    ? admin.credential.cert(JSON.parse(readFileSync(args.serviceAccount, 'utf8')))
    : admin.credential.applicationDefault();
  admin.initializeApp({ credential, projectId: process.env.GCLOUD_PROJECT || 'phraseman-ea0b3' });
  const db = admin.firestore();
  const sinceMs = Date.now() - args.hours * 3600 * 1000;
  console.error(`[APP-ERRORS-READ] только чтение: app_errors с ${new Date(sinceMs).toISOString()}, limit ${args.limit}`);
  const t0 = Date.now();
  const snap = await db.collection('app_errors').where('createdAtMs', '>=', sinceMs).orderBy('createdAtMs', 'desc').limit(args.limit).get();
  const rows = snap.docs.map((d) => d.data());
  const summary = summarizeAppErrors(rows, { appVersion: args.appVersion, build: args.build });
  console.error(`[APP-ERRORS-READ] прочитано ${rows.length} за ${Date.now() - t0} мс${rows.length === args.limit ? ' — упёрлись в limit, окно шире выборки' : ''}`);
  console.log(JSON.stringify({ sinceIso: new Date(sinceMs).toISOString(), hours: args.hours, limit: args.limit, filters: { appVersion: args.appVersion, build: args.build }, ...summary }, null, 1));
}

const isMain = process.argv[1] && new URL(import.meta.url).pathname.endsWith(process.argv[1].replace(/\\/g, '/').split('/').pop());
if (isMain) main().catch((error) => { console.error('[APP-ERRORS-READ] ошибка:', error instanceof Error ? error.message : String(error)); process.exit(1); });
