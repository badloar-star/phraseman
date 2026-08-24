import * as fs from 'node:fs';
import * as path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_dev_surface_navigation_guard_v2_packet.ts'),
  'utf8',
);

describe('Gustav French dev surface navigation guard V2 packet', () => {
  it('tracks challenge and mistake-practice surfaces as explicit guarded groups', () => {
    expect(SOURCE).toContain('challengeSurfaceGuardsReady');
    expect(SOURCE).toContain('mistakePracticeTargetScopeReady');
    expect(SOURCE).toContain('challenge_surface_guards_not_ready');
    expect(SOURCE).toContain("'quiz_thematic_challenges_visible_while_source_gated'");
    expect(SOURCE).toContain("'mistake_practice_session_target_scope'");
    expect(SOURCE).toContain("'mistake_practice_store_target_scope'");
  });

  it('keeps the navigation guard read-only and production closed', () => {
    expect(SOURCE).toContain('productionAppFilesModifiedByThisScript: false');
    expect(SOURCE).toContain('activationApprovedByThisScript: false');
    expect(SOURCE).toContain('runtimeDownloadsEnabledByThisScript: false');
    expect(SOURCE).toContain('serverUploadStartedByThisScript: false');
  });
});
