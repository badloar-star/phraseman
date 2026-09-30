import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const modal = readFileSync('components/NotificationPermissionModal.tsx', 'utf8');
const hybrid = readFileSync('components/NotificationPermissionModalHybrid.tsx', 'utf8');

assert.doesNotMatch(modal, /быстрее рос в уровне|level up faster/, 'fallback copy must not promise level growth');
assert.match(modal, /ru: 'Не сейчас'/, 'Russian secondary copy must match the approved prompt');
assert.match(modal, /const resolvedBody = body \?\? '';/, 'approved fallback uses the three benefit rows without an invented body');
assert.match(modal, /useStableSafeAreaInsets/, 'classic layout must respect safe areas');
assert.match(modal, /maxHeight: '100%'/, 'classic dialog must be bounded on a short viewport');
assert.match(modal, /testID="notification-permission-scroll-content"/, 'classic dialog must scroll long supplied copy');
assert.match(modal, /testID="notification-permission-confirm"/, 'classic confirm action must remain addressable');
assert.match(modal, /onPress=\{onConfirm\}/, 'classic confirm callback must remain unchanged');
assert.match(modal, /onPress=\{onCancel\}/, 'classic cancel callback must remain unchanged');

assert.doesNotMatch(hybrid, /import HybridSheetShell/, 'hybrid must not use the incompatible bottom sheet shell');
assert.match(hybrid, /useStableSafeAreaInsets/, 'hybrid layout must respect safe areas');
assert.match(hybrid, /justifyContent: 'center'/, 'hybrid must match classic centered geometry');
assert.match(hybrid, /material="liquid-glass"|liquidGlassTokens/, 'hybrid must render a Liquid Glass material surface');
assert.match(hybrid, /testID="notification-permission-scroll-content-hybrid"/, 'hybrid must scroll long supplied copy');
assert.match(hybrid, /testID="notification-permission-confirm"/, 'hybrid confirm action must remain addressable');
assert.match(hybrid, /onPress=\{onConfirm\}/, 'hybrid confirm callback must remain unchanged');
assert.match(hybrid, /onPress=\{handleCancel\}/, 'hybrid cancel callback must remain unchanged');

for (const language of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
  assert.match(modal, new RegExp(`${language}:`), `missing ${language} notification fallback`);
}
