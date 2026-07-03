import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { promoteProductionServerManifestLocally } from '../scripts/gustav_production_server_manifest_local_promotion_v2_packet';

const FIXTURE_RUN = path.join(process.cwd(), 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(process.cwd(), 'scripts/gustav_production_server_manifest_local_promotion_v2_packet.ts'),
  'utf8',
);

function copyFixtureRun(): string {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'gustav-local-promotion-'));
  const runDir = path.join(tempRoot, 'run');
  fs.mkdirSync(path.join(runDir, 'pack_candidates/fr'), { recursive: true });
  fs.copyFileSync(
    path.join(FIXTURE_RUN, 'pack_candidates/fr/server_delivery_manifest_v2_draft.json'),
    path.join(runDir, 'pack_candidates/fr/server_delivery_manifest_v2_draft.json'),
  );
  return runDir;
}

describe('Gustav production server manifest local promotion V2 packet', () => {
  it('creates only a closed local production manifest artifact and never uploads or activates', () => {
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).toContain("manifestMode: 'local_production_manifest_upload_pending'");
  });

  it('locally promotes the audited draft into server_delivery_manifest_v2.json with closed flags', () => {
    const runDir = copyFixtureRun();
    const draftPath = path.join(runDir, 'pack_candidates/fr/server_delivery_manifest_v2_draft.json');
    const productionPath = path.join(runDir, 'pack_candidates/fr/server_delivery_manifest_v2.json');

    const result = promoteProductionServerManifestLocally({
      repoRoot: process.cwd(),
      runDir,
      draftPath,
      productionPath,
      force: false,
    });

    expect(result.status).toBe('PASS');
    expect(result.productionManifestWritten).toBe(true);
    expect(result.summary.productionManifestPresentAfter).toBe(true);
    expect(result.summary.productionManifestEntries).toBe(12);
    expect(result.summary.closedEntryFlags).toBe(12);
    expect(result.summary.runtimeDownloadsEnabled).toBe(false);
    expect(result.summary.activationApproved).toBe(false);

    const production = JSON.parse(fs.readFileSync(productionPath, 'utf8'));
    expect(production.schemaVersion).toBe('gustav-server-delivery-manifest-v2');
    expect(production.manifestMode).toBe('local_production_manifest_upload_pending');
    expect(production.serverUploadAllowed).toBe(false);
    expect(production.downloadablePacksPublished).toBe(false);
    expect(production.readyForRuntimeDownloadActivation).toBe(false);
  });

  it('blocks rather than overwriting a differing production manifest without force', () => {
    const runDir = copyFixtureRun();
    const draftPath = path.join(runDir, 'pack_candidates/fr/server_delivery_manifest_v2_draft.json');
    const productionPath = path.join(runDir, 'pack_candidates/fr/server_delivery_manifest_v2.json');
    fs.writeFileSync(productionPath, '{"studyTarget":"fr","entries":[]}\n', 'utf8');

    const result = promoteProductionServerManifestLocally({
      repoRoot: process.cwd(),
      runDir,
      draftPath,
      productionPath,
      force: false,
    });

    expect(result.status).toBe('BLOCK');
    expect(result.productionManifestWritten).toBe(false);
    expect(result.findings.some((finding) => finding.code === 'production_manifest_exists_without_force')).toBe(true);
  });
});
