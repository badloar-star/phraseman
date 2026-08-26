import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Сторож инцидента 2026-08-26 «из спина всегда выпадает только 20 жемчужин».
 *
 * Три симптома оказались ОДНИМ багом:
 *  1) доставка приза стартовала, пока аккаунт был ещё `transitioning` —
 *     accountScopeKey в такой фазе даёт null, и withXpAccountOperationQueue
 *     МОЛЧА возвращал staleValue, не выполнив начисления;
 *  2) чек поэтому не подтверждался и оставался активным навсегда;
 *  3) claimLocalLevelSpin сначала зовёт recoverLocalLevelSpin и отдаёт ТОТ ЖЕ
 *     чек — тот же приз, без списания кредита. Круг замыкался.
 *
 * Тест сторожит все три разрыва. Ломается — чинить логику, не тест.
 */
describe('level spin reward delivery: stuck receipt contract', () => {
  const screenPath = join(process.cwd(), 'app', 'level_reward_spin.tsx');
  const spinsPath = join(process.cwd(), 'app', 'local_level_spins.ts');
  const generationPath = join(process.cwd(), 'app', 'account_generation.ts');

  const screen = readFileSync(screenPath, 'utf8');
  const spins = readFileSync(spinsPath, 'utf8');
  const generation = readFileSync(generationPath, 'utf8');

  test('exposes a way to wait for an active account generation', () => {
    expect(generation).toContain('export function waitForActiveAccountGeneration');
    // Ожидание обязано завершаться само, иначе доставка повиснет навсегда.
    expect(generation).toContain('timeoutMs');
    expect(generation).toContain("token.phase === 'active'");
  });

  test('delivery never starts on a non-active account generation', () => {
    expect(screen).toContain('waitForActiveAccountGeneration');
    // Токен, с которым реально идёт начисление, обязан быть активным.
    expect(screen).toContain('const activeToken = isCurrentAccountGeneration(accountToken)');
    expect(screen).toContain('if (!activeToken) return { success: false }');
  });

  test('the screen waits for activation instead of bailing out of recovery', () => {
    // Раньше run() просто выходил при неактивной фазе и экран навсегда
    // застревал в 'recovering' при заходе сразу после старта приложения.
    expect(screen).toContain('const captured = captureAccountGeneration()');
    expect(screen).toContain('await waitForActiveAccountGeneration()');
  });

  test('an undelivered receipt is released back into a spin credit', () => {
    expect(spins).toContain('export async function releaseUndeliveredLocalLevelSpin');
    // Возврат кредита запрещён, если приз уже выдан — иначе двойная награда.
    expect(spins).toContain('if (alreadyClaimed) return false');
    expect(spins).toContain('activeReceipt: null');
  });

  test('both settle paths release the credit instead of trapping the player', () => {
    expect(screen).toContain('releaseUndeliveredLocalLevelSpin');
    // Обе кнопки — «ГОТОВО» в модалке и «Крутить ещё» на барабане.
    const releases = screen.match(/releaseUndeliveredLocalLevelSpin\(/g) ?? [];
    expect(releases.length).toBeGreaterThanOrEqual(2);
  });

  test('delivery cannot hang the UI forever', () => {
    // Таймаут гонки: интерфейс перестаёт ждать, сама доставка не отменяется.
    expect(screen).toContain('REWARD_DELIVERY_TIMEOUT_MS');
    expect(screen).toContain('Promise.race');
  });

  test('a failed delivery never acknowledges the receipt', () => {
    // acknowledgeLocalLevelSpin стирает activeReceipt — вызвать её без
    // подтверждённой доставки значит потерять приз безвозвратно.
    expect(screen).toContain('if (delivered) await acknowledgeLocalLevelSpin(requestId)');
  });
});
