import fs from 'fs';
import path from 'path';

const root = path.join(__dirname, '..');
const phraseHook = fs.readFileSync(path.join(root, 'app', 'explain_phrase_request.ts'), 'utf8');
const quizHook = fs.readFileSync(path.join(root, 'app', 'use_quiz_explain.ts'), 'utf8');

describe('user-facing explanation retry contract', () => {
  it('keeps phrase explanation loading across technical and validator failures', () => {
    expect(phraseHook).toContain('while (mountedRef.current');
    expect(phraseHook).toContain('explainRetryDelayMs');
    expect(phraseHook).toContain("res.reason === 'free_limit'");
    expect(phraseHook).not.toContain('aiErrorToast(');
    expect(phraseHook).not.toContain('aiOfflineToast(');
    expect(phraseHook).not.toMatch(/setState\(\{[\s\S]{0,160}error:\s*true/);
  });

  it('uses one stable quota id throughout retries', () => {
    expect(phraseHook).toContain("createExplainUsageId('phrase')");
    expect(phraseHook).toContain('usageId: usageRef.current.id');
    expect(quizHook).toContain("createExplainUsageId('quiz')");
    expect(quizHook).toContain('usageId: usageIdRef.current');
  });
});
