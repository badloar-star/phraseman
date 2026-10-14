import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const source = normalizeEol(fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards_recall_session.tsx'),
  'utf8',
));
const activeScreen = source.slice(source.indexOf('  const feedbackSurface'), source.indexOf('\nconst styles ='));

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(a, b) {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/);
assert.match(source, /const \{ theme: t, f, statusBarLight, liquidGlassThemeId \} = useTheme\(\);/);
assert.match(source, /function RecallGlassSurface\(/);
assert.match(activeScreen, /automaticallyAdjustKeyboardInsets/);
assert.match(activeScreen, /keyboardShouldPersistTaps="handled"/);
assert.match(activeScreen, /backgroundColor: recallGlass\.card/);
assert.match(activeScreen, /backgroundColor: recallGlass\.buttonFill/);
assert.match(activeScreen, /onChangeText=\{setInput\}/);
assert.match(activeScreen, /onSubmitEditing=\{checkAnswer\}/);
assert.match(activeScreen, /onPress=\{checkAnswer\}/);
assert.match(activeScreen, /onPress=\{advance\}/);
assert.match(activeScreen, /FEEDBACK_OK_SURFACE/);
assert.match(activeScreen, /FEEDBACK_BAD_SURFACE/);
assert.doesNotMatch(source.slice(source.indexOf('compactInputShell:'), source.indexOf('input:')), /borderWidth|borderColor/);
assert.ok(contrast('#FFFFFF', '#185C3A') >= 4.5, 'positive feedback text must meet 4.5:1');
assert.ok(contrast('#FFFFFF', '#702B35') >= 4.5, 'negative feedback text must meet 4.5:1');

console.log('flashcards recall liquid-glass active-state contract: PASS');
