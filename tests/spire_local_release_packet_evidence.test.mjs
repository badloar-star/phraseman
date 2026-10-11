import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  verifySpireReleaseManifest,
  verifySpireReleasePacketFiles,
} from '../scripts/verify_spire_local_release_packet.mjs';

const root = resolve(import.meta.dirname, '..');
const evidenceRoot = resolve(root, 'docs/phraseman-2.0/evidence/spire-local-release-packet-2026-10-03');
const packetRoot = resolve(process.env.PHRASEMAN_SPIRE_PACKET_ROOT
  || resolve(root, '.codex-tmp/spire-local-release-packet-2026-10-03'));

test('tracked receipt binds all 120 packs, staged config, sources and quarantine snapshots', () => {
  const result = verifySpireReleaseManifest({
    manifestPath: resolve(evidenceRoot, 'release-manifest.json'),
    configPath: resolve(evidenceRoot, 'config.spire_v1.staged.json'),
    root,
  });
  assert.equal(result.ok, true);
  assert.equal(result.manifestSha256, 'fa853815f475eea294e525928976632bb5e8df234f0ebe55484fd3a256344056');
  assert.equal(result.packCount, 120);
  assert.deepEqual(result.unavailableLangs, {});
});

test('durable local packet bytes match every tracked checksum receipt', () => {
  assert.equal(existsSync(packetRoot), true, 'durable local packet is missing');
  const result = verifySpireReleasePacketFiles({
    manifestPath: resolve(evidenceRoot, 'release-manifest.json'),
    packetRoot,
  });
  assert.deepEqual(result, { ok: true, verified: 120, bad: [] });
});
