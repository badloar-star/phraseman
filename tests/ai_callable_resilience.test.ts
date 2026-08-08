/**
 * Сторож устойчивости платных ИИ-вызовов (app/ai_callable_resilience.ts).
 *
 * Контекст: инцидент 2026-08-04 — Cloud Monitoring прислал «AI Cloud Run no
 * available instance». Все три платные ИИ-функции держат minInstances: 0
 * (осознанная экономия, сторож ai_functions_warm_instance_contract), поэтому
 * холодный старт неизбежен и лечится на клиенте: прогрев + тихий повтор.
 *
 * Главное, что охраняет этот файл, — ГРАНИЦА ПОВТОРА. Повторить вызов, который
 * уже списал квоту или деньги за OpenAI, значит списать дважды. Тесты ниже
 * фиксируют, что повторяются ТОЛЬКО сбои «сервер не начал работу».
 */
import {
  isColdStartLike,
  isDefinitelyNotStarted,
  aiAttemptTimeoutMs,
  withAiCallableRetry,
  shouldWarmNow,
  warmAiFunction,
  __resetAiWarmStateForTests,
} from '../app/ai_callable_resilience';

beforeEach(() => {
  __resetAiWarmStateForTests();
});

describe('isColdStartLike — граница безопасного повтора', () => {
  it.each([
    ['ошибка из алерта Cloud Monitoring', 'no available instance'],
    ['инстанс недоступен', 'functions/unavailable'],
    ['сервер не ответил в срок', 'deadline-exceeded'],
    ['сторож таймаута на клиенте', 'explain_callable_timeout'],
    ['обрыв сети RN', 'Network request failed'],
  ])('повторяет: %s', (_case, message) => {
    expect(isColdStartLike(new Error(message))).toBe(true);
  });

  it('таймаут разрешён только идемпотентным вызовам, но НЕ списывающим', () => {
    // Разбор аудита 2026-08-04: таймаут ≠ «сервер не начал». Запрос мог дойти,
    // снять квоту и генерировать ответ. Для explainPhrase/explainMistake повтор
    // безвреден, для premiumDialogSend — это второе списание.
    const timeout = new Error('explain_callable_timeout');
    expect(isColdStartLike(timeout)).toBe(true);
    expect(isDefinitelyNotStarted(timeout)).toBe(false);
  });

  it.each([
    ['дневной free-кап', 'explain_free_daily_limit'],
    ['кап premium-диалогов', 'dialog_premium_cap'],
    ['глобальный бюджет ИИ', 'explain_global_budget'],
    ['лимит частоты', 'resource-exhausted'],
    ['нет авторизации', 'unauthenticated'],
    ['доступ запрещён', 'permission-denied'],
    ['рубильник ИИ выключен', 'ai_globally_disabled'],
    ['битый запрос', 'invalid-argument'],
  ])('НЕ повторяет: %s', (_case, message) => {
    expect(isColdStartLike(new Error(message))).toBe(false);
  });

  it('НЕ повторяет internal — сервер вошёл в тело и мог заплатить за OpenAI', () => {
    // Именно это отличает 'internal' от 'unavailable': запрос дошёл до функции,
    // а значит повтор рискует оплатить генерацию во второй раз.
    expect(isColdStartLike(new Error('functions/internal'))).toBe(false);
  });

  it('читает поле code, а не только текст (формат ошибок Firebase SDK)', () => {
    expect(isColdStartLike({ code: 'functions/unavailable' })).toBe(true);
    expect(isColdStartLike({ code: 'functions/resource-exhausted' })).toBe(false);
  });
});

describe('isDefinitelyNotStarted — защита списывающих вызовов', () => {
  /**
   * Дефект, найденный аудитом 2026-08-04: premiumDialogSend списывает дневную
   * квоту (enforceDailyQuota) ДО обращения к OpenAI. Повтор по таймауту снял бы
   * вторую единицу и отправил сообщение дважды. Серверный откат квоты спасает
   * только от сбоя провайдера — при клиентском таймауте сервер завершается
   * УСПЕШНО и ничего не откатывает.
   */
  it.each([
    ['отказ Cloud Run на входе', 'no available instance'],
    ['сервис не поднят', 'functions/unavailable'],
    ['сеть не поднялась', 'Network request failed'],
    ['обрыв соединения', 'ECONNRESET'],
  ])('разрешает повтор: %s', (_case, message) => {
    expect(isDefinitelyNotStarted(new Error(message))).toBe(true);
  });

  it.each([
    ['клиентский таймаут — запрос мог дойти', 'explain_callable_timeout'],
    ['серверный дедлайн — функция могла отработать', 'deadline-exceeded'],
    ['внутренняя ошибка — тело функции выполнялось', 'functions/internal'],
    ['квота исчерпана', 'dialog_premium_cap'],
  ])('ЗАПРЕЩАЕТ повтор: %s', (_case, message) => {
    expect(isDefinitelyNotStarted(new Error(message))).toBe(false);
  });
});

describe('aiAttemptTimeoutMs — ожидание не растягивается вдвое', () => {
  /**
   * Дефект, найденный аудитом 2026-08-04: без укорочения худший случай был
   * 35с + 1.6с + 35с ≈ 72 секунды до показа ошибки — пользователь решил бы,
   * что приложение умерло.
   */
  it('первая попытка ждёт полное окно', () => {
    expect(aiAttemptTimeoutMs(35000, 1)).toBe(35000);
  });

  it('вторая попытка ждёт вдвое меньше', () => {
    expect(aiAttemptTimeoutMs(35000, 2)).toBe(17500);
  });

  it('суммарное ожидание остаётся в разумных рамках (< 55 секунд)', () => {
    const RETRY_PAUSE_MS = 1600;
    const worstCase = aiAttemptTimeoutMs(35000, 1) + RETRY_PAUSE_MS + aiAttemptTimeoutMs(35000, 2);
    expect(worstCase).toBeLessThan(55000);
  });
});

describe('withAiCallableRetry', () => {
  it('сообщает фабрике номер попытки — иначе таймаут не укоротить', () => {
    const attempts: number[] = [];
    const call = jest.fn((attempt: 1 | 2) => {
      attempts.push(attempt);
      return attempt === 1
        ? Promise.reject(new Error('no available instance'))
        : Promise.resolve('ok');
    });
    return withAiCallableRetry(call, { label: 'x', retryDelayMs: 0 }).then(() => {
      expect(attempts).toEqual([1, 2]);
    });
  });

  it('не трогает сеть повторно, когда первый вызов удался', async () => {
    const call = jest.fn().mockResolvedValue('ok');
    await expect(withAiCallableRetry(call, { label: 'x', retryDelayMs: 0 })).resolves.toBe('ok');
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('тихо повторяет холодный старт и отдаёт результат второй попытки', async () => {
    const call = jest.fn()
      .mockRejectedValueOnce(new Error('no available instance'))
      .mockResolvedValueOnce('ok');
    await expect(withAiCallableRetry(call, { label: 'x', retryDelayMs: 0 })).resolves.toBe('ok');
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('повторяет РОВНО один раз — второй сбой уходит пользователю честной ошибкой', async () => {
    // Бесконечный backoff на сломанном сервере тянул бы ожидание и жёг деньги.
    const call = jest.fn().mockRejectedValue(new Error('no available instance'));
    await expect(withAiCallableRetry(call, { label: 'x', retryDelayMs: 0 })).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(2);
  });

  it('НЕ повторяет исчерпанный лимит — иначе списали бы квоту дважды', async () => {
    const call = jest.fn().mockRejectedValue(new Error('dialog_premium_cap'));
    await expect(withAiCallableRetry(call, { label: 'x', retryDelayMs: 0 })).rejects.toThrow();
    expect(call).toHaveBeenCalledTimes(1);
  });

  it('зовёт onRetryStart, чтобы UI сменил подпись под скелетоном', async () => {
    const onRetryStart = jest.fn();
    const call = jest.fn()
      .mockRejectedValueOnce(new Error('unavailable'))
      .mockResolvedValueOnce('ok');
    await withAiCallableRetry(call, { label: 'x', retryDelayMs: 0, onRetryStart });
    expect(onRetryStart).toHaveBeenCalledTimes(1);
  });

  it('на успехе подпись не меняет — пользователь про сбой не узнаёт', async () => {
    const onRetryStart = jest.fn();
    await withAiCallableRetry(() => Promise.resolve('ok'), { label: 'x', onRetryStart });
    expect(onRetryStart).not.toHaveBeenCalled();
  });

  it('создаёт НОВЫЙ вызов на повторе, а не переиспользует отклонённый промис', async () => {
    const seen: number[] = [];
    let attempt = 0;
    const call = () => {
      attempt += 1;
      seen.push(attempt);
      return attempt === 1
        ? Promise.reject(new Error('unavailable'))
        : Promise.resolve('ok');
    };
    await withAiCallableRetry(call, { label: 'x', retryDelayMs: 0 });
    expect(seen).toEqual([1, 2]);
  });
});

describe('shouldWarmNow — экономия на прогреве', () => {
  it('будит, когда функцию ещё не грели', () => {
    expect(shouldWarmNow(undefined, 1_000_000)).toBe(true);
  });

  it('НЕ будит внутри TTL — инстанс ещё тёплый, вызов был бы тратой', () => {
    const now = 1_000_000;
    expect(shouldWarmNow(now - 60_000, now)).toBe(false);
  });

  it('будит снова, когда инстанс мог погаснуть', () => {
    const now = 1_000_000;
    expect(shouldWarmNow(now - 10 * 60_000, now)).toBe(true);
  });
});

describe('warmAiFunction', () => {
  it('будит инстанс при первом обращении', async () => {
    const ping = jest.fn().mockResolvedValue(undefined);
    await warmAiFunction('explainPhrase', ping, 1_000_000);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('не бьёт сеть повторно внутри TTL (серия ошибок подряд = один прогрев)', async () => {
    const ping = jest.fn().mockResolvedValue(undefined);
    await warmAiFunction('explainMistake', ping, 1_000_000);
    await warmAiFunction('explainMistake', ping, 1_000_000 + 30_000);
    expect(ping).toHaveBeenCalledTimes(1);
  });

  it('считает TTL отдельно для каждой функции', async () => {
    const ping = jest.fn().mockResolvedValue(undefined);
    await warmAiFunction('explainPhrase', ping, 1_000_000);
    await warmAiFunction('premiumDialogSend', ping, 1_000_000);
    expect(ping).toHaveBeenCalledTimes(2);
  });

  it('НИКОГДА не бросает — провал прогрева не имеет права уронить экран', async () => {
    const ping = jest.fn().mockRejectedValue(new Error('offline'));
    await expect(warmAiFunction('explainPhrase', ping, 1_000_000)).resolves.toBeUndefined();
  });

  it('склеивает одновременные вызовы в один — двойной тап не будит дважды', async () => {
    const pending: Array<() => void> = [];
    const ping = jest.fn(() => new Promise<void>((res) => { pending.push(res); }));
    const first = warmAiFunction('explainPhrase', ping, 1_000_000);
    const second = warmAiFunction('explainPhrase', ping, 1_000_000);
    expect(ping).toHaveBeenCalledTimes(1);
    pending.forEach((res) => res());
    await Promise.all([first, second]);
  });
});
