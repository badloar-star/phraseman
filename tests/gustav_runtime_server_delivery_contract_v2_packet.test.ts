import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const RUN = 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1';
const RUN_DIR = path.join(ROOT, RUN);
const REPORT_PATH = path.join(RUN_DIR, 'audits', 'runtime_server_delivery_contract_v2_packet.json');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_runtime_server_delivery_contract_v2_packet.ts'),
  'utf8',
);

type RuntimeServerDeliveryReport = {
  status: string;
  summary: {
    runtimeSlicesMissingPayload: number;
    requiredRuntimeSlices: number;
    requiredRuntimeSlicesWithClosedActivation: number;
    serverManifestCreated: boolean;
    coursePackRemoteLoadingEnabled: boolean;
    activationApprovedFlags: number;
    runtimeDownloadsOpenFlags: number;
    readyForRuntimeDownloadActivation: boolean;
    readyForApply: boolean;
    blockers: number;
  };
  contract: {
    requiredRuntimeSlices: {
      sliceManifestCreated: boolean;
      entryIndexCreated: boolean;
      payloadShardCreated: boolean;
      runtimeManifestAllowedNow: boolean;
      activationApproved: boolean;
      blockedBy: string[];
    }[];
    serverDeliveryContract: {
      serverManifestCreated: boolean;
      downloadablePacksPublished: boolean;
      serverUploadAllowed: boolean;
      firebaseUploadAllowed: boolean;
    };
    runtimeActivationPolicy: {
      activationApproved: boolean;
      runtimeDownloadsEnabled: boolean;
      readyForApply: boolean;
      mayModifyProductionAppFiles: boolean;
    };
    productionBlockerMap: { blockerId: string }[];
  };
  safety: {
    firebaseOrServerUploadStarted: boolean;
    runtimeDownloadsEnabled: boolean;
    productionApplyApproved: boolean;
  };
};

function readReport(): RuntimeServerDeliveryReport {
  return JSON.parse(fs.readFileSync(REPORT_PATH, 'utf8')) as RuntimeServerDeliveryReport;
}

describe('Gustav runtime/server delivery contract V2 packet', () => {
  it('reflects materialized local runtime artifacts without opening production runtime', () => {
    const report = readReport();

    expect(report.status).toBe('PASS');
    expect(report.summary.requiredRuntimeSlices).toBe(12);
    expect(report.summary.runtimeSlicesMissingPayload).toBe(0);
    expect(report.summary.serverManifestCreated).toBe(true);
    expect(report.summary.requiredRuntimeSlicesWithClosedActivation).toBe(12);
    expect(report.summary.coursePackRemoteLoadingEnabled).toBe(false);
    expect(report.summary.activationApprovedFlags).toBe(0);
    expect(report.summary.runtimeDownloadsOpenFlags).toBe(0);
    expect(report.summary.readyForRuntimeDownloadActivation).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.summary.blockers).toBe(0);

    for (const slice of report.contract.requiredRuntimeSlices) {
      expect(slice.sliceManifestCreated).toBe(true);
      expect(slice.entryIndexCreated).toBe(true);
      expect(slice.payloadShardCreated).toBe(true);
      expect(slice.runtimeManifestAllowedNow).toBe(false);
      expect(slice.activationApproved).toBe(false);
      expect(slice.blockedBy).not.toContain('runtime_payload_shard_not_created');
    }
  });

  it('keeps upload, publication, activation and app apply closed', () => {
    const report = readReport();
    const blockerIds = report.contract.productionBlockerMap.map((blocker) => blocker.blockerId);

    expect(report.contract.serverDeliveryContract.serverManifestCreated).toBe(true);
    expect(report.contract.serverDeliveryContract.downloadablePacksPublished).toBe(false);
    expect(report.contract.serverDeliveryContract.serverUploadAllowed).toBe(false);
    expect(report.contract.serverDeliveryContract.firebaseUploadAllowed).toBe(false);
    expect(report.contract.runtimeActivationPolicy.activationApproved).toBe(false);
    expect(report.contract.runtimeActivationPolicy.runtimeDownloadsEnabled).toBe(false);
    expect(report.contract.runtimeActivationPolicy.readyForApply).toBe(false);
    expect(report.contract.runtimeActivationPolicy.mayModifyProductionAppFiles).toBe(false);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.safety.runtimeDownloadsEnabled).toBe(false);
    expect(report.safety.productionApplyApproved).toBe(false);
    expect(blockerIds).not.toContain('P10-RUNTIME-004-payload-shards-missing');
    expect(blockerIds).not.toContain('P10-SERVER-001-server-manifest-missing');
    expect(blockerIds).toContain('P10-ACTIVATION-001-activation-not-approved');
  });

  it('guards against reverting to hardcoded missing payload/server evidence', () => {
    expect(SOURCE).toContain('fs.existsSync(payloadShardPath)');
    expect(SOURCE).toContain('fs.existsSync(serverDeliveryManifestPath)');
    expect(SOURCE).toContain('downloadablePacksPublished: false');
    expect(SOURCE).not.toContain('payloadShardCreated: false,');
    expect(SOURCE).not.toContain('serverManifestCreated: false,');
  });
});
