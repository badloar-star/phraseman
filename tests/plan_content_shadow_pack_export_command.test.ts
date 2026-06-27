import { createHash } from 'node:crypto';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'node:child_process';

import {
  PLAN_CONTENT_DAY_SCHEMA_VERSION,
  validatePlanContentPackIndex,
  type PlanContentPackIndex,
} from '../app/plan_content_pack_index';
import { validatePlanContentDay, type PlanContentDay } from '../app/plan_content_schema';

const ROOT = path.join(__dirname, '..');
const OUTPUT_RELATIVE = '.codex-tmp/plan-content/tests/shadow-pack';
const OUTPUT_DIR = path.join(ROOT, OUTPUT_RELATIVE);
const GENERATED_AT = '2026-06-26T00:00:00.000Z';
const CONTENT_VERSION = 'local.shadow.test';

type PlanContentShadowDayArtifact = {
  schemaVersion: typeof PLAN_CONTENT_DAY_SCHEMA_VERSION;
  studyTarget: 'en';
  sourceLocale: string;
  contentVersion: string;
  contentHash: string;
  reviewStatus: string;
  localeGateStatus: string;
  generatedAt: string;
  content: PlanContentDay;
};

function runCommand(args: string[]) {
  if (process.platform === 'win32') {
    return spawnSync('cmd.exe', [
      '/d',
      '/s',
      '/c',
      ['npx', 'tsx', 'scripts/plan_content_shadow_pack_export.ts', ...args].join(' '),
    ], {
      cwd: ROOT,
      encoding: 'utf8',
    });
  }

  return spawnSync('npx', ['tsx', 'scripts/plan_content_shadow_pack_export.ts', ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

describe('plan content shadow pack export command', () => {
  it('writes and validates local shadow index plus day rows under the ignored temp directory', () => {
    fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });

    const result = runCommand([
      '--out-dir',
      OUTPUT_RELATIVE,
      '--content-version',
      CONTENT_VERSION,
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Plan content shadow pack export: PASS');
    expect(result.stdout).toContain(`Output: ${OUTPUT_RELATIVE.replace(/\//g, path.sep)}`);

    const indexPath = path.join(OUTPUT_DIR, 'index.json');
    expect(fs.existsSync(indexPath)).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8')) as PlanContentPackIndex;
    expect(validatePlanContentPackIndex(index)).toEqual({ ok: true, errors: [] });
    expect(index.studyTarget).toBe('en');
    expect(index.sourceLocale).toBe('ru');
    expect(index.contentVersion).toBe(CONTENT_VERSION);
    expect(index.entries.length).toBeGreaterThan(0);

    const paths = new Set<string>();
    for (const entry of index.entries) {
      expect(paths.has(entry.path)).toBe(false);
      paths.add(entry.path);
      expect(entry.reviewStatus).toBe('shadow');
      expect(entry.localeGateStatus).toBe('hold');
      expect(entry.schemaVersion).toBe(PLAN_CONTENT_DAY_SCHEMA_VERSION);
      expect(entry.path).toMatch(/^plans\/[A-Za-z0-9_-]+\/day-\d{3}\.json$/);

      const artifactPath = path.join(OUTPUT_DIR, entry.path);
      expect(fs.existsSync(artifactPath)).toBe(true);
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8')) as PlanContentShadowDayArtifact;
      expect(artifact.schemaVersion).toBe(PLAN_CONTENT_DAY_SCHEMA_VERSION);
      expect(artifact.studyTarget).toBe('en');
      expect(artifact.sourceLocale).toBe('ru');
      expect(artifact.contentVersion).toBe(CONTENT_VERSION);
      expect(artifact.reviewStatus).toBe('shadow');
      expect(artifact.localeGateStatus).toBe('hold');
      expect(artifact.generatedAt).toBe(GENERATED_AT);
      expect(artifact.content.planId).toBe(entry.planId);
      expect(artifact.content.dayIndex).toBe(entry.dayIndex);
      expect(artifact.contentHash).toBe(entry.contentHash);
      expect(hashJson(artifact.content)).toBe(entry.contentHash);
      expect(validatePlanContentDay(artifact.content)).toEqual([]);
    }
  });

  it('rejects output paths outside the ignored plan-content temp directory', () => {
    const forbiddenRelative = 'docs/specs/__plan_content_shadow_pack_should_not_write';
    const forbiddenPath = path.join(ROOT, forbiddenRelative);
    expect(fs.existsSync(forbiddenPath)).toBe(false);

    const result = runCommand([
      '--out-dir',
      forbiddenRelative,
      '--content-version',
      CONTENT_VERSION,
      '--generated-at',
      GENERATED_AT,
    ]);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('Shadow pack output must stay under .codex-tmp');
    expect(fs.existsSync(forbiddenPath)).toBe(false);
  });

  it('keeps the exporter disconnected from Firebase, loader runtime and startup', () => {
    const scriptSource = fs.readFileSync(path.join(ROOT, 'scripts', 'plan_content_shadow_pack_export.ts'), 'utf8');
    expect(scriptSource).not.toMatch(/firebase|firestore|storage\(\)|upload|download|getDownloadURL|fetch\(|XMLHttpRequest|AsyncStorage|cloud_sync|course_pack_loader/i);

    const startupFiles = [
      path.join(ROOT, 'app', '_layout.tsx'),
      path.join(ROOT, 'components', 'onboarding.tsx'),
      path.join(ROOT, 'components', 'LangContext.tsx'),
    ].map((file) => fs.readFileSync(file, 'utf8'));

    for (const source of startupFiles) {
      expect(source).not.toMatch(/plan_content_shadow_pack_export|PlanContentShadowPack/i);
    }
  });
});

function hashJson(value: unknown): string {
  return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function stableStringify(value: unknown): string {
  return JSON.stringify(normalizeJson(value));
}

function normalizeJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, entryValue]) => entryValue !== undefined)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entryValue]) => [key, normalizeJson(entryValue)]),
    );
  }
  return value;
}
