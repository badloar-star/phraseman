import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

describe('R7 fake-provider firewall contract', () => {
  it('uses only the injected provider and writes only ignored smoke artifacts', () => {
    const harness = read('functions/src/content_factory/r7_fake_provider_harness.ts');
    const runner = read('scripts/run-r7-fake-provider-smoke.cjs');
    expect(harness).toContain('StageGenerationProvider');
    expect(harness).not.toMatch(/openai|OPENAI_API_KEY|OpenAiStageProvider/i);
    expect(runner).toContain("'.codex-tmp'");
    expect(runner).not.toMatch(/fetch\(|https:|OPENAI_API_KEY/);
  });

  it('retains the bounded repair budget and supported production targets', () => {
    const runner = read('functions/src/content_factory/stage_runner.ts');
    const factory = read('functions/src/admin_content_factory.ts');
    expect(runner).toContain('maxRepairs > 2');
    expect(factory).toContain("['en', 'fr'] as const");
  });
});
