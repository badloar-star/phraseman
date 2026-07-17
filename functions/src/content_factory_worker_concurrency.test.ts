import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source = readFileSync(join(__dirname, 'content_factory_worker.ts'), 'utf8');

describe('legacy content factory worker concurrency contract', () => {
  test('guards generated checkpoint persistence with the active lease transaction', () => {
    expect(source).toContain('runGuardedGenerationTransaction({');
    expect(source).toContain("lease: checkpoint, allowedStates: ['running']");
    expect(source).not.toContain("await unitRef.set({ state: 'generated'");
  });

  test('does not swallow terminal persistence failures', () => {
    expect(source).not.toContain(".catch((progressError) => console.error('content factory failure progress update failed'");
    expect(source).not.toContain('generationPersistenceError(');
  });

  test('records Arena shadow parity from the accepted legacy payload without a second provider call', () => {
    expect(source).toContain('buildArenaShadowComparison');
    expect(source).toContain('persistArenaComparisonReceipt');
    expect(source).toContain('candidate.providerRequestsAdded');
    expect(source).toContain('engineResolved: currentRouting.engineResolved');
    expect(source).toContain("shadowComparisonState = 'unavailable'");
    expect(source.match(/generateSurfaceUnit\(/g)).toHaveLength(1);
  });
});
