import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const files = {
  releaseNotes: read('components/ReleaseNotesModal.tsx'),
  videoPhrases: read('components/youtube/YoutubeVideoPhrases.tsx'),
  promo: read('components/PromoBanner.tsx'),
  welcome: read('components/ReferralWelcomeHost.tsx'),
};

// Старые фирменные цвета, которые обязаны уйти (семантика успех/ошибка здесь не используется).
const LEGACY_HEX = /#(34C759|07110A|3b1d6e|5b21b6|f3e8ff|B9791F|FFE08A|F7BE4F|E99D35|F9D77A|8FB4FF|FFF4DC|FFF7E3|C2D2E8|C8D6EA|93A6C0|111722|171A24|241F13|121826|15181a)\b/i;

test('all four campaign overlays read the active 13-theme Liquid Glass tokens', () => {
  for (const [name, source] of Object.entries(files)) {
    assert.ok(source.includes('liquidGlassTokens(liquidGlassThemeId)') || source.includes('= announcementGlass'), `${name}: liquidGlassTokens`);
    assert.doesNotMatch(source, LEGACY_HEX, `${name}: no legacy brand hex`);
    assert.doesNotMatch(source, /borderWidth:\s*([2-9]|\d{2,})/, `${name}: no thick borders`);
    assert.doesNotMatch(source, /borderColor/, `${name}: no coloured outlines`);
    assert.doesNotMatch(source, /adjustsFontSizeToFit/, `${name}: no font shrinking`);
  }
});

test('legacy release notes: sheet on liquid-glass shell, announcement card keeps its contract', () => {
  const s = files.releaseNotes;
  assert.match(s, /<HybridSheetShell[\s\S]*material="liquid-glass"/);
  assert.match(s, /onPress=\{requestDismiss\}/);
  assert.match(s, /onPress=\{closeOnce\}/);
  assert.match(s, /backgroundColor: releaseGlass\.cta/);
  assert.match(s, /backgroundColor: announcementGlass\.opaqueSheet/);
  assert.ok(s.includes('announcement?: ReleaseNotesAnnouncement | null;'), 'announcement prop');
  assert.ok(s.includes('showCloseButton?: boolean;'), 'showCloseButton prop');
  assert.ok(s.includes("motionVariant?: 'classic' | 'hybrid';"), 'motionVariant prop');
  assert.ok(s.includes('announcement.body'), 'admin announcement body still rendered');
  assert.ok(s.includes('displayTx.pill') && s.includes('displayTx.footer') && s.includes('displayTx.items.map'), 'release copy still rendered');
  assert.doesNotMatch(s, /shineAnim|shineGradient/, 'decorative cream shine removed');
});

test('video phrases: states and handlers preserved, phrase detail is a liquid-glass sheet', () => {
  const s = files.videoPhrases;
  assert.match(s, /<HybridSheetShell[\s\S]*material="liquid-glass"/);
  assert.doesNotMatch(s, /<Modal\b/, 'plain RN Modal replaced by the shared shell');
  for (const id of ['-loading', '-error', '-retry']) assert.ok(s.includes(id), `testID ${id}`);
  assert.ok(s.includes("if (state === 'loading')") && s.includes("if (state === 'error')"));
  assert.ok(s.includes('if (!phrases.length) return null;'), 'empty stays hidden (no empty state in mockup)');
  assert.ok(s.includes('onPress={retry}') && s.includes('setRetryTick'), 'retry preserved');
  assert.ok(s.includes('setSavedIds((current) => new Set(current).add(phrase.id));'), 'optimistic save preserved');
  assert.ok(s.includes('savingIdsRef'), 'double-tap guard preserved');
  assert.ok(s.includes('onToggle') && s.includes('expanded ?? localExpanded'));
});

test('promo banner: three mockup states, swipe/dismiss/expiry behaviour untouched', () => {
  const s = files.promo;
  assert.match(s, /backgroundColor: glass\.opaqueSheet/);
  assert.match(s, /accessibilityRole="link"/, 'OS-GLOBAL-PROMO-LINK');
  assert.match(s, /hasUrl \? \(/, 'OS-GLOBAL-PROMO-NO-LINK has no empty link zone');
  assert.match(s, /if \(!state\.visible\) return null;/, 'OS-GLOBAL-PROMO-HIDDEN unmounts');
  assert.match(s, /width: 44,\s*height: 44/, 'close target >= 44dp');
  for (const needle of ['markCampaignDismissed', 'createCampaignExpiryScheduler', 'PanResponder.create', "motionVariant = 'hybrid'", 'Math.max(insets.top, 8)']) {
    assert.ok(s.includes(needle), needle);
  }
});

test('referral welcome: mockup states, no reward promises, behaviour untouched', () => {
  const s = files.welcome;
  assert.ok(s.includes('testID="referral-welcome-card"'));
  assert.ok(s.includes('testID="referral-welcome-primary"'));
  assert.ok(s.includes('testID="referral-welcome-code"'));
  assert.ok(s.includes('welcomeDecision?.needsCodeEntry'), 'CODE-APPLIED hides the code button');
  assert.ok(s.includes("router.push('/referrals?enter=1' as never)"));
  assert.ok(s.includes("useOverlayVisible('referralWelcome', wantShow)"));
  assert.ok(s.includes('markReferralWelcomeSeen'));
  const code = s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.doesNotMatch(code, /365|подарок|gift|ключ|key\b|Reward|Награда|Recompensa|Ödül|Nagroda|Hadiah|Phần thưởng/i, 'REMOVAL.md PM-202: no reward promises');
  assert.doesNotMatch(s, /\.catch\(\(\) => \{\}\)/, 'no silent catch');
});
