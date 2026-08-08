import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('content factory provider request budget wiring', () => {
  const stageWorker = readFileSync(join(__dirname, '..', 'content_stage_worker.ts'), 'utf8');
  const legacyWorker = readFileSync(join(__dirname, '..', 'content_factory_worker.ts'), 'utf8');

  test.each([['stage', stageWorker], ['legacy', legacyWorker]])('%s reserves by provider request index before transport', (_name, source) => {
    expect(source).toContain('beforeProviderRequest: async (requestIndex)');
    expect(source).toContain('provider-request:${requestIndex}');
  });

  test('stage no longer reserves one logical unit before a repair-capable run', () => {
    expect(stageWorker).not.toContain('`${stageId}:attempt:${attempt}`, config.globalDailyCap');
  });
});
