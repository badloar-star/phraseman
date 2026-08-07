import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const source = fs
  .readFileSync(path.join(ROOT, 'app/daily_tasks.ts'), 'utf8')
  .replace(/\r\n/g, '\n');

function slice(start: string, end: string): string {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from).toBeGreaterThanOrEqual(0);
  expect(to).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('daily reroll durability contract', () => {
  it('uses strict state reads and verifies the authoritative write', () => {
    const save = slice('const saveRerollStateStrict', '/**\n * Progress is a derived cache');
    expect(source).toContain('const loadRerollStateStrict');
    expect(save).toContain('await AsyncStorage.setItem(key, serialized);');
    expect(save).toContain('const verified = await AsyncStorage.getItem(key);');
    expect(save).toContain("throw new Error('daily_task_reroll_state_not_persisted')");
    expect(save).not.toContain('catch');
  });

  it('commits the mapping before best-effort derived progress', () => {
    const reroll = slice('export const rerollDailyTask', '// ── Рантайм-доступность');
    const stateWrite = reroll.indexOf('await saveRerollStateStrict({');
    const progressWrite = reroll.indexOf('await writeDerivedRerollProgressBestEffort');
    expect(stateWrite).toBeGreaterThanOrEqual(0);
    expect(progressWrite).toBeGreaterThan(stateWrite);
    expect(reroll).toContain('const state = await loadRerollStateStrict(studyTarget);');
    expect(reroll).not.toContain('await saveRerollState(');
  });

  it('reapplies the authoritative mapping after runtime fallbacks are resolved', () => {
    expect(source).toContain('const applyRerollReplacementsToResolvedTasks');
    expect(source.match(/applyRerollReplacementsToResolvedTasks\(finalized, rerollState\.replacements\)/g)).toHaveLength(2);
  });

  it('treats progress as recoverable derived data', () => {
    const progress = slice('const writeDerivedRerollProgressBestEffort', '/** Сколько замен ещё доступно сегодня. */');
    expect(progress).toContain("DebugLogger.error('daily_tasks:writeDerivedRerollProgressBestEffort'");
    expect(progress).toContain("throw new Error('daily_task_reroll_progress_not_persisted')");
    expect(progress).toContain('catch (error)');
  });
});
