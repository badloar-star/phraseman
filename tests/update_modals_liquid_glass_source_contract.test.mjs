import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const forceSource = readFileSync('components/ForceUpdateGate.tsx', 'utf8');
const optionalSource = readFileSync('components/UpdateModal.tsx', 'utf8');

for (const [name, source] of [
  ['ForceUpdateGate', forceSource],
  ['UpdateModal', optionalSource],
]) {
  assert.match(source, /liquidGlassTokens/, `${name} must use the approved 13-theme material registry`);
  assert.match(source, /liquidGlassThemeId/, `${name} must follow the active Liquid Glass tint`);
  assert.match(source, /<Modal/, `${name} must use a native modal surface`);
  assert.match(source, /statusBarTranslucent/, `${name} must cover Android status-bar chrome`);
  assert.match(source, /navigationBarTranslucent/, `${name} must cover Android navigation-bar chrome`);
  assert.match(source, /<ResponsiveModalScrollView/, `${name} must keep long localized copy reachable inside both safe areas`);
  assert.match(source, /<BlurView/, `${name} must render real native blur where the platform supports it`);
  assert.match(source, /experimentalBlurMethod=\{Platform\.OS === 'android' \? 'dimezisBlurView' : 'none'\}/, `${name} must use the supported Android blur path`);
  assert.doesNotMatch(source, /borderWidth:\s*[1-9]/, `${name} must not restore outlined modal containers`);
}

assert.match(forceSource, /return \{ source: 'manual', mode, campaignId, title, body, cta, storeUrl \};/, 'remote manual-update state must remain authoritative');
assert.match(forceSource, /const glass = liquidGlassTokens\(liquidGlassThemeId\);/, 'force update must resolve the active Liquid Glass tint rather than hardcoding graphite');
assert.match(forceSource, /const optional = gate\.mode === 'optional';/, 'force and optional policies must remain distinct');
assert.match(forceSource, /markCampaignDismissed\(campaignDismissalKey\('manual_update', gate\.campaignId\)\)/, 'optional dismissal must remain campaign-scoped');
assert.match(forceSource, /const closable = optional \|\| preview;/, 'only optional and local preview modes may close');
assert.match(forceSource, /onRequestClose=\{closable \? closeOptional : blockAndroidBack\}/, 'production force mode must trap Android Back');
assert.match(forceSource, /const blockAndroidBack = \(\) => undefined;/, 'the mandatory update Back trap must be explicit and stable');
assert.match(forceSource, /accessibilityViewIsModal/, 'force update must isolate screen-reader navigation');
assert.match(forceSource, /importantForAccessibility="yes"/, 'force update must hide stale background controls from Android accessibility');
assert.match(forceSource, /accessibilityRole="alert"/, 'force update copy must announce the blocking state');
assert.match(forceSource, /<Ionicons\s+name="compass-outline"\s+size=\{32\}/, 'update mockup must use the compact Compass mark');
assert.match(forceSource, /iconStage:\s*\{[\s\S]*?width:\s*72,[\s\S]*?height:\s*72,[\s\S]*?borderRadius:\s*36/, 'force update icon geometry must match the approved mockup');
assert.match(forceSource, /title:\s*\{[\s\S]*?fontSize:\s*21,[\s\S]*?lineHeight:\s*27/, 'force update title geometry must match the approved mockup');
assert.match(forceSource, /body:\s*\{[\s\S]*?fontSize:\s*16,[\s\S]*?lineHeight:\s*22/, 'force update body geometry must match the approved mockup');
assert.match(forceSource, /primaryButton:\s*\{[\s\S]*?minHeight:\s*48,[\s\S]*?borderRadius:\s*24/, 'force update CTA geometry must match the approved mockup');
assert.doesNotMatch(forceSource, /#121826|#6366f1|#d97706|#3a2408/i, 'legacy blue/amber update chrome must be removed');

assert.match(optionalSource, /const glass = liquidGlassTokens\(liquidGlassThemeId\);/, 'ordinary update modal must resolve the current Liquid Glass tokens directly');
assert.match(optionalSource, /onRequestClose=\{onClose \? onClose : blockAndroidBack\}/, 'ordinary update modal must only close on Android Back when a close callback exists');
assert.match(optionalSource, /const blockAndroidBack = \(\) => undefined;/, 'non-dismissible update uses an explicit Android Back trap');
assert.match(optionalSource, /accessibilityViewIsModal/, 'ordinary update modal must isolate screen-reader navigation');
assert.match(optionalSource, /importantForAccessibility="yes"/, 'ordinary update modal must hide stale background controls from Android accessibility');
assert.match(optionalSource, /accessibilityRole="alert"/, 'ordinary update copy must announce the modal state');
assert.match(optionalSource, /<Ionicons\s+name="compass-outline"\s+size=\{32\}/, 'ordinary update mockup must use the compact Compass mark');
assert.match(optionalSource, /iconStage:\s*\{[\s\S]*?width:\s*72,[\s\S]*?height:\s*72,[\s\S]*?borderRadius:\s*36/, 'ordinary update icon geometry must match the approved mockup');
assert.match(optionalSource, /title:\s*\{[\s\S]*?fontSize:\s*21,[\s\S]*?lineHeight:\s*27/, 'ordinary update title geometry must match the approved mockup');
assert.match(optionalSource, /body:\s*\{[\s\S]*?fontSize:\s*16,[\s\S]*?lineHeight:\s*22/, 'ordinary update body geometry must match the approved mockup');
assert.match(optionalSource, /updateBtn:\s*\{[\s\S]*?minHeight:\s*48,[\s\S]*?borderRadius:\s*24/, 'ordinary update CTA geometry must match the approved mockup');
assert.match(optionalSource, /\ben:\s*\{[\s\S]*?title:[\s\S]*?body:[\s\S]*?update:[\s\S]*?close:/, 'ordinary update modal must retain explicit English copy alongside the other eight locales');
assert.match(optionalSource, /if \(onPrimaryPress\) \{\s*onPrimaryPress\(\);\s*return;\s*\}/, 'custom update action must retain priority over store navigation');
assert.match(optionalSource, /onWillOpenExternalUrl\?\.\(\);/, 'Android external-store lifecycle handoff must remain wired');
// зачем (17.10, R58 #57 3080d1805): в catch добавились журнал причины и снятие защиты от двойного стора — окно по-прежнему
// возвращается тем же колбэком; проверяем именно это, а не пустую сигнатуру catch.
assert.match(optionalSource, /Linking\.openURL\(storeUrl\)\.catch\(\(error: unknown\) => \{[\s\S]{0,300}?onExternalOpenFailed\?\.\(\);/, 'failed store opening must restore the modal through the existing callback');
assert.doesNotMatch(optionalSource, /PREMIUM_UPDATE_EMBLEM|UpdateModalPalette|OLIVE_PALETTE|SAGE_PALETTE/, 'retired theme-specific update art and palette branches must not drive the 2.0 modal');
