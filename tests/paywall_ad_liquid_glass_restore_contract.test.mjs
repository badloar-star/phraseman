import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import ts from 'typescript';

const root = join(import.meta.dirname, '..');
const read = (path) => readFileSync(join(root, path), 'utf8');

function assertParses(path) {
  const result = ts.transpileModule(read(path), {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  assert.deepEqual(errors, [], `${path} has TypeScript syntax errors`);
}

test('A and D pass their original contextual proof into the Liquid Glass shell', () => {
  for (const variant of ['a', 'd']) {
    const source = read(`app/paywall_${variant}.tsx`);
    for (const prop of [
      'context={ctx}',
      'title={title}',
      'subtitle={subtitle}',
      'profile={profile}',
      'mirror={mirror}',
      'testimonials={testimonials}',
    ]) {
      assert.ok(source.includes(prop), `paywall ${variant.toUpperCase()} missing ${prop}`);
    }
    assert.match(
      source,
      /personalTagTexts=\{personalTag\s*\?\s*\[/,
      `paywall ${variant.toUpperCase()} keeps its localized personalized tag`,
    );
  }
});

test('A and D restore the original conditional proof and commerce components', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  for (const token of [
    'PaywallGlyphCapsule',
    'PaywallSocialRow',
    'PersonalizationProofCard',
    'PaywallTestimonials',
    'PaywallBenefitComparison',
    'PaywallPlanCards',
    'PaywallPlanTiles',
    'PaywallTrialStages',
    'PaywallPromoBanner',
    'PaywallLegalDisclosure',
    'handlePurchase',
    'handleRestore',
    "handleClose('continue_free')",
    'purchase.exitOffer',
  ]) {
    assert.ok(source.includes(token), `Liquid Glass A/D shell missing ${token}`);
  }
});

test('removed or voice-like contexts cannot re-enter A/D marketing or personalization proof', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.match(source, /const NON_SELLING_CONTEXTS = new Set<PremiumContext>/);
  for (const context of ['theme', 'avatar_aura', 'weekly_review', 'dialog_analysis']) {
    assert.ok(source.includes(`'${context}'`), `missing neutralized context ${context}`);
  }
  assert.ok(source.includes('useNeutralHero'), 'A/D hero must select neutral copy for removed benefits');
  assert.match(source, /<PaywallGlyphCapsule ctx=\{context\}/, 'the contextual glyph may remain');
  assert.match(
    source,
    /<PersonalizationProofCard[\s\S]*?ctx=\{useNeutralHero \? undefined : context\}/,
    'neutralized contexts must not reach personalized marketing proof',
  );
});

test('A keeps the real-store trial timeline and D is exactly yearly plus monthly', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.match(
    source,
    /variant === 'A'[\s\S]*?purchase\.trialDays[\s\S]*?<PaywallTrialStages/,
    'A only shows its timeline from live trialDays',
  );
  assert.match(
    source,
    /variant === 'A' \? <PaywallPlanCards[\s\S]*?: <PaywallPlanTiles[\s\S]*?lifetimeAvailable=\{false\}/,
    'D explicitly suppresses Pro/lifetime',
  );
});

test('A/D move exactly two compact plan selectors into the sibling dock before the CTA', () => {
  const source = read('components/paywall/PaywallLiquidGlass.tsx');
  const bodyStart = source.indexOf('function ActiveOfferBody(');
  const bodyEnd = source.indexOf('\nfunction ActivePlanDock(', bodyStart);
  const activeBody = source.slice(bodyStart, bodyEnd);
  assert.ok(bodyStart >= 0 && bodyEnd > bodyStart, 'ActiveOfferBody is inspectable');
  assert.doesNotMatch(activeBody, /PaywallPlan(?:Cards|Tiles)/, 'scrolling offer body has no plan selector');

  const dockStart = source.indexOf('<View style={[S.dock');
  const ctaStart = source.indexOf('<Pressable accessibilityRole="button"', dockStart);
  const dockPlanStart = source.indexOf('<ActivePlanDock', dockStart);
  assert.ok(dockStart >= 0 && dockPlanStart > dockStart, 'active plan dock is a child of the existing flex dock');
  assert.ok(dockPlanStart < ctaStart, 'plan selector sits immediately before the purchase CTA');
  assert.match(source, /state === 'ready' \? <View style=\{S\.activePlanDock\}>[\s\S]*?<ActivePlanDock/);
  assert.match(source, /<View style=\{S\.activePlanDock\}>[\s\S]*?<ActivePlanDock/);
  assert.match(source, /activePlanDock:\s*\{[^}]*marginBottom:\s*12/);
  assert.match(source, /variant === 'A'[\s\S]*?<PaywallPlanCards[\s\S]*?compact[\s\S]*?lifetimeAvailable=\{false\}/);
  assert.match(source, /<PaywallPlanTiles[\s\S]*?compact[\s\S]*?lifetimeAvailable=\{false\}/);
  assert.doesNotMatch(source, /S\.dock[^\n]*(?:position:\s*'absolute'|position:\s*"absolute")/);
});

test('compact selectors are opt-in and keep full prices, disabled state and minimum touch size', () => {
  for (const path of [
    'components/paywall/PaywallPlanCards.tsx',
    'components/paywall/PaywallPlanTiles.tsx',
  ]) {
    const source = read(path);
    assert.match(source, /compact\?: boolean/);
    assert.match(source, /compact = false/, `${path} preserves legacy/onboarding defaults`);
    assert.match(source, /accessibilityState=\{\{ selected: sel, disabled:/);
    assert.match(source, /compact && !billedPrice/, `${path} disables only the missing compact plan price`);
    assert.match(source, /minHeight:\s*48/, `${path} compact selector keeps a 48dp touch target`);
    const executableSource = source.replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
    assert.doesNotMatch(executableSource, /numberOfLines=\{1\}|adjustsFontSizeToFit/, `${path} must not clip or shrink prices`);
  }

  const shell = read('components/paywall/PaywallLiquidGlass.tsx');
  assert.match(shell, /close:\s*\{[^}]*width:\s*44[^}]*height:\s*44/);
  assert.match(shell, /legalLinkButton:\s*\{[^}]*minHeight:\s*44/);
  assert.match(shell, /dockLinkButton:\s*\{[^}]*minHeight:\s*44/);
});

test('trial reminder copy is conditional on notifications while scheduling stays in purchase flow', () => {
  const timeline = read('components/paywall/PaywallTrialStages.tsx');
  assert.match(timeline, /Если уведомления разрешены/u);
  assert.doesNotMatch(timeline, /remindDay|День \$\{days\}|\$\{days\} дня/u);
  assert.doesNotMatch(timeline, /забыть невозможно/u);
  assert.ok(!timeline.includes('days:'), 'non-onboarding timeline does not receive or render trial duration');

  const purchase = read('app/paywall_purchase.ts');
  assert.ok(purchase.includes('requestNotificationPermission()'));
  assert.ok(purchase.includes('scheduleTrialEndReminder('));
});

test('A/D benefit model matches the approved five highlights and 16-row comparison', () => {
  const source = read('components/paywall/PaywallBenefitComparison.tsx');
  assert.match(source, /export const PAYWALL_MAIN_BENEFIT_IDS[\s\S]*?as const;/);
  const mainBlock = source.match(/export const PAYWALL_MAIN_BENEFIT_IDS\s*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1] ?? '';
  assert.equal((mainBlock.match(/'[^']+'/g) ?? []).length, 5, 'exactly five main benefit rows');
  for (const id of ['cards_bundle', 'dialogue_scenarios', 'course_lessons', 'ai_mistake_explain', 'energy']) {
    assert.ok(mainBlock.includes(`'${id}'`), `approved main row ${id}`);
  }
  const comparisonBlock = source.match(/export const PAYWALL_COMPARISON_BENEFIT_IDS\s*=\s*\[([\s\S]*?)\]\s*as const;/)?.[1] ?? '';
  assert.equal((comparisonBlock.match(/'[^']+'/g) ?? []).length, 16, 'exactly 16 comparison rows');

  for (const id of [
    'saved_phrases',
    'own_cards',
    'own_packs',
    'flashcard_training',
    'dialogue_scenarios',
    'dialogue_replies',
    'text_dialogue_review',
    'pronunciation',
    'course_lessons',
    'combined_lesson',
    'study_languages',
    'mistake_practice',
    'ai_mistake_explain',
    'energy',
    'streak_freezes',
    'detailed_stats',
  ]) {
    assert.ok(source.includes(`id: '${id}'`), `missing approved comparison row ${id}`);
  }
  assert.ok(!source.includes("id: 'voice_dialogue_review'"), 'nonexistent voice-dialogue review is absent');

  for (const forbidden of ['theme', 'aura', 'weekly_ai', 'mistake_pattern']) {
    assert.ok(!source.includes(`id: '${forbidden}'`), `forbidden benefit ${forbidden}`);
  }
  assert.match(source, /RELEASE BLOCKER:[^\n]*card training/i);
  assert.match(source, /RELEASE BLOCKER:[^\n]*AI mistake/i);
  assert.match(source, /id: 'own_cards'[\s\S]*?plusValue: UNLIMITED/);
  assert.match(source, /const UNLIMITED: Localized = LP\('Безлимит'/);
  assert.match(source, /id: 'cards_bundle'[\s\S]*?label: LP\('Карточки без ограничений'/);
  assert.match(source, /RELEASE BLOCKER:[^\n]*cloud paging/i);
  assert.ok(source.includes('accessibilityState={{ expanded }}'), 'comparison disclosure is accessible');
  assert.ok(source.includes('freeValue'), 'rows expose the Free value');
  assert.ok(source.includes('plusValue'), 'rows expose the Plus value');
});

test('focused A/D Liquid Glass sources parse as TypeScript', () => {
  for (const path of [
    'app/paywall_a.tsx',
    'app/paywall_d.tsx',
    'components/paywall/PaywallLiquidGlass.tsx',
    'components/paywall/PaywallPlanCards.tsx',
    'components/paywall/PaywallPlanTiles.tsx',
    'components/paywall/PaywallBenefitComparison.tsx',
    'components/paywall/PaywallTrialStages.tsx',
    'components/paywall/PaywallTrialTimeline.tsx',
  ]) {
    assertParses(path);
  }
});
