/**
 * [SPIRE-GOLD] Ревизор 25.10 по ec03e9e58: «молчаливый минус монет». Золото ступени — отдельная «ожидающая» строка, ответ сервера
 * снимает только её и объясняет тостом. Сторож на все ветки: принято, потолок дня, не засчитано, сервер старый, ступень отвергнута.
 */
jest.mock('../app/debug-logger', () => ({ DebugLogger: { info: jest.fn(), warn: jest.fn() } }));
const mockEmit = jest.fn();
jest.mock('../app/events', () => ({
  emitAppEvent: (...a: unknown[]) => mockEmit(...a),
  actionToastTri: (type: string, m: { ru: string }) => ({ type, messageRu: m.ru }),
}));

import {
  __resetSpirePendingCoinsForTests,
  addSpirePendingCoins,
  spireGoldPendingId,
  spirePendingCoinsHas,
  spirePendingCoinsTotal,
} from '../app/spire/spire_pending_coins';
import { settleSpireGoldFromFlush } from '../app/spire/spire_gold_settle';
import { SPIRE_GOLD_TOAST_DAILY_CAP, SPIRE_GOLD_TOAST_NOT_COUNTED } from '../app/spire/spire_gold_copy';

const NOW = Date.now();
const ME = 'me';

function seed(reportId: string): void {
  addSpirePendingCoins(ME, reportId, 10, NOW, 500);
  addSpirePendingCoins(ME, spireGoldPendingId(reportId), 10, NOW, 500);
}

beforeEach(() => { __resetSpirePendingCoinsForTests(); mockEmit.mockClear(); });

describe('[SPIRE-GOLD] золото снимается отдельно и с объяснением', () => {
  it('сервер засчитал золото → строка золота погашена, тоста нет', () => {
    seed('r1');
    settleSpireGoldFromFlush(ME, { gold: { accepted: ['r1'], skipped: [] } }, [{ reportId: 'r1', verdict: 'accepted' }], 500, 520);
    expect(spirePendingCoinsHas(ME, spireGoldPendingId('r1'))).toBe(false);
    expect(spirePendingCoinsHas(ME, 'r1')).toBe(true); // основную строку гасит общий разбор, не этот
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('потолок дня (daily_cap) → минус только ×2, тост «золото на сегодня уже собрано»', () => {
    seed('r2');
    settleSpireGoldFromFlush(ME, { gold: { accepted: [], skipped: [{ reportId: 'r2', reason: 'daily_cap' }] } }, [{ reportId: 'r2', verdict: 'accepted' }], 500, 510);
    expect(spirePendingCoinsHas(ME, spireGoldPendingId('r2'))).toBe(false);
    expect(spirePendingCoinsTotal(ME, NOW)).toBe(10);
    expect(mockEmit).toHaveBeenCalledWith('action_toast', { type: 'info', messageRu: SPIRE_GOLD_TOAST_DAILY_CAP.ru });
  });

  it('номер ступени разошёлся (not_golden) → минус ×2, тост «не засчитано»', () => {
    seed('r3');
    settleSpireGoldFromFlush(ME, { gold: { accepted: [], skipped: [{ reportId: 'r3', reason: 'not_golden' }] } }, [{ reportId: 'r3', verdict: 'accepted' }], 500, 510);
    expect(spirePendingCoinsHas(ME, spireGoldPendingId('r3'))).toBe(false);
    expect(mockEmit).toHaveBeenCalledWith('action_toast', { type: 'info', messageRu: SPIRE_GOLD_TOAST_NOT_COUNTED.ru });
  });

  it('старый сервер (нет поля gold) → gate server_too_old: минус ×2, тост «не засчитано»', () => {
    seed('r4');
    settleSpireGoldFromFlush(ME, { results: [] }, [{ reportId: 'r4', verdict: 'accepted' }], 500, 510);
    expect(spirePendingCoinsHas(ME, spireGoldPendingId('r4'))).toBe(false);
    expect(mockEmit).toHaveBeenCalledWith('action_toast', { type: 'info', messageRu: SPIRE_GOLD_TOAST_NOT_COUNTED.ru });
  });

  it('ступень отвергнута → золото снимается вместе с ней, без отдельного тоста', () => {
    seed('r5');
    settleSpireGoldFromFlush(ME, { gold: { accepted: [], skipped: [] } }, [{ reportId: 'r5', verdict: 'rejected' }], 500, 500);
    expect(spirePendingCoinsHas(ME, spireGoldPendingId('r5'))).toBe(false);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('у ступени не было золота → ничего не трогаем', () => {
    addSpirePendingCoins(ME, 'r6', 10, NOW, 500);
    settleSpireGoldFromFlush(ME, { results: [] }, [{ reportId: 'r6', verdict: 'accepted' }], 500, 510);
    expect(spirePendingCoinsTotal(ME, NOW)).toBe(10);
    expect(mockEmit).not.toHaveBeenCalled();
  });

  it('тексты тоста — на 9 языках', () => {
    for (const copy of [SPIRE_GOLD_TOAST_DAILY_CAP, SPIRE_GOLD_TOAST_NOT_COUNTED]) {
      for (const lang of ['ru', 'uk', 'en', 'es', 'pt-BR', 'vi', 'id', 'tr', 'pl'] as const) expect((copy as Record<string, string>)[lang]).toBeTruthy();
    }
  });
});
