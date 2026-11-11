/* Account-only regression: the obsolete copy promising a Plus transfer is never shown. */
jest.mock('../app/debug-logger', () => ({
  DebugLogger: { error: jest.fn(), warn: jest.fn(), info: jest.fn() },
  reportSwallowed: jest.fn(),
  swallowError: jest.fn(() => jest.fn()),
}));

const STABLE_A = 'stable-account-a';

let warn: jest.SpyInstance;
beforeEach(() => {
  jest.resetModules();
  warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});
afterEach(() => warn.mockRestore());

function load() {
  return {
    copy: require('../app/account_switch_copy') as typeof import('../app/account_switch_copy'),
    hold: require('../app/plus_transfer_hold') as typeof import('../app/plus_transfer_hold'),
  };
}

test('the legacy feature flag cannot make the obsolete transfer promise visible', () => {
  const { copy } = load();
  expect(copy.PLUS_TRANSFER_SWITCH_NOTICE_ENABLED).toBe(true);
  expect(copy.shouldShowPlusTransferSwitchNotice(true, STABLE_A)).toBe(false);
});

test('store Plus on the current account still does not show a transfer promise', () => {
  const { copy, hold } = load();
  hold.notePlusStoreAccessEvidence(STABLE_A, true, 'yearly');
  expect(copy.shouldShowPlusTransferSwitchNotice(true, STABLE_A)).toBe(false);
});

test('VIP/promo Plus without a store purchase → no notice', () => {
  const { copy, hold } = load();
  // premium_guard видел, что store-Plus у аккаунта НЕТ (доступ даёт VIP/промо).
  hold.notePlusStoreAccessEvidence(STABLE_A, false, null);
  expect(copy.shouldShowPlusTransferSwitchNotice(true, STABLE_A)).toBe(false);
});

test('flag off or no Plus at all → no notice, and no [PLUS-TRANSFER] log on every render', () => {
  const { copy, hold } = load();
  hold.notePlusStoreAccessEvidence(STABLE_A, true, 'yearly');
  expect(copy.shouldShowPlusTransferSwitchNotice(true, STABLE_A, false)).toBe(false);
  expect(copy.shouldShowPlusTransferSwitchNotice(false, STABLE_A)).toBe(false);
  const lines = warn.mock.calls.map((call) => String(call[0])).filter((line) => line.startsWith('[PLUS-TRANSFER]'));
  expect(lines).toEqual([]);
});

test('settings computes the notice once per opening of the switch window, not per render', () => {
  const fs = require('fs') as typeof import('fs');
  const source = fs.readFileSync(require.resolve('../app/(tabs)/settings.tsx'), 'utf8');
  expect(source).toMatch(/const showPlusTransferNotice = useMemo\(/);
  expect(source).toContain('shouldShowPlusTransferSwitchNotice(isPremium, peekStableId())');
  expect(source).toContain('{showPlusTransferNotice ? (');
});
