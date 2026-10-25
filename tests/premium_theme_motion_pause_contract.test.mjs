// [THEME-MOTION] Сторож паузы живого фона премиум-тем (координатор 25.10). Пауза идёт через injectJavaScript, WebView
// не перезагружается: ключ и html не зависят от паузы. WebGL — только по удалённому флагу (по умолчанию выкл, ANR «Аметист»).
import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync('components/home/v2/scene/PremiumThemeMotion.tsx', 'utf8');
const flags = fs.readFileSync('app/remote_flags.ts', 'utf8');
const probe = fs.readFileSync('app/scroll_restore_probe.ts', 'utf8');

test('обе страницы умеют паузу: CSS замирает на кадре, шейдер тормозит за 150 мс и снимает таймер', () => {
  assert.match(source, /body\.pm-paused #fx:before,body\.pm-paused #fx:after\{animation-play-state:paused!important\}/);
  assert.match(source, /window\.__pmSetRunning=function\(on\)\{document\.body\.classList\.toggle\('pm-paused',!on\)/);
  assert.match(source, /window\.__pmSetRunning=\(on\)=>\{target=on\?1:0/);
  assert.match(source, /speed\+dt\/\.15/);
  assert.match(source, /if\(live&&!\(target===0&&speed===0\)\)\{parked=false;timer=setTimeout\(draw,1000\/24\)\}else parked=true/);
});

test('пауза не перезагружает WebView: ключ и html без running/scrolling, команда — injectJavaScript', () => {
  const key = source.match(/key=\{`premium-motion-[^`]*`\}/);
  assert.ok(key, 'ключ WebView найден');
  assert.doesNotMatch(key[0], /running|scroll|reason/);
  const memoDeps = source.match(/\}, \[height, plateDataUri, reducedMotion, themeId, webglAllowed, width\]\);/);
  assert.ok(memoDeps, 'html зависит только от размеров, темы, плиты, reduced motion и флага WebGL');
  assert.match(source, /webRef\.current\?\.injectJavaScript\(premiumMotionSetRunningScript\(running\)\)/);
  assert.match(source, /onLoadEnd=\{\(\) => \{\n\s+loadedRef\.current = true;\n\s+webRef\.current\?\.injectJavaScript\(premiumMotionSetRunningScript\(runningRef\.current\)\)/);
});

test('ворота: Главная на виду + фокус + приложение активно + нет прокрутки', () => {
  assert.match(source, /homeVisible: runtimeOwnerId === 'home', screenFocused, appActive, scrolling, reducedMotion/);
  assert.match(source, /useSyncExternalStore\(subscribeHomeScroll, peekHomeScroll, peekHomeScroll\)/);
  assert.match(probe, /noteScreenScrollActivity\(screen, dragging \? 'drag_start' : 'drag_end'\);\n\s+if \(!ENABLED\) return;/);
  assert.match(probe, /noteScreenScrollActivity\(screen, 'offset'\);[^\n]*\n\s+if \(!ENABLED\) return;/);
});

test('WebGL — только по удалённому флагу, по умолчанию выключен и принимается из облака', () => {
  assert.match(flags, /\| 'premium_theme_webgl_motion_enabled'/);
  assert.match(flags, /premium_theme_webgl_motion_enabled: false,/);
  assert.match(flags, /'learning_cant_speak_enabled', 'premium_theme_webgl_motion_enabled',/);
  assert.match(source, /const shader = webglAllowed \? WEBGL_THEMES\.get\(themeId\) : undefined;/);
  assert.match(source, /onAppEvent\('remote_config_changed'/);
});

test('журнал [THEME-MOTION]: mount, loaded, gate с причиной, fps раз в 10 с', () => {
  for (const what of ["'mount'", "'loaded'", "'gate'", "'fps'", "'webgl_gate'"]) assert.ok(source.includes(`THEME_MOTION, ${what}`), what);
  assert.match(source, /now-statAt>=10000/);
});
