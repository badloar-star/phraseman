// зачем (координатор 29.10, замер холодного старта 146 против HEAD): в релизе нужна точка «JS начал исполняться» —
// отрезок «Start proc» → js_entry показывает нативный старт и загрузку бандла (101 → 122 МБ). Строка обязана быть
// console.warn (prod-сборка вырезает console.log) и печататься один раз на запуск.
describe('[COLD-START] js_entry', () => {
  afterEach(() => {
    delete (globalThis as { __phrasemanEntryEpochMs?: number }).__phrasemanEntryEpochMs;
    jest.restoreAllMocks();
  });

  test('одна строка warn с epochMs при первом импорте, повторный импорт молчит', () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    jest.isolateModules(() => { require('../app/cold_start_entry_mark'); });
    jest.isolateModules(() => { require('../app/cold_start_entry_mark'); });
    const lines = warn.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith('[COLD-START] js_entry'));
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatch(/^\[COLD-START\] js_entry epochMs=\d{13}$/);
  });
});
