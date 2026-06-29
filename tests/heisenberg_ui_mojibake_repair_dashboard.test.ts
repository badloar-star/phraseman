import fs from 'node:fs';
import path from 'node:path';

import { writeHeisenbergUiMojibakeRepairDashboard } from '../scripts/heisenberg_ui_mojibake_repair_dashboard';

const ROOT = path.join(__dirname, '..');
const RUN_ROOT_RELATIVE = '.codex-tmp/heisenberg/tests/ui-mojibake-dashboard';
const GENERATED_AT = '2026-06-28T13:00:00.000Z';

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

function runDashboard(uiAuditFile = 'ui_locale_audit.json', outDir = 'out') {
  return writeHeisenbergUiMojibakeRepairDashboard(ROOT, {
    uiAuditPath: rel(uiAuditFile),
    outputDir: rel(outDir),
    generatedAt: GENERATED_AT,
  });
}

describe('heisenberg UI mojibake repair dashboard', () => {
  beforeEach(() => {
    cleanRunRoot();
  });

  it('exposes the UI mojibake dashboard through npm scripts', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>;
    };

    expect(packageJson.scripts).toMatchObject({
      'heisenberg:ui-mojibake-dashboard': 'npx tsx ./scripts/heisenberg_ui_mojibake_repair_dashboard.ts',
    });
  });

  it('groups mojibake findings by file and locale without mutating source', () => {
    writeJson('ui_locale_audit.json', {
      mode: 'ui-locale-audit',
      activationReady: false,
      summary: { findings: 3 },
      findings: [
        {
          severity: 'blocker',
          code: 'locale-string-mojibake',
          file: 'app/plan_content_echo.ts',
          line: 10,
          column: 5,
          keyPath: 'es',
          message: 'Locale string looks corrupted.',
          sample: 'dónde está',
        },
        {
          severity: 'blocker',
          code: 'locale-string-mojibake',
          file: 'app/plan_content_echo.ts',
          line: 11,
          column: 5,
          keyPath: 'pt-BR',
          message: 'Locale string looks corrupted.',
          sample: 'aÃ§Ã£o',
        },
        {
          severity: 'warning',
          code: 'other-warning',
          file: 'app/elsewhere.ts',
          keyPath: 'es',
          message: 'ignored',
        },
      ],
    });

    const result = runDashboard();

    expect(result.dashboard).toMatchObject({
      schemaVersion: 'heisenberg-ui-mojibake-repair-dashboard-v1',
      status: 'HOLD',
      activationReady: false,
      readOnly: true,
      sourceMutationApplied: false,
      summary: {
        findings: 2,
        blockers: 2,
        files: 1,
        locales: 2,
        byFile: {
          'app/plan_content_echo.ts': 2,
        },
        byLocale: {
          es: 1,
          'pt-BR': 1,
        },
        byCode: {
          'locale-string-mojibake': 2,
        },
      },
    });
    expect(result.dashboard.requiredArtifacts).toMatchObject({
      repairedSourceFiles: ['app/plan_content_echo.ts'],
      validationCommand: 'npm run heisenberg:ui-audit',
      productionReadinessCommand: 'npm run heisenberg:production-readiness',
    });
    expect(result.dashboard.tasks[0]).toMatchObject({
      file: 'app/plan_content_echo.ts',
      line: 10,
      locale: 'es',
    });
    expect(fs.existsSync(path.join(ROOT, rel('out/ui_mojibake_repair_dashboard.json')))).toBe(true);
    expect(fs.existsSync(path.join(ROOT, rel('out/ui_mojibake_repair_dashboard.md')))).toBe(true);
  });

  it('passes when the UI audit has no mojibake findings and activationReady is true', () => {
    writeJson('ui_locale_audit.json', {
      mode: 'ui-locale-audit',
      activationReady: true,
      summary: { findings: 0 },
      findings: [],
    });

    const result = runDashboard();

    expect(result.dashboard).toMatchObject({
      status: 'PASS',
      activationReady: true,
      summary: {
        findings: 0,
        blockers: 0,
        files: 0,
        locales: 0,
      },
      blockers: [],
      tasks: [],
    });
  });

  it('keeps dashboard output under docs/heisenberg or .codex-tmp', () => {
    writeJson('ui_locale_audit.json', {
      mode: 'ui-locale-audit',
      activationReady: true,
      findings: [],
    });

    expect(() => writeHeisenbergUiMojibakeRepairDashboard(ROOT, {
      uiAuditPath: rel('ui_locale_audit.json'),
      outputDir: 'outside-heisenberg',
      generatedAt: GENERATED_AT,
    })).toThrow(
      'Heisenberg UI mojibake repair dashboard output must stay under .codex-tmp or docs/heisenberg',
    );
  });
});
