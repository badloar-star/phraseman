import fs from 'node:fs';
import path from 'node:path';

describe('Functions TypeScript build boundary', () => {
  const functionsRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(functionsRoot, '..');

  test('compiles Functions roots without bulk-including client-only Learning V2 progress', () => {
    const config = JSON.parse(fs.readFileSync(path.join(functionsRoot, 'tsconfig.json'), 'utf8')) as {
      include?: string[];
    };

    expect(config.include).toEqual(['src']);
    expect(config.include).not.toContain('../modules/learning-v2');
    expect(config.include).not.toContain('../modules/learning-v2/progress');
  });

  test('keeps imported server-safe Learning V2 modules in the emitted Functions tree', () => {
    const requiredOutputs = [
      'functions/lib/functions/src/index.js',
      'functions/lib/modules/learning-v2/contracts/attempt.js',
      'functions/lib/modules/learning-v2/contracts/validation.js',
      'functions/lib/modules/learning-v2/policies/decision_registry.js',
    ];

    for (const relativePath of requiredOutputs) {
      expect(fs.existsSync(path.join(repoRoot, relativePath))).toBe(true);
    }
  });
});
