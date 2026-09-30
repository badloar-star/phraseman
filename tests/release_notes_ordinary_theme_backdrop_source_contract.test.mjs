import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'components', 'ReleaseNotesModal.tsx'),
  'utf8',
);

// Обычные «Что нового» — шторка Liquid Glass на токенах активной темы (SYS-06),
// а не старая золотая карточка с жёсткими hex.
assert.match(source, /const releaseGlass = announcementGlass;|const releaseGlass = liquidGlassTokens\(liquidGlassThemeId\);/);
assert.match(source, /<HybridSheetShell[\s\S]*material="liquid-glass"/);
assert.match(source, /backgroundColor: releaseGlass.accent/);
assert.match(source, /color: releaseGlass.accentInk/);
assert.doesNotMatch(source, /#B9791F|#FFE08A|#F7BE4F|#E99D35|#111722|#171A24|#241F13/);
assert.match(source, /onPress=\{closeOnce\}/);
assert.match(source, /onPress=\{requestDismiss\}/);
assert.match(source, /\{announcement \? \(\s*<View style=\{styles\.announcementContent\}>/);

console.log('release-notes ordinary theme backdrop contract: PASS');
