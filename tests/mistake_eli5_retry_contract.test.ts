import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const hookSource = fs.readFileSync(path.join(ROOT, 'app', 'use_mistake_explain.ts'), 'utf8');
const modalSource = fs.readFileSync(path.join(ROOT, 'components', 'MistakeEli5Modal.tsx'), 'utf8');

describe('mistake ELI5 retry contract', () => {
  it('silently retries a failed footer explanation while the learner stays on the phrase', () => {
    const openStart = hookSource.indexOf('const openEli5 = useCallback');
    const catchStart = hookSource.indexOf('} catch (error) {', openStart);
    const catchEnd = hookSource.indexOf('} finally {', catchStart);
    const failureBlock = hookSource.slice(catchStart, catchEnd);

    expect(openStart).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(openStart);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(failureBlock).toContain('await waitForRetry(explainRetryDelayMs(error, consecutiveFailures));');
    expect(failureBlock).not.toContain("setEli5State('error')");
    expect(failureBlock).toContain("setEli5State('limit')");
    expect(hookSource).toContain("usageId: usageIdRef.current");
  });

  it('shows a terminal state only for the intended Free limit', () => {
    expect(modalSource).toContain("state === 'limit'");
    expect(modalSource).toContain('AiLimitUpsellCard');
    expect(modalSource).toContain('mistake-eli5-limit-card');
  });
});
