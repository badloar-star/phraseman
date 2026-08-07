import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const GUARD_PATH = path.join(ROOT, 'scripts', 'deploy_v2_progress_transport.mjs');
const LEGACY_HARNESS_PRESENT = fs.existsSync(GUARD_PATH);
const itLegacyHarness = LEGACY_HARNESS_PRESENT ? it : it.skip;
const DISPOSABLE_PROJECT_ID = 'phraseman-v2-ac-test-20260718';
const WRAPPER_SENTINEL = `validated:${DISPOSABLE_PROJECT_ID}`;

function runGuard(
  args: string[],
  environment: Record<string, string | undefined> = {},
) {
  const env: NodeJS.ProcessEnv = { ...process.env };
  delete env.PHRASEMAN_V2_PROGRESS_TRANSPORT_DEPLOY_GUARD;

  for (const [key, value] of Object.entries(environment)) {
    if (value === undefined) {
      delete env[key];
    } else {
      env[key] = value;
    }
  }

  return spawnSync(process.execPath, [GUARD_PATH, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env,
  });
}

function loadTransportEntry(environment: Record<string, string | undefined>): () => void {
  const previous = {
    FUNCTIONS_EMULATOR: process.env.FUNCTIONS_EMULATOR,
    GCLOUD_PROJECT: process.env.GCLOUD_PROJECT,
    GOOGLE_CLOUD_PROJECT: process.env.GOOGLE_CLOUD_PROJECT,
  };

  return () => {
    jest.resetModules();
    jest.doMock('firebase-admin', () => ({
      apps: [],
      initializeApp: jest.fn(),
    }));
    jest.doMock('../functions/src/learning_v2/progress_event_callable', () => ({
      createProgressEventProductionCallable: jest.fn(() => 'callable'),
    }));

    try {
      for (const [key, value] of Object.entries(environment)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
      jest.isolateModules(() => {
        require('../functions/src/learning_v2/emulator/progress_callable_transport_entry');
      });
    } finally {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  };
}

describe('Learning V2 progress transport deploy guard', () => {
  itLegacyHarness('rejects an omitted project even when Firebase would inherit the production default', () => {
    const firebaserc = JSON.parse(fs.readFileSync(path.join(ROOT, '.firebaserc'), 'utf8'));
    expect(firebaserc.projects.default).toBe('phraseman-ea0b3');

    const result = runGuard(
      [],
      {
        GCLOUD_PROJECT: 'phraseman-ea0b3',
        GOOGLE_CLOUD_PROJECT: 'phraseman-ea0b3',
      },
    );

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('exactly one explicit --project');
  });

  itLegacyHarness('rejects an explicitly selected production project', () => {
    const result = runGuard([
      '--project',
      'phraseman-ea0b3',
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain(`only ${DISPOSABLE_PROJECT_ID} is allowed`);
  });

  itLegacyHarness.each([
    ['separate value', ['--validate-only', '--project', DISPOSABLE_PROJECT_ID]],
    ['equals form', ['--validate-only', `--project=${DISPOSABLE_PROJECT_ID}`]],
  ])('accepts the exact disposable project in %s syntax', (_label, args) => {
    const result = runGuard(args);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(`validated project ${DISPOSABLE_PROJECT_ID}`);
  });

  itLegacyHarness.each([
    ['alias', ['--validate-only', '-P', DISPOSABLE_PROJECT_ID]],
    ['missing value', ['--validate-only', '--project']],
    ['duplicate identical', [
      '--validate-only',
      '--project',
      DISPOSABLE_PROJECT_ID,
      `--project=${DISPOSABLE_PROJECT_ID}`,
    ]],
    ['prefix match', ['--validate-only', '--project', `${DISPOSABLE_PROJECT_ID}-extra`]],
    ['suffix match', ['--validate-only', '--project', `extra-${DISPOSABLE_PROJECT_ID}`]],
    ['demo deploy target', ['--validate-only', '--project', 'demo-phraseman-progress-transport']],
    ['caller config override', [
      '--validate-only',
      '--project',
      DISPOSABLE_PROJECT_ID,
      '--config',
      'firebase.json',
    ]],
    ['caller only override', [
      '--validate-only',
      '--project',
      DISPOSABLE_PROJECT_ID,
      '--only',
      'firestore',
    ]],
  ])('rejects unsafe project syntax or target: %s', (_label, args) => {
    expect(runGuard(args).status).not.toBe(0);
  });

  itLegacyHarness('makes the config predeploy hook require wrapper validation and the exact resolved project', () => {
    const config = JSON.parse(
      fs.readFileSync(path.join(ROOT, 'firebase.v2-progress-transport.json'), 'utf8'),
    );
    expect(config.functions.source).toBe('functions/.codex-tmp/v2-progress-transport');
    expect(config.functions.predeploy).toBe(
      'node "$PROJECT_DIR/scripts/deploy_v2_progress_transport.mjs" --predeploy',
    );

    const inheritedProduction = runGuard(
      ['--predeploy'],
      {
        GCLOUD_PROJECT: 'phraseman-ea0b3',
        PHRASEMAN_V2_PROGRESS_TRANSPORT_DEPLOY_GUARD: undefined,
      },
    );
    const rawDisposable = runGuard(
      ['--predeploy'],
      {
        GCLOUD_PROJECT: DISPOSABLE_PROJECT_ID,
        PHRASEMAN_V2_PROGRESS_TRANSPORT_DEPLOY_GUARD: undefined,
      },
    );
    const wrappedDisposable = runGuard(
      ['--predeploy'],
      {
        GCLOUD_PROJECT: DISPOSABLE_PROJECT_ID,
        PHRASEMAN_V2_PROGRESS_TRANSPORT_DEPLOY_GUARD: WRAPPER_SENTINEL,
      },
    );

    expect(inheritedProduction.status).not.toBe(0);
    expect(rawDisposable.status).not.toBe(0);
    expect(wrappedDisposable.status).toBe(0);

    const guardSource = fs.readFileSync(GUARD_PATH, 'utf8');
    const firebaseInvocation = guardSource.slice(
      guardSource.indexOf('run("firebase"'),
      guardSource.indexOf('], firebaseEnvironment);') + '], firebaseEnvironment);'.length,
    );
    expect(firebaseInvocation).toContain(`[
    "deploy",
    "--config",
    "firebase.v2-progress-transport.json",
    "--only",
    "functions:v2ProgressTransport",
    "--project",
    projectId,
    "--non-interactive",
  ], firebaseEnvironment);`);
  });

  itLegacyHarness('loads the harness only in a demo emulator or the exact disposable project', () => {
    expect(loadTransportEntry({
      FUNCTIONS_EMULATOR: 'true',
      GCLOUD_PROJECT: 'demo-phraseman-progress-transport',
      GOOGLE_CLOUD_PROJECT: undefined,
    })).not.toThrow();
    expect(loadTransportEntry({
      FUNCTIONS_EMULATOR: undefined,
      GCLOUD_PROJECT: DISPOSABLE_PROJECT_ID,
      GOOGLE_CLOUD_PROJECT: undefined,
    })).not.toThrow();

    expect(loadTransportEntry({
      FUNCTIONS_EMULATOR: undefined,
      GCLOUD_PROJECT: 'phraseman-ea0b3',
      GOOGLE_CLOUD_PROJECT: undefined,
    })).toThrow('refuses to load');
    expect(loadTransportEntry({
      FUNCTIONS_EMULATOR: undefined,
      GCLOUD_PROJECT: 'demo-phraseman-progress-transport',
      GOOGLE_CLOUD_PROJECT: undefined,
    })).toThrow('refuses to load');
    expect(loadTransportEntry({
      FUNCTIONS_EMULATOR: 'true',
      GCLOUD_PROJECT: DISPOSABLE_PROJECT_ID,
      GOOGLE_CLOUD_PROJECT: undefined,
    })).toThrow('refuses to load');
    expect(loadTransportEntry({
      FUNCTIONS_EMULATOR: 'true',
      GCLOUD_PROJECT: 'demo-phraseman-progress-transport',
      GOOGLE_CLOUD_PROJECT: 'phraseman-ea0b3',
    })).toThrow('refuses to load');
    expect(loadTransportEntry({
      FUNCTIONS_EMULATOR: undefined,
      GCLOUD_PROJECT: DISPOSABLE_PROJECT_ID,
      GOOGLE_CLOUD_PROJECT: 'phraseman-ea0b3',
    })).toThrow('refuses to load');
  });

  it('keeps the transport out of the production Functions index', () => {
    const productionIndex = fs.readFileSync(
      path.join(ROOT, 'functions', 'src', 'index.ts'),
      'utf8',
    );

    expect(productionIndex).not.toContain('v2ProgressTransport');
    expect(productionIndex).not.toContain('progress_callable_transport_entry');
  });

  it('keeps every retired disposable transport artifact absent together', () => {
    if (LEGACY_HARNESS_PRESENT) return;
    expect(fs.existsSync(path.join(ROOT, 'firebase.v2-progress-transport.json'))).toBe(false);
    expect(fs.existsSync(path.join(
      ROOT,
      'functions',
      'src',
      'learning_v2',
      'emulator',
      'progress_callable_transport_entry.ts',
    ))).toBe(false);
  });
});
