// зачем (координатор 15.10, 🔴): холодный кэш + платящий + таймаут проверки → урок ОТКРЫЛСЯ (а не пейвол на входе). Кэш доступа сброшен перед проверкой, поэтому холодный `false` не доходит до замка урока.
import { NEXT_LESSON_ACCESS_TIMEOUT_MS, resolveNextLessonAccess } from '../app/lesson_next_access';

describe('«Следующий урок»: холодный кэш, платящий, проверка не отвечает', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('кэш доступа холодный (false), контекст ещё не Plus, проверка зависла → за потолок урок открыт, пейвола нет, кэш сброшен', async () => {
    let cache: boolean | null = false; // холодный false, пришедший из проверки без облака
    const prepare = jest.fn(() => { cache = null; });
    const verify = jest.fn(() => new Promise<boolean>(() => undefined)); // сеть не отвечает
    const pending = resolveNextLessonAccess({ needsPremium: true, contextPremium: () => false, prepare, verify });
    jest.advanceTimersByTime(NEXT_LESSON_ACCESS_TIMEOUT_MS + 1);
    await expect(pending).resolves.toBe('open');
    expect(prepare).toHaveBeenCalledTimes(1);
    expect(cache).toBeNull(); // замок урока на входе не прочитает холодный false из кэша — спросит сам
  });

  it('то же, но за время ожидания подписка в контексте подтвердилась → открыт', async () => {
    let context = false;
    const pending = resolveNextLessonAccess({ needsPremium: true, contextPremium: () => context, prepare: jest.fn(), verify: () => new Promise<boolean>(() => undefined) });
    jest.advanceTimersByTime(NEXT_LESSON_ACCESS_TIMEOUT_MS - 100);
    context = true;
    jest.advanceTimersByTime(200);
    await expect(pending).resolves.toBe('open');
  });

  it('поздний ответ «нет» после таймаута принятое решение не меняет (урок уже открыт)', async () => {
    let late: (value: boolean) => void = () => undefined;
    const pending = resolveNextLessonAccess({ needsPremium: true, contextPremium: () => false, prepare: jest.fn(), verify: () => new Promise<boolean>((resolve) => { late = resolve; }) });
    jest.advanceTimersByTime(NEXT_LESSON_ACCESS_TIMEOUT_MS + 1);
    await expect(pending).resolves.toBe('open');
    late(false);
    await Promise.resolve();
  });
});
