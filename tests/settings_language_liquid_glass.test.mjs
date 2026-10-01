import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import ts from 'typescript';

const sourcePath = path.resolve('app/settings_language.tsx');
const source = fs.readFileSync(sourcePath, 'utf8');

test('language settings use the approved liquid-glass scroll shell and geometry', () => {
  assert.match(source, /PressableHybrid/);
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /useStableSafeAreaInsets\(\)/);
  for (const side of ['Top', 'Bottom', 'Left', 'Right']) assert.match(source, new RegExp(`padding${side}:\\s*insets\\.${side.toLowerCase()}`));
  const scrollStart = source.indexOf('<BouncyScrollView');
  assert.ok(scrollStart >= 0 && source.indexOf('settings-language-back', scrollStart) >= 0, 'close control lives inside the scroll view');
  assert.match(source, /width:\s*48,\s*height:\s*48/);
  assert.match(source, /name="close"\s+size=\{20\}/);
  assert.match(source, /fontSize:\s*34,\s*lineHeight:\s*40,\s*fontWeight:\s*'700',\s*marginTop:\s*10/);
  assert.match(source, /fontSize:\s*16,\s*lineHeight:\s*22,\s*marginTop:\s*7/);
  assert.match(source, /marginTop:\s*22/);
  assert.match(source, /minHeight:\s*64[\s\S]*?borderRadius:\s*14[\s\S]*?paddingVertical:\s*10[\s\S]*?paddingHorizontal:\s*14[\s\S]*?gap:\s*14/s);
  assert.match(source, /fontSize:\s*16,\s*lineHeight:\s*21,\s*fontWeight:\s*'700'/);
  assert.match(source, /backgroundColor:\s*glass\.opaqueCard/);
  assert.match(source, /colors=\{\[glass\.selected, 'transparent'\]\}/);
  assert.match(source, /borderColor:\s*glass\.glassEdge/);
  assert.doesNotMatch(source, /SectionSheetHeader|TouchableOpacity|SafeAreaView|BlurView|adjustsFontSizeToFit|maxFontSizeMultiplier|numberOfLines=/);
});

test('language rows preserve the registry, active and disabled semantics, and one callback haptic', () => {
  assert.match(source, /getVisibleInterfaceLanguageOptions\(IS_STORE_RELEASE\)/);
  assert.match(source, /const interfaceCode = coerceInterfaceLang\(item\.code\);/);
  assert.match(source, /const enabled = interfaceCode === item\.code;/);
  assert.match(source, /const active = lang === item\.code;/);
  assert.match(source, /disabled=\{!enabled\}/);
  assert.match(source, /accessibilityState=\{\{ selected: active, disabled: !enabled \}\}/);
  assert.match(source, /if \(!interfaceCode\) return;\s*hapticTap\(\);\s*void setLang\(interfaceCode\);/s);
  assert.match(source, /withHaptic=\{false\}/);
  assert.match(source, /withSound=\{false\}/);
  assert.match(source, /name="checkmark"\s+size=\{20\}/);
  assert.match(source, /name="chevron-forward"\s+size=\{18\}/);
  assert.match(source, /name="lock-closed"\s+size=\{18\}/);
  assert.match(source, /testID=\{`settings-language-row-\$\{item\.code\}`\}/);
  assert.match(source, /safeRouterBack\(router, '\/\(tabs\)\/settings' as any\)/);
});

test('language subtitle and close label cover all registered locales without adding routes or storage', () => {
  assert.match(source, /triLang\(lang as Lang,/);
  for (const locale of ['ru', 'uk', 'en', 'es', "'pt-BR'", 'vi', 'id', 'tr', 'pl']) {
    const key = locale.replaceAll("'", "\\'");
    const closeCopy = source.match(/const closeLabel = triLang\(lang as Lang, \{([\s\S]*?)\}\);/)?.[1] ?? '';
    const subtitleCopy = source.match(/const subtitle = triLang\(lang as Lang, \{([\s\S]*?)\}\);/)?.[1] ?? '';
    assert.match(closeCopy, new RegExp(`${key}:`), `close copy includes ${locale}`);
    assert.match(subtitleCopy, new RegExp(`${key}:`), `subtitle copy includes ${locale}`);
  }
  assert.match(source, /Язык меню и подсказок приложения/);
  assert.doesNotMatch(source, /StudyLanguagePicker|study-language|AsyncStorage|setStudyTarget|router\.push/);
});

test('transpiled screen uses the release-aware registry and preserves row interactions', () => {
  const calls = { visible: [], haptics: 0, setLang: [] };
  const React = { createElement: (type, props, ...children) => ({ type, props: { ...props, children } }) };
  const module = { exports: {} };
  const options = [
    { code: 'ru', native: 'Русский' },
    { code: 'zz', native: 'Unavailable' },
  ];
  const require = name => ({
    react: { __esModule: true, default: React },
    'react-native': { Text: 'Text', View: 'View' },
    '../components/BouncyScrollView': { __esModule: true, default: 'BouncyScrollView' },
    '../components/ContentWrap': { __esModule: true, default: 'ContentWrap' },
    '../components/PressableHybrid': { __esModule: true, default: 'PressableHybrid' },
    '../components/SafeLinearGradient': { __esModule: true, default: 'SafeLinearGradient' },
    '../components/ScreenGradient': { __esModule: true, default: 'ScreenGradient' },
    '@expo/vector-icons/Ionicons': { __esModule: true, default: 'Ionicons' },
    'expo-router': { useRouter: () => ({}) },
    '../components/ThemeContext': { useTheme: () => ({ theme: { textPrimary: '#fff', textMuted: '#aaa' }, liquidGlassThemeId: 'graphite' }) },
    '../components/LangContext': { useLang: () => ({ lang: 'ru', setLang: code => calls.setLang.push(code), s: { settings: { lang: 'Язык интерфейса' } } }) },
    '../constants/i18n': {
      triLang: (_lang, copy) => copy.ru,
      coerceInterfaceLang: code => code === 'ru' ? 'ru' : null,
      getVisibleInterfaceLanguageOptions: release => { calls.visible.push(release); return options; },
    },
    '../constants/liquidGlassThemePalette': { liquidGlassTokens: () => ({ opaqueCard: '#222', opaqueControl: '#333', glassEdge: '#444', selected: '#555', lightTint: '#fff', secondary: '#aaa' }) },
    '../hooks/use-haptics': { hapticTap: () => { calls.haptics += 1; } },
    './config': { IS_STORE_RELEASE: true },
    './navigation_back': { safeRouterBack: (router, fallback) => { calls.back = [router, fallback]; } },
    './stable_safe_area_metrics': { useStableSafeAreaInsets: () => ({ top: 1, bottom: 2, left: 3, right: 4 }) },
  })[name],
  context = { require, module, exports: module.exports };
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  vm.runInNewContext(code, context);
  const tree = module.exports.default();
  const visit = node => Array.isArray(node) ? node.flatMap(visit) : node && typeof node === 'object' ? [node, ...visit(node.props?.children)] : [];
  const rows = visit(tree).filter(node => node.type === 'PressableHybrid' && node.props.testID?.startsWith('settings-language-row-'));
  const close = visit(tree).find(node => node.type === 'PressableHybrid' && node.props.testID === 'settings-language-back');
  assert.deepEqual(calls.visible, [true], 'the real registry provider receives the release flag');
  assert.equal(rows.length, 2);
  assert.equal(close.props.withHaptic, true, 'the close control keeps its established haptic');
  assert.equal(close.props.withSound, false, 'the close control remains silent');
  close.props.onPress();
  assert.equal(calls.back?.[1], '/(tabs)/settings', 'close preserves the settings fallback');
  assert.equal(rows[0].props.accessibilityState.selected, true);
  assert.equal(rows[0].props.disabled, false);
  assert.equal(rows[0].props.withHaptic, false, 'rows opt out of wrapper haptics');
  assert.equal(rows[0].props.withSound, false, 'rows opt out of wrapper sound');
  rows[0].props.onPress();
  assert.deepEqual(calls.setLang, ['ru']);
  assert.equal(calls.haptics, 1);
  assert.equal(rows[1].props.accessibilityState.disabled, true);
  assert.equal(rows[1].props.disabled, true);
  rows[1].props.onPress();
  assert.deepEqual(calls.setLang, ['ru'], 'the invalid option cannot select a language');
  assert.equal(calls.haptics, 1, 'the invalid option cannot trigger feedback');
});

test('the TSX source remains syntactically transpileable', () => {
  const result = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal(result.diagnostics?.filter(diagnostic => diagnostic.category === ts.DiagnosticCategory.Error).length, 0);
});
