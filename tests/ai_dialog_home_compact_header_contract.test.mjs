import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const root = join(import.meta.dirname, '..');
const source = readFileSync(join(root, 'app/ai_dialog_home.tsx'), 'utf8');

test('dialogue hub keeps back, title and live energy in one safe-area header row', () => {
  assert.match(source, /<SafeAreaView[^>]*style=\{\{ flex: 1 \}\}/);
  assert.match(source, /testID="ai-dialog-home-header-row"/);
  assert.match(source, /flexDirection: 'row', alignItems: 'flex-start'/);
  // зачем (12.10, п.72): на кнопке теперь testID для робота съёмки — перед icon допускаем другие свойства
  assert.match(source, /<V2IconButton[^>]*icon="chevron-back"/);
  assert.match(source, /safeRouterBack\(router, '\/\(tabs\)\/home'/);
  // 30.09: пилюля энергии стеклянная (glass) — старая тёмная капсула выбивалась из тем 2.0.
  // 30.09 (макет hubHead): справа столбик — энергия и пилюля остатка «N/30» (у Plus её нет).
  assert.match(source, /<V2LargeTitle[\s\S]*right=\{headerRight\}/);
  // 30.09: пилюля энергии стеклянная (glass) — старая тёмная капсула выбивалась из тем 2.0.
  // 18.10 (dialogs-004/006): пилюля «N/30» вынесена в quotaPill — справа под энергией в обычной шапке, по центру под заголовком при раскрытой категории.
  assert.match(source, /const quotaPill = quota \? \([\s\S]*<DialogueGlassQuotaPill/);
  assert.match(source, /const headerRight = \([\s\S]*<EnergyBar size=\{30\} glass solidBolt \/>[\s\S]*\{subtitleHidden \? null : quotaPill\}/);
  assert.match(source, /const centeredQuota = subtitleHidden && quotaPill/);
  assert.doesNotMatch(source, /paddingTop: 12, gap: 12/);
});

test('dialogue hub gives localized copy full width on narrow or large-text screens', () => {
  assert.match(source, /useWindowDimensions\(\)/);
  assert.match(source, /width < 360 \|\| fontScale >= 1\.3/);
  assert.match(source, /testID="ai-dialog-home-header-actions"/);
  assert.match(source, /isNarrowOrLargeText \? \(/);
  assert.match(source, /<V2LargeTitle[\s\S]*title=\{title\}[\s\S]*subtitle=\{subtitle\}/);
});
