const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.join(__dirname, '..');
const copy = fs.readFileSync(path.join(root, 'components/paywall/paywallScreenCopy.ts'), 'utf8');

test('non-onboarding no-trial Plus CTA names the subscription without claiming full access', () => {
  assert.match(copy, /ctaLabelFor\(lang: Lang, trialDays: number \| null, isLifetime = false, isOnboarding = false\)/);
  assert.match(copy, /if \(isOnboarding\) \{/);
  assert.match(copy, /ru: 'Оформить Plus'/);
  assert.match(copy, /ru: 'Открыть полный доступ'/);
});

test('all seven active paywalls pass their onboarding state to the shared CTA copy', () => {
  for (const variant of 'abcdefg') {
    const source = fs.readFileSync(path.join(root, `app/paywall_${variant}.tsx`), 'utf8');
    assert.match(source, /ctaLabelFor\(lang as Lang, p\.trialDays, isLifetimeSel, isOnboarding\)/,
      `paywall ${variant.toUpperCase()} must preserve onboarding copy`);
    assert.match(source, /stickyStringsFor\([\s\S]*?isOnboarding\)/,
      `paywall ${variant.toUpperCase()} must keep sticky CTA in sync`);
  }
});

test('sticky non-onboarding button has the same safe Plus meaning', () => {
  assert.match(copy, /export function stickyStringsFor\([\s\S]*?isOnboarding = false/);
  assert.match(copy, /ru: 'Оформить Plus'/);
  assert.match(copy, /ru: 'Открыть доступ'/);
});
