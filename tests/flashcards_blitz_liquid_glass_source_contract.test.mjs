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
// зачем (сверка 04.10, 9b848f4b8): стекло вопроса и вариантов — общий слой kit.css KitGlassLayer
// (блик 150° + кромка внутренними тенями); у ответа «верно/неверно» — только блик, без кромки.
assert.match(source, /import \{ KitGlassLayer \} from '\.\.\/components\/v2\/KitLiquidGlass';/);
assert.match(source, /function BlitzGlassSurface\(\{ radius, sheen = true \}[\s\S]*<KitGlassLayer radius=\{radius\} rim=\{sheen\} \/>/);
// зачем (PM-129, practice.html .opt.ok/.opt.no): ответ = цветная обводка 1px + подкраска 12 % поверх
// стекла (исключение 2.0 от 24.09); текст остаётся основным, контраст = контраст обычного варианта.
assert.match(source, /ANSWER_OK_SURFACE = 'rgba\(111,208,140,0\.12\)'/);
assert.match(source, /ANSWER_BAD_SURFACE = 'rgba\(224,80,80,0\.12\)'/);
assert.match(activeGame, /const tint = state === 'correct' \? ANSWER_OK_SURFACE : state === 'wrong' \? ANSWER_BAD_SURFACE : null;/);
assert.match(activeGame, /backgroundColor: blitzGlass\.card, borderColor: edge/);
assert.match(activeGame, /color: t\.textPrimary, fontSize: f\.body/);
assert.match(activeGame, /<BlitzGlassSurface radius=\{14\} sheen=\{state === 'idle'\} \/>/);
assert.doesNotMatch(source.slice(source.indexOf('glassSurface:'), source.indexOf('questionText:')), /borderWidth/);
assert.match(source.slice(source.indexOf('optionBtn:'), source.indexOf('optionText:')), /borderWidth: 1,/);
assert.ok(contrast('#6FD08C', '#0B0B0D') >= 4.5, 'correct mark must stay legible on the dark sheet');
assert.ok(contrast('#E05050', '#0B0B0D') >= 4.5, 'wrong mark must stay legible on the dark sheet');
assert.match(activeGame, /<BlitzGlassSurface radius=\{16\} \/>/);
assert.match(activeGame, /onPress=\{\(\) => pick\(i\)\}/);
assert.match(activeGame, /disabled=\{locked\}/);
assert.match(activeGame, /<NoEnergyModal visible=\{energyGate === 'denied'\}/);

console.log('flashcards blitz liquid-glass active-state contract: PASS');
