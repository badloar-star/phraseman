// PM-229 — помощники «проглотил — напиши причину» (app/swallow_log.ts).
// зачем: замена немых catch не имеет права ни менять поведение вызывающего, ни бросать сама:
// значение по умолчанию прежнее, причина уходит в журнал, а недоступный журнал не ломает путь.
const mockReportSwallowed = jest.fn();

jest.mock('../app/debug-logger', () => ({
  reportSwallowed: (...args: unknown[]) => mockReportSwallowed(...args),
}));

import { noteSwallowed, noteSwallowedAs, noteSwallowedHandler } from '../app/swallow_log';

describe('PM-229 swallow_log', () => {
  beforeEach(() => {
    mockReportSwallowed.mockReset();
  });

  test('noteSwallowed пишет тег и причину в журнал', () => {
    const error = new Error('boom');
    noteSwallowed('mod:op', error);
    expect(mockReportSwallowed).toHaveBeenCalledWith('mod:op', error);
  });

  test('noteSwallowedHandler: отклонённый промис превращается в undefined, причина записана', async () => {
    const error = new Error('rejected');
    const result = await Promise.reject(error).catch(noteSwallowedHandler('mod:handler'));
    expect(result).toBeUndefined();
    expect(mockReportSwallowed).toHaveBeenCalledWith('mod:handler', error);
  });

  test('noteSwallowedAs: возвращает прежнее значение по умолчанию и пишет причину', async () => {
    const error = new Error('nope');
    const asNull = await Promise.reject(error).catch(noteSwallowedAs('mod:null', null));
    const asFalse = await Promise.reject(error).catch(noteSwallowedAs('mod:false', false));
    expect(asNull).toBeNull();
    expect(asFalse).toBe(false);
    expect(mockReportSwallowed).toHaveBeenCalledTimes(2);
  });

  test('успешный промис не трогает журнал', async () => {
    const value = await Promise.resolve(7).catch(noteSwallowedAs('mod:ok', 0));
    expect(value).toBe(7);
    expect(mockReportSwallowed).not.toHaveBeenCalled();
  });

  test('журнал бросает — вызывающий всё равно получает значение по умолчанию', async () => {
    mockReportSwallowed.mockImplementation(() => { throw new Error('logger down'); });
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const value = await Promise.reject(new Error('x')).catch(noteSwallowedAs('mod:logger_down', 'fallback'));
    expect(value).toBe('fallback');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
