import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(__dirname, '..', 'components', 'release_notes_copy.ts'), 'utf8');
const localeBlocks = [...source.matchAll(/const (RU|UK|ES|PT_BR|VI|ID|TR|PL): ReleaseNotesTexts = \{[\s\S]*?items: \[([\s\S]*?)\],/g)];
assert.equal(localeBlocks.length, 8, 'All eight release-note locales must remain');
for (const [, locale, items] of localeBlocks) {
  assert.equal((items.match(/\{ icon:/g) ?? []).length, 5, `${locale} must show five current chapters`);
  assert.equal(items.includes("icon: 'flash-outline'"), true, `${locale} must retain energy guidance`);
  assert.equal(items.includes("icon: 'trophy-outline'"), false, `${locale} must not advertise Arena`);
  assert.equal(items.includes("icon: 'hardware-chip-outline'"), false, `${locale} must not advertise MAX`);
}
assert.equal(/\bMAX\b|МАКС|Макс/.test(source), false, 'MAX must not appear in bundled release-note copy');
