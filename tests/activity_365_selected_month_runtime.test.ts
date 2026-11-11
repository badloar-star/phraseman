import * as fs from 'node:fs';
import * as path from 'node:path';
import * as ts from 'typescript';

// зачем (U03, 11.11): «Статистика 365» — одно окно календаря. Тап по квадрату года открывает его на месяце
// этого квадрата (в том числе самом старом) уже с выбранным днём; одно закрытие возвращает в «Статистику».
const source = fs
  .readFileSync(path.join(__dirname, '..', 'components', 'ActivityHeatmap365.tsx'), 'utf8')
  .replace(/\r\n/g, '\n');

type Calls = { month: Array<string | null>; day: Array<string | null> };

function liveHandler(tag: string, prop: string, argument: string): { run: (value?: string) => void; calls: Calls } {
  const start = source.lastIndexOf(tag);
  const block = source.slice(start, source.indexOf('\n      />', start));
  const handler = new RegExp(`${prop}=\\{(\\(${argument}\\) => \\{[\\s\\S]*?\\n        \\})\\}`).exec(block)?.[1] ?? '';
  expect(handler).not.toBe('');
  const output = ts.transpileModule(`module.exports = ${handler};`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: undefined as unknown };
  const calls: Calls = { month: [], day: [] };
  Function('module', 'exports', 'yearModel', 'monthOpen', 'setMonthOpen', 'setDayOpen', 'console', output)(
    module,
    module.exports,
    { monthKeys: ['2025-11', '2026-06', '2026-11'] },
    '2025-11',
    (value: string | null) => calls.month.push(value),
    (value: string | null) => calls.day.push(value),
    { log() {} },
  );
  return { run: module.exports as (value?: string) => void, calls };
}

describe('ActivityHeatmap365: одно окно календаря на год (U03)', () => {
  it.each([
    ['2025-11-12', '2025-11'], // самый старый месяц окна в 365 дней
    ['2026-06-30', '2026-06'],
    ['2026-11-11', '2026-11'],
  ])('тап по квадрату %s открывает месяц %s сразу с этим днём', (dateKey, monthKey) => {
    const { run, calls } = liveHandler('<CanonicalYearHeatmap', 'onOpenDay', 'dateKey');
    run(dateKey);
    expect(calls.month).toEqual([monthKey]);
    expect(calls.day).toEqual([dateKey]);
  });

  it('одно закрытие снимает и месяц, и день — под окном сразу «Статистика»', () => {
    const { run, calls } = liveHandler('<MonthExplorerModal', 'onClose', '');
    run();
    expect(calls.month).toEqual([null]);
    expect(calls.day).toEqual([null]);
  });

  it('окно одно: полоска года не ведёт на отдельный экран и не открывает второе окно', () => {
    const parent = source.slice(source.indexOf('function ActivityHeatmap365()'));
    expect(parent.match(/<MonthExplorerModal/g)).toHaveLength(1);
    expect(source.match(/<Modal\b/g)).toHaveLength(1);
    expect(source).not.toContain('year_activity');
    expect(source).not.toContain('router.push');
  });

  it('выбранный день показывается внутри этого же окна и не переживает смену месяца', () => {
    const modal = source.slice(source.indexOf('export function MonthExplorerModal'), source.indexOf('function ActivityHeatmap365()'));
    expect(modal).toContain('initialDayKey.startsWith(`${monthKey}-`)');
    expect(modal).toContain('}, [monthKey, visible, initialDayKey]);');
    expect(modal).toContain('testID="activity-365-selected-day"');
    expect(modal.indexOf('testID="activity-365-selected-day"')).toBeLessThan(modal.indexOf('</Modal>'));
  });
});
