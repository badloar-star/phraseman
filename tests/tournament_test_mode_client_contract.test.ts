import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('tournament temporary test-mode client contract', () => {
  const source = readFileSync(resolve(__dirname, '../app/(tabs)/tournaments.tsx'), 'utf8')
    .replace(/\r\n/g, '\n');
  const clientSource = readFileSync(resolve(__dirname, '../app/tournament_client.ts'), 'utf8')
    .replace(/\r\n/g, '\n');

  it('forces the explicitly released test surface through free start-now even inside a schedule window', () => {
    expect(source).toContain('testingEnabled?: boolean');
    expect(source).toContain('const testModeReleaseActive = schedule?.testingEnabled === true;');
    expect(source).toContain('const instantEntry = testModeReleaseActive || !joinWindowOpen;');
    expect(source).toContain('const effectiveEntryGems = testModeReleaseActive ? 0 : entryGems;');
    expect(source).toContain("testModeReleaseActive ? 'Играть сейчас · тест'");
    expect(source).toContain("? 'Тестовый вход · бесплатно · 16 игроков'");
    expect(source).toContain("instantEntry\n        ? await startTournamentNow()\n        : await joinTournament(joinRoomId as string)");
    const entryBlock = source.slice(
      source.indexOf('const enterLobby = useCallback'),
      source.indexOf('const contentPadding'),
    );
    expect(entryBlock.indexOf('router.push(')).toBeLessThan(entryBlock.indexOf('await startTournamentNow()'));
    expect(source).toContain('setCoins((current) => Math.max(0, current - effectiveEntryGems));');
  });

  it('keeps the paid scheduled route when the release surface is not explicitly enabled', () => {
    expect(source).toContain('const testModeReleaseActive = schedule?.testingEnabled === true;');
    expect(source).toContain('const instantEntry = testModeReleaseActive || !joinWindowOpen;');
    expect(source).toContain('const effectiveEntryGems = testModeReleaseActive ? 0 : entryGems;');
    expect(source).toMatch(/: joinWindowOpen\s*\? 'Играть'\s*: 'Играть сейчас'/);
  });

  it('explains when the server has disabled temporary testing', () => {
    expect(source).toContain("code.includes('tournament_testing_disabled')");
  });

  it('initializes App Check before invoking tournament callables', () => {
    const callFunctionStart = clientSource.indexOf('async function callFunction');
    const callFunctionEnd = clientSource.indexOf('\n}', callFunctionStart);
    const callFunctionBlock = clientSource.slice(callFunctionStart, callFunctionEnd);

    expect(clientSource).toContain("import { initFirebaseAppCheckIfAvailable } from './app_check_init';");
    expect(callFunctionBlock).toContain('await initFirebaseAppCheckIfAvailable().catch(() => {});');
    expect(callFunctionBlock.indexOf('await initFirebaseAppCheckIfAvailable()'))
      .toBeLessThan(callFunctionBlock.indexOf('httpsCallable('));
  });
});
