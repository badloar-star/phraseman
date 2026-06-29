import fs from 'node:fs';
import path from 'node:path';

import { writeHeisenbergReleaseBlockerMatrix } from '../scripts/heisenberg_release_blocker_matrix';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/release-blocker-matrix';
const GENERATED_AT = '2026-06-28T11:00:00.000Z';

function rel(file: string): string {
  return `${RUN_ROOT_RELATIVE}/${file}`;
}

function abs(file: string): string {
  return path.join(ROOT, rel(file));
}

function writeJson(file: string, value: unknown): void {
  fs.mkdirSync(path.dirname(abs(file)), { recursive: true });
  fs.writeFileSync(abs(file), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function cleanRunRoot(): void {
  fs.rmSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true, force: true });
  fs.mkdirSync(path.join(ROOT, RUN_ROOT_RELATIVE), { recursive: true });
}

function writeEvidence(): void {
  writeJson('production_readiness_gate.json', {
    schemaVersion: 'heisenberg-production-readiness-gate-v1',
    mode: 'production-readiness-gate',
    generatedAt: GENERATED_AT,
    status: 'HOLD',
    summary: {
      locales: 2,
      readyLocales: 0,
      blockedLocales: 2,
      blockers: 9,
      warnings: 2,
      semanticClearanceReady: false,
      sourceApplyCandidateReady: false,
      activationApproved: false,
      remoteLoadingEnabled: false,
      runtimeManifestRegistered: false,
      generatedApprovals: false,
      runtimeSourceMutation: false,
    },
    evidence: {},
    languages: [
      {
        locale: 'es',
        status: 'HOLD',
        progressPercent: 17,
        passedRequiredGates: 1,
        requiredGates: 6,
        gates: {
          batchCoverage: { status: 'PASS', blockers: [], warnings: [] },
          uiLocale: {
            status: 'HOLD',
            blockers: ['UI audit has 19 blocker finding(s) for this locale'],
            warnings: [],
          },
          semantic: {
            status: 'HOLD',
            blockers: ['semantic warnings require reviewer clearance or fixes (1)'],
            warnings: ['semantic audit has 1 warning finding(s) for this locale'],
            counts: { localeWarnings: 1 },
          },
          quizPayloadRepair: { status: 'NA', blockers: [], warnings: [] },
          productionPack: {
            status: 'HOLD',
            blockers: ['production release evidence is missing'],
            warnings: [],
          },
          approvals: {
            status: 'HOLD',
            blockers: ['production reviewer/locale approval evidence is missing'],
            warnings: [],
          },
          serverRuntime: {
            status: 'HOLD',
            blockers: ['server/runtime activation evidence is missing'],
            warnings: [],
          },
        },
        blockers: [],
        warnings: [],
      },
      {
        locale: 'pt-BR',
        status: 'HOLD',
        progressPercent: 14,
        passedRequiredGates: 1,
        requiredGates: 7,
        gates: {
          batchCoverage: { status: 'PASS', blockers: [], warnings: [] },
          uiLocale: {
            status: 'HOLD',
            blockers: ['UI audit has 3 blocker finding(s) for this locale'],
            warnings: [],
          },
          semantic: {
            status: 'HOLD',
            blockers: [
              'shared structured quiz payload repair has 163 blocker(s)',
              'semantic warnings require reviewer clearance or fixes (248)',
            ],
            warnings: ['semantic audit has 248 warning finding(s) for this locale'],
            counts: { sharedQuizBlockers: 163, localeWarnings: 248 },
          },
          quizPayloadRepair: {
            status: 'HOLD',
            blockers: [
              'quiz source-apply candidate is not ready',
              'external filled Heisenberg quiz payload repair work-order artifact is missing',
            ],
            warnings: [],
          },
          productionPack: {
            status: 'HOLD',
            blockers: ['production release evidence is missing'],
            warnings: [],
          },
          approvals: {
            status: 'HOLD',
            blockers: ['production reviewer/locale approval evidence is missing'],
            warnings: [],
          },
          serverRuntime: {
            status: 'HOLD',
            blockers: ['server/runtime activation evidence is missing'],
            warnings: [],
          },
        },
        blockers: [],
        warnings: [],
      },
    ],
  });
  writeJson('semantic_clearance_validation.json', {
    schemaVersion: 'heisenberg-semantic-clearance-validation-v1',
    status: 'HOLD',
    semanticWarnings: 249,
  });
  writeJson('release_evidence_validation.json', {
    schemaVersion: 'heisenberg-production-release-evidence-validation-v1',
    status: 'HOLD',
    validationStatus: 'MISSING_RELEASE_EVIDENCE',
  });
  writeJson('filled_work_order_validation.json', {
    schemaVersion: 'heisenberg-quiz-payload-repair-filled-work-order-validation-v1',
    status: 'HOLD',
    sourceApplyCandidateReady: false,
  });
  writeJson('ui_locale_audit.json', {
    mode: 'ui-locale-audit',
    summary: { findings: 22 },
  });
  writeJson('ui_mojibake_repair_dashboard.json', {
    schemaVersion: 'heisenberg-ui-mojibake-repair-dashboard-v1',
    mode: 'ui-mojibake-repair-dashboard',
    status: 'HOLD',
    tasks: [
      {
        taskId: 'ui-mojibake:1:echo:es:10',
        file: 'app/plan_content_echo.ts',
        locale: 'es',
      },
      {
        taskId: 'ui-mojibake:2:echo:pt-br:11',
        file: 'app/plan_content_echo.ts',
        locale: 'pt-BR',
      },
      {
        taskId: 'ui-mojibake:3:gavan:pt-br:12',
        file: 'app/plan_content_gavan.ts',
        locale: 'pt-BR',
      },
    ],
  });
  writeJson('semantic_audit.json', {
    mode: 'semantic-audit',
    summary: { warnings: 249 },
  });
}

function runMatrix(extraOptions: Record<string, string | boolean> = {}) {
  return writeHeisenbergReleaseBlockerMatrix(ROOT, {
    readinessPath: rel('production_readiness_gate.json'),
    semanticClearanceValidationPath: rel('semantic_clearance_validation.json'),
    releaseEvidenceValidationPath: rel('release_evidence_validation.json'),
    quizValidationPath: rel('filled_work_order_validation.json'),
    uiAuditPath: rel('ui_locale_audit.json'),
    uiMojibakeDashboardPath: rel('ui_mojibake_repair_dashboard.json'),
    semanticAuditPath: rel('semantic_audit.json'),
    outputDir: rel('out'),
    generatedAt: GENERATED_AT,
    ...extraOptions,
  });
}

describe('heisenberg release blocker matrix', () => {
  beforeEach(() => {
    cleanRunRoot();
    writeEvidence();
  });

  it('exposes the release blocker matrix through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'heisenberg:blocker-matrix': 'npx tsx ./scripts/heisenberg_release_blocker_matrix.ts',
    });
  });

  it('groups open blockers by locale and next required artifact', () => {
    const result = runMatrix();

    expect(result.report).toMatchObject({
      schemaVersion: 'heisenberg-release-blocker-matrix-v1',
      status: 'HOLD',
      summary: {
        locales: 2,
        readyLocales: 0,
        blockedLocales: 2,
        semanticWarnings: 249,
        semanticClearanceReady: false,
        quizSourceApplyCandidateReady: false,
        releaseEvidenceReady: false,
      },
    });
    expect(result.report.summary.nextRequiredArtifacts).toMatchObject({
      'clean ui_locale_audit.json': 2,
      'semantic_clearance.json with real reviewer evidence': 2,
      'filled_work_order.json with real quiz payload evidence': 3,
      'release_evidence.json with fresh pack hashes': 2,
      'release_evidence.json with reviewer/locale/product approvals': 2,
      'release_evidence.json with offline/cache/rollback/storage/runtime evidence': 2,
    });
    const pt = result.report.languages.find((language) => language.locale === 'pt-BR');
    expect(pt?.blockers.map((blocker) => blocker.category)).toEqual(expect.arrayContaining([
      'ui-locale',
      'semantic-clearance',
      'quiz-repair',
      'production-pack',
      'approvals',
      'server-runtime',
    ]));
    expect(pt?.nextRequiredArtifacts).toEqual(expect.arrayContaining([
      'filled_work_order.json with real quiz payload evidence',
      'semantic_clearance.json with real reviewer evidence',
    ]));
    const ptUiBlocker = pt?.blockers.find((blocker) => blocker.category === 'ui-locale');
    expect(ptUiBlocker).toMatchObject({
      repairDashboardPath: path.join(ROOT, rel('ui_mojibake_repair_dashboard.json')),
      repairTaskIds: ['ui-mojibake:2:echo:pt-br:11', 'ui-mojibake:3:gavan:pt-br:12'],
      repairFiles: ['app/plan_content_echo.ts', 'app/plan_content_gavan.ts'],
    });
    expect(result.report.evidence.uiMojibakeDashboardPath).toBe(rel('ui_mojibake_repair_dashboard.json'));
    expect(fs.existsSync(path.join(ROOT, rel('out/release_blocker_matrix.json')))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, rel('out/release_blocker_matrix.md')))).toBe(true);
  });

  it('can fail strict mode while still writing the matrix', () => {
    const result = runMatrix({ strict: true });

    expect(result.report.status).toBe('HOLD');
  });

  it('keeps generated reports under docs/heisenberg or .codex-tmp', () => {
    expect(() => runMatrix({ outputDir: '../outside-heisenberg' })).toThrow(
      'Heisenberg release blocker matrix output must stay under .codex-tmp or docs/heisenberg',
    );
  });
});
