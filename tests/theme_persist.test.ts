// зачем (аудит Optimistic UI экрана тем, координатор 15.10): выбор темы применяется мгновенно, запись фоном: повтор, откат при втором сбое, поздний сбой не откатывает новый выбор.
import { createThemePersister, THEME_PERSIST_RETRY_MS, type ThemePersistKind } from '../app/theme_persist';
import { readFileSync } from 'fs';
import { join } from 'path';

function setup(outcomes: Array<'ok' | 'fail'>) {
  const writes: Array<[ThemePersistKind, string]> = [];
  const rollbacks: Array<[ThemePersistKind, string]> = [];
  const failures: ThemePersistKind[] = [];
  const logs: string[] = [];
  let i = 0;
  const persister = createThemePersister({
    write: (kind, value) => { writes.push([kind, value]); const o = outcomes[Math.min(i++, outcomes.length - 1)]; return o === 'ok' ? Promise.resolve() : Promise.reject(new Error('disk')); },
    rollback: (kind, value) => rollbacks.push([kind, value]),
    notifyFailure: (kind) => failures.push(kind),
    log: (m) => logs.push(m),
  });
  return { persister, writes, rollbacks, failures, logs };
}
const flush = async () => { for (let k = 0; k < 6; k += 1) await Promise.resolve(); };

describe('сохранение выбора темы (Optimistic UI)', () => {
  beforeEach(() => { jest.useFakeTimers(); });
  afterEach(() => { jest.useRealTimers(); });

  it('успех: одна запись, отката и сообщения нет', async () => {
    const t = setup(['ok']);
    t.persister.commit('theme', 'rose', 'graphite');
    await flush();
    expect(t.writes).toEqual([['theme', 'rose']]);
    expect(t.rollbacks).toEqual([]);
    expect(t.failures).toEqual([]);
    expect(t.logs).toEqual(['commit', 'write_ok']);
  });

  it('первый сбой → повтор через паузу → успех: без отката', async () => {
    const t = setup(['fail', 'ok']);
    t.persister.commit('appearance', 'light', 'dark');
    await flush();
    expect(t.writes).toHaveLength(1);
    jest.advanceTimersByTime(THEME_PERSIST_RETRY_MS);
    await flush();
    expect(t.writes).toHaveLength(2);
    expect(t.rollbacks).toEqual([]);
    expect(t.failures).toEqual([]);
  });

  it('второй сбой → откат к сохранённому значению и сообщение', async () => {
    const t = setup(['fail', 'fail']);
    t.persister.setPersisted('theme', 'ink');
    t.persister.commit('theme', 'rose', 'marine');
    await flush();
    jest.advanceTimersByTime(THEME_PERSIST_RETRY_MS);
    await flush();
    expect(t.rollbacks).toEqual([['theme', 'ink']]);
    expect(t.failures).toEqual(['theme']);
    expect(t.logs).toContain('write_failed_rollback');
  });

  it('без сохранённого значения откат идёт к прежнему выбору', async () => {
    const t = setup(['fail', 'fail']);
    t.persister.commit('intensity', '0.5', '0');
    await flush();
    jest.advanceTimersByTime(THEME_PERSIST_RETRY_MS);
    await flush();
    expect(t.rollbacks).toEqual([['intensity', '0']]);
  });

  it('двойной тап/гонка: поздний сбой старой записи НЕ откатывает новый выбор', async () => {
    const t = setup(['fail', 'ok', 'fail']);
    t.persister.commit('theme', 'rose', 'graphite');
    await flush();
    t.persister.commit('theme', 'sage', 'rose');
    await flush();
    jest.advanceTimersByTime(THEME_PERSIST_RETRY_MS);
    await flush();
    expect(t.rollbacks).toEqual([]);
    expect(t.failures).toEqual([]);
    // зачем (аудит Optimistic UI, координатор 15.10, дыра №3): повтор старого выбора пропущен: на диске остаётся новый, лишней записи нет
    expect(t.logs).toContain('write_retry_skipped_stale');
    expect(t.writes).toEqual([['theme', 'rose'], ['theme', 'sage']]);
  });

  it('виды выбора независимы: сбой оформления не откатывает тему', async () => {
    const t = setup(['ok', 'fail', 'fail']);
    t.persister.commit('theme', 'rose', 'graphite');
    t.persister.commit('appearance', 'light', 'dark');
    await flush();
    jest.advanceTimersByTime(THEME_PERSIST_RETRY_MS);
    await flush();
    expect(t.rollbacks).toEqual([['appearance', 'dark']]);
  });

  it('ThemeContext подключает persister ко всем трём выборам и пишет [THEMES-SWITCH]', () => {
    const src = readFileSync(join(__dirname, '..', 'components', 'ThemeContext.tsx'), 'utf8').replace(/\r\n/g, '\n');
    for (const call of ["commit('theme', id, previous)", "commit('intensity', String(next), previous)", "commit('appearance', resolved, previous)"]) expect(src).toContain(`persisterRef.current?.${call}`);
    expect(src).toContain('[THEMES-SWITCH]');
    expect(src).toMatch(/setPersisted\('theme', resolved\)/);
  });
});
