import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// зачем: «Сообщение команды» и личное сообщение (макет system.html SYS-07) — Liquid Glass 13 тем.
const files = {
  broadcast: readFileSync(new URL('../components/GlobalBroadcastModal.tsx', import.meta.url), 'utf8'),
  personal: readFileSync(new URL('../components/PersonalAdminMessageModal.tsx', import.meta.url), 'utf8'),
};

for (const [name, src] of Object.entries(files)) {
  test(`${name}: neutral Liquid Glass tokens, shadow instead of edge, no brand green`, () => {
    assert.ok(src.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
    assert.ok(src.includes('glass.opaqueSheet'), 'opaque card base');
    assert.ok(src.includes('glass.accent') && src.includes('glass.accentInk'), 'neutral CTA');
    // зачем (стиль «Тень», решение владельца 12.10; 15.10): карточка без кромки — отделяет тень из токенов темы
    assert.ok(src.includes("plateBoxShadow(glass)") && !src.includes('glass.glassEdge'), 'shadow instead of edge');
    assert.ok(!/t\.accent|t\.correct|\$\{t\.accent\}/.test(src), 'no theme accent / correct surfaces');
    assert.ok(!/#63D98F/i.test(src), 'no brand green');
    assert.ok(!/borderWidth:\s*[2-9]/.test(src), 'no borderWidth above 1');
    assert.ok(!src.includes('adjustsFontSizeToFit'), 'no font shrinking');
    assert.ok(src.includes('<ScrollView') && src.includes("maxHeight: '100%'"), 'long text stays reachable');
    assert.ok(src.includes('normalizeSafeAreaBottomInset(insets.bottom)') || src.includes('bottomInset'), 'bottom safe area');
  });
}

test('personal message keeps guarded acknowledgement and hybrid variant', () => {
  const s = files.personal;
  assert.match(s, /if \(!message \|\| closing\) return/);
  assert.match(s, /await onAcknowledge\(message\.id\)/);
  assert.match(s, /motionVariant\?: 'classic' \| 'hybrid'/);
  assert.match(s, /onRequestClose=\{\(\) => \{ void close\(\); \}\}/);
});

test('broadcast keeps claim/review-promo behaviour and busy guard', () => {
  const s = files.broadcast;
  // зачем (перепин 17.10, Optimistic UI): окно закрывается СРАЗУ, а награда забирается фоном с повторами — компонент зовёт closeGlobalBroadcastModalAndClaimInBackground,
  // а сам claimAndDismissGlobalBroadcastModal живёт в app/global_broadcast_modal.ts и вызывается из фонового запроса; смысл (награда забирается, окно не вернётся) прежний
  for (const x of ['closeGlobalBroadcastModalAndClaimInBackground', 'recordReviewPromoClick', 'getReviewPromoUrl', 'if (!payload || busy) return;', 'hapticSuccess', 'RuneGlyph']) {
    assert.ok(s.includes(x), `keeps ${x}`);
  }
  const claim = readFileSync(new URL('../app/global_broadcast_modal.ts', import.meta.url), 'utf8');
  assert.ok(claim.includes('claimAndDismissGlobalBroadcastModal(payload, studyTarget)'), 'background claim still calls claimAndDismissGlobalBroadcastModal');
});
