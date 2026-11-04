// зачем (Ревизор по 31029c044, 15.10, 🔴 деньги и доверие): «холодный кэш + платящий → урок 4 открывается, пейвола нет». Пейвол — только при подтверждённом «нет».
import { NEXT_LESSON_ACCESS_TIMEOUT_MS, resolveNextLessonAccess } from '../app/lesson_next_access';

describe('«Следующий урок»: открыть или пейвол', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('следующий урок бесплатный — открываем, проверки нет', async () => {
    const verify = jest.fn(async () => false);
    await expect(resolveNextLessonAccess({ needsPremium: false, contextPremium: () => false, contextResolved: () => true, prepare: jest.fn(), verify, decisionConfirmed: () => true })).resolves.toBe('open');
    expect(verify).not.toHaveBeenCalled();
  });

  it('контекст говорит Plus — открываем сразу, кэш не трогаем', async () => {
    const prepare = jest.fn();
    const verify = jest.fn(async () => false);
    await expect(resolveNextLessonAccess({ needsPremium: true, contextPremium: () => true, contextResolved: () => true, prepare, verify, decisionConfirmed: () => true })).resolves.toBe('open');
    expect(prepare).not.toHaveBeenCalled();
    expect(verify).not.toHaveBeenCalled();
  });

  it('stale-positive контекст без resolved не открывает платный урок без проверки', async () => {
    const prepare = jest.fn();
    const verify = jest.fn(async () => true);
    await expect(resolveNextLessonAccess({
      needsPremium: true,
      contextPremium: () => true,
      contextResolved: () => false,
      decisionConfirmed: () => false,
      prepare,
      verify,
    })).resolves.toBe('open');
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(verify).toHaveBeenCalledTimes(1);
  });

  it('ХОЛОДНЫЙ КЭШ + платящий: кэш сброшен, полная проверка вернула Plus → урок 4 открывается, пейвола нет', async () => {
    const order: string[] = [];
    const prepare = jest.fn(() => { order.push('prepare'); });
    const verify = jest.fn(async () => { order.push('verify'); return true; });
    await expect(resolveNextLessonAccess({ needsPremium: true, contextPremium: () => false, contextResolved: () => true, prepare, verify, decisionConfirmed: () => true })).resolves.toBe('open');
    expect(order).toEqual(['prepare', 'verify']);
  });

  it('подтверждённое «нет» (и контекст не Plus) — пейвол', async () => {
    await expect(resolveNextLessonAccess({ needsPremium: true, contextPremium: () => false, contextResolved: () => true, prepare: jest.fn(), verify: async () => false, decisionConfirmed: () => true })).resolves.toBe('paywall');
  });

  it('false без подтверждённого решения остаётся unknown и не открывает пейвол', async () => {
    await expect(resolveNextLessonAccess({
      needsPremium: true,
      contextPremium: () => false,
      contextResolved: () => false,
      decisionConfirmed: () => false,
      prepare: jest.fn(),
      verify: async () => false,
    })).resolves.toBe('open');
  });

  it('«нет» от проверки, но контекст успел стать Plus — открываем', async () => {
    let context = false;
    await expect(resolveNextLessonAccess({ needsPremium: true, contextPremium: () => context, contextResolved: () => true, prepare: jest.fn(), verify: async () => { context = true; return false; }, decisionConfirmed: () => true })).resolves.toBe('open');
  });

  it('нет ответа за потолок 4 с — пейвол НЕ показываем (не подтверждено), открываем; если контекст стал Plus — тоже открываем', async () => {
    const pending = resolveNextLessonAccess({ needsPremium: true, contextPremium: () => false, contextResolved: () => true, prepare: jest.fn(), verify: () => new Promise<boolean>(() => undefined), decisionConfirmed: () => false });
    jest.advanceTimersByTime(NEXT_LESSON_ACCESS_TIMEOUT_MS + 1);
    await expect(pending).resolves.toBe('open');
  });

  it('сбой проверки — не «нет»: пейвола нет', async () => {
    await expect(resolveNextLessonAccess({ needsPremium: true, contextPremium: () => false, contextResolved: () => true, prepare: jest.fn(), verify: async () => { throw new Error('network'); }, decisionConfirmed: () => false })).resolves.toBe('open');
  });
});
