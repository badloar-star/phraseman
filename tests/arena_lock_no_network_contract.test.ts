/**
 * Сторож: под замком аккаунта не выполняется сетевой bootstrap.
 *
 * Повод (владелец 2026-09-20, лог устройства 15:33:26):
 * `[ARENA-OUTBOX-GUARD] lock timeout waited=5012ms — another holder is stuck`.
 *
 * `prepareArenaCall` делает два СЕТЕВЫХ вызова — `ensureStableAuthLink` и
 * App Check. Пока они шли под `withAccountTransitionLock`, все остальные
 * владельцы замка стояли: очередь замка ждёт предыдущего БЕЗ таймаута
 * (`account_generation.ts:174`). На моргнувшей сети Арена вставала целиком —
 * проверка отчётов висела в `checking`, кнопки режимов гасли.
 *
 * Сработал — выносить сеть из-под замка, а не удалять сторожа.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function clientCode(): string {
  return readFileSync(join(__dirname, '..', 'app', 'arena_client.ts'), 'utf8')
    .replace(/\r\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

describe('замок аккаунта не держится во время сети', () => {
  test('bootstrap вынесен в отдельную функцию', () => {
    expect(clientCode()).toContain('async function arenaCallBootstrap()');
  });

  test('reserveArenaCall выполняет bootstrap ДО захвата замка', () => {
    const code = clientCode();
    const fn = code.slice(code.indexOf('async function reserveArenaCall'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    const bootstrapAt = body.indexOf('await arenaCallBootstrap()');
    const lockAt = body.indexOf('withAccountTransitionLock');
    expect(bootstrapAt).toBeGreaterThan(-1);
    expect(lockAt).toBeGreaterThan(-1);
    // Порядок решает: bootstrap обязан стоять ПЕРЕД замком.
    expect(bootstrapAt).toBeLessThan(lockAt);
  });

  test('prepareArenaCall не зовёт сеть напрямую — только через bootstrap', () => {
    const code = clientCode();
    const fn = code.slice(code.indexOf('async function prepareArenaCall'));
    const body = fn.slice(0, fn.indexOf('\n}'));
    expect(body).not.toContain('ensureStableAuthLink()');
    expect(body).not.toContain('initFirebaseAppCheckIfAvailable()');
  });
});
