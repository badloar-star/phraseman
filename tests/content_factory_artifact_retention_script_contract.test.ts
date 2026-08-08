import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.resolve(__dirname, '..', 'scripts', 'content-factory-artifact-retention-dry-run.mjs'), 'utf8');

test('artifact retention command is bounded, reference-aware and dry-run only', () => {
  expect(source).toContain("where('state', '==', 'orphan_candidate').limit(501)");
  expect(source).toContain('artifact_retention_reference_scan_truncated');
  for (const collection of ['content_factory_stages', 'content_factory_job_units', 'content_factory_releases', 'content_factory_lesson_ledgers', 'content_factory_question_ledgers', 'content_factory_flashcard_ledgers', 'content_factory_arena_ledgers', 'content_factory_job_reviews', 'admin_log']) expect(source).toContain(collection);
  expect(source).not.toContain('.delete(');
  expect(source).not.toContain('--delete');
});
