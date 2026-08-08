import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const hookSource = fs.readFileSync(path.join(ROOT, 'app', 'use_mistake_explain.ts'), 'utf8');
const cardSource = fs.readFileSync(path.join(ROOT, 'components', 'AiMistakeCard.tsx'), 'utf8');
const clientSource = fs.readFileSync(path.join(ROOT, 'app', 'ai_mistake_explain_client.ts'), 'utf8');

describe('lesson AI mistake background recovery', () => {
  it('keeps an inline request loading and retries without exposing an error', () => {
    const explainStart = hookSource.indexOf('const explain = useCallback');
    const catchStart = hookSource.indexOf('} catch (error) {', explainStart);
    const catchEnd = hookSource.indexOf('const openEli5', catchStart);
    const inlineFailureBlock = hookSource.slice(catchStart, catchEnd);

    expect(explainStart).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(explainStart);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(inlineFailureBlock).toContain("setAiMistakeState('loading')");
    expect(inlineFailureBlock).toContain('scheduleMistakeRetry');
    expect(inlineFailureBlock).not.toContain("setAiMistakeState('error')");
    expect(cardSource).not.toContain('buildLocalMistakeFallback');
    expect(cardSource).not.toContain('Не вдалося завантажити розбір');
    expect(cardSource).not.toContain("state === 'error'");
  });

  it('keeps a failed simple explanation in the skeleton while retrying automatically', () => {
    const eli5Start = hookSource.indexOf('const openEli5 = useCallback');
    const catchStart = hookSource.indexOf('} catch', eli5Start);
    const catchEnd = hookSource.indexOf('} finally {', catchStart);
    const eli5FailureBlock = hookSource.slice(catchStart, catchEnd);

    expect(eli5Start).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(eli5Start);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(eli5FailureBlock).toContain("setEli5State('loading')");
    expect(eli5FailureBlock).toContain('scheduleEli5Retry');
    expect(eli5FailureBlock).not.toContain("setEli5State('error')");
    expect(eli5FailureBlock).not.toContain("setEli5State('ready')");
    expect(eli5FailureBlock).not.toContain('aiErrorToast');
  });

  it('primes the simple explanation cache from a successful full bundle', () => {
    expect(clientSource).toContain('res.data.eli5Text?.trim()');
    expect(clientSource).toContain("variant: 'eli5'");
    expect(clientSource).toContain('writeExplainLocalCache');
  });

  it('offers an explicit explanation choice on every wrong answer', () => {
    expect(hookSource).toContain('requestMistakeExplanation');
    expect(cardSource).toContain("state === 'idle'");
    expect(cardSource).toContain('ai-mistake-explain-button');
  });
});
