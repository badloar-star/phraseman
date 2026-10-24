import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('components/home/v2/scene/PremiumThemeMotion.tsx', 'utf8');
const generated = fs.readFileSync('components/home/v2/scene/premium_theme_motion_sources.ts', 'utf8');
const stage = fs.readFileSync('components/home/v2/scene/HomeSceneStage.tsx', 'utf8');

test('all six premium themes mount the approved CSS/WebGL scene families', () => {
  for (const id of [
    'grad_full_olive', 'grad_full_ref_signal_lime', 'grad_full_ref_storm_violet',
    'grad_full_titanium', 'grad_full_horizon', 'grad_full_ref_gravity_blue',
  ]) assert.match(source + generated, new RegExp(id));
  assert.match(source, /premium-theme-motion-\$\{kind\}/);
  assert.match(stage, /<PremiumThemeMotion themeId=\{liquidGlassThemeId\} isLight=\{!isDark\} width=\{windowW\} height=\{stageH\} \/>/);
  assert.match(source, /targetRatio=\$\{JSON\.stringify\(input\.aspect\)\}/);
});

test('WebGL source keeps the approved 24fps low-power renderer and remote storm plate', () => {
  assert.match(source, /powerPreference:'low-power'/);
  assert.match(source, /1000\/24/);
  assert.match(source, /resolveActivePremiumThemeArt\('motion_plate'\)/);
  assert.match(source, /data:image\/webp;base64/);
  assert.match(source, /useReducedMotion\(\)/);
  assert.match(generated, /PREMIUM_SIGNAL_FRAGMENT/);
  assert.match(generated, /PREMIUM_STORM_FRAGMENT/);
  assert.match(generated, /PREMIUM_GRAVITY_FRAGMENT/);
  assert.doesNotMatch(source, /runOnJS/);
});

test('material motion preserves the approved long ambient timings', () => {
  assert.match(generated, /"duration": 32/);
  assert.match(generated, /"duration": 38/);
  assert.match(generated, /"duration": 50/);
  // зачем (4 · ТЕМЫ 24.10, закон «цвета — оттенки темы»): утверждённые краски материалов перенесены в спецификацию тем (PREMIUM_MOTION_PIGMENTS) —
  // проверяем, что значения сохранены там дословно, а анимация берёт их оттуда.
  const spec = fs.readFileSync('constants/premiumThemeVisualSpecs.ts', 'utf8');
  assert.match(spec, /dawnRim: '#ffd09e'/);
  assert.match(spec, /ember: '#ff322966'/);
  assert.match(spec, /sheen: '#d3cd6a44'/);
  assert.match(generated, /\$\{M\.grad_full_horizon\.dawnRim\}/);
  assert.match(generated, /\$\{M\.grad_full_titanium\.ember\}/);
  assert.match(generated, /\$\{M\.grad_full_olive\.sheen\}/);
});
