// зачем (координатор 12.10, R1 «Уроки 3,6 с до первого кадра», «сперва логи»): сторож трассировки [LESSONS-BOOT] — видно,
// был ли снимок списка готов к монтажу вкладки, кто читал хранилище и сколько это заняло; битый список открытых уроков не молчит.
import fs from 'node:fs';
import path from 'node:path';

const read = (rel: string) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

describe('[LESSONS-BOOT] трассировка данных списка Уроков', () => {
  test('снимок: промах/попадание, чтение с вызывающим, длительности, причина отказа разбора', () => {
    const src = read('app/lessons_tab_state.ts');
    for (const needle of [
      "lessonsBootTrace('initial_state'",
      "lessonsBootTrace('load:start'",
      "lessonsBootTrace('load:done'",
      'multiGetMs,',
      'parseMs:',
      "'skipped_generation_changed'",
      '[LESSONS-BOOT] unlocked_parse_failed',
    ]) {
      expect(src).toContain(needle);
    }
    expect(src).toContain("caller: string = 'unspecified'");
  });

  test('ранний прогрев в _layout: запланирован, ожидание, пропуск с причиной, вызывающий layout_prime', () => {
    const src = read('app/_layout.tsx');
    expect(src).toContain('[LESSONS-BOOT] layout_prime:scheduled');
    expect(src).toContain('[LESSONS-BOOT] layout_prime:skip');
    expect(src).toContain('[LESSONS-BOOT] layout_prime:fire');
    expect(src).toContain("loadLessonsTabStateFromStorage(studyTarget, 'layout_prime')");
    expect(read('components/DialogsTabContent.tsx')).toContain("loadLessonsTabStateFromStorage(studyTarget, 'dialogs_tab')");
  });

  test('чтение пишет start/done и кладёт снимок — следующий initial_state это попадание', async () => {
    (globalThis as { __DEV__?: boolean }).__DEV__ = true;
    jest.resetModules();
    const log = jest.spyOn(console, 'log').mockImplementation(() => {});
    const tab = await import('../app/lessons_tab_state');
    expect(tab.getLessonsTabInitialState('en')).toBeNull();
    await tab.loadLessonsTabStateFromStorage('en', 'test');
    expect(tab.getLessonsTabInitialState('en')).not.toBeNull();
    const lines = log.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith('[LESSONS-BOOT]'));
    expect(lines.some((line) => line.includes('initial_state') && line.includes('"result":"miss"'))).toBe(true);
    expect(lines.some((line) => line.includes('load:start') && line.includes('"caller":"test"'))).toBe(true);
    expect(lines.some((line) => line.includes('load:done') && line.includes('"cachedResult":"stored"'))).toBe(true);
    expect(lines.some((line) => line.includes('initial_state') && line.includes('"result":"hit"'))).toBe(true);
    log.mockRestore();
  });
});
