import fs from 'node:fs';
import path from 'node:path';

const read = (file: string) => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');

describe('league participant progress refresh', () => {
  // зачем (владелец, 2026-08-17): этот тест ОХРАНЯЛ ПОЛОМКУ. Он требовал
  // `loadData({ forceRemote: true })` на каждый возврат фокуса, то есть
  // принудительное чтение Firestore в обход 6-часового TTL. Правило владельца
  // обратное: чужие цифры обновляются НЕ ЧАЩЕ РАЗА В 6 ЧАСОВ и только при
  // заходе на экран; свои очки живые локально (withMyLivePoints, 0 чтений).
  // Требование пришло вместе со снапшот-коммитом e7eb7d316, который занизил
  // CLUB_REMOTE_REFRESH_MS до 45 секунд. Тест приведён к настоящему правилу.
  // Подробности: ____ЛИГИ_КЭШ_6_ЧАСОВ_НЕ_ЛОМАТЬ____.md
  it('refreshes on screen entry and lets the 6h TTL decide whether to hit network', () => {
    const source = read('app/club_screen.tsx');
    expect(source).toContain('useFocusEffect(');
    // Вход на экран есть — но БЕЗ forceRemote: решение принимает TTL в loadData.
    expect(source).toContain('void loadData();');
  });

  it('keeps the league table cache at 6 hours and never polls in the background', () => {
    const source = read('app/club_screen.tsx');
    expect(source).toContain('const CLUB_REMOTE_REFRESH_MS = 6 * 60 * 60 * 1000;');
    // Комментарии выбрасываем: они описывают инцидент и сами упоминают
    // forceRemote/setInterval — иначе проверка ловила бы документацию.
    // Та же нормализация, что в scripts/guard_league_refresh_ttl.mjs.
    const code = source
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
    // forceRemote допустим ровно один раз — в pull-to-refresh (жест человека).
    expect(code.match(/forceRemote: true/g) ?? []).toHaveLength(1);
    // Фонового опроса быть не должно: setInterval не зовёт loadData.
    for (const match of code.matchAll(/setInterval\s*\(/g)) {
      expect(code.slice(match.index, (match.index ?? 0) + 400)).not.toContain('loadData(');
    }
  });

  it('persists the 6h refresh timestamp only after the remote league work succeeds', () => {
    const source = read('app/club_screen.tsx')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');
    const remotePhase = source.slice(
      source.indexOf('const leagueWork = checkLeagueOnAppOpen'),
      source.indexOf('} catch (e)', source.indexOf('const leagueWork = checkLeagueOnAppOpen')),
    );

    expect(remotePhase.match(/AsyncStorage\.setItem\(CLUB_REMOTE_REFRESH_AT_KEY/g) ?? []).toHaveLength(2);
    expect(remotePhase).toMatch(/leagueWork\s*\.then\(\(\{ state, result \}\) => \{[\s\S]*?AsyncStorage\.setItem\(CLUB_REMOTE_REFRESH_AT_KEY/);
    expect(remotePhase).toMatch(/const \{ state, result \} = await leagueWork;[\s\S]*?AsyncStorage\.setItem\(CLUB_REMOTE_REFRESH_AT_KEY/);
    expect(remotePhase).not.toMatch(/\}\s*await AsyncStorage\.setItem\(CLUB_REMOTE_REFRESH_AT_KEY/);
  });

  it('reapplies my live rune points after both remote response branches', () => {
    const source = read('app/club_screen.tsx');
    const remotePhase = source.slice(
      source.indexOf('const leagueWork = checkLeagueOnAppOpen'),
      source.indexOf('} catch (e)', source.indexOf('const leagueWork = checkLeagueOnAppOpen')),
    );
    expect(remotePhase.match(/group: withMyLivePoints\(state\.group, myPoints, canonicalUid, n\)/g) ?? [])
      .toHaveLength(2);
  });

  it('materializes synthetic participant progress hourly', () => {
    expect(read('functions/src/league_residents_cron.ts')).toContain("schedule: 'every 1 hours'");
    expect(read('functions/src/synthetic_residents.ts')).toContain('export const RESIDENT_TICK_MS = 60 * 60 * 1000;');
    expect(read('constants/synthetic_residents.ts')).toContain('export const RESIDENT_TICK_MS = 60 * 60 * 1000;');
  });
});
