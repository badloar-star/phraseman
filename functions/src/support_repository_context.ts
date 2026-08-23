import { createHash } from 'crypto';
import type { SupportRepositoryContext, SupportRepositorySnapshot } from './support_repository_context_types';

const REQUIRED_FILES = Object.freeze([
  'specs/gmail-support-inbox.md',
  'knowly-www/PRODUCT.md',
  'functions/src/support_auto_reply_policy.ts',
  'functions/src/support_repository_context.ts',
  'functions/src/support_reply_delivery.ts',
  'functions/src/support_inbox.ts',
  'specs/support-product-lifecycle.json',
]);
const REQUIRED_ROOTS = Object.freeze(['app', 'components', 'constants', 'functions/src']);

function emptySnapshot(): SupportRepositorySnapshot {
  return Object.freeze({
    schemaVersion: 2,
    generatedAt: '1970-01-01T00:00:00.000Z',
    repository: 'badloar-star/phraseman',
    commit: 'missing-build-artifact',
    dirty: true,
    appVersion: 'unknown',
    appBuild: 'unknown',
    sourceFingerprint: '0'.repeat(64),
    filesDiscovered: 0,
    filesIndexed: 0,
    requiredFilesIncluded: Object.freeze([]),
    rootsIncluded: Object.freeze({}),
    historyFactsIncluded: Object.freeze([]),
    chunks: Object.freeze([]),
  });
}

function loadBundledSnapshot(): SupportRepositorySnapshot {
  try {
    // Generated before every Functions build and copied next to compiled JS.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('./generated/support_repo_context.json') as SupportRepositorySnapshot;
  } catch {
    return emptySnapshot();
  }
}

/*
 * зачем: 2026-08-23 — снимок весит 17 МБ и раньше парсился на ВЕРХНЕМ УРОВНЕ
 * модуля. Cloud Functions gen2 при старте любого контейнера грузит index.js со
 * ВСЕМИ функциями, поэтому эти ~40 МБ RSS платили все 33 функции с лимитом
 * 256 MiB: замер загрузки index.js давал 360 МБ, и maxVoiceFinalize физически
 * не стартовала («Memory limit of 256 MiB exceeded»). Теперь снимок читается
 * при первом обращении и кэшируется — платят только функции поддержки.
 */
let cachedSnapshot: SupportRepositorySnapshot | null = null;

export function bundledSupportSnapshot(): SupportRepositorySnapshot {
  if (cachedSnapshot === null) cachedSnapshot = loadBundledSnapshot();
  return cachedSnapshot;
}
const WORD_RE = /[\p{L}\p{N}_-]{3,}/gu;
const STOP_WORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'your', 'what', 'which', 'where', 'when', 'how',
  'can', 'could', 'would', 'there', 'available', 'using', 'use', 'app', 'application', 'please',
  'как', 'что', 'это', 'для', 'или', 'мне', 'меня', 'могу', 'можно', 'какие', 'есть', 'где',
  'через', 'почему', 'пожалуйста', 'приложение', 'приложении', 'the', 'and', 'por', 'para',
  'que', 'una', 'uma', 'com', 'como', 'donde', 'puedo', 'aplicacion', 'aplicación',
]);

const CONCEPT_PATTERNS: ReadonlyArray<readonly [string, RegExp]> = [
  ['premium', /(?:premium|plus|премиум|плюс|suscripci[oó]n|subscription|подписк)/iu],
  ['payment', /(?:payment|pay|purchase|billing|оплат|плат[её]ж|купит|покуп|pago|comprar)/iu],
  ['restore_purchase', /(?:restore.{0,24}(?:purchase|subscription)|восстанов.{0,24}(?:покуп|подпис)|restaur.{0,24}(?:compra|suscripci))/iu],
  ['learning_activity', /(?:practi[cs]e|learning activit|lesson|exercise|training|занят|урок|упражнен|трениров|lecci[oó]n|ejercicio|practicar)/iu],
  ['flashcards', /(?:flashcard|карточк|tarjeta)/iu],
  ['audio', /(?:audio|sound|voice|microphone|mic\b|звук|аудио|голос|микрофон|sonido|voz|micr[oó]fono)/iu],
  ['language', /(?:language|locale|язык|idioma)/iu],
  ['login', /(?:sign[ -]?in|log[ -]?in|apple id|google account|войти|вход|авторизац|iniciar sesi[oó]n)/iu],
  ['account', /(?:account|profile|аккаунт|профил|cuenta|perfil)/iu],
  ['streak', /(?:streak|серия|racha)/iu],
  ['friends', /(?:friend|друз|amig)/iu],
  ['tournament', /(?:tournament|league|турнир|лиг|torneo|liga)/iu],
  ['settings', /(?:settings|настройк|ajustes|configuraci[oó]n)/iu],
  ['compass', /(?:compass|компас)/iu],
  ['feature_lifecycle', /(?:used to|previously|earlier|former|removed|retired|disappear|where did|раньше|прежде|был[ао]?|пропал|исчез|убрал|удалил|куда дел|antes|exist[ií]a|eliminad|desaparec)/iu],
];

export function extractSupportConcepts(value: unknown): readonly string[] {
  const text = String(value ?? '');
  return Object.freeze(CONCEPT_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([concept]) => concept));
}

export function tokenizeSupportQuery(value: unknown): readonly string[] {
  const found = String(value ?? '').toLocaleLowerCase().match(WORD_RE) ?? [];
  return Object.freeze([...new Set(found.filter((token) => !STOP_WORDS.has(token) && token.length >= 4))].slice(-80));
}

function wordSet(value: string): ReadonlySet<string> {
  return new Set((value.toLocaleLowerCase().match(WORD_RE) ?? []).filter((token) => !STOP_WORDS.has(token)));
}

function validateSnapshot(input: SupportRepositorySnapshot): { trustworthy: boolean; reason: string } {
  if (input.schemaVersion !== 2) return { trustworthy: false, reason: 'unsupported_schema' };
  if (!/^[a-f0-9]{40}$/i.test(input.commit)) return { trustworthy: false, reason: 'invalid_commit' };
  if (!/^\d{4}-\d{2}-\d{2}T/.test(input.generatedAt)) return { trustworthy: false, reason: 'invalid_generated_at' };
  if (!/^\d+\.\d+\.\d+/.test(input.appVersion) || !input.appBuild) return { trustworthy: false, reason: 'invalid_app_release' };
  if (!Array.isArray(input.chunks) || input.chunks.length === 0) return { trustworthy: false, reason: 'empty_snapshot' };
  const fingerprint = createHash('sha256').update(JSON.stringify(input.chunks)).digest('hex');
  if (fingerprint !== input.sourceFingerprint) return { trustworthy: false, reason: 'fingerprint_mismatch' };
  if (input.filesIndexed !== new Set(input.chunks.map((chunk) => chunk.path)).size) return { trustworthy: false, reason: 'dishonest_file_count' };
  const chunkPaths = new Set(input.chunks.map((chunk) => chunk.path));
  if (REQUIRED_FILES.some((path) => !input.requiredFilesIncluded?.includes(path) || !chunkPaths.has(path))) return { trustworthy: false, reason: 'required_file_missing' };
  if (REQUIRED_ROOTS.some((root) => Number(input.rootsIncluded?.[root] ?? 0) < 1)) return { trustworthy: false, reason: 'required_root_missing' };
  return { trustworthy: true, reason: input.dirty ? 'verified_build_snapshot_with_uncommitted_changes' : 'verified_build_snapshot' };
}

export function retrieveSupportRepositoryContext(
  query: unknown,
  inputSnapshot: SupportRepositorySnapshot = bundledSupportSnapshot(),
  limit = 8,
): SupportRepositoryContext {
  const tokens = tokenizeSupportQuery(query);
  const queryConcepts = extractSupportConcepts(query);
  const queryTokenSet = new Set(tokens);
  const trust = validateSnapshot(inputSnapshot);
  const evidence = inputSnapshot.chunks
    .map((chunk, index) => {
      const chunkWords = wordSet(`${chunk.path} ${chunk.text}`);
      const exactMatches = [...queryTokenSet].filter((token) => chunkWords.has(token));
      const chunkConcepts = extractSupportConcepts(`${chunk.path}\n${chunk.text}`);
      const matchedConcepts = queryConcepts.filter((concept) => chunkConcepts.includes(concept));
      const conceptCoverage = queryConcepts.length ? matchedConcepts.length / queryConcepts.length : 0;
      const tokenCoverage = tokens.length ? exactMatches.length / tokens.length : 0;
      const relevanceScore = matchedConcepts.length * 14 + exactMatches.reduce((sum, token) => sum + Math.min(8, token.length), 0);
      return { chunk, index, relevanceScore, queryCoverage: Math.max(conceptCoverage, tokenCoverage), matchedConcepts };
    })
    // A concept anchor is mandatory when the question contains a known product
    // concept. Otherwise require at least two exact non-generic whole words.
    .filter((row) => queryConcepts.length
      ? row.matchedConcepts.length > 0 && row.relevanceScore >= 14
      : row.relevanceScore >= 10 && row.queryCoverage >= 0.2)
    .sort((left, right) => right.relevanceScore - left.relevanceScore || right.queryCoverage - left.queryCoverage || left.index - right.index)
    .slice(0, Math.max(1, Math.min(12, limit)))
    .map((row) => Object.freeze({
      evidenceId: `repo-${inputSnapshot.sourceFingerprint.slice(0, 12)}-${row.index}`,
      path: row.chunk.path,
      line: row.chunk.line,
      text: row.chunk.text,
      relevanceScore: row.relevanceScore,
      queryCoverage: row.queryCoverage,
      matchedConcepts: Object.freeze([...row.matchedConcepts]),
    }));

  return Object.freeze({
    commit: inputSnapshot.commit,
    dirty: inputSnapshot.dirty,
    appVersion: inputSnapshot.appVersion,
    appBuild: inputSnapshot.appBuild,
    sourceFingerprint: inputSnapshot.sourceFingerprint,
    generatedAt: inputSnapshot.generatedAt,
    trustworthy: trust.trustworthy,
    trustReason: trust.reason,
    queryConcepts: Object.freeze([...queryConcepts]),
    evidence: Object.freeze(evidence),
  });
}

export function renderSupportRepositoryContext(context: SupportRepositoryContext): string {
  const header = [
    `Версия приложения в снимке сборки: ${context.appVersion} (${context.appBuild})`,
    `Ревизия: ${context.commit}${context.dirty ? ' (включает незакоммиченные изменения сборки)' : ''}`,
    `Проверка источника: ${context.trustworthy ? 'passed' : `failed:${context.trustReason}`}`,
  ].join('\n');
  if (!context.trustworthy || context.evidence.length === 0) return `${header}\nРелевантных проверенных доказательств не найдено.`;
  return `${header}\n\n${context.evidence.map((item) => (
    `[${item.evidenceId}] ${item.path}:${item.line}\n${item.text}`
  )).join('\n\n')}`;
}

/**
 * Отпечаток ТОЛЬКО тех фрагментов кода, на которые ссылается конкретный ответ.
 *
 * зачем (владелец, 2026-08-17: «я одобрил, но сообщение не отправилось»):
 * раньше готовый ответ сверялся с отпечатком ВСЕЙ кодовой базы. Он меняется на
 * каждом деплое функций — в том числе от чужой правки в другой части проекта,
 * никак не связанной с письмом. Владелец нажимал «Одобрено», между подготовкой
 * и нажатием проходил деплой, и ответ отменялся как устаревший. Женщина ждала
 * письма, которого никто не отправил.
 *
 * Смысл проверки — «не устарели ли ФАКТЫ, на которых построен ответ». Факты
 * живут в процитированных фрагментах, а не в отпечатке всего репозитория.
 * Поэтому считаем по ним: правка в другом файле больше не рушит готовый ответ,
 * а изменение самого процитированного кода — по-прежнему рушит, и правильно.
 *
 * зачем сортировка перед хешем: порядок фрагментов в ответе модели
 * произвольный, а отпечаток обязан быть одинаковым для одного и того же
 * набора — иначе он ложно «менялся» бы сам по себе.
 *
 * Пустой список цитат даёт пустую строку: ответ, который ни на что не
 * ссылается, нечему инвалидировать. Вызывающий код решает, что с этим делать.
 */
export function supportEvidenceFingerprint(
  context: SupportRepositoryContext,
  citedEvidenceIds: readonly string[],
): string {
  const cited = new Set(citedEvidenceIds.map(String));
  const parts = context.evidence
    .filter((item) => cited.has(item.evidenceId))
    .map((item) => `${item.path}:${item.line}\n${item.text}`)
    .sort();
  if (parts.length === 0) return '';
  return createHash('sha256').update(parts.join('\u0000'), 'utf8').digest('hex');
}
