// ════════════════════════════════════════════════════════════════════════════
// Сторож: модалка итогов недели помечается «показанной» ТОЛЬКО по факту показа.
//
// Инцидент 2026-09-14 (владелец: «МОДАЛ ЛИГИ НЕ ПОЯВЛЯЕТСЯ СОВСЕМ»).
// Оба хоста (Главная и Клуб) читали pending и СРАЗУ делали две необратимые вещи:
//   1) tryAcquireLeagueResultModal(sig) — бронь в module-guard навсегда;
//   2) await markLeagueResultShown(result) — consumed_sig на диск навсегда.
// Реальный показ при этом не гарантирован: на Главной его решает арбитр оверлеев
// (useOverlayVisible), а Главная живёт под Freeze и остаётся смонтированной, пока
// человек ушёл в Клуб. Если слот был занят или экран был не в фокусе, окно не
// рисовалось — а результат уже сгорел. Клуб потом получал null из loadPendingResult
// (латч consumed_sig) и false из guard: итоги недели не показывались НИГДЕ и больше
// никогда.
//
// Правило: «показано» пишет эффект по факту видимости, а забронированный, но не
// показанный результат возвращается в очередь через releaseLeagueResultModal.
// Сработал сторож — возвращать правило, а не удалять проверку.
// ════════════════════════════════════════════════════════════════════════════

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..');
const read = (relativePath: string): string =>
  fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');

const HOSTS = ['app/(tabs)/home.tsx', 'app/club_screen.tsx'] as const;

describe('league result modal is consumed only when actually shown', () => {
  test.each(HOSTS)('%s never marks the result shown before rendering it', (host) => {
    const source = read(host);
    // Запрещена форма «пометить и только потом показать»: await/then-цепочка,
    // ведущая от markLeagueResultShown к setPendingLeagueResult.
    expect(source).not.toMatch(/await\s+markLeagueResultShown\s*\([^)]*\)\s*;\s*[\s\S]{0,200}?setPendingLeagueResult\s*\(\s*(?:leaguePending|result)\b/);
    expect(source).not.toMatch(/markLeagueResultShown\s*\([^)]*\)\s*\.then\s*\(/);
  });

  test.each(HOSTS)('%s marks the result shown from a visibility-driven effect', (host) => {
    const source = read(host);
    expect(source).toContain('markLeagueResultShown');
    expect(source).toContain('leagueResultMarkedSigRef');
  });

  test.each(HOSTS)('%s returns an unshown reservation to the queue', (host) => {
    const source = read(host);
    expect(source).toContain('releaseLeagueResultModal');
  });

  test('the engine exposes a release for a reservation that never became a show', async () => {
    const engine = await import('../app/league_engine');
    const sig = 'test-signature-v1';

    expect(engine.tryAcquireLeagueResultModal(sig)).toBe(true);
    // Второй хост не должен показать то же самое, пока бронь держат.
    expect(engine.tryAcquireLeagueResultModal(sig)).toBe(false);

    // Держатель ушёл, не показав — бронь обязана вернуться в очередь.
    engine.releaseLeagueResultModal(sig);
    expect(engine.tryAcquireLeagueResultModal(sig)).toBe(true);

    engine.__resetLeagueResultSessionGuardForTests();
  });

  test('releasing a foreign signature never steals someone else reservation', async () => {
    const engine = await import('../app/league_engine');
    engine.__resetLeagueResultSessionGuardForTests();

    expect(engine.tryAcquireLeagueResultModal('mine')).toBe(true);
    engine.releaseLeagueResultModal('someone-else');
    // Бронь «mine» цела: чужой release её не снял.
    expect(engine.tryAcquireLeagueResultModal('mine')).toBe(false);

    engine.__resetLeagueResultSessionGuardForTests();
  });
});
