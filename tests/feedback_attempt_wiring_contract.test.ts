import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('feedback attempt identity wiring', () => {
  it('gives each dialogue mount one feedback attempt id before its scenario id', () => {
    const source = read('app/ai_dialog_session.tsx');

    expect(source).toContain("import { makeFeedbackAttemptId } from './feedback_attempt_identity';");
    expect(source).toContain('const [feedbackAttemptId] = useState(makeFeedbackAttemptId);');
    expect(source).toContain('entityId={`${sessionKey}:dialogue:${scenario.id}`}');
  });

  it('gives retrying the same dialogue a fresh run id and uses it as the session key', () => {
    const source = read('app/ai_dialog_session.tsx');

    expect(source).toContain("useLocalSearchParams<{ scenarioId?: string; lessonId?: string; runId?: string }>()");
    expect(source).toContain('const sessionKey = String(params.runId || feedbackAttemptId);');
    expect(source).toContain('entityId={`${sessionKey}:dialogue:${scenario.id}`}');
    expect(source).toMatch(/onRetry=\{\(\) => \{[\s\S]*?const runId = makeFeedbackAttemptId\(\);[\s\S]*?params: \{ scenarioId: scenario\.id, lessonId: params\.lessonId, runId \}/);
  });

  it('uses the current blitz round plus its mount attempt id before the deck id', () => {
    const source = read('app/flashcards_blitz_session.tsx');

    expect(source).toContain("import { makeFeedbackAttemptId } from './feedback_attempt_identity';");
    expect(source).toContain('const [feedbackAttemptId] = useState(makeFeedbackAttemptId);');
    expect(source).toContain('entityId: `${feedbackAttemptId}:blitz:${roundId}:${deckParamStr || \'all\'}`');
  });
});
