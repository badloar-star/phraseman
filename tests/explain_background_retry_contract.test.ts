import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('explanation delivery is waiting -> ready only', () => {
  it('retries rejected generated drafts inside the callable before returning pending', () => {
    const server = read('functions/src/explain_phrase.ts');
    expect(server).toContain('MAX_VALIDATED_GENERATION_ATTEMPTS = 2');
    expect(server).toContain('for (let generationAttempt = 1; generationAttempt <= MAX_VALIDATED_GENERATION_ATTEMPTS; generationAttempt += 1)');
    expect(server).toContain('strictOutputLanguage: generationAttempt > 1');
  });

  it('checks ready/pending cache before charging the free generation cap', () => {
    const server = read('functions/src/explain_phrase.ts');
    const cacheRead = server.indexOf('const cached = await readCachedExplanation(phraseHash);');
    const freeCap = server.indexOf('budgetReservation = await reserveExplainBudget(');
    expect(cacheRead).toBeGreaterThan(-1);
    expect(freeCap).toBeGreaterThan(cacheRead);
    expect(server.slice(freeCap, freeCap + 500)).toContain("job: 'phrase'");
    expect(server).toContain("cached?.status === 'pending'");
  });

  it('never renders error copy in phrase or mistake explanation surfaces', () => {
    const phraseSheet = read('components/ExplainSheet.tsx');
    const mistakeCard = read('components/AiMistakeCard.tsx');
    const eli5 = read('components/MistakeEli5Modal.tsx');
    expect(phraseSheet).not.toContain('state.retry()');
    expect(mistakeCard).not.toContain("state === 'error'");
    expect(eli5).not.toContain("state === 'error'");
  });
});
