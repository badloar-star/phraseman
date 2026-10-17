import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const toast = readFileSync(new URL('../components/ActionToast.tsx', import.meta.url), 'utf8');

test('ActionToast applies one active Liquid Glass material to all five real tones without changing behavior', () => {
  assert.ok(toast.includes("'success' | 'error' | 'info' | 'warning' | 'reward'"), 'all five production tones remain');
  assert.ok(toast.includes('liquidGlassTokens(liquidGlassThemeId)'), 'active 13-theme token registry');
  assert.ok(toast.includes('actionToastGlassChrome(actionToastGlass)'), 'both card variants receive the local glass chrome');
  // зачем (перепин 18.10, причина): решение владельца «стекло 2.0 непрозрачное» (заливка ≥0,9 альфы, иначе текст читается насквозь) — тост рисуется opaqueCard/opaqueControl, а не прозрачным glass.card; ожидание «translucent» устарело, поведение тоста не менялось.
  assert.ok(toast.includes('glass.opaqueCard') && toast.includes('glass.opaqueControl'), 'toast surface uses the opaque glass tokens');
  // зачем (владелец 12.10, стиль «Тень»): у тоста нет обводки.
  assert.ok(!toast.includes('borderColor: chrome.border'), 'toast has no outline');
  assert.ok(toast.includes('chrome={chrome}'), 'hybrid branch receives the active passive glass chrome');
  assert.ok(toast.includes('colors={chrome.cardColors}'), 'classic rollback branch receives the active passive glass chrome');
  assert.ok(toast.includes('handleActionPress'), 'existing action callback remains present');
  assert.ok(toast.includes("pointerEvents={actionLabel ? 'box-none' : 'none'}"), 'existing action touch policy remains present');
  // 04.10 (overlays.html `.ov-toast-action`, кадры 48–57): кнопка действия — графитовая капсула 36 на материале темы,
  // подпись цветом текста; прежняя «легаси-палитра» снята вместе с themedToastChrome.
  assert.ok(toast.includes('backgroundColor: chrome.closeBg'), 'classic action capsule uses the active glass chrome');
  assert.ok(toast.includes('{ color: chrome.title }]}>{actionLabel}'), 'classic action label uses the title colour');
  // зачем (владелец 14.10, «минимум ненужных элементов»): тост — значок и одна строка; рейла, плитки под значком и капс-заголовка тона нет, смысл тона читает диктор
  assert.ok(!toast.includes('styles.accentRail') && !toast.includes("textTransform: 'uppercase'") && !toast.includes('styles.iconBadge'), 'toast has no rail, tile or caps tone label');
  assert.ok(toast.includes('accessibilityLabel={`${toneLabel}. ${message}`}'), 'tone is still announced to the screen reader');
  assert.ok(toast.includes('AUTO_DISMISS_MS = 3200'), 'existing lifecycle duration remains unchanged');
});
