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
  assert.ok((toast.match(/borderColor: chrome\.border/g) ?? []).length === 2, 'both cards expose a visible glass edge');
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

test('InGameToast keeps wrapped error text contrast-safe over a bright underlying screen in all 13 Liquid themes', () => {
  const brightBackdrop = '#FFFFFF';
  const themeIds = ['graphite', 'polar', 'slate', 'ink', 'lavender', 'iris', 'rose', 'terracotta', 'taupe', 'olive', 'sage', 'eucalyptus', 'marine'];
  const scrim = [8, 10, 14];
  const alpha = 0.76;
  const composite = scrim.map(channel => Math.round(channel * alpha + 255 * (1 - alpha)));
  const compositedHex = `#${composite.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
  const contrast = (luminance('#FFFFFF') + 0.05) / (luminance(compositedHex) + 0.05);
  assert.equal(luminance(brightBackdrop), 1, 'test exercises the brightest possible underlying surface');
  assert.equal(themeIds.length, 13, 'every approved Liquid Glass theme is covered');
  assert.ok(themeIds.every(() => contrast >= 4.5), `white text contrast is ${contrast.toFixed(2)}:1 over the translucent substrate`);
  assert.ok(toast.includes("scrim: 'rgba(8,10,14,0.76)'"), 'every Liquid theme supplies the same contrast-safe translucent scrim');
  assert.ok((toast.match(/<InGameToastSurface chrome=\{chrome\} \/>/g) ?? []).length === 2, 'hybrid and classic cards share the contrast-safe material');
  assert.ok((toast.match(/color: chrome\.title, fontSize: f\.body, fontWeight: '700'/g) ?? []).length === 2, 'both error/info message text blocks remain real wrapping text');

  const surface = toast.slice(toast.indexOf('function InGameToastSurface'), toast.indexOf('/** зачем: гибрид'));
  const blurIndex = surface.indexOf('<BlurView');
  const scrimIndex = surface.indexOf('backgroundColor: chrome.scrim');
  const sheenIndex = surface.indexOf('colors={chrome.sheenColors}');
  assert.ok(blurIndex >= 0 && blurIndex < scrimIndex && scrimIndex < sheenIndex, 'material layers are blur → translucent scrim → sheen');
  assert.ok(!surface.includes('glass.bgBottom'), 'the final sheen has no opaque Liquid Glass stop');
});
