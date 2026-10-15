import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

// зачем (координатор 15.10, аудит Optimistic UI; docs/work/tasks/optimistic-ui-night-2026-10-15.md): «Напомнить позже» в окне понижения Пика закрывает окно сразу,
// а напоминание ставит фоном. Два быстрых тапа до размонтирования окна запускали постановку дважды: обе читали прежний id раньше, чем первая его записала,
// и в 19:00 приходили два пуша. Сторож держит синхронную защёлку в scheduleRemind и её сброс при новом решении.
const read = (...parts) => readFileSync(join(process.cwd(), ...parts), 'utf8').replace(/\r\n/g, '\n');
const hook = read('app', 'spire', 'use_spire_week_moment.ts');
const body = hook.slice(hook.indexOf('const scheduleRemind = useCallback'), hook.indexOf('return {', hook.indexOf('const scheduleRemind = useCallback')));

test('scheduleRemind fires once: a synchronous latch is set before the background scheduling starts', () => {
  assert.match(hook, /const remindFiredRef = useRef\(false\);/);
  const latchCheck = body.indexOf('if (remindFiredRef.current)');
  const latchSet = body.indexOf('remindFiredRef.current = true;');
  const schedule = body.indexOf('scheduleSpireWeekRemindWithFeedback(uiLang)');
  assert.ok(latchCheck >= 0 && latchSet > latchCheck && schedule > latchSet, 'проверка → установка → постановка, именно в таком порядке');
});

test('a swallowed second tap is logged, not silent', () => {
  assert.match(body, /\[D191-REMIND\] повторное нажатие погашено/);
});

test('the latch is released only when a new decision arrives', () => {
  assert.match(hook, /useEffect\(\(\) => \{ if \(decision\) remindFiredRef\.current = false; \}, \[decision\]\);/);
});
