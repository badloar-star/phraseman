import fs from 'fs';
import path from 'path';

import { resolveCoursePackReadiness } from '../app/course_pack_loader';

const ROOT = path.resolve(__dirname, '..');

const DIRECT_PLAN_CONTENT_MODULES = [
  'plan_content_impuls',
  'plan_content_gavan',
  'plan_content_mitap',
  'plan_content_echo',
  'plan_content_voyazh',
] as const;

const REGISTRY_IMPORT_ALLOWLIST = [
  'app/plan_content_pack_dry_run.ts',
  'app/plan_content_readiness.ts',
  // Async remote-or-bundled bridge: reads the registry for the bundled fallback
  // it serves while remote loading is disabled or a server day is unavailable.
  'app/plan_content_remote_readiness.ts',
] as const;

const ADAPTER_IMPORT_ALLOWLIST = [
  'app/plan_content_pack_dry_run.ts',
  'app/personal_plan_phrase_lessons.ts',
  'app/personal_plan_theory.tsx',
] as const;

const READINESS_IMPORT_ALLOWLIST = [
  'app/personal_plan.tsx',
  'app/personal_plan_exercise.tsx',
  'app/personal_plan_phrase_lessons.ts',
  'app/personal_plan_theory.tsx',
  'app/personal_plan_task_done.tsx',
  // The remote facade is the screen-facing wrapper that races the verified
  // server day against the bundled compatibility day inside a 150ms deadline.
  // It is the one new module allowed to read the readiness bundled-gate.
  'app/plan_content_remote_facade.ts',
] as const;

function listSourceFiles(relativeDir: string): string[] {
  const absoluteDir = path.join(ROOT, relativeDir);
  const entries = fs.readdirSync(absoluteDir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const relativePath = path.join(relativeDir, entry.name).replace(/\\/g, '/');
    if (entry.isDirectory()) return listSourceFiles(relativePath);
    return /\.(ts|tsx)$/.test(entry.name) ? [relativePath] : [];
  });
}

function importMatches(relativePath: string, pattern: RegExp): boolean {
  const source = fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
  const importStatements = source.match(/import[\s\S]*?\bfrom\s+['"][^'"]+['"];?|require\(['"][^'"]+['"]\)/g) ?? [];
  return importStatements.some((statement) => pattern.test(statement));
}

function filesImporting(pattern: RegExp): string[] {
  return listSourceFiles('app')
    .concat(listSourceFiles('components'))
    .filter((relativePath) => importMatches(relativePath, pattern))
    .sort();
}

describe('plan content pack boundary contract', () => {
  it('keeps large plan content modules behind the single registry seam', () => {
    const directModulePattern = new RegExp(
      `from ['"]\\./(${DIRECT_PLAN_CONTENT_MODULES.join('|')})['"]`,
    );
    expect(filesImporting(directModulePattern)).toEqual(['app/plan_content_registry.ts']);
  });

  it('keeps plan content registry callsites explicit while the pack loader is not active', () => {
    expect(filesImporting(/from ['"]\.\/plan_content_registry['"]/)).toEqual([...REGISTRY_IMPORT_ALLOWLIST].sort());
  });

  it('keeps rich plan-content runtime adapter callsites explicit', () => {
    expect(filesImporting(/from ['"]\.\/plan_content_runtime_adapter['"]/)).toEqual([...ADAPTER_IMPORT_ALLOWLIST].sort());
  });

  it('keeps plan content readiness facade consumers explicit during migration', () => {
    expect(filesImporting(/from ['"]\.\/plan_content_readiness['"]/)).toEqual([...READINESS_IMPORT_ALLOWLIST].sort());
  });

  it('resolves plan_content as bundled compatibility until extraction is approved', () => {
    expect(resolveCoursePackReadiness({
      studyTarget: 'en',
      sourceLocale: 'ru',
      surface: 'plan_content',
      selectionConfirmed: true,
    })).toEqual({
      state: 'offline_fallback',
      delivery: 'bundled_compatibility',
      reason: 'bundled_compatibility_until_pack_extraction',
    });
  });
});
