import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const screen = () => readFileSync(join(process.cwd(), 'app', 'level_reward_spin.tsx'), 'utf8');
const footer = () => readFileSync(join(process.cwd(), 'components', 'LevelSpinFinishLine.tsx'), 'utf8');

test('approved paid action is above the preserved free-spin action with canonical assets', () => {
  const source = footer();
  const paidIndex = source.indexOf('testID="level-spin-paid-start"');
  const freeIndex = source.indexOf('testID={ctaTestID}');
  expect(paidIndex).toBeGreaterThan(0);
  expect(freeIndex).toBeGreaterThan(0);
  expect(paidIndex).toBeLessThan(freeIndex);
  expect(source).toContain("require('../assets/images/level-spin-rewards/stars_10.webp')");
  expect(source).toContain('spinTicketImageSource()');
});

test('paid button is immediate, price-bound, dark-on-gold and disabled below 300', () => {
  const source = `${screen()}\n${footer()}`;
  expect(source).toContain('PAID_LEVEL_SPIN_RUNE_PRICE');
  expect(source).toContain('claimLocalLevelSpinWithRunes');
  expect(source).toContain('runeBalance < paidSpinPrice');
  expect(source).toContain("backgroundColor: '#F3C85C'");
  expect(source).toContain("color: '#0F0D13'");
  expect(source).toContain('minHeight: 56');
  expect(source).toContain('accessibilityLabel={paidAccessibilityLabel}');
  expect(source).not.toContain('paidSpinConfirmation');
  expect(source).not.toContain('confirmPaidSpin');
});

test('screen hydrates and subscribes to the canonical rune projection', () => {
  const source = screen();
  expect(source).toContain('useState(() => peekRunes())');
  expect(source).toContain('getRunesBalance()');
  expect(source).toContain('subscribeRunesSnapshot');
  expect(source).toContain('onPaidSpin={() => { void runPaid(); }}');
});
