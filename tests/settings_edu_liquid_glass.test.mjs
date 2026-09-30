import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const source = fs.readFileSync(path.resolve('app/settings_edu.tsx'), 'utf8');
const localSwitchTag = source.match(/function LocalSwitch[\s\S]*?<PressableHybrid([\s\S]*?)\n\s*>/)?.[1] ?? '';

test('learning settings use the approved liquid-glass shell without losing settings behavior', () => {
  assert.match(source, /liquidGlassTokens\(liquidGlassThemeId\)/);
  assert.match(source, /useStableSafeAreaInsets\(\)/);
  assert.match(source, /<ScreenGradient>[\s\S]*<BouncyScrollView[\s\S]*fontSize:\s*34/);
  assert.match(source, /paddingTop:\s*insets\.top/);
  assert.match(source, /paddingBottom:\s*insets\.bottom/);
  assert.match(source, /paddingLeft:\s*insets\.left/);
  assert.match(source, /paddingRight:\s*insets\.right/);
  assert.match(source, /width:\s*48,[\s\S]*height:\s*48,[\s\S]*borderRadius:\s*24/);
  assert.match(source, /fontSize:\s*34,[\s\S]*lineHeight:\s*40/);
  assert.match(source, /fontSize:\s*34,[\s\S]*marginTop:\s*10/);
  assert.match(source, /fontSize:\s*15, lineHeight:\s*20, marginTop:\s*7/);
  assert.match(source, /\{L\(\{ ru: 'ОТВЕТ'[\s\S]*?<View style=\{\{ gap: 10 \}\}>/);
  assert.match(source, /\{L\(\{ ru: 'ЗВУК'[\s\S]*?<View style=\{\{ gap: 10 \}\}>/);
  assert.match(source, /backgroundColor:\s*glass\.opaqueCard/);
  assert.match(source, /colors=\{\[glass\.selected, 'transparent'\]\}/);
  assert.match(source, /borderColor:\s*glass\.glassEdge/);
  assert.match(source, /minHeight:\s*64/);
  assert.match(source, /const rowStyle = \{[\s\S]*gap: 14/);
  assert.match(source, /fontSize:\s*16,[\s\S]*lineHeight:\s*21,[\s\S]*fontWeight:\s*'700'/);
  assert.match(source, /fontSize:\s*13,[\s\S]*lineHeight:\s*18/);
  assert.match(source, /marginTop:\s*3/);
  assert.match(source, /function LocalSwitch[\s\S]*accessibilityRole="switch"[\s\S]*accessibilityState=\{\{ checked: value \}\}/);
  assert.match(localSwitchTag, /withHaptic=\{false\}/);
  assert.match(localSwitchTag, /withSound=\{false\}/);
  assert.doesNotMatch(localSwitchTag.replace('withHaptic={false}', ''), /withHaptic=\{false\}/);
  assert.doesNotMatch(localSwitchTag.replace('withSound={false}', ''), /withSound=\{false\}/);
  assert.match(source, /translateX: value \? 19 : 0/);
  assert.match(source, /<RowIcon name="volume-high-outline" \/>[\s\S]*loc\.edu\.speed[\s\S]*<Slider[\s\S]*height: 44/);
  assert.match(source, /<RowIcon name="volume-high-outline" \/>[\s\S]*?<Text style=\{subStyle\}>\{loc\.edu\.speedHint\}<\/Text>/);
});

test('learning settings retain all callbacks, normalized speed preview, and voice navigation', () => {
  for (const key of ['autoCheck', 'autoAdvance', 'hardMode', 'haptics']) assert.match(source, new RegExp(`key: '${key}'`));
  assert.match(source, /getUserSettingsSnapshot\(\)/);
  assert.match(source, /void loadSettings\(\)\.then\(setS\)/);
  assert.match(source, /applyUserSettingsNow\(next\)/);
  assert.match(source, /setFcSfxEnabled\(value\)/);
  assert.match(source, /setFcAutoSpeakEnabled\(value\)/);
  assert.match(source, /minimumValue=\{0\.8\}[\s\S]*maximumValue=\{1\.3\}[\s\S]*step=\{0\.1\}/);
  assert.match(source, /onValueChange=\{v => setS\(prev => \(\{ \.\.\.prev, speechRate: normalizeSpeechRate\(v\) \}\)\)\}/);
  assert.match(source, /onSlidingComplete=\{v => \{[\s\S]*normalizeSpeechRate\(v\)[\s\S]*stopAudio\(\)[\s\S]*voicePlaybackPolicy\.isEnabled\(\)[\s\S]*speakAudio\('a dark horse', rate, \{ language: 'en-US' \}\)/);
  assert.match(source, /router\.push\('\/flashcards_voice_picker' as any\)/);
  assert.match(source, /testID="fc-voice-picker-row"[\s\S]*withHaptic=\{false\}[\s\S]*withSound=\{false\}/);
  assert.match(source, /safeRouterBack\(router, '\/\(tabs\)\/settings' as any\)/);
  assert.doesNotMatch(source, /key:\s*'voiceOut'/);
});

test('learning setting labels have English alongside every existing locale', () => {
  for (const label of ['Auto-check', 'Advance after answering', 'Type with keyboard', 'Vibrate on mistakes']) {
    assert.match(source, new RegExp(`en: '${label}'`));
  }
});
