#!/usr/bin/env node

/**
 * Builds the current+next Spire weekly packs into a LOCAL release packet.
 *
 * The only remote operations are read-only Firestore GET/runQuery requests for
 * the canonical English Arena publication and exact quarantine snapshots.
 * No callable, Storage upload, Firestore write, deploy or project API key is
 * used. The caller supplies a short-lived gcloud OAuth token through
 * PHRASEMAN_FIRESTORE_READ_TOKEN; the token is never persisted.
 */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const PROJECT_ID = 'phraseman-ea0b3';
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;
const LANGS = ['en', 'es', 'fr', 'de', 'it'];
const MODES = ['guess_phrase', 'fill_gap', 'find_oddity', 'translate_build', 'speed_match'];

const require = createRequire(import.meta.url);
const packContract = require(join(ROOT, 'functions/lib/functions/src/spire_pack_contract.js'));
const configContract = require(join(ROOT, 'functions/lib/functions/src/spire_config_contract.js'));
const multilingualContract = require(join(ROOT, 'functions/lib/functions/src/spire_multilingual_pool.js'));
const listenContract = require(join(ROOT, 'functions/lib/functions/src/spire_listen_draft_pool.js'));
const taskContract = require(join(ROOT, 'functions/lib/functions/src/tournament_core.js'));
const publicationContract = require(join(ROOT, 'functions/lib/functions/src/tournament_pool_publication.js'));
const registryContract = require(join(ROOT, 'functions/lib/functions/src/arena_target_registry.js'));
const flagContract = require(join(ROOT, 'functions/lib/functions/src/spire_task_flag_contract.js'));

const {
  SPIRE_PACK_MAX_TIER,
  buildSpirePack,
  spirePackPath,
} = packContract;
const { SPIRE_CONFIG_DEFAULTS } = configContract;
const { spireReleaseMultilingualPool } = multilingualContract;
const { spireListenDraftPool } = listenContract;
const { validateTournamentTaskForNewRoom } = taskContract;
const { verifyTournamentPoolTaskProof } = publicationContract;
const { resolveArenaTargetPublication } = registryContract;
const { parseSpireTaskFlagsDocStrict, spireFlaggedTaskIds, spireTaskFlagsDocId } = flagContract;

function sha(value) {
  const bytes = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(bytes, 'utf8').digest('hex');
}

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function firestoreValue(value) {
  if (!value || typeof value !== 'object') return null;
  if ('nullValue' in value) return null;
  if ('stringValue' in value) return value.stringValue;
  if ('booleanValue' in value) return value.booleanValue;
  if ('integerValue' in value) return Number(value.integerValue);
  if ('doubleValue' in value) return Number(value.doubleValue);
  if ('timestampValue' in value) return value.timestampValue;
  if ('bytesValue' in value) return value.bytesValue;
  if ('referenceValue' in value) return value.referenceValue;
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(firestoreValue);
  if ('mapValue' in value) return firestoreFields(value.mapValue.fields ?? {});
  throw new Error(`unsupported_firestore_value:${Object.keys(value).join(',')}`);
}

function firestoreFields(fields) {
  return Object.fromEntries(Object.entries(fields ?? {}).map(([key, value]) => [key, firestoreValue(value)]));
}

async function firestoreRequest(path, init = {}) {
  const token = process.env.PHRASEMAN_FIRESTORE_READ_TOKEN;
  if (!token) throw new Error('PHRASEMAN_FIRESTORE_READ_TOKEN_required');
  const response = await fetch(`${FIRESTORE_BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`firestore_read_failed:${response.status}:${await response.text()}`);
  return response.json();
}

async function readDocument(path) {
  const document = await firestoreRequest(`/${path}`);
  return document ? firestoreFields(document.fields) : null;
}

async function queryEnglishCell(poolVersion, mode, difficulty) {
  const body = {
    structuredQuery: {
      from: [{ collectionId: 'tournamentTasks' }],
      where: {
        compositeFilter: {
          op: 'AND',
          filters: [
            ['poolVersion', { stringValue: poolVersion }],
            ['mode', { stringValue: mode }],
            ['difficulty', { integerValue: String(difficulty) }],
          ].map(([fieldPath, value]) => ({ fieldFilter: { field: { fieldPath }, op: 'EQUAL', value } })),
        },
      },
      orderBy: [{ field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
      limit: 12000,
    },
  };
  const rows = await firestoreRequest(':runQuery', { method: 'POST', body: JSON.stringify(body) });
  return (rows ?? []).flatMap((row) => {
    if (!row.document) return [];
    const id = decodeURIComponent(row.document.name.split('/').at(-1));
    const data = firestoreFields(row.document.fields);
    return [{ ...data, taskId: String(data.taskId || id) }];
  });
}

async function loadEnglishPool() {
  const arenaConfig = await readDocument('arena_v2_config/current');
  const publication = resolveArenaTargetPublication(arenaConfig, 'en');
  if (!publication || publication.legacy !== true) throw new Error('english_legacy_publication_not_ready');
  const tasks = [];
  let rejected = 0;
  for (const mode of MODES) {
    for (let difficulty = 1; difficulty <= 3; difficulty += 1) {
      const rows = await queryEnglishCell(publication.poolVersion, mode, difficulty);
      for (const raw of rows) {
        const valid = raw.mode === mode
          && raw.difficulty === difficulty
          && validateTournamentTaskForNewRoom(raw).ok
          && verifyTournamentPoolTaskProof(raw, publication.merkleRootSha256);
        if (!valid) {
          rejected += 1;
          continue;
        }
        const { arenaPublication: _proof, ...task } = raw;
        tasks.push(task);
      }
    }
  }
  if (rejected > 0 || tasks.length < 4000) {
    throw new Error(`english_pool_gate_failed:accepted=${tasks.length}:rejected=${rejected}`);
  }
  const listenBundle = JSON.parse(readFileSync(join(ROOT, 'functions/src/generated/spire_listen_draft_en.json'), 'utf8'));
  const listen = spireListenDraftPool('en', listenBundle.rows ?? []);
  if (listen.rejected > 0) throw new Error(`english_listen_gate_failed:rejected=${listen.rejected}`);
  return {
    tasks: [...tasks, ...listen.tasks],
    source: {
      poolVersion: publication.poolVersion,
      publicationFingerprint: publication.publicationFingerprint,
      legacyPool: true,
      manifestSha256: publication.manifestSha256,
      merkleRootSha256: publication.merkleRootSha256,
      baseTaskCount: tasks.length,
      listenTaskCount: listen.tasks.length,
    },
  };
}

function loadMultilingualPool(lang) {
  const bundle = JSON.parse(readFileSync(join(ROOT, `functions/src/generated/spire_multilingual_${lang}.json`), 'utf8'));
  if (bundle.manifest?.releaseEligible !== true) throw new Error(`${lang}_manifest_not_releaseEligible`);
  const released = spireReleaseMultilingualPool(lang, bundle.rows ?? [], bundle.manifest);
  if (!released.ok || released.tasks.length !== 4000) {
    throw new Error(`${lang}_release_gate_failed:${released.reason ?? released.tasks.length}`);
  }
  return {
    tasks: released.tasks,
    source: {
      poolVersion: `spire-multilingual-direct-${lang}`,
      publicationFingerprint: bundle.manifest.manifestSha256,
      legacyPool: false,
      manifestSha256: bundle.manifest.manifestSha256,
      tasksSha256: bundle.manifest.tasksSha256,
      baseTaskCount: released.tasks.length,
      listenTaskCount: 0,
    },
  };
}

async function loadFlagSnapshot(lang) {
  const raw = await readDocument(`config/${spireTaskFlagsDocId(lang)}`);
  if (!raw) return { ids: [], exists: false, sha256: sha(null) };
  const parsed = parseSpireTaskFlagsDocStrict(raw, lang);
  const ids = [...spireFlaggedTaskIds(parsed)].sort();
  return { ids, exists: true, sha256: sha(raw) };
}

function isoWeekId(date) {
  const utc = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil((((utc - yearStart) / 86400000) + 1) / 7);
  return `${utc.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

const outputRoot = resolve(arg('--output', join(ROOT, '.codex-tmp', 'spire-local-release-packet-2026-10-03')));
const asOf = new Date(`${arg('--as-of', '2026-10-03')}T12:00:00.000Z`);
if (!Number.isFinite(asOf.getTime())) throw new Error('invalid_as_of');
const next = new Date(asOf.getTime() + 7 * 86400000);
const weekIds = [isoWeekId(asOf), isoWeekId(next)];
const unavailableLangs = {};
const sources = {};
const flags = {};
const packs = [];

mkdirSync(outputRoot, { recursive: true });
for (const lang of LANGS) {
  try {
    const pool = lang === 'en' ? await loadEnglishPool() : loadMultilingualPool(lang);
    const flagSnapshot = await loadFlagSnapshot(lang);
    sources[lang] = pool.source;
    flags[lang] = flagSnapshot;
    for (const weekId of weekIds) {
      for (let tier = 0; tier <= SPIRE_PACK_MAX_TIER; tier += 1) {
        const built = buildSpirePack({
          weekId,
          lang,
          tier,
          pool: pool.tasks,
          timer: SPIRE_CONFIG_DEFAULTS.timer,
          source: {
            poolVersion: pool.source.poolVersion,
            publicationFingerprint: pool.source.publicationFingerprint,
            legacyPool: pool.source.legacyPool,
          },
          excludedTaskIds: flagSnapshot.ids,
        });
        if (!built.ok) throw new Error(`pack_build_failed:${weekId}:${tier}:${built.reason}`);
        const relativePath = spirePackPath(lang, tier, weekId);
        const destination = join(outputRoot, relativePath);
        mkdirSync(dirname(destination), { recursive: true });
        writeFileSync(destination, built.json, 'utf8');
        packs.push({
          lang,
          tier,
          weekId,
          relativePath,
          packHash: built.pack.packHash,
          sha256: sha(built.json),
          bytes: Buffer.byteLength(built.json, 'utf8'),
          slots: built.pack.stats.slots,
          uniqueTasks: built.pack.stats.uniqueTasks,
          excludedFlagged: built.pack.stats.excludedFlagged,
        });
      }
    }
  } catch (error) {
    unavailableLangs[lang] = error instanceof Error ? error.message : String(error);
  }
}

const stagedConfig = { ...SPIRE_CONFIG_DEFAULTS, enabled: true };
writeFileSync(join(outputRoot, 'config.spire_v1.staged.json'), `${JSON.stringify(stagedConfig, null, 2)}\n`, 'utf8');
const manifestBody = {
  schemaVersion: 'spire-local-release-packet-v1',
  projectId: PROJECT_ID,
  asOf: asOf.toISOString(),
  productionMutation: false,
  productionReads: ['arena_v2_config/current', 'config/spire_task_flags_{lang}', 'tournamentTasks(en legacy publication)'],
  langs: LANGS,
  weekIds,
  tiers: Array.from({ length: SPIRE_PACK_MAX_TIER + 1 }, (_, tier) => tier),
  stagedConfig,
  sources,
  flags,
  unavailableLangs,
  packs,
};
const manifest = { ...manifestBody, manifestSha256: sha(manifestBody) };
writeFileSync(join(outputRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

if (Object.keys(unavailableLangs).length > 0 || packs.length !== LANGS.length * weekIds.length * (SPIRE_PACK_MAX_TIER + 1)) {
  console.error(JSON.stringify({ ok: false, outputRoot, unavailableLangs, packs: packs.length }));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ ok: true, outputRoot, manifestSha256: manifest.manifestSha256, packs: packs.length, weekIds }));
}
