// Governance-ID: TG-20C46F9B9F6F
import {
  EMPTY_COIN_WALLET_LIMITS,
  applyCoinWalletLimits,
  assertCoinWalletOperationShape,
  classifyCoinWalletSource,
  normalizeCoinWalletLimits,
} from './coin_wallet_policy';

// зачем (владелец 05.11): +500 монет за просмотр 70 % видео, один раз навсегда на (uid, videoId), без дневного предела и без ×2.
// Сервер хранит и проверяет только форму (ровно stars_500). Сторож падает, если сумму или источник изменят.

const requestId = `videofull_${'a1'.repeat(20)}`;
const op = { requestId, lane: 'base' as const, giftId: 'stars_500', amount: 500, promotionEligibility: 'gameplay' as const };

describe('кошелёк: награда за видео videofull_', () => {
  let warn: jest.SpyInstance;
  let log: jest.SpyInstance;
  beforeEach(() => {
    warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => { warn.mockRestore(); log.mockRestore(); });

  test('источник распознаётся по videofull_<40 hex>', () => {
    expect(classifyCoinWalletSource(requestId)).toEqual({ source: 'video_full', subSource: 'video_watch' });
  });

  test('чужой формат ключа — отказ источника', () => {
    expect(() => classifyCoinWalletSource('videofull_short')).toThrow('coin_wallet_source_not_allowed');
    expect(() => classifyCoinWalletSource(`videofull_${'A'.repeat(40)}`)).toThrow('coin_wallet_source_not_allowed');
    expect(() => classifyCoinWalletSource(`videofull_${'a'.repeat(41)}`)).toThrow('coin_wallet_source_not_allowed');
  });

  test('принимается РОВНО stars_500 / 500 / gameplay / base', () => {
    const cls = classifyCoinWalletSource(requestId);
    expect(() => assertCoinWalletOperationShape(op, cls)).not.toThrow();
  });

  test.each([
    ['множитель ×2 (1000)', { giftId: 'stars_1000', amount: 1000 }],
    ['мало (250)', { giftId: 'stars_250', amount: 250 }],
    ['номинал верный, сумма другая', { giftId: 'stars_500', amount: 1000 }],
    ['не gameplay', { promotionEligibility: 'excluded_compensation' as const }],
    ['полоса premium', { lane: 'premium' as const }],
  ])('отказ формы: %s', (_name, patch) => {
    const cls = classifyCoinWalletSource(requestId);
    expect(() => assertCoinWalletOperationShape({ ...op, ...patch }, cls)).toThrow();
  });

  test('дневного предела нет: сколько бы наград ни пришло — принимаются, лишь помечаются', () => {
    const cls = classifyCoinWalletSource(requestId);
    const now = Date.parse('2026-11-05T12:00:00Z');
    let state = EMPTY_COIN_WALLET_LIMITS;
    for (let i = 0; i < 100; i += 1) state = applyCoinWalletLimits(state, op, cls, now, 0);
    expect(state.videoFullDayCoins).toBe(50_000);
    expect(warn).toHaveBeenCalled();
    expect(String(warn.mock.calls[0][0])).toContain('[VIDEO-REWARD] limits_flag');
  });

  test('счётчик сбрасывается на новые сутки UTC и не трогает другие источники', () => {
    const cls = classifyCoinWalletSource(requestId);
    let state = applyCoinWalletLimits(EMPTY_COIN_WALLET_LIMITS, op, cls, Date.parse('2026-11-05T23:59:00Z'), 0);
    state = applyCoinWalletLimits(state, op, cls, Date.parse('2026-11-06T00:01:00Z'), 0);
    expect(state.videoFullDayCoins).toBe(500);
    expect(state.journeyDayCoins).toBe(0);
  });

  test('старое состояние без полей видео читается как ноль', () => {
    const state = normalizeCoinWalletLimits({ schemaVersion: 1, reportDayKey: '2026-11-05', reportDayCoins: 5 });
    expect(state.videoFullDayCoins).toBe(0);
    expect(state.videoFullDayKey).toBe('');
    expect(state.reportDayCoins).toBe(5);
  });
});
