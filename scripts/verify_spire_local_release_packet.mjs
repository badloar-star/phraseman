#!/usr/bin/env node

/**
 * Offline verifier for the tracked Spire release receipt and optional durable
 * local packet bytes. It performs no network requests and no mutations.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const LANGS = Object.freeze(['en', 'es', 'fr', 'de', 'it']);
const WEEKS = Object.freeze(['2026-W40', '2026-W41']);
const TIERS = Object.freeze(Array.from({ length: 12 }, (_, tier) => tier));
const HASH = /^[a-f0-9]{64}$/u;
const PACK_HASH = /^sp1_[A-Za-z0-9_-]{32}$/u;

function sha(value) {
  const bytes = typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(value);
  return createHash('sha256').update(bytes).digest('hex');
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function exactArray(actual, expected, code) {
  if (!Array.isArray(actual) || actual.length !== expected.length
    || actual.some((value, index) => value !== expected[index])) throw new Error(code);
}

export function verifySpireReleaseManifest({ manifestPath, configPath, root }) {
  const manifest = readJson(manifestPath);
  const { manifestSha256, ...body } = manifest;
  if (manifest.schemaVersion !== 'spire-local-release-packet-v1') throw new Error('packet_schema_invalid');
  if (manifest.projectId !== 'phraseman-ea0b3') throw new Error('packet_project_invalid');
  if (manifest.productionMutation !== false) throw new Error('packet_mutation_claim_invalid');
  if (!HASH.test(String(manifestSha256)) || sha(body) !== manifestSha256) throw new Error('packet_manifest_hash_invalid');
  exactArray(manifest.langs, LANGS, 'packet_langs_invalid');
  exactArray(manifest.weekIds, WEEKS, 'packet_weeks_invalid');
  exactArray(manifest.tiers, TIERS, 'packet_tiers_invalid');
  if (!manifest.unavailableLangs || Object.keys(manifest.unavailableLangs).length !== 0) {
    throw new Error('packet_unavailable_langs_not_empty');
  }

  const stagedConfig = readJson(configPath);
  if (stagedConfig.enabled !== true || JSON.stringify(stagedConfig) !== JSON.stringify(manifest.stagedConfig)) {
    throw new Error('packet_staged_config_mismatch');
  }

  const expectedPaths = new Set();
  for (const lang of LANGS) for (const weekId of WEEKS) for (const tier of TIERS) {
    expectedPaths.add(`spire_packs/${lang}/${tier}/${weekId}.json`);
  }
  if (!Array.isArray(manifest.packs) || manifest.packs.length !== expectedPaths.size) throw new Error('packet_count_invalid');
  for (const pack of manifest.packs) {
    if (!expectedPaths.delete(pack.relativePath)) throw new Error(`packet_path_invalid:${pack.relativePath}`);
    if (!HASH.test(String(pack.sha256)) || !PACK_HASH.test(String(pack.packHash))) throw new Error(`packet_hash_invalid:${pack.relativePath}`);
    if (!Number.isSafeInteger(pack.bytes) || pack.bytes < 1 || pack.slots !== 4050
      || !Number.isSafeInteger(pack.uniqueTasks) || pack.uniqueTasks < 1 || pack.excludedFlagged !== 0) {
      throw new Error(`packet_stats_invalid:${pack.relativePath}`);
    }
  }
  if (expectedPaths.size !== 0) throw new Error('packet_matrix_incomplete');

  for (const lang of LANGS) {
    const flags = manifest.flags?.[lang];
    if (!flags || !Array.isArray(flags.ids) || flags.ids.length !== 0 || flags.exists !== false
      || flags.sha256 !== sha(null)) throw new Error(`packet_flags_invalid:${lang}`);
    const source = manifest.sources?.[lang];
    if (!source || source.baseTaskCount !== 4000) throw new Error(`packet_source_invalid:${lang}`);
    if (lang === 'en') {
      if (source.legacyPool !== true || source.listenTaskCount !== 611
        || !HASH.test(String(source.manifestSha256)) || !HASH.test(String(source.merkleRootSha256))
        || !HASH.test(String(source.publicationFingerprint))) throw new Error('packet_en_provenance_invalid');
      continue;
    }
    const sourceManifest = readJson(resolve(root, `content/arena-multilingual/generated/${lang}/manifest.json`));
    if (source.legacyPool !== false || source.listenTaskCount !== 0
      || source.manifestSha256 !== sourceManifest.manifestSha256
      || source.publicationFingerprint !== sourceManifest.manifestSha256
      || source.tasksSha256 !== sourceManifest.tasksSha256
      || sourceManifest.verdict !== 'PASS' || sourceManifest.releaseEligible !== true) {
      throw new Error(`packet_multilingual_source_mismatch:${lang}`);
    }
  }

  return Object.freeze({
    ok: true,
    manifestSha256,
    packCount: manifest.packs.length,
    unavailableLangs: manifest.unavailableLangs,
  });
}

export function verifySpireReleasePacketFiles({ manifestPath, packetRoot }) {
  const manifest = readJson(manifestPath);
  const bad = [];
  for (const pack of manifest.packs ?? []) {
    try {
      const bytes = readFileSync(resolve(packetRoot, pack.relativePath));
      if (bytes.length !== pack.bytes || sha(bytes) !== pack.sha256) bad.push(pack.relativePath);
    } catch {
      bad.push(pack.relativePath);
    }
  }
  return Object.freeze({ ok: bad.length === 0, verified: (manifest.packs ?? []).length - bad.length, bad });
}

function arg(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const root = resolve(import.meta.dirname, '..');
  const evidenceRoot = resolve(root, 'docs/phraseman-2.0/evidence/spire-local-release-packet-2026-10-03');
  const manifestPath = resolve(arg('--manifest', resolve(evidenceRoot, 'release-manifest.json')));
  const configPath = resolve(arg('--config', resolve(evidenceRoot, 'config.spire_v1.staged.json')));
  const packetRoot = arg('--packet-root', '');
  const manifest = verifySpireReleaseManifest({ manifestPath, configPath, root });
  const files = packetRoot ? verifySpireReleasePacketFiles({ manifestPath, packetRoot: resolve(packetRoot) }) : null;
  if (files && !files.ok) process.exitCode = 1;
  console.log(JSON.stringify({ ...manifest, files }));
}
