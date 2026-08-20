import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

describe('Learning V2 content quality gate cannot be bypassed', () => {
  test('the authored shard compiler asserts the strict gate before building', () => {
    const source = readFileSync(
      join(ROOT, 'modules/learning-v2/content/source/authored_sessions_v1.ts'),
      'utf8',
    );
    expect(source).toContain('assertLearningV2SessionContentQuality');
    expect(source).toContain('LEARNING_V2_CONTENT_QUALITY_REVIEW_RECEIPTS_V1');
    expect(source.indexOf('assertLearningV2SessionContentQuality(')).toBeLessThan(
      source.indexOf('buildSessionShardFromSource(source)'),
    );
  });

  test('the repository exposes one strict command for CI and authoring', () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts?.['learning-v2:content-gate']).toBe(
      'npx tsx scripts/learning_v2_content_quality_gate.ts',
    );
    const cli = readFileSync(
      join(ROOT, 'scripts/learning_v2_content_quality_gate.ts'),
      'utf8',
    );
    expect(cli).toContain('evaluateLearningV2SessionContentQuality');
    expect(cli).toContain('process.exitCode = 1');
  });
});
