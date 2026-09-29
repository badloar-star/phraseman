import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

test('outside onboarding only A and D routes are ever resolved', () => {
  const nav = read('app/paywall_navigation.ts');
  const map = nav.match(/ACTIVE_ROUTE_FOR_VARIANT[^=]*=\s*\{([\s\S]*?)\};/)?.[1] ?? '';
  const targets = [...map.matchAll(/'(\/paywall_[a-g])'/g)].map((m) => m[1]);
  assert.equal(targets.length, 7, 'every experiment bucket has a target');
  assert.deepEqual([...new Set(targets)].sort(), ['/paywall_a', '/paywall_d']);
  assert.match(nav, /return ACTIVE_ROUTE_FOR_VARIANT\[variant\]/);
});

test('the shell folds retired variants (deep links included) into the A or D layout', () => {
  const shell = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.match(shell, /const ACTIVE_LAYOUT: Readonly<Record<Variant, ActiveVariant>>/);
  assert.match(shell, /const variant = ACTIVE_LAYOUT\[requestedVariant\]/);
  for (const dead of ['function Body(', 'function Orbit(', 'function Story(', 'function AvailablePlans(']) {
    assert.ok(!shell.includes(dead), `retired composition removed: ${dead}`);
  }
});

test('minimal main screen: no hero subtitle, no section label, plans in the dock before the CTA', () => {
  const shell = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.ok(!shell.includes('activeSubtitle'), 'hero subtitle is not rendered');
  assert.ok(!shell.includes('S.subtitle}>'), 'no subtitle text node');
  const dock = shell.indexOf('<View style={[S.dock');
  assert.ok(shell.indexOf('<ActivePlanDock', dock) > dock && shell.indexOf('<ActivePlanDock', dock) < shell.indexOf('S.cta,', dock));
  const cmp = read('components/paywall/PaywallBenefitComparison.tsx');
  assert.ok(!cmp.includes('UI.main'), 'no "main" label above the five glass rows');
});

test('comparison keeps the approved groups and real Free limits', () => {
  const cmp = read('components/paywall/PaywallBenefitComparison.tsx');
  for (const g of ['cards', 'dialogues', 'course', 'personal', 'stats']) assert.ok(cmp.includes(`${g}: LP(`), `group ${g}`);
  assert.ok(cmp.includes("LP('До 50', 'Up to 50'"), 'saved phrases Free = 50 (free_limit.ts)');
  assert.ok(!cmp.includes("'До 20'"), 'stale 20 removed');
  assert.ok(cmp.includes("const UNLIMITED: Localized = LP('Безлимит'"), 'owner marketing word');
  const free = read('app/flashcards/free_limit.ts');
  assert.match(free, /FREE_SAVED_CARD_LIMIT = 50/);
});
