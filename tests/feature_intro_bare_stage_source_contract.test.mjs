import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeEol } from './helpers/read_source_esm.mjs';

const source = normalizeEol(fs.readFileSync(
  path.join(process.cwd(), 'components', 'FeatureIntroModal.tsx'),
  'utf8',
));
const iconStage = source.slice(source.indexOf('function IconStage'), source.indexOf('\nfunction FeatureIntroModal'));

assert.match(source, /import \{ LinearGradient \} from '\.\/SafeLinearGradient';/);
assert.match(source, /import \{ liquidGlassTokens \} from '\.\.\/constants\/liquidGlassThemePalette';/);
assert.match(iconStage, /const glass = liquidGlassTokens\(liquidGlassThemeId\);/);
assert.match(iconStage, /pointerEvents="none"/);
assert.match(iconStage, /<LinearGradient[\s\S]*colors=\{\[glass\.selected, glass\.opaqueControl\]\}/);
assert.match(iconStage, /colors=\{\[glass\.lightTint, 'transparent'\]\}/);
assert.match(iconStage, /style=\{styles\.stageRim\}/);
assert.match(iconStage, /shadowOpacity: 0\.28,[\s\S]*shadowRadius: 18/);
assert.match(source, /iconStageOuter:[\s\S]*width: 108,[\s\S]*height: 108,[\s\S]*borderRadius: 34/);
assert.match(source, /iconCircle:[\s\S]*width: '100%',[\s\S]*height: '100%',[\s\S]*borderRadius: 34,[\s\S]*overflow: 'hidden'/);
assert.match(source, /stageRim:[\s\S]*position: 'absolute',[\s\S]*top: 1/);
assert.doesNotMatch(source.slice(source.indexOf('iconStageOuter:'), source.indexOf('iconCircle:')), /overflow/);
assert.doesNotMatch(source.slice(source.indexOf('iconStageOuter:'), source.indexOf('title:')), /borderWidth|borderColor/);
assert.match(iconStage, /size=\{28\}/);
assert.match(source, /onPress=\{\(\) => requestAction\(onDone, requestDismiss\)\}/);
assert.match(source, /onPress=\{\(\) => requestAction\(onSecondary \?\? onLater, requestDismiss\)\}/);
assert.match(source, /accessibilityLabel=\{ctaLabel\}/);

console.log('feature intro bare-stage liquid geometry contract: PASS');
