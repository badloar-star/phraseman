import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import ts from 'typescript';

const sourcePath = path.join(process.cwd(), 'app', 'settings_notifications.tsx');
const source = readFileSync(sourcePath, 'utf8');

test('notification time modal keeps the complete selectable ranges and validates its TypeScript source', () => {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactNative, target: ts.ScriptTarget.ES2022 },
    fileName: sourcePath,
    reportDiagnostics: true,
  });
  assert.equal(transpiled.diagnostics?.filter(({ category }) => category === ts.DiagnosticCategory.Error).length, 0);
  assert.match(source, /Array\.from\(\{ length: 24 \}, \(_, i\) => i\)/, 'all 24 hours remain reachable');
  assert.match(source, /const MINUTES\s*=\s*\[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55\]/, 'five-minute choices remain reachable');
});

test('time modal restores the actual saved values and only submits through OK', () => {
  assert.match(source, /if \(visible\) \{ setH\(hour\); setM\(minute\); \}/, 'opening resets transient wheel values');
  assert.match(source, /onRequestClose=\{onCancel\}/, 'Android Back discards transient values');
  assert.match(source, /onPress=\{onCancel\}[\s\S]*?\{cancelLabel\}/, 'Cancel discards transient values');
  assert.match(source, /onPress=\{\(\) => onConfirm\(h, m\)\}/, 'only OK submits the selected hour and minute');
  assert.doesNotMatch(source, /onPress=\{onCancel\}[\s\S]{0,100}onConfirm/, 'Cancel must not submit');
});

test('time modal uses the approved liquid-glass geometry while preserving wheel gestures', () => {
  assert.match(source, /const TIME_MODAL_PANEL_RADIUS\s*=\s*26/, 'LG2 panel radius is 26');
  assert.match(source, /const TIME_MODAL_TITLE_SIZE\s*=\s*25/, 'title uses the approved 25px size');
  assert.match(source, /lineHeight:\s*31/, 'title uses the approved 31px line height');
  assert.match(source, /borderRadius:\s*TIME_MODAL_PANEL_RADIUS/, 'panel consumes its radius token');
  assert.match(source, /gap:\s*10/, 'Cancel and OK retain a 10px separation');
  assert.match(source, /useStableSafeAreaInsets/, 'modal bounds itself with stable safe-area metrics');
  assert.match(source, /maxHeight:\s*'100%'/, 'small screens keep controls inside the safe viewport');
  assert.match(source, /fontWeight:\s*v === value \? '700' : '400'/, 'selected values are visibly highlighted');
  assert.match(source, /snapToInterval=\{itemHeight\}/, 'wheel snapping follows the adaptive row height');
  assert.match(source, /onMomentumScrollEnd=\{snapNow\}/, 'wheel gesture completion remains functional');
  assert.match(source, /<BouncyScrollView[\s\S]*?nestedScrollEnabled/, 'wheel cooperates with the bounded parent viewport');
});

test('time modal keeps the action dock reachable in a bounded viewport and uses approved glass tokens', () => {
  const timeModalSource = source.slice(source.indexOf('function TimeModal'), source.indexOf('function ToggleRow'));
  assert.match(source, /const VISIBLE\s*=\s*3/, 'wheel shows one previous/current/next row');
  assert.match(source, /const itemHeight = Math\.max\(48, Math\.ceil\(36 \* fontScale \+ 12\)\)/, 'row height grows with system font scale without shrinking text');
  assert.match(source, /const padHeight = itemHeight/, 'wheel padding follows the adaptive row height');
  assert.match(source, /lineHeight: v === value \? 32 : 20/, 'wheel line height remains a base value that React Native scales once');
  assert.match(source, /fontSize:\s*v === value \? 27 : distance === 1 \? 16 : 16/, 'selected and adjacent wheel values use the approved hierarchy');
  assert.match(timeModalSource, /<ScrollView nestedScrollEnabled style=\{\{ flexShrink:1, minHeight:0 \}\}[^>]*>/, 'only the modal body scrolls when the bounded panel is short');
  assert.ok(timeModalSource.indexOf('</ScrollView>') < timeModalSource.indexOf("gap:12"), 'fixed action dock follows the scrollable body');
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/, 'all 13 themes resolve through the liquid glass token registry');
  assert.match(timeModalSource, /colors=\{\[glass\.opaqueSheet, glass\.opaqueSheet\]\}/, 'panel has the approved opaque sheet base');
  assert.match(timeModalSource, /colors=\{\[glass\.selected, 'transparent'\]\}/, 'panel has the approved subtle sheen');
  // зачем (стиль «Тень», владелец 12.10): окно без кромки — plateBoxShadow на внешнем слое, клип скруглений на внутреннем.
  assert.match(timeModalSource, /boxShadow:plateBoxShadow\(glass\)/, 'panel is separated by the plate shadow from the active glass token');
  assert.doesNotMatch(timeModalSource, /borderColor:glass\.glassEdge|borderWidth:1/, 'panel and buttons carry no edge');
  assert.match(timeModalSource, /backgroundColor:glass.accent/, 'OK uses the approved CTA token');
  assert.match(timeModalSource, /color:glass.accentInk/, 'OK label uses the approved CTA ink token');
  assert.match(timeModalSource, /borderRadius:24, backgroundColor:glass\.buttonFill, boxShadow:nestedBoxShadow\(glass\)/, 'Cancel is a nested plate with a small shadow instead of a ghost outline');
  assert.match(timeModalSource, /borderRadius:24, backgroundColor:glass.accent, boxShadow:actionBoxShadow\(glass\)/, 'OK keeps the approved pill radius and gets the action shadow');
  assert.match(source, /useEffect\(\(\) => \(\) => \{ if \(timer\.current\) clearTimeout\(timer\.current\); \}, \[\]\)/, 'pending wheel snap timer is cleaned on unmount');
  // зачем (координатор 13.10, коммит 687205b5b): кап 1,15 допустим только на заголовке экрана уведомлений; сжатие и любой другой кап запрещены
  assert.doesNotMatch(source, /adjustsFontSizeToFit|maxFontSizeMultiplier(?!=\{1\.15\})/, 'large text is not shrunk or capped (except the screen title at 1.15)');
  assert.doesNotMatch(source, /lineHeight: Math\.ceil\(\(v === value \? 32 : 20\) \* fontScale\)/, 'wheel line height is not manually scaled twice');
});
