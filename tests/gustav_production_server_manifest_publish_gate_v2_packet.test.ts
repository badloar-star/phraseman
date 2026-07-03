import * as fs from 'node:fs';
import * as path from 'node:path';
import { evaluateProductionServerManifestPublishGate } from '../scripts/gustav_production_server_manifest_publish_gate_v2_packet';

const SCRIPT = path.join(process.cwd(), 'scripts/gustav_production_server_manifest_publish_gate_v2_packet.ts');
const SOURCE = fs.readFileSync(SCRIPT, 'utf8');
const FIXTURE_RUN = path.join(process.cwd(), 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');

function readDraft(): Record<string, any> {
  return JSON.parse(fs.readFileSync(
    path.join(FIXTURE_RUN, 'pack_candidates/fr/server_delivery_manifest_v2_draft.json'),
    'utf8',
  ));
}

function evaluate(production: Record<string, any> | null) {
  const draftPath = path.join(FIXTURE_RUN, 'pack_candidates/fr/server_delivery_manifest_v2_draft.json');
  const productionPath = path.join(FIXTURE_RUN, 'pack_candidates/fr/server_delivery_manifest_v2.json');
  return evaluateProductionServerManifestPublishGate({
    repoRoot: process.cwd(),
    draftPath,
    productionPath,
    draft: readDraft(),
    production,
  });
}

describe('Gustav production server manifest publish gate V2 packet', () => {
  it('is audit-only and never creates or uploads the production manifest itself', () => {
    expect(SOURCE).toContain('productionServerManifestCreatedByThisScript: false');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabled: false');
    expect(SOURCE).toContain('activationApproved: false');
    expect(SOURCE).not.toMatch(/fs\.writeFileSync\(productionPath/);
  });

  it('holds when production server manifest is not published yet', () => {
    const report = evaluate(null);

    expect(report.summary.publishGateState).toBe('waiting_for_published_production_manifest');
    expect(report.summary.productionManifestPresent).toBe(false);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(false);
    expect(report.findings.some((finding: any) => finding.code === 'production_server_manifest_missing')).toBe(true);
  });

  it('passes for a closed production manifest that exactly matches the audited draft', () => {
    const production = readDraft();
    production.schemaVersion = 'gustav-server-delivery-manifest-v2';
    production.manifestMode = 'production_published_pre_activation';

    const report = evaluate(production);

    expect(report.summary.publishGateState).toBe('production_server_manifest_ready_for_activation_gate');
    expect(report.summary.productionEntries).toBe(12);
    expect(report.summary.productionEntriesMatchingDraftPayload).toBe(12);
    expect(report.summary.productionEntriesClosedActivation).toBe(12);
    expect(report.summary.productionEntriesClosedRuntimeDownloads).toBe(12);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(true);
  });

  it('blocks if the production manifest opens runtime or activation flags', () => {
    const production = readDraft();
    production.entries[0].activationApproved = true;
    production.runtimeDownloadsEnabled = true;

    const report = evaluate(production);

    expect(report.summary.publishGateState).toBe('blocked_by_findings');
    expect(report.findings.some((finding: any) => finding.code === 'production_manifest_entry_flags_open')).toBe(true);
    expect(report.findings.some((finding: any) => finding.code === 'production_manifest_top_level_flags_open')).toBe(true);
  });
});
