import { readFileSync } from 'fs';
import path from 'path';

import {
  PERSONAL_PLANS_PROGRESS_BROWSER_REPORT_PATH,
  buildPersonalPlansProgressBrowserReport,
  isPersonalPlansProgressBrowserReportTargetAllowed,
  writePersonalPlansProgressBrowserReport,
} from '../tools/personal_plan_progress_browser_report';

const progressInput = {
  generatedAt: '2026-06-04T00:00:00.000Z',
  handoverPath: 'docs/reports/personal-plans-handover-2026-06-04-after-p3104.md',
  latestCheckpoint: 'P3.109 Browser progress report',
  overallPercent: 77,
  layers: [
    { id: 'content', label: 'Content/reviewer packets', percent: 95, status: 'blocked by live approval' },
    { id: 'audio', label: 'Audio approval', percent: 58, status: 'blocked by missing MP3 assets' },
    { id: 'pronunciation', label: 'Pronunciation scoring', percent: 62, status: 'blocked by missing real scorer evidence' },
    { id: 'verification', label: 'Verification', percent: 99, status: 'broad gate green' },
    { id: 'route', label: 'Live route/UI', percent: 59, status: 'blocked by explicit signed approval' },
  ],
  completedPasses: [
    'P3.105 Audio generation handoff packet',
    'P3.106 Generated audio intake/validation report',
    'P3.107 Route prerequisite artifact refresh',
    'P3.108 Pronunciation scoring provider contract',
    'P3.109 Browser progress report',
  ],
  blockers: [
    '10 real MP3 assets are still missing.',
    'Explicit audio approval records are still missing.',
    'Real pronunciation recording/scorer evidence is still missing.',
    'Live route approval cannot be inferred from dry-run artifacts.',
  ],
  verification: [
    'Focused browser report Jest: pending in red phase',
    'Broad Personal Plans Jest must pass before completion',
    'TypeScript must pass before completion',
  ],
};

describe('Personal Plans browser progress report', () => {
  it('builds a browser-readable report without claiming production readiness', () => {
    const result = buildPersonalPlansProgressBrowserReport(progressInput);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.html).toContain('<!doctype html>');
    expect(result.html).toContain('Personal Plans Progress');
    expect(result.html).toContain('Overall 77%');
    expect(result.html).toContain('Audio approval');
    expect(result.html).toContain('58%');
    expect(result.html).toContain('Pronunciation scoring');
    expect(result.html).toContain('62%');
    expect(result.html).toContain('Not production-ready yet');
    expect(result.summary).toEqual({
      overallPercent: 77,
      layerCount: 5,
      completedPassCount: 5,
      blockerCount: 4,
      productionReady: false,
    });
  });

  it('rejects fake 100 percent production readiness while blockers remain', () => {
    const result = buildPersonalPlansProgressBrowserReport({
      ...progressInput,
      overallPercent: 100,
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual({
      code: 'fake_production_ready_progress_claim',
      detail: 'Overall progress cannot be 100 while explicit blockers remain.',
    });
  });

  it('writes deterministic HTML only under temp or report roots', () => {
    const targetPath = path.join(
      process.cwd(),
      'docs',
      'reports',
      'personal-plans-progress-browser-report.test.html',
    );
    const result = writePersonalPlansProgressBrowserReport(progressInput, { targetPath });

    expect(result.valid).toBe(true);
    expect(result.targetPath).toBe(targetPath);
    expect(result.bytesWritten).toBeGreaterThan(1000);
    expect(isPersonalPlansProgressBrowserReportTargetAllowed(targetPath)).toBe(true);

    const html = readFileSync(targetPath, 'utf8');
    expect(html).toContain('Personal Plans Progress');
    expect(html).toContain('Broad Personal Plans Jest must pass before completion');
  });

  it('rejects source, asset, and root config write targets', () => {
    for (const targetPath of [
      path.join(process.cwd(), 'app', 'personal_plan_progress_report.tsx'),
      path.join(process.cwd(), 'assets', 'personal-plans-progress.html'),
      path.join(process.cwd(), 'package.json'),
    ]) {
      const result = writePersonalPlansProgressBrowserReport(progressInput, { targetPath });

      expect(result.valid).toBe(false);
      expect(result.issues).toContainEqual({
        code: 'target_path_not_allowed',
        detail: 'Personal Plans browser progress report can only write under .codex-tmp or docs/reports.',
      });
    }
  });

  it('does not import or mutate runtime UI storage navigation audio or scoring systems', () => {
    const source = readFileSync(
      path.join(process.cwd(), 'tools', 'personal_plan_progress_browser_report.ts'),
      'utf8',
    );

    for (const forbidden of [
      'react-native',
      'AsyncStorage',
      'navigation',
      'expo-av',
      'expo-audio',
      'personal_plan_exercise.tsx',
      'personal_plan_audio_openai_worker',
      'openai',
      'child_process',
    ]) {
      expect(source).not.toContain(forbidden);
    }
  });

  it('exposes the canonical browser report path', () => {
    expect(PERSONAL_PLANS_PROGRESS_BROWSER_REPORT_PATH).toBe(path.join(
      process.cwd(),
      'docs',
      'reports',
      'personal-plans-progress-browser-report.html',
    ));
  });
});
