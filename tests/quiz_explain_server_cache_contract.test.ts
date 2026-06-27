import * as fs from 'fs';
import * as path from 'path';

const root = path.join(__dirname, '..');
const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

describe('explainQuiz server cache contract', () => {
  it('serves a ready quiz explanation from the shared cache before spending budget or calling OpenAI', () => {
    const source = read('functions/src/explain_quiz.ts');

    const readCache = source.indexOf('const cached = await readCachedQuizExplanation(quizHash)');
    const cacheHit = source.indexOf("status: 'ok'", readCache);
    const reserveBudget = source.indexOf('reserveExplainBudget(authUid, stableUid, jobCfg.globalDailyCap)');
    const openAiCall = source.indexOf('gen = await openAiChat');

    expect(readCache).toBeGreaterThan(-1);
    expect(cacheHit).toBeGreaterThan(readCache);
    expect(readCache).toBeLessThan(reserveBudget);
    expect(readCache).toBeLessThan(openAiCall);
  });

  it('publishes an approved AI batch as ready before returning ok to the live caller', () => {
    const source = read('functions/src/explain_quiz.ts');

    const verdictOk = source.indexOf('if (verdict.ok) {');
    const writeReady = source.indexOf('await writeReadyQuizExplanation(', verdictOk);
    const billing = source.indexOf('db.collection(BILLING_COLLECTION)', writeReady);
    const okReturn = source.indexOf("status: 'ok'", billing);

    expect(verdictOk).toBeGreaterThan(-1);
    expect(writeReady).toBeGreaterThan(verdictOk);
    expect(writeReady).toBeLessThan(billing);
    expect(writeReady).toBeLessThan(okReturn);
  });

  it('retries a transient ready-cache write failure once', () => {
    const source = read('functions/src/explain_quiz.ts');

    expect(source).toContain("console.error('explainQuiz writeReady failed, retrying once'");
    expect(source.match(/await writeReadyQuizExplanation\(/g)).toHaveLength(2);
  });
});
