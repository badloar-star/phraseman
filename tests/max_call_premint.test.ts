// Заготовка минта MAX-звонка (app/max_call_premint): чистый модуль под jest.
// зачем: владелец 2026-08-16 — тап «Позвонить» должен соединять мгновенно;
// минт стартует на пре-экране, экран звонка забирает готовую заготовку.

import {
  PREMINT_MAX_AGE_MS,
  PREMINT_MIN_TOKEN_REMAINING_MS,
  PREMINT_RELEASE_WAIT_MS,
  __resetPremintForTests,
  abandonForeignPremint,
  abandonPremint,
  beginPremint,
  claimPremint,
  isMaxCallLineBusy,
  isPremintUsable,
  markPremintHandoff,
  setMaxCallLineBusy,
  mintAfterRelease,
  premintKey,
} from '../app/max_call_premint';
import type { MaxVoiceMintResponse } from '../app/max_call_client';

const NOW = 1_800_000_000_000;

function mintOf(id: string, expiresAtSec?: number): MaxVoiceMintResponse {
  return {
    value: `ek_${id}`,
    session_id: id,
    max_seconds: 300,
    wrapUpText: '[WRAP_UP]',
    ...(expiresAtSec !== undefined ? { expires_at: expiresAtSec } : {}),
  };
}

const flush = async (): Promise<void> => {
  for (let i = 0; i < 6; i += 1) await Promise.resolve();
};

beforeEach(() => {
  __resetPremintForTests();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('premintKey', () => {
  it('одинаковые параметры → один ключ; companion не зависит от scenarioId', () => {
    expect(premintKey({ format: 'scenario', scenarioId: 'coffee', cefr: 'A2' }))
      .toBe(premintKey({ format: 'scenario', scenarioId: 'coffee', cefr: 'A2' }));
    expect(premintKey({ format: 'companion', scenarioId: 'coffee' }))
      .toBe(premintKey({ format: 'companion', scenarioId: 'hotel' }));
    expect(premintKey({ format: 'scenario', scenarioId: 'coffee' }))
      .not.toBe(premintKey({ format: 'scenario', scenarioId: 'hotel' }));
    expect(premintKey({ format: 'scenario', scenarioId: 'coffee', devMode: true }))
      .not.toBe(premintKey({ format: 'scenario', scenarioId: 'coffee' }));
    expect(premintKey({ format: 'tutor', studyTarget: 'es' }))
      .not.toBe(premintKey({ format: 'tutor', studyTarget: 'en' }));
  });
});

describe('годность заготовки', () => {
  it('с expires_at: годна, пока до истечения токена ≥20с', () => {
    const mint = mintOf('a', Math.floor(NOW / 1000) + 60);
    expect(isPremintUsable(mint, NOW - 100_000, NOW)).toBe(true); // возраст не важен
    expect(isPremintUsable(mint, NOW, NOW + 60_000 - PREMINT_MIN_TOKEN_REMAINING_MS)).toBe(true);
    expect(isPremintUsable(mint, NOW, NOW + 60_000 - PREMINT_MIN_TOKEN_REMAINING_MS + 1000)).toBe(false);
  });

  it('без expires_at (старый сервер, TTL 60с): годна не старше 40с', () => {
    const mint = mintOf('a');
    expect(isPremintUsable(mint, NOW, NOW + PREMINT_MAX_AGE_MS)).toBe(true);
    expect(isPremintUsable(mint, NOW, NOW + PREMINT_MAX_AGE_MS + 1)).toBe(false);
  });
});

describe('жизненный цикл: begin → handoff → claim', () => {
  it('экран звонка забирает ту же заготовку ровно один раз; повторный claim → null', async () => {
    const mintFn = jest.fn(async () => mintOf('s1'));
    const key = premintKey({ format: 'scenario', scenarioId: 'coffee' });
    const entry = beginPremint(key, mintFn, NOW, jest.fn());
    await flush();
    expect(mintFn).toHaveBeenCalledTimes(1);

    markPremintHandoff(key);
    const claimed = claimPremint(key);
    expect(claimed).toBe(entry);
    await expect(claimed!.promise).resolves.toMatchObject({ session_id: 's1' });
    expect(claimPremint(key)).toBeNull();
  });

  it('повторный begin с тем же ключом переиспользует живую заготовку (минт один)', async () => {
    const mintFn = jest.fn(async () => mintOf('s1'));
    const key = premintKey({ format: 'scenario', scenarioId: 'coffee' });
    const a = beginPremint(key, mintFn, NOW, jest.fn());
    const b = beginPremint(key, mintFn, NOW + 500, jest.fn());
    await flush();
    expect(a).toBe(b);
    expect(mintFn).toHaveBeenCalledTimes(1);
  });

  it('чужой ключ → claim null (заготовка другого сценария не подходит)', async () => {
    beginPremint(premintKey({ format: 'scenario', scenarioId: 'coffee' }), async () => mintOf('s1'), NOW, jest.fn());
    await flush();
    expect(claimPremint(premintKey({ format: 'scenario', scenarioId: 'hotel' }))).toBeNull();
  });
});

describe('abandon: брошенная заготовка возвращает резерв', () => {
  it('ушёл с пре-экрана без звонка → release(mint) после разрешения минта; claim больше не отдаёт', async () => {
    const release = jest.fn(async () => {});
    const key = premintKey({ format: 'scenario', scenarioId: 'coffee' });
    beginPremint(key, async () => mintOf('s1'), NOW, release);
    abandonPremint(key, release);
    await flush();
    expect(release).toHaveBeenCalledWith(expect.objectContaining({ session_id: 's1' }));
    expect(claimPremint(key)).toBeNull();
  });

  it('после handoff cleanup пре-экрана — no-op: резерв уедет экрану звонка', async () => {
    const release = jest.fn(async () => {});
    const key = premintKey({ format: 'scenario', scenarioId: 'coffee' });
    beginPremint(key, async () => mintOf('s1'), NOW, release);
    markPremintHandoff(key);
    abandonPremint(key, release);
    await flush();
    expect(release).not.toHaveBeenCalled();
    expect(claimPremint(key)).not.toBeNull();
  });

  it('упавшая заготовка: release не зовётся, claim отдаёт отклонённый промис (экран сделает свежий минт)', async () => {
    const release = jest.fn(async () => {});
    const key = premintKey({ format: 'scenario', scenarioId: 'coffee' });
    const entry = beginPremint(key, async () => { throw new Error('voice_provider_failed'); }, NOW, release);
    await flush();
    const claimed = claimPremint(key);
    expect(claimed).toBe(entry);
    await expect(claimed!.promise).rejects.toThrow('voice_provider_failed');
    expect(release).not.toHaveBeenCalled();
  });
});

describe('очередь release → следующий минт (защита от voice_session_active)', () => {
  it('быстрое «назад → снова на пре-экран»: новый минт ждёт release брошенной заготовки', async () => {
    let releaseDone!: () => void;
    const release = jest.fn(() => new Promise<void>((resolve) => { releaseDone = resolve; }));
    const key = premintKey({ format: 'scenario', scenarioId: 'coffee' });
    beginPremint(key, async () => mintOf('s1'), NOW, release);
    await flush();
    abandonPremint(key, release);
    await flush();
    expect(release).toHaveBeenCalledTimes(1);

    const mintFn2 = jest.fn(async () => mintOf('s2'));
    beginPremint(key, mintFn2, NOW + 1000, release);
    await flush();
    expect(mintFn2).not.toHaveBeenCalled(); // ждём, пока сервер отпустит s1

    releaseDone();
    await flush();
    expect(mintFn2).toHaveBeenCalledTimes(1);
  });

  it('зависший release не держит звонок дольше PREMINT_RELEASE_WAIT_MS', async () => {
    const release = jest.fn(() => new Promise<void>(() => {})); // никогда не разрешится
    const key = premintKey({ format: 'scenario', scenarioId: 'coffee' });
    beginPremint(key, async () => mintOf('s1'), NOW, release);
    await flush();
    abandonPremint(key, release);
    await flush();

    const fresh = jest.fn(async () => mintOf('s2'));
    const promise = mintAfterRelease(fresh);
    await flush();
    expect(fresh).not.toHaveBeenCalled();
    jest.advanceTimersByTime(PREMINT_RELEASE_WAIT_MS);
    await flush();
    expect(fresh).toHaveBeenCalledTimes(1);
    await expect(promise).resolves.toMatchObject({ session_id: 's2' });
  });
});

// зачем (владелец 2026-09-02, лог 20:23:07): прогрев рекомендованного урока на
// экране «Уроки с МАКСом» создаёт НАСТОЯЩИЙ резерв (performMaxVoiceMint) и
// стрелял, пока звонок уже шёл — экран остаётся смонтированным под экраном
// звонка, и его эффект перезапускался. Лучший исход — платный вызов впустую и
// мусорный voice_session_active; худший — прогрев успевает создать резерв и
// блокирует СЛЕДУЮЩИЙ звонок ровно как в исходном баге.
describe('линия занята живым звонком: прогревы её не трогают', () => {
  beforeEach(() => {
    __resetPremintForTests();
  });

  it('по умолчанию линия свободна', () => {
    expect(isMaxCallLineBusy()).toBe(false);
  });

  it('экран звонка занимает линию и отпускает её', () => {
    setMaxCallLineBusy(true);
    expect(isMaxCallLineBusy()).toBe(true);
    setMaxCallLineBusy(false);
    expect(isMaxCallLineBusy()).toBe(false);
  });

  it('сброс для тестов освобождает линию — залипший флаг заглушил бы прогрев навсегда', () => {
    setMaxCallLineBusy(true);
    __resetPremintForTests();
    expect(isMaxCallLineBusy()).toBe(false);
  });
});

// зачем (владелец 2026-09-02, лог 20:56:48→20:56:59): раздел уроков прогрел
// a1_greet, человек нажал a1_ask_name. Ключи разные → claimPremint вернул null
// → экран звонка минтил ПАРАЛЛЕЛЬНО с прогревом → второй получил «линия
// занята». Чужая заготовка обязана отпускаться ДО своего минта, а свой минт —
// ждать её возврата (mintAfterRelease).
describe('abandonForeignPremint — чужая заготовка отпускается до своего минта', () => {
  const FOREIGN = 'tutor|coffee|A1||en|a1_greet';
  const OWN = 'tutor|coffee|A1||en|a1_ask_name';
  const mintOf = (id: string): MaxVoiceMintResponse => ({
    value: 'v', session_id: id, max_seconds: 300, wrapUpText: '[WRAP_UP]',
  });

  beforeEach(() => {
    __resetPremintForTests();
  });

  it('отпускает pending-заготовку с ДРУГИМ ключом и возвращает её ключ', async () => {
    const release = jest.fn().mockResolvedValue(undefined);
    beginPremint(FOREIGN, () => Promise.resolve(mintOf('sess-foreign')), NOW, release);

    expect(abandonForeignPremint(OWN, release)).toBe(FOREIGN);
    // Минт заготовки идёт через afterPendingRelease (несколько прыжков
    // микротасков), потом release — flush дважды с запасом.
    await flush();
    await flush();
    expect(release).toHaveBeenCalledWith(mintOf('sess-foreign'));
    // Отпущенную больше никому не отдаём.
    expect(claimPremint(FOREIGN)).toBeNull();
  });

  it('свою заготовку не трогает', () => {
    const release = jest.fn().mockResolvedValue(undefined);
    beginPremint(OWN, () => Promise.resolve(mintOf('sess-own')), NOW, release);

    expect(abandonForeignPremint(OWN, release)).toBeNull();
    expect(release).not.toHaveBeenCalled();
    expect(claimPremint(OWN)).not.toBeNull();
  });

  it('без заготовки — null и ни одного вызова release', () => {
    const release = jest.fn().mockResolvedValue(undefined);
    expect(abandonForeignPremint(OWN, release)).toBeNull();
    expect(release).not.toHaveBeenCalled();
  });

  it('свой минт через mintAfterRelease стартует ТОЛЬКО после возврата чужого резерва', async () => {
    const order: string[] = [];
    let finishRelease: () => void = () => {};
    const release = jest.fn().mockImplementation(() => new Promise<void>((resolve) => {
      order.push('release:start');
      finishRelease = () => { order.push('release:done'); resolve(); };
    }));
    beginPremint(FOREIGN, () => Promise.resolve(mintOf('sess-foreign')), NOW, release);

    abandonForeignPremint(OWN, release);
    const own = mintAfterRelease(async () => { order.push('own-mint'); return mintOf('sess-own'); });
    await flush();
    await flush();
    expect(order).toEqual(['release:start']);

    finishRelease();
    await flush();
    await own;
    expect(order).toEqual(['release:start', 'release:done', 'own-mint']);
  });
});
