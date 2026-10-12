import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../components/PersonalAdminMessageModal.tsx', import.meta.url), 'utf8');

test('personal admin message uses a glass card and keeps acknowledgement guarded', () => {
  assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/);
  // зачем (стиль «Тень» 12.10, координатор: красные сторожи): карточка сообщения — тон шторки и тень плашки, без кромки.
  assert.match(source, /backgroundColor: glass\.opaqueSheet, boxShadow: plateBoxShadow\(glass\)/);
  assert.doesNotMatch(source, /borderColor: glass\.glassEdge/);
  assert.match(source, /if \(!message \|\| closing\) return/);
  assert.match(source, /await onAcknowledge\(message\.id\)/);
  assert.match(source, /normalizeSafeAreaBottomInset\(insets\.bottom\)/);
});
