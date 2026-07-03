import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  buildFrenchAppSurfaceParity,
} from '../scripts/gustav_french_app_surface_parity_v2_packet';

const ROOT = path.resolve(__dirname, '..');
const RUN_DIR = path.join(ROOT, 'docs/gustav/runs/2026-05-19_fr_inventory_v0a1');
const SOURCE = fs.readFileSync(
  path.join(ROOT, 'scripts', 'gustav_french_app_surface_parity_v2_packet.ts'),
  'utf8',
);

describe('Gustav French app surface parity V2 packet', () => {
  it('proves French dev-visible app surfaces are classified separately from remote pack surfaces', () => {
    const report = buildFrenchAppSurfaceParity({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.status).toBe('PASS');
    expect(report.summary.remotePackSurfaces).toBe(6);
    expect(report.summary.requiredRemotePackSurfaces).toBe(6);
    expect(report.summary.missingRemotePackSurfaces).toEqual([]);
    expect(report.summary.extraRemotePackSurfaces).toEqual([]);
    expect(report.summary.currentAppDomains).toBeGreaterThanOrEqual(7);
    expect(report.summary.challengeDailyArenaCoveredByNavigationGuard).toBe(true);
    expect(report.summary.challengeSurfaceGuardsReady).toBe(true);
    expect(report.summary.dailySurfaceGuardsReady).toBe(true);
    expect(report.summary.arenaSurfaceGuardsReady).toBe(true);
    expect(report.summary.challengeSurfaceProbes).toBeGreaterThanOrEqual(6);
    expect(report.summary.dailySurfaceProbes).toBeGreaterThanOrEqual(13);
    expect(report.summary.arenaSurfaceProbes).toBeGreaterThanOrEqual(5);
    expect(report.summary.challengeDailyArenaRequiresExtraPackSurface).toBe(false);
    expect(report.summary.devNavigationProbesPassed).toBe(report.summary.devNavigationProbes);
    expect(report.remotePackSurfaces).toEqual([
      'lesson',
      'lesson_intro',
      'quiz',
      'audio_metadata',
      'flashcard',
      'personal_practice',
    ]);
  });

  it('keeps parity audit read-only and production-closed', () => {
    const report = buildFrenchAppSurfaceParity({
      repoRoot: ROOT,
      runDir: RUN_DIR,
      generatedAt: '2026-06-29T00:00:00.000Z',
    });

    expect(report.summary.activationApproved).toBe(false);
    expect(report.summary.readyForApply).toBe(false);
    expect(report.summary.mayModifyProductionAppFiles).toBe(false);
    expect(report.safety.productionAppFilesModifiedByThisScript).toBe(false);
    expect(report.safety.firebaseOrServerUploadStarted).toBe(false);
    expect(report.safety.runtimeDownloadsEnabled).toBe(false);
    expect(report.safety.productionApplyApproved).toBe(false);
  });

  it('hard-codes challenge/daily/arena as guarded navigation surfaces, not missing pack surfaces', () => {
    expect(SOURCE).toContain('challengeDailyArenaCoveredByNavigationGuard');
    expect(SOURCE).toContain('challengeSurfaceGuardsReady');
    expect(SOURCE).toContain('dailySurfaceGuardsReady');
    expect(SOURCE).toContain('arenaSurfaceGuardsReady');
    expect(SOURCE).toContain('challenge_surface_guards_not_ready');
    expect(SOURCE).toContain('daily_surface_guards_not_ready');
    expect(SOURCE).toContain('arena_surface_guards_not_ready');
    expect(SOURCE).toContain('challengeDailyArenaRequiresExtraPackSurface: false');
    expect(SOURCE).toContain('Challenges/daily/arena require extra pack surface');
    expect(SOURCE).toContain('firebaseOrServerUploadStarted: false');
    expect(SOURCE).toContain('activationApproved: false');
  });
});
