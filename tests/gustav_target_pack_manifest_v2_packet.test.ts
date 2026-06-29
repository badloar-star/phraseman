import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

describe('Gustav target pack manifest V2 packet generator', () => {
  const source = fs.readFileSync(path.join(ROOT, 'scripts', 'gustav_target_pack_manifest_v2_packet.ts'), 'utf8');

  it('syncs runtime slice summary from local materialized payload artifacts instead of hard-coding not-created slices', () => {
    expect(source).toContain("path.join(runDir, 'pack_candidates', 'fr', 'runtime_slices', sourceLocale, surface)");
    expect(source).toContain("runtimeManifestStatus: 'local_materialized'");
    expect(source).toContain("cacheKeyStatus: 'local_cache_key_materialized'");
    expect(source).toContain("loaderStatus: 'blocked_until_upload_activation_gate'");
    expect(source).toContain('payloadSha256: sha256(payloadPath)');
    expect(source).toContain('payloadBytes: fs.statSync(payloadPath).size');
  });

  it('keeps materialized French slices blocked from production activation and upload/download', () => {
    expect(source).toContain("activationApproved: false");
    expect(source).toContain("runtimeDownloadsEnabled: false");
    expect(source).toContain("serverUploadAllowed: false");
    expect(source).toContain("firebaseUploadAllowed: false");
    expect(source).toContain("downloadablePacksPublished: false");
    expect(source).toContain('blocked_until_upload_activation_gate');
    expect(source).toContain('Runtime payload shards are materialized locally for all required slices, but remain blocked from upload/download/activation.');
  });

  it('keeps server delivery path closed in the target manifest until the dedicated server gate approves it', () => {
    expect(source).toContain("serverManifestPath: null");
    expect(source).not.toMatch(/serverUploadAllowed:\s*true|firebaseUploadAllowed:\s*true|downloadablePacksPublished:\s*true/);
  });
});
