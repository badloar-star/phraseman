import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const hookSource = fs.readFileSync(path.join(ROOT, 'app', 'use_mistake_explain.ts'), 'utf8');
const cardSource = fs.readFileSync(path.join(ROOT, 'components', 'AiMistakeCard.tsx'), 'utf8');

describe('lesson AI mistake failure state', () => {
  it('does not present a generic answer comparison as a completed mistake analysis', () => {
    const explainStart = hookSource.indexOf('const explain = useCallback');
    const catchStart = hookSource.indexOf('} catch (error) {', explainStart);
    const catchEnd = hookSource.indexOf('const openEli5', catchStart);
    const inlineFailureBlock = hookSource.slice(catchStart, catchEnd);

    expect(explainStart).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(explainStart);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(inlineFailureBlock).toContain("setAiMistakeState('error')");
    expect(inlineFailureBlock).not.toContain("setAiMistakeState('hidden')");
    expect(cardSource).not.toContain('buildLocalMistakeFallback');
    expect(cardSource).toContain('Не вдалося завантажити розбір');
    expect(cardSource).toContain('ai-mistake-explain-button');
  });

  it('keeps a failed simple explanation retryable instead of marking fallback copy ready', () => {
    const eli5Start = hookSource.indexOf('const openEli5 = useCallback');
    const catchStart = hookSource.indexOf('} catch (error) {', eli5Start);
    const catchEnd = hookSource.indexOf('} finally {', catchStart);
    const eli5FailureBlock = hookSource.slice(catchStart, catchEnd);

    expect(eli5Start).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(eli5Start);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(eli5FailureBlock).toContain("setEli5State('error')");
    expect(eli5FailureBlock).not.toContain("setEli5State('ready')");
    expect(eli5FailureBlock).not.toContain('aiErrorToast');
  });
});
