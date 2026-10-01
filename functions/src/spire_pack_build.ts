// ═══════════════════════════════════════════════════════════════════════════
// spire_pack_build.ts — сборка и публикация пакета недели Шпиля (PM-272).
//
// зачем (владелец, TOWER.md §6, TOWER_CONTRACT.md §3–§4): пакет «язык × шпиль»
// лежит ФАЙЛОМ в Storage `spire_packs/{lang}/{tier}/{weekId}.json`, а не в
// документах Firestore — устройство скачивает его раз в неделю, ступень
// играется без сети. Отпечаток пакета кладётся в customMetadata.packHash:
// именно там его читает spire_progress.ts::resolveExpectedPackHash (одно
// чтение метаданных, без скачивания файла). Нет пакета → отчёты уходят в
// `pack_unknown` (fail-closed) — это честнее, чем задания другого языка (§4.8).
//
// Откуда задания: живой пул Арены `tournamentTasks` ТОЙ ЖЕ публикации, что
// играет Арена (arena_v2_config/current → resolveArenaTargetPublication), с той
// же проверкой, что loadArenaTaskPool в arena_v2.ts (сам arena_v2.ts не
// трогаем — только повторяем его проверку). Для es/fr/de нужен СВОЙ контур
// (legacy-пул английский и «обслуживает все языки» только для Арены — Шпилю
// это запрещено §4.8: «скоро», а не чужой язык).
//
// es/de/fr — ПРЯМАЯ ПУБЛИКАЦИЯ (владелец 2026-09-24, после разбора кода): для
// этих языков `adminArenaPublicationActivate` физически недостижим — нет
// стейджинг-транспорта на 10 МБ (см. admin_arena_content.ts), а v11-бандл-
// пайплайн никогда не видел multilingual-контент. Ждать общей инфраструктуры
// Арены — отдельная большая задача; вместо неё, КОГДА spirePublicationForLang
// вернул arena_publication_not_ready ИЛИ target_contour_not_published для
// es/de/fr, сборщик читает content/arena-multilingual/generated/{lang}/
// tasks.jsonl напрямую и конвертирует через spire_multilingual_pool.ts
// (spireReleaseMultilingualPool) — 0 обращений к Firestore/tournamentTasks
// для этих языков, файл в бандле функций, не в Storage. Арену (её код
// удаляет соседняя сессия) это не трогает вообще — только Шпиль читает
// bundled JSONL для СВОЕГО пакета.
//
// Firebase-экономия:
//   - крон раз в неделю (воскресенье 20:00 UTC) собирает СЛЕДУЮЩУЮ неделю;
//     текущую — только если её файла нет (первый запуск);
//   - Шпиль выключен в config/spire_v1 → крон ничего не читает (0 чтений пула);
//   - пул читается ОДИН раз на язык и обслуживает все 12 шпилей;
//   - файл, который уже есть, не перезаписывается (иначе сменится packHash
//     посреди недели и отчёты игроков уйдут в pack_mismatch) — только `force`
//     из админки;
//   - старые недели удаляются точечно по имени (неделя −2), без листинга.
// ═══════════════════════════════════════════════════════════════════════════

import * as admin from 'firebase-admin';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

import { hasPermission } from './admin/permissions';
import { hasAdminRole, type AdminRole } from './admin/roles';
import { validateArenaTaskForNewRoom } from './arena_target_quality';
import { resolveArenaTargetPublication, type ArenaTargetPublication } from './arena_target_registry';
import { ARENA_V2_COLLECTIONS } from './arena_v2_core';
import { ADMIN_SENSITIVE_WRITE_OPTIONS, requireAdminAppCheck } from './callable_options';
import { withCronHeartbeat } from './cron_heartbeat';
import {
  SPIRE_CONFIG_COLLECTION,
  SPIRE_CONFIG_DOC_ID,
  spireConfigStatus,
  type SpireConfigStatus,
} from './spire_config_contract';
import { spireWeekId } from './spire_groups';
import {
  spireReleaseMultilingualPool,
  type SpireMultilingualLang,
} from './spire_multilingual_pool';
import {
  SPIRE_PACK_MAX_TIER,
  SPIRE_PACK_SCHEMA,
  buildSpirePack,
  spirePackPath,
} from './spire_pack_contract';
import { SPIRE_LANGS, type SpireLang } from './spire_progress_contract';
import {
  SPIRE_TASK_FLAGS_COLLECTION,
  isSpireFlaggableStudyTarget,
  parseSpireTaskFlagsDocStrict,
  spireFlaggedTaskIds,
  spireTaskFlagsDocId,
} from './spire_task_flag_contract';
import { spireWeekStartMs } from './spire_residents';
import { validateTournamentTaskForNewRoom, type TournamentTask } from './tournament_core';
import { verifyTournamentPoolTaskProof, type ArenaPublication } from './tournament_pool_publication';

const LOG = '[SPIRE-PACK]';
const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;
const POOL_PAGE = 500;
/** Потолок чтений пула на язык: пул ~4000; защита от раздутой публикации. */
const POOL_MAX_READS_PER_LANG = 12_000;
const ARENA_POOL_MODES = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'] as const;

function log(event: string, fields: Record<string, unknown>): void {
  console.log(LOG, JSON.stringify({ event, ...fields }));
}

function warn(event: string, fields: Record<string, unknown>): void {
  console.warn(LOG, JSON.stringify({ event, ...fields }));
}

function errMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ------------------------------- недели ---------------------------------- */

/** Неделя по UTC-понедельнику — тот же ключ, что у spireReportSteps (getWeekKey) и комнат. */
export function spirePackWeekIdAt(ms: number): string {
  return spireWeekId(new Date(spireWeekStartMs(ms)));
}

/* ------------------------------- конфиги --------------------------------- */

async function loadSpireConfig(db: admin.firestore.Firestore): Promise<SpireConfigStatus> {
  // guard-ok: одиночный документ config/spire_v1, одно чтение на запуск.
  const snap = await db.collection(SPIRE_CONFIG_COLLECTION).doc(SPIRE_CONFIG_DOC_ID).get(); // guard-ok: один документ по id
  const status = spireConfigStatus(snap.exists ? snap.data() : null);
  log('spire_config', { exists: status.exists, valid: status.valid, live: status.liveForPlayers });
  return status;
}

async function loadArenaConfig(db: admin.firestore.Firestore): Promise<unknown> {
  // guard-ok: одиночный документ arena_v2_config/current, одно чтение на запуск.
  const snap = await db.collection(ARENA_V2_COLLECTIONS.config).doc('current').get(); // guard-ok: один документ по id
  if (!snap.exists) warn('arena_config_missing', {});
  return snap.exists ? snap.data() : null;
}

/**
 * Публикация пула для языка Шпиля. en принимает и старый (legacy) пул —
 * он английский; es/fr/de — только свой готовый контур.
 */
export function spirePublicationForLang(
  arenaConfig: unknown,
  lang: SpireLang,
): { ok: true; publication: ArenaTargetPublication } | { ok: false; reason: string } {
  const publication = resolveArenaTargetPublication(arenaConfig, lang);
  if (!publication) return { ok: false, reason: 'arena_publication_not_ready' };
  if (lang !== 'en' && publication.legacy === true) return { ok: false, reason: 'target_contour_not_published' };
  return { ok: true, publication };
}

/**
 * Снятые оператором задания (PM-287, T41/D55): `config/spire_task_flags_{lang}`.
 * en не флагуется (T41 только es/de/fr). Разбор документа — контракт PM-287,
 * не своя копия: форма флагов живёт в одном месте.
 */
type FlaggedTaskIdsLoad =
  | Readonly<{ ok: true; ids: readonly string[] }>
  | Readonly<{ ok: false; reason: 'spire_task_flags_read_failed' | 'spire_task_flags_invalid' }>;

async function loadFlaggedTaskIds(db: admin.firestore.Firestore, lang: SpireLang): Promise<FlaggedTaskIdsLoad> {
  if (!isSpireFlaggableStudyTarget(lang)) return { ok: true, ids: [] };
  let snap: admin.firestore.DocumentSnapshot;
  try {
    snap = await db.collection(SPIRE_TASK_FLAGS_COLLECTION).doc(spireTaskFlagsDocId(lang)).get(); // guard-ok: один документ по id, раз в неделю на язык
  } catch (error) {
    warn('flags_read_failed', { lang, reason: errMessage(error) });
    return { ok: false, reason: 'spire_task_flags_read_failed' };
  }
  if (!snap.exists) {
    log('flags_loaded', { lang, exists: false, flagged: 0 });
    return { ok: true, ids: [] };
  }
  let ids: readonly string[];
  try {
    const raw = snap.data();
    const parsed = parseSpireTaskFlagsDocStrict(raw, lang);
    ids = spireFlaggedTaskIds(parsed);
  } catch (error) {
    warn('flags_invalid', { lang, reason: errMessage(error) });
    return { ok: false, reason: 'spire_task_flags_invalid' };
  }
  log('flags_loaded', { lang, exists: true, flagged: ids.length });
  return { ok: true, ids };
}

/* --------------------------- прямая публикация es/de/fr ------------------- */

const MULTILINGUAL_LANGS = new Set<string>(['es', 'de', 'fr']);

/**
 * Ленивый require, как sourceDays() в admin_tournament_tasks.ts: файл
 * появляется только после copy_generated_assets.js (build-шаг), юнит-тесты
 * и холодный старт без этого языка его не парсят.
 */
function loadMultilingualBundle(lang: string): { rows: unknown[]; manifest: unknown } {
  // guard-ok: require одного сгенерированного файла, не Firestore-запрос.
  const bundle = require(`./generated/spire_multilingual_${lang}.json`) as {
    schemaVersion?: unknown;
    rows?: unknown;
    manifest?: unknown;
  };
  if (bundle?.schemaVersion !== 'spire-multilingual-bundle-v1' || !Array.isArray(bundle.rows)) {
    throw new Error('multilingual_bundle_invalid');
  }
  return { rows: bundle.rows, manifest: bundle.manifest };
}

/** Пул для es/de/fr напрямую из bundled-контента — 0 чтений Firestore. См. шапку файла. */
export function loadMultilingualPool(lang: SpireLang): {
  tasks: TournamentTask[];
  reads: number;
  rejected: number;
  unavailableReason?: string;
} {
  if (!MULTILINGUAL_LANGS.has(lang)) return { tasks: [], reads: 0, rejected: 0 };
  let rows: unknown[];
  let manifest: unknown;
  try {
    ({ rows, manifest } = loadMultilingualBundle(lang));
  } catch (error) {
    const reason = errMessage(error);
    warn('multilingual_pool_missing', { lang, reason });
    return { tasks: [], reads: 0, rejected: 0, unavailableReason: reason };
  }
  const released = spireReleaseMultilingualPool(lang as SpireMultilingualLang, rows, manifest);
  if (!released.ok) {
    warn('multilingual_pool_release_blocked', { lang, reason: released.reason, totalRows: rows.length });
    return { tasks: [], reads: 0, rejected: rows.length, unavailableReason: released.reason };
  }
  const { tasks, stats } = released;
  log('multilingual_pool_loaded', { ...stats, tasksSha256: released.tasksSha256 });
  const rejected = stats.totalRows - stats.converted;
  return { tasks, reads: 0, rejected };
}

/** Стабильная проекция причины прямого multilingual-пула в admin unavailableLangs. */
export function multilingualPoolUnavailableReason(
  pool: Readonly<{ unavailableReason?: string }>,
): string {
  return pool.unavailableReason ?? 'multilingual_pool_empty';
}

/* --------------------------------- пул ----------------------------------- */

/**
 * Тот же запрос и та же проверка, что loadArenaTaskPool (arena_v2.ts): индекс
 * poolVersion[+studyTarget+publicationFingerprint]+mode+difficulty+__name__ уже
 * существует у Арены — новых индексов не нужно.
 */
async function loadPool(
  db: admin.firestore.Firestore,
  publication: ArenaTargetPublication,
  lang: SpireLang,
): Promise<{ tasks: TournamentTask[]; reads: number; rejected: number }> {
  const legacyPool = publication.legacy === true;
  const tasks: TournamentTask[] = [];
  let reads = 0;
  let rejected = 0;
  for (const mode of ARENA_POOL_MODES) {
    for (let difficulty = 1; difficulty <= 3; difficulty += 1) {
      // guard-ok: выборка с where по публикации/режиму/сложности и страницами, раз в неделю на язык.
      const base = legacyPool
        ? db.collection(ARENA_V2_COLLECTIONS.taskSource)
          .where('poolVersion', '==', publication.poolVersion)
          .where('mode', '==', mode)
          .where('difficulty', '==', difficulty)
          .orderBy(admin.firestore.FieldPath.documentId())
        : db.collection(ARENA_V2_COLLECTIONS.taskSource)
          .where('poolVersion', '==', publication.poolVersion)
          .where('studyTarget', '==', publication.studyTarget)
          .where('publicationFingerprint', '==', publication.publicationFingerprint)
          .where('mode', '==', mode)
          .where('difficulty', '==', difficulty)
          .orderBy(admin.firestore.FieldPath.documentId());
      let last: admin.firestore.QueryDocumentSnapshot | null = null;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        if (reads >= POOL_MAX_READS_PER_LANG) {
          warn('pool_read_cap_reached', { lang, reads, cap: POOL_MAX_READS_PER_LANG, mode, difficulty });
          return { tasks, reads, rejected };
        }
        const page: admin.firestore.QuerySnapshot = await (last ? base.startAfter(last) : base).limit(POOL_PAGE).get();
        reads += page.size;
        if (page.empty) break;
        last = page.docs[page.docs.length - 1];
        for (const doc of page.docs) {
          const raw = { ...doc.data(), taskId: String(doc.data().taskId || doc.id) } as TournamentTask & {
            arenaPublication?: ArenaPublication;
          };
          const taskPublication = raw.arenaPublication;
          const invalid = legacyPool
            ? (raw.mode !== mode || raw.difficulty !== difficulty
              || !validateTournamentTaskForNewRoom(raw).ok
              || !verifyTournamentPoolTaskProof(raw, publication.merkleRootSha256))
            : (!validateArenaTaskForNewRoom(raw, {
              studyTarget: publication.studyTarget,
              factPackVersion: publication.factPackVersion,
              factPackSha256: publication.factPackSha256,
            }).ok || raw.mode !== mode || raw.difficulty !== difficulty
              || taskPublication?.publicationFingerprint !== publication.publicationFingerprint
              || taskPublication?.manifestSha256 !== publication.manifestSha256
              || taskPublication?.merkleRootSha256 !== publication.merkleRootSha256
              || !verifyTournamentPoolTaskProof(raw, publication.merkleRootSha256));
          if (invalid) {
            rejected += 1;
            continue;
          }
          const { arenaPublication: _proof, ...playable } = raw;
          tasks.push(playable as TournamentTask);
        }
        if (page.size < POOL_PAGE) break;
      }
    }
  }
  if (rejected > 0) warn('pool_tasks_rejected', { lang, rejected, accepted: tasks.length });
  return { tasks, reads, rejected };
}

/* ------------------------------ Storage ---------------------------------- */

type PackOutcome = Readonly<{
  lang: SpireLang;
  tier: number;
  weekId: string;
  status: 'written' | 'kept_existing' | 'same_hash' | 'failed';
  packHash?: string;
  bytes?: number;
  reason?: string;
}>;

async function existingPackHash(path: string): Promise<string | null> {
  try {
    const [exists] = await admin.storage().bucket().file(path).exists();
    if (!exists) return null;
    const [metadata] = await admin.storage().bucket().file(path).getMetadata();
    const raw = (metadata?.metadata as Record<string, unknown> | undefined)?.packHash;
    return typeof raw === 'string' && raw.length > 0 ? raw : 'present_without_hash';
  } catch (error) {
    // guard-ok: не знаем, есть ли файл — считаем, что нет, и пишем; причина в логе.
    warn('existing_pack_probe_failed', { path, reason: errMessage(error) });
    return null;
  }
}

async function writePack(path: string, json: string, meta: Record<string, string>): Promise<void> {
  // зачем gzip: ~1,5–2 МБ JSON → ~300 КБ в пути (контракт §4); Storage отдаёт
  // его с Content-Encoding: gzip, клиент получает обычный JSON.
  await admin.storage().bucket().file(path).save(Buffer.from(json, 'utf8'), {
    gzip: true,
    resumable: false,
    contentType: 'application/json; charset=utf-8',
    metadata: {
      // Файл недели неизменяем (новая неделя — новое имя), кэш CDN безопасен.
      cacheControl: 'private, max-age=3600',
      metadata: meta,
    },
  });
}

async function deleteQuietly(path: string): Promise<void> {
  try {
    await admin.storage().bucket().file(path).delete({ ignoreNotFound: true });
  } catch (error) {
    // guard-ok: уборка старых недель не критична; причина в логе.
    warn('old_pack_delete_failed', { path, reason: errMessage(error) });
  }
}

/* ------------------------------- сборка ---------------------------------- */

export type SpirePackRunInput = Readonly<{
  weekIds: readonly string[];
  langs: readonly SpireLang[];
  tiers?: readonly number[];
  /** Перезаписать существующий файл недели (меняет packHash — только осознанно из админки). */
  force: boolean;
  /** Требовать live в config/spire_v1 (крон — да, ручной пересбор — нет). */
  requireLive: boolean;
  trigger: 'cron' | 'admin';
}>;

export async function runSpirePackBuild(input: SpirePackRunInput): Promise<{
  skipped?: string;
  poolReads: number;
  outcomes: PackOutcome[];
  unavailableLangs: Record<string, string>;
}> {
  const startedAt = Date.now();
  const db = admin.firestore();
  const tiers = (input.tiers?.length ? input.tiers : Array.from({ length: SPIRE_PACK_MAX_TIER + 1 }, (_, i) => i))
    .filter((t) => Number.isInteger(t) && t >= 0 && t <= SPIRE_PACK_MAX_TIER);
  log('start', { trigger: input.trigger, weekIds: input.weekIds, langs: input.langs, tiers, force: input.force });

  const spireConfig = await loadSpireConfig(db);
  if (input.requireLive && !spireConfig.liveForPlayers) {
    log('skip_not_live', { trigger: input.trigger, exists: spireConfig.exists, enabled: spireConfig.config.enabled });
    return { skipped: 'spire_not_live', poolReads: 0, outcomes: [], unavailableLangs: {} };
  }
  const arenaConfig = await loadArenaConfig(db);
  const outcomes: PackOutcome[] = [];
  const unavailableLangs: Record<string, string> = {};
  let poolReads = 0;

  for (const lang of input.langs) {
    const resolved = spirePublicationForLang(arenaConfig, lang);
    if (!resolved.ok && !MULTILINGUAL_LANGS.has(lang)) {
      // §4.8: язык без готового пула — честное «скоро» на клиенте, пакета нет.
      unavailableLangs[lang] = resolved.reason;
      warn('lang_unavailable', { lang, reason: resolved.reason });
      continue;
    }
    // Сначала смотрим, что вообще нужно собрать — пул читаем только если есть работа.
    const todo: Array<{ weekId: string; tier: number; path: string; existing: string | null }> = [];
    for (const weekId of input.weekIds) {
      for (const tier of tiers) {
        const path = spirePackPath(lang, tier, weekId);
        const existing = await existingPackHash(path);
        if (existing && !input.force) {
          outcomes.push({ lang, tier, weekId, status: 'kept_existing', packHash: existing });
          continue;
        }
        todo.push({ weekId, tier, path, existing });
      }
    }
    if (todo.length === 0) {
      log('lang_nothing_to_build', { lang });
      continue;
    }
    // Флаги — обязательный admission gate: проверяем до чтения Arena-пула и
    // до require bundled es/de/fr, иначе плохое снятое задание может вернуться.
    const flags = await loadFlaggedTaskIds(db, lang);
    if (!flags.ok) {
      unavailableLangs[lang] = flags.reason;
      warn('lang_unavailable', { lang, reason: flags.reason });
      for (const job of todo) {
        outcomes.push({ lang, tier: job.tier, weekId: job.weekId, status: 'failed', reason: flags.reason });
      }
      continue;
    }
    // зачем (владелец 2026-09-24): es/de/fr не имеют пути через Арену (нет
    // стейджинг-транспорта — см. шапку файла). После flags-gate пробуем их
    // bundled-контент напрямую, прежде чем сдаться в unavailableLangs.
    const multilingualPool = !resolved.ok ? loadMultilingualPool(lang) : null;
    if (!resolved.ok && multilingualPool!.tasks.length === 0) {
      const reason = multilingualPoolUnavailableReason(multilingualPool!);
      unavailableLangs[lang] = reason;
      warn('lang_unavailable', { lang, reason });
      continue;
    }
    const pool = resolved.ok ? await loadPool(db, resolved.publication, lang) : multilingualPool!;
    const excludedTaskIds = flags.ids;
    poolReads += pool.reads;
    log('pool_loaded', {
      lang, reads: pool.reads, accepted: pool.tasks.length, rejected: pool.rejected,
      legacy: resolved.ok ? resolved.publication.legacy === true : false,
      multilingualDirect: !resolved.ok,
    });

    for (const job of todo) {
      const source = resolved.ok
        ? {
          poolVersion: resolved.publication.poolVersion,
          publicationFingerprint: resolved.publication.publicationFingerprint,
          legacyPool: resolved.publication.legacy === true,
        }
        : {
          // зачем: нет ArenaTargetPublication для прямого пути — синтетическая
          // версия, чтобы старый пакет с чужим содержимым не считался «тем же».
          poolVersion: `spire-multilingual-direct-${lang}`,
          publicationFingerprint: 'spire-multilingual-direct',
          legacyPool: false,
        };
      const built = buildSpirePack({
        weekId: job.weekId,
        lang,
        tier: job.tier,
        pool: pool.tasks,
        timer: spireConfig.config.timer,
        excludedTaskIds,
        source,
      });
      if (!built.ok) {
        warn('build_failed', { lang, tier: job.tier, weekId: job.weekId, reason: built.reason, detail: built.detail ?? null });
        outcomes.push({ lang, tier: job.tier, weekId: job.weekId, status: 'failed', reason: built.reason });
        continue;
      }
      const { pack, json } = built;
      if (job.existing === pack.packHash) {
        outcomes.push({ lang, tier: job.tier, weekId: job.weekId, status: 'same_hash', packHash: pack.packHash });
        continue;
      }
      if (job.existing) {
        // force поверх другого хеша: отчёты с прежним packHash станут pack_mismatch.
        warn('pack_overwrite_changes_hash', { path: job.path, before: job.existing, after: pack.packHash });
      }
      try {
        await writePack(job.path, json, {
          packHash: pack.packHash,
          schema: SPIRE_PACK_SCHEMA,
          weekId: job.weekId,
          lang,
          tier: String(job.tier),
          builtAtMs: String(Date.now()),
          trigger: input.trigger,
        });
        const bytes = Buffer.byteLength(json, 'utf8');
        log('pack_written', { path: job.path, packHash: pack.packHash, bytes, stats: pack.stats });
        outcomes.push({ lang, tier: job.tier, weekId: job.weekId, status: 'written', packHash: pack.packHash, bytes });
      } catch (error) {
        // guard-ok: одна неудачная запись не валит остальные шпили; причина в логе и в итоге.
        warn('pack_write_failed', { path: job.path, reason: errMessage(error) });
        outcomes.push({ lang, tier: job.tier, weekId: job.weekId, status: 'failed', reason: 'write_failed' });
      }
    }
  }

  const summary = {
    trigger: input.trigger,
    poolReads,
    written: outcomes.filter((o) => o.status === 'written').length,
    kept: outcomes.filter((o) => o.status === 'kept_existing' || o.status === 'same_hash').length,
    failed: outcomes.filter((o) => o.status === 'failed').length,
    unavailableLangs,
    tookMs: Date.now() - startedAt,
  };
  log('done', summary);
  return { poolReads, outcomes, unavailableLangs };
}

/* -------------------------------- крон ----------------------------------- */

export const spirePackWeeklyCron = onSchedule(
  {
    // зачем воскресенье 20:00 UTC: следующая неделя готова за 4 часа до
    // полуночи понедельника (смена шпиля в spireFinalizeCron 00:01) — запас на
    // ретрай и ручной пересбор, если сборка упадёт.
    schedule: 'every sunday 20:00',
    timeZone: 'UTC',
    timeoutSeconds: 540,
    memory: '1GiB',
    region: 'us-central1',
  },
  withCronHeartbeat('spirePackWeeklyCron', async () => {
    const nowMs = Date.now();
    const currentWeekId = spirePackWeekIdAt(nowMs);
    const nextWeekId = spirePackWeekIdAt(spireWeekStartMs(nowMs) + WEEK_MS);
    // Текущая неделя: только если файла нет (first launch) — existing не трогаем без force.
    const result = await runSpirePackBuild({
      weekIds: [currentWeekId, nextWeekId],
      langs: SPIRE_LANGS,
      force: false,
      requireLive: true,
      trigger: 'cron',
    });
    if (!result.skipped) {
      // Уборка: неделя −2 по точному имени (без листинга бакета).
      const oldWeekId = spirePackWeekIdAt(spireWeekStartMs(nowMs) - 2 * WEEK_MS);
      for (const lang of SPIRE_LANGS) {
        for (let tier = 0; tier <= SPIRE_PACK_MAX_TIER; tier += 1) {
          await deleteQuietly(spirePackPath(lang, tier, oldWeekId));
        }
      }
      log('old_week_cleanup', { oldWeekId });
    }
  }),
);

/* ------------------------- ручной пересбор (админ) ------------------------ */

type Row = Record<string, unknown>;

function requireSpirePackAdmin(request: { auth?: { uid?: string; token?: Row } | null }): { actorUid: string; role: AdminRole } {
  const actorUid = String(request.auth?.uid ?? '').trim();
  const token = request.auth?.token;
  if (!actorUid || token?.admin !== true) {
    warn('admin_denied', { hasUid: Boolean(actorUid), adminClaim: token?.admin ?? null });
    throw new HttpsError('permission-denied', 'Admin role required');
  }
  const role: AdminRole = hasAdminRole(token.adminRole) ? token.adminRole : 'owner';
  if (!hasPermission(role, 'application.config.write')) {
    warn('admin_role_denied', { actorUid, role });
    throw new HttpsError('permission-denied', 'Role cannot use application.config.write');
  }
  return { actorUid, role };
}

const WEEK_ID_RE = /^\d{4}-W\d{2}$/u;

/**
 * adminSpirePackBuild({ weekId?, langs?, tiers?, force? }).
 * По умолчанию — текущая неделя, все языки и шпили, существующие файлы не
 * трогает. Нужен, когда Шпиль включили посреди недели (крон пропускал сборку,
 * пока Шпиль был выключен) или когда сборка крона упала.
 */
export const adminSpirePackBuild = onCall(
  { ...ADMIN_SENSITIVE_WRITE_OPTIONS, timeoutSeconds: 540, memory: '1GiB' },
  async (request) => {
    requireAdminAppCheck(request);
    const actor = requireSpirePackAdmin(request as { auth?: { uid?: string; token?: Row } });
    const data = (request.data ?? {}) as Row;
    const weekId = typeof data.weekId === 'string' && WEEK_ID_RE.test(data.weekId)
      ? data.weekId
      : spirePackWeekIdAt(Date.now());
    const langs = Array.isArray(data.langs)
      ? SPIRE_LANGS.filter((l) => (data.langs as unknown[]).includes(l))
      : [...SPIRE_LANGS];
    const tiers = Array.isArray(data.tiers) ? (data.tiers as unknown[]).map(Number) : undefined;
    const force = data.force === true;
    log('admin_request', { actorUid: actor.actorUid, role: actor.role, weekId, langs, tiers: tiers ?? 'all', force });
    if (langs.length === 0) throw new HttpsError('invalid-argument', 'no_valid_langs');
    const result = await runSpirePackBuild({ weekIds: [weekId], langs, tiers, force, requireLive: false, trigger: 'admin' });
    return { ok: true, weekId, ...result };
  },
);
