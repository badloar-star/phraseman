import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');

const STARTUP_FILES = [
  'app/_layout.tsx',
  'components/onboarding.tsx',
  'components/LangContext.tsx',
] as const;

const COURSE_PACK_RUNTIME_FILES = [
  'app/course_pack_manifest.ts',
  'app/course_pack_index.ts',
  'app/course_pack_loader.ts',
] as const;

const HEAVY_CONTENT_IMPORT_FRAGMENTS = [
  'quiz_data',
  'quiz_source_locale_payloads',
  'lesson_data',
  'lesson_intro_screens',
  'lesson_words_source_locales',
  'quiz_thematic_packs',
] as const;

const COURSE_PACK_IMPORT_FRAGMENTS = [
  'course_pack_manifest',
  'course_pack_index',
  'course_pack_loader',
] as const;

function readProjectFile(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
}

function importLikeLines(source: string): string[] {
  return source
    .split(/\r?\n/)
    .filter((line) => /^\s*import\b/.test(line) || /\brequire\(['"]/.test(line));
}

function matchingImportLines(source: string, fragments: readonly string[]): string[] {
  return importLikeLines(source).filter((line) => fragments.some((fragment) => line.includes(fragment)));
}

describe('bootstrap bundle boundary contract', () => {
  it('keeps startup and onboarding free of heavy content imports', () => {
    for (const relativePath of STARTUP_FILES) {
      const matches = matchingImportLines(readProjectFile(relativePath), HEAVY_CONTENT_IMPORT_FRAGMENTS);
      expect(matches).toEqual([]);
    }
  });

  it('keeps startup and onboarding disconnected from course-pack runtime modules', () => {
    for (const relativePath of STARTUP_FILES) {
      const matches = matchingImportLines(readProjectFile(relativePath), COURSE_PACK_IMPORT_FRAGMENTS);
      expect(matches).toEqual([]);
    }
  });

  it('keeps the course-pack runtime contract independent from heavy bundled data', () => {
    for (const relativePath of COURSE_PACK_RUNTIME_FILES) {
      const matches = matchingImportLines(readProjectFile(relativePath), HEAVY_CONTENT_IMPORT_FRAGMENTS);
      expect(matches).toEqual([]);
    }
  });
});
