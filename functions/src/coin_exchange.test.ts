import * as mod from './coin_exchange';

// Smoke: модуль callables биржи собирается и экспортирует контракт целиком.
// Вся логика (математика, валидация, исход транзакции) покрыта в
// coin_exchange_core.test.ts — здесь только граница модуля.

describe('coin_exchange module exports', () => {
  it('exposes the four callables and the scheduled recalc', () => {
    expect(mod.getCoinExchangeQuote).toBeDefined();
    expect(mod.getCoinExchangeHistory).toBeDefined();
    expect(mod.exchangeCoinsForStars).toBeDefined();
    expect(mod.adminSetCoinExchangeRate).toBeDefined();
    expect(mod.recalcCoinExchangeRate).toBeDefined();
    expect(mod.adminGetCoinExchangeCenter).toBeDefined();
    // зачем: миграция «осколки → жемчуг 20:1» удалена — переименование валюты
    // 1:1, конвертировать нечего. Ратчет: callable не должен вернуться.
    expect((mod as Record<string, unknown>).claimCoinMigration).toBeUndefined();
  });
});
