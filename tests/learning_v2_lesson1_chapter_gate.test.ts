import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = join(__dirname, '..');

function run(script: string, args: readonly string[]) {
  return spawnSync(process.execPath, [join(ROOT, 'scripts', script), ...args], {
    cwd: ROOT,
    encoding: 'utf8',
  });
}

describe('Learning V2 lesson 1 chapter review harness', () => {
  test('chapter gate auto-validates the exact approved first ten and keeps manual review on HOLD', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'learning-v2-chapter-gate-'));
    const reportPath = join(outputDir, 'chapter-01-10-gate.txt');
    const result = run('learning_v2_lesson1_chapter_gate.mjs', [
      '--from',
      '1',
      '--to',
      '10',
      '--report',
      reportPath,
    ]);

    expect(result.status).toBe(0);
    const report = readFileSync(reportPath, 'utf8');
    expect(report).toContain('AUTO PASS');
    expect(report).toContain('MANUAL HOLD');
    expect(report).toContain('sessions: 10');
    expect(report).toContain('locales: 8');
    expect(report).toContain('intro pages: 240');
    expect(report).toContain('phrases: 150');
    expect(report).toContain('automatic blockers: 0');
    expect(report).toContain('manual review blockers: 10');
  });

  test('mock builder materializes all learner-facing material without network dependencies', () => {
    const outputDir = mkdtempSync(join(tmpdir(), 'learning-v2-review-mock-'));
    const htmlPath = join(outputDir, 'review.html');
    const dataPath = join(outputDir, 'review-data.js');
    const result = run('build_learning_v2_lesson1_review_mock.mjs', [
      '--from',
      '1',
      '--to',
      '10',
      '--output',
      htmlPath,
      '--data-output',
      dataPath,
    ]);

    expect(result.status).toBe(0);
    const html = readFileSync(htmlPath, 'utf8');
    const data = readFileSync(dataPath, 'utf8');
    expect(html).toContain('Lesson 1 · Full material review');
    expect(html).toContain('data-session-tabs');
    expect(html).toContain('data-locale-tabs');
    expect(html).toContain('data-intro-pages');
    expect(html).toContain('data-phrase-list');
    expect(html).toContain('data-search');
    expect(html).not.toMatch(/https?:\/\//u);
    expect(data).toContain('window.__LEARNING_V2_REVIEW_DATA__');
    expect(data).toContain('"sessionCount":10');
    expect(data).toContain('"localeCount":8');
    expect(data).toContain('"introPageCount":240');
    expect(data).toContain('"phraseCount":150');
    expect(data).toContain('"wordDrillCount":');
  });
});
