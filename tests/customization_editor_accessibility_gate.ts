import assert from 'node:assert/strict';
import { customizationEditorConfirmAccessibilityLabel } from '../app/customization_editor_accessibility';

assert.equal(
  customizationEditorConfirmAccessibilityLabel(
    'Открыть и надеть',
    { currency: 'runes', amount: 90 },
    { runes: 'рун', pearls: 'жемчужин' },
  ),
  'Открыть и надеть, 90 рун',
);

assert.equal(
  customizationEditorConfirmAccessibilityLabel(
    'Открыть и надеть',
    { currency: 'pearls', amount: 100 },
    { runes: 'рун', pearls: 'жемчужин' },
  ),
  'Открыть и надеть, 100 жемчужин',
);

assert.equal(
  customizationEditorConfirmAccessibilityLabel(
    'Применить',
    null,
    { runes: 'рун', pearls: 'жемчужин' },
  ),
  'Применить',
);

process.stdout.write('CUSTOMIZATION EDITOR ACCESSIBILITY GATE: PASS\n');
