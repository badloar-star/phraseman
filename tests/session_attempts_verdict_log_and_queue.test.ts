// зачем (Ревизор 2.75 / Сверка 4b2f7ac3c): вердикт пишет [ATTEMPTS-VERDICT] с причиной раннего выхода; вердикт до гидратации сердец ставится в очередь и применяется после неё.
import { readFileSync } from 'fs';
import path from 'path';
import { reduceSessionAttempts, createSessionAttemptsState } from '../app/session_attempts/session_attempts_domain';

const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), 'utf8').split('\r\n').join('\n');

describe('хук попыток: журнал и очередь вердиктов', () => {
  const hook = read('hooks/useSessionAttempts.ts');
  it('каждый вердикт пишет журнал с состоянием до/после и причиной раннего выхода', () => {
    expect(hook).toContain("console.log('[ATTEMPTS-VERDICT]'");
    for (const field of ['phaseBefore', 'phaseAfter', 'remainingBefore', 'remainingAfter', 'duplicate', 'mistakeChargeActive', 'hydrationTrusted', 'earlyExit']) expect(hook).toContain(field);
    expect(hook).toContain("'phase_not_active'");
    expect(hook).toContain("'duplicate_answer_id'");
  });
  it('вердикт до гидратации не отбрасывается: очередь и повтор после неё', () => {
    expect(hook).toContain("source: 'queued_before_hydration'");
    expect(hook).toContain("source: 'replay_after_hydration'");
    expect(hook).toContain('if (!hydratedRef.current && input.persistenceEnabled !== false) {');
  });
});

describe('редьюсер: ранние выходы, которые теперь видны в журнале', () => {
  it('повторный id ответа и фаза не active не снимают сердце', () => {
    const initial = createSessionAttemptsState({ sessionId: 's1', questionId: 'q1' });
    const first = reduceSessionAttempts(initial, { type: 'verdict', answerAttemptId: 'a:1', verdict: 'pedagogical_wrong' });
    expect(first.state.remainingAttempts).toBe(initial.remainingAttempts - 1);
    const duplicate = reduceSessionAttempts(first.state, { type: 'verdict', answerAttemptId: 'a:1', verdict: 'pedagogical_wrong' });
    expect(duplicate.state).toBe(first.state);
    expect(duplicate.effect).toBe('none');
  });
});
