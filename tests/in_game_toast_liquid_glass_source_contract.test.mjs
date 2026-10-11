import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const toast = readFileSync(new URL('../components/InGameToast.tsx', import.meta.url), 'utf8');

test('InGameToast renders both passive runtime tones with active Liquid Glass and safe top geometry', () => {
  assert.ok(toast.includes("type?: 'error' | 'info'"), 'both real runtime tones remain');
  assert.ok(toast.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme registry');
  assert.ok(toast.includes('inGameToastGlassChrome(inGameToastGlass)'), 'local passive glass chrome is used');
  assert.ok((toast.match(/colors=\{chrome\.sheenColors\}/g) ?? []).length === 1, 'the shared passive surface owns the glass sheen');
  assert.ok((toast.match(/<InGameToastSurface chrome=\{chrome\} \/>/g) ?? []).length === 2, 'both hybrid and classic cards consume that shared glass surface');
  // зачем (владелец 12.10, стиль «Тень»): у тоста нет обводки — отделяют тон и тень.
  assert.ok((toast.match(/borderColor: chrome\.border/g) ?? []).length === 0, 'no glass edge outline');
  assert.ok(toast.includes('Math.max(TOAST_TOP_MIN, insets.top + TOAST_TOP_GAP)'), 'existing top safe-area geometry remains');
  assert.ok(toast.includes('pointerEvents="none"'), 'toast remains passive to touches');
  assert.ok(toast.includes("duration = 3000"), 'existing default three-second duration remains');
  assert.ok(toast.includes('TONE_ICON[type]'), 'error/info semantic icon remains real');
});

function luminance(hex) {
  const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
  const linear = channels.map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

// 04.10 (overlays-runtime OR-TOAST-INGAME-*): материал — сплошной графит темы (`.or-toast` var(--control)),
// поэтому контраст не зависит от экрана под тостом; размытие и полупрозрачная подложка убраны.
test('InGameToast follows the OR-TOAST frame: solid surface, 41 tile, 13/18 copy, 58 high, radius 19', () => {
  const surface = toast.slice(toast.indexOf('function InGameToastSurface'), toast.indexOf('/** зачем: гибрид'));
  assert.ok(!toast.includes('<BlurView'), 'no realtime blur under a solid surface');
  assert.ok(surface.includes('backgroundColor: chrome.surface'), 'solid surface layer');
  assert.ok(toast.includes('surface: glass.opaqueControl'), 'surface comes from the active theme');
  assert.ok(surface.indexOf('backgroundColor: chrome.surface') < surface.indexOf('colors={chrome.sheenColors}'), 'surface → sheen');
  assert.ok((toast.match(/<Text style=\{\[styles\.copy, \{ color: chrome\.title \}\]\}>/g) ?? []).length === 2, 'both cards render real wrapping copy in the title colour');
  assert.ok(toast.includes("copy: { flex: 1, minWidth: 0, fontSize: 13, lineHeight: 18, fontWeight: '700' }"));
  assert.ok(toast.includes('tile: { width: 41, height: 41, borderRadius: 10'));
  assert.ok(toast.includes('minHeight: 58') && toast.includes('borderRadius: 19'));
  assert.ok(toast.includes("error: 'close'") && toast.includes("info: 'chatbubble-outline'"));
});
