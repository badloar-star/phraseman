import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('tournament temporary test-mode client contract', () => {
  const source = readFileSync(resolve(__dirname, '../app/(tabs)/tournaments.tsx'), 'utf8')
    .replace(/\r\n/g, '\n');
  const clientSource = readFileSync(resolve(__dirname, '../app/tournament_client.ts'), 'utf8')
    .replace(/\r\n/g, '\n');

  // зачем 2026-08-03 (владелец): дев-кнопка мгновенного входа держится ТОЛЬКО
  // на __DEV__ — боевой билд не содержит её ни при каком условии. Отдельный
  // рубильник в админке убран: «хочу тестировать» должно работать сразу, без
  // похода в админку. Мгновенные комнаты вне окна для игроков (не-__DEV__)
  // остаются отменены — это правило только для дев-сборки владельца.
  it('keeps the dev test surface behind __DEV__ only, no admin flag needed', () => {
    expect(source).toContain('testingEnabled?: boolean');
    expect(source).toContain('const testModeReleaseActive = __DEV__;');
    expect(source).toContain('const instantEntry = testModeReleaseActive;');
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

  it('production route is schedule-only: outside the window the button is dead honest', () => {
    expect(source).toContain('const testModeReleaseActive = __DEV__;');
    expect(source).toContain('const instantEntry = testModeReleaseActive;');
    expect(source).toContain('const effectiveEntryGems = testModeReleaseActive ? 0 : entryGems;');
    expect(source).toMatch(/: joinWindowOpen\s*\? 'Играть'\s*: 'Сейчас турниров нет'/);
    // Вне окна кнопка выключена, а не собирает мгновенную комнату.
    expect(source).toContain('disabled={!testModeReleaseActive && !joinWindowOpen && !notEnoughGems}');
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
