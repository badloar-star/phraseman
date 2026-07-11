import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');
const hookSource = fs.readFileSync(path.join(ROOT, 'app', 'use_mistake_explain.ts'), 'utf8');
const cardSource = fs.readFileSync(path.join(ROOT, 'components', 'AiMistakeCard.tsx'), 'utf8');

describe('lesson AI mistake offline fallback', () => {
  it('keeps a deterministic local explanation visible when inline AI or offline loading fails', () => {
    const explainStart = hookSource.indexOf('const explain = useCallback');
    const catchStart = hookSource.indexOf('} catch (error) {', explainStart);
    const catchEnd = hookSource.indexOf('const openEli5', catchStart);
    const inlineFailureBlock = hookSource.slice(catchStart, catchEnd);

    expect(explainStart).toBeGreaterThan(-1);
    expect(catchStart).toBeGreaterThan(explainStart);
    expect(catchEnd).toBeGreaterThan(catchStart);
    expect(inlineFailureBlock).toContain("setAiMistakeState('error')");
    expect(inlineFailureBlock).not.toContain("setAiMistakeState('hidden')");
    expect(cardSource).toContain('buildLocalMistakeFallback');
    expect(cardSource).toContain('targetAnswer');
    expect(cardSource).toContain('userAnswer');
  });
});
