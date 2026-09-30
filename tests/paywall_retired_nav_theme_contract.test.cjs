const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const plans = fs.readFileSync(path.join(root, 'components/paywall/PaywallPlanCards.tsx'), 'utf8');
const copy = fs.readFileSync(path.join(root, 'app/paywall_copy.ts'), 'utf8');

test('paywall plan cards never read the retired MAX navigation callback', () => {
  assert.doesNotMatch(plans, /\bonNavigate\b/);
  assert.match(plans, /name=\{sel \? 'checkmark-circle' : 'ellipse-outline'\}/);
});

test('theme paywall describes the approved Plus-only shades and graphite fallback', () => {
  const heroStart = copy.indexOf("    titleRu: 'Выбери, как будет выглядеть'");
  const hero = copy.slice(heroStart, copy.indexOf('  club: {', heroStart));
  const benefitStart = copy.indexOf('  theme: [', heroStart);
  const benefits = copy.slice(benefitStart, copy.indexOf('  club: [', benefitStart));
  assert.match(hero, /12.*Plus/);
  assert.match(hero, /графит/);
  assert.doesNotMatch(hero, /навсегда|forever|para siempre/i);
  assert.doesNotMatch(benefits, /навсегда|forever|para siempre|sempre|mãi mãi|sonsuza|zawsze/i);
});
