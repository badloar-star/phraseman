// зачем (Сверка 0fb6d9eac, координатор 15.10): при нуле реплик итог диалога ждал отказа сервера ~30 с, «Повторить» повторял то же ожидание.
// Ноль реплик известен локально (разбор ходов или явный параметр) — сразу «Разговор не начался» и «Ещё раз», без запроса; журнал [DIALOG-RETRY].
// Пропавший параметр НЕ считается пустым разговором.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app', 'dialogue_v2_completion.tsx'), 'utf8');

describe('итог диалога при нуле реплик', () => {
  it('без запроса к серверу и с причиной в журнале', () => {
    expect(src).toContain("const localTurns = localOutcomeTurns ?? (learnerTurnsKnown ? learnerTurns : null);");
    expect(src).toContain("'[DIALOG-RETRY] zero_turns → итог без запроса к серверу'");
  });
  it('пропавший параметр не равен пустому разговору', () => {
    expect(src).toContain("const learnerTurnsKnown = /^");
    expect(src).toContain(".test(single(params.learnerTurns) ?? '');");
    expect(src).toContain('const knownZeroTurns = turns === 0 && (outcome !== null || learnerTurnsKnown);');
  });
  it('вместо «Повторить» — «Ещё раз» (перезапуск разговора)', () => {
    expect(src).toContain('testID="dialogue-v2-completion-restart"');
    expect(src).toContain('{knownZeroTurns ? labels.noTurns :');
  });
});
