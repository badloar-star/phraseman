// зачем (координатор 13.10, аудит Optimistic UI Уроков): «Скрыть»/«Вернуть» ошибку меняют экран в тот же кадр, запись идёт фоном по очереди, сбой откатывает и говорит человеку,
// двойной тап и «Продолжить» во время записи не ломают порядок. Контракт по строкам файла.
import fs from 'node:fs';
import path from 'node:path';

const src = fs.readFileSync(path.join(__dirname, '..', 'app/mistake_practice_session.tsx'), 'utf8').replace(/\r\n/g, '\n');
const hide = src.slice(src.indexOf('const hideCurrentMistake = useCallback'), src.indexOf('const undoHiddenMistake = useCallback'));
const undo = src.slice(src.indexOf('const undoHiddenMistake = useCallback'), src.indexOf('const continueAfterHidden = useCallback'));
const cont = src.slice(src.indexOf('const continueAfterHidden = useCallback'), src.indexOf('if (loading) {'));

describe('«Скрыть ошибку»: экран сразу, запись фоном', () => {
  it('панель «Ошибка скрыта» и закрытый диалог ставятся ДО любой записи', () => {
    const optimistic = hide.indexOf('setHiddenUndo({ entry, nextSession, hiddenEventId })');
    expect(optimistic).toBeGreaterThan(-1);
    expect(optimistic).toBeLessThan(hide.indexOf('appendMistakeEvent'));
    expect(optimistic).toBeLessThan(hide.indexOf('whenIdle'));
    expect(hide.indexOf('setHideConfirmVisible(false)')).toBeLessThan(hide.indexOf('appendMistakeEvent'));
  });

  it('сбой записи откатывает только свою панель (по id события), показывает тост и пишет причину', () => {
    expect(hide).toMatch(/setHiddenUndo\(\(cur\) => \(cur && cur\.hiddenEventId === hiddenEventId \? null : cur\)\)/);
    expect(hide).toContain('hideToast()');
    expect(hide).toContain("'[MISTAKES-GATE] hide:failed'");
  });

  it('двойной тап: busy-выход с причиной, последняя запись держится в hideOpRef', () => {
    expect(hide).toMatch(/submissionLatchRef\.current \|\| hideOpRef\.current \|\| undoInFlightRef\.current/);
    expect(hide).toContain("[MISTAKE-HIDE] ignored");
    expect(hide).toMatch(/hideOpRef\.current = op;/);
    expect(hide).toMatch(/if \(hideOpRef\.current === op\) hideOpRef\.current = null/);
  });

  it('ответы «Верно/Неверно» не принимаются, пока идёт запись скрытия или возврата', () => {
    expect(src).toMatch(/submitting \|\| feedback \|\| submissionLatchRef\.current \|\| hideOpRef\.current \|\| undoInFlightRef\.current/);
  });
});

describe('«Вернуть»: задание сразу, запись после записи скрытия', () => {
  it('панель скрытия убирается до записи, запись ждёт скрытие и откатывается при сбое', () => {
    expect(undo.indexOf('setHiddenUndo(null)')).toBeLessThan(undo.indexOf('appendMistakeEvent'));
    expect(undo).toMatch(/hideOpRef\.current \? await hideOpRef\.current : true/);
    expect(undo).toContain("reason: 'hide_not_written'");
    expect(undo).toMatch(/setHiddenUndo\(\(cur\) => cur \?\? undoState\)/);
    expect(undo).toContain('restoreToast()');
    expect(undo).toContain("'[MISTAKES-GATE] restore:failed'");
  });

  it('повторный тап «Вернуть» игнорируется с причиной, замок снимается в finally', () => {
    expect(undo).toContain("reason: 'already_restoring'");
    expect(undo).toMatch(/finally \{\n\s*undoInFlightRef\.current = false;/);
  });
});

describe('«Продолжить» после скрытия', () => {
  it('не уходит дальше, пока скрытие не записано; при сбое остаётся на задании', () => {
    expect(cont).toContain("reason: 'hide_still_writing'");
    expect(cont).toMatch(/writing\.then\(\(written\) => \{\n\s*if \(!written\) \{/);
    expect(cont).toContain("reason: 'hide_not_written'");
    expect(cont).toContain("reason: 'no_hidden_state'");
  });
});
