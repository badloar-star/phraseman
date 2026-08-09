import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const hookSource = fs.readFileSync(path.join(ROOT, 'app', 'use_mistake_explain.ts'), 'utf8');
const cardSource = fs.readFileSync(path.join(ROOT, 'components', 'AiMistakeCard.tsx'), 'utf8');

describe('lesson AI mistake retry', () => {
  it('silently retries inline AI failures while the learner stays on the same mistake', () => {
    const explainStart = hookSource.indexOf('const explain = useCallback');
    const catchStart = hookSource.indexOf('} catch (error) {', explainStart);
    const catchEnd = hookSource.indexOf('const openEli5', catchStart);
    const inlineFailureBlock = hookSource.slice(catchStart, catchEnd);

    expect(explainStart).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(explainStart);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(inlineFailureBlock).toContain('await waitForRetry(explainRetryDelayMs(error, consecutiveFailures));');
    expect(inlineFailureBlock).not.toContain("setAiMistakeState('error')");
    expect(inlineFailureBlock).toContain("setAiMistakeState('limit')");
    expect(cardSource).toContain('testID="ai-mistake-limit-card"');
    expect(hookSource).toContain('!hasPremiumAccess && await hasShownAiMistakeLimitNoticeToday()');
  });
});
