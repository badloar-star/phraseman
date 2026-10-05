import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const source = normalizeEol(fs.readFileSync(
  path.join(process.cwd(), 'app', 'flashcards_swipe.tsx'),
  'utf8',
));
const play = source.slice(source.indexOf('  const renderPlay = () =>'), source.indexOf('\n  const renderQuickStart ='));

assert.match(source, /import \{ LinearGradient \} from '\.\.\/components\/SafeLinearGradient';/);
assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/);
assert.match(source, /const \{ theme: t, statusBarLight, f, ds, liquidGlassThemeId \} = useTheme\(\);/);
assert.match(source, /function SwipeTrainingCardGlass\(/);
assert.match(source, /pointerEvents="none"[\s\S]*LinearGradient[\s\S]*StyleSheet\.absoluteFill/);
assert.match(play, /: swipeGlass\.card/);
assert.match(play, /<SwipeTrainingCardGlass chrome=\{swipeGlass\} sheen=\{!feedback\} \/>/);
assert.match(play, /styles\.cardBack,[\s\S]{0,900}backgroundColor: swipeGlass\.card/);
assert.equal(
  (play.match(/<SwipeTrainingCardGlass chrome=\{swipeGlass\}/g) ?? []).length,
  2,
  'rising back and front card must share the same material layer',
);
assert.match(play, /\.\.\.\(isCompactFlashcardsTask \? \{\} : panResponder\.panHandlers\)/);
assert.match(play, /onPress=\{\(\) => answerCurrent\(false\)\}/);
assert.match(play, /onPress=\{\(\) => answerCurrent\(true\)\}/);
assert.doesNotMatch(source.slice(source.indexOf('trainingCard:'), source.indexOf('compactTrainingCard:')), /borderWidth/);

console.log('flashcards swipe liquid-card contract: PASS');
