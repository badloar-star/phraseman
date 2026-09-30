import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync('components/MaintenanceGate.tsx', 'utf8');

assert.match(source, /liquidGlassTokens/, 'maintenance surfaces must use the active 13-theme material registry');
assert.match(source, /liquidGlassThemeId/, 'maintenance surfaces must follow the selected Liquid Glass theme');
assert.match(source, /return \{ block, banner: banner && !dismissed, text, dismissalKey \};/, 'remote block must stay authoritative and only the banner may be dismissed');
assert.match(source, /if \(state\.block\)/, 'remote maintenance block must remain authoritative');
assert.match(source, /if \(!state\.banner\) return null;/, 'dismissed or disabled banners must remain hidden');
assert.match(source, /void readState\(lang\)\.then\(\(next\) => \{[\s\S]*?setState\(next\);[\s\S]*?\}\);/, 'refreshed remote state must be applied');
assert.match(source, /useEffect\(\(\) => \{\s*refresh\(\);\s*const sub = onAppEvent\('remote_config_changed', refresh\)/, 'maintenance state must hydrate initially and remain live');
assert.match(source, /return \(\) => sub\.remove\(\);/, 'remote maintenance subscription must remain removable');
assert.match(source, /markCampaignDismissed\(state\.dismissalKey\)/, 'banner dismissal must remain campaign-scoped');
assert.match(source, /if \(Math\.abs\(gesture\.dx\) > 84\) \{\s*dismiss\(\);\s*return;/, 'horizontal swipe must still invoke the shared dismissal callback');
assert.match(source, /onPress=\{dismiss\}/, 'close control must still invoke the shared dismissal callback');
assert.match(source, /state\.text && state\.text\.trim\(\)/, 'custom server copy must remain preferred over fallback copy');
assert.match(source, /<Modal[\s\S]*?visible[\s\S]*?onRequestClose=\{\(\) => undefined\}/, 'native maintenance modal must isolate both screen readers and trap Android Back');
assert.match(source, /accessibilityViewIsModal/, 'blocking maintenance gate must isolate screen-reader navigation');
assert.match(source, /accessibilityRole="alert"/, 'blocking maintenance copy must announce its asynchronous activation');
assert.match(source, /accessibilityLiveRegion="assertive"/, 'blocking maintenance copy must interrupt stale screen-reader context');
assert.match(source, /paddingTop: Math\.max\(insets\.top, 24\)/, 'blocking message must clear the upper safe area');
assert.match(source, /paddingBottom: Math\.max\(insets\.bottom, 24\)/, 'blocking message must clear the lower safe area');
assert.match(source, /<ScrollView\s+testID="maintenance-block-message"[\s\S]*?\{message\}[\s\S]*?<\/ScrollView>/, 'long blocking copy must remain inside a reachable scroll surface');
assert.match(source, /testID="maintenance-banner-surface"/, 'banner glass surface must remain addressable');
assert.doesNotMatch(source, /#431407|#7c2d12|#9a3412|#fed7aa/i, 'legacy brown maintenance chrome must be removed');
assert.doesNotMatch(source, /BlurView/, 'maintenance gate must not add a heavy blur layer');
