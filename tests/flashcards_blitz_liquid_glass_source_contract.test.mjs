import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards_blitz_session.tsx'),
  'utf8',
);

const activeGame = source.slice(source.indexOf('  const danger = timeLeft'), source.indexOf('\nconst styles ='));

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
assert.match(source, /const \{ theme: t, f, liquidGlassThemeId \} = useTheme\(\);/);
assert.match(source, /function BlitzGlassSurface\(/);
assert.match(source, /pointerEvents="none"[\s\S]*LinearGradient[\s\S]*StyleSheet\.absoluteFill/);
assert.match(source, /ANSWER_OK_SURFACE = '#185C3A'/);
assert.match(source, /ANSWER_BAD_SURFACE = '#702B35'/);
assert.match(activeGame, /state === 'correct'\) \{ bg = ANSWER_OK_SURFACE; tc = ANSWER_STATE_TEXT; \}/);
assert.match(activeGame, /state === 'wrong'\) \{ bg = ANSWER_BAD_SURFACE; tc = ANSWER_STATE_TEXT; \}/);
assert.match(activeGame, /<BlitzGlassSurface chrome=\{blitzGlass\} sheen=\{state === 'idle'\} \/>/);
assert.doesNotMatch(source.slice(source.indexOf('glassSurface:'), source.indexOf('questionText:')), /borderWidth/);
assert.doesNotMatch(activeGame, /borderColor/);
assert.ok(contrast('#FFFFFF', '#185C3A') >= 4.5, 'correct answer text must meet 4.5:1 on its dark semantic fill');
assert.ok(contrast('#FFFFFF', '#702B35') >= 4.5, 'wrong answer text must meet 4.5:1 on its dark semantic fill');
assert.match(activeGame, /<BlitzGlassSurface chrome=\{blitzGlass\} \/>/);
assert.match(activeGame, /onPress=\{\(\) => pick\(i\)\}/);
assert.match(activeGame, /disabled=\{locked\}/);
assert.match(activeGame, /<NoEnergyModal visible=\{energyGate === 'denied'\}/);

console.log('flashcards blitz liquid-glass active-state contract: PASS');
