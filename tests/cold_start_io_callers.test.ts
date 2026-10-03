/**
 * PM-215 (замер 03.10: AS.getAllKeys n=15, пустые multiGet n=10 за старт): источник таких вызовов
 * пишется в итог [COLD-START-IO] — кадры стека вне самой трассировки.
 */
import { coldStartIoCallerTag } from '../app/cold_start_io_trace';

test('takes the first two frames outside the trace and keeps file:line:col', () => {
  const stack = [
    'Error',
    '    at wrappedIo (/app/cold_start_io_trace.ts:70:20)',
    '    at pruneThrottleKeys (/app/app_health.ts:87:37)',
    '    at runHealthChecks (/app/app_health.ts:120:5)',
    '    at tryCallOne (/node_modules/promise/core.js:37:12)',
  ].join('\n');
  expect(coldStartIoCallerTag(stack)).toBe('pruneThrottleKeys @app_health.ts:87:37 < runHealthChecks @app_health.ts:120:5');
});

test('release-style anonymous frames keep their bundle address for source-map lookup', () => {
  const stack = 'Error\n    at anonymous (address at index.android.bundle:1:123456)\n    at s (address at index.android.bundle:1:654321)';
  expect(coldStartIoCallerTag(stack)).toBe('anonymous @index.android.bundle:1:123456 < s @index.android.bundle:1:654321');
});

test('no usable frames → unknown', () => {
  expect(coldStartIoCallerTag(undefined)).toBe('unknown');
  expect(coldStartIoCallerTag('Error')).toBe('unknown');
});
